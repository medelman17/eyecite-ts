---
"eyecite-ts": patch
---

fix(extract): Statutes at Large pincite accepts thousands-grouping commas

Extends PR #695 (which fixed comma-grouped pages on Fed. Reg. and
Statutes at Large) to also handle comma-grouped pincites. Previously,
`134 Stat. 1,234, 1,236` parsed `pincite=1` instead of `1236` because
the pincite regex `^,\s*(\d+)` stopped at the first comma in the
pincite token.

| input | before | after |
|---|---|---|
| `134 Stat. 1,234, 1,236` | page=1234, pincite=1 | page=1234, pincite=1236 ✓ |
| `134 Stat. 1,234, 1,236-1,240` | range broken | pincite=1236, end=1240 ✓ |

Extended `SAL_PINCITE_REGEX` to accept `\d{1,3}(?:,\d{3})+|\d+` on both
endpoints. Integer parse strips commas. Abbreviated-end-page detection
uses post-strip digit length so `285-99` still expands to `299`.

5 regression tests in `tests/extract/issueStatPinciteComma.test.ts`.
