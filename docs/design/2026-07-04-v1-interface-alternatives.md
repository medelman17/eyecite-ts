# eyecite-ts v1.0.0 — four candidate public interface designs (design-it-twice)

Generated 2026-07-04. Constraint per design: A = minimize interface; B = maximize flexibility;
C = optimize for common caller; D = design the result model first.

**Status: resolved.** The shipped design is a hybrid (see `docs/v1-spec.md`): D's IR skeleton + A's function-surface discipline + C's helpers as pure functions + B's ReporterSource seam only, with the rest of B recorded as the deferred extension blueprint (ADR 0001). This document preserves the alternatives and reasoning so future revisions don't re-derive them.

## Fork-by-fork decision log (grilled 2026-07-04)

| Fork | Decided | Rejected (and why) |
|---|---|---|
| Result carrier | Pure-data IR + optional `CitationView.from(doc, text?)` wrapper | Methods-on-document (breaks JSON rehydration — C's own confessed thin spot); pure-data-only (loses ergonomics for no gain, since the view is opt-in) |
| Taxonomy | 4 families × fine kinds (two-level discriminant) | Flat 12 kinds + form fields (load-bearing distinctions demoted to optional-feeling fields; adding a kind breaks every switch); near-0.x granularity (preserves the 18-interface maintenance surface the field-clustering evidence indicts) |
| Relationships | Document-level edges/groups canonical + denormalized `refersTo` mirror (validator-enforced) | Pure inline fields (n-ary facts duplicated per member); pure edges (the one-hop everyone wants shouldn't need a scan) — ADR 0003 |
| Ids | Content hash of (kind \| span \| matchedText), branded | Sequential (any edit renumbers the tail); span-free hash + ordinal (stability rule too subtle to promise) — ADR 0004 |
| Invariants vs knobs | Resolution invariant (no knob); footnotes default-on with `footnotes: false` as sole behavioral escape | Both invariant (a footnote false-positive zone changes id. scoping with no caller-side remedy); both optional (four behavior matrices, one of which anyone wants) |
| Text in IR | `textHash` only; `annotate(text, doc)` verifies loudly | Embedded text (multi-MB duplication in every persisted document); nothing (wrong-text detection late and probabilistic) — ADR 0002 |
| Entry points | Compact core + `/reporters` + `/schema` | Single entry, no seam (no accuracy tier, no caller-side test fakes); heavy-core + `/lite` (size gate would sit on the entry nobody imports) |
| Confidence | Categorical `{level, reasons}`; `score` reserved pending calibration artifact | Bare number (five miscalibration incidents); full struct with uncalibrated score (consumers threshold on numbers regardless of caveats); none (resolver's graded abstention signals are load-bearing) — ADR 0005 |

---

# DESIGN A — Minimal Interface

# eyecite-ts v1.0.0 — Minimal Public Interface

**Two entry points. Zero required options.** One deep module (`extract`) that owns the entire pipeline — clean, tokenize, extract, resolve, footnote detection — and one companion (`annotate`) that consumes its output. Everything else is implementation behind the seam.

---

## 1. Interface

```ts
// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINT 1 of 2
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract, resolve, and structure every legal citation in `text`.
 *
 * INVARIANTS (these are the interface — there are no knobs behind them):
 * - Total function: never throws for any string input; returns an empty
 *   Extraction for text with no citations. Non-string input → TypeError.
 * - All positions are offsets into the caller's ORIGINAL `text` (UTF-16 code
 *   units, end-exclusive). HTML/Markdown/Unicode cleanup happens internally;
 *   no cleaned-text coordinate system exists in the interface.
 * - Markup handling is automatic: HTML tags, entities, smart quotes, and
 *   Markdown emphasis are neutralized before matching. No cleaner config.
 * - Short-form resolution (id., supra, short-form case → antecedent) is
 *   ALWAYS ON: it is pure, deterministic, and cheap, so it is an invariant,
 *   not an option. Unresolvable short forms simply have `refersTo` unset.
 * - Footnote zone detection is ALWAYS ON: a no-op on texts without footnote
 *   markers, and it improves resolution scoping when zones exist (id. never
 *   crosses out of its footnote zone; supra may reach the body).
 * - `citations` is sorted by `span.start` asc (ties: wider span first) and
 *   contains EVERY citation found, including ones nested inside explanatory
 *   parentheticals (those carry `hostId`). One flat array, one ordering rule.
 * - The result is plain, acyclic, JSON-serializable data. Cross-references
 *   use `CitationId`, never array indexes, so the result survives caller
 *   filter/sort/map.
 * - Complexity is O(n) in text length with bounded backtracking (no ReDoS).
 * - Same input ⇒ same output (no randomness, no clock, no I/O).
 */
export function extract(text: string): Extraction;

/**
 * ENTRY POINT 2 of 2 — wrap citations in caller-supplied markup.
 *
 * INVARIANTS:
 * - Insertion-only: the returned string is `extraction.text` with `open`/
 *   `close` inserted around each rendered citation. Source characters are
 *   never altered, reordered, or escaped — the library introduces no XSS
 *   beyond what the caller's own markup contains.
 * - No transformation state crosses this seam: `extraction` carries the
 *   original text and original-text spans, so the caller passes nothing else.
 * - `render` is the single adapter slot: return markup to wrap, or `null`
 *   to skip a citation. Omitted → `<cite data-kind data-id>` default.
 * - `extent: "full"` wraps from case name through closing parenthetical when
 *   known, else falls back to the core span. Per-citation, decided where the
 *   variation actually lives — in the renderer — not as a global option.
 * - Overlaps resolve deterministically: nested spans nest; partial overlaps
 *   drop the lower-confidence wrap. Never emits malformed interleaving.
 * - RangeError iff `extraction.text`/spans were mutated out of agreement.
 */
export function annotate(extraction: Extraction, render?: Renderer): string;

export type Renderer = (
  citation: Citation,
) => { open: string; close: string; extent?: "core" | "full" } | null;

// ─────────────────────────────────────────────────────────────────────────────
// Result types (types are free, but each pays rent)
// ─────────────────────────────────────────────────────────────────────────────

export interface Extraction {
  /** The exact input string. `annotate` needs nothing else. */
  readonly text: string;
  readonly citations: readonly Citation[];
  /** Detected footnote zones, in original-text offsets. Empty if none. */
  readonly footnotes: readonly FootnoteZone[];
}

/** Half-open [start, end) offsets into `Extraction.text`. The ONLY position type. */
export interface Span { readonly start: number; readonly end: number }

export interface FootnoteZone { readonly span: Span; readonly number: number }

/** Opaque per-Extraction identity. Compare / key Maps with it; never parse it. */
export type CitationId = string & { readonly __brand: "CitationId" };

interface CitationCommon {
  readonly id: CitationId;
  /** Fine-grained discriminator — switch on this for type-safe field access. */
  readonly kind: CitationKind;
  /** Coarse discriminator: full authorities vs. back-references. */
  readonly form: "full" | "short";
  /** Core citation span ("500 F.2d 123"). */
  readonly span: Span;
  /** Case name → final parenthetical, when determinable. */
  readonly fullSpan?: Span;
  /** === text.slice(span.start, span.end). */
  readonly text: string;
  /** 0–1. Suspected false positives are ~0.1, never silently dropped. */
  readonly confidence: number;
  /** Footnote zone number, when inside one. */
  readonly footnote?: number;
  /** Bluebook signal ("see", "but see", "cf.", …). */
  readonly signal?: Signal;
  /** Set when this citation is nested in another's explanatory parenthetical. */
  readonly hostId?: CitationId;
  /** String-citation group (See A; B; C) — member ids in document order. */
  readonly citedWith?: readonly CitationId[];
  readonly parentheticals?: readonly Parenthetical[];
}

/** Short forms additionally carry their resolution. */
interface ShortFormCommon extends CitationCommon {
  readonly form: "short";
  /** Antecedent this resolves to; unset when resolution failed. */
  readonly refersTo?: CitationId;
  readonly pincite?: Pincite;
}

export type CitationKind =
  | "case" | "statute" | "regulation" | "constitution" | "courtRule"
  | "journal" | "treatise" | "restatement" | "annotation"
  | "publicLaw" | "sessionLaw" | "federalRegister" | "legislativeMaterial"
  | "treaty" | "ordinance" | "canon"
  | "id" | "supra";

export type Citation =
  | CaseCitation | StatuteCitation | RegulationCitation | ConstitutionCitation
  | CourtRuleCitation | JournalCitation | TreatiseCitation | RestatementCitation
  | AnnotationCitation | PublicLawCitation | SessionLawCitation
  | FederalRegisterCitation | LegislativeMaterialCitation | TreatyCitation
  | OrdinanceCitation | CanonCitation
  | IdCitation | SupraCitation | ShortCaseCitation;

/** One `case` kind subsumes today's case + docket + neutral via an inner
 *  discriminated `ref`, so "what cases are cited?" is one predicate. */
export interface CaseCitation extends CitationCommon {
  readonly kind: "case"; readonly form: "full";
  readonly ref:
    | { readonly style: "reporter"; readonly volume: number | string;
        readonly reporter: string; readonly page?: number }
    | { readonly style: "neutral"; readonly year: number;
        readonly identifier: string; readonly court?: string }
    | { readonly style: "docket"; readonly docketNumber: string };
  readonly caseName?: string; readonly plaintiff?: string; readonly defendant?: string;
  readonly court?: string; readonly year?: number; readonly pincite?: Pincite;
  /** Same case in parallel reporters — member ids incl. self, document order. */
  readonly parallel?: readonly CitationId[];
  /** Subsequent-history chain (aff'd, cert. denied, …), root → latest. */
  readonly history?: readonly { readonly id: CitationId; readonly signal?: string }[];
}

export interface ShortCaseCitation extends ShortFormCommon {
  readonly kind: "case";          // "Smith, 500 F.2d at 125"
  readonly volume: number | string; readonly reporter: string;
  readonly partyName?: string;
}
export interface IdCitation    extends ShortFormCommon { readonly kind: "id" }
export interface SupraCitation extends ShortFormCommon {
  readonly kind: "supra"; readonly partyName?: string;
}

export interface StatuteCitation extends CitationCommon {
  readonly kind: "statute"; readonly form: "full";
  readonly code?: string; readonly title?: number; readonly chapter?: string;
  readonly section?: string; readonly subsection?: string;
  readonly jurisdiction?: string; readonly year?: number;
  /* sectionRange, subsectionRange, etsSeq … as today, unchanged semantics */
}
/* RegulationCitation mirrors StatuteCitation with kind: "regulation".
   CourtRuleCitation merges today's federalRule + stateRule:
     { jurisdiction: "US" | <state>, ruleSet, rule, subsection }.
   SessionLawCitation merges statutesAtLarge (jurisdiction "US") + state forms.
   Journal/Treatise/Restatement/Annotation/PublicLaw/FederalRegister/
   LegislativeMaterial/Treaty/Ordinance/Canon/Constitution: field sets carried
   over from 0.x, spans replaced by the single original-text Span. */

export interface Parenthetical {
  readonly text: string; readonly span: Span;
  readonly category?: "holding" | "quoting" | "citing" | /* … */ "other";
  /** Ids of citations nested inside (also present in Extraction.citations). */
  readonly citationIds?: readonly CitationId[];
}
export interface Pincite { readonly page?: number; readonly endPage?: number;
  readonly section?: string; readonly footnote?: number }
export type Signal = "see" | "see also" | "cf." | "but see" | /* … */ "contra";
```

## 2. Usage

**(a) Common case — 3 lines:**
```ts
import { extract } from "eyecite-ts";
const { citations } = extract(opinionText);
const cases = citations.filter((c) => c.kind === "case" && c.form === "full");
```

**(b) Advanced — annotation + resolution + footnotes, still zero config:**
```ts
import { extract, annotate } from "eyecite-ts";

const doc = extract(briefHtml);                       // resolution + footnotes: always on
const byId = new Map(doc.citations.map((c) => [c.id, c]));

const html = annotate(doc, (c) => {
  if (c.confidence < 0.5) return null;                // skip suspected false positives
  const target = c.form === "short" && c.refersTo ? byId.get(c.refersTo) : c;
  if (!target || target.kind !== "case") return null;
  return { open: `<a class="${c.footnote ? "fn-cite" : "cite"}"
                     href="/case/${encodeURIComponent(target.text)}">`,
           close: "</a>", extent: "full" };
});
```
Note what the caller never touches: no cleaner chain, no `TransformationMap`, no `resolve: true`, no `ResolvedCitation` second return shape, no `detectFootnotes` flag, no scope strategy, no annotation escape/`useCleanText` flags.

## 3. Hidden behind the seam

| 0.x public concept | v1 fate |
|---|---|
| `cleanText`, `tokenize`, `extractCase`…, patterns, cleaners options | Implementation. Internal seams remain for the module's own tests, not the interface. |
| `Span{cleanStart,cleanEnd,…}`, `TransformationMap`, `spanFromGroupIndex` | Deleted from the interface; dual coordinates are implementation. Public `Span` = original offsets only. |
| `DocumentResolver`, `resolveCitations`, `ResolutionOptions`, `ScopeStrategy`, `ResolvedCitation` | Invariant behavior inside `extract`; surfaced as one field, `refersTo`. |
| `detectFootnotes()`, `FootnoteMap` | Always-on; surfaced as `Extraction.footnotes` + `citation.footnote`. |
| `AnnotationOptions` (template/callback/escape/fullSpan flags), `AnnotationResult.positionMap` | Collapsed into the `Renderer` adapter; insertion-only invariant replaces escaping knobs; positionMap cut. |
| `byId`, guards (`isFullCitation`…), `applyFalsePositiveFilters`, `filterFalsePositives` | Structural: `form` discriminator, `confidence`, and a caller-built `Map` replace all four. |
| `processTimeMs`, `patternsChecked`, `Warning[]`, index-based backrefs (`resolvedTo: number`, `subsequentHistoryOf.index`) | Deleted. Telemetry leaks and fragile positional coupling; ids only. |
| `eyecite-ts/data`, `/annotate`, `/utils` subpaths; `extractCitationsAsync`; `analyzeDocument` | Deleted. One subpath, two exports, sync only. |

## 4. Bundle / entry-point strategy

- **One package subpath (`"."`), two named exports.** `sideEffects: false`; ESM consumers who import only `extract` tree-shake `annotate` (small anyway — the weight is in the matcher tables, which `extract` owns).
- **Reporter database: demoted from entry point to build artifact.** A codegen step compiles reporters-db into compact matcher/normalization tables (regex alternations + normalization map); descriptive metadata that extraction never reads (publishers, edition date ranges, URLs) is *not shipped at all*. Laziness by subtraction beats laziness by dynamic import: `extract` stays synchronous, and the size-limit gate on the single entry replaces the old "keep `/data` out of core" discipline. Court inference keeps its curated static table, independent of the DB.
- **No `/data` public surface**: nothing in the v1 interface returns or accepts reporter records, so the DB can be recompiled, split, or swapped without a breaking change — locality for maintainers.

## 5. Trade-offs

**High leverage.** `extract` is maximally deep: one signature, no options, and behind it sit cleaning, ~20 citation kinds, parallel/history/string-cite grouping, resolution, and footnote scoping. Depth here is exactly leverage — every capability added later (new reporters, new kinds, better resolution) reaches every caller through the same one-line call, and the corpus snapshot suite tests through this same seam (the interface is the test surface). Locality: resolution-quality bugs, cleaner bugs, and taxonomy fixes are all internal changes. Id-based, plain-data results make the whole Extraction cache-, worker-, and JSON-safe.

**Thin spots.**
- *No escape hatches.* Callers who tuned `partyMatchThreshold`, supplied custom cleaners/patterns, or wanted `filterFalsePositives: true` now get invariants and a `confidence` field. If two real adapters ever appear for cleaning or resolution policy, that is the signal to open a seam — one hypothetical customer is not (one adapter means a hypothetical seam).
- *Always-on resolution/footnotes* costs a few ms on huge documents for callers who only want spans. Accepted: it deletes two knobs and a dual return type.
- *`annotate` lost `positionMap`*; consumers maintaining external indexes must re-derive offsets (renderer-embedded anchors make this easy, but it is work moved across the seam).
- *Kind consolidation* (case⊇docket/neutral; courtRule; sessionLaw) simplifies the common predicate but adds one inner discriminator (`ref.style`) callers must learn for reporter-specific fields.
- *Hardest thing this design makes:* streaming/incremental extraction and per-stage interception (e.g. "give me tokens"). Those would be new entry points in a hypothetical `eyecite-ts/pipeline` — deliberately out of v1, purchasable later without disturbing this interface.

---

# DESIGN B — Maximum Flexibility

# eyecite-ts v1.0.0 — Public Interface Design

One deep module: `extract()` in, `CitationDocument` out. The document object is the whole story for common callers — positions, resolution, and annotation all live behind it. Extension is a second, lower door (`createExtractor`) that the common caller never opens.

## 1. Interface

```ts
// ─── entry point: "eyecite-ts" ──────────────────────────────────────────────

/**
 * Extract citations using the default extractor (built-in patterns, compact
 * reporter table, Bluebook resolver, resolution ON, footnote detection AUTO).
 * Pure, synchronous, in-process; never touches the network.
 * ERROR MODES: throws TypeError on non-string input; NEVER throws on malformed
 * text — problems surface as `doc.diagnostics` and per-citation `confidence`.
 */
export function extract(text: string, options?: ExtractOptions): CitationDocument

export interface ExtractOptions {
  /** Short-form resolution (id./supra/short case → antecedent). Default true. */
  resolve?: boolean
  /** Footnote zone detection. "auto" (default) | "html" | "text" | false. */
  footnotes?: "auto" | "html" | "text" | false
  /** Drop likely false positives instead of down-scoring them. Default false. */
  filterFalsePositives?: boolean
}

/**
 * The result module. INVARIANTS: `citations` sorted by span.start asc (ties:
 * longer span first); every id is unique within this document; ALL spans index
 * into the caller's ORIGINAL input — no other coordinate system exists publicly.
 */
export interface CitationDocument {
  readonly citations: readonly Citation[]
  readonly footnotes: readonly FootnoteZone[]      // [] unless detected
  readonly diagnostics: readonly Diagnostic[]      // non-fatal extraction issues
  get(id: CitationId): Citation | undefined
  /**
   * Rewrite the ORIGINAL input with each citation wrapped. The document owns
   * all position mapping; the caller manages no transformation state.
   * INVARIANT: output minus insertions === original input, byte for byte.
   * Overlapping citations: outermost wins; nested ones are skipped.
   */
  annotate(wrap: AnnotateWrap, options?: { include?: (c: Citation) => boolean }): string
}

export type AnnotateWrap =
  | { before: string; after: string }
  | ((c: Citation, matchedText: string) => { before: string; after: string } | null)

/** Half-open [start, end) offsets into the caller's original input. */
export interface Span { start: number; end: number }
export type CitationId = string & { readonly __brand: "CitationId" }

export interface FootnoteZone { span: Span; number: number }
export interface Diagnostic { severity: "warning" | "info"; message: string; span?: Span }

// ─── citation taxonomy (discriminated on `kind`) ────────────────────────────

export type Citation =
  | CaseCitation | StatuteCitation | RegulationCitation | RuleCitation
  | ConstitutionCitation | JournalCitation | SecondaryCitation
  | NeutralCitation | DocketCitation | LegislativeCitation
  | IdCitation | SupraCitation | ShortCaseCitation
  | CustomCitation

export interface CitationBase {
  id: CitationId               // stable within one document; not durable across runs
  kind: string                 // narrow via the union / isKind()
  span: Span                   // citation core (volume-reporter-page etc.)
  fullSpan: Span               // envelope: case name → trailing parentheticals; === span if none
  matchedText: string          // === input.slice(span.start, span.end)
  confidence: number           // 0..1
  signal?: CitationSignal      // "see" | "see also" | "cf" | ... (Bluebook 1.2/1.3)
  group?: { id: string; memberIds: CitationId[]; signal?: CitationSignal } // string cite
  footnote?: number            // present iff inside a detected footnote zone
}

export interface CaseCitation extends CitationBase {
  kind: "case"
  caseName?: string; plaintiff?: string; defendant?: string
  volume: number | string; reporter: string; reporterNormalized?: string
  page: number | string; pincite?: Pincite
  court?: string; year?: number; date?: string       // ISO when parseable
  parentheticals?: Parenthetical[]
  parallel?: CitationId[]                            // same-decision parallel cites
  history?: { signal: HistorySignal; target: CitationId }[]
}

export interface StatuteCitation extends CitationBase {
  kind: "statute"
  code: string; codeNormalized?: string              // "U.S.C.", "N.R.S.", …
  title?: string; chapter?: string
  section?: string; sectionRange?: [string, string]  // section EXCLUDES subsection
  subsection?: string; subsectionRange?: [string, string]
  year?: number
}

/** Remaining kinds follow the same shape; field lists elided for brevity. */
export interface RegulationCitation extends CitationBase { kind: "regulation"; /* C.F.R., Fed. Reg., state regs via `source` */ }
export interface RuleCitation extends CitationBase { kind: "rule"; /* FRCP/FRE + state rules via `jurisdiction` */ }
export interface ConstitutionCitation extends CitationBase { kind: "constitution" }
export interface JournalCitation extends CitationBase { kind: "journal" }
export interface SecondaryCitation extends CitationBase { kind: "secondary"; form: "treatise" | "restatement" | "annotation" | "canon" }
export interface NeutralCitation extends CitationBase { kind: "neutral" }
export interface DocketCitation extends CitationBase { kind: "docket" }
export interface LegislativeCitation extends CitationBase { kind: "legislative"; form: "publicLaw" | "statutesAtLarge" | "sessionLaw" | "material" | "treaty" | "ordinance" }

/** Short forms. `antecedent` is set by resolution (on by default). */
export interface ShortFormBase extends CitationBase {
  antecedent?: { target: CitationId; confidence: number; method: string }
}
export interface IdCitation extends ShortFormBase { kind: "id"; pincite?: Pincite }
export interface SupraCitation extends ShortFormBase { kind: "supra"; party: string; pincite?: Pincite; noteRef?: number }
export interface ShortCaseCitation extends ShortFormBase { kind: "shortCase"; party: string; volume: number | string; reporter: string; pincite?: Pincite }

/** Plugin-registered patterns produce namespaced kinds — union stays closed. */
export interface CustomCitation extends CitationBase { kind: `x-${string}`; fields: Record<string, string | number> }

export interface Pincite { page?: string; range?: [string, string]; note?: string; paragraph?: string }
export interface Parenthetical { span: Span; kind: "weighing" | "quoting" | "explanatory" | "date" | "other"; text: string; citations?: CitationId[] }
export type HistorySignal = "aff'd" | "rev'd" | "cert. denied" | "vacated" | (string & {})
export type CitationSignal = "see" | "see also" | "see generally" | "cf" | "but see" | "but cf" | "compare" | "accord" | "contra" | "e.g." | "see, e.g."

export function isKind<K extends Citation["kind"]>(c: Citation, k: K): c is Extract<Citation, { kind: K }>

// ─── extension layer (invisible until reached for) ──────────────────────────

/**
 * Build a configured extractor. All config is validated HERE — invalid regex
 * flags (patterns require /dg), duplicate ids, non-`x-` custom kinds throw
 * ConfigError at construction, never during extract().
 */
export function createExtractor(config?: ExtractorConfig): Extractor
export interface Extractor { extract(text: string, options?: ExtractOptions): CitationDocument }
export class ConfigError extends Error {}

export interface ExtractorConfig {
  /** Seam A — recognition. Replaces or (with mode:"add") extends built-ins. */
  patterns?: CitationPattern[] | { add: CitationPattern[] }
  /** Seam A′ — data-level: new statutory/regulatory codes, no regex needed. */
  statuteCodes?: StatuteCodeEntry[]
  /** Seam B — text preparation, applied in order before recognition. */
  cleaners?: Cleaner[] | { add: Cleaner[] }
  /** Seam C — reporter knowledge. Default: compact built-in table. */
  reporters?: ReporterSource
  /** Seam D — short-form resolution. First resolver to return non-null wins. */
  resolvers?: ShortFormResolver[]
  /** Seam E — pipeline observation (read-only; cannot mutate results). */
  observer?: PipelineObserver
}

/**
 * A recognition adapter. The engine owns ALL coordinates: `regex` runs against
 * an internally prepared text, and every span the adapter emits is expressed
 * as offsets RELATIVE TO ITS OWN MATCH — the engine maps them to original-input
 * offsets. Adapters can never leak an internal coordinate system.
 * ORDERING: higher `priority` runs first; overlapping matches → longest wins.
 */
export interface CitationPattern {
  id: string
  kind: Citation["kind"]                 // built-in kind or `x-…`
  regex: RegExp                          // /dg required; no nested quantifiers
  priority?: number
  extract(m: { text: string; groups: Record<string, string | undefined> }):
    { fields: Record<string, string | number>; confidence?: number } | null
}

export interface StatuteCodeEntry { code: string; aliases?: string[]; jurisdiction: string; kind?: "statute" | "regulation" }
export type Cleaner = (text: string) => string      // pure; engine tracks position shifts
export interface ReporterSource { lookup(abbreviation: string): { canonical: string; jurisdiction?: string; dateRange?: [number, number] } | null }

/** Resolution adapter. Context exposes candidates nearest-first, already scoped. */
export interface ShortFormResolver {
  id: string
  resolve(shortForm: IdCitation | SupraCitation | ShortCaseCitation, ctx: ResolutionContext):
    { target: CitationId; confidence: number } | null
}
export interface ResolutionContext {
  candidates(): Iterable<Citation>                   // full cites before the short form, nearest first
  footnoteOf(id: CitationId): number | undefined
  sameFootnote(a: CitationId, b: CitationId): boolean
}
export function bluebookResolver(opts?: { fuzzyPartyThreshold?: number; idConfidenceFloor?: number }): ShortFormResolver
export function footnoteStrictResolver(): ShortFormResolver

export interface PipelineObserver {
  onStage?(e: { stage: "clean" | "recognize" | "extract" | "resolve"; durationMs: number; count: number }): void
  onCandidateRejected?(e: { patternId: string; text: string; reason: string }): void
}
```

```ts
// ─── entry point: "eyecite-ts/reporters" (large; never imported by core) ────
export function fullReporterSource(): ReporterSource   // complete reporters-db

// ─── entry point: "eyecite-ts/patterns" (tree-shakeable named sets) ─────────
export const casePatterns: CitationPattern[]
export const statutePatterns: CitationPattern[]        // …one export per family
export const shortFormPatterns: CitationPattern[]
export const defaultCleaners: Cleaner[]                // html, whitespace, unicode, quotes
export const markdownCleaner: Cleaner
```

## 2. Usage

**(a) Common case — three lines, zero machinery:**
```ts
import { extract } from "eyecite-ts"
const doc = extract(briefText)                          // HTML in? fine — spans still index briefText
const linked = doc.annotate({ before: "<mark>", after: "</mark>" })
```

**(b) Advanced — custom pattern + full reporter DB + tuned resolver:**
```ts
import { createExtractor, bluebookResolver } from "eyecite-ts"
import { fullReporterSource } from "eyecite-ts/reporters"

const extractor = createExtractor({
  patterns: { add: [{
    id: "navajo-reporter", kind: "x-navajo", priority: 10,
    regex: /(?<vol>\d{1,3}) Nav\. R\. (?<page>\d{1,4})/dg,
    extract: (m) => ({ fields: { volume: Number(m.groups.vol), page: Number(m.groups.page) } }),
  }]},
  reporters: fullReporterSource(),
  resolvers: [bluebookResolver({ fuzzyPartyThreshold: 0.9 })],
})
const doc = extractor.extract(tribalCourtOpinion)
doc.citations.filter((c) => c.kind === "x-navajo")      // type: CustomCitation
```

## 3. Hidden behind the seam

**Made private** (all currently exported): `Span`'s clean coordinates and `TransformationMap` (constraint 2 — the engine maps internally; `CitationDocument.annotate` is why callers never need them); `cleanText`/`tokenize`/`Token` and every per-type `extractCase()`/`extractStatute()`… granular function (the pipeline is implementation; the deletion test says their complexity would reappear in every caller as coordinate bookkeeping); `DocumentResolver`/`resolveCitations` (folded into extract-with-resolve-on-by-default); `detectFootnotes` (an option, not a function); `processTimeMs`/`patternsChecked` (observability moved to Seam E); `byId`, `applyFalsePositiveFilters`, `normalizeCourt`, `parsePincite`, `spanFromGroupIndex`. The 38 hand-wired statute extractors stay internal; new codes enter via `statuteCodes` data entries.

**Seams, each justified by ≥2 adapters:**
- **A. Recognition (`CitationPattern`)** — built-in case/statute/journal sets; user Navajo/foreign-reporter or firm-internal docket format. **A′ (`statuteCodes`)**: built-in 50-state entries; user territorial/municipal code.
- **B. Cleaning (`Cleaner`)** — built-in HTML/whitespace/unicode chain; shipped `markdownCleaner` (exists today as `stripMarkdownEmphasis`); user OCR-artifact fixer.
- **C. Reporter knowledge (`ReporterSource`)** — compact built-in table; `fullReporterSource()` from the data entry point; user federal-only slim table for edge runtimes.
- **D. Resolution (`ShortFormResolver`)** — `bluebookResolver` (default); `footnoteStrictResolver`; user brief-bank resolver binding supra to an external authority index.
- **E. Observation (`PipelineObserver`)** — the library's own corpus-projection tooling (`scripts/corpus`); user telemetry/pattern-tuning profiler.

**Cut** (one-adapter hypotheticals): pluggable tokenizer engine, pluggable position-mapping, pluggable annotator backend, pluggable footnote detector (both detectors are internal implementations selected by the `footnotes` option — nobody realistically writes a third).

## 4. Bundle / entry-point strategy

Three entry points: **`eyecite-ts`** (engine + compact reporter table + default patterns; the size-limit budget applies here), **`eyecite-ts/reporters`** (the large DB as one `ReporterSource` adapter — reachable only by explicit import, so tree-shaking is structural, not heuristic), **`eyecite-ts/patterns`** (named pattern-family arrays so a size-critical caller can `createExtractor({ patterns: casePatterns })` and shake off every other family). `annotate` is a method on `CitationDocument`, not a separate entry — it is small and its value is exactly that it shares the document's private position map. Everything stays synchronous and zero-dependency; laziness is caller-directed via imports, never runtime fetching.

## 5. Trade-offs

- **Leverage is highest at `CitationDocument`**: one object answers extract + resolve + footnotes + annotate; the entire dual-coordinate implementation pays back at every call site without ever being learned. Locality: a position-mapping bug now has exactly one home.
- **Leverage is thin at Seam E**: observers get timings and rejections, not stage payloads — deliberately, because exposing token streams would freeze the internal pipeline shape. Profiling depth is sacrificed for freedom to restructure.
- **Hard by design**: (1) running one pipeline stage standalone — the granular API is gone; a caller wanting "just tokenize" must use a full extractor and filter. (2) Mutating candidates mid-pipeline — patterns and resolvers are generative/selective adapters, not interceptors; a rewrite-style plugin has no seam. (3) Custom kinds get the flat `fields` bag, not first-class typed shapes — the price of keeping the `Citation` union closed and exhaustiveness-checkable. (4) The kind collapse (`rule`, `legislative`, `secondary` with `form`) trades per-kind narrowing precision for a taxonomy that can absorb new forms without a major version.
- **Resolution-on-by-default** costs a few ms on large documents but deletes the `Citation[] | ResolvedCitation[]` overload split — one return type, one mental model.

---

# DESIGN C — Common Caller First

# eyecite-ts v1.0.0 — public interface design

Design stance: one deep module (`extract` → `CitedDocument`) whose interface is derived from the five most common call sites. Everything a caller must know fits on one screen; everything else — cleaning, tokenization, dual coordinates, resolution machinery — is implementation behind the seam.

## 1. The five call sites (written first)

```ts
// (1) Court-opinion ingestion service: citations + positions into a database
import { extract } from "eyecite-ts"

const doc = extract(opinionText)                      // raw text OR raw HTML — no pre-cleaning
await db.citations.insertMany(doc.citations.map(c => ({
  opinionId,
  kind: c.kind,
  start: c.span.start,                                // ALWAYS original-text offsets
  end: c.span.end,
  payload: c,                                         // plain JSON-safe object
})))
```

```ts
// (2) Web app: annotate an HTML opinion with links
const doc = extract(opinionHtml)                      // HTML auto-detected; positions are in the HTML
const { text: linkedHtml } = doc.annotate(c =>
  c.kind === "case" && c.volume
    ? { open: `<a href="${caseUrl(c)}">`, close: "</a>" }
    : null,                                           // null = leave this citation unmarked
)
```

```ts
// (3) Cite-checker: every case citation with its resolved antecedent
const doc = extract(briefText)
for (const c of doc.citations) {
  if (c.kind !== "reference") continue                // id. / supra / short-form case
  const antecedent = doc.antecedentOf(c)              // resolution already ran — nothing to opt into
  report(c.form, c.text, antecedent ? antecedent.text : "UNRESOLVED", c.span)
}
```

```ts
// (4) LLM/RAG pipeline: structured JSON with stable ids
const doc = extract(chunk)
send(JSON.stringify(doc.citations))                   // ids are deterministic: same text ⇒ same ids
```

```ts
// (5) Quick script: statute citations by jurisdiction
const byJur = Map.groupBy(
  extract(text).citations.filter(c => c.kind === "statute"),
  c => c.jurisdiction ?? "unknown",
)
```

Every call site is one import, one call, zero flags. The interface below is what makes that true.

## 2. Interface

```ts
// ─── eyecite-ts (core entry) ────────────────────────────────────────────────

/**
 * Extract, resolve, and footnote-tag every citation in `text`.
 *
 * INVARIANTS
 *  - Total function: never throws on messy input (throws TypeError only if
 *    `text` is not a string). Garbage in ⇒ empty `citations`, never an error.
 *  - All positions are offsets into the caller's ORIGINAL `text`:
 *    `doc.text.slice(c.span.start, c.span.end) === c.text` for every citation.
 *    No other coordinate system exists in the interface.
 *  - Resolution always runs: every `kind:"reference"` citation carries
 *    `antecedentId` when an antecedent (full citation) was found.
 *  - Footnote zones are always detected; citations inside one carry `footnote`.
 *  - `citations` is ordered by `span.start`; ids are deterministic for a given
 *    (text, options) pair, so re-extraction yields identical ids.
 *  - Pure & synchronous: no I/O, no globals, O(len × patterns) time.
 */
export function extract(text: string, options?: ExtractOptions): CitedDocument

export interface ExtractOptions {
  /** Input format. "auto" (default) sniffs HTML/Markdown/plain. Cleaning is
   *  internal and happens exactly once — there is no way to double-clean. */
  format?: "auto" | "html" | "markdown" | "plain"
  /** Restrict extraction to these kinds (perf + noise control). Default: all. */
  include?: readonly CitationKind[]
  /** Suspected false positives are DROPPED by default. "flag" keeps them with
   *  confidence < 0.5 and a `suspect` reason attached. */
  suspect?: "drop" | "flag"
  /** Adapter seam for reporter knowledge. Default: compact table built into
   *  core. Pass `fullReporters` from "eyecite-ts/reporters" for the complete
   *  Free Law reporter database (variants, editions, canonical names). */
  reporters?: ReporterSource
}

/**
 * The result: a document with its citations, bound together.
 * Methods never mutate; `citations` and `footnotes` are frozen plain data
 * (JSON.stringify-safe — methods live on the document, not on citations).
 */
export interface CitedDocument {
  readonly text: string                        // exactly what the caller passed in
  readonly citations: readonly Citation[]
  readonly footnotes: readonly FootnoteZone[]

  /** O(1) lookup by id. */
  get(id: CitationId): Citation | undefined

  /** Immediate antecedent of a short form (id./supra/short-form case), or
   *  undefined if unresolved. Follows ids, not array indices — survives any
   *  caller filter/sort. `{ transitive: true }` walks id.-chains to the
   *  originating full citation. */
  antecedentOf(c: Citation, opts?: { transitive?: boolean }): Citation | undefined

  /** Citations grouped by resolved authority: each full citation with every
   *  short form and parallel citation that refers to it, in document order. */
  authorities(): readonly { authority: Citation; referrers: readonly Citation[] }[]

  /**
   * Wrap citations in markup, positioned in the ORIGINAL text (incl. original
   * HTML). Wrap-only by construction: the cited text itself is never replaced,
   * so annotation cannot corrupt or reorder document content.
   * ERROR MODES: a render callback that throws propagates; citations whose
   * spans would split an HTML tag are skipped and reported, never mangled.
   */
  annotate(render: (c: Citation) => Markup | null): AnnotationResult
}

export type Markup = { open: string; close: string }
export interface AnnotationResult {
  text: string
  skipped: readonly { citation: Citation; reason: "overlap" | "tag-boundary" }[]
}

// ─── Citation data model ────────────────────────────────────────────────────

export type CitationId = string & { readonly __brand: "CitationId" }

/** Half-open [start, end) offsets into CitedDocument.text. The only span type. */
export interface Span { readonly start: number; readonly end: number }

export type CitationKind =
  | "case" | "statute" | "regulation" | "constitution" | "rule"
  | "journal" | "book" | "legislation" | "treaty" | "ordinance"
  | "docket" | "reference"

interface CitationCommon {
  readonly id: CitationId
  readonly kind: CitationKind
  readonly text: string          // === doc.text.slice(span.start, span.end)
  readonly span: Span            // citation core (e.g. "500 F.2d 123")
  readonly fullSpan?: Span       // case name … final parenthetical, when known
  readonly confidence: number    // 0–1
  readonly footnote?: number     // footnote zone number, if inside one
  readonly suspect?: string      // present only with suspect:"flag"
}

/** Discriminate on `kind` — exhaustive switch is type-safe. Selected members: */
export interface CaseCitation extends CitationCommon {
  readonly kind: "case"
  readonly form: "reporter" | "neutral"        // 2020 WL 123456 is a neutral case cite
  readonly caseName?: string
  readonly volume?: number | string            // string for "1984-1"-style volumes
  readonly reporter?: string                   // normalized reporter abbreviation
  readonly page?: number | string
  readonly pincite?: { page: number | string; endPage?: number | string }
  readonly court?: string
  readonly year?: number
  readonly parentheticals?: readonly Parenthetical[]
  readonly parallelWith?: readonly CitationId[]
}
export interface StatuteCitation extends CitationCommon {
  readonly kind: "statute"
  readonly code: string                        // "U.S.C.", "N.R.S.", …
  readonly jurisdiction?: string               // "us" | "us-nv" | …
  readonly section?: string
  readonly subsection?: string
  readonly year?: number
}
export interface ReferenceCitation extends CitationCommon {
  readonly kind: "reference"
  readonly form: "id" | "supra" | "short-case" // the short-form flavor
  readonly antecedentId?: CitationId           // undefined ⇔ unresolved
  readonly pincite?: { page: number | string; endPage?: number | string }
}
export interface Parenthetical {
  readonly text: string
  readonly span: Span
  readonly role: "court-date" | "weight" | "explanatory" | "quoting" | "history"
  readonly citationIds?: readonly CitationId[] // citations nested inside it
}
export interface FootnoteZone { readonly number: number; readonly span: Span }

export type Citation = CaseCitation | StatuteCitation | ReferenceCitation | /* … one
  interface per remaining kind: Regulation, Constitution, Rule, Journal, Book,
  Legislation, Treaty, Ordinance, Docket — same CitationCommon shape */

// ─── eyecite-ts/reporters (lazy entry) ──────────────────────────────────────

/** Adapter interface at the reporter-knowledge seam. Two shipped adapters:
 *  the built-in compact table (default, in core) and `fullReporters`. */
export interface ReporterSource {
  lookup(abbreviation: string): ReporterInfo | undefined
}
export const fullReporters: ReporterSource     // complete DB; import cost is explicit
export interface ReporterInfo {
  readonly canonical: string; readonly name: string
  readonly citeType: string; readonly variations: readonly string[]
}
```

## 3. Hidden behind the seam

| Today public | v1 fate | Misuse now impossible by construction |
|---|---|---|
| `Span.cleanStart/cleanEnd`, `TransformationMap`, `spanFromGroupIndex` | private implementation | **Wrong-coordinate bugs**: only one coordinate system exists; the invariant `doc.text.slice(span.start, span.end) === c.text` is checkable by any caller |
| `cleanText`, `cleaners`/`additionalCleaners` function arrays | private; declarative `format` option | **Double-cleaning**: callers never clean; `extract` takes raw text and cleans exactly once internally |
| `annotate(text, citations, { useCleanText })` free function | `doc.annotate(render)` method | **Text/citation mismatch**: annotation takes no text and no citations — it can only annotate the document that produced them. No `useCleanText` flag to get wrong. Wrap-only markup means cited text can't be replaced or XSS-reshaped |
| `resolve: true` flag, `DocumentResolver`, `resolveCitations`, index-based `resolvedTo` | resolution always runs; `antecedentId` + `doc.antecedentOf()` | **Forgetting to resolve**: not expressible. **Stale-index bugs**: antecedents are ids, immune to caller filter/sort |
| `detectFootnotes` flag + `FootnoteMap` plumbing into `ResolutionOptions` | always-on; `footnote` field + `doc.footnotes` | **Footnote/resolution plumbing errors**: id.-scope-per-footnote-zone is internal policy, not caller wiring |
| `tokenize`, `Token`, `Pattern`, 12 per-type `extract*` functions, `parsePincite`, `normalizeCourt`, `byId`, `processTimeMs`, `patternsChecked` | deleted from the interface (internal seams remain for the module's own tests) | Surface shrinks ~10×; the deletion test says these were pass-throughs for every caller in the corpus tests |
| 22-value `type` union with sibling near-duplicates | 12-value `kind` union (`neutral`→`case.form`, `federalRule`/`stateRule`/`canon`→`rule`, `treatise`/`restatement`/`annotation`→`book`, `publicLaw`/`sessionLaw`/`statutesAtLarge`/`federalRegister`/`legislativeMaterial`→`legislation`, `id`/`supra`/`shortFormCase`→`reference.form`) | Exhaustive `switch` stays tractable; fine distinctions survive as fields, not kinds |

Depth check: one function + one result interface now carries the entire clean→tokenize→extract→resolve→footnote pipeline. That's the leverage — five very different callers, each ≤ 6 lines — and the locality: a fix to position mapping or supra resolution lands behind the seam and every caller inherits it.

## 4. Bundle / entry-point strategy

- **`eyecite-ts`** (core): `extract` + types + the compact reporter pattern table (patterns are required to find citations at all, so they're core, size-limited as today). Annotation implementation ships in core as a `CitedDocument` method (~2 KB) — ergonomics over tree-shaving here, measured and accepted. `sideEffects: false` retained.
- **`eyecite-ts/reporters`** (lazy): the full Free Law reporter database as the second adapter at the `ReporterSource` seam. It is never imported by core — cost is paid only by the explicit `import { fullReporters }`. Two real adapters ⇒ a real seam, and it doubles as the test seam (a 5-entry fake `ReporterSource` makes reporter-dependent behavior unit-testable).
- Dropped entries: `/annotate` (folded into core), `/utils`, `/data` (superseded by `/reporters`). ESM + CJS + DTS as today; zero runtime dependencies unchanged.

## 5. Trade-offs

- **High leverage**: the `CitedDocument` binding. Coordinate translation, resolution ordering, footnote scoping, and annotation position math were four caller-facing footguns; they are now one implementation concern. Deterministic ids give RAG/db callers cross-run stability for free.
- **Always-on resolution and footnote detection** costs a few ms on large documents for callers who don't need them. Accepted: `include` lets perf-sensitive callers narrow kinds, and the default caller gets correctness without reading docs.
- **Thin spots**: `CitedDocument` is not itself serializable (methods) — callers persist `doc.citations` (plain data), and rehydrating a document requires re-running `extract`. Cheap and deterministic, but a caller wanting `antecedentOf` over citations loaded from a database must re-extract or chase `antecedentId` themselves.
- **What this design makes hard, on purpose**: custom cleaners, custom regex patterns, and per-stage access (tokenize-only, extract-one-type). Power users lose the granular tier; the escape hatch is the `ReporterSource` adapter plus `include`, and anything beyond that is a feature request against the module rather than a caller-side workaround. That is the bet: locality for maintainers over open-ended extensibility.
- **Kind consolidation risk**: collapsing 22 types to 12 kinds moves distinctions into fields (`form`, `series`-style fields), so a caller switching on old `type` values must consult two levels. Mitigated by exhaustiveness checking on `kind` and by the fields being non-optional where the distinction is load-bearing.

---

# DESIGN D — Result Model First

# eyecite-ts v1.0 — Result-Model-First Design

The library is a compiler: opinion text in, a **citation IR** out. The IR is one JSON document — plain data, no methods, no object references, one coordinate system. The function surface is two functions deep enough to hide the entire pipeline.

## 1. The IR

### Taxonomy decision

The current union has grown to **23 flat types**, but the per-type interfaces in `src/types/citation.ts` are not 23 shapes. They cluster into four field-families:

| Cluster | Current types folded in | Shared shape |
|---|---|---|
| **caselaw** | `case`, `neutral`, `docket` | parties · volume/reporter/page · pincite · court · year · parentheticals |
| **enacted** | `statute`, `regulation`, `constitutional`, `federalRule`+`stateRule` (merged: they differ *only* in jurisdiction), `localOrdinance`, `sessionLaw`, `publicLaw`, `statutesAtLarge`, `federalRegister`, `legislativeMaterial`, `treaty`, `canon` | code/title/chapter/section/subsection · jurisdiction · edition year |
| **secondary** | `journal`, `treatise`, `restatement`, `annotation` | author · title · volume · source · page · year |
| **shortform** | `id`, `supra`, `shortFormCase` | antecedent cue · pincite (resolution lives in edges, not here) |

The union was fighting its consumers three ways: (a) 23 hand-written interfaces restating the same fields with drifted types (`pincite: number` on case vs `string` on statute); (b) cross-cutting relationships (parallel groups, string citations, subsequent history, resolution) encoded **redundantly per citation** — `groupId` + `stringCitationIndex/Size` + `stringCitationGroup`, `resolvedTo` index + `resolvedToId`; (c) bench telemetry (`processTimeMs`, `patternsChecked`) polluting the data model. v1 keeps a **fine-grained `kind` discriminant** (constraint 5) but only **four structural interfaces**, and hoists every relationship to document-level edges/groups keyed by stable ids.

```ts
export const SCHEMA_VERSION = "1.0.0" as const

/** [start, end), UTF-16 code units, ALWAYS in the caller's original text. */
export interface Span { start: number; end: number }

/** Deterministic content hash of (kind | span | matchedText): "cit_a3f91c2e".
 *  Re-extracting identical text yields identical ids. */
export type CitationId = string

export interface Pincite { raw: string; page?: string; pageEnd?: string; note?: string }
export type Signal = "see" | "seeAlso" | "cf" | "butSee" | "eg" | "accord" | "contra" | "compare"
export interface Diagnostic { code: string; message: string; span?: Span; severity: "warning" | "info" }

interface CitationCore {
  id: CitationId
  span: Span                 // citation core: "410 U.S. 113"
  fullSpan: Span             // case name → final parenthetical (== span when no envelope)
  matchedText: string        // INVARIANT: text.slice(span.start, span.end)
  confidence: number         // 0..1
  /** Provenance: which original-text slice produced each extracted field. */
  components: Partial<Record<string, Span>>   // keys: "volume","reporter","page","pincite","court","year","section",…
  signal?: Signal
  footnoteNumber?: number    // present iff inside a footnote zone
  diagnostics?: Diagnostic[]
}

export interface CaselawCitation extends CitationCore {
  family: "caselaw"
  kind: "reporter" | "neutral" | "docket"
  parties?: { plaintiff?: string; defendant?: string }
  volume?: string            // string everywhere: "410" and "1984-1" both round-trip
  reporter?: { cited: string; normalized?: string }   // "F. 2d" → "F.2d"
  page?: string              // "___" blank-page placeholders are legal
  pincite?: Pincite
  court?: { cited?: string; inferred?: { level: "supreme"|"appellate"|"trial"|"unknown";
            jurisdiction: "federal"|"state"|"unknown"; state?: string; confidence: number } }
  year?: number
  date?: string              // ISO 8601 when a full date parses
  unpublished?: boolean
  parentheticals?: Array<{ text: string; type: "holding"|"quoting"|"citing"|"explanatory"|"weight"; span: Span }>
}

export interface EnactedCitation extends CitationCore {
  family: "enacted"
  kind: "statute" | "regulation" | "constitution" | "rule" | "ordinance" | "sessionLaw"
      | "publicLaw" | "statutesAtLarge" | "register" | "legislativeMaterial" | "treaty" | "canon"
  code?: string              // "U.S.C.", "C.F.R.", "G.L."
  title?: string
  chapter?: string
  article?: string           // constitutions
  section?: string           // excludes subsection: § 1983(a) → section "1983"
  sectionEnd?: string        // §§ 591–99 ranges
  subsection?: string        // "(a)(1)"
  subsectionEnd?: string
  jurisdiction?: string      // "US" | 2-letter state code
  editionYear?: number       // trailing "(1976)" code edition
  etSeq?: boolean
}

export interface SecondaryCitation extends CitationCore {
  family: "secondary"
  kind: "journal" | "treatise" | "restatement" | "annotation"
  author?: string
  title?: string
  volume?: string
  source?: string            // journal abbrev / publisher / restatement subject
  page?: string
  pincite?: Pincite
  year?: number
  edition?: string
}

export interface ShortFormCitation extends CitationCore {
  family: "shortform"
  kind: "id" | "supra" | "caseShort"      // "Roe, 410 U.S. at 116"
  antecedentCue?: string                  // party name / cue as written; the guess, not the answer
  pincite?: Pincite
}

export type Citation = CaselawCitation | EnactedCitation | SecondaryCitation | ShortFormCitation
export type CitationKind = Citation["kind"]

/** Relationships are EDGES between ids — never object references, never array indexes. */
export interface ResolutionEdge {
  relation: "resolvesTo"
  from: CitationId                        // the short form
  to: CitationId | null                   // antecedent; null = unresolved
  method: "id" | "supra" | "caseShort"
  confidence: number
  /** Bluebook R4.1 immediate predecessor when `to` is null, so Id. chains still cluster. */
  fallbackAntecedent?: CitationId
}
export interface HistoryEdge {
  relation: "history"                     // aff'd, rev'd, cert. denied …
  from: CitationId; to: CitationId | null
  signal: string; raw: string; span: Span
}
export type Edge = ResolutionEdge | HistoryEdge

/** N-ary relationships are groups (parallel cites, string citations). */
export interface CitationGroup {
  id: string; kind: "parallel" | "string"
  members: CitationId[]                   // document order, includes all members
  signal?: Signal                         // leading signal of a string citation
}

export interface FootnoteZone { span: Span; number: number }

export interface CitationDocument {
  schemaVersion: typeof SCHEMA_VERSION
  citations: Citation[]                   // sorted by span.start
  edges: Edge[]
  groups: CitationGroup[]
  footnotes: FootnoteZone[]               // empty unless footnote detection enabled
  diagnostics: Diagnostic[]               // document-level issues
}
```

**Deliberately absent:** `processTimeMs`/`patternsChecked` (telemetry, not IR — available via `options.collectStats` into a side-channel `stats` the schema doesn't own), clean-text coordinates, `TransformationMap`, index-based `resolvedTo`, per-citation copies of group membership.

## 2. Interface

Two functions. Everything a caller must know fits here.

```ts
export function extract(text: string, options?: ExtractOptions): CitationDocument

export interface ExtractOptions {
  markup?: "auto" | "html" | "plain"      // replaces the cleaners array; "auto" sniffs tags
  footnotes?: boolean                     // default false; populates footnotes[] + footnoteNumber
  resolve?: boolean                       // default true; populates resolution edges
  reporters?: ReporterSource              // adapter seam — see §4; default: bundled full DB
  minConfidence?: number                  // default 0; filter, applied after id assignment, ids stable
}

export function annotate(
  text: string,                           // the SAME original text passed to extract
  doc: CitationDocument,
  render?: { open: string; close: string }
        | ((c: Citation, inner: string) => string),   // default: <span data-cite-id data-cite-kind>
): string
```

**Invariants (the contract):**
1. Pure and deterministic: same `(text, options)` → deep-equal `CitationDocument`, including ids.
2. `JSON.parse(JSON.stringify(doc))` deep-equals `doc` — no Maps, Dates, RegExps, undefined-vs-missing ambiguity (absent fields are omitted, never `null` except `Edge.to`).
3. Every `Span` indexes `text` directly; `matchedText === text.slice(span.start, span.end)` for every citation. This is *checkable*, which is what makes stateless annotation possible.
4. Every `Edge.from/.to` and `CitationGroup.members` entry appears in `citations` (or `to === null`).
5. `citations` sorted ascending by `span.start`; `fullSpan` contains `span`.
6. `minConfidence` filters output but never changes surviving ids (ids hash content, not position in array).

**Error modes:** `extract` throws `TypeError` on non-string input; it **never throws on content** — malformed citations become lower `confidence` + `diagnostics`. `annotate` re-verifies invariant 3 and throws `TextMismatchError` if `doc` wasn't produced from this exact `text` — failing loudly beats silently corrupting offsets.

## 3. Usage

**(a) Common case**

```ts
import { extract, annotate } from "eyecite-ts"

const doc = extract(opinionHtml, { markup: "auto", footnotes: true })
for (const c of doc.citations) {
  if (c.kind === "reporter") console.log(c.parties?.plaintiff, c.reporter?.normalized, c.pincite?.raw)
}
const html = annotate(opinionHtml, doc)   // no transformation state; spans are original-text
```

**(b) Downstream consumer — persist, then re-link resolution by id**

```ts
await db.insert("citations", doc.citations.map(c => ({
  id: c.id, opinion_id, kind: c.kind, start: c.span.start, end: c.span.end,
  payload: JSON.stringify(c), schema: doc.schemaVersion,
})))
await db.insert("citation_edges", doc.edges
  .filter((e): e is ResolutionEdge => e.relation === "resolvesTo" && e.to !== null)
  .map(e => ({ from_id: e.from, to_id: e.to, method: e.method, confidence: e.confidence })))
// Months later: re-extract the same stored text → identical ids → edges re-attach, diffs are semantic.
```

## 4. Hidden behind the seam

The public **interface** is the IR + two functions; the **implementation** keeps the full pipeline as internal **modules** with high **locality** — none leak:

- **clean/tokenize/extract/resolve stages**, `TransformationMap`, dual-coordinate spans (`cleanStart/cleanEnd` die at the boundary — constraint 2), the `Pattern` registry, per-type extractors, Levenshtein supra matching, scope strategies, footnote-zone detectors. The granular re-exports in today's `src/index.ts` (tokenize, extractCase, cleanText, DocumentResolver…) are deleted from the public surface; that is where the **depth** comes from — one call absorbs what is currently a five-module choreography.
- **Reporter database seam:** `ReporterSource` is a tiny **adapter** interface (`lookup(abbrev): ReporterInfo | undefined; editions(): Iterable<…>`). The default implementation wraps the bundled DB.

**Entry points / bundle strategy:**

| Entry | Contents | Reporter DB? |
|---|---|---|
| `eyecite-ts` | `extract`, `annotate`, types | yes — bundled full DB via the default `ReporterSource` |
| `eyecite-ts/lite` | same `extract`, no DB — you must pass `options.reporters` | no (pattern-only reporter matching, lower confidence) |
| `eyecite-ts/reporters` | the full `ReporterSource` as data, side-effect-free | the DB, tree-shakeable |
| `eyecite-ts/schema` | `SCHEMA_VERSION`, type declarations, `validateDocument(json)` | no runtime weight |

Bundle-size story: `annotate` + types pull zero reporter data; size-conscious callers compose `eyecite-ts/lite` + a jurisdiction-filtered `ReporterSource` (or `await import("eyecite-ts/reporters")` to lazy-load). Zero runtime dependencies throughout.

## 5. Trade-offs

**High leverage.** (1) *Ids-as-edges*: one decision — no object references, content-hashed ids — simultaneously buys JSON round-tripping, DB persistence, stable regression projection (today's `scripts/corpus/project.ts` reconstructs keys by hand; it becomes `(type, id, resolvedTo)` verbatim), and filter/sort-safe consumers. It deletes three redundant encodings from the current model. (2) *Invariant 3* (`matchedText === slice`) makes annotation stateless and makes every IR document self-verifying against its source text. (3) Four structural interfaces mean a new enacted-law source (the NRS/NAC pattern in CLAUDE.md) is a data entry plus a `kind` string — no new interface, no guard, no component-span type: three coordination points collapse to one.

**Thin leverage / costs.** (1) *Family merging loses precision*: `federalRule` vs `stateRule` becomes `kind: "rule"` + `jurisdiction` — consumers who switched on the old distinction now test two fields. (2) *All-string volumes/pages* push numeric comparison to consumers; that is the honest price of "1984-1" and "___" existing in the wild. (3) *Content-hashed ids are stable per-text, not per-case*: editing one character upstream of a citation shifts its span and changes its id. Cross-document identity (Roe is Roe everywhere) is deliberately out of scope — that's an entity-resolution layer above this IR. (4) *No granular API* makes life harder for the power user who wanted `tokenize()` alone; they must vendor or we must later re-open the seam deliberately (a minor-version add, not a break). (5) `schemaVersion` is only leverage if enforced: the corpus snapshot suite must diff against the schema, and any IR change without a version bump fails CI — otherwise it's decoration.
