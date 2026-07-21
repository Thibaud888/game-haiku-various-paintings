// Configuration client — mode multijoueur en ligne.
//
// URL du serveur multijoueur (Render). Détermine où le bouton « Jouer en ligne »
// se connecte quand le jeu est servi en statique (GitHub Pages).
//
//   • Chaîne vide          → le multijoueur en ligne est désactivé sur la version hébergée.
//   • En local (localhost) → cette valeur est ignorée : le client se connecte au serveur
//                            qui sert la page (même origine, cf. `npm start`).
//
// → Après avoir créé le service sur Render, copie ici l'URL affichée par Render, p. ex. :
//     window.ONLINE_SERVER_URL = 'https://nuit-au-musee-mp.onrender.com';
window.ONLINE_SERVER_URL = 'https://nuit-au-musee-mp.onrender.com';
