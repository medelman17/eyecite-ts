import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { FederalRuleCitation } from "@/types/citation"

const rules = (text: string): FederalRuleCitation[] =>
  extractCitations(text).filter((c) => c.type === "federalRule") as FederalRuleCitation[]

describe("federal rule acronym forms recognized (#696)", () => {
  it.each([
    ["FRCP 12(b)(6)", "FRCP 12(b)(6)", "civil"],
    ["FRE 401", "FRE 401", "evidence"],
    ["FRAP 4(a)", "FRAP 4(a)", "appellate"],
    ["FRCrP 11", "FRCrP 11", "criminal"],
    ["FRBP 7001", "FRBP 7001", "bankruptcy"],
    ["F.R.C.P. 12", "F.R.C.P. 12", "civil"],
    ["F.R.E. 401", "F.R.E. 401", "evidence"],
    ["F.R.A.P. 4(a)", "F.R.A.P. 4(a)", "appellate"],
  ])("`%s` extracts ruleSet=%s", (_, input, expectedRuleSet) => {
    const [c] = rules(input)
    expect(c).toBeDefined()
    expect(c.ruleSet).toBe(expectedRuleSet)
  })

  it("regression: canonical `Fed. R. Civ. P. 12` still works", () => {
    const [c] = rules("Fed. R. Civ. P. 12(b)(6)")
    expect(c.ruleSet).toBe("civil")
  })

  it("regression: spelled-out `Federal Rule of Civil Procedure 12` still works", () => {
    const [c] = rules("Federal Rule of Civil Procedure 12(b)(6)")
    expect(c.ruleSet).toBe("civil")
  })
})
