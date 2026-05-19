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
      const count   = parseInt(document.getElementById('count-display').textContent, 10);
      const names   = Array.from({ length: count }, (_, i) => {
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

    // ── Secret pick ────────────────────────────────────
    case 'select-painting': {
      const paintingId = parseInt(target.dataset.paintingId, 10);
      Game.selectPainting(paintingId);
      UI.render();
      break;
    }
    case 'confirm-pick':
      Game.confirmPick();
      UI.render();
      break;

    // ── Secret haiku ───────────────────────────────────
    case 'back-to-pick':
      Game.getState().phase = 'secret-pick';
      UI.render();
      break;
    case 'select-verse': {
      const verseId = parseInt(target.dataset.verseId, 10);
      const group   = target.dataset.group;
      Game.selectVerse(verseId, group);
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
    case 'assign-guess': {
      const paintingId = parseInt(target.dataset.paintingId, 10);
      Game.assignGuess(paintingId);
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
