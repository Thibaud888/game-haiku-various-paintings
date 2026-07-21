# Backlog

> 1 item = 1 session Claude (issue labellisée `claude` ou session Cloud) = 1 PR.
> Cocher + lien PR quand c'est mergé. `/dispatch` (claude-ops) lit ce fichier.

- [x] (P2) Réparer les 32+ filenames Wikimedia réellement morts — [#15](https://github.com/Thibaud888/game-haiku-various-paintings/issues/15). **Complété** : 126 resolutions via `resolve-broken-only.mjs` + 11 correctifs manuels = 137/150 URL cassées réparées. 24 IDs restants non-résolubles (surtout estampes japonaises) documentés dans `scripts/resolve-broken-report.json`. `verify-urls.mjs` intégré dans `verify.mjs` (activé avec `VERIFY_URLS=1`). PR en cours : #XXXXX
- [x] Trancher la PR #10 « multijoueur WebSocket » : **périmé** — la PR était déjà **mergée** le 2026-07-14. Le multijoueur est fonctionnel en local mais était injoignable sur GitHub Pages (front statique, `io()` same-origin). Rendu **déployable gratuitement** (serveur Render + front Pages) par la [PR #19](https://github.com/Thibaud888/game-haiku-various-paintings/pull/19). ✅ 2026-07-20.
- [x] Service Render créé par Thibaud (`https://nuit-au-musee-mp.onrender.com`) ; URL renseignée dans `js/config.js` — [PR #20](https://github.com/Thibaud888/game-haiku-various-paintings/pull/20), mergée. Vérifié bout-en-bout depuis GitHub Pages (2 onglets, salle synchronisée, lancement de partie synchronisé, aucune erreur console) le 2026-07-21. Le mode en ligne est **fonctionnel sur la version hébergée**.
