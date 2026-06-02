---
"eyecite-ts": patch
---

fix(resolve): `supra` no longer resolves to a case cited only inside another citation's parenthetical (#799)

`resolveSupra` now excludes parenthetical-internal asides (`(quoting X)` / `(citing Y)`) as antecedents, matching `resolveId`'s #214 exclusion — so `X v. Y, supra` no longer attaches to a case named only inside another cite's aside. The exclusion uses a precise depth-based aside signal (`isParentheticalAside`) that, unlike the fullSpan-containment fallback, does **not** drop parallel-cite siblings (e.g. `Roe v. Wade, 410 U.S. 113, 93 S. Ct. 705`), which remain valid supra antecedents.
