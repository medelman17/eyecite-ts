---
"eyecite-ts": patch
---

feat: Oregon `ORS chapter NN` chapter-only form (#387)

The modern `ORS NNN.NNN` section form was already handled by
`abbreviated-code`, but the chapter-only reference `ORS chapter
34` (treating the chapter number as a complete citation, like NH
RSA and OH R.C.) was unrecognized.

### Fix

New `ors-chapter` tokenizer pattern + dedicated
`extractOrsChapter` extractor. Emits `code: "ORS"`,
`jurisdiction: "OR"`, with the chapter ID in `section` (matching
the convention from NH `rsa-chapter` #378 and OH `oh-chapter`
#388).

### Scope notes

The following pieces of #387 are intentionally deferred:

- **Oregon Laws session laws** (`Or Laws 2013, ch 25, § 1`,
  `Oregon Laws 1981, chapter 784`) — pending unified
  `sessionLaw` citation type.
- **Oregon municipal codes** (`Cornelius City Code section
  10.40.030`, `CCC section 10.40.030`) — municipal codes
  broadly out of scope.

### Tests

2 new tests under `Oregon ORS chapter-only form (#387)` in
`tests/extract/extractStatute.test.ts`:

- `ORS chapter 34` (chapter-only)
- Regression: `ORS 131.315(7)` (modern form)

Full 2662-test suite passes; no regressions.

### Related

Third chapter-only state pattern after NH `rsa-chapter` (#378)
and OH `oh-chapter` (#388). The shape is becoming a reusable
template for states whose statute compilations support
chapter-level references.
