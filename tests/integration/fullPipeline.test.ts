/**
 * Integration Tests for Full Citation Extraction Pipeline
 *
 * Tests the complete flow: cleanText → tokenize → extract → translate
 *
 * These tests use realistic legal text samples to validate:
 * - Multi-stage pipeline execution
 * - Position accuracy (ASCII-only for MVP, Unicode deferred to Phase 3)
 * - Multiple citation types extraction
 * - HTML handling
 * - Sync/async API equivalence
 */

import { describe, it, expect } from 'vitest'
import { extractCitations, extractCitationsAsync } from '@/extract/extractCitations'
import { stripHtmlTags } from '@/clean/cleaners'

// ============================================================================
// Test Data: Realistic Legal Text Samples
// ============================================================================

const CLEAN_CASE_TEXT = 'In Smith v. Doe, 500 F.2d 123 (9th Cir. 2020), the court held...'

const HTML_CASE_TEXT = '<p>In <b>Smith v. Doe</b>, 500 F.2d 123, the court...</p>'

const MULTIPLE_TYPES_TEXT = 'See 42 U.S.C. § 1983; Smith v. Doe, 500 F.2d 123; 123 Harv. L. Rev. 456'

const POSITION_ACCURACY_TEXT = 'The case Smith v. Doe, 500 F.2d 123, established...'

const COMPLEX_LEGAL_TEXT = `
The Supreme Court in Roe v. Wade, 410 U.S. 113, 115 (1973), established
a constitutional right to privacy. See also Planned Parenthood v. Casey,
505 U.S. 833 (1992). This builds on earlier precedent from Griswold v.
Connecticut, 381 U.S. 479 (1965), which found privacy rights in the
penumbras of the Bill of Rights. For scholarly analysis, see Jane Doe,
Privacy and the Constitution, 100 Harv. L. Rev. 1234, 1240 (1987).
`

const NO_CITATIONS_TEXT = 'This is plain text with no legal citations at all.'

const NEUTRAL_CITATION_TEXT = '2020 WL 123456 is a Westlaw neutral citation'

const STATUTE_TEXT = 'Under 42 U.S.C. § 1983, plaintiffs may seek damages'

// ============================================================================
// Test Suite
// ============================================================================

describe('Full Pipeline Integration Tests', () => {
	describe('Basic Extraction', () => {
		it('extracts case citation from clean text', () => {
			const citations = extractCitations(CLEAN_CASE_TEXT)

			// Should find at least one citation (may find duplicates due to overlapping patterns)
			expect(citations.length).toBeGreaterThanOrEqual(1)

			// Find the main case citation with core metadata
			const caseCitation = citations.find(
				(c) => c.type === 'case' && c.volume === 500,
			)
			expect(caseCitation).toBeDefined()
			expect(caseCitation).toMatchObject({
				type: 'case',
				volume: 500,
				reporter: 'F.2d',
				page: 123,
			})

			// Note: Court and year extraction from parentheticals is a Phase 3 enhancement.
			// Phase 2 MVP patterns only match volume-reporter-page to avoid ReDoS.
			// Future: Extend patterns to include optional parenthetical matching.

			// Verify position points to citation text in original
			expect(caseCitation?.span.originalStart).toBeGreaterThanOrEqual(0)
			expect(caseCitation?.span.originalEnd).toBeLessThanOrEqual(
				CLEAN_CASE_TEXT.length,
			)

			// Extract matched region from original
			const matched = CLEAN_CASE_TEXT.substring(
				caseCitation?.span.originalStart,
				caseCitation?.span.originalEnd,
			)
			expect(matched).toContain('500')
			expect(matched).toContain('F.2d')
			expect(matched).toContain('123')
		})

		it('extracts case citation from HTML-heavy text', () => {
			const citations = extractCitations(HTML_CASE_TEXT)

			// Should find at least one citation (may find duplicates due to overlapping patterns)
			expect(citations.length).toBeGreaterThanOrEqual(1)

			// Find the main case citation
			const caseCitation = citations.find(
				(c) => c.type === 'case' && c.volume === 500,
			)
			expect(caseCitation).toBeDefined()
			expect(caseCitation).toMatchObject({
				type: 'case',
				volume: 500,
				reporter: 'F.2d',
				page: 123,
			})

			// Citation should be found after HTML stripping
			expect(caseCitation?.span.originalStart).toBeGreaterThanOrEqual(0)
			expect(caseCitation?.span.originalEnd).toBeLessThanOrEqual(
				HTML_CASE_TEXT.length,
			)
		})
	})

	describe('Multiple Citation Types', () => {
		it('extracts multiple citation types from single text', () => {
			const citations = extractCitations(MULTIPLE_TYPES_TEXT)

			// Should find statute, case, and journal citations
			expect(citations.length).toBeGreaterThanOrEqual(2)

			// Verify we have different types
			const types = new Set(citations.map((c) => c.type))
			expect(types.size).toBeGreaterThan(1)

			// Find statute citation
			const statute = citations.find((c) => c.type === 'statute')
			expect(statute).toBeDefined()
			if (statute && statute.type === 'statute') {
				expect(statute.code).toContain('U.S.C.')
				expect(statute.section).toContain('1983')
			}

			// Find case citation
			const caseCite = citations.find((c) => c.type === 'case')
			expect(caseCite).toBeDefined()
			if (caseCite && caseCite.type === 'case') {
				expect(caseCite.volume).toBe(500)
				expect(caseCite.reporter).toBe('F.2d')
				expect(caseCite.page).toBe(123)
			}

			// Find journal citation
			const journal = citations.find((c) => c.type === 'journal')
			expect(journal).toBeDefined()
			if (journal && journal.type === 'journal') {
				expect(journal.volume).toBe(123)
				expect(journal.abbreviation).toContain('Harv. L. Rev.')
			}
		})
	})

	describe('Position Accuracy', () => {
		it('reports accurate positions in original text (ASCII)', () => {
			const citations = extractCitations(POSITION_ACCURACY_TEXT)

			// Should find at least one citation
			expect(citations.length).toBeGreaterThanOrEqual(1)

			// Find the main case citation
			const caseCitation = citations.find(
				(c) => c.type === 'case' && c.volume === 500,
			)
			expect(caseCitation).toBeDefined()

			// Extract the matched region from original text
			const matched = POSITION_ACCURACY_TEXT.substring(
				caseCitation?.span.originalStart,
				caseCitation?.span.originalEnd,
			)

			// Should match the citation text (volume reporter page)
			expect(matched).toContain('500')
			expect(matched).toContain('F.2d')
			expect(matched).toContain('123')

			// Verify positions are within bounds
			expect(caseCitation?.span.originalStart).toBeGreaterThanOrEqual(0)
			expect(caseCitation?.span.originalEnd).toBeLessThanOrEqual(
				POSITION_ACCURACY_TEXT.length,
			)
			expect(caseCitation?.span.originalEnd).toBeGreaterThan(
				caseCitation?.span.originalStart,
			)
		})
	})

	describe('Complex Legal Text', () => {
		it('extracts multiple citations from realistic legal text', () => {
			const citations = extractCitations(COMPLEX_LEGAL_TEXT)

			// Should find multiple case citations and journal citation
			expect(citations.length).toBeGreaterThanOrEqual(3)

			// Verify no false positives (all citations should be valid)
			for (const citation of citations) {
				expect(citation.confidence).toBeGreaterThan(0)
				expect(citation.confidence).toBeLessThanOrEqual(1)

				// Should have valid positions
				expect(citation.span.originalStart).toBeGreaterThanOrEqual(0)
				expect(citation.span.originalEnd).toBeLessThanOrEqual(
					COMPLEX_LEGAL_TEXT.length,
				)
			}

			// Should find Roe v. Wade
			const roe = citations.find(
				(c) =>
					c.type === 'case' &&
					c.volume === 410 &&
					c.reporter === 'U.S.' &&
					c.page === 113,
			)
			expect(roe).toBeDefined()

			// Should find Planned Parenthood v. Casey
			const casey = citations.find(
				(c) =>
					c.type === 'case' &&
					c.volume === 505 &&
					c.reporter === 'U.S.' &&
					c.page === 833,
			)
			expect(casey).toBeDefined()

			// Should find Griswold v. Connecticut
			const griswold = citations.find(
				(c) =>
					c.type === 'case' &&
					c.volume === 381 &&
					c.reporter === 'U.S.' &&
					c.page === 479,
			)
			expect(griswold).toBeDefined()

			// Should find journal citation
			const journal = citations.find(
				(c) =>
					c.type === 'journal' &&
					c.volume === 100 &&
					c.abbreviation?.includes('Harv. L. Rev.'),
			)
			expect(journal).toBeDefined()
		})
	})

	describe('Edge Cases', () => {
		it('handles text with no citations', () => {
			const citations = extractCitations(NO_CITATIONS_TEXT)
			expect(citations).toHaveLength(0)
		})

		it('extracts neutral citations', () => {
			const citations = extractCitations(NEUTRAL_CITATION_TEXT)

			const neutral = citations.find((c) => c.type === 'neutral')
			expect(neutral).toBeDefined()

			if (neutral && neutral.type === 'neutral') {
				expect(neutral.year).toBe(2020)
				expect(neutral.court).toContain('WL')
				expect(neutral.documentNumber).toBe('123456')
				expect(neutral.confidence).toBe(1.0) // Neutral citations have max confidence
			}
		})

		it('extracts statute citations', () => {
			const citations = extractCitations(STATUTE_TEXT)

			const statute = citations.find((c) => c.type === 'statute')
			expect(statute).toBeDefined()

			if (statute && statute.type === 'statute') {
				expect(statute.code).toContain('U.S.C.')
				expect(statute.section).toContain('1983')
			}
		})
	})

	describe('Custom Options', () => {
		it('accepts custom cleaners', () => {
			const html = '<p>Smith v. Doe, 500 F.2d 123</p>'

			// Use only HTML stripping (skip other default cleaners)
			const citations = extractCitations(html, {
				cleaners: [stripHtmlTags],
			})

			// Should still find citation with minimal cleaning
			expect(citations.length).toBeGreaterThanOrEqual(1)
			const citation = citations.find((c) => c.type === 'case' && c.volume === 500)
			expect(citation).toBeDefined()
			if (citation && citation.type === 'case') {
				expect(citation.reporter).toBe('F.2d')
				expect(citation.page).toBe(123)
			}
		})
	})

	describe('Async API', () => {
		it('async API produces identical results to sync API', async () => {
			const syncCitations = extractCitations(CLEAN_CASE_TEXT)
			const asyncCitations = await extractCitationsAsync(CLEAN_CASE_TEXT)

			expect(asyncCitations).toHaveLength(syncCitations.length)

			// Compare each citation
			for (let i = 0; i < syncCitations.length; i++) {
				expect(asyncCitations[i]).toMatchObject({
					type: syncCitations[i].type,
					text: syncCitations[i].text,
					span: syncCitations[i].span,
				})
			}
		})

		it('async API works with complex text', async () => {
			const citations = await extractCitationsAsync(COMPLEX_LEGAL_TEXT)

			expect(citations.length).toBeGreaterThanOrEqual(3)

			// Should find same citations as sync version
			const roe = citations.find(
				(c) =>
					c.type === 'case' &&
					c.volume === 410 &&
					c.reporter === 'U.S.' &&
					c.page === 113,
			)
			expect(roe).toBeDefined()
		})
	})

	describe('Performance', () => {
		it('processes citations within reasonable time', () => {
			const startTime = performance.now()
			const citations = extractCitations(COMPLEX_LEGAL_TEXT)
			const duration = performance.now() - startTime

			// Should complete in under 100ms for short text
			expect(duration).toBeLessThan(100)
			expect(citations.length).toBeGreaterThan(0)

			// Each citation should have processTimeMs populated
			for (const citation of citations) {
				expect(citation.processTimeMs).toBeGreaterThan(0)
			}
		})
	})
})
