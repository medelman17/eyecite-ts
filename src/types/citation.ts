import type { Span } from "./span"

/**
 * Citation type discriminator for type-safe pattern matching.
 */
export type CitationType = "case" | "statute" | "journal" | "neutral" | "publicLaw" | "federalRegister" | "statutesAtLarge" | "id" | "supra" | "shortFormCase"

/**
 * Warning generated during citation parsing.
 */
export interface Warning {
  /** Severity level */
  level: 'error' | 'warning' | 'info'
  /** Description of the issue */
  message: string
  /** Position of the problematic region */
  position: { start: number; end: number }
  /** Additional context about the warning */
  context?: string
}

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
  page: number
  pincite?: number
  court?: string
  year?: number

  /** Normalized reporter abbreviation from reporters-db (e.g., "F.2d" vs "F. 2d") */
  normalizedReporter?: string

  /** Parallel citations for same case in different reporters */
  parallelCitations?: Array<{
    volume: number | string
    reporter: string
    page: number
  }>

  /** Citation signal (introductory phrase) */
  signal?: 'see' | 'see also' | 'cf' | 'but see' | 'compare'

  /** Parenthetical explanation following the citation */
  parenthetical?: string

  /** Subsequent procedural history (e.g., "aff'd", "rev'd", "cert. denied") */
  subsequentHistory?: string

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
}

/**
 * Statute citation (U.S. Code, state codes, etc.).
 *
 * @example "42 U.S.C. § 1983"
 */
export interface StatuteCitation extends CitationBase {
  type: "statute"
  title?: number
  code: string
  section: string
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
  type: 'journal'
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
  type: 'neutral'
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
  type: 'publicLaw'
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
  type: 'federalRegister'
  /** Federal Register volume */
  volume: number | string
  /** Page number */
  page: number
  /** Publication year (if extracted) */
  year?: number
}

/** Citation to the Statutes at Large (session law compilation) */
export interface StatutesAtLargeCitation extends CitationBase {
  type: 'statutesAtLarge'
  /** Statutes at Large volume */
  volume: number | string
  /** Page number */
  page: number
  /** Publication year (if extracted) */
  year?: number
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
  | IdCitation
  | SupraCitation
  | ShortFormCaseCitation

/**
 * Citation type discriminators grouped by category.
 */
export type FullCitationType = 'case' | 'statute' | 'journal' | 'neutral' | 'publicLaw' | 'federalRegister' | 'statutesAtLarge'
export type ShortFormCitationType = 'id' | 'supra' | 'shortFormCase'

/**
 * Union of all full citation types (not short-form references).
 */
export type FullCitation = FullCaseCitation | StatuteCitation | JournalCitation | NeutralCitation | PublicLawCitation | FederalRegisterCitation | StatutesAtLargeCitation

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
