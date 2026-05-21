import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { StateRuleCitation } from "@/types/citation"

const stateRules = (text: string): StateRuleCitation[] =>
  extractCitations(text).filter((c): c is StateRuleCitation => c.type === "stateRule")

describe("#636 state court rules", () => {
  describe("Idaho — I.R.C.P. / Idaho Rule of Civil Procedure", () => {
    it("I.R.C.P. 60(b)(6)", () => {
      const cs = stateRules("I.R.C.P. 60(b)(6)")
      expect(cs).toHaveLength(1)
      expect(cs[0].jurisdiction).toBe("ID")
      expect(cs[0].ruleSet).toBe("civil")
      expect(cs[0].rule).toBe("60")
      expect(cs[0].subsection).toBe("(b)(6)")
    })

    it("Idaho Rule of Civil Procedure 60(b)", () => {
      const cs = stateRules("Idaho Rule of Civil Procedure 60(b)")
      expect(cs).toHaveLength(1)
      expect(cs[0].jurisdiction).toBe("ID")
      expect(cs[0].rule).toBe("60")
      expect(cs[0].subsection).toBe("(b)")
    })
  })

  describe("North Carolina — N.C. R. App. P.", () => {
    it("N.C. R. App. P. 10(b)(1)", () => {
      const cs = stateRules("N.C. R. App. P. 10(b)(1)")
      expect(cs).toHaveLength(1)
      expect(cs[0].jurisdiction).toBe("NC")
      expect(cs[0].ruleSet).toBe("appellate")
      expect(cs[0].rule).toBe("10")
    })

    it("N.C.R.App. P. 37 (no spaces)", () => {
      const cs = stateRules("N.C.R.App. P. 37")
      expect(cs).toHaveLength(1)
      expect(cs[0].jurisdiction).toBe("NC")
      expect(cs[0].rule).toBe("37")
    })

    it("N.C. R. Civ. P. 12(b)", () => {
      const cs = stateRules("N.C. R. Civ. P. 12(b)")
      expect(cs).toHaveLength(1)
      expect(cs[0].jurisdiction).toBe("NC")
      expect(cs[0].ruleSet).toBe("civil")
    })
  })

  describe("South Carolina — SCACR (postfix style)", () => {
    it("Rule 268(d)(2), SCACR", () => {
      const cs = stateRules("Rule 268(d)(2), SCACR")
      expect(cs).toHaveLength(1)
      expect(cs[0].jurisdiction).toBe("SC")
      expect(cs[0].ruleSet).toBe("appellate")
      expect(cs[0].rule).toBe("268")
      expect(cs[0].subsection).toBe("(d)(2)")
    })

    it("Rule 220, SCACR (no subsection)", () => {
      const cs = stateRules("Rule 220, SCACR")
      expect(cs).toHaveLength(1)
      expect(cs[0].jurisdiction).toBe("SC")
      expect(cs[0].rule).toBe("220")
    })
  })

  describe("Court of Federal Claims — RCFC", () => {
    it("RCFC 56(c)", () => {
      const cs = stateRules("RCFC 56(c)")
      expect(cs).toHaveLength(1)
      expect(cs[0].jurisdiction).toBe("CFC")
      expect(cs[0].rule).toBe("56")
      expect(cs[0].subsection).toBe("(c)")
    })
  })

  describe("In running prose", () => {
    it("extracts mid-sentence", () => {
      const cs = stateRules("Under I.R.C.P. 60(b)(6), relief is available.")
      expect(cs).toHaveLength(1)
    })
  })

  describe("Federal-rule regression guards", () => {
    it("Fed. R. Civ. P. 56 still emits type=federalRule", () => {
      const cs = extractCitations("Fed. R. Civ. P. 56").filter((c) => c.type === "federalRule")
      expect(cs).toHaveLength(1)
    })

    it("Federal Rule of Civil Procedure 56 still federalRule", () => {
      const cs = extractCitations("Federal Rule of Civil Procedure 56").filter(
        (c) => c.type === "federalRule",
      )
      expect(cs).toHaveLength(1)
    })
  })

  describe("False-positive guards", () => {
    it("does NOT match bare 'Rule 60' without state anchor", () => {
      const cs = stateRules("The court applied Rule 60 to the motion.")
      expect(cs).toHaveLength(0)
    })

    it("does NOT match SCACR mention without `Rule N` shape", () => {
      const cs = stateRules("The SCACR governs appellate practice.")
      expect(cs).toHaveLength(0)
    })
  })
})
