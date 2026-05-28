// Server-side game logic — factory pattern (one instance per room).
// Mirrors js/game.js but runs in Node.js and is instantiated per room.

const { PAINTINGS } = require('../js/data/paintings');
const { VERSES, VERSES_PER_PLAYER } = require('../js/data/verses');

const GALLERY_MAX  = 7;
const BLACKOUT_MAX = 5;
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

  function init(playerNames) {
    const shuffledVerses = shuffle(VERSES.slice());
    let cursor = 0;
    const players = playerNames.map((name, id) => {
      const hand = shuffledVerses.slice(cursor, cursor + VERSES_PER_PLAYER).map(v => v.id);
      cursor += VERSES_PER_PLAYER;
      return { id, name, verseHand: hand };
    });

    state = {
      phase: 'turn-reveal',
      players,
      secretIndex: 0,
      paintingPool: shuffle(PAINTINGS.slice()),
      poolOffset: 0,
      turnIndex: 0,
      turnPaintings: [],
      choices: [],
      draft: emptyDraft(),
      guesses: {},
      activeDeductionPlayer: null,
      galleryProgress: 0,
      blackoutProgress: 0,
      lastResolution: null,
      zoomedPaintingId: null,
    };

    pickTurnPaintings();
  }

  function beginSecretPhase() {
    state.secretIndex = 0;
    state.choices     = [];
    state.guesses     = {};
    state.draft       = emptyDraft();
    state.phase       = 'pass-before';
  }

  function playerReady() {
    state.phase = 'secret-compose';
  }

  function selectPainting(paintingId) {
    state.draft.paintingId = paintingId;
  }

  function addVerse(verseId) {
    const d = state.draft;
    if (d.selectedVerses.length >= HAIKU_LENGTH) return;
    if (d.selectedVerses.includes(verseId)) return;
    d.selectedVerses.push(verseId);
  }

  function removeVerse(verseId) {
    state.draft.selectedVerses = state.draft.selectedVerses.filter(v => v !== verseId);
  }

  function moveVerse(verseId, direction) {
    const arr = state.draft.selectedVerses;
    const idx = arr.indexOf(verseId);
    if (idx === -1) return;
    if (direction === 'up' && idx > 0) {
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    } else if (direction === 'down' && idx < arr.length - 1) {
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    }
  }

  function isDraftReady() {
    const d = state.draft;
    return d.paintingId !== null && d.selectedVerses.length === HAIKU_LENGTH;
  }

  function confirmChoice() {
    if (!isDraftReady()) return;
    const d = state.draft;
    state.choices.push({
      playerId:   state.players[state.secretIndex].id,
      paintingId: d.paintingId,
      verses:     d.selectedVerses.slice(),
    });
    const isLast = state.secretIndex === state.players.length - 1;
    if (isLast) {
      state.draft = emptyDraft();
      state.phase = 'deduction';
      state.activeDeductionPlayer = state.players[0].id;
    } else {
      state.secretIndex++;
      state.draft = emptyDraft();
      state.phase = 'pass-before';
    }
  }

  function activateDeductionPlayer(playerId) {
    state.activeDeductionPlayer = playerId;
  }

  function assignGuess(paintingId) {
    if (state.activeDeductionPlayer === null) return;
    state.guesses[state.activeDeductionPlayer] = paintingId;
    const unassigned = state.players.find(
      p => state.guesses[p.id] === undefined && p.id !== state.activeDeductionPlayer
    );
    state.activeDeductionPlayer = unassigned ? unassigned.id : null;
  }

  function allGuessesAssigned() {
    return state.players.every(p => state.guesses[p.id] !== undefined);
  }

  function confirmGuesses() {
    if (!allGuessesAssigned()) return;
    resolveRound();
    state.phase = 'resolution';
  }

  function resolveRound() {
    let allCorrect = true;
    const items = state.players.map(player => {
      const choice        = state.choices.find(c => c.playerId === player.id);
      const guessed       = state.guesses[player.id];
      const correct       = !!choice && guessed === choice.paintingId;
      if (!correct) allCorrect = false;
      const painting        = state.turnPaintings.find(p => p.id === choice?.paintingId);
      const guessedPainting = state.turnPaintings.find(p => p.id === guessed);
      return { player, choice, painting, guessedPainting, correct };
    });
    if (allCorrect) state.galleryProgress++;
    else            state.blackoutProgress++;
    state.lastResolution = { items, allCorrect };
  }

  function checkGameOver() {
    if (state.galleryProgress  >= GALLERY_MAX)  return 'win';
    if (state.blackoutProgress >= BLACKOUT_MAX) return 'lose';
    return null;
  }

  function nextTurn() {
    if (checkGameOver()) { state.phase = 'end'; return; }
    state.turnIndex++;
    pickTurnPaintings();
    state.phase = 'turn-reveal';
  }

  function getState() { return state; }

  return {
    init,
    getState,
    beginSecretPhase,
    playerReady,
    selectPainting,
    addVerse,
    removeVerse,
    moveVerse,
    isDraftReady,
    confirmChoice,
    activateDeductionPlayer,
    assignGuess,
    allGuessesAssigned,
    confirmGuesses,
    checkGameOver,
    nextTurn,
  };
}

module.exports = { create, GALLERY_MAX, BLACKOUT_MAX, HAIKU_LENGTH, VERSES_PER_PLAYER };
