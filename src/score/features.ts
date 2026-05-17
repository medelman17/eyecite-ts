/**
 * ExtractionFeatures — flat records of booleans + small numbers, one shape per
 * citation type. Extractors emit these instead of doing scoring math themselves.
 */

export interface CaseFeatures {
  type: "case"
  patternId: string
  knownReporter: boolean
  reporterAmbiguous: boolean
  yearPresent: boolean
  yearPlausible: boolean
  caseNamePresent: boolean
  courtIdentified: boolean
  blankPage: boolean
  metadataExpected: number
  metadataPopulated: number
}

export interface IdFeatures {
  type: "id"
  patternId: "id-citation"
  lowercase: boolean
  hasComma: boolean
  typoComma: boolean
  inCitationContext: boolean
}

export interface SupraFeatures {
  type: "supra"
  patternId: "supra"
  partyName: boolean
  bracketed: boolean
  standalone: boolean
}

export interface ShortFormCaseFeatures {
  type: "shortFormCase"
  patternId: "short-form-case" | "bare-party-back-ref"
  knownReporter: boolean
  partyNameMatch: boolean // populated post-resolution; false at extraction time
}

export interface StatuteFeatures {
  type: "statute"
  patternId: string
  knownCode: boolean
  titlePresent: boolean
  subsectionPresent: boolean
  parseable: boolean // false → unparseable fallback path
}

export interface ConstitutionalFeatures {
  type: "constitutional"
  patternId: "us-constitution" | "state-constitution" | "bare-constitution" | "bare-article"
  hasSection: boolean
}

export interface JournalFeatures {
  type: "journal"
  patternId: "journal"
}

export interface NeutralFeatures {
  type: "neutral"
  patternId: string
}

export interface PublicLawFeatures {
  type: "publicLaw"
  patternId: "public-law"
}

export interface FederalRegisterFeatures {
  type: "federalRegister"
  patternId: "federal-register"
}

export interface StatutesAtLargeFeatures {
  type: "statutesAtLarge"
  patternId: "statutes-at-large"
}

export interface DocketFeatures {
  type: "docket"
  patternId: string
}

export type ExtractionFeatures =
  | CaseFeatures
  | IdFeatures
  | SupraFeatures
  | ShortFormCaseFeatures
  | StatuteFeatures
  | ConstitutionalFeatures
  | JournalFeatures
  | NeutralFeatures
  | PublicLawFeatures
  | FederalRegisterFeatures
  | StatutesAtLargeFeatures
  | DocketFeatures

/**
 * Resolution-axis features. Emitted by the resolver, not the extractor.
 * Used to compute axes.resolution; not part of ExtractionFeatures.
 */
export interface ResolutionFeatures {
  patternId: "id-resolution" | "supra-resolution" | "shortform-resolution"
  exactMatch: boolean
  similarity: number // 0..1; for fuzzy-match resolvers
  windowMismatch: boolean // id-resolution only — case-name window check failed
  inScope: boolean
}
