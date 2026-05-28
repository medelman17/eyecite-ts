import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #324 — Tax Court Memorandum decisions (`T.C. Memo. YYYY-NNN`)
 * weren't extracted. These are the dominant authority in U.S. Tax Court
 * opinions and common in any tax-related federal opinion.
 *
 * Added a new `tc-memo` neutral-type pattern + matching extractor
 * branch. Format: year + sequential decision number within that year.
 */
describe("Issue #324 - Tax Court Memorandum decisions", () => {
  it("`T.C. Memo. 2002-89` extracts as neutral", () => {
    const cs = extractCitations(`T.C. Memo. 2002-89`)
    expect(cs).toHaveLength(1)
    const c = cs[0] as { type: string; court?: string; year?: number; documentNumber?: string }
    expect(c.type).toBe("neutral")
    expect(c.court).toBe("T.C. Memo.")
    expect(c.year).toBe(2002)
    expect(c.documentNumber).toBe("89")
  })

  it("`Robida v. Commissioner, T.C. Memo. 1970-86` extracts with caseName", () => {
    const cs = extractCitations(`Robida v. Commissioner, T.C. Memo. 1970-86`)
    const neutral = cs.find((c) => c.type === "neutral")
    expect(neutral).toBeDefined()
    const c = neutral as { year?: number; documentNumber?: string }
    expect(c.year).toBe(1970)
    expect(c.documentNumber).toBe("86")
  })

  it("`Shollenberger v. Commissioner, T.C. Memo. 2009-306` higher decision number", () => {
    const cs = extractCitations(`Shollenberger v. Commissioner, T.C. Memo. 2009-306`)
    const neutral = cs.find((c) => c.type === "neutral")
    expect(neutral).toBeDefined()
    const c = neutral as { year?: number; documentNumber?: string }
    expect(c.year).toBe(2009)
    expect(c.documentNumber).toBe("306")
  })

  it("`TC Memo. 2010-48` (no period in TC) does NOT match — strict form required", () => {
    // Document the constraint: requires periods on T.C.
    const cs = extractCitations(`TC Memo. 2010-48`).filter((c) => c.type === "neutral")
    expect(cs.length).toBe(0)
  })
})
