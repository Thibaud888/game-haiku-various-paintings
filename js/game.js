// Game state and logic.
// All state is held in a single `state` object; mutations go through
// the exported functions so ui.js always reads a consistent snapshot.

const Game = (() => {

  const HAIKU_LENGTH = 3;

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

  // ── Public API ───────────────────────────────────────

  function init(playerNames, settings = {}) {
    // Distribute unique 16-verse hands to each player from the pool.
    const shuffledVerses = shuffle(VERSES.slice());
    let cursor = 0;

    const players = playerNames.map((name, id) => {
      const hand = shuffledVerses
        .slice(cursor, cursor + VERSES_PER_PLAYER)
        .map(v => v.id);
      cursor += VERSES_PER_PLAYER;
      return { id, name, verseHand: hand };
    });

    const {
      timerEnabled = false,
      timerDuration = 180,
      storyMode = 'standard',
    } = settings;

    state = {
      phase: 'turn-reveal',

      players,
      secretIndex: 0,
      composeOrder: players.map(p => p.id),

      galleryMax:  settings.galleryMax  ?? 10,
      blackoutMax: settings.blackoutMax ?? 8,

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

      timerEnabled,
      timerDuration,
      timerSecondsLeft: 0,

      storyMode,
      lastBeats: {},
    };

    pickTurnPaintings();

    if (storyMode !== 'sobre') {
      state.lastBeats.introLines  = STORY.pickIntro();
      state.lastBeats.turnPrelude = STORY.pick(STORY.turnPrelude[turnMood()]);
      state.phase = 'intro';
    }
  }

  function dismissIntro() {
    state.phase = 'turn-reveal';
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

  // Turn reveal → begin secret phase, rotating start player each turn
  function beginSecretPhase() {
    const offset = state.turnIndex % state.players.length;
    const ids = state.players.map(p => p.id);
    state.composeOrder = [...ids.slice(offset), ...ids.slice(0, offset)];
    state.secretIndex = 0;
    state.choices     = [];
    state.guesses     = {};
    state.draft       = emptyDraft();
    if (state.storyMode !== 'sobre') {
      state.lastBeats.passWhisper = STORY.pick(STORY.passWhisper);
    }
    state.phase = 'pass-before';
  }

  // Shown after pass screen — player enters the compose phase
  function playerReady() {
    if (state.timerEnabled) state.timerSecondsLeft = state.timerDuration;
    if (state.storyMode !== 'sobre') {
      state.lastBeats.composeWhisper = STORY.pick(STORY.composeWhisper);
    }
    state.phase = 'secret-compose';
  }

  function tickTimer() {
    if (state.timerSecondsLeft > 0) state.timerSecondsLeft--;
  }

  // ── Compose actions ───────────────────────────────────

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
      playerId:   state.composeOrder[state.secretIndex],
      paintingId: d.paintingId,
      verses:     d.selectedVerses.slice(),
    });

    const isLast = state.secretIndex === state.composeOrder.length - 1;
    if (isLast) {
      state.draft = emptyDraft();
      if (state.storyMode !== 'sobre') {
        state.lastBeats.deductionTension = STORY.pick(STORY.deductionTension);
      }
      state.phase = 'deduction';
      state.activeDeductionPlayer = state.players[0].id;
    } else {
      state.secretIndex++;
      state.draft = emptyDraft();
      if (state.storyMode !== 'sobre') {
        state.lastBeats.passWhisper = STORY.pick(STORY.passWhisper);
      }
      state.phase = 'pass-before';
    }
  }

  // ── Modal (zoom) ──────────────────────────────────────

  function zoomPainting(paintingId) {
    state.zoomedPaintingId = paintingId;
  }

  function closeZoom() {
    state.zoomedPaintingId = null;
  }

  // ── Deduction ─────────────────────────────────────────

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
    if (state.storyMode !== 'sobre') {
      state.lastBeats.turnPrelude = STORY.pick(STORY.turnPrelude[turnMood()]);
    }
    state.phase = 'turn-reveal';
  }

  // ── Accessors ────────────────────────────────────────

  function getState() { return state; }

  function getConstants() {
    return {
      GALLERY_MAX:  state ? state.galleryMax  : 10,
      BLACKOUT_MAX: state ? state.blackoutMax : 8,
      HAIKU_LENGTH,
      VERSES_PER_PLAYER,
    };
  }

  function currentPlayer() {
    const playerId = state.composeOrder[state.secretIndex];
    return state.players.find(p => p.id === playerId);
  }

  function setPhase(phase) { state.phase = phase; }

  return {
    init,
    getState,
    getConstants,
    currentPlayer,
    setPhase,
    beginSecretPhase,
    playerReady,
    dismissIntro,
    tickTimer,
    selectPainting,
    addVerse,
    removeVerse,
    moveVerse,
    isDraftReady,
    confirmChoice,
    zoomPainting,
    closeZoom,
    activateDeductionPlayer,
    assignGuess,
    allGuessesAssigned,
    confirmGuesses,
    checkGameOver,
    nextTurn,
  };

})();
