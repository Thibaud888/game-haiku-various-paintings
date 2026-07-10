# CLAUDE.md — game-haiku-various-paintings

> Jeu de haïkus sur des tableaux célèbres : front statique (GitHub Pages) + mode multijoueur
> en ligne via un serveur Node WebSocket (Railway).

## Règles de travail (flotte)
- **Lis `MAP.md` avant toute exploration** ; n'explore que ce qu'elle ne couvre pas.
- **Aucune session ne rend la main sans avoir vérifié** : lance `node scripts/verify.mjs`
  (syntaxe de tout le JS front + serveur) et regarde le résultat avant de conclure.
- Branche + PR **vers `main`**, jamais de push direct sur `main`. Commits **en français**.
- 1 session = 1 item de `BACKLOG.md` = 1 PR ; mets à jour `BACKLOG.md` en fin de session.

## Stack & commandes
- Front : HTML/CSS/JS purs (`index.html`, `js/`, `styles.css`), images dans `images/`.
- Serveur : **Node** WebSocket (`server/index.js`) — `npm start` · `npm run dev` (watch, port 3010).
- Vérif : `node scripts/verify.mjs`
- Déploiement : front sur **GitHub Pages**, serveur sur **Railway** (`railway.toml`).

## Architecture
- `index.html` + `js/` — le jeu (local et en ligne) ; `RULES.md` — les règles du jeu.
- `server/index.js` — salle multijoueur WebSocket ; `MULTIPLAYER_PLAN.md` — le plan du mode en ligne.
- `scripts/download-paintings.mjs` / `resolve-missing.mjs` — outillage images Wikimedia
  (+ rapports JSON committés).

## Pièges connus
- **Timer : mise à jour EN PLACE du DOM** (ne jamais reconstruire le nœud — ça casse l'animation).
- Filenames Wikimedia fragiles : ~18 restants à corriger (voir `scripts/resolve-report.json`).
- La PR #10 « multijoueur WebSocket » est **dormante volontairement** (draft) — ne pas la fermer
  ni la merger sans décision de Thibaud.
- Historique : la branche par défaut a longtemps été `claude/haiku-game-famous-art-VHqZJ` ;
  corrigée vers `main` le 2026-07-09. Toute vieille doc qui pointe la branche claude/* est périmée.
