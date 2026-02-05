import { describe, it, expect } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import { extractStatutesAtLarge } from "@/extract/extractStatutesAtLarge"
import type { Token } from "@/tokenize"
import type { TransformationMap } from "@/types/span"

describe("extractStatutesAtLarge", () => {
	const createIdentityMap = (): TransformationMap => {
		const cleanToOriginal = new Map<number, number>()
		const originalToClean = new Map<number, number>()
		for (let i = 0; i < 1000; i++) {
			cleanToOriginal.set(i, i)
			originalToClean.set(i, i)
		}
		return { cleanToOriginal, originalToClean }
	}

	it("should extract volume and page from basic Stat. citation", () => {
		const token: Token = {
			text: "124 Stat. 119",
			span: { cleanStart: 0, cleanEnd: 13 },
			type: "statutesAtLarge",
			patternId: "statutes-at-large",
		}
		const result = extractStatutesAtLarge(token, createIdentityMap())

		expect(result.type).toBe("statutesAtLarge")
		expect(result.volume).toBe(124)
		expect(result.page).toBe(119)
		expect(result.year).toBeUndefined()
		expect(result.confidence).toBe(0.9)
	})

	it("should extract year from parenthetical", () => {
		const token: Token = {
			text: "124 Stat. 119 (2010)",
			span: { cleanStart: 0, cleanEnd: 20 },
			type: "statutesAtLarge",
			patternId: "statutes-at-large",
		}
		const result = extractStatutesAtLarge(token, createIdentityMap())

		expect(result.volume).toBe(124)
		expect(result.page).toBe(119)
		expect(result.year).toBe(2010)
	})

	it("should handle various Statutes at Large volumes", () => {
		const cases = [
			{ text: "79 Stat. 911", volume: 79, page: 911 },
			{ text: "110 Stat. 1321", volume: 110, page: 1321 },
			{ text: "1 Stat. 73", volume: 1, page: 73 },
		]

		for (const { text, volume, page } of cases) {
			const token: Token = {
				text,
				span: { cleanStart: 0, cleanEnd: text.length },
				type: "statutesAtLarge",
				patternId: "statutes-at-large",
			}
			const result = extractStatutesAtLarge(token, createIdentityMap())
			expect(result.volume).toBe(volume)
			expect(result.page).toBe(page)
		}
	})
})

describe("Statutes at Large via extractCitations (integration)", () => {
	it("should classify Stat. as statutesAtLarge, not case", () => {
		const citations = extractCitations("124 Stat. 119")
		expect(citations).toHaveLength(1)
		expect(citations[0].type).toBe("statutesAtLarge")
	})

	it("should extract alongside Pub. L. citation", () => {
		const text = "Pub. L. No. 111-148, 124 Stat. 119 (2010)."
		const citations = extractCitations(text)

		const pubLaw = citations.find((c) => c.type === "publicLaw")
		const stat = citations.find((c) => c.type === "statutesAtLarge")

		expect(pubLaw).toBeDefined()
		expect(stat).toBeDefined()
		if (stat?.type === "statutesAtLarge") {
			expect(stat.volume).toBe(124)
			expect(stat.page).toBe(119)
		}
	})

	it("should not produce a case citation for Stat. reporter", () => {
		const text = "79 Stat. 911"
		const citations = extractCitations(text)

		const caseCitations = citations.filter((c) => c.type === "case")
		expect(caseCitations).toHaveLength(0)

		const statCitations = citations.filter((c) => c.type === "statutesAtLarge")
		expect(statCitations).toHaveLength(1)
	})

	it("should handle multiple Statutes at Large references", () => {
		const text = "See 124 Stat. 119 and 110 Stat. 1321."
		const citations = extractCitations(text)

		const statCitations = citations.filter((c) => c.type === "statutesAtLarge")
		expect(statCitations).toHaveLength(2)
	})
})
