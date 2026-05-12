/**
 * Short-form Citation Extraction
 *
 * Parses tokenized short-form citations (Id., supra, short-form case) to extract
 * metadata. Short-form citations refer to earlier citations in the document.
 *
 * @module extract/extractShortForms
 */

import type { Token } from "@/tokenize"
import type { IdCitation, ShortFormCaseCitation, SupraCitation } from "@/types/citation"
import type {
  IdComponentSpans,
  ShortFormCaseComponentSpans,
  SupraComponentSpans,
} from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { COMMON_REPORTERS } from "./extractCase"
import { parsePincite, type PinciteInfo } from "./pincite"

/**
 * Strip leading citation signals (`See`, `See also`, `Cf.`, `Compare`,
 * `Accord`, `But see`, `But cf.`, `E.g.`) and sentence-initial connectors
 * (`Also`, `Then`, `In` (but never `In re`)) from a captured supra party name.
 *
 * The `SUPRA_PATTERN` tokenizer is greedy with leading capitalized words, so
 * `See Gall, supra` produces `partyName = "See Gall"` and prevents the
 * resolver from matching the supra to its `Gall v. Colon-Sylvain` antecedent.
 * The `In(?!\s+re\b)` negative lookahead preserves `In re Smith` — only the
 * bare `In` directly preceding a proper-name party gets stripped (#216).
 *
 * The original captured name is returned unchanged when stripping would leave
 * an empty string (defensive: prevents a wholesale signal token from blanking
 * out the party name).
 */
const SUPRA_PARTY_PREFIX_REGEX =
  /^(?:But\s+(?:see|cf\.?)|See(?:\s+also)?(?:\s*,\s*e\.\s*g\.?)?|Compare|Cf\.?|Accord|E\.\s*g\.?|Also|In(?!\s+re\b)|Then)\s+/i

function stripSupraPartyPrefix(raw: string): string {
  const stripped = raw.replace(SUPRA_PARTY_PREFIX_REGEX, "").trim()
  return stripped.length > 0 ? stripped : raw
}

/**
 * Trailing-parenthetical lookahead for short-form citations (#303).
 *
 * Captures content of a single `(...)` parenthetical immediately after the
 * citation core, allowing optional whitespace/comma between. The body uses
 * `[^()]*` (no nesting) — `parenthetical` is the raw text inside one set of
 * parens. Suitable for `Id. at N (Marsh)`, `Id. (citation omitted)`,
 * `Smith, supra (holding that ...)`, `Smith, 500 F.2d at 125 (citations omitted)`.
 */
const TRAILING_PAREN_REGEX = /^[\s,]*\(([^()]*)\)/

/**
 * Scan the cleaned text after a short-form citation's span end for an
 * immediately-trailing `(...)` parenthetical. Returns the inner text
 * (excluding the parens) or `undefined` if none found. #303
 */
function extractTrailingParenthetical(
  cleanedText: string | undefined,
  cleanEnd: number,
): string | undefined {
  if (!cleanedText) return undefined
  const after = cleanedText.slice(cleanEnd)
  const m = TRAILING_PAREN_REGEX.exec(after)
  if (!m) return undefined
  const content = m[1].trim()
  return content.length > 0 ? content : undefined
}

/**
 * Extracts Id. citation metadata from a tokenized citation.
 *
 * Parses token text to extract:
 * - Pincite: Optional page reference (e.g., "253" from "Id. at 253")
 *
 * Confidence scoring:
 * - 1.0 (Id. format is unambiguous and standardized)
 *
 * @param token - Token from tokenizer containing matched text and clean positions
 * @param transformationMap - Position mapping from clean → original text
 * @returns IdCitation with parsed metadata and translated positions
 *
 * @example
 * ```typescript
 * const token = {
 *   text: "Id. at 253",
 *   span: { cleanStart: 10, cleanEnd: 20 },
 *   type: "case",
 *   patternId: "id"
 * }
 * const citation = extractId(token, transformationMap)
 * // citation = {
 * //   type: "id",
 * //   pincite: 253,
 * //   confidence: 1.0,
 * //   ...
 * // }
 * ```
 */
export function extractId(
  token: Token,
  transformationMap: TransformationMap,
  cleanedText?: string,
): IdCitation {
  const { text, span } = token

  // Parse Id. with optional pincite.
  // Pattern: Id. or Ibid. with optional comma + "at [page]" (handles "Id., at 5").
  //
  // Punctuation tolerance (#305):
  //   - Optional whitespace before the period — `Id . at 326`, `Ibid .`
  //     (OCR + older typesetting).
  //   - Comma instead of period — `Id, at 1483` — guarded by `(?=\s+at\s)`
  //     so bare `Id,` in prose ("his Id, but ...") is not misread.
  //
  // Group layout: 1=initial char ("I"/"i"), 2=`.` when canonical form,
  // 3=`,` when typo form (mutually exclusive with 2), 4=optional post-period
  // comma (canonical-only), 5=pincite.
  //
  // Pincite accepts optional "*" prefix for star-pagination (#191), an optional
  // trailing footnote suffix " n.14" / " nn.14-15" (#202), an optional
  // `p.` / `pp.` prefix for CSM form (`Id. at p. 125`; see #236), and
  // `¶` / `¶¶` / `para.` / `paras.` paragraph markers (#204). When the
  // pincite is a paragraph form, `at` is optional (`Id. ¶ 12`).
  const idRegex = /([Ii])(?:d|bid)\s*(?:(\.)|(,)(?=\s+at\s))(,?)\s*(?:(?:at\s+(?:pp?\.\s*)?|(?=¶|paras?\.?\b))(\*?\d+(?:\s*[-–]\s*\*?\d+)?(?:\s+(?:nn?|note)\s*\.?\s*\d+(?:[-–—]\d+)?)?|¶¶?\s*\d+(?:[-–—]\d+)?|paras?\.?\s*\d+(?:[-–—]\d+)?))?/d
  const match = idRegex.exec(text)

  if (!match) {
    throw new Error(`Failed to parse Id. citation: ${text}`)
  }

  const firstChar = match[1]
  // Non-standard punctuation: either a typo comma instead of period (group 3)
  // or a post-period comma (group 4). Both lower confidence.
  const isTypoComma = match[3] === ","
  const hasComma = isTypoComma || match[4] === ","
  const pinciteInfo: PinciteInfo | undefined = match[5]
    ? (parsePincite(match[5]) ?? undefined)
    : undefined
  const pincite = pinciteInfo?.page

  // Component span for pincite (#210)
  let spans: IdComponentSpans | undefined
  if (match[5] && match.indices?.[5]) {
    spans = {
      pincite: spanFromGroupIndex(span.cleanStart, match.indices[5], transformationMap),
    }
  }

  // Confidence scoring based on variant
  let confidence = 1.0
  const isLowercase = firstChar === "i"
  if (isLowercase) confidence = 0.85 // Lowercase id. is non-standard
  if (hasComma) confidence = Math.min(confidence, 0.9) // Comma variant (Id., at N)
  if (isTypoComma) confidence = Math.min(confidence, 0.7) // `Id, at N` typo (#305)

  // Context validation: check whether Id. appears in a citation context.
  // Real Id. citations follow sentence-ending punctuation, semicolons,
  // or paragraph breaks — not mid-sentence prose like "The Id. card".
  if (cleanedText && span.cleanStart > 0) {
    const preceding = cleanedText.slice(Math.max(0, span.cleanStart - 20), span.cleanStart)
    // Look for the last non-whitespace character before Id.
    const trimmed = preceding.trimEnd()
    if (trimmed.length > 0) {
      const lastChar = trimmed[trimmed.length - 1]
      // Citation contexts end with: . ; ) ] — or follow certain patterns
      const isCitationContext = /[.;)\]—:]$/.test(trimmed)
      if (!isCitationContext) {
        // Mid-sentence Id. (e.g., "The Id. card") — likely not a citation
        confidence = Math.min(confidence, 0.4)
      }
    }
  }

  // Translate positions from clean → original
  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  // Trailing parenthetical (#303): `Id. at 770 (Marsh)`, `Id. (citation omitted)`.
  const parenthetical = extractTrailingParenthetical(cleanedText, span.cleanEnd)

  return {
    type: "id",
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
    pincite,
    pinciteInfo,
    ...(parenthetical ? { parenthetical } : {}),
    spans,
  }
}

/**
 * Extracts supra citation metadata from a tokenized citation.
 *
 * Parses token text to extract:
 * - Party name: Name preceding "supra" (e.g., "Smith" from "Smith, supra")
 * - Pincite: Optional page reference (e.g., "460" from "Smith, supra, at 460")
 *
 * Confidence scoring:
 * - 0.9 (supra format is fairly standard but party name extraction can vary)
 *
 * @param token - Token from tokenizer containing matched text and clean positions
 * @param transformationMap - Position mapping from clean → original text
 * @returns SupraCitation with parsed metadata and translated positions
 *
 * @example
 * ```typescript
 * const token = {
 *   text: "Smith, supra, at 460",
 *   span: { cleanStart: 10, cleanEnd: 30 },
 *   type: "case",
 *   patternId: "supra"
 * }
 * const citation = extractSupra(token, transformationMap)
 * // citation = {
 * //   type: "supra",
 * //   partyName: "Smith",
 * //   pincite: 460,
 * //   confidence: 0.9,
 * //   ...
 * // }
 * ```
 */
export function extractSupra(
  token: Token,
  transformationMap: TransformationMap,
  cleanedText?: string,
): SupraCitation {
  const { text, span } = token

  // Try party-name pattern first: "Smith, supra [note N] [, at page]".
  // Party-name capture mirrors SUPRA_PATTERN in src/patterns/shortForm.ts:
  // `v.` / `&` / `,` continuations (#301) so multi-word names like
  // `Thorn Americas, Inc.` and `Walker & Horwich` capture the whole
  // caption rather than just the last word. `In re` prefix is NOT included
  // — the resolver's BKTree indexes full cites without the prefix (#216 /
  // #21), and adding it here would break supra resolution for `In re X`.
  // Pincite accepts optional "*" prefix for star-pagination (#191), an optional
  // range end / `p.` / `pp.` prefix for CSM form (#236), an optional trailing
  // footnote suffix (#202), and `¶` / `¶¶` / `para.` / `paras.` paragraph
  // markers (#204). When the pincite is a paragraph form, `at` is optional.
  const partySupraRegex =
    /\b([A-Z][a-zA-Z''\-]+\.?(?:(?:\s+v\.?\s+|\s+&\s+|,\s+|\s+)[A-Z][a-zA-Z''\-]+\.?)*)\s*,?\s+supra(?:\s+note\s+(\d+))?(?:,?\s+(?:at\s+(?:pp?\.\s*)?|(?=¶|paras?\.?\b))(\*?\d+(?:[-–—]\*?\d+)?(?:\s+(?:nn?|note)\s*\.?\s*\d+(?:[-–—]\d+)?)?|¶¶?\s*\d+(?:[-–—]\d+)?|paras?\.?\s*\d+(?:[-–—]\d+)?))?/d
  const partyMatch = partySupraRegex.exec(text)

  // Fallback: standalone supra — "supra note N", "supra at N", "supra § N".
  // The `at` page accepts the same `p.` / `pp.` prefix and range form (#236)
  // plus paragraph markers (#204).
  const standaloneRegex =
    /supra(?:\s+note\s+(\d+)(?:,?\s+(?:at\s+(?:pp?\.\s*)?|(?=¶|paras?\.?\b))(\*?\d+(?:[-–—]\*?\d+)?(?:\s+(?:nn?|note)\s*\.?\s*\d+(?:[-–—]\d+)?)?|¶¶?\s*\d+(?:[-–—]\d+)?|paras?\.?\s*\d+(?:[-–—]\d+)?))?|\s+(?:at\s+(?:pp?\.\s*)?|(?=¶|paras?\.?\b))(\*?\d+(?:[-–—]\*?\d+)?(?:\s+(?:nn?|note)\s*\.?\s*\d+(?:[-–—]\d+)?)?|¶¶?\s*\d+(?:[-–—]\d+)?|paras?\.?\s*\d+(?:[-–—]\d+)?))?/d
  const match = partyMatch || standaloneRegex.exec(text)

  if (!match) {
    throw new Error(`Failed to parse supra citation: ${text}`)
  }

  let partyName: string | undefined
  let pinciteInfo: PinciteInfo | undefined
  let confidence: number
  let pinciteGroupIdx: number | undefined

  if (partyMatch) {
    partyName = stripSupraPartyPrefix(partyMatch[1])
    pinciteInfo = partyMatch[3]
      ? (parsePincite(partyMatch[3]) ?? undefined)
      : undefined
    confidence = 0.9
    if (partyMatch[3]) pinciteGroupIdx = 3
  } else {
    // Standalone supra — no party name
    partyName = undefined
    const noteAtPage = match[2]
    const atPage = match[3]
    const rawPin = noteAtPage ?? atPage
    pinciteInfo = rawPin ? (parsePincite(rawPin) ?? undefined) : undefined
    confidence = 0.8 // Slightly lower — standalone supra is less specific
    if (noteAtPage) pinciteGroupIdx = 2
    else if (atPage) pinciteGroupIdx = 3
  }

  const pincite = pinciteInfo?.page

  // Component span for pincite (#210)
  let spans: SupraComponentSpans | undefined
  if (pinciteGroupIdx !== undefined && match.indices?.[pinciteGroupIdx]) {
    spans = {
      pincite: spanFromGroupIndex(
        span.cleanStart,
        match.indices[pinciteGroupIdx],
        transformationMap,
      ),
    }
  }

  // Translate positions from clean → original
  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  // Trailing parenthetical (#303): `Smith, supra (holding ...)`.
  const parenthetical = extractTrailingParenthetical(cleanedText, span.cleanEnd)

  return {
    type: "supra",
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
    partyName,
    pincite,
    pinciteInfo,
    ...(parenthetical ? { parenthetical } : {}),
    spans,
  }
}

/**
 * Extracts short-form case citation metadata from a tokenized citation.
 *
 * Parses token text to extract:
 * - Volume: Volume number
 * - Reporter: Reporter abbreviation
 * - Pincite: Page reference (from "at [page]" pattern)
 *
 * Confidence scoring:
 * - 0.7 (short-form case citations are more ambiguous than full citations)
 *
 * @param token - Token from tokenizer containing matched text and clean positions
 * @param transformationMap - Position mapping from clean → original text
 * @returns ShortFormCaseCitation with parsed metadata and translated positions
 *
 * @example
 * ```typescript
 * const token = {
 *   text: "500 F.2d at 125",
 *   span: { cleanStart: 10, cleanEnd: 25 },
 *   type: "case",
 *   patternId: "short-form-case"
 * }
 * const citation = extractShortFormCase(token, transformationMap)
 * // citation = {
 * //   type: "shortFormCase",
 * //   volume: 500,
 * //   reporter: "F.2d",
 * //   pincite: 125,
 * //   confidence: 0.7,
 * //   ...
 * // }
 * ```
 */
export function extractShortFormCase(
  token: Token,
  transformationMap: TransformationMap,
  cleanedText?: string,
): ShortFormCaseCitation {
  const { text, span } = token

  // Parse [Party,] volume-reporter-[,]-at-page.
  // Pattern: optional Party name then number space abbreviation [, ] at space number.
  // Supports reporters with 1-2 letter ordinal suffixes (e.g., F.4th, Cal.4th).
  // Handles comma-before-at: "597 U.S., at 721", "116 F.4th, at 1193".
  // Pincite accepts optional "*" prefix for star-pagination (#191), an optional
  // range end "462-65" / "462-*65" (#201), an optional trailing footnote
  // suffix " n.14" / " nn.14-15" (#202), an optional `p.` / `pp.` prefix for
  // CSM form (`18 Cal.4th at p. 717`; see #236), and `¶` / `¶¶` / `para.` /
  // `paras.` paragraph markers (#204).
  // Optional leading party-name group (#278) captures Bluebook back-references
  // (`Smith, 500 F.2d at 125`). Group order:
  //   1: party name (optional, undefined for bare form)
  //   2: volume
  //   3: reporter
  //   4: pincite
  // Party-name capture mirrors SHORT_FORM_CASE_PATTERN: `v.` / `&` / `,`
  // continuations (#301). `In re` prefix intentionally omitted (see
  // partySupraRegex above for rationale).
  const shortFormRegex =
    /(?:([A-Z][a-zA-Z''\-]+\.?(?:(?:\s+v\.?\s+|\s+&\s+|,\s+|\s+)[A-Z][a-zA-Z''\-]+\.?)*),\s+)?(\d+(?:-\d+)?)\s+([A-Z][A-Za-z.''\s]+?(?:\d[a-z]{1,2})?)\s*,?\s+at\s+(?:pp?\.\s*)?(\*?\d+(?:[-–—]\*?\d+)?(?:\s+(?:nn?|note)\s*\.?\s*\d+(?:[-–—]\d+)?)?|¶¶?\s*\d+(?:[-–—]\d+)?|paras?\.?\s*\d+(?:[-–—]\d+)?)/d
  const match = shortFormRegex.exec(text)

  if (!match) {
    throw new Error(`Failed to parse short-form case citation: ${text}`)
  }

  const rawPartyName = match[1]
  const rawVolume = match[2]
  const volume = /^\d+$/.test(rawVolume) ? Number.parseInt(rawVolume, 10) : rawVolume
  const reporter = match[3].trim() // Remove trailing spaces
  const pinciteInfo: PinciteInfo | undefined = parsePincite(match[4]) ?? undefined
  const pincite = pinciteInfo?.page

  // Strip leading citation signals from the captured party name (#216 helper).
  // The optional party-name group itself doesn't include signal prefixes —
  // the outer SHORT_FORM_CASE_PATTERN's `\b` anchor lands at the signal word
  // (e.g., `See` is matched as the first capitalized token, then `Smith` as
  // the second). `stripSupraPartyPrefix` peels off any leading signal /
  // sentence-initial connector, mirroring the supra handling.
  let partyName: string | undefined
  let partyNameNormalized: string | undefined
  if (rawPartyName) {
    partyName = stripSupraPartyPrefix(rawPartyName)
    partyNameNormalized = partyName.toLowerCase().replace(/\s+/g, " ").trim()
  }

  // Component span for pincite (#210)
  let spans: ShortFormCaseComponentSpans | undefined
  if (match.indices?.[4]) {
    spans = {
      pincite: spanFromGroupIndex(span.cleanStart, match.indices[4], transformationMap),
    }
  }

  // Translate positions from clean → original
  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  // Confidence: base 0.4, boosted for recognized reporters
  let confidence = 0.4
  if (COMMON_REPORTERS.has(reporter)) {
    confidence += 0.3
  }

  // Trailing parenthetical (#303): `Smith, 500 F.2d at 125 (citations omitted)`.
  const parenthetical = extractTrailingParenthetical(cleanedText, span.cleanEnd)

  return {
    type: "shortFormCase",
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
    volume,
    reporter,
    pincite,
    pinciteInfo,
    partyName,
    partyNameNormalized,
    ...(parenthetical ? { parenthetical } : {}),
    spans,
  }
}
