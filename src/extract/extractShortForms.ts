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
import { COMMON_REPORTERS } from "./caseReporterSemantics"
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
  /^(?:But\s+(?:see|cf\.?)|But|See(?:\s+also)?(?:\s*,\s*e\.\s*g\.?)?|Compare|Cf\.?|Accord|Contra|E\.\s*g\.?|Also|In(?!\s+re\b)|Then|However|Moreover|Therefore|Indeed)\s+/i

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
 * Additional pincite continuation (`, NNN`) after the primary pincite has been
 * consumed (#639, parallels extractCase.ts ADDITIONAL_PINCITE_REGEX for #247).
 * Captures a comma + optional whitespace + pincite body. Used in a loop after
 * the primary short-form match to collect `, 1027, 1030, 1035` chains in
 * `vol Rep. at 1025, 1027` style citations.
 *
 * The trailing lookahead rejects `\s+[A-Z]` so a following parallel cite's
 * reporter (`, 198 A. 154`) is not absorbed as a pincite. Terminator set
 * mirrors the lookahead in extractCase.ts: end-of-string, sentence
 * punctuation, brackets/parens/quotes, or whitespace not followed by a
 * capital letter.
 */
const SHORTFORM_ADDITIONAL_PINCITE_REGEX =
  /^,\s*(\*?\d+(?:[-–—~]\*?\d+)?(?:\s+(?:nn?|note)\s*\.?\s*\d+(?:[-–—~]\d+)?)?)(?=$|[.,:;)([\]»"'“”‘’]|\s(?![A-Z]))/

/**
 * Bluebook citation signal phrases at the end of preceding text (#557).
 *
 * Mirrors `SIGNAL_PATTERNS` in `src/extract/detectStringCites.ts` — these are
 * the canonical introducers that precede a citation core. Used by `extractId`
 * to recognize `See id.`, `See also id.`, `Cf. id.`, etc. as citation
 * contexts (not mid-sentence prose).
 *
 * Anchor at end-of-string (`\s*$` — caller already trims) and require a
 * non-letter boundary before the signal so `He see` does not match `see`.
 * Longer alternatives come first so `but cf., e.g.` beats `cf.` and
 * `see also` beats `see`. Combined `, e.g.` forms accept the optional
 * trailing comma typical before the citation (`See, e.g., id.`).
 *
 * The `e\.\s*g\.` form accepts both `e.g.` and the older `e. g.` typesetting
 * variant. Likewise `see\s*,?\s+also` accepts the `See, also,` variant.
 *
 * Case-insensitive so `See`, `SEE`, and `see` all match.
 */
const SIGNAL_AT_END_REGEX =
  /(?<![A-Za-z])(?:but\s+cf\.,\s+e\.\s*g\.,?|see\s*,?\s+also,\s+e\.\s*g\.,?|but\s+see,\s+e\.\s*g\.,?|cf\.,\s+e\.\s*g\.,?|see,\s+e\.\s*g\.,?|see\s+generally|see\s*,?\s+also|but\s+see|but\s+cf\.?|compare|accord|contra|see|cf\.?|e\.\s*g\.,?)\s*$/i

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
  // 3=`,` when typo form (mutually exclusive with 2), 4=connector before
  // pincite (`, ` Connecticut-style, `,? at`, or `,? (?=¶)`), 5=pincite.
  //
  // Connector alternation accepts three forms (#353):
  //   a) `, <pincite>` — Connecticut comma-pincite (`Id., 253`)
  //   b) `[, ]?at <pincite>` — Bluebook at-form, optional leading comma
  //   c) `[, ]?(?=¶|para)` — paragraph marker
  //
  // Pincite accepts optional "*" prefix for star-pagination (#191), an optional
  // trailing footnote suffix " n.14" / " nn.14-15" (#202), an optional
  // `p.` / `pp.` prefix for CSM form (`Id. at p. 125`; see #236), and
  // `¶` / `¶¶` / `para.` / `paras.` paragraph markers (#204). When the
  // pincite is a paragraph form, `at` is optional (`Id. ¶ 12`).
  //
  // The comma alternative deliberately omits ID_PATTERN's `(?=\s+at\s)`
  // lookahead because the tokenizer has already enforced it; the `text` we
  // receive is only the matched substring (often `Id,` with the `at` and
  // any unrecognized pincite trailing OUTSIDE the match), and re-checking
  // the lookahead here would always fail. Without this, an opinion like
  // `Id, at pages 2-4` (where the tokenizer matches `Id,` but the
  // unrecognized `pages` prefix prevents the pincite branch from
  // extending the match) crashes the whole pipeline.
  // Comma-pincite guard (#549) mirrors ID_PATTERN in src/patterns/shortForm.ts:
  // `,\s+(?!\d+\s+[A-Z])` so the comma-pincite branch does not consume a
  // following full citation's volume. Defensive (the tokenizer already
  // truncates the token before reaching this point), but keeps the
  // regexes in lock-step to prevent future drift.
  const idRegex =
    /([Ii])(?:d|bid)\s*([.,])(?:(,\s+(?!\d+\s+[A-Z])|,?\s*(?:at\s+(?:pp?\.\s*)?|(?=¶|paras?\.?\b)))(\*?\d+(?:\s*[-–]\s*\*?\d+)?(?:\s+(?:nn?|note)\s*\.?\s*\d+(?:[-–—]\d+)?)?|¶¶?\s*\d+(?:[-–—]\d+)?|paras?\.?\s*\d+(?:[-–—]\d+)?))?/d
  const match = idRegex.exec(text)

  if (!match) {
    throw new Error(`Failed to parse Id. citation: ${text}`)
  }

  const firstChar = match[1]
  // Non-standard punctuation signals:
  //   - `isTypoComma`: comma replacing the period (`Id, at 1483`) — lower confidence
  //   - `hasComma`: post-period comma (`Id., at 253` or `Id., 253`) — slightly
  //     lower confidence than canonical. Connector capture (group 3) starts
  //     with `,` for both the post-period-comma-at form and the Connecticut
  //     comma-pincite form.
  const isTypoComma = match[2] === ","
  const hasComma = isTypoComma || match[3]?.startsWith(",") === true
  const pinciteInfo: PinciteInfo | undefined = match[4]
    ? (parsePincite(match[4]) ?? undefined)
    : undefined
  const pincite = pinciteInfo?.page

  // Component span for pincite (#210)
  let spans: IdComponentSpans | undefined
  if (match[4] && match.indices?.[4]) {
    spans = {
      pincite: spanFromGroupIndex(span.cleanStart, match.indices[4], transformationMap),
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
  // or paragraph breaks — OR a Bluebook citation signal (`See`, `See also`,
  // `Cf.`, `Compare`, `Accord`, `Contra`, `But see`, `But cf.`, `See generally`,
  // `E.g.`, and combined `, e.g.` forms) — not mid-sentence prose like
  // "The Id. card".
  //
  // Window is 60 chars so the longest signal phrase (`See also, e.g.`,
  // `But cf., e.g.`) fits even when preceded by other content. The signal
  // regex below mirrors `SIGNAL_PATTERNS` in `src/extract/detectStringCites.ts`
  // (#557). The signal must end at the end of the trimmed preceding text
  // (whitespace before Id. is already stripped).
  if (cleanedText && span.cleanStart > 0) {
    const preceding = cleanedText.slice(Math.max(0, span.cleanStart - 60), span.cleanStart)
    // Look for the last non-whitespace character before Id.
    const trimmed = preceding.trimEnd()
    if (trimmed.length > 0) {
      // Citation contexts end with: . ; ) ] — : (sentence-ending punctuation)
      const endsWithPunctuation = /[.;)\]—:]$/.test(trimmed)
      // …or end with a Bluebook citation signal (#557). Word-boundary anchor
      // before the signal so we don't match `He see` etc. — `(?<![A-Za-z])`
      // accepts start-of-string OR a non-letter immediately before the
      // signal. The trailing alternation captures `,` for the combined
      // `, e.g.` forms (`See, e.g.,` ends on `,`).
      const endsWithSignal = SIGNAL_AT_END_REGEX.test(trimmed)
      if (!endsWithPunctuation && !endsWithSignal) {
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

  // Bracketed supra (#306): `State v. Jarzbek, [supra, 705]` /
  // `[supra at 78-82]`. Connecticut Supreme/Appellate convention. The
  // comma-pincite shape `[supra, 705]` accepts no `at` before the page.
  // When the token text matches this shape, parse it via the bracketed
  // regex; otherwise fall through to the canonical partySupraRegex.
  const bracketedSupraRegex =
    /(?:\b([A-Z][a-zA-Z''\-]+\.?(?:(?:\s+v\.?\s+|\s+&\s+|,\s+|\s+)[A-Z][a-zA-Z''\-]+\.?)*)\s*,?\s+)?\[supra(?:(?:,\s+|\s+at\s+(?:pp?\.\s*)?)(\d+(?:[-–—]\d+)?))?\]/d
  const bracketedMatch = text.includes("[supra") ? bracketedSupraRegex.exec(text) : null

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
  // Connector before pincite accepts the Connecticut comma-pincite form
  // (`Smith, supra, 522`) alongside the Bluebook `, at` and paragraph
  // forms (#353).
  // Comma-pincite guard (#549) mirrors SUPRA_PATTERN in src/patterns/shortForm.ts:
  // `,\s+(?!\d+\s+[A-Z])` so the comma-pincite branch does not consume a
  // following full citation's volume. Defensive (the tokenizer already
  // truncates the token before reaching this point), but keeps the
  // regexes in lock-step to prevent future drift.
  const partySupraRegex =
    /\b([A-Z][a-zA-Z''\-]+\.?(?:(?:\s+v\.?\s+|\s+&\s+|,\s+|\s+)[A-Z][a-zA-Z''\-]+\.?)*)\s*,?\s+supra(?:\s+note\s+(\d+))?(?:(?:,\s+(?!\d+\s+[A-Z])|,?\s+(?:at\s+(?:pp?\.\s*)?|(?=¶|paras?\.?\b)))(\*?\d+(?:[-–—]\*?\d+)?(?:\s+(?:nn?|note)\s*\.?\s*\d+(?:[-–—]\d+)?)?|¶¶?\s*\d+(?:[-–—]\d+)?|paras?\.?\s*\d+(?:[-–—]\d+)?))?/d
  const partyMatch = bracketedMatch ? null : partySupraRegex.exec(text)

  // Fallback: standalone supra — "supra note N", "supra at N", "supra § N".
  // The `at` page accepts the same `p.` / `pp.` prefix and range form (#236)
  // plus paragraph markers (#204).
  const standaloneRegex =
    /supra(?:\s+note\s+(\d+)(?:,?\s+(?:at\s+(?:pp?\.\s*)?|(?=¶|paras?\.?\b))(\*?\d+(?:[-–—]\*?\d+)?(?:\s+(?:nn?|note)\s*\.?\s*\d+(?:[-–—]\d+)?)?|¶¶?\s*\d+(?:[-–—]\d+)?|paras?\.?\s*\d+(?:[-–—]\d+)?))?|\s+(?:at\s+(?:pp?\.\s*)?|(?=¶|paras?\.?\b))(\*?\d+(?:[-–—]\*?\d+)?(?:\s+(?:nn?|note)\s*\.?\s*\d+(?:[-–—]\d+)?)?|¶¶?\s*\d+(?:[-–—]\d+)?|paras?\.?\s*\d+(?:[-–—]\d+)?))?/d
  const match = bracketedMatch || partyMatch || standaloneRegex.exec(text)

  if (!match) {
    throw new Error(`Failed to parse supra citation: ${text}`)
  }

  let partyName: string | undefined
  let pinciteInfo: PinciteInfo | undefined
  let confidence: number
  let pinciteGroupIdx: number | undefined

  if (bracketedMatch) {
    // Bracketed form (#306): group 1 = optional party, group 2 = optional pincite.
    partyName = bracketedMatch[1] ? stripSupraPartyPrefix(bracketedMatch[1]) : undefined
    pinciteInfo = bracketedMatch[2] ? (parsePincite(bracketedMatch[2]) ?? undefined) : undefined
    confidence = partyName ? 0.9 : 0.8
    if (bracketedMatch[2]) pinciteGroupIdx = 2
  } else if (partyMatch) {
    partyName = stripSupraPartyPrefix(partyMatch[1])
    pinciteInfo = partyMatch[3] ? (parsePincite(partyMatch[3]) ?? undefined) : undefined
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
  // partySupraRegex above for rationale). Pincite-prefix alternation also
  // accepts spelled-out `page` / `pages` (#344).
  const shortFormRegex =
    /(?:([A-Z][a-zA-Z''\-]+\.?(?:(?:\s+v\.?\s+|\s+&\s+|,\s+|\s+)[A-Z][a-zA-Z''\-]+\.?)*),\s+)?(\d+(?:-\d+)?)\s+([A-Z][A-Za-z.''\s]+?(?:\d[a-z]{1,2})?)\s*,?\s+at\s+(?:pp?\.\s*|pages?\s+)?(\*?\d+(?:[-–—]\*?\d+)?(?:\s+(?:nn?|note)\s*\.?\s*\d+(?:[-–—]\d+)?)?|¶¶?\s*\d+(?:[-–—]\d+)?|paras?\.?\s*\d+(?:[-–—]\d+)?)/d
  const match = shortFormRegex.exec(text)

  if (!match) {
    throw new Error(`Failed to parse short-form case citation: ${text}`)
  }

  const rawPartyName = match[1]
  const rawVolume = match[2]
  const volume = /^\d+$/.test(rawVolume) ? Number.parseInt(rawVolume, 10) : rawVolume
  const reporter = match[3].trim() // Remove trailing spaces
  let pinciteInfo: PinciteInfo | undefined = parsePincite(match[4]) ?? undefined
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

  // Additional comma-separated pincites following the primary one (#639). The
  // tokenizer regex only captures up to the first pincite, so `at 1025, 1027`
  // ends the token at `1025`. Scan `cleanedText` past `span.cleanEnd` for
  // additional `, NNN[-MM]` continuations, mirroring the multi-pincite logic
  // in extractCase.ts for full-form `, 115, 153, 200` chains (#247).
  if (cleanedText && pinciteInfo) {
    const after = cleanedText.substring(span.cleanEnd)
    const additionalPincites: PinciteInfo[] = []
    let scanStart = 0
    while (scanStart < after.length) {
      const remainder = after.substring(scanStart)
      const addMatch = SHORTFORM_ADDITIONAL_PINCITE_REGEX.exec(remainder)
      if (!addMatch) break
      const addInfo = parsePincite(addMatch[1])
      if (!addInfo) break
      additionalPincites.push(addInfo)
      scanStart += addMatch[0].length
    }
    if (additionalPincites.length > 0) {
      pinciteInfo = { ...pinciteInfo, additionalPincites }
    }
  }

  // Trailing parenthetical (#303): `Smith, 500 F.2d at 125 (citations omitted)`.
  // Scan past any additional pincites we just consumed so a trailing paren
  // after `at 125, 127 (citations omitted)` still binds.
  let trailingParenStart = span.cleanEnd
  if (cleanedText && pinciteInfo?.additionalPincites?.length) {
    const after = cleanedText.substring(span.cleanEnd)
    let scan = 0
    for (const _ of pinciteInfo.additionalPincites) {
      const m = SHORTFORM_ADDITIONAL_PINCITE_REGEX.exec(after.substring(scan))
      if (!m) break
      scan += m[0].length
    }
    trailingParenStart = span.cleanEnd + scan
  }
  const parenthetical = extractTrailingParenthetical(cleanedText, trailingParenStart)

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
