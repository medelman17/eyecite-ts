---
"eyecite-ts": patch
---

Fix `annotate` corrupting wraps for parallel-reporter sequences when `useFullSpan: true` (#543).

When `useFullSpan: true`, `annotate` sorted citations by `span.originalStart` (the core citation) but wrapped using `fullSpan.originalStart`/`fullSpan.originalEnd`. For parallel-reporter sequences whose `fullSpan`s all extend back to the same case name (e.g., `Roe v. Wade, 410 U.S. 113, 93 S.Ct. 705, 35 L.Ed.2d 147 (1973)`), the sort order disagreed with the wrap ranges. The reverse-iterate splice then dropped `<cite>` tags inside text that subsequent (outer) wraps were about to encompass, producing nested `<cite>` tags, mid-token truncations like `L. Ed. 2</cite>d`, and HTML-escaped sentinels like `&lt;cite&gt;`. The pathology hit roughly 21% of opinions in a CAP-corpus audit.

`annotate` now resolves each citation's wrap range up-front (core span or `fullSpan`, depending on `useFullSpan`) and sorts/iterates against that range. It also performs explicit overlap detection: when two wraps intersect, the earlier-starting (outer/wider) wrap wins and the inner citation is surfaced via the `skipped` array — matching the promise in `AnnotationResult.skipped`'s docstring. Parallel-reporter clusters now produce a single outer `<cite>…</cite>` around the case name + reporters + parenthetical, with the inner two citations reported as skipped.
