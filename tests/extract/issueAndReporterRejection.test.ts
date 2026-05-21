import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"

describe("conjunction words `AND` / `OR` rejected as phantom reporter", () => {
  describe("`AND` rejection", () => {
    it("`47 AND 100` does NOT extract as a case", () => {
      const cs = extractCitations("47 AND 100").filter((c) => c.type === "case")
      expect(cs).toHaveLength(0)
    })

    it("`Plaintiff cited 100 AND 200` does NOT extract as a case", () => {
      const cs = extractCitations("Plaintiff cited 100 AND 200").filter((c) => c.type === "case")
      expect(cs).toHaveLength(0)
    })

    it("`See 100 AND 200 cases` does NOT extract", () => {
      const cs = extractCitations("See 100 AND 200 cases").filter((c) => c.type === "case")
      expect(cs).toHaveLength(0)
    })
  })

  describe("`OR` rejection", () => {
    it("`50 OR 100` does NOT extract", () => {
      const cs = extractCitations("50 OR 100").filter((c) => c.type === "case")
      expect(cs).toHaveLength(0)
    })
  })

  describe("Regression guards — legitimate reporters preserved", () => {
    it("`100 U.S. 1` extracts", () => {
      const cs = extractCitations("100 U.S. 1").filter((c) => c.type === "case")
      expect(cs).toHaveLength(1)
    })

    it("`500 F.2d 123` extracts", () => {
      const cs = extractCitations("500 F.2d 123").filter((c) => c.type === "case")
      expect(cs).toHaveLength(1)
    })

    it("`100 A.L.R.2d 1234` extracts as annotation", () => {
      const cs = extractCitations("100 A.L.R.2d 1234").filter((c) => c.type === "annotation")
      expect(cs).toHaveLength(1)
    })

    it("`Or.` (Oregon reporter) still extracts: `35 Or. 100`", () => {
      const cs = extractCitations("35 Or. 100").filter((c) => c.type === "case")
      expect(cs).toHaveLength(1)
    })

    it("`Ore.` (Oregon alternative) still extracts: `35 Ore. 100`", () => {
      const cs = extractCitations("35 Ore. 100").filter((c) => c.type === "case")
      expect(cs).toHaveLength(1)
    })
  })
})
