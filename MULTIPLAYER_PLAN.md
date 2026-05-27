# Plan : Multijoueur en ligne

## Vue d'ensemble de l'architecture cible

```
Navigateur A (Alice)          Serveur Node.js           Navigateur B (Bob)
      │                              │                          │
      │  socket.emit('action')  ───► │                          │
      │                              │  mutate state            │
      │                              │  io.to(room).emit()  ──► │
      │  ◄─── socket.on('state')     │                          │
      │       UI.render(state)       │       UI.render(state) ◄─┘
```

Le serveur devient **l'unique source de vérité** pour l'état du jeu en mode en ligne.
Les clients n'appellent plus `Game.fn()` directement — ils émettent un événement, le serveur
valide et diffuse le nouvel état à tous.

Le mode local reste disponible et suit exactement le flux actuel (sans serveur).

---

## Règle de développement

**Ne modifier aucun fichier existant tant que la feature en ligne n'est pas complète et testée.**

Tout le nouveau code (serveur, socket client, nouveaux écrans) est *ajouté*, pas substitué.
`js/game.js`, les phases existantes de `js/ui.js`, et `styles.css` sont intouchables jusqu'à
l'étape finale d'intégration.

---

## Étape 0 — Écran de sélection de mode

**Fichiers modifiés :** `js/ui.js`, `js/app.js`

- Ajouter un écran d'accueil dans `ui.js` avec deux options : "Jouer en local" / "Jouer en ligne"
- `app.js` stocke le mode choisi (`local` ou `online`) et route toutes les actions en conséquence
- En mode local : le flux actuel est inchangé (`Game.fn()` → `UI.render()`)
- En mode en ligne : les actions passent par `socket.emit()` (implémenté aux étapes suivantes)
- Les phases existantes de `ui.js` ne sont pas modifiées à ce stade

**Résultat :** L'écran d'accueil propose les deux modes. Le mode local fonctionne comme avant.

---

## Étape 1 — Mettre en place le serveur Node.js

**Fichiers créés :** `server/index.js`, `package.json`

- Initialiser un projet Node.js avec `Express` (serveur HTTP) et `Socket.io` (temps réel)
- Le serveur sert les fichiers statiques existants (`index.html`, `styles.css`, `js/`) :
  rien ne change côté client pour l'instant
- Écouter sur `process.env.PORT` (variable fournie par Railway/Render en production)

**Résultat :** Le jeu existant continue de fonctionner, servi par Node.js au lieu d'un
hébergeur statique.

---

## Étape 2 — Gestion des salles de jeu côté serveur

**Fichiers créés :** `server/rooms.js`

- Créer un module `rooms.js` qui maintient une `Map` des parties actives en mémoire
- Chaque salle contient : code à 4 lettres (ex : `ABCD`), liste des joueurs connectés
  (nom + identifiant socket), état du jeu, identifiant de l'hôte
- Implémenter les événements Socket.io de base :
  - `create-room` → génère un code unique, crée la salle, désigne l'émetteur comme hôte
  - `join-room(code, name)` → rejoint la salle si elle existe et que la partie n'a pas commencé
  - `leave-room` → retire le joueur, détruit la salle si vide
- Nettoyer automatiquement les salles inactives depuis plus de 2 heures

**Résultat :** Les joueurs peuvent créer et rejoindre des salles identifiées par un code.

---

## Étape 3 — Migrer `game.js` côté serveur

**Fichiers créés :** `server/game.js` (adaptation de `js/game.js`)

- Copier la logique de `js/game.js` dans `server/game.js` en l'adaptant pour Node.js
  (CommonJS `module.exports`)
- Inclure les données (`paintings.js`, `verses.js`) côté serveur également
- Chaque action du jeu devient un handler Socket.io sur le serveur. Exemple :
  ```
  socket.on('confirmChoice') → room.game.confirmChoice()
                             → io.to(room.code).emit('state', room.game.getState())
  ```
- Actions à câbler : `beginSecretPhase`, `playerReady`, `selectPainting`, `addVerse`,
  `removeVerse`, `moveVerse`, `confirmChoice`, `activateDeductionPlayer`, `assignGuess`,
  `confirmGuesses`, `nextTurn`
- `zoomedPaintingId` reste **local** au navigateur de chaque joueur — ne pas synchroniser
  via le serveur

**Résultat :** La logique de jeu tourne sur le serveur ; les clients reçoivent un état
synchronisé.

---

## Étape 4 — Adapter le client pour Socket.io

**Fichiers modifiés :** `index.html`, `js/app.js`
**Fichiers créés :** `js/socket.js`

- Ajouter la bibliothèque Socket.io client dans `index.html` (via CDN)
- Créer `js/socket.js` : établit la connexion, expose le socket à `app.js`
- Modifier `js/app.js` : en mode `online`, chaque `case` du switch émet
  `socket.emit('action', payload)` au lieu d'appeler `Game.fn()` directement
- Ajouter un handler global : `socket.on('state', state => UI.render(state))`
  — c'est l'unique déclencheur du rendu en mode en ligne
- `zoomedPaintingId` continue d'être géré localement

**Résultat :** Le client en mode en ligne ne contient plus de logique de jeu ;
il envoie des intentions et reçoit des états.

---

## Étape 5 — Nouvelles phases UI

**Fichiers modifiés :** `js/ui.js`, `styles.css`

Les phases existantes (`turn-reveal`, `secret-compose`, `deduction`, `resolution`) ne sont
pas modifiées. Trois nouveaux écrans sont ajoutés :

**Salle d'attente (après création ou rejointe d'une partie)**
- Liste des joueurs déjà connectés (mise à jour en temps réel)
- Code de la partie bien visible pour le partager
- Bouton "Commencer la partie" visible uniquement pour l'hôte (désactivé si moins de 2 joueurs)

**Écran d'attente pendant la phase secrète**
- Les joueurs qui ont déjà soumis leur haïku voient "En attente des autres joueurs..."
- Affiche le nombre de joueurs ayant validé (ex : "2/4 joueurs ont choisi")
- Remplace la phase `pass-before` qui n'a plus de sens quand chaque joueur a son propre écran

**Indicateur de connexion**
- Petite zone persistante affichant quels joueurs sont connectés / déconnectés

---

## Étape 6 — Gestion des images

**Fichiers modifiés :** `js/data/paintings.js` (légèrement)

- Les images locales (`images/`) sont gitignorées et indisponibles sur le serveur hébergé
- Modifier la priorité du fallback : utiliser directement `remoteUrl` (Wikimedia Commons)
  en premier lorsqu'on est en mode en ligne
- La mécanique de fallback vers une carte texte reste en dernier recours
- Aucun CDN propre nécessaire pour commencer — Wikimedia fonctionne bien

---

## Étape 7 — Gestion des cas limites réseau

**Fichiers modifiés :** `server/rooms.js`, `server/index.js`

- **Déconnexion pendant une partie :** signaler aux autres joueurs ; si le joueur se
  reconnecte avec le même nom dans les 5 minutes, le réintégrer à sa place
- **Hôte déconnecté :** passer le rôle d'hôte au joueur suivant
- **Rechargement de page :** au moment de la connexion, si le joueur était dans une salle
  active, lui renvoyer l'état courant automatiquement
- **Partie déjà commencée :** empêcher un nouveau joueur de rejoindre une salle dont la
  partie est en cours

---

## Étape 8 — Déploiement sur Railway

**Fichiers créés :** `railway.toml`

- Ajouter un script `start` dans `package.json` : `node server/index.js`
- Créer le fichier de configuration Railway indiquant le port et la commande de démarrage
- Lier le dépôt GitHub à Railway → chaque `git push` redéploie automatiquement
- Vérifier que les WebSockets sont bien activés (option dans le dashboard Railway)

**Résultat :** L'application est accessible publiquement à une URL permanente.

---

## Récapitulatif des fichiers

| Action | Fichiers |
|---|---|
| Créés (serveur) | `server/index.js`, `server/rooms.js`, `server/game.js`, `package.json` |
| Créés (client) | `js/socket.js`, `railway.toml` |
| Modifiés | `index.html`, `js/app.js`, `js/ui.js`, `js/data/paintings.js` |
| Intouchables jusqu'à l'étape finale | `js/game.js`, `styles.css`, `js/data/verses.js`, `RULES.md` |

---

## Stratégie de test

### Pendant le développement (en local)

Ouvrir plusieurs **onglets ou fenêtres** du navigateur sur `localhost:3000`.
Chaque onglet = un joueur. Suffisant pour tester la majorité des cas.

Les DevTools de chaque fenêtre permettent d'observer les événements Socket.io
(onglet Network → WS).

Pour tester les déconnexions : DevTools → onglet Network → passer en mode "Offline"
sur une fenêtre, observer le comportement des autres.

### Avant déploiement (vrai réseau distant)

Utiliser **ngrok** : crée un tunnel public vers le serveur local (`ngrok http 3000`).
Obtenir une URL publique partageable avec de vrais joueurs sur d'autres machines,
sans déployer sur Railway. Permet de tester avec de vraies latences réseau.

### Régression du mode local

À chaque étape, vérifier que le mode local fonctionne toujours :
- Lancer une partie locale
- Compléter un tour entier (reveal → secret × N joueurs → deduction → resolution)
- Vérifier le tour suivant et la condition de fin de partie
