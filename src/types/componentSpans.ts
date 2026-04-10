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

/** Component spans for statute citations (type: "statute"). */
export interface StatuteComponentSpans {
  title?: Span
  code?: Span
  section?: Span
  subsection?: Span
  signal?: Span
}

/** Component spans for constitutional citations (type: "constitutional"). */
export interface ConstitutionalComponentSpans {
  jurisdiction?: Span
  article?: Span
  amendment?: Span
  section?: Span
  clause?: Span
  signal?: Span
}

/** Component spans for journal citations (type: "journal"). */
export interface JournalComponentSpans {
  volume?: Span
  journal?: Span
  page?: Span
  pincite?: Span
  year?: Span
  signal?: Span
}

/** Component spans for neutral citations (type: "neutral"). */
export interface NeutralComponentSpans {
  year?: Span
  court?: Span
  documentNumber?: Span
  signal?: Span
}

/** Component spans for public law citations (type: "publicLaw"). */
export interface PublicLawComponentSpans {
  congress?: Span
  lawNumber?: Span
  signal?: Span
}

/** Component spans for federal register citations (type: "federalRegister"). */
export interface FederalRegisterComponentSpans {
  volume?: Span
  page?: Span
  year?: Span
  signal?: Span
}

/** Component spans for statutes at large citations (type: "statutesAtLarge"). */
export interface StatutesAtLargeComponentSpans {
  volume?: Span
  page?: Span
  year?: Span
  signal?: Span
}
