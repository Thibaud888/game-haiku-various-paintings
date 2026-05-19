// UI rendering. Reads from Game.getState() and builds DOM.

const UI = (() => {

  const app = () => document.getElementById('app');

  function render() {
    const s = Game.getState();
    if (!s) { renderSetup(); return; }

    switch (s.phase) {
      case 'turn-reveal':  renderTurnReveal(s); break;
      case 'pass-before':  renderPassBefore(s); break;
      case 'secret-pick':  renderSecretPick(s); break;
      case 'secret-haiku': renderSecretHaiku(s); break;
      case 'deduction':    renderDeduction(s);   break;
      case 'resolution':   renderResolution(s);  break;
      case 'end':          renderEnd(s);          break;
      default: renderSetup();
    }
  }

  // ── Helpers ─────────────────────────────────────────

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function paintingImgHtml(painting, extraClass = '') {
    const esc = painting.title.replace(/'/g, '&#39;');
    return `
      <div class="painting-img-wrap">
        <img
          src="${painting.imageUrl}"
          alt="${esc}"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
        >
        <div class="painting-fallback" style="display:none">
          <span>${esc}</span>
        </div>
      </div>`;
  }

  function tracksHtml(s) {
    const { GALLERY_MAX, BLACKOUT_MAX } = Game.getConstants();

    function dots(count, max, cssClass) {
      return Array.from({ length: max }, (_, i) =>
        `<span class="dot ${cssClass} ${i < count ? 'filled' : ''}"></span>`
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
    if (verseId === null) return null;
    return VERSES.find(v => v.id === verseId)?.text ?? null;
  }

  function haiku3Lines(choice) {
    return [verseText(choice.verseA), verseText(choice.verseB), verseText(choice.verseC)];
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
    const defaultNames = ['Alice', 'Bob', 'Clara', 'David', 'Élise'];
    container.innerHTML = Array.from({ length: count }, (_, i) => `
      <div class="player-input">
        <label for="player-${i}">Joueur ${i + 1}</label>
        <input id="player-${i}" type="text" placeholder="${defaultNames[i]}"
               maxlength="20" value="${defaultNames[i]}" data-player="${i}">
      </div>`).join('');
    document.getElementById('count-display').textContent = count;
  }

  // ── Turn reveal ──────────────────────────────────────

  function renderTurnReveal(s) {
    app().innerHTML = `
      <section class="screen-turn-reveal">
        <div class="turn-header">
          <h2>Tour ${s.turnIndex + 1} — Les tableaux du soir</h2>
          <p>Mémorisez les six œuvres. La phase secrète va commencer.</p>
        </div>
        ${tracksHtml(s)}
        <div class="paintings-grid">
          ${s.turnPaintings.map((p, i) => `
            <div class="painting-card" data-painting-id="${p.id}">
              ${paintingImgHtml(p)}
              <div class="painting-number">${i + 1}</div>
              <div class="painting-info">
                <div class="title">${p.title}</div>
                <div class="artist">${p.artist}, ${p.year}</div>
              </div>
            </div>`).join('')}
        </div>
        <div class="turn-actions">
          <button class="btn btn-primary" data-action="begin-secret">
            Commencer les haïkus →
          </button>
        </div>
      </section>`;
  }

  // ── Pass screen ──────────────────────────────────────

  function renderPassBefore(s) {
    const player = s.players[s.secretIndex];
    const isFirst = s.secretIndex === 0;
    const sub = isFirst
      ? 'Les autres joueurs regardent ailleurs.'
      : `Le joueur précédent s'éloigne de l'écran.`;

    app().innerHTML = `
      <section class="screen-pass">
        <div class="pass-icon">🎨</div>
        <div class="pass-title">Passez l'écran à<br><em>${player.name}</em></div>
        <p class="pass-subtitle">${sub}<br>
           <strong>${player.name}</strong>, appuyez sur le bouton quand vous êtes seul(e) à voir l'écran.</p>
        <button class="btn btn-primary" data-action="player-ready">
          J'ai l'écran, je suis prêt(e)
        </button>
      </section>`;
  }

  // ── Secret pick ──────────────────────────────────────

  function renderSecretPick(s) {
    const player = s.players[s.secretIndex];
    const selected = s.draft.paintingId;

    app().innerHTML = `
      <section class="screen-secret">
        <div class="secret-header">
          <h2>${player.name}</h2>
          <p>Choisissez secrètement un tableau à faire deviner.</p>
        </div>
        <div class="paintings-grid pick">
          ${s.turnPaintings.map((p, i) => `
            <div class="painting-card ${selected === p.id ? 'selected' : ''}"
                 data-action="select-painting" data-painting-id="${p.id}">
              ${paintingImgHtml(p)}
              <div class="painting-number">${i + 1}</div>
              <div class="painting-info">
                <div class="title">${p.title}</div>
                <div class="artist">${p.artist}</div>
              </div>
            </div>`).join('')}
        </div>
        <div class="secret-actions">
          <button class="btn btn-primary" data-action="confirm-pick"
                  ${selected === null ? 'disabled' : ''}>
            Composer le haïku →
          </button>
        </div>
      </section>`;
  }

  // ── Secret haiku ─────────────────────────────────────

  function renderSecretHaiku(s) {
    const player   = s.players[s.secretIndex];
    const painting = s.turnPaintings.find(p => p.id === s.draft.paintingId);
    const d        = s.draft;

    const lineA = d.verseA !== null ? `"${verseText(d.verseA)}"` : null;
    const lineB = d.verseB !== null ? `"${verseText(d.verseB)}"` : null;
    const lineC = d.verseC !== null ? `"${verseText(d.verseC)}"` : null;

    function groupHtml(group) {
      const g = VERSE_GROUPS[group];
      const selected = d['verse' + group];
      return `
        <div class="verse-group">
          <div class="verse-group-label">${g.label} <span class="syl">${g.syllables}</span></div>
          ${g.verses.map(v => `
            <div class="verse-token ${selected === v.id ? 'selected' : ''}"
                 data-action="select-verse" data-verse-id="${v.id}" data-group="${group}">
              ${v.text}
            </div>`).join('')}
        </div>`;
    }

    const allPicked = d.verseA !== null && d.verseB !== null && d.verseC !== null;

    app().innerHTML = `
      <section class="screen-secret">
        <div class="secret-header">
          <h2>${player.name}</h2>
          <p>Composez votre haïku pour guider vos coéquipiers.</p>
        </div>
        <div class="haiku-builder">
          <div class="selected-painting-row">
            <img src="${painting.imageUrl}"
                 onerror="this.style.display='none'"
                 alt="${painting.title}">
            <div class="sp-info">
              <div class="sp-title">${painting.title}</div>
              <div class="sp-artist">${painting.artist}</div>
            </div>
          </div>
          <div class="verse-groups">
            ${groupHtml('A')}
            ${groupHtml('B')}
            ${groupHtml('C')}
          </div>
          <div class="haiku-preview">
            ${lineA ? `<span class="line">${lineA}</span>` : '<span class="line empty">— premier vers —</span>'}
            ${lineB ? `<span class="line">${lineB}</span>` : '<span class="line empty">— deuxième vers —</span>'}
            ${lineC ? `<span class="line">${lineC}</span>` : '<span class="line empty">— troisième vers —</span>'}
          </div>
        </div>
        <div class="secret-actions">
          <button class="btn" data-action="back-to-pick">← Rechoisir un tableau</button>
          <button class="btn btn-primary" data-action="confirm-choice"
                  ${allPicked ? '' : 'disabled'}>
            Valider le haïku ✓
          </button>
        </div>
      </section>`;
  }

  // ── Deduction ────────────────────────────────────────

  function renderDeduction(s) {
    const activeId = s.activeDeductionPlayer;

    function haikuEntryHtml(player) {
      const choice = s.choices.find(c => c.playerId === player.id);
      const lines  = choice ? haiku3Lines(choice) : [];
      const guess  = s.guesses[player.id];
      const guessedPainting = guess !== undefined
        ? s.turnPaintings.find(p => p.id === guess) : null;

      return `
        <div class="haiku-entry ${activeId === player.id ? 'active' : ''} ${guess !== undefined ? 'assigned' : ''}"
             data-action="activate-deduction" data-player-id="${player.id}">
          <div class="player-name">${player.name}</div>
          <div class="haiku-lines">
            ${lines.filter(Boolean).map(l => `<div>"${l}"</div>`).join('')}
          </div>
          ${guessedPainting
            ? `<div class="assigned-badge">→ ${guessedPainting.title}</div>`
            : ''}
        </div>`;
    }

    function paintingCardHtml(painting, index) {
      const isGuessed = Object.values(s.guesses).includes(painting.id);
      return `
        <div class="painting-card ${isGuessed ? 'guessed' : ''}"
             data-action="assign-guess" data-painting-id="${painting.id}">
          ${paintingImgHtml(painting)}
          <div class="painting-number">${index + 1}</div>
          <div class="painting-info">
            <div class="title">${painting.title}</div>
            <div class="artist">${painting.artist}</div>
          </div>
        </div>`;
    }

    const allDone = Game.allGuessesAssigned();

    app().innerHTML = `
      <section class="screen-deduction">
        <div class="deduction-header">
          <h2>Déduction collective</h2>
          <p>Sélectionnez un haïku, puis cliquez sur le tableau qu'il décrit.</p>
        </div>
        ${tracksHtml(s)}
        <div class="deduction-layout">
          <div class="haiku-list">
            ${s.players.map(p => haikuEntryHtml(p)).join('')}
          </div>
          <div class="paintings-pick-grid">
            ${s.turnPaintings.map((p, i) => paintingCardHtml(p, i)).join('')}
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

  function renderResolution(s) {
    const { items, allCorrect } = s.lastResolution;
    const over = Game.checkGameOver();

    function itemHtml({ player, choice, painting, guessedPainting, correct }) {
      const lines = choice ? haiku3Lines(choice) : [];
      return `
        <div class="resolution-item">
          <div class="ri-painting">
            ${painting
              ? `<img src="${painting.imageUrl}" alt="${painting.title}"
                      onerror="this.style.display='none'">`
              : ''}
          </div>
          <div class="ri-text">
            <div class="ri-player">${player.name} — ${painting?.title ?? '?'}</div>
            <div class="ri-haiku">${lines.filter(Boolean).map(l => `"${l}"`).join(' / ')}</div>
            ${!correct && guessedPainting
              ? `<div style="font-size:0.78rem;color:var(--danger);margin-top:4px">
                   Réponse donnée : ${guessedPainting.title}
                 </div>`
              : ''}
          </div>
          <div class="ri-result">${correct ? '✓' : '✗'}</div>
        </div>`;
    }

    const verdictClass = allCorrect ? 'success' : 'failure';
    const verdictMsg   = allCorrect
      ? '✓ Toutes les associations sont correctes — la Galerie avance !'
      : '✗ Une erreur s\'est glissée — le black-out progresse…';

    let nextLabel = 'Tour suivant →';
    if (over === 'win')  nextLabel = 'Voir le résultat →';
    if (over === 'lose') nextLabel = 'Voir le résultat →';

    app().innerHTML = `
      <section class="screen-resolution">
        <div class="resolution-header">
          <h2>Résolution</h2>
        </div>
        <div class="resolution-verdict ${verdictClass}">${verdictMsg}</div>
        ${tracksHtml(s)}
        <div class="resolution-list">
          ${items.map(item => itemHtml(item)).join('')}
        </div>
        <div class="resolution-actions">
          <button class="btn btn-primary" data-action="next-turn">${nextLabel}</button>
        </div>
      </section>`;
  }

  // ── End ──────────────────────────────────────────────

  function renderEnd(s) {
    const won  = s.galleryProgress >= Game.getConstants().GALLERY_MAX;
    const msg  = won
      ? 'Vous avez rejoint la Grande Galerie avant le black-out. Le musée est sauvé !'
      : 'Les lumières se sont éteintes une à une. Le musée a sombré dans l\'obscurité…';

    app().innerHTML = `
      <section class="screen-end">
        <h1 class="${won ? 'win' : 'lose'}">${won ? 'Victoire !' : 'Black-out.'}</h1>
        <p class="end-sub">${msg}</p>
        ${tracksHtml(s)}
        <button class="btn btn-primary" data-action="restart">Nouvelle partie</button>
      </section>`;
  }

  // ── Expose ───────────────────────────────────────────

  return { render, renderSetup, updatePlayerInputs };

})();
