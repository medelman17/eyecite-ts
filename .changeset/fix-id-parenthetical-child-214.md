---
"eyecite-ts": patch
---

fix: resolve `Id.` to the parent citation, not a citation inside its `(citing X)` parenthetical (#214)

Bluebook Rule 4.1: `Id.` refers to the immediately preceding *cited authority*. A full citation parsed inside another citation's explanatory parenthetical (`(citing X)`, `(quoting Y)`, etc.) is a sub-reference within the parent's citation, not the cited authority of that sentence — so it must not become `Id.`'s default antecedent.

Previously `DocumentResolver` unconditionally promoted every full citation to `lastResolvedIndex`, including ones parsed inside another citation's explanatory parenthetical. After this fix, the resolver detects parenthetical-internal full citations by checking whether the current cite's `span` lies within an earlier full cite's `fullSpan`, and skips them when updating `lastResolvedIndex`. Such cites are still tracked for `supra` and short-form-case resolution.

Regression coverage: 7 new tests in `tests/integration/resolution.test.ts` covering the bug repro, supra/short-form lookups into parenthetical-internal cites, plain `Id.` after a single full cite, string cites with `;` separators, parallel cites, and subsequent history (`aff'd`).
