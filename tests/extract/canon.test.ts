import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { CanonCitation } from "@/types/citation"

/**
 * Code of Judicial Conduct canon citations (#310) — `Canon 7(B)(1)`,
 * `Canon 2(A) of the Code of Judicial Conduct`. Distinct from attorney
 * disciplinary/model rules (#295) — this is judicial conduct.
 */
const canon = (t: string): CanonCitation | undefined =>
  extractCitations(t).find((c): c is CanonCitation => c.type === "canon")

describe("judicial-conduct canons (#310)", () => {
  it("Canon 7(B)(1)", () => {
    const c = canon("The judge violated Canon 7(B)(1).")
    expect(c).toBeDefined()
    expect(c?.canon).toBe("7")
    expect(c?.subsection).toBe("(B)(1)")
  })

  it("Canon 2(A)", () => {
    const c = canon("Canon 2(A) requires impartiality.")
    expect(c).toBeDefined()
    expect(c?.canon).toBe("2")
    expect(c?.subsection).toBe("(A)")
  })

  it("Canon 7(B)(2)(c) of the Code of Judicial Conduct (explicit rule set)", () => {
    const c = canon("Canon 7(B)(2)(c) of the Code of Judicial Conduct")
    expect(c).toBeDefined()
    expect(c?.canon).toBe("7")
    expect(c?.subsection).toBe("(B)(2)(c)")
    expect(c?.ruleSet).toBe("Code of Judicial Conduct")
  })

  it("Canon 1 (minimal, no subsection)", () => {
    const c = canon("See Canon 1.")
    expect(c).toBeDefined()
    expect(c?.canon).toBe("1")
    expect(c?.subsection).toBeUndefined()
  })
})

describe("canon regression", () => {
  it("does not false-positive on lowercase 'canon' prose", () => {
    const cits = extractCitations("Under the canon of constitutional avoidance, the court declined.")
    expect(cits.some((c) => c.type === "canon")).toBe(false)
  })
})
