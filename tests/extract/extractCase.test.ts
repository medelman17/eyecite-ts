import { describe, it, expect } from 'vitest'
import { extractCase, extractCitations } from '@/extract'
import type { Token } from '@/tokenize'
import type { TransformationMap } from '@/types/span'

describe('extractCase', () => {
	// Helper: Create mock TransformationMap with 1:1 mapping (no transformations)
	const createIdentityMap = (): TransformationMap => {
		const cleanToOriginal = new Map<number, number>()
		const originalToClean = new Map<number, number>()
		// Map positions 0-1000 with identity mapping
		for (let i = 0; i < 1000; i++) {
			cleanToOriginal.set(i, i)
			originalToClean.set(i, i)
		}
		return { cleanToOriginal, originalToClean }
	}

	// Helper: Create mock TransformationMap with offset (e.g., +2 for original)
	const createOffsetMap = (offset: number): TransformationMap => {
		const cleanToOriginal = new Map<number, number>()
		const originalToClean = new Map<number, number>()
		for (let i = 0; i < 1000; i++) {
			cleanToOriginal.set(i, i + offset)
			originalToClean.set(i + offset, i)
		}
		return { cleanToOriginal, originalToClean }
	}

	describe('volume-reporter-page parsing', () => {
		it('should extract volume, reporter, and page from basic case citation', () => {
			const token: Token = {
				text: '500 F.2d 123',
				span: { cleanStart: 10, cleanEnd: 22 },
				type: 'case',
				patternId: 'federal-reporter',
			}
			const transformationMap = createIdentityMap()

			const citation = extractCase(token, transformationMap)

			expect(citation.type).toBe('case')
			expect(citation.volume).toBe(500)
			expect(citation.reporter).toBe('F.2d')
			expect(citation.page).toBe(123)
			expect(citation.text).toBe('500 F.2d 123')
			expect(citation.matchedText).toBe('500 F.2d 123')
			expect(citation.confidence).toBeGreaterThanOrEqual(0.5)
		})

		it('should handle different reporter formats', () => {
			const token: Token = {
				text: '410 U.S. 113',
				span: { cleanStart: 0, cleanEnd: 12 },
				type: 'case',
				patternId: 'us-reporter',
			}
			const transformationMap = createIdentityMap()

			const citation = extractCase(token, transformationMap)

			expect(citation.volume).toBe(410)
			expect(citation.reporter).toBe('U.S.')
			expect(citation.page).toBe(113)
		})

		it('should handle reporters with multiple spaces', () => {
			const token: Token = {
				text: '123 So. 2d 456',
				span: { cleanStart: 0, cleanEnd: 14 },
				type: 'case',
				patternId: 'southern-reporter',
			}
			const transformationMap = createIdentityMap()

			const citation = extractCase(token, transformationMap)

			expect(citation.volume).toBe(123)
			expect(citation.reporter).toBe('So. 2d')
			expect(citation.page).toBe(456)
		})

		it('should extract F.4th citations', () => {
			const token: Token = {
				text: '50 F.4th 100',
				span: { cleanStart: 0, cleanEnd: 12 },
				type: 'case',
				patternId: 'federal-reporter',
			}
			const transformationMap = createIdentityMap()

			const citation = extractCase(token, transformationMap)

			expect(citation.volume).toBe(50)
			expect(citation.reporter).toBe('F.4th')
			expect(citation.page).toBe(100)
		})

		it('should extract Cal.App.4th citations', () => {
			const token: Token = {
				text: '173 Cal.App.4th 655',
				span: { cleanStart: 0, cleanEnd: 19 },
				type: 'case',
				patternId: 'state-reporter',
			}
			const transformationMap = createIdentityMap()

			const citation = extractCase(token, transformationMap)

			expect(citation.volume).toBe(173)
			expect(citation.reporter).toBe('Cal.App.4th')
			expect(citation.page).toBe(655)
		})

		it('should extract A.4th citations', () => {
			const token: Token = {
				text: '100 A.4th 200',
				span: { cleanStart: 0, cleanEnd: 13 },
				type: 'case',
				patternId: 'state-reporter',
			}
			const transformationMap = createIdentityMap()

			const citation = extractCase(token, transformationMap)

			expect(citation.volume).toBe(100)
			expect(citation.reporter).toBe('A.4th')
			expect(citation.page).toBe(200)
		})

		it('should extract Cal.App.5th citations', () => {
			const token: Token = {
				text: '75 Cal.App.5th 123',
				span: { cleanStart: 0, cleanEnd: 18 },
				type: 'case',
				patternId: 'state-reporter',
			}
			const transformationMap = createIdentityMap()

			const citation = extractCase(token, transformationMap)

			expect(citation.volume).toBe(75)
			expect(citation.reporter).toBe('Cal.App.5th')
			expect(citation.page).toBe(123)
		})

		it('should extract F.Supp.4th citations', () => {
			const token: Token = {
				text: '200 F.Supp.4th 500',
				span: { cleanStart: 0, cleanEnd: 18 },
				type: 'case',
				patternId: 'federal-reporter',
			}
			const transformationMap = createIdentityMap()

			const citation = extractCase(token, transformationMap)

			expect(citation.volume).toBe(200)
			expect(citation.reporter).toBe('F.Supp.4th')
			expect(citation.page).toBe(500)
		})
	})

	describe('optional metadata extraction', () => {
		it('should extract pincite from case citation with page reference', () => {
			const token: Token = {
				text: '500 F.2d 123, 125',
				span: { cleanStart: 10, cleanEnd: 27 },
				type: 'case',
				patternId: 'federal-reporter',
			}
			const transformationMap = createIdentityMap()

			const citation = extractCase(token, transformationMap)

			expect(citation.volume).toBe(500)
			expect(citation.reporter).toBe('F.2d')
			expect(citation.page).toBe(123)
			expect(citation.pincite).toBe(125)
		})

		it('should extract court from parenthetical', () => {
			const token: Token = {
				text: '500 F.2d 123 (9th Cir.)',
				span: { cleanStart: 0, cleanEnd: 23 },
				type: 'case',
				patternId: 'federal-reporter',
			}
			const transformationMap = createIdentityMap()

			const citation = extractCase(token, transformationMap)

			expect(citation.court).toBe('9th Cir.')
		})

		it('should extract year from parenthetical', () => {
			const token: Token = {
				text: '500 F.2d 123 (2020)',
				span: { cleanStart: 0, cleanEnd: 19 },
				type: 'case',
				patternId: 'federal-reporter',
			}
			const transformationMap = createIdentityMap()

			const citation = extractCase(token, transformationMap)

			expect(citation.year).toBe(2020)
		})

		it('should extract both court and year from combined parenthetical', () => {
			const token: Token = {
				text: '500 F.2d 123 (9th Cir. 2020)',
				span: { cleanStart: 0, cleanEnd: 28 },
				type: 'case',
				patternId: 'federal-reporter',
			}
			const transformationMap = createIdentityMap()

			const citation = extractCase(token, transformationMap)

			expect(citation.court).toBe('9th Cir. 2020')
			expect(citation.year).toBe(2020)
		})
	})

	describe('position translation', () => {
		it('should translate clean positions to original positions using TransformationMap', () => {
			const token: Token = {
				text: '500 F.2d 123',
				span: { cleanStart: 10, cleanEnd: 22 },
				type: 'case',
				patternId: 'federal-reporter',
			}
			// Simulate HTML removal: clean position 10 → original position 15
			const transformationMap = createOffsetMap(5)

			const citation = extractCase(token, transformationMap)

			expect(citation.span.cleanStart).toBe(10)
			expect(citation.span.cleanEnd).toBe(22)
			expect(citation.span.originalStart).toBe(15) // 10 + 5
			expect(citation.span.originalEnd).toBe(27) // 22 + 5
		})

		it('should handle identity mapping when no transformation', () => {
			const token: Token = {
				text: '500 F.2d 123',
				span: { cleanStart: 10, cleanEnd: 22 },
				type: 'case',
				patternId: 'federal-reporter',
			}
			const transformationMap = createIdentityMap()

			const citation = extractCase(token, transformationMap)

			expect(citation.span.originalStart).toBe(citation.span.cleanStart)
			expect(citation.span.originalEnd).toBe(citation.span.cleanEnd)
		})

		it('should fallback to clean positions if mapping is missing', () => {
			const token: Token = {
				text: '500 F.2d 123',
				span: { cleanStart: 10, cleanEnd: 22 },
				type: 'case',
				patternId: 'federal-reporter',
			}
			// Empty transformation map
			const transformationMap: TransformationMap = {
				cleanToOriginal: new Map(),
				originalToClean: new Map(),
			}

			const citation = extractCase(token, transformationMap)

			// Should fallback to clean positions
			expect(citation.span.originalStart).toBe(10)
			expect(citation.span.originalEnd).toBe(22)
		})
	})

	describe('confidence scoring', () => {
		it('should have high confidence for common reporter patterns', () => {
			const reporters = ['F.2d', 'F.3d', 'U.S.', 'S. Ct.', 'P.2d', 'A.2d']
			const transformationMap = createIdentityMap()

			for (const reporter of reporters) {
				const token: Token = {
					text: `500 ${reporter} 123`,
					span: { cleanStart: 0, cleanEnd: `500 ${reporter} 123`.length },
					type: 'case',
					patternId: 'test',
				}

				const citation = extractCase(token, transformationMap)

				expect(citation.confidence).toBeGreaterThanOrEqual(0.8)
			}
		})

		it('should increase confidence for valid year', () => {
			const token: Token = {
				text: '500 F.2d 123 (2020)',
				span: { cleanStart: 0, cleanEnd: 19 },
				type: 'case',
				patternId: 'federal-reporter',
			}
			const transformationMap = createIdentityMap()

			const citation = extractCase(token, transformationMap)

			// Common reporter (0.5 + 0.3) + valid year (+0.2) = 1.0
			expect(citation.confidence).toBe(1.0)
		})

		it('should not boost confidence for future year', () => {
			const futureYear = new Date().getFullYear() + 10
			const token: Token = {
				text: `500 F.2d 123 (${futureYear})`,
				span: { cleanStart: 0, cleanEnd: `500 F.2d 123 (${futureYear})`.length },
				type: 'case',
				patternId: 'federal-reporter',
			}
			const transformationMap = createIdentityMap()

			const citation = extractCase(token, transformationMap)

			// Common reporter (0.5 + 0.3) but no year boost = 0.8
			expect(citation.confidence).toBe(0.8)
		})

		it('should have lower confidence for unknown reporter', () => {
			const token: Token = {
				text: '500 Unknown Rep. 123',
				span: { cleanStart: 0, cleanEnd: 21 },
				type: 'case',
				patternId: 'unknown',
			}
			const transformationMap = createIdentityMap()

			const citation = extractCase(token, transformationMap)

			// Base confidence only
			expect(citation.confidence).toBe(0.5)
		})
	})

	describe('metadata fields', () => {
		it('should include all required CitationBase fields', () => {
			const token: Token = {
				text: '500 F.2d 123',
				span: { cleanStart: 10, cleanEnd: 22 },
				type: 'case',
				patternId: 'federal-reporter',
			}
			const transformationMap = createIdentityMap()

			const citation = extractCase(token, transformationMap)

			expect(citation.text).toBeDefined()
			expect(citation.span).toBeDefined()
			expect(citation.confidence).toBeDefined()
			expect(citation.matchedText).toBeDefined()
			expect(citation.processTimeMs).toBeDefined()
			expect(citation.patternsChecked).toBeDefined()
		})

		it('should set processTimeMs to 0 as placeholder', () => {
			const token: Token = {
				text: '500 F.2d 123',
				span: { cleanStart: 10, cleanEnd: 22 },
				type: 'case',
				patternId: 'federal-reporter',
			}
			const transformationMap = createIdentityMap()

			const citation = extractCase(token, transformationMap)

			expect(citation.processTimeMs).toBe(0)
		})

		it('should set patternsChecked to 1', () => {
			const token: Token = {
				text: '500 F.2d 123',
				span: { cleanStart: 10, cleanEnd: 22 },
				type: 'case',
				patternId: 'federal-reporter',
			}
			const transformationMap = createIdentityMap()

			const citation = extractCase(token, transformationMap)

			expect(citation.patternsChecked).toBe(1)
		})
	})
})

describe('reporter with internal spaces (integration)', () => {
	it('should recognize "U. S." with space as case citation', () => {
		const citations = extractCitations('506 U. S. 534')
		expect(citations).toHaveLength(1)
		expect(citations[0].type).toBe('case')
		if (citations[0].type === 'case') {
			expect(citations[0].reporter).toBe('U. S.')
			expect(citations[0].volume).toBe(506)
			expect(citations[0].page).toBe(534)
		}
	})

	it('should still recognize "U.S." without space', () => {
		const citations = extractCitations('506 U.S. 534')
		expect(citations).toHaveLength(1)
		expect(citations[0].type).toBe('case')
		if (citations[0].type === 'case') {
			expect(citations[0].reporter).toBe('U.S.')
		}
	})
})
