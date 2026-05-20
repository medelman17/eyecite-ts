/**
 * Constitutional Citation Extraction
 *
 * Parses tokenized constitutional citations to extract jurisdiction,
 * article/amendment, section, and clause fields.
 *
 * Dispatch by patternId:
 * - "us-constitution" → jurisdiction: "US"
 * - "state-constitution" → jurisdiction mapped from state abbreviation
 * - "bare-constitution" → jurisdiction: undefined
 *
 * @module extract/extractConstitutional
 */

import { CONSTITUTIONAL_BODY_RE } from "@/patterns/constitutionalPatterns"
import type { Token } from "@/tokenize"
import type { ConstitutionalCitation } from "@/types/citation"
import type { ConstitutionalComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"

/**
 * Roman numeral lookup table (I–XXVII).
 * Covers all U.S. constitutional articles (I–VII) and amendments (I–XXVII).
 */
const ROMAN_TO_INT: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  VIII: 8,
  IX: 9,
  X: 10,
  XI: 11,
  XII: 12,
  XIII: 13,
  XIV: 14,
  XV: 15,
  XVI: 16,
  XVII: 17,
  XVIII: 18,
  XIX: 19,
  XX: 20,
  XXI: 21,
  XXII: 22,
  XXIII: 23,
  XXIV: 24,
  XXV: 25,
  XXVI: 26,
  XXVII: 27,
}

/**
 * Lookup table for word-form amendment ordinals (#534).
 * Both unit forms (`First`..`Twentieth`) and compound forms
 * (`Twenty-First`..`Twenty-Seventh`) are supported in either
 * hyphenated or space-separated style.
 */
const WORD_ORDINAL_TO_INT: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10,
  eleventh: 11,
  twelfth: 12,
  thirteenth: 13,
  fourteenth: 14,
  fifteenth: 15,
  sixteenth: 16,
  seventeenth: 17,
  eighteenth: 18,
  nineteenth: 19,
  twentieth: 20,
  "twenty-first": 21,
  "twenty-second": 22,
  "twenty-third": 23,
  "twenty-fourth": 24,
  "twenty-fifth": 25,
  "twenty-sixth": 26,
  "twenty-seventh": 27,
}

/**
 * Parse any supported numeral form (Roman, Arabic, ordinal abbreviation
 * `5th` / `14th`, word form `Fifth` / `Twenty-Seventh`) to an integer.
 * Returns undefined when the input is unrecognized.
 */
function parseNumeral(raw: string): number | undefined {
  if (!raw) return undefined
  const trimmed = raw.trim()
  // Word-form ordinals (case-insensitive; hyphen or space between parts)
  const wordKey = trimmed.toLowerCase().replace(/\s+/g, "-")
  if (wordKey in WORD_ORDINAL_TO_INT) return WORD_ORDINAL_TO_INT[wordKey]

  // Ordinal abbreviation: strip the trailing letters (`5th` → `5`)
  const ordinalMatch = /^(\d+)(?:st|nd|rd|th)$/i.exec(trimmed)
  if (ordinalMatch) return Number.parseInt(ordinalMatch[1], 10)

  // Roman numerals
  const upper = trimmed.toUpperCase()
  if (upper in ROMAN_TO_INT) return ROMAN_TO_INT[upper]

  // Plain Arabic numerals
  const n = Number.parseInt(trimmed, 10)
  return Number.isNaN(n) ? undefined : n
}

/**
 * State abbreviation → 2-letter code mapping.
 * Keys are lowercase abbreviation stems (without trailing period).
 */
const STATE_ABBREV_TO_CODE: Record<string, string> = {
  ala: "AL",
  alaska: "AK",
  ariz: "AZ",
  ark: "AR",
  cal: "CA",
  calif: "CA",
  colo: "CO",
  conn: "CT",
  del: "DE",
  fla: "FL",
  ga: "GA",
  haw: "HI",
  idaho: "ID",
  ill: "IL",
  ind: "IN",
  iowa: "IA",
  kan: "KS",
  ky: "KY",
  la: "LA",
  me: "ME",
  md: "MD",
  mass: "MA",
  mich: "MI",
  minn: "MN",
  miss: "MS",
  mo: "MO",
  mont: "MT",
  neb: "NE",
  nev: "NV",
  "n.h": "NH",
  "n.j": "NJ",
  "n.m": "NM",
  "n.y": "NY",
  "n.c": "NC",
  "n.d": "ND",
  ohio: "OH",
  okla: "OK",
  or: "OR",
  ore: "OR",
  pa: "PA",
  "r.i": "RI",
  "s.c": "SC",
  "s.d": "SD",
  tenn: "TN",
  tex: "TX",
  utah: "UT",
  vt: "VT",
  va: "VA",
  wash: "WA",
  "w.va": "WV",
  wis: "WI",
  wyo: "WY",
}

const IS_AMENDMENT_RE = /amend|amdt/i

/**
 * Regex to extract the state abbreviation prefix from state-constitution tokens.
 *
 * Trailing `\.?\s*Const` (rather than `\.?\s+Const`) accepts both the
 * canonical spaced form (`Pa. Const.`) and the abbreviated no-space form
 * (`Pa.Const.`, `N.Y.Const.`) introduced in #329. The greedy `[A-Za-z]+`
 * still backtracks correctly so the prefix capture stops at the state
 * abbreviation rather than swallowing `Const`.
 */
const STATE_PREFIX_RE = /^([A-Za-z]+(?:\.\s*[A-Za-z]+)?(?:\.\s*[A-Za-z]+)?)\.?\s*Const/i

/**
 * Resolve state abbreviation from token text to 2-letter code.
 */
function resolveStateJurisdiction(text: string): string | undefined {
  const prefixMatch = STATE_PREFIX_RE.exec(text)
  if (!prefixMatch) return undefined

  // Normalize: collapse spaces, lowercase, remove trailing dots
  const raw = prefixMatch[1].replace(/\s+/g, "").replace(/\.$/g, "").toLowerCase()

  if (raw in STATE_ABBREV_TO_CODE) return STATE_ABBREV_TO_CODE[raw]

  return undefined
}

/**
 * Extract a constitutional citation from a tokenized match.
 *
 * @param token - Tokenized citation candidate from the tokenizer
 * @param transformationMap - Maps cleaned text positions to original text positions
 * @returns Parsed constitutional citation with structured fields
 */
export function extractConstitutional(
  token: Token,
  transformationMap: TransformationMap,
): ConstitutionalCitation {
  const { text, span } = token

  const bodyMatch = CONSTITUTIONAL_BODY_RE.exec(text)

  let article: number | undefined
  let amendment: number | undefined
  let section: string | undefined
  let clause: number | undefined

  // BODY_TAIL groups (#534 — added inverse-shape `5th Amend.` branch):
  //   1: numeral (canonical `art./amend. <numeral>` branch)
  //   2: ordinal (inverse `<ordinal> amend.` branch)
  //   3: section
  //   4: clause
  // Exactly one of group 1 or group 2 is populated per match.
  if (bodyMatch) {
    const numeralText = bodyMatch[1] ?? bodyMatch[2]
    const numeral = parseNumeral(numeralText)
    const isInverseShape = bodyMatch[2] !== undefined
    const isAmendment = isInverseShape || IS_AMENDMENT_RE.test(bodyMatch[0])

    if (isAmendment) {
      amendment = numeral
    } else {
      article = numeral
    }

    section = bodyMatch[3] || undefined
    clause = bodyMatch[4] ? Number.parseInt(bodyMatch[4], 10) : undefined
  }

  let jurisdiction: string | undefined
  switch (token.patternId) {
    case "us-constitution":
      jurisdiction = "US"
      break
    case "state-constitution":
      jurisdiction = resolveStateJurisdiction(text)
      break
    default:
      jurisdiction = undefined
      break
  }

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  let confidence: number
  if (token.patternId === "bare-article" || token.patternId === "bare-amendment-word") {
    // #534: bare ordinal-prefix amendment forms lack the `Const.` anchor
    // so confidence matches `bare-article`. Downstream consumers can
    // filter low-confidence matches when stricter precision is needed.
    confidence = 0.5
  } else if (token.patternId === "bare-constitution") {
    confidence = 0.7
  } else if (section) {
    confidence = 0.95
  } else {
    confidence = 0.9
  }

  // The section regex may greedily consume a sentence-terminating period ("§ 1.")
  const matchedText = text.endsWith(".") ? text.slice(0, -1) : text

  // Build component spans
  const spans: ConstitutionalComponentSpans = {}

  // Jurisdiction span: find the jurisdiction text in the token
  if (jurisdiction === "US") {
    const usIdx = text.indexOf("U.S.")
    if (usIdx !== -1) {
      spans.jurisdiction = spanFromGroupIndex(span.cleanStart, [usIdx, usIdx + 4], transformationMap)
    }
  } else if (jurisdiction && token.patternId === "state-constitution") {
    // State prefix is at the start of the token text
    const prefixMatch = STATE_PREFIX_RE.exec(text)
    if (prefixMatch) {
      // The prefix is the abbreviation stem; add 1 for the trailing period
      const prefixEnd = prefixMatch[1].length + 1
      spans.jurisdiction = spanFromGroupIndex(span.cleanStart, [0, prefixEnd], transformationMap)
    }
  }

  // Body match groups for article/amendment, section, clause.
  // bodyMatch.indices[n] gives positions relative to the full token text.
  // Group layout (see comment in body parser above):
  //   1: numeral (canonical) — present for article OR canonical amendment
  //   2: ordinal (inverse) — present only for ordinal-prefix amendments
  //   3: section
  //   4: clause
  if (bodyMatch?.indices) {
    const numeralIdx = bodyMatch.indices[1] ?? bodyMatch.indices[2]
    const isInverseShape = bodyMatch[2] !== undefined
    const isAmendment = isInverseShape || IS_AMENDMENT_RE.test(bodyMatch[0])
    if (numeralIdx) {
      const targetSpan = spanFromGroupIndex(span.cleanStart, numeralIdx, transformationMap)
      if (isAmendment) {
        spans.amendment = targetSpan
      } else {
        spans.article = targetSpan
      }
    }
    if (bodyMatch.indices[3]) {
      spans.section = spanFromGroupIndex(span.cleanStart, bodyMatch.indices[3], transformationMap)
    }
    if (bodyMatch.indices[4]) {
      spans.clause = spanFromGroupIndex(span.cleanStart, bodyMatch.indices[4], transformationMap)
    }
  }

  return {
    type: "constitutional",
    text,
    span: {
      cleanStart: span.cleanStart,
      cleanEnd: span.cleanEnd,
      originalStart,
      originalEnd,
    },
    confidence,
    matchedText,
    processTimeMs: 0,
    patternsChecked: 1,
    jurisdiction,
    article,
    amendment,
    section,
    clause,
    spans,
  }
}
