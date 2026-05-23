---
"eyecite-ts": patch
---

fix(extract): case names inside quotation marks now capture caseName (#691)

Resolves #691. When a case caption was wrapped in quotation marks
(`"Smith v. Jones," 100 F.2d 1`), the V_CASE_NAME_REGEX anchored on
a trailing comma and never matched — the closing quote sat between
the defendant and the comma, breaking the anchor. Both common
quote/comma orderings were affected:

| input | before | after |
|---|---|---|
| `"Smith v. Jones," 100 F.2d 1` (American) | caseName=undefined | `Smith v. Jones` ✓ |
| `"Smith v. Jones", 100 F.2d 1` (British) | caseName=undefined | `Smith v. Jones` ✓ |
| `as held in "Smith v. Jones," 100 F.2d 1` | caseName=undefined | `Smith v. Jones` ✓ |
| `“Smith v. Jones,” 100 F.2d 1` (curly) | caseName=undefined | `Smith v. Jones` ✓ |
| `Smith v. Jones, 100 F.2d 1` (no quotes) | unchanged | unchanged ✓ |

Fix: in `extractCaseName`, strip a leading straight/curly quote and a
trailing straight/curly quote adjacent to the citation-side comma
before applying V_CASE_NAME_REGEX. Quote chars are not legal-citation
punctuation; nothing real depends on them surviving at these
positions.

6 regression tests in `tests/extract/issueQuotedCaseName.test.ts`.
