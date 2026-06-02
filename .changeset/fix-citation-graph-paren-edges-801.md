---
"eyecite-ts": patch
---

fix(document): `in-parenthetical-of` citation-graph edges tolerate unbalanced parentheses (#801)

`buildCitationGraph` derived `in-parenthetical-of` edges from the raw `computeParenDepths` counter, so dropped/unbalanced parentheses (OCR/PDF) corrupted them — a dropped opening paren lost the aside edge, and a dropped closing paren leaked a spurious edge onto every following top-level citation. Edges are now computed via a balance-tolerant owner (`computeInParentheticalOwners`) that reuses #798's trigger-anchored signal for dropped opening parens and a sentence-boundary guard for dropped closing parens. Balanced input (including parallel-cite siblings inside an aside) is unchanged.
