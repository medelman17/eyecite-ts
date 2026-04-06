/**
 * Known statutory code registry for abbreviated-code jurisdictions
 *
 * Provides a registry of state statutory codes that use abbreviated
 * citation forms (e.g., "R.C. § 1.01", "MCL 750.83"). Used by the
 * citation extractor to identify and normalize state statute citations.
 */

import { stateStatuteEntries } from "./stateStatutes"

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
  /** Citation family — determines which citation pattern family this belongs to */
  family: "federal" | "named" | "abbreviated" | "chapterAct" | "prose"
}

/**
 * Registry of state statutory codes that use abbreviated citation forms.
 * Derived from stateStatuteEntries — the single source of truth.
 *
 * Note: Short 2-letter patterns (AS, GS, IC, OS, PS, RC, FS, WS) may produce
 * false positives in non-legal text. The extraction layer mitigates this via
 * confidence scoring — citations without a § symbol receive lower confidence
 * (0.85 vs 0.95). Consumers should filter by confidence threshold.
 */
export const abbreviatedCodes: CodeEntry[] = stateStatuteEntries.map((entry) => ({
  jurisdiction: entry.jurisdiction,
  abbreviation: entry.abbreviations[entry.abbreviations.length - 1],
  family: "abbreviated" as const,
  patterns: entry.abbreviations,
}))

/**
 * Registry of state statutory codes that use named-code citation forms.
 *
 * Named-code jurisdictions identify their code by name in citations (e.g.,
 * "N.Y. Penal Law § 120.05", "Cal. Civ. Proc. Code § 437c"), rather than by
 * a standalone abbreviation. The jurisdiction prefix is handled by the
 * extraction layer; these patterns cover only the code name portion.
 *
 * Ordering note: within each jurisdiction, more specific patterns must come
 * before more general ones (e.g., "Civ. Proc." before "Civ.") so that
 * findNamedCode's longest-match wins correctly.
 *
 * Covers 7 jurisdictions: NY (21 entries), CA (29 entries), TX (29 entries),
 * MD (36 entries), VA (1 entry), AL (1 entry), MA (1 entry).
 */
export const namedCodes: CodeEntry[] = [
  // ── New York (21 entries) ──────────────────────────────────────────────────
  {
    jurisdiction: "NY",
    abbreviation: "CPLR",
    family: "named",
    patterns: ["C.P.L.R.", "CPLR", "Civ. Prac. L. & R.", "Civil Practice Law & Rules"],
  },
  {
    jurisdiction: "NY",
    abbreviation: "CPL",
    family: "named",
    patterns: ["Crim. Proc.", "Criminal Procedure"],
  },
  {
    jurisdiction: "NY",
    abbreviation: "GBS",
    family: "named",
    patterns: ["Gen. Bus.", "General Business"],
  },
  {
    jurisdiction: "NY",
    abbreviation: "GOB",
    family: "named",
    patterns: ["Gen. Oblig.", "General Obligations"],
  },
  {
    jurisdiction: "NY",
    abbreviation: "PEN",
    family: "named",
    patterns: ["Penal"],
  },
  {
    jurisdiction: "NY",
    abbreviation: "ISC",
    family: "named",
    patterns: ["Ins.", "Insurance"],
  },
  {
    jurisdiction: "NY",
    abbreviation: "LAB",
    family: "named",
    patterns: ["Lab.", "Labor"],
  },
  {
    jurisdiction: "NY",
    abbreviation: "RPL",
    family: "named",
    patterns: ["Real Prop.", "Real Property"],
  },
  {
    jurisdiction: "NY",
    abbreviation: "EXC",
    family: "named",
    patterns: ["Exec.", "Executive"],
  },
  {
    jurisdiction: "NY",
    abbreviation: "JUD",
    family: "named",
    patterns: ["Jud.", "Judiciary"],
  },
  {
    jurisdiction: "NY",
    abbreviation: "SCP",
    family: "named",
    patterns: ["Surr. Ct. Proc.", "Surrogate's Court Procedure"],
  },
  {
    jurisdiction: "NY",
    abbreviation: "CVR",
    family: "named",
    patterns: ["Civ. Rights", "Civil Rights"],
  },
  {
    jurisdiction: "NY",
    abbreviation: "CVP",
    family: "named",
    patterns: ["Civ. Prac.", "Civil Practice"],
  },
  {
    jurisdiction: "NY",
    abbreviation: "EDN",
    family: "named",
    patterns: ["Educ.", "Education"],
  },
  {
    jurisdiction: "NY",
    abbreviation: "TAX",
    family: "named",
    patterns: ["Tax"],
  },
  {
    jurisdiction: "NY",
    abbreviation: "PBH",
    family: "named",
    patterns: ["Pub. Health", "Public Health"],
  },
  {
    jurisdiction: "NY",
    abbreviation: "SOS",
    family: "named",
    patterns: ["Soc. Serv.", "Social Services"],
  },
  {
    jurisdiction: "NY",
    abbreviation: "ELN",
    family: "named",
    patterns: ["Elec.", "Election"],
  },
  {
    jurisdiction: "NY",
    abbreviation: "ENV",
    family: "named",
    patterns: ["Env. Conserv.", "Environmental Conservation"],
  },
  {
    jurisdiction: "NY",
    abbreviation: "BNK",
    family: "named",
    patterns: ["Bank.", "Banking"],
  },
  {
    jurisdiction: "NY",
    abbreviation: "DRL",
    family: "named",
    patterns: ["Dom. Rel.", "Domestic Relations"],
  },

  // ── California (29 entries) ────────────────────────────────────────────────
  // CRITICAL: more specific patterns must come before general ones
  // (e.g., CCP "Civ. Proc." before CIV "Civ.")
  {
    jurisdiction: "CA",
    abbreviation: "CCP",
    family: "named",
    patterns: ["Civ. Proc.", "Civil Procedure"],
  },
  {
    jurisdiction: "CA",
    abbreviation: "BPC",
    family: "named",
    patterns: ["Bus. & Prof.", "Business & Professions"],
  },
  {
    jurisdiction: "CA",
    abbreviation: "HSC",
    family: "named",
    patterns: ["Health & Saf.", "Health & Safety"],
  },
  {
    jurisdiction: "CA",
    abbreviation: "RTC",
    family: "named",
    patterns: ["Rev. & Tax.", "Revenue & Taxation"],
  },
  {
    jurisdiction: "CA",
    abbreviation: "FGC",
    family: "named",
    patterns: ["Fish & Game"],
  },
  {
    jurisdiction: "CA",
    abbreviation: "FAC",
    family: "named",
    patterns: ["Food & Agric.", "Food & Agricultural"],
  },
  {
    jurisdiction: "CA",
    abbreviation: "HNC",
    family: "named",
    patterns: ["Harb. & Nav.", "Harbors & Navigation"],
  },
  {
    jurisdiction: "CA",
    abbreviation: "MVC",
    family: "named",
    patterns: ["Mil. & Vet.", "Military & Veterans"],
  },
  {
    jurisdiction: "CA",
    abbreviation: "PCC",
    family: "named",
    patterns: ["Pub. Cont.", "Public Contract", "Public Contracts"],
  },
  {
    jurisdiction: "CA",
    abbreviation: "PRC",
    family: "named",
    patterns: ["Pub. Res.", "Public Resources"],
  },
  {
    jurisdiction: "CA",
    abbreviation: "PUC",
    family: "named",
    patterns: ["Pub. Util.", "Public Utilities"],
  },
  {
    jurisdiction: "CA",
    abbreviation: "SHC",
    family: "named",
    patterns: ["Sts. & High.", "Streets & Highways"],
  },
  {
    jurisdiction: "CA",
    abbreviation: "UIC",
    family: "named",
    patterns: ["Unemp. Ins.", "Unemployment Insurance"],
  },
  {
    jurisdiction: "CA",
    abbreviation: "WIC",
    family: "named",
    patterns: ["Welf. & Inst.", "Welfare & Institutions"],
  },
  {
    jurisdiction: "CA",
    abbreviation: "CIV",
    family: "named",
    patterns: ["Civ.", "Civil"],
  },
  {
    jurisdiction: "CA",
    abbreviation: "COM",
    family: "named",
    patterns: ["Com.", "Commercial"],
  },
  {
    jurisdiction: "CA",
    abbreviation: "CORP",
    family: "named",
    patterns: ["Corp.", "Corporations"],
  },
  {
    jurisdiction: "CA",
    abbreviation: "EDC",
    family: "named",
    patterns: ["Educ.", "Education"],
  },
  {
    jurisdiction: "CA",
    abbreviation: "ELEC",
    family: "named",
    patterns: ["Elec.", "Elections"],
  },
  {
    jurisdiction: "CA",
    abbreviation: "EVID",
    family: "named",
    patterns: ["Evid.", "Evidence"],
  },
  {
    jurisdiction: "CA",
    abbreviation: "FAM",
    family: "named",
    patterns: ["Fam.", "Family"],
  },
  {
    jurisdiction: "CA",
    abbreviation: "FIN",
    family: "named",
    patterns: ["Fin.", "Financial"],
  },
  {
    jurisdiction: "CA",
    abbreviation: "GOV",
    family: "named",
    patterns: ["Gov.", "Government"],
  },
  {
    jurisdiction: "CA",
    abbreviation: "INS",
    family: "named",
    patterns: ["Ins.", "Insurance"],
  },
  {
    jurisdiction: "CA",
    abbreviation: "LAB",
    family: "named",
    patterns: ["Lab.", "Labor"],
  },
  {
    jurisdiction: "CA",
    abbreviation: "PEN",
    family: "named",
    patterns: ["Penal"],
  },
  {
    jurisdiction: "CA",
    abbreviation: "PROB",
    family: "named",
    patterns: ["Prob.", "Probate"],
  },
  {
    jurisdiction: "CA",
    abbreviation: "VEH",
    family: "named",
    patterns: ["Veh.", "Vehicle"],
  },
  {
    jurisdiction: "CA",
    abbreviation: "WAT",
    family: "named",
    patterns: ["Wat.", "Water"],
  },

  // ── Texas (30 entries) ────────────────────────────────────────────────────
  {
    jurisdiction: "TX",
    abbreviation: "CP",
    family: "named",
    patterns: ["Civ. Prac. & Rem.", "Civil Practice & Remedies"],
  },
  {
    jurisdiction: "TX",
    abbreviation: "CR",
    family: "named",
    patterns: ["Crim. Proc.", "Code of Criminal Procedure"],
  },
  {
    jurisdiction: "TX",
    abbreviation: "BC",
    family: "named",
    patterns: ["Bus. & Com.", "Business & Commerce"],
  },
  {
    jurisdiction: "TX",
    abbreviation: "BO",
    family: "named",
    patterns: ["Bus. Org.", "Business Organizations"],
  },
  {
    jurisdiction: "TX",
    abbreviation: "HS",
    family: "named",
    patterns: ["Health & Saf.", "Health & Safety"],
  },
  {
    jurisdiction: "TX",
    abbreviation: "HR",
    family: "named",
    patterns: ["Human Res.", "Human Resources"],
  },
  {
    jurisdiction: "TX",
    abbreviation: "LG",
    family: "named",
    patterns: ["Local Gov.", "Local Government"],
  },
  {
    jurisdiction: "TX",
    abbreviation: "NR",
    family: "named",
    patterns: ["Nat. Res.", "Natural Resources"],
  },
  {
    jurisdiction: "TX",
    abbreviation: "PW",
    family: "named",
    patterns: ["Parks & Wild.", "Parks & Wildlife"],
  },
  {
    jurisdiction: "TX",
    abbreviation: "SD",
    family: "named",
    patterns: ["Spec. Dist.", "Special District"],
  },
  {
    jurisdiction: "TX",
    abbreviation: "AL",
    family: "named",
    patterns: ["Alco. Bev.", "Alcoholic Beverage"],
  },
  {
    jurisdiction: "TX",
    abbreviation: "WL",
    family: "named",
    patterns: ["Water"],
  },
  {
    jurisdiction: "TX",
    abbreviation: "CV",
    family: "named",
    patterns: ["Vernon's Civ. Stat.", "Vernon's Civil Statutes"],
  },
  {
    jurisdiction: "TX",
    abbreviation: "GV",
    family: "named",
    patterns: ["Gov't", "Government"],
  },
  {
    jurisdiction: "TX",
    abbreviation: "AG",
    family: "named",
    patterns: ["Agric.", "Agriculture"],
  },
  {
    jurisdiction: "TX",
    abbreviation: "ED",
    family: "named",
    patterns: ["Educ.", "Education"],
  },
  {
    jurisdiction: "TX",
    abbreviation: "EL",
    family: "named",
    patterns: ["Elec.", "Election"],
  },
  {
    jurisdiction: "TX",
    abbreviation: "ES",
    family: "named",
    patterns: ["Est.", "Estates"],
  },
  {
    jurisdiction: "TX",
    abbreviation: "FA",
    family: "named",
    patterns: ["Fam.", "Family"],
  },
  {
    jurisdiction: "TX",
    abbreviation: "FI",
    family: "named",
    patterns: ["Fin.", "Finance"],
  },
  {
    jurisdiction: "TX",
    abbreviation: "IN",
    family: "named",
    patterns: ["Ins.", "Insurance"],
  },
  {
    jurisdiction: "TX",
    abbreviation: "LA",
    family: "named",
    patterns: ["Lab.", "Labor"],
  },
  {
    jurisdiction: "TX",
    abbreviation: "OC",
    family: "named",
    patterns: ["Occup.", "Occupations"],
  },
  {
    jurisdiction: "TX",
    abbreviation: "PE",
    family: "named",
    patterns: ["Penal"],
  },
  {
    jurisdiction: "TX",
    abbreviation: "PB",
    family: "named",
    patterns: ["Prob.", "Probate"],
  },
  {
    jurisdiction: "TX",
    abbreviation: "PR",
    family: "named",
    patterns: ["Prop.", "Property"],
  },
  {
    jurisdiction: "TX",
    abbreviation: "TX",
    family: "named",
    patterns: ["Tax"],
  },
  {
    jurisdiction: "TX",
    abbreviation: "TN",
    family: "named",
    patterns: ["Transp.", "Transportation"],
  },
  {
    jurisdiction: "TX",
    abbreviation: "UT",
    family: "named",
    patterns: ["Util.", "Utilities"],
  },

  // ── Maryland (36 entries) ─────────────────────────────────────────────────
  {
    jurisdiction: "MD",
    abbreviation: "gag",
    family: "named",
    patterns: ["Agric.", "Agriculture"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "gab",
    family: "named",
    patterns: ["Alc. Bev.", "Alcoholic Beverages and Cannabis"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "gbo",
    family: "named",
    patterns: ["Bus. Occ. & Prof.", "Business Occupations and Professions"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "gbr",
    family: "named",
    patterns: ["Bus. Reg.", "Business Regulation"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "gcl",
    family: "named",
    patterns: ["Com. Law", "Commercial Law"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "gca",
    family: "named",
    patterns: ["Corps. & Ass'ns", "Corporations and Associations"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "gcs",
    family: "named",
    patterns: ["Corr. Servs.", "Correctional Services"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "gcj",
    family: "named",
    patterns: ["Cts. & Jud. Proc.", "Courts and Judicial Proceedings"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "gcr",
    family: "named",
    patterns: ["Crim. Law", "Criminal Law"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "gcp",
    family: "named",
    patterns: ["Crim. Proc.", "Criminal Procedure"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "gec",
    family: "named",
    patterns: ["Econ. Dev.", "Economic Development"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "ged",
    family: "named",
    patterns: ["Educ.", "Education"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "gel",
    family: "named",
    patterns: ["Elec. Law", "Election Law"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "gen",
    family: "named",
    patterns: ["Envir.", "Environment"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "get",
    family: "named",
    patterns: ["Est. & Trusts", "Estates and Trusts"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "gfl",
    family: "named",
    patterns: ["Fam. Law", "Family Law"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "gfi",
    family: "named",
    patterns: ["Fin. Inst.", "Financial Institutions"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "ggp",
    family: "named",
    patterns: ["Gen. Prov.", "General Provisions"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "ghg",
    family: "named",
    patterns: ["Health-Gen.", "Health - General"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "gho",
    family: "named",
    patterns: ["Health Occ.", "Health Occupations"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "ghs",
    family: "named",
    patterns: ["Hous. & Cmty. Dev.", "Housing and Community Development"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "ghu",
    family: "named",
    patterns: ["Hum. Servs.", "Human Services"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "gin",
    family: "named",
    patterns: ["Ins.", "Insurance"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "gle",
    family: "named",
    patterns: ["Lab. & Empl.", "Labor and Employment"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "glu",
    family: "named",
    patterns: ["Land Use"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "glg",
    family: "named",
    patterns: ["Local Gov't", "Local Government"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "gnr",
    family: "named",
    patterns: ["Nat. Res.", "Natural Resources"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "gps",
    family: "named",
    patterns: ["Pub. Safety", "Public Safety"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "gpu",
    family: "named",
    patterns: ["PUC", "Public Utilities"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "grp",
    family: "named",
    patterns: ["Real Prop.", "Real Property"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "gsf",
    family: "named",
    patterns: ["State Fin. & Proc.", "State Finance and Procurement"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "gsg",
    family: "named",
    patterns: ["State Gov't", "State Government"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "gsp",
    family: "named",
    patterns: ["State Pers. & Pens.", "State Personnel and Pensions"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "gtg",
    family: "named",
    patterns: ["Tax-Gen.", "Tax - General"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "gtp",
    family: "named",
    patterns: ["Tax-Prop.", "Tax - Property"],
  },
  {
    jurisdiction: "MD",
    abbreviation: "gtr",
    family: "named",
    patterns: ["Transp.", "Transportation"],
  },

  // ── Virginia (1 entry) ────────────────────────────────────────────────────
  {
    jurisdiction: "VA",
    abbreviation: "CODE",
    family: "named",
    patterns: ["Code", "Code Ann."],
  },

  // ── Alabama (1 entry) ─────────────────────────────────────────────────────
  {
    jurisdiction: "AL",
    abbreviation: "CODE",
    family: "named",
    patterns: ["Code", "Code Ann."],
  },

  // ── Massachusetts (1 entry) ───────────────────────────────────────────────
  {
    jurisdiction: "MA",
    abbreviation: "GL",
    family: "named",
    patterns: ["Gen. Laws", "General Laws"],
  },
]

/**
 * Find a CodeEntry by jurisdiction and code name token.
 *
 * Lookup strategy: for each candidate entry in the given jurisdiction,
 * check whether the normalized codeName matches or starts with any of the
 * entry's patterns (case-insensitive). Returns the entry with the longest
 * matching pattern to prefer more specific codes over general ones
 * (e.g., "Civ. Proc." over "Civ.").
 *
 * @param jurisdiction - Two-letter state abbreviation (e.g., "CA", "NY")
 * @param codeName - The code name token to look up (e.g., "Penal", "Civ. Proc.")
 * @returns Matching CodeEntry, or undefined if not found
 *
 * @example
 * findNamedCode('NY', 'Penal')       // → NY PEN entry
 * findNamedCode('CA', 'Civ. Proc.')  // → CA CCP entry (not CA CIV)
 * findNamedCode('MD', 'Crim. Law')   // → MD gcr entry
 * findNamedCode('NY', 'Unknown')     // → undefined
 */
export function findNamedCode(jurisdiction: string, codeName: string): CodeEntry | undefined {
  const normalized = codeName.replace(/\s+/g, " ").trim().toLowerCase()
  const candidates = _byJurisdiction.get(jurisdiction)
  if (!candidates) return undefined

  let bestMatch: CodeEntry | undefined
  let bestLen = 0

  for (const { entry, lower } of candidates) {
    if (normalized === lower || normalized.startsWith(lower)) {
      if (lower.length > bestLen) {
        bestMatch = entry
        bestLen = lower.length
      }
    }
  }
  return bestMatch
}

/**
 * Pre-built index: jurisdiction → array of { entry, lower } for O(1) jurisdiction lookup.
 * Patterns are pre-lowercased to avoid per-call allocations.
 */
const _byJurisdiction = new Map<string, Array<{ entry: CodeEntry; lower: string }>>()
for (const entry of namedCodes) {
  let arr = _byJurisdiction.get(entry.jurisdiction)
  if (!arr) {
    arr = []
    _byJurisdiction.set(entry.jurisdiction, arr)
  }
  for (const pattern of entry.patterns) {
    arr.push({ entry, lower: pattern.toLowerCase() })
  }
}

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
