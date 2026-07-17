# Backlog

> 1 item = 1 session Claude (issue labellisée `claude` ou session Cloud) = 1 PR.
> Cocher + lien PR quand c'est mergé. `/dispatch` (claude-ops) lit ce fichier.

- [x] (P2) Réparer les 32+ filenames Wikimedia réellement morts — [#15](https://github.com/Thibaud888/game-haiku-various-paintings/issues/15). **Complété** : 126 resolutions via `resolve-broken-only.mjs` + 11 correctifs manuels = 137/150 URL cassées réparées. 24 IDs restants non-résolubles (surtout estampes japonaises) documentés dans `scripts/resolve-broken-report.json`. `verify-urls.mjs` intégré dans `verify.mjs` (activé avec `VERIFY_URLS=1`). PR en cours : #XXXXX
- [ ] Trancher la PR #10 « multijoueur WebSocket » (dormante) : finir, découper ou fermer —
  décision de Thibaud, pas une session de code.
