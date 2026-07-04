# Architecture review — 0.x friction candidates (2026-07-04)

The review that preceded the v1 redesign. Seven deepening candidates, each with measured evidence. The v1 public interface (docs/v1-spec.md) resolved their *external* consequences; the internal refactors remain the substance of the rewrite. Vocabulary: module / interface / depth / seam / adapter / leverage / locality (deep-module framing).

## Candidate 1 — `extractCitations.ts` is a 2,109-line orchestrator script (STRONG)

21 numbered "Step" stages; a 20-arm `switch (token.type)` with a nested patternId dispatch; **17 hand-ordered post-processing passes** whose ordering invariants live only in comments ("runs after all set-changing passes… so ids are dense"; "LINKING passes… after id assignment"). Inline dedup is three sub-algorithms (~100 lines). Deep from outside (8-field options), but internally no seam: a pass can't be reordered, inserted, or tested without editing the file and re-reading the prose. Deletion test: the ordering knowledge is real domain complexity — it earns its keep but is concentrated in a script rather than behind a pipeline interface.
**Deepening:** an ordered `Pass[]` pipeline — each pass `(CitationSet, DocContext) => void` at one seam; ordering becomes data; dedup and token-dispatch become named deep modules.

## Candidate 2 — dual-coordinate knowledge leaks into ~73 extract files (STRONG)

`TransformationMap`/`cleanStart`/`originalStart` referenced in **99 files** (extract 73). Threading counts: extractCitations 46, extractStatute 43, extractShortForms 20, extractNeutral 15, casePostfixSemantics 14, extractConstitutional 13, extractCase 11… Nearly every extractor signature carries `transformationMap` only to call `resolveOriginalSpan` at the end. Deletion test on the threading: pure pass-through plumbing.
**Deepening:** extractors emit clean-coordinate spans only; one translation pass over the finished set at the orchestrator. (v1 makes this mandatory — the public IR has original-text spans only.)

## Candidate 3 — case extraction: 11 modules threaded by a 29-field mutable draft (STRONG)

Files/fan-in: caseNameScanner 1297 ln (only extractCase), caseParentheticals 655 (5 importers), casePartySemantics 377, casePostfix 330, caseReporterSemantics 264, caseCitationDraft 205 (**1 caller**), casePostfixSemantics 197, caseNameSemantics 165, caseCore 101, caseEnvelope 70 (pass-through), caseParallelSemantics 34 (**1 caller**). `extractCase()` threads a mutable `CaseCitationDraft` (29 fields) through a 9-step choreography, re-copying shadow locals after each step. The `parse*/interpret*/apply*` triples are shallow pairs extracted for isolated testability. Deletion test on the three single-caller modules: complexity vanishes — pass-through.
**Deepening:** collapse parse/apply pairs into stages returning immutable partials; inline the pass-throughs; `caseNameScanner` stays as the one genuinely deep implementation. 11 shallow files → ~4 deep modules.

## Candidate 4 — implicit patterns↔extractor contract, three stringly-typed channels (WORTH EXPLORING)

(1) `token.type` → the 20-arm switch; (2) `token.patternId` string literals routing extractStatute to 38 jurisdiction extractors and extractCase to short-form variants — no compile-time link to the pattern files' `id` fields; (3) named capture groups: **163 group-access sites**, with `groupAccessor.ts` a partial seam not universally adopted. Adding a citation type touches ~7 places.
**Deepening:** the pattern carries its extractor and a typed group contract — dispatch collapses to `pattern.extract(token, ctx)`. (v1 makes this fully private.)

## Candidate 5 — `DocumentResolver` is a 1,481-line god class (WORTH EXPLORING)

~40 private methods spanning three independent algorithms (resolveId / resolveSupra / resolveShortFormCase), 11 mutable instance fields including lazily-filled scratch (`parenDepths`, `balanceOks`, `resolutions`, `resolvedSoFar`). Scope strategies are hard-coded predicate methods, not adapters. Deep from outside (one `resolve()`), no internal seam per citation family.
**Deepening:** three family resolvers behind one `resolve(citation, ctx)` interface; scratch state into a per-pass context. Rewrite measurement: the gold Id./supra corpus (#829), not just parity.

## Candidate 6 — statutes: 40-file directory behind a 38-arm switch (WORTH EXPLORING)

38 hand-wired imports + a stringly-typed patternId switch; no unifying `StatuteExtractor` interface; jurisdiction disambiguation (`inheritBareSectionJurisdiction`, `reassignDcCodeJurisdiction`) leaks out of statutes/ into the top-level orchestrator. The per-jurisdiction extractors themselves are deep and earn their keep.
**Deepening:** a `Map<patternId, StatuteExtractor>` registry co-located with patterns; disambiguation moves behind the statutes seam.

## Candidate 7 — test mass sits at the wrong altitude (SPECULATIVE; falls out of 1 & 3)

218 extract test files, mostly micro-helper mirrors + issue regressions; ~no mid-level layer; composition bugs (#207/#209 subsumption, #558 fusion, #881 divergence, #884 parallel inheritance) only reachable end-to-end via corpus tests. Once passes/stages exist, the pass interface is the test surface; micro-helper mirrors the corpus already covers get retired (replace, don't layer).

## Verified NOT friction

`src/annotate/` and `src/data/` are genuinely decoupled entry points; `types/guards.ts` scales generically.

## Post-review addendum (confidence)

The review predates the confidence decision: scoring was ad-hoc in ~40 places and silently invalidated by later passes (#147, #555–557, #613). ADR 0005 resolves the public shape (categorical); internally, scoring becomes a single late pass in the Candidate-1 pipeline — which is what kills the recompute-after-mutation bug class.
