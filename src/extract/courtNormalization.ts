/**
 * Normalize a court string extracted from a citation parenthetical.
 *
 * - Collapses spaces after periods: "S.D. N.Y." → "S.D.N.Y."
 * - Ensures trailing period on abbreviated forms: "2d Cir" → "2d Cir."
 * - Returns undefined for empty/undefined input
 *
 * @example
 * normalizeCourt("S.D. N.Y.")  // "S.D.N.Y."
 * normalizeCourt("2d Cir")     // "2d Cir."
 * normalizeCourt("U.S.")       // "U.S."
 */
export function normalizeCourt(court: string | undefined): string | undefined {
  if (!court || !court.trim()) return undefined

  let normalized = court.trim()

  // Collapse spaces after periods before uppercase letters: "S.D. N.Y." → "S.D.N.Y."
  normalized = normalized.replace(/\.\s+(?=[A-Z])/g, ".")

  // Ensure trailing period on abbreviated forms that end with a letter
  // Only add period when the string contains a period (abbreviation) or
  // starts with ordinal+word (e.g., "2d Cir", "9th Cir")
  if (
    /[A-Za-z]$/.test(normalized) &&
    (/\./.test(normalized) || /^\d+\w*\s+[A-Z]/i.test(normalized))
  ) {
    normalized += "."
  }

  return normalized
}
