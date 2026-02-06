/**
 * Thorny Corpus Integration Tests
 *
 * The gnarliest citation patterns in legal practice: early SCOTUS nominative reporters,
 * specialty courts (military, bankruptcy, tax, veterans), vendor-neutral state citations,
 * deeply nested parentheticals, subsequent history chains, historical sources (Magna Carta,
 * Blackstone, Federalist Papers), international citations, Unicode edge cases, false
 * positive adversarial inputs, and dense paragraphs mixing every citation type.
 *
 * 94 samples across 19 categories designed to push the library to its breaking point.
 */

import { describe, it, expect } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import type { Citation } from "@/types/citation"
import thornyCorpus from "../fixtures/thorny-corpus.json"

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

const samplesByCategory = new Map<string, CorpusSample[]>()
for (const sample of thornyCorpus.samples as CorpusSample[]) {
	const category = sample.category || "uncategorized"
	if (!samplesByCategory.has(category)) {
		samplesByCategory.set(category, [])
	}
	samplesByCategory.get(category)!.push(sample)
}

describe("Thorny Corpus — 94 Edge-Case Samples", () => {
	for (const [category, samples] of samplesByCategory) {
		describe(category, () => {
			for (const sample of samples) {
				if (sample.performanceBenchmark) continue

				if (sample.knownLimitation) {
					it.skip(`${sample.id}: ${sample.description} [KNOWN: ${sample.knownLimitation}]`, () => {})
					continue
				}

				it(`${sample.id}: ${sample.description}`, () => {
					const citations = extractCitations(sample.text)

					expect(
						citations.length,
						`Expected ${sample.expected.length} citations but got ${citations.length}.\n` +
							`Text: "${sample.text.substring(0, 120)}..."\n` +
							`Got: ${JSON.stringify(citations.map((c) => ({ type: c.type, text: c.matchedText })), null, 2)}`,
					).toBe(sample.expected.length)

					for (let i = 0; i < sample.expected.length; i++) {
						const expected = sample.expected[i]
						const actual = citations[i]

						expect(actual, `Citation at index ${i} is undefined`).toBeDefined()

						const { matches, mismatches } = matchesExpected(actual, expected)
						if (!matches) {
							expect.fail(
								`Citation ${i} mismatch in "${sample.id}":\n` +
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

	describe("Performance Benchmarks", () => {
		const perfSamples = (thornyCorpus.samples as CorpusSample[]).filter(
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

	describe("Quality Invariants", () => {
		it("no extraction crashes on any thorny input", () => {
			for (const sample of thornyCorpus.samples as CorpusSample[]) {
				if (sample.knownLimitation) continue
				expect(() => extractCitations(sample.text)).not.toThrow()
			}
		})

		it("all citations have valid confidence and spans", () => {
			for (const sample of thornyCorpus.samples as CorpusSample[]) {
				if (sample.knownLimitation) continue
				const citations = extractCitations(sample.text)
				for (const c of citations) {
					expect(c.confidence).toBeGreaterThanOrEqual(0)
					expect(c.confidence).toBeLessThanOrEqual(1)
					if (sample.text) {
						expect(c.span.originalStart).toBeGreaterThanOrEqual(0)
						expect(c.span.originalEnd).toBeLessThanOrEqual(sample.text.length)
					}
				}
			}
		})
	})
})
