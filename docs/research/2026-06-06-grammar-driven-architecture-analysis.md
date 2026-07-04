# Grammar-Driven Architecture Analysis — eyecite-ts

**Date:** 2026-06-06
**Type:** Architecture analysis / orientation (point-in-time snapshot, not a literature report)
**Subject:** The whole extraction + resolution pipeline (`src/clean`, `src/tokenize`, `src/patterns`, `src/extract`, `src/types`, `src/resolve`, `src/footnotes`), viewed as a formal grammar.
**Method:** Applied the `grammar-driven-design` skill (Fowler Semantic Model, Moonen island grammars, Parr grammar→architecture, Ford PEG ordered choice, Dragon Book CST/AST, Evans/Vernon aggregate design). Five parallel exploration agents mapped the lexer/terminals, case productions, non-case productions + orchestrator, the type system, and resolution; this doc synthesizes them.
**Snapshot note:** All file:line references reflect source as of 2026-06-06 and **will drift**. Re-verify against source before acting. Where this doc and `CLAUDE.md` disagree (e.g. `maxLookAhead`), the code is authoritative.

---

## The one-line version

eyecite-ts is a **well-built island grammar with a clean per-citation CST→AST core**, but it contains a **second, unacknowledged grammar** — the recursive, tree-shaped grammar of citation *groups* (parallel cites, string cites, history chains, nested parentheticals, short-form references). That second grammar has no nonterminals, no types, and no parser; it lives only as ~18 imperative mutation passes over a flat `Citation[]` array, stitched together by array-index back-pointers and string join-keys. Almost every significant architectural divergence flows from that one missing abstraction — plus a related choice to resolve pattern **priority by post-hoc deduplication instead of ordered choice**.

## The thesis: two grammars, one acknowledged

1. **The per-citation grammar** — `CaseCitation`, `StatuteCitation`, `ConstitutionalCitation`, … Recognized and modeled explicitly. `extractCase.ts` is a textbook parse-syntax → interpret-semantics → apply-to-draft → finalize pipeline. **Healthy.**

2. **The inter-citation grammar** — the grammar of citation *groups*. Recursive and tree-shaped, and **nowhere named**. It exists only as post-processing passes (`extractCitations.ts:548-622`).

The skill's step 1 names this exactly: *"Look at post-processing steps (grouping, linking, deduplication) — these reveal higher-level productions the code discovered empirically but never named."* The mutation passes **are** that unnamed grammar.

---

## 1. The Grammar

### 1a. Top-level: a deliberate island grammar

```pegjs
(* Water is never materialized — gaps between island matches are skipped at zero cost. *)
Document    ← Clean Tokenize Disambiguate Extract PostProcess* Resolve?
TokenStream ← (Island / Water)*           (* tokenizer.ts:100-127 *)
Island      ← Token(type, patternId, cleanSpan, text)
Water       ← anything no Island matches  (* implicit *)
```

Intent is documented in-code: `tokenizer.ts:9-13` ("Tokenization is intentionally broad — it finds potential citations without validating them"); echoed in `casePatterns.ts:4-12`, `statutePatterns.ts:6-7`.

### 1b. The disambiguation "grammar" (currently NOT in the grammar)

`tokenize()` does **not** implement ordered choice — it runs every pattern's `matchAll` and **unions** the results (`tokenizer.ts:100-116`), so overlaps are pervasive. Priority is recovered *afterward* by a two-pass O(n²) subsumption dedup keyed on each pattern's index in a hand-ordered array (`extractCitations.ts:259-276`, `309-381`):

```pegjs
(* What the code does today — priority = array order + geometric dedup: *)
priority(token)  ← firstIndexOf(token.patternId, allPatterns)              (* :309-315 *)
ContainmentPass  ← drop t if ∃ kept ⊇ t  ∧  priority(kept) ≤ priority(t)  (* :320-346 *)
OverlapPass      ← drop t if ∃ kept ⋈ t  ∧  priority(kept) <  priority(t) (* :361-381 *)

(* What a PEG would say instead — priority IS the grammar: *)
Citation ← Neutral / SessionLaw / Treaty / … / FederalStatute / Case / … / Journal
```

`allPatterns` is hand-tuned "most specific → least specific" with issue-numbered comments (federal statutes hoisted above `case` so `42 USC 1983` isn't a phantom reporter, #428; `journal` last because broadest). The ordering is load-bearing but **invisible to the grammar**. This is the skill's anti-pattern: *encode priority in the grammar, not in code.*

One place gets it right: the data-table builder sorts code-name alternatives longest-first "for PEG-style ordered choice" (`stateStatutes.ts:68-69`) — intra-pattern ordered choice. The gap is purely *inter*-pattern.

### 1c. The inter-citation grammar (the unnamed one — the central gap)

No nonterminal, no type, no parser. Each production is reconstructed by a named mutation pass. Writing them down is the most valuable artifact here:

```pegjs
CitationGroup  ← StringCitation / ParallelGroup / HistoryChain / SingleCite

(* "See A; B; C" — one proposition, ordered children *)
StringCitation ← Signal? Citation (';' Citation)+
                 ⇒ detectStringCites.ts     (groupId + index + size scalars on each child)

(* "410 U.S. 113, 93 S. Ct. 705, 35 L. Ed. 2d 147" — one case, N reporters (a tree) *)
ParallelGroup  ← CaseName Core (',' Core)+ MetadataParen
                 ⇒ detectParallel.ts + inheritParallelCaseName()
                   (groupId string-key + lossy parallelCitations[] value-copies)

(* "Smith, aff'd, X, cert. denied, Y" — a linked list of cases *)
HistoryChain   ← Citation (HistorySignal Citation)+
                 ⇒ linkSubsequentHistory() + inheritSubsequentHistoryCaseName()
                   (subsequentHistoryOf.index array back-pointer + manual `order` field)

(* "(quoting Doe v. City, 100 F.2d 1)" — a citation NESTED in a parenthetical *)
CitingParen    ← '(' SignalWord Citation ')'
                 ⇒ NOT IMPLEMENTED — collapsed to Parenthetical.text: string (recursion LOST)

(* "Smith, supra" / "Id. at 4" / "100 F.2d at 200" ⇒ full antecedent *)
ReferenceLink  ← ShortForm  ⇒  Citation
                 ⇒ DocumentResolver (resolvedTo / antecedentIndex array indices)
```

The codebase has felt this gap:
- `extractCitations.ts:875-879` — a **Union-Find tree for history chains was tried and removed** (over-collapsed second-tier history). The scar of wanting a tree.
- `citation.ts:328-332` — `subsequentHistoryOf.index` "becomes invalid if the array is filtered or reordered."
- `inheritSubsequentHistoryCaseName` needs **fixed-point iteration** (`while (mutated)`, `:925`) because the flat array has no guaranteed parent-before-child order. A tree traversal would be O(n) and order-independent.

### 1d. Per-citation productions (the acknowledged grammar)

`CaseCitation` — recognized by a **backward + forward scan around the volume-reporter-page anchor island**, not a single left-to-right derivation:

```pegjs
CaseCitation   ← Signal? CaseName? Separator CitationCore Pincite? ParenChain*
                                                  (* assembled by extractCase.ts:98-236 *)
CitationCore   ← Volume WS Reporter (WS Nominative)? WS Page &Boundary   (* caseCore.ts:30 — THE ISLAND *)
Volume         ← Digits ('-' Digits)?                                    (* number | hyphenated-string *)
Page           ← (Digits '-' Digits) / Digits / BlankPage                (* '___' / '---' = blank *)
CaseName       ← VStyleName / ProceduralName / SinglePartyName           (* caseNameScanner.ts, backward scan *)
VStyleName     ← Party WS 'v' '.'? WS Party (',' / '(' Court? Year ')')
ProceduralName ← ProceduralPrefix WS PartyBody (',' / '(' …')')          (* ~80 prefixes, longest-first *)
Pincite        ← Sep ('at' WS)? PagePrefix? PinciteBody AddlPincite* &Terminator
ParenChain     ← (HistorySignal? Parenthetical)*                         (* caseParentheticals.ts:334 *)
Parenthetical  ← ExplanatoryParen / MetadataParen
MetadataParen  ← '(' Date? Court? InternalHistory? JusticeAttribution? Disposition? ')'
```

The `&Boundary` lookahead on `Page` (`caseCore.ts:30`) is the defining PEG-anchored trait. The other ~22 types follow the same recognizer-regex + re-deriving-extractor shape:

| Type | Anchor terminal | Notable structure |
|------|----------------|-------------------|
| `statute` | `§` / code name | *Family* of ~45 jurisdiction productions under one `type`; `section`/`subsection`/`sectionRange` split by `parseBody.ts:78-192`, not regex |
| `regulation` | `C.F.R.` | **No pattern, no dispatch** — produced only by re-typing a CFR `statute` token (`extractFederal.ts:129`) |
| `constitutional` | `Const.` | 12 patterns; Roman/ordinal numerals; `(now …)` reform sub-production → `currentLocation` |
| `neutral` | plausible-year | `WL`/`LEXIS`/`BL` route to `database`; real court recovered from trailing `(court date)` |
| `federalRule` / `stateRule` | `Fed. R.` / state abbrev | `ruleSet`/`jurisdiction` table-driven by `patternId`, not parsed from text |
| `treatise` / `journal` (bare) | closed allowlist | The closed vocabulary *is* the false-positive guard |

### 1e. Short-form / reference productions

```pegjs
Id            ← Boundary 'Id' ('.' / ',' &'at') (Connector Pincite)?     (* shortForm.ts:39 *)
Supra         ← PartyName? ','? WS 'supra' ('note' N)? (Connector Pincite)?
ShortFormCase ← (PartyName ',')? WS Volume WS Reporter ','? WS 'at' Pincite
```

All three — plus `ibid` — tokenize as `type: "case"` (`shortForm.ts:162-192`) and are re-typed only via a `patternId` switch (`extractCitations.ts:411-416`). Recognition does **not** resolve; the `⇒ antecedent` edge is the resolver's job (§1c).

---

## 2. Grammar Classification

**Island grammar, with a hybrid footnote sub-grammar.** Correct and embraced.

- **Islands**: ~75 regex productions across 15 pattern files → 17 token types. **Zero standalone terminal patterns** — Volume, Page, Reporter, `§`, year are inline capture groups *inside* productions, never lexed independently.
- **Water**: never represented; `matchAll` skips it. The clean stage is a *water-normalizer* — HTML stripping inserts boundary spaces so adjacent islands don't fuse (`cleaners.ts:30-34`, #542); `<script>`/`<style>` bodies are deleted so their contents don't become phantom islands (`cleaners.ts:60-61`, #559).
- **Hybrid footnote sub-grammar**: opt-in `detectFootnotes` runs a different grammar (HTML tag-scanner or plaintext separator/marker detector) on raw text *before* cleaning, producing zones that constrain resolution scope. Cleanly separated in `footnotes/`.

**Tolerance (the island-grammar acid test):** mostly good, two cracks.

- ✅ ReDoS discipline is excellent and consistent: no nested quantifiers; section/subsection chains are literal-anchored bounded repetitions `(?:\([^)]*\))*`; broad reporter runs are lazy and pinned by a mandatory trailing terminal. **This is the only real linear-time guarantee** and it's well-maintained.
- ⚠️ The tokenizer's `try/catch` "timeout protection" (`tokenizer.ts:100-124`) is **misleading** — catastrophic backtracking *hangs*, it doesn't throw, so the catch buys nothing. Real defense is the authoring discipline. Worth correcting the comment.
- ⚠️ Most extractors **throw** on parse failure (`extractJournal.ts:73`, `extractNeutral.ts:175`, `extractFederalRule.ts:106`) rather than dropping one island. Because tokenizer and extractor regexes are *separate* (§4), drift turns one malformed island into an exception that aborts the **entire** `extractCitations` call. An island grammar should tolerate the water — only `extractStatute` (legacy fallback) and `extractDocket` (returns `undefined`) currently do.

---

## 3. Type Mapping

| Grammar element | Should map to | Actually maps to | Verdict |
|-----------------|---------------|------------------|---------|
| **Nonterminal** | discriminated-union variant | `Citation` union, 23 variants, `assertUnreachable` | ✅ **1:1 and idiomatic** |
| **Terminal** | value object | raw `string`/`number` primitives | ❌ **primitive obsession** |
| **Recursive production** | recursive/tree type | flat arrays + index/string cross-refs | ❌ **flattened (the big one)** |
| **Cross-aggregate reference** | stable identity | positional array index | ⚠️ **fragile identity** |

### ✅ Nonterminals → union variants (healthy, but replicated 5×)

The 23-variant union is 1:1 — every `type` literal has an interface and vice versa. The defect is **inventory replication**: the nonterminal set is hand-maintained in five places (`CitationType`; `FullCitationType` + `ShortFormCitationType`; the `Citation` union; the `FullCitation`/`ShortFormCitation` unions; the `isFullCitation` guard). These have **already drifted** (verified): `isFullCitation` (`guards.ts:15-36`) checks 18 literals but the `FullCitation` *type* (`citation.ts:1340-1360`) has 20 members — the guard omits `"regulation"` and `"stateRule"`.

```ts
isFullCitation(someRegulationCitation)  // returns false…
                                        // …even though RegulationCitation ∈ FullCitation
```

A live latent bug: any consumer routing on `isFullCitation` silently drops regulation and state-rule citations. Textbook consequence of replicating a nonterminal inventory by hand.

### ❌ Terminals → value objects (pervasive primitive obsession)

**Zero branded types; only ~5 value objects** in the whole type system. The recurring shape is a "raw + normalized + inferred" triad exploded across parallel optional fields consumers must reconcile:

- **Reporter** = `reporter: string` + `normalizedReporter?` + `inferredCourt?: CourtInference`
- **Court** = `court?` + `normalizedCourt?` + `inferredCourt?`
- **Party** = `plaintiff?` + `plaintiffNormalized?` (+ on short-forms `partyName?` + `partyNameNormalized?` + `inferredPlaintiff?` …)
- **Volume** = `number | string` (the union *is* the missing value object)
- **Page** = `page?: number` + `hasBlankPage?: boolean` (two fields for one variant concept)
- **Section** = `section?` + `sectionRange?` + `sections?` (three shapes of one terminal)

The design *can* model value objects — `Span` (`span.ts:18`), `PinciteInfo`, `CourtInference`, `StructuredDate`, `SubsequentHistoryEntry` are well-formed. It does so for ~5 terminals and leaves ~10 as primitives. Even good `PinciteInfo` is shadowed by a redundant flat `pincite?: number` mirror, and `pincite` is type-overloaded across the union (`number` page-offset on cases, `string` subsection-chain on statutes, `citation.ts:524-528`). `componentSpans.ts` models each terminal's *position* (a `Span`) while its *value* stays a primitive on the parent — value and span live in two parallel structures zipped by field name.

### ❌ Recursion → tree (flattened — reported independently by 3 of 5 agents)

The headline type-level finding; mirrors §1c exactly. The tell-tale signal (skill names it precisely): fields that exist *only* to cross-reference within a flat array.

| Recursive production | Flat encoding | Cross-ref field(s) |
|----------------------|---------------|--------------------|
| Parallel group (tree) | `parallelCitations[]` lossy value-copies **+** shared `groupId` string | `groupId: "410-U.S.-113"` |
| History chain (linked list) | `subsequentHistoryEntries[]` + manual `order` | `subsequentHistoryOf.index` (documented-fragile) |
| Citing-parenthetical (tree) | **dropped** — stored as unparsed text | `Parenthetical.text: string` |
| Short-form reference (tree) | side-channel `resolution` | `resolvedTo` / `antecedentIndex` indices |
| Pincite inheritance | flat flags | `pinciteInheritedFrom: number` |
| String citation (tree) | three scalars smeared on each child | `stringCitationGroupId/Index/GroupSize` |

The citing-parenthetical case is most severe: not flattened but *lost* — `(quoting Doe v. City, 100 F.2d 1)` keeps the nested citation only as opaque `text`, producing no child node.

### ⚠️ References → identity (positional, not stable)

Resolution correctly references antecedents by identity not containment (DDD Rule 3) — good. But identity is a **positional array index** into `citations[]` (`resolve/types.ts:87-106`), the most fragile possible identity; the docstrings themselves warn it breaks under filter/reorder. The repo just added W3C-style durable locators (commit `2674a6b`), but resolution links don't use them — still raw indices. There is no stable `id` on `CitationBase`.

---

## 4. Pipeline Design (Dragon Book four stages)

| Stage | Transform | Status |
|-------|-----------|--------|
| **1. Lex / tokenize** | text → tokens (`clean` + `tokenize`) | ✅ broad & tolerant, correct island separation |
| **2. Parse / structure** | tokens → CST | ⚠️ **split brain** (see below) |
| **3. Transform** | CST → AST / semantic model | ✅ per-citation; ❌ inter-citation |
| **4. Interpret** | AST → derived links (`resolve`) | ✅ clean phase, but re-parses prose |

**Bright spot — per-citation Stage 2→3 is exemplary.** `extractCase.ts:113-235` is the model the rest of the codebase should follow: every `parse*`/`extract*` returns raw CST nodes with integer `RawSpan`s; every `interpret*` returns semantics with resolved `Span`s; every `apply*` is a pure reducer `(draft, semantics) → draft`; one `finalize` projects the `CaseCitationDraft` IR to output. A genuine CST→AST transformation with a real intermediate representation.

**The gap — the CST is discarded twice** (both symptoms = skipping the IR):

1. **At the token boundary.** The lexer keeps only `match[0]`, discarding capture groups. Every extractor re-runs a *separate non-global twin regex* on `token.text` to recover structure (`extractStatute.ts:67`, `CANON_RE`, `CONSTITUTIONAL_BODY_RE`, …). Two regexes per production kept in lockstep by hand — when they drift, §2's thrown-exception problem fires.
2. **At resolution.** The interpreter drops back to regex over raw prose to recover terminals extraction already computed: 80-char window re-tokenized for case-name mismatch (`DocumentResolver.ts:703-748`), 400-char `Party v. Party` re-extraction (`:1211-1304`), 20-char `§`-peek for case-vs-statute family (`:380-385`).

**Mutation-phase proliferation** is the result of no inter-citation IR: `extractCitations.ts` is 1,881 lines, mostly ~18 issue-numbered passes that mutate the flat array in place and re-sort after each; several *synthesize* new citations the tokenizer never produced (`detectBareSectionLists`, `detectBarePartyBackReferences`). The skill predicts this exactly.

**Minor drift noticed:** `CLAUDE.md` says `maxLookAhead=20`, but `cleanText.ts:191` now uses dynamic `max(40, Δlen+10)`. Two divergent paren-depth engines exist — `computeBracketScopes` (resolver) vs. `computeParenDepths` (graph builder) — which can disagree on the same document.

---

## 5. Architecture Alignment Audit

| Dimension | Alignment | Evidence |
|-----------|-----------|----------|
| Island/water separation | ✅ Strong | Deliberate, documented, hardened against fusion |
| Per-citation CST→AST (case) | ✅ Exemplary | `extractCase.ts` parse/interpret/apply/finalize |
| Nonterminal → union | ✅ Good (1:1) | …inventory replicated 5×, already drifted |
| ReDoS / linear-time terminals | ✅ Strong | No nested quantifiers, anchored repetition |
| Ordered choice (priority) | ❌ Diverges | Union + O(n²) post-hoc dedup, not PEG choice |
| Recursion → tree | ❌ Diverges | All 5 recursive relations flattened |
| Terminal → value object | ❌ Diverges | Primitive obsession, raw/normalized/inferred triads |
| Inter-citation grammar | ❌ Absent | ~18 mutation passes, no nonterminal/type/parser |
| Reference identity | ⚠️ Fragile | Positional array index, not stable id |
| Tolerance | ⚠️ Mixed | Extractors throw; misleading "timeout" comment |

### Prioritized divergences (impact × how directly the grammar points at the fix)

1. **Name the inter-citation grammar; give it types and a builder.** Introduce `ParallelGroup`, `HistoryChain`, and a recursive `Parenthetical` (with optional child `Citation`) as real aggregates referenced by stable identity. Collapses the ~18 mutation passes into tree construction; kills the fragile `subsequentHistoryOf.index` / `groupId` / `nextParentheticalIndex` cross-refs; removes the fixed-point iteration; recovers the *lost* recursion in citing-parentheticals. **Highest impact;** §1c is the blueprint.
2. **Move priority into recognition (ordered choice).** Make disambiguation a first-class grammar artifact, or replace the O(n²) dedup with a real ordered-choice scan. At minimum, lift `allPatterns` ordering out of `extractCitations.ts` into one authoritative grammar definition the tokenizer owns (today the tokenizer's own default list is incomplete/dead, `tokenizer.ts:86-96`).
3. **Introduce value objects for high-traffic terminals** — `Reporter` (owning raw/normalized/inferredCourt), `Volume` (numeric-or-hyphenated), `CaseName`/`Party` (raw/normalized/inferred), `Section`. Co-locate value + span. Dissolves the triad sprawl and the §2 throw-on-drift risk.
4. **Stop re-parsing in the resolver; thread the CST forward.** Preserve capture groups tokenize→extract (kill twin-regex duplication); emit resolver-needed terminals onto the aggregate during extraction.
5. **Fix the concrete drift + guard it.** Add `"regulation"` and `"stateRule"` to `isFullCitation` (`guards.ts:34`), and derive the runtime guard from a single source so it can't drift again. Per the project's belt-and-suspenders standard, add a dedicated test asserting `isFullCitation` agrees with the `FullCitation` type for *every* `FullCitationType` literal.

---

## Bottom line

The hard, central machinery is right and the ReDoS discipline is genuinely good. The divergences cluster around **one missing abstraction**: the recursive, tree-shaped *inter-citation grammar* the code discovered empirically and implemented as flat arrays + index cross-references + ~18 mutation passes, never naming it. Making that grammar explicit (#1) is the keystone refactor — it directly resolves the flattened-recursion type smell, the mutation-phase proliferation, and the fragile-identity references in one move. Ordered choice (#2) and value objects (#3) are independent, lower-risk improvements the same lens points straight at.
