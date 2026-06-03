# Short-Form Resolution Research Series — Reader's Guide

**Date:** 2026-06-03
**Type:** Navigation map / synthesis (point-in-time snapshot)
**Subject:** The 9-part `docs/research/2026-06-02-shortform-resolution-*` series (#812 roadmap, landed by #813) — a one-page map so the ~1,200 lines are navigable without reading them all.
**Companion:** `docs/research/2026-06-03-shortform-resolution-811-scorer-seam-analysis.md` (deep dive on the #811 seam).
**Snapshot note:** "Status" and "answered vs. live" reflect the tree as of 2026-06-03 and will drift. Re-verify against source and the issue tracker before acting.

---

## The spine (one paragraph)

`Id.`/`supra` are anaphora. Resolving them by **recency** ("nearest preceding cite") fails on nested structure — the canonical `Hogue … (quoting Corsello …). Id.` must resolve to the outer authority (Hogue), not the parenthetical-buried inner cite (Corsello). 45+ years of anaphora/coreference research converge on one architecture: **parse structure → HARD scope filter → SOFT salience rank → ABSTAIN (fail closed) → provenance**, run in that order, because *scope must be subordinated by recency, not the reverse*. The field's strongest empirical fact — **oracle (perfect) candidate sets buy +17.5 F1; the best ranking refinement buys 1–4 F1** — dictates the sequencing: **invest in the candidate set (scope), defer the ranker.** Everything shipped in this series follows from that one fact.

## The 9 parts at a glance

| # | One-line thesis | Maps to | Status |
|---|---|---|---|
| **01** anaphora-resolution | The pipeline is the 45-year NLP architecture; recency must be gated by scope; candidate set dominates ranking (+17.5 vs 1–4 F1). | foundational (justifies deferring the ranker) | motivates all |
| **02** scope-and-binding | Model "inner cite invisible to outer `Id.`" as **lexical scoping** (symbol table), not c-command. Scope is a **HARD** filter, not a soft penalty. | stage-2 design; partially #798 | mechanism set; not fully wired |
| **03** bracket-parsing-error-recovery | A counter recovers *depth* but not *structure* (`([)]`); use a bounded-depth **stack** + **island reconstruction**; emit a per-region balance signal. | **#809 / #814** (tightest doc→PR link) | ✅ shipped |
| **04** provenance-lineage | Typed PROV DAG yes, semiring overkill; the stack contents *are* the quoting chain. Explanation layer, not the fix. | out of core | ⏸️ deferred |
| **05** ranking-abstention | 1-of-N selection = mention-ranking (Lee et al.); build a candidate-list scorer + null candidate now, LambdaMART later; abstain is a *present* primitive (Chow, conformal). | **#811 / #816** (seam) + **#800** (floor) | ✅ seam shipped; abstain opt-in |
| **06** legal-citation-tooling | eyecite = recency-with-the-bug; **eyecite-ts is the SOTA** (already has partial stages 2–4). The bug is two holes: the counter + the neutral-cite `fullSpan` gap. | diagnostic framing → #809 | ✅ counter fixed; `fullSpan` hole open |
| **07** supra-named-lookup | `supra` is a **named global lookup**, not positional; two mechanisms, one entry point; abstain on non-unique name key. | resolver `resolveSupra` (#799) | 🟡 partial; tie-abstain unshipped |
| **08** synthesis | Integrates 01–07: five-stage pipeline, hard-vs-soft ordering, supra verdict, do-now vs deferred, codebase mapping. | **#812** roadmap | umbrella |
| **09** bracket-survival-measurement | Raw OCR-survival unmeasurable in-repo, but the decision doesn't hinge on it: `balanceOk` flags 100% of dropped-bracket damage → **degrade-to-soft on balance failure**. | **#810 / #817** | ✅ measured; recommendation unwired |

## Pipeline status (5 stages)

| Stage | Target | Reality | Source doc |
|---|---|---|---|
| 1 PARSE (stack) | replace linear counter | ✅ #809 — `balanceOk` produced but **not consumed** | 03 |
| 2 SCOPE (hard, `fullSpan`-independent) | delete paren-internal cites | 🟡 #798 trigger-anchoring in; `fullSpan` strategy + neutral-cite hole remain | 02, 06 |
| 3 SALIENCE (scorer) | candidate-list scorer | ✅ #811 seam, `Id.`-only, deterministic | 05 |
| 4 ABSTAIN | fail closed, no silent recency | 🟡 #800 floor (opt-in); `findImmediatePredecessor` recency guess still default | 05, 06 |
| 5 PROVENANCE | quoting-chain edges | ⏸️ out of core | 04 |
| — Learned ranker | LambdaMART drop-in | ⏸️ deferred — **confirmed correct by #817** | 01, 05, 09 |

## Open-questions ledger

The 9 docs raise ~27 open questions between them. Tracked by current status:

> **Update (2026-06-03):** a fan-out of 11 research + code-assessment agents closed most of these. Newly-answered items are marked ⟳; one new bug surfaced (the `resolveSupra` string-cite leak).

**✅ Answered / resolved**
- *Does `supra` obey `Id.`'s scope rules?* (01·Q1) → No — named vs. positional (07).
- *How robust must the parser be to dirty PDF? / bracket recovery rate?* (01·Q4, 02·Q1, 03·Q2) → **Now measured on real legal OCR** via the CourtListener replica ([[reference-courtlistener-replica]]): raw `plain_text`, 300 docs/arm — whole-doc paren balance **68% native → 37% OCR** (OCR ~halves it; per-10k damage only +11%, consistent with Lopresti's spurious-insertion-dominated finding). Corpus blocker dissolved. See #810.
- *Where is the candidate-set/feature seam in code?* (05·Q5) → `scoreAntecedentCandidates`/`selectAntecedent` (#811).
- *Is the Hogue/Corsello bug parse-layer?* (06·Q1) → Yes — counter desync, fixed by #809.
- ⟳ *Empirical nesting depth + scope formation* (02·Q3, 03·Q1) → Shallow: per-citation depth is 0 for 768/778 cites, 1 for 10, **never ≥2**. `computeBracketScopes` is a flat clause-resetting counter (no sibling / scope-tree concept); **no depth cap exists or is needed.** Block-vs-inline changes no `Id.` outcome but does change a `supra` outcome (the string-cite leak below).
- ⟳ *Trigger-lexicon completeness* (03·Q4) → Measured: the resolver-shared detector recognizes exactly 4 tokens (`quoting`/`citing`/`quoted in`/`cited in`); misses every history subordinator (`overruled by`, `abrogated by`, …). Single plug-in point (`parentheticalScope.ts` `TRIGGER_AT_END_RE`); ReDoS-safe to extend; vocabulary already exists unshared in `extractCase.ts`. **Filed as #821.**
- ⟳ *Bare `supra` / `Id.`-after-`supra`* (07·Q2, Q5) → Verified by repro: bare `supra` abstains; `Id.` after a resolved `supra` chains to its target. (Pin with regression tests.)
- ⟳ *Grammatical-role salience for citations* (01·Q2, 02·Q4, 06·Q5) → **Resolved negative:** effect is small (~3 pts, parser-dependent; Tetreault 2001) and lives in the *production* term (the writer's choice of "Id."), which the resolver gets free (Kehler/Rohde). No evidence subject-position predicts the holding cite. **Don't add a grammatical-role term**; the only defensible parser-free move is promoting the case-name-window check into the #811 scorer (gated behind the corpus split).
- ⟳ *`supra` scope / alias / reach rules* (07·Q1, Q3, Q4) → **Codified, not judgment calls:** a source first cited inside a parenthetical *cannot* anchor a later `supra` (YLJ Style Sheet → **hard-mask**); `(hereinafter X)` is real but register-bound to scholarly writing, absent from opinions/briefs (defer); `supra` reach is **document-global, not section-bounded** (don't window recency-within-name).

**🔴 New bug found (2026-06-03)**
- *`resolveSupra` string-cite scope leak* — In `(citing A; B; C)`, the `"; "` clause-reset zeroes the bracket depth of the 2nd+ members while the outer `(` is still open, so they read depth=0 (`balanceOk=false`) and **escape the #799 aside filter** — `resolveSupra` accepts a string-cite-internal authority as a valid named antecedent. `resolveId` is shielded by its `fullSpan`-containment fallback; `resolveSupra` is not. Cheapest fix: have `resolveSupra` consume `balanceOk` (treat `false`-clause candidates as untrusted). **Filed as #819** (shares the `balanceOk`-consumption fix with #820). **Coupling found via the replica measurement** (md5-verified verbatim fixture): `balanceOk=false` fires on **32% of citations in clean native text, 42% in OCR** — the 32% native baseline proves it's dominated by *this* string-cite reset, not OCR — so **#819 must land before #820** can trust `balanceOk` as a degrade-to-soft trigger (else it fires on ~⅓ of citations with zero OCR). Sequencing posted to both issues.

**🟡 Partial / narrowed**
- *Abstain threshold / α* (01·Q3, 03·Q3, 05·Q1–Q3) → **Narrowed:** the current `Id.` scorer emits only {1.0, 0.75}, so `idConfidenceFloor` is a *binary fail-closed gate* — **no α to tune** until the #811 seam makes the score continuous. α is a cost decision (abstain readily); needs a 300–1000-case labeled set before any coverage claim. #818 is a *cardinality* bug a floor cannot fix.
- *`Id.` vs `supra` different traversal* (02·Q2) → Recognized (07); `resolveSupra` exists but routes outside the #811 seam; the abstain/hard-mask rules above are unimplemented.

**🔴 Still live (blocked)**
- *Scope-error vs. intra-scope-salience-error split* (02·Q5) — **blocked on data.** In-repo: 28 cases gave 0 scope / 2 (flagged) salience errors → scope solved, ranker unjustified; the real lever (rate of multi-sibling-in-scope ties) needs a real labeled corpus. Raw corpus is now sourceable (replica), but the true split still needs **ground-truth antecedent labels** (replica gives text, not labels); the structural proxy (multi-sibling rate) is measurable next. Gates the learned ranker *and* the salience-scorer extension.
- *Raw legal-OCR bracket-survival number* (03·Q2) — **✅ measured** (CourtListener replica, raw `plain_text`, 300/arm): **68% native → 37% OCR** whole-doc paren balance; imbalance/10k 4.67→5.19; trigger density 0.57→0.16. Corpus dissolved (`ocr_status` 1=OCR ~2.9M / 2=native ~12.7M; `search_opinion.extracted_by_ocr` for case law). **md5-verified verbatim fixture** committed (`tests/fixtures/courtlistener-ocr-sample.json` + `scripts/measure-ocr-fixture.ts`, 12/12 byte-faithful): in-pipeline `balanceOk`-fail **32% native / 42% OCR**, citation recall robust (6.3 cites/doc both arms). See #810 + [[reference-courtlistener-replica]].
- *Neutral-cite `fullSpan` hole* (06·Q2) — **downgraded:** not neutral-specific (a dropped-open-paren + non-trigger case), **0 in-repo occurrences**, closed by the same `balanceOk` wiring. (Was mislabeled "highest-value scope gap" — the real live scope leak is the `resolveSupra` string-cite case above.)
- *Bluebook single-authority abstain* (06·Q3) — recoverable from resolver inputs (boundaries/zones) but **unimplemented.**
- *`supra` ambiguity (#818)* (07·Q1, Q3, Q4) — **filed as #818, now sharpened:** a *cardinality* bug (both same-name candidates score 1.0, so no floor catches it) → fix = `Map<string, number[]>` + accept-singleton / abstain-on-≥2, **plus** hard-mask parenthetical-only antecedents (YLJ rule) and **no** section-windowing.

**⏸️ Deferred by design (provenance / out of core)**
- Proposition-graph substrate, span hashing, chain depth/termination, multi-chain confidence aggregation (04·Q1–Q4; 06·Q4).

## Reading paths

- **"Why not just use recency / why defer the ML?"** → 01 (the +17.5 F1 result), then 05.
- **"How does the scope fix actually work?"** → 02 (the symbol-table visibility rule), then 03 (how to recover the structure robustly).
- **"Trace a doc to shipped code."** → 03 → #809/#814 (`computeBracketScopes`, `balanceOk`), the tightest mapping.
- **"What's special about `supra`?"** → 07 (named vs. positional), cross-check `resolveSupra`.
- **"What's the state of play / what's left?"** → 06, then this guide's ledger.
- **"The whole argument in one file."** → 08 (synthesis).

## Source map

| Doc | Path |
|---|---|
| 01 anaphora | `docs/research/2026-06-02-shortform-resolution-01-anaphora-resolution.md` |
| 02 scope/binding | `docs/research/2026-06-02-shortform-resolution-02-scope-and-binding.md` |
| 03 bracket parsing | `docs/research/2026-06-02-shortform-resolution-03-bracket-parsing-error-recovery.md` |
| 04 provenance | `docs/research/2026-06-02-shortform-resolution-04-provenance-lineage.md` |
| 05 ranking/abstention | `docs/research/2026-06-02-shortform-resolution-05-ranking-abstention.md` |
| 06 legal tooling | `docs/research/2026-06-02-shortform-resolution-06-legal-citation-tooling.md` |
| 07 supra | `docs/research/2026-06-02-shortform-resolution-07-supra-named-lookup.md` |
| 08 synthesis | `docs/research/2026-06-02-shortform-resolution-08-synthesis.md` |
| 09 bracket-survival | `docs/research/2026-06-02-shortform-resolution-09-bracket-survival-measurement.md` |
| #811 seam analysis | `docs/research/2026-06-03-shortform-resolution-811-scorer-seam-analysis.md` |
| Measurement harness | `scripts/measure-bracket-survival.ts` |
| Raw OCR fixture (md5-verified) + measure | `tests/fixtures/courtlistener-ocr-sample.json` · `scripts/measure-ocr-fixture.ts` |
