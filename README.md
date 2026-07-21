# Nuit au Musée

Adaptation du jeu de société **Haïku** (Multivers) avec des tableaux
célèbres du domaine public à la place des estampes japonaises.

## Concept

Les joueurs incarnent des gardiens de nuit pris dans un musée lors
d'une panne de courant. Tour à tour, chacun choisit secrètement un
tableau parmi 6 affichés et compose un haïku (3 vers) pour guider ses
coéquipiers. Ensemble, ils doivent deviner quel haïku correspond à quel
tableau. Rejoindre la Grande Galerie avant le black-out total : voilà
la mission.

## Jouer

**Dans le navigateur** : https://thibaud888.github.io/game-haiku-various-paintings/
(hébergé sur GitHub Pages — les modes solo et local sont instantanés).

**En local** : ouvrir `index.html` dans un navigateur récent (Chrome,
Firefox, Safari, Edge). Aucune installation ni serveur requis.

Les images sont incluses dans le repo : le jeu fonctionne
**hors-ligne** après clonage.

**Multijoueur en ligne** (chacun sur son appareil) : nécessite le serveur
Node (voir [Déploiement](#déploiement)). Une fois le serveur en ligne, le
bouton « Jouer en ligne » crée ou rejoint une partie via un code à 4 lettres.

**Mobile** : le jeu est jouable sur téléphone. L'écran de composition
affiche les 6 tableaux en grille compacte en haut (toujours visibles
pendant la composition du haïku) et le bandeau de déduction reste
visible lors du défilement.

## Modes

| Mode | État |
|---|---|
| Multi-joueurs local (passe-passe l'écran) | ✅ Disponible |
| Solo | 🔜 À venir |
| Multi-joueurs en ligne | ✅ Disponible (serveur requis, voir Déploiement) |

## Règles

Voir [RULES.md](RULES.md) pour les règles complètes en français.

## Œuvres incluses

~250 tableaux du domaine public issus de Wikimedia Commons,
couvrant toutes les grandes périodes :

- **Renaissance** italienne, flamande, nordique (Léonard, Michel-Ange,
  Raphaël, Botticelli, Titien, Van Eyck, Bosch, Bruegel, Dürer, Holbein…)
- **Baroque** (Caravage, Rubens, Rembrandt, Vermeer, Velázquez, Goya,
  Gentileschi…)
- **XVIIIe-XIXe** (Watteau, Fragonard, David, Ingres, Delacroix, Géricault,
  Friedrich, Turner, Constable, Courbet, Millet, Manet…)
- **Impressionnisme & post-impressionnisme** (Monet, Renoir, Degas,
  Pissarro, Caillebotte, Morisot, Van Gogh, Seurat, Cézanne, Gauguin,
  Toulouse-Lautrec…)
- **Symbolisme & préraphaélites** (Klimt, Moreau, Redon, Millais,
  Waterhouse, Rossetti, Böcklin, Fuseli…)
- **Modernes pré-1955** (Munch, Schiele, Modigliani, Matisse, Kandinsky,
  Mondrian, Klee, Bonnard, Beckmann, Soutine, Grant Wood…)
- **Estampes japonaises** (Hokusai, Hiroshige, Utamaro, Sharaku,
  Kuniyoshi, Yoshitoshi, Jakuchū…)

## Images : téléchargement local & fallback

Par défaut le jeu cherche les images dans `images/<id>.jpg` (local).
Si un fichier est absent, il tombe en cascade sur l'URL Wikimedia
distante, puis sur une fiche stylée (titre + artiste + année).

### Premier téléchargement

```bash
node scripts/download-paintings.mjs
```

Le script :
- récupère les ~250 images depuis Wikimedia Commons (largeur 800 px)
- les sauve dans `./images/<id>.jpg`
- génère `scripts/download-report.json` listant succès et échecs
- volume final attendu : 50-80 MB

Options :
- `--force` : retélécharger même les fichiers déjà présents
- `--width=N` : largeur souhaitée (défaut 800)
- `--conc=N` : téléchargements simultanés (défaut 6)

### Modes hors-ligne vs hotlink

- **Sans téléchargement** : le jeu fonctionne **avec internet** (charge
  les images depuis Wikimedia à la volée).
- **Après téléchargement** : le jeu fonctionne **hors-ligne**, charge
  plus vite, et tu disposes d'un rapport de validité des URLs.

### Images dans le repo

Les images sont commitées dans `images/` (~50-80 MB) pour permettre :
- le jeu hors-ligne après simple clonage
- l'hébergement statique sur GitHub Pages (lien ci-dessus)

## Structure du projet

```
index.html
styles.css
RULES.md
js/
  app.js          — point d'entrée, délégation d'événements
  game.js         — état et logique du jeu (local)
  ui.js           — rendu DOM
  socket.js       — client multijoueur en ligne (Socket.io)
  config.js       — URL du serveur multijoueur (à renseigner, cf. Déploiement)
  data/
    paintings.js  — ~250 tableaux (titre, artiste, URL Wikimedia)
    verses.js     — ~310 vers poétiques (pool, 16 distribués par joueur)
server/
  index.js        — serveur multijoueur WebSocket (Express + Socket.io)
  rooms.js        — salles de jeu en mémoire
  game.js         — logique de jeu côté serveur
```

## Déploiement

Deux morceaux, tous deux **gratuits** :

- **Front + images → GitHub Pages** : tout le statique (jeu, tableaux) est servi
  par Pages. Les modes solo et local ne dépendent d'aucun serveur.
- **Serveur multijoueur → Render (plan gratuit)** : `server/index.js`
  (Express + Socket.io) gère les parties en ligne.

### Mettre le multijoueur en ligne

1. Sur [Render](https://render.com) : **New → Blueprint**, connecter ce dépôt.
   Le fichier [`render.yaml`](render.yaml) provisionne un web service **plan free**
   (`npm start`). Aucune carte bancaire requise.
2. Récupérer l'URL du service (p. ex. `https://nuit-au-musee-mp.onrender.com`).
3. La coller dans [`js/config.js`](js/config.js) :
   `window.ONLINE_SERVER_URL = 'https://…onrender.com';`
   puis redéployer Pages (commit sur `main`).

> ⏱️ **Réveil à froid** : sur le plan gratuit, le serveur s'endort après 15 min
> sans trafic et met **~1 min à se réveiller**. Le premier joueur à créer une partie
> après une pause patiente le temps du réveil, puis tout est fluide. Le mode local
> n'est jamais concerné.

## Licence

Code source : MIT.
Images : domaine public via Wikimedia Commons.
