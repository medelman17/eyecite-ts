# Robust `Id.`/`supra` Resolution — Executive Synthesis

**Date:** 2026-06-02
**Role:** Synthesis lead, integrating 7 research reports (01–07) on the foundations for redesigning the `Id.`/`supra` short-form citation resolver.
**Scope note:** This is design-research synthesis, not an implementation plan. It states the architecture the literature supports, what kills the canonical recency-over-nesting failure now vs. later, and the issue shape to spin the work into. The running example throughout is `"Hogue … (quoting Corsello …)." … Id.`, where `Id.` must resolve to the outer authority (Hogue), not the parenthetical-buried inner cite (Corsello).

---

## 0. The one-paragraph answer

The proposed five-stage pipeline — **parse (recover structure) → scope (HARD candidate filter) → salience (SOFT rank) → abstain (fail closed) → provenance (record chain)** — is correct, and it is correct for a reason far stronger than "it seems sensible": it is the *identical* architecture computational linguistics has used to resolve anaphora for 45+ years, and it has used that architecture *specifically because pure recency fails on nested structure* — the exact failure mode of the Hogue/Corsello bug (reports 01, 02, 06). Three load-bearing refinements come out of the synthesis. (1) **Scope is a hard accessibility filter that runs strictly before salience**, and when scope and salience conflict, **scope always wins** — a soft scope penalty re-introduces the bug probabilistically (reports 01, 02, 05). (2) **`supra` is a categorically different mechanism from `Id.`** — a named cross-scope lookup, not a positional adjacency — so the resolver needs **two strategies behind one entry point**, not one recency heuristic parameterized by a name (report 07). (3) **The bug class is killed *now* by parse + scope + abstain**; salience and the provenance graph are conditional follow-ons, because the field's strongest empirical result is that getting the *candidate set* right dominates getting the *ranking* right (Lee et al. oracle mentions = +17.5 F1 vs. 1–4 F1 for any ranking refinement; report 01).

---

## 1. PIPELINE VALIDATION

**Verdict: the staged pipeline holds, with two ordering clarifications and one decomposition of stage 1.** No source contradicts the five-stage shape; every source converges on it. Below, each stage is validated against the literature and re-stated in the form the redesign should adopt.

### Stage 1 — PARSE: recover *structure*, not just *depth* (decompose into parse + island-reconstruction)

The current production primitive is a **linear paren counter** (`parenDepths.ts::computeParenDepths`, verified: `if (ch === "(") depth++; else if (ch === ")" && depth > 0) depth--`). The bracket-parsing literature is unanimous that this is the wrong tool: a counter recovers nesting *depth* but **provably cannot recover nesting *structure*** (report 03). The textbook counterexample `([)]` (counts balance, structure is wrong) is the Hogue/Corsello bug in miniature, and the `depth > 0` clamp means a single stray OCR `)` silently desyncs *every subsequent depth reading* — the single most dangerous property of the current code for dirty PDF→markdown input. Recovering "which opener a closer matches" requires a **stack / pushdown automaton** (Chomsky–Schützenberger: all context-free structure factors into Dyck brackets ∩ a regular language — stack for nesting, regular rules for triggers; report 03).

But the literature also warns against over-correcting into *global* document balancing: exact Dyck-edit-distance repair is cubic, and general edit distance has no strongly-subquadratic algorithm under SETH (report 03). The recommended architecture is therefore **island reconstruction**, not global balancing: treat already-extracted citation spans as high-precision **islands** and the messy gaps as tolerable **water** (Moonen island grammars; Lavie & Tomita GLR\*), and recover only the shallow outer-vs-parenthetical nesting our domain needs from a **bounded-depth local stack** plus **trigger tokens** (`quoting` / `citing` / `quoted in`). Legal parentheticals are empirically shallow (1–3 deep), so a depth-capped stack suffices — but it must be a *stack with a cap*, never a single counter, because we need opener-closer identity, not just depth.

> **Stage 1, as redesigned:** replace the linear counter with a bounded-depth bracket **stack** that (a) handles `()`/`[]`/`{}`/quote nesting, (b) emits a **balance-failure signal per region** (feeds stage 4), and (c) annotates each citation island with its enclosing-opener identity. Trigger tokens are a soft subordination/provenance label layered over the hard bracket structure.

### Stage 2 — SCOPE: a HARD candidate filter (lexical-scope visibility), NOT a soft penalty

This is the make-or-break stage and the literature's clearest mandate. The accurate, implementable mechanism is **lexical scoping / symbol-table name resolution**, not GB c-command (report 02 — see §5 for why c-command is rejected). A block-structured symbol table gives the rule for free: a citation declared in a nested scope (a `(quoting …)` parenthetical) is reachable only from inside that scope and its children, because "each scope stores a pointer to its parent, but not vice-versa." An outer `Id.` *Lookup* walks parent pointers outward only; it can **never** descend into a sibling/child scope. So Corsello, declared inside `(quoting Corsello…)` and discarded when the parenthetical's close-paren pops the scope, is **invisible to the trailing `Id.` by construction** — Hogue wins deterministically, with no salience heuristic even needed (reports 01, 02, 03).

Every classical resolver does exactly this hard-filter-first move: RAP's morphological + syntactic-binding filters eliminate candidates *before* salience ranking; Centering's Cf is the "realized in this utterance" accessibility set; Lee et al.'s learned mention score `s_m` prunes spans before linking (report 01). The legal domain even encodes the rule in primary authority: the Bluebook states **"sources cited in explanatory parentheticals … are not counted as intervening authorities"** for `Id.` (reports 06, 07) — the rulebook itself treats parentheticals as a non-counting scope.

> **Stage 2, as redesigned:** for an `Id.`/`supra` at scope node N, candidate visibility = N's scope plus enclosing scopes only. Parenthetical-internal cites are **removed from the candidate set before ranking**. This is a hard filter; see §2 for why softness re-introduces the bug.

### Stage 3 — SALIENCE: a SOFT rank of the survivors (defer the learned ranker)

Once scope removes Corsello, ranking is often trivial (Hogue is the lone sibling-scope candidate). Salience matters only when **two or more sibling-scope candidates** survive. The literature's salience model is **grammatical/discourse prominence, decoupled from textual distance**: Centering ranks forward-looking centers subject > object > other; RAP sums weighted factors where recency (weight 100) is *summed with and routinely outvoted by* structural factors and **decays by a factor of two per sentence**; J&M show grammatical role overriding recency in minimal pairs (reports 01, 02). The citation analogue is to prefer the *foregrounded/holding* cite (the one the sentence's claim attaches to) over an incidental mention — and to demote recency to **one weak, decaying feature within a scope, never the selector**.

Critically: **recency is not the enemy — unconstrained recency is.** RAP's top weight *is* recency. The fix is to (a) gate it behind the scope filter and (b) let structural factors outvote it (report 01). The 1-of-N choice is formally **mention-ranking** (Lee et al.): score each surviving candidate against the anaphor, include an explicit **dummy/null candidate scored 0** (the native abstain escape hatch), argmax wins (reports 01, 05). Build stage 3 as a *candidate-list scorer* even in the deterministic phase, so a future LambdaMART learned ranker drops onto the same candidate-set + feature-vector seam with zero pipeline change (report 05).

> **Stage 3, as redesigned:** a deterministic weighted scorer over the scope-filtered candidate list, with a dummy/null candidate. Feature set is lean and structural (scope-depth delta, recency rank, reporter/jurisdiction match, party-name overlap, same-sentence/footnote/block, pincite consistency); the learned ranker is deferred (§4). eyecite-ts already has two soft salience signals (pincite-family preference + the case-name window check) — extend, don't reinvent (report 06).

### Stage 4 — ABSTAIN: fail closed; never silently fall back to recency

The literature validates abstain as **state-of-the-art practice, not a stopgap**, and as a *present* design principle for the deterministic resolver — not a future-ML feature (report 05). Lee et al. abstain by construction (zero-scored dummy antecedent); RAP abstains at a salience threshold; every robust parser exposes a localized failure node (tree-sitter `ERROR`/`MISSING`, GLR\* maximal-parseable-subset, CPCT+ minimal-repair-set; report 03); a compiler raises "undeclared name" rather than guess (report 02). The risk asymmetry settles it: Chow's optimal reject rule says abstain readily when cost(wrong) ≫ cost(defer), which is exactly legal attribution — a confident-wrong `Id.` target propagates a wrong quote into a wrong verdict and is hard for a reviewer to catch, whereas a flag-for-review is cheap and self-announcing (report 05). CPCT+'s empirical result seals it: a *wrong repair manufactures cascading downstream errors*, so guessing is strictly worse than abstaining (report 03).

Conformal prediction supplies the calibrated backbone: wrap the scorer, build a small hand-labeled `Id./supra → antecedent` calibration set, and accept only **singleton** prediction sets — flag **empty** sets (no match / unrecoverable structure) and **≥2-label** sets (genuine ambiguity), with a distribution-free finite-sample error guarantee under exchangeability (reports 05). Two caveats to carry: coverage is **marginal, not per-citation** (do not over-promise to lawyers), and exchangeability breaks under corpus/PDF-pipeline drift (re-calibrate periodically).

> **Stage 4, as redesigned — concrete abstain triggers:** (a) stack balance failed in the relevant region; (b) after scoping, **0** in-scope candidates remain; (c) salience margin between top-1 and top-2 is below threshold; (d) the dummy/null candidate ranks at/near top; (e) `supra` name key resolves to **0 or >1** candidates after filtering. The Bluebook supplies a bright-line trigger too: `Id.` is only valid when the preceding unit cites **exactly one** authority. eyecite-ts's current no-candidate fallback (`findImmediatePredecessor`, confidence 0.7, "chained by position only") is a low-confidence **recency guess** and must become an explicit abstain (report 06).

### Stage 5 — PROVENANCE: record the quoting chain (explanation layer, NOT the fix)

A typed DAG is the right model; the provenance-semiring algebra is overkill (report 04). W3C PROV-DM/PROV-O ship a native, exact-fit vocabulary — `wasQuotedFrom`, `hadPrimarySource`, `wasDerivedFrom` — that maps directly onto "language quoted in Hogue, originally from Weinreb." The semiring framework earns its `+`/`×` complexity only when propagating a value through a relational query with alternative-derivation fan-in and joint-derivation, which a **linear quoting chain has neither of** — a provenance polynomial degenerates to "did every hop hold?", which walking typed edges answers directly. Per-hop verification is two complementary mechanisms: **attribute the edge** (`verified|flagged` + method + confidence) and **content-address the node** (hash the normalized quoted span; a mismatch auto-flags the hop and feeds the abstain gate — reuse a single stable content-hash over the normalized span text, not a second scheme).

Provenance is nearly free because **the stack contents at a citation's position *are* the enclosing quoting chain** (report 03). But the load-bearing caveat: **recording the chain does NOT fix the bug** — it presupposes the scope decision and is the audit/explanation layer on top. The fix is stage 2 (reports 01, 04). This bounds the provenance slice to representation + verification + explainability.

> **Stage 5, as redesigned:** reified per-hop edges on a downstream citation/proposition graph (if the consuming application maintains one), not a parallel store — see §5 for the schema shape. This is out of scope for eyecite-ts core; the library's role is to expose the quoting-chain structure.

**Net:** no revision to the five-stage shape. The two refinements are (1) decompose stage 1 into *stack-parse + island reconstruction* and (2) make explicit that stage 2 is hard and stage 4 governs the deterministic resolver today.

---

## 2. HARD-VS-SOFT ORDERING

**Claim: scope is a HARD accessibility filter applied strictly BEFORE salience ranking; when scope and salience conflict, SCOPE WINS.**

### The 45-year precedent (report 01)
The NLP anaphora field unanimously separates **accessibility (hard filter)** from **salience (soft rank)**, and runs them in that order:
- **RAP (Lappin & Leass 1994)** applies morphological + syntactic-binding filters that *eliminate* candidates, then ranks survivors by a weighted salience sum, with proximity demoted to a non-directional tie-break used only when salience weights tie exactly. Hard filter first, soft rank second, recency last.
- **Centering (Grosz/Joshi/Weinstein 1995)** defines Cf as the *realized/accessible* set, then ranks it by grammatical role — availability is computed before preference.
- **Hobbs (1978)** uses agreement as a hard gate and structure to control iteration order; recency is the *order over a structurally-gated set*, never the selector.
- **Lee et al. (2017)** keeps both stages even after dropping the parser: a learned mention score prunes candidates, then pairwise linking ranks them, with an explicit abstain.

### The formal mechanism (report 02)
Lexical scoping makes the ordering *non-negotiable*, not merely conventional: visibility is a property of the symbol table's structure (outward-only parent pointers). An out-of-scope candidate is not "down-weighted" — it is **absent from the candidate set**. Salience cannot rank a candidate it never receives. This is the citation twin of a binding/scope violation: Corsello inside `(quoting…)` is as inaccessible to an outer `Id.` as a non-reflexive pronoun is barred from binding its local subject.

### Why softness fails — the decisive design commitment (reports 02, 05)
A **soft scope penalty** ("down-weight cites inside parentheticals") can still let a strongly-recent inner cite win, which **re-introduces the Hogue/Corsello bug probabilistically**. Report 02 names this "the single most important design commitment": scope must be a hard candidate filter, salience operates only on survivors. Report 05 reframes it in risk terms: a soft penalty that occasionally loses to recency is the maximally-confident-wrong behavior the reject-option literature says to avoid.

### Resolving the conflict — what wins when scope and salience disagree
**Scope wins, always — because by construction they cannot reach the same arbiter.** A correctly out-of-scope candidate never enters the ranker, so there is no genuine "tie" to resolve; salience only ever ranks *within* the scope-licensed set. The only place the two appear to conflict is when **the scope parse is low-confidence** (dirty brackets). The resolution there is *not* to soften scope into a penalty — it is to **abstain** (report 03's CPCT+ lesson: a wrong structural guess cascades). Concretely:
- **Clean bracket balance in the region →** scope is hard; out-of-scope candidates are deleted; salience ranks the rest.
- **Balance failed in the region →** do **not** silently demote scope to soft and let recency back in. Treat structure as unrecoverable and **abstain** (flag for review). (Report 06 phrases the couple precisely: "only treat scope as hard when bracket balance is clean; when balance failed, demote scope to a soft signal **+ abstain**" — i.e. softness is paired with a flag, never with a silent recency fallback.)

This deliberately couples stages 1, 2, and 4. The ordering is: **structure → (hard) scope filter → (soft) salience rank → abstain on any of {no structure, empty set, low margin, ambiguous name}.**

---

## 3. SUPRA VERDICT

**`supra` is a NAMED cross-scope lookup; `Id.` is positional adjacency. Use TWO mechanisms behind one entry point — not one recency heuristic parameterized by a name.** (Report 07, corroborated by reports 01, 02, 06.)

### The categorical distinction is over-determined by the evidence
Every source examined draws the same line:
- **Legal rule (Bluebook):** `Id.` = immediately-preceding authority, blocked by intervening citations (positional). `supra` = reach back **by author/party name + location** ("O'Neill, *supra* note 15, at 52"), arbitrarily far, across many intervening cites (named).
- **Givenness Hierarchy (Gundel/Hedberg/Zacharski 1993):** an unstressed pronoun requires the referent be **in focus**; a name/definite form requires only **uniquely identifiable**. `Id.` (the pronoun) demands its target be the current focus; `supra` + name only demands re-findability by key. A writer who chose "Smith, *supra*" over "Id." is *signaling the target is not the nearest preceding cite* — a recency resolver inverts the writer's own cue.
- **Repeated-name penalty (Gordon/Grosz/Gilliom 1993):** names and pronouns are processed by *different mechanisms* — behavioral proof, not analogy.
- **Computational coreference (J&M ch. 26):** pronouns → recency/salience (Hobbs, right-to-left); named entities → exact/head/alias **string match across arbitrary distance**. `Id.` vs. `supra` almost verbatim.
- **The reference implementation (eyecite `resolve.py`):** already ships exactly this — `_resolve_id_citation` returns positional `last_resolution`; `_resolve_supra_citation` does a **global name-keyed search** (`_filter_by_matching_antecedent` over all resolved full cites, matching against plaintiff/defendant) and **abstains on non-unique match** (`return matches[0] if len(matches) == 1 else None`). Name-key *extraction* is a separate concern (a dedicated antecedent regex) from name-key *resolution*.

### Architectural implication
1. **Two strategies, one entry point.** A single function that *branches* on "do I have a name key?" is fine for code locality, but the two branches must run **genuinely different logic** (mirror eyecite's two functions). Collapsing them into one recency heuristic risks re-contaminating the `supra` path with the exact bug class being eliminated (report 07).
2. **Scope is PRIMARY for `Id.`, SECONDARY for `supra`.** The `supra` name key does most scope-masking *for free*: "Hogue, *supra*" cannot resolve to Corsello because the key `Hogue` does not match Corsello's parties — the wrong-scope candidate is excluded **by identity**, not by position. So the lexical-scope filter that fixes the `Id.` bug is largely redundant for `supra`; it survives only as a secondary tiebreak for the rare "same name introduced inside a parenthetical vs. at sibling scope" case (a defensible extension of the Bluebook's parenthetical rule, *not* a codified rule — flag as a design choice).
3. **Ambiguous names → filter-then-rank, abstain on true ties.** When a name key matches >1 authority ("two Smiths"), the name key is a hard filter; only the residual needs a soft tiebreak. Recommended: **recency-within-the-name-filtered-set, gated by a confidence check that abstains on true ties** (same name + same year, or no salience signal). Never fall back to whole-document recency. This preserves recall on the common case while inheriting eyecite's fail-closed safety.

### Payoff on the canonical bug's cousin
"Hogue, *supra*, at 7" resolves to Hogue *for free* via the name key even though Corsello is textually closer; a bare "Id." after the same block needs the **scope filter** to avoid Corsello. **The two mechanisms cover the two failure modes** — which is precisely why one heuristic cannot.

---

## 4. DO-NOW VS. DEFERRED

The sequencing is dictated by the field's strongest empirical result: **the candidate set dominates the ranking.** Lee et al.'s oracle (perfect) mentions buy **+17.5 F1**; the best ranking-side refinement buys **1–4 F1**; the mention/candidate stage is the documented bottleneck (Poesio et al.). A perfect salience ranker over a bad candidate set still picks Corsello (report 01). So invest in scope/candidate-filtering and abstain *first*; defer the ranker and the provenance graph.

### DO NOW — kills the bug class (parse + scope + abstain)

| Stage | Why it's do-now | Evidence |
|---|---|---|
| **1. Stack parse + island reconstruction** | The linear counter cannot recover structure and silently desyncs on dirty input; this is the substrate the scope filter needs. | Reports 03, 06 (`([)]` counterexample; cascading-desync; verified `parenDepths.ts`). |
| **2. Hard scope filter (lexical-scope visibility)** | Deterministically deletes the inner cite from the outer `Id.`'s candidate set — fixes Hogue/Corsello *by construction*, no heuristic. Highest-leverage stage. | Reports 01, 02, 03; Bluebook parenthetical rule (06, 07). |
| **4. Abstain (fail closed)** | A present design principle, not future-ML; converts the silent-wrong failure into a reviewable event; prevents cascading false attributions. | Reports 02, 03, 05 (Chow asymmetry; CPCT+ cascade; compiler undeclared-name). |
| **Two-mechanism `Id.` vs `supra`** | The named `supra` path is deterministic and already proven in eyecite; shipping it removes a whole second class of silent misattribution. | Report 07 (eyecite `resolve.py`). |

These four are **deterministic, auditable, and need no labeled training data**. Together they close the canonical bug and its `supra` cousin.

### DEFERRED — conditional, on stated evidence

| Item | Defer because | Becomes do-now when |
|---|---|---|
| **3. Learned ranker (LambdaMART / neural)** | Ranking buys 1–4 F1 vs. scope's dominance; needs a labeled `Id./supra → antecedent` corpus that does not yet exist (LegalCiteBench etc. do not provide one). | A measured rate of *intra-scope* salience errors (two sibling candidates) justifies it; build stage 3 as a candidate-list scorer **now** so the ML drop-in is seam-compatible. (Reports 01, 05, 06.) |
| **5. Provenance graph (quoting chain)** | Does **not** fix the bug; it is the explanation/audit layer that presupposes the scope decision, and persistence is a consumer concern, not eyecite-ts core. | A downstream consumer maintains a citation/proposition graph and needs to "show/explain the quoting chain." eyecite-ts can expose the chain structure; model the edges to fit the consumer's graph (§5). (Report 04.) |
| **Conformal calibration of the abstain gate** | The deterministic abstain *triggers* (empty set, balance failure, ambiguous name) ship now; the *calibrated threshold* needs a labeled calibration set and a product decision on target error α. | A few hundred labeled cases exist and product sets α; until then, use the conservative deterministic triggers. (Report 05.) |

**Sequencing in one line:** ship **stack-parse + hard scope filter + two-mechanism resolver + deterministic abstain** first (kills the bug); build stage 3 as a candidate-list scorer so it is *ML-ready* but rule-driven; defer the learned ranker, conformal calibration, and the provenance graph until evidence/dependencies justify them.

---

## 5. MAPPING TO OUR CODEBASE

*(Given facts treated as established; not re-researched. Codebase spot-checks below confirm the integration seams exist.)*

### 5.1 Where the canonical bug lives, and where each stage lands

The Hogue/Corsello failure has its roots in `eyecite-ts`'s `DocumentResolver`, and the staged pipeline maps onto the weak spots:

1. **`isParentheticalChild` can miss an inner cite when the container lacks a `fullSpan`.** Confirmed in source: `DocumentResolver.ts::isParentheticalChild` uses two OR'd strategies — paren-depth > 0, **or** clean-span containment in a prior cite's `fullSpan` — and `getFullSpan` returns a span **only for `case`/`docket` types** (`DocumentResolver.ts:41`). For a neutral inner cite (e.g. `2015 MT 255`) under a non-`case` container, *both* signals can be dead: the running depth from `computeParenDepths` (`parenDepths.ts`) desyncs on a stray/garbled paren, and there is no `fullSpan` to contain against. Verified in issue #798 (the unbalanced-paren case — the balanced case resolves correctly).
   - **Stage 1 fixes the depth signal** — a real stack reports correct depth and flags imbalance instead of silently swallowing a stray `)`.
   - **Stage 2 fixes the containment signal** — a stack/depth-based "is this island inside that opener's scope" test does **not** require a `fullSpan`, so neutral inner cites are masked regardless of type. The contribution is *harden a filter that already exists* (eyecite-ts already ships partial stages 2–4; report 06), not invent it.

2. **The no-candidate fallback is a recency guess, not an abstain.** When `resolveId` finds no in-scope candidate it chains by position via `findImmediatePredecessor` (confidence 0.7, "chained by position only") instead of flagging for review, and the case-name-window check downgrades confidence but always commits (issue #800). `resolveSupra` already abstains below `partyMatchThreshold` — the `Id.` path should gain the symmetric behavior.
   - **Stages 2 + 4 fix this:** the `id` path runs the same hard scope filter and the same abstain triggers as the other short forms — no silently-recency `id` branch.

> **It is NOT a prompt issue** (given fact, consistent with all 7 reports: this is a deterministic resolver/parser problem, not an LLM-extraction problem).

**One pre-work item flagged by report 06 (Open Q1):** before redesigning, run the exact Hogue/Corsello fixture through eyecite-ts. The code path suggests `isParentheticalChild` *should* already catch it, which would mean the live failure is a **parse-layer desync** (counter, or the `(quoting` opener landing on a prior segment so depth reads 0) rather than a resolution-policy gap. This changes *where* the fix lands and should be the first diagnostic step (it also dovetails with cause #1 above).

### 5.2 Provenance is a downstream concern — design the edge model to fit, don't build it into core

Stage 5 is **out of eyecite-ts core scope**: the library's job is to expose the quoting-chain *structure* (conveniently, the stack contents at a citation's position *are* the enclosing chain — report 03); persistence/graph is the consuming application's concern. If a consumer maintains a citation/proposition graph, report 04's verdict maps cleanly:

- **Reuse the consumer's existing authority nodes.** A quoted *passage/span* is an entity that is part of an authority node already in the graph (Hogue, Corsello, Weinreb). Do **not** mint duplicate case nodes.
- **Model each quoting hop as a reified edge** — `{ from_span, to_span, kind ∈ {quoted_from, primary_source}, verified, method, confidence, span_content_hash, activity_run_id }` — mirroring PROV-DM's `wasQuotedFrom` / `hadPrimarySource`. Store **every hop explicitly** (PROV derivation is not transitive), so each is independently verifiable.
- **Per-hop verification uses a single stable content-hash** over the normalized span text — a mismatch auto-flags the hop and feeds the stage-4 abstain gate. Don't invent a second hashing scheme (report 04 Open Q2).
- **The resolved antecedent is itself a provenance fact** — "this `Id.` → Hogue" is a `wasDerivedFrom`-style edge carrying the resolver run and the deciding attributes, making stage-2/3/4 decisions queryable.
- **Substrate (report 04 Open Q1):** a relational/typed-table store is fine (not RDF); skip the semiring `N[X]` machinery — a linear quoting chain is a path, not a query with `+`/`×` fan-in.

---

## 6. RECOMMENDED ARCHITECTURE (ordered stages, as-built target)

1. **PARSE (stack + island reconstruction).** Bounded-depth bracket stack over `()`/`[]`/`{}`/quotes; annotate each extracted citation island with enclosing-opener identity and depth; emit a **per-region balance-failure signal**. Do not balance the whole document; treat cites as islands, gaps as water, triggers (`quoting`/`citing`/`quoted in`) as soft labels. *(Replaces `parenDepths.ts` linear counter.)*
2. **SCOPE (HARD filter).** For an `Id.`/`supra` at scope node N, candidate set = N's scope + enclosing scopes only (outward-only symbol-table Lookup). Parenthetical-internal cites are **deleted from the candidate set before ranking**. Containment test must be **stack/depth-based, not `fullSpan`-dependent** (fixes the neutral-cite hole). *(Hardens `isParentheticalChild`.)*
3. **SALIENCE (SOFT rank).** Deterministic weighted scorer over the scope-filtered candidate **list** (with a dummy/null candidate), features lean and structural; recency is one decaying factor, never the selector. Built as a candidate-list scorer so a LambdaMART ranker is a later seam-compatible drop-in. *(Extends eyecite-ts's pincite-family + case-name-window signals.)*
4. **ABSTAIN (fail closed).** Flag for review on: balance failure, empty in-scope set, low top-1/top-2 margin, dummy-wins, or `supra` name key resolving to 0/>1. **Never** the silent recency fallback. The `id` path runs these triggers too (no recency-only branch). Calibrate the threshold with conformal prediction once a labeled set exists. *(Replaces `findImmediatePredecessor` low-confidence recency guess and the skipped-`id` validation.)*
5. **PROVENANCE (record chain).** *(Downstream/consumer concern — out of eyecite-ts core.)* Reified per-hop edges (`{from_span, to_span, kind, verified, method, confidence, span_hash}`, mirroring PROV-DM `wasQuotedFrom`/`hadPrimarySource`) on the consumer's citation/proposition graph; the resolver's decision is itself an edge. eyecite-ts exposes the chain structure; explanation layer, not the fix; deferred behind the do-now fix.

**Two mechanisms throughout:** `Id.` = positional (nearest in-scope, salience-ranked); `supra` = named global lookup (party-key filter → recency-within-name → abstain on tie). One entry point, two genuinely different internal strategies.

---

## 7. OPEN RISKS

1. **Bracket survival on real PDF→markdown is unmeasured.** The entire hard-scope edifice rests on recoverable structure. If `(` / `)` are frequently dropped/garbled, the abstain rate (driven by parse failure, not true ambiguity) could be high. *Single highest-priority measurement before committing the hard filter* (reports 01, 02, 03 all flag this).
2. **Empirical split of scope-errors vs. intra-scope salience-errors is unknown.** Determines whether stage 3 (the learned ranker) ever needs to be more than a thin deterministic scorer. Cheap to measure on a labeled sample; gates the report-05/report-01 deferral.
3. **The Hogue/Corsello fixture may already pass in eyecite-ts** — making the live bug a parse-layer desync rather than a resolution-policy gap. If so, the fix concentrates in stage 1 (stack) + the neutral-cite containment, not stage 2 policy. Must be the first diagnostic (report 06 Open Q1).
4. **Confirm the live failure locus before wiring.** Run the canonical fixture first (Risk 3): if balanced input already resolves correctly (as #798 shows), the fix concentrates in stage 1 (stack) + `fullSpan`-independent containment, not stage-2 policy. Land the stage-2/4 changes where the diagnostic points.
5. **Conformal coverage is marginal, not per-citation; exchangeability breaks under drift.** Do not promise lawyers a per-citation guarantee; treat the calibration set as a maintained asset and re-calibrate when jurisdictions or the extraction pipeline change (report 05).
6. **`supra`-into-parenthetical accessibility is a design choice, not a rule.** The Bluebook codifies the parenthetical exemption only for `Id.`. Whether an authority introduced *only* inside `(quoting X)` is a valid `supra` antecedent needs a labeled-corpus check before making inner-scope a hard vs. soft filter for `supra` (report 07 Open Q1).
7. **Trigger-token lexicon completeness + name-key normalization.** The subordinating-signal set beyond `quoting/citing/quoted in`, and party-string normalization for `supra` matching on dirty input, are both tunable knobs that affect abstain rate; budget for them (reports 03, 07).
8. **Provenance is out of eyecite-ts core.** If a consumer builds the quoting-chain graph, design the edge model to fit their store; do **not** couple the resolver fix to it (report 04).

---

## 8. WORK ITEMS (eyecite-ts; sequenced do-now first)

> The first four close the bug class; the rest are conditional. Three are already filed (#798 / #799 / #800); the others extend them.

1. **Diagnose Hogue/Corsello (fixture test).** Run the canonical fixture through `DocumentResolver`; confirm whether a live failure is parse-layer desync (`parenDepths.ts` / cross-segment opener) or policy. *(Pre-work; Risk 3.)*
2. **Replace the linear paren counter with a bounded-depth bracket stack.** New stage-1 parser over `()`/`[]`/`{}`/quotes that annotates citation islands with enclosing-opener identity and emits a per-region balance-failure signal. *(Stage 1; supersedes `computeParenDepths`. Constructive counterpart of #798.)*
3. **Make the scope filter `fullSpan`-independent.** Harden `isParentheticalChild` to mask parenthetical-internal cites via stack/depth containment, not `fullSpan` containment, so neutral inner cites are hidden from an outer `Id.`. *(Stage 2; the fix for #798.)*
4. **Apply scope + abstain to the `id` path; remove the silent recency fallback.** Run the same hard scope filter and abstain triggers on `Id.` as on other short forms; convert `findImmediatePredecessor`'s low-confidence guess into an explicit flag-for-review. *(Stages 2+4; extends #800.)*
5. **Split `supra` into a named global lookup with abstain-on-tie.** Party/short-name key filter over all prior full cites → recency-within-name → abstain on 0/>1 match; scope as a secondary tiebreak only. One entry point, two strategies. *(Builds on #799.)*
6. **Measure bracket survival + scope-vs-salience error split on a real corpus sample.** Quantify how often inner `(quoting)` cites survive PDF→markdown and what fraction of misattributions are scope vs. intra-scope, to gate the hard filter and the learned ranker. *(Risks 1–2.)*
7. **Build stage 3 as a candidate-list scorer (deterministic, ML-ready).** Lean structural feature vector (scope-depth delta, recency rank, reporter/jurisdiction match, party overlap, same-sentence/footnote, pincite consistency) + dummy/null candidate; deterministic weights now, LambdaMART seam later. *(Stage 3; deferred ranker.)*
8. **Conformal calibration of the abstain gate.** Hand-label a few hundred `Id./supra → antecedent` cases (over-sample the nested-parenthetical subpopulation), pick target error α, calibrate singleton-accept / empty-or-multi-reject. *(Stage 4 calibration; deferred.)*
9. **Quoting-chain provenance edges (downstream / optional).** Reified per-hop edges (`{from_span, to_span, kind, verified, method, confidence, span_hash}`; PROV-DM vocabulary, typed-table not RDF, no semiring) on a consumer's citation/proposition graph; resolver writes its decision as an edge. *(Stage 5; out of eyecite-ts core.)*

**Already filed:** #798 (`Id.` → paren-child on unbalanced parens), #799 (`supra` has no paren-child filter), #800 (`resolveId` abstention threshold).

---

## Source reports

| # | Topic | Path |
|---|---|---|
| 01 | Anaphora & coreference resolution (structure/salience vs recency) | `docs/research/2026-06-02-shortform-resolution-01-anaphora-resolution.md` |
| 02 | Scope, binding & lexical scoping (the hard-filter mechanism) | `docs/research/2026-06-02-shortform-resolution-02-scope-and-binding.md` |
| 03 | Recursive bracket parsing & error recovery (stack vs counter, islands) | `docs/research/2026-06-02-shortform-resolution-03-bracket-parsing-error-recovery.md` |
| 04 | Provenance & data lineage (PROV-DM typed DAG; semiring overkill) | `docs/research/2026-06-02-shortform-resolution-04-provenance-lineage.md` |
| 05 | Learning-to-rank & selective prediction/abstention | `docs/research/2026-06-02-shortform-resolution-05-ranking-abstention.md` |
| 06 | Legal citation & reference-parsing tooling (eyecite/eyecite-ts SOTA) | `docs/research/2026-06-02-shortform-resolution-06-legal-citation-tooling.md` |
| 07 | The supra question (named vs positional reference) | `docs/research/2026-06-02-shortform-resolution-07-supra-named-lookup.md` |

**Verification posture carried forward:** all 7 reports were independently citation-verified (hallucination risk low across 01/02/03/05/06/07; medium on 04, with its corrections applied — PROV-O vs PROV-DM property attribution, the IPFS quote, and the RDF-reification statistic; none affect the load-bearing design conclusions). The eyecite-ts source facts were spot-confirmed against `DocumentResolver.ts` and `parenDepths.ts`.
