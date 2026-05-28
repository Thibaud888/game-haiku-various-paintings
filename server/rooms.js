// Room management. Each room holds a game instance + connected players.

const { create: createGame } = require('./game');

const rooms       = new Map(); // code → room
const socketToRoom = new Map(); // socketId → code

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I, O (confusable)

function generateCode() {
  let code;
  do {
    code = Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function createRoom(socketId, playerName) {
  const code = generateCode();
  const room = {
    code,
    hostSocketId: socketId,
    started: false,
    emptyAt: null,
    game: createGame(),
    players: [{
      id: 0,
      name: playerName,
      socketId,
      connected: true,
      disconnectedAt: null,
    }],
  };
  rooms.set(code, room);
  socketToRoom.set(socketId, code);
  return { room, code, playerId: 0 };
}

function joinRoom(code, socketId, playerName) {
  const room = rooms.get(code.toUpperCase());
  if (!room)            return { ok: false, error: 'Code de partie invalide.' };
  if (room.started)     return { ok: false, error: 'La partie a déjà commencé.' };
  if (room.players.length >= 5) return { ok: false, error: 'La partie est complète (5 joueurs max).' };

  const playerId = room.players.length;
  room.players.push({ id: playerId, name: playerName, socketId, connected: true, disconnectedAt: null });
  socketToRoom.set(socketId, code.toUpperCase());
  return { ok: true, room, playerId };
}

function reconnectPlayer(code, playerName, newSocketId) {
  const room = rooms.get(code?.toUpperCase());
  if (!room) return { ok: false, error: 'Partie introuvable.' };

  const player = room.players.find(p => p.name === playerName);
  if (!player) return { ok: false, error: 'Joueur introuvable.' };

  if (player.socketId) socketToRoom.delete(player.socketId);
  socketToRoom.set(newSocketId, room.code);

  player.socketId = newSocketId;
  player.connected = true;
  player.disconnectedAt = null;
  if (room.emptyAt) room.emptyAt = null;

  return { ok: true, room, player };
}

function disconnectPlayer(socketId) {
  const code = socketToRoom.get(socketId);
  if (!code) return null;
  const room = rooms.get(code);
  if (!room) return null;

  const player = room.players.find(p => p.socketId === socketId);
  if (player) {
    player.connected = false;
    player.disconnectedAt = Date.now();
  }

  if (room.players.every(p => !p.connected)) {
    room.emptyAt = Date.now();
  }

  // Transfer host if needed
  if (room.hostSocketId === socketId) {
    const newHost = room.players.find(p => p.connected);
    if (newHost) room.hostSocketId = newHost.socketId;
  }

  return { room, player };
}

function getRoom(code) {
  return rooms.get(code?.toUpperCase());
}

function getRoomBySocket(socketId) {
  const code = socketToRoom.get(socketId);
  return code ? rooms.get(code) : null;
}

function cleanStaleRooms() {
  const TWO_HOURS = 2 * 60 * 60 * 1000;
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (room.emptyAt && now - room.emptyAt > TWO_HOURS) {
      rooms.delete(code);
      room.players.forEach(p => socketToRoom.delete(p.socketId));
    }
  }
}

module.exports = { createRoom, joinRoom, reconnectPlayer, disconnectPlayer, getRoom, getRoomBySocket, cleanStaleRooms };
