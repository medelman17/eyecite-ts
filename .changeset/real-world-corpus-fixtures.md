---
"eyecite-ts": patch
---

test: add 130 real-world citation regression fixtures from Harvard CAP corpus; add `pet_filed` Texas history signal

Mines verbatim citations from the Harvard CAP corpus (federal F.3d, F.Supp.3d, state appellate reporters) and pins them down as regression fixtures across the patterns landed in recent PRs:

- 20 Texas writ/pet history (#229) — verified `subsequentHistoryEntries` is populated with a Texas-specific signal
- 15 combined-signal `, e.g.` (#239) — `See, e.g.,` (10) + `But see, e.g.,` (5), verified `signal` field
- 15 `In re Marriage of` (#242)
- 14 `In re Estate of` (existing)
- 9 `In re Adoption of` (#253)
- 8 `In re Welfare of` (#253)
- 8 `In the Interest of` (#242)
- 5 `In re Parentage of` (#253)
- 1 `In re Termination of Parental Rights of` (#253)
- 9 `Succession of` (LA civil-law, #253)
- 15 `People ex rel.` (#253)
- 8 `Commonwealth ex rel.` (#242)
- 3 `d/b/a` slash-alias (#240)

Real-world inputs surfaced a missed Texas signal: `pet. filed` (petition for review filed but not yet decided — a status, distinct from `pet. ref'd`/`pet. denied`). Added as a new `HistorySignal` value (`pet_filed`) with a matching `SIGNAL_TABLE` entry.

Fixtures live in `tests/fixtures/real-world-citations-2026-05-11.json` and are exercised by `tests/extract/realWorldCorpusFixtures.test.ts`. Each fixture is a full case-name-plus-citation-plus-year-paren extracted by a Python mining script (`/tmp/mine_fixtures_v2.py`, not committed); the test file imports the JSON and runs each input through `extractCitations`, asserting category-appropriate fields (case-name prefix, signal, subsequentHistory signal classification).
