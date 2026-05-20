/**
 * Date Parsing Utilities Tests
 */

import { describe, expect, it } from "vitest"
import { type ParsedDate, parseDate, parseMonth, toIsoDate } from "@/extract/dates"

describe("parseMonth", () => {
  it("converts abbreviated month names to numeric values", () => {
    expect(parseMonth("Jan")).toBe(1)
    expect(parseMonth("Feb")).toBe(2)
    expect(parseMonth("Mar")).toBe(3)
    expect(parseMonth("Apr")).toBe(4)
    expect(parseMonth("May")).toBe(5)
    expect(parseMonth("Jun")).toBe(6)
    expect(parseMonth("Jul")).toBe(7)
    expect(parseMonth("Aug")).toBe(8)
    expect(parseMonth("Sep")).toBe(9)
    expect(parseMonth("Oct")).toBe(10)
    expect(parseMonth("Nov")).toBe(11)
    expect(parseMonth("Dec")).toBe(12)
  })

  it("handles full month names", () => {
    expect(parseMonth("January")).toBe(1)
    expect(parseMonth("February")).toBe(2)
    expect(parseMonth("March")).toBe(3)
    expect(parseMonth("April")).toBe(4)
    expect(parseMonth("May")).toBe(5)
    expect(parseMonth("June")).toBe(6)
    expect(parseMonth("July")).toBe(7)
    expect(parseMonth("August")).toBe(8)
    expect(parseMonth("September")).toBe(9)
    expect(parseMonth("October")).toBe(10)
    expect(parseMonth("November")).toBe(11)
    expect(parseMonth("December")).toBe(12)
  })

  it("handles Sept 4-letter abbreviation", () => {
    expect(parseMonth("Sept")).toBe(9)
  })

  it("handles trailing periods", () => {
    expect(parseMonth("Jan.")).toBe(1)
    expect(parseMonth("Sept.")).toBe(9)
    expect(parseMonth("Dec.")).toBe(12)
  })

  it("handles case-insensitive input", () => {
    expect(parseMonth("jan")).toBe(1)
    expect(parseMonth("JANUARY")).toBe(1)
    expect(parseMonth("feb.")).toBe(2)
    expect(parseMonth("DEC.")).toBe(12)
  })

  it("throws Error for invalid month names", () => {
    expect(() => parseMonth("invalid")).toThrow()
    expect(() => parseMonth("Foo")).toThrow()
    expect(() => parseMonth("")).toThrow()
  })
})

describe("toIsoDate", () => {
  it("produces YYYY-MM-DD for full dates with zero-padding", () => {
    expect(toIsoDate({ year: 2020, month: 1, day: 15 })).toBe("2020-01-15")
    expect(toIsoDate({ year: 2020, month: 10, day: 5 })).toBe("2020-10-05")
    expect(toIsoDate({ year: 2015, month: 2, day: 9 })).toBe("2015-02-09")
    expect(toIsoDate({ year: 2019, month: 9, day: 30 })).toBe("2019-09-30")
  })

  it("produces YYYY-MM for month-only dates with zero-padding", () => {
    expect(toIsoDate({ year: 2020, month: 1 })).toBe("2020-01")
    expect(toIsoDate({ year: 2020, month: 12 })).toBe("2020-12")
  })

  it("produces YYYY for year-only dates", () => {
    expect(toIsoDate({ year: 2020 })).toBe("2020")
    expect(toIsoDate({ year: 1999 })).toBe("1999")
  })
})

describe("parseDate", () => {
  describe("abbreviated month format", () => {
    it("extracts structured date from abbreviated month format", () => {
      const result = parseDate("Jan. 15, 2020")
      expect(result).toEqual({
        iso: "2020-01-15",
        parsed: { year: 2020, month: 1, day: 15 },
      })
    })

    it("handles format without period", () => {
      const result = parseDate("Feb 9, 2015")
      expect(result).toEqual({
        iso: "2015-02-09",
        parsed: { year: 2015, month: 2, day: 9 },
      })
    })

    it("handles Sept 4-letter abbreviation", () => {
      const result = parseDate("Sept. 30, 2019")
      expect(result).toEqual({
        iso: "2019-09-30",
        parsed: { year: 2019, month: 9, day: 30 },
      })
    })

    it("handles format without comma", () => {
      const result = parseDate("Mar 5 2018")
      expect(result).toEqual({
        iso: "2018-03-05",
        parsed: { year: 2018, month: 3, day: 5 },
      })
    })
  })

  describe("full month format", () => {
    it("extracts structured date from full month format", () => {
      const result = parseDate("January 15, 2020")
      expect(result).toEqual({
        iso: "2020-01-15",
        parsed: { year: 2020, month: 1, day: 15 },
      })
    })

    it("handles September spelling", () => {
      const result = parseDate("September 30, 2019")
      expect(result).toEqual({
        iso: "2019-09-30",
        parsed: { year: 2019, month: 9, day: 30 },
      })
    })

    it("handles format without comma", () => {
      const result = parseDate("December 25 2021")
      expect(result).toEqual({
        iso: "2021-12-25",
        parsed: { year: 2021, month: 12, day: 25 },
      })
    })
  })

  describe("numeric US format", () => {
    it("extracts structured date from numeric US format", () => {
      const result = parseDate("1/15/2020")
      expect(result).toEqual({
        iso: "2020-01-15",
        parsed: { year: 2020, month: 1, day: 15 },
      })
    })

    it("handles single-digit month and day", () => {
      const result = parseDate("2/9/2015")
      expect(result).toEqual({
        iso: "2015-02-09",
        parsed: { year: 2015, month: 2, day: 9 },
      })
    })

    it("handles double-digit month and day", () => {
      const result = parseDate("12/25/2021")
      expect(result).toEqual({
        iso: "2021-12-25",
        parsed: { year: 2021, month: 12, day: 25 },
      })
    })
  })

  describe("year-only format", () => {
    it("returns year-only structure when only year present", () => {
      const result = parseDate("2020")
      expect(result).toEqual({
        iso: "2020",
        parsed: { year: 2020 },
      })
    })

    it("handles different years", () => {
      expect(parseDate("1999")).toEqual({
        iso: "1999",
        parsed: { year: 1999 },
      })
      expect(parseDate("2025")).toEqual({
        iso: "2025",
        parsed: { year: 2025 },
      })
    })
  })

  describe("edge cases", () => {
    it("returns undefined for invalid date strings", () => {
      expect(parseDate("no date here")).toBeUndefined()
      expect(parseDate("invalid")).toBeUndefined()
      expect(parseDate("")).toBeUndefined()
    })

    it("handles dates within longer text", () => {
      const result = parseDate("Decided on Jan. 15, 2020 by the court")
      expect(result).toEqual({
        iso: "2020-01-15",
        parsed: { year: 2020, month: 1, day: 15 },
      })
    })

    it("matches year-only when month present but no day", () => {
      // "Dec. 2020" has month but no day, so year-only pattern matches
      const result = parseDate("Dec. 2020")
      // This is correct: patterns require day+month+year, so falls back to year-only
      expect(result).toEqual({
        iso: "2020",
        parsed: { year: 2020 },
      })
    })
  })

  /**
   * Two-digit year support in numeric format (Louisiana docket-prefix
   * citations and other regional shorthand; #232). Century inferred from
   * value: 00-50 → 21st century, 51-99 → 20th century. This matches the
   * common practice in opinion text (LA opinions from 2007 cite as `10/3/07`,
   * never `10/3/1907`).
   */
  describe("two-digit year (#232)", () => {
    it("parses `10/3/07` as 2007-10-03 (00-50 → 21st century)", () => {
      const result = parseDate("10/3/07")
      expect(result).toEqual({
        iso: "2007-10-03",
        parsed: { year: 2007, month: 10, day: 3 },
      })
    })

    it("parses `2/15/10` as 2010-02-15", () => {
      const result = parseDate("2/15/10")
      expect(result).toEqual({
        iso: "2010-02-15",
        parsed: { year: 2010, month: 2, day: 15 },
      })
    })

    it("parses `6/30/20` as 2020-06-30", () => {
      const result = parseDate("6/30/20")
      expect(result).toEqual({
        iso: "2020-06-30",
        parsed: { year: 2020, month: 6, day: 30 },
      })
    })

    it("parses `1/1/50` as 2050-01-01 (boundary)", () => {
      expect(parseDate("1/1/50")).toEqual({
        iso: "2050-01-01",
        parsed: { year: 2050, month: 1, day: 1 },
      })
    })

    it("parses `12/31/51` as 1951-12-31 (51-99 → 20th century)", () => {
      expect(parseDate("12/31/51")).toEqual({
        iso: "1951-12-31",
        parsed: { year: 1951, month: 12, day: 31 },
      })
    })

    it("parses `7/4/76` as 1976-07-04", () => {
      expect(parseDate("7/4/76")).toEqual({
        iso: "1976-07-04",
        parsed: { year: 1976, month: 7, day: 4 },
      })
    })

    it("still parses 4-digit years (regression)", () => {
      expect(parseDate("1/15/2020")).toEqual({
        iso: "2020-01-15",
        parsed: { year: 2020, month: 1, day: 15 },
      })
    })
  })

  /**
   * Non-canonical date formats (#554). Before this fix, parseDate silently
   * dropped month/day for ISO, European, and missing-space-after-period
   * formats — they all fell through to the year-only matcher.
   */
  describe("non-canonical formats (#554)", () => {
    describe("ISO 8601 format", () => {
      it("parses `2020-06-15` as 2020-06-15", () => {
        expect(parseDate("2020-06-15")).toEqual({
          iso: "2020-06-15",
          parsed: { year: 2020, month: 6, day: 15 },
        })
      })

      it("parses `2020-01-05` with leading zeros", () => {
        expect(parseDate("2020-01-05")).toEqual({
          iso: "2020-01-05",
          parsed: { year: 2020, month: 1, day: 5 },
        })
      })

      it("parses ISO date within longer text", () => {
        expect(parseDate("Filed on 2020-06-15 by the court")).toEqual({
          iso: "2020-06-15",
          parsed: { year: 2020, month: 6, day: 15 },
        })
      })
    })

    describe("ISO slash format", () => {
      it("parses `2020/06/15` as 2020-06-15 (year-first detection)", () => {
        expect(parseDate("2020/06/15")).toEqual({
          iso: "2020-06-15",
          parsed: { year: 2020, month: 6, day: 15 },
        })
      })

      it("does not confuse ISO-slash with US numeric (4-digit leading)", () => {
        // `2020/06/15`: leading 4-digit group → year (ISO).
        // `1/15/2020`: leading 1-digit group → month (US).
        expect(parseDate("1/15/2020")?.parsed).toMatchObject({ year: 2020 })
        expect(parseDate("2020/06/15")?.parsed).toMatchObject({ year: 2020, month: 6, day: 15 })
      })

      it("requires consistent separators (rejects `2020-06/15`)", () => {
        // Mixed separators should fall through to the year-only matcher.
        expect(parseDate("2020-06/15")).toEqual({
          iso: "2020",
          parsed: { year: 2020 },
        })
      })
    })

    describe("European day-month-year format", () => {
      it("parses `15 June 2020` as 2020-06-15", () => {
        expect(parseDate("15 June 2020")).toEqual({
          iso: "2020-06-15",
          parsed: { year: 2020, month: 6, day: 15 },
        })
      })

      it("parses abbreviated `15 Jun 2020`", () => {
        expect(parseDate("15 Jun 2020")).toEqual({
          iso: "2020-06-15",
          parsed: { year: 2020, month: 6, day: 15 },
        })
      })

      it("parses `15 Jan. 1990` with period", () => {
        expect(parseDate("15 Jan. 1990")).toEqual({
          iso: "1990-01-15",
          parsed: { year: 1990, month: 1, day: 15 },
        })
      })

      it("US `Jan. 15, 2020` still wins over a European interpretation", () => {
        // Regression: US-form should NOT be re-read as European (15, 2020 → 15
        // of something in 2020). The US matcher runs first and consumes the
        // full string before the European matcher gets a chance.
        expect(parseDate("Jan. 15, 2020")).toEqual({
          iso: "2020-01-15",
          parsed: { year: 2020, month: 1, day: 15 },
        })
      })
    })

    describe("missing space after period", () => {
      it("parses `Jan.15, 1990` as 1990-01-15", () => {
        expect(parseDate("Jan.15, 1990")).toEqual({
          iso: "1990-01-15",
          parsed: { year: 1990, month: 1, day: 15 },
        })
      })

      it("parses `Sept.30, 2019`", () => {
        expect(parseDate("Sept.30, 2019")).toEqual({
          iso: "2019-09-30",
          parsed: { year: 2019, month: 9, day: 30 },
        })
      })

      it("does not match bare `Jan15, 1990` (no period anchor)", () => {
        // `Jan15` without a period is too ambiguous — could be a docket
        // identifier, a station ID, etc. Require either a space or a period
        // between month abbreviation and day.
        expect(parseDate("Jan15, 1990")).toEqual({
          iso: "1990",
          parsed: { year: 1990 },
        })
      })
    })
  })
})
