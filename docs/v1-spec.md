# eyecite-ts v1.0.0 — Public Interface Specification

Status: **accepted design, pre-implementation.** This spec is the contract the v1 rewrite builds toward. Vocabulary per [CONTEXT.md](../CONTEXT.md); load-bearing rejections per [docs/adr/](./adr/). Backward compatibility with 0.x is explicitly discarded.

Design stance: the library is a compiler from text to a **citation document** — a versioned, JSON-round-trip-safe piece of plain data — behind one deep extraction interface. Positions exist in exactly one coordinate system: the caller's original text.

---

## 1. Package entry points

| Entry | Exports | Weight |
|---|---|---|
| `eyecite-ts` | `extract`, `annotate`, `format`, `lint`, `antecedentOf`, `authorities`, `CitationView`, `TextMismatchError`, all types | Size-limited (CI `pnpm size` gate). Reporter knowledge = compact codegen'd matcher table |
| `eyecite-ts/reporters` | `fullReporters: ReporterSource` | The full Free Law reporter database; imported cost is explicit and never pulled by core |
| `eyecite-ts/schema` | `SCHEMA_VERSION`, `validateDocument`, `citationDocumentSchema`, all types | Zero runtime weight beyond the validator. Also ships `citation-document.schema.json` — the IR as a language-agnostic interchange format; non-TS consumers validate against the artifact, not this package |
| `eyecite` (bin) | CLI: `extract` \| `annotate` \| `lint` \| `format` subcommands | Thin shell over the public functions. stdin→stdout, results to stdout / status to stderr, `--ndjson` for pipelines, `lint` exits non-zero on findings at or above `--fail-on` severity |

Zero runtime dependencies. Synchronous, pure, no I/O. ESM + CJS + DTS. `sideEffects: false`.

The 0.x entries `eyecite-ts/data`, `eyecite-ts/annotate`, and all granular pipeline exports (`tokenize`, `cleanText`, `extractCase`, `DocumentResolver`, patterns, `TransformationMap`, …) are deleted from the public surface. They remain internal seams for the library's own tests only.

## 2. Functions

```ts
/**
 * Extract every legal citation in `text` and return a citation document.
 *
 * INVARIANTS (see §6 for the numbered contract):
 * - Total: never throws on string content; TypeError on non-string input.
 * - All spans index the caller's original `text`.
 * - Resolution ALWAYS runs — there is no knob. Unresolved short forms
 *   produce a resolution edge with `to: null`.
 * - Pure and deterministic: same (text, options) ⇒ deep-equal document,
 *   including ids.
 */
export function extract(text: string, options?: ExtractOptions): CitationDocument

export interface ExtractOptions {
  /** Input format. "auto" (default) sniffs HTML/Markdown/plain. Cleaning is
   *  internal and happens exactly once; there is no way to double-clean. */
  markup?: "auto" | "html" | "markdown" | "plain"
  /** Footnote zone detection. Default true. The single behavioral escape
   *  hatch: a false-positive zone changes id. scoping, so callers on odd
   *  documents can turn detection off (ADR consequence of zone-strict id.). */
  footnotes?: boolean
  /** Reporter knowledge adapter. Default: compact built-in table.
   *  `fullReporters` (from eyecite-ts/reporters) is the high-accuracy tier;
   *  a small fake makes reporter-dependent behavior unit-testable. */
  reporters?: ReporterSource
}

/**
 * Rewrite `text` with each citation wrapped in caller markup.
 *
 * - `text` MUST be the exact string passed to extract(). Verified against
 *   doc.textHash up front → TextMismatchError (never silent offset corruption).
 * - Insertion-only: output minus insertions === text, character for character.
 *   The library introduces no escaping and no XSS beyond the caller's markup.
 * - Overlaps resolve deterministically: nested spans nest; partial overlaps
 *   drop the lower-level wrap (level ties: the later-starting span).
 *   Never emits malformed interleaving.
 * - Default renderer: <cite data-cite-id data-cite-kind>…</cite>.
 */
export function annotate(text: string, doc: CitationDocument, render?: Renderer): string

export type Renderer = (c: Citation) =>
  | { open: string; close: string; extent?: "core" | "full" }  // extent default "core"
  | null                                                        // null = skip this citation

/** Antecedent of a short form via its resolution edge; undefined if unresolved.
 *  `transitive: true` walks id.-chains to the originating full citation.
 *  Works identically on freshly extracted and JSON-rehydrated documents. */
export function antecedentOf(
  doc: CitationDocument,
  citation: Citation | CitationId,
  opts?: { transitive?: boolean },
): Citation | undefined

/** Each full citation with every short form and parallel member that refers
 *  to it, in document order. */
export function authorities(doc: CitationDocument): ReadonlyArray<{
  authority: Citation
  referrers: readonly Citation[]
}>

/** Optional ergonomic wrapper: indexes the document once. `text` unlocks
 *  .annotate(); omitting it leaves the query surface only. First-class on
 *  rehydrated documents: from(JSON.parse(row.payload)). */
export class CitationView {
  static from(doc: CitationDocument, text?: string): CitationView
  get(id: CitationId): Citation | undefined
  antecedentOf(c: Citation | CitationId, opts?: { transitive?: boolean }): Citation | undefined
  authorities(): ReadonlyArray<{ authority: Citation; referrers: readonly Citation[] }>
  parallelsOf(c: Citation | CitationId): readonly Citation[]
  citationsIn(zone: FootnoteZone): readonly Citation[]
  annotate(render?: Renderer): string          // throws if constructed without text
}

export class TextMismatchError extends Error {}  // annotate/view text ≠ doc.textHash

/**
 * Render a citation's canonical Bluebook text from its structured fields —
 * the IR's inverse (ADR 0006).
 * - Total: never throws on a schema-valid Citation; absent optional fields
 *   are omitted per Bluebook form.
 * - The semver-stable property is the ROUND-TRIP LAW (§11), not byte output:
 *   extract(format(c)) recovers c's family, kind, and populated fields.
 *   Canonical rendering may improve within minors.
 */
export function format(citation: Citation, opts?: { form?: "full" | "short" }): string

/**
 * Bluebook practice linting — a PURE CONSUMER of the citation document
 * (ADR 0006: rules read only the IR, never the text; if a rule needs a fact,
 * the IR grows to carry it). Deterministic; rule set versioned (§8).
 */
export function lint(doc: CitationDocument): LintFinding[]

/** Closed per version; additions are minor. Initial rule set: */
export type LintRule =
  | "id-after-intervening-cite"          // Bluebook R4.1 — computed from resolution edges + document order
  | "short-form-before-full"             // shortform with no in-scope antecedent candidate
  | "string-cite-signal-order"           // R1.3 — signal ordering within a string group
  | "missing-pincite-after-quote"        // quoting parenthetical / quote-adjacent cite lacks pincite
  | "nonstandard-reporter-abbreviation"  // reporter.cited ≠ reporter.normalized

export interface LintFinding {
  rule: LintRule
  severity: "error" | "warning"
  message: string
  citationId?: CitationId
  span?: Span
}

export interface ReporterSource {
  lookup(abbreviation: string): ReporterInfo | undefined
}
export interface ReporterInfo {
  readonly canonical: string
  readonly name: string
  readonly citeType: string
  readonly variations: readonly string[]
}

// eyecite-ts/schema
export const SCHEMA_VERSION: "1.0.0"
/** Structural validation + invariant checks (§6, incl. the refersTo↔edge
 *  mirror and edge/group referential integrity). */
export function validateDocument(json: unknown): { valid: boolean; errors: string[] }
```

## 3. The citation document

```ts
export interface CitationDocument {
  schemaVersion: typeof SCHEMA_VERSION
  /** "th_" + hash of the input text. annotate()/CitationView verify against it. */
  textHash: string
  citations: Citation[]        // sorted by span.start asc; ties: wider span first
  edges: Edge[]
  groups: CitationGroup[]
  footnotes: FootnoteZone[]    // [] when detection off or none found
  diagnostics: Diagnostic[]    // document-level, non-fatal
}

/** Half-open [start, end), UTF-16 code units, into the caller's original text. */
export interface Span { start: number; end: number }

/** "cit_" + content hash of (kind | span | matchedText). Branded; never parse it. */
export type CitationId = string & { readonly __brand: "CitationId" }

export interface FootnoteZone { span: Span; number: number }
export interface Diagnostic {
  code: string; message: string; span?: Span; severity: "warning" | "info"
}
export interface Pincite { raw: string; page?: string; pageEnd?: string; note?: string; paragraph?: string }
export type Signal =
  | "see" | "seeAlso" | "seeGenerally" | "cf" | "butSee" | "butCf"
  | "compare" | "accord" | "contra" | "eg" | "seeEg"

export type ConfidenceLevel = "certain" | "high" | "medium" | "low"

/** Closed per schema version; additions are minor (readers tolerate unknown codes
 *  from newer minors). Codes explain what raised or lowered the level. */
export type ReasonCode =
  // positive extraction signals
  | "known_reporter" | "year_plausible" | "case_name_present" | "court_identified"
  // negative extraction signals
  | "reporter_unknown" | "reporter_ambiguous" | "year_as_volume" | "blocked_reporter"
  | "year_implausible" | "suspicious_volume" | "mid_sentence_id" | "typo_punctuation"
  // metadata completeness
  | "missing_pincite" | "missing_year" | "missing_court" | "missing_case_name" | "blank_page"
  // resolution signals (edges)
  | "exact_antecedent_match" | "fuzzy_party_match" | "ambiguous_id_window"
  | "no_antecedent_in_scope" | "non_unique_party_key" | "paren_child_excluded"

/** Categorical by design (ADR 0005). There is NO numeric score in v1:
 *  `score?: number` is reserved and may arrive as a minor version only once it
 *  is fit against a labeled corpus with a published calibration error — never before. */
export interface Confidence {
  level: ConfidenceLevel
  reasons: ReasonCode[]
}
```

### 3.1 Citations — four families × fine kinds

Two-level discriminant: `family` selects the structural interface (exhaustive 4-arm switch); `kind` discriminates finely within it. Adding a kind within a family is **not** a breaking change for family-level consumers (see §8).

```ts
export type Family = "caselaw" | "enacted" | "secondary" | "shortform"

interface CitationCore {
  id: CitationId
  family: Family
  span: Span                   // citation core: "410 U.S. 113"
  fullSpan: Span               // case name → final parenthetical; === span when no envelope
  matchedText: string          // === text.slice(span.start, span.end)  (invariant 3)
  confidence: Confidence       // categorical; suspected false positives go "low", never vanish
  /** Provenance: which original-text slice produced each extracted field. */
  components?: Partial<Record<string, Span>>  // "volume","reporter","page","pincite","court","year","section",…
  signal?: Signal
  footnote?: number            // present iff inside a detected footnote zone
  diagnostics?: Diagnostic[]   // citation-level issues
}

export interface CaselawCitation extends CitationCore {
  family: "caselaw"
  kind: "reporter" | "neutral" | "docket"
  caseName?: string
  parties?: { plaintiff?: string; defendant?: string }
  volume?: string              // string everywhere: "410" and "1984-1" both round-trip (§9)
  reporter?: { cited: string; normalized?: string }   // "F. 2d" → "F.2d"; neutral: "WL", "U.S. Dist. LEXIS"
  page?: string                // "___" blank-page placeholders are legal
  pincite?: Pincite
  docketNumber?: string        // kind "docket"
  court?: {
    cited?: string
    inferred?: {
      level: "supreme" | "appellate" | "trial" | "unknown"
      jurisdiction: "federal" | "state" | "unknown"
      state?: string
      confidence: number
    }
  }
  year?: number
  date?: string                // ISO 8601 when a full date parses
  unpublished?: boolean
  parentheticals?: Array<{
    text: string
    type: "holding" | "quoting" | "citing" | "explanatory" | "weight" | "date"
    span: Span
    citationIds?: CitationId[] // citations nested inside (also present in doc.citations)
  }>
}

export interface EnactedCitation extends CitationCore {
  family: "enacted"
  kind:
    | "statute" | "regulation" | "constitution" | "rule" | "ordinance"
    | "sessionLaw" | "publicLaw" | "statutesAtLarge" | "register"
    | "legislativeMaterial" | "treaty" | "canon"
  code?: string                // "U.S.C.", "C.F.R.", "N.R.S."
  codeNormalized?: string
  title?: string
  chapter?: string
  article?: string             // constitutions
  section?: string             // EXCLUDES subsection: § 1983(a)(1) → section "1983"
  sectionEnd?: string          // §§ 591–99 ranges
  subsection?: string          // "(a)(1)"
  subsectionEnd?: string
  jurisdiction?: string        // "US" | two-letter state code
  editionYear?: number         // trailing code-edition "(1976)"
  etSeq?: boolean
}

export interface SecondaryCitation extends CitationCore {
  family: "secondary"
  kind: "journal" | "treatise" | "restatement" | "annotation"
  author?: string
  title?: string
  volume?: string
  source?: string              // journal abbreviation / publisher / restatement subject
  page?: string
  pincite?: Pincite
  year?: number
  edition?: string
}

export interface ShortFormCitation extends CitationCore {
  family: "shortform"
  kind: "id" | "supra" | "caseShort"    // caseShort: "Roe, 410 U.S. at 116"
  antecedentCue?: string       // party name / cue as written — the hint, not the answer
  volume?: string              // caseShort
  reporter?: { cited: string; normalized?: string }  // caseShort
  noteRef?: number             // "supra note 14"
  pincite?: Pincite
  /** Denormalized mirror of this citation's resolution edge (ADR 0003).
   *  INVARIANT: refersTo === edge(from === this.id).to, enforced by
   *  validateDocument. Absent ⇔ the edge's `to` is null. */
  refersTo?: CitationId
}

export type Citation = CaselawCitation | EnactedCitation | SecondaryCitation | ShortFormCitation
export type CitationKind = Citation["kind"]
```

The `kind` sets above are closed for v1. The `x-*` namespace is **reserved**: if a future extension layer (ADR 0001) produces custom kinds, they arrive as `` `x-${string}` `` without colliding with built-in kinds or breaking family-level exhaustiveness.

### 3.2 Edges and groups

Relationships live at document level, once (ADR 0003). Citations carry no relationship arrays except `ShortFormCitation.refersTo`.

```ts
export interface ResolutionEdge {
  relation: "resolvesTo"
  from: CitationId             // the short form
  to: CitationId | null        // antecedent; null = unresolved
  method: "id" | "supra" | "caseShort"
  confidence: Confidence       // e.g. { level: "medium", reasons: ["fuzzy_party_match"] }
  /** Bluebook R4.1 immediate predecessor when `to` is null, so id. chains still cluster. */
  fallbackAntecedent?: CitationId
}

export interface HistoryEdge {
  relation: "history"          // aff'd, rev'd, cert. denied, vacated, …
  from: CitationId
  to: CitationId | null
  signal: string               // as written
  raw: string
  span: Span
}

export type Edge = ResolutionEdge | HistoryEdge

export interface CitationGroup {
  id: string
  kind: "parallel" | "string"  // parallel reporters of one decision | "See A; B; C"
  members: CitationId[]        // document order; includes every member
  signal?: Signal              // leading signal of a string citation
}
```

## 4. Behavior invariants (always on)

- **Cleaning** is internal and single-pass. The caller passes raw text (including raw HTML); there is no cleaner configuration and no way to double-clean.
- **Resolution** always runs (pure, deterministic, cheap). Its output is resolution edges; "off" would only mean an emptier document.
- **Footnote detection** defaults on. `footnotes: false` is the sole behavioral escape hatch, because a false-positive zone changes id. scoping (zone-strict) rather than merely adding data.
- **False positives** surface as `level: "low"` with explanatory `reasons` (plus a citation-level diagnostic), never silently dropped. Filtering is the caller's one-liner on `level`. Confidence is assigned by a single scoring pass that runs after every set-mutating pass — levels can never be silently invalidated by later pipeline stages (the #556/#613 bug class).
- **Telemetry** (`processTimeMs`, `patternsChecked` in 0.x) does not exist in the data model. Callers who want timing wrap the call.

## 5. Error modes (complete list)

| Condition | Behavior |
|---|---|
| `extract(nonString)` | `TypeError` |
| `extract` on any string content | Never throws. Malformed citations ⇒ lower `confidence` + `diagnostics` |
| `annotate`/`CitationView.annotate` with text whose hash ≠ `doc.textHash` | `TextMismatchError` before any offset is touched |
| `CitationView.annotate` when constructed without `text` | `Error` (documented; the view is query-only without text) |
| Renderer callback throws | Propagates unchanged |

Everything else is defined out of existence: no parse errors, no resolution errors, no coordinate errors, no config errors (there is almost no config).

## 6. The document contract (checked by `validateDocument`)

1. **Deterministic**: same `(text, options)` ⇒ deep-equal document, including ids.
2. **JSON-total**: `JSON.parse(JSON.stringify(doc))` deep-equals `doc`. No methods, Maps, Dates, RegExps. Absent fields are omitted, never `null` — the only permitted `null` is `Edge.to`.
3. **Self-verifying spans**: `matchedText === text.slice(span.start, span.end)` for every citation; every component span lies within `fullSpan`; `fullSpan` contains `span`.
4. **Referential integrity**: every `Edge.from`, non-null `Edge.to`, `fallbackAntecedent`, `CitationGroup.members[i]`, and `parentheticals[].citationIds[i]` appears in `citations`.
5. **Ordering**: `citations` sorted by `span.start` asc; ties broken by wider span first. `CitationGroup.members` in document order.
6. **refersTo mirror**: for every shortform citation, `refersTo` equals its resolution edge's `to` (both absent when `to` is null).
7. **Id integrity**: `id === "cit_" + hash(kind | span.start | span.end | matchedText)`; unique within the document by construction.
8. **textHash**: `textHash === "th_" + hash(text)` for the input that produced the document.
9. **Reason codes**: every `confidence.reasons` entry belongs to the `ReasonCode` set published for the document's `schemaVersion`.

## 7. 0.x → v1 taxonomy map

| 0.x `type` | v1 `family` / `kind` | Notes |
|---|---|---|
| `case` | `caselaw` / `reporter` | |
| `neutral` | `caselaw` / `neutral` | volume/reporter/page fields fit neutral cites directly |
| `docket` | `caselaw` / `docket` | `docketNumber` |
| `statute` | `enacted` / `statute` | |
| `regulation` | `enacted` / `regulation` | |
| `constitutional` | `enacted` / `constitution` | |
| `federalRule` | `enacted` / `rule` | `jurisdiction: "US"` |
| `stateRule` | `enacted` / `rule` | `jurisdiction: <state>` |
| `publicLaw` | `enacted` / `publicLaw` | |
| `statutesAtLarge` | `enacted` / `statutesAtLarge` | |
| `federalRegister` | `enacted` / `register` | |
| `journal` | `secondary` / `journal` | |
| `treatise` | `secondary` / `treatise` | |
| `restatement` | `secondary` / `restatement` | |
| `annotation` | `secondary` / `annotation` | |
| `id` | `shortform` / `id` | `resolvedTo`/`resolvedToId` → resolution edge + `refersTo` |
| `supra` | `shortform` / `supra` | |
| `shortFormCase` | `shortform` / `caseShort` | |

0.x relationship fields deleted in favor of edges/groups: `resolvedTo` (index), `resolvedToId`, `groupId`, `stringCitationIndex/Size/Group`, `subsequentHistoryOf.index`, per-member `parallel` arrays.

0.x quality fields remapped: `confidence: number` → `confidence: { level, reasons }` (ADR 0005); the resolver's separate `resolution.confidence`/`warnings` → `ResolutionEdge.confidence` (this is what closes the ergonomics gap in issue #832).

## 8. Versioning rules

- `SCHEMA_VERSION` follows the package's semver **for the document schema**: any change to §3/§6 without a version bump **fails CI** — the corpus snapshot suite diffs projections against the declared schema version, so an undeclared IR change is a red build, not a surprise (this is what makes `schemaVersion` load-bearing rather than decorative).
- Adding a `kind` within an existing family: **minor** (family-level switches unaffected; kind-level exhaustive switches should include a family-scoped default arm — documented in the README).
- Adding a `ReasonCode`: **minor**. Adding the reserved `Confidence.score` field: **minor**, permitted only with a committed calibration artifact and published calibration error (ADR 0005).
- Adding a `LintRule`: **minor** (CI consumers pin `--fail-on` severity, not rule counts).
- `format()` output: canonical rendering may change within **minors**; only the round-trip law is semver-guaranteed. Byte-stable output is a patch-level property.
- `citation-document.schema.json` versions in lockstep with `SCHEMA_VERSION` and publishes as a release artifact.
- Adding a family, changing any field's meaning, or tightening an invariant: **major**.
- Reopening an extension seam (ADR 0001) is a **minor** addition, designed against the deferred blueprint in §10.

## 9. Deliberate data-model calls (spec-level, flagged for veto)

- **All-string `volume`/`page`/`section`**: "1984-1" volumes and "___" blank pages exist in the wild; `number | string` unions push a type test onto every consumer while pretending numbers are the norm. Numeric comparison is a consumer-side `Number()` where it's truly numeric.
- **`markup` includes `"markdown"`**: the 0.x cleaner set already handles Markdown emphasis; the format enum should say so rather than hide it under "auto" only.
- **No minimum-confidence option**: filtering is a one-line caller `filter` on `level`; an option that changes output membership but must not change ids adds an invariant for near-zero leverage.
- **`components` provenance is optional per citation**: present when captured; an empty object adds noise for kinds with no sub-fields.

## 10. Deferred: the extension layer (blueprint summary)

Recorded so the next design session doesn't start from zero (full rationale: ADR 0001). When a second real adapter appears for any of these, the drafted `createExtractor(config)` design adds — as a minor version — the seams below. Until then they do not exist publicly.

| Seam | Shape | The two adapters that would justify it |
|---|---|---|
| Recognition | `CitationPattern { id, kind: "x-…", regex, extract(match) }`; plugin spans are relative to their own match, so no coordinate system can leak | built-in pattern sets + a tribal/foreign reporter or firm-internal format |
| Statute codes | data entries, no regex | built-in state entries + territorial/municipal codes |
| Cleaning | `(text) => text`, engine tracks shifts | built-in HTML/unicode chain + OCR-artifact fixer |
| Resolution | `ShortFormResolver.resolve(shortForm, ctx)`, first non-null wins | Bluebook default + strict-footnote or brief-bank resolver |
| Observation | read-only stage timings/rejections | corpus tooling + caller telemetry |

Config validation happens at construction (`ConfigError`), never during `extract` — extraction stays total.

## 11. Rebuild consequences (internal, non-normative)

This surface settles the internal architecture-review candidates: dual-coordinate spans become fully private (mandatory), the orchestrator pass pipeline / case-stage collapse / resolver split / statute registry become invisible internal refactors, and the pattern↔extractor contract is free to become `pattern.extract(token, ctx)` with no public trace. Corpus projections regenerate against `(kind, id, refersTo)` at the end of the rewrite; the definition of done is all three nets green — regenerated corpus parity, the round-trip law over the generator, and `validateDocument` over every corpus output.

**The round-trip net.** `format()` existing makes the rewrite's strongest property test possible: an internal generator produces random schema-valid citation IRs across the full taxonomy, and CI asserts the round-trip law — `extract(format(c))` recovers `c`'s family, kind, and populated fields. Corpus projections prove parity with the past; gold labels prove resolution truth; the generator proves coverage of shapes no corpus contains (hyphenated volumes, blank pages, deep subsection ranges, every kind × optional-field combination). The generator is internal test infrastructure, not public API.

**Resolver rewrite measurement.** Regenerated corpus projections prove parity, not improvement — they lock in current resolution behavior, mistakes included. The antecedent annotator (#829) merges *before* the rewrite as v1 infrastructure: it becomes the first 0.x→v1 migration consumer (its engine-guess/candidates/confidence payload maps 1:1 onto `ResolutionEdge` + `Confidence`), and the gold Id./supra labels it produces are the resolver rewrite's accuracy scoreboard. Target label count is set by available expert hours; if that is zero, the resolver rewrite is measured by parity plus the seeded hard cases, explicitly. Calibration (and the reserved `score` field) stays post-1.0 (ADR 0005).
