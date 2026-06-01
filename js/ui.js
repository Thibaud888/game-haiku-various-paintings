// UI rendering. Reads from Game.getState() and builds DOM.

const UI = (() => {

  const app = () => document.getElementById('app');

  function render() {
    const s = Game.getState();
    if (!s) { renderModeSelect(); return; }

    let html = '';
    switch (s.phase) {
      case 'intro':                html = htmlIntro(s); break;
      case 'turn-reveal-cinematic': html = htmlTurnRevealCinematic(s); break;
      case 'turn-reveal':          html = htmlTurnReveal(s); break;
      case 'pass-before':    html = htmlPassBefore(s); break;
      case 'secret-compose':
        html = (s.online && s.mySubmitted) ? htmlOnlineComposeWaiting(s) : htmlSecretCompose(s);
        break;
      case 'deduction':      html = htmlDeduction(s); break;
      case 'resolution':     html = htmlResolution(s); break;
      case 'end':            html = htmlEnd(s); break;
      default: html = '';
    }

    if (s.zoomedPaintingId !== null) {
      html += htmlZoomModal(s);
    }

    app().innerHTML = html;
  }

  // ── Helpers ─────────────────────────────────────────

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function paintingImgHtml(painting) {
    const title  = escapeHtml(painting.title);
    const artist = escapeHtml(painting.artist);
    const fallbackContent = `
      <div class="fb-title">${title}</div>
      <div class="fb-artist">${artist}</div>
      <div class="fb-year">${painting.year}</div>`;
    const remote = painting.remoteUrl || '';
    return `
      <div class="painting-img-wrap">
        <img
          src="${painting.imageUrl}"
          alt="${title}"
          loading="lazy"
          onerror="if(this.dataset.fallback){this.style.display='none';this.nextElementSibling.style.display='flex';}else{this.dataset.fallback='1';this.src='${remote}';}"
        >
        <div class="painting-fallback" style="display:none">${fallbackContent}</div>
      </div>`;
  }

  function paintingCardHtml(painting, index, options = {}) {
    const { selected, guessed, action, dataPaintingId, highlightedAs } = options;
    const cls = [
      'painting-card',
      selected && 'selected',
      guessed && 'guessed',
      highlightedAs && 'highlight-' + highlightedAs,
    ].filter(Boolean).join(' ');

    return `
      <div class="${cls}"
           ${action ? `data-action="${action}"` : ''}
           ${dataPaintingId !== undefined ? `data-painting-id="${dataPaintingId}"` : ''}>
        ${paintingImgHtml(painting)}
        ${index !== undefined ? `<div class="painting-number">${index + 1}</div>` : ''}
        <div class="painting-info">
          <div class="title">${escapeHtml(painting.title)}</div>
          <div class="artist">${escapeHtml(painting.artist)}, ${painting.year}</div>
        </div>
      </div>`;
  }

  function tracksHtml(s) {
    const { GALLERY_MAX, BLACKOUT_MAX } = Game.getConstants();
    function dots(count, max, cls) {
      return Array.from({ length: max }, (_, i) =>
        `<span class="dot ${cls} ${i < count ? 'filled' : ''}"></span>`
      ).join('');
    }
    return `
      <div class="tracks">
        <div class="progress-bar">
          <span class="progress-label gallery">Galerie</span>
          <div class="progress-dots">${dots(s.galleryProgress, GALLERY_MAX, 'gallery-dot')}</div>
        </div>
        <div class="progress-bar">
          <span class="progress-label blackout">Black-out</span>
          <div class="progress-dots">${dots(s.blackoutProgress, BLACKOUT_MAX, 'blackout-dot')}</div>
        </div>
      </div>`;
  }

  function verseText(verseId) {
    return VERSES.find(v => v.id === verseId)?.text ?? '';
  }

  function haikuLines(choice) {
    return (choice.verses || []).map(id => verseText(id));
  }

  function storyBeatHtml(text, cls = '') {
    if (!text) return '';
    return `<p class="story-beat ${cls}">${escapeHtml(text)}</p>`;
  }

  // ── Setup ────────────────────────────────────────────

  function renderSetup() {
    app().innerHTML = `
      <section class="screen-setup">
        <div>
          <h1 class="setup-title">Nuit au Musée</h1>
          <p class="setup-subtitle">
            Un jeu coopératif de haïkus et de tableaux célèbres.<br>
            Rejoignez la Grande Galerie avant le black-out.
          </p>
        </div>
        <form class="setup-form" id="setup-form" onsubmit="return false">
          <div class="player-count-row">
            <label>Joueurs</label>
            <button type="button" class="count-btn" data-action="count-dec">−</button>
            <div class="count-display" id="count-display">3</div>
            <button type="button" class="count-btn" data-action="count-inc">+</button>
          </div>
          <div class="player-names" id="player-names"></div>

          <div class="setup-options">
            <div class="option-group">
              <div class="option-label">Durée de partie</div>
              <div class="option-btns">
                <button class="opt-btn" data-action="set-option" data-option="duration" data-value="short">
                  Court<span class="opt-desc">6 tableaux gagnants</span>
                </button>
                <button class="opt-btn active" data-action="set-option" data-option="duration" data-value="standard">
                  Standard<span class="opt-desc">10 tableaux gagnants</span>
                </button>
                <button class="opt-btn" data-action="set-option" data-option="duration" data-value="long">
                  Long<span class="opt-desc">15 tableaux gagnants</span>
                </button>
              </div>
            </div>
            <div class="option-group">
              <div class="option-label">Difficulté</div>
              <div class="option-btns">
                <button class="opt-btn" data-action="set-option" data-option="difficulty" data-value="easy">
                  Facile<span class="opt-desc">12 erreurs tolérées</span>
                </button>
                <button class="opt-btn active" data-action="set-option" data-option="difficulty" data-value="standard">
                  Standard<span class="opt-desc">8 erreurs tolérées</span>
                </button>
                <button class="opt-btn" data-action="set-option" data-option="difficulty" data-value="hard">
                  Difficile<span class="opt-desc">4 erreurs tolérées</span>
                </button>
              </div>
            </div>
            <div class="option-group">
              <div class="option-label">Mode histoire</div>
              <div class="option-btns">
                <button class="opt-btn" data-action="set-option" data-option="story" data-value="sobre">
                  Sobre<span class="opt-desc">Texte d'origine</span>
                </button>
                <button class="opt-btn active" data-action="set-option" data-option="story" data-value="immersif">
                  Immersif<span class="opt-desc">Intro + ambiance complète</span>
                </button>
              </div>
            </div>
          </div>

          <div class="timer-row">
            <label class="timer-toggle-label">
              <input type="checkbox" id="timer-enabled"
                     onchange="document.getElementById('timer-duration-wrap').style.opacity=this.checked?'1':'0.35'">
              <span>Chronomètre</span>
            </label>
            <div class="timer-duration-wrap" id="timer-duration-wrap" style="opacity:0.35">
              <input type="number" id="timer-duration" min="1" max="30" value="3"
                     class="timer-duration-input">
              <span class="timer-duration-unit">min par joueur</span>
            </div>
          </div>
          <button type="button" class="btn btn-primary" data-action="start-game">
            Commencer la partie
          </button>
        </form>
      </section>`;
    updatePlayerInputs(3);
  }

  function updatePlayerInputs(count) {
    const container = document.getElementById('player-names');
    if (!container) return;
    const defaultNames = ['Alice', 'Bob', 'Clara', 'David', 'Élise', 'Félix'];
    container.innerHTML = Array.from({ length: count }, (_, i) => `
      <div class="player-input">
        <label for="player-${i}">Joueur ${i + 1}</label>
        <input id="player-${i}" type="text" placeholder="${defaultNames[i]}"
               maxlength="20" value="${defaultNames[i]}" data-player="${i}">
      </div>`).join('');
    document.getElementById('count-display').textContent = count;
  }

  // ── Intro cinematic ──────────────────────────────────

  function htmlIntro(s) {
    const lines = s.lastBeats.introLines || [];
    const isImmersif = s.storyMode === 'immersif';
    const linesHtml = lines.map((line, i) =>
      `<p class="intro-line" style="animation-delay:${0.3 + i * 2.0}s">${escapeHtml(line)}</p>`
    ).join('');
    const btnDelay = 0.3 + lines.length * 2.0 + 0.6;
    return `
      <section class="screen-intro">
        <div class="intro-eyebrow">Nuit au Musée</div>
        <div class="intro-lines">
          ${linesHtml}
        </div>
        <button class="btn btn-primary intro-btn"
                data-action="dismiss-intro"
                style="animation-delay:${btnDelay}s">
          Entrer dans le musée, sans bruit →
        </button>
      </section>`;
  }

  // ── Cinematic painting reveal (mode immersif) ────────

  function htmlTurnRevealCinematic(s) {
    const idx     = s.cinematicIndex;
    const total   = s.turnPaintings.length;
    const painting = s.turnPaintings[idx];
    const title   = escapeHtml(painting.title);
    const artist  = escapeHtml(painting.artist);
    const remote  = painting.remoteUrl || '';

    const dotsHtml = Array.from({ length: total }, (_, i) =>
      `<span class="cin-dot${i < idx ? ' past' : i === idx ? ' current' : ''}"></span>`
    ).join('');

    return `
      <section class="screen-cinematic" data-action="advance-cinematic">
        <div class="cin-counter">${idx + 1} / ${total}</div>
        <div class="cin-painting-wrap">
          <img
            class="cin-painting-img"
            src="${painting.imageUrl}"
            alt="${title}"
            onerror="if(this.dataset.fallback){this.style.display='none';this.nextElementSibling.style.display='flex';}else{this.dataset.fallback='1';this.src='${remote}';}"
          >
          <div class="cin-fallback" style="display:none">
            <div class="fb-title">${title}</div>
            <div class="fb-artist">${artist}</div>
            <div class="fb-year">${painting.year}</div>
          </div>
        </div>
        <div class="cin-info">
          <div class="cin-title">${title}</div>
          <div class="cin-artist">${artist} · ${painting.year}</div>
        </div>
        <div class="cin-footer">
          <div class="cin-dots">${dotsHtml}</div>
          <button class="btn" data-action="skip-cinematic">Passer</button>
        </div>
      </section>`;
  }

  // ── Turn reveal ──────────────────────────────────────

  function htmlTurnReveal(s) {
    const beat = s.storyMode !== 'sobre' ? storyBeatHtml(s.lastBeats.turnPrelude) : '';

    // Online: every player must click "Commencer les haïkus" before the secret
    // phase begins. Once ready, the button waits on the others.
    let actionsHtml;
    if (s.online) {
      actionsHtml = s.iAmReady
        ? `<button class="btn btn-primary" data-action="begin-secret" disabled>
             En attente des autres joueurs… (${s.readyCount}/${s.totalPlayers})
           </button>
           <p class="turn-ready-hint text-muted">Vous êtes prêt(e). La phase secrète démarrera quand tout le monde aura cliqué.</p>`
        : `<button class="btn btn-primary" data-action="begin-secret">
             Commencer les haïkus →
           </button>
           <p class="turn-ready-hint text-muted">${s.readyCount}/${s.totalPlayers} joueur${s.totalPlayers > 1 ? 's' : ''} prêt${s.readyCount > 1 ? 's' : ''}</p>`;
    } else {
      actionsHtml = `<button class="btn btn-primary" data-action="begin-secret">
          Commencer les haïkus →
        </button>`;
    }

    return `
      <section class="screen-turn-reveal">
        <div class="turn-header">
          ${beat}
          <h2>Tour ${s.turnIndex + 1} — Les tableaux du soir</h2>
          <p>Observez les six œuvres. Cliquez pour les agrandir. La phase secrète va commencer.</p>
        </div>
        ${tracksHtml(s)}
        <div class="paintings-grid large">
          ${s.turnPaintings.map((p, i) => paintingCardHtml(p, i, {
            action: 'zoom-painting',
            dataPaintingId: p.id,
          })).join('')}
        </div>
        <div class="turn-actions">
          ${actionsHtml}
        </div>
      </section>`;
  }

  // ── Pass screen ──────────────────────────────────────

  function htmlPassBefore(s) {
    const player  = s.players[s.secretIndex];
    const isFirst = s.secretIndex === 0;
    const sub = isFirst
      ? 'Les autres joueurs regardent ailleurs.'
      : 'Le joueur précédent s\'éloigne de l\'écran.';
    const whisper = s.storyMode === 'immersif'
      ? storyBeatHtml(s.lastBeats.passWhisper, 'beat-center') : '';
    return `
      <section class="screen-pass">
        <div class="pass-icon">🎨</div>
        <div class="pass-title">Passez l'écran à<br><em>${escapeHtml(player.name)}</em></div>
        <p class="pass-subtitle">
          ${sub}<br>
          <strong>${escapeHtml(player.name)}</strong>, appuyez quand vous êtes seul(e) à voir l'écran.
        </p>
        ${whisper}
        <button class="btn btn-primary" data-action="player-ready">
          J'ai l'écran, je suis prêt(e)
        </button>
      </section>`;
  }

  // ── Secret compose (combined pick + haiku) ──────────

  function htmlSecretCompose(s) {
    const player = Game.currentPlayer();
    const d      = s.draft;
    const ready  = Game.isDraftReady();
    const { HAIKU_LENGTH } = Game.getConstants();

    // 6 paintings — image zone zooms, dedicated "Choisir" button selects
    const paintingsHtml = s.turnPaintings.map((p, i) => {
      const selected = d.paintingId === p.id;
      const cls = ['painting-card', selected && 'selected'].filter(Boolean).join(' ');
      return `
        <div class="${cls}" data-action="zoom-painting" data-painting-id="${p.id}">
          ${paintingImgHtml(p)}
          <div class="painting-number">${i + 1}</div>
          <div class="painting-info">
            <div class="title">${escapeHtml(p.title)}</div>
            <div class="artist">${escapeHtml(p.artist)}, ${p.year}</div>
          </div>
          <div class="painting-card-btns">
            <button class="btn btn-sm" data-action="zoom-painting" data-painting-id="${p.id}">Agrandir</button>
            <button class="btn btn-sm btn-primary" data-action="select-painting" data-painting-id="${p.id}"
                    ${selected ? 'disabled' : ''}>
              ${selected ? '✓ Choisi' : 'Choisir'}
            </button>
          </div>
        </div>`;
    }).join('');

    // Composition slots
    const slotsHtml = Array.from({ length: HAIKU_LENGTH }, (_, slotIdx) => {
      const verseId = d.selectedVerses[slotIdx];
      if (verseId === undefined) {
        return `
          <div class="compose-slot empty">
            <span class="slot-num">${slotIdx + 1}</span>
            <span class="slot-placeholder">— choisissez un vers —</span>
          </div>`;
      }
      const isFirst = slotIdx === 0;
      const isLast  = slotIdx === d.selectedVerses.length - 1;
      return `
        <div class="compose-slot filled">
          <span class="slot-num">${slotIdx + 1}</span>
          <span class="slot-verse">${escapeHtml(verseText(verseId))}</span>
          <div class="slot-controls">
            <button class="slot-btn" data-action="move-verse" data-verse-id="${verseId}" data-dir="up"
                    ${isFirst ? 'disabled' : ''} title="Monter">↑</button>
            <button class="slot-btn" data-action="move-verse" data-verse-id="${verseId}" data-dir="down"
                    ${isLast ? 'disabled' : ''} title="Descendre">↓</button>
            <button class="slot-btn remove" data-action="remove-verse" data-verse-id="${verseId}"
                    title="Retirer">×</button>
          </div>
        </div>`;
    }).join('');

    // Verse hand
    const handHtml = player.verseHand.map(verseId => {
      const isUsed = d.selectedVerses.includes(verseId);
      return `
        <button class="verse-token ${isUsed ? 'used' : ''}"
                data-action="add-verse" data-verse-id="${verseId}"
                ${isUsed ? 'disabled' : ''}>
          ${escapeHtml(verseText(verseId))}
        </button>`;
    }).join('');

    const paintingHint = d.paintingId === null
      ? '<em class="text-muted">Aucun tableau sélectionné — cliquez sur une œuvre pour la choisir.</em>'
      : (() => {
          const p = s.turnPaintings.find(p => p.id === d.paintingId);
          return `<span class="chosen-painting">✓ ${escapeHtml(p.title)} — <span class="text-muted">${escapeHtml(p.artist)}</span></span>`;
        })();

    let timerHtml = '';
    if (s.timerEnabled) {
      const secs = s.timerSecondsLeft;
      const mins = Math.floor(secs / 60);
      const ss   = String(secs % 60).padStart(2, '0');
      const cls  = secs === 0 ? 'expired' : secs <= 30 ? 'warning' : '';
      const label = secs === 0 ? 'Temps écoulé !' : `${mins}:${ss}`;
      timerHtml = `<div class="timer-display ${cls}">${label}</div>`;
    }

    const whisper = s.storyMode === 'immersif'
      ? storyBeatHtml(s.lastBeats.composeWhisper) : '';

    return `
      <section class="screen-compose">
        <div class="compose-header">
          <div class="compose-header-top">
            <h2>${escapeHtml(player.name)}</h2>
            ${timerHtml}
          </div>
          ${whisper}
          <p class="text-muted">
            Cliquez sur l'image pour l'agrandir, puis « Choisir » pour sélectionner un tableau. Composez ensuite votre haïku en 3 vers.
          </p>
          ${s.online ? `<p class="compose-online-progress text-muted">${s.submittedCount}/${s.totalPlayers} joueur${s.totalPlayers > 1 ? 's' : ''} ont validé — chacun compose de son côté.</p>` : ''}
        </div>

        <div class="paintings-grid large">
          ${paintingsHtml}
        </div>

        <div class="compose-status">
          ${paintingHint}
        </div>

        <div class="compose-zone">
          <div class="compose-zone-label">Votre haïku</div>
          <div class="compose-slots">${slotsHtml}</div>
        </div>

        <div class="verse-hand">
          <div class="verse-hand-label">Vos 16 vers</div>
          <div class="verse-hand-grid">${handHtml}</div>
        </div>

        <div class="compose-actions">
          <button class="btn btn-primary" data-action="confirm-choice"
                  ${ready ? '' : 'disabled'}>
            Valider le haïku ✓
          </button>
        </div>
      </section>`;
  }

  // ── Deduction ────────────────────────────────────────

  function htmlDeduction(s) {
    const activeId = s.activeDeductionPlayer;

    function haikuEntryHtml(player) {
      const choice = s.choices.find(c => c.playerId === player.id);
      const lines  = choice ? haikuLines(choice) : [];
      const guess  = s.guesses[player.id];
      const guessedPainting = guess !== undefined
        ? s.turnPaintings.find(p => p.id === guess) : null;
      return `
        <div class="haiku-entry ${activeId === player.id ? 'active' : ''} ${guess !== undefined ? 'assigned' : ''}"
             data-action="activate-deduction" data-player-id="${player.id}">
          <div class="player-name">${escapeHtml(player.name)}</div>
          <div class="haiku-lines">
            ${lines.map(l => `<div>« ${escapeHtml(l)} »</div>`).join('')}
          </div>
          ${guessedPainting
            ? `<div class="assigned-badge">→ ${escapeHtml(guessedPainting.title)}</div>`
            : ''}
        </div>`;
    }

    const allDone = Game.allGuessesAssigned();
    const beat = s.storyMode !== 'sobre' ? storyBeatHtml(s.lastBeats.deductionTension) : '';

    const paintingsHtml = s.turnPaintings.map((p, i) => {
      const isGuessed = Object.values(s.guesses).includes(p.id);
      return paintingCardHtml(p, i, {
        guessed: isGuessed,
        action: 'zoom-painting',
        dataPaintingId: p.id,
      });
    }).join('');

    const activeBannerHtml = (() => {
      if (activeId === null) return '';
      const activePlayer = s.players.find(p => p.id === activeId);
      const activeChoice = s.choices.find(c => c.playerId === activeId);
      const activeLines  = activeChoice ? haikuLines(activeChoice) : [];
      return `
        <div class="deduction-active-banner">
          <div class="dab-player">${escapeHtml(activePlayer.name)}</div>
          <div class="dab-haiku">${activeLines.map(l => escapeHtml(l)).join(' · ')}</div>
        </div>`;
    })();

    return `
      <section class="screen-deduction">
        ${activeBannerHtml}
        <div class="deduction-header">
          ${beat}
          <h2>Déduction collective</h2>
          <p class="text-muted">
            Sélectionnez un haïku, puis cliquez sur le tableau qu'il décrit.
            Cliquez sur un tableau pour l'agrandir.
          </p>
        </div>
        ${tracksHtml(s)}
        <div class="deduction-layout">
          <div class="haiku-list">
            ${s.players.map(p => haikuEntryHtml(p)).join('')}
          </div>
          <div class="paintings-grid large">
            ${paintingsHtml}
          </div>
        </div>
        <div class="deduction-actions">
          <button class="btn btn-primary" data-action="confirm-guesses"
                  ${allDone ? '' : 'disabled'}>
            Révéler les réponses →
          </button>
        </div>
      </section>`;
  }

  // ── Resolution ───────────────────────────────────────

  function htmlResolution(s) {
    const { items, allCorrect, correctCount } = s.lastResolution;
    const over      = Game.checkGameOver();
    const wrongCount = items.length - correctCount;

    function itemHtml({ player, choice, painting, guessedPainting, correct }) {
      const lines = choice ? haikuLines(choice) : [];
      return `
        <div class="resolution-item ${correct ? 'correct' : 'wrong'}">
          <div class="ri-painting-wrap"
               ${painting ? `data-action="zoom-painting" data-painting-id="${painting.id}"` : ''}>
            ${painting
              ? `<img src="${painting.imageUrl}" alt="${escapeHtml(painting.title)}"
                       onerror="if(this.dataset.fallback){this.style.display='none';}else{this.dataset.fallback='1';this.src='${painting.remoteUrl || ''}';}">`
              : '<div class="ri-no-painting">—</div>'}
          </div>
          <div class="ri-body">
            <div class="ri-header">
              <span class="ri-player">${escapeHtml(player.name)}</span>
              <span class="ri-result">${correct ? '✓' : '✗'}</span>
            </div>
            <div class="ri-painting-title">
              ${escapeHtml(painting?.title ?? '?')}
              <span class="text-muted"> — ${escapeHtml(painting?.artist ?? '')}</span>
            </div>
            <div class="ri-haiku">${lines.map(l => `« ${escapeHtml(l)} »`).join('<br>')}</div>
            ${!correct && guessedPainting
              ? `<div class="ri-wrong-guess">→ associé à : ${escapeHtml(guessedPainting.title)}</div>`
              : ''}
          </div>
        </div>`;
    }

    let verdictClass, verdictMsg;
    if (allCorrect) {
      verdictClass = 'success';
      verdictMsg   = `✓ Parfait ! ${correctCount} tableau${correctCount > 1 ? 'x' : ''} rejoignent la galerie.`;
    } else if (correctCount === 0) {
      verdictClass = 'failure';
      verdictMsg   = `✗ Aucune association correcte — +${wrongCount} pour le black-out.`;
    } else {
      verdictClass = 'partial';
      verdictMsg   = `${correctCount} correcte${correctCount > 1 ? 's' : ''} (+${correctCount} galerie) · ${wrongCount} erreur${wrongCount > 1 ? 's' : ''} (+${wrongCount} black-out)`;
    }

    const nextLabel = over ? 'Voir le résultat →' : 'Tour suivant →';
    const beat = s.storyMode !== 'sobre' ? storyBeatHtml(s.lastBeats.resolutionBeat) : '';

    return `
      <section class="screen-resolution">
        <div class="resolution-header">
          <h2>Résolution</h2>
        </div>
        ${beat}
        <div class="resolution-verdict ${verdictClass}">${verdictMsg}</div>
        ${tracksHtml(s)}
        <div class="resolution-list">
          ${items.map(i => itemHtml(i)).join('')}
        </div>
        <div class="resolution-actions">
          <button class="btn btn-primary" data-action="next-turn">${nextLabel}</button>
        </div>
      </section>`;
  }

  // ── End ──────────────────────────────────────────────

  function htmlEnd(s) {
    const { GALLERY_MAX } = Game.getConstants();
    const won = s.galleryProgress >= GALLERY_MAX;
    const msg = won
      ? 'Vous avez rejoint la Grande Galerie avant le black-out. Le musée est sauvé !'
      : 'Les lumières se sont éteintes une à une. Le musée a sombré dans l\'obscurité…';
    const epilogue = s.storyMode !== 'sobre' && s.lastBeats.endingEpilogue
      ? `<p class="end-epilogue">${escapeHtml(s.lastBeats.endingEpilogue)}</p>` : '';
    return `
      <section class="screen-end">
        <h1 class="${won ? 'win' : 'lose'}">${won ? 'Victoire !' : 'Black-out.'}</h1>
        <p class="end-sub">${msg}</p>
        ${epilogue}
        ${tracksHtml(s)}
        <button class="btn btn-primary" data-action="restart">Nouvelle partie</button>
      </section>`;
  }

  // ── Modal (zoom on painting) ────────────────────────

  function htmlZoomModal(s) {
    const painting = s.turnPaintings.find(p => p.id === s.zoomedPaintingId)
                   || PAINTINGS.find(p => p.id === s.zoomedPaintingId);
    if (!painting) return '';

    let ctxAction = '';
    if (s.phase === 'secret-compose') {
      const alreadySelected = s.draft.paintingId === painting.id;
      ctxAction = `
        <button class="btn btn-primary"
                data-action="select-painting-from-modal"
                data-painting-id="${painting.id}"
                ${alreadySelected ? 'disabled' : ''}>
          ${alreadySelected ? '✓ Tableau sélectionné' : 'Choisir ce tableau'}
        </button>`;
    } else if (s.phase === 'deduction' && s.activeDeductionPlayer !== null) {
      ctxAction = `
        <button class="btn btn-primary"
                data-action="assign-from-modal"
                data-painting-id="${painting.id}">
          Assigner ce tableau au haïku
        </button>`;
    }

    return `
      <div class="modal-overlay" data-action="close-zoom">
        <div class="modal-content">
          <button class="modal-close" data-action="close-zoom" aria-label="Fermer">×</button>
          <div class="modal-img-wrap">
            <img src="${painting.imageUrl}"
                 alt="${escapeHtml(painting.title)}"
                 onerror="if(this.dataset.fallback){this.style.display='none';this.nextElementSibling.style.display='flex';}else{this.dataset.fallback='1';this.src='${painting.remoteUrl || ''}';}">
            <div class="modal-fallback" style="display:none">
              <div class="fb-title">${escapeHtml(painting.title)}</div>
              <div class="fb-artist">${escapeHtml(painting.artist)}</div>
              <div class="fb-year">${painting.year}</div>
            </div>
          </div>
          <div class="modal-info">
            <div class="modal-title">${escapeHtml(painting.title)}</div>
            <div class="modal-artist">${escapeHtml(painting.artist)} · ${painting.year}</div>
          </div>
          ${ctxAction ? `<div class="modal-actions">${ctxAction}</div>` : ''}
        </div>
      </div>`;
  }

  // ── Online: waiting for the other composers ──────────

  function htmlOnlineComposeWaiting(s) {
    return `
      <section class="screen-waiting">
        ${tracksHtml(s)}
        <div class="waiting-body">
          <div class="waiting-icon">✓</div>
          <h2 class="waiting-title">Haïku validé</h2>
          <p class="waiting-sub">En attente des autres joueurs…</p>
          <p class="waiting-progress text-muted">
            ${s.submittedCount}/${s.totalPlayers} joueur${s.totalPlayers > 1 ? 's' : ''} ${s.submittedCount > 1 ? 'ont' : 'a'} validé
          </p>
        </div>
      </section>`;
  }

  // ── Online: mode select ──────────────────────────────

  function renderModeSelect() {
    app().innerHTML = `
      <section class="screen-mode-select">
        <div>
          <h1 class="setup-title">Nuit au Musée</h1>
          <p class="setup-subtitle">
            Un jeu coopératif de haïkus et de tableaux célèbres.<br>
            Rejoignez la Grande Galerie avant le black-out.
          </p>
        </div>
        <div class="mode-buttons">
          <button class="btn btn-primary btn-mode" data-action="select-mode-local">
            Jouer en local
            <span class="btn-mode-sub">Sur cet appareil, en passant l'écran</span>
          </button>
          <button class="btn btn-mode" data-action="select-mode-online">
            Jouer en ligne
            <span class="btn-mode-sub">Chacun sur son propre appareil</span>
          </button>
        </div>
      </section>`;
  }

  // ── Online: entry (name + create / join) ─────────────

  function renderOnlineEntry() {
    app().innerHTML = `
      <section class="screen-online-entry">
        <h2 class="setup-title" style="font-size:clamp(2rem,5vw,3.5rem)">Jouer en ligne</h2>
        <p class="setup-subtitle">Entrez votre nom, puis créez ou rejoignez une partie.</p>
        <div class="online-entry-form">
          <div class="online-field">
            <label for="online-name">Votre nom</label>
            <input id="online-name" type="text" placeholder="Alice" maxlength="20" autocomplete="off">
          </div>
          <div class="online-actions">
            <button class="btn btn-primary btn-online-action" data-action="online-create">
              Créer une partie
            </button>
            <div class="online-separator">ou rejoindre avec un code</div>
            <div class="online-field">
              <label for="online-code">Code de la partie</label>
              <input id="online-code" class="online-code-input" type="text"
                     placeholder="ABCD" maxlength="4" autocomplete="off"
                     autocapitalize="characters" spellcheck="false">
            </div>
            <button class="btn btn-online-action" data-action="online-join">Rejoindre</button>
          </div>
        </div>
        <button class="btn btn-back-mode" data-action="back-to-mode">← Retour</button>
      </section>`;
    document.getElementById('online-name')?.focus();
  }

  // Reusable game-options block (host configures these in the lobby).
  function onlineOptionsHtml(opts) {
    const { duration, difficulty, story, timerEnabled, timerMinutes } = opts;
    const act = (group, val) => group === val ? ' active' : '';
    return `
      <div class="setup-options">
        <div class="option-group">
          <div class="option-label">Durée de partie</div>
          <div class="option-btns">
            <button class="opt-btn${act(duration,'short')}" data-action="set-option" data-option="duration" data-value="short">
              Court<span class="opt-desc">6 tableaux gagnants</span>
            </button>
            <button class="opt-btn${act(duration,'standard')}" data-action="set-option" data-option="duration" data-value="standard">
              Standard<span class="opt-desc">10 tableaux gagnants</span>
            </button>
            <button class="opt-btn${act(duration,'long')}" data-action="set-option" data-option="duration" data-value="long">
              Long<span class="opt-desc">15 tableaux gagnants</span>
            </button>
          </div>
        </div>
        <div class="option-group">
          <div class="option-label">Difficulté</div>
          <div class="option-btns">
            <button class="opt-btn${act(difficulty,'easy')}" data-action="set-option" data-option="difficulty" data-value="easy">
              Facile<span class="opt-desc">12 erreurs tolérées</span>
            </button>
            <button class="opt-btn${act(difficulty,'standard')}" data-action="set-option" data-option="difficulty" data-value="standard">
              Standard<span class="opt-desc">8 erreurs tolérées</span>
            </button>
            <button class="opt-btn${act(difficulty,'hard')}" data-action="set-option" data-option="difficulty" data-value="hard">
              Difficile<span class="opt-desc">4 erreurs tolérées</span>
            </button>
          </div>
        </div>
        <div class="option-group">
          <div class="option-label">Mode histoire</div>
          <div class="option-btns">
            <button class="opt-btn${act(story,'sobre')}" data-action="set-option" data-option="story" data-value="sobre">
              Sobre<span class="opt-desc">Texte d'origine</span>
            </button>
            <button class="opt-btn${act(story,'immersif')}" data-action="set-option" data-option="story" data-value="immersif">
              Immersif<span class="opt-desc">Intro + ambiance complète</span>
            </button>
          </div>
        </div>
      </div>
      <div class="timer-row">
        <label class="timer-toggle-label">
          <input type="checkbox" id="timer-enabled" ${timerEnabled ? 'checked' : ''}
                 onchange="document.getElementById('timer-duration-wrap').style.opacity=this.checked?'1':'0.35'">
          <span>Chronomètre</span>
        </label>
        <div class="timer-duration-wrap" id="timer-duration-wrap" style="opacity:${timerEnabled ? '1' : '0.35'}">
          <input type="number" id="timer-duration" min="1" max="30" value="${timerMinutes}"
                 class="timer-duration-input">
          <span class="timer-duration-unit">min par joueur</span>
        </div>
      </div>`;
  }

  // ── Online: lobby (host sees options + start) ────────

  function renderLobby({ code, players, myPlayerId, options }) {
    const isHost   = myPlayerId === 0;
    const canStart = players.length >= 2;
    app().innerHTML = `
      <section class="screen-lobby">
        <h2 class="setup-title" style="font-size:clamp(1.8rem,4vw,3rem)">Salle d'attente</h2>
        <div class="lobby-code-block">
          <div class="lobby-code-label">Code de la partie</div>
          <div class="lobby-code-value">${escapeHtml(code)}</div>
          <div class="lobby-code-hint">Partagez ce code avec vos amis</div>
        </div>
        <div class="lobby-players">
          <div class="lobby-players-label">Joueurs (${players.length}/6)</div>
          <ul class="lobby-player-list">
            ${players.map((name, i) => `
              <li class="lobby-player ${i === myPlayerId ? 'me' : ''}">
                ${i === 0 ? '<span class="host-crown">♛</span>' : ''}
                ${escapeHtml(name)}
                ${i === myPlayerId ? '<span class="me-tag">(vous)</span>' : ''}
              </li>`).join('')}
          </ul>
        </div>
        ${isHost ? `
          <div class="lobby-options">
            <div class="lobby-options-title">Options de la partie</div>
            ${onlineOptionsHtml(options)}
          </div>
          <button class="btn btn-primary" data-action="online-start" ${canStart ? '' : 'disabled'}>
            Lancer la partie
          </button>
          ${!canStart ? `<p class="lobby-waiting-hint">En attente d'au moins un autre joueur…</p>` : ''}
        ` : `
          <p class="lobby-waiting-hint">En attente que l'hôte règle les options et lance la partie…</p>
        `}
      </section>`;
  }

  // ── Toast notifications ──────────────────────────────

  function showToast(message, type = 'info') {
    const existing = document.getElementById('toast');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.id = 'toast';
    el.className = `toast toast-${type}`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  // ── Timer (in-place update, avoids full re-render) ──

  function updateTimer() {
    const s = Game.getState();
    if (!s || !s.timerEnabled) return;
    const el = document.querySelector('.timer-display');
    if (!el) return;
    const secs = s.timerSecondsLeft;
    const mins = Math.floor(secs / 60);
    const ss   = String(secs % 60).padStart(2, '0');
    el.className  = 'timer-display' + (secs === 0 ? ' expired' : secs <= 30 ? ' warning' : '');
    el.textContent = secs === 0 ? 'Temps écoulé !' : `${mins}:${ss}`;
  }

  // ── Expose ───────────────────────────────────────────

  return {
    render, renderSetup, updatePlayerInputs, updateTimer,
    renderModeSelect, renderOnlineEntry, renderLobby, showToast,
  };

})();
