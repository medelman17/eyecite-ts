---
"eyecite-ts": minor
---

feat(extract): Nevada Administrative Code (`NAC`) recognized (#377 partial)

Resolves the NAC sub-issue of #377. Nevada Administrative Code citations
(`NAC 616.650`) weren't extracted. The NRS (Nevada Revised Statutes)
entry was already supported; NAC needed its own entry because it's
a separate regulation code.

| input | before | after |
|---|---|---|
| `NAC 616.650` | 0 cites | code=`NAC`, jurisdiction=NV ✓ |
| `Nev. Admin. Code 616.650` | 0 cites | code=`Nev. Admin. Code`, NV ✓ |
| `NRS 174.295` (regression control) | unchanged | unchanged ✓ |

Other #377 sub-issues (CCCO Clark County Ordinances, Nevada session
laws `Nev. Stat., ch. NNN, § N`) remain open.

3 regression tests in `tests/extract/issueNevadaNAC.test.ts`.
