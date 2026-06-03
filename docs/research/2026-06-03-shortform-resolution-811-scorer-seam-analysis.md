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

These are not defects — PR #816 did exactly what it advertised — but they are the real state of play for anyone picking this up:

1. **The seam is 1/3 wired.** Only `resolveId` routes through `selectAntecedent` (it is the sole call site). `resolveSupra` still ranks by BK-tree Levenshtein similarity (`src/resolve/DocumentResolver.ts:868`), and `resolveShortFormCase` still does its own party-overlap + recency loop (`src/resolve/DocumentResolver.ts:1009`). The PR acknowledges this ("supra/short-form route through the seam in a follow-up"), but note *why* it is non-trivial: those paths weight **different features** (similarity, party overlap) than family+recency, so unifying them means generalizing the feature vector, not just moving code.

2. **The literature's "dummy/null candidate" abstain mechanism isn't actually realized.** Docs #05/#08 lean hard on Lee et al.'s null candidate (scored 0) as the *native* abstain signal. In code, `selectAntecedent` returns `undefined` only on an **empty list** — but the sole caller already pre-guards emptiness at `src/resolve/DocumentResolver.ts:442` (returns before reaching line 478). So `selectAntecedent`'s `undefined` return and the `?? candidates[0]` fallback are **both dead from the only caller today**. Abstention is done entirely downstream by `idConfidenceFloor` (#800) at `src/resolve/DocumentResolver.ts:489`, not by a scored null candidate inside the scorer. The seam is forward-compatible with that mechanism; it just doesn't implement it yet.

3. **`balanceOk` is produced but consumed nowhere.** #809's stack emits the per-clause structure-trust signal (`src/utils/parentheticalScope.ts:183`), but `src/utils/parenDepths.ts:20` maps it straight to `.depth` and **drops `balanceOk` on the floor** — there are zero consumers in `src/`. So #817's headline recommendation — *degrade scope to soft when `balanceOk = false`* — is a recommendation **awaiting implementation**, not shipped behavior. The signal is dangling, ready for a consumer.

4. **The "silent recency fallback" the synthesis wanted *removed* is still there.** `findImmediatePredecessor` (the confidence-0.7 "chained by position only" guess) still fires at `src/resolve/DocumentResolver.ts:448` (`Id.`) and `:992` (shortForm). `…-08-synthesis.md` §6 stage 4 calls for replacing it with an explicit abstain; what shipped instead is the *opt-in* `idConfidenceFloor` (#800), leaving the recency guess as the default.

## Roadmap status (5-stage pipeline)

| Stage | Target | Reality |
|---|---|---|
| 1 PARSE (stack) | replace linear counter | ✅ **shipped** (#809) — but `balanceOk` not yet consumed |
| 2 SCOPE (hard, fullSpan-independent) | delete paren-internal cites | 🟡 **partial** — #798 trigger-anchoring in; `isParentheticalChild` still uses the `fullSpan` strategy (`:605`) |
| 3 SALIENCE (scorer) | candidate-list scorer | ✅ **seam shipped** (#811), `Id.`-only, deterministic |
| 4 ABSTAIN | fail closed, no silent recency | 🟡 **opt-in only** (#800 floor); default still guesses via `findImmediatePredecessor` |
| 5 PROVENANCE | quoting-chain edges | ⏸️ out of core, deferred |
| — Learned ranker | LambdaMART drop-in | ⏸️ **deferred by measurement** (#817) — correct call |

## Bottom line

#811 is a clean, mathematically-faithful seam, and the surrounding research is unusually rigorous (45 years of anaphora resolution → "scope dominates ranking" → build the frame, defer the ML, then measure to confirm the deferral). The genuinely *open* threads aren't in #811 itself — they are the dangling `balanceOk` consumer (#817's degrade-to-soft) and the still-default silent recency fallback (#800/#812 stage 4).

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
