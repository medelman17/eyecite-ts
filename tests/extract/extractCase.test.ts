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

			expect(citation.court).toBe('9th Cir.')
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

describe('hyphenated volume (integration)', () => {
	it('should extract full hyphenated volume from Trade Cases', () => {
		const citations = extractCitations('1984-1 Trade Cas. 66')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case' || citations[0].type === 'journal') {
			expect(citations[0].volume).toBe('1984-1')
		}
	})

	it('should still extract numeric volumes as numbers', () => {
		const citations = extractCitations('500 F.2d 123')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].volume).toBe(500)
			expect(typeof citations[0].volume).toBe('number')
		}
	})

	it('should handle multiple hyphenated volume examples', () => {
		const examples = [
			{ text: '1998-2 Trade Cas. 72', volume: '1998-2' },
			{ text: '2020-1 Trade Cas. 81', volume: '2020-1' },
		]
		for (const { text, volume } of examples) {
			const citations = extractCitations(text)
			expect(citations).toHaveLength(1)
			const c = citations[0]
			if (c.type === 'case' || c.type === 'journal') {
				expect(c.volume).toBe(volume)
			}
		}
	})
})

describe('parenthetical year and court extraction (integration)', () => {
	it('should extract year from parenthetical', () => {
		const citations = extractCitations('491 U.S. 397 (1989)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].year).toBe(1989)
		}
	})

	it('should extract year from parenthetical after pincite', () => {
		const citations = extractCitations('See Texas v. Johnson, 491 U.S. 397, 404 (1989).')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].volume).toBe(491)
			expect(citations[0].reporter).toBe('U.S.')
			expect(citations[0].page).toBe(397)
			expect(citations[0].year).toBe(1989)
			expect(citations[0].pincite).toBe(404)
		}
	})

	it('should infer scotus court from U.S. reporter', () => {
		const citations = extractCitations('491 U.S. 397 (1989)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].court).toBe('scotus')
		}
	})

	it('should infer scotus court from S. Ct. reporter', () => {
		const citations = extractCitations('129 S. Ct. 2252 (2009)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].court).toBe('scotus')
			expect(citations[0].year).toBe(2009)
		}
	})

	it('should infer scotus court from L. Ed. reporter', () => {
		const citations = extractCitations('174 L. Ed. 2d 490 (2009)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].court).toBe('scotus')
			expect(citations[0].year).toBe(2009)
		}
	})

	it('should extract court and year from combined parenthetical', () => {
		const citations = extractCitations('500 F.2d 123 (9th Cir. 2020)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].court).toBe('9th Cir.')
			expect(citations[0].year).toBe(2020)
		}
	})

	it('should extract court from district court parenthetical', () => {
		const citations = extractCitations('350 F. Supp. 3d 100 (D. Mass. 2019)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].court).toBe('D. Mass.')
			expect(citations[0].year).toBe(2019)
		}
	})

	it('should handle multiple SCOTUS citations from issue examples', () => {
		const examples = [
			{ text: '491 U.S. 397, 404 (1989)', year: 1989 },
			{ text: '418 U.S. 405, 409 (1974)', year: 1974 },
			{ text: '468 U.S. 288, 294 (1984)', year: 1984 },
			{ text: '391 U.S. 367, 376 (1968)', year: 1968 },
		]
		for (const { text, year } of examples) {
			const citations = extractCitations(text)
			expect(citations).toHaveLength(1)
			if (citations[0].type === 'case') {
				expect(citations[0].year).toBe(year)
				expect(citations[0].court).toBe('scotus')
			}
		}
	})
})

describe('court extraction with date in parenthetical (#5)', () => {
	it('extracts court when parenthetical contains month and day', () => {
		const citations = extractCitations('500 F.3d 100 (2d Cir. Jan. 15, 2020)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].court).toBe('2d Cir.')
			expect(citations[0].year).toBe(2020)
		}
	})

	it('extracts court with different month abbreviation', () => {
		const citations = extractCitations('347 U.S. 483 (C.D. Cal. Feb. 9, 2015)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].court).toBe('C.D. Cal.')
			expect(citations[0].year).toBe(2015)
		}
	})

	it('extracts court when parenthetical has month without day', () => {
		const citations = extractCitations('500 F.3d 100 (D. Mass. Mar. 2020)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].court).toBe('D. Mass.')
			expect(citations[0].year).toBe(2020)
		}
	})

	it('still extracts court with simple year-only parenthetical', () => {
		const citations = extractCitations('500 F.3d 100 (2d Cir. 2020)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].court).toBe('2d Cir.')
			expect(citations[0].year).toBe(2020)
		}
	})

	it('handles Sept. abbreviation', () => {
		const citations = extractCitations('100 F.2d 50 (5th Cir. Sept. 30, 2019)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].court).toBe('5th Cir.')
			expect(citations[0].year).toBe(2019)
		}
	})

	it('handles district court with full date', () => {
		const citations = extractCitations('200 F. Supp. 2d 300 (S.D.N.Y. Dec. 1, 2018)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].court).toBe('S.D.N.Y.')
			expect(citations[0].year).toBe(2018)
		}
	})
})

describe('backward compatibility (QUAL-01)', () => {
	it('normal citations still have numeric page field', () => {
		const citations = extractCitations('500 F.2d 123')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].page).toBe(123)
			expect(typeof citations[0].page).toBe('number')
		}
	})

	it('new optional fields are undefined by default', () => {
		const citations = extractCitations('500 F.2d 123')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].hasBlankPage).toBeUndefined()
			expect(citations[0].fullSpan).toBeUndefined()
			expect(citations[0].caseName).toBeUndefined()
			expect(citations[0].plaintiff).toBeUndefined()
			expect(citations[0].defendant).toBeUndefined()
		}
	})

	it('all v1.0 citation fields still present and typed correctly', () => {
		const citations = extractCitations('410 U.S. 113 (1973)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].volume).toBe(410)
			expect(citations[0].reporter).toBe('U.S.')
			expect(citations[0].page).toBe(113)
			expect(citations[0].year).toBe(1973)
			expect(citations[0].court).toBe('scotus')
			expect(citations[0].text).toBeDefined()
			expect(citations[0].span).toBeDefined()
			expect(citations[0].confidence).toBeGreaterThan(0)
			expect(citations[0].matchedText).toBeDefined()
		}
	})
})

describe('case name extraction (Phase 6)', () => {
	it('extracts standard case name with v.', () => {
		const citations = extractCitations('Smith v. Jones, 500 F.2d 123 (2020)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].caseName).toBe('Smith v. Jones')
			expect(citations[0].volume).toBe(500)
		}
	})

	it('extracts case name with multi-word parties', () => {
		const citations = extractCitations('United States v. Jones, 500 F.2d 123 (2020)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].caseName).toBe('United States v. Jones')
		}
	})

	it('extracts procedural prefix: In re', () => {
		const citations = extractCitations('In re Smith, 410 U.S. 113 (1973)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].caseName).toBe('In re Smith')
		}
	})

	it('extracts procedural prefix: Ex parte', () => {
		const citations = extractCitations('Ex parte Young, 209 U.S. 123 (1908)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].caseName).toBe('Ex parte Young')
		}
	})

	it('extracts procedural prefix: Matter of', () => {
		const citations = extractCitations('Matter of ABC, 500 F.2d 123 (2020)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].caseName).toBe('Matter of ABC')
		}
	})

	it('returns undefined caseName when no case name present', () => {
		const citations = extractCitations('500 F.2d 123 (2020)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].caseName).toBeUndefined()
		}
	})

	it('handles case name with Inc. and abbreviations', () => {
		const citations = extractCitations('Acme Corp., Inc. v. Doe, 500 F.2d 123 (2020)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].caseName).toContain('Inc.')
		}
	})
})

describe('fullSpan calculation (Phase 6)', () => {
	it('fullSpan covers case name through parenthetical', () => {
		const text = 'Smith v. Jones, 500 F.2d 123 (2020)'
		const citations = extractCitations(text)
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].fullSpan).toBeDefined()
			expect(citations[0].fullSpan?.originalStart).toBe(0)
			expect(citations[0].fullSpan?.originalEnd).toBe(text.length)
		}
	})

	it('fullSpan includes chained parentheticals', () => {
		const text = 'Smith v. Jones, 500 F.2d 123 (9th Cir. 2020) (en banc)'
		const citations = extractCitations(text)
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].fullSpan).toBeDefined()
			expect(citations[0].fullSpan?.originalEnd).toBe(text.length)
		}
	})

	it('fullSpan undefined when no case name', () => {
		const citations = extractCitations('500 F.2d 123 (2020)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].fullSpan).toBeUndefined()
		}
	})

	it('existing span unchanged (core only)', () => {
		const text = 'Smith v. Jones, 500 F.2d 123 (2020)'
		const citations = extractCitations(text)
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			// span should point only to "500 F.2d 123" portion
			const coreStart = text.indexOf('500')
			const coreEnd = text.indexOf(' (')
			expect(citations[0].span.originalStart).toBe(coreStart)
			expect(citations[0].span.originalEnd).toBe(coreEnd)
			// fullSpan should cover entire citation
			expect(citations[0].fullSpan?.originalStart).toBe(0)
			expect(citations[0].fullSpan?.originalEnd).toBe(text.length)
		}
	})

	it('fullSpan includes subsequent history', () => {
		const text = 'Smith v. Jones, 500 F.2d 123 (2d Cir. 1990), aff\'d, 501 U.S. 1 (1991)'
		const citations = extractCitations(text)
		// Should extract two citations (main + subsequent history)
		expect(citations.length).toBeGreaterThanOrEqual(1)
		// First citation should include subsequent history signal in fullSpan
		if (citations[0].type === 'case') {
			expect(citations[0].caseName).toBe('Smith v. Jones')
			// fullSpan should extend past the first citation's parenthetical
			const firstParenEnd = text.indexOf(') (') !== -1 ? text.indexOf(')') + 1 : text.indexOf('),') + 1
			expect(citations[0].fullSpan?.originalEnd).toBeGreaterThanOrEqual(firstParenEnd)
		}
	})
})

describe('unified parenthetical parser (Phase 6)', () => {
	it('extracts court and year from standard parenthetical', () => {
		const citations = extractCitations('500 F.2d 100 (9th Cir. 2020)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].court).toBe('9th Cir.')
			expect(citations[0].year).toBe(2020)
		}
	})

	it('extracts court and full date: abbreviated month', () => {
		const citations = extractCitations('500 F.3d 100 (2d Cir. Jan. 15, 2020)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].court).toBe('2d Cir.')
			expect(citations[0].year).toBe(2020)
			expect(citations[0].date?.iso).toBe('2020-01-15')
			expect(citations[0].date?.parsed.year).toBe(2020)
			expect(citations[0].date?.parsed.month).toBe(1)
			expect(citations[0].date?.parsed.day).toBe(15)
		}
	})

	it('extracts court and full date: full month name', () => {
		const citations = extractCitations('500 F.3d 100 (D. Mass. January 15, 2020)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].court).toBe('D. Mass.')
			expect(citations[0].date?.iso).toBe('2020-01-15')
		}
	})

	it('extracts court and full date: numeric format', () => {
		const citations = extractCitations('500 F.3d 100 (D. Mass. 1/15/2020)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].court).toBe('D. Mass.')
			expect(citations[0].date?.iso).toBe('2020-01-15')
		}
	})

	it('handles year-only parenthetical', () => {
		const citations = extractCitations('500 F.2d 123 (2020)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].year).toBe(2020)
			expect(citations[0].date?.iso).toBe('2020')
			expect(citations[0].date?.parsed.year).toBe(2020)
		}
	})

	it('handles court-only with year', () => {
		const citations = extractCitations('500 F.2d 123 (9th Cir. 2020)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].court).toBe('9th Cir.')
			expect(citations[0].year).toBe(2020)
		}
	})

	it('structured date for year-only', () => {
		const citations = extractCitations('410 U.S. 113 (1973)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].date?.parsed.year).toBe(1973)
			expect(citations[0].date?.parsed.month).toBeUndefined()
			expect(citations[0].date?.parsed.day).toBeUndefined()
		}
	})

	it('structured date for full date', () => {
		const citations = extractCitations('500 F.3d 100 (2d Cir. Jan. 15, 2020)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].date?.parsed.year).toBe(2020)
			expect(citations[0].date?.parsed.month).toBe(1)
			expect(citations[0].date?.parsed.day).toBe(15)
		}
	})
})

describe('disposition extraction (Phase 6)', () => {
	it('extracts en banc from chained paren', () => {
		const citations = extractCitations('500 F.2d 123 (9th Cir. 2020) (en banc)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].disposition).toBe('en banc')
		}
	})

	it('extracts per curiam', () => {
		const citations = extractCitations('500 F.2d 123 (per curiam)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].disposition).toBe('per curiam')
		}
	})

	it('no disposition when not present', () => {
		const citations = extractCitations('500 F.2d 123 (2020)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].disposition).toBeUndefined()
		}
	})
})

describe('backward compatibility (Phase 6)', () => {
	it('year-only extraction still works', () => {
		const citations = extractCitations('410 U.S. 113 (1973)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].year).toBe(1973)
		}
	})

	it('court extraction still works', () => {
		const citations = extractCitations('500 F.2d 123 (9th Cir. 2020)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].court).toBe('9th Cir.')
		}
	})

	it('pincite extraction unchanged', () => {
		const citations = extractCitations('500 F.2d 123, 125 (2020)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].pincite).toBe(125)
		}
	})

	it('scotus inference from reporter unchanged', () => {
		const citations = extractCitations('410 U.S. 113 (1973)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].court).toBe('scotus')
		}
	})

	it('blank page citations still work', () => {
		const citations = extractCitations('500 F.2d ___ (2020)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].hasBlankPage).toBe(true)
			expect(citations[0].page).toBeUndefined()
		}
	})
})

describe('blank page placeholders (BLANK-01 through BLANK-04)', () => {
	describe('triple underscore placeholder', () => {
		it('should extract federal reporter citation with ___ as blank page', () => {
			const citations = extractCitations('500 F.2d ___')
			expect(citations).toHaveLength(1)
			if (citations[0].type === 'case') {
				expect(citations[0].volume).toBe(500)
				expect(citations[0].reporter).toBe('F.2d')
				expect(citations[0].page).toBeUndefined()
				expect(citations[0].hasBlankPage).toBe(true)
				expect(citations[0].confidence).toBe(0.8)
			}
		})

		it('should extract supreme court citation with ___ as blank page', () => {
			const citations = extractCitations('410 U.S. ___')
			expect(citations).toHaveLength(1)
			if (citations[0].type === 'case') {
				expect(citations[0].volume).toBe(410)
				expect(citations[0].reporter).toBe('U.S.')
				expect(citations[0].page).toBeUndefined()
				expect(citations[0].hasBlankPage).toBe(true)
				expect(citations[0].confidence).toBe(0.8)
			}
		})

		it('should extract state reporter citation with ___ as blank page', () => {
			const citations = extractCitations('100 Cal.App.4th ___')
			expect(citations).toHaveLength(1)
			if (citations[0].type === 'case') {
				expect(citations[0].volume).toBe(100)
				expect(citations[0].reporter).toBe('Cal.App.4th')
				expect(citations[0].page).toBeUndefined()
				expect(citations[0].hasBlankPage).toBe(true)
				expect(citations[0].confidence).toBe(0.8)
			}
		})

		it('should extract citation with ____ (4 underscores) as blank page', () => {
			const citations = extractCitations('410 U.S. ____')
			expect(citations).toHaveLength(1)
			if (citations[0].type === 'case') {
				expect(citations[0].volume).toBe(410)
				expect(citations[0].reporter).toBe('U.S.')
				expect(citations[0].page).toBeUndefined()
				expect(citations[0].hasBlankPage).toBe(true)
				expect(citations[0].confidence).toBe(0.8)
			}
		})
	})

	describe('triple dash placeholder', () => {
		it('should extract citation with --- as blank page', () => {
			const citations = extractCitations('500 F.2d ---')
			expect(citations).toHaveLength(1)
			if (citations[0].type === 'case') {
				expect(citations[0].volume).toBe(500)
				expect(citations[0].reporter).toBe('F.2d')
				expect(citations[0].page).toBeUndefined()
				expect(citations[0].hasBlankPage).toBe(true)
				expect(citations[0].confidence).toBe(0.8)
			}
		})

		it('should extract citation with ---- (4 dashes) as blank page', () => {
			const citations = extractCitations('410 U.S. ----')
			expect(citations).toHaveLength(1)
			if (citations[0].type === 'case') {
				expect(citations[0].volume).toBe(410)
				expect(citations[0].reporter).toBe('U.S.')
				expect(citations[0].page).toBeUndefined()
				expect(citations[0].hasBlankPage).toBe(true)
				expect(citations[0].confidence).toBe(0.8)
			}
		})
	})

	describe('blank page with parenthetical', () => {
		it('should extract blank page citation with year in parenthetical', () => {
			const citations = extractCitations('500 F.2d ___ (2020)')
			expect(citations).toHaveLength(1)
			if (citations[0].type === 'case') {
				expect(citations[0].volume).toBe(500)
				expect(citations[0].reporter).toBe('F.2d')
				expect(citations[0].page).toBeUndefined()
				expect(citations[0].hasBlankPage).toBe(true)
				expect(citations[0].year).toBe(2020)
				expect(citations[0].confidence).toBe(0.8)
			}
		})

		it('should extract blank page citation with court and year', () => {
			const citations = extractCitations('500 F.2d ___ (9th Cir. 2020)')
			expect(citations).toHaveLength(1)
			if (citations[0].type === 'case') {
				expect(citations[0].volume).toBe(500)
				expect(citations[0].reporter).toBe('F.2d')
				expect(citations[0].page).toBeUndefined()
				expect(citations[0].hasBlankPage).toBe(true)
				expect(citations[0].court).toBe('9th Cir.')
				expect(citations[0].year).toBe(2020)
				expect(citations[0].confidence).toBe(0.8)
			}
		})
	})

	describe('edge cases', () => {
		it('should not match single underscore as blank page', () => {
			const citations = extractCitations('500 F.2d _')
			// Should not match - single underscore is not a valid placeholder
			expect(citations).toHaveLength(0)
		})

		it('should not match single dash as blank page', () => {
			const citations = extractCitations('500 F.2d -')
			// Should not match - single dash is not a valid placeholder
			expect(citations).toHaveLength(0)
		})

		it('should not match double underscore as blank page', () => {
			const citations = extractCitations('500 F.2d __')
			// Should not match - need at least 3 for valid placeholder
			expect(citations).toHaveLength(0)
		})

		it('should not set hasBlankPage for normal numeric page', () => {
			const citations = extractCitations('500 F.2d 123')
			expect(citations).toHaveLength(1)
			if (citations[0].type === 'case') {
				expect(citations[0].page).toBe(123)
				expect(citations[0].hasBlankPage).toBeUndefined()
				expect(citations[0].confidence).toBeGreaterThanOrEqual(0.8)
			}
		})
	})
})
