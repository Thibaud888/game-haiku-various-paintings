# Backlog

> 1 item = 1 session Claude (issue labellisée `claude` ou session Cloud) = 1 PR.
> Cocher + lien PR quand c'est mergé. `/dispatch` (claude-ops) lit ce fichier.

- [ ] (P2) Réparer les 32 filenames Wikimedia réellement morts — liste exacte dans [#15](https://github.com/Thibaud888/game-haiku-various-paintings/issues/15#issuecomment-5001999787) (vérifiée le 2026-07-17 : 248 URLs testées, 404 reconfirmés un à un). ⚠️ Ne PAS refaire ce qu'a fait la [PR #16](https://github.com/Thibaud888/game-haiku-various-paintings/pull/16) : elle a normalisé ~136 filenames qui marchaient déjà (underscores → espaces, équivalents pour MediaWiki) sans réparer un seul mort, et son corps annonce à tort « 233 corrigés, 0 non-résolu » alors que son propre rapport dit `{resolved:138, unresolved:10}`. Les 404 se résolvent par **recherche du vrai fichier sur Commons** (œuvre renommée/supprimée) à partir du titre, pas par reformatage. `scripts/verify-urls.mjs` (créé par la PR #16) fait déjà le contrôle — le brancher dans `scripts/verify.mjs` pour que la CI attrape la régression. DoD : `node scripts/verify-urls.mjs` rend 0 image morte, ou chaque restante est justifiée dans le rapport.
- [ ] Trancher la PR #10 « multijoueur WebSocket » (dormante) : finir, découper ou fermer —
  décision de Thibaud, pas une session de code.
