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
  /** Original text before parsing */
  raw: string
}

/** Matches: optional "at ", digits, optional "-digits", optional "n./note digits" */
const PINCITE_PARSE_REGEX =
  /^(?:at\s+)?(\d+)(?:-(\d+))?\s*(?:(?:n|note)\s*\.?\s*(\d+))?$/i

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

  const page = Number.parseInt(match[1], 10)
  const endRaw = match[2]
  const footnoteRaw = match[3]

  let endPage: number | undefined
  let isRange = false

  if (endRaw) {
    isRange = true
    const endNum = Number.parseInt(endRaw, 10)
    // Handle abbreviated end pages: "570-75" means 575
    if (endRaw.length < match[1].length) {
      const prefix = match[1].slice(0, match[1].length - endRaw.length)
      endPage = Number.parseInt(prefix + endRaw, 10)
    } else {
      endPage = endNum
    }
  }

  const footnote = footnoteRaw ? Number.parseInt(footnoteRaw, 10) : undefined

  const result: PinciteInfo = { page, isRange, raw: trimmed }
  if (endPage !== undefined) result.endPage = endPage
  if (footnote !== undefined) result.footnote = footnote

  return result
}
