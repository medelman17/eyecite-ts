/**
 * eyecite-ts: TypeScript legal citation extraction library
 *
 * Port of Python eyecite with zero dependencies, browser compatibility,
 * and <50KB gzipped bundle size.
 *
 * ## API Tiers
 *
 * **Convenience API (most users):**
 * - `extractCitations(text)` / `extractCitationsAsync(text)` - Main extraction functions
 *
 * **Granular API (power users):**
 * - `cleanText()` - Text cleaning with position tracking
 * - `tokenize()` - Pattern matching to find citation candidates
 * - `extractCase()`, `extractStatute()`, etc. - Individual extraction functions
 *
 * **Types:**
 * - `Citation` and subtypes (`FullCaseCitation`, `StatuteCitation`, etc.)
 * - `Span`, `TransformationMap`, `Token`, etc.
 *
 * @packageDocumentation
 */

// ============================================================================
// Types (from Phase 1)
// ============================================================================

export type {
  AnnotationCitation,
  AnnotationComponentSpans,
  CaseComponentSpans,
  Citation,
  CitationBase,
  CitationId,
  CitationOfType,
  CitationSignal,
  CitationType,
  ConstitutionalCitation,
  ConstitutionalComponentSpans,
  CourtInference,
  DocketCitation,
  ExtractorMap,
  FederalRegisterCitation,
  FederalRegisterComponentSpans,
  FederalRuleCitation,
  FederalRuleComponentSpans,
  FullCaseCitation,
  FullCitation,
  FullCitationType,
  HistoryChain,
  HistoryLink,
  HistorySignal,
  IdCitation,
  JournalCitation,
  JournalComponentSpans,
  NeutralCitation,
  NeutralComponentSpans,
  ParallelGroup,
  Parenthetical,
  ParentheticalType,
  PublicLawCitation,
  PublicLawComponentSpans,
  RestatementCitation,
  RestatementComponentSpans,
  ShortFormCaseCitation,
  ShortFormCitation,
  ShortFormCitationType,
  Span,
  StatuteCitation,
  StatuteComponentSpans,
  StatutesAtLargeCitation,
  StatutesAtLargeComponentSpans,
  SubsequentHistoryEntry,
  SupraCitation,
  TransformationMap,
  TreatiseCitation,
  TreatiseComponentSpans,
  Warning,
} from "./types"

export {
  assertUnreachable,
  isCaseCitation,
  isCitationType,
  isFullCitation,
  isShortFormCitation,
  spanFromGroupIndex,
} from "./types"

// ============================================================================
// Main API (Phase 2) - Convenience Functions
// ============================================================================

export type { ExtractOptions } from "./extract/extractCitations"
export { extractCitations, extractCitationsAsync } from "./extract/extractCitations"
export { byId } from "./extract/assignCitationIds"
export { applyFalsePositiveFilters } from "./extract/filterFalsePositives"

// ============================================================================
// Granular APIs (Phase 2) - For Power Users
// ============================================================================

// Text Cleaning Layer
export { cleanText, stripMarkdownEmphasis } from "./clean"
export type { CleanTextResult } from "./clean/cleanText"
// Extraction Functions (for advanced use cases)
export {
  extractAnnotation,
  extractCase,
  extractConstitutional,
  extractFederalRegister,
  extractFederalRule,
  extractJournal,
  extractNeutral,
  extractPublicLaw,
  extractRestatement,
  extractStatute,
  extractStatutesAtLarge,
  extractTreatise,
} from "./extract"
export { normalizeCourt } from "./extract/courtNormalization"
export type { PinciteInfo } from "./extract/pincite"
export { parsePincite } from "./extract/pincite"
// Tokenization Layer
export { tokenize } from "./tokenize"
export type { Token } from "./tokenize/tokenizer"

// ============================================================================
// Phase 3: Annotation
// ============================================================================

// Note: Annotation API available via separate entry point:
// import { annotate } from 'eyecite-ts/annotate'

// ============================================================================
// Phase 4: Resolution
// ============================================================================

export { DocumentResolver, resolveCitations } from "./resolve"
export type {
  ResolutionOptions,
  ResolutionResult,
  ResolvedCitation,
  ScopeStrategy,
} from "./resolve/types"

// ============================================================================
// Footnote Detection
// ============================================================================

export type { FootnoteMap, FootnoteZone } from "./footnotes"
export { detectFootnotes } from "./footnotes"

// ============================================================================
// Document Understanding API
// ============================================================================

export type {
  AnalyzedFootnoteZone,
  AttributionKind,
  CitationGraph,
  Document,
  Edge,
  QuoteAttribution,
} from "./document"
export { analyzeDocument } from "./document"
