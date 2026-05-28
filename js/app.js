// Entry point. Routes interactions to local Game or online Socket depending on mode.

let appMode   = null; // 'local' | 'online'
let localZoom = null; // zoom state managed locally in online mode

document.addEventListener('DOMContentLoaded', () => {
  UI.renderModeSelect();
});

document.getElementById('app').addEventListener('click', e => {
  const target = e.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;

  // ── Mode selection ─────────────────────────────────
  if (action === 'select-mode-local') {
    appMode   = 'local';
    localZoom = null;
    Game.setState(null);
    UI.renderSetup();
    return;
  }
  if (action === 'select-mode-online') {
    appMode   = 'online';
    localZoom = null;
    Game.setState(null);
    UI.renderOnlineEntry();
    return;
  }

  // ── Online pre-game ────────────────────────────────
  if (action === 'online-create') {
    const name = document.getElementById('online-name')?.value?.trim() || 'Joueur';
    Socket.emit('create-room', { playerName: name });
    return;
  }
  if (action === 'online-join') {
    const code = document.getElementById('online-code')?.value?.trim().toUpperCase() || '';
    const name = document.getElementById('online-name')?.value?.trim() || 'Joueur';
    Socket.emit('join-room', { code, playerName: name });
    return;
  }
  if (action === 'online-start') {
    Socket.emit('start-game');
    return;
  }

  // ── Online game ────────────────────────────────────
  if (appMode === 'online') {
    handleOnlineAction(action, target);
    return;
  }

  // ── Local game ─────────────────────────────────────
  handleLocalAction(action, target);
});

// ── Online action routing ──────────────────────────────

function handleOnlineAction(action, target) {
  // Zoom is always local (no server state)
  if (action === 'zoom-painting') {
    localZoom = parseInt(target.dataset.paintingId, 10);
    Game.setZoom(localZoom);
    UI.render();
    return;
  }
  if (action === 'close-zoom') {
    localZoom = null;
    Game.setZoom(null);
    UI.render();
    return;
  }
  if (action === 'select-painting-from-modal') {
    const paintingId = parseInt(target.dataset.paintingId, 10);
    localZoom = null;
    Game.setZoom(null);
    Socket.emit('game-action', { action: 'select-painting', payload: { paintingId } });
    return;
  }
  if (action === 'assign-from-modal') {
    const paintingId = parseInt(target.dataset.paintingId, 10);
    localZoom = null;
    Game.setZoom(null);
    Socket.emit('game-action', { action: 'assign-guess', payload: { paintingId } });
    return;
  }

  switch (action) {
    case 'begin-secret':
      Socket.emit('game-action', { action: 'begin-secret', payload: {} });
      break;
    case 'add-verse':
      Socket.emit('game-action', { action: 'add-verse', payload: { verseId: parseInt(target.dataset.verseId, 10) } });
      break;
    case 'remove-verse':
      Socket.emit('game-action', { action: 'remove-verse', payload: { verseId: parseInt(target.dataset.verseId, 10) } });
      break;
    case 'move-verse':
      Socket.emit('game-action', { action: 'move-verse', payload: { verseId: parseInt(target.dataset.verseId, 10), direction: target.dataset.dir } });
      break;
    case 'confirm-choice':
      Socket.emit('game-action', { action: 'confirm-choice', payload: {} });
      break;
    case 'activate-deduction':
      Socket.emit('game-action', { action: 'activate-deduction', payload: { playerId: parseInt(target.dataset.playerId, 10) } });
      break;
    case 'confirm-guesses':
      Socket.emit('game-action', { action: 'confirm-guesses', payload: {} });
      break;
    case 'next-turn':
      Socket.emit('game-action', { action: 'next-turn', payload: {} });
      break;
    case 'restart':
      Socket.emit('game-action', { action: 'restart', payload: {} });
      break;
  }
}

// ── Local action routing (unchanged logic) ─────────────

function handleLocalAction(action, target) {
  switch (action) {

    // ── Setup ────────────────────────────────────────
    case 'count-inc': {
      const display = document.getElementById('count-display');
      const current = parseInt(display.textContent, 10);
      if (current < 5) UI.updatePlayerInputs(current + 1);
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
      Game.init(names);
      UI.render();
      break;
    }

    // ── Turn reveal ──────────────────────────────────
    case 'begin-secret':
      Game.beginSecretPhase();
      UI.render();
      break;

    // ── Pass screen ──────────────────────────────────
    case 'player-ready':
      Game.playerReady();
      UI.render();
      break;

    // ── Zoom modal ───────────────────────────────────
    case 'zoom-painting': {
      const paintingId = parseInt(target.dataset.paintingId, 10);
      Game.zoomPainting(paintingId);
      UI.render();
      break;
    }
    case 'close-zoom':
      Game.closeZoom();
      UI.render();
      break;
    case 'select-painting-from-modal': {
      const paintingId = parseInt(target.dataset.paintingId, 10);
      Game.selectPainting(paintingId);
      Game.closeZoom();
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

    // ── Secret compose ───────────────────────────────
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
      Game.confirmChoice();
      UI.render();
      break;

    // ── Deduction ────────────────────────────────────
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

    // ── Resolution ───────────────────────────────────
    case 'next-turn':
      Game.nextTurn();
      UI.render();
      break;

    // ── End ──────────────────────────────────────────
    case 'restart':
      UI.renderModeSelect();
      break;
  }
}

// ── Keyboard shortcuts ─────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const s = Game.getState();
  if (!s || s.zoomedPaintingId === null) return;
  if (appMode === 'online') {
    localZoom = null;
    Game.setZoom(null);
  } else {
    Game.closeZoom();
  }
  UI.render();
});
