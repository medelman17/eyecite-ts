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

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const TREATISE_ALTERNATION = KNOWN_TREATISES.map(escapeRegex).join("|")

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
    // A.L.R. annotation. Captured shape is identical to a state-reporter
    // citation (vol + reporter + page), so this pattern must outrank
    // state-reporter in the dispatcher. The reporter alternation matches
    // the recognized A.L.R. series — A.L.R. (1st), A.L.R.2d/3d/4th/5th/6th/7th,
    // A.L.R. Fed., A.L.R. Fed. 2d/3d.
    id: "alr-annotation",
    regex:
      /\b(\d+)\s+(A\.\s?L\.\s?R\.(?:\s?(?:Fed\.(?:\s?\d(?:d|nd|rd|th))?|\d(?:d|nd|rd|th)))?)\s+(\d+)\b/g,
    description: 'A.L.R. annotation citations: "100 A.L.R.2d 1234", "23 A.L.R. Fed. 3d 456" — #581',
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
    id: "treatise",
    regex: new RegExp(
      `\\b(\\d+)\\s+(${TREATISE_ALTERNATION})(?:\\s+\\(([^)]+)\\))?\\s+§§?\\s*(\\d+(?:[.:][A-Za-z0-9]+)*(?:\\[[A-Za-z0-9]+\\])?(?:\\([^)]*\\))*)`,
      "g",
    ),
    description:
      'Treatise: "5 Wright & Miller, Federal Practice and Procedure § 1290", "1 Nimmer on Copyright § 5.05[A]" — #579',
    type: "treatise",
  },
]
