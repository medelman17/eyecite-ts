import { describe, expect, it } from "vitest"
import {
  CitationParseError,
  extractAnnotation,
  extractCanon,
  extractFederalRule,
  extractLegislativeMaterial,
  extractLocalOrdinance,
  extractRestatement,
  extractSessionLaw,
  extractTreatise,
  extractTreaty,
} from "@/extract"
import { extractBankruptcyCode } from "@/extract/statutes/extractBankruptcyCode"
import { extractUssg } from "@/extract/statutes/extractUssg"
import type { Token } from "@/tokenize"
import { createIdentityMap } from "../helpers/transformationMap"

// #881 contract: when an extractor's internal re-parse regex rejects the token,
// it must throw CitationParseError (the sentinel) — not a bare Error — so the
// orchestrator can decline the candidate instead of crashing the document.
// These extractors had no throw-branch test; the others are covered in
// branchCoverage.test.ts / their own suites.
const GARBAGE = "zzz not a citation zzz"
const tok = (patternId: string): Token => ({
  text: GARBAGE,
  span: { cleanStart: 0, cleanEnd: GARBAGE.length },
  type: "case", // routing type is irrelevant — each extractor is called directly
  patternId,
})

const CASES: Array<[string, () => unknown]> = [
  ["canon", () => extractCanon(tok("canon"), createIdentityMap())],
  ["restatement", () => extractRestatement(tok("restatement"), createIdentityMap())],
  ["annotation", () => extractAnnotation(tok("annotation"), createIdentityMap())],
  ["sessionLaw", () => extractSessionLaw(tok("sessionLaw"), createIdentityMap())],
  ["localOrdinance", () => extractLocalOrdinance(tok("localOrdinance"), createIdentityMap())],
  ["federalRule", () => extractFederalRule(tok("federalRule"), createIdentityMap())],
  ["treatise", () => extractTreatise(tok("treatise"), createIdentityMap())],
  ["ussg", () => extractUssg(tok("ussg"), createIdentityMap())],
  ["bankruptcyCode", () => extractBankruptcyCode(tok("bankruptcyCode"), createIdentityMap())],
  // Two-throw extractors: patternId selects which internal parse runs.
  ["treaty (volume-page)", () => extractTreaty(tok("treaty-volume-page"), createIdentityMap())],
  ["treaty (series-no)", () => extractTreaty(tok("treaty-series-no"), createIdentityMap())],
  ["legmat (cong-rec)", () => extractLegislativeMaterial(tok("legmat-cong-rec"), createIdentityMap())],
  ["legmat (report)", () => extractLegislativeMaterial(tok("legmat-report"), createIdentityMap())],
]

describe("every extractor throws CitationParseError on an unparseable token (#881)", () => {
  for (const [name, fn] of CASES) {
    it(name, () => {
      expect(fn).toThrow(CitationParseError)
    })
  }
})
