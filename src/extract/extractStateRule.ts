/**
 * State Court Rule Extraction (#636)
 *
 * Resolves a tokenized state-rule citation into a `StateRuleCitation`.
 * The jurisdiction + ruleSet are inferred from the patternId emitted by
 * `stateRulePatterns` so a single extractor handles every supported
 * state without re-parsing the rule-set anchor.
 *
 * @module extract/extractStateRule
 */

import type { Token } from "@/tokenize"
import type { StateRuleCitation } from "@/types/citation"
import type { FederalRuleComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"

interface PatternMeta {
  jurisdiction: string
  ruleSet: StateRuleCitation["ruleSet"]
  /** Anchored regex used to parse the rule body — must capture (1) rule
   * with optional subsection chain so spanFromGroupIndex can locate it. */
  re: RegExp
}

const PATTERN_META: Record<string, PatternMeta> = {
  "id-rcp": {
    jurisdiction: "ID",
    ruleSet: "civil",
    re: /^I\.R\.C\.P\.\s+(\d+(?:\.\d+)?(?:\([^)]*\))*)$/d,
  },
  "id-rcp-spelled": {
    jurisdiction: "ID",
    ruleSet: "civil",
    re: /^Idaho\s+Rules?\s+of\s+Civil\s+Procedure\s+(\d+(?:\.\d+)?(?:\([^)]*\))*)$/id,
  },
  "nc-rap": {
    jurisdiction: "NC",
    ruleSet: "appellate",
    re: /^N\.\s?C\.\s?R\.\s?App\.\s?P\.\s+(\d+(?:\.\d+)?(?:\([^)]*\))*)$/d,
  },
  "nc-rcp": {
    jurisdiction: "NC",
    ruleSet: "civil",
    re: /^N\.\s?C\.\s?R\.\s?Civ\.\s?P\.\s+(\d+(?:\.\d+)?(?:\([^)]*\))*)$/d,
  },
  "sc-scacr-postfix": {
    jurisdiction: "SC",
    ruleSet: "appellate",
    re: /^Rule\s+(\d+(?:\.\d+)?(?:\([^)]*\))*),\s*SCACR$/d,
  },
  rcfc: {
    jurisdiction: "CFC",
    ruleSet: "civil",
    re: /^RCFC\s+(\d+(?:\.\d+)?(?:\([^)]*\))*)$/d,
  },
}

/** Split a captured rule body into bare rule + subsection chain. */
function splitRule(body: string): { rule: string; subsection?: string } {
  const m = /^(\d+(?:\.\d+)?)((?:\([^)]*\))*)$/.exec(body)
  if (!m) return { rule: body }
  return { rule: m[1], subsection: m[2] || undefined }
}

export function extractStateRule(
  token: Token,
  transformationMap: TransformationMap,
): StateRuleCitation {
  const { text, span } = token
  const meta = PATTERN_META[token.patternId]
  if (!meta) {
    throw new Error(`extractStateRule called with unknown patternId: ${token.patternId}`)
  }
  const match = meta.re.exec(text)
  if (!match) {
    throw new Error(`extractStateRule: token text does not match ${token.patternId}: ${text}`)
  }
  const body = match[1]
  const { rule, subsection } = splitRule(body)

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  let spans: FederalRuleComponentSpans | undefined
  if (match.indices) {
    const ruleIdx = match.indices[1]
    if (ruleIdx) {
      spans = {
        rule: spanFromGroupIndex(
          span.cleanStart,
          [ruleIdx[0], ruleIdx[0] + rule.length],
          transformationMap,
        ),
      }
      if (subsection) {
        spans.subsection = spanFromGroupIndex(
          span.cleanStart,
          [ruleIdx[0] + rule.length, ruleIdx[1]],
          transformationMap,
        )
      }
    }
  }

  // Confidence: closed alternations + mandatory trailing rule number =
  // 0.95 base. Match parity with extractFederalRule.
  let confidence = 0.95
  if (subsection) confidence += 0.05
  confidence = Math.min(confidence, 1.0)

  return {
    type: "stateRule",
    text,
    span: { cleanStart: span.cleanStart, cleanEnd: span.cleanEnd, originalStart, originalEnd },
    confidence,
    matchedText: text,
    processTimeMs: 0,
    patternsChecked: 1,
    jurisdiction: meta.jurisdiction,
    ruleSet: meta.ruleSet,
    rule,
    subsection,
    spans,
  }
}
