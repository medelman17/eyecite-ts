/**
 * Neutral and Online Citation Regex Patterns
 *
 * Patterns for WestLaw, LexisNexis, public laws, and Federal Register citations.
 * These have predictable formats and don't require external validation.
 *
 * Pattern Design:
 * - Matches year-database-number format for online citations
 * - Matches Pub. L. No. format for public laws
 * - Matches volume-Fed. Reg.-page for Federal Register
 * - Simple structure to avoid ReDoS
 */

import type { Pattern } from "./casePatterns"

// #532 — Year must be plausible (1700-2199) to weed out docket-shape
// strings like `03A01-9103-CH-96` whose middle segment (9103) is a
// docket index that happens to fit 4 digits. Using a tight prefix
// alternation rather than `\d{4}` keeps the regex anchored.
const PLAUSIBLE_YEAR = String.raw`(?:1[789]\d{2}|2[01]\d{2})`

// #532 — Docket prefixes (`Case No.`, `Cause No.`, `Docket No.`, `No.`)
// are followed by a sequence of `<word>-<word>-<word>` tokens that
// looks identical to a hyphenated neutral cite. We negative-lookbehind
// for the docket prefix so the neutral pattern declines to match in
// that context. The Case/Cause/Docket variants are explicit; bare `No.`
// is left alone because legitimate neutral cites are sometimes
// introduced as `held in No. 2010-NMSC-007`.
const NOT_AFTER_DOCKET_PREFIX = String.raw`(?<!(?:Case|Cause|Docket)\s+No\.\s+[A-Za-z0-9-]{0,40})`

export const neutralPatterns: Pattern[] = [
  {
    // Mississippi 4-segment form: year-caseType-number-appellateTrack. Listed
    // before the 3-segment hyphenated pattern so it wins on the longer match
    // (e.g., "2010-CT-01234-SCT"). (#233)
    id: "state-vendor-neutral-hyphenated-ms",
    regex: new RegExp(
      `${NOT_AFTER_DOCKET_PREFIX}\\b(${PLAUSIBLE_YEAR})-([A-Z]+)-(\\d+)-([A-Z]+)\\b`,
      "g",
    ),
    description:
      'Mississippi 4-segment vendor-neutral (e.g., "2010-CT-01234-SCT", "2015-CA-00567-COA")',
    type: "neutral",
  },
  {
    // 3-segment hyphenated form used by NM (NMSC, NMCA, NMCERT), Ohio
    // (mixed-case "Ohio" token), and NC (NCSC, NCCOA). The court token starts
    // with an uppercase letter and may contain lowercase (so the Ohio token
    // matches). (#233)
    id: "state-vendor-neutral-hyphenated",
    regex: new RegExp(
      `${NOT_AFTER_DOCKET_PREFIX}\\b(${PLAUSIBLE_YEAR})-([A-Z][A-Za-z]+)-(\\d+)\\b`,
      "g",
    ),
    description:
      'Hyphenated vendor-neutral (e.g., "2010-NMSC-007", "2024-Ohio-764", "2020-NCSC-118")',
    type: "neutral",
  },
  {
    // Multi-word neutral courts (#230). Alternation order matters — longer,
    // more specific patterns must precede the bare `[A-Z]{2}` fallback so the
    // regex prefers the more specific match:
    //   - `IL App (Nst)` — Illinois Rule 23 form with district parenthetical
    //     (districts 1st / 2d / 3d / 4th / 5th)
    //   - `OK CIV APP|CR|AG` — Oklahoma multi-word courts
    //   - `[A-Z]{2}(?:\s+App\.?)?` — existing single-word + optional App fallback
    // The trailing `(-U)?` captures Illinois Rule 23 unpublished marker; the
    // extractor consumes it into the `unpublished` flag and strips it from
    // `documentNumber`.
    id: "state-vendor-neutral",
    regex:
      /\b(\d{4})\s+(IL\s+App\s+\(\d+(?:st|nd|rd|th|d)\)|OK\s+(?:CIV\s+APP|CR|AG)|[A-Z]{2}(?:\s+App\.?)?)\s+(\d+(?:-U)?)\b/g,
    description:
      'State vendor-neutral citations (e.g., "2007 UT 49", "2017 WI 17", "2013 IL 112116", "2011 IL App (1st) 101234", "2020 OK CIV APP 67", "2020 IL App (2d) 190123-U")',
    type: "neutral",
  },
  {
    // NY Slip Op vendor-neutral citations (#692). Official NY neutral form
    // `2024 NY Slip Op 51234`, with an optional `(U)` / `(UV)` / `[U]`
    // unpublished marker, and the period variant `N.Y. Slip Op.`. "NY Slip Op"
    // is also a known reporter, so without this neutral pattern the form is
    // captured by the reporter-backed case path and mis-typed as `case`. Lives
    // in the neutral bucket, which outranks `casePatterns` during dedup, so the
    // neutral token subsumes the competing case token. PLAUSIBLE_YEAR keeps the
    // leading number anchored to a real year (the volume-shaped `100 NY Slip Op`
    // form is malformed and intentionally not matched).
    id: "ny-slip-op",
    regex: new RegExp(
      `\\b(${PLAUSIBLE_YEAR})\\s+N\\.?Y\\.?\\s+Slip\\s+Op\\.?\\s+(\\d+)(\\((?:U|UV)\\)|\\[U\\])?`,
      "g",
    ),
    description:
      'NY Slip Op vendor-neutral citations (e.g., "2024 NY Slip Op 51234", "2020 NY Slip Op 51234(U)", "2023 N.Y. Slip Op. 03165")',
    type: "neutral",
  },
  {
    id: "westlaw",
    regex: /\b(\d{4})\s+WL\s+(\d+)\b/g,
    description: 'WestLaw citations (e.g., "2021 WL 123456")',
    type: "neutral",
  },
  {
    // Tax Court Memorandum decisions — `T.C. Memo. 2002-89` (#324). Format
    // is `T.C. Memo. YYYY-NNN` where YYYY is the year and NNN is the
    // sequential decision number within that year. Treated as a neutral
    // citation because year acts as the volume identifier.
    id: "tc-memo",
    regex: /\bT\.\s?C\.\s+Memo\.\s+(\d{4})-(\d+)\b/g,
    description:
      'Tax Court Memorandum decisions (e.g., "T.C. Memo. 2002-89", "T.C. Memo. 1970-86") — #324',
    type: "neutral",
  },
  {
    // Generalized to accept any uppercase-prefixed court abbreviation before
    // LEXIS so state variants (Cal. LEXIS, Tex. App. LEXIS, N.Y. Misc. LEXIS,
    // Ill. App. LEXIS, etc.) tokenize alongside the federal U.S. forms (#228).
    // The non-greedy `[A-Z][A-Za-z.\s]+?` is bounded by the literal `\s+LEXIS`
    // that follows it, so it can't run away.
    id: "lexis",
    regex: /\b(\d{4})\s+[A-Z][A-Za-z.\s]+?\s+LEXIS\s+(\d+)\b/g,
    description:
      'LexisNexis citations (federal: "2021 U.S. LEXIS 5000", "2021 U.S. App. LEXIS 12345"; state: "2020 Cal. LEXIS 1000", "2020 Tex. App. LEXIS 5000")',
    type: "neutral",
  },
  {
    // Accepts both the canonical abbreviated form (`Pub. L. No. 116-283`,
    // `Pub. L. 116-283`) and the spelled-out form (`Public Law 116-127`,
    // `Public Law No. 116-127`). #533
    id: "public-law",
    regex: /\b(?:Pub\.\s?L\.|Public\s+Law)(?:\s?No\.)?\s?(\d+-\d+)\b/g,
    description:
      'Public Law citations: "Pub. L. No. 117-58", "Pub. L. 116-283", "Public Law 116-127", "Public Law No. 116-127"',
    type: "publicLaw",
  },
  {
    id: "federal-register",
    // Page accepts comma-grouped digits (`12,345` and `1,234,567`). The
    // Federal Register routinely surfaces pages above 10,000 so the
    // comma-grouped form is common. Bare-digit form remains supported.
    regex: /\b(\d+(?:-\d+)?)\s+Fed\.\s?Reg\.\s+(\d{1,3}(?:,\d{3})+|\d+)\b/g,
    description: 'Federal Register citations (e.g., "86 Fed. Reg. 12,345" or "86 Fed. Reg. 12345")',
    type: "federalRegister",
  },
  {
    id: "statutes-at-large",
    // Page accepts comma-grouped digits to match the federal-register fix.
    regex: /\b(\d+(?:-\d+)?)\s+Stat\.\s+(\d{1,3}(?:,\d{3})+|\d+)\b/g,
    description: 'Statutes at Large citations (e.g., "124 Stat. 1,119" or "124 Stat. 119")',
    type: "statutesAtLarge",
  },
  {
    id: "compact-law-review",
    regex: /\b(\d+(?:-\d+)?)\s+([A-Z][A-Za-z.]+L\.(?:Rev|J|Q)\.)\s+(\d+)\b/g,
    description: 'Compact law review citations without spaces (e.g., "93 Harv.L.Rev. 752")',
    type: "journal",
  },
]
