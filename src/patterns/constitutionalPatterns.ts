/**
 * Constitutional Citation Regex Patterns
 *
 * Patterns for U.S. Constitution, state constitutions, and bare "Const." citations.
 * Intentionally broad for tokenization — extraction layer parses structured fields.
 *
 * Three patterns:
 * - us-constitution: "U.S. Const. art. III, § 2"
 * - state-constitution: "Cal. Const. art. I, § 7"
 * - bare-constitution: "Const. art. I, § 8, cl. 3"
 */

import type { Pattern } from "./casePatterns"

// Shared tail: art./amend. + numeral + optional § section + optional cl. clause
// Roman numerals: I, II, III, IV, V, VI, VII, VIII, IX, X, XI, XII, XIII, XIV, XV, XVI, XVII, XVIII, XIX, XX, XXI, XXII, XXIII, XXIV, XXV, XXVI, XXVII
// Also accepts Arabic numerals as fallback
const ARTICLE_OR_AMENDMENT = String.raw`(?:art(?:icle)?\.?|amend(?:ment)?\.?)\s+([IVXLC]+|\d+)`
const OPTIONAL_SECTION = String.raw`(?:[,;]\s*§\s*([^\s,;()]+))?`
const OPTIONAL_CLAUSE = String.raw`(?:[,;]\s*cl\.?\s*(\d+))?`
const BODY_TAIL = `${ARTICLE_OR_AMENDMENT}${OPTIONAL_SECTION}${OPTIONAL_CLAUSE}`

export const constitutionalPatterns: Pattern[] = [
  {
    id: "us-constitution",
    regex: new RegExp(
      String.raw`\b(?:United\s+States\s+Constitution|U\.?\s*S\.?\s+Const\.?)\s+${BODY_TAIL}`,
      "gi",
    ),
    description:
      'U.S. Constitution citations (e.g., "U.S. Const. art. III, § 2", "U.S. Const. amend. XIV")',
    type: "constitutional",
  },
  {
    id: "state-constitution",
    regex: new RegExp(
      String.raw`\b(?:Ala|Alaska|Ariz|Ark|Cal(?:if)?|Colo|Conn|Del|Fla|Ga|Haw|Idaho|Ill|Ind|Iowa|Kan|Ky|La|Me|Md|Mass|Mich|Minn|Miss|Mo|Mont|Neb|Nev|N\.?\s*H|N\.?\s*J|N\.?\s*M|N\.?\s*Y|N\.?\s*C|N\.?\s*D|Ohio|Okla|Or(?:e)?|Pa|R\.?\s*I|S\.?\s*C|S\.?\s*D|Tenn|Tex|Utah|Vt|Va|Wash|W\.?\s*Va|Wis|Wyo)\.?\s+Const\.?\s+${BODY_TAIL}`,
      "gi",
    ),
    description:
      'State constitution citations (e.g., "Cal. Const. art. I, § 7", "N.Y. Const. art. VI, § 20")',
    type: "constitutional",
  },
  {
    id: "bare-constitution",
    // "g" (not "gi") is intentional: the lookbehind uses [A-Z] which requires case sensitivity.
    // Consequence: lowercase "const." is never matched — acceptable in formal legal citations.
    // Consequence: all-caps preceding words like "THE Const." won't match due to [A-Z]\s lookbehind — rare, acceptable tradeoff.
    regex: new RegExp(
      String.raw`(?<!\.\s)(?<![A-Z]\s)\bConst\.?\s+${BODY_TAIL}`,
      "g",
    ),
    description:
      'Bare constitutional citations without jurisdiction prefix (e.g., "Const. art. I, § 8, cl. 3")',
    type: "constitutional",
  },
]
