import type { FootnoteMap } from "./types"

/** Separator line pattern: 5+ dashes or underscores on their own line. */
const SEPARATOR_RE = /^\s*[-_]{5,}\s*$/m

/**
 * Global regex matching any footnote marker at line start.
 * Captures the footnote number from whichever group matches.
 */
const GLOBAL_MARKER_RE =
  /^\s*(?:FN\s*(\d+)[.\s:)]|\[(\d+)\]\s|n\.\s*(\d+)\s|(\d+)\.\s)/gm

/**
 * Detect footnote zones in plain text using separator + marker heuristics.
 *
 * Strategy: find a separator line, then parse numbered markers in the text
 * that follows. Each footnote zone extends from its marker to the start
 * of the next marker (or end of text).
 *
 * @param text - Raw text (not cleaned -- needs newlines intact)
 * @returns FootnoteMap with zones in input-text coordinates, sorted by start position
 */
export function detectTextFootnotes(text: string): FootnoteMap {
  const sepMatch = SEPARATOR_RE.exec(text)
  if (!sepMatch) return []

  const sectionOffset = sepMatch.index + sepMatch[0].length

  const footnoteSection = text.slice(sectionOffset)

  GLOBAL_MARKER_RE.lastIndex = 0
  const markers: { index: number; footnoteNumber: number }[] = []
  let match: RegExpExecArray | null

  while ((match = GLOBAL_MARKER_RE.exec(footnoteSection)) !== null) {
    const numStr = match[1] || match[2] || match[3] || match[4]
    if (!numStr) continue
    markers.push({
      index: match.index + sectionOffset,
      footnoteNumber: Number.parseInt(numStr, 10),
    })
  }

  if (markers.length === 0) return []

  const zones: FootnoteMap = []
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index
    const end = i + 1 < markers.length ? markers[i + 1].index : text.length

    zones.push({
      start,
      end,
      footnoteNumber: markers[i].footnoteNumber,
    })
  }

  return zones
}
