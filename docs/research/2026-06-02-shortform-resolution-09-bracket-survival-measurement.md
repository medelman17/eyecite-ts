# Bracket-Survival Measurement & the Hard-vs-Soft Scope Decision (#810)

**Status:** measured (within available data) — recommendation below.
**Harness:** `scripts/measure-bracket-survival.ts` (reproducible; takes a corpus path).

## The question (#810)

The scope-before-recency design (#812) can treat parenthetical scope as a **hard**
candidate filter (delete `(quoting …)`-internal cites from the candidate set) only
if the bracket structure of those parentheticals **survives** extraction. If
PDF→markdown frequently drops/garbles `(` / `)`, a hard filter would abstain or
mis-scope on *parse failure* rather than *true ambiguity*. So: measure bracket
survival before committing the hard filter.

## What we could and couldn't measure

- **Raw OCR-survival rate — not measurable here.** The in-repo corpora are curated
  **native text** (`thorny-corpus`, `real-world-citations`, `expanded-corpus`):
  **9** `(quoting|citing …)` parentheticals total, **0** OCR/PDF-derived. Far too
  few/clean to estimate native-vs-OCR survival. A real OCR'd-PDF corpus is still
  required for the raw number (this remains the genuine data gap).
- **Substrate robustness to dropped brackets — measurable, and measured.** On
  canonical `Outer (quoting Inner). Id.` nestings, simulate the OCR failure mode
  (drop the opening `(`) and measure whether the *shipped* substrate still gets
  scope right or at least flags it:

  | Input | `Id.` → outer authority | clause flagged `balanceOk=false` |
  |---|---|---|
  | balanced | **100%** | n/a |
  | opening `(` dropped | **80%** (recovered by #798 trigger-anchoring) | **100%** (#809) |

## Key finding

The decision does **not** actually hinge on the unmeasured raw OCR-survival rate,
because **#809's `balanceOk` detects 100% of dropped-bracket damage**. Of the
dropped-`(` cases, 80% are *silently recovered* (trigger-anchoring still resolves
`Id.` to the citing authority); the remaining ~20% — exactly the cases recovery
misses — are *always flagged* `balanceOk=false`. There is no silent-mis-scope tail.

## Recommendation

1. **Degrade-to-soft on balance failure** (not an unconditional hard filter).
   - Where `balanceOk = true` (structure trustworthy), the parenthetical-child
     exclusion may be treated as **hard** (the shipped behavior) — safe.
   - Where `balanceOk = false`, **do not hard-drop**: lower confidence / emit a
     warning (and, with #800's `idConfidenceFloor`, optionally abstain). The
     20%-recovery gap is fully contained in this flagged set, so soft-degrade
     never silently commits a mis-scoped antecedent.
   This makes scope robust **regardless of** the raw OCR-survival rate — the
   precise number only tunes *how often* the soft path is taken, not correctness.

2. **#811 (learned ranker): stay deferred.** Recovery is already 100% on balanced
   input and the failure mode is detected, so candidate-set quality (scope), not
   ranking, dominates — consistent with the literature (`…-05-ranking-abstention.md`).
   The deterministic scorer seam shipped (#811) is sufficient; a learned ranker
   needs a labeled corpus that does not exist.

3. **Still worth a real OCR corpus** to quantify the soft-path hit-rate and confirm
   trigger-anchoring's 80% recovery holds at scale — but it is **no longer a
   blocker** for committing the scope policy.

## Reproduce

```
pnpm exec tsx scripts/measure-bracket-survival.ts            # built-in nestings + repo corpus scan
pnpm exec tsx scripts/measure-bracket-survival.ts <glob>     # point at a real corpus when available
```

Backbone: `…-02-scope-and-binding.md`, `…-03-bracket-parsing-error-recovery.md`. Roadmap: #812.
