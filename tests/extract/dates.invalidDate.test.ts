import { describe, expect, it } from "vitest"
import { parseDate, isValidDate } from "@/extract/dates"

describe("parseDate validates impossible dates (#716)", () => {
  it("`Feb 30 2020` → falls back to month-only", () => {
    const d = parseDate("Feb 30 2020")
    expect(d?.parsed.day).toBeUndefined()
    expect(d?.parsed.month).toBe(2)
    expect(d?.parsed.year).toBe(2020)
    expect(d?.iso).toBe("2020-02")
  })

  it("`Apr 31 2020` → falls back to month-only", () => {
    const d = parseDate("Apr 31 2020")
    expect(d?.parsed.day).toBeUndefined()
    expect(d?.parsed.month).toBe(4)
  })

  it("`Feb 29 2021` (non-leap) → falls back to month-only", () => {
    const d = parseDate("Feb 29 2021")
    expect(d?.parsed.day).toBeUndefined()
  })

  it("`Feb 29 2020` (leap year) → accepts day", () => {
    const d = parseDate("Feb 29 2020")
    expect(d?.parsed.day).toBe(29)
    expect(d?.iso).toBe("2020-02-29")
  })

  it("regression: `Jan 15 2020` (valid) → accepts day", () => {
    const d = parseDate("Jan 15 2020")
    expect(d?.parsed.day).toBe(15)
  })

  it("isValidDate helper rejects month>12, day<1, day>maxForMonth", () => {
    expect(isValidDate(2020, 13, 1)).toBe(false)
    expect(isValidDate(2020, 2, 0)).toBe(false)
    expect(isValidDate(2020, 2, 30)).toBe(false)
    expect(isValidDate(2020, 4, 31)).toBe(false)
    expect(isValidDate(2020, 1, 31)).toBe(true)
    expect(isValidDate(1900, 2, 29)).toBe(false)  // 1900 not leap
    expect(isValidDate(2000, 2, 29)).toBe(true)   // 2000 IS leap
  })
})
