import { describe, expect, it } from "vitest"
import {
	cleanText,
	fixSmartQuotes,
	normalizeDashes,
	normalizeWhitespace,
	stripHtmlTags,
} from "../../src/clean"

describe("cleanText position tracking", () => {
	it("should maintain identity transformation when no changes occur", () => {
		const input = "Smith v. Doe, 500 F.2d 123"
		const result = cleanText(input, []) // No cleaners applied

		// Text should be unchanged
		expect(result.cleaned).toBe(input)

		// Positions should map 1:1
		expect(result.transformationMap.cleanToOriginal.get(14)).toBe(14)
		expect(result.transformationMap.originalToClean.get(14)).toBe(14)

		// All positions should map to themselves
		for (let i = 0; i <= input.length; i++) {
			expect(result.transformationMap.cleanToOriginal.get(i)).toBe(i)
			expect(result.transformationMap.originalToClean.get(i)).toBe(i)
		}
	})

	it("should track positions after HTML tag removal", () => {
		const input = "Smith v. <b>Doe</b>, 500 F.2d 123"
		const expected = "Smith v. Doe, 500 F.2d 123"
		const result = cleanText(input, [stripHtmlTags])

		expect(result.cleaned).toBe(expected)

		// The "D" in "Doe" is at position 9 in cleaned, but position 12 in original (after "<b>")
		const cleanPosOfD = 9
		const originalPosOfD = 12
		expect(result.transformationMap.cleanToOriginal.get(cleanPosOfD)).toBe(
			originalPosOfD,
		)

		// The "," after "Doe" is at position 12 in cleaned, but position 19 in original (after "</b>")
		const cleanPosOfComma = 12
		const originalPosOfComma = 19
		expect(result.transformationMap.cleanToOriginal.get(cleanPosOfComma)).toBe(
			originalPosOfComma,
		)
	})

	it("should track positions after whitespace normalization", () => {
		const input = "Smith  v.  Doe,   500 F.2d 123" // Multiple spaces
		const expected = "Smith v. Doe, 500 F.2d 123"
		const result = cleanText(input, [normalizeWhitespace])

		expect(result.cleaned).toBe(expected)

		// "Doe" starts at position 11 in cleaned
		// In original: "Smith  v.  Doe..." - D is at position 11 + 2 extra spaces = 13
		const cleanPosOfDoe = 11
		const originalPosOfDoe = 13 // Not 15 - there are only 2 extra spaces before "Doe"
		expect(result.transformationMap.cleanToOriginal.get(cleanPosOfDoe)).toBe(
			originalPosOfDoe,
		)

		// "500" starts at position 16 in cleaned
		// In original: "Smith  v.  Doe,   500..." - 5 is at position 16 + 2 + 2 = 20
		const cleanPosOf500 = 16
		const originalPosOf500 = 20 // Not 24
		expect(result.transformationMap.cleanToOriginal.get(cleanPosOf500)).toBe(
			originalPosOf500,
		)
	})

	it("should track positions through combined cleaners", () => {
		const input = "<p>Smith v. Doe, 500 F.2d 123</p>" // HTML + spaces
		const expected = "Smith v. Doe, 500 F.2d 123"
		const result = cleanText(input, [stripHtmlTags, normalizeWhitespace])

		expect(result.cleaned).toBe(expected)

		// Find "500 F.2d 123" in cleaned text
		const citationStart = expected.indexOf("500 F.2d 123")
		expect(citationStart).toBe(14) // Position in cleaned text

		// Get original position via transformation map
		const originalStart =
			result.transformationMap.cleanToOriginal.get(citationStart)
		expect(originalStart).toBeDefined()
		expect(originalStart).toBe(17) // After "<p>"

		// For end position, we need to be careful about how we calculate it
		// The cleanToOriginal map tracks character positions, not ranges
		// Get the position right after the last character
		const citationEnd = citationStart + "500 F.2d 123".length
		const originalEnd = result.transformationMap.cleanToOriginal.get(citationEnd)

		expect(originalEnd).toBeDefined()
		// The end position maps to 33 (after "3", before "</p>") which is actually
		// outside the citation range. This is expected - we map the position AFTER the text.
		// But for substring extraction, we should use the last char's position + 1
		const lastCharOriginalPos = result.transformationMap.cleanToOriginal.get(
			citationEnd - 1,
		)
		expect(lastCharOriginalPos).toBe(28) // Position of "3"

		// Verify extraction using position of last character + 1
		const extractedFromOriginal = input.substring(
			originalStart,
			(lastCharOriginalPos ?? originalStart) + 1,
		)
		expect(extractedFromOriginal).toBe("500 F.2d 123")
	})

	it("should handle custom cleaner functions", () => {
		const input = "Smith v. Doe, 500 F.2d 123 [REDACTED]"
		const customCleaner = (text: string) => text.replace(/\[REDACTED\]/g, "")
		const expected = "Smith v. Doe, 500 F.2d 123 "

		const result = cleanText(input, [customCleaner])

		expect(result.cleaned).toBe(expected)

		// Position tracking should work with custom cleaner
		const cleanPosOfCitation = 14
		const originalPosOfCitation = 14
		expect(
			result.transformationMap.cleanToOriginal.get(cleanPosOfCitation),
		).toBe(originalPosOfCitation)
	})

	it("should handle smart quotes transformation", () => {
		const input = "\u201CSmith\u201D v. \u2018Doe\u2019, 500 F.2d 123"
		const expected = '"Smith" v. \'Doe\', 500 F.2d 123'
		const result = cleanText(input, [fixSmartQuotes])

		expect(result.cleaned).toBe(expected)

		// Positions should still track correctly after quote replacement
		const cleanPosOfV = expected.indexOf("v.")
		const originalPosOfV = input.indexOf("v.")
		expect(result.transformationMap.cleanToOriginal.get(cleanPosOfV)).toBe(
			originalPosOfV,
		)
	})

	it("should handle default cleaner pipeline", () => {
		const input = "<p>Smith v. <b>Doe</b>, 500 F.2d 123</p>"
		const result = cleanText(input) // Default cleaners

		// Should remove HTML, normalize whitespace, normalize unicode, fix smart quotes
		expect(result.cleaned).toContain("Smith v. Doe")
		expect(result.cleaned).toContain("500 F.2d 123")
		expect(result.cleaned).not.toContain("<")
		expect(result.cleaned).not.toContain(">")

		// Should have transformation map
		expect(result.transformationMap.cleanToOriginal.size).toBeGreaterThan(0)
		expect(result.transformationMap.originalToClean.size).toBeGreaterThan(0)

		// Should have empty warnings
		expect(result.warnings).toEqual([])
	})

	it("should handle empty string", () => {
		const result = cleanText("")

		expect(result.cleaned).toBe("")
		expect(result.transformationMap.cleanToOriginal.get(0)).toBe(0)
		expect(result.transformationMap.originalToClean.get(0)).toBe(0)
	})

	it("should handle text with only HTML tag removals", () => {
		const input = "<div><span>text</span></div>"
		const result = cleanText(input, [stripHtmlTags])

		expect(result.cleaned).toBe("text")

		// First character 't' is at position 0 in cleaned, position 11 in original (after "<div><span>")
		expect(result.transformationMap.cleanToOriginal.get(0)).toBe(11)
	})
})

describe("normalizeDashes cleaner", () => {
	it("should convert en-dash to hyphen", () => {
		const input = "500 F.3d 100, 105\u2013107"
		const expected = "500 F.3d 100, 105-107"
		const result = normalizeDashes(input)

		expect(result).toBe(expected)
	})

	it("should convert em-dash to triple underscore", () => {
		const input = "500 F.4th \u2014 (2024)"
		const expected = "500 F.4th ___ (2024)"
		const result = normalizeDashes(input)

		expect(result).toBe(expected)
	})

	it("should handle multiple en-dashes", () => {
		const input = "1984\u20131 F.2d 100, 105\u2013107"
		const expected = "1984-1 F.2d 100, 105-107"
		const result = normalizeDashes(input)

		expect(result).toBe(expected)
	})

	it("should handle multiple em-dashes", () => {
		const input = "500 F.4th \u2014 (2024) and 600 F.3d \u2014 (2025)"
		const expected = "500 F.4th ___ (2024) and 600 F.3d ___ (2025)"
		const result = normalizeDashes(input)

		expect(result).toBe(expected)
	})

	it("should handle mixed en-dash and em-dash", () => {
		const input = "1984\u20131 F.2d \u2014, 105\u2013107"
		const expected = "1984-1 F.2d ___, 105-107"
		const result = normalizeDashes(input)

		expect(result).toBe(expected)
	})

	it("should leave regular hyphens and underscores unchanged", () => {
		const input = "500 F.3d ___ or 600 F.2d 100-200"
		const expected = "500 F.3d ___ or 600 F.2d 100-200"
		const result = normalizeDashes(input)

		expect(result).toBe(expected)
	})

	it("should track positions correctly after dash normalization", () => {
		const input = "Smith v. Doe, 500 F.3d 100, 105\u2013107 (2020)"
		const result = cleanText(input, [normalizeDashes])

		// En-dash should be replaced with hyphen
		expect(result.cleaned).toContain("105-107")

		// Position tracking should work
		const cleanPosOfCitation = result.cleaned.indexOf("500 F.3d")
		const originalPosOfCitation = input.indexOf("500 F.3d")
		expect(
			result.transformationMap.cleanToOriginal.get(cleanPosOfCitation),
		).toBe(originalPosOfCitation)
	})
})
