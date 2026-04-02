/**
 * Date Parsing Utilities for Legal Citations
 *
 * Parses dates from parentheticals in legal citations. Supports three formats:
 * 1. Abbreviated month: "Jan. 15, 2020"
 * 2. Full month: "January 15, 2020"
 * 3. Numeric US: "1/15/2020"
 * 4. Year-only: "2020"
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
  // Try abbreviated month format: Jan. 15, 2020 or Feb 9, 2015
  const abbrMatch = dateStr.match(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+(\d{1,2}),?\s+(\d{4})\b/i,
  )
  if (abbrMatch) {
    const month = parseMonth(abbrMatch[1])
    const day = Number.parseInt(abbrMatch[2], 10)
    const year = Number.parseInt(abbrMatch[3], 10)
    const parsed = { year, month, day }
    return { iso: toIsoDate(parsed), parsed }
  }

  // Try full month format: January 15, 2020
  const fullMatch = dateStr.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/i,
  )
  if (fullMatch) {
    const month = parseMonth(fullMatch[1])
    const day = Number.parseInt(fullMatch[2], 10)
    const year = Number.parseInt(fullMatch[3], 10)
    const parsed = { year, month, day }
    return { iso: toIsoDate(parsed), parsed }
  }

  // Try numeric US format: 1/15/2020
  const numericMatch = dateStr.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/)
  if (numericMatch) {
    const month = Number.parseInt(numericMatch[1], 10)
    const day = Number.parseInt(numericMatch[2], 10)
    const year = Number.parseInt(numericMatch[3], 10)
    const parsed = { year, month, day }
    return { iso: toIsoDate(parsed), parsed }
  }

  // Try year-only: 2020
  const yearMatch = dateStr.match(/\b(\d{4})\b/)
  if (yearMatch) {
    const year = Number.parseInt(yearMatch[1], 10)
    const parsed = { year }
    return { iso: toIsoDate(parsed), parsed }
  }

  // No match
  return undefined
}
