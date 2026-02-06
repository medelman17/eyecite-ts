/**
 * Tests for parallel citation detection algorithm.
 *
 * Parallel citations are comma-separated case citations sharing a parenthetical.
 * Detection happens after tokenization and before extraction in the pipeline.
 */

import { describe, it, expect } from 'vitest'
import { detectParallelCitations } from '@/extract/detectParallel'
import type { Token } from '@/tokenize/tokenizer'

describe('detectParallelCitations', () => {
	describe('positive cases - standard parallel citations', () => {
		it('detects 2-reporter parallel citation', () => {
			const cleaned = '500 F.2d 123, 200 F. Supp. 456 (9th Cir. 1974)'
			const tokens: Token[] = [
				{
					text: '500 F.2d 123',
					span: { cleanStart: 0, cleanEnd: 12 },
					type: 'case',
					patternId: 'federal-reporter',
				},
				{
					text: '200 F. Supp. 456',
					span: { cleanStart: 14, cleanEnd: 30 },
					type: 'case',
					patternId: 'federal-reporter',
				},
			]

			const result = detectParallelCitations(tokens, cleaned)

			expect(result.size).toBe(1)
			expect(result.get(0)).toEqual([1])
		})

		it('detects 3-reporter parallel citation', () => {
			const cleaned = '410 U.S. 113, 93 S. Ct. 705, 35 L. Ed. 2d 147 (1973)'
			const tokens: Token[] = [
				{
					text: '410 U.S. 113',
					span: { cleanStart: 0, cleanEnd: 12 },
					type: 'case',
					patternId: 'supreme-court',
				},
				{
					text: '93 S. Ct. 705',
					span: { cleanStart: 14, cleanEnd: 27 },
					type: 'case',
					patternId: 'supreme-court',
				},
				{
					text: '35 L. Ed. 2d 147',
					span: { cleanStart: 29, cleanEnd: 45 },
					type: 'case',
					patternId: 'supreme-court',
				},
			]

			const result = detectParallelCitations(tokens, cleaned)

			expect(result.size).toBe(1)
			expect(result.get(0)).toEqual([1, 2])
		})

		it('detects parallel citations with shared court only (no year)', () => {
			const cleaned = '100 F.2d 10, 50 F. Supp. 20 (S.D.N.Y.)'
			const tokens: Token[] = [
				{
					text: '100 F.2d 10',
					span: { cleanStart: 0, cleanEnd: 11 },
					type: 'case',
					patternId: 'federal-reporter',
				},
				{
					text: '50 F. Supp. 20',
					span: { cleanStart: 13, cleanEnd: 27 },
					type: 'case',
					patternId: 'federal-reporter',
				},
			]

			const result = detectParallelCitations(tokens, cleaned)

			expect(result.size).toBe(1)
			expect(result.get(0)).toEqual([1])
		})

		it('detects parallel citations with shared year only (no court)', () => {
			const cleaned = '10 Cal. 3d 100, 500 P.2d 200 (1970)'
			const tokens: Token[] = [
				{
					text: '10 Cal. 3d 100',
					span: { cleanStart: 0, cleanEnd: 14 },
					type: 'case',
					patternId: 'state-reporter',
				},
				{
					text: '500 P.2d 200',
					span: { cleanStart: 16, cleanEnd: 28 },
					type: 'case',
					patternId: 'state-reporter',
				},
			]

			const result = detectParallelCitations(tokens, cleaned)

			expect(result.size).toBe(1)
			expect(result.get(0)).toEqual([1])
		})

		it('detects parallel citations with shared court and year', () => {
			const cleaned = '300 F.3d 100, 200 F. Supp. 2d 50 (D.C. Cir. 2002)'
			const tokens: Token[] = [
				{
					text: '300 F.3d 100',
					span: { cleanStart: 0, cleanEnd: 12 },
					type: 'case',
					patternId: 'federal-reporter',
				},
				{
					text: '200 F. Supp. 2d 50',
					span: { cleanStart: 14, cleanEnd: 32 },
					type: 'case',
					patternId: 'federal-reporter',
				},
			]

			const result = detectParallelCitations(tokens, cleaned)

			expect(result.size).toBe(1)
			expect(result.get(0)).toEqual([1])
		})
	})

	describe('negative cases - not parallel', () => {
		it('does not link different cases separated by comma (no shared parenthetical)', () => {
			const cleaned = 'Smith v. Jones, 500 F.2d 100 (1974), and Doe v. Roe, 600 F.2d 200 (1975)'
			const tokens: Token[] = [
				{
					text: '500 F.2d 100',
					span: { cleanStart: 16, cleanEnd: 28 },
					type: 'case',
					patternId: 'federal-reporter',
				},
				{
					text: '600 F.2d 200',
					span: { cleanStart: 53, cleanEnd: 65 },
					type: 'case',
					patternId: 'federal-reporter',
				},
			]

			const result = detectParallelCitations(tokens, cleaned)

			expect(result.size).toBe(0)
		})

		it('does not link citations separated by semicolon', () => {
			const cleaned = '500 F.2d 123; 200 F. Supp. 456 (1974)'
			const tokens: Token[] = [
				{
					text: '500 F.2d 123',
					span: { cleanStart: 0, cleanEnd: 12 },
					type: 'case',
					patternId: 'federal-reporter',
				},
				{
					text: '200 F. Supp. 456',
					span: { cleanStart: 14, cleanEnd: 30 },
					type: 'case',
					patternId: 'federal-reporter',
				},
			]

			const result = detectParallelCitations(tokens, cleaned)

			expect(result.size).toBe(0)
		})

		it('does not link statute and case citation', () => {
			const cleaned = '42 U.S.C. § 1983, 500 F.2d 100 (1974)'
			const tokens: Token[] = [
				{
					text: '42 U.S.C. § 1983',
					span: { cleanStart: 0, cleanEnd: 16 },
					type: 'statute',
					patternId: 'usc',
				},
				{
					text: '500 F.2d 100',
					span: { cleanStart: 18, cleanEnd: 30 },
					type: 'case',
					patternId: 'federal-reporter',
				},
			]

			const result = detectParallelCitations(tokens, cleaned)

			expect(result.size).toBe(0)
		})

		it('does not link citations with wide separation after comma', () => {
			const cleaned = '500 F.2d 123,      200 F. Supp. 456 (1974)' // 6 spaces after comma
			const tokens: Token[] = [
				{
					text: '500 F.2d 123',
					span: { cleanStart: 0, cleanEnd: 12 },
					type: 'case',
					patternId: 'federal-reporter',
				},
				{
					text: '200 F. Supp. 456',
					span: { cleanStart: 19, cleanEnd: 35 }, // cleanStart: 19 = 12 (end of first) + 1 (comma) + 6 (spaces)
					type: 'case',
					patternId: 'federal-reporter',
				},
			]

			const result = detectParallelCitations(tokens, cleaned)

			expect(result.size).toBe(0)
		})
	})

	describe('edge cases', () => {
		it('returns empty map for empty token array', () => {
			const result = detectParallelCitations([])

			expect(result.size).toBe(0)
		})

		it('returns empty map for single citation', () => {
			const tokens: Token[] = [
				{
					text: '500 F.2d 123',
					span: { cleanStart: 0, cleanEnd: 12 },
					type: 'case',
					patternId: 'federal-reporter',
				},
			]

			const result = detectParallelCitations(tokens)

			expect(result.size).toBe(0)
		})

		it('returns empty map when no case citations', () => {
			const tokens: Token[] = [
				{
					text: '42 U.S.C. § 1983',
					span: { cleanStart: 0, cleanEnd: 16 },
					type: 'statute',
					patternId: 'usc',
				},
				{
					text: '100 Harv. L. Rev. 123',
					span: { cleanStart: 18, cleanEnd: 39 },
					type: 'journal',
					patternId: 'journal',
				},
			]

			const result = detectParallelCitations(tokens)

			expect(result.size).toBe(0)
		})

		it('handles multiple parallel groups in same document', () => {
			const cleaned = '500 F.2d 100, 200 F. Supp. 50 (1970). See also 300 F.3d 200, 100 F. Supp. 2d 75 (2000).'
			const tokens: Token[] = [
				{
					text: '500 F.2d 100',
					span: { cleanStart: 0, cleanEnd: 12 },
					type: 'case',
					patternId: 'federal-reporter',
				},
				{
					text: '200 F. Supp. 50',
					span: { cleanStart: 14, cleanEnd: 29 },
					type: 'case',
					patternId: 'federal-reporter',
				},
				{
					text: '300 F.3d 200',
					span: { cleanStart: 47, cleanEnd: 59 },
					type: 'case',
					patternId: 'federal-reporter',
				},
				{
					text: '100 F. Supp. 2d 75',
					span: { cleanStart: 61, cleanEnd: 79 },
					type: 'case',
					patternId: 'federal-reporter',
				},
			]

			const result = detectParallelCitations(tokens, cleaned)

			expect(result.size).toBe(2)
			expect(result.get(0)).toEqual([1])
			expect(result.get(2)).toEqual([3])
		})
	})

	describe('parenthetical detection', () => {
		it('detects shared parenthetical after both citations', () => {
			const cleaned = '500 F.2d 123, 200 F. Supp. 456 (9th Cir. 1974)'
			const tokens: Token[] = [
				{
					text: '500 F.2d 123',
					span: { cleanStart: 0, cleanEnd: 12 },
					type: 'case',
					patternId: 'federal-reporter',
				},
				{
					text: '200 F. Supp. 456',
					span: { cleanStart: 14, cleanEnd: 30 },
					type: 'case',
					patternId: 'federal-reporter',
				},
			]

			const result = detectParallelCitations(tokens, cleaned)

			expect(result.size).toBe(1)
			expect(result.get(0)).toEqual([1])
		})

		it('does not detect parallel without closing parenthetical', () => {
			const cleaned = '500 F.2d 123, 200 F. Supp. 456' // no parenthetical
			const tokens: Token[] = [
				{
					text: '500 F.2d 123',
					span: { cleanStart: 0, cleanEnd: 12 },
					type: 'case',
					patternId: 'federal-reporter',
				},
				{
					text: '200 F. Supp. 456',
					span: { cleanStart: 14, cleanEnd: 30 },
					type: 'case',
					patternId: 'federal-reporter',
				},
			]

			const result = detectParallelCitations(tokens, cleaned)

			expect(result.size).toBe(0)
		})
	})
})
