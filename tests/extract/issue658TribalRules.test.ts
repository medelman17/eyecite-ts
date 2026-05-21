import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { StateRuleCitation } from "@/types/citation"

const tribalRules = (text: string): StateRuleCitation[] =>
  extractCitations(text).filter((c): c is StateRuleCitation => c.type === "stateRule")

describe("#658 tribal court rule citations", () => {
  describe("Ho-Chunk Nation Rules of Civil Procedure", () => {
    it("`HCN R. Civ. P. 5(C)(1)`", () => {
      const cs = tribalRules("HCN R. Civ. P. 5(C)(1)")
      expect(cs).toHaveLength(1)
      expect(cs[0].jurisdiction).toBe("HCN")
      expect(cs[0].ruleSet).toBe("civil")
      expect(cs[0].rule).toBe("5")
      expect(cs[0].subsection).toBe("(C)(1)")
    })

    it("`HCN R. Civ. P. 5(A)(2)`", () => {
      const cs = tribalRules("HCN R. Civ. P. 5(A)(2)")
      expect(cs).toHaveLength(1)
      expect(cs[0].rule).toBe("5")
      expect(cs[0].subsection).toBe("(A)(2)")
    })

    it("`HCN R. Civ. P. 27(B)`", () => {
      const cs = tribalRules("HCN R. Civ. P. 27(B)")
      expect(cs).toHaveLength(1)
      expect(cs[0].rule).toBe("27")
      expect(cs[0].subsection).toBe("(B)")
    })

    it("bare rule (no subsection)", () => {
      const cs = tribalRules("HCN R. Civ. P. 12")
      expect(cs).toHaveLength(1)
      expect(cs[0].rule).toBe("12")
    })
  })

  describe("Territorial Court Rules of Civil Procedure", () => {
    it("`T.C.R.C.P. 19(a)`", () => {
      const cs = tribalRules("T.C.R.C.P. 19(a)")
      expect(cs).toHaveLength(1)
      expect(cs[0].jurisdiction).toBe("TC")
      expect(cs[0].ruleSet).toBe("civil")
      expect(cs[0].rule).toBe("19")
      expect(cs[0].subsection).toBe("(a)")
    })
  })

  describe("In running prose", () => {
    it("mid-sentence HCN cite", () => {
      const cs = tribalRules("Under HCN R. Civ. P. 5(C)(1), service is required.")
      expect(cs).toHaveLength(1)
    })
  })

  describe("Regression guards", () => {
    it("`Fed. R. Civ. P. 56` still federalRule (not tribalRule)", () => {
      const fed = extractCitations("Fed. R. Civ. P. 56").filter((c) => c.type === "federalRule")
      const tribal = extractCitations("Fed. R. Civ. P. 56").filter((c) => c.type === "stateRule")
      expect(fed).toHaveLength(1)
      expect(tribal).toHaveLength(0)
    })

    it("`I.R.C.P. 60(b)(6)` still ID (existing state rule)", () => {
      const cs = tribalRules("I.R.C.P. 60(b)(6)")
      expect(cs).toHaveLength(1)
      expect(cs[0].jurisdiction).toBe("ID")
    })
  })

  describe("False-positive guards", () => {
    it("does NOT match bare `HCN` in prose", () => {
      const cs = tribalRules("The HCN governs tribal procedure.")
      expect(cs).toHaveLength(0)
    })

    it("does NOT match `T.C.R.C.P.` without rule number", () => {
      const cs = tribalRules("Under the T.C.R.C.P., service is required.")
      expect(cs).toHaveLength(0)
    })
  })
})
