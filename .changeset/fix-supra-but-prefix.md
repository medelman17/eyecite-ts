---
"eyecite-ts": patch
---

fix(extract): supra `partyName` strips additional sentence-initial connectors

`SUPRA_PARTY_PREFIX_REGEX` stripped `See`, `Cf.`, `Compare`, `Accord`,
`But see`, `But cf.`, `E.g.`, `Also`, `In` (non-`In re`), and `Then`.
It did not strip bare `But`, `However`, `Moreover`, `Therefore`,
`Indeed`, or `Contra` (Bluebook contrastive signal). Result: when a
supra followed a contrastive connector in prose, `partyName` absorbed
the connector:

| input | before | after |
|---|---|---|
| `But Smith, supra, at 7` | `partyName="But Smith"` | `"Smith"` ✓ |
| `However Smith, supra, at 7` | `partyName="However Smith"` | `"Smith"` ✓ |
| `Moreover Smith, supra, at 7` | leaks | `"Smith"` ✓ |
| `Therefore Smith, supra, at 7` | leaks | `"Smith"` ✓ |
| `Indeed Smith, supra, at 7` | leaks | `"Smith"` ✓ |
| `Contra Smith, supra, at 7` | leaks | `"Smith"` ✓ |

Added `But`, `Contra`, `However`, `Moreover`, `Therefore`, `Indeed` to
the alternation. Existing `In(?!\s+re\b)` negative lookahead is
unchanged.

9 regression tests in `tests/extract/issueSupraButPrefix.test.ts`.
