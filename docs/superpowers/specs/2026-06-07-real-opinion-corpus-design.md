# Real-Opinion Snapshot Regression Corpus — Design

**Date:** 2026-06-07
**Status:** LOCKED (design approved; Phase 1 to be planned + implemented)
**Motivation:** PR #878 shipped a "behavior-preserving" dead-code removal whose only guard — the full suite (4647 tests) — was green, yet an adversarial reviewer found a real regression on a shape the curated corpus never covered (prose-led single-party `supra`, ~13% of real opinions). The curated corpus measures *coverage of shapes its authors anticipated*, not *behavior preservation across the real distribution*.

---

## 1. Problem

The test corpus is hand-labeled `{ text, expected[] }` samples (golden / thorny / expanded fixtures), matched by exact count + subset fields. It is curated, so it has systematic blind spots: the long tail of real-world citation/resolution shapes — where bugs and load-bearing fallbacks live — is exactly what's missing. Consequently "the suite is green" does **not** imply "behavior is preserved," which makes refactors (the whole inter-citation-grammar program: #876, #846/#852, etc.) untrustworthy and risky.

## 2. Goal

A **snapshot regression net** built from a large, stratified sample of **real CourtListener opinions**, such that "the corpus test is green" means "extraction + resolution behavior is unchanged across the real distribution." It needs no ground-truth labels: a *change* in projected behavior is what's detected; intended changes are reviewed diffs that get re-baselined, regressions are caught.

Non-goals: measuring *accuracy* (correctness vs. ground truth) — that's a separate labeled-benchmark effort; replacing the curated golden/thorny corpora (they stay as targeted accuracy/feature tests).

## 3. Locked decisions

1. **Purpose:** real-opinion **snapshot regression net** (detect behavior *change*, not accuracy).
2. **Grain:** **compact behavior projection** per citation (not full objects, not just a hash) — immune to additive-field churn, captures extraction + resolution.
3. **Scale:** **tiered** — Phase 1 ships a ~1k committed core that gates PRs; Phase 2 (deferred) adds a ~10–50k extended tier on a nightly/manual job.
4. **Sampling:** **stratified** across court level / era / opinion type / OCR-vs-clean, deterministic + reproducible (committed manifest).
5. **Generation model:** **Claude-driven via the pgedge-flp MCP** for the replica-touching steps (no credential distribution). Replica-free steps are plain scripts.
6. **Phase 1 scope:** core corpus + the PR-gating snapshot test + the `regen`/`sample` scripts + seeded long-tail guarantees. Phase 2 is a noted follow-up.

## 4. The load-bearing constraint

The CourtListener replica is an **interactively-authenticated MCP — available locally, NOT in CI** (headless/cron runs lack it). Therefore the corpus is **committed and self-contained**; CI re-runs extraction on the committed text and never contacts the replica. Generation (replica access) and checking (replica-free) are split.

## 5. Architecture

```
SAMPLE (replica-required, rare, Claude-driven)        CHECK (replica-free, every run)
  stratified draw over 10.8M opinions      ───▶  vitest: for each committed opinion,
  → committed manifest (ids + strata)             run extractCitations(text,{resolve:true}),
  → committed plain_text (gzipped)                project, diff vs committed projection
  → committed expected projection
```

**Two scripts, split by replica need:**
- `corpus:sample` — **replica-required** (Claude-driven via MCP). Re-draws the stratified sample, fetches `plain_text`, writes the manifest + texts + initial projection. Rare (grow/refresh only).
- `corpus:regen` — **replica-free**. Recomputes the expected projection from the *already-committed* texts. This is the **re-baseline** step after an intended behavior change: run it, review the diff (intended improvement vs. regression), commit. Runs anywhere, by anyone.

This split is the key ergonomic: the common operation (re-baseline) never needs the replica.

## 6. The compact projection

Deterministic, document-ordered. Per opinion:

```ts
interface OpinionProjection {
  id: number               // CourtListener opinion id
  count: number            // total top-level citations
  citations: CitationProjection[]
}
interface CitationProjection {
  type: string             // citation type discriminant
  key: string              // normalized locator (stable identity)
  span: [number, number]   // [originalStart, originalEnd]
  resolvedTo: string | null // resolved antecedent's `key`, or null (resolve mode)
}
```

`key` normalization by family: case/reporter → `"{volume} {reporter} {page}"`; statute → `"{title} {code} § {section}"`; short-forms (`id`/`supra`/`shortFormCase`) → a normalized matched-text/party form; others → matchedText. The `key` is for human-readable diffs and as the `resolvedTo` reference; it is not parsed.

**Why these fields:** they capture *what* is extracted, *where*, and *how it resolves* — enough to catch the #878 class (a `resolvedTo` flipping to `null`). **Excluded:** every other field (confidence, the aggregate trees, the additive `parentheticalNode`/`sectionPincite`/…), so additive changes — which we make constantly — do not churn the snapshot. Only behavior changes to projected fields produce a diff.

## 7. Sampling (stratification)

Strata (each cell sampled proportionally, with floors so rare cells are represented):
- **Court level:** SCOTUS / federal circuit / federal district / state high / state intermediate / other.
- **Era:** by decade of decision.
- **Opinion type:** `search_opinion.type` (lead / concurrence / dissent / per curiam / …).
- **Source quality:** `extracted_by_ocr = true` vs. false — with a deliberate OCR floor (OCR'd text is the messy long tail; #810).

Selection is deterministic: the committed `manifest.json` lists the chosen opinion ids + their strata, so the corpus is fixed and auditable; `corpus:sample` regenerates it from a documented stratified query (ordered by `id`, no `Date.now`/random).

## 8. Storage & layout (Phase 1)

```
tests/fixtures/corpus/
  manifest.json            # ids + strata (committed, auditable)
  texts.json.gz            # { [id]: plain_text } gzipped (~1k opinions)
  projections.json         # { [id]: OpinionProjection } (the expected baseline)
scripts/corpus/
  sample.ts                # replica-driven draw → manifest + texts + projections
  regen.ts                 # texts → projections (replica-free re-baseline)
  project.ts               # the shared projection function (also imported by the test)
tests/integration/corpus.test.ts   # the diff test
```

Texts are gzipped to bound repo growth (~1k opinions; if it proves too large, fall back to git-lfs — revisited in Phase 2). `package.json` scripts: `corpus:regen`, `corpus:sample` (devDep only; the library keeps zero runtime deps).

## 9. The snapshot test

`tests/integration/corpus.test.ts` loads `manifest` + `texts` + `projections`, and for each opinion runs `extractCitations(text, { resolve: true })`, computes the projection via the shared `project.ts`, and asserts deep-equality with the committed expected projection. A mismatch prints a focused per-citation diff. Runs in normal CI (Phase 1 core ~1k; budget ~1–2 min).

## 10. Seeded long-tail guarantees

Beyond the stratified draw, seed a handful of **named** opinions/snippets that exhibit shapes the curated corpus missed — starting with the **prose-led single-party `supra`** that #878 exposed — so those shapes are permanently guarded even if a future re-sample drops them.

## 11. Phase 2 (deferred follow-up)

The ~10–50k **extended tier** + a nightly/manual CI job; storage strategy (gzip bundle vs. git-lfs vs. data branch) decided then; optionally a standalone `pg` generator if direct replica creds get provisioned.

## 12. Testing & determinism

Extraction is a pure function of input (no `Date.now`/random), so projections are stable. A meta-test asserts `project()` is deterministic (same input → same projection). The corpus test is otherwise self-validating.
