import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { Citation, StatuteCitation } from "@/types/citation"

const statutes = (cites: Citation[]): StatuteCitation[] =>
  cites.filter((c): c is StatuteCitation => c.type === "statute")

describe("issue #453 — plural `§§` section lists", () => {
  describe("comma-separated", () => {
    it("`Idaho Code §§ 18-8004, 18-8005(5)` emits two citations", () => {
      const text = "Idaho Code §§ 18-8004, 18-8005(5) requires..."
      const cites = extractCitations(text)
      const sts = statutes(cites)
      expect(sts).toHaveLength(2)
      expect(sts[0].section).toBe("18-8004")
      expect(sts[1].section).toBe("18-8005(5)")
    })

    it("`I.C. §§ 61-624, 61-629` emits two citations", () => {
      const text = "I.C. §§ 61-624, 61-629."
      const cites = extractCitations(text)
      const sts = statutes(cites)
      expect(sts).toHaveLength(2)
      expect(sts[0].section).toBe("61-624")
      expect(sts[1].section).toBe("61-629")
    })

    it("`Cal. Gov. Code §§ 12940, 12945` emits two citations", () => {
      const text = "See Cal. Gov. Code §§ 12940, 12945."
      const cites = extractCitations(text)
      const sts = statutes(cites)
      expect(sts).toHaveLength(2)
      expect(sts[0].section).toBe("12940")
      expect(sts[1].section).toBe("12945")
    })

    it("three-section list `§§ 100, 200, 300`", () => {
      const text = "28 U.S.C. §§ 100, 200, 300."
      const cites = extractCitations(text)
      const sts = statutes(cites)
      expect(sts).toHaveLength(3)
      expect(sts.map((s) => s.section)).toEqual(["100", "200", "300"])
    })
  })

  describe("`and` connector", () => {
    it("`§§ 13-108 and 13-621` emits two citations", () => {
      const text = "A.R.S. §§ 13-108 and 13-621."
      const cites = extractCitations(text)
      const sts = statutes(cites)
      expect(sts).toHaveLength(2)
      expect(sts[0].section).toBe("13-108")
      expect(sts[1].section).toBe("13-621")
    })
  })

  describe("inherited code/jurisdiction", () => {
    it("subsequent sections inherit code and jurisdiction from first", () => {
      const text = "I.C. §§ 61-624, 61-629."
      const cites = extractCitations(text)
      const sts = statutes(cites)
      expect(sts).toHaveLength(2)
      expect(sts[1].code).toBe(sts[0].code)
      expect(sts[1].jurisdiction).toBe(sts[0].jurisdiction)
    })
  })

  describe("singular `§` (regression)", () => {
    it("singular `§` with comma after is not split (it's just text following)", () => {
      // `28 U.S.C. § 1331, with...` — only ONE citation, the comma is prose.
      const text = "See 28 U.S.C. § 1331, which is well-established."
      const cites = extractCitations(text)
      const sts = statutes(cites)
      expect(sts).toHaveLength(1)
      expect(sts[0].section).toBe("1331")
    })

    it("`§ 1331` alone still works as before", () => {
      const text = "28 U.S.C. § 1331 provides..."
      const cites = extractCitations(text)
      const sts = statutes(cites)
      expect(sts).toHaveLength(1)
    })
  })

  describe("span positions", () => {
    it("each emitted citation has its own span pointing at its section", () => {
      const text = "I.C. §§ 61-624, 61-629."
      const cites = extractCitations(text)
      const sts = statutes(cites)
      expect(sts).toHaveLength(2)
      expect(text.slice(sts[1].span.cleanStart, sts[1].span.cleanEnd)).toContain("61-629")
    })
  })

  describe("edge cases", () => {
    it("subsection on second section: `§§ 12940, 12945(b)`", () => {
      const text = "Cal. Gov. Code §§ 12940, 12945(b)."
      const cites = extractCitations(text)
      const sts = statutes(cites)
      expect(sts).toHaveLength(2)
      expect(sts[1].section).toBe("12945(b)")
    })

    it("space inside `§§ 100 , 200` still parses", () => {
      const text = "28 U.S.C. §§ 100 , 200."
      const cites = extractCitations(text)
      const sts = statutes(cites)
      expect(sts).toHaveLength(2)
    })
  })
})
