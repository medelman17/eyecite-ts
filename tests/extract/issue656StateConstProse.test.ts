import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { ConstitutionalCitation } from "@/types/citation"

const constCites = (text: string): ConstitutionalCitation[] =>
  extractCitations(text).filter((c): c is ConstitutionalCitation => c.type === "constitutional")

describe("#656 state constitutional prose-form citations", () => {
  describe("`art. <N> of the <State> Declaration of Rights`", () => {
    it("`art. 14 of the Massachusetts Declaration of Rights`", () => {
      const cs = constCites("art. 14 of the Massachusetts Declaration of Rights")
      expect(cs).toHaveLength(1)
      expect(cs[0].article).toBe(14)
      expect(cs[0].jurisdiction).toBe("MA")
    })

    it("`art. 12 of the Massachusetts Declaration of Rights`", () => {
      const cs = constCites("art. 12 of the Massachusetts Declaration of Rights")
      expect(cs).toHaveLength(1)
      expect(cs[0].article).toBe(12)
      expect(cs[0].jurisdiction).toBe("MA")
    })
  })

  describe("`Section <N>, Article <N> of the <State> Constitution`", () => {
    it("`Section 5(B), Article IV of the Ohio Constitution`", () => {
      const cs = constCites("Section 5(B), Article IV of the Ohio Constitution")
      expect(cs).toHaveLength(1)
      expect(cs[0].article).toBe(4)
      expect(cs[0].section).toBe("5(B)")
      expect(cs[0].jurisdiction).toBe("OH")
    })

    it("`Section 2, Article I of the Pennsylvania Constitution`", () => {
      const cs = constCites("Section 2, Article I of the Pennsylvania Constitution")
      expect(cs).toHaveLength(1)
      expect(cs[0].article).toBe(1)
      expect(cs[0].section).toBe("2")
      expect(cs[0].jurisdiction).toBe("PA")
    })

    it("`Section 10, Article 1 of the New Jersey Constitution`", () => {
      const cs = constCites("Section 10, Article 1 of the New Jersey Constitution")
      expect(cs).toHaveLength(1)
      expect(cs[0].article).toBe(1)
      expect(cs[0].jurisdiction).toBe("NJ")
    })
  })

  describe("In running prose", () => {
    it("mid-sentence with comma context", () => {
      const cs = constCites(
        "The court relied on art. 14 of the Massachusetts Declaration of Rights to suppress the evidence.",
      )
      expect(cs).toHaveLength(1)
      expect(cs[0].article).toBe(14)
    })
  })

  describe("Regression guards", () => {
    it("`U.S. Const. amend. V` still works", () => {
      const cs = constCites("U.S. Const. amend. V")
      expect(cs).toHaveLength(1)
      expect(cs[0].amendment).toBe(5)
      expect(cs[0].jurisdiction).toBe("US")
    })

    it("`Cal. Const. art. I, § 7` still works", () => {
      const cs = constCites("Cal. Const. art. I, § 7")
      expect(cs).toHaveLength(1)
      expect(cs[0].article).toBe(1)
      expect(cs[0].section).toBe("7")
      expect(cs[0].jurisdiction).toBe("CA")
    })
  })

  describe("False-positive guards", () => {
    it("does NOT match `art. 14 of the document`", () => {
      const cs = constCites("art. 14 of the document was filed late")
      expect(cs).toHaveLength(0)
    })

    it("does NOT match `Section 5 of the contract`", () => {
      const cs = constCites("Section 5 of the contract requires arbitration")
      expect(cs).toHaveLength(0)
    })
  })
})
