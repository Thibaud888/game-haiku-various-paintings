# MAP — game-haiku-various-paintings

> Carte du repo pour démarrer sans explorer. Lue par chaque session Claude Code avant exploration.

## Quoi
Jeu : associer des haïkus à des tableaux célèbres. Jouable en local (front statique HTML/CSS/JS) et en ligne (multijoueur WebSocket via serveur Node). Front déployé sur GitHub Pages, serveur sur Render (plan gratuit).

## Arborescence annotée
```
index.html  js/  styles.css       # Interface du jeu (local + client WebSocket)
  js/socket.js  js/config.js       # Client multijoueur en ligne + URL du serveur (à renseigner)
images/                           # Tableaux téléchargés depuis Wikimedia
RULES.md                          # Règles du jeu
server/index.js                   # Serveur multijoueur WebSocket (port 3000 local, Render prod)
MULTIPLAYER_PLAN.md               # Architecture du mode en ligne
render.yaml                       # Config déploiement serveur Render (plan gratuit)
scripts/
  verify.mjs                      # Vérifie syntaxe JS (front + serveur)
  download-paintings.mjs          # Récupère images Wikimedia
  resolve-missing.mjs             # Corrige filenames cassés
BACKLOG.md                        # Tâches à faire
```

## Points d'entrée
- **UI/Gameplay** : `js/` + `index.html` ; lire `RULES.md` pour logique du jeu.
- **Multijoueur** : `server/index.js` (WebSocket) + `js/socket.js` côté client (URL serveur dans `js/config.js`) ; voir `MULTIPLAYER_PLAN.md`.
- **Images** : `scripts/resolve-missing.mjs` + `resolve-report.json` pour les filenames cassés.

## Flux de données
Joueur local → `index.html` + `js/` → appelle server WebSocket (si multijoueur mode) → `server/index.js` reçoit, broadcast à tous les clients → tous les clients mettent à jour DOM. Images chargées depuis `images/` au démarrage.

## Commandes
```
npm run dev              # Serveur local watch (port 3000)
npm start               # Production server (port 3000, ou $PORT)
node scripts/verify.mjs # Vérif : syntaxe JS front + serveur
node scripts/download-paintings.mjs   # Télécharge images Wikimedia
```
Front seul : ouvrir `index.html` directement. Déploiement : GitHub Pages (front auto) + Render (serveur, plan gratuit — voir README « Déploiement »).

## Pièges connus
- **Timer DOM** : MAJ en place du nœud existant, jamais reconstruire (casse animations).
- ~18 filenames Wikimedia fragiles (voir `resolve-report.json` pour la liste).
- **Multijoueur en ligne** : front statique (Pages) ≠ serveur. Le client charge socket.io via **CDN** et se connecte à `window.ONLINE_SERVER_URL` (`js/config.js`) ; sans cette URL, le mode en ligne est inactif sur la version hébergée. PR #10 mergée le 2026-07-14.
- Branche par défaut historiquement `claude/haiku-game-famous-art-VHqZJ`, corrigée vers `main` le 2026-07-09.
