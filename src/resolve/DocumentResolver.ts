/**
 * Document-Scoped Citation Resolver
 *
 * Resolves short-form citations (Id./supra/short-form case) to their full antecedent citations
 * by maintaining resolution context and enforcing scope boundaries.
 *
 * Resolution rules:
 * - Id. resolves to the most recently cited authority (within scope)
 * - Supra resolves to full citation with matching party name (within scope)
 * - Short-form case resolves to full case with matching volume/reporter (within scope)
 */

import type {
  Citation,
  FullCaseCitation,
  IdCitation,
  ShortFormCaseCitation,
  SupraCitation,
} from "../types/citation"
import { isFullCitation } from "../types/guards"
import type { Span } from "../types/span"
import { BKTree } from "./bkTree"
import { levenshteinDistance } from "./levenshtein"
import { buildFootnoteScopes, detectParagraphBoundaries, isWithinBoundary } from "./scopeBoundary"
import type {
  ResolutionContext,
  ResolutionOptions,
  ResolutionResult,
  ResolvedCitation,
} from "./types"

/**
 * Returns the citation's `fullSpan` if it has one. Only `case` citations
 * carry `fullSpan` (set during case-name backward search). Other full
 * citation types (statute, journal, neutral, etc.) don't have a
 * case-name span concept and never participate in parenthetical-child checks.
 */
function getFullSpan(citation: Citation): Span | undefined {
  if (citation.type === "case") {
    return citation.fullSpan
  }
  return undefined
}

/**
 * Document-scoped resolver that processes citations sequentially
 * and resolves short-form citations to their antecedents.
 */
export class DocumentResolver {
  private readonly citations: Citation[]
  private readonly text: string
  private readonly options: Required<Omit<ResolutionOptions, "footnoteMap">> & {
    footnoteMap: ResolutionOptions["footnoteMap"]
  }
  private readonly context: ResolutionContext
  private readonly partyNameTree: BKTree

  /**
   * Creates a new DocumentResolver.
   *
   * @param citations - All citations in document (in order of appearance)
   * @param text - Original document text
   * @param options - Resolution options
   */
  constructor(citations: Citation[], text: string, options: ResolutionOptions = {}) {
    this.citations = citations
    this.text = text

    // Apply defaults to options
    this.options = {
      scopeStrategy: options.scopeStrategy ?? "none",
      autoDetectParagraphs: options.autoDetectParagraphs ?? true,
      paragraphBoundaryPattern: options.paragraphBoundaryPattern ?? /\n\n+/g,
      fuzzyPartyMatching: options.fuzzyPartyMatching ?? true,
      partyMatchThreshold: options.partyMatchThreshold ?? 0.8,
      reportUnresolved: options.reportUnresolved ?? true,
      footnoteMap: options.footnoteMap,
    }

    this.partyNameTree = new BKTree(levenshteinDistance)

    // Initialize resolution context
    this.context = {
      citationIndex: 0,
      allCitations: citations,
      lastResolvedIndex: undefined,
      fullCitationHistory: new Map(),
      paragraphMap: new Map(),
    }

    // Detect paragraph boundaries if enabled
    if (this.options.autoDetectParagraphs) {
      this.context.paragraphMap = detectParagraphBoundaries(
        text,
        citations,
        this.options.paragraphBoundaryPattern,
      )
    }

    // Override with footnote scopes when available
    if (this.options.scopeStrategy === "footnote" && this.options.footnoteMap) {
      this.context.paragraphMap = buildFootnoteScopes(citations, this.options.footnoteMap)
    }
  }

  /**
   * Resolves all citations in the document.
   *
   * @returns Array of citations with resolution metadata
   */
  resolve(): ResolvedCitation[] {
    const resolved: ResolvedCitation[] = []

    for (let i = 0; i < this.citations.length; i++) {
      this.context.citationIndex = i
      const citation = this.citations[i]

      // Resolve based on citation type
      let resolution: ResolutionResult | undefined

      switch (citation.type) {
        case "id":
          resolution = this.resolveId(citation)
          break
        case "supra":
          resolution = this.resolveSupra(citation)
          break
        case "shortFormCase":
          resolution = this.resolveShortFormCase(citation)
          break
        default:
          // Full citation - update context for future resolutions.
          if (isFullCitation(citation)) {
            // Bluebook Rule 4.1: Id. refers to the immediately preceding
            // *cited authority*. A full citation parsed inside another
            // citation's explanatory parenthetical (e.g. "(citing X)" or
            // "(quoting Y)") is a sub-reference within the parent's
            // citation, not the cited authority of that sentence — so it
            // must not become Id.'s default antecedent. Detect this by
            // checking whether the current cite's span lies within an
            // earlier full cite's fullSpan. We still track it for
            // supra/short-form resolution.
            const isParentheticalChild = resolved.some((prior) => {
              const priorFullSpan = getFullSpan(prior)
              if (!priorFullSpan) return false
              return (
                priorFullSpan.cleanStart <= citation.span.cleanStart &&
                priorFullSpan.cleanEnd >= citation.span.cleanEnd
              )
            })
            if (!isParentheticalChild) {
              this.context.lastResolvedIndex = i
            }
            this.trackFullCitation(citation, i)
          }
          break
      }

      // After resolving a short-form citation, update lastResolvedIndex
      // to the full citation it resolved to (transitive resolution).
      // If resolution failed, lastResolvedIndex is NOT updated --
      // a subsequent Id. will also fail (matching Python eyecite behavior).
      if (resolution?.resolvedTo !== undefined) {
        this.context.lastResolvedIndex = resolution.resolvedTo
      }

      // Add citation with resolution metadata
      // Type assertion is safe: runtime logic only sets resolution on short-form citations
      resolved.push({
        ...citation,
        resolution,
      } as ResolvedCitation)
    }

    return resolved
  }

  /**
   * Resolves Id. citation to the most recently cited authority.
   * Uses lastResolvedIndex which tracks the most recent successfully
   * resolved citation (full, short-form, supra, or Id.).
   */
  private resolveId(_citation: IdCitation): ResolutionResult | undefined {
    const currentIndex = this.context.citationIndex
    const antecedentIndex = this.context.lastResolvedIndex

    // No preceding citation has been resolved yet
    if (antecedentIndex === undefined) {
      return this.createFailureResult("No preceding citation found")
    }

    // Check scope boundary
    if (!this.isWithinScope(antecedentIndex, currentIndex)) {
      return this.createFailureResult("Antecedent citation outside scope boundary")
    }

    return {
      resolvedTo: antecedentIndex,
      confidence: 1.0, // Id. resolution is unambiguous when successful
    }
  }

  /**
   * Resolves supra citation by matching party name.
   */
  private resolveSupra(citation: SupraCitation): ResolutionResult | undefined {
    if (!citation.partyName) return undefined // Standalone supra — cannot resolve by party name
    const currentIndex = this.context.citationIndex
    const targetPartyName = this.normalizePartyName(citation.partyName)

    // Query BK-Tree for candidates within distance threshold, then filter by scope
    const queryLen = targetPartyName.length
    const threshold = this.options.partyMatchThreshold
    // Safe upper bound: guarantees no match with similarity >= threshold is missed
    const maxDistance = queryLen === 0 ? 0 : Math.ceil((queryLen * (1 - threshold)) / threshold)
    const candidates = this.partyNameTree.query(targetPartyName, maxDistance)

    // Sort by insertion order to match Map iteration behavior (first-inserted wins on ties)
    candidates.sort((a, b) => a.insertionOrder - b.insertionOrder)

    let bestMatch: { index: number; similarity: number } | undefined

    for (const candidate of candidates) {
      const citationIndex = this.context.fullCitationHistory.get(candidate.key)
      if (citationIndex === undefined) continue

      // Check scope boundary (supra allows cross-zone: footnote -> body)
      if (!this.isWithinScope(citationIndex, currentIndex, true)) continue

      // Convert distance to normalized similarity
      const maxLen = Math.max(queryLen, candidate.key.length)
      const similarity = maxLen === 0 ? 1.0 : 1 - candidate.distance / maxLen

      // Update best match if this is better (strict > preserves first-wins tie-breaking)
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { index: citationIndex, similarity }
      }
    }

    // Check if we found a match above threshold
    if (!bestMatch) {
      return this.createFailureResult("No full citation found in scope")
    }

    if (bestMatch.similarity < this.options.partyMatchThreshold) {
      return this.createFailureResult(
        `Party name similarity ${bestMatch.similarity.toFixed(2)} below threshold ${this.options.partyMatchThreshold}`,
      )
    }

    // Return successful resolution with confidence based on similarity
    const warnings: string[] = []
    if (bestMatch.similarity < 1.0) {
      warnings.push(`Fuzzy match: similarity ${bestMatch.similarity.toFixed(2)}`)
    }

    return {
      resolvedTo: bestMatch.index,
      confidence: bestMatch.similarity,
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  }

  /**
   * Resolves short-form case citation by matching volume/reporter.
   */
  private resolveShortFormCase(citation: ShortFormCaseCitation): ResolutionResult | undefined {
    const currentIndex = this.context.citationIndex

    // Search backwards for matching full case citation
    for (let i = currentIndex - 1; i >= 0; i--) {
      const candidate = this.citations[i]

      // Only match against full case citations
      if (candidate.type !== "case") {
        continue
      }

      // Check if volume and reporter match
      if (
        candidate.volume === citation.volume &&
        this.normalizeReporter(candidate.reporter) === this.normalizeReporter(citation.reporter)
      ) {
        // Check scope boundary (short-form case allows cross-zone: footnote -> body)
        if (!this.isWithinScope(i, currentIndex, true)) {
          return this.createFailureResult("Matching citation outside scope boundary")
        }

        // Found a match
        return {
          resolvedTo: i,
          confidence: 0.95, // High confidence but not perfect (multiple cases could have same volume/reporter)
        }
      }
    }

    return this.createFailureResult("No matching full case citation found")
  }

  /**
   * Tracks a full citation in the resolution history.
   * Extracts party name for supra resolution.
   * Uses extracted party names (Phase 7) when available, falls back to backward search.
   */
  private trackFullCitation(citation: Citation, index: number): void {
    // Only case citations have party names for supra resolution
    if (citation.type === "case") {
      // Phase 7: Use extracted party names when available
      // Defendant name stored first (preferred for Bluebook-style supra matching)
      if (citation.defendantNormalized) {
        this.context.fullCitationHistory.set(citation.defendantNormalized, index)
        this.partyNameTree.insert(citation.defendantNormalized)
      }
      if (citation.plaintiffNormalized) {
        this.context.fullCitationHistory.set(citation.plaintiffNormalized, index)
        this.partyNameTree.insert(citation.plaintiffNormalized)
      }

      // Fallback: backward search from text (pre-Phase 7 compatibility)
      if (!citation.plaintiffNormalized && !citation.defendantNormalized) {
        const partyName = this.extractPartyName(citation)
        if (partyName) {
          const normalized = this.normalizePartyName(partyName)
          this.context.fullCitationHistory.set(normalized, index)
          this.partyNameTree.insert(normalized)
        }
      }
    }
  }

  /**
   * Extracts party name from full case citation text.
   * Handles "Party v. Party" format by looking at text before citation span.
   */
  private extractPartyName(citation: FullCaseCitation): string | undefined {
    // Look at text before citation span to find party names
    // Case citations typically appear as: "Smith v. Jones, 100 F.2d 10"
    // But tokenizer only captures "100 F.2d 10" - we need to look backwards in text

    const citationStart = citation.span.originalStart
    // Look backwards up to 100 characters for party name
    const lookbackStart = Math.max(0, citationStart - 100)
    const beforeText = this.text.substring(lookbackStart, citationStart)

    // Match pattern: "FirstParty v. SecondParty, " before the citation
    // Capture the first party name (handles single-letter party names like "A" or "B")
    const vMatch = beforeText.match(
      /([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)\s+v\.?\s+[A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*,\s*$/,
    )
    if (vMatch) {
      return this.stripSignalWords(vMatch[1].trim())
    }

    // Fallback: try to find any capitalized word(s) before comma
    const beforeComma = beforeText.match(/([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*),\s*$/)
    if (beforeComma) {
      return this.stripSignalWords(beforeComma[1].trim())
    }
    return undefined
  }

  /**
   * Strips citation signal words that may precede party names.
   * E.g., "In Smith" → "Smith", "See Also Jones" → "Jones"
   * Preserves "In re" which is a case name format, not a signal word.
   */
  private stripSignalWords(name: string): string {
    const stripped = name
      .replace(/^(?:In(?!\s+re\b)|See(?:\s+[Aa]lso)?|Compare|But(?:\s+[Ss]ee)?|Cf\.?|Also)\s+/i, "")
      .trim()
    // Only return stripped version if something remains
    return stripped.length > 0 ? stripped : name
  }

  /**
   * Normalizes party name for matching.
   */
  private normalizePartyName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim()
  }

  /**
   * Normalizes reporter abbreviation for matching.
   */
  private normalizeReporter(reporter: string): string {
    return reporter
      .toLowerCase()
      .replace(/\s+/g, "") // Remove spaces (F.2d vs F. 2d)
      .replace(/\./g, "") // Remove periods
  }

  /**
   * Checks if antecedent citation is within scope boundary.
   */
  private isWithinScope(
    antecedentIndex: number,
    currentIndex: number,
    allowCrossZone = false,
  ): boolean {
    return isWithinBoundary(
      antecedentIndex,
      currentIndex,
      this.context.paragraphMap,
      this.options.scopeStrategy,
      allowCrossZone,
    )
  }

  /**
   * Creates a failure result for unresolved citations.
   */
  private createFailureResult(reason: string): ResolutionResult | undefined {
    if (this.options.reportUnresolved) {
      return {
        resolvedTo: undefined,
        failureReason: reason,
        confidence: 0.0,
      }
    }
    return undefined
  }
}
