# Capture-Group Threading — Design

**Date:** 2026-06-09
**Status:** LOCKED (v2 — hardened after a four-lens expert panel; see §12 for what changed)
**Sub-project:** **A** of the "thread the CST forward + value-object terminals" slice (A capture-group threading → B value-object terminals → C resolver reads terminals). This spec covers **A only**; B and C get their own specs.
**Source:** `docs/research/2026-06-06-grammar-driven-architecture-analysis.md` — Divergence #4 (the CST is discarded at the token boundary) and §4.
**Subsumes:** the unfinished half of #844 (capture-group threading; #844/#877 delivered only pattern-ordering consolidation).

---

## 1. Problem

The tokenizer (`src/tokenize/tokenizer.ts`) matches each pattern with `pattern.regex.matchAll(cleanedText)` and keeps only `match[0]`, the span, type, and `patternId`. The **capture groups and offsets are discarded**. Every extractor then re-runs a *separate* regex over `token.text` to recover structure (`caseCore.ts` runs `VOLUME_REPORTER_PAGE_REGEX.exec() ?? …_COMMA.exec()`; `extractJournal.ts` re-runs its own regex; ~68 `.exec` sites in `src/extract/`). This is the **twin-regex split-brain**: two regexes per production, hand-synced. When they drift, the extractor declined-or-crashed on shapes the broad pattern admitted (the #881 class). The duplication and the drift are the defects.

## 2. Goal & non-goals

**Goal.** Thread each matched pattern's **named** capture groups (and token-relative offsets) onto the `Token`, so an extractor reads `token.groups.volume` instead of re-running a structural regex. Eliminate the **duplicate full re-exec**.

**Non-goals.**
- *Not* "make one regex do everything." Patterns stay intentionally **broad** for tokenizing (island grammar); the extractor keeps its **strict validation** and any **residual structuring** (§4, §6). What is removed is the *duplicate re-exec*, not validation.
- *Not* value objects (B) or resolver changes (C). A threads raw, named, span-bearing terminals; modeling them as `Reporter`/`CaseName` and consuming them in the resolver are downstream.
- *Not* ordered-choice recognition (#848); *not* the out-of-token lookahead extraction (pincite/year/court read from `cleanedText` slices) — that stays.

## 3. Locked decisions

1. **Named-group threading with a *per-pattern* contract.** The contract is owned by each **pattern** (where the regex lives), *not* an abstract "production." Many patterns feed one extractor (case = 12 patterns → one `parseCaseCitationCore`; `supra` = 3 patterns → one supra extractor), so an extractor reads the **union** of the named groups across the patterns that feed it. *Rejected:* positional threading (fragile); a single "canonical regex per production" (contradicts the N-patterns→1-extractor topology).
2. **No duplicate named groups (Node-floor constraint).** Naming the same group across alternation branches (e.g. space-form vs comma-form `page`) requires ES2025 *duplicate named capturing groups* — V8 12.4 / **Node 22+**. The repo's floor is `engines.node >=18` with a Node 18/20/22 CI matrix and a tarball-consumer leg, so a duplicate name is a **`SyntaxError` at module import** on 18/20. **Rule:** use **distinct names per branch** (`pageSpace`/`pageComma`) and coalesce in the extractor (`token.groups.pageSpace ?? token.groups.pageComma`). A grammar test asserts every pattern *compiles on the minimum supported Node*.
3. **Distinct `patternId` per structurally-distinct pattern.** The three `supra` patterns currently share `id:"supra"` with different group shapes, so a threaded token can't say which matched. Give them distinct ids (or thread the full matching pattern id) before migrating supra.
4. **Additive `Token` fields; typed access.** `groups`/`groupSpans` are optional (unmigrated extractors untouched — non-breaking). But extractors do **not** read the raw `Record` directly: a per-pattern `GroupName` string-literal union types the access, and a `requireGroup`/`optionalGroup` accessor centralizes the `CitationParseError` decline. This gives a compile-time contract instead of stringly-typed lookups.
5. **Token-relative offsets, built only for named-group patterns.** `groupSpans` stores `[start, end]` relative to token start (matches `spanFromGroupIndex(span.cleanStart, …)`). The tokenizer builds `groups`/`groupSpans` **only for patterns that declare named groups** — unmigrated positional patterns thread nothing, so PR 1 is genuinely zero-behavior and zero-cost.
6. **Delete the duplicate re-exec, keep the gate.** The twin's match/no-match gate is load-bearing validation (often in a *character class*, e.g. journal's `[A-Za-z.\s]` rejecting the apostrophe the broad pattern admits — the #881 KELLEY decline). Migration re-expresses that **accept/reject gate** as explicit checks on the threaded groups, declining via `CitationParseError`. Residual structuring (reporter whitespace-trim, nominative split, comma/space coalescing) stays in the extractor.
7. **Incremental, characterization-test-first rollout**, case + short-form productions first (the critical path to B → C). The real-opinion corpus is necessary **but not sufficient** (§7); the unit suite + seeded blind spots are the real net.

## 4. The `Token` shape & threading rules

`src/tokenize/tokenizer.ts`:

```ts
export interface Token {
  text: string
  span: Pick<Span, "cleanStart" | "cleanEnd">
  type: Pattern["type"]
  patternId: string
  /** Named capture groups from the matching pattern (absent/non-participating groups omitted). */
  groups?: Record<string, string>
  /** Token-relative [start, end] per participating named group. */
  groupSpans?: Record<string, [number, number]>
}
```

**Threading rules (in `tokenize()`), all mandatory:**
- Only build `groups`/`groupSpans` when the pattern declares named groups; otherwise leave both `undefined`.
- Null-guard `match.indices?.groups` (it is `undefined` when a pattern has zero named groups).
- A non-participating named group is `undefined` in both `match.groups` and `match.indices.groups` (the `lib.es2022` type `{ [k]: [number,number] }` is **unsound** — it omits `| undefined`). **Skip undefined entries** — omit the key rather than store `[NaN, NaN]`. Hence the field types above omit absent keys, and consumers handle missing keys via the accessor (decision #4).
- Convert each participating group's absolute offset to token-relative: `[absStart - match.index, absEnd - match.index]`.

Patterns are authored with the `d` flag (for `match.indices`) in addition to the existing `g`. PR 1 adds `d` to **all 101 `orderedPatterns`** entries (none carry it today) and threads.

## 5. Data flow

```
Pattern (broad; named groups; /gd)
        │  matchAll over cleanedText
        ▼
Token { …, groups, groupSpans }            ← built once, only for named-group patterns
        │  no duplicate re-exec
        ▼
Extractor: read groups via typed accessor (requireGroup/optionalGroup)
           re-express the twin's accept/reject GATE → CitationParseError on failure (#881)
           apply residual structuring (reporter trim, nominative split, comma/space coalesce)
           build component spans from groupSpans (token-relative)
           [out-of-token lookahead for pincite/year/court is UNCHANGED]
```

## 6. The named-group contract, the broad-vs-strict subtlety, and the A/B line

Group **names** are the per-pattern contract; a per-pattern `GroupName` union + accessor (decision #4) enforces "the extractor reads only declared groups" at compile time. The grammar-invariant test (§7) enforces the runtime parts.

**The load-bearing subtlety (the panel's top correctness point).** The twin regex does double duty — *extract* groups **and** *re-validate* (its gate rejects shapes the broad pattern admitted; that validation may live in a **character class**, a tighter **anchor/boundary**, or an **alternation**). Deleting the duplicate re-exec must not delete that gate. So migration of a pattern is: **(a)** add distinct-named groups to the broad pattern (a behavior change to the *match* only if a group becomes newly-capturing — guard it; naming an existing capture is behavior-preserving); **(b)** read groups via the accessor; **(c)** re-express the twin's accept/reject gate as explicit checks (e.g. re-validate `groups.journal` against `/^[A-Za-z.\s]+$/`), declining via `CitationParseError`; **(d)** delete the duplicate re-exec; residual structuring stays.

**The A/B line (scope hygiene).** A re-expresses only the twin's **accept/reject gate** (does this token parse at all?). A must **not** add normalization/interpretation the twin didn't already do inline — canonicalizing `USCA`→`U.S.C.`, classifying blank pages, splitting parties, building value objects are **B**. Reporter whitespace-trim that the twin already did (`caseCore.ts:66-76`) **moves with** the group read (it's load-bearing for the component span, which the corpus projection checks).

## 7. Testing & determinism (necessary-AND-sufficient, not corpus-alone)

The corpus alone is an **insufficient** oracle — proven: it has zero SCOTUS-nominative cases across 127 opinions, so dropping `nominativeReporter` stays corpus-green (the #878 blind-spot lesson). Required artifacts per migrated pattern/extractor:

1. **Characterization test FIRST.** Before any change, write + commit a test asserting the *current, unchanged* extractor's **full output on a fixed adversarial input table** — every metadata field (explicitly incl. `nominativeVolume`, `nominativeReporter`, `hasBlankPage`, pincite/year), **exact component spans (clean + original)** on trim-exercising inputs (reporter with leading/trailing space, comma-form, abutting punctuation), and the **decline set** (the inputs that currently throw `CitationParseError`). This is the equivalence oracle; it must stay green through (a)–(d).
2. **Accept/reject parity, both directions.** Where the old twin matched, threaded groups produce the same parsed values; where the old twin **declined**, the migrated extractor **still declines**. Wire the existing decline tests in by name to the "must stay green at every step" set: `tests/extract/issue881ExtractorDecline.test.ts`, `issue881ExtractorSentinel.test.ts`, `issue881PropagateGenuineErrors.test.ts`, plus `extractCase.test.ts` (nominative cases, ~:2057) and `caseCore.test.ts`.
3. **Seed the corpus blind spots NOW** (`scripts/corpus/seeds.ts`, negative ids), before migrating their productions: a SCOTUS nominative cite (`5 U.S. (1 Cranch) 137 (1803)` → asserts `nominativeReporter`); a comma-form case cite (exercises the alternation branch); each `supra` variant (party/note/pincite shapes); an apostrophe/ampersand journal-shaped input that must decline.
4. **Grammar-invariant test** (extends `grammarOrder.test.ts`): every `orderedPatterns` regex (i) **compiles on the minimum supported Node** (a `new RegExp(src, flags)` smoke test — catches the duplicate-name break before CI's Node 18/20 legs), (ii) carries `g` and `d`, (iii) uses **no duplicate named group**, (iv) for migrated patterns, the extractor's read-set ⊆ the pattern's declared group-set.
5. **Corpus snapshot** stays green at every step (the cross-distribution regression net) — necessary, not sufficient.
6. **Determinism + a perf budget.** Extraction stays pure; the corpus determinism meta-test gains a wall-clock budget on the largest opinion (threading is ~4–5× the matchAll-iteration cost per token; building groups only for named-group patterns keeps PR 1 free, but guard against regressions on large OCR inputs).

## 8. Migration strategy

1. **PR 1 — threading substrate (zero behavior change).** Add the two `Token` fields; add `d` to all 101 patterns; thread `groups`/`groupSpans` **only for named-group patterns** (none yet → no-op); add the typed-accessor scaffolding (`requireGroup`/`optionalGroup`); add the grammar-invariant test (compiles-on-min-Node, `g`+`d`, no-dup-names). Lock the Node-floor decision (decision #2). Full suite + corpus unchanged.
2. **Per pattern/extractor (case + short-form first), each its own PR:** characterization test first (§7.1) → add distinct-named groups to the broad pattern (guard if a capture is newly-participating) → extractor reads via accessor → re-express the accept/reject gate → delete the duplicate re-exec → suite + corpus + named decline tests green → changeset. **Never** fold "change the pattern" and "delete the twin" into one step.
3. **Interim invariant:** any *new* pattern authored after PR 1 must thread (no new twins), so the threaded-fraction grows monotonically even while the long tail is unconverted.

## 9. Scope: what is threadable

| Class | Productions | A's reach |
|---|---|---|
| **Threadable (core terminals)** | case core, `supra`/`Id.`/short-form case, journal, neutral, federal register, federal/state rules, restatement, … | Thread the anchor groups; delete the duplicate re-exec; keep gate + lookahead |
| **Partially threadable (shell only)** | statute family (~44 patterns) | Thread `title/code/§ section` shell; the locator decomposition (`section`/`subsection`/`sectionRange`) stays in `parseBody.ts` — do NOT encode subsection chains as named groups (ReDoS risk) |
| **Not threadable by construction** | `regulation` (synthesized by re-typing a CFR `statute` token — no pattern of its own); the `detectBareSectionLists`/`detectBarePartyBackReferences` synthesized citations | Out of scope for A |

Only **token-bounded core** terminals thread; per-production lookahead that reads `cleanedText` beyond the token (pincite/year/court in journal, neutral, fed-register, statutesAtLarge, docket, short-forms) **remains**. The close-out condition is "every *threadable* twin's duplicate re-exec is gone," not "all productions."

Rollout order: PR 1 (substrate) → case core + supra/Id/short-form (unblocks B) → journal/neutral/fed-reg/rules → statute shell (opportunistic). Partial completion is shippable.

## 10. Relationship to the larger slice & the case-name seam

- **A (this spec)** ≈ #844 remainder — clean, named, span-bearing **anchor** terminals (volume/reporter/page/pincite).
- **B (next spec)** ≈ #846 (value-object design-lock) + #852 — models `Reporter`/`Volume`/`CaseName`/`Party` as value objects (value + normalized + span) and **emits the case-name terminals the resolver needs**.
- **C (final spec)** ≈ #876 — deletes `DocumentResolver`'s three prose scans in favor of B's terminals; guarded by the corpus + the #878 seed.

**The seam to note (panel finding):** A→B is *direct only for the anchor terminals* (reporter/volume/pincite come from the volume-reporter-page pattern, so `token.groups.reporter` + `token.groupSpans.reporter` feed B's `Reporter` value object directly). But the **case-name** terminals C ultimately needs are produced by the **backward case-name scanner** (`caseNameScanner.ts`), *not* the anchor pattern — A cannot thread them. So "B emits case-name terminals" is a B-scope problem (the scanner must emit them); A→B→C is a straight pipe for reporter/volume/pincite but **not** for case names. B's spec must own that.

## 11. Risks

- **Duplicate-named-group module-load crash on Node 18/20 (HIGH).** Mitigation: decision #2 (distinct branch names + coalesce) + the §7.4 compiles-on-min-Node grammar test. Surfaces on the *first* (case) migration — must be honored from PR 2.
- **Silent gate loss → #881 re-opens / fields dropped (HIGH).** The twin's validation is often a char-class or non-capturing group (e.g. nominative). Mitigation: §6(c) re-express the gate; §7.1–7.3 characterization + decline-parity + nominative seed.
- **Corpus blind spots (HIGH, the #878 lesson).** Mitigation: corpus is necessary-not-sufficient; unit characterization tests + seeded blind spots are the real net (§7).
- **`match.indices.groups` undefined → `TypeError` (MED).** Mitigation: §4 skip-undefined + null-guard threading rules.
- **Weak stringly-typed contract (MED).** Mitigation: per-pattern `GroupName` union + accessor (decision #4).
- **Span drift from un-migrated trim normalization (MED).** Mitigation: §6 — trim moves with the group read; characterization test asserts exact spans.
- **Perf (LOW-MED).** ~4–5× matchAll-iteration cost per token; mitigation: build groups only for named-group patterns + a perf budget (§7.6). Not "negligible."
- **Mixed-idiom longevity (LOW).** The long tail may stay twin-based; mitigation: the interim no-new-twins rule (§8.3).

## 12. What changed in v2 (post-panel)

Hardened after a four-lens review (compiler-architecture, regression/behavior-preservation, refactoring/API, TS/regex-mechanics), which validated the direction but found: the **Node-18/20 duplicate-named-group crash** (now decision #2 + §7.4 guard); the **N-patterns→1-extractor topology** (decision #1, #3); **"delete the duplicate re-exec, not the twin"** (decision #6, §6); the **corpus-insufficient oracle + seed-now + full-field/decline-parity tests** (§7); the **typed group contract** (decision #4); the **undefined-group-index** threading rules (§4); **scope honesty** for statute/regulation/lookahead (§9); **101 patterns / 0 with `d`** and the **lazy-build perf** fix (§4, §7.6); **characterization-test-first** ordering (§8); and the **case-name seam** (§10).
