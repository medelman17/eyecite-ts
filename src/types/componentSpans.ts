import type { Span } from "./span"

/**
 * Component spans for case citations (type: "case").
 *
 * Containment: when both `metadataParenthetical` and `court`/`year` are present,
 * `court` and `year` are sub-ranges within `metadataParenthetical`. Consumers
 * rendering highlights should use either the parent or child spans, not both.
 */
export interface CaseComponentSpans {
  caseName?: Span
  plaintiff?: Span
  defendant?: Span
  volume?: Span
  reporter?: Span
  page?: Span
  pincite?: Span
  court?: Span
  year?: Span
  signal?: Span
  metadataParenthetical?: Span
}

/**
 * Component spans for statute citations (type: "statute").
 *
 * Note: `signal` is included for future extensibility but is currently only
 * populated for case citations.
 */
export interface StatuteComponentSpans {
  title?: Span
  code?: Span
  section?: Span
  subsection?: Span
  signal?: Span
}

/**
 * Component spans for constitutional citations (type: "constitutional").
 *
 * Note: `signal` is included for future extensibility but is currently only
 * populated for case citations.
 */
export interface ConstitutionalComponentSpans {
  jurisdiction?: Span
  article?: Span
  amendment?: Span
  section?: Span
  clause?: Span
  signal?: Span
}

/**
 * Component spans for journal citations (type: "journal").
 *
 * Note: `signal` is included for future extensibility but is currently only
 * populated for case citations.
 */
export interface JournalComponentSpans {
  volume?: Span
  journal?: Span
  page?: Span
  pincite?: Span
  year?: Span
  signal?: Span
}

/**
 * Component spans for neutral citations (type: "neutral").
 *
 * Note: `signal` is included for future extensibility but is currently only
 * populated for case citations.
 */
export interface NeutralComponentSpans {
  year?: Span
  court?: Span
  documentNumber?: Span
  pincite?: Span
  signal?: Span
}

/**
 * Component spans for Id./Ibid. citations (type: "id").
 */
export interface IdComponentSpans {
  pincite?: Span
}

/**
 * Component spans for supra citations (type: "supra").
 */
export interface SupraComponentSpans {
  pincite?: Span
}

/**
 * Component spans for short-form case citations (type: "shortFormCase").
 */
export interface ShortFormCaseComponentSpans {
  pincite?: Span
}

/**
 * Component spans for public law citations (type: "publicLaw").
 *
 * Note: `signal` is included for future extensibility but is currently only
 * populated for case citations.
 */
export interface PublicLawComponentSpans {
  congress?: Span
  lawNumber?: Span
  signal?: Span
}

/**
 * Component spans for federal register citations (type: "federalRegister").
 *
 * Note: `signal` is included for future extensibility but is currently only
 * populated for case citations.
 */
export interface FederalRegisterComponentSpans {
  volume?: Span
  page?: Span
  year?: Span
  signal?: Span
}

/**
 * Component spans for statutes at large citations (type: "statutesAtLarge").
 *
 * Note: `signal` is included for future extensibility but is currently only
 * populated for case citations.
 */
export interface StatutesAtLargeComponentSpans {
  volume?: Span
  page?: Span
  year?: Span
  signal?: Span
}
