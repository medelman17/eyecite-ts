import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { Citation, StatuteCitation } from "@/types/citation"

const statutes = (cites: Citation[]): StatuteCitation[] =>
  cites.filter((c): c is StatuteCitation => c.type === "statute")

/**
 * #569 — Massachusetts chapter-only citations like `G.L. c. 93A` placed
 * the chapter NUMBER (`93A`) in the `code` field and set `section=""`.
 * That conflates chapter and code identifiers.
 *
 * Fix: introduce a `chapter` field on `StatuteCitation`. For Massachusetts:
 *   - `code` holds the corpus identifier as it appeared (`G.L.`,
 *     `Mass. Gen. Laws`, etc.) — never the chapter number.
 *   - `chapter` holds the chapter (`93A`).
 *   - `section` is the section number when present, otherwise undefined
 *     (NOT empty string).
 */
describe("issue #569 — Massachusetts chapter-only citation modeling", () => {
  describe("chapter-only (no section)", () => {
    it("`G.L. c. 93A` → code='G.L.', chapter='93A', section undefined", () => {
      const text = "see G.L. c. 93A for the consumer-protection scheme."
      const cites = statutes(extractCitations(text))
      expect(cites).toHaveLength(1)
      const c = cites[0]
      expect(c.code).toBe("G.L.")
      expect(c.chapter).toBe("93A")
      expect(c.section).toBeUndefined()
      expect(c.jurisdiction).toBe("MA")
    })

    it("`Mass. Gen. Laws ch. 93A` → code='Mass. Gen. Laws', chapter='93A'", () => {
      const text = "See Mass. Gen. Laws ch. 93A."
      const cites = statutes(extractCitations(text))
      expect(cites).toHaveLength(1)
      const c = cites[0]
      expect(c.code).toBe("Mass. Gen. Laws")
      expect(c.chapter).toBe("93A")
      expect(c.section).toBeUndefined()
    })
  })

  describe("chapter + section", () => {
    it("`G.L. c. 93A, § 2` → chapter='93A', section='2'", () => {
      const text = "G.L. c. 93A, § 2 provides..."
      const cites = statutes(extractCitations(text))
      expect(cites).toHaveLength(1)
      const c = cites[0]
      expect(c.code).toBe("G.L.")
      expect(c.chapter).toBe("93A")
      expect(c.section).toBe("2")
    })

    it("`M.G.L.A. c. 93, § 14` → chapter='93', section='14'", () => {
      const text = "M.G.L.A. c. 93, § 14 applies."
      const cites = statutes(extractCitations(text))
      expect(cites).toHaveLength(1)
      const c = cites[0]
      expect(c.code).toBe("M.G.L.A.")
      expect(c.chapter).toBe("93")
      expect(c.section).toBe("14")
    })
  })

  describe("code field never holds the chapter number", () => {
    it("regression — code is never a numeric chapter", () => {
      const samples = ["G.L. c. 93A", "Mass. Gen. Laws ch. 211", "G.L. c. 93A, § 2"]
      for (const text of samples) {
        const cites = statutes(extractCitations(text))
        expect(cites.length).toBeGreaterThanOrEqual(1)
        // code must not be a numeric-prefix chapter shape
        expect(cites[0].code).not.toMatch(/^\d/)
      }
    })
  })
})
