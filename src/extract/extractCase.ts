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
import type { FullCaseCitation } from "@/types/citation"
import { resolveOriginalSpan, type Span, type TransformationMap } from "@/types/span"
import type { CaseComponentSpans } from "@/types/componentSpans"
import type { StructuredDate } from "./dates"
import { getReportersSync } from "@/data/reportersCache"
import { inferCourtFromReporter } from "./courtInference"
import { normalizeCourt } from "./courtNormalization"
import { parseCaseCitationCore } from "./caseCore"
import { parseCaseCitationEnvelopeContext } from "./caseEnvelope"
import { extractCaseName } from "./caseNameScanner"
import { interpretCaseNameScan } from "./caseNameSemantics"
import { interpretCasePartySemantics } from "./casePartySemantics"
import { parseCaseCitationPostfix } from "./casePostfix"
import { interpretCaseCitationPostfix } from "./casePostfixSemantics"

export { parseParenthetical } from "./caseParentheticals"
export { extractCaseName } from "./caseNameScanner"
export { extractPartyNames } from "./casePartySemantics"

// ============================================================================
// Compiled regex patterns for performance (hoisted to module level)
// ============================================================================

/** Cached current year to avoid Date allocation per extraction call. */
const CURRENT_YEAR = new Date().getFullYear()

/** Common US reporters for confidence boost. Exact match to avoid substring false positives.
 *  Shared across extractCase and extractShortForms.
 *
 *  ## Why this set matters (#555)
 *
 *  This fallback is the *only* reporter signal in degraded mode — that is, when
 *  the reporters-db has not been loaded via `await loadReporters()`. The async
 *  loader is opt-in (`extractCitations` is synchronous and cannot await it), so
 *  in practice the vast majority of real callers — including the audit script
 *  in `scripts/audit-confidence.ts` — never see DB-backed reporter validation.
 *  An entry that the cleaner can never produce is dead weight and silently
 *  drops the citation by 0.30 confidence.
 *
 *  ## Entries are POST-CLEANING forms
 *
 *  `cleaners.ts:normalizeReporterSpacing` collapses inner spaces in known
 *  reporter abbreviations (`S. Ct.` → `S.Ct.`, `L. Ed. 2d` → `L.Ed.2d`,
 *  `F. Supp. 2d` → `F.Supp.2d`, the general `Letter. Digit` ordinal rule).
 *  Pre-#555 the set was authored against the Bluebook canonical (with spaces),
 *  which after cleaning never matched anything. The post-cleaning canonical is
 *  what the extractor actually hands to the fallback check, so that's what we
 *  store here.
 *
 *  ## State reporters
 *
 *  State reporters absent from the set used to all fall through to 0.65
 *  (or lower if no court parenthetical). The audit surfaced `Mass.`, `Va.`,
 *  `Pa.`, `Idaho`, `Cal.4th`, `Cal.Rptr.2d` as the worst offenders (100% of
 *  occurrences scored < 0.7). We include those and a small set of close
 *  cousins (`Cal.5th`, `Cal.Rptr.`, `Cal.Rptr.3d`, `Cal.App.*`) so the
 *  full Cal. family lands consistently. We intentionally do NOT dump every
 *  US state abbreviation — single-letter state forms could create
 *  false-positive boosts on non-reporter text.
 *
 *  Future editions are pre-registered defensively (#234) so the eventual rollout
 *  of F.5th / N.E.4th / etc. does not silently regress confidence scores. The
 *  generalized federal-reporter regex captures these formats; this set ensures
 *  they earn the +0.3 reporter-match boost out of the box. */
export const COMMON_REPORTERS: ReadonlySet<string> = new Set([
  // ── Federal Reporter ────────────────────────────────────────────────────
  "F.",
  "F.2d",
  "F.3d",
  "F.4th",
  "F.5th",
  "F.6th",
  "F.7th",
  // ── United States Reports & SCOTUS-adjacent (#555) ──────────────────────
  // Post-cleaning canonicals (cleaner collapses `S. Ct.` → `S.Ct.`,
  // `L. Ed. 2d` → `L.Ed.2d`). The spaced forms remain for defensiveness in
  // case a code path skips the cleaner.
  "U.S.",
  "S.Ct.",
  "S. Ct.",
  "L.Ed.",
  "L. Ed.",
  "L.Ed.2d",
  "L. Ed. 2d",
  "L.Ed.3d",
  "L. Ed. 3d",
  // ── Federal Supplement & Appendix (#555) ────────────────────────────────
  "F.Supp.",
  "F. Supp.",
  "F.Supp.2d",
  "F. Supp. 2d",
  "F.Supp.3d",
  "F. Supp. 3d",
  "F.Supp.4th",
  "F. Supp. 4th",
  "F.Supp.5th",
  "F. Supp. 5th",
  "F.Supp.6th",
  "F. Supp. 6th",
  "F.App'x",
  "F. App'x",
  // ── Regional reporters ──────────────────────────────────────────────────
  "P.",
  "P.2d",
  "P.3d",
  "P.4th",
  "A.",
  "A.2d",
  "A.3d",
  "A.4th",
  "N.E.",
  "N.E.2d",
  "N.E.3d",
  "N.E.4th",
  "N.W.",
  "N.W.2d",
  "N.W.3d",
  "S.E.",
  "S.E.2d",
  "S.E.3d",
  "S.W.",
  "S.W.2d",
  "S.W.3d",
  "S.W.4th",
  // ── Southern Reporter (#555: cleaner produces `So.2d` not `So. 2d`) ─────
  "So.",
  "So.2d",
  "So. 2d",
  "So.3d",
  "So. 3d",
  "So.4th",
  "So. 4th",
  // ── State reporters from the #555 audit ─────────────────────────────────
  // 100% of occurrences scored < 0.7 pre-fix.
  "Mass.",
  "Va.",
  "Pa.",
  "Idaho",
  // ── California reporters (#555) ─────────────────────────────────────────
  // `Cal.4th` and `Cal.Rptr.2d` were audited misses; the full Cal. family
  // shares the same cleaner pattern and benefits identically.
  "Cal.",
  "Cal.2d",
  "Cal.3d",
  "Cal.4th",
  "Cal.5th",
  "Cal.Rptr.",
  "Cal.Rptr.2d",
  "Cal.Rptr.3d",
  "Cal.App.",
  "Cal.App.2d",
  "Cal.App.3d",
  "Cal.App.4th",
  "Cal.App.5th",
])

/** SCOTUS `Black` reporter active years — the only two volumes were
 *  published 1861-1862 (Vols. 1 and 2). Used by
 *  {@link resolveNormalizedReporter} to disambiguate the shared `Black.`
 *  abbreviation from Indiana's `Blackf.` (Blackford) reporter. See #572. */
const SCOTUS_BLACK_REPORTER_START_YEAR = 1861
const SCOTUS_BLACK_REPORTER_END_YEAR = 1862

/**
 * Resolve a raw reporter literal to its canonical Bluebook form using the
 * reporters-db lookup (#571).
 *
 * The reporters-db structure has two relevant lookup keys per
 * {@link ReporterEntry}: the `editions` map (whose keys ARE the canonical
 * Bluebook forms — `F.2d`, `Ill. App. 2d`, `N.J. Eq.`) and the `variations`
 * map (whose keys are alternate spellings, mapping to a single canonical
 * value). Order of resolution:
 *
 *   1. Exact (case-insensitive) match against an edition key → return that
 *      key verbatim. Covers the canonical-input case (`F.2d` → `F.2d`).
 *   2. Exact (case-insensitive) match against a variation key → return the
 *      variation's value. Covers all periodless / no-space variants
 *      (`F2d` → `F.2d`, `Ill App2d` → `Ill. App. 2d`, `OhioSt.` → `Ohio St.`).
 *   3. Otherwise `undefined` — downstream consumers fall back to the raw
 *      `reporter` string. Maintains the pre-#571 behaviour for unknown
 *      reporters.
 *
 * Returns `undefined` when reporters-db is not loaded (degraded mode);
 * `normalizedReporter` remains absent in that case, mirroring the
 * pre-#571 behaviour where the field was never populated at all.
 *
 * Year-based disambiguation (#572): when the literal reporter is `Black.`
 * (the variation that points to Indiana's `Blackf.`) AND the citation's
 * year falls inside the SCOTUS `Black` reporter's window
 * [1861, 1862] inclusive, the result switches to `Black` instead. Outside
 * that window — or when no year was extracted — the default `Blackf.`
 * resolution stands. The literal `reporter` field on the citation is
 * preserved verbatim; only `normalizedReporter` shifts.
 */
/**
 * Issue #687: OCR/typo substitutions for ordinal-suffix reporters.
 * Common misreadings: `2d`→`2nd`/`2ds`/`2cl`, `3d`→`3rd`/`3ds`/`3cl`.
 * The substitution is applied as a fallback when the literal reporter
 * is not in reporters-db; we then look up the corrected form. The
 * literal `reporter` field on the citation is preserved verbatim — only
 * `normalizedReporter` switches to the canonical key. This lets parallel
 * resolution and downstream `reporterKey` consumers link the typo'd
 * variant to its real reporter.
 */
const OCR_TYPO_ORDINAL_REGEX = /(2|3)(nd|ds|cl|rd)$/i
function applyOcrTypoFix(reporter: string): string | undefined {
  const m = OCR_TYPO_ORDINAL_REGEX.exec(reporter)
  if (!m) return undefined
  const digit = m[1]
  return `${reporter.slice(0, m.index)}${digit}d`
}

export function resolveNormalizedReporter(reporter: string, year?: number): string | undefined {
  const reportersDb = getReportersSync()
  if (!reportersDb) return undefined

  let matches = reportersDb.byAbbreviation.get(reporter.toLowerCase())
  let effectiveReporter = reporter
  if (!matches || matches.length === 0) {
    // Issue #687: try OCR-typo fallback (`F.2nd` → `F.2d`).
    const fixed = applyOcrTypoFix(reporter)
    if (fixed) {
      const fixedMatches = reportersDb.byAbbreviation.get(fixed.toLowerCase())
      if (fixedMatches && fixedMatches.length > 0) {
        matches = fixedMatches
        effectiveReporter = fixed
      }
    }
    if (!matches || matches.length === 0) return undefined
  }

  const lower = effectiveReporter.toLowerCase()

  // Year-based era disambiguation for `Black.` (#572): the literal
  // `Black.` only maps to Blackford (Indiana) in reporters-db, but when
  // the citation year is 1861-1862 the intended reporter is SCOTUS
  // `Black` (which has no period in canonical form). Apply BEFORE the
  // generic resolution so the variation lookup doesn't lock us into
  // `Blackf.` first.
  if (
    lower === "black." &&
    year !== undefined &&
    year >= SCOTUS_BLACK_REPORTER_START_YEAR &&
    year <= SCOTUS_BLACK_REPORTER_END_YEAR
  ) {
    return "Black"
  }

  for (const entry of matches) {
    // (1) Canonical edition key match — return the literal key (preserves
    // upstream casing/spacing).
    for (const editionAbbr of Object.keys(entry.editions)) {
      if (editionAbbr.toLowerCase() === lower) {
        return editionAbbr
      }
    }
    // (2) Variation key match — the value is the canonical key.
    if (entry.variations) {
      for (const [variant, canonical] of Object.entries(entry.variations)) {
        if (variant.toLowerCase() === lower && canonical) {
          return canonical
        }
      }
    }
  }

  return undefined
}

/**
 * Compute the multi-factor confidence score for a case citation.
 *
 * Pure helper over the five signals the case-citation scorer cares about.
 * Factored out so post-pass mutations that change one of those signals
 * (notably `inheritParallelCaseName`, which propagates `caseName` onto
 * parallel-cite secondaries — #556) can re-derive confidence with the
 * same formula instead of being silently stuck at the pre-mutation value.
 *
 * Formula:
 *   - base 0.2
 *   - +0.3 if reporter is known (reporters-db hit, falling back to COMMON_REPORTERS)
 *   - +0.2 if year is present and <= current year
 *   - +0.15 if caseName is present
 *   - +0.1 if court is present
 *   - cap 1.0, rounded to 0.01
 *   - finally, blank-page placeholders floor at 0.5
 */
export function computeCaseConfidence(opts: {
  reporter: string
  year: number | undefined
  caseName: string | undefined
  court: string | undefined
  hasBlankPage: boolean
}): number {
  const { reporter, year, caseName, court, hasBlankPage } = opts
  let confidence = 0.2

  const reportersDb = getReportersSync()
  const dbMatch = reportersDb?.byAbbreviation.get(reporter.toLowerCase())
  if (dbMatch && dbMatch.length > 0) {
    confidence += 0.3
  } else if (COMMON_REPORTERS.has(reporter)) {
    confidence += 0.3
  }

  if (year !== undefined && year <= CURRENT_YEAR) {
    confidence += 0.2
  }

  if (caseName) {
    confidence += 0.15
  }

  if (court) {
    confidence += 0.1
  }

  confidence = Math.round(Math.min(confidence, 1.0) * 100) / 100

  if (hasBlankPage) {
    confidence = Math.max(confidence, 0.5)
  }

  return confidence
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
  originalText?: string,
  /** Clean-coordinate spans of sibling tokens. Used to:
   *  - bound the case-name backward walk so a parallel cite's caption is
   *    not absorbed into this cite's caseName,
   *  - skip past a contiguous parallel-cite chain (`, 198 A. 154, 35 L.Ed.2d 147`)
   *    when searching for the shared trailing year parenthetical so each
   *    cite in the chain gets year/court populated. */
  siblings?: ReadonlyArray<{ cleanStart: number; cleanEnd: number }>,
): FullCaseCitation {
  const { text, span } = token

  const core = parseCaseCitationCore({ token, transformationMap })
  const volume = core.volume
  const reporter = core.reporter
  const page = core.page
  const nominativeVolume = core.nominativeVolume
  const nominativeReporter = core.nominativeReporter
  const hasBlankPage = core.hasBlankPage
  const spans: CaseComponentSpans = { ...core.spans }

  // Initialize Phase 6 fields
  let year: number | undefined
  let court: string | undefined
  let date: StructuredDate | undefined
  let caseName: string | undefined
  let fullSpan: Span | undefined

  const envelopeContext = parseCaseCitationEnvelopeContext({
    cleanedText,
    tokenSpan: span,
    siblings,
  })

  const postfix = parseCaseCitationPostfix({
    text: cleanedText,
    tokenText: text,
    tokenStart: span.cleanStart,
    tokenEnd: span.cleanEnd,
    postChainStart: envelopeContext.postChainStart,
    hasNominativeReporter: nominativeVolume !== undefined,
  })
  const postfixSemantics = interpretCaseCitationPostfix(postfix, transformationMap)
  Object.assign(spans, postfixSemantics.spans)

  const pinciteInfo = postfixSemantics.pinciteInfo
  const pincite = postfixSemantics.pincite
  const unpublished = postfixSemantics.unpublished
  year = postfixSemantics.year
  court = postfixSemantics.court
  date = postfixSemantics.date
  const disposition = postfixSemantics.disposition
  const justices = postfixSemantics.justices
  const scope = postfixSemantics.scope
  const parentheticals = postfixSemantics.parentheticals
  const subsequentHistoryEntries = postfixSemantics.subsequentHistoryEntries

  // Infer court level/jurisdiction from reporter series
  const inferredCourt = inferCourtFromReporter(reporter)

  // Backward compat: set court string for SCOTUS when not already extracted
  if (!court && inferredCourt?.level === "supreme" && inferredCourt?.jurisdiction === "federal") {
    court = "scotus"
  }

  // Phase 6: Extract case name via backward search.
  let caseNameResult: ReturnType<typeof extractCaseName> | undefined
  if (cleanedText) {
    caseNameResult = extractCaseName(
      cleanedText,
      span.cleanStart,
      envelopeContext.caseNameLookback,
      {
        originalText,
        transformationMap,
      },
    )
    if (caseNameResult) {
      const caseNameSemantics = interpretCaseNameScan({
        caseNameResult,
        tokenSpan: span,
        postfixLastParentheticalEnd: postfix.lastParenthetical?.span.end,
        year,
        court,
        date,
        hasExistingYearSpan: spans.year !== undefined,
        transformationMap,
      })
      caseName = caseNameSemantics.caseName
      year = caseNameSemantics.year
      court = caseNameSemantics.court
      date = caseNameSemantics.date
      fullSpan = caseNameSemantics.fullSpan
      Object.assign(spans, caseNameSemantics.spans)
    }
  }

  // Parallel-cite fullSpan fallback: when this cite is a secondary parallel
  // (no case-name extracted because the bounded lookback hits the prior
  // cite's end) AND there is a close preceding sibling indicating a parallel
  // chain, still extend fullSpan through the shared trailing paren so
  // string-citation grouping and downstream span consumers see the full
  // citation extent. The bare cite's own cleanStart anchors the lower bound.
  // Cites without a preceding sibling (e.g., a standalone `500 F.2d 123 (2020)`
  // with no caption) intentionally do not get a fullSpan — that's existing
  // contract: "no case name → no fullSpan".
  if (!fullSpan && envelopeContext.hasCloseParallelPrev && postfix.lastParenthetical) {
    const lastParen = postfix.lastParenthetical
    if (lastParen.span.end > span.cleanEnd) {
      const fullCleanStart = span.cleanStart
      const fullCleanEnd = lastParen.span.end
      fullSpan = {
        cleanStart: fullCleanStart,
        cleanEnd: fullCleanEnd,
        originalStart: transformationMap.cleanToOriginal.get(fullCleanStart) ?? fullCleanStart,
        originalEnd: transformationMap.cleanToOriginal.get(fullCleanEnd) ?? fullCleanEnd,
      }
    }
  }

  // Phase 7: Extract party names from case name
  let plaintiff: string | undefined
  let plaintiffNormalized: string | undefined
  let defendant: string | undefined
  let defendantNormalized: string | undefined
  let proceduralPrefix: string | undefined
  let adminParenthetical: string | undefined
  let signal: FullCaseCitation["signal"] | undefined
  if (caseName) {
    const partySemantics = interpretCasePartySemantics({
      caseName,
      caseNameStart: caseNameResult?.nameStart,
      citationCoreStart: span.cleanStart,
      fullSpan,
      cleanedText,
      transformationMap,
    })
    caseName = partySemantics.caseName
    fullSpan = partySemantics.fullSpan
    plaintiff = partySemantics.plaintiff
    plaintiffNormalized = partySemantics.plaintiffNormalized
    defendant = partySemantics.defendant
    defendantNormalized = partySemantics.defendantNormalized
    proceduralPrefix = partySemantics.proceduralPrefix
    signal = partySemantics.signal
    adminParenthetical = partySemantics.adminParenthetical
    Object.assign(spans, partySemantics.spans)
  }

  // Translate positions from clean → original (citation core only - span unchanged)
  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  // Confidence comes from a shared pure helper so post-pass mutations
  // (e.g. inheritParallelCaseName, #556) can re-derive with the same formula.
  const confidence = computeCaseConfidence({
    reporter,
    year,
    caseName,
    court,
    hasBlankPage: hasBlankPage ?? false,
  })

  // Resolve the canonical Bluebook reporter via reporters-db so downstream
  // consumers (`reporterKey`, `bluebook`, parallel-group matching) can link
  // periodless / no-space variants (`F2d`, `Ill2d`, `OhioSt.`) to their
  // canonical editions. Returns `undefined` when reporters-db is not loaded
  // (degraded mode) or no variant/edition matches — see #571.
  //
  // `year` is passed so the resolver can disambiguate shared abbreviations
  // by era — currently `Black.` (SCOTUS 1861-1862) vs `Blackf.` (Indiana,
  // 1817-1847). See #572.
  const normalizedReporter = resolveNormalizedReporter(reporter, year)

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
    ...(normalizedReporter !== undefined ? { normalizedReporter } : {}),
    page,
    nominativeVolume,
    nominativeReporter,
    pincite,
    pinciteInfo,
    court,
    normalizedCourt: normalizeCourt(court),
    year,
    hasBlankPage,
    date,
    fullSpan,
    caseName,
    disposition,
    parentheticals,
    subsequentHistoryEntries,
    ...(unpublished ? { unpublished: true } : {}),
    ...(justices ? { justices } : {}),
    ...(scope ? { scope } : {}),
    ...(adminParenthetical ? { adminParenthetical } : {}),
    plaintiff,
    plaintiffNormalized,
    defendant,
    defendantNormalized,
    proceduralPrefix,
    inferredCourt,
    signal,
    spans,
  }
}
