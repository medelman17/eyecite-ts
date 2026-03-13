/**
 * Known statutory code registry for abbreviated-code jurisdictions
 *
 * Provides a registry of state statutory codes that use abbreviated
 * citation forms (e.g., "R.C. § 1.01", "MCL 750.83"). Used by the
 * citation extractor to identify and normalize state statute citations.
 */

/**
 * A single entry in the known codes registry.
 *
 * PA has two entries (Pa.C.S. and P.S.) because it has two distinct
 * code families with separate abbreviation sets.
 */
export interface CodeEntry {
  /** Two-letter state abbreviation (e.g., "OH", "MI") */
  jurisdiction: string
  /** Short canonical abbreviation used internally (e.g., "RC", "MCL") */
  abbreviation: string
  /** All recognized text patterns that identify this code */
  patterns: string[]
  /** Citation family — always "abbreviated" for this registry */
  family: 'abbreviated'
}

/**
 * Registry of state statutory codes that use abbreviated citation forms.
 *
 * Covers 12 jurisdictions. Pennsylvania has two entries because it
 * maintains two distinct code families (Pa.C.S. and P.S.).
 *
 * Note: Short 2-letter patterns (GS, IC, PS, RC, FS) may produce false positives
 * in non-legal text (e.g., "GS 5" for government service grade). The extraction
 * layer mitigates this via confidence scoring — citations without a § symbol receive
 * lower confidence (0.85 vs 0.95). Consumers should filter by confidence threshold.
 */
export const abbreviatedCodes: CodeEntry[] = [
  {
    jurisdiction: 'FL',
    abbreviation: 'STAT',
    family: 'abbreviated',
    patterns: [
      'Fla. Stat.', 'Fla Stat', 'Fla. Stat. Ann.', 'F.S.', 'FS',
    ],
  },
  {
    jurisdiction: 'OH',
    abbreviation: 'RC',
    family: 'abbreviated',
    patterns: [
      'R.C.', 'RC', 'O.R.C.', 'ORC', 'Ohio Rev. Code', 'Ohio Rev. Code Ann.',
    ],
  },
  {
    jurisdiction: 'MI',
    abbreviation: 'MCL',
    family: 'abbreviated',
    patterns: [
      'MCL', 'M.C.L.', 'Mich. Comp. Laws', 'Mich. Comp. Laws Ann.', 'Mich. Comp. Laws Serv.', 'MCLA', 'MCLS',
    ],
  },
  {
    jurisdiction: 'UT',
    abbreviation: 'UC',
    family: 'abbreviated',
    patterns: [
      'Utah Code', 'Utah Code Ann.', 'U.C.A.', 'UCA',
    ],
  },
  {
    jurisdiction: 'CO',
    abbreviation: 'CRS',
    family: 'abbreviated',
    patterns: [
      'C.R.S.', 'CRS', 'Colo. Rev. Stat.', 'Colo. Rev. Stat. Ann.',
    ],
  },
  {
    jurisdiction: 'WA',
    abbreviation: 'RCW',
    family: 'abbreviated',
    patterns: [
      'RCW', 'Wash. Rev. Code', 'Wash. Rev. Code Ann.',
    ],
  },
  {
    jurisdiction: 'NC',
    abbreviation: 'GS',
    family: 'abbreviated',
    patterns: [
      'G.S.', 'GS', 'N.C. Gen. Stat.', 'N.C. Gen. Stat. Ann.', 'N.C.G.S.', 'NCGS',
    ],
  },
  {
    jurisdiction: 'GA',
    abbreviation: 'OCGA',
    family: 'abbreviated',
    patterns: [
      'O.C.G.A.', 'OCGA', 'Ga. Code', 'Ga. Code Ann.',
    ],
  },
  {
    jurisdiction: 'PA',
    abbreviation: 'PaCS',
    family: 'abbreviated',
    patterns: [
      'Pa.C.S.', 'Pa.C.S.A.', 'Pa. C.S.', 'Pa. C.S.A.', 'Pa. Cons. Stat.',
    ],
  },
  {
    jurisdiction: 'PA',
    abbreviation: 'PS',
    family: 'abbreviated',
    patterns: [
      'P.S.', 'PS',
    ],
  },
  {
    jurisdiction: 'IN',
    abbreviation: 'IC',
    family: 'abbreviated',
    patterns: [
      'Ind. Code', 'Ind. Code Ann.', 'Indiana Code', 'Indiana Code Ann.', 'I.C.', 'IC', 'Burns Ind. Code', 'Burns Ind. Code Ann.',
    ],
  },
  {
    jurisdiction: 'NJ',
    abbreviation: 'NJSA',
    family: 'abbreviated',
    patterns: [
      'N.J.S.A.', 'NJSA', 'N.J.S.', 'NJS',
    ],
  },
  {
    jurisdiction: 'DE',
    abbreviation: 'DelC',
    family: 'abbreviated',
    patterns: [
      'Del. C.', 'Del C', 'Del. Code', 'Del. Code Ann.',
    ],
  },
]

/**
 * Build a case-insensitive lookup index from pattern → CodeEntry.
 * Exact match first; prefix fallback is handled in findAbbreviatedCode.
 */
const _byPattern = new Map<string, CodeEntry>()
for (const entry of abbreviatedCodes) {
  for (const pattern of entry.patterns) {
    _byPattern.set(pattern.toLowerCase(), entry)
  }
}

/**
 * Find a CodeEntry by an abbreviated text token.
 *
 * Lookup order:
 * 1. Exact case-insensitive match against all patterns
 * 2. Prefix match — returns the entry whose pattern is the longest
 *    prefix of `abbrevText` (handles tokens like "RCW" inside longer text)
 *
 * @param abbrevText - The abbreviation token to look up
 * @returns Matching CodeEntry, or undefined if not found
 *
 * @example
 * findAbbreviatedCode('R.C.')   // → OH entry
 * findAbbreviatedCode('MCL')    // → MI entry
 * findAbbreviatedCode('UNKNOWN') // → undefined
 */
export function findAbbreviatedCode(abbrevText: string): CodeEntry | undefined {
  const lower = abbrevText.toLowerCase()

  // 1. Exact match
  const exact = _byPattern.get(lower)
  if (exact) return exact

  // 2. Prefix fallback — find the longest pattern that is a prefix of abbrevText
  let bestMatch: CodeEntry | undefined
  let bestLen = 0
  for (const [pattern, entry] of _byPattern) {
    if (lower.startsWith(pattern) && pattern.length > bestLen) {
      bestMatch = entry
      bestLen = pattern.length
    }
  }
  return bestMatch
}
