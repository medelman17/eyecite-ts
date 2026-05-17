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
} as const

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
