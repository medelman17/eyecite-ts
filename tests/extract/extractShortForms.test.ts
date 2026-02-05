import { describe, it, expect } from 'vitest'
import { extractId, extractSupra, extractShortFormCase, extractCitations } from '@/extract'
import type { Token } from '@/tokenize'
import type { TransformationMap } from '@/types/span'

describe('extractShortForms', () => {
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

	describe('extractId', () => {
		it('should extract Id. without pincite', () => {
			const token: Token = {
				text: 'Id.',
				span: { cleanStart: 10, cleanEnd: 13 },
				type: 'case',
				patternId: 'id',
			}
			const transformationMap = createIdentityMap()

			const citation = extractId(token, transformationMap)

			expect(citation.type).toBe('id')
			expect(citation.text).toBe('Id.')
			expect(citation.matchedText).toBe('Id.')
			expect(citation.pincite).toBeUndefined()
			expect(citation.confidence).toBe(1.0)
			expect(citation.span.cleanStart).toBe(10)
			expect(citation.span.cleanEnd).toBe(13)
			expect(citation.span.originalStart).toBe(10)
			expect(citation.span.originalEnd).toBe(13)
		})

		it('should extract Id. with pincite', () => {
			const token: Token = {
				text: 'Id. at 253',
				span: { cleanStart: 10, cleanEnd: 20 },
				type: 'case',
				patternId: 'id',
			}
			const transformationMap = createIdentityMap()

			const citation = extractId(token, transformationMap)

			expect(citation.type).toBe('id')
			expect(citation.pincite).toBe(253)
			expect(citation.confidence).toBe(1.0)
		})

		it('should extract Ibid. without pincite', () => {
			const token: Token = {
				text: 'Ibid.',
				span: { cleanStart: 0, cleanEnd: 5 },
				type: 'case',
				patternId: 'ibid',
			}
			const transformationMap = createIdentityMap()

			const citation = extractId(token, transformationMap)

			expect(citation.type).toBe('id')
			expect(citation.text).toBe('Ibid.')
			expect(citation.pincite).toBeUndefined()
			expect(citation.confidence).toBe(1.0)
		})

		it('should extract Ibid. with pincite', () => {
			const token: Token = {
				text: 'Ibid. at 125',
				span: { cleanStart: 0, cleanEnd: 12 },
				type: 'case',
				patternId: 'ibid',
			}
			const transformationMap = createIdentityMap()

			const citation = extractId(token, transformationMap)

			expect(citation.type).toBe('id')
			expect(citation.pincite).toBe(125)
			expect(citation.confidence).toBe(1.0)
		})

		it('should handle lowercase id.', () => {
			const token: Token = {
				text: 'id. at 100',
				span: { cleanStart: 5, cleanEnd: 15 },
				type: 'case',
				patternId: 'id',
			}
			const transformationMap = createIdentityMap()

			const citation = extractId(token, transformationMap)

			expect(citation.type).toBe('id')
			expect(citation.pincite).toBe(100)
		})

		it('should translate positions with offset transformation map', () => {
			const token: Token = {
				text: 'Id. at 253',
				span: { cleanStart: 10, cleanEnd: 20 },
				type: 'case',
				patternId: 'id',
			}
			const transformationMap = createOffsetMap(5)

			const citation = extractId(token, transformationMap)

			expect(citation.span.cleanStart).toBe(10)
			expect(citation.span.cleanEnd).toBe(20)
			expect(citation.span.originalStart).toBe(15) // +5 offset
			expect(citation.span.originalEnd).toBe(25) // +5 offset
		})

		it('should throw error on non-Id text', () => {
			const token: Token = {
				text: 'Not an Id citation',
				span: { cleanStart: 0, cleanEnd: 18 },
				type: 'case',
				patternId: 'id',
			}
			const transformationMap = createIdentityMap()

			expect(() => extractId(token, transformationMap)).toThrow(
				'Failed to parse Id. citation'
			)
		})
	})

	describe('extractSupra', () => {
		it('should extract supra without pincite', () => {
			const token: Token = {
				text: 'Smith, supra',
				span: { cleanStart: 10, cleanEnd: 22 },
				type: 'case',
				patternId: 'supra',
			}
			const transformationMap = createIdentityMap()

			const citation = extractSupra(token, transformationMap)

			expect(citation.type).toBe('supra')
			expect(citation.text).toBe('Smith, supra')
			expect(citation.matchedText).toBe('Smith, supra')
			expect(citation.partyName).toBe('Smith')
			expect(citation.pincite).toBeUndefined()
			expect(citation.confidence).toBe(0.9)
			expect(citation.span.cleanStart).toBe(10)
			expect(citation.span.cleanEnd).toBe(22)
		})

		it('should extract supra with pincite', () => {
			const token: Token = {
				text: 'Smith, supra, at 460',
				span: { cleanStart: 10, cleanEnd: 30 },
				type: 'case',
				patternId: 'supra',
			}
			const transformationMap = createIdentityMap()

			const citation = extractSupra(token, transformationMap)

			expect(citation.type).toBe('supra')
			expect(citation.partyName).toBe('Smith')
			expect(citation.pincite).toBe(460)
			expect(citation.confidence).toBe(0.9)
		})

		it('should extract supra without comma before at', () => {
			const token: Token = {
				text: 'Smith supra at 100',
				span: { cleanStart: 0, cleanEnd: 18 },
				type: 'case',
				patternId: 'supra',
			}
			const transformationMap = createIdentityMap()

			const citation = extractSupra(token, transformationMap)

			expect(citation.partyName).toBe('Smith')
			expect(citation.pincite).toBe(100)
		})

		it('should extract multi-word party names', () => {
			const token: Token = {
				text: 'Smith v Jones, supra',
				span: { cleanStart: 0, cleanEnd: 20 },
				type: 'case',
				patternId: 'supra',
			}
			const transformationMap = createIdentityMap()

			const citation = extractSupra(token, transformationMap)

			expect(citation.partyName).toBe('Smith v Jones')
		})

		it('should handle party names with multiple words', () => {
			const token: Token = {
				text: 'United States, supra, at 250',
				span: { cleanStart: 5, cleanEnd: 33 },
				type: 'case',
				patternId: 'supra',
			}
			const transformationMap = createIdentityMap()

			const citation = extractSupra(token, transformationMap)

			expect(citation.partyName).toBe('United States')
			expect(citation.pincite).toBe(250)
		})

		it('should translate positions with offset transformation map', () => {
			const token: Token = {
				text: 'Smith, supra, at 460',
				span: { cleanStart: 10, cleanEnd: 30 },
				type: 'case',
				patternId: 'supra',
			}
			const transformationMap = createOffsetMap(3)

			const citation = extractSupra(token, transformationMap)

			expect(citation.span.cleanStart).toBe(10)
			expect(citation.span.cleanEnd).toBe(30)
			expect(citation.span.originalStart).toBe(13) // +3 offset
			expect(citation.span.originalEnd).toBe(33) // +3 offset
		})

		it('should handle space before comma (HTML cleaning artifact)', () => {
			const token: Token = {
				text: 'Twombly , supra, at 553',
				span: { cleanStart: 0, cleanEnd: 23 },
				type: 'case',
				patternId: 'supra',
			}
			const transformationMap = createIdentityMap()

			const citation = extractSupra(token, transformationMap)

			expect(citation.partyName).toBe('Twombly')
			expect(citation.pincite).toBe(553)
		})

		it('should handle space before comma without pincite', () => {
			const token: Token = {
				text: 'Smith , supra',
				span: { cleanStart: 0, cleanEnd: 13 },
				type: 'case',
				patternId: 'supra',
			}
			const transformationMap = createIdentityMap()

			const citation = extractSupra(token, transformationMap)

			expect(citation.partyName).toBe('Smith')
			expect(citation.pincite).toBeUndefined()
		})

		it('should throw error on non-supra text', () => {
			const token: Token = {
				text: 'Not a valid citation',
				span: { cleanStart: 0, cleanEnd: 20 },
				type: 'case',
				patternId: 'supra',
			}
			const transformationMap = createIdentityMap()

			expect(() => extractSupra(token, transformationMap)).toThrow(
				'Failed to parse supra citation'
			)
		})
	})

	describe('extractShortFormCase', () => {
		it('should extract short-form case with volume, reporter, and pincite', () => {
			const token: Token = {
				text: '500 F.2d at 125',
				span: { cleanStart: 10, cleanEnd: 25 },
				type: 'case',
				patternId: 'short-form-case',
			}
			const transformationMap = createIdentityMap()

			const citation = extractShortFormCase(token, transformationMap)

			expect(citation.type).toBe('shortFormCase')
			expect(citation.text).toBe('500 F.2d at 125')
			expect(citation.matchedText).toBe('500 F.2d at 125')
			expect(citation.volume).toBe(500)
			expect(citation.reporter).toBe('F.2d')
			expect(citation.pincite).toBe(125)
			expect(citation.confidence).toBe(0.7)
			expect(citation.span.cleanStart).toBe(10)
			expect(citation.span.cleanEnd).toBe(25)
		})

		it('should handle different reporter formats', () => {
			const token: Token = {
				text: '410 U.S. at 115',
				span: { cleanStart: 0, cleanEnd: 15 },
				type: 'case',
				patternId: 'short-form-case',
			}
			const transformationMap = createIdentityMap()

			const citation = extractShortFormCase(token, transformationMap)

			expect(citation.volume).toBe(410)
			expect(citation.reporter).toBe('U.S.')
			expect(citation.pincite).toBe(115)
		})

		it('should handle reporters with spaces', () => {
			const token: Token = {
				text: '123 So. 2d at 456',
				span: { cleanStart: 0, cleanEnd: 17 },
				type: 'case',
				patternId: 'short-form-case',
			}
			const transformationMap = createIdentityMap()

			const citation = extractShortFormCase(token, transformationMap)

			expect(citation.volume).toBe(123)
			expect(citation.reporter).toBe('So. 2d')
			expect(citation.pincite).toBe(456)
		})

		it('should handle reporters with edition numbers', () => {
			const token: Token = {
				text: '789 F.3d at 200',
				span: { cleanStart: 5, cleanEnd: 20 },
				type: 'case',
				patternId: 'short-form-case',
			}
			const transformationMap = createIdentityMap()

			const citation = extractShortFormCase(token, transformationMap)

			expect(citation.volume).toBe(789)
			expect(citation.reporter).toBe('F.3d')
			expect(citation.pincite).toBe(200)
		})

		it('should translate positions with offset transformation map', () => {
			const token: Token = {
				text: '500 F.2d at 125',
				span: { cleanStart: 10, cleanEnd: 25 },
				type: 'case',
				patternId: 'short-form-case',
			}
			const transformationMap = createOffsetMap(7)

			const citation = extractShortFormCase(token, transformationMap)

			expect(citation.span.cleanStart).toBe(10)
			expect(citation.span.cleanEnd).toBe(25)
			expect(citation.span.originalStart).toBe(17) // +7 offset
			expect(citation.span.originalEnd).toBe(32) // +7 offset
		})

		it('should throw error on non-short-form text', () => {
			const token: Token = {
				text: 'Not a short form',
				span: { cleanStart: 0, cleanEnd: 16 },
				type: 'case',
				patternId: 'short-form-case',
			}
			const transformationMap = createIdentityMap()

			expect(() => extractShortFormCase(token, transformationMap)).toThrow(
				'Failed to parse short-form case citation'
			)
		})
	})

	describe('confidence scoring', () => {
		it('should assign confidence 1.0 to Id. citations', () => {
			const token: Token = {
				text: 'Id. at 253',
				span: { cleanStart: 0, cleanEnd: 10 },
				type: 'case',
				patternId: 'id',
			}
			const citation = extractId(token, createIdentityMap())
			expect(citation.confidence).toBe(1.0)
		})

		it('should assign confidence 0.9 to supra citations', () => {
			const token: Token = {
				text: 'Smith, supra, at 460',
				span: { cleanStart: 0, cleanEnd: 20 },
				type: 'case',
				patternId: 'supra',
			}
			const citation = extractSupra(token, createIdentityMap())
			expect(citation.confidence).toBe(0.9)
		})

		it('should assign confidence 0.7 to short-form case citations', () => {
			const token: Token = {
				text: '500 F.2d at 125',
				span: { cleanStart: 0, cleanEnd: 15 },
				type: 'case',
				patternId: 'short-form-case',
			}
			const citation = extractShortFormCase(token, createIdentityMap())
			expect(citation.confidence).toBe(0.7)
		})
	})

	describe('edge cases', () => {
		it('should handle empty pincite spaces in Id.', () => {
			const token: Token = {
				text: 'Id.',
				span: { cleanStart: 0, cleanEnd: 3 },
				type: 'case',
				patternId: 'id',
			}
			const citation = extractId(token, createIdentityMap())
			expect(citation.pincite).toBeUndefined()
		})

		it('should handle empty pincite in supra', () => {
			const token: Token = {
				text: 'Smith, supra',
				span: { cleanStart: 0, cleanEnd: 12 },
				type: 'case',
				patternId: 'supra',
			}
			const citation = extractSupra(token, createIdentityMap())
			expect(citation.pincite).toBeUndefined()
		})

		it('should trim whitespace from reporter in short-form', () => {
			const token: Token = {
				text: '100 F.   at 200',
				span: { cleanStart: 0, cleanEnd: 15 },
				type: 'case',
				patternId: 'short-form-case',
			}
			const citation = extractShortFormCase(token, createIdentityMap())
			expect(citation.reporter).toBe('F.')
		})
	})
})

describe('supra with HTML cleaning artifacts (integration)', () => {
	it('should match supra when HTML tags introduce space before comma', () => {
		const text = 'In <em>Twombly</em>, supra, at 553'
		const citations = extractCitations(text)
		const supra = citations.find((c) => c.type === 'supra')

		expect(supra).toBeDefined()
		if (supra?.type === 'supra') {
			expect(supra.pincite).toBe(553)
		}
	})

	it('should match supra with space before comma in plain text', () => {
		const text = 'Twombly , supra, at 553'
		const citations = extractCitations(text)
		const supra = citations.find((c) => c.type === 'supra')

		expect(supra).toBeDefined()
		if (supra?.type === 'supra') {
			expect(supra.partyName).toBe('Twombly')
			expect(supra.pincite).toBe(553)
		}
	})
})
