---
"eyecite-ts": patch
---

fix: Pennsylvania `P. S.` / `Pa. C. S.` (spaced) variants normalize to canonical forms (#392)

Pennsylvania court opinions interchange `P.S.` / `P. S.` (Purdon's
Statutes) and `Pa.C.S.` / `Pa. C. S.` / `Pa. C.S.` (Consolidated
Statutes) freely. The spaced variants were unrecognized.

### Fix

- **Pennsylvania consolidated** (Pa.C.S.) fragment relaxed from
  `Pa\.?\s*C\.?S\.?A?\.?` to `Pa\.?\s*C\.?\s*S\.?\s*A?\.?`,
  allowing inter-letter whitespace.
- **Pennsylvania unconsolidated** (P.S.) fragment relaxed from
  `P\.?S\.?` to `P\.?\s*S\.?`.
- **Canonical reordering**: abbreviations arrays reordered so
  Bluebook canonical forms (`Pa.C.S.`, `P.S.`) are the last
  elements. Spaced and dotless variants normalize to them via
  the stripped-form fallback.

### Behavior changes

- `75 P. S. § 1037` → `code="P.S."`, `title=75`,
  `section="1037"` (was: not extracted)
- `42 Pa. C. S. § 7341` → `code="Pa.C.S."` (was: not extracted)
- `40 P.S. § 991.1801`, `42 Pa.C.S. § 7341` → unchanged

### Scope notes

The following pieces of #392 are intentionally deferred:

- **`Act of [Date], P.L. NNN, No. NNN, § N` session laws** —
  pending unified `sessionLaw` citation type.
- **Named-act references** (`Section 7(1) of the Wills Act of
  1947`, `Section 319 of the Workmen's Compensation Act`) —
  prose form; matches named-act registry rather than abbreviated
  code.
- **OCR variant** (`77 P:S. §671` — colon for period) — OCR
  cleanup belongs upstream.

### Tests

4 new tests under `Pennsylvania P.S. / Pa.C.S. spacing variants
(#392)` in `tests/extract/extractStatute.test.ts`:

- Spaced `75 P. S. § 1037` (canonicalized to P.S.)
- Spaced `42 Pa. C. S. § 7341` (canonicalized to Pa.C.S.)
- Regression: `40 P.S. § 991.1801`
- Regression: `42 Pa.C.S. § 7341`

Full 2689-test suite passes; no regressions.

### Related

Spacing-tolerance fix is the fifth in this family: Arizona
A.R.S. (#348), Ohio R.C. (#388), Tennessee T.C.A. (#398),
South Carolina S.C. Code Ann. (#397), and now Pennsylvania
P.S./Pa.C.S. Combined with the canonical reordering, the pattern
established for these states is now used routinely.
