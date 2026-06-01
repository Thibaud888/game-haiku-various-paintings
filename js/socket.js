// Online mode — Socket.io client + online game controller.
//
// The server is the source of truth for the game state. This module:
//   • connects lazily on first emit;
//   • receives a per-player `state` and enriches it into the same shape the
//     local UI functions expect, so they can be reused unchanged;
//   • plays the painting-reveal cinematic LOCALLY, but only AFTER the
//     synchronized "ready" gate: when the server moves everyone into the
//     compose phase for a new turn, every client starts the reveal at the same
//     moment (→ the discovery happens together);
//   • preloads the turn's images so they fade in fully (no top-to-bottom paint);
//   • patches the compose screen in place to avoid the painting flicker;
//   • runs the per-player composition timer locally.

const Socket = (() => {
  let _socket     = null;
  let _myPlayerId = null;
  let _roomCode   = null;

  // Latest enriched server state.
  let _state = null;

  // Local cinematic / reveal state (per turn, client-side only).
  let _revealTurn      = -1;     // turnIndex whose reveal has been played
  let _basePhase       = null;   // authoritative server phase (never overwritten)
  let _override        = null;   // null | 'turn-reveal-cinematic'
  let _cinematicIndex  = 0;
  let _cinematicTimer  = null;

  // Compose screen mounted for this turn (enables in-place patching).
  let _mountedComposeTurn = null;

  // Local zoom (never synced).
  let _zoom = null;

  // Local composition timer.
  let _timerRunning  = false;
  let _timerLeft     = 0;
  let _timerInterval = null;

  // Host's chosen options, snapshotted from app.js (persists across re-renders).
  function _lobbyOptions() {
    return (typeof window.getOnlineOptions === 'function')
      ? window.getOnlineOptions()
      : { duration: 'standard', difficulty: 'standard', story: 'immersif', timerEnabled: false, timerMinutes: 3 };
  }

  function _init() {
    if (_socket) return;
    _socket = io();

    _socket.on('room-joined', ({ code, playerId, players }) => {
      _myPlayerId = playerId;
      _roomCode   = code;
      UI.renderLobby({ code, players, myPlayerId: playerId, options: _lobbyOptions() });
    });

    _socket.on('lobby-update', ({ players }) => {
      UI.renderLobby({ code: _roomCode, players, myPlayerId: _myPlayerId, options: _lobbyOptions() });
    });

    _socket.on('state', raw => _onServerState(raw));

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

  // Map the per-player server view into the state shape the local UI uses.
  function _enrich(s) {
    const players = s.players.map(p =>
      p.id === s.myPlayerId ? { ...p, verseHand: s.myVerseHand } : { ...p }
    );
    return {
      online: true,
      phase:            s.phase,
      turnIndex:        s.turnIndex,
      turnPaintings:    s.turnPaintings,
      players,
      myPlayerId:       s.myPlayerId,

      // So Game.currentPlayer() resolves to "me" during compose.
      composeOrder:     [s.myPlayerId],
      secretIndex:      0,
      draft:            s.myDraft || { paintingId: null, selectedVerses: [] },

      galleryMax:       s.galleryMax,
      blackoutMax:      s.blackoutMax,
      galleryProgress:  s.galleryProgress,
      blackoutProgress: s.blackoutProgress,

      choices:               s.choices,
      guesses:               s.guesses,
      activeDeductionPlayer: s.activeDeductionPlayer,
      revealVoteCount:       s.revealVoteCount,
      iVotedReveal:          s.iVotedReveal,
      lastResolution:        s.lastResolution,

      storyMode:        s.storyMode,
      lastBeats:        s.lastBeats || {},
      timerEnabled:     s.timerEnabled,
      timerDuration:    s.timerDuration,
      timerSecondsLeft: 0,
      cinematicIndex:   0,

      // Online-specific extras
      readyCount:     s.readyCount,
      totalPlayers:   s.totalPlayers,
      iAmReady:       s.iAmReady,
      mySubmitted:    s.mySubmitted,
      submittedCount: s.submittedCount,

      zoomedPaintingId: _zoom,
    };
  }

  function _onServerState(raw) {
    _state     = _enrich(raw);
    _basePhase = raw.phase;

    // The reveal now plays AFTER the synchronized gate: when the server moves
    // everyone into the compose phase for a NEW turn, each client plays the
    // cinematic locally — all starting together since the state arrives at the
    // same moment for everyone.
    if (_basePhase === 'secret-compose' && _state.turnIndex !== _revealTurn) {
      _revealTurn = _state.turnIndex;
      if (_state.storyMode !== 'sobre') {
        _startReveal();
        return;
      }
    }

    // Don't interrupt an ongoing local reveal (other players getting ready /
    // composing only changes counters we'll pick up when the reveal finishes).
    if (_override) return;

    _render();
  }

  // ── Reveal sequence (cinematic only; the intro lives on the gate screen) ──

  function _startReveal() {
    _clearCinematicTimer();
    _cinematicIndex = 0;
    _override = 'turn-reveal-cinematic';
    _preloadImages(_state.turnPaintings);
    _scheduleCinematic();
    _render();
  }

  function advanceCinematic() {
    _clearCinematicTimer();
    if (_state && _cinematicIndex < _state.turnPaintings.length - 1) {
      _cinematicIndex++;
      _scheduleCinematic();
      _render();
    } else {
      _finishReveal();
    }
  }

  function skipCinematic() {
    _finishReveal();
  }

  function _finishReveal() {
    _clearCinematicTimer();
    _override = null;
    _render();
  }

  function _scheduleCinematic() {
    _clearCinematicTimer();
    _cinematicTimer = setTimeout(() => {
      _cinematicTimer = null;
      const section = document.querySelector('.screen-cinematic');
      if (section) {
        section.classList.add('cin-exiting');
        _cinematicTimer = setTimeout(() => {
          _cinematicTimer = null;
          advanceCinematic();
        }, 500);
      } else {
        advanceCinematic();
      }
    }, 5000);
  }

  function _clearCinematicTimer() {
    if (_cinematicTimer !== null) { clearTimeout(_cinematicTimer); _cinematicTimer = null; }
  }

  // Preload the turn's paintings so the cinematic fades in a fully-decoded
  // image instead of painting it top-to-bottom while it downloads.
  function _preloadImages(paintings) {
    (paintings || []).forEach(p => {
      const img = new Image();
      img.onerror = () => { if (p.remoteUrl && img.src !== p.remoteUrl) img.src = p.remoteUrl; };
      img.src = p.imageUrl;
    });
  }

  // ── Composition timer (local, per player) ─────────────

  function _stopTimer() {
    if (_timerInterval !== null) { clearInterval(_timerInterval); _timerInterval = null; }
    _timerRunning = false;
  }

  function _startTimer(duration) {
    if (_timerRunning) return;
    _timerRunning = true;
    _timerLeft    = duration;
    _timerInterval = setInterval(() => {
      if (_timerLeft > 0) _timerLeft--;
      const st = Game.getState();
      if (st) st.timerSecondsLeft = _timerLeft;
      UI.updateTimer();
      if (_timerLeft === 0) _stopTimer();
    }, 1000);
  }

  // ── Render ────────────────────────────────────────────

  function _render() {
    const s = _state;
    if (!s) return;

    // Resolve the phase to render: a local cinematic override takes priority,
    // otherwise fall back to the authoritative server phase.
    s.phase = _override || _basePhase;
    if (_override) s.cinematicIndex = _cinematicIndex;
    s.zoomedPaintingId = _zoom;

    // Manage the composition timer.
    const composing = s.phase === 'secret-compose' && !s.mySubmitted;
    if (composing && s.timerEnabled) _startTimer(s.timerDuration);
    else _stopTimer();
    s.timerSecondsLeft = _timerRunning ? _timerLeft : s.timerDuration;

    Game.setState(s);

    // In-place patch of the compose screen to avoid recreating the <img>
    // elements on every keystroke (which caused the painting flicker).
    if (composing && !_override && _zoom === null
        && _mountedComposeTurn === s.turnIndex
        && document.querySelector('.screen-compose')
        && !document.querySelector('.modal-overlay')) {
      UI.patchCompose(s);
      return;
    }

    UI.render();
    _mountedComposeTurn = (composing && !_override) ? s.turnIndex : null;
  }

  // ── Zoom (local) ──────────────────────────────────────

  function setZoom(id) { _zoom = id; if (_state) _state.zoomedPaintingId = id; _render(); }
  function clearZoom() { setZoom(null); }

  // ── Public ────────────────────────────────────────────

  function emit(event, data) {
    _init();
    _socket.emit(event, data);
  }

  function reset() {
    _stopTimer();
    _clearCinematicTimer();
    _state = null;
    _basePhase = null;
    _override = null;
    _revealTurn = -1;
    _cinematicIndex = 0;
    _mountedComposeTurn = null;
    _zoom = null;
  }

  return {
    emit, reset,
    setZoom, clearZoom,
    advanceCinematic, skipCinematic,
    getMyPlayerId: () => _myPlayerId,
    getRoomCode:   () => _roomCode,
  };
})();
