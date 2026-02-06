import { describe, it, expect } from 'vitest'
import { extractCitations } from '@/extract'

describe('International Citation Exclusions', () => {
	describe('I.C.J. (International Court of Justice)', () => {
		it('should not extract I.C.J. citations (not US legal citations)', () => {
			const text = 'Military and Paramilitary Activities (Nicar. v. U.S.), 1986 I.C.J. 14 (June 27)'
			const citations = extractCitations(text)

			// Should extract 0 citations - I.C.J. is international tribunal
			expect(citations.length).toBe(0)
		})

		it('should not extract I.C.J. citations in mixed text', () => {
			const text = 'See 1986 I.C.J. 14 and 2020 WL 123456'
			const citations = extractCitations(text)

			// Should only extract the WestLaw citation, not the I.C.J.
			expect(citations.length).toBe(1)
			expect(citations[0].type).toBe('neutral')
		})
	})

	describe('U.N.T.S. (United Nations Treaty Series)', () => {
		it('should not extract U.N.T.S. citations (not US legal citations)', () => {
			const text = 'Vienna Convention art. 31, 1155 U.N.T.S. 331'
			const citations = extractCitations(text)

			// Should extract 0 citations - U.N.T.S. is international treaty series
			expect(citations.length).toBe(0)
		})

		it('should not extract U.N.T.S. citations in mixed text', () => {
			const text = 'See 1155 U.N.T.S. 331 and 500 F.2d 123'
			const citations = extractCitations(text)

			// Should only extract the Federal Reporter citation, not U.N.T.S.
			expect(citations.length).toBe(1)
			expect(citations[0].type).toBe('case')
			expect(citations[0].reporter).toBe('F.2d')
		})
	})

	describe('Mixed international and US citations', () => {
		it('should extract only US citations when mixed with international', () => {
			const text = 'Compare 1986 I.C.J. 14 with Smith v. Jones, 410 U.S. 113 (1973) and 1155 U.N.T.S. 331'
			const citations = extractCitations(text)

			// Should only extract the U.S. Supreme Court citation
			expect(citations.length).toBe(1)
			expect(citations[0].type).toBe('case')
			expect(citations[0].reporter).toBe('U.S.')
			expect(citations[0].volume).toBe(410)
			expect(citations[0].page).toBe(113)
		})
	})
})
