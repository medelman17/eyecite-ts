import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #694 (part 3) — Partial-decimal section ranges
 * (`Tex. Bus. & Com. Code Ann. §§ 17.50-.55`, Bluebook shorthand
 * where the trailing endpoint inherits the integer stem) and the
 * full repeated form (`§§ 17.50-17.55`) weren't expanded into
 * structured `sectionRange` data.
 *
 * Fix: parseBody now recognizes both forms. The section field is
 * trimmed to the start endpoint only; `sectionRange.start` and
 * `sectionRange.end` carry the full expansion.
 *
 * The full-repeated form requires the integer stem to match on both
 * sides (`17.50-17.55`) to avoid mis-parsing VA hyphenated section
 * identifiers (`18.2-308.2`) as ranges.
 */
describe("Issue #694 - partial-decimal section ranges", () => {
  it("`Tex. Bus. & Com. Code Ann. §§ 17.50-.55` expands range", () => {
    const cs = extractCitations(`Tex. Bus. & Com. Code Ann. §§ 17.50-.55`).filter(
      (c) => c.type === "statute",
    )
    expect(cs).toHaveLength(1)
    const c = cs[0] as {
      section?: string
      sectionRange?: { start: string; end: string }
    }
    expect(c.section).toBe("17.50")
    expect(c.sectionRange).toEqual({ start: "17.50", end: "17.55" })
  })

  it("`§§ 17.50-17.55` (full repeated form) also expands", () => {
    const cs = extractCitations(`Tex. Bus. & Com. Code Ann. §§ 17.50-17.55`).filter(
      (c) => c.type === "statute",
    )
    expect(cs).toHaveLength(1)
    const c = cs[0] as {
      section?: string
      sectionRange?: { start: string; end: string }
    }
    expect(c.section).toBe("17.50")
    expect(c.sectionRange).toEqual({ start: "17.50", end: "17.55" })
  })

  it("VA hyphenated section `18.2-308.2` is NOT mis-parsed as range (regression)", () => {
    const cs = extractCitations(`Va. Code § 18.2-308.2`).filter((c) => c.type === "statute")
    expect(cs).toHaveLength(1)
    const c = cs[0] as { section?: string; sectionRange?: unknown }
    expect(c.section).toBe("18.2-308.2")
    expect(c.sectionRange).toBeUndefined()
  })

  it("single section `§ 17.50` unaffected", () => {
    const cs = extractCitations(`Tex. Bus. & Com. Code Ann. § 17.50`).filter(
      (c) => c.type === "statute",
    )
    expect(cs).toHaveLength(1)
    const c = cs[0] as { section?: string; sectionRange?: unknown }
    expect(c.section).toBe("17.50")
    expect(c.sectionRange).toBeUndefined()
  })
})
