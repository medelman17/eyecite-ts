/**
 * Integration tests for false positive citation filtering.
 * Tests the full pipeline with real false positive inputs.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"

describe("false positive filtering (integration)", () => {
  describe("default mode (penalize + warn)", () => {
    it("penalizes I.C.J. citation", () => {
      const text = "1986 I.C.J. 14 (June 27)"
      const citations = extractCitations(text)
      expect(citations.length).toBeGreaterThanOrEqual(1)

      const flagged = citations.find((c) => c.confidence <= 0.1)
      expect(flagged).toBeDefined()
      expect(flagged?.warnings).toBeDefined()
      expect(flagged?.warnings?.some((w) => w.message.includes("non-US"))).toBe(true)
    })

    it("penalizes historical citation with old year", () => {
      const text = "3 Edw. 1, ch. 29 (1297)"
      const citations = extractCitations(text)
      const flagged = citations.find((c) => c.confidence <= 0.1)
      expect(flagged).toBeDefined()
    })

    it("does not penalize valid US citations", () => {
      const text = "Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)"
      const citations = extractCitations(text)
      const caseCite = citations.find((c) => c.type === "case")
      expect(caseCite).toBeDefined()
      expect(caseCite?.confidence).toBeGreaterThan(0.1)
    })
  })

  describe("remove mode (filterFalsePositives: true)", () => {
    it("removes I.C.J. citation entirely", () => {
      const text = "1986 I.C.J. 14 (June 27)"
      const citations = extractCitations(text, { filterFalsePositives: true })
      expect(citations).toHaveLength(0)
    })

    it("removes U.N.T.S. citation entirely", () => {
      const text = "1155 U.N.T.S. 331"
      const citations = extractCitations(text, { filterFalsePositives: true })
      expect(citations).toHaveLength(0)
    })

    it("removes historical citation entirely", () => {
      const text = "8 Co. Rep. 114 (C.P. 1610)"
      const citations = extractCitations(text, { filterFalsePositives: true })
      expect(citations).toHaveLength(0)
    })

    it("rejects 'Court' as a reporter in prose text", () => {
      const text =
        "The District 2 Court dismissed the complaint for failure to state a claim under Rule 12(b)(6) of the Federal Rules of Civil Procedure."
      const citations = extractCitations(text)
      const caseCites = citations.filter((c) => c.type === "case")
      expect(caseCites).toHaveLength(0)
    })

    it("rejects other common English words as reporters", () => {
      const texts = [
        "The 3 Section review panel agreed.",
        "Under Rule 12 the motion was denied.",
        "Chapter 7 proceedings commenced.",
      ]
      for (const text of texts) {
        const citations = extractCitations(text)
        const caseCites = citations.filter((c) => c.type === "case")
        expect(caseCites).toHaveLength(0)
      }
    })

    // Realistic prose from court opinions with numbers near blocked words
    it("rejects 'this Court' preceded by a number", () => {
      const text = "As the 5 Court of Appeals judges previously noted, the ruling was improper."
      const caseCites = extractCitations(text).filter((c) => c.type === "case")
      expect(caseCites).toHaveLength(0)
    })

    it("rejects footnote number before 'Court'", () => {
      const text = "The Bankruptcy 2 Court entered the discharge order on March 15."
      const caseCites = extractCitations(text).filter((c) => c.type === "case")
      expect(caseCites).toHaveLength(0)
    })

    it("rejects 'Title' in statutory reference", () => {
      const text = "Under Title 42 of the United States Code, Section 1983 provides a cause of action."
      const caseCites = extractCitations(text).filter((c) => c.type === "case")
      expect(caseCites).toHaveLength(0)
    })

    it("rejects 'Article' in constitutional reference", () => {
      const text = "Article 3 of the Constitution establishes the judicial branch."
      const caseCites = extractCitations(text).filter((c) => c.type === "case")
      expect(caseCites).toHaveLength(0)
    })

    it("rejects 'Part' in regulatory reference", () => {
      const text = "Part 50 of Title 10 of the Code of Federal Regulations governs nuclear safety."
      const caseCites = extractCitations(text).filter((c) => c.type === "case")
      expect(caseCites).toHaveLength(0)
    })

    it("rejects 'Count' in indictment references", () => {
      const text = "The defendant was convicted on Count 1 of the indictment charging wire fraud under 18 U.S.C."
      const caseCites = extractCitations(text).filter((c) => c.type === "case")
      expect(caseCites).toHaveLength(0)
    })

    it("rejects 'Division' in court structure", () => {
      const text = "Division 3 of the appellate court affirmed the judgment."
      const caseCites = extractCitations(text).filter((c) => c.type === "case")
      expect(caseCites).toHaveLength(0)
    })

    it("rejects 'Class' in classification references", () => {
      const text = "A Class 2 felony carries a maximum sentence of 28 years."
      const caseCites = extractCitations(text).filter((c) => c.type === "case")
      expect(caseCites).toHaveLength(0)
    })

    it("rejects 'Phase' in litigation references", () => {
      const text = "Phase 2 of the litigation addressed damages totaling over 100 million dollars."
      const caseCites = extractCitations(text).filter((c) => c.type === "case")
      expect(caseCites).toHaveLength(0)
    })

    it("rejects 'Level' in sentencing context", () => {
      const text = "Level 3 of the sentencing guidelines calls for 10 to 16 months."
      const caseCites = extractCitations(text).filter((c) => c.type === "case")
      expect(caseCites).toHaveLength(0)
    })

    it("rejects 'Group' in sentencing guidelines", () => {
      const text = "Offense Group 4 applies to fraud offenses involving more than 100 victims."
      const caseCites = extractCitations(text).filter((c) => c.type === "case")
      expect(caseCites).toHaveLength(0)
    })

    it("rejects 'Step' in guideline calculations", () => {
      const text = "Step 1 of the analysis requires the court to calculate the base offense level from 10 categories."
      const caseCites = extractCitations(text).filter((c) => c.type === "case")
      expect(caseCites).toHaveLength(0)
    })

    it("rejects 'Paragraph' in document references", () => {
      const text = "Paragraph 4 of the plea agreement contains a waiver of appellate rights under 100 conditions."
      const caseCites = extractCitations(text).filter((c) => c.type === "case")
      expect(caseCites).toHaveLength(0)
    })

    it("rejects 'Number' in docket references", () => {
      const text = "Case Number 3 was consolidated with the other 15 pending actions."
      const caseCites = extractCitations(text).filter((c) => c.type === "case")
      expect(caseCites).toHaveLength(0)
    })

    it("rejects 'Factor' in balancing test", () => {
      const text = "Factor 4 of the balancing test weighed against granting 12 additional days."
      const caseCites = extractCitations(text).filter((c) => c.type === "case")
      expect(caseCites).toHaveLength(0)
    })

    it("rejects 'Category' in sentencing guidelines", () => {
      const text = "Category 6 criminal history subjects the defendant to 15 months imprisonment."
      const caseCites = extractCitations(text).filter((c) => c.type === "case")
      expect(caseCites).toHaveLength(0)
    })

    it("rejects 'Exhibit' in evidence references", () => {
      const text = "Exhibit 14 showed that the defendant made 7 unauthorized transfers."
      const caseCites = extractCitations(text).filter((c) => c.type === "case")
      expect(caseCites).toHaveLength(0)
    })

    it("rejects 'Footnote' in opinion references", () => {
      const text = "Footnote 7 explains that the defendant filed 4 prior motions."
      const caseCites = extractCitations(text).filter((c) => c.type === "case")
      expect(caseCites).toHaveLength(0)
    })

    it("rejects 'Circuit' in court structure references", () => {
      const text = "The 5 Circuit judges convened to hear the 3 consolidated appeals."
      const caseCites = extractCitations(text).filter((c) => c.type === "case")
      expect(caseCites).toHaveLength(0)
    })

    it("rejects 'Table' in guideline references", () => {
      const text = "Table 2 of the sentencing guidelines prescribes 10 offense levels."
      const caseCites = extractCitations(text).filter((c) => c.type === "case")
      expect(caseCites).toHaveLength(0)
    })

    it("rejects 'Order' in procedural references", () => {
      const text = "Pursuant to Order 7 the parties submitted 3 supplemental briefs."
      const caseCites = extractCitations(text).filter((c) => c.type === "case")
      expect(caseCites).toHaveLength(0)
    })

    it("preserves valid citations in mixed text with false positives", () => {
      const text =
        "The District 2 Court relied on Miranda v. Arizona, 384 U.S. 436 (1966), in reaching its decision."
      const citations = extractCitations(text)
      const caseCites = citations.filter((c) => c.type === "case")
      // Should find Miranda but not "2 Court..."
      expect(caseCites.length).toBe(1)
      const c = caseCites[0]
      if (c.type === "case") {
        expect(c.reporter).toBe("U.S.")
      }
    })

    it("keeps valid US citations when filtering", () => {
      const text = "See Smith v. Jones, 500 F.2d 123 (9th Cir. 2020); 1986 I.C.J. 14 (June 27)."
      const citations = extractCitations(text, { filterFalsePositives: true })
      expect(citations.length).toBeGreaterThanOrEqual(1)
      expect(citations.every((c) => c.confidence > 0.1)).toBe(true)
    })
  })
})
