/**
 * Expanded Corpus Integration Tests
 *
 * Stress-tests citation extraction against 165 real-world legal text samples
 * spanning 19 categories: federal/state/SCOTUS cases, statutes, journals,
 * neutral citations, public laws, federal register, short forms, parallel
 * citations, dense multi-citation paragraphs, and edge cases.
 *
 * Uses the same partial field matching strategy as the golden corpus:
 * only validates fields explicitly set in expected objects.
 */

import { describe, it, expect } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import type { Citation } from "@/types/citation"
import expandedCorpus from "../fixtures/expanded-corpus.json"

interface ExpectedCitation {
	[key: string]: unknown
}

interface CorpusSample {
	id: string
	category?: string
	description: string
	text: string
	expected: ExpectedCitation[]
	knownLimitation?: string
	performanceBenchmark?: {
		maxDurationMs: number
		minCitations: number
	}
}

/**
 * Match expected fields against actual citation.
 * Only checks fields explicitly set in expected object.
 */
function matchesExpected(
	actual: Citation,
	expected: ExpectedCitation,
): { matches: boolean; mismatches: string[] } {
	const mismatches: string[] = []

	for (const [key, expectedValue] of Object.entries(expected)) {
		if (expectedValue === undefined) continue

		const actualValue = (actual as Record<string, unknown>)[key]

		if (typeof expectedValue === "object" && expectedValue !== null) {
			if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
				mismatches.push(
					`${key}: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`,
				)
			}
		} else if (actualValue !== expectedValue) {
			mismatches.push(
				`${key}: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`,
			)
		}
	}

	return { matches: mismatches.length === 0, mismatches }
}

// Group samples by category for organized test output
const samplesByCategory = new Map<string, CorpusSample[]>()
for (const sample of expandedCorpus.samples as CorpusSample[]) {
	const category = sample.category || "uncategorized"
	if (!samplesByCategory.has(category)) {
		samplesByCategory.set(category, [])
	}
	samplesByCategory.get(category)!.push(sample)
}

describe("Expanded Corpus — 165 Real-World Samples", () => {
	// Run tests grouped by category
	for (const [category, samples] of samplesByCategory) {
		describe(category, () => {
			for (const sample of samples) {
				// Skip performance benchmarks in accuracy tests
				if (sample.performanceBenchmark) continue

				// Skip known limitations — tracked separately
				if (sample.knownLimitation) {
					it.skip(`${sample.id}: ${sample.description} [KNOWN: ${sample.knownLimitation}]`, () => {})
					continue
				}

				it(`${sample.id}: ${sample.description}`, () => {
					const citations = extractCitations(sample.text)

					// Check citation count
					expect(
						citations.length,
						`Expected ${sample.expected.length} citations but got ${citations.length}.\n` +
							`Text: "${sample.text.substring(0, 100)}..."\n` +
							`Got: ${JSON.stringify(citations.map((c) => ({ type: c.type, text: c.matchedText })), null, 2)}`,
					).toBe(sample.expected.length)

					// Validate each expected citation
					for (let i = 0; i < sample.expected.length; i++) {
						const expected = sample.expected[i]
						const actual = citations[i]

						expect(actual, `Citation at index ${i} is undefined`).toBeDefined()

						const { matches, mismatches } = matchesExpected(actual, expected)
						if (!matches) {
							expect.fail(
								`Citation ${i} mismatch in sample "${sample.id}":\n` +
									mismatches.map((m) => `  - ${m}`).join("\n") +
									`\nExpected: ${JSON.stringify(expected, null, 2)}` +
									`\nActual: ${JSON.stringify(actual, null, 2)}`,
							)
						}
					}
				})
			}
		})
	}

	// Performance benchmarks
	describe("Performance Benchmarks", () => {
		const perfSamples = (expandedCorpus.samples as CorpusSample[]).filter(
			(s) => s.performanceBenchmark,
		)

		for (const sample of perfSamples) {
			it(`PERF: ${sample.id} — <${sample.performanceBenchmark!.maxDurationMs}ms, ≥${sample.performanceBenchmark!.minCitations} citations`, () => {
				const start = performance.now()
				const citations = extractCitations(sample.text)
				const duration = performance.now() - start

				expect(duration).toBeLessThan(
					sample.performanceBenchmark!.maxDurationMs,
				)
				expect(citations.length).toBeGreaterThanOrEqual(
					sample.performanceBenchmark!.minCitations,
				)
			})
		}
	})

	// Quality assertions across all samples
	describe("Quality Invariants", () => {
		it("all citations have valid confidence scores", () => {
			for (const sample of expandedCorpus.samples as CorpusSample[]) {
				if (sample.knownLimitation) continue
				const citations = extractCitations(sample.text)
				for (const c of citations) {
					expect(
						c.confidence,
						`Invalid confidence ${c.confidence} in "${sample.id}"`,
					).toBeGreaterThanOrEqual(0)
					expect(
						c.confidence,
						`Invalid confidence ${c.confidence} in "${sample.id}"`,
					).toBeLessThanOrEqual(1)
				}
			}
		})

		it("all citations have valid spans within text bounds", () => {
			for (const sample of expandedCorpus.samples as CorpusSample[]) {
				if (!sample.text || sample.knownLimitation) continue
				const citations = extractCitations(sample.text)
				for (const c of citations) {
					expect(
						c.span.originalStart,
						`Negative span start in "${sample.id}"`,
					).toBeGreaterThanOrEqual(0)
					expect(
						c.span.originalEnd,
						`Span end exceeds text length in "${sample.id}"`,
					).toBeLessThanOrEqual(sample.text.length)
					expect(
						c.span.originalEnd,
						`Span end ≤ start in "${sample.id}"`,
					).toBeGreaterThan(c.span.originalStart)
				}
			}
		})

		it("no citation has empty matchedText", () => {
			for (const sample of expandedCorpus.samples as CorpusSample[]) {
				if (sample.knownLimitation) continue
				const citations = extractCitations(sample.text)
				for (const c of citations) {
					expect(
						c.matchedText?.length,
						`Empty matchedText in "${sample.id}"`,
					).toBeGreaterThan(0)
				}
			}
		})
	})
})
