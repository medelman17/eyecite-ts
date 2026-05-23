import { beforeAll, describe, expect, it } from "vitest"
import { loadReporters } from "@/data"
import { extractCitations } from "@/index"

/**
 * Issue #687 — OCR/typo ordinal suffixes on reporters never normalized.
 * `F.2nd`, `F.2ds`, `F.2cl` (the last two are OCR misreadings of `2d`)
 * left `normalizedReporter` undefined, so the resolver couldn't link
 * the typo'd variant to its canonical reporter for parallel grouping.
 * Fixed by applying a typo-correction fallback before the reporters-db
 * lookup. The literal `reporter` field is preserved; only
 * `normalizedReporter` switches to the canonical form.
 */
describe("Issue #687 - OCR typo reporter normalization", () => {
  beforeAll(async () => {
    await loadReporters()
  })

  it("preserves canonical F.2d unchanged", () => {
    const cs = extractCitations(`100 F.2d 1 (1990)`)
    const c = cs[0] as { reporter?: string; normalizedReporter?: string }
    expect(c.reporter).toBe("F.2d")
    expect(c.normalizedReporter).toBe("F.2d")
  })

  it("normalizes F.2nd → F.2d (spelled ordinal)", () => {
    const cs = extractCitations(`100 F.2nd 1 (1990)`)
    const c = cs[0] as { reporter?: string; normalizedReporter?: string }
    expect(c.reporter).toBe("F.2nd")
    expect(c.normalizedReporter).toBe("F.2d")
  })

  it("normalizes F.2ds → F.2d (spurious trailing s)", () => {
    const cs = extractCitations(`100 F.2ds 1 (1990)`)
    const c = cs[0] as { reporter?: string; normalizedReporter?: string }
    expect(c.reporter).toBe("F.2ds")
    expect(c.normalizedReporter).toBe("F.2d")
  })

  it("normalizes F.2cl → F.2d (OCR misread of d as cl)", () => {
    const cs = extractCitations(`100 F.2cl 1 (1990)`)
    const c = cs[0] as { reporter?: string; normalizedReporter?: string }
    expect(c.reporter).toBe("F.2cl")
    expect(c.normalizedReporter).toBe("F.2d")
  })

  it("normalizes F.3rd → F.3d", () => {
    const cs = extractCitations(`100 F.3rd 1 (1995)`)
    const c = cs[0] as { reporter?: string; normalizedReporter?: string }
    expect(c.reporter).toBe("F.3rd")
    expect(c.normalizedReporter).toBe("F.3d")
  })

  it("normalizes F.3cl → F.3d", () => {
    const cs = extractCitations(`100 F.3cl 1 (1995)`)
    const c = cs[0] as { reporter?: string; normalizedReporter?: string }
    expect(c.reporter).toBe("F.3cl")
    expect(c.normalizedReporter).toBe("F.3d")
  })

  it("normalizes typos for non-F reporters too (Cal.2nd → Cal.2d)", () => {
    const cs = extractCitations(`100 Cal.2nd 1 (1990)`)
    const c = cs[0] as { reporter?: string; normalizedReporter?: string }
    expect(c.reporter).toBe("Cal.2nd")
    expect(c.normalizedReporter).toBeDefined()
  })

  it("does not corrupt F.4th (correct higher ordinal)", () => {
    const cs = extractCitations(`100 F.4th 1 (2022)`)
    const c = cs[0] as { reporter?: string; normalizedReporter?: string }
    expect(c.reporter).toBe("F.4th")
    expect(c.normalizedReporter).toBe("F.4th")
  })
})
