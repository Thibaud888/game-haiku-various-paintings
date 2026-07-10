# MAP — game-haiku-various-paintings

> Carte du repo pour démarrer sans explorer. Entretenue par le workflow MAP (fleet-kit).

## Quoi
Jeu : associer des haïkus à des tableaux célèbres. Jouable en local (front statique) et en
ligne (multijoueur WebSocket). Front sur GitHub Pages, serveur Node sur Railway.

## Arborescence annotée
```
index.html  js/  styles.css   # Le jeu côté client (local + en ligne)
images/                       # Tableaux (téléchargés depuis Wikimedia)
RULES.md                      # Règles du jeu
server/index.js               # Serveur multijoueur WebSocket (Railway, port 3010 en local)
MULTIPLAYER_PLAN.md           # Plan du mode en ligne
railway.toml                  # Déploiement serveur
scripts/
  download-paintings.mjs      # Récupère les images Wikimedia
  resolve-missing.mjs         # Corrige les filenames cassés (+ *-report.json committés)
  verify.mjs                  # Vérif kit : syntaxe de tout le JS (front + serveur)
.github/workflows/            # map.yml + claude.yml (stubs flotte)
```

## Points d'entrée
- **Gameplay/UI** : `js/` (et `index.html`) ; règles dans `RULES.md`.
- **Multijoueur** : `server/index.js` + la partie réseau de `js/` ; plan dans `MULTIPLAYER_PLAN.md`.
- **Images manquantes/cassées** : `scripts/resolve-missing.mjs` + `resolve-report.json`.

## Commandes
- Serveur local : `npm run dev` (watch, port 3010) · Front seul : ouvrir `index.html`
- **Vérif : `node scripts/verify.mjs`**
- Déploiement : merge sur `main` → Pages (front) ; Railway suit `railway.toml` (serveur)

## Pièges
- **Timer : MAJ en place du DOM**, jamais de reconstruction du nœud.
- ~18 filenames Wikimedia à corriger (voir `resolve-report.json`).
- PR #10 multijoueur : **dormante volontairement**, décision de Thibaud requise.
