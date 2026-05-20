/**
 * #523 — Plausibility filter on extracted year.
 *
 * Without a sanity range check, any 4-digit number harvested into the year
 * slot is accepted. OCR artifacts like `1372` (intended `1972`) and
 * `1076` (intended `1976`) slip through; #522's page-number leak fix
 * (`3021` mistaken for a year) was a related symptom.
 *
 * Acceptance: `1700 <= year <= currentYear + 1`. Out-of-range values are
 * dropped to `undefined` rather than reported. The current year + 1 cap
 * tolerates citations to opinions filed right around the new year.
 */

import { describe, expect, it } from "vitest"
import { isPlausibleYear, parseDate } from "@/extract/dates"
import { extractCitations } from "@/index"
import type { CaseCitation } from "@/types/citation"

describe("isPlausibleYear (#523)", () => {
  const currentYear = new Date().getFullYear()

  it("accepts 1700 (boundary)", () => {
    expect(isPlausibleYear(1700)).toBe(true)
  })

  it("accepts current year", () => {
    expect(isPlausibleYear(currentYear)).toBe(true)
  })

  it("accepts current year + 1 (boundary)", () => {
    expect(isPlausibleYear(currentYear + 1)).toBe(true)
  })

  it("rejects 1699 (just below boundary)", () => {
    expect(isPlausibleYear(1699)).toBe(false)
  })

  it("rejects current year + 2", () => {
    expect(isPlausibleYear(currentYear + 2)).toBe(false)
  })

  it("rejects OCR-mangled `1372`", () => {
    expect(isPlausibleYear(1372)).toBe(false)
  })

  it("rejects OCR-mangled `1076`", () => {
    expect(isPlausibleYear(1076)).toBe(false)
  })

  it("rejects far-future `3021`", () => {
    expect(isPlausibleYear(3021)).toBe(false)
  })

  it("rejects 0", () => {
    expect(isPlausibleYear(0)).toBe(false)
  })

  it("rejects negative numbers", () => {
    expect(isPlausibleYear(-1)).toBe(false)
  })
})

describe("parseDate drops implausible years (#523)", () => {
  it("returns undefined for year-only `3021`", () => {
    expect(parseDate("3021")).toBeUndefined()
  })

  it("returns undefined for year-only `1372`", () => {
    expect(parseDate("1372")).toBeUndefined()
  })

  it("returns undefined for full date with bad year", () => {
    expect(parseDate("Jan. 15, 3021")).toBeUndefined()
    expect(parseDate("3021-06-15")).toBeUndefined()
  })

  it("still parses 2020 (regression)", () => {
    expect(parseDate("2020")).toEqual({ iso: "2020", parsed: { year: 2020 } })
  })

  it("falls back to other patterns when year is implausible", () => {
    // The year-only matcher is a fallback; if it rejects an implausible
    // year, the function returns undefined (no other pattern matches).
    expect(parseDate("Decided 3021")).toBeUndefined()
  })
})

describe("extractCitations drops implausible year on case citations (#523)", () => {
  it("drops pre-1700 year from parenthetical", () => {
    const cites = extractCitations("Foo v. Bar, 1 U.S. 1 (1372)") as CaseCitation[]
    expect(cites[0]?.type).toBe("case")
    expect(cites[0]?.year).toBeUndefined()
  })

  it("drops far-future year from parenthetical", () => {
    const cites = extractCitations("Foo v. Bar, 1 U.S. 1 (3021)") as CaseCitation[]
    expect(cites[0]?.type).toBe("case")
    expect(cites[0]?.year).toBeUndefined()
  })

  it("preserves real year (1972)", () => {
    const cites = extractCitations("Foo v. Bar, 1 U.S. 1 (1972)") as CaseCitation[]
    expect(cites[0]?.year).toBe(1972)
  })

  it("preserves current year", () => {
    const currentYear = new Date().getFullYear()
    const cites = extractCitations(`Foo v. Bar, 1 U.S. 1 (${currentYear})`) as CaseCitation[]
    expect(cites[0]?.year).toBe(currentYear)
  })
})
