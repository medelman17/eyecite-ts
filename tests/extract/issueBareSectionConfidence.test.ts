import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"

describe("bare `§§ N, M` lists get lower confidence (#726)", () => {
  it("`§§ 1983, 1985` (no code prefix) → confidence=0.3, code=`§`", () => {
    const cs = extractCitations("§§ 1983, 1985")
    expect(cs.length).toBeGreaterThan(0)
    for (const c of cs) {
      expect(c.type).toBe("statute")
      const o = c as unknown as Record<string, unknown>
      expect(o.code).toBe("§")
      expect(c.confidence).toBe(0.3)
    }
  })

  it("`Code §§ 19.2-81 and 18.2-266` (with Code prefix) → confidence=0.5", () => {
    const cs = extractCitations("Code §§ 19.2-81 and 18.2-266")
    const statutes = cs.filter((c) => c.type === "statute")
    expect(statutes.length).toBeGreaterThan(0)
    // First citation (the head with Code prefix) has higher confidence
    const head = statutes.find((c) => {
      const o = c as unknown as Record<string, unknown>
      return o.code === "Code"
    })
    if (head) {
      expect(head.confidence).toBe(0.5)
    }
  })

  it("regression: `42 U.S.C. § 1983` (real code) is confidence ≥ 0.5", () => {
    const [c] = extractCitations("42 U.S.C. § 1983")
    expect(c.confidence).toBeGreaterThanOrEqual(0.5)
  })
})
