import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { StatuteCitation } from "@/types/citation"

const stats = (text: string): StatuteCitation[] =>
  extractCitations(text).filter((c) => c.type === "statute") as StatuteCitation[]

describe("statute subsection rejects publisher/supplement markers", () => {
  it.each([
    ["Supp. III", "42 U.S.C. § 1983 (Supp. III)"],
    ["West", "42 U.S.C. § 1983 (West)"],
    ["Cum. Supp. 2020", "42 U.S.C. § 1983 (Cum. Supp. 2020)"],
    ["West 2010", "42 U.S.C. § 1983 (West 2010)"],
  ])("`%s` is not parsed as subsection", (_, input) => {
    const [c] = stats(input)
    expect(c?.subsection).toBeUndefined()
  })

  it("regression: canonical subsection `(a)(1)(B)` still parses", () => {
    const [c] = stats("42 U.S.C. § 1983(a)(1)(B)")
    expect(c?.subsection).toBe("(a)(1)(B)")
  })

  it("regression: bare letter subsection `(A)` (uppercase) still parses", () => {
    const [c] = stats("42 U.S.C. § 1983(A)")
    expect(c?.subsection).toBe("(A)")
  })

  it("regression: numeric subsection `(1)(b)` still parses", () => {
    const [c] = stats("42 U.S.C. § 1983(1)(b)")
    expect(c?.subsection).toBe("(1)(b)")
  })
})
