/**
 * Short-form Citation Regex Patterns
 *
 * Patterns for Id., Ibid., supra, and short-form case citations.
 * These refer to earlier citations in the document.
 *
 * Pattern Design:
 * - Simple structure to avoid ReDoS (no nested quantifiers)
 * - Broad matching for tokenization; validation happens in extraction layer
 * - Word boundaries to prevent false positives (e.g., "Idaho" vs "Id.")
 */

import type { Pattern } from './casePatterns'

/** Id. with optional pincite: "Id." or "Id. at 253" */
export const ID_PATTERN: RegExp = /\b[Ii]d\.(?:\s+at\s+(\d+))?\b/g

/** Ibid. with optional pincite (less common variant) */
export const IBID_PATTERN: RegExp = /\b[Ii]bid\.(?:\s+at\s+(\d+))?\b/g

/**
 * Supra with party name and optional pincite.
 * Pattern: word(s), supra [, at page]
 * Captures: (1) party name, (2) pincite
 */
export const SUPRA_PATTERN: RegExp = /\b([A-Z][a-zA-Z]+(?:\s+[a-zA-Z]+)*),?\s+supra(?:,?\s+at\s+(\d+))?\b/g

/**
 * Short-form case: volume reporter at page
 * Pattern: number space abbreviation space "at" space number
 * Simplified detection; full parsing in extraction layer
 */
export const SHORT_FORM_CASE_PATTERN: RegExp = /\b(\d+)\s+([A-Z][a-z.]+\d*)\s+at\s+(\d+)\b/g

/** All short-form patterns for tokenization */
export const SHORT_FORM_PATTERNS: readonly RegExp[] = [
  ID_PATTERN,
  IBID_PATTERN,
  SUPRA_PATTERN,
  SHORT_FORM_CASE_PATTERN,
] as const

/** Pattern objects for consistency with other pattern modules */
export const shortFormPatterns: Pattern[] = [
  {
    id: 'id',
    regex: ID_PATTERN,
    description: 'Id. citations (e.g., "Id." or "Id. at 253")',
    type: 'case', // Will be typed as 'id' in extraction layer
  },
  {
    id: 'ibid',
    regex: IBID_PATTERN,
    description: 'Ibid. citations (e.g., "Ibid." or "Ibid. at 125")',
    type: 'case', // Will be typed as 'id' in extraction layer
  },
]
