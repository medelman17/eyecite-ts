/**
 * Date Parsing Utilities for Legal Citations
 *
 * Parses dates from parentheticals in legal citations. Supports several formats:
 * 1. Abbreviated month, US order: "Jan. 15, 2020", "Jan.15, 1990" (no space after period; #554)
 * 2. Full month, US order: "January 15, 2020"
 * 3. ISO 8601: "2020-06-15" (#554)
 * 4. ISO with slashes: "2020/06/15" (#554)
 * 5. Numeric US: "1/15/2020"
 * 6. European order: "15 June 2020", "15 Jun 2020" (#554)
 * 7. Year-only: "2020"
 *
 * @module extract/dates
 */

/**
 * Structured date components.
 * Month and day are optional to support year-only dates.
 */
export interface ParsedDate {
  year: number
  month?: number
  day?: number
}

/**
 * Date in both ISO string and structured format.
 */
export interface StructuredDate {
  /** ISO 8601 format: YYYY-MM-DD, YYYY-MM, or YYYY */
  iso: string
  /** Structured date components */
  parsed: ParsedDate
}

/**
 * Month name/abbreviation to numeric value (1-12).
 * Includes both 3-letter and 4-letter (Sept) abbreviations.
 */
const MONTH_MAP: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
}

/**
 * Lower bound on plausible publication years (#523). Pre-1700 cites are
 * essentially never real in U.S. citation corpora; values below this
 * threshold almost always indicate an OCR artifact (e.g., `1372` for
 * `1972`) or a page number that escaped into the year slot.
 */
const MIN_PLAUSIBLE_YEAR = 1700

/**
 * Upper bound offset on plausible years (#523). The current year + 1
 * tolerates citations to opinions filed right around the new year (and
 * forward-dated cites that occur in practice for unpublished work). Years
 * any further out are treated as artifacts.
 */
const MAX_PLAUSIBLE_YEAR_OFFSET = 1

/**
 * Range check for a publication year (#523). Accepts integers in
 * `[1700, currentYear + 1]`. Used both inside `parseDate` to drop
 * implausible matches from year-only fallback and at the extractor level
 * (defense-in-depth) so any year sourced from a raw `\d{4}` lookahead is
 * still validated.
 *
 * Boundary values (1700, current year + 1) are accepted (inclusive).
 *
 * @param year - candidate year to validate
 * @returns true when the year is in the plausible range
 *
 * @example
 * ```typescript
 * isPlausibleYear(2020) // true
 * isPlausibleYear(1700) // true (boundary)
 * isPlausibleYear(1699) // false
 * isPlausibleYear(1372) // false (OCR artifact)
 * isPlausibleYear(3021) // false (page number)
 * ```
 */
export function isPlausibleYear(year: number): boolean {
  if (!Number.isInteger(year)) return false
  const max = new Date().getFullYear() + MAX_PLAUSIBLE_YEAR_OFFSET
  return year >= MIN_PLAUSIBLE_YEAR && year <= max
}

/**
 * Parse a month name or abbreviation to numeric value (1-12).
 *
 * @param monthStr - Month name or abbreviation (e.g., "Jan", "January", "Sept.")
 * @returns Numeric month (1-12)
 * @throws Error if month name is not recognized
 *
 * @example
 * ```typescript
 * parseMonth("Jan") // 1
 * parseMonth("Sept.") // 9
 * parseMonth("December") // 12
 * ```
 */
export function parseMonth(monthStr: string): number {
  // Normalize: lowercase, strip trailing period
  const normalized = monthStr.toLowerCase().replace(/\.$/, "")
  const month = MONTH_MAP[normalized]

  if (month === undefined) {
    throw new Error(`Invalid month name: ${monthStr}`)
  }

  return month
}

/**
 * Convert structured date components to ISO 8601 string.
 * Handles full dates, month+year, and year-only formats.
 *
 * @param parsed - Structured date components
 * @returns ISO 8601 string (YYYY-MM-DD, YYYY-MM, or YYYY)
 *
 * @example
 * ```typescript
 * toIsoDate({ year: 2020, month: 1, day: 15 }) // "2020-01-15"
 * toIsoDate({ year: 2020, month: 1 }) // "2020-01"
 * toIsoDate({ year: 2020 }) // "2020"
 * ```
 */
export function toIsoDate(parsed: ParsedDate): string {
  const { year, month, day } = parsed

  if (month !== undefined && day !== undefined) {
    // Full date: YYYY-MM-DD with zero-padding
    const monthStr = String(month).padStart(2, "0")
    const dayStr = String(day).padStart(2, "0")
    return `${year}-${monthStr}-${dayStr}`
  }

  if (month !== undefined) {
    // Month+year: YYYY-MM with zero-padding
    const monthStr = String(month).padStart(2, "0")
    return `${year}-${monthStr}`
  }

  // Year-only: YYYY
  return String(year)
}

/**
 * Parse a date string into structured format.
 * Tries multiple formats in order:
 * 1. Abbreviated month (Jan. 15, 2020)
 * 2. Full month (January 15, 2020)
 * 3. Numeric US format (1/15/2020)
 * 4. Year-only (2020)
 *
 * @param dateStr - Date string in any supported format
 * @returns Structured date with ISO string, or undefined if no match
 *
 * @example
 * ```typescript
 * parseDate("Jan. 15, 2020") // { iso: "2020-01-15", parsed: { year: 2020, month: 1, day: 15 } }
 * parseDate("January 15, 2020") // { iso: "2020-01-15", parsed: { year: 2020, month: 1, day: 15 } }
 * parseDate("1/15/2020") // { iso: "2020-01-15", parsed: { year: 2020, month: 1, day: 15 } }
 * parseDate("2020") // { iso: "2020", parsed: { year: 2020 } }
 * parseDate("no date") // undefined
 * ```
 */
export function parseDate(dateStr: string): StructuredDate | undefined {
  // Try abbreviated month, US order: "Jan. 15, 2020", "Feb 9, 2015", or
  // "Jan.15, 1990" (missing space after period — common OCR artifact, #554).
  // The `(?:\.?\s+|\.\s*)` alternation accepts either an explicit space or a
  // period-with-no-trailing-space ("Jan.15"). We do NOT accept bare
  // "Jan15" (no period, no space) because that would match arbitrary text
  // like `Jan15Foo`.
  const abbrMatch = dateStr.match(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)(?:\.?\s+|\.\s*)(\d{1,2}),?\s+(\d{4})\b/i,
  )
  if (abbrMatch) {
    const month = parseMonth(abbrMatch[1])
    const day = Number.parseInt(abbrMatch[2], 10)
    const year = Number.parseInt(abbrMatch[3], 10)
    if (isPlausibleYear(year)) {
      const parsed = { year, month, day }
      return { iso: toIsoDate(parsed), parsed }
    }
  }

  // Try full month, US order: "January 15, 2020"
  const fullMatch = dateStr.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/i,
  )
  if (fullMatch) {
    const month = parseMonth(fullMatch[1])
    const day = Number.parseInt(fullMatch[2], 10)
    const year = Number.parseInt(fullMatch[3], 10)
    if (isPlausibleYear(year)) {
      const parsed = { year, month, day }
      return { iso: toIsoDate(parsed), parsed }
    }
  }

  // Try ISO 8601 format: "2020-06-15" or "2020/06/15" (#554). Matched BEFORE
  // the US numeric form so a 4-digit leading group is unambiguously a year.
  // Both separators are accepted but must be consistent (no "2020-06/15").
  const isoMatch = dateStr.match(/\b(\d{4})([-/])(\d{1,2})\2(\d{1,2})\b/)
  if (isoMatch) {
    const year = Number.parseInt(isoMatch[1], 10)
    const month = Number.parseInt(isoMatch[3], 10)
    const day = Number.parseInt(isoMatch[4], 10)
    if (isPlausibleYear(year)) {
      const parsed = { year, month, day }
      return { iso: toIsoDate(parsed), parsed }
    }
  }

  // Try numeric US format: 1/15/2020 (full year) or 10/3/07 (two-digit year,
  // Louisiana docket-prefix and other regional shorthand; #232). Two-digit
  // years pivot at 50: 00-50 → 21st century, 51-99 → 20th century.
  const numericMatch = dateStr.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\b/)
  if (numericMatch) {
    const month = Number.parseInt(numericMatch[1], 10)
    const day = Number.parseInt(numericMatch[2], 10)
    const rawYear = numericMatch[3]
    let year = Number.parseInt(rawYear, 10)
    if (rawYear.length === 2) {
      year = year <= 50 ? 2000 + year : 1900 + year
    }
    if (isPlausibleYear(year)) {
      const parsed = { year, month, day }
      return { iso: toIsoDate(parsed), parsed }
    }
  }

  // Try European day-month-year: "15 June 2020", "15 Jun 2020", "15 Jan. 1990"
  // (#554). Ordered AFTER the US forms so "Jan 5, 2020" wins as US-style
  // (month-day-year) and is not misread as day-month-year. The European form
  // requires a leading day digit and a *non-trailing* comma to prevent it
  // from matching the second half of a US-form string like "Jan. 15, 2020".
  const euroMatch = dateStr.match(
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+(\d{4})\b/i,
  )
  if (euroMatch) {
    const day = Number.parseInt(euroMatch[1], 10)
    const month = parseMonth(euroMatch[2])
    const year = Number.parseInt(euroMatch[3], 10)
    if (isPlausibleYear(year)) {
      const parsed = { year, month, day }
      return { iso: toIsoDate(parsed), parsed }
    }
  }

  // Try year-only: 2020. The plausibility check (#523) drops matches like
  // `1372` (OCR for 1972) and `3021` (page number harvested into the year
  // slot) so they don't leak through the year-only fallback.
  const yearMatch = dateStr.match(/\b(\d{4})\b/)
  if (yearMatch) {
    const year = Number.parseInt(yearMatch[1], 10)
    if (isPlausibleYear(year)) {
      const parsed = { year }
      return { iso: toIsoDate(parsed), parsed }
    }
  }

  // No match
  return undefined
}
