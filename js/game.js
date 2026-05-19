// Game state and logic.
// All state is held in a single `state` object; mutations go through
// the exported functions so ui.js always reads a consistent snapshot.

const Game = (() => {

  const GALLERY_MAX  = 7;
  const BLACKOUT_MAX = 5;

  let state = null;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ── Public API ───────────────────────────────────────

  function init(playerNames) {
    state = {
      phase: 'turn-reveal',

      players: playerNames.map((name, id) => ({ id, name })),
      secretIndex: 0,          // which player is currently in secret phase

      paintingPool: shuffle(PAINTINGS.slice()),
      poolOffset: 0,           // next painting to draw

      turnIndex: 0,
      turnPaintings: [],        // 6 paintings for current turn

      choices: [],              // [{playerId, paintingId, verseA, verseB, verseC}]
      draft: emptyDraft(),

      // {playerId: guessedPaintingId} — collective assignment
      guesses: {},

      // painting id currently highlighted in deduction (right-panel active)
      activeDeductionPlayer: null,

      galleryProgress: 0,
      blackoutProgress: 0,
      lastResolution: null,     // filled by resolveRound()
    };

    pickTurnPaintings();
  }

  function emptyDraft() {
    return { paintingId: null, verseA: null, verseB: null, verseC: null };
  }

  function pickTurnPaintings() {
    const start = state.poolOffset;
    const end   = start + 6;
    if (end > state.paintingPool.length) {
      // reshuffle once pool is exhausted
      state.paintingPool = shuffle(PAINTINGS.slice());
      state.poolOffset   = 0;
    }
    state.turnPaintings = state.paintingPool.slice(state.poolOffset, state.poolOffset + 6);
    state.poolOffset   += 6;
  }

  // Turn reveal → begin secret phase for player 0
  function beginSecretPhase() {
    state.secretIndex = 0;
    state.choices     = [];
    state.guesses     = {};
    state.draft       = emptyDraft();
    state.phase       = 'pass-before';
  }

  // Shown after pass screen — player sees paintings to pick
  function playerReady() {
    state.phase = 'secret-pick';
  }

  function selectPainting(paintingId) {
    state.draft.paintingId = paintingId;
  }

  function confirmPick() {
    if (state.draft.paintingId === null) return;
    state.phase = 'secret-haiku';
  }

  function selectVerse(verseId, group) {
    const key = 'verse' + group; // verseA / verseB / verseC
    state.draft[key] = verseId;
  }

  function confirmChoice() {
    const d = state.draft;
    if (d.paintingId === null || d.verseA === null || d.verseB === null || d.verseC === null) return;

    state.choices.push({
      playerId:   state.players[state.secretIndex].id,
      paintingId: d.paintingId,
      verseA: d.verseA,
      verseB: d.verseB,
      verseC: d.verseC,
    });

    const isLast = state.secretIndex === state.players.length - 1;
    if (isLast) {
      // All players done → deduction
      state.draft  = emptyDraft();
      state.phase  = 'deduction';
      state.activeDeductionPlayer = state.players[0].id;
    } else {
      state.secretIndex++;
      state.draft = emptyDraft();
      state.phase = 'pass-before';
    }
  }

  // Deduction: select which haiku card to assign
  function activateDeductionPlayer(playerId) {
    state.activeDeductionPlayer = playerId;
  }

  // Deduction: assign active haiku to a painting
  function assignGuess(paintingId) {
    if (state.activeDeductionPlayer === null) return;
    state.guesses[state.activeDeductionPlayer] = paintingId;
    // Auto-advance to next unassigned haiku
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
      const choice  = state.choices.find(c => c.playerId === player.id);
      const guessed = state.guesses[player.id];
      const correct = choice && guessed === choice.paintingId;
      if (!correct) allCorrect = false;

      const painting = state.turnPaintings.find(p => p.id === choice?.paintingId);
      const guessedPainting = state.turnPaintings.find(p => p.id === guessed);

      return {
        player,
        choice,
        painting,
        guessedPainting,
        correct,
      };
    });

    if (allCorrect) {
      state.galleryProgress++;
    } else {
      state.blackoutProgress++;
    }

    state.lastResolution = { items, allCorrect };
  }

  function checkGameOver() {
    if (state.galleryProgress  >= GALLERY_MAX)  return 'win';
    if (state.blackoutProgress >= BLACKOUT_MAX) return 'lose';
    return null;
  }

  function nextTurn() {
    const over = checkGameOver();
    if (over) {
      state.phase = 'end';
      return;
    }
    state.turnIndex++;
    pickTurnPaintings();
    state.phase = 'turn-reveal';
  }

  function getState() { return state; }

  function getConstants() { return { GALLERY_MAX, BLACKOUT_MAX }; }

  return {
    init,
    getState,
    getConstants,
    beginSecretPhase,
    playerReady,
    selectPainting,
    confirmPick,
    selectVerse,
    confirmChoice,
    activateDeductionPlayer,
    assignGuess,
    allGuessesAssigned,
    confirmGuesses,
    nextTurn,
  };

})();
