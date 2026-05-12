---
"eyecite-ts": patch
---

feat: capture trailing parentheticals on `Id.`, `supra`, and short-form case citations (#303)

`Id. at 770 (Marsh)`, `Id. at 770 (citation omitted)`,
`Smith, supra, at 200 (holding that ...)`, and
`100 F.3d at 770 (citations omitted)` previously dropped the trailing
parenthetical content silently. The short-form extractors now capture
the parenthetical text on a new `parenthetical?: string` field,
mirroring how `extractCase` handles trailing parens on full citations.

Surfaced as 80+ findings in the 200-opinion modern-era sweep — the
third-largest field-issue bucket after caseName and court.

### Fix

Added a lightweight `extractTrailingParenthetical(cleanedText, cleanEnd)`
helper in `src/extract/extractShortForms.ts`. It scans the cleaned text
starting at the citation's `span.cleanEnd` for `^[\s,]*\(([^()]*)\)` and
returns the inner text. Wired into all three short-form extractors:

- `extractId(token, transformationMap, cleanedText)` — already received
  `cleanedText` for context validation (#216); reuse it.
- `extractSupra` — new third parameter.
- `extractShortFormCase` — new third parameter.

`extractCitations` now passes `cleaned` to all three call sites.

### Fields added

- `IdCitation.parenthetical?: string`
- `SupraCitation.parenthetical?: string`
- `ShortFormCaseCitation.parenthetical?: string`

The captured value is the raw text between the parens. Consumers can
post-classify it as a short-form identifier (`Marsh`), drop-citation
marker (`citation omitted`), or explanatory holding by inspecting the
content — the lightweight extractor intentionally doesn't classify, since
short-form parens are rarely chained and classification adds value
mostly on full case cites.

### Scope notes

- **Single paren only.** The extractor captures the first `(...)` that
  immediately follows the citation. Chained parens on short-form cites
  are rare and not in scope.
- **No `parentheticals[]` array.** The full-cite `parentheticals`
  array with structured `Parenthetical` objects (including signal-word
  classification, span, and kind) remains case-cite-only. Adding it to
  short-forms would require porting the full `collectParentheticals`
  pipeline, which is heavier than the gap this PR addresses.
- **No new `shortFormIdentifier` / `dropCitation` kinds.** The issue
  suggested adding these to `ParentheticalType`, but with the raw
  `parenthetical: string` field consumers can do their own classification
  cheaply; adding union variants would expand the public type without
  much practical benefit.

### Tests

6 new tests under `trailing parenthetical capture on short-form cites
(#303)` in `tests/extract/extractShortForms.test.ts`:

- `Id. at 770 (Marsh)` → `parenthetical: "Marsh"`
- `Id. at 770 (citation omitted)` → `parenthetical: "citation omitted"`
- `Id. at 100` (no paren) → no `parenthetical` field
- `Smith, supra, at 200 (holding ...)` → `parenthetical: "holding that the rule applies"`
- `Smith, supra, at 460` (no paren) → no `parenthetical` field
- `100 F.3d at 770 (citations omitted)` → `parenthetical: "citations omitted"`

Full 2427-test suite passes; no regressions.
