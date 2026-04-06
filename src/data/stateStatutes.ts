/**
 * State statute abbreviation table — single source of truth for the
 * abbreviated-code tokenizer pattern and the knownCodes lookup registry.
 */

export interface StateStatuteEntry {
  /** Two-letter jurisdiction code (e.g., "AK", "AZ") */
  jurisdiction: string;
  /** All recognized abbreviation forms — used for lookup by findAbbreviatedCode */
  abbreviations: string[];
  /**
   * Regex fragment for tokenizer alternation. If omitted, auto-generated
   * from abbreviations via escapeForRegex. Provide explicitly when the
   * pattern needs optional components (e.g., "Stat(?:utes)?").
   */
  regexFragment?: string;
}

/**
 * Convert a plain abbreviation string into a regex fragment.
 *
 * Rules:
 * - Periods followed by a letter (e.g., "T.C.") → optional period + optional space
 * - Periods followed by a space (e.g., "Stat. Ann.") → optional period + flexible space
 * - Trailing periods → optional period
 * - Spaces → flexible whitespace (\s+)
 * - Regex-special characters are escaped
 */
export function escapeForRegex(abbreviation: string): string {
  return (
    abbreviation
      // Escape regex-special chars (except period and space, handled below)
      .replace(/[\\^$*+?{}[\]|()]/g, "\\$&")
      // Period followed by letter: "T.C" → "T\.?\s*C"
      .replace(/\.(?=[A-Za-z])/g, "\\.?\\s*")
      // Period followed by space: "Stat. Ann" → "Stat\.?\s+Ann"
      .replace(/\.\s+/g, "\\.?\\s+")
      // Trailing period: "Ann." → "Ann\.?"
      .replace(/\.$/g, "\\.?")
      // Remaining spaces → flexible whitespace
      .replace(/ +/g, "\\s+")
  );
}

/** Placeholder — entries added in subsequent tasks */
export const stateStatuteEntries: StateStatuteEntry[] = [];
