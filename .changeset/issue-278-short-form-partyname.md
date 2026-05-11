---
"eyecite-ts": minor
---

feat: short-form case back-reference party name + resolver disambiguation (#278)

Bluebook short-forms commonly include a leading back-reference name
(`Smith, 500 F.2d at 125`). Previously the tokenizer recognized only the bare
`vol reporter at page` form, dropping the disambiguating name. The resolver
then matched purely on volume + reporter, so when two earlier full citations
shared those values the short-form silently resolved to the wrong antecedent.

### Changes

- **`ShortFormCaseCitation`** gains `partyName?: string` and
  `partyNameNormalized?: string` mirroring `SupraCitation.partyName`.
- **`SHORT_FORM_CASE_PATTERN`** (tokenizer) and the local `shortFormRegex`
  (extractor) now accept an optional leading `[A-Z][a-zA-Z''\-]+(\s+v\.?\s+|\s+)...,\s+`
  party-name segment before the volume. Group order shifts:
  `1 = partyName? | 2 = volume | 3 = reporter | 4 = pincite`.
- **`extractShortFormCase`** runs the captured raw party name through
  `stripSupraPartyPrefix` (#216 helper) so leading citation signals
  (`See`, `Cf.`, `Compare`, etc.) and sentence-initial connectors (`Then`,
  `Also`, `In` but not `In re`) are stripped before assignment.
- **`resolveShortFormCase`** collects all backward in-scope candidates that
  match volume + reporter. When `partyNameNormalized` is set, it prefers
  the candidate whose plaintiff or defendant normalized name overlaps
  (substring containment in either direction tolerates abbreviation
  patterns); recency breaks ties. Bare short-forms (no party name) continue
  to fall back to recency — no regression.

Disambiguated short-forms get confidence 0.98 (vs. 0.95 for vol+reporter-only
matches) because the additional party-name constraint tightens the match.

### Tests

6 new tests under `short-form case party-name back-reference (#278)`:

- **Regex captures** (4): bare form, `Smith,`, `See Smith,` (signal strip),
  `Smith v. Jones,`.
- **Resolver disambiguation** (2): two cases share vol+reporter →
  party-named short-form picks the right one; bare short-form falls back to
  recency.

Pattern-level tests in `tests/patterns/shortForm.test.ts` were updated to
the new group order; one new test confirms the optional partyName group.
