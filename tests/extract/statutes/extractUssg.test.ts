/**
 * Tests for U.S.S.G. (Federal Sentencing Guidelines) extraction (#577).
 *
 * U.S.S.G. citations fold under the `statute` type with `code="U.S.S.G."`
 * — no title (the Guidelines are organized by chapter/section without a
 * U.S. Code title).
 */
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"

describe("U.S.S.G. (#577)", () => {
  it("parses U.S.S.G. § 2K2.4(b)", () => {
    const cites = extractCitations("U.S.S.G. § 2K2.4(b)").filter((c) => c.type === "statute")
    expect(cites).toHaveLength(1)
    if (cites[0]?.type === "statute") {
      expect(cites[0].code).toBe("U.S.S.G.")
      expect(cites[0].section).toBe("2K2.4")
      expect(cites[0].subsection).toBe("(b)")
      // No federal title, but jurisdiction is still federal.
      expect(cites[0].jurisdiction).toBe("US")
    }
  })

  it("parses plain U.S.S.G. § 3E1.1 (no subsection)", () => {
    const cites = extractCitations("U.S.S.G. § 3E1.1").filter((c) => c.type === "statute")
    expect(cites).toHaveLength(1)
    if (cites[0]?.type === "statute") {
      expect(cites[0].code).toBe("U.S.S.G.")
      expect(cites[0].section).toBe("3E1.1")
    }
  })

  it("accepts compact USSG (no periods) as alias", () => {
    const cites = extractCitations("USSG § 2K2.4(b)").filter((c) => c.type === "statute")
    expect(cites).toHaveLength(1)
    if (cites[0]?.type === "statute") {
      expect(cites[0].code).toBe("U.S.S.G.")
    }
  })

  it("preserves leading-comma sentence position", () => {
    const cites = extractCitations(
      "The court applied the enhancement under U.S.S.G. § 3B1.1(a).",
    ).filter((c) => c.type === "statute")
    expect(cites).toHaveLength(1)
    if (cites[0]?.type === "statute") {
      expect(cites[0].section).toBe("3B1.1")
      expect(cites[0].subsection).toBe("(a)")
    }
  })

  it("does NOT classify USSG as case (regression)", () => {
    const cites = extractCitations("U.S.S.G. § 2K2.4(b)")
    expect(cites.filter((c) => c.type === "case")).toHaveLength(0)
  })
})
