// Entry point. Shows the mode-select screen, then routes interactions either
// to the local Game (pass-and-play on one device) or to the online Socket
// controller (server-authoritative, every player on their own device).

const DURATION_SETTINGS = {
  short:    { galleryMax: 6  },
  standard: { galleryMax: 10 },
  long:     { galleryMax: 15 },
};
const DIFFICULTY_SETTINGS = {
  easy:     { blackoutMax: 12 },
  standard: { blackoutMax: 8  },
  hard:     { blackoutMax: 4  },
};

let appMode = null; // 'local' | 'online'

// Shared option state (used by both the local setup and the online lobby).
let _duration   = 'standard';
let _difficulty = 'standard';
let _story      = 'immersif';
let _onlineTimerEnabled = false;
let _onlineTimerMinutes = 3;

let timerInterval = null;
let _cinematicTimer = null;

// Snapshot the host's currently chosen online options (persists across lobby
// re-renders). Referenced by socket.js when (re)rendering the lobby.
function getOnlineOptions() {
  const cb  = document.getElementById('timer-enabled');
  const dur = document.getElementById('timer-duration');
  if (cb)  _onlineTimerEnabled = cb.checked;
  if (dur) { const v = parseInt(dur.value, 10); if (Number.isFinite(v)) _onlineTimerMinutes = v; }
  return {
    duration: _duration, difficulty: _difficulty, story: _story,
    timerEnabled: _onlineTimerEnabled, timerMinutes: _onlineTimerMinutes,
  };
}
window.getOnlineOptions = getOnlineOptions;

function stopCinematic() {
  if (_cinematicTimer !== null) { clearTimeout(_cinematicTimer); _cinematicTimer = null; }
}

function renderAndMaybeSchedule() {
  stopCinematic();
  UI.render();
  const s = Game.getState();
  if (s && s.phase === 'turn-reveal-cinematic') {
    _cinematicTimer = setTimeout(() => {
      _cinematicTimer = null;
      const section = document.querySelector('.screen-cinematic');
      if (section) {
        section.classList.add('cin-exiting');
        _cinematicTimer = setTimeout(() => {
          _cinematicTimer = null;
          Game.advanceCinematic();
          renderAndMaybeSchedule();
        }, 500);
      } else {
        Game.advanceCinematic();
        renderAndMaybeSchedule();
      }
    }, 5000);
  }
}

function stopTimer() {
  if (timerInterval !== null) { clearInterval(timerInterval); timerInterval = null; }
}

function startTimer() {
  stopTimer();
  timerInterval = setInterval(() => {
    Game.tickTimer();
    UI.updateTimer();
    if (Game.getState()?.timerSecondsLeft === 0) stopTimer();
  }, 1000);
}

function resetOptions() {
  _duration   = 'standard';
  _difficulty = 'standard';
  _story      = 'immersif';
  _onlineTimerEnabled = false;
  _onlineTimerMinutes = 3;
}

document.addEventListener('DOMContentLoaded', () => {
  UI.renderModeSelect();
});

document.getElementById('app').addEventListener('click', e => {
  const target = e.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;

  // ── Mode selection & online pre-game ───────────────
  switch (action) {
    case 'select-mode-local':
      appMode = 'local';
      stopTimer(); stopCinematic();
      Game.setState(null);
      resetOptions();
      UI.renderSetup();
      return;
    case 'select-mode-online':
      appMode = 'online';
      stopTimer(); stopCinematic();
      Socket.reset();
      Game.setState(null);
      resetOptions();
      UI.renderOnlineEntry();
      return;
    case 'back-to-mode':
      appMode = null;
      Socket.reset();
      Game.setState(null);
      UI.renderModeSelect();
      return;
    case 'online-create': {
      const name = document.getElementById('online-name')?.value?.trim() || 'Joueur';
      Socket.emit('create-room', { playerName: name });
      return;
    }
    case 'online-join': {
      const code = document.getElementById('online-code')?.value?.trim().toUpperCase() || '';
      const name = document.getElementById('online-name')?.value?.trim() || 'Joueur';
      if (code.length !== 4) { UI.showToast('Entrez un code à 4 lettres.', 'error'); return; }
      Socket.emit('join-room', { code, playerName: name });
      return;
    }
    case 'online-start':
      Socket.emit('start-game', { settings: getOnlineOptions() });
      return;
  }

  // ── Option toggles (shared by local setup & online lobby) ──
  if (action === 'set-option') {
    const optionName = target.dataset.option;
    const value      = target.dataset.value;
    if (optionName === 'duration')   _duration   = value;
    if (optionName === 'difficulty') _difficulty = value;
    if (optionName === 'story')      _story      = value;
    target.closest('.option-btns').querySelectorAll('.opt-btn')
          .forEach(btn => btn.classList.remove('active'));
    target.classList.add('active');
    return;
  }

  if (appMode === 'online') {
    handleOnlineAction(action, target, e);
  } else {
    handleLocalAction(action, target, e);
  }
});

// ── Online action routing ──────────────────────────────

function handleOnlineAction(action, target, e) {
  switch (action) {
    // Cinematic reveal controls (played per player, started in sync by the
    // server moving everyone into the compose phase after the ready gate)
    case 'advance-cinematic': Socket.advanceCinematic(); return;
    case 'skip-cinematic':    Socket.skipCinematic();    return;

    // Zoom is always local (never synced to the server)
    case 'zoom-painting':
      Socket.setZoom(parseInt(target.dataset.paintingId, 10));
      return;
    case 'close-zoom':
      if (e.target.closest('.modal-content') && !e.target.closest('.modal-close')) return;
      Socket.clearZoom();
      return;
    case 'select-painting-from-modal':
      Socket.clearZoom();
      Socket.emit('game-action', { action: 'select-painting', payload: { paintingId: parseInt(target.dataset.paintingId, 10) } });
      return;
    case 'assign-from-modal':
      Socket.clearZoom();
      Socket.emit('game-action', { action: 'assign-guess', payload: { paintingId: parseInt(target.dataset.paintingId, 10) } });
      return;

    // Turn-reveal "ready" gate
    case 'begin-secret':
      Socket.emit('game-action', { action: 'ready-compose', payload: {} });
      return;

    // Parallel compose
    case 'select-painting':
      Socket.emit('game-action', { action: 'select-painting', payload: { paintingId: parseInt(target.dataset.paintingId, 10) } });
      return;
    case 'add-verse':
      Socket.emit('game-action', { action: 'add-verse', payload: { verseId: parseInt(target.dataset.verseId, 10) } });
      return;
    case 'remove-verse':
      Socket.emit('game-action', { action: 'remove-verse', payload: { verseId: parseInt(target.dataset.verseId, 10) } });
      return;
    case 'move-verse':
      Socket.emit('game-action', { action: 'move-verse', payload: { verseId: parseInt(target.dataset.verseId, 10), direction: target.dataset.dir } });
      return;
    case 'confirm-choice':
      Socket.emit('game-action', { action: 'confirm-choice', payload: {} });
      return;

    // Deduction / resolution / end
    case 'activate-deduction':
      Socket.emit('game-action', { action: 'activate-deduction', payload: { playerId: parseInt(target.dataset.playerId, 10) } });
      return;
    case 'confirm-guesses':
      // Online: every player must click before the answers are revealed.
      Socket.emit('game-action', { action: 'request-reveal', payload: {} });
      return;
    case 'next-turn':
      Socket.emit('game-action', { action: 'next-turn', payload: {} });
      return;
    case 'restart':
      Socket.emit('game-action', { action: 'restart', payload: {} });
      return;
  }
}

// ── Local action routing (single-device pass-and-play) ──

function handleLocalAction(action, target, e) {
  switch (action) {

    // ── Setup ──────────────────────────────────────────
    case 'count-inc': {
      const display = document.getElementById('count-display');
      const current = parseInt(display.textContent, 10);
      if (current < 6) UI.updatePlayerInputs(current + 1);
      break;
    }
    case 'count-dec': {
      const display = document.getElementById('count-display');
      const current = parseInt(display.textContent, 10);
      if (current > 2) UI.updatePlayerInputs(current - 1);
      break;
    }
    case 'start-game': {
      const count = parseInt(document.getElementById('count-display').textContent, 10);
      const names = Array.from({ length: count }, (_, i) => {
        const input = document.getElementById(`player-${i}`);
        return (input?.value?.trim()) || `Joueur ${i + 1}`;
      });
      const timerEnabled = document.getElementById('timer-enabled')?.checked ?? false;
      const timerMinutes = parseInt(document.getElementById('timer-duration')?.value, 10) || 3;
      const settings = {
        ...DURATION_SETTINGS[_duration],
        ...DIFFICULTY_SETTINGS[_difficulty],
        timerEnabled,
        timerDuration: timerMinutes * 60,
        storyMode: _story,
      };
      Game.init(names, settings);
      renderAndMaybeSchedule();
      break;
    }

    // ── Intro cinematic ────────────────────────────────
    case 'dismiss-intro':
      Game.dismissIntro();
      renderAndMaybeSchedule();
      break;

    // ── Painting cinematic reveal ──────────────────────
    case 'advance-cinematic':
      Game.advanceCinematic();
      renderAndMaybeSchedule();
      break;
    case 'skip-cinematic':
      Game.skipCinematic();
      renderAndMaybeSchedule();
      break;

    // ── Turn reveal ────────────────────────────────────
    case 'begin-secret':
      Game.beginSecretPhase();
      UI.render();
      break;

    // ── Pass screen ────────────────────────────────────
    case 'player-ready':
      Game.playerReady();
      if (Game.getState().timerEnabled) startTimer();
      UI.render();
      break;

    // ── Painting zoom modal ────────────────────────────
    case 'zoom-painting': {
      const paintingId = parseInt(target.dataset.paintingId, 10);
      Game.zoomPainting(paintingId);
      UI.render();
      break;
    }
    case 'close-zoom': {
      if (e.target.closest('.modal-content') && !e.target.closest('.modal-close')) break;
      Game.closeZoom();
      UI.render();
      break;
    }
    case 'select-painting-from-modal': {
      const paintingId = parseInt(target.dataset.paintingId, 10);
      Game.selectPainting(paintingId);
      Game.closeZoom();
      UI.render();
      break;
    }
    case 'select-painting': {
      const paintingId = parseInt(target.dataset.paintingId, 10);
      Game.selectPainting(paintingId);
      UI.render();
      break;
    }
    case 'assign-from-modal': {
      const paintingId = parseInt(target.dataset.paintingId, 10);
      Game.assignGuess(paintingId);
      Game.closeZoom();
      UI.render();
      break;
    }

    // ── Secret compose ─────────────────────────────────
    case 'add-verse': {
      const verseId = parseInt(target.dataset.verseId, 10);
      Game.addVerse(verseId);
      UI.render();
      break;
    }
    case 'remove-verse': {
      const verseId = parseInt(target.dataset.verseId, 10);
      Game.removeVerse(verseId);
      UI.render();
      break;
    }
    case 'move-verse': {
      const verseId = parseInt(target.dataset.verseId, 10);
      const dir     = target.dataset.dir;
      Game.moveVerse(verseId, dir);
      UI.render();
      break;
    }
    case 'confirm-choice':
      stopTimer();
      Game.confirmChoice();
      UI.render();
      break;

    // ── Deduction ──────────────────────────────────────
    case 'activate-deduction': {
      const playerId = parseInt(target.dataset.playerId, 10);
      Game.activateDeductionPlayer(playerId);
      UI.render();
      break;
    }
    case 'confirm-guesses':
      Game.confirmGuesses();
      UI.render();
      break;

    // ── Resolution ─────────────────────────────────────
    case 'next-turn':
      Game.nextTurn();
      renderAndMaybeSchedule();
      break;

    // ── End ────────────────────────────────────────────
    case 'restart':
      stopTimer();
      stopCinematic();
      resetOptions();
      Game.setState(null);
      appMode = null;
      UI.renderModeSelect();
      break;
  }
}

// ── Keyboard shortcuts ─────────────────────────────────

document.addEventListener('keydown', e => {
  const s = Game.getState();

  // Online reveal shortcuts
  if (appMode === 'online' && s) {
    if (s.phase === 'turn-reveal-cinematic') {
      if (e.key === 'Escape')              { e.preventDefault(); Socket.skipCinematic(); }
      else if (e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); Socket.advanceCinematic(); }
      return;
    }
    if (e.key === 'Escape' && s.zoomedPaintingId !== null) { Socket.clearZoom(); }
    return;
  }

  if (!s) return;

  if (s.phase === 'intro' && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    Game.dismissIntro();
    renderAndMaybeSchedule();
    return;
  }

  if (s.phase === 'turn-reveal-cinematic') {
    if (e.key === 'Escape') {
      e.preventDefault();
      Game.skipCinematic();
      renderAndMaybeSchedule();
    } else if (e.key === ' ' || e.key === 'ArrowRight') {
      e.preventDefault();
      Game.advanceCinematic();
      renderAndMaybeSchedule();
    }
    return;
  }

  if (e.key === 'Escape' && s.zoomedPaintingId !== null) {
    Game.closeZoom();
    UI.render();
  }
});
