// Server-side game logic — factory pattern (one instance per room).
// Adapted from js/game.js but built for ONLINE play, where every player
// composes in PARALLEL (each on their own screen) instead of passing one
// shared screen around. Key differences from the local game:
//   • a turn-reveal "ready" gate: the secret phase only starts once every
//     player has clicked "Commencer les haïkus";
//   • one independent draft per player during the secret phase;
//   • the deduction stays collective (any player can drive it).

const { PAINTINGS } = require('../js/data/paintings');
const { VERSES, VERSES_PER_PLAYER } = require('../js/data/verses');
const { STORY } = require('../js/data/story');

const HAIKU_LENGTH = 3;

function create() {
  let state = null;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function turnMood() {
    const ratio = state.blackoutProgress / state.blackoutMax;
    if (ratio >= 0.5) return 'dire';
    if (state.blackoutProgress > state.galleryProgress) return 'tense';
    return 'calm';
  }

  function emptyDraft() {
    return { paintingId: null, selectedVerses: [] };
  }

  function pickTurnPaintings() {
    if (state.poolOffset + 6 > state.paintingPool.length) {
      state.paintingPool = shuffle(PAINTINGS.slice());
      state.poolOffset = 0;
    }
    state.turnPaintings = state.paintingPool.slice(state.poolOffset, state.poolOffset + 6);
    state.poolOffset += 6;
  }

  // ── Setup ─────────────────────────────────────────────

  function init(playerNames, settings = {}) {
    const shuffledVerses = shuffle(VERSES.slice());
    let cursor = 0;
    const players = playerNames.map((name, id) => {
      const hand = shuffledVerses.slice(cursor, cursor + VERSES_PER_PLAYER).map(v => v.id);
      cursor += VERSES_PER_PLAYER;
      return { id, name, verseHand: hand };
    });

    const {
      timerEnabled  = false,
      timerDuration = 180,
      storyMode     = 'immersif',
    } = settings;

    state = {
      phase: 'turn-reveal',
      players,

      galleryMax:  settings.galleryMax  ?? 10,
      blackoutMax: settings.blackoutMax ?? 8,

      paintingPool: shuffle(PAINTINGS.slice()),
      poolOffset: 0,

      turnIndex: 0,
      turnPaintings: [],

      ready:     {},   // playerId -> true (turn-reveal gate)
      drafts:    {},   // playerId -> draft  (parallel composing)
      submitted: {},   // playerId -> true   (haiku validated)

      choices: [],
      guesses: {},
      activeDeductionPlayer: null,
      revealVotes: {},   // playerId -> true (deduction → resolution gate)

      galleryProgress: 0,
      blackoutProgress: 0,
      lastResolution: null,

      timerEnabled,
      timerDuration,

      storyMode,
      lastBeats: {},
    };

    pickTurnPaintings();

    if (storyMode !== 'sobre') {
      state.lastBeats.introLines  = STORY.buildIntro();
      state.lastBeats.turnPrelude = STORY.pick(STORY.turnPrelude[turnMood()]);
    }
  }

  // ── Turn-reveal ready gate ────────────────────────────

  function allReady() {
    return state.players.every(p => state.ready[p.id]);
  }

  // Each player clicks "Commencer les haïkus"; compose only starts once
  // everyone is ready. Returns true if the secret phase has just begun.
  function markReady(playerId) {
    if (state.phase !== 'turn-reveal') return false;
    state.ready[playerId] = true;
    if (allReady()) {
      beginCompose();
      return true;
    }
    return false;
  }

  function beginCompose() {
    state.drafts      = {};
    state.submitted   = {};
    state.choices     = [];
    state.guesses     = {};
    state.revealVotes = {};
    state.players.forEach(p => { state.drafts[p.id] = emptyDraft(); });
    if (state.storyMode !== 'sobre') {
      state.lastBeats.composeWhisper = STORY.pick(STORY.composeWhisper);
    }
    state.phase = 'secret-compose';
  }

  // ── Parallel compose actions (per player) ─────────────

  function draftOf(playerId) {
    if (!state.drafts[playerId]) state.drafts[playerId] = emptyDraft();
    return state.drafts[playerId];
  }

  function canEdit(playerId) {
    return state.phase === 'secret-compose' && !state.submitted[playerId];
  }

  function selectPainting(playerId, paintingId) {
    if (!canEdit(playerId)) return;
    draftOf(playerId).paintingId = paintingId;
  }

  function addVerse(playerId, verseId) {
    if (!canEdit(playerId)) return;
    const d = draftOf(playerId);
    if (d.selectedVerses.length >= HAIKU_LENGTH) return;
    if (d.selectedVerses.includes(verseId)) return;
    d.selectedVerses.push(verseId);
  }

  function removeVerse(playerId, verseId) {
    if (!canEdit(playerId)) return;
    const d = draftOf(playerId);
    d.selectedVerses = d.selectedVerses.filter(v => v !== verseId);
  }

  function moveVerse(playerId, verseId, direction) {
    if (!canEdit(playerId)) return;
    const arr = draftOf(playerId).selectedVerses;
    const idx = arr.indexOf(verseId);
    if (idx === -1) return;
    if (direction === 'up' && idx > 0) {
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    } else if (direction === 'down' && idx < arr.length - 1) {
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    }
  }

  function isDraftReady(playerId) {
    const d = draftOf(playerId);
    return d.paintingId !== null && d.selectedVerses.length === HAIKU_LENGTH;
  }

  function confirmChoice(playerId) {
    if (!canEdit(playerId)) return;
    if (!isDraftReady(playerId)) return;
    const d = draftOf(playerId);
    state.choices.push({
      playerId,
      paintingId: d.paintingId,
      verses:     d.selectedVerses.slice(),
    });
    state.submitted[playerId] = true;

    if (state.players.every(p => state.submitted[p.id])) {
      if (state.storyMode !== 'sobre') {
        state.lastBeats.deductionTension = STORY.pick(STORY.deductionTension);
      }
      state.phase = 'deduction';
      state.activeDeductionPlayer = state.players[0].id;
    }
  }

  function submittedCount() {
    return state.players.filter(p => state.submitted[p.id]).length;
  }

  // ── Deduction (collective) ────────────────────────────

  function activateDeductionPlayer(playerId) {
    state.activeDeductionPlayer = playerId;
  }

  function assignGuess(paintingId) {
    if (state.activeDeductionPlayer === null) return;
    state.guesses[state.activeDeductionPlayer] = paintingId;
    // Changing an assignment cancels any pending "reveal" votes.
    state.revealVotes = {};
    const unassigned = state.players.find(
      p => state.guesses[p.id] === undefined && p.id !== state.activeDeductionPlayer
    );
    state.activeDeductionPlayer = unassigned ? unassigned.id : null;
  }

  function allGuessesAssigned() {
    return state.players.every(p => state.guesses[p.id] !== undefined);
  }

  // Online gate: every player must click "Révéler les réponses" before the
  // round resolves. Returns true when the resolution has just happened.
  function requestReveal(playerId) {
    if (state.phase !== 'deduction' || !allGuessesAssigned()) return false;
    state.revealVotes[playerId] = true;
    if (state.players.every(p => state.revealVotes[p.id])) {
      confirmGuesses();
      return true;
    }
    return false;
  }

  function revealVoteCount() {
    return state.players.filter(p => state.revealVotes[p.id]).length;
  }

  function confirmGuesses() {
    if (!allGuessesAssigned()) return;
    resolveRound();
    if (state.storyMode !== 'sobre') {
      const pool = state.lastResolution.allCorrect
        ? STORY.resolutionSuccess : STORY.resolutionFailure;
      state.lastBeats.resolutionBeat = STORY.pick(pool);
    }
    state.phase = 'resolution';
  }

  function resolveRound() {
    const items = state.players.map(player => {
      const choice  = state.choices.find(c => c.playerId === player.id);
      const guessed = state.guesses[player.id];
      const correct = !!choice && guessed === choice.paintingId;

      const painting        = state.turnPaintings.find(p => p.id === choice?.paintingId);
      const guessedPainting = state.turnPaintings.find(p => p.id === guessed);

      return { player, choice, painting, guessedPainting, correct };
    });

    const correctCount = items.filter(i => i.correct).length;
    state.galleryProgress  += correctCount;
    state.blackoutProgress += (items.length - correctCount);

    state.lastResolution = { items, allCorrect: correctCount === items.length, correctCount };
  }

  function checkGameOver() {
    if (state.galleryProgress  >= state.galleryMax)  return 'win';
    if (state.blackoutProgress >= state.blackoutMax) return 'lose';
    return null;
  }

  function nextTurn() {
    if (checkGameOver()) {
      if (state.storyMode !== 'sobre') {
        const pool = state.galleryProgress >= state.galleryMax
          ? STORY.endingWin : STORY.endingLose;
        state.lastBeats.endingEpilogue = STORY.pick(pool);
      }
      state.phase = 'end';
      return;
    }
    state.turnIndex++;
    pickTurnPaintings();
    state.ready       = {};
    state.drafts      = {};
    state.submitted   = {};
    state.choices     = [];
    state.guesses     = {};
    state.revealVotes = {};
    state.activeDeductionPlayer = null;
    if (state.storyMode !== 'sobre') {
      state.lastBeats.turnPrelude = STORY.pick(STORY.turnPrelude[turnMood()]);
    }
    state.phase = 'turn-reveal';
  }

  function getState() { return state; }

  function readyCount() {
    return state.players.filter(p => state.ready[p.id]).length;
  }

  return {
    init,
    getState,
    markReady,
    allReady,
    readyCount,
    selectPainting,
    addVerse,
    removeVerse,
    moveVerse,
    isDraftReady,
    confirmChoice,
    submittedCount,
    activateDeductionPlayer,
    assignGuess,
    allGuessesAssigned,
    requestReveal,
    revealVoteCount,
    confirmGuesses,
    checkGameOver,
    nextTurn,
  };
}

module.exports = { create, HAIKU_LENGTH, VERSES_PER_PLAYER };
