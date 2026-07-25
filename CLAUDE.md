# CLAUDE.md — game-haiku-various-paintings

> Jeu de haïkus sur des tableaux célèbres : front statique (GitHub Pages) + mode multijoueur
> en ligne via un serveur Node WebSocket (Railway).

## Règles de travail (flotte)
- **Lis `MAP.md` avant toute exploration** ; n'explore que ce qu'elle ne couvre pas.
- **Aucune session ne rend la main sans avoir vérifié** : lance `node scripts/verify.mjs`
  (syntaxe de tout le JS front + serveur) et regarde le résultat avant de conclure.
- Branche + PR **vers `main`**, jamais de push direct sur `main`. Commits **en français**.
- **1 session = 1 item = 1 PR** — un item de `BACKLOG.md` par session ; mets à jour
  `BACKLOG.md` en fin de session.
- **La PR se merge automatiquement dès que la CI est verte** (pas d'attente de relecture par
  défaut). CI rouge → PR laissée ouverte, jamais mergée à l'aveugle. **Repo sans CI** : le
  merge auto exige une section `## Vérification` (commande + résultat) dans le corps de la PR.
  Pour forcer la relecture humaine sur CE repo : créer un fichier vide `.claude/no-auto-merge`.
- **Règle du clair** — Thibaud n'est pas technicien quand il te lit (souvent depuis son
  téléphone). Ce qui lui est destiné se comprend sans jargon ; la technique n'est pas retirée,
  elle passe **après**.
  - **Item de backlog** (`titre — contexte/DoD`) : le titre dit ce que ça change pour lui, en
    français courant — pas de nom de fichier ou de fonction, pas de sigle, pas d'anglicisme non
    traduit. Le jargon vit **après le tiret**, aussi précis que nécessaire.
  - **Question** : UNE seule à la fois, ouverte par une ligne en clair (le choix vu de son
    côté), puis un bloc `**Options :**` de 2 à 4 réponses numérotées (une ligne, < 140
    caractères) décrites par leur **conséquence** — ce qu'il verra, ce que ça coûte — et non par
    leur mécanisme, puis `**Recommandation :** option N — pourquoi`. Détail technique en repli
    `<details>` sous la question, jamais au-dessus. Il répond par un simple numéro.
  - Test : si quelqu'un qui ne code pas ne peut pas choisir en lisant la partie haute, c'est raté.

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
