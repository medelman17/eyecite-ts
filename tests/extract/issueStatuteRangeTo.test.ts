import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #694 (#1) — `§§ N to M` range connector. Previously produced two
 * sibling citations with no range marker; now populates `sectionRange`
 * on the head and skips the redundant sibling.
 */
describe("Issue #694 - statute `to` range connector", () => {
  it("`§§ 1983 to 1985` populates sectionRange on head", () => {
    const cs = extractCitations(`42 U.S.C. §§ 1983 to 1985`).filter(
      (c) => c.type === "statute",
    )
    expect(cs).toHaveLength(1)
    const c = cs[0] as { section?: string; sectionRange?: { start: string; end: string } }
    expect(c.section).toBe("1983")
    expect(c.sectionRange).toEqual({ start: "1983", end: "1985" })
  })

  it("`§§ 1983 and 1985` keeps list-form sibling behavior", () => {
    const cs = extractCitations(`42 U.S.C. §§ 1983 and 1985`).filter(
      (c) => c.type === "statute",
    )
    expect(cs).toHaveLength(2)
    expect((cs[0] as { sectionRange?: unknown }).sectionRange).toBeUndefined()
    expect((cs[1] as { sectionRange?: unknown }).sectionRange).toBeUndefined()
  })

  it("`§§ 1983, 1984` keeps list-form sibling behavior", () => {
    const cs = extractCitations(`42 U.S.C. §§ 1983, 1984`).filter(
      (c) => c.type === "statute",
    )
    expect(cs).toHaveLength(2)
    expect((cs[0] as { sectionRange?: unknown }).sectionRange).toBeUndefined()
  })

  it("single section without §§ unaffected", () => {
    const cs = extractCitations(`42 U.S.C. § 1983`).filter((c) => c.type === "statute")
    expect(cs).toHaveLength(1)
    expect((cs[0] as { sectionRange?: unknown }).sectionRange).toBeUndefined()
  })

  it("range text reaches across `to` in matchedText", () => {
    const cs = extractCitations(`42 U.S.C. §§ 1983 to 1985`).filter(
      (c) => c.type === "statute",
    )
    expect(cs).toHaveLength(1)
    expect((cs[0] as { matchedText: string }).matchedText).toContain("1985")
    expect((cs[0] as { matchedText: string }).matchedText).toContain("to")
  })
})
