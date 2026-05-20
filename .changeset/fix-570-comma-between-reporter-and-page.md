---
"eyecite-ts": patch
---

fix(extract): admit `<vol> <Reporter>, <page>` comma form (#570)

Old typesetting (and OCR over older volumes) inserts a comma between the
reporter abbreviation and the page number — `3 Den., 594`, `252 S. W., 20`,
`26 N. Y., 279`, `217 Ill. App., 427`, `125 N. E., 793`. Pre-fix every
probe returned 0 citations. Sample-and-judge attributed 70% of misses
across a 300-opinion sample to this single shape.

Two coordinated changes:

1. **Tokenizer patterns** (`src/patterns/casePatterns.ts`): the
   `federal-reporter`, `supreme-court`, and `state-reporter` patterns
   each get a second separator alternative `\s*,\s+` alongside the
   canonical `\s+`. The comma branch carries a tighter trailing
   lookahead `(?=$|[.;,)\]])` that rejects phantoms like
   `10 Corp., 2025 NY Slip Op 00784` — the supposed "page" 2025 is
   actually the start of the next (neutral) citation and the trailing
   ` N` (whitespace + capital letter) is excluded by the constraint.

2. **`VOLUME_REPORTER_PAGE_REGEX`** (`src/extract/extractCase.ts`): the
   single-regex extractor splits into a canonical pass plus a comma-form
   fallback. Canonical runs first so synthetic token text containing a
   trailing pincite (`500 F.2d 123, 125`) still resolves to
   `reporter=F.2d`, `page=123`, `pincite=125`. The canonical regex also
   gains the same trailing terminator lookahead, which causes inputs
   like `33 Ill. App. 2d, 100` to fail the canonical pass and route
   correctly to the comma form (avoiding the greedy backtrack to
   `reporter=Ill. App.`, `page=2`).

Both branches share the same capture-group shape so downstream consumers
(span computation, nominative parenthetical, pincite scan) need no
changes.

Coverage: 28 new repro tests in
`tests/extract/issue570CommaBetweenReporterAndPage.test.ts` covering 9
state reporters with `,`-after-period forms, 9 multi-word state
reporters with internal periods, 3 federal-reporter comma forms, 3
SCOTUS comma forms, a phantom-suppression regression guard
(`3 Den., 594` produces exactly one cite), and 3 baseline tests pinning
the original whitespace-only forms.
