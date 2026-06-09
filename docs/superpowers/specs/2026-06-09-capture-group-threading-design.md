# Capture-Group Threading — Design

**Date:** 2026-06-09
**Status:** LOCKED (design approved; implementation plan to follow)
**Sub-project:** **A** of the "thread the CST forward + value-object terminals" slice (A capture-group threading → B value-object terminals → C resolver reads terminals). This spec covers **A only**; B and C get their own specs.
**Source:** `docs/research/2026-06-06-grammar-driven-architecture-analysis.md` — Divergence #4 (the CST is discarded at the token boundary) and §4 ("the lexer keeps only `match[0]`, discarding capture groups; every extractor re-runs a separate non-global twin regex on `token.text`").
**Subsumes:** the unfinished harder half of #844 (capture-group threading; #844/#877 delivered only pattern-ordering consolidation).

---

## 1. Problem

The tokenizer (`src/tokenize/tokenizer.ts`) matches each pattern with `pattern.regex.matchAll(cleanedText)` and keeps only `match[0]` (the full matched text) plus the span, type, and `patternId`. The **capture groups and their offsets are discarded**. Every extractor then re-runs a *separate* regex over `token.text` to recover the structure it needs:

```ts
// src/extract/caseCore.ts — the "twin regex", run again at extract time
const match = VOLUME_REPORTER_PAGE_REGEX.exec(text) ?? VOLUME_REPORTER_PAGE_REGEX_COMMA.exec(text)
if (!match) throw new CitationParseError(`Failed to parse case citation: ${text}`)
const volume = parseVolume(match[1]); const reporter = match[2].trim(); /* match[3], match.indices[5]… */
```

This is the **twin-regex split-brain**: two regexes per production (one to tokenize, one to extract) kept in lockstep by hand. Consequences, all confirmed in-tree:

- **Drift → crashes (the #881 class).** When the tokenizer pattern admits something the extractor's stricter twin can't parse, the extractor throws. #881 hardened this into a graceful *decline*, but the **root cause — two diverging regexes — remains**.
- **Duplicated authoring.** Every production's structure is encoded twice; changes must be mirrored.
- **No named contract.** No pattern uses named capture groups today (verified); group identity is positional (`match[1]` = volume) and re-derived independently in each extractor.

## 2. Goal & non-goals

**Goal.** Make each production a **single canonical regex with a named-group contract**. The tokenizer threads the matched groups (and their token-relative offsets) onto the `Token`; extractors read `token.groups.volume` and validate, **declining via the #881 path** when a required group is absent or fails validation. The per-extractor twin regex is deleted.

**Non-goals.**
- Narrowing tokenization. Patterns stay intentionally broad (the island-grammar property); see §6.
- Value objects (sub-project B) and resolver changes (sub-project C). A only threads the raw, named terminals; modeling them as value objects and consuming them in the resolver are downstream.
- Ordered-choice recognition (#848) — independent.

## 3. Locked decisions

1. **Named-group unification.** One canonical regex per production, authored with named groups (`(?<volume>\d+)\s+(?<reporter>…)\s+(?<page>\d+)`). *Rejected:* positional threading (fragile, not self-documenting); stashing groups while keeping the twin (doesn't fix the drift).
2. **Additive `Token` fields.** `groups` and `groupSpans` are optional; unmigrated extractors are untouched until migrated. No breaking change.
3. **Token-relative group offsets.** `groupSpans` stores `[start, end]` **relative to the token start**, matching how extractors already compute component spans (`spanFromGroupIndex(span.cleanStart, …)`), so migration is near-drop-in.
4. **Breadth preserved; validation stays in the extractor.** The pattern regex remains broad enough to tokenize; the extractor keeps its validation logic, now expressed as explicit checks on the threaded groups, with failure → `CitationParseError` (the #881 decline).
5. **Incremental, behavior-preserving rollout**, case + short-form productions first (the critical path to B → C); the other productions follow the same mechanism. The real-opinion corpus snapshot is the behavior-preservation oracle at every step.

## 4. The `Token` shape

`src/tokenize/tokenizer.ts`:

```ts
export interface Token {
  text: string
  span: Pick<Span, "cleanStart" | "cleanEnd">
  type: Pattern["type"]
  patternId: string
  /** Named capture groups from the matching pattern regex (undefined groups omitted or undefined). */
  groups?: Record<string, string | undefined>
  /** Token-relative [start, end] offsets per named group (from `match.indices.groups`). */
  groupSpans?: Record<string, [number, number]>
}
```

**Threading in `tokenize()`.** For each `match` from `matchAll`, populate `groups` from `match.groups` and `groupSpans` from `match.indices.groups`, converting each absolute offset to token-relative (`abs - match.index`). This requires the `d` flag on pattern regexes (for `match.indices`); a grammar test (§7) asserts every `orderedPatterns` regex carries both `g` and `d`. Patterns with no named groups thread nothing (`groups`/`groupSpans` stay `undefined`) — that is the unmigrated state.

## 5. Data flow

```
Pattern (one canonical regex, named groups, /gd)
        │  matchAll over cleanedText
        ▼
Token { text, span, type, patternId, groups, groupSpans }   ← groups threaded here, once
        │  no re-exec
        ▼
Extractor: read token.groups.<name> + token.groupSpans.<name>
           validate → CitationParseError decline on failure (#881)
           build component spans from groupSpans (token-relative, as today)
```

The twin regex and its `regex.exec(token.text)` disappear from each migrated extractor.

## 6. The named-group contract (and the broad-vs-strict subtlety)

Group **names** are the contract between a pattern and its extractor. Conventions:
- Names are consistent across related productions (`volume`, `reporter`, `page`, `pincite`, `section`, `subsection`, `year`, `court`, `party`/`plaintiff`/`defendant`, …).
- Each migrated production documents its group contract in a comment on the pattern.
- Optional/alternation groups may be `undefined`; the extractor handles absence explicitly.

**The load-bearing subtlety.** Today the extractor's twin regex often does double duty: it *extracts* groups **and** *re-validates* (its match/no-match gate rejects shapes the broad tokenizer pattern admitted). When the twin is deleted, that validation must not vanish — it moves into explicit checks on the threaded groups, with failure routed to the `CitationParseError` decline. **Migration of a production is therefore: (a) add named groups to the one canonical pattern regex; (b) read them in the extractor; (c) re-express the twin's validation as explicit group checks; (d) delete the twin.** Steps (c) is where behavior could drift — the corpus snapshot and per-extractor tests are the guard.

## 7. Testing & determinism

- **Corpus snapshot is the oracle.** `tests/integration/corpus.test.ts` must stay green at **every** migration step — a green run means extraction behavior is unchanged across the real-opinion distribution. The #878 prose-led-`supra` seed and the #881 decline cases stay green.
- **Per-production equivalence test.** For each migrated production, a test asserts `token.groups`/`token.groupSpans` equal the values the old twin regex produced (volume/reporter/page/spans), and that malformed input still declines (`CitationParseError`).
- **Grammar invariant test.** Assert every `orderedPatterns` regex carries `g` and `d`, and that each migrated pattern's named groups match the set its extractor reads (a drift guard analogous to `grammarOrder.test.ts`).
- **Determinism.** Extraction stays a pure function of input; the corpus determinism meta-test covers it.

## 8. Migration strategy

1. **Thread (no behavior change).** Add the two `Token` fields; populate `groups`/`groupSpans` in `tokenize()`; ensure the `d` flag. No extractor reads them yet → full suite + corpus unchanged. One PR.
2. **Migrate per production**, case + short-form first, then the rest. Each PR: add named groups to the canonical pattern regex → migrate the extractor to read threaded groups → re-express validation → delete the twin → suite + corpus green → changeset. Small, reviewable, individually revertible.
3. **Close-out.** When the last twin is gone, remove any now-dead twin-regex constants and note the #881 root cause is closed (drift can no longer occur — there is one regex).

## 9. Rollout scope & sequencing

This spec specifies all of A (every production). Implementation order:
1. Token threading + grammar invariants (PR 1).
2. Case core + short-form/`Id.`/`supra` productions (PRs 2–n) — unblocks sub-project B.
3. Remaining productions (statute, journal, neutral, fed-reg, rules, restatement, …) — incremental follow-ups.

B (value-object terminals) may begin once the case path is threaded; it does not wait for full A close-out.

## 10. Relationship to the larger slice & issues

- **A (this spec)** ≈ #844 remainder. Foundation: clean, named, threaded terminals.
- **B (next spec)** ≈ #846 (value-object design-lock) + #852 (Reporter VO). Models `CaseName`/`Party`/`Reporter`/… as value objects co-locating value + normalized + span, and emits the case-name terminals the resolver needs.
- **C (final spec)** ≈ #876. Deletes `DocumentResolver`'s three raw-prose scans (`applyCaseNameWindowCheck`, `extractInferredCaseName`, `extractPartyName`) in favor of B's terminals, guarded by the corpus + the #878 seed.

## 11. Risks

- **Validation drift during twin deletion (§6).** The primary risk. Mitigation: re-express validation explicitly, guard with the corpus snapshot + per-production equivalence tests + an adversarial out-of-corpus review (the #878 lesson).
- **Broad scope (many productions).** Mitigation: additive threading + per-production incremental PRs; partial completion is a valid, shippable state.
- **`d`-flag / regex recompilation.** Authoring patterns with `gd` + a grammar invariant test avoids per-call recompilation overhead.
- **Performance.** Named groups + indices add negligible cost over the existing `matchAll`; no new passes.
