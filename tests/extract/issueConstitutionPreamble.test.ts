import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #321 (preamble sub-issue) — `U.S. Const. pmbl.` and
 * `U.S. Const. preamble` references weren't extracted. The BODY_TAIL
 * regex required art./amend. + numeral.
 *
 * Fix: added a PREAMBLE alternative (`pmbl.` / `preamble`) to BODY_TAIL.
 * The extractor sets a new `preamble: true` field on the returned
 * ConstitutionalCitation when this branch matches.
 */
describe("Issue #321 - constitutional preamble", () => {
  it("`U.S. Const. pmbl.` extracts with preamble=true", () => {
    const cs = extractCitations(`U.S. Const. pmbl.`).filter((c) => c.type === "constitutional")
    expect(cs).toHaveLength(1)
    const c = cs[0] as {
      preamble?: boolean
      article?: number
      amendment?: number
      jurisdiction?: string
    }
    expect(c.preamble).toBe(true)
    expect(c.article).toBeUndefined()
    expect(c.amendment).toBeUndefined()
    expect(c.jurisdiction).toBe("US")
  })

  it("`U.S. Const, pmbl.` (comma-after-Const) works", () => {
    const cs = extractCitations(`U.S. Const, pmbl.`).filter((c) => c.type === "constitutional")
    expect(cs).toHaveLength(1)
    expect((cs[0] as { preamble?: boolean }).preamble).toBe(true)
  })

  it("`U.S. Const. preamble` (unabbreviated) works", () => {
    const cs = extractCitations(`U.S. Const. preamble`).filter((c) => c.type === "constitutional")
    expect(cs).toHaveLength(1)
    expect((cs[0] as { preamble?: boolean }).preamble).toBe(true)
  })

  it("article citation does NOT get preamble flag", () => {
    const cs = extractCitations(`U.S. Const. art. III, § 2`).filter(
      (c) => c.type === "constitutional",
    )
    expect(cs).toHaveLength(1)
    const c = cs[0] as { preamble?: unknown; article?: number }
    expect(c.article).toBe(3)
    expect(c.preamble).toBeUndefined()
  })

  it("amendment citation does NOT get preamble flag", () => {
    const cs = extractCitations(`U.S. Const. amend. XIV`).filter(
      (c) => c.type === "constitutional",
    )
    expect(cs).toHaveLength(1)
    const c = cs[0] as { preamble?: unknown; amendment?: number }
    expect(c.amendment).toBe(14)
    expect(c.preamble).toBeUndefined()
  })
})
