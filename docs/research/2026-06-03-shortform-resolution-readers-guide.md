# Short-Form Resolution Research Series — Reader's Guide

**Date:** 2026-06-03
**Type:** Navigation map / synthesis (point-in-time snapshot)
**Subject:** The 9-part `docs/research/2026-06-02-shortform-resolution-*` series (#812 roadmap, landed by #813) — a one-page map so the ~1,200 lines are navigable without reading them all.
**Companion:** `docs/research/2026-06-03-shortform-resolution-811-scorer-seam-analysis.md` (deep dive on the #811 seam).
**Snapshot note:** Reflects the tree as of 2026-06-03, **after the implementation PRs merged** — #809 (stack), #811 (scorer seam), #818–#821 (this slate), plus docs/measurement #813/#817/#822. Status will still drift; re-verify against source and the tracker before acting.

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
| **05** ranking-abstention | 1-of-N selection = mention-ranking (Lee et al.); build a candidate-list scorer + null candidate now, LambdaMART later; abstain is a *present* primitive (Chow, conformal). | **#811** (seam) + **#800** / **#818** / **#820** (abstain) | ✅ seam + abstain shipped |
| **06** legal-citation-tooling | eyecite = recency-with-the-bug; **eyecite-ts is the SOTA** (already has partial stages 2–4). The bug is two holes: the counter + the neutral-cite `fullSpan` gap. | diagnostic framing → #809 | ✅ counter fixed; `fullSpan` hole open |
| **07** supra-named-lookup | `supra` is a **named global lookup**, not positional; two mechanisms, one entry point; abstain on non-unique name key. | resolver `resolveSupra` (#799, #818) | ✅ tie-abstain shipped (#818) |
| **08** synthesis | Integrates 01–07: five-stage pipeline, hard-vs-soft ordering, supra verdict, do-now vs deferred, codebase mapping. | **#812** roadmap | umbrella |
| **09** bracket-survival-measurement | Raw OCR-survival unmeasurable in-repo, but the decision doesn't hinge on it: `balanceOk` flags 100% of dropped-bracket damage → **degrade-to-soft on balance failure**. | **#810 / #817** | ✅ measured; degrade-to-soft wired (#820) |

## Pipeline status (5 stages)

| Stage | Target | Reality | Source doc |
|---|---|---|---|
| 1 PARSE (stack) | replace linear counter | ✅ #809; `balanceOk` now **consumed** by the resolver (#820) | 03 |
| 2 SCOPE (hard, `fullSpan`-independent) | delete paren-internal cites | ✅ #798 + #821 (history triggers) + #819 (string-cite fix); neutral-cite `fullSpan` hole remains (low priority, 0 in-repo) | 02, 06 |
| 3 SALIENCE (scorer) | candidate-list scorer | ✅ #811 seam, `Id.`-only, deterministic; learned ranker deferred | 05 |
| 4 ABSTAIN | fail closed, no silent recency | ✅ #800 floor + #818 supra tie-abstain + #820 degrade-to-soft; `findImmediatePredecessor` remains the no-candidate fallback | 05, 06 |
| 5 PROVENANCE | quoting-chain edges | ⏸️ out of core | 04 |
| — Learned ranker | LambdaMART drop-in | ⏸️ deferred — **confirmed correct by #817** | 01, 05, 09 |

## Open-questions ledger

The 9 docs raise ~27 open questions between them. Tracked by current status:

> **Update (2026-06-03):** an 11-agent fan-out closed most of these; the code-actionable items then **shipped via TDD**. Merged: **#819** (string-cite leak), **#820** (degrade-to-soft on `balanceOk`), **#818** (supra cardinality), **#821** (history-subordinator triggers) — plus **#809** (stack) and **#811** (scorer seam) earlier.

**✅ Shipped (merged to main)**
- *`resolveSupra` string-cite scope leak* → **#819.** The `"; "` clause-reset zeroed the depth of 2nd+ `(citing A; B; C)` members, leaking them past the #799 aside filter; a `;` inside an open paren is now a string-cite separator, not a clause boundary. Also de-polluted `balanceOk` (it had fired on ~32% of citations in *clean* text) — the precondition for #820.
- *Degrade-to-soft on `balanceOk`* → **#820.** `resolveId` now consumes the #809 signal: a depth-only paren-child exclusion in a balance-failed clause is kept-but-soft (capped confidence + warning; `idConfidenceFloor` abstains). `fullSpan`/trigger exclusions stay hard.
- *`supra` cardinality / non-unique name key* (07·Q1) → **#818.** `fullCitationHistory` is now `Map<string, number[]>`; a non-unique key picks recency-within-name with capped confidence + warning, abstains on a true tie (same name + year), `idConfidenceFloor` fails it closed. Parallel-cite siblings collapse to one authority (by `groupId` / reporter).
- *Trigger-lexicon completeness* (03·Q4) → **#821.** The resolver-shared lexicon now covers history subordinators (`overruled by`, `abrogated by`, `superseded by`, `cited with approval in`, `as recognized in`). Soft signal, dropped-paren only, ReDoS-safe.
- *Bare `supra` / `Id.`-after-`supra`* (07·Q2, Q5) → verified and pinned with regression tests (#818).
- *Is the Hogue/Corsello bug parse-layer?* (06·Q1) → Yes — counter desync, fixed by #809.
- *Where is the candidate-set/feature seam?* (05·Q5) → `scoreAntecedentCandidates`/`selectAntecedent` (#811).
- *Raw legal-OCR bracket-survival* (01·Q4, 02·Q1, 03·Q2) → **measured** on the CourtListener replica ([[reference-courtlistener-replica]]): whole-doc paren balance **68% native → 37% OCR**; in-pipeline `balanceOk`-fail **32% / 42%**; md5-verified fixture + harness committed (#822). See #810.

**✅ Answered (no code needed)**
- *Does `supra` obey `Id.`'s scope rules?* (01·Q1) → No — named vs. positional (07).
- *Empirical nesting depth + scope formation* (02·Q3, 03·Q1) → Shallow (per-citation depth 0 for 768/778, 1 for 10, never ≥2); **no depth cap needed.**
- *Grammatical-role salience for citations* (01·Q2, 02·Q4, 06·Q5) → **Resolved negative** (small ~3-pt parser-dependent effect; lives in the *production* term — the writer's choice of "Id."). Don't add a grammatical-role term; the parser-free move is promoting the case-name-window check into the #811 scorer, gated behind the corpus split below.
- *`supra` scope / alias / reach rules* (07·Q1, Q3, Q4) → **Codified:** parenthetical-only antecedents can't anchor a `supra` (YLJ → hard-mask); `(hereinafter X)` is register-bound (defer); `supra` reach is document-global (don't window recency-within-name).

**🟡 Partial**
- *Abstain threshold / α* (01·Q3, 03·Q3, 05·Q1–Q3) → `idConfidenceFloor` is a binary gate on the `Id.` path (the scorer emits {1.0, 0.75}); a tunable α needs the #811 seam to yield a continuous score **and** a labeled calibration set.
- *`supra` hard-mask of parenthetical-only antecedents* (07·Q1) → cardinality / tie-abstain shipped (#818); the YLJ hard-mask of paren-only antecedents in the BK-tree path is **not yet implemented** (follow-up).

**🔴 Still live (blocked)**
- *Scope-error vs. intra-scope-salience-error split* (02·Q5) — **blocked on a labeled corpus** (the replica gives raw text, not antecedent labels). Gates the learned ranker + the salience-scorer extension; structural proxy (multi-sibling-in-scope rate) measurable next.
- *Raw legal-OCR survival at scale* (03·Q2) — proxy + matched-arm path identified (#810); a real labeled OCR corpus is still worth getting but **not a blocker** (the degrade-to-soft policy is already justified).
- *Neutral-cite `fullSpan` hole* (06·Q2) — low priority (0 in-repo; dropped-paren cases now covered by the #820 `balanceOk` wiring); a `fullSpan`-independent containment for neutral inner cites remains unbuilt.
- *Bluebook single-authority `Id.` abstain* (06·Q3) — recoverable from resolver inputs but **unimplemented**.

**⏸️ Deferred by design**
- Learned ranker (deferral confirmed correct by #817); provenance graph + span hashing + `(hereinafter)` aliases (04·Q1–Q4; 06·Q4; 07·Q3) — out of core / register-bound.

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
