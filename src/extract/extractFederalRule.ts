/**
 * Federal Rules of Procedure Extraction (#576)
 *
 * Parses tokenized federal-rule citations into the `federalRule` citation
 * type. Handles both abbreviated (`Fed. R. Civ. P. 56`) and spelled-out
 * (`Federal Rule of Civil Procedure 56`) forms and routes them to a
 * normalized `ruleSet` discriminator.
 *
 * @module extract/extractFederalRule
 */

import type { Token } from "@/tokenize"
import type { FederalRuleCitation } from "@/types/citation"
import type { FederalRuleComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"

/**
 * Map of normalized rule-set tokens (lowercased, periods AND whitespace
 * stripped) to their canonical discriminator.
 *
 * Stripping whitespace too means both spaced (`Civ. P.`) and compact
 * (`Civ.P.`) forms collapse to the same lookup key (`civp`). The
 * spelled-out form (`Civil Procedure`) becomes `civilprocedure`.
 */
const RULE_SET_MAP: ReadonlyMap<string, FederalRuleCitation["ruleSet"]> = new Map([
  ["civp", "civil"],
  ["civilprocedure", "civil"],
  ["crimp", "criminal"],
  ["criminalprocedure", "criminal"],
  ["evid", "evidence"],
  ["evidence", "evidence"],
  ["appp", "appellate"],
  ["appellateprocedure", "appellate"],
  ["bankrp", "bankruptcy"],
  ["bankruptcyprocedure", "bankruptcy"],
  // Acronym forms (#696). Both bare (`FRCP`) and dotted (`F.R.C.P.`)
  // normalize via the period-and-space strip to the same lowercase key.
  ["frcp", "civil"],
  ["frcrp", "criminal"],
  ["fre", "evidence"],
  ["frap", "appellate"],
  ["frbp", "bankruptcy"],
])

/**
 * Normalize a captured rule-set token to its canonical form for lookup.
 * Strips periods AND all whitespace so spaced (`Civ. P.`) and compact
 * (`Civ.P.`) forms produce the same key. Lowercased for case-insensitive
 * lookup.
 */
function normalizeRuleSet(raw: string): string {
  return raw.toLowerCase().replace(/[\s.]/g, "")
}

/**
 * Split a captured rule-plus-subsection body (e.g. `12(b)(6)`) into the
 * bare rule number and the trailing subsection chain.
 *
 * @returns Tuple of `[rule, subsection?]`. `subsection` is `undefined` when
 * the body has no parenthesized suffix.
 */
function splitRuleAndSubsection(body: string): [string, string | undefined] {
  const parenIdx = body.indexOf("(")
  if (parenIdx === -1) return [body, undefined]
  const rule = body.slice(0, parenIdx)
  const subsection = body.slice(parenIdx)
  return [rule, subsection]
}

/**
 * Extract a `federalRule` citation from a tokenized federal-rule match.
 *
 * The token text is one of two shapes — abbreviated (`Fed. R. Civ. P. 56`)
 * or spelled-out (`Federal Rule of Civil Procedure 56`) — both of which
 * the pattern layer captures as `(ruleSet, body)`. The extractor:
 *
 * 1. Re-runs the matching regex with the `d` flag to obtain group indices
 *    for component spans.
 * 2. Normalizes the captured rule-set token (`Civ. P.` → `civil`).
 * 3. Splits the body into rule number + optional subsection chain.
 * 4. Returns a `FederalRuleCitation` with confidence `0.95` (the format is
 *    standardized and unambiguous).
 */
export function extractFederalRule(
  token: Token,
  transformationMap: TransformationMap,
): FederalRuleCitation {
  const { text, span } = token

  // Try the abbreviated form first (more common), then spelled-out,
  // then acronym (#696).
  const abbreviatedRegex =
    /\bFed\.\s?R\.\s?(Civ\.\s?P\.|Crim\.\s?P\.|Evid\.|App\.\s?P\.|Bankr\.\s?P\.)\s+(\d+(?:\.\d+)?(?:\([^)]*\))*)/d
  const spelledRegex =
    /\bFederal\s+Rules?\s+of\s+(?:the\s+)?(Civil\s+Procedure|Criminal\s+Procedure|Evidence|Appellate\s+Procedure|Bankruptcy\s+Procedure)\s+(\d+(?:\.\d+)?(?:\([^)]*\))*)/di
  const acronymRegex =
    /\b(FRCP|FRE|FRAP|FRCrP|FRBP|F\.\s?R\.\s?C\.\s?P\.|F\.\s?R\.\s?E\.|F\.\s?R\.\s?A\.\s?P\.|F\.\s?R\.\s?Cr\.\s?P\.|F\.\s?R\.\s?B\.\s?P\.)\s+(\d+(?:\.\d+)?(?:\([^)]*\))*)/d

  const match =
    abbreviatedRegex.exec(text) ?? spelledRegex.exec(text) ?? acronymRegex.exec(text)
  if (!match) {
    throw new Error(`Failed to parse federal rule citation: ${text}`)
  }

  const rawRuleSet = match[1]
  const normalized = normalizeRuleSet(rawRuleSet)
  const ruleSet = RULE_SET_MAP.get(normalized)
  if (!ruleSet) {
    throw new Error(`Unrecognized federal rule set: "${rawRuleSet}" → "${normalized}"`)
  }

  const [rule, subsection] = splitRuleAndSubsection(match[2])

  let spans: FederalRuleComponentSpans | undefined
  if (match.indices) {
    const ruleSetIndex = match.indices[1]
    const bodyIndex = match.indices[2]
    if (ruleSetIndex && bodyIndex) {
      spans = {
        ruleSet: spanFromGroupIndex(span.cleanStart, ruleSetIndex, transformationMap),
      }
      // Rule sub-span — bodyIndex covers `rule(subsection)`. Split it.
      const parenIdx = match[2].indexOf("(")
      if (parenIdx === -1) {
        spans.rule = spanFromGroupIndex(span.cleanStart, bodyIndex, transformationMap)
      } else {
        const [bodyStart, bodyEnd] = bodyIndex
        spans.rule = spanFromGroupIndex(
          span.cleanStart,
          [bodyStart, bodyStart + parenIdx],
          transformationMap,
        )
        spans.subsection = spanFromGroupIndex(
          span.cleanStart,
          [bodyStart + parenIdx, bodyEnd],
          transformationMap,
        )
      }
    }
  }

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  return {
    type: "federalRule",
    text,
    span: {
      cleanStart: span.cleanStart,
      cleanEnd: span.cleanEnd,
      originalStart,
      originalEnd,
    },
    confidence: 0.95,
    matchedText: text,
    processTimeMs: 0,
    patternsChecked: 1,
    ruleSet,
    rule,
    subsection,
    spans,
  }
}
