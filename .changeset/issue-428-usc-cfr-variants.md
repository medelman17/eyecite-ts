---
"eyecite-ts": patch
---

fix: Federal `USC` / `CFR` / `USCA` / "United States Code" variants extracted as statutes (#428)

Federal-statute variants used in court-published opinions were
mis-typed as `case` or not extracted at all. 29 mis-typed
occurrences + 8 unextracted across 11 states.

### Variants now supported

- `42 USC 1983` (no periods, no §) — previously mis-typed as case
- `42 CFR 447` — same
- `11 USCA § 544(a)(3)` (West annotated) — previously not extracted
- `49 U.S.C. Section 1513` (word `Section`) — was mis-typed as case
- `42 United States Code section 1983` (spelled-out) — was
  mis-typed as case

### Fixes

Three coordinated changes:

1. **Pattern alternation**: USC and CFR regexes in
   `src/patterns/statutePatterns.ts` extended to accept `USC` /
   `USCA` / `U.S.C.` / `U.S.C.A.` / `United States Code` for the
   USC side and `C.F.R.` / `CFR` / `Code of Federal Regulations`
   for the CFR side. Connector (`§§?` / `Section(s)` / `Sec.` /
   `Part`) made optional so bare `N USC NNNN` form matches.

2. **Pattern priority**: USC/CFR/IRC patterns moved BEFORE
   `casePatterns` in `extractCitations.ts` so the broad
   `state-reporter` regex (which would otherwise match
   `42 USC 1983` as vol-reporter-page) is subsumed by the
   federal-statute container.

3. **Extractor regex**: `FEDERAL_SECTION_RE` and
   `FEDERAL_PART_RE` in `extractFederal.ts` match the same
   expanded alternation, with an optional connector. Code is
   canonicalized to Bluebook form (`U.S.C.` for USC family,
   `C.F.R.` for CFR family) via stripped-form comparison.

4. **False-positive blocklist**: USC/CFR/USCA added to the
   `BLOCKED_REPORTERS` set in `filterFalsePositives.ts` so any
   residual `state-reporter` match falls back to the
   false-positive filter (low confidence + warning).

### Behavior changes

- `42 USC 1983` → `code="U.S.C."`, `title=42`, `section="1983"`
  (was: type=case, warnings)
- `42 CFR 447` → `code="C.F.R."`, `title=42`, `section="447"`
- `11 USCA § 544(a)(3)` → `code="U.S.C."`, `title=11`,
  `section="544"`, `subsection="(a)(3)"`
- `49 U.S.C. Section 1513` → `code="U.S.C."`, `title=49`
- `42 United States Code section 1983` → `code="U.S.C."`,
  `title=42`
- `42 U.S.C. § 1983` (canonical Bluebook) — unchanged

### Behavior notes

The `code` field is now canonicalized to Bluebook form. Previously
the no-period variants would emit `code="USC"` / `"CFR"`
preserving the input surface. Two existing tests (extractFederal
"should extract USC without periods", "should handle CFR without
periods") were updated to reflect the new canonicalized output;
the corpus fixture entry for `15 USC § 78j` was updated similarly.

### Scope notes

The following pieces of #428 are intentionally deferred:

- **`Title 18, USC Section 659`** title-prefix prose — needs
  prose-form pattern with `Title N` prefix
- **Multi-title shortcut** (`21 U.S.C. and 42`) — semantic
  shorthand for "title 21 and title 42 of the U.S.C."

### Tests

7 new tests under `Federal USC / CFR variants (#428)` in
`tests/extract/extractStatute.test.ts`. Full 2747-test suite
passes; one corpus fixture and two extractFederal tests
updated for the new canonicalized `code` output.
