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
import { UnionFind } from "@/extract/unionFind"
import { detectFootnotes } from "@/footnotes/detectFootnotes"
import { mapFootnoteZones } from "@/footnotes/mapZones"
import { tagCitationsWithFootnotes } from "@/footnotes/tagging"
import type { FootnoteMap } from "@/footnotes/types"
import {
  extractCase,
  extractConstitutional,
  extractFederalRegister,
  extractJournal,
  extractNeutral,
  extractPublicLaw,
  extractStatute,
  extractStatutesAtLarge,
} from "@/extract"
import type { Pattern } from "@/patterns"
import {
  casePatterns,
  constitutionalPatterns,
  journalPatterns,
  neutralPatterns,
  shortFormPatterns,
  statutePatterns,
} from "@/patterns"
import { tokenize } from "@/tokenize"
import type { Citation, HistorySignal } from "@/types/citation"
import { resolveCitations } from "../resolve"
import type { ResolutionOptions, ResolvedCitation } from "../resolve/types"
import { detectParallelCitations } from "./detectParallel"
import { detectStringCitations, detectLeadingSignals } from "./detectStringCites"
import { extractId, extractShortFormCase, extractSupra } from "./extractShortForms"
import { applyFalsePositiveFilters } from "./filterFalsePositives"

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
  const allPatterns = options?.patterns || [
    ...neutralPatterns, // Most specific (year-based format)
    ...shortFormPatterns, // Short-form (requires " at " keyword)
    ...casePatterns, // Case citations (reporter-specific)
    ...constitutionalPatterns, // Constitutional citations (more specific than statutes)
    ...statutePatterns, // Statutes (code-specific)
    ...journalPatterns, // Least specific (broad pattern)
  ]
  const tokens = tokenize(cleaned, allPatterns)

  // Step 3: Deduplicate overlapping tokens
  // Multiple patterns may match the same text (e.g., "500 F.2d 123" matches both federal-reporter and state-reporter)
  // Keep only the most specific match for each position
  const deduplicatedTokens: typeof tokens = []
  const seenPositions = new Set<number | string>()

  // Performance optimization: Use bitpacking for typical documents (<65K chars)
  // For larger documents, fall back to string keys
  const useBitpacking = cleaned.length < 65536

  for (const token of tokens) {
    const posKey = useBitpacking
      ? (token.span.cleanStart << 16) | token.span.cleanEnd
      : `${token.span.cleanStart}-${token.span.cleanEnd}`
    if (!seenPositions.has(posKey)) {
      seenPositions.add(posKey)
      deduplicatedTokens.push(token)
    }
  }

  // Step 3.5: Detect parallel citation groups
  // Map of primary token index -> array of secondary token indices
  const parallelGroups = detectParallelCitations(deduplicatedTokens, cleaned)

  // Build reverse-lookup: secondary index -> primary index (O(1) instead of O(N×M))
  const secondaryToGroup = new Map<number, number>()
  for (const [primary, secondaries] of parallelGroups.entries()) {
    for (const s of secondaries) secondaryToGroup.set(s, primary)
  }

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
          citation = extractSupra(token, transformationMap)
        } else if (token.patternId === "shortFormCase") {
          citation = extractShortFormCase(token, transformationMap)
        } else {
          citation = extractCase(token, transformationMap, cleaned)
        }
        break
      case "statute":
        citation = extractStatute(token, transformationMap)
        break
      case "journal":
        citation = extractJournal(token, transformationMap)
        break
      case "neutral":
        citation = extractNeutral(token, transformationMap)
        break
      case "publicLaw":
        citation = extractPublicLaw(token, transformationMap)
        break
      case "federalRegister":
        citation = extractFederalRegister(token, transformationMap)
        break
      case "statutesAtLarge":
        citation = extractStatutesAtLarge(token, transformationMap)
        break
      case "constitutional":
        citation = extractConstitutional(token, transformationMap)
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

  // Step 4.5: Link subsequent history citations using Union-Find.
  // Three-phase approach: match signals → union chains → aggregate entries.
  // Invariant: citations are in text order (guaranteed by token-order processing above).
  linkSubsequentHistory(citations)

  // Step 4.75: Detect string citation groups (semicolon-separated)
  detectStringCitations(citations, cleaned)

  // Step 4.8: Detect leading introductory signals for all citations.
  // Runs after string cite detection (which sets mid-group signals) so we
  // only scan backward for citations that still lack a signal.
  detectLeadingSignals(citations, cleaned)

  // Step 4.9: Apply false positive filters (blocklist + year heuristic)
  const filtered = applyFalsePositiveFilters(citations, options?.filterFalsePositives ?? false)

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
 * Link subsequent history citations using a three-phase Union-Find approach.
 * Replaces the old mutation-during-iteration pattern with cleanly separated phases.
 */
function linkSubsequentHistory(citations: Citation[]): void {
  // Phase 1: Signal matching — collect (parent, child) pairs without mutating citations.
  // Also record each child's signal text for back-pointer assignment in Phase 3.
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

  // Phase 2: Union — build connected components from parent-child pairs.
  const uf = new UnionFind(citations.length)
  for (const pair of pairs) {
    uf.union(pair.parentIdx, pair.childIdx)
  }

  // Build lookup: childIdx → signal (for back-pointer assignment)
  const childSignals = new Map<number, HistorySignal>()
  for (const pair of pairs) {
    childSignals.set(pair.childIdx, pair.signal)
  }

  // Phase 3: Aggregation — set back-pointers and collect entries onto chain roots.
  for (const [root, members] of uf.components()) {
    if (members.length === 1) continue

    const rootCitation = citations[root]
    if (rootCitation.type !== "case") continue

    const allEntries = [...(rootCitation.subsequentHistoryEntries ?? [])]

    for (const memberIdx of members) {
      if (memberIdx === root) continue

      const member = citations[memberIdx]
      if (member.type !== "case") continue

      // Set back-pointer to chain root.
      // Signal is guaranteed to exist: every non-root member was recorded as a
      // child in Phase 1, which always stores the signal in childSignals.
      const signal = childSignals.get(memberIdx)
      if (!signal) continue
      member.subsequentHistoryOf = { index: root, signal }

      // Aggregate entries from non-root members onto the root
      if (member.subsequentHistoryEntries) {
        for (const entry of member.subsequentHistoryEntries) {
          allEntries.push({ ...entry, order: allEntries.length })
        }
        member.subsequentHistoryEntries = undefined
      }
    }

    rootCitation.subsequentHistoryEntries = allEntries
  }
}
