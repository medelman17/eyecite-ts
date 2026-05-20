/**
 * Constitutional Citation Regex Patterns
 *
 * Patterns for U.S. Constitution, state constitutions, and bare "Const." citations.
 * Intentionally broad for tokenization — extraction layer parses structured fields.
 *
 * Four patterns (ordered by specificity):
 * - us-constitution: "U.S. Const. art. III, § 2"
 * - state-constitution: "Cal. Const. art. I, § 7"
 * - bare-constitution: "Const. art. I, § 8, cl. 3"
 * - bare-article: "Art. I, §8, cl. 3" (requires Roman numeral + § section)
 */

import type { Pattern } from "./casePatterns"

// Shared tail: art./amend. + numeral + optional § section + optional cl. clause
//
// Numeral forms accepted (#534):
//   - Roman numerals: I, II, III, IV, V, VI, VII, ..., XXVII
//   - Arabic numerals: 1, 2, 3, ..., 27
//   - Ordinal abbreviations: 1st, 2nd, 3rd, 4th, ..., 27th
//   - Word forms: First, Second, Third, ..., Twenty-Seventh
//
// Article-or-amendment token forms:
//   - art. / article / Art. / Article
//   - amend. / amendment / Amend. / Amendment
//   - amdt. / Amdt.
//
// The ordinal-prefix forms (`5th Amend.`) put the numeral BEFORE the
// article/amendment token, so an alternative shape is needed.

// Word-form amendment ordinals (`First`..`Twenty-Seventh`). The first
// twenty unit-ordinals are followed by ten compound forms (Twentieth..
// Twenty-Seventh).
const AMEND_WORD_ORDINALS = String.raw`Twenty[-\s]Seventh|Twenty[-\s]Sixth|Twenty[-\s]Fifth|Twenty[-\s]Fourth|Twenty[-\s]Third|Twenty[-\s]Second|Twenty[-\s]First|Twentieth|Nineteenth|Eighteenth|Seventeenth|Sixteenth|Fifteenth|Fourteenth|Thirteenth|Twelfth|Eleventh|Tenth|Ninth|Eighth|Seventh|Sixth|Fifth|Fourth|Third|Second|First`

// Ordinal abbreviation forms (`1st`..`27th`).
const AMEND_ORDINAL_ABBREV = String.raw`(?:1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th|11th|12th|13th|14th|15th|16th|17th|18th|19th|20th|21st|22nd|23rd|24th|25th|26th|27th)`

// Numeral form accepted in the canonical `art./amend. <numeral>` shape.
// Includes Roman, Arabic, ordinal abbreviations, and word forms.
const NUMERAL_FORM = `(?:[IVX]+|\\d+|${AMEND_ORDINAL_ABBREV}|${AMEND_WORD_ORDINALS})`

// Article-or-amendment word, including the unabbreviated `Amendment`
// alternative (#534).
const ARTICLE_OR_AMENDMENT = String.raw`(?:art(?:icle)?\.?|amend(?:ment)?\.?|amdt\.?|Amendment)\s+(${NUMERAL_FORM})`

// Inverse shape: numeral BEFORE the amendment word (e.g., `5th Amend.`,
// `Fifth Amendment`). Only matches the amendment family — articles are
// never written with an ordinal-prefix form (`5th Art.` is not legal).
const ORDINAL_PREFIX_AMENDMENT = `(${AMEND_ORDINAL_ABBREV}|${AMEND_WORD_ORDINALS})\\s+(?:amend(?:ment)?\\.?|amdt\\.?|Amendment)`

const OPTIONAL_SECTION = String.raw`(?:[,;]\s*§\s*([\w-]+))?`
const OPTIONAL_CLAUSE = String.raw`(?:[,;]\s*cl\.?\s*(\d+))?`
const BODY_TAIL = `(?:${ARTICLE_OR_AMENDMENT}|${ORDINAL_PREFIX_AMENDMENT})${OPTIONAL_SECTION}${OPTIONAL_CLAUSE}`

/** Compiled body regex shared with the extractor to avoid duplicate definitions. */
export const CONSTITUTIONAL_BODY_RE: RegExp = new RegExp(BODY_TAIL, "id")

export const constitutionalPatterns: Pattern[] = [
  {
    id: "us-constitution",
    regex: new RegExp(
      String.raw`\b(?:United\s+States\s+Constitution|U\.?\s*S\.?\s+Const\.?),?\s+${BODY_TAIL}`,
      "gi",
    ),
    description:
      'U.S. Constitution citations (e.g., "U.S. Const. art. III, § 2", "U.S. Const. amend. XIV")',
    type: "constitutional",
  },
  {
    id: "state-constitution",
    // Separator between state abbrev and `Const.` uses `(?:\.\s*|\s+)`:
    // accepts canonical `Pa. Const.`, abbreviated no-space `Pa.Const.`
    // (#329), and bare-space `Pa Const.`. The `.` branch requires a dot
    // (forces a separator), so `PaConst.` does not match — avoids false
    // positives from words that happen to start with a state stem.
    regex: new RegExp(
      String.raw`\b(?:Ala|Alaska|Ariz|Ark|Cal(?:if)?|Colo|Conn|Del|Fla|Ga|Haw|Idaho|Ill|Ind|Iowa|Kan|Ky|La|Me|Md|Mass|Mich|Minn|Miss|Mo|Mont|Neb|Nev|N\.?\s*H|N\.?\s*J|N\.?\s*M|N\.?\s*Y|N\.?\s*C|N\.?\s*D|Ohio|Okla|Or(?:e)?|Pa|R\.?\s*I|S\.?\s*C|S\.?\s*D|Tenn|Tex|Utah|Vt|W\.?\s*Va|Va|Wash|Wis|Wyo)(?:\.\s*|\s+)Const\.?,?\s+${BODY_TAIL}`,
      "gi",
    ),
    description:
      'State constitution citations (e.g., "Cal. Const. art. I, § 7", "N.Y. Const. art. VI, § 20", "Pa.Const. art. VIII, § 4")',
    type: "constitutional",
  },
  {
    id: "bare-constitution",
    // "g" (not "gi") is intentional: the lookbehind uses [A-Z] which requires case sensitivity.
    // Consequence: lowercase "const." is never matched — acceptable in formal legal citations.
    // Consequence: all-caps preceding words like "THE Const." won't match due to [A-Z]\s lookbehind — rare, acceptable tradeoff.
    // Known limitation: multi-character state abbreviations ending in lowercase (Alaska, Idaho, etc.)
    // bypass the lookbehind and produce a second bare match — tokenizer span dedup handles this.
    regex: new RegExp(String.raw`(?<!\.\s)(?<![A-Z]\s)\bConst\.?,?\s+${BODY_TAIL}`, "g"),
    description:
      'Bare constitutional citations without jurisdiction prefix (e.g., "Const. art. I, § 8, cl. 3")',
    type: "constitutional",
  },
  {
    id: "bare-article",
    // Lowest-priority pattern: bare "Art." with no "Const." prefix at all.
    // Constrained to reduce false positives: Roman numerals only (no Arabic),
    // must include a § section reference, and lookbehind rejects "Const." prefix
    // (already handled by higher-priority patterns). Confidence set to 0.5 in extractor.
    regex: new RegExp(
      String.raw`(?<!Const\.?,?\s)\bArt\.?\s+[IVX]+[,;]\s*§\s*[\w-]+(?:[,;]\s*cl\.?\s*\d+)?`,
      "g",
    ),
    description:
      'Bare article references without "Const." prefix (e.g., "Art. I, §8, cl. 3")',
    type: "constitutional",
  },
  {
    // #534 — Bare word-form amendment references without `Const.` prefix:
    // `the Fifth Amendment`, `the Fourteenth Amendment`. Use a leading
    // word-boundary plus negative-lookbehind for `Const.?,?\s` so this
    // pattern doesn't double-match what the higher-priority `bare-article`
    // / `bare-constitution` patterns already cover (their `BODY_TAIL`
    // includes the ordinal-prefix branch).
    //
    // Confidence set to 0.5 in the extractor for the same reason as
    // `bare-article` — without the `Const.` anchor the FP risk is
    // higher (e.g., movie titles, generic prose), so consumers can
    // filter low-confidence matches if they need stricter precision.
    id: "bare-amendment-word",
    regex: new RegExp(
      `(?<!Const\\.?,?\\s)\\b(${AMEND_ORDINAL_ABBREV}|${AMEND_WORD_ORDINALS})\\s+(?:[Aa]mend(?:ment)?\\.?|[Aa]mdt\\.?)`,
      "g",
    ),
    description:
      'Bare word-form amendment references without "Const." prefix (e.g., "the Fifth Amendment", "the Fourteenth Amendment") — #534',
    type: "constitutional",
  },
]
