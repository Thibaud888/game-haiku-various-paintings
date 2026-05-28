// Online mode — Socket.io client wrapper.
// Connects lazily on first emit, wires server events to UI/Game.

const Socket = (() => {
  let _socket = null;
  let _myPlayerId = null;
  let _roomCode = null;

  function _init() {
    if (_socket) return;
    _socket = io();

    _socket.on('room-joined', ({ code, playerId, players }) => {
      _myPlayerId = playerId;
      _roomCode   = code;
      UI.renderLobby({ code, players, myPlayerId: playerId });
    });

    _socket.on('lobby-update', ({ players }) => {
      UI.renderLobby({ code: _roomCode, players, myPlayerId: _myPlayerId });
    });

    _socket.on('state', serverState => {
      const enriched = _enrich(serverState);
      // Preserve local zoom if the player has a modal open
      const current = Game.getState();
      if (current && current.zoomedPaintingId !== null) {
        enriched.zoomedPaintingId = current.zoomedPaintingId;
      }
      Game.setState(enriched);
      UI.render();
    });

    _socket.on('player-disconnected', ({ playerName }) => {
      UI.showToast(`${playerName} s'est déconnecté(e).`);
    });

    _socket.on('player-reconnected', ({ playerName }) => {
      UI.showToast(`${playerName} s'est reconnecté(e).`);
    });

    _socket.on('host-changed', ({ playerName }) => {
      UI.showToast(`${playerName} est maintenant l'hôte.`);
    });

    _socket.on('join-error', ({ message }) => {
      UI.showToast(message, 'error');
    });
  }

  // Re-inject myVerseHand into the right player slot so existing UI code works
  function _enrich(s) {
    const players = s.players.map((p, i) =>
      i === s.myPlayerId ? { ...p, verseHand: s.myVerseHand } : p
    );
    return { ...s, players };
  }

  function emit(event, data) {
    _init();
    _socket.emit(event, data);
  }

  function getMyPlayerId() { return _myPlayerId; }
  function getRoomCode()   { return _roomCode; }

  return { emit, getMyPlayerId, getRoomCode };
})();
