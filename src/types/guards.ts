import {
  type Citation,
  type CitationOfType,
  type CitationType,
  FULL_CITATION_TYPES,
  type FullCaseCitation,
  type FullCitation,
  SHORT_FORM_CITATION_TYPES,
  type ShortFormCitation,
} from "./citation"

/**
 * O(1) membership sets derived from the single-source type inventories
 * (`FULL_CITATION_TYPES` / `SHORT_FORM_CITATION_TYPES`), so the guards below
 * cannot drift from `FullCitationType` / `ShortFormCitationType` (#843).
 */
const FULL_CITATION_TYPE_SET: ReadonlySet<string> = new Set(FULL_CITATION_TYPES)
const SHORT_FORM_CITATION_TYPE_SET: ReadonlySet<string> = new Set(SHORT_FORM_CITATION_TYPES)

/**
 * Type guard: narrows Citation to a full citation — any member of
 * `FullCitationType`. Membership derives from `FULL_CITATION_TYPES` (the single
 * source), so it can never silently omit a full type the way it once dropped
 * `regulation` / `stateRule` (#843).
 */
export function isFullCitation(citation: Citation): citation is FullCitation {
  return FULL_CITATION_TYPE_SET.has(citation.type)
}

/**
 * Type guard: narrows Citation to a short-form citation (id, supra, shortFormCase).
 */
export function isShortFormCitation(citation: Citation): citation is ShortFormCitation {
  return SHORT_FORM_CITATION_TYPE_SET.has(citation.type)
}

/**
 * Type guard: narrows Citation to a full case citation.
 */
export function isCaseCitation(citation: Citation): citation is FullCaseCitation {
  return citation.type === "case"
}

/**
 * Generic type guard that narrows a Citation to a specific type.
 * Useful when the target type is dynamic or generic.
 */
export function isCitationType<T extends CitationType>(
  citation: Citation,
  type: T,
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
