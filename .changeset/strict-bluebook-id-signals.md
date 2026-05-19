---
"eyecite-ts": patch
---

Fix `Id.` resolves-to skipping weakly-signaled antecedent (#498).

`resolveId` previously down-ranked candidates carrying `See`, `Cf.`, `See also`, `Compare`, `But cf.`, or `See generally` signals (`+100 if !weak` in the scorer), which let a more-distant strong-signal full cite beat a more-recent weak-signal one. The bug surfaced when the same input was extracted with vs. without a `See` prefix on the most-recent full cite — the single-character delta flipped `Id.`'s resolved cluster from the immediately-preceding case to the prior unsignaled one.

Per Bluebook Rule 4.1 (and matching the Python eyecite reference implementation, which is signal-blind), `Id.` anchors to the immediately preceding cited authority regardless of signal phrase. The signal qualifies *how* the source supports the proposition, not whether the citation can be the referent of a following `Id.`

The fix removes the weak-signal scoring component from `resolveId`. Family preference (case vs. statute based on `Id.`'s pincite shape), quote-zone filtering, parenthetical-child filtering, and case-name window checks are unchanged. `resolution.resolvedTo` and `resolution.antecedentIndex` now agree in every signal case.

**Behavior change for #480 weak-signal scenarios:** in `STRONG. See WEAK. Id.` patterns, `Id.` now resolves to the `See`-signaled cite (the immediately preceding citation), not the strong cite. This aligns with Python eyecite and the strict Rule 4.1 reading. Six tests in `tests/resolve/issue480_idAntecedent.test.ts` were updated to encode the new (correct) expectation.
