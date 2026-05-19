import type { Citation, HistorySignal } from "../types/citation"
import type { Span } from "../types/span"

/**
 * Attribution mode for a quoted-text zone. Reflects the structural
 * relationship between the quote and the citation that vouches for it.
 *
 * - "block-quote": Bluebook Rule 5 — quote set off as an indented block or
 *   marked with markdown `>`, with the citation immediately following.
 * - "adjacent": inline quote in the same sentence as the citation.
 * - "parenthetical": quote inside an explanatory parenthetical
 *   (e.g. `(quoting "..." Smith, 1 U.S. 1)`).
 */
export type AttributionKind = "block-quote" | "adjacent" | "parenthetical"

/**
 * A quoted-text zone paired with the citation (if any) that vouches for it.
 * Produced by the document analyzer; one entry per detected quote zone.
 * Unattributed zones surface with `citationIndex` undefined.
 */
export interface QuoteAttribution {
  /** The quoted-text span in original-text coordinates. */
  quoteSpan: Span
  /** Verbatim quoted text (chars between the marks, exclusive of the marks). */
  quoteText: string
  /** Citation index that vouches for the quote; undefined when none found. */
  citationIndex?: number
  /** How the attribution was inferred; undefined iff citationIndex is. */
  attributionKind?: AttributionKind
  /**
   * Confidence (0-1). See `quoteAttribution.ts` for the stratification:
   *   block-quote, citation within 50 chars: 0.98
   *   block-quote, citation within 200 chars: 0.90
   *   adjacent inline, same sentence: 0.85
   *   parenthetical-internal: 0.95
   *   unattributed: undefined
   */
  confidence?: number
}

/**
 * A typed edge in the citation graph. `from` and `to` are indices into
 * the `Document.citations` array. `type` discriminates the union.
 *
 * See `docs/superpowers/specs/2026-05-19-document-understanding-api-design.md`
 * for the source-map describing which existing citation fields drive each kind.
 */
export type Edge =
  | { type: "resolves-to"; from: number; to: number; confidence: number; warnings?: string[] }
  | { type: "antecedent"; from: number; to: number }
  | { type: "parallel"; from: number; to: number; groupId: string }
  | { type: "history-of"; from: number; to: number; signal: HistorySignal }
  | { type: "pincite-inherit"; from: number; to: number }
  | { type: "string-cite"; from: number; to: number; groupId: string; position: number }
  | { type: "in-parenthetical-of"; from: number; to: number }

/**
 * The graph of relationships between citations in a document.
 *
 * - `nodes.length === citations.length` always; isolated nodes
 *   (no edges) are still included so consumers iterating nodes don't
 *   miss anything.
 * - `edges` is sorted by from-index, then type (alphabetical), then
 *   to-index for deterministic iteration and test assertions.
 * - No self-edges. No duplicate edges of the same type+from+to.
 *   Undirected relationships (parallel groups) emit one edge per pair.
 */
export interface CitationGraph {
  nodes: number[]
  edges: Edge[]
}

/**
 * A footnote zone with the citations it contains. Populated only when
 * input citations carry footnote tagging (extractCitations was called
 * with `detectFootnotes: true`).
 */
export interface AnalyzedFootnoteZone {
  start: number
  end: number
  footnoteNumber: number
  /** Indices of citations whose span falls inside this footnote. */
  citationIndices: number[]
}

/**
 * The document analysis result. Returned by `analyzeDocument(text, citations)`.
 *
 * Produced as a pure projection over `text + citations[]` — no new
 * tokenization or extraction. See the design doc for the algorithm rationale.
 */
export interface Document {
  /** The citations that were analyzed. Same array reference as the input. */
  citations: Citation[]

  /** Prose between citations (+ before-first + after-last). Sorted by
   *  originalStart. Uses `fullSpan` (when available) to bound citations,
   *  so case-name text is not mislabeled as prose. */
  proseSpans: Span[]

  /** Per-citation view: prose span ending at this citation. */
  precedingProse: Map<number, Span>

  /** Per-citation view: prose span starting after this citation. */
  followingProse: Map<number, Span>

  /** Detected quoted-text zones with attempted attribution. Includes
   *  unattributed zones (citationIndex undefined). */
  quoteAttributions: QuoteAttribution[]

  /** All relationships between citations as typed edges. */
  citationGraph: CitationGraph

  /** Footnote zones with citation members. Optional — only present when
   *  citations carry footnote tagging. */
  footnoteZones?: AnalyzedFootnoteZone[]
}
