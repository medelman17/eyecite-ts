import { describe, expect, it } from "vitest"
import { parseDate } from "@/extract/dates"

/**
 * Issue #554 (remaining sub-issue) — `parseDate` dropped month/day for
 * the `Mon., DD, YYYY` form (comma immediately after the period). Other
 * non-canonical forms (ISO, European, slash, missing-space-after-period)
 * had already been fixed.
 *
 * Fix: extended the abbreviated-month regex separator alternation from
 * `(?:\.?\s+|\.\s*)` to `(?:\.?,?\s+|\.,?\s*)` to accept an optional
 * comma between the period and the day.
 */
describe("Issue #554 - parseDate comma after period", () => {
  it("`Jan., 15, 2020` extracts month + day", () => {
    expect(parseDate("Jan., 15, 2020")).toEqual({
      iso: "2020-01-15",
      parsed: { year: 2020, month: 1, day: 15 },
    })
  })

  it("`Feb., 9, 2015` extracts month + day", () => {
    expect(parseDate("Feb., 9, 2015")).toEqual({
      iso: "2015-02-09",
      parsed: { year: 2015, month: 2, day: 9 },
    })
  })

  it("`Jan. 15, 1990` (canonical) still works", () => {
    expect(parseDate("Jan. 15, 1990")).toEqual({
      iso: "1990-01-15",
      parsed: { year: 1990, month: 1, day: 15 },
    })
  })

  it("`Jan.15, 1990` (no space after period) still works (#554 prior fix)", () => {
    expect(parseDate("Jan.15, 1990")).toEqual({
      iso: "1990-01-15",
      parsed: { year: 1990, month: 1, day: 15 },
    })
  })

  it("`Jan 15, 1990` (no period) still works", () => {
    expect(parseDate("Jan 15, 1990")).toEqual({
      iso: "1990-01-15",
      parsed: { year: 1990, month: 1, day: 15 },
    })
  })
})
