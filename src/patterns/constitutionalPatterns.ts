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
// alternative (#534). Plural forms (`arts.`, `amends.`, `amdts.`) are
// accepted for chained citations (#321 partial) — the tokenizer only
// captures the first numeral; chained continuations are out of scope
// for this pattern (a separate post-extraction pass like
// expandChainedConstitutional could handle them).
const ARTICLE_OR_AMENDMENT = String.raw`(?:arts?(?:icle)?\.?|amends?(?:ment)?\.?|amdts?\.?|Amendment)\s+(${NUMERAL_FORM})`

// Inverse shape: numeral BEFORE the amendment word (e.g., `5th Amend.`,
// `Fifth Amendment`). Only matches the amendment family — articles are
// never written with an ordinal-prefix form (`5th Art.` is not legal).
const ORDINAL_PREFIX_AMENDMENT = `(${AMEND_ORDINAL_ABBREV}|${AMEND_WORD_ORDINALS})\\s+(?:amend(?:ment)?\\.?|amdt\\.?|Amendment)`

// Comma/semicolon between the numeral and the section/clause is optional
// (#680). `U.S. Const. amend. XIV § 1` and `U.S. Const. art. III § 2`
// are valid Bluebook forms — separator-free spacing should not lose
// the structured section/clause field.
const OPTIONAL_SECTION = String.raw`(?:[,;]?\s*§\s*([\w-]+))?`
const OPTIONAL_CLAUSE = String.raw`(?:[,;]?\s*cl\.?\s*(\d+))?`
// Preamble (#321): `pmbl.` (Bluebook abbreviation) or `preamble`.
// No numeral, no section, no clause — preamble has none. Captured as
// a non-capturing alternative in BODY_TAIL so the existing group
// layout (article/amendment numerals in groups 1/2, section in 3,
// clause in 4) is preserved.
const PREAMBLE = String.raw`(?:[,;]?\s*(?:pmbl\.?|preamble)\b)`
const BODY_TAIL = `(?:(?:${ARTICLE_OR_AMENDMENT}|${ORDINAL_PREFIX_AMENDMENT})${OPTIONAL_SECTION}${OPTIONAL_CLAUSE}|${PREAMBLE})`

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
    // Constrained to reduce false positives: must include a § section
    // reference. Roman + Arabic numerals both accepted (#321). The
    // mandatory `§ N` lookahead keeps FP risk low — prose like
    // `Art. 1 of the treaty` does not match. Lookbehind rejects
    // "Const." prefix (handled by higher-priority patterns).
    // Confidence set to 0.5 in extractor.
    regex: new RegExp(
      String.raw`(?<!Const\.?,?\s)\bArt\.?\s+([IVX]+|\d+)[,;]\s*§\s*[\w-]+(?:[,;]\s*cl\.?\s*\d+)?`,
      "g",
    ),
    description:
      'Bare article references without "Const." prefix (e.g., "Art. I, §8, cl. 3", "Art. 1, § 10")',
    type: "constitutional",
  },
  {
    // #321 — Spelled-out bare `Article N, Section N` prose with no `Const.`
    // anchor and no `of the <State> Constitution` trailer:
    // `Article I, Section 8`, `Article 1, Section 10`, `Art. 1, Section 6`.
    // The `bare-article` pattern above only accepts the abbreviated `Art.`
    // token plus a `§` section symbol, so the spelled-out forms attorneys
    // use most in argument prose fell through entirely. The tight
    // `Article <num>, Section <num>` adjacency (comma/semicolon separator)
    // is the false-positive guard; "Article"/"Art." is case-sensitive so
    // lowercase contract/bylaw prose ("article 7, section 3") does not
    // match. Confidence set to 0.5 in the extractor (same as `bare-article`).
    // The `(?<!Const\.?,?\s)` lookbehind (mirroring `bare-article`) keeps
    // this from also matching the `Art. I, §7` core inside a full
    // `U.S. Const., Art. I, §7` citation already captured upstream.
    id: "bare-article-section",
    regex: new RegExp(
      String.raw`(?<!Const\.?,?\s)\b(?:Article|Art\.?)\s+([IVX]+|\d+)\s*[,;]\s*(?:Section|§)\s*([\w()-]+)`,
      "g",
    ),
    description:
      'Bare spelled-out article+section prose: "Article I, Section 8", "Art. 1, Section 6" — #321',
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
    // #656 — Prose state-constitutional citations:
    //   - `art. 14 of the Massachusetts Declaration of Rights`
    //   - `Section 5(B), Article IV of the Ohio Constitution`
    //   - `Section 2, Article I of the Pennsylvania Constitution`
    //
    // These do NOT use the canonical Bluebook `<State>. Const.` prefix —
    // they spell the state name in full as part of natural prose. The
    // closed alternation of full state names (US states + DC) gates the
    // pattern so generic phrases like `art. 14 of the document` do not
    // match.
    //
    // Two variants share one patternId because they collapse to the same
    // shape after extraction (article + optional section + jurisdiction).
    // The extractor distinguishes via regex group layout.
    //
    // Shape 1 captures: (1) article number, (2) state name (full word)
    // Shape 2 captures: (3) section text, (4) article numeral (roman or arabic), (5) state name
    id: "state-const-prose-declaration",
    regex: new RegExp(
      String.raw`\b(?:art(?:icle)?\.?)\s+(\d+)\s+of\s+the\s+(Massachusetts|Pennsylvania|Vermont|New\s+Hampshire|Maryland|North\s+Carolina|Delaware|New\s+Jersey)\s+(?:Declaration\s+of\s+Rights|Constitution)\b`,
      "gi",
    ),
    description:
      'Prose-form state constitutional citations: "art. 14 of the Massachusetts Declaration of Rights" — #656',
    type: "constitutional",
  },
  {
    id: "state-const-prose-section-article",
    regex: new RegExp(
      String.raw`\bSection\s+([\w()-]+)\s*,\s*Article\s+([IVX]+|\d+)\s+of\s+the\s+(Massachusetts|Pennsylvania|Vermont|New\s+Hampshire|Maryland|North\s+Carolina|Delaware|New\s+Jersey|Ohio|California|Texas|Florida|Illinois|Michigan|New\s+York|Georgia|Virginia|Washington|Arizona|Colorado|Wisconsin|Minnesota|Indiana|Louisiana|Oregon|Tennessee|South\s+Carolina|Alabama|Missouri|Kentucky|Connecticut|Iowa|Mississippi|Arkansas|Kansas|Nevada|Utah|Hawaii|Alaska|Idaho|Maine|Montana|Nebraska|New\s+Mexico|North\s+Dakota|Oklahoma|Rhode\s+Island|South\s+Dakota|West\s+Virginia|Wyoming|Florida)\s+Constitution\b`,
      "g",
    ),
    description:
      'Prose-form state constitutional citations: "Section 5(B), Article IV of the Ohio Constitution" — #656',
    type: "constitutional",
  },
  {
    // #321 — Article-first prose form: `article XII, section 5 of the
    // California Constitution`, `article VI, section 10, of the
    // California Constitution`. Mirror of the section-first variant
    // above. Same patternId because the extractor produces the same
    // shape (article + section + jurisdiction). The extractor
    // distinguishes the two variants by group layout.
    //
    // Shape: (1) article numeral, (2) section text, (3) state name.
    id: "state-const-prose-article-first",
    regex: new RegExp(
      String.raw`\b(?:article|art\.?)\s+([IVX]+|\d+)[,\s]+section\s+([\w()-]+),?\s+of\s+the\s+(Massachusetts|Pennsylvania|Vermont|New\s+Hampshire|Maryland|North\s+Carolina|Delaware|New\s+Jersey|Ohio|California|Texas|Florida|Illinois|Michigan|New\s+York|Georgia|Virginia|Washington|Arizona|Colorado|Wisconsin|Minnesota|Indiana|Louisiana|Oregon|Tennessee|South\s+Carolina|Alabama|Missouri|Kentucky|Connecticut|Iowa|Mississippi|Arkansas|Kansas|Nevada|Utah|Hawaii|Alaska|Idaho|Maine|Montana|Nebraska|New\s+Mexico|North\s+Dakota|Oklahoma|Rhode\s+Island|South\s+Dakota|West\s+Virginia|Wyoming)\s+Constitution\b`,
      "gi",
    ),
    description:
      'Prose-form state constitutional citations, article-first: "article XII, section 5 of the California Constitution" — #321',
    type: "constitutional",
  },
  {
    id: "bare-amendment-word",
    regex: new RegExp(
      `(?<!Const\\.?,?\\s)\\b(${AMEND_ORDINAL_ABBREV}|${AMEND_WORD_ORDINALS})\\s+(?:[Aa]mend(?:ment)?\\.?|[Aa]mdt\\.?)`,
      "g",
    ),
    description:
      'Bare word-form amendment references without "Const." prefix (e.g., "the Fifth Amendment", "the Fourteenth Amendment") — #534',
    type: "constitutional",
  },
  {
    // #657 — Coordinated amendment lists: `the Fifth and Sixth Amendment`,
    // `Fourth, Fifth, and Fourteenth Amendments`. The `bare-amendment-word`
    // pattern only matches the trailing `<ordinal> Amendment` portion;
    // leading ordinals in the list (Fifth, Fourth) are silently dropped
    // because no `Amendment` word follows them directly.
    //
    // This pattern matches each leading ordinal using a lookahead that
    // requires the chain to terminate in `<ordinal>\s+Amendments?`. Two
    // alternatives in the lookahead:
    //   1. Comma form: `Fifth, Sixth, and Fourteenth Amendments`
    //   2. Bare-and form: `Fourth and Fourteenth Amendments`
    //
    // Each match captures just the ordinal text (e.g., `Fifth`). The
    // extractor parses the numeral via `parseNumeral` and emits a
    // separate amendment citation. The trailing `<ordinal> Amendment`
    // continues to be captured by `bare-amendment-word`.
    //
    // Confidence is set to 0.5 in the extractor (same as
    // `bare-amendment-word`) since this is also a bare-prose match
    // without the `Const.` anchor.
    id: "bare-amendment-coord",
    regex: new RegExp(
      `(?<!Const\\.?,?\\s)\\b(${AMEND_ORDINAL_ABBREV}|${AMEND_WORD_ORDINALS})(?=,\\s+(?:(?:${AMEND_ORDINAL_ABBREV}|${AMEND_WORD_ORDINALS}),?\\s+)*(?:and\\s+)?(?:${AMEND_ORDINAL_ABBREV}|${AMEND_WORD_ORDINALS})\\s+[Aa]mendments?|\\s+and\\s+(?:${AMEND_ORDINAL_ABBREV}|${AMEND_WORD_ORDINALS})\\s+[Aa]mendments?)`,
      "g",
    ),
    description:
      'Leading ordinals in coordinated amendment lists ("Fifth and Sixth Amendment" → Fifth + Sixth) — #657',
    type: "constitutional",
  },
]
