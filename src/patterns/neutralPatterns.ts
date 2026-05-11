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

export const neutralPatterns: Pattern[] = [
  {
    // Mississippi 4-segment form: year-caseType-number-appellateTrack. Listed
    // before the 3-segment hyphenated pattern so it wins on the longer match
    // (e.g., "2010-CT-01234-SCT"). (#233)
    id: "state-vendor-neutral-hyphenated-ms",
    regex: /\b(\d{4})-([A-Z]+)-(\d+)-([A-Z]+)\b/g,
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
    regex: /\b(\d{4})-([A-Z][A-Za-z]+)-(\d+)\b/g,
    description:
      'Hyphenated vendor-neutral (e.g., "2010-NMSC-007", "2024-Ohio-764", "2020-NCSC-118")',
    type: "neutral",
  },
  {
    id: "state-vendor-neutral",
    regex: /\b(\d{4})\s+([A-Z]{2}(?:\s+App\.?)?)\s+(\d+)\b/g,
    description:
      'State vendor-neutral citations (e.g., "2007 UT 49", "2017 WI 17", "2013 IL 112116")',
    type: "neutral",
  },
  {
    id: "westlaw",
    regex: /\b(\d{4})\s+WL\s+(\d+)\b/g,
    description: 'WestLaw citations (e.g., "2021 WL 123456")',
    type: "neutral",
  },
  {
    id: "lexis",
    regex: /\b(\d{4})\s+U\.S\.(?:\s+(?:App|Dist)\.)?\s+LEXIS\s+(\d+)\b/g,
    description:
      'LexisNexis citations (e.g., "2021 U.S. LEXIS 5000", "2021 U.S. App. LEXIS 12345", "2021 U.S. Dist. LEXIS 67890")',
    type: "neutral",
  },
  {
    id: "public-law",
    regex: /\bPub\.\s?L\.(?:\s?No\.)?\s?(\d+-\d+)\b/g,
    description: 'Public Law citations (e.g., "Pub. L. No. 117-58" or "Pub. L. 116-283")',
    type: "publicLaw",
  },
  {
    id: "federal-register",
    regex: /\b(\d+(?:-\d+)?)\s+Fed\.\s?Reg\.\s+(\d+)\b/g,
    description: 'Federal Register citations (e.g., "86 Fed. Reg. 12345")',
    type: "federalRegister",
  },
  {
    id: "statutes-at-large",
    regex: /\b(\d+(?:-\d+)?)\s+Stat\.\s+(\d+)\b/g,
    description: 'Statutes at Large citations (e.g., "124 Stat. 119")',
    type: "statutesAtLarge",
  },
  {
    id: "compact-law-review",
    regex: /\b(\d+(?:-\d+)?)\s+([A-Z][A-Za-z.]+L\.(?:Rev|J|Q)\.)\s+(\d+)\b/g,
    description: 'Compact law review citations without spaces (e.g., "93 Harv.L.Rev. 752")',
    type: "journal",
  },
]
