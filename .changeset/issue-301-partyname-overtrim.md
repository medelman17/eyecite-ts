---
"eyecite-ts": patch
---

fix: supra/short-form `partyName` captures multi-word names with `&` and corporate suffixes (#301)

The supra and short-form case-cite patterns truncated `partyName` to
the last token when the name contained `&` or trailing corporate
suffixes after a comma. `Walker & Horwich, supra` captured only
`"Horwich"`; `Thorn Americas, Inc., supra` captured only `"Inc."`.
Surfaced as 50+ partyName findings in the 200-opinion modern-era
sweep with direct impact on #278's resolver disambiguation.

### Root cause

`SUPRA_PATTERN` and `SHORT_FORM_CASE_PATTERN` in
`src/patterns/shortForm.ts` (and the duplicate parser regexes in
`src/extract/extractShortForms.ts`) allowed only `\s+v\.?\s+` and
plain `\s+` between capitalized words in the party-name capture. So:

- `Walker & Horwich`: `&` is neither whitespace nor `v.`. The regex
  captured `Walker` then failed to find `, supra` immediately
  after — backtracked and re-matched starting at `Horwich`.
- `Thorn Americas, Inc.`: `,` is not a continuation character. The
  regex captured `Thorn Americas` then failed to find `, supra` (the
  next token is `, Inc.`) — backtracked and re-matched starting at
  `Inc.`.

### Fix

Added two continuation alternatives to the party-name capture group
in both `SUPRA_PATTERN` and `SHORT_FORM_CASE_PATTERN`, and to the
mirror regexes in `extractShortForms.ts`:

- `\s+&\s+` — ampersand-joined parties
- `,\s+` — comma continuation for corporate suffixes / multi-clause
  party names

Both require a capital-letter follow-on, so the lowercase `supra`
terminator is unaffected.

### Intentionally out of scope

- **`In re X, supra` preserving the prefix.** The issue's third
  example wants `In re Bluetooth, supra` → `partyName: "In re
  Bluetooth"`, but the resolver's BKTree indexes full-cite party
  names with `In re` stripped (per existing #216 / #21 convention).
  Adding the prefix here would break supra-to-fullcite resolution.
  The existing pinned regression at `extractShortForms.test.ts:1150`
  (`In re Smith, supra` → `partyName: 'Smith'`) reflects that
  convention. Fixing this requires resolver-side normalization
  (matching with prefix-equivalence) — a separate, larger change.
- **Bare back-reference resolution.** Cases like `Strawn v. Farmers
  Ins. Co. of Oregon, supra` where the source only writes
  `Oregon, supra` cannot be fixed by pattern changes — only the
  literal token text is available to the regex. The resolver must
  walk back to the prior full citation to recover the full caption.

### Tests

5 new tests under `multi-word party name capture (#301)` in
`tests/extract/extractShortForms.test.ts`:

- `Thorn Americas, Inc., supra` → `partyName: "Thorn Americas, Inc."`
- `Walker & Horwich, supra` → `partyName: "Walker & Horwich"`
- `In re Foo, supra` → `partyName: "Foo"` (pins the resolver-aware
  In-re-stripping behavior; calls out the scope decision in the
  test comment)
- Regression: single-word `Smith, supra` → `partyName: "Smith"`
- Regression: `Smith v. Jones, supra` → `partyName: "Smith v. Jones"`

Full 2411-test suite passes; no regressions.
