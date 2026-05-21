import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { ConstitutionalCitation } from "@/types/citation"

const cons = (text: string): ConstitutionalCitation[] =>
  extractCitations(text).filter((c) => c.type === "constitutional") as ConstitutionalCitation[]

describe("constitutional § section without comma separator", () => {
  it("`U.S. Const. amend. XIV § 1` extracts section=1 (no comma)", () => {
    const [c] = cons("U.S. Const. amend. XIV § 1")
    expect(c?.amendment).toBe(14)
    expect(c?.section).toBe("1")
  })

  it("`U.S. Const. art. III § 2` extracts section=2 (no comma)", () => {
    const [c] = cons("U.S. Const. art. III § 2")
    expect(c?.article).toBe(3)
    expect(c?.section).toBe("2")
  })

  it("`U.S. Const. amend. XIV, § 1` still works (comma form)", () => {
    const [c] = cons("U.S. Const. amend. XIV, § 1")
    expect(c?.amendment).toBe(14)
    expect(c?.section).toBe("1")
  })

  it("`U.S. Const. amend. XIV; § 1` works (semicolon form)", () => {
    const [c] = cons("U.S. Const. amend. XIV; § 1")
    expect(c?.amendment).toBe(14)
    expect(c?.section).toBe("1")
  })

  it("`U.S. Const. art. III § 2 cl. 1` extracts section + clause without commas", () => {
    const [c] = cons("U.S. Const. art. III § 2 cl. 1")
    expect(c?.article).toBe(3)
    expect(c?.section).toBe("2")
    expect(c?.clause).toBe(1)
  })

  it("`Cal. Const. art. I § 7` extracts state section without comma", () => {
    const [c] = cons("Cal. Const. art. I § 7")
    expect(c?.article).toBe(1)
    expect(c?.section).toBe("7")
  })

  it("regression: bare numeral after amendment does NOT match as section", () => {
    // `U.S. Const. amend. XIV 1` (no §) should not produce section="1"
    const [c] = cons("U.S. Const. amend. XIV 1")
    expect(c?.amendment).toBe(14)
    expect(c?.section).toBeUndefined()
  })
})
