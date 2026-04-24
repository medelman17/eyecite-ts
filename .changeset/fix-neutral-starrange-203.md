---
"eyecite-ts": patch
---

fix: capture `*N-*M` neutral-citation star-page ranges (#203)

`NeutralCitation` with a star-page range pincite (common on Westlaw,
Lexis, and NY Slip Op) captured only the starting page. Input
`See 2020 WL 1234567, at *3-*5 (S.D.N.Y. 2020).` produced
`{ page: 3, isRange: false, raw: '*3', starPage: true }` instead of
`{ page: 3, endPage: 5, isRange: true, raw: '*3-*5', starPage: true }`.
The `*3-5` form (star on first end only) already worked; `*3-*5` did not.

**Root cause.** `NEUTRAL_PINCITE_LOOKAHEAD`'s range tail `(?:-\d+)?`
accepted a trailing hyphen+digits but not the optional `*` prefix on the
range end. `parsePincite` already handled `*3-*5` correctly (its existing
unit test `parses a star-paginated range with star on both ends` passes);
the lookahead just never sent it the full text.

**Fix.** Changed the range tail to `(?:[-–—]\*?\d+)?` so the capture
group includes an optional star on the range end (and also accepts
en-dash/em-dash variants for consistency with `parsePincite`).

Three new regression tests: `*3-*5`, `*3-5`, and a non-range `*3`
regression guard.
