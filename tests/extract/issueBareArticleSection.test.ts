import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #321 (part: spelled-out `Article N, Section N` prose) — the
 * `bare-article` pattern only accepted the abbreviated `Art.` token plus a
 * `§` section symbol, so the spelled-out prose form attorneys use most in
 * argument (`Article I, Section 8`) and the abbreviated-article + word-
 * section mix (`Art. 1, Section 6`) extracted as NOTHING.
 *
 * These bare forms have no `Const.` anchor and no `of the <State>
 * Constitution` trailer, so the tight `Article <num>, Section <num>`
 * adjacency (comma-separated) is the false-positive guard and confidence
 * is 0.5 — matching `bare-article`. "Article"/"Art." is case-sensitive so
 * lowercase contract/bylaw prose ("article 7, section 3 of our bylaws")
 * does not match.
 */
const constOf = (t: string) =>
  extractCitations(t).filter((c) => c.type === "constitutional") as Array<{
    article?: number
    section?: string
    jurisdiction?: string
    confidence: number
  }>

describe("Issue #321 - spelled-out Article N, Section N", () => {
  it("`Article I, Section 8` (spelled article, Roman) extracts", () => {
    const cs = constOf("Article I, Section 8 grants Congress power.")
    expect(cs).toHaveLength(1)
    expect(cs[0].article).toBe(1)
    expect(cs[0].section).toBe("8")
    expect(cs[0].jurisdiction).toBeUndefined()
  })

  it("`Article 1, Section 10` (spelled article, Arabic) extracts", () => {
    const cs = constOf("Article 1, Section 10 prohibits states from coining money.")
    expect(cs).toHaveLength(1)
    expect(cs[0].article).toBe(1)
    expect(cs[0].section).toBe("10")
  })

  it("`Art. 1, Section 6` (abbreviated article, word section) extracts", () => {
    const cs = constOf("Art. 1, Section 6 protects legislative speech.")
    expect(cs).toHaveLength(1)
    expect(cs[0].article).toBe(1)
    expect(cs[0].section).toBe("6")
  })

  it("`Article IV, Section 2.` (trailing period) extracts section without the period", () => {
    const cs = constOf("It violates Article IV, Section 2.")
    expect(cs).toHaveLength(1)
    expect(cs[0].article).toBe(4)
    expect(cs[0].section).toBe("2")
  })

  it("confidence is 0.5 (bare, no Const. anchor)", () => {
    const cs = constOf("Article I, Section 8 is the source.")
    expect(cs[0].confidence).toBe(0.5)
  })

  // False-positive guards / regressions
  it("does NOT match `Article 7 of the lease and Section 3 of the addendum`", () => {
    const cs = constOf("Article 7 of the lease and Section 3 of the addendum control.")
    expect(cs).toHaveLength(0)
  })

  it("does NOT match lowercase prose without a trailer (`article 7, section 3`)", () => {
    const cs = constOf("The article 7, section 3 of our bylaws says so.")
    expect(cs).toHaveLength(0)
  })

  it("abbreviated `Art. I, § 10` (existing bare-article) still works", () => {
    const cs = constOf("under Art. I, § 10")
    expect(cs).toHaveLength(1)
    expect(cs[0].article).toBe(1)
    expect(cs[0].section).toBe("10")
  })
})
