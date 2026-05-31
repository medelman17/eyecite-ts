/**
 * Main Citation Extraction Pipeline
 *
 * Orchestrates the complete citation extraction flow:
 *   1. Clean text (remove HTML, normalize Unicode)
 *   2. Tokenize (apply patterns to find candidates)
 *   3. Extract (parse metadata from tokens)
 *
 * This is the primary public API for citation extraction.
 *
 * @module extract/extractCitations
 */

import { cleanText } from "@/clean"
import { detectFootnotes } from "@/footnotes/detectFootnotes"
import { mapFootnoteZones } from "@/footnotes/mapZones"
import { tagCitationsWithFootnotes } from "@/footnotes/tagging"
import type { FootnoteMap } from "@/footnotes/types"
import {
  computeCaseConfidence,
  extractAnnotation,
  extractCase,
  extractConstitutional,
  extractDocket,
  extractFederalRegister,
  extractFederalRule,
  extractStateRule,
  extractJournal,
  extractNeutral,
  extractPublicLaw,
  extractRestatement,
  extractSessionLaw,
  extractStatute,
  extractStatutesAtLarge,
  extractTreatise,
} from "@/extract"
import type { Pattern } from "@/patterns"
import {
  casePatterns,
  constitutionalPatterns,
  docketPatterns,
  federalRulePatterns,
  journalPatterns,
  neutralPatterns,
  secondaryAuthorityPatterns,
  sessionLawPatterns,
  shortFormPatterns,
  stateRulePatterns,
  statutePatterns,
} from "@/patterns"
import { parseBody } from "./statutes/parseBody"
import { tokenize } from "@/tokenize"
import type { Citation, HistorySignal } from "@/types/citation"
import { resolveCitations } from "../resolve"
import type { ResolutionOptions, ResolvedCitation } from "../resolve/types"
import { detectParallelCitations } from "./detectParallel"
import { detectStringCitations, detectLeadingSignals } from "./detectStringCites"
import { extractId, extractShortFormCase, extractSupra } from "./extractShortForms"
import { applyFalsePositiveFilters } from "./filterFalsePositives"
import { parsePincite } from "./pincite"
import { resolveOriginalSpan, type TransformationMap } from "@/types/span"

/**
 * Regex to parse "volume reporter page" from a citation token's text.
 * Used to build groupId and parallelCitations metadata for parallel citation groups.
 */
const CITATION_PARTS_RE = /^(\S+)\s+(.+)\s+(\d+)$/

/**
 * Options for customizing citation extraction behavior.
 */
export interface ExtractOptions {
  /**
   * Custom text cleaners (overrides defaults).
   *
   * If provided, these cleaners replace the default pipeline:
   * [stripHtmlTags, normalizeWhitespace, normalizeUnicode, fixSmartQuotes]
   *
   * @example
   * ```typescript
   * // Use only HTML stripping, skip Unicode normalization
   * const citations = extractCitations(text, {
   *   cleaners: [stripHtmlTags]
   * })
   * ```
   */
  cleaners?: Array<(text: string) => string>

  /**
   * Custom regex patterns (overrides defaults).
   *
   * If provided, these patterns replace the default pattern set:
   * [casePatterns, statutePatterns, journalPatterns, neutralPatterns, shortFormPatterns]
   *
   * @example
   * ```typescript
   * // Extract only case citations
   * const citations = extractCitations(text, {
   *   patterns: casePatterns
   * })
   * ```
   */
  patterns?: Pattern[]

  /**
   * Resolve short-form citations to their full antecedents (default: false).
   *
   * If true, returns ResolvedCitation[] with resolution metadata for short-form citations
   * (Id., supra, short-form case). Full citations are unchanged.
   *
   * @example
   * ```typescript
   * const text = "Smith v. Jones, 500 F.2d 100 (1974). Id. at 105."
   * const citations = extractCitations(text, { resolve: true })
   * // citations[1].resolution.resolvedTo === 0 (points to Smith v. Jones)
   * ```
   */
  resolve?: boolean

  /**
   * Options for citation resolution (only used if resolve: true).
   *
   * @example
   * ```typescript
   * const citations = extractCitations(text, {
   *   resolve: true,
   *   resolutionOptions: {
   *     scopeStrategy: 'paragraph',
   *     fuzzyPartyMatching: true
   *   }
   * })
   * ```
   */
  resolutionOptions?: ResolutionOptions

  /**
   * Remove citations flagged as likely false positives (default: false).
   *
   * When false (default), flagged citations get reduced confidence (0.1) and a warning.
   * When true, flagged citations are removed from results entirely.
   *
   * False positive detection uses:
   * - A static blocklist of known non-US reporter abbreviations (international, UK, European)
   * - A year plausibility heuristic (years before 1750 predate US legal reporting)
   *
   * @example
   * ```typescript
   * // Remove false positives from results
   * const citations = extractCitations(text, { filterFalsePositives: true })
   * ```
   */
  filterFalsePositives?: boolean

  /** Detect footnote zones and annotate citations with inFootnote/footnoteNumber (default: false) */
  detectFootnotes?: boolean
}

/**
 * Extracts legal citations from text using the full parsing pipeline.
 *
 * Pipeline flow:
 * 1. **Clean:** Remove HTML tags, normalize Unicode, fix smart quotes
 * 2. **Tokenize:** Apply regex patterns to find citation candidates
 * 3. **Extract:** Parse metadata (volume, reporter, page, etc.)
 * 4. **Translate:** Map positions from cleaned text back to original text
 *
 * This function is synchronous because all stages (cleaning, tokenization,
 * extraction) are synchronous. For async operations (e.g., future reporters-db
 * lookups), use extractCitationsAsync().
 *
 * Position tracking:
 * - TransformationMap is built during cleaning
 * - Tokens contain positions in cleaned text (cleanStart/cleanEnd)
 * - Extraction translates cleaned positions → original positions
 * - Final citations have originalStart/originalEnd pointing to input text
 *
 * Warnings from cleaning layer are attached to all extracted citations.
 *
 * @param text - Raw text to extract citations from (may contain HTML, Unicode)
 * @param options - Optional customization (cleaners, patterns)
 * @returns Array of citations with parsed metadata and accurate positions
 *
 * @example
 * ```typescript
 * const text = "See Smith v. Doe, 500 F.2d 123 (9th Cir. 2020)"
 * const citations = extractCitations(text)
 * // citations[0] = {
 * //   type: "case",
 * //   volume: 500,
 * //   reporter: "F.2d",
 * //   page: 123,
 * //   court: "9th Cir.",
 * //   year: 2020,
 * //   span: { originalStart: 18, originalEnd: 30, ... }
 * // }
 * ```
 *
 * @example
 * ```typescript
 * // Extract from HTML
 * const html = "<p>In <b>Smith</b>, 500 F.2d 123, the court held...</p>"
 * const citations = extractCitations(html)
 * // HTML is stripped, positions point to original HTML
 * ```
 *
 * @example
 * ```typescript
 * // Extract multiple citation types
 * const text = "See 42 U.S.C. § 1983; Smith, 500 F.2d 123; 123 Harv. L. Rev. 456"
 * const citations = extractCitations(text)
 * // citations[0].type === "statute"
 * // citations[1].type === "case"
 * // citations[2].type === "journal"
 * ```
 */
export function extractCitations(
  text: string,
  options: ExtractOptions & { resolve: true },
): ResolvedCitation[]
export function extractCitations(text: string, options?: ExtractOptions): Citation[]
export function extractCitations(
  text: string,
  options?: ExtractOptions,
): Citation[] | ResolvedCitation[] {
  const startTime = performance.now()

  // Step 1: Clean text
  const { cleaned, transformationMap, warnings } = cleanText(text, options?.cleaners)

  // Step 1.5: Detect footnote zones (opt-in)
  let cleanFootnoteMap: FootnoteMap | undefined
  if (options?.detectFootnotes) {
    const rawZones = detectFootnotes(text)
    if (rawZones.length > 0) {
      cleanFootnoteMap = mapFootnoteZones(rawZones, transformationMap)
    }
  }

  // Step 2: Tokenize (synchronous)
  // Note: Pattern order matters for deduplication - more specific patterns first
  // USC and CFR patterns are placed BEFORE casePatterns so the broad
  // state-reporter regex (which matches `42 USC 1983` as vol-reporter-page)
  // is subsumed by the more specific federal-statute match. Without this,
  // `42 USC 1983` mis-types as `case`. #428
  const federalStatutePatterns = statutePatterns.filter(
    (p) => p.id === "usc" || p.id === "cfr" || p.id === "irc",
  )
  const otherStatutePatterns = statutePatterns.filter(
    (p) => p.id !== "usc" && p.id !== "cfr" && p.id !== "irc",
  )
  const allPatterns = options?.patterns || [
    ...neutralPatterns, // Most specific (year-based format)
    ...sessionLawPatterns, // State session laws — anchored by "Stats." / "Nev. Stat." (#350, #779)
    ...docketPatterns, // Docket-number citations (anchored by "No. ")
    ...shortFormPatterns, // Short-form (requires " at " keyword)
    ...federalRulePatterns, // Fed. R. Civ. P. etc. — before casePatterns (#576, #582)
    ...stateRulePatterns, // I.R.C.P., N.C. R. App. P., SCACR, RCFC — before casePatterns (#636)
    ...secondaryAuthorityPatterns, // Restatement / treatise / A.L.R. — before casePatterns (#578, #579, #581)
    ...federalStatutePatterns, // USC/CFR/IRC — before casePatterns (#428)
    ...casePatterns, // Case citations (reporter-specific)
    ...constitutionalPatterns, // Constitutional citations (more specific than statutes)
    ...otherStatutePatterns, // State statutes (code-specific)
    ...journalPatterns, // Least specific (broad pattern)
  ]
  const tokens = tokenize(cleaned, allPatterns)

  // Step 3: Deduplicate overlapping tokens via priority-aware subsumption.
  //
  // Multiple patterns may match the same or overlapping text:
  //   (a) Exact-span duplicates — e.g., `100 F.3d 456` matches both
  //       `federal-reporter` and `state-reporter`. Keep the higher-priority
  //       one (earlier in the pattern list = more specific).
  //   (b) Subsumed matches — a token whose span is a strict subset of
  //       another token's span, and the containing token comes from a
  //       more-or-equally-specific pattern. Canonical failure: `state-reporter`
  //       or `law-review` treating `F.3d at` / `U.S. at` as a reporter/journal
  //       name inside a `shortFormCase` cite (see #207, #209). Drop the
  //       subsumed token only when the container is at least as specific —
  //       otherwise we'd swallow legitimate shorter matches (e.g., a
  //       `state-constitution` token that sits inside a broader `named-code`
  //       match for "Cal. Const. art. I, § 7.").
  //   (c) Proper overlaps — two tokens whose spans intersect but neither
  //       contains the other. Canonical failure: HTML block fusion
  //       `<p>500 F.2d 123</p><p>Then citing 600 F.2d 234</p>` cleans to
  //       `500 F.2d 123 Then citing 600 F.2d 234`, where the broad journal
  //       regex matches `123 Then citing 600` — a phantom that overlaps
  //       the trailing page of the first cite AND the leading volume of
  //       the second (#558). The container-only dedup left these phantoms
  //       in place because no containment relation exists. The second
  //       pass below catches them: drop any kept token that is properly
  //       overlapped by a higher-priority token elsewhere in the kept
  //       list.
  //
  // Priority = first occurrence index in `allPatterns`. Duplicate patternIds
  // (e.g., "supra") share the earliest index, which is fine — they form a
  // single priority bucket.
  const priorityByPatternId = new Map<string, number>()
  for (let i = 0; i < allPatterns.length; i++) {
    const id = allPatterns[i].id
    if (!priorityByPatternId.has(id)) priorityByPatternId.set(id, i)
  }
  const priorityOf = (t: (typeof tokens)[number]): number =>
    priorityByPatternId.get(t.patternId) ?? Number.POSITIVE_INFINITY

  // Sort by (cleanStart asc, cleanEnd desc, priority asc) so containers come
  // before their contained tokens at each start position, and within any
  // (start, end) bucket the higher-priority token comes first.
  const sortedTokens = [...tokens].sort(
    (a, b) =>
      a.span.cleanStart - b.span.cleanStart ||
      b.span.cleanEnd - a.span.cleanEnd ||
      priorityOf(a) - priorityOf(b),
  )
  const containmentDeduped: typeof tokens = []
  for (const token of sortedTokens) {
    let subsumed = false
    for (const kept of containmentDeduped) {
      const contains =
        kept.span.cleanStart <= token.span.cleanStart && kept.span.cleanEnd >= token.span.cleanEnd
      if (!contains) continue
      if (priorityOf(kept) > priorityOf(token)) continue // kept is less specific, don't let it swallow
      // `kept` is at least as specific AND contains this token. Drop `token`
      // if this is a strict containment or an equal-span lower-priority duplicate.
      if (
        kept.span.cleanStart < token.span.cleanStart ||
        kept.span.cleanEnd > token.span.cleanEnd ||
        priorityOf(kept) < priorityOf(token)
      ) {
        subsumed = true
        break
      }
    }
    if (!subsumed) containmentDeduped.push(token)
  }

  // Second pass — proper-overlap dedup (case (c) above).
  //
  // Walk the containment-deduped tokens in priority order (highest
  // priority first). For each token, drop it if any kept (already
  // accepted) token has a STRICTLY HIGHER priority and a span that
  // intersects the current token's span. Strict containments were already
  // handled above, so any remaining intersect-but-not-contain is a proper
  // overlap and the lower-priority side loses.
  //
  // Equal-priority overlaps are kept (preserve all matches from a single
  // pattern bucket — they'll be sorted out by downstream extraction /
  // string-cite grouping / annotation passes, none of which assume
  // disjoint spans within a bucket).
  const tokensByPriority = [...containmentDeduped].sort(
    (a, b) =>
      priorityOf(a) - priorityOf(b) ||
      a.span.cleanStart - b.span.cleanStart ||
      b.span.cleanEnd - a.span.cleanEnd,
  )
  const overlapKept: typeof tokens = []
  for (const token of tokensByPriority) {
    const overlapped = overlapKept.some(
      (kept) =>
        priorityOf(kept) < priorityOf(token) &&
        kept.span.cleanStart < token.span.cleanEnd &&
        kept.span.cleanEnd > token.span.cleanStart,
    )
    if (!overlapped) overlapKept.push(token)
  }
  // Restore document order for downstream passes that assume left-to-right
  // sequence (string-cite grouping, parallel detection, etc.).
  const deduplicatedTokens = overlapKept.sort(
    (a, b) => a.span.cleanStart - b.span.cleanStart || b.span.cleanEnd - a.span.cleanEnd,
  )

  // Step 3.5: Detect parallel citation groups
  // Map of primary token index -> array of secondary token indices
  const parallelGroups = detectParallelCitations(deduplicatedTokens, cleaned)

  // Build reverse-lookup: secondary index -> primary index (O(1) instead of O(N×M))
  const secondaryToGroup = new Map<number, number>()
  for (const [primary, secondaries] of parallelGroups.entries()) {
    for (const s of secondaries) secondaryToGroup.set(s, primary)
  }

  // Span list for all case-shape tokens. Passed to extractCase so the per-cite
  // pincite/year/caseName logic can see what's adjacent and avoid scanning
  // INTO neighbor citations (parallel-cite chains share a trailing year paren
  // and the case-name backward walk for a parallel cite must stop at the
  // prior cite's end).
  const caseTokenSpans = deduplicatedTokens
    .filter((t) => t.type === "case")
    .map((t) => ({ cleanStart: t.span.cleanStart, cleanEnd: t.span.cleanEnd }))

  // Step 4: Extract citations from deduplicated tokens
  const citations: Citation[] = []
  for (let i = 0; i < deduplicatedTokens.length; i++) {
    const token = deduplicatedTokens[i]
    let citation: Citation

    switch (token.type) {
      case "case":
        // Check pattern ID to distinguish short-form from full citations
        if (token.patternId === "id" || token.patternId === "ibid") {
          citation = extractId(token, transformationMap, cleaned)
        } else if (token.patternId === "supra") {
          citation = extractSupra(token, transformationMap, cleaned)
        } else if (token.patternId === "shortFormCase") {
          citation = extractShortFormCase(token, transformationMap, cleaned)
        } else {
          citation = extractCase(token, transformationMap, cleaned, text, caseTokenSpans)
        }
        break
      case "docket": {
        // Docket extractor returns undefined when no case-name anchor is
        // found — the bare "No. <N> (<court> <year>)" shape is too generic
        // to surface without context.
        const result = extractDocket(token, transformationMap, cleaned, text)
        if (!result) continue
        citation = result
        break
      }
      case "statute":
        citation = extractStatute(token, transformationMap)
        break
      case "journal": {
        const journalCitation = extractJournal(token, transformationMap, cleaned)
        // Phantom-prose filter (#615). Without a journals-db gate, the broad
        // journal regex can fire on `[vol] [Capitalized Run] [page]` shapes
        // where the capitalized run is just sentence prose (`1974 Senator
        // Smith Jones 500`). Real journal abbreviations are either single
        // words (`Neurology`, `JAMA`) or contain at least one period or
        // short token (`Harv. L. Rev.`, `Brook L Rev`, `Yale L J` — `L`,
        // `J`, `Rev` are short Bluebook abbreviations). Multi-word captures
        // that lack both a period AND a short (≤2 char) word are almost
        // always phantoms; drop them here.
        const name = journalCitation.journal
        const words = name.split(/\s+/)
        const isPhantom =
          words.length >= 2 && !name.includes(".") && !words.some((w) => w.length <= 2)
        if (isPhantom) continue
        citation = journalCitation
        break
      }
      case "neutral":
        citation = extractNeutral(token, transformationMap, cleaned)
        break
      case "publicLaw":
        citation = extractPublicLaw(token, transformationMap)
        break
      case "federalRegister":
        citation = extractFederalRegister(token, transformationMap, cleaned)
        break
      case "statutesAtLarge":
        citation = extractStatutesAtLarge(token, transformationMap, cleaned)
        break
      case "sessionLaw":
        citation = extractSessionLaw(token, transformationMap)
        break
      case "constitutional":
        citation = extractConstitutional(token, transformationMap)
        break
      case "federalRule":
        citation = extractFederalRule(token, transformationMap)
        break
      case "stateRule":
        citation = extractStateRule(token, transformationMap)
        break
      case "restatement":
        citation = extractRestatement(token, transformationMap)
        break
      case "treatise":
        citation = extractTreatise(token, transformationMap)
        break
      case "annotation":
        citation = extractAnnotation(token, transformationMap)
        break
      default:
        // Unknown type - skip
        continue
    }

    // Attach cleaning warnings to citation if any
    if (warnings.length > 0) {
      citation.warnings = [...(citation.warnings || []), ...warnings]
    }

    // Update processing time
    citation.processTimeMs = performance.now() - startTime

    // Populate parallel citation metadata (Phase 8)
    if (citation.type === "case") {
      const isPrimary = parallelGroups.has(i)
      const isSecondary = secondaryToGroup.has(i)

      if (isPrimary || isSecondary) {
        const primaryIndex = isSecondary ? (secondaryToGroup.get(i) ?? i) : i
        const primaryToken = deduplicatedTokens[primaryIndex]
        const match = CITATION_PARTS_RE.exec(primaryToken.text)
        if (match) {
          const [, volume, reporter, page] = match
          citation.groupId = `${volume}-${reporter.replace(/\s+/g, ".")}-${page}`

          if (isPrimary) {
            const secondaryIndices = parallelGroups.get(i) ?? []
            citation.parallelCitations = secondaryIndices.map((secIdx) => {
              const secToken = deduplicatedTokens[secIdx]
              const secMatch = CITATION_PARTS_RE.exec(secToken.text)
              if (secMatch) {
                const [, secVol, secRep, secPage] = secMatch
                return {
                  volume: /^\d+$/.test(secVol) ? Number.parseInt(secVol, 10) : secVol,
                  reporter: secRep,
                  page: Number.parseInt(secPage, 10),
                }
              }
              return { volume: 0, reporter: "", page: 0 }
            })
          }
        }
      }
    }

    citations.push(citation)
  }

  // Step 4.3: Expand constitutional citations chained with `;` that
  // share an implied jurisdiction with the preceding cite. (#707)
  expandChainedConstitutional(citations, cleaned, transformationMap)

  // Step 4.35: Detect bare-prefix `§§ N, N` lists that lack any code
  // identifier in front of the §§ marker. These never produce a head cite
  // through normal tokenization, so seed a head before expansion. (#563)
  detectBareSectionLists(citations, cleaned, transformationMap)

  // Step 4.4: Expand plural-section statute lists (`§§ N, N` /
  // `§§ N and N`) into one statute citation per section. (#453)
  expandPluralSectionList(citations, cleaned, transformationMap)

  // Step 4.42: Bare `§ N` after a full statute citation is a short-form
  // statute reference that inherits title / code / jurisdiction from its
  // antecedent (`§ X; see also § Y`). (#567)
  detectBareSectionShortForms(citations, cleaned, transformationMap)

  // Step 4.5: Link subsequent history citations using Union-Find.
  // Three-phase approach: match signals → union chains → aggregate entries.
  // Invariant: citations are in text order (guaranteed by token-order processing above).
  linkSubsequentHistory(citations)

  // Step 4.55: Inherit case name from chain root for subsequent-history children (#224).
  // Per Bluebook 10.7, all citations in a history chain reference one case.
  // Without this, extractCaseName scans back from the child, captures the
  // parent cite + connector ("Smith v. Doe, 100 F.3d 200 (...), aff'd"),
  // and produces a nonsense caseName.
  inheritSubsequentHistoryCaseName(citations)

  // Step 4.6: Propagate caseName from the primary onto each parallel-cite
  // secondary (#282). Detection in step 4 sets the shared `groupId` and
  // populates `parallelCitations` on the primary; this pass fills in the
  // shared caption fields on secondaries that have no caseName of their own.
  // Runs AFTER 4.55 so a primary that inherited from a history chain root
  // still propagates that inherited caption to its parallels.
  inheritParallelCaseName(citations)

  // Step 4.65: Attach year-of-edition / publisher from a trailing parenthetical
  // to statute citations (#285). E.g. `HRS § 91-14(a) (1985)` →  year=1985;
  // `28 U.S.C. § 1331 (West 2018)` → publisher="West", year=2018.
  attachStatuteYearParen(citations, cleaned)

  // Step 4.7: Disambiguate bare-section statute jurisdiction by document
  // context. NM and WV both use `§ N-N-N` shapes; when a WV full citation
  // appears earlier in the document, follow-on bare sections inherit WV
  // jurisdiction. (#432)
  inheritBareSectionJurisdiction(citations, cleaned)

  // Step 4.71: Reassign jurisdiction for bare `Code §` cites that the
  // VA bare-code extractor claimed but actually belong to D.C. Both
  // jurisdictions write bare `Code § N.N-N` and the period-laden
  // section format is identical, so the only disambiguator is upstream
  // context. (#659)
  reassignDcCodeJurisdiction(citations, cleaned)

  // Step 4.72: Detect bare-party shortform back-references (`Smith, at 12`)
  // anchored to earlier full case citations. (#439)
  detectBarePartyBackReferences(citations, cleaned, transformationMap)

  // Step 4.75: Detect string citation groups (semicolon-separated)
  detectStringCitations(citations, cleaned)

  // Step 4.8: Detect leading introductory signals for all citations.
  // Runs after string cite detection (which sets mid-group signals) so we
  // only scan backward for citations that still lack a signal.
  detectLeadingSignals(citations, cleaned)

  // Step 4.85: Propagate `compare` signal across `with` connector (#702).
  // Bluebook Rule 1.2(b) treats `compare A with B` as paired — B inherits
  // the comparison signal from A.
  propagateCompareWithSignal(citations, cleaned)

  // Step 4.9: Apply false positive filters (blocklist + year heuristic).
  // Passing `text` (the original pre-cleaning input) lets the filter detect
  // citations whose span crosses a hard line break in the source — those are
  // structural false positives that the cleaner makes invisible (#547).
  const filtered = applyFalsePositiveFilters(
    citations,
    options?.filterFalsePositives ?? false,
    text,
  )

  // Step 4.95: Tag citations with footnote metadata
  if (cleanFootnoteMap) {
    tagCitationsWithFootnotes(filtered, cleanFootnoteMap)
  }

  // Step 5: Resolve short-form citations if requested
  if (options?.resolve) {
    const resolutionOpts = cleanFootnoteMap
      ? { ...options.resolutionOptions, footnoteMap: cleanFootnoteMap }
      : options.resolutionOptions
    return resolveCitations(filtered, text, resolutionOpts)
  }

  return filtered
}

/**
 * Asynchronous version of extractCitations().
 *
 * Currently wraps the synchronous extractCitations() function. This API
 * exists for future extensibility when async operations are added:
 * - Async reporters-db lookups (Phase 3)
 * - Async resolution/annotation services
 * - Web Workers for parallel processing
 *
 * For now, this function immediately resolves with the same results as
 * the synchronous version.
 *
 * Note (#555): a previous version of this fix had `extractCitationsAsync`
 * auto-await `loadReporters()` so the DB-backed reporter validation kicked
 * in automatically on the async path. That coupled the core bundle to the
 * data chunk and tripped the size-limit budget. The async auto-load was
 * deferred so callers opt in via an explicit `await loadReporters()`.
 *
 * @param text - Raw text to extract citations from
 * @param options - Optional customization (cleaners, patterns, resolve)
 * @returns Promise resolving to array of citations (or ResolvedCitation[] if resolve: true)
 *
 * @example
 * ```typescript
 * const citations = await extractCitationsAsync(text, { resolve: true })
 * // Returns ResolvedCitation[] with resolution metadata
 * ```
 */
export async function extractCitationsAsync(
  text: string,
  options: ExtractOptions & { resolve: true },
): Promise<ResolvedCitation[]>
export async function extractCitationsAsync(
  text: string,
  options?: ExtractOptions,
): Promise<Citation[]>
export async function extractCitationsAsync(
  text: string,
  options?: ExtractOptions,
): Promise<Citation[] | ResolvedCitation[]> {
  // Async wrapper for future extensibility (e.g., async reporters-db lookup)
  // For MVP, wraps synchronous extractCitations
  return extractCitations(text, options)
}

/**
 * Issue #702 — Bluebook Rule 1.2(b) paired-comparison signal. When a
 * citation carries `signal=compare` and the gap to the next citation
 * contains `with`, propagate the `compare` signal to the following
 * citation. `compare A with B` is a paired construct; both citations
 * belong to the same comparison.
 */
function propagateCompareWithSignal(citations: Citation[], cleaned: string): void {
  for (let i = 0; i < citations.length - 1; i++) {
    const a = citations[i]
    const b = citations[i + 1]
    if (a.signal !== "compare") continue
    if (b.signal) continue
    const gap = cleaned.slice(a.span.cleanEnd, b.span.cleanStart)
    if (!/\bwith\b/i.test(gap)) continue
    ;(b as { signal?: typeof a.signal }).signal = "compare"
  }
}

/**
 * Issue #707 — Expand constitutional citations chained with `;` that
 * share an implied jurisdiction with the preceding cite.
 */
function expandChainedConstitutional(
  citations: Citation[],
  cleaned: string,
  transformationMap: TransformationMap,
): void {
  const added: Citation[] = []
  // Two chain shapes:
  //   1. `; art./amend. <numeral>` — full continuation with explicit
  //      article/amendment keyword (#707).
  //   2. `, <numeral>` — bare-numeral continuation inheriting the
  //      article-or-amendment type from the head cite (#321 partial).
  //      Only valid when head cite has article or amendment set —
  //      we use that to decide which field the continuation populates.
  const chainRe =
    /^\s*;\s*((?:art(?:icle)?\.?|amend(?:ment)?\.?|amdt\.?)\s+([IVX]+|\d+))(?:[,;]?\s*§\s*([\w-]+))?(?:[,;]?\s*cl\.?\s*(\d+))?/i
  const bareNumeralChainRe = /^\s*(?:,|and)\s+([IVX]+|\d+)\b/

  for (const c of citations) {
    if (c.type !== "constitutional") continue
    const jurisdiction = (c as { jurisdiction?: string }).jurisdiction
    if (!jurisdiction) continue
    const headIsAmendment = (c as { amendment?: number }).amendment !== undefined
    const headIsArticle = (c as { article?: number }).article !== undefined
    let cursor = c.span.cleanEnd
    while (cursor < cleaned.length) {
      const tail = cleaned.slice(cursor)
      const m = chainRe.exec(tail)
      const bareMatch = !m && (headIsAmendment || headIsArticle)
        ? bareNumeralChainRe.exec(tail)
        : null
      if (!m && !bareMatch) break

      if (m) {
        const matchedText = m[0]
        const article = m[1]
        const numeralText = m[2]
        const section = m[3]
        const clauseText = m[4]
        const isAmendment = /^amend|^amdt/i.test(article)
        const numeral = parseChainNumeral(numeralText)
        if (numeral === undefined) break
        const matchStart = cursor + matchedText.indexOf(article)
        const matchEnd = cursor + matchedText.length
        const { originalStart, originalEnd } = resolveOriginalSpan(
          { cleanStart: matchStart, cleanEnd: matchEnd },
          transformationMap,
        )
        const cite: Citation = {
          type: "constitutional",
          text: cleaned.slice(matchStart, matchEnd),
          span: { cleanStart: matchStart, cleanEnd: matchEnd, originalStart, originalEnd },
          confidence: c.confidence,
          matchedText: cleaned.slice(matchStart, matchEnd),
          processTimeMs: 0,
          patternsChecked: 1,
          jurisdiction,
          ...(isAmendment ? { amendment: numeral } : { article: numeral }),
          ...(section ? { section } : {}),
          ...(clauseText ? { clause: Number.parseInt(clauseText, 10) } : {}),
        } as Citation
        added.push(cite)
        cursor = matchEnd
      } else if (bareMatch) {
        const matchedText = bareMatch[0]
        const numeralText = bareMatch[1]
        const numeral = parseChainNumeral(numeralText)
        if (numeral === undefined) break
        const matchStart = cursor + matchedText.indexOf(numeralText)
        const matchEnd = cursor + matchedText.length
        const { originalStart, originalEnd } = resolveOriginalSpan(
          { cleanStart: matchStart, cleanEnd: matchEnd },
          transformationMap,
        )
        const cite: Citation = {
          type: "constitutional",
          text: cleaned.slice(matchStart, matchEnd),
          span: { cleanStart: matchStart, cleanEnd: matchEnd, originalStart, originalEnd },
          confidence: c.confidence,
          matchedText: cleaned.slice(matchStart, matchEnd),
          processTimeMs: 0,
          patternsChecked: 1,
          jurisdiction,
          ...(headIsAmendment ? { amendment: numeral } : { article: numeral }),
        } as Citation
        added.push(cite)
        cursor = matchEnd
      }
    }
  }
  citations.push(...added)
}

const CHAIN_WORD_ORDINAL: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5,
  sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
}
function parseChainNumeral(raw: string): number | undefined {
  if (!raw) return undefined
  if (/^\d+$/.test(raw)) return Number.parseInt(raw, 10)
  const word = raw.toLowerCase()
  if (word in CHAIN_WORD_ORDINAL) return CHAIN_WORD_ORDINAL[word]
  if (/^[IVX]+$/i.test(raw)) {
    const map: Record<string, number> = { I: 1, V: 5, X: 10 }
    let total = 0
    let prev = 0
    for (const ch of raw.toUpperCase()) {
      const v = map[ch] ?? 0
      if (v > prev) total += v - 2 * prev
      else total += v
      prev = v
    }
    return total > 0 ? total : undefined
  }
  return undefined
}

/**
 * Link subsequent history citations using a three-phase Union-Find approach.
 * Replaces the old mutation-during-iteration pattern with cleanly separated phases.
 */
function linkSubsequentHistory(citations: Citation[]): void {
  // Phase 1: Signal matching — collect (parent, child) pairs without mutating
  // citations. Each parent walks its own scanner-captured
  // `subsequentHistoryEntries`; each entry is paired with the nearest case
  // citation that starts after the entry's signal text. Multiple parents may
  // pair with the same child when parallel cites share a trailing signal.
  const pairs: Array<{ parentIdx: number; childIdx: number; signal: HistorySignal }> = []

  for (let i = 0; i < citations.length; i++) {
    const parent = citations[i]
    if (parent.type !== "case" || !parent.subsequentHistoryEntries) continue

    const entries = parent.subsequentHistoryEntries
    let entryIdx = 0

    for (let j = i + 1; j < citations.length && entryIdx < entries.length; j++) {
      const child = citations[j]
      if (child.type !== "case") continue

      const signalEnd = entries[entryIdx].signalSpan.cleanEnd
      if (child.span.cleanStart >= signalEnd) {
        pairs.push({ parentIdx: i, childIdx: j, signal: entries[entryIdx].signal })
        entryIdx++
      }
    }
  }

  if (pairs.length === 0) return

  // Phase 2: Resolve each child to its canonical parent. When several pairs
  // target the same child (e.g., a parent + its parallel-cite siblings all
  // carry the same trailing signal on their own `subsequentHistoryEntries`),
  // the parent with the LOWEST index wins — that's the primary cite of the
  // immediately-preceding chain link. The scanner only attaches signals it
  // sees BEFORE encountering the next citation token, so a non-primary
  // upstream cite cannot pair with this child unless it sits in the same
  // parallel group as the primary — picking the lowest index naturally points
  // at the primary. The previous Union-Find approach collapsed every chain
  // link onto a single root, which (a) wrongly attributed second-tier history
  // entries to the original cite (`cert. denied` of an `aff'd` child became
  // the original's cert. denial) and (b) destroyed the second-tier child's
  // own `subsequentHistoryEntries`. Closes #527.
  const bestParent = new Map<number, { parentIdx: number; signal: HistorySignal }>()
  for (const pair of pairs) {
    const current = bestParent.get(pair.childIdx)
    if (!current || pair.parentIdx < current.parentIdx) {
      bestParent.set(pair.childIdx, { parentIdx: pair.parentIdx, signal: pair.signal })
    }
  }

  // Phase 3: Set back-pointers on children. Entries stay where the scanner
  // attached them — the root's own scanner-captured entries are correct
  // (just `affirmed`, not the downstream `cert. denied`), and each downstream
  // cite keeps its own scanner-captured entries (e.g., the affirming cite
  // keeps `[cert. denied]`).
  for (const [childIdx, { parentIdx, signal }] of bestParent) {
    const child = citations[childIdx]
    if (child.type !== "case") continue
    child.subsequentHistoryOf = { index: parentIdx, signal }
  }
}

/**
 * Inherit case name fields from the chain root for subsequent-history children.
 *
 * In a chain like `<full cite A>, modified on other grounds, <full cite B>`,
 * citation B has no preceding case-name string in the document — it implicitly
 * shares A's case name (Bluebook Rule 10.7). The default case-name scanner
 * walks left from B and captures all of A's text plus the history connector.
 *
 * After `linkSubsequentHistory` has set `subsequentHistoryOf` back-pointers,
 * this pass overwrites the child's case-name fields with the chain root's,
 * clears component spans (the child has no anchor), and trims `fullSpan`
 * back to the child's own citation core.
 *
 * Closes #224.
 */
function inheritSubsequentHistoryCaseName(citations: Citation[]): void {
  // Issue #620: multi-link chains like `<root>, aff'd, <A>, cert. denied,
  // <B>` need parents processed before children. A linear pass works only
  // because chain links happen to appear in document order; any future
  // re-ordering of `citations` would silently break multi-link
  // propagation. Run until quiescence (fixed-point iteration) — robust
  // to array order and bounded by chain depth.
  let mutated = true
  let safetyIterations = 0
  const MAX_ITERATIONS = citations.length + 1
  while (mutated && safetyIterations < MAX_ITERATIONS) {
    mutated = false
    safetyIterations++
    for (const child of citations) {
      if (child.type !== "case") continue
      if (!child.subsequentHistoryOf) continue
      if (child.caseName) continue // already inherited in prior iteration
      const parent = citations[child.subsequentHistoryOf.index]
      if (!parent || parent.type !== "case") continue
      if (!parent.caseName) continue

      child.caseName = parent.caseName
      child.plaintiff = parent.plaintiff
      child.defendant = parent.defendant
      child.plaintiffNormalized = parent.plaintiffNormalized
      child.defendantNormalized = parent.defendantNormalized
      child.proceduralPrefix = parent.proceduralPrefix

      if (child.spans) {
        child.spans.caseName = undefined
        child.spans.plaintiff = undefined
        child.spans.defendant = undefined
      }

      // Trim fullSpan to the child's own citation core. extractCaseName had
      // anchored fullSpan at the parent's case name; that's not the child's
      // text. Keep the original cleanEnd/originalEnd (parenthetical end).
      if (child.fullSpan) {
        child.fullSpan = {
          cleanStart: child.span.cleanStart,
          cleanEnd: child.fullSpan.cleanEnd,
          originalStart: child.span.originalStart,
          originalEnd: child.fullSpan.originalEnd,
        }
      }

      // Re-derive confidence with the now-populated caseName (#613).
      child.confidence = computeCaseConfidence({
        reporter: child.reporter,
        year: child.year,
        caseName: child.caseName,
        court: child.court,
        hasBlankPage: child.hasBlankPage ?? false,
      })

      mutated = true
    }
  }
}

/**
 * Propagate caseName fields from the primary onto each parallel-cite secondary.
 *
 * A parallel-citation group (`Roe v. Wade, 410 U.S. 113, 93 S. Ct. 705, 35 L. Ed. 2d 147
 * (1973)`) shares one caption across multiple reporter citations. Step 4 in the main
 * pipeline assigns the shared `groupId` to every cite in the group and populates
 * `parallelCitations` on the primary, but only the primary's per-cite case-name
 * extraction captures `Roe v. Wade` — secondaries land with `caseName === undefined`.
 *
 * The primary in a group is the cite that has a non-undefined `caseName` (it appears
 * first in document order and so is the only one the backward case-name scan can anchor
 * on without breaking the parallel-cite disambiguation from #281). This pass joins on
 * `groupId`, takes the first cite per group that has a `caseName`, and copies the
 * shared caption fields onto every other cite in the same group.
 *
 * Closes #282.
 */
/**
 * Statute year-of-edition parenthetical regex (#285 + #349).
 *
 * Matches a parenthetical that follows a statute citation core. Anchored at
 * the start of the lookahead text (we substring from `span.cleanEnd`) and
 * allows whitespace, an optional comma + whitespace, and an optional
 * `, at <pincite>` intervening text. The parenthetical body is one of:
 *
 *   - `(YYYY)`                  — bare year
 *   - `(Publisher YYYY)`        — publisher-first (`(West 2018)`,
 *                                  `(Lexis Nexis 2019)`)
 *   - `(Label. YYYY)`           — edition-label-first (`(Repl. 1996)`,
 *                                  `(Supp. 1985)`, `(Cum. Supp. 1985)`)
 *   - `(YYYY Label.)`           — year-first edition label (`(1969 Supp.)`,
 *                                  `(1985 Cum. Supp.)`)
 *
 * Subsection parens like `(a)` and `(1)` don't match — the body must contain
 * a 4-digit year. The pre/post token (group 1 / group 3) admits a trailing
 * `.` and an optional second capitalized word so `Cum. Supp.` and
 * `Lexis Nexis` both flow through the same regex.
 */
// Year supports optional hyphenated year-range suffix (`1975-76`, `1973-1975`)
// — Arizona and a few other states use multi-year supplement parentheticals
// like `(Supp.1975-76)`. The first year is captured; the suffix is consumed
// but not separately reported. #420
const STATUTE_YEAR_PAREN_REGEX =
  /^\s*(?:,\s*(?:at\s+)?\d+(?:-\d+)?\s*)?\(\s*([A-Z][A-Za-z]+\.?(?:\s+[A-Z][A-Za-z]+\.?)?)?\s*(\d{4})(?:-\d{2,4})?\s*([A-Z][A-Za-z]+\.?(?:\s+[A-Z][A-Za-z]+\.?)?)?\s*\)/

/**
 * Edition-label set — captured tokens that should populate `editionLabel`
 * rather than `publisher`. `Repl.` = replacement volume, `Supp.` = supplement,
 * `Cum. Supp.` = cumulative supplement. `Reissue` = reissued volume
 * (Nebraska's rolling-reissue convention) #349 #373
 */
const EDITION_LABEL_REGEX = /^(?:Repl|Supp|Cum\.?\s*Supp|Reissue)\.?$/i

/**
 * Attach `year` (and optional `publisher` / `editionLabel`) to statute
 * citations whose citation core is immediately followed by a year-of-edition
 * parenthetical.
 *
 * `HRS § 91-14(a) (1985)`, `42 U.S.C. § 1983 (1976)`,
 * `28 U.S.C. § 1331 (West 2018)`, and `Ark. Code Ann. § 11-9-514(a)(1)
 * (Repl. 1996)` are all common code-edition forms. The tokenizer captures
 * only the citation core; this post-pass scans forward from `span.cleanEnd`
 * for the year-paren and routes the non-year token to `publisher` or
 * `editionLabel` depending on whether it's a replacement/supplement marker.
 *
 * Closes #285. Extended for `Repl.` / `Supp.` / `Cum. Supp.` in #349.
 */
function attachStatuteYearParen(citations: Citation[], cleaned: string): void {
  for (const cite of citations) {
    // Both statute and regulation citations carry year/publisher metadata
    // and bind trailing `(YYYY)` / `(West YYYY)` parentheticals. #637
    if (cite.type !== "statute" && cite.type !== "regulation") continue
    if (cite.year !== undefined) continue
    const after = cleaned.slice(cite.span.cleanEnd)
    const match = STATUTE_YEAR_PAREN_REGEX.exec(after)
    if (!match) continue
    const [, prefixToken, yearStr, suffixToken] = match
    cite.year = Number.parseInt(yearStr, 10)
    // Route the non-year token: edition label vs publisher. Either slot may
    // carry it (publisher conventionally precedes the year; edition labels
    // appear on either side).
    const token = prefixToken ?? suffixToken
    if (!token) continue
    if (EDITION_LABEL_REGEX.test(token)) {
      // Normalize spacing inside `Cum. Supp.` to a single space.
      cite.editionLabel = token.replace(/\s+/g, " ").trim()
    } else {
      cite.publisher = token
    }
  }
}

/**
 * Reassign jurisdiction for bare-section statute citations (`§ N-N-N`) based
 * on document context. The `nm-bare-section` pattern claims NM by default
 * because the three-hyphen section shape is most common in New Mexico, but
 * other states share the shape:
 *   - West Virginia (W.Va. Code) — #432
 *   - Colorado (C.R.S.) — #464
 *   - Montana (MCA) — #464 (also catches trailing `, MCA` postfix)
 *
 * Forward single-pass: tracks the most recent jurisdictional context from
 * full-form statute citations (those whose matchedText does NOT start with a
 * bare `§` / `Section ` marker). When a bare NM-tagged citation appears, it
 * is reassigned if the active context belongs to a known overlapping state.
 *
 * Additionally, when a bare NM-tagged citation has a `, MCA` / `, M.C.A.`
 * postfix in the cleaned text immediately after its end (within a short
 * window), reroute to MT.
 */
type BareSectionContext = {
  jurisdiction: string
  code: string
}

const BARE_SECTION_CONTEXT_OVERRIDES: Record<string, BareSectionContext> = {
  WV: { jurisdiction: "WV", code: "W. Va. Code" },
  CO: { jurisdiction: "CO", code: "C.R.S." },
  MT: { jurisdiction: "MT", code: "MCA" },
}

/**
 * Reassign jurisdiction for bare `Code § N` cites that the VA bare-code
 * extractor (or the GA pre-1983 extractor) claimed but actually belong to
 * D.C. (#659)
 *
 * Both DC and VA write bare `Code §` and the section-number shape is
 * ambiguous (both jurisdictions use period-laden forms like `22-404.01`
 * AND no-period forms like `22-404`). The only disambiguator is upstream
 * context. Walk citations in document order and track the most recent
 * jurisdiction signal:
 *
 *   - DC signals: `D.C. Code` cite, `D.C. Cir.` in prose, `D.C.`
 *     abbreviation, `District of Columbia` literal.
 *   - VA signals: explicit `Va. Code §` / `Virginia Code §` cite, or
 *     `Va.` in prose.
 *
 * A bare `Code §` cite tagged as `Va. Code` (or GA pre-1983) is rerouted
 * to DC iff the most recent signal upstream is DC.
 */
const DC_CODE_CONTEXT_WINDOW = 400
const DC_CONTEXT_RE = /\bD\.\s*C\.|\bDistrict\s+of\s+Columbia\b/
const VA_CONTEXT_RE = /\bVa\.|\bVirginia\b/

/** Find the most recent jurisdiction signal in upstream window. */
function nearestUpstreamSignal(cleaned: string, cleanStart: number): "DC" | "VA" | null {
  const start = Math.max(0, cleanStart - DC_CODE_CONTEXT_WINDOW)
  const window = cleaned.slice(start, cleanStart)
  // Find rightmost (most recent) signal of each type.
  let dcIdx = -1
  let vaIdx = -1
  for (const m of window.matchAll(new RegExp(DC_CONTEXT_RE, "g"))) {
    if (m.index !== undefined && m.index > dcIdx) dcIdx = m.index
  }
  for (const m of window.matchAll(new RegExp(VA_CONTEXT_RE, "g"))) {
    if (m.index !== undefined && m.index > vaIdx) vaIdx = m.index
  }
  if (dcIdx < 0 && vaIdx < 0) return null
  return dcIdx > vaIdx ? "DC" : "VA"
}

function reassignDcCodeJurisdiction(citations: Citation[], cleaned: string): void {
  for (const cite of citations) {
    if (cite.type !== "statute") continue

    // Only re-route bare `Code §` cites (not explicit `Va. Code §` or `Virginia Code §`).
    if (!/^Code\s+§/.test(cite.matchedText)) continue

    // Only consider cites currently tagged as VA or GA — those are the
    // two pattern matchers that claim bare `Code §`. DC-tagged cites
    // (from explicit `D.C. Code §`) already have correct jurisdiction.
    if (cite.jurisdiction !== "VA" && cite.jurisdiction !== "GA") continue

    const signal = nearestUpstreamSignal(cleaned, cite.span.cleanStart)
    if (signal === "DC") {
      cite.code = "D.C. Code"
      cite.jurisdiction = "DC"
    }
  }
}

/**
 * Look for an explicit New Mexico signal (`NMSA`, `N.M.`, `N. M.`,
 * `New Mexico`) in the cleaned text within ~200 chars before the citation
 * start. Used to gate the default `NM` jurisdiction tag attached to bare
 * `§ N-N-N` citations — without a nearby signal the shape is too generic
 * to claim NM. (#565, originally #531)
 *
 * The `N.M.` form ends in `.` (a non-word char), so we must NOT require a
 * trailing `\b` — instead we require the explicit `.` to anchor the right
 * edge of the `N.M.` alternative.
 */
const NM_CONTEXT_WINDOW = 200
const NM_CONTEXT_RE = /\bNMSA\b|\bN\.\s*M\.|\bNew\s+Mexico\b/

function hasNmContextNearby(cleaned: string, cleanStart: number): boolean {
  const start = Math.max(0, cleanStart - NM_CONTEXT_WINDOW)
  const window = cleaned.slice(start, cleanStart)
  return NM_CONTEXT_RE.test(window)
}

function inheritBareSectionJurisdiction(citations: Citation[], cleaned: string): void {
  let context: BareSectionContext | null = null

  for (const cite of citations) {
    if (cite.type !== "statute") continue

    const isBareSection = /^(?:§|Section\s)/.test(cite.matchedText)

    if (!isBareSection) {
      // Update context based on this full-form citation's jurisdiction.
      const j = cite.jurisdiction
      if (j && BARE_SECTION_CONTEXT_OVERRIDES[j]) {
        context = BARE_SECTION_CONTEXT_OVERRIDES[j]
      } else if (j === "NM") {
        context = null // NM context cancels overrides — back to default
      }
      continue
    }

    if (cite.jurisdiction !== "NM" || cite.code !== "NMSA 1978") continue

    // Trailing-MCA-postfix: `§ N-N-N, MCA` — even without preceding context,
    // the postfix is a definitive Montana signal. Scan a window up to the
    // next sentence break (`. ` / `; `) so the postfix applies to head
    // cites in lists too (e.g. `§§ 49-2-205 and -303, MCA`).
    const after = cleaned.slice(cite.span.cleanEnd, cite.span.cleanEnd + 200)
    const sentenceBreak = after.search(/[.;](?:\s|$)/)
    const window = sentenceBreak >= 0 ? after.slice(0, sentenceBreak) : after
    if (/,\s*M\.?\s*C\.?\s*A\.?\b/.test(window)) {
      cite.jurisdiction = "MT"
      cite.code = "MCA"
      continue
    }

    if (context) {
      cite.jurisdiction = context.jurisdiction
      cite.code = context.code
      continue
    }

    // #565 (originally #531): NM is the historical default for bare
    // `§ N-N-N` shapes, but the shape itself is too generic (Virginia,
    // Alabama, and others use it too). Require an explicit NM signal
    // nearby; otherwise drop the
    // jurisdiction so downstream consumers don't trust a guess.
    if (!hasNmContextNearby(cleaned, cite.span.cleanStart)) {
      cite.jurisdiction = undefined
      cite.code = undefined
    }
  }
}

/**
 * Detect bare-party shortform back-references (`Smith, at 12`) anchored to
 * earlier full case citations. After the first full citation establishes
 * `Smith v. Jones, 100 F.2d 50`, subsequent shorthand `Smith, at 12` is a
 * standard Bluebook back-reference but is not captured by the regex
 * tokenizer because it lacks the volume+reporter shape. (#439)
 *
 * Algorithm:
 *   1. Build a party-name index from FullCaseCitation plaintiff/defendant
 *      names. Names < MIN_NAME_LEN chars and a small blocklist of common
 *      generic captions are excluded to keep false-positive risk low.
 *   2. For each indexed name, scan the cleaned text for
 *      `<name>, at <pincite>` matches AFTER the anchor's position.
 *   3. Reject matches that overlap an existing citation's span (avoids
 *      double-counting when the bare-party form is itself part of a larger
 *      string-cite or back-reference).
 *   4. Emit a ShortFormCaseCitation inheriting `volume` / `reporter` /
 *      `page` from the anchor, with `partyName` and `pincite` set from
 *      the match.
 *
 * Conservative anchoring: only names that already appear as a party in a
 * full citation can match. This is the core FP defense — bare `Smith, at 5`
 * with no prior `Smith v. ...` citation is left as prose.
 */
const BARE_PARTY_MIN_NAME_LEN = 3
const BARE_PARTY_BLOCKED_NAMES = new Set([
  "the",
  "and",
  "but",
  "for",
  "see",
  "see also",
  "cf",
  "but see",
  "but cf",
  "compare",
  "accord",
  "state",
  "people",
  "court",
  "plaintiff",
  "defendant",
  "appellant",
  "appellee",
  "petitioner",
  "respondent",
  "united states",
])

/**
 * Detect bare-prefix `§§ N, N[, N]…` lists that the tokenizer skipped because
 * there is no recognizable code identifier in front of the `§§` marker. The
 * tokenizer only emits a head when a code-name regex matches; naked sequences
 * like `§§ 12940, 12945, 12950` or `Code §§ 19.2-81 and 18.2-266` thus drop
 * silently. This pass scans the cleaned text for such sequences and seeds a
 * head citation for each section so the existing `expandPluralSectionList`
 * pass can pick up the remainder. (#563)
 *
 * Conservative anchoring:
 *   - Requires `§§` literally (singular `§ N` is too ambiguous on its own).
 *   - Section grammar matches the same shape as `expandPluralSectionList`.
 *   - At least two sections must appear (single bare `§§ N` is suspect).
 *   - Skips ranges of the form `§§ N-M` so the head/tail get a single span.
 *   - Skips any range that overlaps an existing citation.
 *   - The `code` field is set to a generic marker (`"§"`) when no prefix is
 *     identified; jurisdiction is left undefined so downstream inheritance
 *     passes can populate it. When a `Code` prefix immediately precedes the
 *     `§§`, `code` is set to `"Code"` to preserve the user's intent.
 */
function detectBareSectionLists(
  citations: Citation[],
  cleaned: string,
  transformationMap: TransformationMap,
): void {
  const sectionPart = "\\d[\\w-]*(?:\\.[\\d\\w-]+)*(?:\\([A-Za-z0-9]+\\))*"
  // Allow optional `Code` (or `Code Ann.`) prefix immediately before `§§`.
  // Anchor on `§§` followed by whitespace + a section. The list itself is
  // detected by `expandPluralSectionList` once the head is in place; we only
  // need to identify a starting position. The two-section minimum is enforced
  // by lookahead.
  const headRe = new RegExp(
    `(?:\\b(Code(?:\\s+Ann\\.?)?)\\s+)?§§\\s+(${sectionPart})(?=\\s*(?:,\\s*|\\s+and\\s+|\\s+to\\s+)${sectionPart})`,
    "g",
  )

  const newCitations: Citation[] = []
  let match: RegExpExecArray | null
  while ((match = headRe.exec(cleaned)) !== null) {
    const fullMatch = match[0]
    const prefix = match[1]
    const sectionText = match[2]
    const start = match.index
    const end = start + fullMatch.length

    if (overlapsExistingCitation(citations, start, end)) continue

    const sectionStart = start + fullMatch.length - sectionText.length
    const sectionEnd = end

    const { originalStart, originalEnd } = resolveOriginalSpan(
      { cleanStart: start, cleanEnd: end },
      transformationMap,
    )
    const sectionOrig = resolveOriginalSpan(
      { cleanStart: sectionStart, cleanEnd: sectionEnd },
      transformationMap,
    )

    const code = prefix ? prefix.replace(/\s+/g, " ").trim() : "§"

    const head: import("@/types/citation").StatuteCitation = {
      type: "statute",
      text: fullMatch,
      span: {
        cleanStart: start,
        cleanEnd: end,
        originalStart,
        originalEnd,
      },
      // Bare-prefix lists are inherently low-confidence — no code identifier
      // means no jurisdiction grounding. When the only code marker we have
      // is `§` (no surrounding `Code`/`Code Ann.` prefix), drop further to
      // 0.3 so downstream consumers can confidently filter these out
      // unless they specifically want unbound section refs. #726.
      confidence: code === "§" ? 0.3 : 0.5,
      matchedText: fullMatch,
      processTimeMs: 0,
      patternsChecked: 1,
      code,
      section: sectionText,
      spans: {
        section: {
          cleanStart: sectionStart,
          cleanEnd: sectionEnd,
          originalStart: sectionOrig.originalStart,
          originalEnd: sectionOrig.originalEnd,
        },
      },
    }
    newCitations.push(head)
  }

  if (newCitations.length === 0) return
  citations.push(...newCitations)
  citations.sort((a, b) => a.span.cleanStart - b.span.cleanStart)
}

/**
 * Expand a plural `§§ N, N` (or `§§ N and N`) statute reference into one
 * StatuteCitation per section. The tokenizer captures only the FIRST
 * section; this pass walks the text right after a `§§`-marked statute
 * citation and emits additional citations for each comma-/`and`-separated
 * section it finds. Each emitted citation inherits `code`, `jurisdiction`,
 * `title`, `year`, `publisher`, `editionLabel`, and other metadata from
 * the head citation. (#453)
 *
 * Connector grammar: `,` | ` and ` | ` to `.
 * Section grammar: `\d[\w-]*(?:\([A-Za-z0-9]+\))*` — covers
 * `12940`, `18-8004`, `12945(b)`, `707-701(1)`.
 */
function expandPluralSectionList(
  citations: Citation[],
  cleaned: string,
  transformationMap: TransformationMap,
): void {
  // Section grammar accepts: leading digit, then any word/hyphen run, with
  // optional dotted suffixes (`19.2-81`, `12940.5`) and optional subsection
  // chain (`(A)`, `(1)`, `(b)(14)`). The dotted extension was added in #563
  // so bare `Code §§ 19.2-81 and 18.2-266` siblings are picked up.
  const sectionPart = "\\d[\\w-]*(?:\\.[\\d\\w-]+)*(?:\\([A-Za-z0-9]+\\))*"
  const connectorPart = "\\s*,\\s*|\\s+and\\s+|\\s+to\\s+"
  // Issue #694: capture the connector so we can distinguish range (`to`)
  // from list (`,`, `and`). Range-form chains populate `sectionRange` on
  // the head; list-form chains continue emitting siblings.
  const continuationRe = new RegExp(`^(${connectorPart})(${sectionPart})`)
  // `et seq.` immediately after a sibling — owner detection. (#566)
  const TRAILING_ET_SEQ_RE = /^\s*et\s+seq\.?/i

  const newCitations: Citation[] = []

  for (const cite of citations) {
    if (cite.type !== "statute") continue
    if (!cite.matchedText.includes("§§")) continue

    let cursor = cite.span.cleanEnd
    while (cursor < cleaned.length) {
      const slice = cleaned.slice(cursor)
      const m = continuationRe.exec(slice)
      if (!m) break

      const fullMatchLen = m[0].length
      const connectorText = m[1]
      const sectionText = m[2]
      const sectionStart = cursor + fullMatchLen - sectionText.length
      const sectionEnd = cursor + fullMatchLen
      const isRangeConnector = /^\s+to\s+$/.test(connectorText)

      // Issue #694: `to` is a range connector, not a list connector.
      // Populate sectionRange on the head and skip emitting a sibling.
      if (isRangeConnector) {
        const headSection =
          typeof (cite as { section?: string }).section === "string"
            ? (cite as { section: string }).section
            : undefined
        if (headSection) {
          ;(cite as { sectionRange?: { start: string; end: string } }).sectionRange = {
            start: headSection,
            end: sectionText,
          }
          ;(cite as { matchedText: string }).matchedText = cleaned.slice(
            cite.span.cleanStart,
            sectionEnd,
          )
          ;(cite as { text: string }).text = cleaned.slice(cite.span.cleanStart, sectionEnd)
          ;(cite as { span: { cleanStart: number; cleanEnd: number; originalStart: number; originalEnd: number } }).span = {
            cleanStart: cite.span.cleanStart,
            cleanEnd: sectionEnd,
            originalStart: cite.span.originalStart,
            originalEnd: resolveOriginalSpan(
              { cleanStart: cite.span.cleanStart, cleanEnd: sectionEnd },
              transformationMap,
            ).originalEnd,
          }
        }
        cursor = sectionEnd
        continue
      }

      const { originalStart, originalEnd } = resolveOriginalSpan(
        { cleanStart: sectionStart, cleanEnd: sectionEnd },
        transformationMap,
      )

      // Owner detection for `et seq.` (#566): only set `hasEtSeq` on the
      // sibling that the token immediately follows. The blanket spread of
      // `...cite` would otherwise propagate the head's flag (if any) to
      // every sibling.
      const trailing = cleaned.slice(sectionEnd, sectionEnd + 20)
      const siblingHasEtSeq = TRAILING_ET_SEQ_RE.test(trailing)

      const continuation: import("@/types/citation").StatuteCitation = {
        ...cite,
        text: sectionText,
        matchedText: sectionText,
        section: sectionText,
        sectionRange: undefined,
        span: {
          cleanStart: sectionStart,
          cleanEnd: sectionEnd,
          originalStart,
          originalEnd,
        },
        // Don't carry subsection/pincite from the head — those were specific
        // to the head section.
        subsection: undefined,
        pincite: undefined,
        hasEtSeq: siblingHasEtSeq || undefined,
        spans: undefined,
      }
      newCitations.push(continuation)

      cursor = sectionEnd
    }
  }

  if (newCitations.length === 0) return
  citations.push(...newCitations)
  citations.sort((a, b) => a.span.cleanStart - b.span.cleanStart)
}

/**
 * Detect bare `§ N` short-form statute references that inherit title /
 * code / jurisdiction from an earlier full statute citation. After a full
 * cite establishes a code, follow-on bare `§ N` is a Bluebook short-form
 * statute reference (analogous to Id. for cases). The tokenizer never
 * matches these because the patterns all require a code identifier; this
 * pass walks the text between full statute citations and emits an inherited
 * sibling for each bare `§ N` it finds. (#567)
 *
 * Conservative anchoring:
 *   - Must follow a full statute citation (one with `title` AND `code`).
 *   - The antecedent's code must be a well-known full-form code (`U.S.C.`,
 *     `C.F.R.`, or a state named-code with `jurisdiction` set) — the bare
 *     `§ N-N-N` shape that the NM dispatcher already handles is left alone.
 *   - Three-hyphen state section shapes (`32A-2-7`, `41-2-2`) are skipped
 *     here so the NM dispatcher pipeline keeps owning them.
 *   - The section grammar is `\d[\w]*(?:\.[\w]+)*` — purely numeric or
 *     numeric+letter (`1985`, `1028A`), optionally dotted (`122.26`). No
 *     hyphens, so state-style sections don't false-match.
 *   - Skip any region that already overlaps an existing citation.
 *   - Maximum scan window of 300 chars from the antecedent's end so we
 *     don't link references too far apart.
 */
function detectBareSectionShortForms(
  citations: Citation[],
  cleaned: string,
  transformationMap: TransformationMap,
): void {
  // Section body mirrors the CA bare-code body grammar — accepts optional
  // `, subd. (X)` / `paragraph (Y)` / `par. (Z)` keyword chain so bare
  // shortform cites like `§ 1347.15, subd. (b)(1)-(3)` inherit the full
  // subsection from the antecedent code's context. #663 #655
  const BARE_SECTION_RE =
    /(?<![A-Za-z\d-])§\s*(\d[\w]*(?:\.[\w]+)*(?:\([A-Za-z0-9.]+\))*(?:,?\s+(?:subd\.|subdivision|subds\.|subdivisions|paragraphs?|pars?\.)\s+(?:\([^)]*\)|\[[^\]]*\])(?:\s*(?:\([^)]*\)|\[[^\]]*\]))*)?(?:\s*[-–—]\s*\([A-Za-z0-9]+\))?)/g
  const SCAN_WINDOW = 300

  // Snapshot the input list — we'll push results to newCitations and sort.
  const newCitations: Citation[] = []

  for (let i = 0; i < citations.length; i++) {
    const cite = citations[i]
    if (cite.type !== "statute") continue
    // Antecedent must have a code identifier — full citations always do.
    // State named-codes (Cal. Penal, NY Penal Law) carry no `title` but
    // still establish a code, so we don't require title.
    if (!cite.code) continue
    // Skip when the antecedent itself was a bare-section that the NM
    // dispatcher already owns — those are heuristic and we don't want
    // inherited follow-ons riding on a guess.
    if (cite.code === "NMSA 1978") continue

    const start = cite.span.cleanEnd
    // Stop scanning at the next statute citation (it'll become its own
    // antecedent) or at the scan window.
    let end = Math.min(start + SCAN_WINDOW, cleaned.length)
    for (let j = i + 1; j < citations.length; j++) {
      const next = citations[j]
      if (next.span.cleanStart >= start && next.span.cleanStart < end) {
        end = next.span.cleanStart
      }
    }
    if (end <= start) continue

    const window = cleaned.slice(start, end)
    BARE_SECTION_RE.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = BARE_SECTION_RE.exec(window)) !== null) {
      const absStart = start + match.index
      const absEnd = absStart + match[0].length
      if (overlapsExistingCitation(citations, absStart, absEnd)) continue

      const sectionText = match[1]
      // Skip three-hyphen state-section shapes — the NM pipeline owns these.
      if (/^\d+[A-Z]?-\d+[A-Z]?-\d+/.test(sectionText)) continue

      const { originalStart, originalEnd } = resolveOriginalSpan(
        { cleanStart: absStart, cleanEnd: absEnd },
        transformationMap,
      )

      // Parse the captured section body via parseBody so the optional
      // `, subd. (X)(Y)` keyword chain (#663) splits into a real
      // subsection field rather than being absorbed into `section`.
      const parsed = parseBody(sectionText)

      const inherited: import("@/types/citation").StatuteCitation = {
        type: "statute",
        text: match[0],
        span: {
          cleanStart: absStart,
          cleanEnd: absEnd,
          originalStart,
          originalEnd,
        },
        // Slightly lower than head; the inheritance is heuristic.
        confidence: Math.max(0.6, cite.confidence - 0.1),
        matchedText: match[0],
        processTimeMs: 0,
        patternsChecked: 1,
        title: cite.title,
        code: cite.code,
        section: parsed.section,
        subsection: parsed.subsection,
        subsectionRange:
          parsed.subsection && parsed.subsectionRangeEnd
            ? { start: parsed.subsection, end: parsed.subsectionRangeEnd }
            : undefined,
        jurisdiction: cite.jurisdiction,
      }
      newCitations.push(inherited)
    }
  }

  if (newCitations.length === 0) return
  citations.push(...newCitations)
  citations.sort((a, b) => a.span.cleanStart - b.span.cleanStart)
}

function detectBarePartyBackReferences(
  citations: Citation[],
  cleaned: string,
  transformationMap: TransformationMap,
): void {
  type Anchor = {
    cite: import("@/types/citation").FullCaseCitation
    name: string
    normalized: string
  }

  // Strip leading procedural prefixes (`In re`, `Estate of`, `Ex parte`) and
  // sentence-initial signal connectors (`See`, `Cf.`, `Then`, `Compare`) from
  // captured plaintiff names so the bare back-reference matches the residual
  // distinguishing name (`Smith` from `In re Smith`).
  const stripNamePrefix = (raw: string): string => {
    let s = raw.trim()
    // Procedural prefix: `In re X`, `Estate of X`, `Ex parte X`, `Matter of X`.
    s = s.replace(/^(?:In\s+re|Estate\s+of|Ex\s+parte|Matter\s+of|Application\s+of)\s+/i, "")
    // Sentence-initial signal connectors that bleed into the captured plaintiff.
    s = s.replace(
      /^(?:But\s+(?:see|cf\.?)|See(?:\s+also)?|Compare|Cf\.?|Accord|E\.\s*g\.?|Also|Then)\s+/,
      "",
    )
    return s.trim()
  }

  const anchors: Anchor[] = []
  const seenKeys = new Set<string>()
  const addAnchor = (
    cite: import("@/types/citation").FullCaseCitation,
    raw: string,
    norm: string | undefined,
  ): void => {
    const trimmed = raw.trim()
    if (trimmed.length < BARE_PARTY_MIN_NAME_LEN) return
    const normalized = (norm ?? trimmed.toLowerCase()).trim()
    if (BARE_PARTY_BLOCKED_NAMES.has(normalized)) return
    const key = `${cite.span.cleanStart}:${trimmed}`
    if (seenKeys.has(key)) return
    seenKeys.add(key)
    anchors.push({ cite, name: trimmed, normalized })
  }

  for (const cite of citations) {
    if (cite.type !== "case") continue
    if (cite.plaintiff) {
      addAnchor(cite, cite.plaintiff, cite.plaintiffNormalized)
      const stripped = stripNamePrefix(cite.plaintiff)
      if (stripped && stripped !== cite.plaintiff) {
        addAnchor(cite, stripped, stripped.toLowerCase())
      }
    }
    if (cite.defendant) {
      addAnchor(cite, cite.defendant, cite.defendantNormalized)
      const stripped = stripNamePrefix(cite.defendant)
      if (stripped && stripped !== cite.defendant) {
        addAnchor(cite, stripped, stripped.toLowerCase())
      }
    }
  }

  if (anchors.length === 0) return

  const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

  // Group anchors by their exact display name. When several anchors share
  // a name, the LATEST one whose end-position precedes the bare-ref wins
  // (Bluebook short-form refers to the most recent establishment).
  const anchorsByName = new Map<string, Anchor[]>()
  for (const a of anchors) {
    const list = anchorsByName.get(a.name) ?? []
    list.push(a)
    anchorsByName.set(a.name, list)
  }
  for (const list of anchorsByName.values()) {
    list.sort((a, b) => a.cite.span.cleanStart - b.cite.span.cleanStart)
  }

  const newCitations: Citation[] = []
  const seenSpans = new Set<string>()

  for (const [name, anchorList] of anchorsByName) {
    const escapedName = escapeRegex(name)
    // Optional page-prefix: California Style Manual uses `at p. N` / `at pp.
    // N-M` for short-form pincite refs. Also accept spelled-out `page` /
    // `pages`. (#454)
    const pagePrefix = "(?:pp?\\.?\\s*|pages?\\s+)?"
    const pincitePart = "\\d+(?:[-\\u2013\\u2014]\\d+)?(?:,\\s*\\d+(?:[-\\u2013\\u2014]\\d+)?)*"
    const pattern = new RegExp(
      `(?<![A-Za-z'])(${escapedName})\\s*,\\s*at\\s+${pagePrefix}(${pincitePart})`,
      "g",
    )

    let match: RegExpExecArray | null
    while ((match = pattern.exec(cleaned)) !== null) {
      const start = match.index
      const end = start + match[0].length

      // Find the latest anchor whose end is before this match.
      let anchor: Anchor | undefined
      for (const candidate of anchorList) {
        if (candidate.cite.span.cleanEnd > start) break
        anchor = candidate
      }
      if (!anchor) continue

      if (overlapsExistingCitation(citations, start, end)) continue

      const key = `${start}-${end}`
      if (seenSpans.has(key)) continue
      seenSpans.add(key)

      // For comma-list pincites (`12-13, 21`), parse just the first chunk —
      // the head page is the canonical pincite.
      const firstChunk = match[2].split(",")[0].trim()
      const pinciteInfo = parsePincite(firstChunk) ?? undefined
      const pincite = pinciteInfo?.page

      const { originalStart, originalEnd } = resolveOriginalSpan(
        { cleanStart: start, cleanEnd: end },
        transformationMap,
      )

      const anchorPage =
        typeof anchor.cite.page === "number"
          ? anchor.cite.page
          : Number.parseInt(String(anchor.cite.page), 10) || undefined

      newCitations.push({
        type: "shortFormCase",
        text: match[0],
        matchedText: match[0],
        confidence: 0.85,
        processTimeMs: 0,
        patternsChecked: 0,
        span: { cleanStart: start, cleanEnd: end, originalStart, originalEnd },
        volume: anchor.cite.volume,
        reporter: anchor.cite.reporter,
        page: anchorPage,
        pincite,
        pinciteInfo,
        partyName: match[1],
        partyNameNormalized: anchor.normalized,
      })
    }
  }

  if (newCitations.length === 0) return

  citations.push(...newCitations)
  citations.sort((a, b) => a.span.cleanStart - b.span.cleanStart)
}

function overlapsExistingCitation(citations: Citation[], start: number, end: number): boolean {
  for (const c of citations) {
    if (c.span.cleanEnd <= start) continue
    if (c.span.cleanStart >= end) continue
    return true
  }
  return false
}

function inheritParallelCaseName(citations: Citation[]): void {
  const primaryByGroup = new Map<string, number>()
  for (let i = 0; i < citations.length; i++) {
    const c = citations[i]
    if (c.type !== "case") continue
    if (!c.groupId || !c.caseName) continue
    if (!primaryByGroup.has(c.groupId)) primaryByGroup.set(c.groupId, i)
  }

  for (const secondary of citations) {
    if (secondary.type !== "case") continue
    if (!secondary.groupId) continue
    if (secondary.caseName) continue
    const primaryIdx = primaryByGroup.get(secondary.groupId)
    if (primaryIdx === undefined) continue
    const primary = citations[primaryIdx]
    if (!primary || primary.type !== "case") continue

    secondary.caseName = primary.caseName
    secondary.plaintiff = primary.plaintiff
    secondary.defendant = primary.defendant
    secondary.plaintiffNormalized = primary.plaintiffNormalized
    secondary.defendantNormalized = primary.defendantNormalized
    secondary.proceduralPrefix = primary.proceduralPrefix

    // The confidence score on `secondary` was computed by buildCaseCitation()
    // when caseName was still undefined, so it missed the +0.15 caseName signal
    // it now qualifies for. Re-derive with the same formula so the inherited
    // caption registers in the score (#556). Reporter / year / court are
    // unchanged by this pass, so this only swings score for secondaries that
    // had their caseName mutated above.
    secondary.confidence = computeCaseConfidence({
      reporter: secondary.reporter,
      year: secondary.year,
      caseName: secondary.caseName,
      court: secondary.court,
      hasBlankPage: secondary.hasBlankPage ?? false,
    })
  }
}
