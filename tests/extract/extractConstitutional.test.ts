import { describe, it, expect } from "vitest"
import { extractConstitutional } from "@/extract/extractConstitutional"
import type { Token } from "@/tokenize"
import type { TransformationMap } from "@/types/span"

describe("extractConstitutional", () => {
	const createIdentityMap = (): TransformationMap => {
		const cleanToOriginal = new Map<number, number>()
		const originalToClean = new Map<number, number>()
		for (let i = 0; i < 1000; i++) {
			cleanToOriginal.set(i, i)
			originalToClean.set(i, i)
		}
		return { cleanToOriginal, originalToClean }
	}

	const createOffsetMap = (offset: number): TransformationMap => {
		const cleanToOriginal = new Map<number, number>()
		const originalToClean = new Map<number, number>()
		for (let i = 0; i < 1000; i++) {
			cleanToOriginal.set(i, i + offset)
			originalToClean.set(i + offset, i)
		}
		return { cleanToOriginal, originalToClean }
	}

	describe("US Constitution — articles", () => {
		it("extracts article with section", () => {
			const token: Token = {
				text: "U.S. Const. art. III, § 2",
				span: { cleanStart: 6, cleanEnd: 31 },
				type: "constitutional",
				patternId: "us-constitution",
			}
			const citation = extractConstitutional(token, createIdentityMap())

			expect(citation.type).toBe("constitutional")
			expect(citation.jurisdiction).toBe("US")
			expect(citation.article).toBe(3)
			expect(citation.amendment).toBeUndefined()
			expect(citation.section).toBe("2")
			expect(citation.clause).toBeUndefined()
			expect(citation.confidence).toBe(0.95)
		})

		it("extracts article with section and clause", () => {
			const token: Token = {
				text: "U.S. Const. art. I, § 8, cl. 3",
				span: { cleanStart: 0, cleanEnd: 31 },
				type: "constitutional",
				patternId: "us-constitution",
			}
			const citation = extractConstitutional(token, createIdentityMap())

			expect(citation.article).toBe(1)
			expect(citation.section).toBe("8")
			expect(citation.clause).toBe(3)
		})

		it("extracts article without section", () => {
			const token: Token = {
				text: "U.S. Const. art. III",
				span: { cleanStart: 0, cleanEnd: 20 },
				type: "constitutional",
				patternId: "us-constitution",
			}
			const citation = extractConstitutional(token, createIdentityMap())

			expect(citation.article).toBe(3)
			expect(citation.section).toBeUndefined()
			expect(citation.confidence).toBe(0.9)
		})
	})

	describe("US Constitution — amendments", () => {
		it("extracts amendment with section", () => {
			const token: Token = {
				text: "U.S. Const. amend. XIV, § 1",
				span: { cleanStart: 0, cleanEnd: 27 },
				type: "constitutional",
				patternId: "us-constitution",
			}
			const citation = extractConstitutional(token, createIdentityMap())

			expect(citation.amendment).toBe(14)
			expect(citation.article).toBeUndefined()
			expect(citation.section).toBe("1")
			expect(citation.jurisdiction).toBe("US")
		})

		it("extracts amendment without section", () => {
			const token: Token = {
				text: "U.S. Const. amend. I",
				span: { cleanStart: 0, cleanEnd: 20 },
				type: "constitutional",
				patternId: "us-constitution",
			}
			const citation = extractConstitutional(token, createIdentityMap())

			expect(citation.amendment).toBe(1)
			expect(citation.section).toBeUndefined()
			expect(citation.confidence).toBe(0.9)
		})

		it("extracts amendment XXVII (highest)", () => {
			const token: Token = {
				text: "U.S. Const. amend. XXVII",
				span: { cleanStart: 0, cleanEnd: 24 },
				type: "constitutional",
				patternId: "us-constitution",
			}
			const citation = extractConstitutional(token, createIdentityMap())

			expect(citation.amendment).toBe(27)
		})
	})

	describe("US Constitution — abbreviation variants", () => {
		it("handles unabbreviated 'article'", () => {
			const token: Token = {
				text: "U.S. Const. article III, § 2",
				span: { cleanStart: 0, cleanEnd: 28 },
				type: "constitutional",
				patternId: "us-constitution",
			}
			const citation = extractConstitutional(token, createIdentityMap())

			expect(citation.article).toBe(3)
			expect(citation.section).toBe("2")
		})

		it("handles unabbreviated 'amendment'", () => {
			const token: Token = {
				text: "U.S. Const. amendment XIV, § 1",
				span: { cleanStart: 0, cleanEnd: 30 },
				type: "constitutional",
				patternId: "us-constitution",
			}
			const citation = extractConstitutional(token, createIdentityMap())

			expect(citation.amendment).toBe(14)
		})

		it("handles Arabic numeral for article", () => {
			const token: Token = {
				text: "U.S. Const. art. 3, § 2",
				span: { cleanStart: 0, cleanEnd: 23 },
				type: "constitutional",
				patternId: "us-constitution",
			}
			const citation = extractConstitutional(token, createIdentityMap())

			expect(citation.article).toBe(3)
		})
	})

	describe("state constitutions", () => {
		it("extracts California constitution", () => {
			const token: Token = {
				text: "Cal. Const. art. I, § 7",
				span: { cleanStart: 0, cleanEnd: 23 },
				type: "constitutional",
				patternId: "state-constitution",
			}
			const citation = extractConstitutional(token, createIdentityMap())

			expect(citation.jurisdiction).toBe("CA")
			expect(citation.article).toBe(1)
			expect(citation.section).toBe("7")
			expect(citation.confidence).toBe(0.9)
		})

		it("extracts New York constitution", () => {
			const token: Token = {
				text: "N.Y. Const. art. VI, § 20",
				span: { cleanStart: 0, cleanEnd: 25 },
				type: "constitutional",
				patternId: "state-constitution",
			}
			const citation = extractConstitutional(token, createIdentityMap())

			expect(citation.jurisdiction).toBe("NY")
			expect(citation.article).toBe(6)
			expect(citation.section).toBe("20")
		})

		it("extracts Texas constitution with non-numeric section", () => {
			const token: Token = {
				text: "Tex. Const. art. V, § 3-a",
				span: { cleanStart: 0, cleanEnd: 25 },
				type: "constitutional",
				patternId: "state-constitution",
			}
			const citation = extractConstitutional(token, createIdentityMap())

			expect(citation.jurisdiction).toBe("TX")
			expect(citation.section).toBe("3-a")
		})

		it("extracts Florida constitution", () => {
			const token: Token = {
				text: "Fla. Const. art. I, § 2",
				span: { cleanStart: 0, cleanEnd: 23 },
				type: "constitutional",
				patternId: "state-constitution",
			}
			const citation = extractConstitutional(token, createIdentityMap())

			expect(citation.jurisdiction).toBe("FL")
		})

		it("extracts West Virginia constitution", () => {
			const token: Token = {
				text: "W.Va. Const. art. I, § 1",
				span: { cleanStart: 0, cleanEnd: 24 },
				type: "constitutional",
				patternId: "state-constitution",
			}
			const citation = extractConstitutional(token, createIdentityMap())

			expect(citation.jurisdiction).toBe("WV")
			expect(citation.article).toBe(1)
			expect(citation.section).toBe("1")
		})
	})

	describe("bare constitution", () => {
		it("extracts bare Const. with lower confidence", () => {
			const token: Token = {
				text: "Const. art. I, § 8, cl. 3",
				span: { cleanStart: 0, cleanEnd: 25 },
				type: "constitutional",
				patternId: "bare-constitution",
			}
			const citation = extractConstitutional(token, createIdentityMap())

			expect(citation.jurisdiction).toBeUndefined()
			expect(citation.article).toBe(1)
			expect(citation.section).toBe("8")
			expect(citation.clause).toBe(3)
			expect(citation.confidence).toBe(0.7)
		})
	})

	describe("position translation", () => {
		it("translates clean positions to original with offset", () => {
			const token: Token = {
				text: "U.S. Const. amend. XIV, § 1",
				span: { cleanStart: 10, cleanEnd: 37 },
				type: "constitutional",
				patternId: "us-constitution",
			}
			const offset = 5
			const citation = extractConstitutional(token, createOffsetMap(offset))

			expect(citation.span.cleanStart).toBe(10)
			expect(citation.span.cleanEnd).toBe(37)
			expect(citation.span.originalStart).toBe(15)
			expect(citation.span.originalEnd).toBe(42)
		})
	})
})
