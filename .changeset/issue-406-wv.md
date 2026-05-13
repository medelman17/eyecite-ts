---
"eyecite-ts": patch
---

feat: West Virginia `W.Va.Code` (no space) routing + historical `Code 1931` form (#406)

WV opinions interchange `W.Va. Code` (with space) and `W.Va.Code`
(no space). The no-space form was unrecognized, and worse, the NM
bare-section pattern (#382) was silently capturing the `§ N-N-N`
suffix and mis-routing every no-space WV citation to **New Mexico**
(same family of regressions as the SC #397 fix).

Modern WV opinions also cite the historical `Code 1931` form for
statutory history — unrecognized.

### Fixes

- **WV fragment**: `\s+` between `W.Va.` and `Code` relaxed to
  `\s*` so the no-space form matches the WV container pattern.
  Span dedup then subsumes the NM bare-section match. WV
  abbreviations reordered so `W. Va. Code Ann.` (Bluebook) is
  canonical; no-space variants normalize via stripped-form
  fallback.
- **New `wv-code-1931` pattern**: matches `Code 1931, N-N-N, as
  amended` / `Code, 1931, N-N-N` / `Code, N-N-N` (bare, no year).
  The 3-part hyphenated section format disambiguates from
  Georgia pre-1983 (2-part) and Virginia bare-Code (always
  contains period). When the `1931` year is present, captures
  as `year`. Listed BEFORE `ga-pre-1983` so WV 3-part sections
  win span dedup.

### Behavior changes

- `W.Va.Code § 8-24-28` (no space) → `jurisdiction="WV"` (was:
  mis-routed to NM)
- `Code 1931, 49-6-3, as amended` → `code="W. Va. Code"`,
  `jurisdiction="WV"`, `year=1931` (was: not extracted)
- `Code, 1931, 49-6-3` → `year=1931` (was: not extracted)
- `Code, 14-2-13` → WV (was: not extracted)
- `W.Va. Code § 55-7B-1` (with space) → unchanged
- `W. Va. Code Ann. § 17C-5-2` → unchanged

### Scope notes

The following pieces of #406 are intentionally deferred:

- **Section ranges** (`W.Va. Code §§ 55-7B-1 to -12`) —
  multi-section deferred across all states.
- **Repl./Cum. Supp. parentheticals** (`(1976 Repl.Vol.)`,
  `(Supp.2007)`) — these mostly attach via the generic year-paren
  absorber from #349 #373, but the `Repl.Vol.` form may need
  additional patterns.
- **Chapter/Article prose** (`Chapter 5A, Article 3 of the Code
  of West Virginia`) — prose form needs a different pattern.
- **Local ordinances** (`Fairmont, W.Va. Ordinance 425, § 1.200`)
  — out of scope for statutory extraction.

### Tests

5 new tests under `West Virginia W.Va. Code + historical Code
1931 (#406)` in `tests/extract/extractStatute.test.ts`:

- `W.Va.Code § 8-24-28` (no space — fixes NM mis-routing)
- `Code 1931, 49-6-3, as amended` (historical with year)
- `Code, 1931, 49-6-3` (comma-separated)
- `Code, 14-2-13` (bare, no year)
- Regression: `W.Va. Code § 55-7B-1` (with space)

Full 2708-test suite passes; no regressions.

### Related

Second jurisdiction-routing regression caused by the NM
bare-section pattern (#382) — first was SC (#397). Pattern:
when a state's container regex requires `\s+` where the
real-world form has `\s*`, the bare-section pattern matches
the inner `§ N-N-N` and steals the citation. The fix is
straightforward: relax the state's whitespace requirement.
