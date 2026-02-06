import { describe, it, expect } from 'vitest'
import { extractCitations } from '@/extract'

describe('Historical citations - false positives', () => {
	it('should not extract Magna Carta reference (3 Edw. 1, ch. 29 (1297))', () => {
		const text = '3 Edw. 1, ch. 29 (1297)'
		const citations = extractCitations(text)

		// Should extract 0 citations - this is a medieval English statute reference, not a modern case citation
		expect(citations.length).toBe(0)
	})

	it('should not extract Coke\'s Reports reference (8 Co. Rep. 114 (C.P. 1610))', () => {
		const text = "Dr. Bonham's Case, 8 Co. Rep. 114 (C.P. 1610)"
		const citations = extractCitations(text)

		// Should extract 0 citations - this is a historical English law report, not a modern citation
		expect(citations.length).toBe(0)
	})

	it('should still extract modern citations with valid years', () => {
		const text = 'Smith v. Jones, 500 F.2d 123 (9th Cir. 1974)'
		const citations = extractCitations(text)

		// Should extract 1 citation - this is a valid modern case citation
		expect(citations.length).toBe(1)
		expect(citations[0].type).toBe('case')
		expect(citations[0].volume).toBe(500)
		expect(citations[0].reporter).toBe('F.2d')
		expect(citations[0].page).toBe(123)
		expect(citations[0].year).toBe(1974)
	})

	it('should not extract pre-1700 citations regardless of reporter match', () => {
		// Various historical citation formats that should not be extracted
		const historicalCitations = [
			'3 Edw. 1, ch. 29 (1297)',
			'8 Co. Rep. 114 (C.P. 1610)',
			'2 Edw. Ch. 35 (1650)',
			'1 Edw. Rep. 10 (1500)',
		]

		for (const text of historicalCitations) {
			const citations = extractCitations(text)
			expect(citations.length).toBe(0, `Expected 0 citations for "${text}"`)
		}
	})
})
