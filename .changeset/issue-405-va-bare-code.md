---
"eyecite-ts": patch
---

feat: Virginia bare `Code § 18.2-308.2` form + tighten Georgia pre-1983 disambiguator (#405)

Virginia uses a bare `Code §` form (no `Va.` prefix) as its
canonical statutory citation style. A 50-opinion VA sample
produced 30+ misses — the largest single-state miss volume in
the sweep series.

### Fix

- **New `va-bare-code` tokenizer pattern + extractor**: matches
  bare `Code § N.N-NNN` and the explicit `Virginia Code §
  N.N-NNN`. Output: `code: "Code"` / `"Virginia Code"`,
  `jurisdiction: "VA"`.

- **Disambiguator from Georgia pre-1983**: Virginia sections
  always include at least one PERIOD (`18.2-308.2`,
  `20-107.3(D)`, `8.01-581.17`), while Georgia pre-1983 sections
  never do (`26-2101`, `27-2501`, `110-501`). The VA pattern
  matches `(?:\d+\.\d+-\d+(?:\.\d+)?|\d+-\d+\.\d+)` — either
  title has period or section has period (or both).

- **Tighten Georgia pre-1983 pattern**: added negative
  lookahead `(?!\.\d)` after the section so Virginia sections
  with period-followed-by-digit don't mis-route to Georgia.
  Sentence-end periods (`Code § 26-2101.`) still allow
  Georgia matching because `(?!\.\d)` only rejects when period
  is followed by digit. Fixes a regression introduced with the
  Georgia pre-1983 pattern (#358).

### Behavior changes

- `Code § 18.2-308.2` → `code="Code"`, `jurisdiction="VA"`
  (was: not extracted)
- `Code § 46.2-1571` → VA (was: not extracted)
- `Code § 20-107.3(D)` → VA, `subsection="(D)"` (was:
  mis-classified as GA with truncated section "20-107")
- `Virginia Code § 8.01-581.17` → VA (was: not extracted)
- `Code § 27-2501` → unchanged (GA, no periods in section)
- `Va. Code Ann. § 18.2-308.2` → unchanged (VA via named-code)

### Scope notes

The following pieces of #405 are intentionally deferred:

- **Bare-section follow-on** (`§ 8.01-20.1`) — short-form
  citation problem, not extraction.

### Tests

6 new tests under `Virginia bare Code form (#405)` in
`tests/extract/extractStatute.test.ts`:

- `Code § 18.2-308.2` (canonical VA)
- `Code § 46.2-1571` (period in title only)
- `Code § 20-107.3(D)` (period in section only, with subsection)
- `Virginia Code § 8.01-581.17` (explicit prefix)
- Regression: Georgia `Code § 27-2501` still routes to GA
- Regression: `Va. Code Ann. § 18.2-308.2` continues to work

Full 2701-test suite passes; no regressions.

### Related

This is the largest-impact fix in the bare-code family. The
period-vs-no-period disambiguator is a clean structural
distinction that should be robust against false positives in
either direction. Pairs the Georgia pre-1983 pattern (#358)
with a corresponding Virginia pattern, with disjoint section
formats keeping them mutually exclusive.
