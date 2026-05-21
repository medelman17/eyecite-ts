---
"eyecite-ts": patch
---

fix(extract): disposition tokens no longer pollute the court field

When a citation's parenthetical contained a bare disposition signal
(Bluebook Rule 10.7) without a court abbreviation —
`Smith, 100 F.2d 1 (rev'd 1990)`, `(per curiam 1990)`, `(en banc)`,
`(cert. denied 1990)`, `(dismissed 1990)` — the post-year-strip token
fell through `stripDateFromCourt` and surfaced as a (wrong) court value:
`court="rev'd"`, `court="per curiam"`, etc.

Fix: after stripping the trailing date, reject content that matches a
known disposition signal (`rev'd`, `aff'd`, `rev'g`, `aff'g`, `mod'd`,
`cert. denied|granted|dismissed`, `appeal denied|dismissed|docketed`,
`dismissed`, `reversed`, `vacated`, `vacating`, `overruled (by)`,
`overruling`, `en banc`, `per curiam`), optionally followed by
`in part`, `on other grounds`, or `sub nom.`.

The disposition information itself is not yet surfaced as a structured
field for bare-parenthetical cases like `(en banc)` — that remains a
follow-up. This patch only stops the wrong value from leaking into
`court`.

8 regression tests in `tests/extract/issueDispositionAsCourt.test.ts`.
