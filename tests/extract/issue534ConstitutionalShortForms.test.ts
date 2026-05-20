/**
 * #534 — Constitutional short forms with ordinal abbreviation and word
 * forms for amendments. The canonical pattern accepts only Roman numerals
 * or Arabic numbers; opinions also use ordinal abbreviations (`5th`,
 * `14th`) and spelled-out word forms (`Fifth`, `Fourteenth`), plus the
 * unabbreviated `Amendment` token.
 */
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"
import type { ConstitutionalCitation } from "@/types/citation"

const constitutionals = (cits: ReturnType<typeof extractCitations>) =>
  cits.filter((c): c is ConstitutionalCitation => c.type === "constitutional")

describe("issue #534 — constitutional short forms", () => {
  describe("ordinal abbreviation forms (5th, 14th, etc.)", () => {
    it("`U.S. Const., 5th Amend.` extracts as amendment 5", () => {
      const cs = constitutionals(extractCitations("U.S. Const., 5th Amend."))
      expect(cs).toHaveLength(1)
      expect(cs[0].jurisdiction).toBe("US")
      expect(cs[0].amendment).toBe(5)
    })

    it("`U.S. Const., 14th Amend.` extracts as amendment 14", () => {
      const cs = constitutionals(extractCitations("U.S. Const., 14th Amend."))
      expect(cs).toHaveLength(1)
      expect(cs[0].amendment).toBe(14)
    })

    it("`U.S. Const., 1st Amend.` extracts as amendment 1", () => {
      const cs = constitutionals(extractCitations("U.S. Const., 1st Amend."))
      expect(cs).toHaveLength(1)
      expect(cs[0].amendment).toBe(1)
    })

    it("`U.S. Const., 2nd Amend.` extracts as amendment 2", () => {
      const cs = constitutionals(extractCitations("U.S. Const., 2nd Amend."))
      expect(cs).toHaveLength(1)
      expect(cs[0].amendment).toBe(2)
    })

    it("`U.S. Const., 3rd Amend.` extracts as amendment 3", () => {
      const cs = constitutionals(extractCitations("U.S. Const., 3rd Amend."))
      expect(cs).toHaveLength(1)
      expect(cs[0].amendment).toBe(3)
    })

    it("`U.S. Const., 27th Amend.` extracts as amendment 27", () => {
      const cs = constitutionals(extractCitations("U.S. Const., 27th Amend."))
      expect(cs).toHaveLength(1)
      expect(cs[0].amendment).toBe(27)
    })
  })

  describe("spelled-out word forms (Fifth, Fourteenth, etc.)", () => {
    it("`U.S. Const., Fifth Amendment.` extracts as amendment 5", () => {
      const cs = constitutionals(extractCitations("U.S. Const., Fifth Amendment."))
      expect(cs).toHaveLength(1)
      expect(cs[0].jurisdiction).toBe("US")
      expect(cs[0].amendment).toBe(5)
    })

    it("`U.S. Const., Fourteenth Amendment.` extracts as amendment 14", () => {
      const cs = constitutionals(extractCitations("U.S. Const., Fourteenth Amendment."))
      expect(cs).toHaveLength(1)
      expect(cs[0].amendment).toBe(14)
    })

    it("`U.S. Const., First Amendment.` extracts as amendment 1", () => {
      const cs = constitutionals(extractCitations("U.S. Const., First Amendment."))
      expect(cs).toHaveLength(1)
      expect(cs[0].amendment).toBe(1)
    })

    it("`U.S. Const., Twenty-Seventh Amendment.` extracts as amendment 27", () => {
      const cs = constitutionals(
        extractCitations("U.S. Const., Twenty-Seventh Amendment."),
      )
      expect(cs).toHaveLength(1)
      expect(cs[0].amendment).toBe(27)
    })

    it("`U.S. Const., Twenty-First Amendment.` extracts as amendment 21", () => {
      const cs = constitutionals(
        extractCitations("U.S. Const., Twenty-First Amendment."),
      )
      expect(cs).toHaveLength(1)
      expect(cs[0].amendment).toBe(21)
    })
  })

  describe("`Amendment` accepted as alternative to `amend.`", () => {
    it("`U.S. Const. amend. XIV` (canonical) still works", () => {
      const cs = constitutionals(extractCitations("U.S. Const. amend. XIV"))
      expect(cs).toHaveLength(1)
      expect(cs[0].amendment).toBe(14)
    })

    it("`U.S. Const. Amendment XIV` extracts as amendment 14", () => {
      const cs = constitutionals(extractCitations("U.S. Const. Amendment XIV"))
      expect(cs).toHaveLength(1)
      expect(cs[0].amendment).toBe(14)
    })
  })

  describe("bare word forms (optional but ideal)", () => {
    it("`the Fourteenth Amendment` extracts as amendment 14", () => {
      const cs = constitutionals(extractCitations("the Fourteenth Amendment"))
      expect(cs).toHaveLength(1)
      expect(cs[0].amendment).toBe(14)
    })

    it("`the Fifth Amendment` extracts as amendment 5", () => {
      const cs = constitutionals(extractCitations("the Fifth Amendment"))
      expect(cs).toHaveLength(1)
      expect(cs[0].amendment).toBe(5)
    })
  })

  describe("regression — existing forms still work", () => {
    it("Roman numeral amendment still works", () => {
      const cs = constitutionals(extractCitations("U.S. Const. amend. XIV, § 1"))
      expect(cs).toHaveLength(1)
      expect(cs[0].amendment).toBe(14)
      expect(cs[0].section).toBe("1")
    })

    it("Arabic numeral amendment still works", () => {
      const cs = constitutionals(extractCitations("U.S. Const. amend. 14"))
      expect(cs).toHaveLength(1)
      expect(cs[0].amendment).toBe(14)
    })

    it("Article forms still work", () => {
      const cs = constitutionals(extractCitations("U.S. Const. art. III, § 2"))
      expect(cs).toHaveLength(1)
      expect(cs[0].article).toBe(3)
      expect(cs[0].section).toBe("2")
    })

    it("Amdt. abbreviation still works", () => {
      const cs = constitutionals(extractCitations("U. S. Const., Amdt. 14, §1"))
      expect(cs).toHaveLength(1)
      expect(cs[0].amendment).toBe(14)
    })
  })
})
