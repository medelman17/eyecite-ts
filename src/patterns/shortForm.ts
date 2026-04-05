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

import type { Pattern } from "./casePatterns"

/** Id. with optional pincite: "Id." or "Id. at 253" or "Id., at 253" */
export const ID_PATTERN: RegExp = /(?:^|(?<=\s)|(?<=["'(\[—]))\b[Ii]d\.(?:,?\s+at\s+(\d+(?:\s*[-–]\s*\d+)?))?/g

/** Ibid. with optional pincite (less common variant) */
export const IBID_PATTERN: RegExp = /(?:^|(?<=\s)|(?<=["'(\[—]))\b[Ii]bid\.(?:,?\s+at\s+(\d+(?:\s*[-–]\s*\d+)?))?/g

/**
 * Supra with party name and optional pincite.
 * Pattern: word(s), supra [note N] [, at page]
 * Captures: (1) party name, (2) note number (if any), (3) pincite
 * Note: Matches party names including hyphens, apostrophes, periods, and "v."
 */
export const SUPRA_PATTERN: RegExp =
  /\b([A-Z][a-zA-Z''\-]+\.?(?:(?:\s+v\.?\s+|\s+)[A-Z][a-zA-Z''\-]+\.?)*)\s*,?\s+supra(?:\s+note\s+(\d+))?(?:,?\s+at\s+(\d+))?/g

/**
 * Standalone supra without party name (common in footnotes).
 * Matches: "supra note 12", "supra at 15", "supra § 3", "supra Part II"
 * Requires "note", "at", "§", "Part", or "p." after supra to avoid matching
 * the word "supra" in prose. Preceded by whitespace, start, or signal words.
 * Captures: (1) note number (if any), (2) pincite
 */
export const STANDALONE_SUPRA_PATTERN: RegExp =
  /(?:^|(?<=\s)|(?<=[;.]))supra(?:\s+note\s+(\d+)(?:,?\s+at\s+(\d+))?|\s+at\s+(\d+)|\s+(?:§+|Part|p\.)\s*\S+)/g

/**
 * Short-form case: volume reporter at page
 * Pattern: number space abbreviation space "at" space number
 * Simplified detection; full parsing in extraction layer.
 * Supports reporters with 1-2 letter ordinal suffixes (e.g., F.4th, Cal.4th).
 */
export const SHORT_FORM_CASE_PATTERN: RegExp =
  /\b(\d+(?:-\d+)?)\s+([A-Z][A-Za-z.''\s]+?(?:\d[a-z]{1,2})?)\s+at\s+(\d+)\b/g

/** All short-form patterns for tokenization */
export const SHORT_FORM_PATTERNS: readonly RegExp[] = [
  ID_PATTERN,
  IBID_PATTERN,
  SUPRA_PATTERN,
  STANDALONE_SUPRA_PATTERN,
  SHORT_FORM_CASE_PATTERN,
] as const

/** Pattern objects for consistency with other pattern modules */
export const shortFormPatterns: Pattern[] = [
  {
    id: "id",
    regex: ID_PATTERN,
    description: 'Id. citations (e.g., "Id." or "Id. at 253")',
    type: "case", // Will be typed as 'id' in extraction layer
  },
  {
    id: "ibid",
    regex: IBID_PATTERN,
    description: 'Ibid. citations (e.g., "Ibid." or "Ibid. at 125")',
    type: "case", // Will be typed as 'id' in extraction layer
  },
  {
    id: "supra",
    regex: SUPRA_PATTERN,
    description: 'Supra citations (e.g., "Smith, supra" or "Smith, supra, at 460")',
    type: "case", // Will be typed as 'supra' in extraction layer
  },
  {
    id: "supra",
    regex: STANDALONE_SUPRA_PATTERN,
    description: 'Standalone supra (e.g., "supra note 12" or "supra at 15")',
    type: "case", // Will be typed as 'supra' in extraction layer
  },
  {
    id: "shortFormCase",
    regex: SHORT_FORM_CASE_PATTERN,
    description: 'Short-form case citations (e.g., "500 F.2d at 125")',
    type: "case", // Will be typed as 'shortFormCase' in extraction layer
  },
]
