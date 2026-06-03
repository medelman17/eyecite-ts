# #811 Deep Dive — The Candidate-List Scorer Seam

**Date:** 2026-06-03
**Type:** Implementation analysis / orientation (point-in-time snapshot, not a literature report)
**Subject:** Issue #811 (PR #816) and its place in the scope-before-recency `Id.`/`supra` series (#812).
**Companion:** `docs/research/2026-06-03-shortform-resolution-readers-guide.md` (one-page map of all 9 parts + open-questions ledger).
**Snapshot note:** The "current state / honest gaps" and roadmap sections describe `src/resolve/DocumentResolver.ts` and `src/utils/parentheticalScope.ts` as of 2026-06-03. Line numbers and "wired vs. recommended" status will drift as the series progresses — re-verify against source before acting.

---

## The one-line version

#811 (shipped as PR #816) refactors `resolveId`'s inline antecedent pick into a named, generic **scorer seam** — `scoreAntecedentCandidates` + `selectAntecedent` — with **zero behavior change**. It is structural plumbing for a future learning-to-rank model, deliberately *not* an accuracy lever. The companion measurement work (#810 → #817) then *confirmed* that not investing further in ranking was the right call. The whole arc is a disciplined "prove you don't need the ML before building it."

## How the pieces fit

"#811 and related new docs" is really one coordinated series hanging off roadmap **#812** (*scope-before-recency `Id.`/`supra` resolution*):

| Issue | PR | What | Status |
|---|---|---|---|
| **#812** | — | Roadmap: 5-stage pipeline `parse → scope → salience → abstain → provenance` | umbrella |
| **#813** | #813 | The 9-part design-research series (`docs/research/2026-06-02-shortform-resolution-*`) | docs landed |
| **#809** | #814 | Bounded-depth bracket **stack** replaces global paren counter; adds `balanceOk` | shipped |
| **#811** | #816 | **Candidate-list scorer seam** for `Id.` selection | shipped (focus) |
| **#810** | #817 | Bracket-survival **measurement** → "degrade-to-soft" recommendation | measured; #810 still open |

The intellectual core lives in two docs: `…-08-synthesis.md` (the executive synthesis of all 7 research reports) and `…-05-ranking-abstention.md` (the theory the seam is built from).

## What #811 actually changed, in code

**Before** — an inline two-liner inside `resolveId`:

```ts
const preferred = preferredFamily === null ? undefined : candidates.find((c) => c.family === preferredFamily)
const best = preferred ?? candidates[0]
```

**After** — `src/resolve/DocumentResolver.ts:478` calls a seam:

```ts
const best = this.selectAntecedent(candidates, preferredFamily) ?? candidates[0]
```

backed by two new methods at `src/resolve/DocumentResolver.ts:529-560`:

```ts
scoreAntecedentCandidates(candidates, preferredFamily): number[] {
  const FAMILY_PREFERENCE_WEIGHT = 10
  const n = candidates.length
  return candidates.map((c, i) => {
    const recency = (n - i) / n
    const familyMatch = preferredFamily !== null && c.family === preferredFamily ? 1 : 0
    return FAMILY_PREFERENCE_WEIGHT * familyMatch + recency
  })
}
```

### Why it's provably behavior-preserving

Candidates arrive in reverse document order (`candidates[0]` = most recent). So:

- recency `= (n − i) / n` ∈ `[1/n, 1]`, strictly decreasing in `i`;
- a family match adds 10 → matches score in `[10 + 1/n, 11]`, non-matches in `[1/n, 1]`.

Any family match outscores any non-match (the magnitude only needs to exceed recency's max of 1; the code comment notes this). Within a class, lower index (more recent) wins. And because recency is distinct for every `i`, **no two candidates can ever tie** — the scorer is a strict total order. That reproduces the old "most-recent preferred-family match, else most-recent overall" *exactly*, which is what the test pins (`tests/resolve/issue811_candidateScorer.test.ts`: family-pref over a more-recent statute; recency tie-break within family) and what the 4452-test suite confirms.

`selectAntecedent` is **generic** (`<T extends {index, family}>`, `src/resolve/DocumentResolver.ts:549`) — that is the deliberate seam: a later caller can pass a richer candidate type and a richer scorer drops in without touching `resolveId`.

## Why build a seam and stop there

This is the thesis worth internalizing, straight from `…-05-ranking-abstention.md` and `…-08-synthesis.md`:

> **The candidate set dominates the ranking.** Lee et al.'s oracle (perfect) mentions buy **+17.5 F1**; the best ranking-side refinement buys **1–4 F1**.

So getting *scope* right (which candidates even enter the list — stages 1–2, the #809 stack) is where the accuracy is. Ranking the survivors is a rounding error until you have measured otherwise. #811 therefore ships the **mention-ranking frame** (Lee et al. 2017: score candidates, argmax, with a null candidate for abstention) as a deterministic 2-feature scorer — `family + recency` — so a LambdaMART model over the richer feature vector the issue describes (scope-depth delta, reporter/jurisdiction match, party-name overlap, pincite consistency, …) becomes a seam-compatible drop-in *if and when* a labeled `Id./supra → antecedent` corpus exists (none does today).

Then #810/#817 closed the loop: the measurement found recovery is already 100% on balanced input and 100% of dropped-bracket damage is *flagged* by `balanceOk`, so `…-09-bracket-survival-measurement.md` explicitly recommends **"#811 learned ranker stays deferred — the shipped deterministic seam suffices."** The seam was built; the measurement said don't fill it yet. That is the disciplined arc.

## The honest gaps (what "no behavior change" quietly leaves on the floor)

> **Update (2026-06-03):** these were the gaps right after #811. The do-now slate has since shipped — gap 3 (`balanceOk` unconsumed) is **resolved by #820**; supra cardinality/abstain landed in **#818**; history-subordinator triggers in **#821**. Each gap is annotated with its current status.

These were not defects — PR #816 did exactly what it advertised — but they were the real state of play right after the seam:

1. **The seam is 1/3 wired.** Only `resolveId` routes through `selectAntecedent` (it is the sole call site). `resolveSupra` still ranks by BK-tree Levenshtein similarity (`src/resolve/DocumentResolver.ts:868`), and `resolveShortFormCase` still does its own party-overlap + recency loop (`src/resolve/DocumentResolver.ts:1009`). The PR acknowledges this ("supra/short-form route through the seam in a follow-up"), but note *why* it is non-trivial: those paths weight **different features** (similarity, party overlap) than family+recency, so unifying them means generalizing the feature vector, not just moving code. **(Still open as of 2026-06-03):** #818 added supra cardinality / tie-abstain, but on its own path — `resolveSupra` still does not route through the `selectAntecedent` scorer.

2. **The literature's "dummy/null candidate" abstain mechanism isn't actually realized.** Docs #05/#08 lean hard on Lee et al.'s null candidate (scored 0) as the *native* abstain signal. In code, `selectAntecedent` returns `undefined` only on an **empty list** — but the sole caller already pre-guards emptiness at `src/resolve/DocumentResolver.ts:442` (returns before reaching line 478). So `selectAntecedent`'s `undefined` return and the `?? candidates[0]` fallback are **both dead from the only caller today**. Abstention is done entirely downstream by `idConfidenceFloor` (#800) at `src/resolve/DocumentResolver.ts:489`, not by a scored null candidate inside the scorer (and, on the supra path, by the #818 tie-abstain). The seam is forward-compatible with a scored null candidate; it just doesn't implement one yet.

3. **`balanceOk` is produced but consumed nowhere.** → **✅ Resolved (#820).** At the time of #811, #809's `balanceOk` was dropped at `parenDepths` and read by no resolver path. #820 now threads it into `resolveId` (degrade-to-soft on balance failure), and #819 first de-polluted it (the string-cite reset had made it fire on ~32% of citations in clean text). The signal is now load-bearing, not dangling.

4. **The "silent recency fallback" the synthesis wanted *removed* is still there.** `findImmediatePredecessor` (the confidence-0.7 "chained by position only" guess) still fires at `src/resolve/DocumentResolver.ts:448` (`Id.`) and `:992` (shortForm). `…-08-synthesis.md` §6 stage 4 calls for replacing it with an explicit abstain; what shipped instead is the *opt-in* `idConfidenceFloor` (#800), leaving the recency guess as the default. **(Narrowed by #820):** the depth-based-exclusion case now degrades to soft, but `findImmediatePredecessor` remains the default for the *no-candidate* case.

## Roadmap status (5-stage pipeline)

| Stage | Target | Reality |
|---|---|---|
| 1 PARSE (stack) | replace linear counter | ✅ #809; `balanceOk` now **consumed** (#820) |
| 2 SCOPE (hard, fullSpan-independent) | delete paren-internal cites | ✅ #798 + #821 (history triggers) + #819 (string-cite fix); neutral-cite `fullSpan` hole remains (low priority) |
| 3 SALIENCE (scorer) | candidate-list scorer | ✅ **seam shipped** (#811), `Id.`-only, deterministic |
| 4 ABSTAIN | fail closed, no silent recency | ✅ #800 floor + #818 supra tie-abstain + #820 degrade-to-soft; `findImmediatePredecessor` remains the no-candidate fallback |
| 5 PROVENANCE | quoting-chain edges | ⏸️ out of core, deferred |
| — Learned ranker | LambdaMART drop-in | ⏸️ **deferred by measurement** (#817) — correct call |

## Bottom line

#811 is a clean, mathematically-faithful seam, and the surrounding research is unusually rigorous (45 years of anaphora resolution → "scope dominates ranking" → build the frame, defer the ML, then measure to confirm the deferral). As of 2026-06-03 the do-now slate around it has shipped (#818–#821): `balanceOk` is wired (#820), `supra` fails closed on ambiguity (#818), and the trigger lexicon is broadened (#821). What remains is correctly deferred — the learned ranker (pending a labeled corpus) and provenance (out of core).

## Natural next steps

- **Wire #817's degrade-to-soft** — make `resolveId` read `balanceOk` and lower confidence / abstain on `false` (highest-value unshipped step).
- **Route `supra`/`shortFormCase` through the seam** — the #811 follow-up, which forces the feature-vector generalization question.
- **Walk a specific doc** in the series in this depth (e.g. `…-02-scope-and-binding.md`, or `…-03-bracket-parsing-error-recovery.md`).
- **Sanity-check any gap claim above** against a live repro before acting on it.

## Source map

| Artifact | Path |
|---|---|
| Scorer seam | `src/resolve/DocumentResolver.ts:478`, `:529-560` |
| Seam test | `tests/resolve/issue811_candidateScorer.test.ts` |
| Bracket stack + `balanceOk` | `src/utils/parentheticalScope.ts`, `src/utils/parenDepths.ts` |
| Synthesis | `docs/research/2026-06-02-shortform-resolution-08-synthesis.md` |
| Ranking & abstention theory | `docs/research/2026-06-02-shortform-resolution-05-ranking-abstention.md` |
| Bracket-survival measurement | `docs/research/2026-06-02-shortform-resolution-09-bracket-survival-measurement.md` |
| Measurement harness | `scripts/measure-bracket-survival.ts` |
