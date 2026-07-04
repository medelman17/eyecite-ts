/**
 * Session-Law Citation Extractor (#350, #779)
 *
 * Parses California (`Stats. …`) and Nevada (`… Nev. Stat. …`) session laws
 * into the `sessionLaw` type. Jurisdiction and compilation code are keyed off
 * the matching pattern id; section/page captures are re-parsed for single /
 * list / range forms.
 *
 * @module extract/extractSessionLaw
 */

import { CitationParseError } from "./errors"
import { CA_SESSION_LAW_RE, NV_SESSION_LAW_RE } from "@/patterns/sessionLawPatterns"
import type { Token } from "@/tokenize/tokenizer"
import type { SessionLawCitation } from "@/types/citation"
import { resolveOriginalSpan, type TransformationMap } from "@/types/span"

type SectionFields = Pick<SessionLawCitation, "section" | "sections" | "sectionRange">
type PageFields = Pick<SessionLawCitation, "page" | "pageRange">

const RANGE_RE = /^(\d+)\s*-\s*(\d+)$/

/** Parse a raw section capture: `"2"` → single, `"6, 7, 8"` → list, `"25-26"` → range. */
function parseSections(raw: string | undefined): SectionFields {
  if (!raw) return {}
  const trimmed = raw.trim()
  const range = RANGE_RE.exec(trimmed)
  if (range) return { sectionRange: { start: range[1]!, end: range[2]! }, section: range[1] }
  if (trimmed.includes(",")) {
    const sections = trimmed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    return { sections, section: sections[0] }
  }
  return { section: trimmed }
}

/** Parse a raw page capture: `"3523"` → single, `"3038-3039"` → range. */
function parsePages(raw: string | undefined): PageFields {
  if (!raw) return {}
  const trimmed = raw.trim()
  const range = RANGE_RE.exec(trimmed)
  if (range) return { pageRange: { start: range[1]!, end: range[2]! }, page: range[1] }
  return { page: trimmed }
}

export function extractSessionLaw(
  token: Token,
  transformationMap: TransformationMap,
): SessionLawCitation {
  const { text, span, patternId } = token
  const isNv = patternId === "nv-session-law"
  const match = (isNv ? NV_SESSION_LAW_RE : CA_SESSION_LAW_RE).exec(text)
  if (!match) {
    throw new CitationParseError(`Failed to parse session-law citation: ${text}`)
  }

  const year = Number.parseInt(match[1]!, 10)
  const chapter = match[2]!
  const sectionFields = parseSections(match[3])
  const pageFields = parsePages(match[4])

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  return {
    type: "sessionLaw",
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
    jurisdiction: isNv ? "NV" : "CA",
    code: isNv ? "Nev. Stat." : "Stats.",
    year,
    chapter,
    ...sectionFields,
    ...pageFields,
  }
}
