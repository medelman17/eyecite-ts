---
"eyecite-ts": patch
---

fix: Ohio `R. C.` (spaced) and `R.C. Chapter N` (chapter-only) forms (#388)

Ohio's canonical statutory abbreviation is `R.C.` (Revised Code),
but the spelled-out form `R. C.` with a space between `R.` and
`C.` is the dominant form in court-published Ohio opinions — more
common than the no-space `R.C.` variant. eyecite-ts didn't
recognize the spaced form, and the `R. C. Chapter NNNN`
chapter-only variant was also missing for both spacings.

### Fixes

- **Spaced `R. C.`**: Ohio regex fragment in
  `src/data/stateStatutes.ts` now admits inter-letter spacing
  (`R\.?\s*C\.?` instead of `R\.?C\.?`). The federal Internal
  Revenue Code (`I.R.C.`, #376) has its own dedicated pattern
  with higher priority, so the `I.` prefix won't trigger Ohio.
- **Canonical normalization**: Ohio's abbreviations array was
  reordered so `R.C.` (Bluebook standard, with dots) is the last
  element and becomes the canonical short form. Spaced variants
  (`R. C.`, `R . C .`) and dotless variants (`RC`) all resolve
  to `R.C.` via the stripped-form fallback.
- **Chapter form**: new `oh-chapter` tokenizer pattern +
  dedicated `extractOhChapter` extractor handles both spacings
  of `R.C. Chapter N` / `R. C. Chapter N`. The chapter
  identifier goes into the `section` field (matching the
  convention established by the NH `rsa-chapter` extractor for
  chapter-only citations).

### Behavior changes

- `R. C. 713.15` → `code="R.C."`, `jurisdiction="OH"`,
  `section="713.15"` (was: not extracted)
- `R. C. 5321.15(C)` → with subsection `(C)`
- `R. C. Chapter 1702` → `section="1702"` (was: not extracted)
- `R.C. Chapter 4509` → `section="4509"` (was: not extracted)
- `R.C. 5302.20` → unchanged
- `I.R.C. § 1367` → unchanged (still federal, not Ohio)

### Scope notes

The following pieces of #388 are intentionally deferred:

- **Prose form** (`section 120.33 of the Revised Code`) — needs
  a different pattern; multiple states have similar prose forms.

### Tests

6 new tests under `Ohio R. C. spacing variant + R.C. Chapter
form (#388)` in `tests/extract/extractStatute.test.ts`:

- Spaced `R. C. 713.15`
- Spaced `R. C. 5321.15(C)` with subsection
- Spaced chapter `R. C. Chapter 1702`
- No-space chapter `R.C. Chapter 4509`
- Regression: `R.C. 5302.20`
- Regression: federal `I.R.C. § 1367` still routes to federal

Full 2655-test suite passes; no regressions.

### Related

Spacing-tolerance fix follows the pattern established by Arizona
A.R.S. (#348), Arkansas (#349), Hawaii I.C. → Idaho (#360), and
Indiana → Idaho disambiguation (#360). Chapter-only form mirrors
NH `rsa-chapter` (#378).
