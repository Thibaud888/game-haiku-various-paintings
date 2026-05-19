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

30 tableaux du domaine public issus de Wikimedia Commons :
Van Gogh, Léonard de Vinci, Munch, Hokusai, Botticelli, Klimt,
Friedrich, Rembrandt, Monet, Vermeer, Goya, Delacroix, Seurat,
Géricault, Bosch, Velázquez, David, Raphaël, Michel-Ange, Renoir,
Cézanne, Ingres, Whistler, Turner, Toulouse-Lautrec, Arcimboldo,
Manet, Bruegel, Caravage, Van Eyck.

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
