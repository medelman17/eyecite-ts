---
"eyecite-ts": patch
---

fix: California Style Manual year-first citation format (#19)

The California Style Manual (CSM rule 1:1) and the California Rules of Court
place the year in parentheses *before* the volume-reporter-page, not after —
e.g., `In re K.F. (2009) 173 Cal.App.4th 655` rather than the Bluebook
`In re K.F., 173 Cal.App.4th 655 (Cal. Ct. App. 2009)`. This is the canonical
form for California state-court opinions and is required for briefs filed in
CA courts.

Previously the parser tokenized the volume/reporter/page correctly but failed
to extract the case name (because the case-name scanback regexes anchored on a
trailing comma) and the year (because there was no trailing court parenthetical
to recover it from).

### Changes

- `V_CASE_NAME_REGEX` and `PROCEDURAL_PREFIX_REGEX` now accept either `,\s*$`
  (Bluebook) or `\((\d{4})\)\s*$` (CSM year-first) as the trailing form, with
  the year captured as group 3.
- Both regexes carry the `d` flag so the caller can compute a clean-coordinate
  year span.
- `extractCaseName` returns optional `year`, `yearStart`, `yearEnd` fields.
- `processCaseToken` plumbs the year and year span into the citation when a
  trailing court paren did not already provide them.

### Tests

Seven regression tests covering procedural-prefix and `v.`-style year-first
forms, plus regression controls confirming Bluebook form still parses
correctly.
