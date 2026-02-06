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
import { annotate } from '@/annotate/annotate'

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

	describe('4th Series Reporters', () => {
		it('extracts F.4th citations', () => {
			const text = 'The court in Smith v. Jones, 50 F.4th 100 (2021), held...'
			const citations = extractCitations(text)

			const f4th = citations.find(
				(c) => c.type === 'case' && c.volume === 50 && c.reporter === 'F.4th',
			)
			expect(f4th).toBeDefined()
			if (f4th && f4th.type === 'case') {
				expect(f4th.volume).toBe(50)
				expect(f4th.reporter).toBe('F.4th')
				expect(f4th.page).toBe(100)
			}
		})

		it('extracts Cal.App.4th citations', () => {
			const text = 'See People v. Smith, 173 Cal.App.4th 655, for precedent.'
			const citations = extractCitations(text)

			const calApp4th = citations.find(
				(c) =>
					c.type === 'case' &&
					c.volume === 173 &&
					c.reporter === 'Cal.App.4th',
			)
			expect(calApp4th).toBeDefined()
			if (calApp4th && calApp4th.type === 'case') {
				expect(calApp4th.volume).toBe(173)
				expect(calApp4th.reporter).toBe('Cal.App.4th')
				expect(calApp4th.page).toBe(655)
			}
		})

		it('extracts A.4th citations', () => {
			const text = 'The decision in Doe v. Roe, 100 A.4th 200, is binding.'
			const citations = extractCitations(text)

			const a4th = citations.find(
				(c) => c.type === 'case' && c.volume === 100 && c.reporter === 'A.4th',
			)
			expect(a4th).toBeDefined()
			if (a4th && a4th.type === 'case') {
				expect(a4th.volume).toBe(100)
				expect(a4th.reporter).toBe('A.4th')
				expect(a4th.page).toBe(200)
			}
		})

		it('extracts Cal.App.5th citations', () => {
			const text = 'See People v. Johnson, 75 Cal.App.5th 123, for analysis.'
			const citations = extractCitations(text)

			const calApp5th = citations.find(
				(c) =>
					c.type === 'case' &&
					c.volume === 75 &&
					c.reporter === 'Cal.App.5th',
			)
			expect(calApp5th).toBeDefined()
			if (calApp5th && calApp5th.type === 'case') {
				expect(calApp5th.volume).toBe(75)
				expect(calApp5th.reporter).toBe('Cal.App.5th')
				expect(calApp5th.page).toBe(123)
			}
		})

		it('extracts F.Supp.4th citations', () => {
			const text = 'In United States v. Smith, 200 F.Supp.4th 500, the district court...'
			const citations = extractCitations(text)

			const fSupp4th = citations.find(
				(c) =>
					c.type === 'case' &&
					c.volume === 200 &&
					c.reporter === 'F.Supp.4th',
			)
			expect(fSupp4th).toBeDefined()
			if (fSupp4th && fSupp4th.type === 'case') {
				expect(fSupp4th.volume).toBe(200)
				expect(fSupp4th.reporter).toBe('F.Supp.4th')
				expect(fSupp4th.page).toBe(500)
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

	describe('HTML annotation safety (#17)', () => {
		it('should annotate on original HTML without breaking tags', () => {
			// annotate imported at top of file

			const html = 'See <b>Smith</b> v. <em>Jones</em>, 500 F.2d 123 (2020).'
			const citations = extractCitations(html)

			expect(citations.length).toBeGreaterThanOrEqual(1)

			const result = annotate(html, citations, {
				template: { before: '<cite>', after: '</cite>' },
				autoEscape: false,
			})

			// Annotated text should not have broken HTML tags
			expect(result.text).not.toMatch(/<[^>]*<cite>/)
			expect(result.text).not.toMatch(/<\/cite>[^<]*>/)
			expect(result.skipped).toHaveLength(0)
		})

		it('should annotate citation spanning across HTML tags', () => {
			// annotate imported at top of file

			// Citation text spans an anchor tag boundary
			const html = '145, <a href="#p410">*410</a>11 N. H. 459'
			const citations = extractCitations(html)

			if (citations.length > 0) {
				const result = annotate(html, citations, {
					template: { before: '{', after: '}' },
					autoEscape: false,
				})

				// Should not insert markers inside tag attributes
				expect(result.text).not.toMatch(/<a[^>]*\{/)
				expect(result.text).not.toMatch(/\}[^<]*>/)
			}
		})
	})

	describe('Parallel Citation Detection (Phase 8)', () => {
		it('links parallel citations with groupId and parallelCitations array', () => {
			const text = 'See 410 U.S. 113, 93 S. Ct. 705 (1973).'
			const citations = extractCitations(text)

			expect(citations).toHaveLength(2)

			// Find the citations by volume
			const primary = citations.find(c => c.type === 'case' && c.volume === 410)
			const secondary = citations.find(c => c.type === 'case' && c.volume === 93)

			expect(primary).toBeDefined()
			expect(secondary).toBeDefined()

			if (primary && primary.type === 'case' && secondary && secondary.type === 'case') {
				// Both should have the same groupId
				expect(primary.groupId).toBeDefined()
				expect(secondary.groupId).toBeDefined()
				expect(primary.groupId).toBe(secondary.groupId)

				// Only primary gets parallelCitations array
				expect(primary.parallelCitations).toBeDefined()
				expect(primary.parallelCitations).toHaveLength(1)
				expect(primary.parallelCitations?.[0]).toMatchObject({
					volume: 93,
					reporter: 'S. Ct.',
					page: 705
				})

				// Secondary should NOT have parallelCitations array
				expect(secondary.parallelCitations).toBeUndefined()
			}
		})

		it('detects 3-reporter parallel citations', () => {
			const text = '410 U.S. 113, 93 S. Ct. 705, 35 L. Ed. 2d 147 (1973)'
			const citations = extractCitations(text)

			expect(citations).toHaveLength(3)

			const primary = citations.find(c => c.type === 'case' && c.volume === 410)
			expect(primary).toBeDefined()

			if (primary && primary.type === 'case') {
				expect(primary.groupId).toBeDefined()
				expect(primary.parallelCitations).toBeDefined()
				expect(primary.parallelCitations).toHaveLength(2)

				// Verify both secondary citations are in the array
				expect(primary.parallelCitations?.[0]).toMatchObject({
					volume: 93,
					reporter: 'S. Ct.',
					page: 705
				})
				expect(primary.parallelCitations?.[1]).toMatchObject({
					volume: 35,
					reporter: 'L. Ed. 2d',
					page: 147
				})
			}
		})

		it('does not link citations without shared parenthetical', () => {
			const text = 'See 500 F.2d 100 (1974), and 600 F.2d 200 (1975).'
			const citations = extractCitations(text)

			expect(citations).toHaveLength(2)

			// Neither should have groupId (different parentheticals = not parallel)
			const cite1 = citations.find(c => c.type === 'case' && c.volume === 500)
			const cite2 = citations.find(c => c.type === 'case' && c.volume === 600)

			expect(cite1).toBeDefined()
			expect(cite2).toBeDefined()

			if (cite1 && cite1.type === 'case' && cite2 && cite2.type === 'case') {
				expect(cite1.groupId).toBeUndefined()
				expect(cite2.groupId).toBeUndefined()
				expect(cite1.parallelCitations).toBeUndefined()
				expect(cite2.parallelCitations).toBeUndefined()
			}
		})

		it('handles multiple parallel groups in same document', () => {
			const text = '500 F.2d 100, 200 F. Supp. 50 (1970). See also 300 F.3d 200, 100 F. Supp. 2d 75 (2000).'
			const citations = extractCitations(text)

			expect(citations).toHaveLength(4)

			// First group
			const group1Primary = citations.find(c => c.type === 'case' && c.volume === 500)
			const group1Secondary = citations.find(c => c.type === 'case' && c.volume === 200 && c.reporter === 'F. Supp.')

			// Second group
			const group2Primary = citations.find(c => c.type === 'case' && c.volume === 300)
			const group2Secondary = citations.find(c => c.type === 'case' && c.volume === 100)

			expect(group1Primary).toBeDefined()
			expect(group1Secondary).toBeDefined()
			expect(group2Primary).toBeDefined()
			expect(group2Secondary).toBeDefined()

			if (group1Primary && group1Primary.type === 'case' &&
				group1Secondary && group1Secondary.type === 'case' &&
				group2Primary && group2Primary.type === 'case' &&
				group2Secondary && group2Secondary.type === 'case') {

				// Group 1 should share groupId
				expect(group1Primary.groupId).toBeDefined()
				expect(group1Secondary.groupId).toBeDefined()
				expect(group1Primary.groupId).toBe(group1Secondary.groupId)

				// Group 2 should share groupId (different from group 1)
				expect(group2Primary.groupId).toBeDefined()
				expect(group2Secondary.groupId).toBeDefined()
				expect(group2Primary.groupId).toBe(group2Secondary.groupId)
				expect(group2Primary.groupId).not.toBe(group1Primary.groupId)
			}
		})
	})

	describe('Unicode Dash Handling (Issue #54)', () => {
		it('extracts year from citation with en-dash in pincite range', () => {
			// En-dash (U+2013) in pincite range should be normalized to hyphen
			const text = '500 F.3d 100, 105–107 (2020)'
			const citations = extractCitations(text)

			const citation = citations.find(
				(c) => c.type === 'case' && c.volume === 500,
			)
			expect(citation).toBeDefined()
			if (citation && citation.type === 'case') {
				expect(citation.volume).toBe(500)
				expect(citation.reporter).toBe('F.3d')
				expect(citation.page).toBe(100)
				expect(citation.year).toBe(2020)
			}
		})

		it('recognizes em-dash as blank page placeholder', () => {
			// Em-dash (U+2014) should be recognized as blank page indicator
			const text = '500 F.4th — (2024)'
			const citations = extractCitations(text)

			const citation = citations.find(
				(c) => c.type === 'case' && c.volume === 500,
			)
			expect(citation).toBeDefined()
			if (citation && citation.type === 'case') {
				expect(citation.volume).toBe(500)
				expect(citation.reporter).toBe('F.4th')
				expect(citation.page).toBeUndefined()
				expect(citation.hasBlankPage).toBe(true)
				expect(citation.year).toBe(2024)
			}
		})

		it('handles multiple en-dashes in volume ranges', () => {
			// Test with hyphenated volume (though this uses en-dash)
			const text = '1984–1 F.2d 100 (2020)'
			const citations = extractCitations(text)

			const citation = citations.find(
				(c) => c.type === 'case' && c.volume === '1984-1',
			)
			expect(citation).toBeDefined()
			if (citation && citation.type === 'case') {
				expect(citation.volume).toBe('1984-1')
				expect(citation.reporter).toBe('F.2d')
				expect(citation.page).toBe(100)
				expect(citation.year).toBe(2020)
			}
		})
	})
})
