import { describe, it, expect, beforeAll } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import { loadReporters } from "@/data/reporters"

describe("single-digit volume false positive fix (issue #128)", () => {
  beforeAll(async () => {
    await loadReporters()
  })

  describe("false positives: paragraph/footnote markers", () => {
    const fps = [
      { text: "2 Court dismissed the complaint for failure to state a claim under Rule 12", reporter: "Court" },
      { text: "2 In July 2016, Clark filed a motion.", reporter: "In July" },
      { text: "6 But Clark began to experience problems in 2017.", reporter: "But" },
      { text: "3 The district court granted summary judgment on 4 of the claims.", reporter: "The" },
      { text: "1 On March 15, 2020, the defendant filed a notice of appeal.", reporter: "On March" },
    ]

    for (const { text, reporter } of fps) {
      it(`penalizes "${reporter}..." to confidence ≤ 0.1`, () => {
        const cits = extractCitations(text)
        for (const c of cits) {
          if (c.type === "case") {
            expect(c.confidence).toBeLessThanOrEqual(0.1)
            expect(c.warnings?.length).toBeGreaterThan(0)
          }
        }
      })
    }
  })

  describe("true positives: real single-digit volume citations", () => {
    const tps = [
      { text: "See 1 U.S. 1 (1791).", reporter: "U.S.", minConf: 0.5 },
      { text: "In 3 F.3d 456 (2d Cir. 1993).", reporter: "F.3d", minConf: 0.5 },
      { text: "See 5 Cal. 100 (1855).", reporter: "Cal.", minConf: 0.5 },
      { text: "Held in 2 Ohio St. 45 (1853).", reporter: "Ohio St.", minConf: 0.5 },
    ]

    for (const { text, reporter, minConf } of tps) {
      it(`preserves ${reporter} citation with confidence ≥ ${minConf}`, () => {
        const cits = extractCitations(text)
        const caseCits = cits.filter(c => c.type === "case")
        expect(caseCits.length).toBeGreaterThan(0)
        expect(caseCits[0].confidence).toBeGreaterThanOrEqual(minConf)
      })
    }
  })
})
