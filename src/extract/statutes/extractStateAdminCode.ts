/**
 * State Administrative Codes — `NMAC`, `OAR`, `COMAR`, `IDAPA`, `ARM`
 *
 * Five state administrative-code families, each with its own
 * hierarchical-section format. NMAC and ARM are postfix; OAR, COMAR,
 * IDAPA are prefix. #438
 *
 * @module extract/statutes/extractStateAdminCode
 */

import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, type TransformationMap } from "@/types/span"

interface AdminCodeMatch {
  code: string
  section: string
  jurisdiction: string
}

function parseAdminCode(text: string): AdminCodeMatch | undefined {
  // NMAC postfix: `19.25.13.27 NMAC`
  let m = /^(\d+\.\d+\.\d+\.\d+(?:\([A-Z]\))?)\s+NMAC$/.exec(text)
  if (m) return { code: "NMAC", section: m[1], jurisdiction: "NM" }
  // NMAC prefix (rare but valid)
  m = /^NMAC\s+(\d+\.\d+\.\d+\.\d+(?:\([A-Z]\))?)$/.exec(text)
  if (m) return { code: "NMAC", section: m[1], jurisdiction: "NM" }
  // OAR prefix: `OAR 734-050-0050`
  m = /^OAR\s+(\d+-\d+-\d+)$/.exec(text)
  if (m) return { code: "OAR", section: m[1], jurisdiction: "OR" }
  // COMAR prefix: `COMAR 20.32.01.04F`
  m = /^COMAR\s+(\d+\.\d+\.\d+\.\d+[A-Z]?)$/.exec(text)
  if (m) return { code: "COMAR", section: m[1], jurisdiction: "MD" }
  // IDAPA prefix: `IDAPA 58.01.03.004.03`
  m = /^IDAPA\s+(\d+\.\d+\.\d+\.\d+\.\d+)$/.exec(text)
  if (m) return { code: "IDAPA", section: m[1], jurisdiction: "ID" }
  // ARM postfix: `26.3.142(6), ARM`
  m = /^(\d+\.\d+\.\d+(?:\(\d+\))?),\s+ARM$/.exec(text)
  if (m) return { code: "ARM", section: m[1], jurisdiction: "MT" }
  return undefined
}

export function extractStateAdminCode(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  const parsed = parseAdminCode(text)
  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)
  const spans: StatuteComponentSpans = {}

  return {
    type: "statute",
    text,
    span: { cleanStart: span.cleanStart, cleanEnd: span.cleanEnd, originalStart, originalEnd },
    confidence: 0.95,
    matchedText: text,
    processTimeMs: 0,
    patternsChecked: 1,
    code: parsed?.code ?? text,
    section: parsed?.section ?? "",
    jurisdiction: parsed?.jurisdiction,
    spans,
  }
}
