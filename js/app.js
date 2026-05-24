// Entry point. Initialises the app and handles all user interactions
// via event delegation on #app.

document.addEventListener('DOMContentLoaded', () => {
  UI.renderSetup();
});

document.getElementById('app').addEventListener('click', e => {
  const target = e.target.closest('[data-action]');
  if (!target) return;

  const action = target.dataset.action;

  switch (action) {

    // ── Setup ──────────────────────────────────────────
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

    // ── Turn reveal ────────────────────────────────────
    case 'begin-secret':
      Game.beginSecretPhase();
      UI.render();
      break;

    // ── Pass screen ────────────────────────────────────
    case 'player-ready':
      Game.playerReady();
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
      // Only close when clicking the overlay background or the × button,
      // not when clicking elsewhere inside .modal-content
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
      UI.render();
      break;

    // ── End ────────────────────────────────────────────
    case 'restart':
      UI.renderSetup();
      break;
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const s = Game.getState();
    if (s && s.zoomedPaintingId !== null) {
      Game.closeZoom();
      UI.render();
    }
  }
});
