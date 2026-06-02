import type {
  AnnotationComponentSpans,
  CaseComponentSpans,
  ConstitutionalComponentSpans,
  FederalRegisterComponentSpans,
  FederalRuleComponentSpans,
  JournalComponentSpans,
  NeutralComponentSpans,
  PublicLawComponentSpans,
  RestatementComponentSpans,
  StatuteComponentSpans,
  StatutesAtLargeComponentSpans,
  TreatiseComponentSpans,
} from "./componentSpans"
import type { Span } from "./span"

/**
 * Citation type discriminator for type-safe pattern matching.
 */
export type CitationType =
  | "case"
  | "docket"
  | "statute"
  | "regulation"
  | "stateRule"
  | "journal"
  | "neutral"
  | "publicLaw"
  | "federalRegister"
  | "statutesAtLarge"
  | "sessionLaw"
  | "treaty"
  | "legislativeMaterial"
  | "localOrdinance"
  | "canon"
  | "constitutional"
  | "federalRule"
  | "restatement"
  | "treatise"
  | "annotation"
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
 * Based on Bluebook signal categories (Rule 1.2). The `, e.g.` combined
 * forms (Rule 1.3) carry distinct meaning ("one of many illustrative
 * authorities") and are tracked separately from the bare signals.
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
  | "e.g."
  | "see, e.g."
  | "see also, e.g."
  | "but see, e.g."
  | "cf., e.g."
  | "but cf., e.g."

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

  /** Whether this citation appears in a footnote (only populated when detectFootnotes enabled) */
  inFootnote?: boolean

  /** Footnote number, if applicable (only populated when detectFootnotes enabled) */
  footnoteNumber?: number
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
  /** Position of full parenthetical block including delimiters */
  span?: Span
}

/**
 * Normalized subsequent history signal classification.
 * Maps variant spellings (aff'd, affirmed) to canonical forms.
 *
 * Texas Greenbook writ/petition history forms (placed inside the court-and-year
 * parenthetical, per Tex. R. App. P. 47.7) are tracked with their own categories
 * so downstream consumers can distinguish them from federal-style subsequent
 * history. See #229.
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
  // Federal rehearing history (Bluebook 10.7; #246). `modified_on_denial_of_rehearing`
  // below is a CA-specific compound disposition, distinct from these standalone signals.
  | "rehearing_denied"
  | "rehearing_granted"
  // Texas writ-of-error history (pre-Sept. 1, 1997 — older opinions still cite)
  | "writ_refused"
  | "writ_dismissed"
  | "writ_denied"
  | "writ_granted"
  | "no_writ"
  // Texas petition history (post-Sept. 1, 1997)
  | "pet_refused"
  | "pet_denied"
  | "pet_dismissed"
  | "pet_granted"
  | "pet_filed"
  | "no_pet"
  // California Supreme Court review history + CA-specific signals (#238)
  | "review_denied"
  | "review_granted"
  | "opinion_vacated"
  | "disapproved_other_grounds"
  // CA Tier 1 research additions (2026-05-11)
  | "not_published"
  | "petition_for_review_filed"
  | "petition_for_review_granted"
  | "petition_for_review_denied"
  | "superseded_by_grant_of_review"
  | "modified_on_denial_of_rehearing"

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
  /** Structured pincite information (page, range, footnote) */
  pinciteInfo?: import("../extract/pincite").PinciteInfo
  court?: string
  /**
   * True for citations whose source carried an unpublished-disposition marker.
   * Set by NY Slip Op `(U)` / `[U]` suffix detection (#231). Absent or `false`
   * for published decisions.
   */
  unpublished?: boolean
  /** Normalized court string: spaces collapsed, trailing period ensured */
  normalizedCourt?: string
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
   * Subsequent history entries attached to this citation.
   *
   * Populated on every chain link that received a history clause from the
   * scanner — not just the chain's root (#619, post-#527 contract change).
   * For `Smith, aff'd, X, cert. denied, Y`, both `Smith` (carrying
   * `[affirmed]` linking to `X`) and `X` (carrying `[cert_denied]`
   * linking to `Y`) populate this field. Walk `subsequentHistoryOf`
   * back-pointers from child→parent to traverse the chain in reverse.
   *
   * Each entry describes a procedural event (affirmed, reversed, etc.).
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
   * Nominative (historical) reporter volume for early SCOTUS citations.
   * Present only when citation includes a nominative parenthetical, e.g.,
   * `67 U.S. (2 Black) 635` → nominativeVolume: 2
   */
  nominativeVolume?: number

  /**
   * Nominative (historical) reporter abbreviation for early SCOTUS citations.
   * Present only when citation includes a nominative parenthetical, e.g.,
   * `67 U.S. (2 Black) 635` → nominativeReporter: "Black"
   */
  nominativeReporter?: string

  /**
   * True when page position contains a blank placeholder ("___" or "---").
   * Populated by Phase 5 (Blank Page support).
   * When true, page field will be undefined and confidence reduced to 0.8.
   */
  hasBlankPage?: boolean

  /**
   * Disposition or procedural status from parenthetical.
   * Populated by Phase 6 (Complex Parentheticals).
   * @example "en banc", "per curiam", "dissent", "concurrence", "mixed", "plurality opinion", "mem."
   */
  disposition?: string

  /**
   * Surname(s) of justice(s) attributed to the parenthetical disposition.
   * Populated for justice-attribution parens (#235) like
   * `(Brennan, J., dissenting)` → `["Brennan"]` or
   * `(Brennan and Marshall, JJ., dissenting)` → `["Brennan", "Marshall"]`.
   */
  justices?: string[]

  /**
   * Scope qualifier from a justice-attribution parenthetical (#235).
   * `in_judgment` — "concurring in the judgment"
   * `in_part`     — "concurring in part" / "concurring in part and dissenting in part"
   * `from_denial` — "dissenting from denial of <X>"
   */
  scope?: string

  /**
   * Administrative parenthetical from a bankruptcy adversary caption (#241).
   * In `Spence v. Hintze (In re Hintze), 570 B.R. 369`, the `(In re Hintze)`
   * names the underlying debtor and is part of the case name (preserved on
   * `caseName`). This field exposes the debtor identification separately so
   * `defendant` / `defendantNormalized` can hold just the adversary defendant.
   * Content is the parenthetical text without the surrounding parens — e.g.,
   * `"In re Hintze"`.
   */
  adminParenthetical?: string

  /**
   * Court level/jurisdiction inferred from reporter series.
   * Always populated independently of the parenthetical `court` field.
   * Uses a curated static lookup table — does not depend on the reporter DB
   * to preserve tree-shaking of the `eyecite-ts/data` entry point.
   */
  inferredCourt?: CourtInference

  /** Precise text positions for each parsed component of this citation. */
  spans?: CaseComponentSpans
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
  /**
   * Code identifier (`U.S.C.`, `NMSA 1978`, `Penal`, `Va. Code`, etc.).
   * Optional because bare-section citations with no nearby jurisdictional
   * signal drop both `code` and `jurisdiction` rather than guessing.
   * (#565, originally #531)
   */
  code?: string
  /**
   * Section identifier. Optional because some forms cite the chapter alone
   * (e.g. Massachusetts `G.L. c. 93A` — see `chapter` below). #569
   */
  section?: string
  /**
   * Structured representation of a `§§ N-M` range. Populated only for
   * citations where the section field is unambiguously a numeric range
   * (typically federal `28 U.S.C. §§ 591-99`). Hyphenated state-style
   * sections (`19.2-81`, `32A-2-7`) are NOT ranges and leave this
   * undefined. `start` is mirrored on the `section` field for backward
   * compatibility. (#564)
   */
  sectionRange?: { start: string; end: string }
  /**
   * Chapter identifier for citations that use a chapter+section layout,
   * notably Massachusetts (`G.L. c. 93A`, `M.G.L.A. c. 93, § 14`).
   * Previously the chapter number was leaking into `code`; populated
   * separately as of #569.
   */
  chapter?: string
  /** Subsection/pincite chain, e.g. "(a)(1)(A)" */
  subsection?: string
  /**
   * Structured representation of a subsection range like `(a)-(b)` /
   * `(9)—(16)`. Populated only when the cited subsection chain ends with
   * a hyphen/en-dash/em-dash followed by another paren group. `start` is
   * mirrored on the `subsection` field for backward compatibility, so
   * existing consumers reading `subsection` still see the first endpoint.
   * (#591)
   */
  subsectionRange?: { start: string; end: string }
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
  /**
   * Year of the code edition cited, captured from a trailing parenthetical
   * (`HRS § 91-14(a) (1985)`, `42 U.S.C. § 1983 (1976)`,
   * `28 U.S.C. § 1331 (West 2018)`). #285
   */
  year?: number
  /**
   * Publisher of an annotated code edition (`West`, `Lexis`), captured from
   * `(Publisher YYYY)` parentheticals alongside `year`. #285
   */
  publisher?: string
  /**
   * Recompilation year for codes that were re-issued without renumbering
   * (`Code of Alabama 1940, as Recompiled 1958`). Distinct from `year`
   * (the original edition year, e.g. 1940). #343
   */
  recompiledYear?: number
  /**
   * Edition-volume label for codes that distinguish replacement and
   * supplement volumes from the main code edition (`(Repl. 1996)`,
   * `(1969 Supp.)`, `(Cum. Supp. 1985)`). The `year` field carries the
   * year; `editionLabel` carries the normalized label
   * (`"Repl."` / `"Supp."` / `"Cum. Supp."`). Common in Arkansas,
   * Mississippi, Tennessee, and other state codes. #349
   */
  editionLabel?: string

  /** Precise text positions for each parsed component of this citation. */
  spans?: StatuteComponentSpans
}

/**
 * Regulation citation (Code of Federal Regulations and state regulatory
 * codes that share the same shape: title + code + section + subsection).
 *
 * Distinct from `StatuteCitation` because regulations are issued by
 * executive agencies under delegated authority, not enacted by a
 * legislature. Downstream consumers filtering by citation kind (e.g.
 * "show me only statutes" vs "show me only regs") need this type
 * discriminator to avoid post-hoc string matching on `code`. #637
 *
 * Shape is otherwise identical to `StatuteCitation`.
 *
 * @example "42 C.F.R. § 100.3"
 * @example "19 C.F.R. § 351.412(e)"
 */
export interface RegulationCitation extends CitationBase {
  type: "regulation"
  /** Title number (e.g. 42 for `42 C.F.R.`). */
  title?: number
  /** Code identifier (`C.F.R.`, etc.). */
  code?: string
  /** Section identifier. */
  section?: string
  /** Structured `§§ N-M` section range (mirrors StatuteCitation). */
  sectionRange?: { start: string; end: string }
  /** Chapter for chapter+section regulatory codes (rare). */
  chapter?: string
  /** Subsection/pincite chain, e.g. "(c)(2)" */
  subsection?: string
  /** Structured subsection range (`(a)-(b)`, `(9)—(16)`). */
  subsectionRange?: { start: string; end: string }
  /** 2-letter state code or "US" when unambiguously identified */
  jurisdiction?: string
  /** Alias for subsection. */
  pincite?: string
  /** True when "et seq." follows the citation */
  hasEtSeq?: boolean
  /** Year of the regulatory edition cited from trailing parenthetical. */
  year?: number
  /** Publisher of an annotated edition. */
  publisher?: string
  /** Recompilation year for codes that were re-issued. */
  recompiledYear?: number
  /** Edition-volume label (`Repl.`, `Supp.`, `Cum. Supp.`). */
  editionLabel?: string
  /** Precise text positions for each parsed component. */
  spans?: StatuteComponentSpans
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

  /** Precise text positions for each parsed component of this citation. */
  spans?: JournalComponentSpans
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
  /**
   * Court identifier extracted from a real jurisdictional neutral cite
   * (`Ohio`, `IL`, `NM`) or recovered from a trailing `(court date)`
   * parenthetical on a database cite (`N.D. Cal.`, `Tex. App.`). Database
   * identifiers (`WL`, `LEXIS`) live in `database`, NOT here. #294
   */
  court?: string
  /**
   * Database identifier for vendor-database cites that have no inherent
   * court value: `WL` (Westlaw), `LEXIS` / `U.S. LEXIS` / `Fed. App. LEXIS`,
   * `BL` (Bloomberg Law). Set instead of `court` for these forms. #294
   */
  database?: string
  /** Document number */
  documentNumber: string
  /**
   * True when the citation has an Illinois Rule 23 `-U` suffix (or analogous
   * unpublished marker). The suffix is consumed and stripped from
   * `documentNumber`. Absent or `false` for published decisions. (#230)
   */
  unpublished?: boolean
  /** Pincite page (numeric portion, without "*" for star-pagination). */
  pincite?: number
  /** Structured pincite information (page, range, footnote, star-pagination). */
  pinciteInfo?: import("../extract/pincite").PinciteInfo
  /**
   * Decision date recovered from a trailing `(court date)` parenthetical on
   * a database cite, e.g. `2014 WL 1924465 (Tex. App. May 8, 2014)`. #294
   */
  date?: import("../extract/dates").StructuredDate

  /** Case name captured from backward search (#441).
   *  Canonical form: `<caseName>, YYYY ST NNN`. */
  caseName?: string

  /** Precise text positions for each parsed component of this citation. */
  spans?: NeutralComponentSpans
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

  /** Precise text positions for each parsed component of this citation. */
  spans?: PublicLawComponentSpans
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

  /** Precise text positions for each parsed component of this citation. */
  spans?: FederalRegisterComponentSpans
}

/** Citation to the Statutes at Large (session law compilation) */
export interface StatutesAtLargeCitation extends CitationBase {
  type: "statutesAtLarge"
  /** Statutes at Large volume */
  volume: number | string
  /** Page number */
  page: number
  /**
   * Specific pincite page, captured from a trailing `, NNN` suffix
   * (e.g. `100 Stat. 3743, 3755` → page=3743, pincite=3755). The first
   * page is the section's starting page; the pincite is the cited point
   * within the section. Range pincites (`3755-58`) populate `pinciteEndPage`
   * and `pinciteIsRange`. (#639)
   */
  pincite?: number
  /** End page for range pincites (`3755-58` → 3758). (#639) */
  pinciteEndPage?: number
  /** True when the pincite is a range (`3755-58`). (#639) */
  pinciteIsRange?: boolean
  /** Publication year (if extracted) */
  year?: number

  /** Precise text positions for each parsed component of this citation. */
  spans?: StatutesAtLargeComponentSpans
}

/**
 * Session-law citation (#350, #779).
 *
 * State session laws — chronological compilations cited by year + chapter:
 * California Statutes (`Stats. 1992, ch. 726, § 2, p. 3523`) and Nevada session
 * laws (`2003 Nev. Stat., ch. 427, §§ 25-26, at 2590-95`). The federal analogue
 * is `statutesAtLarge`; this jurisdiction-general type covers the state forms.
 */
export interface SessionLawCitation extends CitationBase {
  type: "sessionLaw"
  /** Two-letter jurisdiction code (e.g. "CA", "NV") */
  jurisdiction: string
  /** Session-law compilation label (e.g. "Stats." for CA, "Nev. Stat." for NV) */
  code: string
  /** Session year */
  year: number
  /** Chapter / bill number within that session */
  chapter: string
  /** Single cited section, or the first of a list/range */
  section?: string
  /** Multiple cited sections (`§§ 6, 7, 8` → `["6","7","8"]`) */
  sections?: string[]
  /** Section range (`§§ 25-26` → `{ start: "25", end: "26" }`) */
  sectionRange?: { start: string; end: string }
  /** Single cited page, or the first of a range */
  page?: string
  /** Page range (`pp. 3038-3039`, `at 2590-95`) */
  pageRange?: { start: string; end: string }
}

/**
 * Treaty citation (#309).
 *
 * Treaty-series citations: "No."-style series (`T.I.A.S. No. 1502`, spacing-
 * tolerant) and volume-series-page forms (`1155 U.N.T.S. 331`, `123 U.S.T. 456`).
 * Named-treaty metadata (`treatyName` / `article` / `paragraph`) is reserved for
 * a follow-up and not yet populated.
 */
export interface TreatyCitation extends CitationBase {
  type: "treaty"
  /** Treaty series identifier (e.g. "T.I.A.S.", "U.N.T.S.", "U.S.T.") */
  series?: string
  /** Series number for "No."-style series (e.g. `T.I.A.S. No. 1502` → "1502") */
  seriesNumber?: string
  /** Volume for volume-series-page forms (e.g. `1155 U.N.T.S. 331` → 1155) */
  volume?: number
  /** Page for volume-series-page forms */
  page?: number
  /** Named treaty title (reserved; not yet populated) */
  treatyName?: string
  /** Cited article (reserved) */
  article?: string
  /** Cited paragraph (reserved) */
  paragraph?: string
  /** Publication year (reserved) */
  year?: number
}

/**
 * Legislative-material citation (#308).
 *
 * House/Senate committee reports (`H.R. Rep. No. 94-1487, p. 16 (1976)`) and the
 * Congressional Record (`112 Cong. Rec. 1234`), unified via the `kind`
 * discriminator. The "U.S. Code Cong. & Admin. News" form is reserved for a
 * follow-up.
 */
export interface LegislativeMaterialCitation extends CitationBase {
  type: "legislativeMaterial"
  /** Distinguishes a committee/conference report from a Congressional Record cite */
  kind: "report" | "congressionalRecord"
  /** Chamber for reports */
  chamber?: "House" | "Senate"
  /** Report number, e.g. "94-1487" or "595" */
  reportNumber?: string
  /** Congress number when stated, e.g. 95 */
  congress?: number
  /** Session ordinal when stated, e.g. "1st", "2d" */
  session?: string
  /** Volume for Congressional Record cites */
  volume?: number
  /** Page (report page or Congressional Record page) */
  page?: number
  /** Year, from a trailing `(YYYY)` parenthetical */
  year?: number
}

/**
 * Local / municipal ordinance citation (#778).
 *
 * Clark County Code/Ordinance (`CCCO § 2.12.010(1)`) is the first member of this
 * jurisdiction-general type (designed to also fit Cook County, L.A. County, and
 * Miami-Dade municipal codes).
 */
export interface LocalOrdinanceCitation extends CitationBase {
  type: "localOrdinance"
  /** Ordinance code abbreviation (e.g. "CCCO" — Clark County Code/Ordinance) */
  code: string
  /** Locality the code belongs to (e.g. "Clark County, NV") */
  locality?: string
  /** Cited section (e.g. "2.12.010(1)") */
  section: string
}

/**
 * Judicial-conduct canon citation (#310).
 *
 * Code of Judicial Conduct canons: `Canon 7(B)(1)`, `Canon 2(A) of the Code of
 * Judicial Conduct`. Distinct from attorney disciplinary/model rules (#295) —
 * this is judicial conduct.
 */
export interface CanonCitation extends CitationBase {
  type: "canon"
  /** Canon number, e.g. "7", "2" */
  canon: string
  /** Subsection chain, e.g. "(B)(1)", "(A)" */
  subsection?: string
  /** Rule set when stated explicitly, e.g. "Code of Judicial Conduct" */
  ruleSet?: string
}

/**
 * Federal Rules of Procedure citation (#576).
 *
 * Covers the four primary federal rule sets (civil, criminal, evidence,
 * appellate) plus bankruptcy. Both the abbreviated Bluebook form
 * (`Fed. R. Civ. P. 56`) and the spelled-out form
 * (`Federal Rule of Civil Procedure 56`) parse to the same shape.
 *
 * @example "Fed. R. Civ. P. 56" → { ruleSet: "civil", rule: "56" }
 * @example "Fed. R. Crim. P. 12(b)" → { ruleSet: "criminal", rule: "12", subsection: "(b)" }
 * @example "Fed. R. Evid. 401" → { ruleSet: "evidence", rule: "401" }
 * @example "Fed. R. App. P. 4(a)" → { ruleSet: "appellate", rule: "4", subsection: "(a)" }
 * @example "Fed. R. Bankr. P. 7001" → { ruleSet: "bankruptcy", rule: "7001" }
 */
export interface FederalRuleCitation extends CitationBase {
  type: "federalRule"
  /** Which rule set the citation refers to */
  ruleSet: "civil" | "criminal" | "evidence" | "appellate" | "bankruptcy"
  /** Rule number (string to preserve leading zeros / non-numeric suffixes) */
  rule: string
  /** Subsection chain (e.g., "(b)(6)") — undefined when not cited */
  subsection?: string

  /** Precise text positions for each parsed component of this citation. */
  spans?: FederalRuleComponentSpans
}

/**
 * State court rule citation (#636).
 *
 * Mirrors `FederalRuleCitation` for state-court rules of procedure. Each
 * supported state has a closed set of distinctive abbreviations (Idaho
 * `I.R.C.P.`, North Carolina `N.C. R. App. P.`, South Carolina `SCACR`,
 * Court of Federal Claims `RCFC`, etc.) — bare `Rule N` without a
 * jurisdiction anchor is intentionally not matched.
 *
 * `jurisdiction` is a 2-letter state code (`ID`, `NC`, `SC`) or `CFC`
 * for the Court of Federal Claims.
 *
 * @example "I.R.C.P. 60(b)(6)" → { jurisdiction: "ID", ruleSet: "civil", rule: "60", subsection: "(b)(6)" }
 * @example "N.C. R. App. P. 10(b)(1)" → { jurisdiction: "NC", ruleSet: "appellate", rule: "10", subsection: "(b)(1)" }
 * @example "Rule 268(d)(2), SCACR" → { jurisdiction: "SC", ruleSet: "appellate", rule: "268", subsection: "(d)(2)" }
 * @example "RCFC 56(c)" → { jurisdiction: "CFC", ruleSet: "civil", rule: "56", subsection: "(c)" }
 */
export interface StateRuleCitation extends CitationBase {
  type: "stateRule"
  /** 2-letter state code or `CFC` for Court of Federal Claims. */
  jurisdiction: string
  /** Rule set classification. */
  ruleSet: "civil" | "criminal" | "evidence" | "appellate" | "bankruptcy" | "other"
  /** Rule number. */
  rule: string
  /** Subsection chain (e.g., "(b)(6)"). */
  subsection?: string
  /** Precise text positions for each parsed component. */
  spans?: FederalRuleComponentSpans
}

/**
 * Restatement citation (#578).
 *
 * Restatements of the Law are secondary legal authority published by the
 * American Law Institute. Citations follow the Bluebook form `Restatement
 * (Edition) of Subject § Section`.
 *
 * @example "Restatement (Second) of Torts § 402A"
 *   → { edition: "Second", subject: "Torts", section: "402A" }
 * @example "Restatement (Third) of the Law Governing Lawyers § 1"
 *   → { edition: "Third", subject: "the Law Governing Lawyers", section: "1" }
 */
export interface RestatementCitation extends CitationBase {
  type: "restatement"
  /** Restatement edition (First, Second, Third, Fourth) */
  edition: "First" | "Second" | "Third" | "Fourth"
  /** Subject matter (e.g., "Torts", "Contracts", "the Law Governing Lawyers") */
  subject: string
  /** Section number (string to preserve letter suffixes like "402A") */
  section: string
  /** Subsection chain (e.g., "(1)(b)") — undefined when not cited */
  subsection?: string

  /** Precise text positions for each parsed component of this citation. */
  spans?: RestatementComponentSpans
}

/**
 * Legal treatise citation (#579).
 *
 * Treatises are multi-volume secondary authorities (Wright & Miller,
 * Williston, Moore's, Nimmer, Corbin, Witkin, etc.). Citations are
 * heterogeneous, but the common pattern is `Volume Author/Title § Section`.
 *
 * @example "5 Wright & Miller, Federal Practice and Procedure § 1290"
 *   → { volume: 5, title: "Wright & Miller, Federal Practice and Procedure", section: "1290" }
 * @example "1 Nimmer on Copyright § 5.05[A]"
 *   → { volume: 1, title: "Nimmer on Copyright", section: "5.05[A]" }
 */
export interface TreatiseCitation extends CitationBase {
  type: "treatise"
  /** Volume number (string for hyphenated volumes) */
  volume: number | string
  /** Title/author body as it appears in the citation */
  title: string
  /** Section number / locator (string to preserve dots and bracketed suffixes) */
  section: string
  /** Edition + year, when present in trailing parenthetical (e.g., "5th ed. 2008") */
  edition?: string
  /** Publication year (if extracted from parenthetical) */
  year?: number

  /** Precise text positions for each parsed component of this citation. */
  spans?: TreatiseComponentSpans
}

/**
 * Annotation citation (#581).
 *
 * The American Law Reports (A.L.R.) series publishes annotations on
 * narrow legal issues — these look like case citations
 * (`100 A.L.R.2d 1234`) but are secondary authority, not case law.
 *
 * @example "100 A.L.R.2d 1234" → { series: "A.L.R.2d", volume: 100, page: 1234 }
 * @example "23 A.L.R. Fed. 3d 456" → { series: "A.L.R. Fed. 3d", volume: 23, page: 456 }
 */
export interface AnnotationCitation extends CitationBase {
  type: "annotation"
  /** A.L.R. series identifier (`A.L.R.`, `A.L.R.2d`, `A.L.R. Fed.`, etc.) */
  series: string
  /** Volume number */
  volume: number
  /** Page number where the annotation begins */
  page: number
  /** Publication year (if extracted from parenthetical) */
  year?: number

  /** Precise text positions for each parsed component of this citation. */
  spans?: AnnotationComponentSpans
}

/**
 * Docket-number-only case citation (no traditional reporter assignment).
 *
 * Used for very recent decisions identified by docket/slip number, common for:
 * - NY Court of Appeals slip opinions: `IKB Int'l v. Wells Fargo, No. 51 (N.Y. 2023)`
 * - Federal district court decisions before reporter assignment: `Smith v. Jones, No. 12-3456 (S.D.N.Y. 2024)`
 * - Some unreported state-court orders
 *
 * Disambiguation: a bare `No. 51 (N.Y. 2023)` is too generic to extract on its
 * own — extraction only emits a DocketCitation when a preceding case-name
 * anchor (e.g. `Party v. Party,`) is present.
 *
 * @example "IKB Int'l, S.A. v. Wells Fargo Bank, N.A., No. 51 (N.Y. 2023)"
 */
export interface DocketCitation extends CitationBase {
  type: "docket"
  /** Docket / slip-opinion number (string to preserve hyphens, e.g. "12-3456") */
  docketNumber: string
  /** Court abbreviation extracted from the parenthetical (e.g. "N.Y.", "S.D.N.Y.") */
  court?: string
  /** Normalized court string: spaces collapsed, trailing period ensured */
  normalizedCourt?: string
  /** Year of decision */
  year?: number
  /** Date information when the parenthetical includes month/day */
  date?: {
    iso: string
    parsed?: { year: number; month?: number; day?: number }
  }
  /** Extracted case name (party names around "v.") */
  caseName?: string
  /** Plaintiff party name */
  plaintiff?: string
  /** Defendant party name */
  defendant?: string
  /** Normalized plaintiff name for matching (lowercase, stripped of noise) */
  plaintiffNormalized?: string
  /** Normalized defendant name for matching (lowercase, stripped of noise) */
  defendantNormalized?: string
  /** Procedural prefix for non-adversarial cases (e.g. "In re") */
  proceduralPrefix?: string
  /**
   * Full span covering citation from case name through closing parenthetical.
   * @example For "Smith v. Jones, No. 51 (N.Y. 2023)", fullSpan covers the entire text.
   */
  fullSpan?: Span
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
  /** Article number (parsed from Roman numerals) — mutually exclusive with amendment / preamble */
  article?: number
  /** Amendment number (parsed from Roman numerals) — mutually exclusive with article / preamble */
  amendment?: number
  /** True when the citation references the Preamble (`U.S. Const. pmbl.`,
   *  `U.S. Const. preamble`). Mutually exclusive with article / amendment.
   *  Section and clause are not applicable to preamble. #321 */
  preamble?: boolean
  /** Section identifier (string to handle non-numeric like "3-a") */
  section?: string
  /** Clause number (always numeric) */
  clause?: number

  /**
   * Post-reform ("now …") location for historical-reform citations such as
   * `former art. XX, § 21 (now art. XIV, § 4)` (#789). The citation's primary
   * fields hold the *former* location (what the opinion cites); this holds the
   * *current* location parsed from the `(now …)` parenthetical. Undefined for
   * ordinary constitutional citations.
   */
  currentLocation?: {
    article?: number
    amendment?: number
    section?: string
    clause?: number
  }

  /** Precise text positions for each parsed component of this citation. */
  spans?: ConstitutionalComponentSpans
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
  /** Structured pincite information (page, range, footnote, star-pagination). */
  pinciteInfo?: import("../extract/pincite").PinciteInfo
  /**
   * True if `pincite` was inherited from a preceding same-authority citation
   * per Bluebook Rule 4.1 / Indigo Book R6.2.2. Undefined when `pincite` was
   * extracted directly from this citation's text or when no pincite was set.
   */
  pinciteInherited?: boolean
  /**
   * Array index of the citation from which `pincite` was inherited.
   * Indexes into the same array this citation appears in — i.e., the
   * output of `extractCitations(...).citations` (or
   * `DocumentResolver.resolve()`'s output, which preserves input order).
   * Set only when `pinciteInherited` is true. Records the immediate
   * predecessor; follow transitively for the chain's originator.
   */
  pinciteInheritedFrom?: number
  /**
   * Trailing parenthetical content (text between the parens, excluding the
   * parens themselves) captured from `Id. at N (...)` forms. Common values
   * include drop-citation markers (`citation omitted`, `internal quotation
   * marks omitted`), short-form case identifiers (`Marsh`, `Serrano III`),
   * and explanatory holdings (`holding that ...`). Unclassified — consumers
   * can post-classify if needed. #303
   */
  parenthetical?: string
  /**
   * Case name inherited from the antecedent (full citation that the `Id.`
   * resolves to). Populated by the resolver when `resolve: true` and the
   * antecedent is a `case`-type citation. Undefined otherwise. Consumers
   * who don't enable resolution should walk `resolution.resolvedTo` to
   * find the antecedent.
   */
  caseName?: string
  /** Inherited plaintiff name from antecedent (resolver-populated). */
  plaintiff?: string
  /** Inherited defendant name from antecedent (resolver-populated). */
  defendant?: string
  /** Inherited normalized plaintiff name from antecedent. */
  plaintiffNormalized?: string
  /** Inherited normalized defendant name from antecedent. */
  defendantNormalized?: string
  /** Inherited procedural prefix (`In re`, `Estate of`, etc.) from antecedent. */
  proceduralPrefix?: string
  /** Component-level spans (currently just `pincite`; extend when needed). */
  spans?: import("./componentSpans").IdComponentSpans
}

/**
 * Supra citation (refers to earlier citation by party name).
 *
 * @example "Smith, supra"
 * @example "Smith, supra, at 460"
 */
export interface SupraCitation extends CitationBase {
  type: "supra"
  /** Party name extracted from citation text (undefined for standalone supra references) */
  partyName?: string
  /** Specific page reference */
  pincite?: number
  /** Structured pincite information (page, range, footnote, star-pagination). */
  pinciteInfo?: import("../extract/pincite").PinciteInfo
  /**
   * True if `pincite` was inherited from a preceding same-authority citation
   * per Bluebook Rule 4.1 / Indigo Book R6.2.2. Undefined when `pincite` was
   * extracted directly from this citation's text or when no pincite was set.
   */
  pinciteInherited?: boolean
  /**
   * Array index of the citation from which `pincite` was inherited.
   * Indexes into the same array this citation appears in — i.e., the
   * output of `extractCitations(...).citations` (or
   * `DocumentResolver.resolve()`'s output, which preserves input order).
   * Set only when `pinciteInherited` is true. Records the immediate
   * predecessor; follow transitively for the chain's originator.
   */
  pinciteInheritedFrom?: number
  /**
   * Trailing parenthetical content (text between the parens, excluding the
   * parens themselves). See `IdCitation.parenthetical` for common shapes
   * and rationale. #303
   */
  parenthetical?: string
  /** Component-level spans (currently just `pincite`; extend when needed). */
  spans?: import("./componentSpans").SupraComponentSpans
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
  /** Structured pincite information (page, range, footnote, star-pagination). */
  pinciteInfo?: import("../extract/pincite").PinciteInfo
  /**
   * True if `pincite` was inherited from a preceding same-authority citation
   * per Bluebook Rule 4.1 / Indigo Book R6.2.2. Undefined when `pincite` was
   * extracted directly from this citation's text or when no pincite was set.
   */
  pinciteInherited?: boolean
  /**
   * Array index of the citation from which `pincite` was inherited.
   * Indexes into the same array this citation appears in — i.e., the
   * output of `extractCitations(...).citations` (or
   * `DocumentResolver.resolve()`'s output, which preserves input order).
   * Set only when `pinciteInherited` is true. Records the immediate
   * predecessor; follow transitively for the chain's originator.
   */
  pinciteInheritedFrom?: number
  /**
   * Case name inferred from prose preceding this short-form when no full
   * citation in `citations[]` matched its vol+reporter. Populated by the
   * resolver fallback for the "In Smith v. Jones... Smith, 100 F.2d at 200"
   * pattern. Consumers: prefer `caseName ?? inferredCaseName ?? partyName`.
   */
  inferredCaseName?: string
  /** Plaintiff side of the inferred case name. */
  inferredPlaintiff?: string
  /** Defendant side of the inferred case name. */
  inferredDefendant?: string
  /** Span in original text where the inferred case name was found. */
  inferredCaseNameSpan?: Span
  /** Component-level spans (currently just `pincite`; extend when needed). */
  spans?: import("./componentSpans").ShortFormCaseComponentSpans
  /** Back-reference party name when the short-form includes one (Bluebook
   *  form: `Smith, 500 F.2d at 125`). Citation signals (`See`, `Cf.`, etc.)
   *  and sentence-initial connectors (`Then`, `Also`, `In` not-`In re`) are
   *  stripped via the same helper as supra (#216). Undefined when the
   *  short-form is bare `500 F.2d at 125`. Used by the resolver to
   *  disambiguate when multiple full citations share the same vol+reporter. */
  partyName?: string
  /** Normalized party name for resolver matching (lowercased, whitespace
   *  collapsed). Mirrors `defendantNormalized` / `plaintiffNormalized` on
   *  `FullCaseCitation`. */
  partyNameNormalized?: string
  /**
   * Trailing parenthetical content (text between the parens, excluding the
   * parens themselves). See `IdCitation.parenthetical` for common shapes
   * and rationale. #303
   */
  parenthetical?: string
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
  | DocketCitation
  | StatuteCitation
  | RegulationCitation
  | JournalCitation
  | NeutralCitation
  | PublicLawCitation
  | FederalRegisterCitation
  | StatutesAtLargeCitation
  | ConstitutionalCitation
  | FederalRuleCitation
  | StateRuleCitation
  | RestatementCitation
  | TreatiseCitation
  | AnnotationCitation
  | SessionLawCitation
  | TreatyCitation
  | LegislativeMaterialCitation
  | LocalOrdinanceCitation
  | CanonCitation
  | IdCitation
  | SupraCitation
  | ShortFormCaseCitation

/**
 * Citation type discriminators grouped by category.
 */
export type FullCitationType =
  | "case"
  | "docket"
  | "statute"
  | "journal"
  | "neutral"
  | "publicLaw"
  | "federalRegister"
  | "statutesAtLarge"
  | "sessionLaw"
  | "treaty"
  | "legislativeMaterial"
  | "localOrdinance"
  | "canon"
  | "constitutional"
  | "federalRule"
  | "stateRule"
  | "restatement"
  | "treatise"
  | "annotation"
export type ShortFormCitationType = "id" | "supra" | "shortFormCase"

/**
 * Union of all full citation types (not short-form references).
 */
export type FullCitation =
  | FullCaseCitation
  | SessionLawCitation
  | TreatyCitation
  | LegislativeMaterialCitation
  | LocalOrdinanceCitation
  | CanonCitation
  | DocketCitation
  | StatuteCitation
  | JournalCitation
  | NeutralCitation
  | PublicLawCitation
  | FederalRegisterCitation
  | StatutesAtLargeCitation
  | ConstitutionalCitation
  | FederalRuleCitation
  | StateRuleCitation
  | RestatementCitation
  | TreatiseCitation
  | AnnotationCitation

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
