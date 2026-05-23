import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #693 (part 1) — Trademark / registered / service-mark / copyright
 * symbols appended to party names broke case-name backscan. NFKC
 * normalization decomposed `™` → "TM", `®` → "(R)", which then corrupted
 * party names (`Smith™` → `SmithTM`). Fixed by stripping these symbols
 * BEFORE NFKC normalization in `normalizeUnicode`.
 *
 * Em dashes, ellipses, zero-width-space-as-separator are tracked as
 * separate sub-problems (different root causes) and remain open.
 */
describe("Issue #693 - trademark/registered symbol stripping", () => {
  it("strips ™ from plaintiff", () => {
    const cs = extractCitations(`Smith™ v. Jones, 100 F.2d 1`).filter(
      (c) => c.type === "case",
    )
    expect(cs).toHaveLength(1)
    expect((cs[0] as { caseName?: string }).caseName).toBe("Smith v. Jones")
  })

  it("strips ® from defendant", () => {
    const cs = extractCitations(`Smith v. Jones®, 100 F.2d 1`).filter(
      (c) => c.type === "case",
    )
    expect(cs).toHaveLength(1)
    expect((cs[0] as { caseName?: string }).caseName).toBe("Smith v. Jones")
  })

  it("strips ™ + ® on both parties", () => {
    const cs = extractCitations(`Smith™ v. Jones®, 100 F.2d 1`).filter(
      (c) => c.type === "case",
    )
    expect(cs).toHaveLength(1)
    expect((cs[0] as { caseName?: string }).caseName).toBe("Smith v. Jones")
  })

  it("strips ℠ (service mark)", () => {
    const cs = extractCitations(`Acme℠ v. Beta, 100 F.2d 1`).filter(
      (c) => c.type === "case",
    )
    expect(cs).toHaveLength(1)
    expect((cs[0] as { caseName?: string }).caseName).toBe("Acme v. Beta")
  })

  it("strips © (copyright)", () => {
    const cs = extractCitations(`Alpha v. Beta©, 100 F.2d 1`).filter(
      (c) => c.type === "case",
    )
    expect(cs).toHaveLength(1)
    expect((cs[0] as { caseName?: string }).caseName).toBe("Alpha v. Beta")
  })

  it("plain case name unaffected", () => {
    const cs = extractCitations(`Smith v. Jones, 100 F.2d 1`).filter(
      (c) => c.type === "case",
    )
    expect((cs[0] as { caseName?: string }).caseName).toBe("Smith v. Jones")
  })
})
