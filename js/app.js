// Entry point. Initialises the app and handles all user interactions
// via event delegation on #app.

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

let _duration   = 'standard';
let _difficulty = 'standard';
let _story      = 'immersif';

let timerInterval = null;

function stopTimer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function startTimer() {
  stopTimer();
  timerInterval = setInterval(() => {
    Game.tickTimer();
    UI.updateTimer();
    if (Game.getState()?.timerSecondsLeft === 0) stopTimer();
  }, 1000);
}

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
      UI.render();
      break;
    }
    case 'set-option': {
      const optionName = target.dataset.option;
      const value      = target.dataset.value;
      if (optionName === 'duration')   _duration   = value;
      if (optionName === 'difficulty') _difficulty = value;
      if (optionName === 'story')      _story      = value;
      target.closest('.option-btns').querySelectorAll('.opt-btn')
            .forEach(btn => btn.classList.remove('active'));
      target.classList.add('active');
      break;
    }

    // ── Intro cinematic ────────────────────────────────
    case 'dismiss-intro':
      Game.dismissIntro();
      UI.render();
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
      UI.render();
      break;

    // ── End ────────────────────────────────────────────
    case 'restart':
      stopTimer();
      _duration   = 'standard';
      _difficulty = 'standard';
      _story      = 'immersif';
      UI.renderSetup();
      break;
  }
});

document.addEventListener('keydown', e => {
  const s = Game.getState();
  if (!s) return;

  if (s.phase === 'intro' && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    Game.dismissIntro();
    UI.render();
    return;
  }

  if (e.key === 'Escape' && s.zoomedPaintingId !== null) {
    Game.closeZoom();
    UI.render();
  }
});
