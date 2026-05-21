import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { Citation, RegulationCitation, StatuteCitation } from "@/types/citation"

const statutes = (cites: Citation[]): StatuteCitation[] =>
  cites.filter((c): c is StatuteCitation => c.type === "statute")

const regulations = (cites: Citation[]): RegulationCitation[] =>
  cites.filter((c): c is RegulationCitation => c.type === "regulation")

/**
 * #588 — A year-of-edition parenthetical glued directly to a subsection
 * chain (`§ 1472(c)(2000)`) should be treated as a year, not absorbed
 * into the subsection chain. The pre-Sprint-F behavior was:
 * `subsection="(c)(2000)"`, `year=undefined` — the year was lost.
 *
 * Sprint F (#590) added a negative lookahead `(?![^)]*\d{4})` to the
 * USC/CFR subsection body that rejects any parenthetical containing
 * four consecutive digits. That lookahead operates regardless of
 * whether whitespace separates the subsection from the year paren,
 * so the compact `(c)(2000)` form already routes through the
 * post-process `attachStatuteYearParen` binder which accepts zero
 * leading whitespace (`^\s*\(...\d{4}...\)`).
 *
 * This test file locks in that post-Sprint-F behavior so future
 * changes to the subsection / year-paren shape cannot silently
 * regress it.
 */
describe("issue #588 — year glued to subsection chain", () => {
  it("binds year on `42 U.S.C. § 1472(c)(2000)` (no space before paren)", () => {
    const cites = statutes(extractCitations("42 U.S.C. § 1472(c)(2000)"))
    expect(cites).toHaveLength(1)
    const c = cites[0]
    expect(c.section).toBe("1472")
    expect(c.subsection).toBe("(c)")
    expect(c.year).toBe(2000)
  })

  it("binds year on `49 U.S.C. § 10502(a)(2000)`", () => {
    const cites = statutes(extractCitations("49 U.S.C. § 10502(a)(2000)"))
    expect(cites).toHaveLength(1)
    const c = cites[0]
    expect(c.section).toBe("10502")
    expect(c.subsection).toBe("(a)")
    expect(c.year).toBe(2000)
  })

  it("preserves non-year subsection chain `42 U.S.C. § 1472(c)(50)`", () => {
    // A two-digit `(50)` is NOT a year and must stay in the subsection
    // chain — the Sprint F lookahead requires four consecutive digits
    // (`\d{4}`) before rejecting a paren.
    const cites = statutes(extractCitations("42 U.S.C. § 1472(c)(50)"))
    expect(cites).toHaveLength(1)
    const c = cites[0]
    expect(c.section).toBe("1472")
    expect(c.subsection).toBe("(c)(50)")
    expect(c.year).toBeUndefined()
  })

  it("binds year + publisher on `42 U.S.C. § 1331(a)(West 2018)`", () => {
    // The Sprint F lookahead matches any paren containing 4 consecutive
    // digits, so `(West 2018)` is also rejected from subsection. The
    // post-process binder then routes `West` to publisher and `2018` to
    // year.
    const cites = statutes(extractCitations("42 U.S.C. § 1331(a)(West 2018)"))
    expect(cites).toHaveLength(1)
    const c = cites[0]
    expect(c.section).toBe("1331")
    expect(c.subsection).toBe("(a)")
    expect(c.year).toBe(2018)
    expect(c.publisher).toBe("West")
  })

  it("handles three-paren chain `42 U.S.C. § 1983(a)(1)(2000)`", () => {
    // Two real subsections + a year-glued paren. The lookahead rejects
    // only the year paren; the leading `(a)(1)` chain is kept.
    const cites = statutes(extractCitations("42 U.S.C. § 1983(a)(1)(2000)"))
    expect(cites).toHaveLength(1)
    const c = cites[0]
    expect(c.section).toBe("1983")
    expect(c.subsection).toBe("(a)(1)")
    expect(c.year).toBe(2000)
  })

  it("CFR equivalent: `12 C.F.R. § 226.5(a)(2018)`", () => {
    // CFR is type=regulation since #637.
    const cites = regulations(extractCitations("12 C.F.R. § 226.5(a)(2018)"))
    expect(cites).toHaveLength(1)
    const c = cites[0]
    expect(c.code).toBe("C.F.R.")
    expect(c.section).toBe("226.5")
    expect(c.subsection).toBe("(a)")
    expect(c.year).toBe(2018)
  })
})
