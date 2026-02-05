import type { Citation, CitationType, CitationOfType, FullCitation, ShortFormCitation, FullCaseCitation } from "./citation"

/**
 * Type guard: narrows Citation to a full citation (case, statute, journal, neutral, publicLaw, federalRegister).
 */
export function isFullCitation(citation: Citation): citation is FullCitation {
  return citation.type === 'case'
    || citation.type === 'statute'
    || citation.type === 'journal'
    || citation.type === 'neutral'
    || citation.type === 'publicLaw'
    || citation.type === 'federalRegister'
    || citation.type === 'statutesAtLarge'
}

/**
 * Type guard: narrows Citation to a short-form citation (id, supra, shortFormCase).
 */
export function isShortFormCitation(citation: Citation): citation is ShortFormCitation {
  return citation.type === 'id'
    || citation.type === 'supra'
    || citation.type === 'shortFormCase'
}

/**
 * Type guard: narrows Citation to a full case citation.
 */
export function isCaseCitation(citation: Citation): citation is FullCaseCitation {
  return citation.type === 'case'
}

/**
 * Generic type guard that narrows a Citation to a specific type.
 * Useful when the target type is dynamic or generic.
 */
export function isCitationType<T extends CitationType>(
  citation: Citation,
  type: T
): citation is CitationOfType<T> {
  return citation.type === type
}

/**
 * Exhaustiveness helper for switch statements on discriminated unions.
 *
 * Place in the `default` branch to get a compile-time error if a new
 * variant is added but not handled.
 *
 * @example
 * ```typescript
 * switch (citation.type) {
 *   case 'case': ...
 *   case 'statute': ...
 *   // If you forget a variant, TypeScript errors here:
 *   default: assertUnreachable(citation.type)
 * }
 * ```
 */
export function assertUnreachable(x: never): never {
  throw new Error(`Unexpected value: ${x}`)
}
