import type { ExtractionFeatures, ResolutionFeatures } from "./features"
import type { ReasonCode } from "./types"

function caseReasons(f: Extract<ExtractionFeatures, { type: "case" }>): ReasonCode[] {
  const r: ReasonCode[] = []
  if (f.knownReporter) r.push("known_reporter")
  if (!f.knownReporter) r.push("reporter_unknown")
  if (f.reporterAmbiguous) r.push("reporter_ambiguous")
  if (f.yearPlausible) r.push("year_plausible")
  if (!f.yearPresent) r.push("missing_year")
  if (f.caseNamePresent) r.push("case_name_present")
  if (!f.caseNamePresent) r.push("missing_case_name")
  if (f.courtIdentified) r.push("court_identified")
  if (!f.courtIdentified) r.push("missing_court")
  if (f.blankPage) r.push("blank_page")
  return r
}

function idReasons(f: Extract<ExtractionFeatures, { type: "id" }>): ReasonCode[] {
  const r: ReasonCode[] = []
  if (f.lowercase) r.push("lowercase_id")
  if (f.typoComma) r.push("typo_punctuation")
  if (!f.inCitationContext) r.push("mid_sentence_id")
  return r
}

function extractionReasons(f: ExtractionFeatures): ReasonCode[] {
  switch (f.type) {
    case "case":
      return caseReasons(f)
    case "id":
      return idReasons(f)
    case "supra":
      return []
    case "shortFormCase":
      return f.knownReporter ? ["known_reporter"] : ["reporter_unknown"]
    case "statute":
      return []
    case "constitutional":
      return []
    case "journal":
      return []
    case "neutral":
      return []
    case "publicLaw":
      return []
    case "federalRegister":
      return []
    case "statutesAtLarge":
      return []
    case "docket":
      return []
  }
}

function resolutionReasons(r: ResolutionFeatures): ReasonCode[] {
  const out: ReasonCode[] = []
  if (!r.inScope) out.push("no_antecedent_in_scope")
  if (r.exactMatch) out.push("exact_antecedent_match")
  if (!r.exactMatch && r.similarity < 1.0 && r.similarity > 0) out.push("fuzzy_party_match")
  if (r.windowMismatch) out.push("ambiguous_id_window")
  return out
}

export function collectReasonCodes(
  features: ExtractionFeatures,
  resolution?: ResolutionFeatures,
): ReasonCode[] {
  return [...extractionReasons(features), ...(resolution ? resolutionReasons(resolution) : [])]
}
