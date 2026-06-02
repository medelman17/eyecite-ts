# Legal Citation & Reference-Parsing Tooling: Short-Form (Id./supra) Antecedent Resolution

**Date:** 2026-06-02
**Query:** How do existing legal-citation and reference-parsing systems (eyecite/eyecite-ts, ParsCit, GROBID, CRF reference parsers, CourtListener, academic legal-NLP) resolve short-form Id./supra antecedents and model parenthetical nesting? Where do they fail, and what gap would a scope-aware, abstaining redesign fill?
**Depth:** deep

## Summary

The tooling state of the art for short-form antecedent resolution is **recency**, and it is exactly as fragile as our canonical Hogue/Corsello bug predicts. Upstream eyecite (the de-facto standard, used by CourtListener) resolves `Id.` to "the resource of the previously resolved citation" with **zero handling of parentheticals, nesting, or scope** — it would pick the buried inner cite. Our own `eyecite-ts` is genuinely ahead of every other system we found: it already implements a structural scope filter (`isParentheticalChild`) plus a salience-style case-name window check and a confidence/warning channel — i.e., it has already begun building stages 2–4 of the proposed pipeline. The reusable redesign work is therefore (a) replacing eyecite-ts's **linear paren *counter*** with a real **bracket stack** that survives dirty PDF input, (b) closing the **neutral-cite `fullSpan` gap** that makes the inner-scope filter silently fail on `2015 MT 255`-style citations, and (c) converting the recency fallback into an explicit **abstain**. Academic legal-NLP offers no off-the-shelf solution: every recent legal-citation paper we verified (LegalCiteBench, SG-LegalCite, context-aware recommendation) targets *full* citation generation/verification/retrieval and explicitly scopes short-form/antecedent resolution **out**. The transferable theory comes from general NLP coreference — Hobbs (1976) and Centering Theory (Grosz, Joshi & Weinstein, 1995) both resolve anaphora **salience-first, not recency-first**, and embed structural accessibility (binding) constraints — which is precisely the SCOPE-then-SALIENCE architecture we are proposing.

## Key Findings

### 1. Upstream eyecite resolves Id. by pure recency, with no parenthetical/scope model (this is the canonical bug, by design)

The reference implementation (Free Law Project, Python; used by CourtListener) is unambiguous in its own source and docs:

- `_resolve_id_citation`'s docstring: **"Resolve id citations to the resource of the previously resolved citation."** The main `resolve_citations` loop maintains a `last_resolution` variable updated after every citation and hands it to the `Id.` resolver — so `Id.` attaches to whatever was resolved most recently in document order (verified verbatim against `eyecite/resolve.py`, twice).
- The README describes `resolve_citations()` as performing "resolutions using only its immanent knowledge about each citation's textual representation," and **explicitly tells users to write a custom resolver** "if you want to perform more sophisticated resolution" — an admission that the built-in is intentionally minimal.
- Confirmed directly: the code "contains zero handling for parentheticals, nesting, or scope. It only validates pin cites against page ranges using `_has_invalid_pin_cite()`."
- `_resolve_supra_citation` resolves by checking whether the supra's `antecedent_guess` appears in a prior citation's plaintiff/defendant field; `_resolve_shortcase_citation` matches volume+reporter, then disambiguates by antecedent guess. Both are content-match, not structure-aware.

**Consequence for our bug:** given `Hogue … (quoting Corsello …). Id.`, upstream eyecite resolves the inner `Corsello` last and returns it as the `Id.` antecedent — the wrong (inner-scope) authority. There is no mechanism in upstream eyecite that could prefer Hogue.

A second, independent JS port exists — `beshkenadze/eyecite-js`, advertised as "full parity with the Python eyecite library" (context7) — which means it inherits the same recency resolution and the same bug. (This is distinct from our `eyecite-ts`.)

### 2. Our eyecite-ts is the SOTA we found — it already implements early versions of stages 2–4

`/Users/medelman/Projects/OSS/eyecite-ts/src/resolve/DocumentResolver.ts` is materially more sophisticated than upstream and than anything in the literature:

- **Stage 2 (SCOPE) exists as `isParentheticalChild(index)`** (lines 522–538). It excludes a candidate antecedent if EITHER (a) its paren-depth at span start is `> 0`, OR (b) its clean span is wholly inside a previously-resolved citation's `fullSpan`. This is exactly the "inner-scope cites are invisible to an outer Id." filter we want. The `Id.` resolver applies it as a hard candidate filter (line 423), so in principle eyecite-ts already refuses the buried Corsello.
- **Stage 3 (SALIENCE) exists in two soft forms:** a *family* preference (page-style `Id. at 70` prefers case-family authorities, section-style `Id. § 5` prefers statute-family — lines 54–70, 505–512) and a **case-name window check** (`applyCaseNameWindowCheck`, lines 548–649) that scans the ≤80-char prose window before `Id.`, and if it names a case that doesn't match the picked antecedent, **downgrades confidence to 0.75 and emits an ambiguity warning** rather than silently committing.
- **Stage 4 (ABSTAIN) is partial:** there is a `confidence` + `warnings[]` + `failureReason` channel (`ResolutionResult`), and resolution can fail outright ("No preceding citation found"). But the dominant fallback when no *resolved* full-cite candidate exists is `findImmediatePredecessor` — which is **pure recency** with `confidence: 0.7` and a warning ("chained by position only"), not a true abstain. It still commits to an answer.
- **Provenance (stage 5) is foreshadowed** by `antecedentIndex` / chain pointers and by the separate `src/document/citationGraph.ts` and `quoteAttribution.ts` modules.

This is the single most important finding for the redesign: **we are not starting from scratch and we are not behind the field — we are the field.** The redesign should be framed as hardening and completing eyecite-ts's existing scope/salience/abstain scaffolding, not inventing it.

### 3. The bracket parser is a linear *counter*, not a *stack* — and it desyncs on dirty input

`src/utils/parenDepths.ts` (`computeParenDepths`) walks the text once, doing `if (ch === "(") depth++; else if (ch === ")" && depth > 0) depth--`. This is precisely the "linear paren counter" the proposed pipeline warns against:

- It tracks only `()` — not `[]`, `{}`, or quote-mark nesting, all of which appear in real citations and PDF→markdown noise.
- The `depth > 0` clamp means a stray/unbalanced `)` (common in OCR'd PDFs and footnote-stripping artifacts) is silently swallowed, after which **every subsequent citation's recorded depth is wrong** — so the scope filter quietly mis-fires for the rest of the document. There is no balance check, no error signal, no recovery.

eyecite-ts's `quoteAttribution.findParentheticalAttribution` (lines 172–222) does use a small per-citation depth scan with an `abandon` flag on `depth < 0`, which is closer to stack discipline but is local to one citation and still `()`-only. Neither path is a tolerant structural parser. This validates pipeline stage 1 (parse with a stack, tolerant of dirty input) as real, unaddressed work.

### 4. The neutral-cite `fullSpan` gap is a documented, in-the-wild hole in the scope filter

The scope filter's strongest signal — span-containment in a prior citation's `fullSpan` — only works when the antecedent *has* a `fullSpan`. `getFullSpan` (DocumentResolver.ts lines 41–46) returns it **only for `case` and `docket` types**; statute, journal, and **neutral** citations never carry one. eyecite-ts's own issue drafts confirm this is not theoretical:

- **Issue #87** (`neutral-citation-casename-scanback`): for vendor-neutral cites of the form `YYYY ST NNN` (`2015 MT 255`, `2002 UT 327`, `1994 WL 49932`), the case-name scan-back fails — **80 case-name failures** in a 50-state sweep — because the year-first shape skips the volume-first scan trigger. No case name ⇒ degraded `fullSpan`/party data ⇒ the inner-scope containment check has nothing to match against, so a neutral inner cite is **not** reliably hidden from an outer `Id.` This is the exact "neutral cites lacking a full span" failure mode in our brief.
- **Issue #15** (`shortform-id-trailing-parentheticals`): trailing parentheticals after `Id.`/`supra`/short-form cites are dropped (80+ findings in a 200-opinion sweep), including short-form identifiers like `(Marsh)`/`(Serrano III)` that are "the canonical way modern opinions name a case they've already introduced." Losing them removes a disambiguator the resolver could use to link `Marsh, supra` → its full cite — i.e., it starves stage 3 (salience) of signal.

### 5. Reference-parsing tools (ParsCit, GROBID, Neural ParsCit) solve a *different* problem — field segmentation, not back-reference resolution

These are the canonical CRF/sequence-model reference parsers, and the key finding is that **none of them resolves anaphoric short forms**:

- **ParsCit** (Councill, Giles & Kan, LREC 2008, Marrakech, pp. 661–667): a CRF that labels tokens *within a single reference string* into fields (author/title/year). Its "citation context" feature means *locating where in the body a reference is cited* — NOT resolving `ibid`/`id.` to an antecedent (verified against the ACL Anthology abstract).
- **GROBID** (Lopez, ECDL 2009, Corfu): cascaded CRFs turning PDF into structured TEI; ~0.87–0.90 F1 on reference *extraction/parsing* against PubMed/bioRxiv. Again, field segmentation of full references.
- **Neural ParsCit** (Prasad, Kaur & Kan, *Int'l J. on Digital Libraries* 19(4), 2018): BiLSTM-CRF over the same reference-string-segmentation task; gains over CRF-only ParsCit. Same task boundary.

Takeaway: the mature, well-benchmarked NLP machinery for citations is aimed at *parsing one reference into fields*. The short-form **antecedent-resolution** task (the discourse/coreference problem) is essentially absent from this lineage. We cannot lift a solution from here, but the field-segmentation CRF idea is reusable for the *parse* stage if we ever want to learn citation-component spans.

### 6. Academic legal-citation NLP targets FULL citations and scopes short-form resolution OUT

Recent, legal-specific work confirms the gap from the other direction:

- **LegalCiteBench** (Chen, Yin & Zhou, arXiv:2605.10186, May 2026): benchmark over 1,000 recent real U.S. judicial opinions; five tasks (retrieval, completion, error detection, case matching, verification) all about **full** citations (volume/reporter/page). The authors "make no mention of short-form citations or antecedent resolution." Error analysis is about hallucinated vs. missed citations.
- **SG-LegalCite** (Singapore law, arXiv:2605.21057, 2026) and **Context-Aware Legal Citation Recommendation** (Huang et al., arXiv:2106.10776) target citation *retrieval/recommendation*, not back-reference resolution.
- General **anaphora/coreference** surveys treat "pointing back" references as core NLP, but the reviews we checked don't cover the legal `id.`/`supra` system specifically — confirming short-form legal resolution sits in an unclaimed gap *between* legal-NLP (which does full cites) and coreference NLP (which does pronouns/NPs).

### 7. The transferable theory: coreference resolves salience-first and structure-gated, not recency-first

The general anaphora literature directly underwrites the proposed architecture:

- **Hobbs (1976)** resolves pronouns by a **syntactic-tree traversal** that both orders candidates by salience *and* skips structurally inaccessible nodes — i.e., structure is a hard gate, proximity is only a tiebreak.
- **Centering Theory** (Grosz, Joshi & Weinstein, *Computational Linguistics* 21(2), 1995) models a "backward-looking center" chosen from salience-ranked "forward-looking centers," where salience is driven by **grammatical role**, not distance. "Both the Hobbs algorithm and centering search their respective data structures in a salience-first manner."

Mapping to citations: the outer authority (Hogue) is the discourse-salient "center" (it's the one the writer is foregrounding); the inner `(quoting Corsello)` cite is structurally embedded and *less* accessible despite being closer — the same configuration where recency-only pronoun resolvers are known to fail. Our SCOPE filter is the binding/accessibility gate; our SALIENCE ranker is centering's grammatical-role preference.

## How This Applies to Id./supra Attribution

Mapping each proposed stage to concrete, verified evidence:

1. **PARSE with a stack (tolerant of dirty PDF→markdown).** Confirmed-real, unaddressed work. eyecite-ts uses a clamped linear `()` counter (`computeParenDepths`) that silently desyncs on the first unbalanced bracket and ignores `[]`/`{}`/quotes (Finding 3). Upstream eyecite has nothing. **Action:** build a real bracket/quote stack that emits a *balance-failure signal* per region; feed that signal into stage 4.

2. **SCOPE — make parenthetical-internal cites invisible to an outer Id.** This is the highest-leverage finding and it cuts both ways: upstream eyecite has no such filter (so it *is* the canonical bug), but **eyecite-ts already has one** (`isParentheticalChild`) that should already refuse the buried Corsello. The redesign's scope contribution is therefore not "invent the filter" but **"make it robust where it currently fails":** (a) the `fullSpan` path is dead for neutral/statute cites (Finding 4, Issue #87), so add a depth-based or stack-based containment that doesn't require `fullSpan`; (b) the depth source must be the new tolerant stack, not the desync-prone counter. A scope-aware filter that fails *closed* on neutral cites is the single most important fix for our bug class.

3. **SALIENCE — soft-rank sibling-scope candidates.** eyecite-ts already has two soft signals (pincite-family + case-name window) that *downgrade confidence* on mismatch (Finding 2). This is directly the right shape, and the coreference literature (Finding 7) says salience should be driven by **grammatical/discourse role**, not distance — so the redesign can principledly extend the case-name window into a centering-style "is this the foregrounded authority?" score. Issue #15's dropped `(Marsh)`/`(Serrano III)` identifiers are lost salience signal worth recovering.

4. **ABSTAIN — flag for review; never silently fall back to recency.** This is the clearest behavioral gap. eyecite-ts *has* the plumbing (`confidence`, `warnings[]`, `failureReason`) and uses it well in places, but its no-candidate fallback (`findImmediatePredecessor`) **still commits to the recency answer** at `confidence 0.7` (Finding 2). The redesign should make "structure unrecoverable (stack balance failed) OR two sibling candidates within ε salience OR scope filter starved (no `fullSpan`, neutral cite)" route to an explicit **ABSTAIN / flag-for-review** state instead of a low-confidence recency guess. Crucially, the Bluebook rule gives a *bright-line abstain trigger*: `Id.` is only valid when the preceding footnote/citation has **exactly one** authority — "the only authority cited in the preceding footnote." If the immediately preceding context cites multiple authorities, recency is *known* to be ill-defined and the system should abstain.

5. **PROVENANCE — record the quoting chain.** eyecite-ts already carries `antecedentIndex` chain pointers and has a `citationGraph.ts` + `quoteAttribution.ts` that distinguishes parenthetical-internal quote attribution (`(quoting X)` → the embedded source) from the outer cite. The Bluebook confirms this chain is real and rule-governed: `(quoting ...)` parentheticals are mandated and "only one level of recursion is required" — so "language quoted in Hogue, originally from Weinreb" is reconstructible from the nesting we parse in stage 1.

**Bottom line:** the recency heuristic that produces the Hogue/Corsello bug lives in *upstream* eyecite's model and in any straight port of it. `eyecite-ts` has already broken from that model with a real scope filter and a confidence channel — the bug surfaces mainly through (a) the brittle linear paren counter and (b) the neutral-cite `fullSpan` hole that disarms the scope filter. Fixing those two, plus converting the recency fallback to an explicit abstain on the Bluebook "single-authority" condition, addresses the canonical bug with the least new machinery.

## Trade-offs & Alternatives

- **Stack parser vs. keep the counter.** A real stack costs little and is the only way to (a) handle `[]`/`{}`/quotes and (b) *detect* imbalance so stage 4 can abstain. The counter's only virtue is simplicity; its silent-desync failure mode is unacceptable for a fail-closed attribution system. Strongly favor the stack.
- **Hard scope filter vs. soft penalty.** The brief proposes scope as a *hard* candidate filter; eyecite-ts implements it as hard (`continue` past paren children). Risk: a *false* scope exclusion (e.g., the paren parser wrongly thinks an outer cite is nested due to a stray bracket) would hide the correct antecedent and force an abstain. Mitigation: only treat scope as hard when bracket balance is *clean*; when balance failed in that region, demote scope to a soft signal + abstain. This couples stages 1, 2, and 4 deliberately.
- **Rule-based vs. learned resolver.** The CRF/neural lineage (Findings 5) is mature but solves field segmentation, not resolution; there is no labeled corpus for short-form antecedents (LegalCiteBench etc. don't provide one — Finding 6). A learned coreference-style resolver is *possible* (centering features, Finding 7) but would need a bespoke annotated set. Deterministic scope+salience+abstain is the pragmatic near-term choice and matches how the whole ecosystem (eyecite, eyecite-ts) already operates; keep the door open to learning the salience ranker later.
- **Abstain rate vs. coverage.** Aggressive abstaining trades recall for precision. For a citation *checker* (where a wrong attribution is worse than a flagged "needs review"), high-precision/abstain is correct — and aligns with eyecite-ts already preferring warnings over silent commits. The Bluebook single-authority rule gives a principled, low-false-positive abstain trigger that won't tank coverage on the common one-authority case.

## Open Questions

1. **Does eyecite-ts's existing `isParentheticalChild` *already* resolve the exact Hogue/Corsello fixture correctly today?** The code path suggests it should (Corsello is a paren child → filtered → Hogue wins). If our production bug still reproduces, the failure is likely upstream of resolution (the counter desyncing, or `Corsello` not being detected as paren-depth>0 because its `(quoting ...)` opener was on a prior line/segment). This needs a direct fixture test before any redesign — the bug may be a *parse* bug, not a *resolution-policy* bug.
2. **What fraction of real-world inputs hit the neutral-cite `fullSpan` hole?** (#798 is the verified case.) Quantify how often an *inner* (quoting) cite is a neutral cite specifically, since that's the subset that defeats the scope filter.
3. **Is the Bluebook "single-authority in preceding footnote" abstain rule recoverable from our markdown input?** It depends on detecting footnote/citation-sentence boundaries (eyecite-ts has `footnoteZones.ts` / paragraph maps). How reliable is that boundary detection on PDF→markdown?
4. **Should provenance chains record only one recursion level (Bluebook minimum) or the full transitive chain?** The Bluebook requires only one `(quoting)` level; opinions sometimes nest deeper. Full-chain provenance is more useful but more error-prone on dirty input.
5. **Is there a defensible salience model beyond case-name matching?** Centering theory suggests grammatical role (subject/object of the citing sentence) as a salience signal — untested on legal prose. Worth a small experiment before over-investing in heuristics.

## Sources

1. **eyecite-ts `DocumentResolver.ts`** (`/Users/medelman/Projects/OSS/eyecite-ts/src/resolve/DocumentResolver.ts`) — *primary source code.* The actual resolution logic: `resolveId` recency walk, `isParentheticalChild` scope filter, `applyCaseNameWindowCheck` salience/abstain, family preference, `findImmediatePredecessor` recency fallback. Establishes that our port already implements stages 2–4 partially.
2. **eyecite-ts `parenDepths.ts` + `scopeBoundary.ts` + `quoteAttribution.ts`** (same repo, `src/utils/`, `src/resolve/`, `src/document/`) — *primary source code.* Shows the linear-counter parse (Finding 3), paragraph/footnote scope, and parenthetical-internal quote attribution.
3. **eyecite-ts issue drafts #87 and #15** (`/Users/medelman/Projects/OSS/eyecite-ts/issue-drafts/`) — *primary, in-the-wild evidence.* Quantified neutral-cite case-name failures (80) and dropped short-form parentheticals (80+); the concrete `fullSpan` and salience-starvation gaps.
4. **Free Law Project, `eyecite/resolve.py`** (github.com/freelawproject/eyecite) + README + context7 `/freelawproject/eyecite` — *primary source/docs.* Verbatim `_resolve_id_citation` ("resource of the previously resolved citation"), no parenthetical/scope handling, `antecedent_guess` for supra, and the explicit "write a custom resolver for sophisticated resolution" disclaimer. Establishes recency-only SOTA and the canonical bug at the ecosystem standard.
5. **context7 `/beshkenadze/eyecite-js`** — *secondary.* A separate "full parity with Python eyecite" JS port; confirms a second deployed implementation inherits the recency model.
6. **Councill, Giles & Kan, "ParsCit: an Open-source CRF Reference String Parsing Package," LREC 2008** (aclanthology.org/L08-1291), pp. 661–667 — *primary paper.* Confirms CRF field-segmentation of single reference strings; "citation context" = locating in-body citation sites, NOT anaphoric short-form resolution.
7. **Lopez, "GROBID: Combining Automatic Bibliographic Data Recognition and Term Extraction," ECDL 2009** (Springer) — *primary paper.* Cascaded-CRF PDF→TEI reference parsing; ~0.87–0.90 F1; field segmentation, not back-reference resolution.
8. **Prasad, Kaur & Kan, "Neural ParsCit: a deep learning-based reference string parser," *Int'l J. on Digital Libraries* 19(4), 2018** (Springer) — *primary paper.* BiLSTM-CRF on the same segmentation task; confirms the neural SOTA also stops at field parsing.
9. **Chen, Yin & Zhou, "LegalCiteBench," arXiv:2605.10186 (May 2026)** — *primary paper.* Recent legal-citation benchmark over real U.S. opinions; targets *full* citations and explicitly does not address short-form/antecedent resolution — direct evidence of the academic gap.
10. **Grosz, Joshi & Weinstein, "Centering: A Framework for Modeling the Local Coherence of Discourse," *Computational Linguistics* 21(2), 1995**, with **Hobbs (1976)** — *foundational theory.* Anaphora resolution is salience-first and structure-gated, not recency-first; underwrites the SCOPE-then-SALIENCE architecture and explains *why* recency fails on the Hogue/Corsello configuration.
11. **Bluebook short-form rules** (Tarlton/UC Davis/Loyola Bluebook guides; Temple Law Review Rules B.6/C.3; Baby Blue) — *domain primary.* `Id.` = immediately preceding authority "so long as it is the only authority cited in the preceding footnote" (the bright-line ABSTAIN trigger); `supra` reaches any earlier footnote; `(quoting ...)` nesting is mandated with "only one level of recursion required" (supports stages 1 and 5).
