---
"eyecite-ts": minor
---

feat(extract): Puerto Rico LPRA / L.P.R.A. statute citations — #635

Add `lpra` tokenizer pattern + `extractLpra` extractor for citations to
*Leyes de Puerto Rico Anotadas* — previously the entire Puerto Rico
statutory corpus was invisible to the parser.

Supported forms:
- `23 LPRA § 72` — bare acronym, § connector
- `23 LPRA §72` — glued §
- `23 LPRA §72(a)` — with subsection chain
- `23 LPRA § 72` — with space
- `21 L.P.R.A. § 4615` — periodized
- `21 L.P.R.A. § 4615(a)(1)` — periodized with chained subsections
- `32 LPRA § 3651-c` — hyphenated section

Each match emits `code: "L.P.R.A."` (canonical Bluebook form) and
`jurisdiction: "PR"`. Closed `(L\.P\.R\.A\.|LPRA)` alternation +
mandatory § connector + trailing digits keep false positives bounded
— bare-acronym mentions in prose (`The LPRA includes...`) do not
match.

The appendix-rule form (`4 LPRA Ap. XXII-A, R. 40`) is not yet
covered and deferred to a follow-up; the dominant bare-section form
covers the majority of LPRA citations in the wild.
