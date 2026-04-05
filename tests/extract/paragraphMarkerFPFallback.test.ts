import { describe, it, expect } from "vitest"
import { extractCitations } from "@/extract/extractCitations"

// NOTE: reporters-db is NOT loaded — tests the heuristic fallback path

describe("single-digit volume FP fix — fallback heuristic (no reporters-db)", () => {
  describe("catches common prose patterns via word blocklist", () => {
    const fps = [
      { text: "2 In July 2016, Clark filed a motion.", word: "in" },
      { text: "1 On March 15, 2020, the defendant filed.", word: "on" },
      { text: "6 But Clark began to experience problems in 2017.", word: "but" },
      { text: "3 The district court granted summary judgment on 4 of the claims.", word: "the" },
      { text: "4 He was sentenced to 5 years.", word: "he" },
      { text: "7 See also Davis 12.", word: "see" },
    ]

    for (const { text, word } of fps) {
      it(`penalizes reporter containing "${word}"`, () => {
        const cits = extractCitations(text)
        const caseCits = cits.filter((c) => c.type === "case")
        for (const c of caseCits) {
          expect(c.confidence).toBeLessThanOrEqual(0.1)
        }
      })
    }
  })

  describe("real citations still work without db", () => {
    it("preserves 1 U.S. 1 (has periods)", () => {
      const cits = extractCitations("See 1 U.S. 1 (1791).")
      const caseCits = cits.filter((c) => c.type === "case")
      expect(caseCits.length).toBeGreaterThan(0)
      expect(caseCits[0].confidence).toBeGreaterThanOrEqual(0.5)
    })

    it("preserves 500 F.2d 123 (multi-digit volume, unaffected)", () => {
      const cits = extractCitations("Smith v. Jones, 500 F.2d 123 (2d Cir. 1974).")
      const caseCits = cits.filter((c) => c.type === "case")
      expect(caseCits.length).toBeGreaterThan(0)
      expect(caseCits[0].confidence).toBeGreaterThanOrEqual(0.5)
    })
  })
})
