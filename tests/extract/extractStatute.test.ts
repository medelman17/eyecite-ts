import { describe, it, expect } from 'vitest'
import { extractStatute, extractCitations } from '@/extract'
import type { Token } from '@/tokenize'
import type { TransformationMap } from '@/types/span'

describe('extractStatute', () => {
	// Helper: Create mock TransformationMap with 1:1 mapping
	const createIdentityMap = (): TransformationMap => {
		const cleanToOriginal = new Map<number, number>()
		const originalToClean = new Map<number, number>()
		for (let i = 0; i < 1000; i++) {
			cleanToOriginal.set(i, i)
			originalToClean.set(i, i)
		}
		return { cleanToOriginal, originalToClean }
	}

	// Helper: Create mock TransformationMap with offset
	const createOffsetMap = (offset: number): TransformationMap => {
		const cleanToOriginal = new Map<number, number>()
		const originalToClean = new Map<number, number>()
		for (let i = 0; i < 1000; i++) {
			cleanToOriginal.set(i, i + offset)
			originalToClean.set(i + offset, i)
		}
		return { cleanToOriginal, originalToClean }
	}

	describe('code-section parsing', () => {
		it('should extract title, code, and section from U.S.C. citation', () => {
			const token: Token = {
				text: '42 U.S.C. § 1983',
				span: { cleanStart: 10, cleanEnd: 26 },
				type: 'statute',
				patternId: 'usc',
			}
			const transformationMap = createIdentityMap()

			const citation = extractStatute(token, transformationMap)

			expect(citation.type).toBe('statute')
			expect(citation.title).toBe(42)
			expect(citation.code).toBe('U.S.C.')
			expect(citation.section).toBe('1983')
			expect(citation.text).toBe('42 U.S.C. § 1983')
			expect(citation.matchedText).toBe('42 U.S.C. § 1983')
		})

		it('should extract code and section without title', () => {
			const token: Token = {
				text: 'Cal. Civ. Code § 1234',
				span: { cleanStart: 0, cleanEnd: 21 },
				type: 'statute',
				patternId: 'cal-civ-code',
			}
			const transformationMap = createIdentityMap()

			const citation = extractStatute(token, transformationMap)

			expect(citation.title).toBeUndefined()
			expect(citation.code).toBe('Cal. Civ. Code')
			expect(citation.section).toBe('1234')
		})

		it('should handle section with alphanumeric characters', () => {
			const token: Token = {
				text: '42 U.S.C. § 1983a',
				span: { cleanStart: 0, cleanEnd: 17 },
				type: 'statute',
				patternId: 'usc',
			}
			const transformationMap = createIdentityMap()

			const citation = extractStatute(token, transformationMap)

			expect(citation.section).toBe('1983a')
		})

		it('should handle section with hyphens', () => {
			const token: Token = {
				text: '42 U.S.C. § 1983-1',
				span: { cleanStart: 0, cleanEnd: 18 },
				type: 'statute',
				patternId: 'usc',
			}
			const transformationMap = createIdentityMap()

			const citation = extractStatute(token, transformationMap)

			expect(citation.section).toBe('1983-1')
		})
	})

	describe('different statutory codes', () => {
		it('should extract C.F.R. citation', () => {
			const token: Token = {
				text: '29 C.F.R. § 1910',
				span: { cleanStart: 0, cleanEnd: 16 },
				type: 'statute',
				patternId: 'cfr',
			}
			const transformationMap = createIdentityMap()

			const citation = extractStatute(token, transformationMap)

			expect(citation.title).toBe(29)
			expect(citation.code).toBe('C.F.R.')
			expect(citation.section).toBe('1910')
		})

		it('should extract state code citation', () => {
			const token: Token = {
				text: 'Cal. Penal Code § 187',
				span: { cleanStart: 0, cleanEnd: 21 },
				type: 'statute',
				patternId: 'cal-penal',
			}
			const transformationMap = createIdentityMap()

			const citation = extractStatute(token, transformationMap)

			expect(citation.code).toBe('Cal. Penal Code')
			expect(citation.section).toBe('187')
		})
	})

	describe('position translation', () => {
		it('should translate clean positions to original positions', () => {
			const token: Token = {
				text: '42 U.S.C. § 1983',
				span: { cleanStart: 10, cleanEnd: 26 },
				type: 'statute',
				patternId: 'usc',
			}
			const transformationMap = createOffsetMap(3)

			const citation = extractStatute(token, transformationMap)

			expect(citation.span.cleanStart).toBe(10)
			expect(citation.span.cleanEnd).toBe(26)
			expect(citation.span.originalStart).toBe(13) // 10 + 3
			expect(citation.span.originalEnd).toBe(29) // 26 + 3
		})

		it('should handle identity mapping', () => {
			const token: Token = {
				text: '42 U.S.C. § 1983',
				span: { cleanStart: 10, cleanEnd: 26 },
				type: 'statute',
				patternId: 'usc',
			}
			const transformationMap = createIdentityMap()

			const citation = extractStatute(token, transformationMap)

			expect(citation.span.originalStart).toBe(citation.span.cleanStart)
			expect(citation.span.originalEnd).toBe(citation.span.cleanEnd)
		})
	})

	describe('confidence scoring', () => {
		it('should have high confidence for known statutory codes', () => {
			const knownCodes = [
				'42 U.S.C. § 1983',
				'29 C.F.R. § 1910',
				'Cal. Civ. Code § 1234',
				'Cal. Penal Code § 187',
			]
			const transformationMap = createIdentityMap()

			for (const text of knownCodes) {
				const token: Token = {
					text,
					span: { cleanStart: 0, cleanEnd: text.length },
					type: 'statute',
					patternId: 'test',
				}

				const citation = extractStatute(token, transformationMap)

				expect(citation.confidence).toBeGreaterThanOrEqual(0.8)
			}
		})

		it('should have base confidence for unknown code', () => {
			const token: Token = {
				text: 'Unknown Code § 123',
				span: { cleanStart: 0, cleanEnd: 18 },
				type: 'statute',
				patternId: 'unknown',
			}
			const transformationMap = createIdentityMap()

			const citation = extractStatute(token, transformationMap)

			expect(citation.confidence).toBe(0.5)
		})
	})

	describe('trailing letters via full pipeline', () => {
		it('should extract section with trailing uppercase letter', () => {
			const citations = extractCitations('18 U.S.C. § 1028A')
			expect(citations).toHaveLength(1)
			expect(citations[0].type).toBe('statute')
			if (citations[0].type === 'statute') {
				expect(citations[0].section).toBe('1028A')
			}
		})

		it('should extract section with trailing lowercase letter', () => {
			const citations = extractCitations('18 U.S.C. § 2339B')
			expect(citations).toHaveLength(1)
			if (citations[0].type === 'statute') {
				expect(citations[0].section).toBe('2339B')
			}
		})
	})

	describe('metadata fields', () => {
		it('should include all required CitationBase fields', () => {
			const token: Token = {
				text: '42 U.S.C. § 1983',
				span: { cleanStart: 10, cleanEnd: 26 },
				type: 'statute',
				patternId: 'usc',
			}
			const transformationMap = createIdentityMap()

			const citation = extractStatute(token, transformationMap)

			expect(citation.text).toBeDefined()
			expect(citation.span).toBeDefined()
			expect(citation.confidence).toBeDefined()
			expect(citation.matchedText).toBeDefined()
			expect(citation.processTimeMs).toBeDefined()
			expect(citation.patternsChecked).toBeDefined()
		})

		it('should set processTimeMs to 0 as placeholder', () => {
			const token: Token = {
				text: '42 U.S.C. § 1983',
				span: { cleanStart: 10, cleanEnd: 26 },
				type: 'statute',
				patternId: 'usc',
			}
			const transformationMap = createIdentityMap()

			const citation = extractStatute(token, transformationMap)

			expect(citation.processTimeMs).toBe(0)
		})

		it('should set patternsChecked to 1', () => {
			const token: Token = {
				text: '42 U.S.C. § 1983',
				span: { cleanStart: 10, cleanEnd: 26 },
				type: 'statute',
				patternId: 'usc',
			}
			const transformationMap = createIdentityMap()

			const citation = extractStatute(token, transformationMap)

			expect(citation.patternsChecked).toBe(1)
		})
	})
})
