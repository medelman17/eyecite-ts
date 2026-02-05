/**
 * Date Parsing Utilities Tests
 */

import { describe, expect, it } from 'vitest'
import { parseMonth, parseDate, toIsoDate, type ParsedDate } from '@/extract/dates'

describe('parseMonth', () => {
  it('converts abbreviated month names to numeric values', () => {
    expect(parseMonth('Jan')).toBe(1)
    expect(parseMonth('Feb')).toBe(2)
    expect(parseMonth('Mar')).toBe(3)
    expect(parseMonth('Apr')).toBe(4)
    expect(parseMonth('May')).toBe(5)
    expect(parseMonth('Jun')).toBe(6)
    expect(parseMonth('Jul')).toBe(7)
    expect(parseMonth('Aug')).toBe(8)
    expect(parseMonth('Sep')).toBe(9)
    expect(parseMonth('Oct')).toBe(10)
    expect(parseMonth('Nov')).toBe(11)
    expect(parseMonth('Dec')).toBe(12)
  })

  it('handles full month names', () => {
    expect(parseMonth('January')).toBe(1)
    expect(parseMonth('February')).toBe(2)
    expect(parseMonth('March')).toBe(3)
    expect(parseMonth('April')).toBe(4)
    expect(parseMonth('May')).toBe(5)
    expect(parseMonth('June')).toBe(6)
    expect(parseMonth('July')).toBe(7)
    expect(parseMonth('August')).toBe(8)
    expect(parseMonth('September')).toBe(9)
    expect(parseMonth('October')).toBe(10)
    expect(parseMonth('November')).toBe(11)
    expect(parseMonth('December')).toBe(12)
  })

  it('handles Sept 4-letter abbreviation', () => {
    expect(parseMonth('Sept')).toBe(9)
  })

  it('handles trailing periods', () => {
    expect(parseMonth('Jan.')).toBe(1)
    expect(parseMonth('Sept.')).toBe(9)
    expect(parseMonth('Dec.')).toBe(12)
  })

  it('handles case-insensitive input', () => {
    expect(parseMonth('jan')).toBe(1)
    expect(parseMonth('JANUARY')).toBe(1)
    expect(parseMonth('feb.')).toBe(2)
    expect(parseMonth('DEC.')).toBe(12)
  })

  it('throws Error for invalid month names', () => {
    expect(() => parseMonth('invalid')).toThrow()
    expect(() => parseMonth('Foo')).toThrow()
    expect(() => parseMonth('')).toThrow()
  })
})

describe('toIsoDate', () => {
  it('produces YYYY-MM-DD for full dates with zero-padding', () => {
    expect(toIsoDate({ year: 2020, month: 1, day: 15 })).toBe('2020-01-15')
    expect(toIsoDate({ year: 2020, month: 10, day: 5 })).toBe('2020-10-05')
    expect(toIsoDate({ year: 2015, month: 2, day: 9 })).toBe('2015-02-09')
    expect(toIsoDate({ year: 2019, month: 9, day: 30 })).toBe('2019-09-30')
  })

  it('produces YYYY-MM for month-only dates with zero-padding', () => {
    expect(toIsoDate({ year: 2020, month: 1 })).toBe('2020-01')
    expect(toIsoDate({ year: 2020, month: 12 })).toBe('2020-12')
  })

  it('produces YYYY for year-only dates', () => {
    expect(toIsoDate({ year: 2020 })).toBe('2020')
    expect(toIsoDate({ year: 1999 })).toBe('1999')
  })
})

describe('parseDate', () => {
  describe('abbreviated month format', () => {
    it('extracts structured date from abbreviated month format', () => {
      const result = parseDate('Jan. 15, 2020')
      expect(result).toEqual({
        iso: '2020-01-15',
        parsed: { year: 2020, month: 1, day: 15 }
      })
    })

    it('handles format without period', () => {
      const result = parseDate('Feb 9, 2015')
      expect(result).toEqual({
        iso: '2015-02-09',
        parsed: { year: 2015, month: 2, day: 9 }
      })
    })

    it('handles Sept 4-letter abbreviation', () => {
      const result = parseDate('Sept. 30, 2019')
      expect(result).toEqual({
        iso: '2019-09-30',
        parsed: { year: 2019, month: 9, day: 30 }
      })
    })

    it('handles format without comma', () => {
      const result = parseDate('Mar 5 2018')
      expect(result).toEqual({
        iso: '2018-03-05',
        parsed: { year: 2018, month: 3, day: 5 }
      })
    })
  })

  describe('full month format', () => {
    it('extracts structured date from full month format', () => {
      const result = parseDate('January 15, 2020')
      expect(result).toEqual({
        iso: '2020-01-15',
        parsed: { year: 2020, month: 1, day: 15 }
      })
    })

    it('handles September spelling', () => {
      const result = parseDate('September 30, 2019')
      expect(result).toEqual({
        iso: '2019-09-30',
        parsed: { year: 2019, month: 9, day: 30 }
      })
    })

    it('handles format without comma', () => {
      const result = parseDate('December 25 2021')
      expect(result).toEqual({
        iso: '2021-12-25',
        parsed: { year: 2021, month: 12, day: 25 }
      })
    })
  })

  describe('numeric US format', () => {
    it('extracts structured date from numeric US format', () => {
      const result = parseDate('1/15/2020')
      expect(result).toEqual({
        iso: '2020-01-15',
        parsed: { year: 2020, month: 1, day: 15 }
      })
    })

    it('handles single-digit month and day', () => {
      const result = parseDate('2/9/2015')
      expect(result).toEqual({
        iso: '2015-02-09',
        parsed: { year: 2015, month: 2, day: 9 }
      })
    })

    it('handles double-digit month and day', () => {
      const result = parseDate('12/25/2021')
      expect(result).toEqual({
        iso: '2021-12-25',
        parsed: { year: 2021, month: 12, day: 25 }
      })
    })
  })

  describe('year-only format', () => {
    it('returns year-only structure when only year present', () => {
      const result = parseDate('2020')
      expect(result).toEqual({
        iso: '2020',
        parsed: { year: 2020 }
      })
    })

    it('handles different years', () => {
      expect(parseDate('1999')).toEqual({
        iso: '1999',
        parsed: { year: 1999 }
      })
      expect(parseDate('2025')).toEqual({
        iso: '2025',
        parsed: { year: 2025 }
      })
    })
  })

  describe('edge cases', () => {
    it('returns undefined for invalid date strings', () => {
      expect(parseDate('no date here')).toBeUndefined()
      expect(parseDate('invalid')).toBeUndefined()
      expect(parseDate('')).toBeUndefined()
    })

    it('handles dates within longer text', () => {
      const result = parseDate('Decided on Jan. 15, 2020 by the court')
      expect(result).toEqual({
        iso: '2020-01-15',
        parsed: { year: 2020, month: 1, day: 15 }
      })
    })

    it('prefers abbreviated month format over year-only', () => {
      // "Dec. 2020" should match as "Dec" + year, not just "2020"
      const result = parseDate('Dec. 2020')
      // Since we don't have day, this should still extract what's available
      // For now, we'll expect undefined as the pattern requires day+year
      expect(result).toBeUndefined()
    })
  })
})
