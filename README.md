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

**En ligne (1 clic)** : https://thibaud888.github.io/game-haiku-various-paintings/

**En local** : ouvrir `index.html` dans un navigateur récent (Chrome,
Firefox, Safari, Edge). Aucune installation ni serveur requis.

Les images sont incluses dans le repo : le jeu fonctionne
**hors-ligne** après clonage.

**Mobile** : le jeu est jouable sur téléphone. L'écran de composition
affiche les 6 tableaux en grille compacte en haut (toujours visibles
pendant la composition du haïku) et le bandeau de déduction reste
visible lors du défilement.

## Modes

| Mode | État |
|---|---|
| Multi-joueurs local (passe-passe l'écran) | ✅ Disponible |
| Solo | 🔜 À venir |
| Multi-joueurs en ligne | 🔜 À venir |

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
  game.js         — état et logique du jeu
  ui.js           — rendu DOM
  data/
    paintings.js  — ~250 tableaux (titre, artiste, URL Wikimedia)
    verses.js     — ~310 vers poétiques (pool, 16 distribués par joueur)
```

## Licence

Code source : MIT.
Images : domaine public via Wikimedia Commons.
