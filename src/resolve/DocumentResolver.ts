/**
 * Document-Scoped Citation Resolver
 *
 * Resolves short-form citations (Id./supra/short-form case) to their full antecedent citations
 * by maintaining resolution context and enforcing scope boundaries.
 *
 * Resolution rules:
 * - Id. resolves to immediately preceding full citation (within scope)
 * - Supra resolves to full citation with matching party name (within scope)
 * - Short-form case resolves to full case with matching volume/reporter (within scope)
 */

import type {
  Citation,
  FullCaseCitation,
  FullCitationType,
  IdCitation,
  SupraCitation,
  ShortFormCaseCitation,
} from '../types/citation'
import type {
  ResolutionOptions,
  ResolutionResult,
  ResolvedCitation,
  ResolutionContext,
} from './types'
import { detectParagraphBoundaries, isWithinBoundary } from './scopeBoundary'
import { normalizedLevenshteinDistance } from './levenshtein'

/**
 * Document-scoped resolver that processes citations sequentially
 * and resolves short-form citations to their antecedents.
 */
export class DocumentResolver {
  private readonly citations: Citation[]
  private readonly text: string
  private readonly options: Required<ResolutionOptions>
  private readonly context: ResolutionContext

  /**
   * Creates a new DocumentResolver.
   *
   * @param citations - All citations in document (in order of appearance)
   * @param text - Original document text
   * @param options - Resolution options
   */
  constructor(
    citations: Citation[],
    text: string,
    options: ResolutionOptions = {}
  ) {
    this.citations = citations
    this.text = text

    // Apply defaults to options
    this.options = {
      scopeStrategy: options.scopeStrategy ?? 'paragraph',
      autoDetectParagraphs: options.autoDetectParagraphs ?? true,
      paragraphBoundaryPattern: options.paragraphBoundaryPattern ?? /\n\n+/g,
      fuzzyPartyMatching: options.fuzzyPartyMatching ?? true,
      partyMatchThreshold: options.partyMatchThreshold ?? 0.8,
      allowNestedResolution: options.allowNestedResolution ?? false,
      reportUnresolved: options.reportUnresolved ?? true,
    }

    // Initialize resolution context
    this.context = {
      citationIndex: 0,
      allCitations: citations,
      lastFullCitation: undefined,
      fullCitationHistory: new Map(),
      paragraphMap: new Map(),
    }

    // Detect paragraph boundaries if enabled
    if (this.options.autoDetectParagraphs) {
      this.context.paragraphMap = detectParagraphBoundaries(
        text,
        citations,
        this.options.paragraphBoundaryPattern
      )
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
        case 'id':
          resolution = this.resolveId(citation)
          break
        case 'supra':
          resolution = this.resolveSupra(citation)
          break
        case 'shortFormCase':
          resolution = this.resolveShortFormCase(citation)
          break
        default:
          // Full citation - update context for future resolutions
          if (this.isFullCitation(citation)) {
            this.context.lastFullCitation = i
            this.trackFullCitation(citation, i)
          }
          break
      }

      // Add citation with optional resolution metadata
      resolved.push({
        ...citation,
        resolution,
      })
    }

    return resolved
  }

  /**
   * Resolves Id. citation to immediately preceding full case citation.
   */
  private resolveId(citation: IdCitation): ResolutionResult | undefined {
    const currentIndex = this.context.citationIndex

    // Find most recent full case citation (Id. only resolves to case citations, not statutes/journals)
    let antecedentIndex: number | undefined
    for (let i = currentIndex - 1; i >= 0; i--) {
      const candidate = this.citations[i]
      if (candidate.type === 'case') {
        antecedentIndex = i
        break
      }
    }

    // Check if we have a previous case citation
    if (antecedentIndex === undefined) {
      return this.createFailureResult('No preceding full case citation found')
    }

    // Check scope boundary
    if (!this.isWithinScope(antecedentIndex, currentIndex)) {
      return this.createFailureResult('Antecedent citation outside scope boundary')
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
    const currentIndex = this.context.citationIndex
    const targetPartyName = this.normalizePartyName(citation.partyName)

    // Search full citation history for matching party name
    let bestMatch: { index: number; similarity: number } | undefined

    for (const [partyName, citationIndex] of this.context.fullCitationHistory) {
      // Check scope boundary
      if (!this.isWithinScope(citationIndex, currentIndex)) {
        continue
      }

      // Calculate similarity
      const similarity = normalizedLevenshteinDistance(targetPartyName, partyName)

      // Update best match if this is better
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { index: citationIndex, similarity }
      }
    }

    // Check if we found a match above threshold
    if (!bestMatch) {
      return this.createFailureResult('No full citation found in scope')
    }

    if (bestMatch.similarity < this.options.partyMatchThreshold) {
      return this.createFailureResult(
        `Party name similarity ${bestMatch.similarity.toFixed(2)} below threshold ${this.options.partyMatchThreshold}`
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
      if (candidate.type !== 'case') {
        continue
      }

      // Check if volume and reporter match
      if (
        candidate.volume === citation.volume &&
        this.normalizeReporter(candidate.reporter) === this.normalizeReporter(citation.reporter)
      ) {
        // Check scope boundary
        if (!this.isWithinScope(i, currentIndex)) {
          return this.createFailureResult('Matching citation outside scope boundary')
        }

        // Found a match
        return {
          resolvedTo: i,
          confidence: 0.95, // High confidence but not perfect (multiple cases could have same volume/reporter)
        }
      }
    }

    return this.createFailureResult('No matching full case citation found')
  }

  /**
   * Checks if a citation is a full citation (not short-form).
   */
  private isFullCitation(citation: Citation): boolean {
    const fullTypes: Set<FullCitationType> = new Set(['case', 'statute', 'journal', 'neutral', 'publicLaw', 'federalRegister'])
    return fullTypes.has(citation.type as FullCitationType)
  }

  /**
   * Tracks a full citation in the resolution history.
   * Extracts party name for supra resolution.
   */
  private trackFullCitation(citation: Citation, index: number): void {
    // Only case citations have party names for supra resolution
    if (citation.type === 'case') {
      const partyName = this.extractPartyName(citation)
      if (partyName) {
        const normalized = this.normalizePartyName(partyName)
        this.context.fullCitationHistory.set(normalized, index)
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
    const vMatch = beforeText.match(/([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)\s+v\.?\s+[A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*,\s*$/)
    if (vMatch) {
      return vMatch[1].trim()
    }

    // Fallback: try to find any capitalized word(s) before comma
    const beforeComma = beforeText.match(/([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*),\s*$/)
    return beforeComma?.[1].trim()
  }

  /**
   * Normalizes party name for matching.
   */
  private normalizePartyName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  /**
   * Normalizes reporter abbreviation for matching.
   */
  private normalizeReporter(reporter: string): string {
    return reporter
      .toLowerCase()
      .replace(/\s+/g, '') // Remove spaces (F.2d vs F. 2d)
      .replace(/\./g, '')   // Remove periods
  }

  /**
   * Checks if antecedent citation is within scope boundary.
   */
  private isWithinScope(antecedentIndex: number, currentIndex: number): boolean {
    return isWithinBoundary(
      antecedentIndex,
      currentIndex,
      this.context.paragraphMap,
      this.options.scopeStrategy
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
