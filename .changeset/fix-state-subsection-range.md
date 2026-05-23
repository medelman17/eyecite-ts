---
"eyecite-ts": patch
---

fix(extract): state statute subsection ranges populate subsectionRange (#694)

Resolves part 2 of #694. State statute extractors (`named-code` for
`Cal. Civ. Code §...`, `extractCaBareCode` for `Civ. Code §...`)
dropped the `-(c)` subsection-range trailer entirely. Federal USC
already populated `subsectionRange: {start, end}` for the same shape.

| input | before | after |
|---|---|---|
| `Cal. Civ. Code §§ 1714.5(a)-(c)` | subsection=`(a)`, no range | `(a)` + range `(a)→(c)` ✓ |
| `Cal. Penal Code § 148(b)-(d)` | subsection=`(b)`, no range | `(b)` + range `(b)→(d)` ✓ |
| `42 U.S.C. § 1983(a)-(c)` (federal control) | unchanged | unchanged ✓ |
| `Cal. Civ. Code § 1714.5(a)` (single) | unchanged | unchanged ✓ |

Four parallel sites updated:
1. `named-code` tokenizer pattern in `statutePatterns.ts`
2. `buildCaBareCodeRegex` tokenizer in `caBareCodes.ts`
3. `extractNamedCode` extractor regex + parseBody destructure + return
4. `extractCaBareCode` extractor regex + parseBody destructure + return

4 regression tests in `tests/extract/issueStateSubsectionRange.test.ts`.

Parts 1 and 3 of #694 (`to` connector — fixed earlier in PR #742;
partial-range `.55` semantics) closed elsewhere.
