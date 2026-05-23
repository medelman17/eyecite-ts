import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #710 — When `<single-letter>. ` (e.g., `X.`) appears immediately
 * before what looks like a party name, V_CASE_NAME_REGEX treated the
 * single letter as an initial and absorbed it into the plaintiff field.
 * In sentence-internal contexts (`held that X. Smith ...`) the X is a
 * variable, not an initial — strip it.
 *
 * This fix only triggers when the extractor's trim block already runs
 * (i.e., the regex captured prose context like `held that X. Smith`).
 * Standalone `held because X. Smith v. Y` shapes where the regex doesn't
 * trim at all are not yet covered.
 */
describe("Issue #710 - strip variable single-letter prefix from plaintiff", () => {
  it("`held that X. Smith v. Jones` → plaintiff `Smith`", () => {
    const cs = extractCitations(
      `The Smith case held that X. Smith v. Jones, 100 F.2d 1.`,
    ).filter((c) => c.type === "case")
    expect(cs).toHaveLength(1)
    expect((cs[0] as { plaintiff?: string }).plaintiff).toBe("Smith")
  })

  it("`In re J. Smith v. Jones` keeps `J. Smith` (procedural prefix)", () => {
    const cs = extractCitations(`In re J. Smith v. Jones, 100 F.2d 1.`).filter(
      (c) => c.type === "case",
    )
    expect(cs).toHaveLength(1)
    expect((cs[0] as { plaintiff?: string }).plaintiff).toBe("J. Smith")
  })

  it("`See J. Smith v. Jones` keeps `J. Smith` (signal context)", () => {
    const cs = extractCitations(`See J. Smith v. Jones, 100 F.2d 1.`).filter(
      (c) => c.type === "case",
    )
    expect(cs).toHaveLength(1)
    expect((cs[0] as { plaintiff?: string }).plaintiff).toBe("J. Smith")
  })

  it("`K. Brown was right; M. Jones v. K. Brown` keeps `M. Jones`", () => {
    const cs = extractCitations(
      `K. Brown was right; M. Jones v. K. Brown, 100 F.2d 1.`,
    ).filter((c) => c.type === "case")
    expect(cs).toHaveLength(1)
    expect((cs[0] as { plaintiff?: string }).plaintiff).toBe("M. Jones")
  })

  it("`The court held that K. Brown v. Smith` → plaintiff `Brown`", () => {
    const cs = extractCitations(
      `The court held that K. Brown v. Smith, 100 F.2d 1.`,
    ).filter((c) => c.type === "case")
    expect(cs).toHaveLength(1)
    expect((cs[0] as { plaintiff?: string }).plaintiff).toBe("Brown")
  })
})
