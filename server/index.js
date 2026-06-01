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

// Serve static files from project root
app.use(express.static(path.join(__dirname, '..')));

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

  socket.on('start-game', () => {
    const room = getRoomBySocket(socket.id);
    if (!room || room.started || room.hostSocketId !== socket.id) return;
    if (room.players.length < 2) return;
    room.game.init(room.players.map(p => p.name));
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
      socket.emit('state', playerView(room.game.getState(), player.id));
    }
  });

  socket.on('disconnect', () => {
    const result = disconnectPlayer(socket.id);
    if (!result) return;
    const { room, player } = result;
    if (!player) return;
    io.to(room.code).emit('player-disconnected', { playerName: player.name });
    // Notify of new host if changed
    const newHost = room.players.find(p => p.socketId === room.hostSocketId);
    if (newHost && newHost.socketId !== socket.id) {
      io.to(room.code).emit('host-changed', { playerName: newHost.name });
    }
  });
});

// ── Game action dispatcher ───────────────────────────────

function handleGameAction(room, player, action, payload) {
  const game = room.game;
  const state = game.getState();
  const myIndex = player.id;

  switch (action) {
    case 'begin-secret':
      if (state.phase !== 'turn-reveal') return;
      game.beginSecretPhase();
      // Skip pass-before in online mode — go directly to secret-compose
      if (game.getState().phase === 'pass-before') game.playerReady();
      break;

    case 'select-painting':
      if (state.phase !== 'secret-compose' || myIndex !== state.secretIndex) return;
      game.selectPainting(Number(payload.paintingId));
      break;

    case 'add-verse':
      if (state.phase !== 'secret-compose' || myIndex !== state.secretIndex) return;
      game.addVerse(Number(payload.verseId));
      break;

    case 'remove-verse':
      if (state.phase !== 'secret-compose' || myIndex !== state.secretIndex) return;
      game.removeVerse(Number(payload.verseId));
      break;

    case 'move-verse':
      if (state.phase !== 'secret-compose' || myIndex !== state.secretIndex) return;
      game.moveVerse(Number(payload.verseId), payload.direction);
      break;

    case 'confirm-choice':
      if (state.phase !== 'secret-compose' || myIndex !== state.secretIndex) return;
      game.confirmChoice();
      if (game.getState().phase === 'pass-before') game.playerReady();
      break;

    case 'activate-deduction':
      if (state.phase !== 'deduction') return;
      game.activateDeductionPlayer(Number(payload.playerId));
      break;

    case 'assign-guess':
      if (state.phase !== 'deduction') return;
      game.assignGuess(Number(payload.paintingId));
      break;

    case 'confirm-guesses':
      if (state.phase !== 'deduction') return;
      game.confirmGuesses();
      break;

    case 'next-turn':
      if (state.phase !== 'resolution') return;
      game.nextTurn();
      break;

    case 'restart':
      if (state.phase !== 'end') return;
      room.game.init(room.players.map(p => p.name));
      break;
  }
}

// ── State broadcasting ───────────────────────────────────

function broadcastState(room) {
  const state = room.game.getState();
  room.players.forEach(player => {
    io.to(player.socketId).emit('state', playerView(state, player.id));
  });
}

function playerView(state, myIndex) {
  const isCurrentPlayer = myIndex === state.secretIndex;

  const players = state.players.map(p => ({ id: p.id, name: p.name }));

  // During deduction, hide which painting each player chose
  const choices = state.phase === 'deduction'
    ? state.choices.map(c => ({ playerId: c.playerId, verses: c.verses }))
    : state.choices;

  // Strip verseHands from lastResolution player objects
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
    phase:                state.phase,
    turnIndex:            state.turnIndex,
    secretIndex:          state.secretIndex,
    turnPaintings:        state.turnPaintings,
    choices,
    guesses:              state.guesses,
    activeDeductionPlayer: state.activeDeductionPlayer,
    galleryProgress:      state.galleryProgress,
    blackoutProgress:     state.blackoutProgress,
    lastResolution,
    zoomedPaintingId:     null, // always managed client-side
    players,
    myPlayerId:           myIndex,
    myVerseHand:          state.players[myIndex]?.verseHand || [],
    draft:                isCurrentPlayer ? state.draft : null,
  };
}

// ── Cleanup ──────────────────────────────────────────────

setInterval(cleanStaleRooms, 10 * 60 * 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Nuit au Musée server on http://localhost:${PORT}`));
