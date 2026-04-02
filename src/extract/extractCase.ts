/**
 * Case Citation Extraction
 *
 * Parses tokenized case citations to extract volume, reporter, page, and
 * optional metadata (pincite, court, year). This is the third stage of
 * the parsing pipeline:
 *   1. Clean text (remove HTML, normalize Unicode)
 *   2. Tokenize (apply patterns to find candidates)
 *   3. Extract (parse metadata, validate) ← THIS MODULE
 *
 * Extraction parses structured data from token text. Validation against
 * reporters-db happens in Phase 3 (resolution layer).
 *
 * @module extract/extractCase
 */

import type { Token } from "@/tokenize"
import type {
  FullCaseCitation,
  HistorySignal,
  Parenthetical,
  ParentheticalType,
  SubsequentHistoryEntry,
} from "@/types/citation"
import { resolveOriginalSpan, type Span, type TransformationMap } from "@/types/span"
import { parseDate, type StructuredDate } from "./dates"
import { inferCourtFromReporter } from "./courtInference"

/** Parse a volume string as number when purely numeric, string when hyphenated */
function parseVolume(raw: string): number | string {
  const num = Number.parseInt(raw, 10)
  return String(num) === raw ? num : raw
}

/** Month abbreviations and full names found in legal citation parentheticals */
const MONTH_PATTERN =
  /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\.?/

// ============================================================================
// Compiled regex patterns for performance (hoisted to module level)
// ============================================================================

/** Matches volume-reporter-page format in citation core */
const VOLUME_REPORTER_PAGE_REGEX = /^(\d+(?:-\d+)?)\s+([A-Za-z0-9.\s']+)\s+(\d+|_{3,}|-{3,})/

/** Detects blank page placeholders (3+ underscores or dashes) */
const BLANK_PAGE_REGEX = /^[_-]{3,}$/

/** Extracts pincite (page reference after comma) */
const PINCITE_REGEX = /,\s*(\d+)/

/** Matches parenthetical content */
const PAREN_REGEX = /\(([^)]+)\)/

/** Look-ahead pattern for parenthetical after token */
const LOOKAHEAD_PAREN_REGEX = /^(?:,\s*\d+(?:-\d+)?)*(?:\s+(?:n|note)\s*\.?\s*\d+)?\s*\(([^)]+)\)/

/** Extracts pincite from look-ahead text */
const LOOKAHEAD_PINCITE_REGEX = /^,\s*(\d+(?:-\d+)?)/

/** Citation boundary pattern (digit-period-space) */
const CITATION_BOUNDARY_REGEX = /\d\.\s+/g

/** Whitespace/comma skip pattern for parenthetical scanning */
const PAREN_SKIP_REGEX = /[\s,]/

/**
 * Signal normalization table. Longer patterns first so "aff'd on other grounds"
 * matches before "aff'd". Each entry: [regex, normalized HistorySignal].
 */
const SIGNAL_TABLE: ReadonlyArray<readonly [RegExp, HistorySignal]> = [
  // affirmed (longer variants first)
  [/^aff'?d\s+on\s+other\s+grounds\b/i, "affirmed"],
  [/^affirmed\s+on\s+other\s+grounds\b/i, "affirmed"],
  [/^aff'?d\b/i, "affirmed"],
  [/^affirmed\b/i, "affirmed"],
  // reversed
  [/^rev'?d\s+and\s+remanded\b/i, "reversed"],
  [/^rev'?d\s+on\s+other\s+grounds\b/i, "reversed"],
  [/^reversed\s+and\s+remanded\b/i, "reversed"],
  [/^rev'?d\b/i, "reversed"],
  [/^reversed\b/i, "reversed"],
  // cert denied
  [/^certiorari\s+denied\b/i, "cert_denied"],
  [/^cert\.\s*den(ied|\.)(?=[\s,;(]|$)/i, "cert_denied"],
  // cert granted
  [/^certiorari\s+granted\b/i, "cert_granted"],
  [/^cert\.\s*granted\b/i, "cert_granted"],
  // overruled
  [/^overruled\s+by\b/i, "overruled"],
  [/^overruled\s+in\b/i, "overruled"],
  [/^overruling\b/i, "overruled"],
  [/^overruled\b/i, "overruled"],
  // vacated
  [/^vacated\s+by\b/i, "vacated"],
  [/^vacated\b/i, "vacated"],
  // remanded
  [/^remanded\s+for\s+reconsideration\b/i, "remanded"],
  [/^remanded\b/i, "remanded"],
  // modified
  [/^modified\s+by\b/i, "modified"],
  [/^modified\b/i, "modified"],
  // abrogated
  [/^abrogated\s+by\b/i, "abrogated"],
  [/^abrogated\s+in\b/i, "abrogated"],
  [/^abrogated\b/i, "abrogated"],
  // additional signals
  [/^superseded\s+by\b/i, "superseded"],
  [/^superseded\b/i, "superseded"],
  [/^disapproved\s+of\b/i, "disapproved"],
  [/^disapproved\b/i, "disapproved"],
  [/^questioned\s+by\b/i, "questioned"],
  [/^questioned\b/i, "questioned"],
  [/^distinguished\s+by\b/i, "distinguished"],
  [/^distinguished\b/i, "distinguished"],
  [/^withdrawn\b/i, "withdrawn"],
  [/^reinstated\b/i, "reinstated"],
]

/** Detection regex for all subsequent history signals (used by collectParentheticals) */
const HISTORY_SIGNAL_REGEX = new RegExp(
  `^(${SIGNAL_TABLE.map(([re]) => re.source.replace(/^\^/, "")).join("|")})`,
  "i",
)

/**
 * Normalize a raw signal string to a HistorySignal value.
 * Returns undefined if the string doesn't match any known signal.
 */
function normalizeSignal(raw: string): { signal: HistorySignal; matchLength: number } | undefined {
  for (const [regex, signal] of SIGNAL_TABLE) {
    const match = regex.exec(raw)
    if (match) {
      return { signal, matchLength: match[0].length }
    }
  }
  return undefined
}

/** Signal words that identify explanatory parentheticals */
const SIGNAL_WORDS: ReadonlySet<string> = new Set([
  "holding", "finding", "stating", "noting", "explaining", "quoting", "citing",
  "discussing", "describing", "recognizing", "applying", "rejecting", "adopting", "requiring",
])

/** Type guard: validates a string is a known signal word */
function isSignalWord(word: string): word is ParentheticalType {
  return SIGNAL_WORDS.has(word)
}

/** Matches a leading word (used to extract signal word candidate) */
const LEADING_WORD_REGEX = /^([a-z]+)\b/i

/** Standard "v." or "vs." case name format */
const V_CASE_NAME_REGEX =
  /([A-Z][A-Za-z0-9\s.,'&()/-]+?)\s+v(?:s)?\.?\s+([A-Za-z0-9\s.,'&()/-]+?)\s*,\s*$/

/** Procedural prefix case name format */
const PROCEDURAL_PREFIX_REGEX =
  /\b(In re|Ex parte|Matter of|Estate of|State ex rel\.|United States ex rel\.|Application of|Petition of)\s+([A-Za-z0-9\s.,'&()/-]+?)\s*,\s*$/i

/**
 * Strips date components (month, day, year) from parenthetical content
 * to isolate the court abbreviation.
 * E.g., "2d Cir. Jan. 15, 2020" → "2d Cir."
 *        "C.D. Cal. Feb. 9, 2015" → "C.D. Cal."
 *        "D. Mass. Mar. 2020" → "D. Mass."
 *        "D. Mass. 1/15/2020" → "D. Mass."
 */
function stripDateFromCourt(content: string): string | undefined {
  // Strip trailing numeric date format first (1/15/2020)
  let court = content.replace(/\s*\d{1,2}\/\d{1,2}\/\d{4}\s*$/, "").trim()
  // Strip trailing year
  court = court.replace(/\s*\d{4}\s*$/, "").trim()
  // Strip trailing date components: optional day+comma, month abbreviation or full name
  court = court.replace(/\s*,?\s*\d{1,2}\s*,?\s*$/, "").trim()
  court = court.replace(new RegExp(`\\s*${MONTH_PATTERN.source}\\s*$`, "i"), "").trim()
  // Strip any trailing commas left over
  court = court.replace(/,\s*$/, "").trim()
  return court && /[A-Za-z]/.test(court) ? court : undefined
}

/**
 * Extract case name via backward search from citation core.
 * Looks for "v." pattern or procedural prefixes (In re, Ex parte, Matter of).
 *
 * @param cleanedText - Full cleaned text
 * @param coreStart - Position where citation core begins (volume start)
 * @param maxLookback - Maximum characters to search backward (default 150)
 * @returns Case name and start position, or undefined if not found
 *
 * @example
 * ```typescript
 * extractCaseName(text, 20, 150)
 * // Returns: { caseName: "Smith v. Jones", nameStart: 0 }
 * ```
 */
function extractCaseName(
  cleanedText: string,
  coreStart: number,
  maxLookback = 150,
): { caseName: string; nameStart: number } | undefined {
  const searchStart = Math.max(0, coreStart - maxLookback)
  let precedingText = cleanedText.substring(searchStart, coreStart)
  let adjustedSearchStart = searchStart

  // Split at last sentence boundary to avoid crossing citation boundaries
  // Find last occurrence of digit-period-space pattern (end of reporter page like "10. Jones")
  // This is more specific than generic ". [A-Z]" which would match "v." or "United States v."
  let lastBoundaryIndex = -1
  let match: RegExpExecArray | null
  while ((match = CITATION_BOUNDARY_REGEX.exec(precedingText)) !== null) {
    lastBoundaryIndex = match.index + match[0].length
  }

  if (lastBoundaryIndex !== -1) {
    precedingText = precedingText.substring(lastBoundaryIndex)
    adjustedSearchStart = searchStart + lastBoundaryIndex
  }

  // Priority 1: Standard "v." or "vs." format with comma before citation
  // Match party names with letters, numbers (for "Doe No. 2"), periods, apostrophes, ampersands, hyphens, slashes
  const vMatch = V_CASE_NAME_REGEX.exec(precedingText)
  if (vMatch) {
    // Check for semicolon in matched text (multi-citation separator)
    if (!vMatch[0].includes(";")) {
      const caseName = `${vMatch[1].trim()} v. ${vMatch[2].trim()}`
      const nameStart = adjustedSearchStart + vMatch.index
      return { caseName, nameStart }
    }
  }

  // Priority 2: Procedural prefixes (including Estate of)
  const procMatch = PROCEDURAL_PREFIX_REGEX.exec(precedingText)
  if (procMatch) {
    // Check for semicolon in matched text (multi-citation separator)
    if (!procMatch[0].includes(";")) {
      const caseName = `${procMatch[1]} ${procMatch[2].trim()}`
      const nameStart = adjustedSearchStart + procMatch.index
      return { caseName, nameStart }
    }
  }

  return undefined
}

/** A raw parenthetical block extracted from text */
interface RawParenthetical {
  /** Content between the parentheses (excluding parens themselves) */
  text: string
  /** Position of opening '(' in the text */
  start: number
  /** Position after closing ')' in the text (exclusive) */
  end: number
}

/** A subsequent history signal found between parenthetical groups */
interface RawSignal {
  /** Raw signal text (e.g., "aff'd", "cert. denied") */
  text: string
  /** Position of signal start in the text */
  start: number
  /** Position after signal end (exclusive) */
  end: number
}

/** Result of collecting parentheticals with signal awareness */
interface CollectedParentheticals {
  /** All parenthetical blocks in order */
  parens: RawParenthetical[]
  /** Signals found between groups, each paired with the index of the next paren */
  signals: Array<{ signal: RawSignal; nextParenIndex: number }>
}

/**
 * Collect all top-level parenthetical blocks starting from a position.
 * Uses depth tracking to handle nested parens. Continues scanning through
 * chained parentheticals and subsequent history signals.
 *
 * @param text - Full text to scan
 * @param startPos - Position to start scanning (typically after citation core)
 * @param maxLookahead - Maximum characters to scan forward (default 500)
 * @returns Collected parentheticals with associated signals
 */
function collectParentheticals(
  text: string,
  startPos: number,
  maxLookahead = 500,
): CollectedParentheticals {
  const parens: RawParenthetical[] = []
  const signals: CollectedParentheticals["signals"] = []
  let pos = startPos
  const endLimit = Math.min(text.length, startPos + maxLookahead)
  let pendingSignal: RawSignal | undefined

  while (pos < endLimit) {
    // Skip whitespace and commas between parentheticals
    while (pos < endLimit && PAREN_SKIP_REGEX.test(text[pos])) {
      pos++
    }

    if (pos >= endLimit || text[pos] !== "(") {
      // Check for subsequent history signal before giving up
      const remainingText = text.substring(pos, endLimit)
      const signalMatch = HISTORY_SIGNAL_REGEX.exec(remainingText)
      if (signalMatch) {
        pendingSignal = {
          text: signalMatch[0].replace(/\s+$/, ""),
          start: pos,
          end: pos + signalMatch[0].length,
        }
        pos += signalMatch[0].length
        continue
      }
      break
    }

    // Found opening paren — track depth to find matching close
    const parenStart = pos
    let depth = 0
    const contentStart = pos + 1

    while (pos < endLimit) {
      const char = text[pos]
      if (char === "(") {
        depth++
      } else if (char === ")") {
        depth--
        if (depth === 0) {
          pos++ // move past closing paren
          const content = text.substring(contentStart, pos - 1).trim()
          if (content.length > 0) {
            parens.push({ text: content, start: parenStart, end: pos })
            // If there was a pending signal, associate it with this paren
            if (pendingSignal) {
              signals.push({ signal: pendingSignal, nextParenIndex: parens.length - 1 })
              pendingSignal = undefined
            }
          }
          break
        }
      }
      pos++
    }

    // If we never closed the paren, stop
    if (depth > 0) break
  }

  // Handle trailing signal with no following paren
  if (pendingSignal) {
    signals.push({ signal: pendingSignal, nextParenIndex: -1 })
  }

  return { parens, signals }
}

/**
 * Parse parenthetical content to extract court, year, date, and disposition.
 * Unified parser replacing the old year-only logic.
 *
 * @param content - Parenthetical content (without the parens themselves)
 * @returns Structured parenthetical data
 *
 * @example
 * ```typescript
 * parseParenthetical("9th Cir. 2020")
 * // Returns: { court: "9th Cir.", year: 2020, date: { iso: "2020", parsed: { year: 2020 } } }
 *
 * parseParenthetical("2d Cir. Jan. 15, 2020")
 * // Returns: { court: "2d Cir.", year: 2020, date: { iso: "2020-01-15", parsed: { year: 2020, month: 1, day: 15 } } }
 *
 * parseParenthetical("en banc")
 * // Returns: { disposition: "en banc" }
 * ```
 */
function parseParenthetical(content: string): {
  court?: string
  year?: number
  date?: StructuredDate
  disposition?: string
} {
  const result: {
    court?: string
    year?: number
    date?: StructuredDate
    disposition?: string
  } = {}

  // Parse structured date using dates.ts
  const dateResult = parseDate(content)
  if (dateResult) {
    result.date = dateResult
    result.year = dateResult.parsed.year
  }

  // Extract court (strips date components)
  const courtResult = stripDateFromCourt(content)
  if (courtResult) {
    result.court = courtResult
  }

  // Check for disposition
  if (/\ben banc\b/i.test(content)) {
    result.disposition = "en banc"
  } else if (/\bper curiam\b/i.test(content)) {
    result.disposition = "per curiam"
  }

  return result
}

/**
 * Classify a raw parenthetical block as metadata or explanatory.
 *
 * @param raw - Raw parenthetical text (content between parens)
 * @returns Classification result with kind discriminator
 */
function classifyParenthetical(raw: string): {
  kind: "metadata"
  court?: string
  year?: number
  date?: StructuredDate
  disposition?: string
} | {
  kind: "explanatory"
  text: string
  type: ParentheticalType
} {
  // Check for signal word first — signal-word parens are always explanatory
  const leadingMatch = LEADING_WORD_REGEX.exec(raw)
  if (leadingMatch) {
    const candidate = leadingMatch[1].toLowerCase()
    if (isSignalWord(candidate)) {
      return { kind: "explanatory", text: raw, type: candidate }
    }
  }

  // Try metadata parse: court, year, date, disposition
  // Note: "other"-type parens with embedded years (e.g., "the court, in 2019, held X")
  // will be classified as metadata. This is a known limitation — most explanatory
  // parentheticals start with a signal word and are handled above.
  // Note: meta.court alone is insufficient — stripDateFromCourt returns any
  // text with letters as a "court", so a standalone court-only second paren
  // like "(9th Cir.)" will fall through to "other". This is acceptable since
  // court-only parens without year/date are extremely rare in legal text.
  const meta = parseParenthetical(raw)
  if (meta.year || meta.date || meta.disposition) {
    return { kind: "metadata", ...meta }
  }

  // No signal word and no metadata — classify as "other" explanatory
  return { kind: "explanatory", text: raw, type: "other" }
}

/**
 * Normalize party name for matching by removing legal noise.
 * Normalization pipeline:
 * 1. Strip "et al." (case-insensitive)
 * 2. Strip "d/b/a" and everything after (case-insensitive)
 * 3. Strip "aka" and everything after (case-insensitive, word boundary)
 * 4. Strip trailing corporate suffixes (Inc., LLC, Corp., Ltd., Co., LLP, LP, P.C.) - iterative
 * 5. Strip leading articles (The, A, An)
 * 6. Normalize whitespace
 * 7. Trim and lowercase
 *
 * @param name - Raw party name
 * @returns Normalized party name
 *
 * @example
 * ```typescript
 * normalizePartyName("The Smith Corp., Inc.") // "smith"
 * normalizePartyName("Doe et al.") // "doe"
 * normalizePartyName("United States") // "united states" (not stripped)
 * ```
 */
function normalizePartyName(name: string): string {
  let normalized = name

  // Strip "et al." (with or without period, case-insensitive)
  normalized = normalized.replace(/\bet\s+al\.?/gi, "")

  // Strip "d/b/a" and everything after it (case-insensitive)
  normalized = normalized.replace(/\s+d\/b\/a\b.*/gi, "")

  // Strip "aka" and everything after it (case-insensitive, word boundary)
  normalized = normalized.replace(/\s+aka\b.*/gi, "")

  // Strip trailing corporate suffixes (with or without trailing period, handle comma)
  // Repeat to handle multiple suffixes like "Corp., Inc."
  let prev = ""
  while (prev !== normalized) {
    prev = normalized
    normalized = normalized.replace(/,?\s*(Inc|LLC|Corp|Ltd|Co|LLP|LP|P\.C)\.?$/gi, "")
  }

  // Strip leading articles (only at start)
  normalized = normalized.replace(/^(The|A|An)\s+/i, "")

  // Normalize whitespace (collapse multiple spaces)
  normalized = normalized.replace(/\s+/g, " ")

  // Trim and lowercase
  return normalized.trim().toLowerCase()
}

/**
 * Extract plaintiff and defendant party names from case name.
 * Handles adversarial cases (v.) and procedural prefixes (In re, Ex parte, etc.).
 *
 * @param caseName - Case name string
 * @returns Party name data with raw and normalized fields
 *
 * @example
 * ```typescript
 * extractPartyNames("Smith v. Jones")
 * // Returns: { plaintiff: "Smith", plaintiffNormalized: "smith", defendant: "Jones", defendantNormalized: "jones" }
 *
 * extractPartyNames("In re Smith")
 * // Returns: { plaintiff: "In re Smith", plaintiffNormalized: "smith", proceduralPrefix: "In re" }
 *
 * extractPartyNames("People v. Smith")
 * // Returns: { plaintiff: "People", plaintiffNormalized: "people", defendant: "Smith", defendantNormalized: "smith" }
 * ```
 */
function extractPartyNames(caseName: string): {
  plaintiff?: string
  plaintiffNormalized?: string
  defendant?: string
  defendantNormalized?: string
  proceduralPrefix?: string
} {
  // Procedural prefix patterns (anchored to start, case-insensitive)
  const proceduralPrefixes = [
    "In re",
    "Ex parte",
    "Matter of",
    "State ex rel.",
    "United States ex rel.",
    "Application of",
    "Petition of",
    "Estate of",
  ]

  // Check for procedural prefix first
  for (const prefix of proceduralPrefixes) {
    const prefixRegex = new RegExp(`^(${prefix})\\s+(.+)$`, "i")
    const match = prefixRegex.exec(caseName)
    if (match) {
      const matchedPrefix = match[1]
      const subject = match[2]

      // Check if there's a "v." after the prefix (adversarial case)
      if (/\s+v\.?\s+/i.test(subject)) {
        // Adversarial case with procedural-looking plaintiff (e.g., "Estate of X v. Y")
        // Split on "v."
        const vMatch = /^(.+?)\s+v\.?\s+(.+)$/i.exec(caseName)
        if (vMatch) {
          const plaintiff = vMatch[1].trim()
          const defendant = vMatch[2].trim()
          return {
            plaintiff,
            plaintiffNormalized: normalizePartyName(plaintiff),
            defendant,
            defendantNormalized: normalizePartyName(defendant),
          }
        }
      } else {
        // Pure procedural (no "v.")
        return {
          plaintiff: caseName,
          plaintiffNormalized: normalizePartyName(subject),
          proceduralPrefix: matchedPrefix,
        }
      }
    }
  }

  // Split on "v." for adversarial cases
  const vRegex = /^(.+?)\s+v\.?\s+(.+)$/i
  const vMatch = vRegex.exec(caseName)
  if (vMatch) {
    let plaintiff = vMatch[1].trim()
    const defendant = vMatch[2].trim()

    // Strip signal words from plaintiff (e.g., "In Smith" → "Smith", "See Jones" → "Jones")
    // Preserve "In re" which is a procedural prefix, not a signal word
    plaintiff = plaintiff
      .replace(/^(?:In(?!\s+re\b)|See(?:\s+[Aa]lso)?|Compare|But(?:\s+[Ss]ee)?|Cf\.?|Also)\s+/i, "")
      .trim()

    return {
      plaintiff: plaintiff || vMatch[1].trim(), // Fallback to original if strip leaves nothing
      plaintiffNormalized: normalizePartyName(plaintiff || vMatch[1].trim()),
      defendant,
      defendantNormalized: normalizePartyName(defendant),
    }
  }

  // No "v." and no procedural prefix - no parties extracted
  return {}
}

/**
 * Extracts case citation metadata from a tokenized citation.
 *
 * Parses token text to extract:
 * - Volume: Leading digits (e.g., "500" from "500 F.2d 123")
 * - Reporter: Alphabetic abbreviation (e.g., "F.2d")
 * - Page: Trailing digits after reporter (e.g., "123")
 * - Pincite: Optional page reference after comma (e.g., ", 125")
 * - Court: Optional court abbreviation in parentheses (e.g., "(9th Cir.)")
 * - Year: Optional year in parentheses (e.g., "(2020)")
 *
 * Confidence scoring:
 * - Base: 0.5
 * - Common reporter pattern (F., U.S., etc.): +0.3
 * - Valid year (not future): +0.2
 * - Capped at 1.0
 *
 * Position translation:
 * - Uses TransformationMap to convert clean positions → original positions
 * - cleanStart/cleanEnd from token span
 * - originalStart/originalEnd via transformationMap.cleanToOriginal
 *
 * Note: This function does NOT validate against reporters-db. That happens
 * in Phase 3 (resolution layer). Phase 2 extraction only parses structure.
 *
 * @param token - Token from tokenizer containing matched text and clean positions
 * @param transformationMap - Position mapping from clean → original text
 * @returns FullCaseCitation with parsed metadata and translated positions
 *
 * @example
 * ```typescript
 * const token = {
 *   text: "500 F.2d 123, 125",
 *   span: { cleanStart: 10, cleanEnd: 27 },
 *   type: "case",
 *   patternId: "federal-reporter"
 * }
 * const citation = extractCase(token, transformationMap)
 * // citation = {
 * //   type: "case",
 * //   text: "500 F.2d 123, 125",
 * //   volume: 500,
 * //   reporter: "F.2d",
 * //   page: 123,
 * //   pincite: 125,
 * //   span: { cleanStart: 10, cleanEnd: 27, originalStart: 10, originalEnd: 27 },
 * //   confidence: 0.8,
 * //   ...
 * // }
 * ```
 */
export function extractCase(
  token: Token,
  transformationMap: TransformationMap,
  cleanedText?: string,
): FullCaseCitation {
  const { text, span } = token

  // Parse volume-reporter-page using regex
  // Pattern: volume (digits) + reporter (letters/periods/spaces/numbers) + page (digits or blank placeholder)
  // Use greedy matching for reporter to capture full abbreviation including spaces
  const match = VOLUME_REPORTER_PAGE_REGEX.exec(text)

  if (!match) {
    // Fallback if pattern doesn't match (shouldn't happen if tokenizer is correct)
    throw new Error(`Failed to parse case citation: ${text}`)
  }

  const volume = parseVolume(match[1])
  const reporter = match[2].trim()

  // Check if page is a blank placeholder
  const pageStr = match[3]
  const isBlankPage = BLANK_PAGE_REGEX.test(pageStr)
  const page = isBlankPage ? undefined : Number.parseInt(pageStr, 10)
  const hasBlankPage = isBlankPage ? true : undefined

  // Extract optional pincite (page reference after comma)
  // Pattern: ", digits" (e.g., ", 125")
  const pinciteMatch = PINCITE_REGEX.exec(text)
  let pincite = pinciteMatch ? Number.parseInt(pinciteMatch[1], 10) : undefined

  // Initialize Phase 6 fields
  let year: number | undefined
  let court: string | undefined
  let date: StructuredDate | undefined
  let disposition: string | undefined
  let caseName: string | undefined
  let fullSpan: Span | undefined

  // Extract parenthetical from token text
  let parentheticalContent: string | undefined
  // Match any parenthetical (with or without letters)
  const parenMatch = PAREN_REGEX.exec(text)
  if (parenMatch) {
    parentheticalContent = parenMatch[1]
    // Parse parenthetical using unified parser
    const parenResult = parseParenthetical(parentheticalContent)
    year = parenResult.year
    court = parenResult.court
    date = parenResult.date
    disposition = parenResult.disposition
  }

  // Look ahead in cleaned text for parenthetical after the token
  // Tokenization patterns only capture volume-reporter-page, so parentheticals
  // like "(1989)" or "(9th Cir. 2020)" are not in the token text.
  if (cleanedText && !parentheticalContent) {
    const afterToken = cleanedText.substring(span.cleanEnd)
    const lookAheadMatch = LOOKAHEAD_PAREN_REGEX.exec(afterToken)
    if (lookAheadMatch) {
      parentheticalContent = lookAheadMatch[1]
      // Parse parenthetical using unified parser
      const parenResult = parseParenthetical(parentheticalContent)
      year = parenResult.year
      court = parenResult.court
      date = parenResult.date
      disposition = parenResult.disposition

      // Extract pincite from look-ahead if not already found in token text
      if (pincite === undefined) {
        const laPinciteMatch = LOOKAHEAD_PINCITE_REGEX.exec(afterToken)
        if (laPinciteMatch) {
          pincite = Number.parseInt(laPinciteMatch[1], 10)
        }
      }
    }
  }

  // Classify chained parentheticals: extract disposition and explanatory content
  let parentheticals: Parenthetical[] | undefined
  let allParens: RawParenthetical[] | undefined
  let collected: CollectedParentheticals | undefined
  if (cleanedText) {
    collected = collectParentheticals(cleanedText, span.cleanEnd)
    allParens = collected.parens
    // Skip first paren (already parsed above as court/year)
    const remaining = parentheticalContent ? allParens.slice(1) : allParens
    for (const raw of remaining) {
      const classified = classifyParenthetical(raw.text)
      if (classified.kind === "metadata") {
        // Accept court from later metadata parens if we don't have a real one.
        // The primary parse can set court to the disposition text (e.g., "en banc")
        // as a side effect of stripDateFromCourt, so treat that as unset.
        if (classified.court && (!court || court === disposition)) {
          court = classified.court
        }
        if (classified.year && !year) {
          year = classified.year
          date = classified.date
        }
        if (classified.disposition && !disposition) {
          disposition = classified.disposition
        }
      } else {
        parentheticals ??= []
        parentheticals.push({ text: classified.text, type: classified.type })
      }
    }
  }

  // Build subsequentHistoryEntries from captured signals
  let subsequentHistoryEntries: SubsequentHistoryEntry[] | undefined
  if (cleanedText && collected && collected.signals.length > 0) {
    for (let i = 0; i < collected.signals.length; i++) {
      const { signal: rawSig } = collected.signals[i]
      const normalized = normalizeSignal(rawSig.text)
      if (normalized) {
        subsequentHistoryEntries ??= []
        const { originalStart: sigOrigStart, originalEnd: sigOrigEnd } = resolveOriginalSpan(
          { cleanStart: rawSig.start, cleanEnd: rawSig.end },
          transformationMap,
        )
        subsequentHistoryEntries.push({
          signal: normalized.signal,
          rawSignal: rawSig.text,
          signalSpan: {
            cleanStart: rawSig.start,
            cleanEnd: rawSig.end,
            originalStart: sigOrigStart,
            originalEnd: sigOrigEnd,
          },
          order: i,
        })
      }
    }
  }

  // Infer court level/jurisdiction from reporter series
  const inferredCourt = inferCourtFromReporter(reporter)

  // Backward compat: set court string for SCOTUS when not already extracted
  if (!court && inferredCourt?.level === "supreme" && inferredCourt?.jurisdiction === "federal") {
    court = "scotus"
  }

  // Phase 6: Extract case name via backward search
  if (cleanedText) {
    const caseNameResult = extractCaseName(cleanedText, span.cleanStart)
    if (caseNameResult) {
      caseName = caseNameResult.caseName

      // Calculate fullSpan: case name start through parenthetical end
      // Reuse allParens from classify loop to avoid scanning twice
      const parenEnd = allParens && allParens.length > 0
        ? allParens[allParens.length - 1].end
        : span.cleanEnd
      const fullCleanStart = caseNameResult.nameStart
      const fullCleanEnd = parenEnd

      // Translate to original positions
      const fullOriginalStart =
        transformationMap.cleanToOriginal.get(fullCleanStart) ?? fullCleanStart
      const fullOriginalEnd = transformationMap.cleanToOriginal.get(fullCleanEnd) ?? fullCleanEnd

      fullSpan = {
        cleanStart: fullCleanStart,
        cleanEnd: fullCleanEnd,
        originalStart: fullOriginalStart,
        originalEnd: fullOriginalEnd,
      }
    }
  }

  // Phase 7: Extract party names from case name
  let plaintiff: string | undefined
  let plaintiffNormalized: string | undefined
  let defendant: string | undefined
  let defendantNormalized: string | undefined
  let proceduralPrefix: string | undefined

  if (caseName) {
    const partyResult = extractPartyNames(caseName)
    plaintiff = partyResult.plaintiff
    plaintiffNormalized = partyResult.plaintiffNormalized
    defendant = partyResult.defendant
    defendantNormalized = partyResult.defendantNormalized
    proceduralPrefix = partyResult.proceduralPrefix
  }

  // Translate positions from clean → original (citation core only - span unchanged)
  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  // Calculate confidence score
  let confidence = 0.5 // Base confidence

  // Common reporter patterns (F., U.S., S. Ct., etc.)
  const commonReporters = [
    "F.",
    "F.2d",
    "F.3d",
    "F.4th",
    "U.S.",
    "S. Ct.",
    "L. Ed.",
    "P.",
    "P.2d",
    "P.3d",
    "A.",
    "A.2d",
    "A.3d",
    "N.E.",
    "N.E.2d",
    "N.E.3d",
    "N.W.",
    "N.W.2d",
    "S.E.",
    "S.E.2d",
    "S.W.",
    "S.W.2d",
    "S.W.3d",
    "So.",
    "So. 2d",
    "So. 3d",
  ]

  if (commonReporters.some((r) => reporter.includes(r))) {
    confidence += 0.3
  }

  // Valid year check (not in future)
  if (year !== undefined) {
    const currentYear = new Date().getFullYear()
    if (year <= currentYear) {
      confidence += 0.2
    }
  }

  // Cap at 1.0
  confidence = Math.min(confidence, 1.0)

  // Override confidence for blank page citations
  if (hasBlankPage) {
    confidence = 0.8
  }

  return {
    type: "case",
    text,
    span: {
      cleanStart: span.cleanStart,
      cleanEnd: span.cleanEnd,
      originalStart,
      originalEnd,
    },
    confidence,
    matchedText: text,
    processTimeMs: 0, // Placeholder - timing handled by orchestration layer
    patternsChecked: 1, // Single token processed
    volume,
    reporter,
    page,
    pincite,
    court,
    year,
    hasBlankPage,
    date,
    fullSpan,
    caseName,
    disposition,
    parentheticals,
    subsequentHistoryEntries,
    plaintiff,
    plaintiffNormalized,
    defendant,
    defendantNormalized,
    proceduralPrefix,
    inferredCourt,
  }
}
