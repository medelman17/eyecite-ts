import { describe, expect, it } from "vitest"
import { extractNamedCode } from "@/extract/statutes/extractNamedCode"
import type { Token } from "@/tokenize"
import { createIdentityMap } from "../../helpers/transformationMap"

describe("extractNamedCode", () => {
  const map = createIdentityMap()
  const makeToken = (text: string, patternId = "named-code"): Token => ({
    text,
    span: { cleanStart: 0, cleanEnd: text.length },
    type: "statute",
    patternId,
  })

  describe("New York", () => {
    it("should extract N.Y. Penal Law § 125.25", () => {
      const c = extractNamedCode(makeToken("N.Y. Penal Law § 125.25"), map)
      expect(c.jurisdiction).toBe("NY")
      expect(c.section).toBe("125.25")
      expect(c.confidence).toBeGreaterThanOrEqual(0.95)
    })
    it("should extract N.Y. C.P.L.R. § 211", () => {
      const c = extractNamedCode(makeToken("N.Y. C.P.L.R. § 211"), map)
      expect(c.jurisdiction).toBe("NY")
      expect(c.section).toBe("211")
    })
    it("should extract subsections", () => {
      const c = extractNamedCode(makeToken("N.Y. Penal Law § 125.25(1)(a)"), map)
      expect(c.section).toBe("125.25")
      expect(c.subsection).toBe("(1)(a)")
    })
  })

  describe("California", () => {
    it("should extract Cal. Penal Code § 187", () => {
      const c = extractNamedCode(makeToken("Cal. Penal Code § 187"), map)
      expect(c.jurisdiction).toBe("CA")
      expect(c.section).toBe("187")
    })
    it("should extract Cal. Civ. Proc. Code § 425.16", () => {
      const c = extractNamedCode(makeToken("Cal. Civ. Proc. Code § 425.16"), map)
      expect(c.jurisdiction).toBe("CA")
      expect(c.section).toBe("425.16")
    })
  })

  describe("Texas", () => {
    it("should extract Tex. Penal Code § 19.02", () => {
      const c = extractNamedCode(makeToken("Tex. Penal Code § 19.02"), map)
      expect(c.jurisdiction).toBe("TX")
      expect(c.section).toBe("19.02")
    })
    it("should extract Tex. Fam. Code § 1.01", () => {
      const c = extractNamedCode(makeToken("Tex. Fam. Code § 1.01"), map)
      expect(c.jurisdiction).toBe("TX")
      expect(c.section).toBe("1.01")
    })
  })

  describe("Maryland", () => {
    it("should extract Md. Code Ann., Crim. Law § 3-202", () => {
      const c = extractNamedCode(makeToken("Md. Code Ann., Crim. Law § 3-202"), map)
      expect(c.jurisdiction).toBe("MD")
      expect(c.section).toBe("3-202")
    })
    it("should extract Md. Code, Ins. § 27-101", () => {
      const c = extractNamedCode(makeToken("Md. Code, Ins. § 27-101"), map)
      expect(c.jurisdiction).toBe("MD")
      expect(c.section).toBe("27-101")
    })
  })

  describe("Virginia", () => {
    it("should extract Va. Code § 8.01-243", () => {
      const c = extractNamedCode(makeToken("Va. Code § 8.01-243"), map)
      expect(c.jurisdiction).toBe("VA")
      expect(c.section).toBe("8.01-243")
    })
    it("should extract Va. Code Ann. § 54.1-2400", () => {
      const c = extractNamedCode(makeToken("Va. Code Ann. § 54.1-2400"), map)
      expect(c.jurisdiction).toBe("VA")
      expect(c.section).toBe("54.1-2400")
    })
  })

  describe("Alabama", () => {
    it("should extract Ala. Code § 13A-6-61", () => {
      const c = extractNamedCode(makeToken("Ala. Code § 13A-6-61"), map)
      expect(c.jurisdiction).toBe("AL")
      expect(c.section).toBe("13A-6-61")
    })
  })

  describe("Massachusetts", () => {
    it("should extract Mass. Gen. Laws ch. 93A, § 2", () => {
      const c = extractNamedCode(makeToken("Mass. Gen. Laws ch. 93A, § 2", "mass-chapter"), map)
      expect(c.jurisdiction).toBe("MA")
      expect(c.code).toBe("93A")
      expect(c.section).toBe("2")
    })
    it("should extract M.G.L.A. c. 93, § 14", () => {
      const c = extractNamedCode(makeToken("M.G.L.A. c. 93, § 14", "mass-chapter"), map)
      expect(c.jurisdiction).toBe("MA")
      expect(c.code).toBe("93")
      expect(c.section).toBe("14")
    })
  })

  describe("et seq.", () => {
    it("should detect et seq.", () => {
      const c = extractNamedCode(makeToken("Cal. Penal Code § 187 et seq."), map)
      expect(c.hasEtSeq).toBe(true)
      expect(c.section).toBe("187")
    })
  })

  describe("fallback", () => {
    it("should handle unrecognized jurisdiction prefix", () => {
      const c = extractNamedCode(makeToken("Xyz. Code § 123"), map)
      expect(c.confidence).toBeLessThanOrEqual(0.6)
    })

    it("should handle malformed named-code token", () => {
      const c = extractNamedCode(makeToken("just text"), map)
      expect(c.type).toBe("statute")
      expect(c.section).toBe("")
    })

    it("should handle malformed mass-chapter token with low confidence", () => {
      const c = extractNamedCode(makeToken("malformed mass text", "mass-chapter"), map)
      expect(c.type).toBe("statute")
      expect(c.section).toBe("")
      expect(c.jurisdiction).toBeUndefined()
      expect(c.confidence).toBeLessThanOrEqual(0.5)
    })
  })
})
