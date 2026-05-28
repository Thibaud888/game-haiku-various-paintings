// UI rendering. Reads from Game.getState() and builds DOM.

const UI = (() => {

  const app = () => document.getElementById('app');

  function render() {
    const s = Game.getState();
    if (!s) { renderSetup(); return; }

    const isOnline = s.myPlayerId !== undefined;
    let html = '';

    switch (s.phase) {
      case 'turn-reveal':
        html = htmlTurnReveal(s);
        break;
      case 'pass-before':
        html = isOnline ? htmlOnlineWaiting(s) : htmlPassBefore(s);
        break;
      case 'secret-compose':
        html = (isOnline && s.myPlayerId !== s.secretIndex)
          ? htmlOnlineWaiting(s)
          : htmlSecretCompose(s);
        break;
      case 'deduction':   html = htmlDeduction(s);  break;
      case 'resolution':  html = htmlResolution(s); break;
      case 'end':         html = htmlEnd(s);         break;
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
    // Fallback en cascade : local → remote Wikimedia → fiche stylée.
    // 1er onerror : bascule sur l'URL distante et reconfigure onerror pour
    // afficher la fiche stylée si le distant échoue aussi.
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

  // ── Mode select ──────────────────────────────────────

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

  // ── Online entry ─────────────────────────────────────

  function renderOnlineEntry() {
    app().innerHTML = `
      <section class="screen-online-entry">
        <button class="btn-back" data-action="select-mode-local" style="display:none"></button>
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
            <div class="online-separator">ou</div>
            <div class="online-join-row">
              <input id="online-code" type="text" placeholder="Code ABCD" maxlength="4"
                     autocomplete="off" style="text-transform:uppercase;letter-spacing:0.2em">
              <button class="btn btn-online-action" data-action="online-join">Rejoindre</button>
            </div>
          </div>
        </div>
        <button class="btn btn-back-mode" data-action="select-mode-local">← Retour</button>
      </section>`;
    document.getElementById('online-name')?.focus();
  }

  // ── Lobby ─────────────────────────────────────────────

  function renderLobby({ code, players, myPlayerId }) {
    const isHost  = myPlayerId === 0;
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
          <div class="lobby-players-label">Joueurs (${players.length}/5)</div>
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
          <button class="btn btn-primary" data-action="online-start" ${canStart ? '' : 'disabled'}>
            Commencer la partie
          </button>
          ${!canStart ? `<p class="lobby-waiting-hint">En attente d'au moins un autre joueur…</p>` : ''}
        ` : `
          <p class="lobby-waiting-hint">En attente que l'hôte lance la partie…</p>
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

  function htmlTurnReveal(s) {
    return `
      <section class="screen-turn-reveal">
        <div class="turn-header">
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
          <button class="btn btn-primary" data-action="begin-secret">
            Commencer les haïkus →
          </button>
        </div>
      </section>`;
  }

  // ── Pass screen ──────────────────────────────────────

  function htmlPassBefore(s) {
    const player = s.players[s.secretIndex];
    const isFirst = s.secretIndex === 0;
    const sub = isFirst
      ? 'Les autres joueurs regardent ailleurs.'
      : 'Le joueur précédent s\'éloigne de l\'écran.';
    return `
      <section class="screen-pass">
        <div class="pass-icon">🎨</div>
        <div class="pass-title">Passez l'écran à<br><em>${escapeHtml(player.name)}</em></div>
        <p class="pass-subtitle">
          ${sub}<br>
          <strong>${escapeHtml(player.name)}</strong>, appuyez quand vous êtes seul(e) à voir l'écran.
        </p>
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

    // 6 paintings
    const paintingsHtml = s.turnPaintings.map((p, i) => paintingCardHtml(p, i, {
      selected: d.paintingId === p.id,
      action: 'zoom-painting',
      dataPaintingId: p.id,
    })).join('');

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

    return `
      <section class="screen-compose">
        <div class="compose-header">
          <h2>${escapeHtml(player.name)}</h2>
          <p class="text-muted">
            Choisissez un tableau (cliquez pour agrandir) et composez votre haïku en 3 vers.
          </p>
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

    const paintingsHtml = s.turnPaintings.map((p, i) => {
      const isGuessed = Object.values(s.guesses).includes(p.id);
      return paintingCardHtml(p, i, {
        guessed: isGuessed,
        action: 'zoom-painting',
        dataPaintingId: p.id,
      });
    }).join('');

    return `
      <section class="screen-deduction">
        <div class="deduction-header">
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
    const { items, allCorrect } = s.lastResolution;
    const over = Game.checkGameOver();

    function itemHtml({ player, choice, painting, guessedPainting, correct }) {
      const lines = choice ? haikuLines(choice) : [];
      return `
        <div class="resolution-item">
          <div class="ri-painting">
            ${painting
              ? `<img src="${painting.imageUrl}" alt="${escapeHtml(painting.title)}"
                      onerror="if(this.dataset.fallback){this.style.display='none';}else{this.dataset.fallback='1';this.src='${painting.remoteUrl || ''}';}">`
              : ''}
          </div>
          <div class="ri-text">
            <div class="ri-player">${escapeHtml(player.name)} — ${escapeHtml(painting?.title ?? '?')}</div>
            <div class="ri-haiku">${lines.map(l => `« ${escapeHtml(l)} »`).join(' / ')}</div>
            ${!correct && guessedPainting
              ? `<div class="ri-wrong">Réponse donnée : ${escapeHtml(guessedPainting.title)}</div>`
              : ''}
          </div>
          <div class="ri-result">${correct ? '✓' : '✗'}</div>
        </div>`;
    }

    const verdictClass = allCorrect ? 'success' : 'failure';
    const verdictMsg   = allCorrect
      ? '✓ Toutes les associations sont correctes — la Galerie avance !'
      : '✗ Une erreur s\'est glissée — le black-out progresse…';

    const nextLabel = over ? 'Voir le résultat →' : 'Tour suivant →';

    return `
      <section class="screen-resolution">
        <div class="resolution-header">
          <h2>Résolution</h2>
        </div>
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
    return `
      <section class="screen-end">
        <h1 class="${won ? 'win' : 'lose'}">${won ? 'Victoire !' : 'Black-out.'}</h1>
        <p class="end-sub">${msg}</p>
        ${tracksHtml(s)}
        <button class="btn btn-primary" data-action="restart">Nouvelle partie</button>
      </section>`;
  }

  // ── Online waiting screen ────────────────────────────

  function htmlOnlineWaiting(s) {
    const composingPlayer = s.players[s.secretIndex];
    const submittedCount  = s.choices.length;
    const total           = s.players.length;
    return `
      <section class="screen-waiting">
        ${tracksHtml(s)}
        <div class="waiting-body">
          <div class="waiting-icon">🎨</div>
          <h2 class="waiting-title">Phase secrète</h2>
          <p class="waiting-sub">
            <strong>${escapeHtml(composingPlayer?.name ?? '…')}</strong> compose son haïku…
          </p>
          <p class="waiting-progress text-muted">
            ${submittedCount} / ${total} joueur${total > 1 ? 's' : ''} ${submittedCount > 1 ? 'ont' : submittedCount === 1 ? 'a' : 'ont'} validé
          </p>
        </div>
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
        <div class="modal-content" onclick="event.stopPropagation()">
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

  // ── Expose ───────────────────────────────────────────

  return { render, renderSetup, renderModeSelect, renderOnlineEntry, renderLobby, showToast, updatePlayerInputs };

})();
