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
	Span,
	TransformationMap,
	Citation,
	CitationType,
	CitationBase,
	CitationOfType,
	ExtractorMap,
	FullCaseCitation,
	StatuteCitation,
	JournalCitation,
	NeutralCitation,
	PublicLawCitation,
	FederalRegisterCitation,
	StatutesAtLargeCitation,
	IdCitation,
	SupraCitation,
	ShortFormCaseCitation,
	FullCitationType,
	ShortFormCitationType,
	FullCitation,
	ShortFormCitation,
	Warning,
} from './types'

export { isFullCitation, isShortFormCitation, isCaseCitation, isCitationType, assertUnreachable } from './types'

// ============================================================================
// Main API (Phase 2) - Convenience Functions
// ============================================================================

export { extractCitations, extractCitationsAsync } from './extract/extractCitations'
export type { ExtractOptions } from './extract/extractCitations'

// ============================================================================
// Granular APIs (Phase 2) - For Power Users
// ============================================================================

// Text Cleaning Layer
export { cleanText } from './clean'
export type { CleanTextResult } from './clean/cleanText'

// Tokenization Layer
export { tokenize } from './tokenize'
export type { Token } from './tokenize/tokenizer'

// Extraction Functions (for advanced use cases)
export {
	extractCase,
	extractStatute,
	extractJournal,
	extractNeutral,
	extractPublicLaw,
	extractFederalRegister,
	extractStatutesAtLarge,
} from './extract'

// ============================================================================
// Phase 3: Annotation
// ============================================================================

// Note: Annotation API available via separate entry point:
// import { annotate } from 'eyecite-ts/annotate'

// ============================================================================
// Phase 4: Resolution
// ============================================================================

export { resolveCitations, DocumentResolver } from './resolve'
export type {
	ResolutionOptions,
	ResolutionResult,
	ResolvedCitation,
	ScopeStrategy,
} from './resolve/types'
