---
"eyecite-ts": patch
---

refactor(patterns): consolidate the citation pattern grammar into a single source of truth (#844)

The authoritative pattern set and its priority order (most-specific → least-specific) are now one exported definition — `orderedPatterns` in `src/patterns/grammar.ts` — consumed by both `extractCitations` and the `tokenize` default. Previously the ordered list lived inline in `extractCitations` while `tokenize` shipped its own incomplete, differently-ordered default that the main pipeline never used (effectively dead).

Behavior-preserving: the emitted token stream and the downstream dedup outcome are identical (full suite green). The order is load-bearing but was invisible — dedup keeps the earliest-listed (most-specific) pattern on an overlap — so a new ordering test (`tests/patterns/grammarOrder.test.ts`) guards it against accidental reordering.
