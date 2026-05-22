/**
 * Structured pincite information parsed from citation text.
 *
 * `page` and `paragraph` are mutually exclusive — a pincite is either a page
 * reference (the common case) or a paragraph reference (#204; common in
 * NY Slip Op, Canadian neutrals, and other paragraph-numbered sources). The
 * top-level convenience `pincite: number` field on the citation continues to
 * mirror `page` only; paragraph consumers read `paragraph` / `endParagraph`
 * from this struct directly.
 */
export interface PinciteInfo {
  /** Primary page number. Undefined when the pincite is paragraph-only (#204). */
  page?: number
  /** End page for ranges: "570-75" → 575 */
  endPage?: number
  /** Footnote number: "570 n.3" → 3. For multi-footnote refs ("nn.3-5"), the
   *  first note; see `footnoteEnd` for the range end. */
  footnote?: number
  /** End footnote for multi-note refs: "570 nn.3-5" → 5 */
  footnoteEnd?: number
  /** True if this is a page or paragraph range */
  isRange: boolean
  /** True when the pincite uses star-pagination (e.g., "*2"), denoting a
   *  slip-opinion page or unreported-decision page rather than a reporter page.
   *  Common on NY Slip Op, Westlaw, and Lexis citations. */
  starPage?: boolean
  /** Paragraph number for `¶ N` / `para. N` pincites (#204). */
  paragraph?: number
  /** End paragraph for `¶¶ N-M` / `paras. N-M` pincites (#204). */
  endParagraph?: number
  /** Additional discrete pincites following the primary one (#247). E.g.,
   *  `410 U.S. 113, 115, 153` → first pincite is page=115, additionalPincites
   *  is `[{ page: 153, ... }]`. Each entry is a full `PinciteInfo` so ranges
   *  / footnotes / star-pages inside the comma chain are preserved
   *  (`115, 105-110` → additional has `endPage` set). The top-level
   *  convenience `pincite: number` field on the citation continues to mirror
   *  only the primary pincite; consumers needing all pincites read this array. */
  additionalPincites?: PinciteInfo[]
  /** Original text before parsing */
  raw: string
}

/** Paragraph-marker prefix: `¶`, `¶¶`, `para.`, `paras.` with optional leading
 *  `at`. Routes the rest of the string into paragraph parsing. (#204) */
const PARA_PREFIX_REGEX = /^(?:at\s+)?(?:¶¶?|paras?\.?)\s*/i

/** Body of a paragraph pincite once the marker has been consumed: `N` or `N-M`.
 *  Range separator includes tilde (`~`) for OCR-artifact tolerance (#516). */
const PARA_NUM_REGEX = /^(\d+)(?:\s*[-–—~]\s*(\d+))?\s*$/

/** Matches: optional "at ", optional "*" (star pagination), digits, optional
 *  "-/–/—/~[*]digits", optional "n./nn./note digits" with optional range end.
 *  The footnote separator accepts a comma+space variant (`, fn. 3` — common
 *  in California opinions, #311) in addition to the canonical whitespace
 *  separator. `fn` / `fns` are recognized alongside `n` / `nn` / `note`.
 *  Tilde (`~`) is accepted as a range separator alongside hyphen and dashes
 *  for OCR-artifact tolerance (#516). */
const PINCITE_PARSE_REGEX =
  /^(?:at\s+)?(\*?)(\d+)(?:\s*[-–—~]\s*\*?(\d+))?(?:\s*,)?\s*(?:(?:nn?|fns?|note)\s*\.?\s*(\d+)(?:\s*[-–—~]\s*(\d+))?)?$/i

/** Footnote-only pincite — no page digits, just `n. 7`, `note 7`, `nn. 3-5`,
 *  `fn. 4` (#515). Surfaces when the cited material is on the citation's
 *  start page and the author references only the footnote. Accepts an
 *  optional leading `at `. */
const FOOTNOTE_ONLY_PINCITE_REGEX =
  /^(?:at\s+)?(?:nn?|fns?|note)\s*\.?\s*(\d+)(?:[-–—~](\d+))?$/i

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

  // Paragraph-marker pincite (`¶ 12`, `¶¶ 12-14`, `para. 12`, `paras. 12-14`).
  // Checked first because the page parser would reject these forms anyway. (#204)
  const paraPrefix = PARA_PREFIX_REGEX.exec(trimmed)
  if (paraPrefix) {
    const rest = trimmed.substring(paraPrefix[0].length)
    const numMatch = PARA_NUM_REGEX.exec(rest)
    if (numMatch) {
      const paragraph = Number.parseInt(numMatch[1], 10)
      const endParagraph = numMatch[2]
        ? Number.parseInt(numMatch[2], 10)
        : undefined
      const result: PinciteInfo = {
        paragraph,
        isRange: endParagraph !== undefined,
        raw: trimmed,
      }
      if (endParagraph !== undefined) result.endParagraph = endParagraph
      return result
    }
    // Falls through to page parsing if the body isn't a clean number — defensive.
  }

  // Footnote-only pincite (`n. 7`, `note 7`, `nn. 3-5`, `fn. 4`). Checked
  // before the page parser because the page parser requires leading digits
  // and would reject these forms. (#515)
  const footnoteOnly = FOOTNOTE_ONLY_PINCITE_REGEX.exec(trimmed)
  if (footnoteOnly) {
    const footnote = Number.parseInt(footnoteOnly[1], 10)
    const footnoteEnd = footnoteOnly[2]
      ? Number.parseInt(footnoteOnly[2], 10)
      : undefined
    const result: PinciteInfo = {
      footnote,
      isRange: footnoteEnd !== undefined,
      raw: trimmed,
    }
    if (footnoteEnd !== undefined) result.footnoteEnd = footnoteEnd
    return result
  }

  const match = PINCITE_PARSE_REGEX.exec(trimmed)
  if (!match) return null

  const starPrefix = match[1]
  const pageRaw = match[2]
  const endRaw = match[3]
  const footnoteRaw = match[4]
  const footnoteEndRaw = match[5]
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
  const footnoteEnd = footnoteEndRaw ? Number.parseInt(footnoteEndRaw, 10) : undefined

  const result: PinciteInfo = { page, isRange, raw: trimmed }
  if (endPage !== undefined) result.endPage = endPage
  if (footnote !== undefined) result.footnote = footnote
  if (footnoteEnd !== undefined) result.footnoteEnd = footnoteEnd
  if (starPrefix === "*") result.starPage = true

  return result
}
