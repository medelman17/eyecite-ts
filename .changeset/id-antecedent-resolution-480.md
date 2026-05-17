---
"eyecite-ts": minor
---

fix: `Id.` antecedent resolution respects Bluebook signals, quote zones, and pincite shape (#480)

The resolver previously stamped the nearest preceding full citation as
`Id.`'s antecedent, regardless of how the citation appeared. In
documents with intervening signal-phrase citations (`See also …`,
`Cf. …`), block-quoted material, or mixed case/statute references,
this produced wrong antecedents for downstream consumers.

### What changed

`DocumentResolver.resolveId` now walks back over the citations list and
scores candidates instead of taking the last-set `lastResolvedIndex`. The
new scoring axes:

1. **Signal-phrase awareness.** Citations introduced with `see`, `see
   also`, `see generally`, `cf.`, `but cf.`, `compare`, or any `, e.g.`
   variant are treated as *asides* and skipped when a non-signaled
   candidate is in scope. Direct-engagement signals (`accord`, `contra`,
   `but see`) remain strong. Members of a string-cite group inherit the
   group's leading signal.
2. **Quote-boundary respect.** Citations inside markdown blockquotes
   (`> …` lines) or inline paired double-quotes (`"…"`) don't compete
   for `Id.`'s antecedent unless `Id.` itself is in the same quote zone.
3. **Family preference from pincite shape.** `Id. at NNN` prefers a
   case-family antecedent; `Id. § NNN(x)` prefers a statute-family
   antecedent. A statute in the gap no longer captures a following
   `Id. at 125` when an earlier case is in scope.
4. **Case-name window check.** When the prose immediately before `Id.`
   names a case that doesn't match the picked antecedent (`"As Resek
   held, … Id."`), the resolver commits to the chosen antecedent but
   reports `confidence: 0.75` and an ambiguity warning so consumers
   can surface the conflict for review.

The short-form chain behavior is preserved: a `shortFormCase`/`supra`/
`Id.` that resolved to an earlier full citation still re-anchors the
"current authority" for a following `Id.`.

### Behavior change

Two existing tests were updated to reflect criterion 5 (non-case
deprioritization): when a statute interrupts a case discussion and the
next `Id.` has a page-style pincite, the resolver now points to the
case rather than the statute. Consumers that relied on the previous
"most-recent authority of any type" rule will see different
`resolution.resolvedTo` indices in these mixed-type sequences. A
statute-only context still resolves `Id.` to the statute.

### Tests

18 new tests in `tests/resolve/issue480_idAntecedent.test.ts` cover all
five acceptance criteria from the issue: simple `case → Id.`
(no regression), signal-phrase intervening cites (`see also`, `cf.`,
`see`, `but cf.`, `compare`, `see generally`), block-quote and inline-
quote skip, matching/mismatching case-name window, and case/statute
family routing. Full suite: 2962 tests pass.
