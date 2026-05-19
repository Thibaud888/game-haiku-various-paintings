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

Ouvrir `index.html` dans un navigateur récent (Chrome, Firefox, Safari,
Edge). Aucune installation ni serveur requis.

> Les images chargent depuis Wikimedia Commons. Une connexion internet
> est nécessaire pour les afficher.

## Modes

| Mode | État |
|---|---|
| Multi-joueurs local (passe-passe l'écran) | ✅ Disponible |
| Solo | 🔜 Jalon 3 |
| Multi-joueurs en ligne | 🔜 Jalon 5 |

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

## Vérification des images

Les URLs Wikimedia sont écrites à la main et peuvent contenir des erreurs.
Pour vérifier la validité de chaque URL :

```bash
node scripts/verify-paintings.mjs
```

Le script teste chaque URL (HEAD/GET) et liste les éventuels échecs
dans `scripts/failures.json`. Les images cassées sont gérées par un
fallback stylisé affichant titre, artiste et année.

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
    paintings.js  — 30 tableaux (titre, artiste, URL Wikimedia)
    verses.js     — 16 vers poétiques (groupes A/B/C)
```

## Feuille de route

- **Jalon 1** ✅ Fondations : données, règles, MVP multi-local
- **Jalon 2** — Polish UI, animations, fiche pédagogique par tableau
- **Jalon 3** — Mode solo
- **Jalon 4** — Validation syllabique, ambiance sonore
- **Jalon 5** — Multijoueur en ligne (WebSocket)

## Licence

Code source : MIT.
Images : domaine public via Wikimedia Commons.
