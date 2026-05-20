---
"eyecite-ts": patch
---

fix(extract): disambiguate `Black.` SCOTUS vs Blackford by era (#572)

Two reporters share the `Black.` abbreviation:

- `Black` — Black's Supreme Court Reports (SCOTUS, 1861-1862)
- `Blackf.` — Indiana Reports, Blackford (1817-1847)

The literal `Black.` is listed in reporters-db as a variation of
`Blackf.`, so every input citation `<vol> Black. <page>` was normalizing
to `Blackf.` — even when surrounded by SCOTUS context like
`Dred Scott v. Sandford, 1 Black. 219 (U.S. 1862)`.

Adds an era heuristic in `resolveNormalizedReporter`
(`src/extract/extractCase.ts`): when the captured reporter literal is
`Black.` (case-insensitive) AND a parsed year falls inside the SCOTUS
window [1861, 1862] inclusive, the result switches to `Black`. Outside
that window — or when no year was extracted — the default `Blackf.`
resolution stands. The literal `reporter` field is preserved verbatim;
only `normalizedReporter` shifts.

Deliberately narrow: only fires on the `Black.` literal (so direct
`Blackf.` inputs and other shared abbreviations are unaffected), only
shifts the normalized form (not the raw reporter), and only when the
year evidence is unambiguous. Picked option (b) from the issue's
three-option discussion as the cleanest balance.

Coverage: 14 new tests in
`tests/extract/issue572BlackEraDisambiguation.test.ts` covering the
SCOTUS era (4 cases at 1861 / 1862), the Indiana era (5 cases at 1820,
1840, 1847, plus 1860 and 1870 boundary years that fall outside the
SCOTUS window), the no-year fallback (defaults to Blackf.), and direct
`Blackf.` inputs (heuristic does not fire — even when paired with a
SCOTUS-era year).
