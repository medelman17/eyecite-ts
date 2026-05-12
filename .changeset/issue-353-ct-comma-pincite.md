---
"eyecite-ts": patch
---

fix: Connecticut comma-pincite for Id./Ibid./supra back-references (#353)

Connecticut courts use a distinctive citation style where the page
follows a comma rather than the Bluebook `at`:

```
Id., 822          (vs. Bluebook `Id. at 822`)
Smith, supra, 522 (vs. Bluebook `Smith, supra, at 822`)
Ibid., 250
```

This convention is mandated by Connecticut Practice Book Rule 67-11
and the Connecticut Style Manual. In a 28-opinion Connecticut sample,
56 pincites were silently dropped because the existing `Id.`/`Ibid.`/
`supra` patterns required the word `at` (or a paragraph marker)
between the back-reference and the page.

### Fix

Extended the pincite-connector alternation in `ID_PATTERN`,
`IBID_PATTERN`, and `SUPRA_PATTERN` (`src/patterns/shortForm.ts`) and
the corresponding `idRegex` / `partySupraRegex` in
`src/extract/extractShortForms.ts` from

```
(,?)\s*(?:at\s+(?:pp?\.\s*)?|(?=¶|paras?\.?\b))
```

to

```
(?:,\s+|,?\s+(?:at\s+(?:pp?\.\s*)?|(?=¶|paras?\.?\b)))
```

The new `,\s+` branch requires a literal comma, so it doesn't conflict
with the existing typo-guard at the head of the pattern
(`Id, at` is still only matched by `Id\s*,(?=\s+at\s)`).

Group numbering in the extractor changed: the previous group 4
(optional post-period comma) became group 4 (connector capture). The
extractor now detects the "post-period comma" signal via
`match[4]?.startsWith(",")` to preserve the existing confidence
penalty for non-canonical forms.

### Confidence policy

- `Id. at 822` (canonical Bluebook) → confidence 1.0 unchanged
- `Id., 822` (Connecticut comma-pincite) → confidence 0.9 (regional
  convention; not a typo, but non-Bluebook)
- `Id., at 253` (period-then-comma, Bluebook-tolerant) → confidence
  0.9 unchanged
- `Id, at 1483` (typo: comma instead of period) → confidence 0.7
  unchanged

### Scope

The bracketed-reporter `supra, [24 Conn. App.] 554` and the
section-comment-page `supra, § 2.09, comment 3, p. 375` forms are
more complex pincite shapes and are deferred. Multi-page lists
(`Id., 380, 383`) capture the first pincite only — same as existing
hyphen-range behavior.

### Tests

9 new tests under `Connecticut comma-pincite for Id./Ibid./supra
(#353)` in `tests/extract/extractShortForms.test.ts`:

- `Id., 6` → pincite=6
- `Id., 14-15` → pincite=14, endPage=15, isRange=true
- `Id., 380, 383` → first pincite captured (list scope deferred)
- `Smith, supra, 522` → pincite=522
- `Ibid., 250` → pincite=250
- Regression: `Id. at 822` → confidence=1.0
- Regression: `Smith, supra, at 822`
- Regression: `Id., at 253` (post-period comma)
- Regression: `Id, at 1483` (typo comma) — confidence ≤ 0.7

Full 2560-test suite passes; no regressions.

### Related

Surfaced by 28-opinion Connecticut sweep. Same family as #305 (Id./
Ibid. punctuation variants), #281 / #247 (pincite forms), #344
(short-form `at page N` word). Each is a pincite-prefix tolerance fix
for back-reference shapes outside strict Bluebook.
