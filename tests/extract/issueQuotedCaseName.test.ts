import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #691 — Quoted case names (`"Smith v. Jones," 100 F.2d 1`) lost their
 * caption: V_CASE_NAME_REGEX anchors on a trailing comma and a closing
 * straight-quote between the defendant and the comma broke that anchor.
 * Stripping the quote envelope in extractCaseName fixes both quote orderings
 * (American `,"` and British `",`).
 */
describe("Issue #691 - quoted case names", () => {
  it("extracts caseName from American-style quotes (comma inside quotes)", () => {
    const cs = extractCitations(`"Smith v. Jones," 100 F.2d 1`)
    const cases = cs.filter((c) => c.type === "case")
    expect(cases).toHaveLength(1)
    expect((cases[0] as { caseName?: string }).caseName).toBe("Smith v. Jones")
  })

  it("extracts caseName from British-style quotes (comma outside quotes)", () => {
    const cs = extractCitations(`"Smith v. Jones", 100 F.2d 1`)
    const cases = cs.filter((c) => c.type === "case")
    expect(cases).toHaveLength(1)
    expect((cases[0] as { caseName?: string }).caseName).toBe("Smith v. Jones")
  })

  it("works with quotes following prose connector", () => {
    const cs = extractCitations(`as held in "Smith v. Jones," 100 F.2d 1`)
    const cases = cs.filter((c) => c.type === "case")
    expect(cases).toHaveLength(1)
    expect((cases[0] as { caseName?: string }).caseName).toBe("Smith v. Jones")
  })

  it("preserves pincite after quoted caption", () => {
    const cs = extractCitations(`"Smith v. Jones," 100 F.2d 1, 5`)
    const cases = cs.filter((c) => c.type === "case")
    expect(cases).toHaveLength(1)
    const c = cases[0] as { caseName?: string; pincite?: number }
    expect(c.caseName).toBe("Smith v. Jones")
    expect(c.pincite).toBe(5)
  })

  it("handles curly quotes (Unicode left/right double)", () => {
    const cs = extractCitations(`“Smith v. Jones,” 100 F.2d 1`)
    const cases = cs.filter((c) => c.type === "case")
    expect(cases).toHaveLength(1)
    expect((cases[0] as { caseName?: string }).caseName).toBe("Smith v. Jones")
  })

  it("unquoted form remains unaffected", () => {
    const cs = extractCitations(`Smith v. Jones, 100 F.2d 1`)
    const cases = cs.filter((c) => c.type === "case")
    expect(cases).toHaveLength(1)
    expect((cases[0] as { caseName?: string }).caseName).toBe("Smith v. Jones")
  })
})
