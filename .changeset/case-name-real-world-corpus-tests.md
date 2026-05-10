---
"eyecite-ts": patch
---

test: add 22 corpus-sourced regression tests for newly added abbreviation stems

The earlier commits on this branch added ~65 abbreviation stems based on style-manual research and synthetic test captions. This commit hardens that work with **22 verbatim case captions mined from the Harvard CAP corpus** — real opinions from federal Circuit, U.S. Supreme Court, NJ Supreme Court, Ohio Supreme Court, and other state appellate courts.

Each test is a real citation pulled from a published opinion that exercises one of the newly added stems. Together they constitute regression evidence: if any of the stem additions are removed, these tests fail because the case-name backward scanner would treat the abbreviation period as a sentence boundary and truncate the caption.

Stems covered by real-world captions: `tp`, `atty`, `commrs`, `hldgs`, `props`, `prods`, `ents`, `sols`, `corrs`, `colls`, `utils`, `bur`, `examrs`, `edn`, `conserv`, `emps`, `invests`, `boro`.

Example mined captions:

- `Levin v. Tp. Committee of Tp. of Bridgewater, 57 N.J. 506` (cited in *State v. Hatch*, 64 N.J. 179)
- `Stephens v. Att'y Gen. of Cal., 23 F.3d 248` (cited in *Chavez v. Weber*, 497 F.3d 796)
- `Board of County Comm'rs of Sedgwick County v. United States, 105 F. Supp. 995` (cited in *Rohr Aircraft Corp. v. County of San Diego*, 362 U.S. 628)
- `Sokol Hldgs., Inc. v. BMB Munal, Inc., 542 F.3d 354` (cited in *TicketNetwork, Inc. v. Darbouze*, 133 F. Supp. 3d 442)
- `Bd. of Regents of State Colls. v. Roth, 408 U.S. 564` (cited across many federal opinions)

Tests live in `tests/extract/realWorldCaptions.test.ts` as a data-driven block.
