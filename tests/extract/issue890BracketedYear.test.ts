import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { Citation } from "@/types/citation"

// #890: a bracketed year `[1992]` (New York Official Reports / Court of Appeals
// style, and a common Bluebook variant) must behave like a parenthesized year
// `(1992)` — it carries the decision year AND closes a parallel-reporter run so
// the cites share a groupId. The fix is bracket-YEAR-specific (a `[…]` holding a
// 4-digit year): the overloaded bracket forms below (`[U]`, `[sic]`, the
// California `[secondary cite]`) hold no 4-digit year and must be untouched.

const cases = (t: string) =>
  extractCitations(t).filter((c): c is Extract<Citation, { type: "case" }> => c.type === "case")
const groupId = (c: Citation): string | undefined => (c as { groupId?: string }).groupId

describe("#890 bracketed year [1992] parity with (1992)", () => {
  // --- the fix: [year] must extract the year and group parallels ---
  it("extracts the year from a bracketed [year]", () => {
    const cs = cases("Smith v. Jones, 79 N.Y.2d 540 [1992].")
    expect(cs[0]?.year).toBe(1992)
  })

  it("extracts the year from a bracketed [court year]", () => {
    const cs = cases("People v. Smith, 100 A.D.3d 1 [2d Dept 2012].")
    expect(cs[0]?.year).toBe(2012)
  })

  it("groups parallel reporters closed by a bracketed [year]", () => {
    const cs = cases("Smith v. Jones, 79 N.Y.2d 540, 583 N.Y.S.2d 957, 593 N.E.2d 1365 [1992].")
    expect(cs).toHaveLength(3)
    const ids = cs.map(groupId)
    expect(ids.every((id) => id !== undefined)).toBe(true)
    expect(new Set(ids).size).toBe(1) // one shared parallel group
    // Full parity with `(1992)`: the bracketed year is shared by every member.
    expect(cs.every((c) => c.year === 1992)).toBe(true)
  })

  // --- regression guards: parens unchanged, overloaded brackets untouched ---
  it("(parens) year + grouping still work", () => {
    const cs = cases("Smith v. Jones, 79 N.Y.2d 540, 583 N.Y.S.2d 957, 593 N.E.2d 1365 (1992).")
    expect(cs[0]?.year).toBe(1992)
    expect(new Set(cs.map(groupId)).size).toBe(1)
  })

  it("does not invent a year from a non-year bracket [U]", () => {
    const cs = cases("People v. Smith, 100 A.D.3d 1 [U].")
    expect(cs[0]?.year).toBeUndefined()
  })

  it("does not invent a year from an editorial bracket [sic]", () => {
    const cs = cases("Smith v. Jones, 79 N.Y.2d 540 [sic].")
    // No 4-digit year anywhere — the [sic] must not be read as a year bracket.
    expect(cs[0]?.year).toBeUndefined()
  })

  it("does not disturb the California (year) [secondary cite] form", () => {
    const cs = cases("People v. Brown (1992) 5 Cal.4th 1 [20 Cal.Rptr.2d 1].")
    expect(cs).toHaveLength(2)
    expect(cs[0]?.year).toBe(1992)
    // the bracketed secondary is a parallel CITE (no 4-digit year), still grouped
    expect(new Set(cs.map(groupId)).size).toBe(1)
  })

  it("does not read a bracketed parallel cite's year-like PAGE as the year", () => {
    // `[20 Cal.Rptr.2d 1995]` is a parallel CITE (page 1995), not a `[year]`.
    // The real year is the leading `(1992)` and must survive — the secondary
    // reporter's year-like page must not overwrite it (#890 review BLOCKER).
    const lead = cases("People v. Brown (1992) 5 Cal.4th 1 [20 Cal.Rptr.2d 1995].")[0]
    expect(lead?.year).toBe(1992)
    expect((lead as { court?: string }).court).not.toBe("20 Cal.Rptr.2d")
  })

  it("does not fabricate a year from a bracketed cite whose page looks like a year", () => {
    // `[123 N.Y.S.2d 1995]` — a bare volume + reporter, page 1995 — must not be
    // read as `[1995]`; no year is invented on the primary.
    const lead = cases("Smith v. Jones, 100 N.Y.2d 1 [123 N.Y.S.2d 1995].")[0]
    expect(lead?.year).not.toBe(1995)
  })
})
