---
"eyecite-ts": patch
---

fix: Illinois `Ill. App. 3d` and Minnesota `N.W.2d` reporter normalization (#465, #466)

Two reporter-spacing normalizations were inconsistent with
Bluebook T1:

- **#465** — `Ill. App.3d` (no space before ordinal) preserved
  as-is. The Bluebook canonical form is `Ill. App. 3d` (with
  space). 19 occurrences in the IL sample.
- **#466** — `N. W.2d` (space between `N.` and `W.`) preserved
  as-is. The canonical form is `N.W.2d` (no inner space). 13
  occurrences in the MN sample. Same pattern affects `S.W.`,
  `N.E.`, `S.E.` regional reporters.

### Fix

In `normalizeReporterSpacing`:

1. **Regional-reporter inner-space collapse** runs before the
   general ordinal-suffix collapse:
   `\b([NS])\.\s+([WE])\.` → `$1.$2.` covers
   `N.W.` / `N.E.` / `S.W.` / `S.E.` regardless of input
   spacing.
2. **Illinois Appellate restore** runs after the general
   collapse to add back the space the general rule strips:
   `\bIll\.\s+App\.(\d+[a-z]+)` → `Ill. App. $1`.

### Tests

11 new tests in `tests/clean/reporterSpacingIllNw.test.ts`
covering both directions (already-canonical and corrupted
input) for `Ill. App. 2d/3d` and the four regional reporters
`N.W.2d / S.W.2d / N.E.2d / S.E.2d`. Updated one existing #332
regression sentinel to reflect the new canonical Illinois form.
Full 2936-test suite passes.
