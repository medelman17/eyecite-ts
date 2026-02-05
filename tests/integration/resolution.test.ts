/**
 * Integration Tests: Resolution Pipeline
 *
 * Tests end-to-end extraction → resolution workflow for short-form citations.
 */

import { describe, it, expect } from 'vitest'
import { extractCitations } from '@/extract/extractCitations'
import type { ResolvedCitation } from '@/resolve/types'

describe('Resolution Integration Tests', () => {
	describe('Id. Citation Resolution', () => {
		it('resolves Id. to immediately preceding case citation', () => {
			const text = 'See Smith v. Jones, 500 F.2d 123 (2020). Id. at 125.'

			const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

			expect(citations).toHaveLength(2)

			// First citation: full case
			expect(citations[0].type).toBe('case')
			expect(citations[0].resolution).toBeUndefined() // Full citations don't have resolution

			// Second citation: Id.
			expect(citations[1].type).toBe('id')
			expect(citations[1].resolution).toBeDefined()
			expect(citations[1].resolution?.resolvedTo).toBe(0) // Points to first citation
			expect(citations[1].resolution?.confidence).toBeGreaterThan(0.9)
			expect(citations[1].resolution?.failureReason).toBeUndefined()
		})

		it('resolves multiple Id. citations in sequence', () => {
			const text =
				'Smith v. Jones, 500 F.2d 123 (2020). Id. at 125. Id. at 130.'

			const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

			expect(citations).toHaveLength(3)

			// First Id. resolves to case
			expect(citations[1].type).toBe('id')
			expect(citations[1].resolution?.resolvedTo).toBe(0)

			// Second Id. also resolves to case (immediate preceding full citation)
			expect(citations[2].type).toBe('id')
			expect(citations[2].resolution?.resolvedTo).toBe(0)
		})

		it('fails to resolve orphan Id. without preceding case', () => {
			const text = 'Id. at 125 is a citation without antecedent.'

			const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

			expect(citations).toHaveLength(1)
			expect(citations[0].type).toBe('id')
			expect(citations[0].resolution?.resolvedTo).toBeUndefined()
			expect(citations[0].resolution?.failureReason).toBeDefined()
			expect(citations[0].resolution?.failureReason).toContain(
				'No preceding full case citation',
			)
		})
	})

	describe('Paragraph Scope Boundaries', () => {
		it('Id. does not resolve across paragraph boundaries (default)', () => {
			const text = `First paragraph: Smith v. Jones, 500 F.2d 123 (2020).

Second paragraph: Id. at 125.`

			const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

			expect(citations).toHaveLength(2)

			// Id. in second paragraph fails to resolve
			expect(citations[1].type).toBe('id')
			expect(citations[1].resolution?.resolvedTo).toBeUndefined()
			expect(citations[1].resolution?.failureReason).toContain('scope boundary')
		})

		it('Id. resolves within same paragraph', () => {
			const text =
				'Same paragraph: Smith v. Jones, 500 F.2d 123 (2020). Id. at 125.'

			const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

			expect(citations).toHaveLength(2)
			expect(citations[1].resolution?.resolvedTo).toBe(0)
		})

		it('no scope boundary with scopeStrategy: none', () => {
			const text = `First paragraph: Smith v. Jones, 500 F.2d 123 (2020).

Second paragraph: Id. at 125.`

			const citations = extractCitations(text, {
				resolve: true,
				resolutionOptions: {
					scopeStrategy: 'none',
				},
			}) as ResolvedCitation[]

			expect(citations).toHaveLength(2)

			// Id. resolves across paragraph with scope: none
			expect(citations[1].type).toBe('id')
			expect(citations[1].resolution?.resolvedTo).toBe(0)
		})
	})

	describe('Supra Citation Resolution', () => {
		it('resolves supra with exact party name match', () => {
			const text = 'Smith v. Jones, 500 F.2d 123 (2020). See also Smith, supra, at 460.'

			const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

			expect(citations).toHaveLength(2)

			// Supra citation
			expect(citations[1].type).toBe('supra')
			expect(citations[1].resolution?.resolvedTo).toBe(0)
			expect(citations[1].resolution?.confidence).toBeGreaterThan(0.8)
		})

		it('resolves supra with fuzzy party name matching (default)', () => {
			const text = 'Smith v. Jones, 500 F.2d 123 (2020). Smyth, supra, at 130.'

			const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

			expect(citations).toHaveLength(2)

			// Supra resolves with fuzzy matching (Smith ≈ Smyth)
			expect(citations[1].type).toBe('supra')
			expect(citations[1].resolution?.resolvedTo).toBe(0)
			expect(citations[1].resolution?.warnings).toBeDefined()
		})

		it('fails to resolve supra with no matching party name', () => {
			const text = 'Smith v. Jones, 500 F.2d 123 (2020). Brown, supra, at 200.'

			const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

			expect(citations).toHaveLength(2)

			// Supra fails - Brown doesn't match Smith (similarity below threshold)
			expect(citations[1].type).toBe('supra')
			expect(citations[1].resolution?.resolvedTo).toBeUndefined()
			expect(citations[1].resolution?.failureReason).toContain('similarity')
		})

		it('resolves supra to most recent matching case', () => {
			const text =
				'Smith v. A, 100 F.2d 10. Jones v. B, 200 F.2d 20. Smith, supra, at 15.'

			const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

			expect(citations).toHaveLength(3)

			// Supra resolves to first case (Smith v. A), not second (Jones)
			expect(citations[2].type).toBe('supra')
			expect(citations[2].resolution?.resolvedTo).toBe(0)
		})
	})

	describe('Short-Form Case Citation Resolution', () => {
		it('resolves short-form case to matching volume/reporter citation', () => {
			const text = 'Brown v. Board, 347 U.S. 483 (1954). See 347 U.S. at 495.'

			const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

			expect(citations).toHaveLength(2)

			// Short-form case citation
			expect(citations[1].type).toBe('shortFormCase')
			expect(citations[1].resolution?.resolvedTo).toBe(0)
			expect(citations[1].resolution?.confidence).toBeGreaterThan(0.6)
		})

		it('normalizes reporter abbreviations for flexible matching', () => {
			const text = 'Brown v. Board, 347 U.S. 483. See 347 U. S. at 495.'

			const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

			expect(citations).toHaveLength(2)

			// Short-form resolves despite spacing difference (U.S. vs U. S.)
			expect(citations[1].type).toBe('shortFormCase')
			expect(citations[1].resolution?.resolvedTo).toBe(0)
		})

		it('fails to resolve short-form case with no matching volume/reporter', () => {
			const text = 'Smith v. Jones, 500 F.2d 123. See 400 F.3d at 200.'

			const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

			expect(citations).toHaveLength(2)

			// Short-form fails - different volume/reporter
			expect(citations[1].type).toBe('shortFormCase')
			expect(citations[1].resolution?.resolvedTo).toBeUndefined()
			expect(citations[1].resolution?.failureReason).toContain('No matching full case citation')
		})
	})

	describe('Convenience API', () => {
		it('extractCitations with resolve: true returns resolved array', () => {
			const text = 'Smith v. Jones, 500 F.2d 123. Id. at 125.'

			const citations = extractCitations(text, { resolve: true })

			expect(citations).toHaveLength(2)
			// Type assertion succeeds
			const resolved = citations as ResolvedCitation[]
			expect(resolved[1].resolution).toBeDefined()
		})

		it('extractCitations without resolve returns plain citations', () => {
			const text = 'Smith v. Jones, 500 F.2d 123. Id. at 125.'

			const citations = extractCitations(text)

			expect(citations).toHaveLength(2)
			expect(citations[1].type).toBe('id')
			// No resolution field (plain Citation)
			expect((citations[1] as ResolvedCitation).resolution).toBeUndefined()
		})
	})

	describe('Unresolved Citation Warnings', () => {
		it('reports unresolved citations with failure reasons (default)', () => {
			const text = 'Id. at 100. Brown, supra. 500 F.2d at 200.'

			const citations = extractCitations(text, {
				resolve: true,
				resolutionOptions: {
					reportUnresolved: true, // default
				},
			}) as ResolvedCitation[]

			expect(citations).toHaveLength(3)

			// All three should have resolution results with failure reasons
			expect(citations[0].resolution?.failureReason).toBeDefined()
			expect(citations[1].resolution?.failureReason).toBeDefined()
			expect(citations[2].resolution?.failureReason).toBeDefined()
		})

		it('omits resolution field when reportUnresolved: false', () => {
			const text = 'Id. at 100.'

			const citations = extractCitations(text, {
				resolve: true,
				resolutionOptions: {
					reportUnresolved: false,
				},
			}) as ResolvedCitation[]

			expect(citations).toHaveLength(1)
			// Resolution field omitted for unresolved citations
			expect(citations[0].resolution).toBeUndefined()
		})
	})

	describe('Parallel Processing Safety', () => {
		it('processes two documents simultaneously without state leakage', () => {
			const doc1 = 'Smith v. Jones, 100 F.2d 10. Id. at 15.'
			const doc2 = 'Brown v. Board, 200 F.2d 20. Id. at 25.'

			// Process both documents in parallel
			const [citations1, citations2] = [
				extractCitations(doc1, { resolve: true }) as ResolvedCitation[],
				extractCitations(doc2, { resolve: true }) as ResolvedCitation[],
			]

			// Doc1: Id. resolves to Smith (index 0)
			expect(citations1[1].resolution?.resolvedTo).toBe(0)

			// Doc2: Id. resolves to Brown (index 0), NOT Smith from doc1
			expect(citations2[1].resolution?.resolvedTo).toBe(0)

			// Verify no cross-document contamination
			const doc1Full = citations1[0] as unknown as { volume: number }
			const doc2Full = citations2[0] as unknown as { volume: number }
			expect(doc1Full.volume).toBe(100) // Smith
			expect(doc2Full.volume).toBe(200) // Brown
		})
	})

	describe('Signal Word Stripping (#21)', () => {
		it('resolves supra when antecedent has "In" signal word', () => {
			const text = 'In Smith v. Jones, 500 F.2d 123 (2020). Smith, supra, at 130.'

			const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

			expect(citations).toHaveLength(2)
			expect(citations[1].type).toBe('supra')
			expect(citations[1].resolution?.resolvedTo).toBe(0)
			expect(citations[1].resolution?.failureReason).toBeUndefined()
		})

		it('resolves supra when antecedent has "See" signal word', () => {
			const text = 'See Brown v. Board, 347 U.S. 483 (1954). Brown, supra, at 495.'

			const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

			expect(citations).toHaveLength(2)
			expect(citations[1].type).toBe('supra')
			expect(citations[1].resolution?.resolvedTo).toBe(0)
		})

		it('resolves supra when antecedent has "Compare" signal word', () => {
			const text = 'Compare Adams v. Clark, 200 F.3d 100 (2010). Adams, supra, at 105.'

			const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

			expect(citations).toHaveLength(2)
			expect(citations[1].type).toBe('supra')
			expect(citations[1].resolution?.resolvedTo).toBe(0)
		})

		it('resolves supra when antecedent has "But see" signal word', () => {
			const text = 'But see Davis v. Miller, 300 F.2d 50 (2015). Davis, supra, at 55.'

			const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

			expect(citations).toHaveLength(2)
			expect(citations[1].type).toBe('supra')
			expect(citations[1].resolution?.resolvedTo).toBe(0)
		})

		it('resolves supra when antecedent has "See also" signal word', () => {
			const text = 'See also Wilson v. Taylor, 400 F.2d 200 (2018). Wilson, supra, at 210.'

			const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

			expect(citations).toHaveLength(2)
			expect(citations[1].type).toBe('supra')
			expect(citations[1].resolution?.resolvedTo).toBe(0)
		})

		it('preserves "In re" as part of party name (not a signal word)', () => {
			const text =
				'In re Goo, 500 F.2d 123 (2020). In re Goo, supra, at 130.'

			const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

			expect(citations).toHaveLength(2)
			expect(citations[1].type).toBe('supra')
			expect(citations[1].resolution?.resolvedTo).toBe(0)
		})
	})

	describe('Party Name Supra Resolution (#21)', () => {
		it('resolves supra using defendant name (exact match)', () => {
			const text = 'Smith v. Jones, 500 F.2d 123 (2020). Jones, supra, at 130.'

			const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

			expect(citations).toHaveLength(2)
			expect(citations[1].type).toBe('supra')
			expect(citations[1].resolution?.resolvedTo).toBe(0)
			expect(citations[1].resolution?.confidence).toBeGreaterThanOrEqual(0.95)
		})

		it('resolves supra using plaintiff name (exact match)', () => {
			const text = 'Smith v. Jones, 500 F.2d 123 (2020). Smith, supra, at 130.'

			const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

			expect(citations).toHaveLength(2)
			expect(citations[1].type).toBe('supra')
			expect(citations[1].resolution?.resolvedTo).toBe(0)
			expect(citations[1].resolution?.confidence).toBeGreaterThanOrEqual(0.95)
		})

		it('resolves supra for government entity defendant', () => {
			const text = 'United States v. Jones, 500 F.2d 123 (2020). Jones, supra, at 130.'

			const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

			expect(citations).toHaveLength(2)
			expect(citations[1].type).toBe('supra')
			expect(citations[1].resolution?.resolvedTo).toBe(0)
			expect(citations[1].resolution?.failureReason).toBeUndefined()
		})

		it('resolves supra for government entity plaintiff (state)', () => {
			const text = 'People v. Smith, 200 F.3d 50 (2015). Smith, supra, at 55.'

			const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

			expect(citations).toHaveLength(2)
			expect(citations[1].type).toBe('supra')
			expect(citations[1].resolution?.resolvedTo).toBe(0)
			expect(citations[1].resolution?.failureReason).toBeUndefined()
		})

		it('resolves supra for procedural case using plaintiff normalized', () => {
			const text = 'In re Smith, 500 F.2d 123 (2020). Smith, supra, at 130.'

			const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

			expect(citations).toHaveLength(2)
			expect(citations[1].type).toBe('supra')
			expect(citations[1].resolution?.resolvedTo).toBe(0)
			expect(citations[1].resolution?.failureReason).toBeUndefined()
		})

		it('exact party name match has high confidence', () => {
			const text = 'Smith v. Jones, 500 F.2d 123 (2020). Smith, supra, at 130.'

			const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

			expect(citations).toHaveLength(2)
			expect(citations[1].resolution?.confidence).toBeGreaterThanOrEqual(0.95)
		})

		it('fuzzy match has lower confidence', () => {
			const text = 'Smith v. Jones, 500 F.2d 123 (2020). Smyth, supra, at 130.'

			const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

			expect(citations).toHaveLength(2)
			expect(citations[1].resolution?.resolvedTo).toBe(0)
			expect(citations[1].resolution?.confidence).toBeLessThan(1.0)
			expect(citations[1].resolution?.confidence).toBeGreaterThanOrEqual(0.8)
		})

		it('resolves supra to correct citation among multiple', () => {
			const text = 'Smith v. A, 100 F.2d 10. Jones v. B, 200 F.2d 20. Jones, supra.'

			const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

			expect(citations).toHaveLength(3)
			expect(citations[2].type).toBe('supra')
			expect(citations[2].resolution?.resolvedTo).toBe(1) // Jones v. B, not Smith v. A
		})

		it('maintains backward compatibility when party names unavailable', () => {
			// This tests the fallback to backward text search
			// In reality, Phase 7 extracts party names, but if extraction fails,
			// the DocumentResolver still uses the old extractPartyName method
			const text = 'See Smith v. Jones, 500 F.2d 123 (2020). Smith, supra, at 130.'

			const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

			expect(citations).toHaveLength(2)
			expect(citations[1].type).toBe('supra')
			expect(citations[1].resolution?.resolvedTo).toBe(0)
		})
	})

	describe('Mixed Citation Types', () => {
		it('resolves short-form citations alongside full citations', () => {
			const text = `Smith v. Jones, 500 F.2d 123 (2020).
        42 U.S.C. § 1983.
        Id. at 125.
        Smith, supra, at 130.
        500 F.2d at 140.`

			const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

			expect(citations).toHaveLength(5)

			// Full case
			expect(citations[0].type).toBe('case')

			// Statute (no resolution)
			expect(citations[1].type).toBe('statute')
			expect(citations[1].resolution).toBeUndefined()

			// Id. resolves to case (index 0)
			expect(citations[2].type).toBe('id')
			expect(citations[2].resolution?.resolvedTo).toBe(0)

			// Supra resolves to case (index 0)
			expect(citations[3].type).toBe('supra')
			expect(citations[3].resolution?.resolvedTo).toBe(0)

			// Short-form case resolves to case (index 0)
			expect(citations[4].type).toBe('shortFormCase')
			expect(citations[4].resolution?.resolvedTo).toBe(0)
		})
	})
})
