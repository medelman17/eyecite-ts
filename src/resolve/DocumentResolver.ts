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
  CitationSignal,
  FullCaseCitation,
  FullCitation,
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
 * Returns the citation's `fullSpan` if it has one. Only `case` and `docket`
 * citations carry `fullSpan` (set during case-name backward search). Other
 * full citation types (statute, journal, neutral, etc.) don't have a
 * case-name span concept and never participate in parenthetical-child checks.
 */
function getFullSpan(citation: Citation): Span | undefined {
  if (citation.type === "case" || citation.type === "docket") {
    return citation.fullSpan
  }
  return undefined
}

/**
 * Bluebook signal categories that mark a citation as an *aside* — supporting,
 * comparative, or background — rather than a primary cited authority.
 * Citations carrying a weak signal are skipped when picking an `Id.`
 * antecedent unless no stronger candidate is in scope. Suggested-contradiction
 * (`but cf.`) is weak; direct-contradiction (`contra`, `but see`) is strong
 * because the writer is squarely engaging the cited authority.
 */
const WEAK_SIGNALS: ReadonlySet<CitationSignal> = new Set<CitationSignal>([
  "see",
  "see also",
  "see generally",
  "cf",
  "but cf",
  "compare",
  "e.g.",
  "see, e.g.",
  "see also, e.g.",
  "cf., e.g.",
  "but cf., e.g.",
])

/**
 * Family classification used when matching `Id.` to an antecedent. Page-style
 * pincites (`Id. at 70`) point to `case`-family authorities (case, journal,
 * neutral, court reporter). Section-style pincites (`Id. § 1983(c)`) point
 * to `statute`-family authorities (statute, public-law, regulation).
 */
type CitationFamily = "case" | "statute" | "other"

function citationFamily(citation: Citation): CitationFamily {
  switch (citation.type) {
    case "case":
    case "journal":
    case "neutral":
      return "case"
    case "statute":
    case "publicLaw":
    case "federalRegister":
    case "statutesAtLarge":
      return "statute"
    default:
      return "other"
  }
}

/**
 * Classify an ASCII `"` at position `pos` as opening, closing, or ambiguous,
 * based on neighboring characters. English typographic conventions:
 *
 *   - Opening: preceded by start/whitespace/punctuation-open (`(`, `[`, `—`)
 *     AND followed by a letter or `(`.
 *   - Closing: preceded by a letter/digit/sentence punctuation
 *     (`.`, `,`, `?`, `!`, `:`, `;`, `)`, `]`) AND followed by end/
 *     whitespace/punctuation.
 *   - Ambiguous: everything else (skipped during pairing).
 */
function classifyAsciiQuote(text: string, pos: number): "open" | "close" | "ambiguous" {
  const prev = pos === 0 ? "" : text[pos - 1]
  const next = pos === text.length - 1 ? "" : text[pos + 1]

  const openPrev = prev === "" || /\s/.test(prev) || prev === "(" || prev === "[" || prev === "—"
  const openNext = /[A-Za-zÀ-ɏ]/.test(next) || next === "("
  if (openPrev && openNext) return "open"

  const closePrev = /[A-Za-z0-9À-ɏ.,?!:;)\]]/.test(prev)
  const closeNext = next === "" || /[\s.,;:)—\]]/.test(next)
  if (closePrev && closeNext) return "close"

  return "ambiguous"
}

/**
 * Detects block-quote and inline-quote zones in **original** text and
 * returns sorted, non-overlapping `{start, end}` ranges in original-text
 * coordinates. Callers must look up citations via `span.originalStart`,
 * not `cleanStart` — the clean pipeline collapses newlines so a markdown
 * `> …` becomes inline with the surrounding sentence and the line-based
 * blockquote shape is lost. Two zone shapes are recognized:
 *
 *   - Markdown blockquotes: contiguous lines whose first non-whitespace
 *     character is `>`. The zone spans from the first such line's start to
 *     the end of the last contiguous line.
 *   - Inline paired quotes: balanced `"…"` or `“…”` regions on a single
 *     content stretch. We only accept pairs that are at most ~600 chars
 *     apart, which filters most cases of stray unbalanced quotes; longer
 *     "quotes" would swallow unrelated citations and produce wrong skips.
 */
function detectQuoteZones(text: string): Array<{ start: number; end: number }> {
  const zones: Array<{ start: number; end: number }> = []

  // Markdown blockquotes (`>` lines).
  let lineStart = 0
  let zoneStart = -1
  for (let i = 0; i <= text.length; i++) {
    const atEnd = i === text.length
    if (atEnd || text[i] === "\n") {
      const line = text.substring(lineStart, i)
      const trimmed = line.replace(/^[ \t]*/, "")
      const isQuoteLine = trimmed.startsWith(">")
      if (isQuoteLine) {
        if (zoneStart === -1) zoneStart = lineStart
      } else if (zoneStart !== -1) {
        zones.push({ start: zoneStart, end: lineStart })
        zoneStart = -1
      }
      lineStart = i + 1
    }
  }
  if (zoneStart !== -1) zones.push({ start: zoneStart, end: text.length })

  // Inline paired quotes. Two-step:
  //   1. Classify each quote-character as open / close / ambiguous based on
  //      neighboring characters (typographic conventions).
  //   2. Match opens to closes with a stack, skipping orphans and ambiguous.
  //
  // Why not greedy "first quote = open, next = close"? That mispairs when
  // input starts mid-document with an orphan close (e.g. `use." Smith...`),
  // creating a phantom zone that engulfs unrelated citations and breaks
  // Id. resolution. The classifier handles arbitrary text snippets
  // robustly. Typographic quotes (U+201C / U+201D) are unambiguous and
  // pair directly.
  //
  // Two separate stacks isolate ASCII and typographic styles so a mixed
  // open/close (e.g. ASCII `"` … typographic `”`) cannot cross-pair into
  // a phantom zone that engulfs intermediate citations.
  const MAX_INLINE_QUOTE_LEN = 600
  const asciiOpens: number[] = []
  const typographicOpens: number[] = []
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    // Typographic quotes: unambiguous.
    if (ch === "“") {
      typographicOpens.push(i)
      continue
    }
    if (ch === "”") {
      // Orphan closes are skipped — a leading typographic `”` without a
      // matching open should not retroactively turn into an open.
      const openPos = typographicOpens.pop()
      if (openPos === undefined) continue
      if (i - openPos + 1 <= MAX_INLINE_QUOTE_LEN) {
        zones.push({ start: openPos, end: i + 1 })
      }
      continue
    }

    // ASCII straight double-quote: classify by neighbors.
    if (ch !== '"') continue
    const cls = classifyAsciiQuote(text, i)
    if (cls === "open") {
      asciiOpens.push(i)
    } else if (cls === "close") {
      // Orphan closes are skipped — same rationale as the typographic branch.
      const openPos = asciiOpens.pop()
      if (openPos === undefined) continue
      if (i - openPos + 1 <= MAX_INLINE_QUOTE_LEN) {
        zones.push({ start: openPos, end: i + 1 })
      }
    }
    // ambiguous → skip
  }

  zones.sort((a, b) => a.start - b.start)
  return zones
}

function isInZone(
  pos: number,
  zones: ReadonlyArray<{ start: number; end: number }>,
): { start: number; end: number } | undefined {
  // Linear scan is fine; zone counts in real briefs are well under 50.
  for (const zone of zones) {
    if (pos < zone.start) return undefined
    if (pos < zone.end) return zone
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
  private readonly quoteZones: ReadonlyArray<{ start: number; end: number }>
  /** Parenthesis depth at each citation's start (filled lazily by resolve()). */
  private parenDepths: number[] = []
  /** Resolution results accumulated during the in-flight resolve() pass. */
  private resolutions: Array<ResolutionResult | undefined> = []
  /** Resolved citations accumulated during the in-flight resolve() pass; used
   *  for fullSpan-based parenthetical-child detection on later candidates. */
  private resolvedSoFar: ResolvedCitation[] = []

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
    this.quoteZones = detectQuoteZones(text)

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

    // Reset per-call state so a single DocumentResolver can be reused (the
    // public API currently constructs a fresh one per document, but the
    // per-instance fields make the algorithm easier to follow).
    this.parenDepths = this.computeParenDepths()
    this.resolutions = new Array(this.citations.length).fill(undefined)
    this.resolvedSoFar = resolved

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
          // Full citation. The new Id. resolver walks back over the citations
          // list and consults `this.resolutions[i]` for short-form chains, so
          // it no longer needs `context.lastResolvedIndex` as a fast path.
          // We still need to register party names for `supra`.
          if (isFullCitation(citation)) {
            this.trackFullCitation(citation, i)
          }
          break
      }

      // Record the resolution so a subsequent `Id.` walking backward can
      // follow short-form chains (shortForm/supra/Id. → full antecedent).
      this.resolutions[i] = resolution

      // Bluebook Rule 4.1: when the antecedent is a case citation,
      // propagate its caption (caseName, plaintiff, defendant, procedural
      // prefix) onto the Id. so consumers can use it directly without
      // walking `resolution.resolvedTo`. Pincite inheritance lives in the
      // post-resolution `inheritPincites` pass below (it has to walk the
      // citation array to honor the "immediately preceding citation"
      // rule when intermediate `Id. at X` introduces a new pincite).
      let citationOut: Citation = citation
      if (citation.type === "id" && resolution?.resolvedTo !== undefined) {
        const antecedent = this.citations[resolution.resolvedTo]
        if (antecedent) {
          const idOut: IdCitation = { ...(citation as IdCitation) }

          // Case-name inheritance (only when antecedent is a `case`).
          if (antecedent.type === "case") {
            if (antecedent.caseName) idOut.caseName = antecedent.caseName
            if (antecedent.plaintiff) idOut.plaintiff = antecedent.plaintiff
            if (antecedent.defendant) idOut.defendant = antecedent.defendant
            if (antecedent.plaintiffNormalized)
              idOut.plaintiffNormalized = antecedent.plaintiffNormalized
            if (antecedent.defendantNormalized)
              idOut.defendantNormalized = antecedent.defendantNormalized
            if (antecedent.proceduralPrefix) idOut.proceduralPrefix = antecedent.proceduralPrefix
          }

          citationOut = idOut
        }
      }

      // Add citation with resolution metadata
      // Type assertion is safe: runtime logic only sets resolution on short-form citations
      resolved.push({
        ...citationOut,
        resolution,
      } as ResolvedCitation)
    }

    this.inheritPincites(resolved)
    return resolved
  }

  /**
   * Returns true if the given full citation carries a numeric pincite
   * (case-family: case, journal, neutral). Short-form citation types
   * (IdCitation, SupraCitation, ShortFormCaseCitation) all type `pincite`
   * as `number` only, so they can only inherit from numeric-pincite
   * authorities. Statute-family inheritance is blocked by the type system
   * today; revisit if/when short-forms gain `string` pincite support.
   */
  private hasNumericPinciteFamily(cit: FullCitation): boolean {
    return cit.type === "case" || cit.type === "journal" || cit.type === "neutral"
  }

  /**
   * Post-resolution pass: propagate pincite from the immediately preceding
   * same-authority citation per Bluebook Rule 4.1 / Indigo Book R6.2.2.
   * Mutates `resolved` in place. Walks backward from each short-form,
   * stopping at authority boundaries (different `resolvedTo`) or successful
   * inheritance, skipping citations nested in explanatory parentheticals
   * (Rule 4.1 explicit exception). Only inherits numeric pincites — see
   * `hasNumericPinciteFamily` for why.
   *
   * See docs/superpowers/specs/2026-05-19-pincite-inheritance-design.md.
   */
  private inheritPincites(resolved: ResolvedCitation[]): void {
    for (let i = 0; i < resolved.length; i++) {
      const cit = resolved[i]

      // Eligibility: only short-forms with a successful resolution and no
      // explicit pincite/pinciteInfo of their own.
      if (cit.type !== "id" && cit.type !== "supra" && cit.type !== "shortFormCase") continue
      const myResolution = this.resolutions[i]
      if (!myResolution || myResolution.resolvedTo === undefined) continue
      if (cit.pincite !== undefined || cit.pinciteInfo !== undefined) continue

      const targetPrimary = myResolution.resolvedTo
      const currentParenDepth = this.parenDepths[i] ?? 0

      // Family check uses the terminal full citation. resolvedTo always
      // points at a full citation by construction in
      // resolveId/resolveSupra/resolveShortFormCase.
      const targetFull = resolved[targetPrimary] as unknown as FullCitation
      if (!this.hasNumericPinciteFamily(targetFull)) continue

      for (let j = i - 1; j >= 0; j--) {
        // Rule 4.1 explicit exception: explanatory-parenthetical cites
        // are not "intervening authorities."
        if ((this.parenDepths[j] ?? 0) > currentParenDepth) continue

        const cand = resolved[j]
        const candPrimary = isFullCitation(cand) ? j : this.resolutions[j]?.resolvedTo

        // Authority boundary: stop scanning at any prior cite that resolves
        // to a different primary (or fails to resolve).
        if (candPrimary !== targetPrimary) break

        // Candidate must carry a numeric pincite to inherit. Skip non-numeric
        // (statute-shape) candidates by continuing — a more eligible candidate
        // may exist further back. Skip pinciteInfo-only candidates similarly.
        const candPincite = (cand as { pincite?: number | string }).pincite
        if (typeof candPincite !== "number") continue

        const target = cit as IdCitation | SupraCitation | ShortFormCaseCitation
        target.pincite = candPincite
        const candPinciteInfo = (cand as { pinciteInfo?: IdCitation["pinciteInfo"] }).pinciteInfo
        if (candPinciteInfo) target.pinciteInfo = candPinciteInfo
        target.pinciteInherited = true
        target.pinciteInheritedFrom = j
        break
      }
    }
  }

  /**
   * Compute parenthesis depth at the start position of each citation.
   * Walks the raw text once, counting `(` and `)` and recording the
   * running depth at every citation's `span.cleanStart`. Depth > 0
   * indicates the citation is nested inside an open parenthetical
   * block (typically an explanatory `(quoting X)` / `(citing Y)`
   * following an earlier citation).
   */
  private computeParenDepths(): number[] {
    const depths: number[] = new Array(this.citations.length).fill(0)
    if (this.citations.length === 0) return depths

    let depth = 0
    let pos = 0
    for (let i = 0; i < this.citations.length; i++) {
      const start = this.citations[i].span.cleanStart
      while (pos < start && pos < this.text.length) {
        const ch = this.text[pos]
        if (ch === "(") depth++
        else if (ch === ")" && depth > 0) depth--
        pos++
      }
      depths[i] = depth
    }
    return depths
  }

  /**
   * Resolves `Id.` to the most recent preceding *cited authority*, respecting
   * Bluebook signal categories, block-/inline-quote zones, and the family
   * (case vs. statute) implied by `Id.`'s pincite shape (#480).
   *
   * Algorithm:
   *   1. Walk backward from `currentIndex`, normalizing short-form citations
   *      (shortFormCase/supra/Id.) to their resolved antecedent. Dedupe by
   *      effective primary index so a case mentioned via a short-form earlier
   *      doesn't get double-counted with its full-cite further back.
   *   2. Filter candidates that are parenthetical children (existing #214
   *      behavior) or in a quote zone outside `Id.`'s own zone.
   *   3. Score remaining candidates: family-match dominates, then signal
   *      strength, then (implicitly) recency (first-added = most recent
   *      effective mention).
   *   4. Apply the case-name window check to surface ambiguity when the prose
   *      immediately before `Id.` mentions a different case name.
   */
  private resolveId(citation: IdCitation): ResolutionResult | undefined {
    const currentIndex = this.context.citationIndex
    const preferredFamily = this.getIdPreferredFamily(citation)
    const idQuoteZone = isInZone(citation.span.originalStart, this.quoteZones)

    interface Candidate {
      index: number
      family: CitationFamily
      weak: boolean
    }
    const candidates: Candidate[] = []
    const seen = new Set<number>()

    for (let i = currentIndex - 1; i >= 0; i--) {
      const c = this.citations[i]
      let primaryIdx: number

      if (isFullCitation(c)) {
        primaryIdx = i
      } else {
        // shortForm/Id./supra — follow the resolution chain. If it failed to
        // resolve we skip it: a broken short-form shouldn't pin Id. to a
        // citation the writer didn't successfully cite.
        const prev = this.resolutions[i]
        if (!prev || prev.resolvedTo === undefined) continue
        primaryIdx = prev.resolvedTo
      }

      if (seen.has(primaryIdx)) continue
      seen.add(primaryIdx)

      const cit = this.citations[primaryIdx]
      if (!isFullCitation(cit)) continue
      if (this.isParentheticalChild(primaryIdx)) continue
      if (!this.isWithinScope(primaryIdx, currentIndex)) continue

      // Quote-boundary respect: a citation inside a quote zone is not eligible
      // as Id.'s antecedent unless the Id. itself is in the same zone.
      const candidateZone = isInZone(cit.span.originalStart, this.quoteZones)
      if (candidateZone && candidateZone !== idQuoteZone) continue

      candidates.push({
        index: primaryIdx,
        family: citationFamily(cit),
        weak: this.isCandidateWeakSignal(cit),
      })
    }

    if (candidates.length === 0) {
      // Diagnose: did we have any preceding citation at all? If not, the
      // legacy failure message helps consumers debug "Id. before any cite".
      const anyPrior = currentIndex > 0
      return this.createFailureResult(
        anyPrior ? "Antecedent citation outside scope boundary" : "No preceding citation found",
      )
    }

    // Score each candidate. Family-match dominates (Id.'s pincite shape
    // tells us which family of authority the writer intended). Strong
    // (unsignaled or direct-engagement) candidates beat weak (aside)
    // candidates. Recency breaks ties — candidates are pushed in reverse
    // document order, so the first match at a given score is the most
    // recent effective mention.
    const score = (c: Candidate) => {
      let s = 0
      if (c.family === preferredFamily) s += 1000
      if (!c.weak) s += 100
      return s
    }
    let best = candidates[0]
    let bestScore = score(best)
    for (let i = 1; i < candidates.length; i++) {
      const s = score(candidates[i])
      if (s > bestScore) {
        best = candidates[i]
        bestScore = s
      }
    }

    // Case-name window check: if the prose immediately before Id. names a
    // case that doesn't match the picked antecedent, downgrade confidence and
    // flag ambiguity (without refusing to commit).
    const { confidence, warnings } = this.applyCaseNameWindowCheck(best.index, citation)

    return {
      resolvedTo: best.index,
      confidence,
      warnings,
    }
  }

  /**
   * Determines whether `Id.`'s pincite shape implies a case or statute
   * antecedent. We peek at the cleaned text immediately after `Id.`'s span
   * end because the regex in `extractIdCitation` only captures page-style
   * pincites (`at NNN`, `¶ NNN`); a section-style pincite (`§ NNN`) lives
   * in the raw text but not on the IdCitation object.
   */
  private getIdPreferredFamily(citation: IdCitation): CitationFamily {
    // Look at up to 20 chars after Id.'s span end for a `§` token.
    const start = citation.span.cleanEnd
    const end = Math.min(this.text.length, start + 20)
    const tail = this.text.substring(start, end)
    if (/^\s*[,]?\s*§§?\s*\d/.test(tail)) return "statute"
    return "case"
  }

  /**
   * Computes the "effective" signal for a citation. Citations inside a
   * string-cite group inherit the leading signal of the group's first
   * member when they have no signal of their own — the Bluebook rule that
   * a leading signal governs the entire string cite.
   */
  private getEffectiveSignal(citation: Citation): CitationSignal | undefined {
    if (citation.signal) return citation.signal
    const groupId = citation.stringCitationGroupId
    if (!groupId) return undefined
    // First member of the group carries the leading signal.
    for (const c of this.citations) {
      if (c.stringCitationGroupId === groupId && c.stringCitationIndex === 0) {
        return c.signal
      }
    }
    return undefined
  }

  private isCandidateWeakSignal(citation: Citation): boolean {
    const sig = this.getEffectiveSignal(citation)
    return sig !== undefined && WEAK_SIGNALS.has(sig)
  }

  /**
   * `(citing X)` / `(quoting Y)` detection (#214). Two strategies in OR:
   *   - paren depth > 0 at the citation's start (works for any prior
   *     citation type — statute, journal, etc.);
   *   - the citation's clean-span is wholly inside a previously-resolved
   *     citation's `fullSpan` (case-name-prefixed citations sometimes have
   *     `(...)` ranges that close before the paren-depth scan catches up).
   */
  private isParentheticalChild(index: number): boolean {
    if (this.parenDepths[index] > 0) return true
    const cit = this.citations[index]
    for (let i = 0; i < this.resolvedSoFar.length; i++) {
      if (i === index) continue // a citation cannot be a paren child of itself
      const prior = this.resolvedSoFar[i]
      const priorFullSpan = getFullSpan(prior)
      if (!priorFullSpan) continue
      if (
        priorFullSpan.cleanStart <= cit.span.cleanStart &&
        priorFullSpan.cleanEnd >= cit.span.cleanEnd
      ) {
        return true
      }
    }
    return false
  }

  /**
   * Scans the prose between the previous citation and `Id.` for a case-name
   * mention. If a name is found and doesn't match the picked antecedent's
   * caseName/plaintiff/defendant, returns a downgraded confidence and an
   * ambiguity warning so consumers can surface it for review. Matching
   * names (or no name in the window) return undefined → caller uses the
   * default Id. confidence of 1.0.
   */
  private applyCaseNameWindowCheck(
    antecedentIndex: number,
    citation: IdCitation,
  ): { confidence: number; warnings: string[] | undefined } {
    const DEFAULT = { confidence: 1.0, warnings: undefined as string[] | undefined }
    const antecedent = this.citations[antecedentIndex]
    if (antecedent.type !== "case") return DEFAULT

    // Window: prose between the *immediately preceding citation* and Id.,
    // capped at 80 chars before Id. start. Bounding on the prior citation
    // (not the antecedent) ensures intermediate case names — which the
    // resolver may have deprioritized as asides — don't pollute the window
    // and produce false-positive ambiguity warnings.
    const idStart = citation.span.cleanStart
    let windowStart = Math.max(0, idStart - 80)
    const prevIndex = this.context.citationIndex - 1
    if (prevIndex >= 0) {
      const prev = this.citations[prevIndex]
      windowStart = Math.max(windowStart, prev.span.cleanEnd)
    }
    if (windowStart >= idStart) return DEFAULT

    const window = this.text.substring(windowStart, idStart)

    // Match capitalized words that are case-name-like. Filter out common
    // English/legal prose words that happen to be capitalized.
    const STOPWORDS = new Set([
      "As",
      "The",
      "This",
      "That",
      "These",
      "Those",
      "In",
      "Here",
      "There",
      "Court",
      "Courts",
      "Supreme",
      "Circuit",
      "District",
      "State",
      "States",
      "Federal",
      "Plaintiff",
      "Defendant",
      "Petitioner",
      "Respondent",
      "Appellant",
      "Appellee",
      "Government",
      "United",
      "We",
      "It",
      "Id",
      "See",
      "Compare",
      "Cf",
      "But",
      "Also",
      "Held",
      "Holds",
      "Held,",
    ])
    const tokens = window.match(/(?<![a-zA-Z])[A-Z][a-z]+(?:'s)?/g)
    if (!tokens) return DEFAULT
    const names = tokens.filter((t) => !STOPWORDS.has(t.replace(/'s$/, "")))
    if (names.length === 0) return DEFAULT

    const target = new Set<string>()
    if (antecedent.plaintiffNormalized) target.add(antecedent.plaintiffNormalized)
    if (antecedent.defendantNormalized) target.add(antecedent.defendantNormalized)
    if (antecedent.caseName) target.add(antecedent.caseName.toLowerCase())

    let matched = false
    let mismatchName: string | undefined
    for (const n of names) {
      const lc = n.replace(/'s$/, "").toLowerCase()
      let hit = false
      for (const t of target) {
        if (t === lc || t.includes(lc) || lc.includes(t)) {
          hit = true
          break
        }
      }
      if (hit) {
        matched = true
        break
      }
      if (!mismatchName) mismatchName = n.replace(/'s$/, "")
    }

    if (matched) return DEFAULT
    if (!mismatchName) return DEFAULT

    return {
      confidence: 0.75,
      warnings: [
        `Ambiguous Id. antecedent: prose mentions "${mismatchName}" but resolved to "${antecedent.caseName ?? antecedent.defendantNormalized ?? antecedent.plaintiffNormalized ?? "(unknown)"}"`,
      ],
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
   * Resolves short-form case citation by matching volume/reporter, with
   * party-name disambiguation when the short-form includes a back-reference
   * name (#278).
   *
   * Algorithm:
   *   1. Collect all backward candidates with matching volume + normalized
   *      reporter that are in-scope.
   *   2. If the short-form has `partyNameNormalized`: prefer the candidate
   *      whose plaintiff/defendant matches (substring containment in either
   *      direction handles abbreviations: `"Smith" ⊂ "Smith"` or
   *      `"Smith"` in `"Smith, Inc."`). Tie-break by recency.
   *   3. If no candidate matches the party name (or no party name on the
   *      short-form): fall back to recency.
   */
  private resolveShortFormCase(citation: ShortFormCaseCitation): ResolutionResult | undefined {
    const currentIndex = this.context.citationIndex
    const targetReporter = this.normalizeReporter(citation.reporter)
    const targetParty = citation.partyNameNormalized

    // Collect all backward candidates (most recent first) that match
    // vol+reporter AND are in-scope.
    const candidates: number[] = []
    for (let i = currentIndex - 1; i >= 0; i--) {
      const candidate = this.citations[i]
      if (candidate.type !== "case") continue
      if (candidate.volume !== citation.volume) continue
      if (this.normalizeReporter(candidate.reporter) !== targetReporter) continue
      if (!this.isWithinScope(i, currentIndex, true)) continue
      candidates.push(i)
    }

    if (candidates.length === 0) {
      return this.createFailureResult("No matching full case citation found")
    }

    // With a party name, prefer the candidate whose plaintiff or defendant
    // normalized name contains (or is contained by) the short-form's party
    // name. Substring containment in either direction tolerates common
    // abbreviation patterns: short-form `Smith` matches full `Smith, Inc.`
    // and vice versa. Recency breaks ties.
    if (targetParty) {
      const namedMatch = candidates.find((idx) => {
        const c = this.citations[idx]
        if (c.type !== "case") return false
        const plaintiff = c.plaintiffNormalized
        const defendant = c.defendantNormalized
        const hit = (name: string | undefined) =>
          name !== undefined &&
          (name === targetParty || name.includes(targetParty) || targetParty.includes(name))
        return hit(plaintiff) || hit(defendant)
      })
      if (namedMatch !== undefined) {
        return {
          resolvedTo: namedMatch,
          confidence: 0.98, // Higher than bare vol+reporter — party-name disambiguation tightens.
        }
      }
    }

    // No party name (or no name match): pick most recent candidate.
    return {
      resolvedTo: candidates[0],
      confidence: 0.95,
    }
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
