/**
 * Confidence scoring types — see docs/superpowers/specs/2026-05-17-confidence-scoring-design.md
 */

export type ConfidenceLevel = "certain" | "high" | "medium" | "low"

export type ReasonCode =
  // Positive extraction signals
  | "known_reporter"
  | "year_plausible"
  | "case_name_present"
  | "court_identified"
  // Negative extraction signals
  | "reporter_unknown"
  | "reporter_ambiguous"
  | "year_as_volume"
  | "blocked_reporter"
  | "year_implausible"
  | "suspicious_volume"
  | "mid_sentence_id"
  | "typo_punctuation"
  | "lowercase_id"
  | "small_volume"
  // Metadata signals
  | "missing_pincite"
  | "missing_year"
  | "missing_court"
  | "missing_case_name"
  | "blank_page"
  // Resolution signals (short-form only)
  | "exact_antecedent_match"
  | "fuzzy_party_match"
  | "ambiguous_id_window"
  | "no_antecedent_in_scope"

export interface Explanation {
  value: number
  description: string
  details?: Explanation[]
}

export interface Confidence {
  /** Calibrated composite (0..1). Produced by the calibration shell. */
  score: number
  /** Categorical bucket; stable across minor versions. Derived from score. */
  level: ConfidenceLevel
  /** Orthogonal axes — separable concerns. */
  axes: {
    /** P(this is a real citation), calibrated per extractor. */
    extraction: number
    /** Completeness/quality of parsed fields. */
    metadata: number
    /** P(correct antecedent link). Only present on short-form citations after resolve=true. */
    resolution?: number
  }
  /** Machine-readable codes. */
  reasons: ReasonCode[]
  /** Nested score-tree breakdown. Populated only when extractCitations({ explain: true }). */
  explanation?: Explanation
}
