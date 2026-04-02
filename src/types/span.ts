/**
 * Represents a text span with positions tracked through transformations.
 *
 * During text cleaning (HTML removal, whitespace normalization), positions
 * shift. Span tracks BOTH cleaned positions (for parsing) and original
 * positions (for user-facing results).
 *
 * @example
 * const original = "Smith v. Doe, 500 F.2d 123 (2020)"
 * // After cleaning, positions may shift
 * const span: Span = {
 *   cleanStart: 14,  // Position in cleaned text
 *   cleanEnd: 27,
 *   originalStart: 14,  // Position in original text
 *   originalEnd: 27
 * }
 */
export interface Span {
  /** Start position in cleaned/tokenized text (used during parsing) */
  cleanStart: number

  /** End position in cleaned/tokenized text (used during parsing) */
  cleanEnd: number

  /** Start position in original input text (returned to user) */
  originalStart: number

  /** End position in original input text (returned to user) */
  originalEnd: number
}

/**
 * Maps positions between cleaned and original text.
 *
 * Built during text transformation to track how character positions shift
 * when HTML entities are removed, whitespace is normalized, etc.
 */
export interface TransformationMap {
  /** Maps cleaned text position to original text position */
  cleanToOriginal: Map<number, number>

  /** Maps original text position to cleaned text position */
  originalToClean: Map<number, number>
}

/** Translate clean-text span positions back to original-text positions. */
export function resolveOriginalSpan(
  span: { cleanStart: number; cleanEnd: number },
  map: TransformationMap,
): { originalStart: number; originalEnd: number } {
  return {
    originalStart: map.cleanToOriginal.get(span.cleanStart) ?? span.cleanStart,
    originalEnd: map.cleanToOriginal.get(span.cleanEnd) ?? span.cleanEnd,
  }
}
