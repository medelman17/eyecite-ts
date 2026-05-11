---
"eyecite-ts": patch
---

fix: state LEXIS variants (Cal. LEXIS, Tex. App. LEXIS, N.Y. Misc. LEXIS, etc.) now extract (#228)

The existing `lexis` pattern in `neutralPatterns.ts` was hard-coded for federal courts only — `\b(\d{4})\s+U\.S\.(?:\s+(?:App|Dist)\.)?\s+LEXIS\s+(\d+)\b`. State LEXIS variants (Cal. LEXIS, Tex. App. LEXIS, N.Y. Misc. LEXIS, Ill. App. LEXIS, Fla. LEXIS, Pa. Super. LEXIS, etc.) silently fell through to the broad state-reporter fallback and surfaced as weak `case` matches with no court/year/documentNumber populated.

Generalized the regex to accept any uppercase-prefixed court abbreviation before LEXIS:

```regex
\b(\d{4})\s+[A-Z][A-Za-z.\s]+?\s+LEXIS\s+(\d+)\b
```

The non-greedy `[A-Z][A-Za-z.\s]+?` is bounded by the literal `\s+LEXIS` that follows it, so there's no runaway risk. The downstream `extractNeutral.ts` already parses arbitrary `<court> LEXIS` shapes via the generalized 3-group regex from #233, so no extractor changes were required.

Adds 13 corpus-shaped regression tests in `tests/extract/extractLexisStateVariants.test.ts`: 2 California (Cal. + Cal. App.), 2 Texas (Tex. + Tex. App.), 2 New York (N.Y. Misc. + N.Y. App. Div.), 1 Illinois (Ill. App.), 3 additional high-corpus jurisdictions (Fla., Ohio, Pa. Super.), and 3 federal regression controls (U.S., U.S. App., U.S. Dist.) confirming the existing tokenizations still pass.
