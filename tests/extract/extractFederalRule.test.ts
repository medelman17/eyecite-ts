/**
 * Tests for Federal Rules of Procedure extraction (#576).
 *
 * Covers `Fed. R. Civ. P. NN`, `Fed. R. Crim. P. NN`, `Fed. R. Evid. NNN`,
 * `Fed. R. App. P. N`, `Fed. R. Bankr. P.`, and spelled-out equivalents.
 */
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import { extractFederalRule } from "@/extract/extractFederalRule"
import type { Token } from "@/tokenize"
import { createIdentityMap } from "../helpers/transformationMap"

describe("extractFederalRule (#576)", () => {
  describe("abbreviated forms", () => {
    it("parses Fed. R. Civ. P. 56", () => {
      const token: Token = {
        text: "Fed. R. Civ. P. 56",
        span: { cleanStart: 0, cleanEnd: 18 },
        type: "federalRule",
        patternId: "fed-rule",
      }
      const cite = extractFederalRule(token, createIdentityMap())
      expect(cite.type).toBe("federalRule")
      expect(cite.ruleSet).toBe("civil")
      expect(cite.rule).toBe("56")
      expect(cite.subsection).toBeUndefined()
      expect(cite.confidence).toBe(0.95)
    })

    it("parses Fed. R. Crim. P. 12", () => {
      const cites = extractCitations("See Fed. R. Crim. P. 12 for the requirements.").filter(
        (c) => c.type === "federalRule",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "federalRule") {
        expect(cites[0].ruleSet).toBe("criminal")
        expect(cites[0].rule).toBe("12")
      }
    })

    it("parses Fed. R. Evid. 401", () => {
      const cites = extractCitations("Fed. R. Evid. 401").filter((c) => c.type === "federalRule")
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "federalRule") {
        expect(cites[0].ruleSet).toBe("evidence")
        expect(cites[0].rule).toBe("401")
      }
    })

    it("parses Fed. R. App. P. 4", () => {
      const cites = extractCitations("Fed. R. App. P. 4(b)").filter((c) => c.type === "federalRule")
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "federalRule") {
        expect(cites[0].ruleSet).toBe("appellate")
        expect(cites[0].rule).toBe("4")
        expect(cites[0].subsection).toBe("(b)")
      }
    })

    it("parses Fed. R. Bankr. P. 7001", () => {
      const cites = extractCitations("Fed. R. Bankr. P. 7001").filter(
        (c) => c.type === "federalRule",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "federalRule") {
        expect(cites[0].ruleSet).toBe("bankruptcy")
        expect(cites[0].rule).toBe("7001")
      }
    })

    it("captures multi-letter subsection chain Fed. R. Civ. P. 12(b)(6)", () => {
      const cites = extractCitations("dismissed under Fed. R. Civ. P. 12(b)(6).").filter(
        (c) => c.type === "federalRule",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "federalRule") {
        expect(cites[0].rule).toBe("12")
        expect(cites[0].subsection).toBe("(b)(6)")
      }
    })

    it("handles compact form FedRCivP without spaces (defensive)", () => {
      // The compact form is less common but appears in some OCR'd opinions.
      // We only need to handle the dominant spaced form; this guard test
      // documents that the compact form is intentionally NOT matched.
      const cites = extractCitations("FedRCivP 56").filter((c) => c.type === "federalRule")
      expect(cites).toHaveLength(0)
    })
  })

  describe("spelled-out forms", () => {
    it("parses Federal Rule of Civil Procedure 56", () => {
      const cites = extractCitations("Federal Rule of Civil Procedure 56").filter(
        (c) => c.type === "federalRule",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "federalRule") {
        expect(cites[0].ruleSet).toBe("civil")
        expect(cites[0].rule).toBe("56")
      }
    })

    it("parses Federal Rule of Criminal Procedure 12", () => {
      const cites = extractCitations("Federal Rule of Criminal Procedure 12(b)").filter(
        (c) => c.type === "federalRule",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "federalRule") {
        expect(cites[0].ruleSet).toBe("criminal")
        expect(cites[0].rule).toBe("12")
        expect(cites[0].subsection).toBe("(b)")
      }
    })

    it("parses Federal Rule of Evidence 401", () => {
      const cites = extractCitations("Federal Rule of Evidence 401").filter(
        (c) => c.type === "federalRule",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "federalRule") {
        expect(cites[0].ruleSet).toBe("evidence")
        expect(cites[0].rule).toBe("401")
      }
    })

    it("parses Federal Rule of Appellate Procedure 4", () => {
      const cites = extractCitations("Federal Rule of Appellate Procedure 4").filter(
        (c) => c.type === "federalRule",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "federalRule") {
        expect(cites[0].ruleSet).toBe("appellate")
        expect(cites[0].rule).toBe("4")
      }
    })
  })

  describe("not extracted as case (regression for #582)", () => {
    it("does NOT classify Fed.R.Civ.P. rule citation as case", () => {
      const cites = extractCitations("dismissed under Fed. R. Civ. P. 12(b)(6).")
      const caseCites = cites.filter((c) => c.type === "case")
      expect(caseCites).toHaveLength(0)
    })

    it("year-prefixed `1983 Fed.R.Civ.P. 17(b)` is not surfaced as case (#582)", () => {
      // Whether or not we successfully classify this as a federal rule, the
      // key invariant for #582 is that we do NOT emit a phantom case
      // citation with reporter="Fed.R.Civ.P." and volume=1983.
      const cites = extractCitations("See 1983 Fed.R.Civ.P. 17(b).")
      const fpCases = cites.filter(
        (c) =>
          c.type === "case" &&
          typeof c.volume === "number" &&
          c.volume === 1983 &&
          c.reporter?.toLowerCase().includes("fed"),
      )
      expect(fpCases).toHaveLength(0)
    })
  })

  describe("position tracking", () => {
    it("preserves span positions", () => {
      const cites = extractCitations("Citing Fed. R. Civ. P. 56 in support.")
      const ruleCite = cites.find((c) => c.type === "federalRule")
      expect(ruleCite).toBeDefined()
      if (ruleCite) {
        expect(ruleCite.span.originalStart).toBe(7)
        expect(ruleCite.span.originalEnd).toBe(25)
      }
    })
  })
})
