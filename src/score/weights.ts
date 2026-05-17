/**
 * Hand-rolled scoring weights per citation type. Mirror the current per-extractor
 * additive scoring; centralized here so the math lives in one place.
 *
 * Future: replace with learned LR weights (same feature vectors, weights from
 * training on labeled corpus). See spec §"Hand-rolled vs learned weights".
 */

import type { ExtractionFeatures } from "./features"

export const CASE_WEIGHTS = {
  base: 0.2,
  knownReporter: 0.3,
  reporterAmbiguous: -0.1, // soft penalty
  yearPlausible: 0.2,
  caseNamePresent: 0.15,
  courtIdentified: 0.1,
  blankPageFloor: 0.5,
} as const

export const ID_WEIGHTS = {
  // Multiplicative caps — current code uses Math.min(confidence, X) pattern
  base: 1.0,
  lowercase: 0.85,
  hasComma: 0.9,
  typoComma: 0.7,
  notInCitationContext: 0.4,
} as const

export const SUPRA_WEIGHTS = {
  partyName: 0.9,
  bracketedWithParty: 0.9,
  bracketedNoParty: 0.8,
  standalone: 0.8,
} as const

export const SHORTFORM_CASE_WEIGHTS = {
  base: 0.4,
  knownReporter: 0.3,
  barePartyBackRef: 0.85, // detectBarePartyBackReferences flat assignment
} as const

export const STATUTE_WEIGHTS = {
  // legacy path
  base: 0.5,
  knownCode: 0.3,
  unparseable: 0.3,
  // federal path
  federalBase: 0.95,
  titlePresent: 0.05,
  subsectionPresent: 0.05,
  // Conditional state-statute paths (abbreviated-code, named-code,
  // mass-chapter, chapter-act). These mirror the pre-migration branching:
  //   abbreviated: codeEntry+§ → 0.95, codeEntry → 0.85, § → 0.6, neither → 0.4
  //   named-code/mass-chapter: jurisdiction → 0.95, else → 0.5
  //   chapter-act: parseable → 0.95, else → 0.3
  // `subsectionPresent` (+0.05) and `titlePresent` (+0.05) layered on top.
  knownCodeWithSymbol: 0.95,
  knownCodeNoSymbol: 0.85,
  unknownCodeWithSymbol: 0.6,
  unknownCodeNoSymbol: 0.4,
  jurisdictionKnown: 0.95,
  jurisdictionUnknown: 0.5,
  chapterActParseable: 0.95,
  chapterActUnparseable: 0.3,
} as const

/**
 * Per-pattern statute confidence overrides. Many state-statute extractors
 * historically assigned a single hard-coded confidence value (e.g., 0.9 for
 * fl-statute, 0.95 for ca-bare-code). To preserve exact behavior during the
 * Phase 2 migration, those values live here, keyed by patternId.
 *
 * Phase 3 will replace these with calibrated values from labeled data.
 */
export const STATUTE_PATTERN_OVERRIDES: Record<string, number> = {
  // NOTE: `abbreviated-code`, `named-code`, `mass-chapter`, and `chapter-act`
  // intentionally OMITTED — those extractors emit conditional features
  // (knownCode, hasSectionSymbol, parseable, subsectionPresent) and are
  // scored discriminatively in axes.ts. Adding overrides here would
  // short-circuit that branching.

  // Alabama pre-1975 Code (extractAlaCode1940.ts) — shared 0.95 base
  // across all three patternIds.
  "ala-code-prefix": 0.95,
  "ala-title-trailer": 0.95,
  "ala-tit-bare": 0.95,

  // California bare-code (extractCaBareCode.ts).
  "ca-bare-code": 0.95,

  // Colorado Revised Statutes prose form (extractColoradoProse.ts).
  "colorado-prose": 0.9,

  // Florida statutes (extractFloridaStatute.ts) — both patternIds share 0.95.
  "florida-postfix": 0.95,
  "florida-prefix-spelled": 0.95,

  // Georgia pre-1983 Code (extractGaPre1983.ts).
  "ga-pre-1983": 0.85,

  // Indiana Code year-edition (extractIcYearEdition.ts).
  "ic-year-edition": 0.95,

  // Idaho postfix (extractIdahoPostfix.ts).
  "idaho-postfix": 0.95,

  // Illinois Revised Statutes (extractIllRevStat.ts).
  "ill-rev-stat": 0.95,

  // Kansas Statutes Annotated year-edition (extractKsaYearEdition.ts).
  "ksa-year-edition": 0.95,

  // Montana Code Annotated postfix (extractMcaPostfix.ts).
  "mca-postfix": 0.95,

  // Maryland article-letter codes (extractMdArticleLetter.ts).
  "md-article-letter": 0.95,

  // Minnesota Statutes year-edition (extractMinnStYearEdition.ts).
  "minn-st-year-edition": 0.95,

  // New Mexico bare-section (extractNmBareSection.ts).
  "nm-bare-section": 0.9,

  // New York bare named-code (extractNyBareLaw.ts).
  "ny-bare-named-code": 0.9,

  // Ohio Revised Code chapter form (extractOhChapter.ts).
  "oh-chapter": 0.95,

  // Oregon Revised Statutes chapter form (extractOrsChapter.ts).
  "ors-chapter": 0.95,

  // Prose-form federal citations (extractProse.ts).
  prose: 0.85,

  // Washington RCW chapter postfix (extractRcwChapterPostfix.ts).
  "rcw-chapter-postfix": 0.95,

  // Rhode Island General Laws 1956 (extractRigl1956.ts).
  "rigl-1956": 0.95,

  // Revised Laws of Hawaii (extractRlh.ts).
  rlh: 0.95,

  // Nebraska Reissue Revised Statutes 1943 (extractRrs1943.ts).
  "rrs-1943": 0.95,

  // New Hampshire RSA chapter (extractRsaChapter.ts).
  "rsa-chapter": 0.95,

  // State administrative codes (extractStateAdminCode.ts).
  "state-admin-code": 0.95,

  // Tennessee Code Annotated postfix (extractTcaPostfix.ts).
  "tca-postfix": 0.95,

  // Virginia bare Code (extractVaBareCode.ts).
  "va-bare-code": 0.9,

  // Wisconsin Statutes postfix (extractWiStatsPostfix.ts).
  "wi-stats-postfix": 0.95,

  // West Virginia historical Code 1931 (extractWvCode1931.ts).
  "wv-code-1931": 0.9,
}

export const CONSTITUTIONAL_WEIGHTS = {
  bareArticle: 0.5,
  bareConstitution: 0.7,
  withSection: 0.95,
  default: 0.9,
} as const

export const JOURNAL_WEIGHTS = { base: 0.6 } as const
export const NEUTRAL_WEIGHTS = { base: 1.0 } as const
export const PUBLIC_LAW_WEIGHTS = { base: 0.9 } as const
export const FEDERAL_REGISTER_WEIGHTS = { base: 0.9 } as const
export const STATUTES_AT_LARGE_WEIGHTS = { base: 0.9 } as const
export const DOCKET_WEIGHTS = { base: 0.7 } as const

export const RESOLUTION_WEIGHTS = {
  // ID resolution — DocumentResolver.ts:545,637
  idExact: 1.0,
  idWindowMismatch: 0.75,
  // Supra resolution — DocumentResolver.ts:700 (similarity-based)
  supraSimilarityBase: 1.0,
  // Short-form case resolution — DocumentResolver.ts:760,768
  shortFormWithParty: 0.98,
  shortFormBare: 0.95,
} as const

type WeightsTable =
  | typeof CASE_WEIGHTS
  | typeof ID_WEIGHTS
  | typeof SUPRA_WEIGHTS
  | typeof SHORTFORM_CASE_WEIGHTS
  | typeof STATUTE_WEIGHTS
  | typeof CONSTITUTIONAL_WEIGHTS
  | typeof JOURNAL_WEIGHTS
  | typeof NEUTRAL_WEIGHTS
  | typeof PUBLIC_LAW_WEIGHTS
  | typeof FEDERAL_REGISTER_WEIGHTS
  | typeof STATUTES_AT_LARGE_WEIGHTS
  | typeof DOCKET_WEIGHTS

export function getWeights(type: ExtractionFeatures["type"]): WeightsTable {
  switch (type) {
    case "case":
      return CASE_WEIGHTS
    case "id":
      return ID_WEIGHTS
    case "supra":
      return SUPRA_WEIGHTS
    case "shortFormCase":
      return SHORTFORM_CASE_WEIGHTS
    case "statute":
      return STATUTE_WEIGHTS
    case "constitutional":
      return CONSTITUTIONAL_WEIGHTS
    case "journal":
      return JOURNAL_WEIGHTS
    case "neutral":
      return NEUTRAL_WEIGHTS
    case "publicLaw":
      return PUBLIC_LAW_WEIGHTS
    case "federalRegister":
      return FEDERAL_REGISTER_WEIGHTS
    case "statutesAtLarge":
      return STATUTES_AT_LARGE_WEIGHTS
    case "docket":
      return DOCKET_WEIGHTS
  }
}
