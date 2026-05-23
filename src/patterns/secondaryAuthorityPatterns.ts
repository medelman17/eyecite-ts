/**
 * Secondary Authority Citation Patterns (#578, #579, #581)
 *
 * Patterns for non-primary legal authority:
 * - Restatements (#578): `Restatement (Second) of Torts § 402A`
 * - Treatises (#579): `5 Wright & Miller, Federal Practice and Procedure § 1290`
 * - A.L.R. annotations (#581): `100 A.L.R.2d 1234`
 *
 * Pattern ordering rationale: these patterns must precede `casePatterns`
 * in the dispatcher because the broad state-reporter regex matches
 * `<vol> A.L.R.2d <page>` as a phantom case citation. Treatise patterns
 * additionally guard against the state-reporter matching `5 Wright`
 * style volume-prefixed treatise heads.
 */

import type { Pattern } from "./casePatterns"

/**
 * Known treatise titles with their canonical form. The regex below uses
 * a fixed alternation rather than a free-text grammar so we surface only
 * the well-known multi-volume treatises and avoid false positives on
 * prose like `5 Smith and Jones, Local Practice § 1`.
 *
 * Each entry is matched as a literal string within the regex (with `.`
 * escaped). Patterns extend the list as new treatises are added.
 *
 * Citation forms observed:
 *   - `5 Wright & Miller, Federal Practice and Procedure § 1290`
 *   - `13 Williston on Contracts § 38`
 *   - `1 Moore's Federal Practice § 12.34`
 *   - `1 Witkin, Cal. Procedure (5th ed. 2008) § 234`
 *   - `1 Nimmer on Copyright § 5.05[A]`
 *   - `2 Corbin on Contracts § 5.4`
 *
 * The list is kept small and curated. Adding a treatise that isn't here
 * is a one-line change.
 */
const KNOWN_TREATISES: ReadonlyArray<string> = [
  // Federal courts / civil procedure
  "Wright & Miller, Federal Practice and Procedure",
  "Moore's Federal Practice",
  "Moore's Federal Practice 3d",
  // Contracts
  "Williston on Contracts",
  "Corbin on Contracts",
  // Intellectual property
  "Nimmer on Copyright",
  "McCarthy on Trademarks and Unfair Competition",
  // California
  "Witkin, Cal. Procedure",
  "Witkin, Summary of California Law",
  // Torts
  "Prosser and Keeton on the Law of Torts",
  // Evidence
  "Wigmore on Evidence",
  "McCormick on Evidence",
  // Criminal
  "LaFave & Israel, Criminal Procedure",
  "LaFave, Criminal Law",
  // Administrative
  "Davis & Pierce, Administrative Law Treatise",
]

/**
 * Bare-title alternation (#643): titles WITHOUT the author shortname
 * prefix, for the Bluebook R15 canonical form where the citation
 * spells out the full author names between the volume and the title:
 * `5A Charles Alan Wright & Arthur R. Miller, Federal Practice and
 * Procedure § 1357`.
 *
 * Only includes titles where the author is plausibly external and
 * variable (Wright & Miller, LaFave, Witkin, Davis & Pierce). Titles
 * with the author baked into the work itself (`Williston on Contracts`,
 * `Nimmer on Copyright`, `Moore's Federal Practice`) are NOT included
 * here — they always appear with their canonical short title.
 */
const KNOWN_TREATISE_BARE_TITLES: ReadonlyArray<string> = [
  "Federal Practice and Procedure",
  "Cal. Procedure",
  "Summary of California Law",
  "Criminal Procedure",
  "Criminal Law",
  "Administrative Law Treatise",
]

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const TREATISE_ALTERNATION = KNOWN_TREATISES.map(escapeRegex).join("|")
const TREATISE_BARE_TITLE_ALTERNATION = KNOWN_TREATISE_BARE_TITLES.map(escapeRegex).join("|")

/**
 * Curated list of journal abbreviations that frequently appear in legal
 * opinions cited in the `<vol> Abbrev <page>` shape WITHOUT periods.
 * Two flavors:
 *
 *  1. Scientific / medical journals cited as authority for empirical
 *     claims (medical, neuroscience, psychology, public health).
 *  2. Law-review acronymized forms that some court reporters strip of
 *     periods (`Brook L Rev` rather than `Brook. L. Rev.`).
 *
 * Without this pattern the broad state-reporter regex claims these as
 * `type: "case"` (the case extractor doesn't validate against
 * reporters-db at tokenize time, so an unknown reporter name is accepted
 * verbatim). #638
 *
 * Keep this list curated and small — adding a journal is a one-line
 * change. The mandatory volume + page digits gate the match so
 * bare-acronym mentions in prose (`Neurology specialists agree.`) do
 * not match.
 */
const KNOWN_BARE_JOURNALS: ReadonlyArray<string> = [
  // Medical / scientific (frequently cited in tort, products-liability,
  // criminal-mens-rea cases)
  "Neurology",
  "Nature",
  "Science",
  "JAMA",
  "Pediatrics",
  "Lancet",
  "New Eng\\. J\\. Med\\.",
  "Am\\. J\\. Psychiatry",
  "Am\\. J\\. Pub\\. Health",
  // Law reviews / journals stripped of periods by some court reporters
  "Brook L Rev",
  "Yale L J",
  "Harv L Rev",
  "Colum L Rev",
  "Stan L Rev",
  "Mich L Rev",
  "U Chi L Rev",
  "Geo L J",
  "Tex L Rev",
  "Va L Rev",
  "Cal L Rev",
  "NYU L Rev",
  "Cornell L Rev",
  "Hastings L J",
  "Hous L Rev",
  "Fordham L Rev",
  "Notre Dame L Rev",
  "U Pa L Rev",
  "Wash L Rev",
  "Wis L Rev",
]

const BARE_JOURNAL_ALTERNATION = KNOWN_BARE_JOURNALS.join("|")

export const secondaryAuthorityPatterns: Pattern[] = [
  {
    // Restatement. Canonical form: `Restatement (Edition) of Subject § Section`.
    // - Edition is one of First / Second / Third / Fourth, optionally
    //   abbreviated to `1st` / `2d` / `3d` / `4th`.
    // - Subject body permits multi-word names including `the Law Governing
    //   Lawyers`, `Foreign Relations Law`, etc. The body stops at the section
    //   sigil (`§`).
    // - Section captures the standard `(\d+[A-Za-z0-9-]*(?:\([^)]*\))*)` shape
    //   used by `usc` so chained subsections like `(1)(b)` are absorbed.
    id: "restatement",
    // Section body uses an internal-`.` rule: `\d+` followed by zero or
    // more `([A-Za-z0-9-]|\.[A-Za-z0-9])` so a `.` is only consumed when
    // immediately followed by another alphanumeric. This stops greedy
    // capture at the trailing sentence period (`187.`).
    regex:
      /\bRestatement\s+\((First|Second|Third|Fourth|1st|2d|3d|4th)\)\s+(?:of\s+)?([A-Za-z][A-Za-z\s,.&'-]+?)\s+§§?\s*(\d+(?:[A-Za-z0-9-]|\.[A-Za-z0-9])*(?:\([^)]*\))*)/g,
    description:
      'Restatement: "Restatement (Second) of Torts § 402A", "Restatement (Third) of the Law Governing Lawyers § 1" — #578',
    type: "restatement",
  },
  {
    // Bare-abbreviation journals (no periods). Closed alternation against
    // KNOWN_BARE_JOURNALS protects against false-positives on prose. The
    // pattern enforces `\b` boundaries and trailing volume/page digits;
    // bare-acronym mentions (`Neurology specialists agree.`) do not match.
    // Listed BEFORE casePatterns via dispatcher order so the journal
    // classification wins span dedup against the broad state-reporter
    // regex that otherwise emits `type: "case"`. #638
    //
    // Captures: (1) volume, (2) journal name, (3) page — matches
    // extractJournal's parsing shape exactly.
    id: "bare-journal",
    regex: new RegExp(`\\b(\\d+)\\s+(${BARE_JOURNAL_ALTERNATION})\\s+(\\d+)\\b`, "g"),
    description:
      'Bare-abbreviation journals (scientific journals + period-stripped law reviews): "53 Neurology 1107", "70 Brook L Rev 1045" — #638',
    type: "journal",
  },
  {
    // A.L.R. annotation. Captured shape is identical to a state-reporter
    // citation (vol + reporter + page), so this pattern must outrank
    // state-reporter in the dispatcher. The reporter alternation matches
    // the recognized A.L.R. series — A.L.R. (1st), A.L.R.2d/3d/4th/5th/6th/7th,
    // A.L.R. Fed., A.L.R. Fed. 2d/3d.
    id: "alr-annotation",
    // Periodized + bare forms. The bare form (`ALR`, `ALR2d`, `ALR Fed`,
    // `ALR Fed 3d`) lacks the dots between letters but still uses the same
    // series-suffix shape. Without bare support, citations like `48 ALR 749`
    // fell through to the broad state-reporter regex and emitted as
    // `type: "case"`. #638
    regex:
      /\b(\d+)\s+(A\.\s?L\.\s?R\.(?:\s?(?:Fed\.(?:\s?\d(?:d|nd|rd|th))?|\d(?:d|nd|rd|th)))?|ALR(?:\s?(?:Fed(?:\s?\d(?:d|nd|rd|th))?|\d(?:d|nd|rd|th)))?)\s+(\d+)\b/g,
    description:
      'A.L.R. annotation citations (periodized + bare): "100 A.L.R.2d 1234", "48 ALR 749", "23 A.L.R. Fed. 3d 456" — #581 #638',
    type: "annotation",
  },
  {
    // Treatise (volume-prefixed). Uses a fixed alternation of known
    // treatise titles to avoid false positives on prose. Section locator
    // captures dots and bracketed sub-references (e.g., `5.05[A]`) common
    // in Nimmer.
    //
    // An optional `(\<edition\>\s+ed\.?\s+\<year\>)` parenthetical can
    // appear between the title and the section sigil; we capture it for
    // the `edition` / `year` fields.
    // Issue #643: Volume admits an optional letter suffix (`5A`,
    // `13C`) for sub-volume citations common in Federal Practice and
    // Procedure and Williston. The pattern accepts two title shapes:
    //   1. Bare-title with optional author-prefix: `5A Charles Alan
    //      Wright & Arthur R. Miller, Federal Practice and Procedure`
    //      — Bluebook R15 prescribes the full-author form as canonical
    //      and it's the dominant style in modern federal briefs.
    //   2. Compact title with embedded author shortname: `5 Wright &
    //      Miller, Federal Practice and Procedure` (existing).
    //
    // The bare-title alternative requires the preceding author prefix
    // (constrained to capitalized words optionally joined by `&`); the
    // compact alternative requires no prefix. Prose like
    // `5 because the section is long, Wright & Miller, ...` cannot
    // match either branch.
    id: "treatise",
    regex: new RegExp(
      `\\b(\\d+[A-Z]?)\\s+(?:` +
        // Compact form FIRST so existing tests pass (`5 Wright & Miller,
        // Federal Practice and Procedure`); only fall back to the
        // bare-title-with-author shape when the compact alternation
        // misses (e.g., `5A Charles Alan Wright & Arthur R. Miller,
        // Federal Practice and Procedure`).
        `(${TREATISE_ALTERNATION})` +
        `|(?:[A-Z][A-Za-z.]*(?:\\s+[A-Z][A-Za-z.]*)*(?:\\s*&\\s*[A-Z][A-Za-z.]*(?:\\s+[A-Z][A-Za-z.]*)*)?,\\s+)(${TREATISE_BARE_TITLE_ALTERNATION})` +
        `)(?:\\s+\\(([^)]+)\\))?\\s+§§?\\s*(\\d+(?:[.:][A-Za-z0-9]+)*(?:\\[[A-Za-z0-9]+\\])?(?:\\([^)]*\\))*)`,
      "g",
    ),
    description:
      'Treatise: "5 Wright & Miller, Federal Practice and Procedure § 1290", "5A Charles Alan Wright & Arthur R. Miller, Federal Practice and Procedure § 1357" (#643), "1 Nimmer on Copyright § 5.05[A]" — #579',
    type: "treatise",
  },
]
