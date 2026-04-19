/**
 * Structured pincite information parsed from citation text.
 */
export interface PinciteInfo {
  /** Primary page number */
  page: number
  /** End page for ranges: "570-75" → 575 */
  endPage?: number
  /** Footnote number: "570 n.3" → 3 */
  footnote?: number
  /** True if this is a page range */
  isRange: boolean
  /** True when the pincite uses star-pagination (e.g., "*2"), denoting a
   *  slip-opinion page or unreported-decision page rather than a reporter page.
   *  Common on NY Slip Op, Westlaw, and Lexis citations. */
  starPage?: boolean
  /** Original text before parsing */
  raw: string
}

/** Matches: optional "at ", optional "*" (star pagination), digits, optional
 *  "-/–/—[*]digits", optional "n./note digits". */
const PINCITE_PARSE_REGEX =
  /^(?:at\s+)?(\*?)(\d+)(?:[-–—]\*?(\d+))?\s*(?:(?:n|note)\s*\.?\s*(\d+))?$/i

/**
 * Parse a pincite string into structured components.
 *
 * Handles simple pages, ranges (with abbreviated end pages),
 * footnote references, and "at" prefixes.
 *
 * @example
 * parsePincite("570")       // { page: 570, isRange: false, raw: "570" }
 * parsePincite("570-75")    // { page: 570, endPage: 575, isRange: true, raw: "570-75" }
 * parsePincite("570 n.3")   // { page: 570, footnote: 3, isRange: false, raw: "570 n.3" }
 *
 * @returns Parsed pincite info, or null if unparseable
 */
export function parsePincite(raw: string): PinciteInfo | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const match = PINCITE_PARSE_REGEX.exec(trimmed)
  if (!match) return null

  const starPrefix = match[1]
  const pageRaw = match[2]
  const endRaw = match[3]
  const footnoteRaw = match[4]
  const page = Number.parseInt(pageRaw, 10)

  let endPage: number | undefined
  let isRange = false

  if (endRaw) {
    isRange = true
    const endNum = Number.parseInt(endRaw, 10)
    // Handle abbreviated end pages: "570-75" means 575
    if (endRaw.length < pageRaw.length) {
      const prefix = pageRaw.slice(0, pageRaw.length - endRaw.length)
      endPage = Number.parseInt(prefix + endRaw, 10)
    } else {
      endPage = endNum
    }
  }

  const footnote = footnoteRaw ? Number.parseInt(footnoteRaw, 10) : undefined

  const result: PinciteInfo = { page, isRange, raw: trimmed }
  if (endPage !== undefined) result.endPage = endPage
  if (footnote !== undefined) result.footnote = footnote
  if (starPrefix === "*") result.starPage = true

  return result
}
