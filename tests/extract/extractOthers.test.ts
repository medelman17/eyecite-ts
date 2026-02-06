import { describe, it, expect } from 'vitest'
import {
	extractJournal,
	extractNeutral,
	extractPublicLaw,
	extractFederalRegister,
	extractCitations,
} from '@/extract'
import type { Token } from '@/tokenize'
import type { TransformationMap } from '@/types/span'

describe('Other extraction functions', () => {
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

	describe('extractJournal', () => {
		it('should extract volume, journal, and page from basic journal citation', () => {
			const token: Token = {
				text: '123 Harv. L. Rev. 456',
				span: { cleanStart: 10, cleanEnd: 31 },
				type: 'journal',
				patternId: 'journal-standard',
			}
			const transformationMap = createIdentityMap()

			const citation = extractJournal(token, transformationMap)

			expect(citation.type).toBe('journal')
			expect(citation.volume).toBe(123)
			expect(citation.journal).toBe('Harv. L. Rev.')
			expect(citation.abbreviation).toBe('Harv. L. Rev.')
			expect(citation.page).toBe(456)
			expect(citation.confidence).toBe(0.6)
		})

		it('should extract pincite from journal citation with page reference', () => {
			const token: Token = {
				text: '123 Harv. L. Rev. 456, 458',
				span: { cleanStart: 10, cleanEnd: 36 },
				type: 'journal',
				patternId: 'journal-standard',
			}
			const transformationMap = createIdentityMap()

			const citation = extractJournal(token, transformationMap)

			expect(citation.volume).toBe(123)
			expect(citation.page).toBe(456)
			expect(citation.pincite).toBe(458)
		})

		it('should handle different journal formats', () => {
			const journals = [
				{ text: '75 Yale L.J. 789', journal: 'Yale L.J.' },
				{ text: '100 Colum. L. Rev. 200', journal: 'Colum. L. Rev.' },
			]
			const transformationMap = createIdentityMap()

			for (const { text, journal } of journals) {
				const token: Token = {
					text,
					span: { cleanStart: 0, cleanEnd: text.length },
					type: 'journal',
					patternId: 'test',
				}

				const citation = extractJournal(token, transformationMap)
				expect(citation.journal).toBe(journal)
			}
		})
	})

	describe('extractNeutral', () => {
		it('should extract year, court, and document number from Westlaw citation', () => {
			const token: Token = {
				text: '2020 WL 123456',
				span: { cleanStart: 10, cleanEnd: 24 },
				type: 'neutral',
				patternId: 'westlaw-neutral',
			}
			const transformationMap = createIdentityMap()

			const citation = extractNeutral(token, transformationMap)

			expect(citation.type).toBe('neutral')
			expect(citation.year).toBe(2020)
			expect(citation.court).toBe('WL')
			expect(citation.documentNumber).toBe('123456')
			expect(citation.confidence).toBe(1.0)
		})

		it('should extract LEXIS citation', () => {
			const token: Token = {
				text: '2020 U.S. LEXIS 456',
				span: { cleanStart: 0, cleanEnd: 19 },
				type: 'neutral',
				patternId: 'lexis-neutral',
			}
			const transformationMap = createIdentityMap()

			const citation = extractNeutral(token, transformationMap)

			expect(citation.year).toBe(2020)
			expect(citation.court).toBe('U.S. LEXIS')
			expect(citation.documentNumber).toBe('456')
		})

		it('should extract U.S. App. LEXIS citation', () => {
			const token: Token = {
				text: '2021 U.S. App. LEXIS 12345',
				span: { cleanStart: 0, cleanEnd: 26 },
				type: 'neutral',
				patternId: 'lexis',
			}
			const transformationMap = createIdentityMap()

			const citation = extractNeutral(token, transformationMap)

			expect(citation.type).toBe('neutral')
			expect(citation.year).toBe(2021)
			expect(citation.court).toBe('U.S. App. LEXIS')
			expect(citation.documentNumber).toBe('12345')
			expect(citation.confidence).toBe(1.0)
		})

		it('should extract U.S. Dist. LEXIS citation', () => {
			const token: Token = {
				text: '2022 U.S. Dist. LEXIS 67890',
				span: { cleanStart: 0, cleanEnd: 27 },
				type: 'neutral',
				patternId: 'lexis',
			}
			const transformationMap = createIdentityMap()

			const citation = extractNeutral(token, transformationMap)

			expect(citation.type).toBe('neutral')
			expect(citation.year).toBe(2022)
			expect(citation.court).toBe('U.S. Dist. LEXIS')
			expect(citation.documentNumber).toBe('67890')
			expect(citation.confidence).toBe(1.0)
		})

		it('should have confidence 1.0 for neutral citations', () => {
			const token: Token = {
				text: '2020 WL 123456',
				span: { cleanStart: 0, cleanEnd: 14 },
				type: 'neutral',
				patternId: 'westlaw',
			}
			const transformationMap = createIdentityMap()

			const citation = extractNeutral(token, transformationMap)

			expect(citation.confidence).toBe(1.0)
		})
	})

	describe('extractPublicLaw', () => {
		it('should extract congress and law number from public law citation', () => {
			const token: Token = {
				text: 'Pub. L. No. 116-283',
				span: { cleanStart: 10, cleanEnd: 29 },
				type: 'publicLaw',
				patternId: 'public-law',
			}
			const transformationMap = createIdentityMap()

			const citation = extractPublicLaw(token, transformationMap)

			expect(citation.type).toBe('publicLaw')
			expect(citation.congress).toBe(116)
			expect(citation.lawNumber).toBe(283)
			expect(citation.confidence).toBe(0.9)
		})

		it('should handle public law without "No."', () => {
			const token: Token = {
				text: 'Pub. L. 117-58',
				span: { cleanStart: 0, cleanEnd: 14 },
				type: 'publicLaw',
				patternId: 'public-law',
			}
			const transformationMap = createIdentityMap()

			const citation = extractPublicLaw(token, transformationMap)

			expect(citation.congress).toBe(117)
			expect(citation.lawNumber).toBe(58)
		})

		it('should have confidence 0.9 for public law citations', () => {
			const token: Token = {
				text: 'Pub. L. No. 116-283',
				span: { cleanStart: 0, cleanEnd: 19 },
				type: 'publicLaw',
				patternId: 'test',
			}
			const transformationMap = createIdentityMap()

			const citation = extractPublicLaw(token, transformationMap)

			expect(citation.confidence).toBe(0.9)
		})
	})

	describe('extractFederalRegister', () => {
		it('should extract volume and page from Federal Register citation', () => {
			const token: Token = {
				text: '85 Fed. Reg. 12345',
				span: { cleanStart: 10, cleanEnd: 28 },
				type: 'federalRegister',
				patternId: 'federal-register',
			}
			const transformationMap = createIdentityMap()

			const citation = extractFederalRegister(token, transformationMap)

			expect(citation.type).toBe('federalRegister')
			expect(citation.volume).toBe(85)
			expect(citation.page).toBe(12345)
			expect(citation.confidence).toBe(0.9)
		})

		it('should extract year from Federal Register citation with date', () => {
			const token: Token = {
				text: '85 Fed. Reg. 12345 (Jan. 15, 2021)',
				span: { cleanStart: 0, cleanEnd: 34 },
				type: 'federalRegister',
				patternId: 'federal-register',
			}
			const transformationMap = createIdentityMap()

			const citation = extractFederalRegister(token, transformationMap)

			expect(citation.volume).toBe(85)
			expect(citation.page).toBe(12345)
			expect(citation.year).toBe(2021)
		})

		it('should extract year from parentheses with just year', () => {
			const token: Token = {
				text: '85 Fed. Reg. 12345 (2021)',
				span: { cleanStart: 0, cleanEnd: 25 },
				type: 'federalRegister',
				patternId: 'federal-register',
			}
			const transformationMap = createIdentityMap()

			const citation = extractFederalRegister(token, transformationMap)

			expect(citation.year).toBe(2021)
		})

		it('should have confidence 0.9 for Federal Register citations', () => {
			const token: Token = {
				text: '85 Fed. Reg. 12345',
				span: { cleanStart: 0, cleanEnd: 18 },
				type: 'federalRegister',
				patternId: 'test',
			}
			const transformationMap = createIdentityMap()

			const citation = extractFederalRegister(token, transformationMap)

			expect(citation.confidence).toBe(0.9)
		})
	})

	describe('position translation for all extraction functions', () => {
		it('should translate positions for journal citations', () => {
			const token: Token = {
				text: '123 Harv. L. Rev. 456',
				span: { cleanStart: 10, cleanEnd: 31 },
				type: 'journal',
				patternId: 'test',
			}
			const cleanToOriginal = new Map<number, number>()
			const originalToClean = new Map<number, number>()
			for (let i = 0; i < 1000; i++) {
				cleanToOriginal.set(i, i + 5)
				originalToClean.set(i + 5, i)
			}
			const transformationMap: TransformationMap = { cleanToOriginal, originalToClean }

			const citation = extractJournal(token, transformationMap)

			expect(citation.span.cleanStart).toBe(10)
			expect(citation.span.originalStart).toBe(15)
		})

		it('should translate positions for neutral citations', () => {
			const token: Token = {
				text: '2020 WL 123456',
				span: { cleanStart: 10, cleanEnd: 24 },
				type: 'neutral',
				patternId: 'test',
			}
			const cleanToOriginal = new Map<number, number>()
			const originalToClean = new Map<number, number>()
			for (let i = 0; i < 1000; i++) {
				cleanToOriginal.set(i, i + 5)
				originalToClean.set(i + 5, i)
			}
			const transformationMap: TransformationMap = { cleanToOriginal, originalToClean }

			const citation = extractNeutral(token, transformationMap)

			expect(citation.span.cleanStart).toBe(10)
			expect(citation.span.originalStart).toBe(15)
		})

		it('should translate positions for public law citations', () => {
			const token: Token = {
				text: 'Pub. L. No. 116-283',
				span: { cleanStart: 10, cleanEnd: 29 },
				type: 'publicLaw',
				patternId: 'test',
			}
			const cleanToOriginal = new Map<number, number>()
			const originalToClean = new Map<number, number>()
			for (let i = 0; i < 1000; i++) {
				cleanToOriginal.set(i, i + 5)
				originalToClean.set(i + 5, i)
			}
			const transformationMap: TransformationMap = { cleanToOriginal, originalToClean }

			const citation = extractPublicLaw(token, transformationMap)

			expect(citation.span.cleanStart).toBe(10)
			expect(citation.span.originalStart).toBe(15)
		})

		it('should translate positions for federal register citations', () => {
			const token: Token = {
				text: '85 Fed. Reg. 12345',
				span: { cleanStart: 10, cleanEnd: 28 },
				type: 'federalRegister',
				patternId: 'test',
			}
			const cleanToOriginal = new Map<number, number>()
			const originalToClean = new Map<number, number>()
			for (let i = 0; i < 1000; i++) {
				cleanToOriginal.set(i, i + 5)
				originalToClean.set(i + 5, i)
			}
			const transformationMap: TransformationMap = { cleanToOriginal, originalToClean }

			const citation = extractFederalRegister(token, transformationMap)

			expect(citation.span.cleanStart).toBe(10)
			expect(citation.span.originalStart).toBe(15)
		})
	})
})

describe('compact journal citations (integration)', () => {
	it('should classify compact L.Rev. as journal, not case', () => {
		const cases = [
			{ text: '58 N.Y.U.L.Rev. 299', journal: 'N.Y.U.L.Rev.' },
			{ text: '83 Colum.L.Rev. 1544', journal: 'Colum.L.Rev.' },
			{ text: '93 Harv.L.Rev. 752', journal: 'Harv.L.Rev.' },
			{ text: '50 U.Chi.L.Rev. 138', journal: 'U.Chi.L.Rev.' },
		]

		for (const { text, journal } of cases) {
			const citations = extractCitations(text)
			expect(citations).toHaveLength(1)
			expect(citations[0].type).toBe('journal')
			if (citations[0].type === 'journal') {
				expect(citations[0].journal).toBe(journal)
			}
		}
	})

	it('should classify compact L.J. as journal', () => {
		const citations = extractCitations('75 Yale L.J. 789')
		expect(citations).toHaveLength(1)
		expect(citations[0].type).toBe('journal')
	})

	it('should not affect case citation classification', () => {
		const citations = extractCitations('500 F.2d 123')
		expect(citations).toHaveLength(1)
		expect(citations[0].type).toBe('case')
	})
})

describe('court-specific LEXIS citations (integration)', () => {
	it('should classify U.S. App. LEXIS as neutral, not journal', () => {
		const citations = extractCitations('2021 U.S. App. LEXIS 12345')
		expect(citations).toHaveLength(1)
		expect(citations[0].type).toBe('neutral')
		if (citations[0].type === 'neutral') {
			expect(citations[0].year).toBe(2021)
			expect(citations[0].court).toBe('U.S. App. LEXIS')
			expect(citations[0].documentNumber).toBe('12345')
		}
	})

	it('should classify U.S. Dist. LEXIS as neutral, not journal', () => {
		const citations = extractCitations('2022 U.S. Dist. LEXIS 67890')
		expect(citations).toHaveLength(1)
		expect(citations[0].type).toBe('neutral')
		if (citations[0].type === 'neutral') {
			expect(citations[0].year).toBe(2022)
			expect(citations[0].court).toBe('U.S. Dist. LEXIS')
			expect(citations[0].documentNumber).toBe('67890')
		}
	})

	it('should still classify standard U.S. LEXIS as neutral', () => {
		const citations = extractCitations('2020 U.S. LEXIS 456')
		expect(citations).toHaveLength(1)
		expect(citations[0].type).toBe('neutral')
		if (citations[0].type === 'neutral') {
			expect(citations[0].year).toBe(2020)
			expect(citations[0].court).toBe('U.S. LEXIS')
			expect(citations[0].documentNumber).toBe('456')
		}
	})
})
