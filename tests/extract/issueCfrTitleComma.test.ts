import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #630 — CFR title-side comma form (`Title 12, C.F.R. § 226`) was
 * not recognized — asymmetric with the USC pattern, which was fixed in
 * Sprint H (#586). The CFR title→code separator still required pure
 * whitespace. Fixed by allowing an optional comma (`\s*,?\s+`).
 */
describe("Issue #630 - CFR title-comma form", () => {
  it("`Title 12, C.F.R. § 226` extracts as regulation", () => {
    const cs = extractCitations(`Title 12, C.F.R. § 226`)
    expect(cs).toHaveLength(1)
    expect(cs[0].type).toBe("regulation")
  })

  it("`Title 12, C.F.R., § 226` extracts as regulation", () => {
    const cs = extractCitations(`Title 12, C.F.R., § 226`)
    expect(cs).toHaveLength(1)
    expect(cs[0].type).toBe("regulation")
  })

  it("`Title 12 C.F.R. § 226` (no comma) still works", () => {
    const cs = extractCitations(`Title 12 C.F.R. § 226`)
    expect(cs).toHaveLength(1)
    expect(cs[0].type).toBe("regulation")
  })

  it("`12 C.F.R. § 226` (no Title prefix) still works", () => {
    const cs = extractCitations(`12 C.F.R. § 226`)
    expect(cs).toHaveLength(1)
    expect(cs[0].type).toBe("regulation")
  })

  it("`42 C.F.R. § 122.26` (canonical Bluebook) still works", () => {
    const cs = extractCitations(`42 C.F.R. § 122.26`)
    expect(cs).toHaveLength(1)
    expect(cs[0].type).toBe("regulation")
  })
})
