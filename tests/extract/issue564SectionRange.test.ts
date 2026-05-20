import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { Citation, StatuteCitation } from "@/types/citation"

const statutes = (cites: Citation[]): StatuteCitation[] =>
  cites.filter((c): c is StatuteCitation => c.type === "statute")

/**
 * #564 — `§§ N-M` range form emits one cite with `section="591-99"` instead
 * of a structured range.
 *
 * `28 U.S.C. §§ 591-99 (2000)` currently produces a single citation with
 * `section="591-99"`, which is ambiguous because hyphenated state-style
 * section numbers (e.g. Virginia's `19.2-81`) use the same shape. The fix
 * populates a structured `sectionRange: { start, end }` field whenever the
 * hyphen is unambiguously a range (purely numeric ends on a federal-style
 * §§ cite); `section` continues to hold the start so existing consumers
 * keep working.
 *
 * Hyphenated state-style sections (`19.2-81`, `41-2-2`) are NOT ranges —
 * they remain as a single section with `sectionRange` undefined.
 */
describe("issue #564 — `§§ N-M` range form", () => {
  describe("federal `§§` ranges (no dots) produce sectionRange", () => {
    it("`28 U.S.C. §§ 591-99` emits sectionRange={start:'591',end:'99'}", () => {
      const text = "28 U.S.C. §§ 591-99 (2000)"
      const cites = statutes(extractCitations(text))
      expect(cites).toHaveLength(1)
      const c = cites[0]
      expect(c.section).toBe("591")
      expect(c.sectionRange).toEqual({ start: "591", end: "99" })
    })

    it("`28 U.S.C. §§ 1330-1332` emits sectionRange", () => {
      const text = "See 28 U.S.C. §§ 1330-1332."
      const cites = statutes(extractCitations(text))
      expect(cites).toHaveLength(1)
      const c = cites[0]
      expect(c.section).toBe("1330")
      expect(c.sectionRange).toEqual({ start: "1330", end: "1332" })
    })

    it("`42 U.S.C. §§ 1983-1988` (legacy regression)", () => {
      const text = "42 U.S.C. §§ 1983-1988"
      const cites = statutes(extractCitations(text))
      expect(cites).toHaveLength(1)
      const c = cites[0]
      expect(c.section).toBe("1983")
      expect(c.sectionRange).toEqual({ start: "1983", end: "1988" })
    })
  })

  describe("hyphenated state-style sections are NOT ranges", () => {
    it("`Va. Code Ann. § 19.2-81` keeps single section, no sectionRange", () => {
      const text = "Va. Code Ann. § 19.2-81"
      const cites = statutes(extractCitations(text))
      expect(cites.length).toBeGreaterThanOrEqual(1)
      const c = cites[0]
      expect(c.section).toBe("19.2-81")
      expect(c.sectionRange).toBeUndefined()
    })

    it("`Section 32A-2-7(A)` (NM three-hyphen) is not a range", () => {
      const text = "Some NMSA prose. Section 32A-2-7."
      const cites = statutes(extractCitations(text))
      const target = cites.find((c) => c.section === "32A-2-7")
      expect(target).toBeDefined()
      expect(target?.sectionRange).toBeUndefined()
    })
  })

  describe("singular `§` (regression)", () => {
    it("`28 U.S.C. § 1331` does not set sectionRange", () => {
      const text = "28 U.S.C. § 1331"
      const cites = statutes(extractCitations(text))
      expect(cites).toHaveLength(1)
      expect(cites[0].sectionRange).toBeUndefined()
    })
  })
})
