import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { FullCaseCitation } from "@/types/citation"
import { getCitationEnd, getCitationStart } from "@/utils/citationBounds"

describe("getCitationStart / getCitationEnd", () => {
  it("uses fullSpan for case citations when available", () => {
    const text = "Smith v. Jones, 100 F.2d 50, 55 (1990)."
    const cites = extractCitations(text)
    const c = cites[0] as FullCaseCitation
    expect(c.fullSpan).toBeDefined()
    expect(getCitationStart(c)).toBe(c.fullSpan!.cleanStart)
    expect(getCitationEnd(c)).toBe(c.fullSpan!.cleanEnd)
  })

  it("falls back to span when fullSpan is absent", () => {
    const text = "See 28 U.S.C. § 1331."
    const cites = extractCitations(text)
    const c = cites[0]
    expect(getCitationStart(c)).toBe(c.span.cleanStart)
    expect(getCitationEnd(c)).toBe(c.span.cleanEnd)
  })
})
