import type { Span } from "./span"

/**
 * Citation type discriminator for type-safe pattern matching.
 */
export type CitationType =
  | "case"
  | "statute"
  | "journal"
  | "neutral"
  | "publicLaw"
  | "federalRegister"
  | "statutesAtLarge"
  | "constitutional"
  | "id"
  | "supra"
  | "shortFormCase"

/**
 * Warning generated during citation parsing.
 */
export interface Warning {
  /** Severity level */
  level: "error" | "warning" | "info"
  /** Description of the issue */
  message: string
  /** Position of the problematic region */
  position: { start: number; end: number }
  /** Additional context about the warning */
  context?: string
}

/**
 * Introductory signal word classification for citation support level.
 * Based on Bluebook signal categories (Rule 1.2).
 */
export type CitationSignal =
  | "see"
  | "see also"
  | "see generally"
  | "cf"
  | "but see"
  | "but cf"
  | "compare"
  | "accord"
  | "contra"

/**
 * Base fields shared by all citation types.
 */
export interface CitationBase {
  /** Original matched text */
  text: string

  /** Position span in document (originalStart/End point to original text) */
  span: Span

  /**
   * Confidence score indicating match certainty (0-1).
   * - 1.0: Certain match (e.g., exact reporter abbreviation in reporters-db)
   * - 0.8-0.99: High confidence (e.g., common pattern, missing pincite)
   * - 0.5-0.79: Medium confidence (e.g., ambiguous reporter abbreviation)
   * - <0.5: Low confidence (e.g., unusual formatting)
   */
  confidence: number

  /** Exact substring matched from the original text */
  matchedText: string

  /** Time spent processing this citation (milliseconds) */
  processTimeMs: number

  /** Number of regex patterns checked before match */
  patternsChecked: number

  /** Warnings for malformed or ambiguous regions */
  warnings?: Warning[]

  /** Introductory signal word (e.g., "see", "see also", "but see") */
  signal?: CitationSignal

  /** Group ID for string citations sharing the same proposition */
  stringCitationGroupId?: string

  /** Position within the string citation group (0-indexed) */
  stringCitationIndex?: number

  /** Total number of citations in this string citation group */
  stringCitationGroupSize?: number

  /** Text the string citation group supports (future enhancement, not yet populated) */
  propositionText?: string
}

/**
 * Court level and jurisdiction inferred from reporter series.
 * Populated independently of the parenthetical-extracted `court` field.
 */
export interface CourtInference {
  /** Court level classification */
  level: "supreme" | "appellate" | "trial" | "unknown"
  /** Jurisdiction classification */
  jurisdiction: "federal" | "state" | "unknown"
  /** 2-letter state code, only for state-specific reporters */
  state?: string
  /** Confidence score 0.0-1.0 (1.0 for unambiguous, 0.7 for regional multi-state) */
  confidence: number
}

/**
 * Signal-word classification for explanatory parentheticals.
 * Based on the leading gerund/verb form in the parenthetical text.
 */
export type ParentheticalType =
  | "holding"
  | "finding"
  | "stating"
  | "noting"
  | "explaining"
  | "quoting"
  | "citing"
  | "discussing"
  | "describing"
  | "recognizing"
  | "applying"
  | "rejecting"
  | "adopting"
  | "requiring"
  | "other"

/**
 * An extracted explanatory parenthetical from a case citation.
 *
 * @example
 * ```typescript
 * { text: "holding that X requires Y", type: "holding" }
 * { text: "citing Doe v. City for the same proposition", type: "citing" }
 * ```
 */
export interface Parenthetical {
  /** Full text content between the parentheses (excluding parens themselves) */
  text: string
  /** Signal-word classification based on leading gerund */
  type: ParentheticalType
}

/**
 * Normalized subsequent history signal classification.
 * Maps variant spellings (aff'd, affirmed) to canonical forms.
 */
export type HistorySignal =
  | "affirmed"
  | "reversed"
  | "cert_denied"
  | "cert_granted"
  | "overruled"
  | "vacated"
  | "remanded"
  | "modified"
  | "abrogated"
  | "superseded"
  | "disapproved"
  | "questioned"
  | "distinguished"
  | "withdrawn"
  | "reinstated"

/**
 * A single subsequent history entry from a case citation.
 *
 * @example
 * ```typescript
 * { signal: "affirmed", rawSignal: "aff'd", signalSpan: { ... }, order: 0 }
 * ```
 */
export interface SubsequentHistoryEntry {
  /** Normalized signal classification */
  signal: HistorySignal
  /** Raw signal text as it appeared in the document */
  rawSignal: string
  /** Position of the signal text in the document */
  signalSpan: Span
  /** Order in the history chain (0-based) */
  order: number
}

/**
 * Full case citation (volume-reporter-page format).
 *
 * @example "500 F.2d 123"
 * @example "410 U.S. 113, 115"
 */
export interface FullCaseCitation extends CitationBase {
  type: "case"
  volume: number | string
  reporter: string
  /** Page number — optional for blank page placeholder citations (e.g., "___" or "---") */
  page?: number
  pincite?: number
  court?: string
  year?: number

  /** Normalized reporter abbreviation from reporters-db (e.g., "F.2d" vs "F. 2d") */
  normalizedReporter?: string

  /**
   * Group identifier for parallel citations (same case in multiple reporters).
   * Populated by Phase 8 (Parallel Linking).
   * Format: ${volume}-${reporter}-${page} (e.g., "410-U.S.-113")
   * All citations in the same parallel group share the same groupId.
   * @example "410-U.S.-113" for parallel group [410 U.S. 113, 93 S. Ct. 705]
   */
  groupId?: string

  /** Parallel citations for same case in different reporters */
  parallelCitations?: Array<{
    volume: number | string
    reporter: string
    page: number
  }>

  /**
   * Explanatory parentheticals following the citation.
   * Only populated when explanatory content is found (not court/year/disposition).
   * @example [{ text: "holding that X requires Y", type: "holding" }]
   */
  parentheticals?: Parenthetical[]

  /**
   * Subsequent history entries for this citation.
   * Each entry describes a procedural event (affirmed, reversed, etc.).
   * Only populated on the parent (original) citation.
   * @example [{ signal: "affirmed", rawSignal: "aff'd", signalSpan: {...}, order: 0 }]
   */
  subsequentHistoryEntries?: SubsequentHistoryEntry[]

  /**
   * Back-pointer indicating this citation is a subsequent history citation.
   * `index` is the parent's position in the results array returned by
   * `extractCitations()` — it becomes invalid if the array is filtered or reordered.
   * @example { index: 0, signal: "affirmed" }
   */
  subsequentHistoryOf?: { index: number; signal: HistorySignal }

  /**
   * Date information in multiple formats.
   * - iso: ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)
   * - parsed: Structured date components
   */
  date?: {
    iso: string
    parsed?: { year: number; month?: number; day?: number }
  }

  /**
   * Alternative interpretations for ambiguous citations.
   * Used when reporter abbreviation matches multiple reporters or format is unclear.
   */
  possibleInterpretations?: Array<{
    volume: number | string
    reporter: string
    page: number
    confidence: number
    reason: string
  }>

  /**
   * Full span covering citation from case name through closing parenthetical.
   * Populated by Phase 6 (Full Span extraction).
   * @example For "Smith v. Doe, 500 F.2d 123 (2020)", fullSpan covers entire text.
   */
  fullSpan?: Span

  /**
   * Extracted case name (party names around "v.").
   * Populated by Phase 6 (Full Span extraction).
   * @example "Smith v. Doe" or "United States v. Jones"
   */
  caseName?: string

  /**
   * Plaintiff party name (text before "v." or procedural prefix).
   * Populated by Phase 7 (Party Name extraction).
   * @example "Smith" from "Smith v. Doe" or "Jones" from "In re Jones"
   */
  plaintiff?: string

  /**
   * Defendant party name (text after "v.").
   * Populated by Phase 7 (Party Name extraction).
   * @example "Doe" from "Smith v. Doe"
   */
  defendant?: string

  /**
   * Normalized plaintiff name for matching (lowercase, stripped of noise).
   * Populated by Phase 7 (Party Name extraction).
   * @example "smith" from "The Smith Corp., Inc."
   */
  plaintiffNormalized?: string

  /**
   * Normalized defendant name for matching (lowercase, stripped of noise).
   * Populated by Phase 7 (Party Name extraction).
   * @example "doe" from "Doe et al."
   */
  defendantNormalized?: string

  /**
   * Procedural prefix for non-adversarial cases.
   * Populated by Phase 7 (Party Name extraction).
   * @example "In re" from "In re Smith"
   */
  proceduralPrefix?: string

  /**
   * True when page position contains a blank placeholder ("___" or "---").
   * Populated by Phase 5 (Blank Page support).
   * When true, page field will be undefined and confidence reduced to 0.8.
   */
  hasBlankPage?: boolean

  /**
   * Disposition or procedural status from parenthetical.
   * Populated by Phase 6 (Complex Parentheticals).
   * @example "en banc", "per curiam"
   */
  disposition?: string

  /**
   * Court level/jurisdiction inferred from reporter series.
   * Always populated independently of the parenthetical `court` field.
   * Uses a curated static lookup table — does not depend on the reporter DB
   * to preserve tree-shaking of the `eyecite-ts/data` entry point.
   */
  inferredCourt?: CourtInference
}

/**
 * Statute citation (U.S. Code, state codes, etc.).
 *
 * @example "42 U.S.C. § 1983"
 * @example "42 U.S.C. § 1983(a)(1) et seq."
 */
export interface StatuteCitation extends CitationBase {
  type: "statute"
  title?: number
  code: string
  section: string
  /** Subsection/pincite chain, e.g. "(a)(1)(A)" */
  subsection?: string
  /** 2-letter state code or "US" when unambiguously identified */
  jurisdiction?: string
  /**
   * Alias for subsection (eyecite-ts convention).
   * Note: this is string (subsection chain), unlike FullCaseCitation.pincite which is number (page offset).
   * The discriminated union on `type` ensures type safety at call sites.
   */
  pincite?: string
  /** True when "et seq." follows the citation */
  hasEtSeq?: boolean
}

/**
 * Journal citation (law review, legal periodical).
 *
 * Format: [Author,] [Title,] Volume Journal Page [, Pincite] [(Year)]
 *
 * @example "100 Harv. L. Rev. 1234"
 * @example "Jane Doe, Article Title, 75 Yale L.J. 456, 460 (2020)"
 */
export interface JournalCitation extends CitationBase {
  type: "journal"
  /** Author name (if extracted) */
  author?: string
  /** Article title (if extracted) */
  title?: string
  /** Volume number (string for hyphenated volumes like "1984-1") */
  volume?: number | string
  /** Full journal name */
  journal: string
  /** Standard journal abbreviation (e.g., "Harv. L. Rev.") */
  abbreviation: string
  /** Starting page of article */
  page?: number
  /** Specific page reference */
  pincite?: number
  /** Publication year */
  year?: number
}

/**
 * Neutral citation (vendor-neutral format).
 *
 * Format: Year Court DocumentNumber
 *
 * @example "2020 WL 123456" (Westlaw)
 * @example "2020 U.S. LEXIS 456" (Lexis)
 */
export interface NeutralCitation extends CitationBase {
  type: "neutral"
  /** Year of decision */
  year: number
  /** Court identifier (e.g., "WL", "U.S. LEXIS") */
  court: string
  /** Document number */
  documentNumber: string
}

/**
 * Public law citation (federal legislation).
 *
 * Format: Pub. L. No. Congress-LawNumber
 *
 * @example "Pub. L. No. 116-283"
 * @example "Pub. L. 117-58 (Infrastructure Investment and Jobs Act)"
 */
export interface PublicLawCitation extends CitationBase {
  type: "publicLaw"
  /** Congress number (e.g., 116) */
  congress: number
  /** Law number within that Congress */
  lawNumber: number
  /** Optional bill title extracted from nearby text */
  title?: string
}

/**
 * Federal Register citation.
 *
 * Format: Volume Fed. Reg. Page
 *
 * @example "85 Fed. Reg. 12345"
 * @example "86 Fed. Reg. 56789 (Jan. 15, 2021)"
 */
export interface FederalRegisterCitation extends CitationBase {
  type: "federalRegister"
  /** Federal Register volume */
  volume: number | string
  /** Page number */
  page: number
  /** Publication year (if extracted) */
  year?: number
}

/** Citation to the Statutes at Large (session law compilation) */
export interface StatutesAtLargeCitation extends CitationBase {
  type: "statutesAtLarge"
  /** Statutes at Large volume */
  volume: number | string
  /** Page number */
  page: number
  /** Publication year (if extracted) */
  year?: number
}

/**
 * Constitutional citation (U.S. or state constitution).
 *
 * @example "U.S. Const. art. III, § 2"
 * @example "U.S. Const. amend. XIV, § 1"
 * @example "Cal. Const. art. I, § 7"
 */
export interface ConstitutionalCitation extends CitationBase {
  type: "constitutional"
  /** Jurisdiction code: "US", 2-letter state code, or undefined for bare "Const." */
  jurisdiction?: string
  /** Article number (parsed from Roman numerals) — mutually exclusive with amendment */
  article?: number
  /** Amendment number (parsed from Roman numerals) — mutually exclusive with article */
  amendment?: number
  /** Section identifier (string to handle non-numeric like "3-a") */
  section?: string
  /** Clause number (always numeric) */
  clause?: number
}

/**
 * Id. citation (refers to immediately preceding citation).
 *
 * @example "Id."
 * @example "Id. at 125"
 */
export interface IdCitation extends CitationBase {
  type: "id"
  pincite?: number
}

/**
 * Supra citation (refers to earlier citation by party name).
 *
 * @example "Smith, supra"
 * @example "Smith, supra, at 460"
 */
export interface SupraCitation extends CitationBase {
  type: "supra"
  /** Party name extracted from citation text */
  partyName: string
  /** Specific page reference */
  pincite?: number
}

/**
 * Short-form case citation (abbreviated reference to earlier full citation).
 * Distinguished from full case by lack of case name.
 *
 * @example "500 F.2d at 125" (refers to earlier full citation at different page)
 */
export interface ShortFormCaseCitation extends CitationBase {
  type: "shortFormCase"
  volume: number | string
  reporter: string
  page?: number
  pincite?: number
}

/**
 * Union type of all citation types.
 *
 * Use type guards via discriminated union:
 * @example
 * if (citation.type === "case") {
 *   console.log(citation.volume) // TypeScript knows this exists
 * }
 * @example
 * switch (citation.type) {
 *   case "journal":
 *     return citation.abbreviation // Type-safe access
 *   case "neutral":
 *     return citation.court
 *   // ...
 * }
 */
export type Citation =
  | FullCaseCitation
  | StatuteCitation
  | JournalCitation
  | NeutralCitation
  | PublicLawCitation
  | FederalRegisterCitation
  | StatutesAtLargeCitation
  | ConstitutionalCitation
  | IdCitation
  | SupraCitation
  | ShortFormCaseCitation

/**
 * Citation type discriminators grouped by category.
 */
export type FullCitationType =
  | "case"
  | "statute"
  | "journal"
  | "neutral"
  | "publicLaw"
  | "federalRegister"
  | "statutesAtLarge"
  | "constitutional"
export type ShortFormCitationType = "id" | "supra" | "shortFormCase"

/**
 * Union of all full citation types (not short-form references).
 */
export type FullCitation =
  | FullCaseCitation
  | StatuteCitation
  | JournalCitation
  | NeutralCitation
  | PublicLawCitation
  | FederalRegisterCitation
  | StatutesAtLargeCitation
  | ConstitutionalCitation

/**
 * Union of all short-form citation types (Id., supra, short-form case).
 */
export type ShortFormCitation = IdCitation | SupraCitation | ShortFormCaseCitation

/**
 * Extract the Citation subtype for a given type discriminator.
 *
 * @example
 * ```typescript
 * type CaseCit = CitationOfType<'case'>  // FullCaseCitation
 * type IdCit = CitationOfType<'id'>      // IdCitation
 * ```
 */
export type CitationOfType<T extends CitationType> = Extract<Citation, { type: T }>

/**
 * Maps each full citation type to its concrete Citation subtype.
 * Useful for generic code building custom extraction pipelines.
 */
export type ExtractorMap = {
  [K in FullCitationType]: CitationOfType<K>
}
