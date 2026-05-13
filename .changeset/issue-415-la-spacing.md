---
"eyecite-ts": patch
---

fix: Louisiana `La.R.S.` (no space) — colon title:section form (#415)

Louisiana court style commonly uses `La.R.S. NN:NNN` (no space
between `La.` and `R.S.`). The LA fragment required `\s+` between
the prefix and `R.S.`, so the no-space form was unrecognized.

### Fix

- **LA fragment**: `\s+` between `La.` and `R.S.` relaxed to
  `\s*` so the no-space form matches.
- **Canonical normalization**: LA abbreviations reordered so
  `La. R.S.` (Bluebook standard) is the last element /
  canonical. The no-space variant normalizes to `La. R.S.` via
  the stripped-form fallback.

### Behavior changes

- `La.R.S. 48:453` → `code="La. R.S."`, `jurisdiction="LA"`,
  `section="48:453"` (was: not extracted)
- `La.R.S. 23:1032` → LA, section preserves colon
- `La. R.S. 48:453` (with space) → unchanged

### Scope notes

The following pieces of #415 are intentionally deferred:

- **Bare `R.S. NN:NNN`** (no `La.` prefix) — too generic
  without context.
- **Section ranges** (`La.R.S. 48:441 to 460`,
  `La.R.S. 39:1401-06`) — multi-section deferred across all
  states.
- **OCR variant** (`R.S. 23 :- 1061`) — OCR cleanup upstream.
- **Code of Civil Procedure / Criminal Procedure Article N** —
  named-article statutory codes; needs separate pattern.
- **Bare `Article N` follow-ons** — short-form citation
  problem.
- **`Act N of YYYY`** session laws — pending unified
  `sessionLaw` citation type.

### Tests

3 new tests under `Louisiana \`La.R.S.\` no-space variant
(#415)` in `tests/extract/extractStatute.test.ts`:

- `La.R.S. 48:453` (no space)
- `La.R.S. 23:1032` (canonical court style)
- Regression: `La. R.S. 48:453` (with space)

Full 2726-test suite passes; no regressions.

### Related

Whitespace-tolerance + canonical-reorder fix in the same family
as SC (#397), WV (#406), PA (#392), and the broader spacing-
tolerance family (AZ #348, OH #388, TN #398).
