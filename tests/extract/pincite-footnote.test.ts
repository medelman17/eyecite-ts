import { describe, it, expect } from 'vitest'
import { extractCitations } from '@/extract'

describe('pincite with footnote reference (Issue #52)', () => {
	it('should extract year when pincite has footnote notation n.3', () => {
		const citations = extractCitations('Miranda v. Arizona, 384 U.S. 436, 444 n.3 (1966)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].volume).toBe(384)
			expect(citations[0].reporter).toBe('U.S.')
			expect(citations[0].page).toBe(436)
			expect(citations[0].year).toBe(1966)
			expect(citations[0].caseName).toBe('Miranda v. Arizona')
		}
	})

	it('should handle footnote reference with different numbers', () => {
		const citations = extractCitations('Smith v. Jones, 500 F.2d 123, 125 n.1 (2020)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].volume).toBe(500)
			expect(citations[0].reporter).toBe('F.2d')
			expect(citations[0].page).toBe(123)
			expect(citations[0].year).toBe(2020)
		}
	})

	it('should handle footnote reference with multi-digit number', () => {
		const citations = extractCitations('Roe v. Wade, 410 U.S. 113, 150 n.42 (1973)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].volume).toBe(410)
			expect(citations[0].reporter).toBe('U.S.')
			expect(citations[0].page).toBe(113)
			expect(citations[0].year).toBe(1973)
		}
	})

	it('should still work without footnote reference', () => {
		const citations = extractCitations('Brown v. Board, 347 U.S. 483, 495 (1954)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].volume).toBe(347)
			expect(citations[0].reporter).toBe('U.S.')
			expect(citations[0].page).toBe(483)
			expect(citations[0].pincite).toBe(495)
			expect(citations[0].year).toBe(1954)
		}
	})

	it('should handle multiple pincites with footnote', () => {
		const citations = extractCitations('Test v. Case, 100 F.2d 50, 52, 55 n.5 (1990)')
		expect(citations).toHaveLength(1)
		if (citations[0].type === 'case') {
			expect(citations[0].year).toBe(1990)
		}
	})
})
