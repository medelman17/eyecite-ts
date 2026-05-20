---
"eyecite-ts": patch
---

fix(extract): NM bare-section decimal subsection + jurisdiction guard (#565)

Two paired bugs on the NM bare-section path:

1. The `nm-bare-section` regex didn't accept `.` inside parens, so
   `§ 32A-2-7(A)(1.5)` silently dropped the `(1.5)` portion of the
   subsection chain. Pattern + extractor regex now allow decimals and
   bracket subscripts inside subsection parens.
2. The default `NM` / `NMSA 1978` tag fired on every bare `§ N-N-N`
   shape, even with no nearby NM signal — the same misattribution
   pattern that drove #531 for the named-code path. Adds a jurisdiction
   guard: if the cleaned text within 200 chars before the citation
   doesn't contain `NMSA`, `N.M.`, or `New Mexico`, both `jurisdiction`
   and `code` are dropped so consumers don't trust a guess.

`StatuteCitation.code` is now `string | undefined` to model the
guard-dropped case. The bluebook formatter renders `§ <section>` without
a code prefix when code is missing. Three pre-existing tests that asserted
the implicit NM default have been rewritten to either supply NM context
or assert the new dropped-jurisdiction contract.
