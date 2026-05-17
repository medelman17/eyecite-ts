/**
 * computeAxes — maps ExtractionFeatures (+ optional ResolutionFeatures) to
 * the three axes of the Confidence struct. Pure function; no I/O.
 *
 * - extraction: P(this is a real citation), per pattern-id (uncalibrated here).
 * - metadata: fraction of expected fields populated.
 * - resolution: only when ResolutionFeatures provided.
 */

import type { ExtractionFeatures, ResolutionFeatures } from "./features"
import {
  CASE_WEIGHTS,
  CONSTITUTIONAL_WEIGHTS,
  DOCKET_WEIGHTS,
  FEDERAL_REGISTER_WEIGHTS,
  ID_WEIGHTS,
  JOURNAL_WEIGHTS,
  NEUTRAL_WEIGHTS,
  PUBLIC_LAW_WEIGHTS,
  RESOLUTION_WEIGHTS,
  SHORTFORM_CASE_WEIGHTS,
  STATUTE_PATTERN_OVERRIDES,
  STATUTE_WEIGHTS,
  STATUTES_AT_LARGE_WEIGHTS,
  SUPRA_WEIGHTS,
} from "./weights"

export interface Axes {
  extraction: number
  metadata: number
  resolution?: number
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const round2 = (x: number) => Math.round(x * 100) / 100

function caseExtraction(f: Extract<ExtractionFeatures, { type: "case" }>): number {
  let s: number = CASE_WEIGHTS.base
  if (f.knownReporter) s += CASE_WEIGHTS.knownReporter
  if (f.reporterAmbiguous) s += CASE_WEIGHTS.reporterAmbiguous
  if (f.yearPlausible) s += CASE_WEIGHTS.yearPlausible
  if (f.caseNamePresent) s += CASE_WEIGHTS.caseNamePresent
  if (f.courtIdentified) s += CASE_WEIGHTS.courtIdentified
  s = clamp01(s)
  if (f.blankPage) s = Math.max(s, CASE_WEIGHTS.blankPageFloor)
  return round2(s)
}

function idExtraction(f: Extract<ExtractionFeatures, { type: "id" }>): number {
  let s: number = ID_WEIGHTS.base
  if (f.lowercase) s = Math.min(s, ID_WEIGHTS.lowercase)
  if (f.hasComma) s = Math.min(s, ID_WEIGHTS.hasComma)
  if (f.typoComma) s = Math.min(s, ID_WEIGHTS.typoComma)
  if (!f.inCitationContext) s = Math.min(s, ID_WEIGHTS.notInCitationContext)
  return round2(s)
}

function supraExtraction(f: Extract<ExtractionFeatures, { type: "supra" }>): number {
  if (f.bracketed && f.partyName) return SUPRA_WEIGHTS.bracketedWithParty
  if (f.bracketed) return SUPRA_WEIGHTS.bracketedNoParty
  if (f.partyName) return SUPRA_WEIGHTS.partyName
  return SUPRA_WEIGHTS.standalone
}

function shortFormCaseExtraction(
  f: Extract<ExtractionFeatures, { type: "shortFormCase" }>,
): number {
  if (f.patternId === "bare-party-back-ref") return SHORTFORM_CASE_WEIGHTS.barePartyBackRef
  let s: number = SHORTFORM_CASE_WEIGHTS.base
  if (f.knownReporter) s += SHORTFORM_CASE_WEIGHTS.knownReporter
  return round2(clamp01(s))
}

function statuteExtraction(f: Extract<ExtractionFeatures, { type: "statute" }>): number {
  // Chapter-act (Illinois ILCS): parseable → 0.95, else → 0.3; +0.05 subsection.
  if (f.patternId === "chapter-act") {
    let s: number = f.parseable
      ? STATUTE_WEIGHTS.chapterActParseable
      : STATUTE_WEIGHTS.chapterActUnparseable
    if (f.subsectionPresent) s += STATUTE_WEIGHTS.subsectionPresent
    return round2(clamp01(s))
  }
  // Unparseable fallback for all other state-statute patterns.
  if (!f.parseable) return STATUTE_WEIGHTS.unparseable
  // Abbreviated-code: branches on (knownCode × hasSectionSymbol); +0.05 title; +0.05 subsection.
  if (f.patternId === "abbreviated-code") {
    let s: number
    if (f.knownCode && f.hasSectionSymbol) s = STATUTE_WEIGHTS.knownCodeWithSymbol
    else if (f.knownCode) s = STATUTE_WEIGHTS.knownCodeNoSymbol
    else if (f.hasSectionSymbol) s = STATUTE_WEIGHTS.unknownCodeWithSymbol
    else s = STATUTE_WEIGHTS.unknownCodeNoSymbol
    if (f.titlePresent) s += STATUTE_WEIGHTS.titlePresent
    if (f.subsectionPresent) s += STATUTE_WEIGHTS.subsectionPresent
    return round2(clamp01(s))
  }
  // Named-code / mass-chapter: branches on knownCode (proxy for jurisdiction match); +0.05 subsection.
  if (f.patternId === "named-code" || f.patternId === "mass-chapter") {
    let s: number = f.knownCode
      ? STATUTE_WEIGHTS.jurisdictionKnown
      : STATUTE_WEIGHTS.jurisdictionUnknown
    if (f.subsectionPresent) s += STATUTE_WEIGHTS.subsectionPresent
    return round2(clamp01(s))
  }
  const override = STATUTE_PATTERN_OVERRIDES[f.patternId]
  if (override !== undefined) return override
  if (f.patternId === "usc" || f.patternId === "cfr" || f.patternId === "irc") {
    let s: number = STATUTE_WEIGHTS.federalBase
    if (f.titlePresent) s += STATUTE_WEIGHTS.titlePresent
    if (f.subsectionPresent) s += STATUTE_WEIGHTS.subsectionPresent
    return round2(clamp01(s))
  }
  let s: number = STATUTE_WEIGHTS.base
  if (f.knownCode) s += STATUTE_WEIGHTS.knownCode
  return round2(clamp01(s))
}

function constitutionalExtraction(
  f: Extract<ExtractionFeatures, { type: "constitutional" }>,
): number {
  if (f.patternId === "bare-article") return CONSTITUTIONAL_WEIGHTS.bareArticle
  if (f.patternId === "bare-constitution") return CONSTITUTIONAL_WEIGHTS.bareConstitution
  if (f.hasSection) return CONSTITUTIONAL_WEIGHTS.withSection
  return CONSTITUTIONAL_WEIGHTS.default
}

function extractionAxis(f: ExtractionFeatures): number {
  switch (f.type) {
    case "case":
      return caseExtraction(f)
    case "id":
      return idExtraction(f)
    case "supra":
      return supraExtraction(f)
    case "shortFormCase":
      return shortFormCaseExtraction(f)
    case "statute":
      return statuteExtraction(f)
    case "constitutional":
      return constitutionalExtraction(f)
    case "journal":
      return JOURNAL_WEIGHTS.base
    case "neutral":
      return NEUTRAL_WEIGHTS.base
    case "publicLaw":
      return PUBLIC_LAW_WEIGHTS.base
    case "federalRegister":
      return FEDERAL_REGISTER_WEIGHTS.base
    case "statutesAtLarge":
      return STATUTES_AT_LARGE_WEIGHTS.base
    case "docket":
      return DOCKET_WEIGHTS.base
  }
}

function metadataAxis(f: ExtractionFeatures): number {
  if (f.type === "case") {
    if (f.metadataExpected === 0) return 1.0
    return round2(f.metadataPopulated / f.metadataExpected)
  }
  // Short-forms and flat-confidence types have no metadata signal of their own.
  return 1.0
}

function resolutionAxis(r: ResolutionFeatures): number {
  if (r.patternId === "id-resolution") {
    if (r.windowMismatch) return RESOLUTION_WEIGHTS.idWindowMismatch
    return RESOLUTION_WEIGHTS.idExact
  }
  if (r.patternId === "supra-resolution") {
    // Resolver's similarity is already a [0..1] score; use directly.
    return round2(r.similarity)
  }
  // shortform-resolution
  return r.similarity > 0 ? RESOLUTION_WEIGHTS.shortFormWithParty : RESOLUTION_WEIGHTS.shortFormBare
}

export function computeAxes(f: ExtractionFeatures, r?: ResolutionFeatures): Axes {
  const axes: Axes = {
    extraction: extractionAxis(f),
    metadata: metadataAxis(f),
  }
  if (r) axes.resolution = resolutionAxis(r)
  return axes
}
