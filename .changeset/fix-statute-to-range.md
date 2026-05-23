---
"eyecite-ts": patch
---

fix(extract): `§§ N to M` statute ranges populate sectionRange (#694)

Resolves part 1 of #694. `§§ 1983 to 1985` produced two sibling
statute citations with no range marker, despite `to` being a
canonical Bluebook range connector.

| input | before | after |
|---|---|---|
| `42 U.S.C. §§ 1983 to 1985` | 2 cites (1983, 1985), no range | 1 cite with `sectionRange: {start: "1983", end: "1985"}` ✓ |
| `42 U.S.C. §§ 1983 and 1985` | 2 siblings | unchanged ✓ |
| `42 U.S.C. §§ 1983, 1984` | 2 siblings | unchanged ✓ |
| `42 U.S.C. § 1983` | 1 cite | unchanged ✓ |

`expandPluralSectionList` now captures the connector substring. When
the connector matches `^\s+to\s+$` (range form), it populates
`sectionRange` on the head citation and skips emitting the sibling.
Comma/and connectors continue to emit siblings (list semantics).

5 regression tests in `tests/extract/issueStatuteRangeTo.test.ts`.

Subsection range gaps and partial-range semantics (parts 2 and 3 of
#694) remain open.
