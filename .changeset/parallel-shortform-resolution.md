---
"eyecite-ts": patch
---

Fix: parallel reporter citations trailing a short-form — or in any citation chain that omits the closing year-parenthetical — are now grouped with, and resolved to, the same case as their anchor, instead of being orphaned with a fresh group id and no resolution (#884).

A run like `Smith, 230 Md. at 236, 146 A.3d at 1202.` or `Neitzke, 490 U.S. at 324, 109 S.Ct. 1827.` now forms one parallel group anchored on the short-form, and the trailing parallels inherit the short-form's antecedent. The root cause was in parallel-chain detection: a tight-linked run was validated link-by-link, so an intermediate cite in a no-paren chain (`A, B, C.`) broke the chain and orphaned the head. Chains are now validated by their last member, so 3+-cite runs without a trailing paren group correctly.

Additive and non-breaking: short-form case citations may now carry `parallelGroup`/`parallelCitations`, and a full reporter citation that trails a short-form as a parallel reference may carry an inherited `resolution`.
