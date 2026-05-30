/**
 * Neutral Citation Extraction
 *
 * Parses tokenized neutral (vendor-neutral) citations to extract year, court,
 * and document number. Examples: "2020 WL 123456", "2020 U.S. LEXIS 456"
 *
 * @module extract/extractNeutral
 */

import type { Token } from "@/tokenize"
import type { NeutralCitation } from "@/types/citation"
import type { NeutralComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import type { StructuredDate } from "./dates"
import { extractCaseName, parseParenthetical } from "./extractCase"
import { parsePincite, type PinciteInfo } from "./pincite"

/** Matches a trailing pincite on a neutral citation. Accepts both
 *  ", at *3" (comma + "at" keyword) and " at *3" (whitespace + "at") forms,
 *  with optional "*" prefix for star-pagination on both ends of a range
 *  (#191, #203 — "*3-*5" is common on Westlaw/Lexis/NY Slip Op), and an
 *  optional trailing " n.14" / " nn.14-15" footnote suffix (#202). Also
 *  accepts paragraph-marker pincites `, ¶ N` / `, ¶¶ N-M` / `, paras. N-M`
 *  for state neutral-cite forms like `2015-NMCA-072, ¶ 2` where the
 *  paragraph numbering is the canonical pinpoint format (#311). When the
 *  pincite is a paragraph form, `at` is optional.
 *
 *  Parallel-cite disambiguation (#507): in Ohio Bluebook chains like
 *  `100 Ohio St.3d 152, 2003-Ohio-5372, 797 N.E.2d 71` the neutral cite
 *  was greedily consuming `797` (the next parallel's volume) as a pincite.
 *  The trailing lookahead now rejects matches where the digit sequence is
 *  followed by whitespace + capital letter (a parallel reporter token).
 *  Star-pagination, paragraph, and explicit `at`-keyword forms are exempted
 *  from this guard because they cannot be confused with a parallel cite. */
const NEUTRAL_PINCITE_LOOKAHEAD =
  /^(?:\s+at\s+|,\s*(?:at\s+(?:pp?\.\s*)?)?)(\*?\d+(?:[-–—]\*?\d+)?(?:\s+(?:nn?|note)\s*\.?\s*\d+(?:[-–—]\d+)?)?|¶¶?\s*\d+(?:[-–—]\d+)?|paras?\.?\s*\d+(?:[-–—]\d+)?)(?=$|[.,:;)([\]»"'“”‘’]|\s(?![A-Z]))/d

/** Trailing `(court date)` parenthetical lookahead for database cites.
 *  Allows optional intervening pincite (`, at *3`) per #191. The body
 *  is anything inside one set of parens. Parsing is delegated to
 *  `parseParenthetical`. #294 */
const NEUTRAL_PAREN_LOOKAHEAD =
  /^(?:\s*,?\s*(?:at\s+)?\*?\d+(?:[-–—]\*?\d+)?)?\s*\(([^)]+)\)/

/** Identifies whether a captured "court" string is actually a database
 *  identifier (WL/LEXIS/BL) rather than a real jurisdictional code. #294 */
function isDatabaseIdentifier(s: string): boolean {
  if (s === "WL" || s === "BL" || s === "NY Slip Op") return true
  return /\bLEXIS\b/.test(s)
}

/**
 * Extracts neutral citation metadata from a tokenized citation.
 *
 * Parses token text to extract:
 * - Year: 4-digit year (e.g., "2020")
 * - Court: Vendor identifier (e.g., "WL", "U.S. LEXIS")
 * - Document number: Unique document identifier (e.g., "123456")
 *
 * Confidence scoring:
 * - 1.0 (neutral format is unambiguous and standardized)
 *
 * @param token - Token from tokenizer containing matched text and clean positions
 * @param transformationMap - Position mapping from clean → original text
 * @returns NeutralCitation with parsed metadata and translated positions
 *
 * @example
 * ```typescript
 * const token = {
 *   text: "2020 WL 123456",
 *   span: { cleanStart: 10, cleanEnd: 24 },
 *   type: "neutral",
 *   patternId: "westlaw-neutral"
 * }
 * const citation = extractNeutral(token, transformationMap)
 * // citation = {
 * //   type: "neutral",
 * //   year: 2020,
 * //   court: "WL",
 * //   documentNumber: "123456",
 * //   confidence: 1.0,
 * //   ...
 * // }
 * ```
 */
export function extractNeutral(
  token: Token,
  transformationMap: TransformationMap,
  cleanedText?: string,
): NeutralCitation {
  const { text, span } = token

  // Parse year-court-documentNumber. Two-step:
  // 1. Try the Mississippi 4-segment hyphenated form (#233):
  //    year-caseType-number-appellateTrack, e.g., "2010-CT-01234-SCT".
  //    Court is composed as `${caseType}-${appellateTrack}` so the single
  //    `court` field preserves the full sovereign identifier.
  // 2. Try the 3-segment hyphenated form (NM/Ohio/NC) or the whitespace form.
  let year: number
  let court: string
  let documentNumber: string
  let unpublished = false
  let spans: NeutralComponentSpans | undefined

  // Issue #324: T.C. Memo. YYYY-NNN. Recognized BEFORE the generic
  // neutral-regex fallback because the trailing `-NNN` would otherwise
  // be misparsed as the document number with year=undefined.
  const tcMemoMatch = /^T\.\s?C\.\s+Memo\.\s+(\d{4})-(\d+)$/d.exec(text)
  if (tcMemoMatch) {
    year = Number.parseInt(tcMemoMatch[1], 10)
    court = "T.C. Memo."
    documentNumber = tcMemoMatch[2]
    if (tcMemoMatch.indices) {
      spans = {
        year: spanFromGroupIndex(span.cleanStart, tcMemoMatch.indices[1]!, transformationMap),
        documentNumber: spanFromGroupIndex(
          span.cleanStart,
          tcMemoMatch.indices[2]!,
          transformationMap,
        ),
      }
    }
  } else {
  // NY Slip Op vendor-neutral form (#692): `2024 NY Slip Op 51234` with an
  // optional `(U)` / `(UV)` / `[U]` unpublished marker and the `N.Y. Slip Op.`
  // period variant. Recognized before the generic regex because the marker and
  // multi-word identifier would otherwise misparse. "NY Slip Op" is routed to
  // `database` (not `court`) by isDatabaseIdentifier below.
  const slipOpMatch =
    /^(\d{4})\s+N\.?Y\.?\s+Slip\s+Op\.?\s+(\d+)(\((?:U|UV)\)|\[U\])?$/d.exec(text)
  if (slipOpMatch) {
    year = Number.parseInt(slipOpMatch[1], 10)
    court = "NY Slip Op"
    documentNumber = slipOpMatch[2]
    unpublished = slipOpMatch[3] !== undefined
    if (slipOpMatch.indices) {
      spans = {
        year: spanFromGroupIndex(span.cleanStart, slipOpMatch.indices[1]!, transformationMap),
        documentNumber: spanFromGroupIndex(
          span.cleanStart,
          slipOpMatch.indices[2]!,
          transformationMap,
        ),
      }
    }
  } else {
  const msMatch = /^(\d{4})-([A-Z]+)-(\d+)-([A-Z]+)$/d.exec(text)
  if (msMatch) {
    year = Number.parseInt(msMatch[1], 10)
    court = `${msMatch[2]}-${msMatch[4]}`
    documentNumber = msMatch[3]
    if (msMatch.indices) {
      const caseTypeIndices = msMatch.indices[2]!
      const trackIndices = msMatch.indices[4]!
      // Span covers the case-type token through the appellate-track token so
      // the position range reflects the combined court identifier.
      const courtIndices: [number, number] = [caseTypeIndices[0], trackIndices[1]]
      spans = {
        year: spanFromGroupIndex(span.cleanStart, msMatch.indices[1]!, transformationMap),
        court: spanFromGroupIndex(span.cleanStart, courtIndices, transformationMap),
        documentNumber: spanFromGroupIndex(
          span.cleanStart,
          msMatch.indices[3]!,
          transformationMap,
        ),
      }
    }
  } else {
    // 3-segment forms: hyphenated (NM/Ohio/NC) or whitespace (UT/WI/IL/WL).
    // Trailing `(-U)?` captures Illinois Rule 23 unpublished marker (#230);
    // the suffix is consumed but excluded from `documentNumber`.
    const neutralRegex = /^(\d{4})[-\s]+(.+?)[-\s]+(\d+)(-U)?$/d
    const match = neutralRegex.exec(text)
    if (!match) {
      throw new Error(`Failed to parse neutral citation: ${text}`)
    }
    year = Number.parseInt(match[1], 10)
    court = match[2]
    documentNumber = match[3]
    if (match[4] === "-U") {
      unpublished = true
    }
    if (match.indices) {
      spans = {
        year: spanFromGroupIndex(span.cleanStart, match.indices[1]!, transformationMap),
        court: spanFromGroupIndex(span.cleanStart, match.indices[2]!, transformationMap),
        documentNumber: spanFromGroupIndex(
          span.cleanStart,
          match.indices[3]!,
          transformationMap,
        ),
      }
    }
  }
  }
  }

  // Look ahead in cleaned text for a trailing pincite (e.g., ", at *3" on
  // Westlaw and Lexis citations). See #191.
  let pincite: number | undefined
  let pinciteInfo: PinciteInfo | undefined
  if (cleanedText) {
    const afterToken = cleanedText.substring(span.cleanEnd)
    const laMatch = NEUTRAL_PINCITE_LOOKAHEAD.exec(afterToken)
    if (laMatch) {
      pinciteInfo = parsePincite(laMatch[1]) ?? undefined
      // Neutral cites in state appellate practice use paragraph pinpoints
      // (`2015-NMCA-072, ¶ 2`) rather than page numbers. Fall back to the
      // paragraph number when no page is set so the top-level `pincite`
      // field reflects the pinpoint regardless of form. #311
      pincite = pinciteInfo?.page ?? pinciteInfo?.paragraph
      // Component span for pincite (#210). Indices are relative to afterToken,
      // which starts at span.cleanEnd in cleanedText.
      if (laMatch.indices?.[1]) {
        if (!spans) spans = {}
        spans.pincite = spanFromGroupIndex(
          span.cleanEnd,
          laMatch.indices[1],
          transformationMap,
        )
      }
    }
  }

  // Database vs. real-court routing (#294). Tokenizer captures "WL" or
  // "U.S. LEXIS" as the middle segment, which lands here as `court`. These
  // are vendor-database identifiers, not courts — route them to `database`
  // and leave `court` undefined so downstream consumers don't treat the
  // database tag as a court abbreviation.
  let database: string | undefined
  let courtOut: string | undefined = court
  if (isDatabaseIdentifier(court)) {
    database = court
    courtOut = undefined
    // The mistakenly-captured "court" span is meaningless for a database tag.
    if (spans) spans.court = undefined
  }

  // Trailing `(court date)` parenthetical lookahead (#294). For database
  // cites the trailing paren is the only place the real court appears —
  // `2001 WL 1077846 (N.D. Cal. Sept. 4, 2001)`. Reuses parseParenthetical
  // so the same court/date parser that handles case-cite parens applies.
  let date: StructuredDate | undefined
  if (cleanedText && database) {
    const afterToken = cleanedText.substring(span.cleanEnd)
    const parenMatch = NEUTRAL_PAREN_LOOKAHEAD.exec(afterToken)
    if (parenMatch) {
      const parsed = parseParenthetical(parenMatch[1])
      if (parsed.court) courtOut = parsed.court
      if (parsed.date) {
        date = parsed.date
        // Prefer the more-precise date.parsed.year over the cite's
        // documentary year if the trailing paren disambiguates it. The
        // tokenizer's year (e.g., 2001 in "2001 WL ...") is always the
        // citation year and typically matches the paren — leave year alone.
      }
    }
  }

  // Translate positions from clean → original
  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  // Confidence: 1.0 (neutral format is unambiguous)
  const confidence = 1.0

  // Case-name backward search — the canonical neutral form is
  // `<caseName>, YYYY ST NNN` (`Christian v. Atl. Richfield Co., 2015 MT
  // 255`). Without this, case-name association on neutral cites is lost
  // (#441).
  let caseName: string | undefined
  if (cleanedText) {
    const cnResult = extractCaseName(cleanedText, span.cleanStart)
    if (cnResult) {
      caseName = cnResult.caseName
      if (caseName) {
        // Strip leading signal/prose words (`See`, `See also`, `In`,
        // `Cf.`, `But see`) — the neutral extractor doesn't run the
        // case extractor's signal-extraction pre-pass, so these stay
        // in caseName otherwise.
        caseName = caseName
          .replace(
            /^(?:But\s+see(?:\s+also)?,?\s+|See\s+also,?\s+|See\s+generally\s+|See,\s+e\.g\.,?\s+|See\s+|Cf\.\s+|In\s+(?!re\b|the\s+(?:Matter|Interest)\s+of\b)|Accord\s+|Contra\s+|Compare\s+|E\.g\.,?\s+)/,
            "",
          )
          .trim()
        // Apply the same trailing-token cleanup as full-case extraction so
        // parallel-cite starts and year parens aren't absorbed (#436).
        caseName = caseName.replace(/\s*\((?:[^()]*\s)?\d{4}\)\s*$/, "").trim()
        caseName = caseName
          .replace(/,\s+\d+\s+[A-Z][A-Za-z.&'\d\s]*\d+\s*$/, "")
          .trim()
        caseName = caseName.replace(/,\s+\d{4}\s+[A-Z]+\s+\d+\s*$/, "").trim()
      }
    }
  }

  return {
    type: "neutral",
    text,
    span: {
      cleanStart: span.cleanStart,
      cleanEnd: span.cleanEnd,
      originalStart,
      originalEnd,
    },
    confidence,
    matchedText: text,
    processTimeMs: 0,
    patternsChecked: 1,
    year,
    court: courtOut,
    ...(database ? { database } : {}),
    documentNumber,
    ...(unpublished ? { unpublished: true } : {}),
    pincite,
    pinciteInfo,
    ...(date ? { date } : {}),
    ...(caseName ? { caseName } : {}),
    spans,
  }
}
