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
  FullCitation,
  IdCitation,
  ShortFormCaseCitation,
  SupraCitation,
} from "../types/citation"
import { isFullCitation } from "../types/guards"
import type { Span } from "../types/span"
import { detectQuoteZones } from "../utils/detectQuoteZones"
import { computeParenDepths } from "../utils/parenDepths"
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
    this.parenDepths = computeParenDepths(this.text, this.citations)
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
   * Find the immediate-preceding citation index for `antecedentIndex`
   * purposes. Bluebook Rule 4.1: `Id.` anchors to "the immediately
   * preceding cited authority" — unlike `resolveId`'s primary chase
   * (which only accepts resolved full antecedents), this lookup accepts
   * any prior citation that passes the existing scope / parenthetical /
   * quote-zone filters, regardless of resolution state.
   *
   * Returns the index of the immediately-preceding eligible citation,
   * or `undefined` if none.
   */
  private findImmediatePredecessor(
    citation: IdCitation | SupraCitation | ShortFormCaseCitation,
  ): number | undefined {
    const currentIndex = this.context.citationIndex
    const citationZone = isInZone(citation.span.originalStart, this.quoteZones)

    for (let i = currentIndex - 1; i >= 0; i--) {
      // Apply the same filters as resolveId's main chase.
      if (this.isParentheticalChild(i)) continue
      if (!this.isWithinScope(i, currentIndex)) continue
      const candidateZone = isInZone(this.citations[i].span.originalStart, this.quoteZones)
      if (candidateZone && candidateZone !== citationZone) continue
      // Accept regardless of resolution state.
      return i
    }
    return undefined
  }

  /**
   * Resolves `Id.` to the most recent preceding *cited authority*, respecting
   * block-/inline-quote zones and the family (case vs. statute) implied by
   * `Id.`'s pincite shape (#480). Per Bluebook Rule 4.1, signal phrase is
   * NOT a filter — `Id.` anchors to the immediately preceding cited
   * authority regardless of whether it carries `See`, `Cf.`, etc. (#498).
   *
   * Algorithm:
   *   1. Walk backward from `currentIndex`, normalizing short-form citations
   *      (shortFormCase/supra/Id.) to their resolved antecedent. Dedupe by
   *      effective primary index so a case mentioned via a short-form earlier
   *      doesn't get double-counted with its full-cite further back.
   *   2. Filter candidates that are parenthetical children (existing #214
   *      behavior) or in a quote zone outside `Id.`'s own zone.
   *   3. Score remaining candidates: family-match dominates, then (implicitly)
   *      recency (first-added = most recent effective mention).
   *   4. Apply the case-name window check to surface ambiguity when the prose
   *      immediately before `Id.` mentions a different case name.
   */
  private resolveId(citation: IdCitation): ResolutionResult | undefined {
    const currentIndex = this.context.citationIndex
    // Issue #721: bare `Id.` (no pincite/section marker) should attach to
    // the immediately preceding cite of ANY type per Bluebook Rule 4.1.
    // When the user wrote `42 U.S.C. § 1983. Id.`, they meant the statute,
    // not the case three sentences earlier. The family preference still
    // applies when Id. has a pincite shape that disambiguates (`Id. § 5`
    // → statute; `Id. at 27` → case).
    const hasPincite =
      citation.pincite !== undefined || citation.pinciteInfo !== undefined
    const tailHasSection = /^\s*[,]?\s*§§?\s*\d/.test(
      this.text.substring(
        citation.span.cleanEnd,
        Math.min(this.text.length, citation.span.cleanEnd + 20),
      ),
    )
    const preferredFamily =
      hasPincite || tailHasSection ? this.getIdPreferredFamily(citation) : null
    const idQuoteZone = isInZone(citation.span.originalStart, this.quoteZones)

    interface Candidate {
      index: number
      family: CitationFamily
    }
    const candidates: Candidate[] = []
    const seen = new Set<number>()

    for (let i = currentIndex - 1; i >= 0; i--) {
      const c = this.citations[i]
      let primaryIdx: number

      if (isFullCitation(c)) {
        primaryIdx = i
      } else {
        // shortForm/Id./supra — follow the resolution chain.
        const prev = this.resolutions[i]
        if (!prev || prev.resolvedTo === undefined) {
          // Unresolved short-form. Per Bluebook Rule 4.1, `Id.` anchors to
          // the immediately preceding cited authority — we must not chase
          // past an unresolved short-form to a more-distant full cite,
          // because the writer was citing the unresolved short-form, not
          // the earlier authority. Stop pass-1 here. Pass-2
          // (`findImmediatePredecessor`) will record the chain pointer in
          // `antecedentIndex`. Exception: short-forms that are themselves
          // syntactic asides (paren children, out of scope, wrong quote
          // zone) are not really "in the writer's main flow" and may be
          // skipped — those are filtered below.
          if (this.isParentheticalChild(i)) continue
          if (!this.isWithinScope(i, currentIndex)) continue
          const unresolvedZone = isInZone(c.span.originalStart, this.quoteZones)
          if (unresolvedZone && unresolvedZone !== idQuoteZone) continue
          break
        }
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
      })
    }

    if (candidates.length === 0) {
      // No resolved full-cite candidate. Pass 2: try the immediate
      // predecessor regardless of resolution state — Bluebook Rule 4.1
      // anchors `Id.` to the immediately preceding cited authority, not
      // just to resolved ones. The chain pointer is recorded in
      // `antecedentIndex`; `resolvedTo` stays undefined.
      const antecedentIndex = this.findImmediatePredecessor(citation)
      if (antecedentIndex !== undefined) {
        return {
          resolvedTo: undefined,
          antecedentIndex,
          confidence: 0.7,
          warnings: ["Id. antecedent has unresolved authority; chained by position only"],
        }
      }
      const anyPrior = currentIndex > 0
      return this.createFailureResult(
        anyPrior ? "Antecedent citation outside scope boundary" : "No preceding citation found",
      )
    }

    // Pick the antecedent: family preference is a soft signal — when at
    // least one candidate matches the preferred family (inferred from
    // `Id.`'s pincite shape), pick the most recent of them; otherwise
    // fall back to the most recent candidate regardless of family (#514).
    // Recency wins automatically because candidates are pushed in reverse
    // document order, so `candidates[0]` is the most recent effective
    // mention. Per Bluebook Rule 4.1, signal phrase does NOT affect
    // antecedent selection: `Id.` anchors to the immediately preceding
    // cited authority regardless of `See`, `Cf.`, etc. (#498).
    // When preferredFamily is null (bare Id. with no pincite — #721),
    // pick the most recent candidate regardless of family. Otherwise,
    // prefer family-match first, then fall back to recency.
    const preferred =
      preferredFamily === null
        ? undefined
        : candidates.find((c) => c.family === preferredFamily)
    const best = preferred ?? candidates[0]

    // Case-name window check: if the prose immediately before Id. names a
    // case that doesn't match the picked antecedent, downgrade confidence and
    // flag ambiguity (without refusing to commit).
    const { confidence, warnings } = this.applyCaseNameWindowCheck(best.index, citation)

    // #508: `antecedentIndex` mirrors `resolvedTo` on the success path so
    // consumers see one source of truth. The pre-fix code called
    // `findImmediatePredecessor` here, which walks the array by position and
    // ignores the family / scope filters the primary chase applied — that
    // produced disagreement when an intervening citation of a different
    // family sat between the picked antecedent and the `Id.` (e.g.,
    // case → statute → Id. at 5: resolvedTo=case, antecedentIndex=statute).
    // `findImmediatePredecessor` remains the fallback for the unresolved-
    // short-form chain (above) where no `resolvedTo` is available.
    return {
      resolvedTo: best.index,
      antecedentIndex: best.index,
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
   * The precise "explanatory aside" signal: the citation sits inside a
   * `(quoting X)` / `(citing Y)` parenthetical. Currently paren depth > 0 at
   * the citation's start (works for any container type — case, statute,
   * journal, etc.). Used directly by supra (#799), which must not anchor to a
   * quoted-within authority but also must NOT be fooled by the fullSpan
   * fallback below (which matches parallel-cite siblings). #798 extends this
   * with trigger-word anchoring so dropped/unbalanced parentheses still count.
   */
  private isParentheticalAside(index: number): boolean {
    return this.parenDepths[index] > 0
  }

  /**
   * `(citing X)` / `(quoting Y)` detection for `Id.` antecedent selection
   * (#214). Two strategies in OR:
   *   - the precise aside signal (`isParentheticalAside` — paren depth);
   *   - the citation's clean-span is wholly inside a previously-resolved
   *     citation's `fullSpan` (case-name-prefixed citations sometimes have
   *     `(...)` ranges that close before the paren-depth scan catches up).
   * Strategy 2 is intentionally NOT used by supra (#799): it also matches
   * parallel-cite siblings, which share a caption `fullSpan` yet are valid
   * supra antecedents.
   */
  private isParentheticalChild(index: number): boolean {
    if (this.isParentheticalAside(index)) return true
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
   *
   * When the supra `partyName` is a full caption (`"Fitzgerald v. Cleveland"`),
   * splitting on ` v. ` / ` vs. ` and querying each half independently rescues
   * resolution (#504). The BK-tree is indexed under the individual normalized
   * plaintiff and defendant names from `trackFullCitation`, so the combined
   * caption sits too far from either single name for the Levenshtein
   * threshold-derived `maxDistance` to recover it.
   */
  private resolveSupra(citation: SupraCitation): ResolutionResult | undefined {
    if (!citation.partyName) return undefined // Standalone supra — cannot resolve by party name
    const currentIndex = this.context.citationIndex
    const fullPartyName = this.normalizePartyName(citation.partyName)
    const vSplit = fullPartyName.split(/\s+vs?\.\s+/)

    if (vSplit.length === 2) {
      const captionMatch = this.queryFullCaptionSupra(
        vSplit[0].trim(),
        vSplit[1].trim(),
        currentIndex,
      )
      if (captionMatch) {
        return this.createSupraSuccess(captionMatch)
      }
    }

    // #504: split `Plaintiff v. Defendant` into individual party-name queries
    // so each half can match the BK-tree's per-name index. Querying the
    // combined caption alone fails because the index holds individual names.
    // The combined query is kept first as a tiebreaker for non-caption forms
    // (e.g., `Walker & Horwich, supra` should still query the joined string).
    const queries: string[] = [fullPartyName]
    if (vSplit.length === 2) {
      for (const half of vSplit) {
        const trimmed = half.trim()
        if (trimmed.length > 0) queries.push(trimmed)
      }
    }

    let bestMatch: { index: number; similarity: number } | undefined
    for (const query of queries) {
      const match = this.queryPartyNameTree(query, currentIndex)
      if (!match) continue
      if (!bestMatch || match.similarity > bestMatch.similarity) {
        bestMatch = match
      }
    }

    if (!bestMatch) {
      return this.createFailureResult("No full citation found in scope")
    }

    if (bestMatch.similarity < this.options.partyMatchThreshold) {
      return this.createFailureResult(
        `Party name similarity ${bestMatch.similarity.toFixed(2)} below threshold ${this.options.partyMatchThreshold}`,
      )
    }

    return this.createSupraSuccess(bestMatch)
  }

  private createSupraSuccess(match: { index: number; similarity: number }): ResolutionResult {
    // Return successful resolution with confidence based on similarity
    const warnings: string[] = []
    if (match.similarity < 1.0) {
      warnings.push(`Fuzzy match: similarity ${match.similarity.toFixed(2)}`)
    }

    // #795: `antecedentIndex` mirrors `resolvedTo` on the success path so
    // consumers see one source of truth, matching the #508 `Id.` fix. The
    // pre-fix code called `findImmediatePredecessor` here, which walks the
    // array by position and returns an intervening citation of a different
    // case when one sits between the party-name antecedent and the supra.
    // `findImmediatePredecessor` remains the fallback only for the
    // unresolved/positional path where no `resolvedTo` is available.
    return {
      resolvedTo: match.index,
      antecedentIndex: match.index,
      confidence: match.similarity,
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  }

  /**
   * Match a full-caption supra (`Plaintiff v. Defendant, supra`) against a
   * single prior case whose plaintiff and defendant both agree. This prevents
   * an unrelated case with a stronger one-sided fuzzy match from beating the
   * intended antecedent.
   */
  private queryFullCaptionSupra(
    plaintiffQuery: string,
    defendantQuery: string,
    currentIndex: number,
  ): { index: number; similarity: number } | undefined {
    if (!plaintiffQuery || !defendantQuery) return undefined

    let best: { index: number; similarity: number } | undefined
    for (let i = currentIndex - 1; i >= 0; i--) {
      const candidate = this.citations[i]
      if (candidate.type !== "case") continue
      if (!this.isWithinScope(i, currentIndex, true)) continue
      // #799: a case cited only inside another cite's `(quoting …)` aside is
      // not a valid supra antecedent, matching `resolveId`'s #214 exclusion.
      // Uses the precise aside signal so parallel-cite siblings (which share a
      // caption fullSpan) are NOT excluded.
      if (this.isParentheticalAside(i)) continue

      const plaintiffSimilarity = this.partyNameSimilarity(
        plaintiffQuery,
        candidate.plaintiffNormalized ?? candidate.plaintiff,
      )
      const defendantSimilarity = this.partyNameSimilarity(
        defendantQuery,
        candidate.defendantNormalized ?? candidate.defendant,
      )
      if (plaintiffSimilarity < this.options.partyMatchThreshold) continue
      if (defendantSimilarity < this.options.partyMatchThreshold) continue

      const similarity = Math.min(plaintiffSimilarity, defendantSimilarity)
      if (!best || similarity > best.similarity) {
        best = { index: i, similarity }
      }
    }

    return best
  }

  /**
   * BK-tree query for a single normalized party name, returning the best
   * in-scope citation index and similarity score (or undefined if no
   * candidate clears the configured threshold-derived `maxDistance`).
   * Shared between full-caption and split-half supra queries (#504).
   */
  private queryPartyNameTree(
    query: string,
    currentIndex: number,
  ): { index: number; similarity: number } | undefined {
    const queryLen = query.length
    const threshold = this.options.partyMatchThreshold
    // Safe upper bound: guarantees no match with similarity >= threshold is missed
    const maxDistance = queryLen === 0 ? 0 : Math.ceil((queryLen * (1 - threshold)) / threshold)
    const candidates = this.partyNameTree.query(query, maxDistance)

    // Sort by insertion order to match Map iteration behavior (first-inserted wins on ties)
    candidates.sort((a, b) => a.insertionOrder - b.insertionOrder)

    let best: { index: number; similarity: number } | undefined
    for (const candidate of candidates) {
      const citationIndex = this.context.fullCitationHistory.get(candidate.key)
      if (citationIndex === undefined) continue

      // Check scope boundary (supra allows cross-zone: footnote -> body)
      if (!this.isWithinScope(citationIndex, currentIndex, true)) continue
      // #799: skip antecedents cited only inside another cite's `(quoting …)`
      // aside, matching `resolveId`'s #214 parenthetical-child exclusion. Uses
      // the precise aside signal so parallel-cite siblings are not excluded.
      if (this.isParentheticalAside(citationIndex)) continue

      // Convert distance to normalized similarity
      const maxLen = Math.max(queryLen, candidate.key.length)
      const similarity = maxLen === 0 ? 1.0 : 1 - candidate.distance / maxLen

      // Update best match if this is better (strict > preserves first-wins tie-breaking)
      if (!best || similarity > best.similarity) {
        best = { index: citationIndex, similarity }
      }
    }
    return best
  }

  private partyNameSimilarity(query: string, candidate: string | undefined): number {
    if (!candidate) return 0

    const normalizedQuery = this.normalizePartyName(query)
    const normalizedCandidate = this.normalizePartyName(candidate)
    if (!normalizedQuery || !normalizedCandidate) return 0
    if (normalizedQuery === normalizedCandidate) return 1.0
    if (
      this.containsTokenSequence(normalizedCandidate, normalizedQuery) ||
      this.containsTokenSequence(normalizedQuery, normalizedCandidate)
    ) {
      return 0.95
    }

    const distance = levenshteinDistance(normalizedQuery, normalizedCandidate)
    const maxLength = Math.max(normalizedQuery.length, normalizedCandidate.length)
    return maxLength === 0 ? 1.0 : 1 - distance / maxLength
  }

  private containsTokenSequence(haystack: string, needle: string): boolean {
    const haystackTokens = haystack.split(" ").filter(Boolean)
    const needleTokens = needle.split(" ").filter(Boolean)
    if (needleTokens.length === 0 || needleTokens.length > haystackTokens.length) return false

    for (let i = 0; i <= haystackTokens.length - needleTokens.length; i++) {
      let matches = true
      for (let j = 0; j < needleTokens.length; j++) {
        if (haystackTokens[i + j] !== needleTokens[j]) {
          matches = false
          break
        }
      }
      if (matches) return true
    }
    return false
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
    // Renormalize the short-form's partyName through the resolver's own
    // `normalizePartyName` so corporate suffixes (`Inc.`, `LLC`, `Corp.`)
    // and connector words (`et al.`) are stripped to match the
    // already-normalized plaintiff/defendant on case citations. Without
    // this, `Smith, Inc., 100 F.2d at 7` carries `partyNameNormalized =
    // "smith, inc."` and fails to match a plaintiff of `"smith"`.
    const targetParty = citation.partyName
      ? this.normalizePartyName(citation.partyName)
      : undefined

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
      // Backward prose scan: try to recover case name from preceding prose.
      const inferred = this.extractInferredCaseName(citation)
      if (inferred) {
        citation.inferredCaseName = inferred.caseName
        citation.inferredPlaintiff = inferred.plaintiff
        citation.inferredDefendant = inferred.defendant
        citation.inferredCaseNameSpan = inferred.span
      }

      const antecedentIndex = this.findImmediatePredecessor(citation)
      if (antecedentIndex !== undefined) {
        return {
          resolvedTo: undefined,
          antecedentIndex,
          confidence: 0.5,
          warnings: ["No matching full case citation found; chained by position only"],
        }
      }
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
        // Token-sequence match (whole-word, sequential): `Smith` matches
        // `Smith, Inc.` (whole-word containment) but does NOT match
        // `Smithers` (no whole-word boundary). The previous substring
        // match (`name.includes(targetParty)`) caused prefix collisions.
        const hit = (name: string | undefined) =>
          name !== undefined &&
          (name === targetParty ||
            this.containsTokenSequence(name, targetParty) ||
            this.containsTokenSequence(targetParty, name))
        if (hit(plaintiff) || hit(defendant)) return true
        // Antecedent without a `v.` separator carries the single party as
        // `caseName` only — `plaintiff`/`defendant` are undefined. Fall
        // back to matching `caseName` normalized so single-party
        // shortform anchors (`Smith, 100 F.2d 1. Doe, 100 F.2d 5.
        // Smith, 100 F.2d at 3.`) still pick the right antecedent.
        if (c.caseName) {
          const caseNameNorm = this.normalizePartyName(c.caseName)
          if (hit(caseNameNorm)) return true
        }
        return false
      })
      if (namedMatch !== undefined) {
        return {
          resolvedTo: namedMatch,
          // #795: mirror `resolvedTo` on the success path (see createSupraSuccess).
          antecedentIndex: namedMatch,
          confidence: 0.98, // Higher than bare vol+reporter — party-name disambiguation tightens.
        }
      }
    }

    // No party name (or no name match): pick most recent candidate.
    return {
      resolvedTo: candidates[0],
      // #795: mirror `resolvedTo` on the success path (see createSupraSuccess).
      antecedentIndex: candidates[0],
      confidence: 0.95,
    }
  }

  /**
   * Backward prose scan for "Party v. Party" patterns preceding a
   * short-form citation whose vol+reporter lookup failed. Used to recover
   * a case name when the author introduced the authority in prose (e.g.
   * "In Yellen v. Kassin, ...") and used a short-form that didn't carry
   * an extractable full citation.
   *
   * Unlike `extractCaseName` — which performs a boundary-bounded backward
   * walk starting *immediately before* a citation core — this scan looks
   * anywhere in a ~400-char window before the short-form and accepts the
   * closest "Party v. Party" mention whose plaintiff or defendant matches
   * the short-form's `partyName`. Crossing intervening sentence boundaries
   * (e.g., "In Yellen v. Kassin, the court held. Yellen, 416 ...") is
   * required: the prose mention and the short-form are by definition
   * separated by other prose.
   *
   * LOOKBACK = 400 chars accommodates real-world legal prose where the
   * prose mention and short-form are separated by a long quoted passage
   * (e.g. the bug-report 2026-05-19 Yellen fixture has ~351 chars of
   * block quote between "In Yellen v. Kassin" and "Yellen, 416 N.J.
   * Super. at 590"). False-positive risk is bounded by the partyName
   * acceptance check and the "closest match wins" tie-breaker.
   *
   * Returns the inferred case name + spans, or `undefined` if no
   * acceptable match is found within `LOOKBACK` chars.
   */
  private extractInferredCaseName(citation: ShortFormCaseCitation):
    | {
        caseName: string
        plaintiff: string
        defendant: string
        span: Span
      }
    | undefined {
    const LOOKBACK = 400
    if (!citation.partyName) return undefined

    const start = Math.max(0, citation.span.cleanStart - LOOKBACK)
    const window = this.text.substring(start, citation.span.cleanStart)
    if (window.length === 0) return undefined

    // Lightweight "Party v. Party" matcher. Allows capitalized words
    // (with internal connectors / abbreviations / `&`, etc.) on either
    // side of `v.` / `vs.`, ending at sentence punctuation or a comma.
    // Looser than `V_CASE_NAME_REGEX` from `extractCase.ts`, which is
    // anchored to a citation core — here we're scanning free prose.
    //
    // The nested `*` quantifiers are ReDoS-safe: each repetition requires a
    // mandatory `\s+` separator, so the inner and outer alternatives are
    // disjoint on the same input and cannot backtrack catastrophically.
    const VS_REGEX =
      /([A-Z][A-Za-z0-9.'&\-/]*(?:\s+[A-Z][A-Za-z0-9.'&\-/]*)*)\s+v(?:s)?\.\s+([A-Z][A-Za-z0-9.'&\-/]*(?:\s+[A-Z][A-Za-z0-9.'&\-/]*)*)/g

    const shortName = this.normalizePartyName(citation.partyName)
    let best:
      | {
          caseName: string
          plaintiff: string
          defendant: string
          start: number
          end: number
        }
      | undefined

    let m: RegExpExecArray | null
    VS_REGEX.lastIndex = 0
    while ((m = VS_REGEX.exec(window)) !== null) {
      // Strip leading signal words ("In", "See", "Cf", "But", "Compare")
      // captured as part of the plaintiff. The greedy regex absorbs the
      // preceding capitalized token, so `"In Yellen v. Kassin"` yields
      // plaintiff `"In Yellen"`. `stripSignalWords` handles these cases
      // and preserves `"In re ..."` procedural captions.
      const rawPlaintiff = m[1].trim()
      const plaintiff = this.stripSignalWords(rawPlaintiff)
      const defendant = m[2].trim()
      const plaintiffNorm = this.normalizePartyName(plaintiff)
      const defendantNorm = this.normalizePartyName(defendant)

      // Acceptance: exact equality, OR substring containment in either
      // direction to tolerate abbreviation patterns (`Smith` matches
      // `Smith, Inc.` and vice versa). Mirror the substring rule used
      // in `resolveShortFormCase` party-name disambiguation.
      const hit = (side: string) =>
        side === shortName || side.includes(shortName) || shortName.includes(side)
      if (!hit(plaintiffNorm) && !hit(defendantNorm)) continue

      // Recompute the match start to reflect any signal stripping —
      // if we stripped "In " off the plaintiff, the case-name span
      // should start at "Yellen", not "In". stripSignalWords strips
      // both the signal word and its trailing whitespace, so the
      // length delta is exactly the number of leading chars to skip.
      const stripOffset = rawPlaintiff.length - plaintiff.length
      const matchStart = start + m.index + stripOffset
      best = {
        caseName: `${plaintiff} v. ${defendant}`,
        plaintiff,
        defendant,
        start: matchStart,
        end: start + m.index + m[0].length,
      }
      // Don't break — keep scanning so the closest (last) match wins.
    }

    if (!best) return undefined

    return {
      caseName: best.caseName,
      plaintiff: best.plaintiff,
      defendant: best.defendant,
      // Clean coordinates; consumers should treat these as offsets in
      // the resolver's input `text`. When the cleaner did not transform
      // the source, clean == original.
      span: {
        cleanStart: best.start,
        cleanEnd: best.end,
        originalStart: best.start,
        originalEnd: best.end,
      },
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
    let normalized = name

    normalized = normalized.replace(/\bet\s+al\.?/gi, "")
    normalized = normalized.replace(/\s+(?:d\/b\/a|[fna]\/k\/a)\b.*/gi, "")
    normalized = normalized.replace(/\s+aka\b.*/gi, "")

    let prev = ""
    while (prev !== normalized) {
      prev = normalized
      normalized = normalized.replace(/,?\s*(Inc|LLC|Corp|Ltd|Co|LLP|LP|P\.C)\.?$/gi, "")
    }

    return normalized
      .replace(/^(The|A|An)\s+/i, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
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
