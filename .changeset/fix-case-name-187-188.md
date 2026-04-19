---
"eyecite-ts": patch
---

fix: close remaining case-name boundary gaps for NY-style citations (#187, #188)

Two root causes behind remaining `caseName` failures on real-world NY briefs:

- **Missing geographic/street abbreviations.** `Is.` (Island), `Mt.` (Mount),
  `Ft.` (Fort), `Pt.` (Point), `Rt.` (Route), `St.` (Saint/Street), `Blvd.`,
  `Sq.`, `Hwy.`, `Pkwy.`, and `Hts.` were not in `CASE_NAME_ABBREVS`, so the
  backward scanner treated their periods as sentence boundaries and truncated
  names like `Clark-Fitzpatrick, Inc. v. Long Is. R.R. Co.` and
  `Matter of Long Is. Power Auth. Hurricane Sandy Litig.`. Added to the
  Bluebook T6/T10 set.
- **Missing paren signal words.** `quoted in`, `accord`, and the
  `citing, e.g.,` form were not recognized as hard boundaries, so backward
  scans of citations introduced by those signals overshot into the prior
  citation's trailing parenthetical. Extended `PAREN_SIGNAL_BOUNDARY_REGEX`.
