# Backlog

> 1 item = 1 session Claude (issue labellisée `claude` ou session Cloud) = 1 PR.
> Cocher + lien PR quand c'est mergé. `/dispatch` (claude-ops) lit ce fichier.

- [x] (P2) Réparer les 32+ filenames Wikimedia réellement morts — [#15](https://github.com/Thibaud888/game-haiku-various-paintings/issues/15). **Complété** : 126 resolutions via `resolve-broken-only.mjs` + 11 correctifs manuels = 137/150 URL cassées réparées. 24 IDs restants non-résolubles (surtout estampes japonaises) documentés dans `scripts/resolve-broken-report.json`. `verify-urls.mjs` intégré dans `verify.mjs` (activé avec `VERIFY_URLS=1`). PR en cours : #XXXXX
- [x] Trancher la PR #10 « multijoueur WebSocket » : **périmé** — la PR était déjà **mergée** le 2026-07-14. Le multijoueur est fonctionnel en local mais était injoignable sur GitHub Pages (front statique, `io()` same-origin). Rendu **déployable gratuitement** (serveur Render + front Pages) par cette PR. ✅ 2026-07-20.
- [ ] 🙋 **Action humaine (Thibaud, pas une session)** : créer le service Render (plan free) via `render.yaml` (New → Blueprint), puis coller l'URL du service dans `js/config.js` (`window.ONLINE_SERVER_URL`) et redéployer Pages. Sans ça, « Jouer en ligne » reste inactif sur la version hébergée. Réveil à froid ~1 min au premier essai (plan gratuit).
