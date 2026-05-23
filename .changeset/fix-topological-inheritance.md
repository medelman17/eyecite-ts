---
"eyecite-ts": patch
---

fix(extract): topological inheritance for multi-link history chains (#620)

Resolves #620. `inheritSubsequentHistoryCaseName` iterated linearly and
worked for multi-link chains (`<root>, aff'd, <A>, cert. denied, <B>`)
only because chain links appear in document order. Any future re-
ordering of the citations array would silently break multi-link
propagation.

Fix: run the inheritance loop until quiescence (fixed-point iteration).
Robust to array order, bounded by chain depth + 1.

3 regression tests in `tests/extract/issueTopologicalInheritance.test.ts`
covering two-link chains, single-link controls, and standalone-cite
controls.
