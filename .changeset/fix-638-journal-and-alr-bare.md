---
"eyecite-ts": minor
---

feat(extract): bare-abbreviation journals + bare-ALR annotations — #638

Two coverage gaps the broad state-reporter regex was silently swallowing
into `type: "case"`:

**1. Bare-abbreviation journals (no periods).** Curated list of well-known
scientific/medical journals + period-stripped law reviews. New
`bare-journal` pattern in `secondaryAuthorityPatterns` (positioned
before casePatterns) wins span dedup against the broad state-reporter
match.

Documented examples:
- `53 Neurology 1107` → journal (was case)
- `285 JAMA 2486` → journal
- `344 New Eng. J. Med. 678` → journal
- `70 Brook L Rev 1045` → journal (period-stripped law review)
- `96 Yale L J 1234` → journal

Curated list (extensible — one-line change to add): Neurology, Nature,
Science, JAMA, Pediatrics, Lancet, New Eng. J. Med., Am. J. Psychiatry,
Am. J. Pub. Health + a couple dozen common law-review abbreviations in
period-stripped form (Brook L Rev, Yale L J, Harv L Rev, Stan L Rev,
NYU L Rev, etc.).

Bare-acronym mentions in prose (`Neurology specialists agree.`) do NOT
match — the trailing volume + page digits gate the pattern.

**2. Bare-ALR annotations (no periods).** Extended `alr-annotation`
tokenizer + `extractAnnotation` parsing regex to accept the
period-stripped form alongside the canonical `A.L.R.2d`:

Documented examples:
- `48 ALR 749` → annotation (was case)
- `100 ALR2d 567` → annotation
- `23 ALR Fed 3d 456` → annotation
- `100 A.L.R.2d 1234` continues to work (regression guard)
