---
"eyecite-ts": patch
---

fix: South Carolina `S.C.Code Ann.` (no space) routing + canonical normalization (#397)

S.C. opinions interchange `S.C.Code Ann.` (no space between `S.C.`
and `Code`) with `S.C. Code Ann.` (with space). The no-space form
was unrecognized — and worse, the NM bare-section pattern (#382)
was silently capturing the `§ N-N-N` suffix and mis-routing every
no-space SC citation to **New Mexico** jurisdiction.

### Fix

- **SC fragment**: `\s+` between `S.C.` and `Code` relaxed to
  `\s*` so the no-space form matches the SC container pattern.
  Once the container matches, span dedup correctly subsumes the
  NM bare-section pattern's contained match on `§ N-N-N`.
- **Canonical `S.C. Code Ann.`**: SC abbreviations reordered so
  `S.C. Code Ann.` (Bluebook standard with `Ann.`) is the last
  element / canonical. The no-space `S.C.Code Ann.` form now
  normalizes to it via the stripped-form fallback.

### Behavior changes

- `S.C.Code Ann. § 42-11-70 (1985)` → `code="S.C. Code Ann."`,
  `jurisdiction="SC"`, `year=1985` (was: mis-routed to NM)
- `S.C.Code Ann. § 42-15-40 (Supp. 1998)` →
  `year=1998`, `editionLabel="Supp."` (Supp. label was already
  recognized from #349)
- `S.C.Code Ann. section 38-53-100(D)` → SC (was: NM)
- `S.C. Code § 20-8-130(B)(1)` → unchanged
- `S.C. Code Ann. § 42-11-70` → unchanged
- `Section 32A-2-7(A)` (bare NM form) → unchanged (still NM)

### Scope notes

The following pieces of #397 are intentionally deferred:

- **Postfix prose** (`section 20-3-130 of the South Carolina
  Code`) — prose form needs a different pattern.
- **Bare-section follow-ons** (`§ 38-77-160`,
  `section 38-77-142`) — short-form citation problem, not
  extraction.

### Tests

6 new tests under `South Carolina S.C.Code Ann. spacing variants
(#397)` in `tests/extract/extractStatute.test.ts`:

- `S.C.Code Ann. § 42-11-70 (1985)` (no-space, year paren)
- `S.C.Code Ann. § 42-15-40 (Supp. 1998)` (Supp.
  editionLabel)
- `S.C.Code Ann. section 38-53-100(D)` (word section)
- Regression: `S.C. Code § 20-8-130(B)(1)` (spaced, no Ann.)
- Regression: `S.C. Code Ann. § 42-11-70`
- Regression: NM `Section 32A-2-7(A)` still routes to NM

Full 2677-test suite passes; no regressions.

### Related

The NM mis-routing problem demonstrates the importance of
keeping container-shape patterns broad enough to match all
state-style variants. The fix pattern (relax whitespace
requirements in state fragments + reorder canonical
abbreviations) follows the precedent established by Ohio (#388)
and Tennessee (#398).
