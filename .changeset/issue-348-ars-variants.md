---
"eyecite-ts": patch
---

fix: Arizona A.R.S. accepts word `section`, spacing/OCR variants, and normalizes `code` (#348)

Arizona statutes appear in many forms across published opinions —
`A.R.S. § 25-331`, `A.R.S. section 14-2804(A)`, `ARS § 35-213`,
`A. R.S. § 36-1002.02`, `AR.S. § 35-213`. The tokenizer recognized
only the canonical fully-dotted-with-`§` form, and even the partially
matching variants (`ARS`, `AR.S.`) emitted with `code` reflecting the
raw match instead of the canonical `A.R.S.`. A 42-opinion Arizona
sample showed 20+ statute misses on these variants alone.

### Fix

Three coordinated surface-level changes:

1. **`src/data/stateStatutes.ts`** — the abbreviated-code section
   connector accepts the spelled-out word `section(s)` /
   `Section(s)` alongside `§` / `§§`:

   ```
   …\\s*(?:§§?|[Ss]ections?)?\\s*…
   ```

   This is a universal change benefiting all abbreviated-code
   jurisdictions; Arizona is the immediate driver per #348.

2. **`src/data/stateStatutes.ts`** — the Arizona `regexFragment`
   admits inter-letter whitespace so spacing/OCR variants tokenize:

   ```
   A\\.?\\s*R\\.?\\s*S\\.?     (was: A\\.?R\\.?S\\.?)
   ```

   `A. R.S.`, `AR.S.`, `ARS` all match.

3. **`src/data/knownCodes.ts` + `src/extract/statutes/extractAbbreviated.ts`**
   — added a stripped-form fallback to `findAbbreviatedCode` (matches
   on dots+spaces removed) and a normalization step in the extractor.
   When the raw match doesn't appear in `entry.patterns` verbatim
   (i.e., it's an OCR/spacing variant), `code` is set to the canonical
   short abbreviation (`A.R.S.`). Exact-match inputs are left
   unchanged, so `Ariz. Rev. Stat. § 14-1234` continues to emit
   `code: "Ariz. Rev. Stat."` (no regression for Bluebook full forms).

### Scope

- **Multi-section ranges** (`A.R.S. §§ 23-941 through 23-952`) are
  intentionally deferred — they require either a `sectionRange` field
  or producing multiple citations from one match, neither of which
  is a tight regex change.
- **Bare-section context propagation** (`§ 36-3706` resolving to
  A.R.S. via earlier context) is tracked separately under the
  general per-document statute context proposal.

### Tests

8 new tests under `Arizona A.R.S. format variants (#348)` in
`tests/extract/statutes/extractAbbreviated.test.ts`:

- Canonical with subsection: `A.R.S. § 25-331(E)`
- Word `section` lowercase: `A.R.S. section 14-2804(A)`
- Word `Section` capital: `A.R.S. Section 22-318`
- No-dots variant: `ARS § 35-213` → code normalized to `A.R.S.`
- Extra-space variant: `A. R.S. § 36-1002.02` → code normalized
- OCR variant: `AR.S. § 35-213` → code normalized
- Regression: `Ariz. Rev. Stat. § 14-1234` → code preserved as-is
- Regression: `Ariz. Rev. Stat. Ann. § 14-1234` → code preserved as-is

Full 2535-test suite passes; no regressions.

### Related

Surfaced by 42-opinion Arizona sample. Same family as #12 (state
bare-statute forms), #330 (pre-1993 Illinois Revised Statutes), #343
(Code of Alabama 1940) — each state's most common statute family has
its own abbreviation/spacing/subdivision quirks that have to be
covered explicitly.
