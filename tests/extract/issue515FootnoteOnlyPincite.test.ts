import { describe, expect, it } from "vitest"
import { extractCitations } from "../../src"
import { parsePincite } from "../../src/extract/pincite"

/**
 * Issue #515: Footnote-only pincite (`, n. 7`) silently dropped.
 *
 * The existing pincite regexes (`PINCITE_REGEX`, `LOOKAHEAD_PINCITE_REGEX`)
 * required page digits before the footnote suffix. There is no branch for a
 * footnote-only pincite — i.e., when the cited material is on the citation's
 * start page and the author only references the footnote (`16 Mass. 299, n. 7`).
 *
 * Fix: add a branch that captures `nn?\.\s*\d+(?:[-–—~]\d+)?` (and `note`/
 * `fn`/`fns` variants) without a preceding page; surface as
 * `pinciteInfo.footnote` with `page=undefined`.
 */
describe("issue #515: footnote-only pincite", () => {
  describe("parsePincite", () => {
    it("parses `n. 7` as footnote-only (no page)", () => {
      const info = parsePincite("n. 7")
      expect(info).toBeDefined()
      expect(info?.footnote).toBe(7)
      expect(info?.page).toBeUndefined()
    })

    it("parses `note 7` as footnote-only", () => {
      const info = parsePincite("note 7")
      expect(info).toBeDefined()
      expect(info?.footnote).toBe(7)
      expect(info?.page).toBeUndefined()
    })

    it("parses `n. 3` as footnote-only", () => {
      const info = parsePincite("n. 3")
      expect(info).toBeDefined()
      expect(info?.footnote).toBe(3)
      expect(info?.page).toBeUndefined()
    })

    it("parses `nn. 3-5` as footnote-only range", () => {
      const info = parsePincite("nn. 3-5")
      expect(info).toBeDefined()
      expect(info?.footnote).toBe(3)
      expect(info?.footnoteEnd).toBe(5)
      expect(info?.page).toBeUndefined()
    })

    it("parses `fn. 4` (California form)", () => {
      const info = parsePincite("fn. 4")
      expect(info).toBeDefined()
      expect(info?.footnote).toBe(4)
      expect(info?.page).toBeUndefined()
    })
  })

  describe("extractCitations integration", () => {
    it("captures `, n. 7` after a full case citation", () => {
      const cites = extractCitations("16 Mass. 299, n. 7.")
      const cite = cites.find((c) => c.type === "case")
      expect(cite).toBeDefined()
      if (cite?.type === "case") {
        expect(cite.page).toBe(299)
        expect(cite.pincite).toBeUndefined()
        expect(cite.pinciteInfo?.footnote).toBe(7)
      }
    })

    it("captures `, n. 3` after a Chancery Practice citation", () => {
      const cites = extractCitations("2 Hoffman's Ch. Pr. 95, n. 3")
      const cite = cites.find((c) => c.type === "case")
      expect(cite).toBeDefined()
      if (cite?.type === "case") {
        expect(cite.page).toBe(95)
        expect(cite.pincite).toBeUndefined()
        expect(cite.pinciteInfo?.footnote).toBe(3)
      }
    })

    it("captures `, note 7` (spelled-out)", () => {
      const cites = extractCitations("16 Mass. 299, note 7.")
      const cite = cites.find((c) => c.type === "case")
      expect(cite).toBeDefined()
      if (cite?.type === "case") {
        expect(cite.page).toBe(299)
        expect(cite.pincite).toBeUndefined()
        expect(cite.pinciteInfo?.footnote).toBe(7)
      }
    })
  })
})
