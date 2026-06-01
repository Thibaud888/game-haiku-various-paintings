const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const path     = require('path');

const {
  createRoom, joinRoom, reconnectPlayer, disconnectPlayer,
  getRoom, getRoomBySocket, cleanStaleRooms,
} = require('./rooms');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);

// Serve static files from project root. Strong caching on assets (notably the
// 248 local paintings) so the browser reuses them instead of revalidating on
// every render — avoids the painting flicker during composition.
app.use(express.static(path.join(__dirname, '..'), {
  maxAge: '7d',
  setHeaders(res, filePath) {
    // HTML and the game scripts must stay fresh so deploys are picked up.
    if (/\.(html|js|css)$/.test(filePath)) res.setHeader('Cache-Control', 'no-cache');
  },
}));

// ── Settings sanitising ──────────────────────────────────

const DURATION_GALLERY   = { short: 6, standard: 10, long: 15 };
const DIFFICULTY_BLACKOUT = { easy: 12, standard: 8, hard: 4 };

function sanitiseSettings(raw = {}) {
  const galleryMax  = DURATION_GALLERY[raw.duration]    ?? 10;
  const blackoutMax = DIFFICULTY_BLACKOUT[raw.difficulty] ?? 8;
  const storyMode   = raw.story === 'sobre' ? 'sobre' : 'immersif';
  const timerEnabled = !!raw.timerEnabled;
  let timerMinutes = parseInt(raw.timerMinutes, 10);
  if (!Number.isFinite(timerMinutes) || timerMinutes < 1) timerMinutes = 3;
  if (timerMinutes > 30) timerMinutes = 30;
  return { galleryMax, blackoutMax, storyMode, timerEnabled, timerDuration: timerMinutes * 60 };
}

// ── Socket.io ────────────────────────────────────────────

io.on('connection', socket => {

  socket.on('create-room', ({ playerName }) => {
    const name = String(playerName || 'Joueur').trim().slice(0, 20);
    const { room, code, playerId } = createRoom(socket.id, name);
    socket.join(code);
    socket.emit('room-joined', { code, playerId, players: room.players.map(p => p.name) });
  });

  socket.on('join-room', ({ code, playerName }) => {
    const name = String(playerName || 'Joueur').trim().slice(0, 20);
    const result = joinRoom(String(code || ''), socket.id, name);
    if (!result.ok) { socket.emit('join-error', { message: result.error }); return; }
    const { room, playerId } = result;
    socket.join(room.code);
    socket.emit('room-joined', { code: room.code, playerId, players: room.players.map(p => p.name) });
    socket.to(room.code).emit('lobby-update', { players: room.players.map(p => p.name) });
  });

  socket.on('start-game', ({ settings } = {}) => {
    const room = getRoomBySocket(socket.id);
    if (!room || room.started || room.hostSocketId !== socket.id) return;
    if (room.players.length < 2) return;
    room.settings = sanitiseSettings(settings);
    room.game.init(room.players.map(p => p.name), room.settings);
    room.started = true;
    broadcastState(room);
  });

  socket.on('game-action', ({ action, payload }) => {
    const room = getRoomBySocket(socket.id);
    if (!room || !room.started) return;
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;
    handleGameAction(room, player, action, payload || {});
    broadcastState(room);
  });

  socket.on('reconnect-to-room', ({ code, playerName }) => {
    const result = reconnectPlayer(String(code || ''), String(playerName || ''), socket.id);
    if (!result.ok) { socket.emit('join-error', { message: result.error }); return; }
    const { room, player } = result;
    socket.join(room.code);
    socket.emit('room-joined', { code: room.code, playerId: player.id, players: room.players.map(p => p.name) });
    socket.to(room.code).emit('player-reconnected', { playerName: player.name });
    if (room.started) {
      socket.emit('state', playerView(room, player.id));
    }
  });

  socket.on('disconnect', () => {
    const result = disconnectPlayer(socket.id);
    if (!result) return;
    const { room, player } = result;
    if (!player) return;
    io.to(room.code).emit('player-disconnected', { playerName: player.name });
    const newHost = room.players.find(p => p.socketId === room.hostSocketId);
    if (newHost && newHost.socketId !== socket.id) {
      io.to(room.code).emit('host-changed', { playerName: newHost.name });
    }
  });
});

// ── Game action dispatcher ───────────────────────────────

function handleGameAction(room, player, action, payload) {
  const game  = room.game;
  const state = game.getState();
  const pid   = player.id;

  switch (action) {
    // Turn-reveal gate — every player must click before composing starts.
    case 'ready-compose':
      if (state.phase !== 'turn-reveal') return;
      game.markReady(pid);
      break;

    // Parallel compose — each action operates on the caller's own draft.
    case 'select-painting':
      game.selectPainting(pid, Number(payload.paintingId));
      break;
    case 'add-verse':
      game.addVerse(pid, Number(payload.verseId));
      break;
    case 'remove-verse':
      game.removeVerse(pid, Number(payload.verseId));
      break;
    case 'move-verse':
      game.moveVerse(pid, Number(payload.verseId), payload.direction);
      break;
    case 'confirm-choice':
      game.confirmChoice(pid);
      break;

    // Deduction — collective, any player can drive it.
    case 'activate-deduction':
      if (state.phase !== 'deduction') return;
      game.activateDeductionPlayer(Number(payload.playerId));
      break;
    case 'assign-guess':
      if (state.phase !== 'deduction') return;
      game.assignGuess(Number(payload.paintingId));
      break;
    // Reveal gate: every player must click before the round resolves.
    case 'request-reveal':
      if (state.phase !== 'deduction') return;
      game.requestReveal(pid);
      break;

    case 'next-turn':
      if (state.phase !== 'resolution') return;
      game.nextTurn();
      break;

    case 'restart':
      if (state.phase !== 'end') return;
      game.init(room.players.map(p => p.name), room.settings);
      break;
  }
}

// ── State broadcasting ───────────────────────────────────

function broadcastState(room) {
  room.players.forEach(player => {
    if (!player.connected) return;
    io.to(player.socketId).emit('state', playerView(room, player.id));
  });
}

// Build the per-player view. The server is the source of truth; each player
// only receives their own verse hand and their own draft, plus the shared
// public information for the current phase.
function playerView(room, myId) {
  const state = room.game.getState();

  const players = state.players.map(p => ({ id: p.id, name: p.name }));
  const total   = state.players.length;

  // During deduction, hide which painting each player chose (verses only).
  const choices = state.phase === 'deduction'
    ? state.choices.map(c => ({ playerId: c.playerId, verses: c.verses }))
    : state.choices;

  let lastResolution = state.lastResolution;
  if (lastResolution) {
    lastResolution = {
      ...lastResolution,
      items: lastResolution.items.map(item => ({
        ...item,
        player: { id: item.player.id, name: item.player.name },
      })),
    };
  }

  return {
    online: true,
    phase:            state.phase,
    turnIndex:        state.turnIndex,
    turnPaintings:    state.turnPaintings,
    players,
    myPlayerId:       myId,
    myVerseHand:      state.players.find(p => p.id === myId)?.verseHand || [],

    galleryMax:       state.galleryMax,
    blackoutMax:      state.blackoutMax,
    galleryProgress:  state.galleryProgress,
    blackoutProgress: state.blackoutProgress,

    // Turn-reveal gate
    readyCount:       room.game.readyCount(),
    totalPlayers:     total,
    iAmReady:         !!state.ready[myId],

    // Compose (parallel)
    myDraft:          state.drafts[myId] || { paintingId: null, selectedVerses: [] },
    mySubmitted:      !!state.submitted[myId],
    submittedCount:   room.game.submittedCount(),

    // Deduction / resolution
    choices,
    guesses:                state.guesses,
    activeDeductionPlayer:  state.activeDeductionPlayer,
    revealVoteCount:        room.game.revealVoteCount(),
    iVotedReveal:           !!state.revealVotes[myId],
    lastResolution,

    // Story / timer
    storyMode:        state.storyMode,
    lastBeats:        state.lastBeats,
    timerEnabled:     state.timerEnabled,
    timerDuration:    state.timerDuration,

    zoomedPaintingId: null, // always managed client-side
  };
}

// ── Cleanup ──────────────────────────────────────────────

setInterval(cleanStaleRooms, 10 * 60 * 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Nuit au Musée server on http://localhost:${PORT}`));
