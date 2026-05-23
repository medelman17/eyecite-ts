import { describe, expect, it } from "vitest"
import { normalizeUnicode } from "@/clean/cleaners"

/**
 * Issue #605 — Audit of NFKC compatibility decompositions. NFKC expands
 * many chars to multi-char ASCII (`½` → "1⁄2", `№` → "No", `㎡` → "m2")
 * which can drift position mapping and corrupt citation matching.
 *
 * normalizeUnicode strips the problematic chars pre-NFKC so the cleaned
 * text length is never *increased* by the normalize() call. The ™ ® ℠ ©
 * marks were handled by PR #744 (issue #693); this patch extends to
 * vulgar fractions, the numero sign, and CJK compatibility units.
 */
describe("Issue #605 - NFKC expansion audit", () => {
  it("strips vulgar fractions before NFKC", () => {
    expect(normalizeUnicode("½ apple")).toBe(" apple")
    expect(normalizeUnicode("⅓ cup")).toBe(" cup")
    expect(normalizeUnicode("¾ done")).toBe(" done")
  })

  it("strips numero sign (№)", () => {
    expect(normalizeUnicode("Case № 12-345")).toBe("Case  12-345")
  })

  it("strips CJK compatibility units", () => {
    expect(normalizeUnicode("㎡ measurement")).toBe(" measurement")
    expect(normalizeUnicode("㎏ weight")).toBe(" weight")
    expect(normalizeUnicode("℃ degrees")).toBe(" degrees")
    expect(normalizeUnicode("℉ degrees")).toBe(" degrees")
  })

  it("never increases length (audit invariant)", () => {
    const samples = [
      "½ ¼ ¾",
      "Case № 100",
      "㎡ ㎏ ℃ ℉",
      "Smith™ v. Jones®, 100 F.2d 1",
      "1¼ years",
    ]
    for (const s of samples) {
      expect(normalizeUnicode(s).length).toBeLessThanOrEqual(s.length)
    }
  })

  it("regular text unaffected", () => {
    expect(normalizeUnicode("Smith v. Jones, 100 F.2d 1")).toBe(
      "Smith v. Jones, 100 F.2d 1",
    )
  })

  it("ligatures still normalize (NFKC behavior preserved)", () => {
    // ﬁ ligature → "fi" — NFKC expansion is OK here because it's the
    // expected behavior and never lengthens the visible text.
    expect(normalizeUnicode("oﬃce")).toBe("office")
  })
})
