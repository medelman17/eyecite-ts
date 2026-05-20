import type { FootnoteMap } from "./types"

/** Separator line pattern: 5+ dashes or underscores on their own line. */
const SEPARATOR_RE = /^\s*[-_]{5,}\s*$/m

/**
 * A "strong" separator (long enough to clearly be a footnote section
 * divider rather than a decorative rule or signature delimiter).
 * 8+ dashes/underscores typically marks an intentional footnote boundary.
 */
const STRONG_SEPARATOR_LEN = 8

/**
 * For short separators (5..7 chars), require them to appear at least this
 * fraction of the way into the document.  Signature blocks (`-----`,
 * decorative rules) almost always sit near the top or middle of a document
 * trailing a short closing — they will not pass this gate, eliminating the
 * false positives in #541.  Long separators (`STRONG_SEPARATOR_LEN+` chars)
 * bypass this check, so existing short-fixture tests with `----------`
 * continue to work.
 */
const MIN_SHORT_SEPARATOR_OFFSET_RATIO = 0.25

/**
 * Source pattern for footnote markers at line start.
 *
 * Captures the footnote number from whichever group matches. Anchored at
 * column 0 (no leading whitespace tolerated): indented `  1. ` / `  2. `
 * sub-list items inside a footnote body would otherwise be misread as new
 * markers, splitting a single footnote into multiple zones (#540).
 *
 * The `(\d+)\.\s+\S` alternative requires the digit-period marker to be
 * followed by whitespace and non-whitespace on the same logical chunk.
 * This rejects heading-style `1.\n\n` lines (#541).
 *
 * Created as a fresh RegExp per call to avoid shared mutable lastIndex state.
 */
const MARKER_SRC =
  /^(?:FN\s*(\d+)[.\s:)]|\[(\d+)\]\s|n\.\s*(\d+)\s|(\d+)\.\s+\S)/gm.source

/**
 * Pattern for an ALL-CAPS section heading on its own line, optionally
 * followed by blank lines and prose. Used to detect the end of a footnote
 * region when post-footnote body content resumes (#539).
 *
 * - Heading line: 2+ uppercase words, may include spaces, ampersands,
 *   colons, digits — but no leading whitespace and no lowercase letters.
 * - Must be preceded by a blank line (anchored via the surrounding scan).
 */
const POST_FOOTNOTE_HEADING_RE = /^[A-Z][A-Z0-9 &:'.-]{3,}$/m

/**
 * Detect footnote zones in plain text using separator + marker heuristics.
 *
 * Strategy: find a separator line, then parse numbered markers in the text
 * that follows. Each footnote zone extends from its marker to the start
 * of the next marker. The final zone is capped at the next clear
 * post-footnote boundary (separator line, ALL-CAPS heading after a blank
 * line, or end of text) to avoid swallowing body content that follows the
 * footnote section (#539).
 *
 * @param text - Raw text (not cleaned -- needs newlines intact)
 * @returns FootnoteMap with zones in input-text coordinates, sorted by start position
 */
export function detectTextFootnotes(text: string): FootnoteMap {
  const sepMatch = SEPARATOR_RE.exec(text)
  if (!sepMatch) return []

  // #541: short separators (5..7 chars) are often signature-block or
  // decorative rules.  Require them to appear at least 25% into the
  // document to plausibly demarcate a footnote section.  Strong (8+ char)
  // separators bypass this gate.
  const separatorBody = sepMatch[0].replace(/\s/g, "")
  if (separatorBody.length < STRONG_SEPARATOR_LEN) {
    const minOffset = Math.floor(text.length * MIN_SHORT_SEPARATOR_OFFSET_RATIO)
    if (sepMatch.index < minOffset) return []
  }

  const sectionOffset = sepMatch.index + sepMatch[0].length

  const footnoteSection = text.slice(sectionOffset)

  // Fresh regex per call to avoid shared mutable lastIndex state
  const markerRe = new RegExp(MARKER_SRC, "gm")
  const markers: { index: number; footnoteNumber: number }[] = []
  let match: RegExpExecArray | null

  while ((match = markerRe.exec(footnoteSection)) !== null) {
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
    let end: number
    if (i + 1 < markers.length) {
      end = markers[i + 1].index
    } else {
      // #539: cap final zone at the next clear "end of footnote section"
      // signal so we don't swallow post-footnote body prose.
      end = findFootnoteSectionEnd(text, start)
    }

    zones.push({
      start,
      end,
      footnoteNumber: markers[i].footnoteNumber,
    })
  }

  return zones
}

/**
 * Find where the footnote section ends after the marker at `markerStart`.
 *
 * Walks the lines after the marker's first line and looks for any of:
 *  - a separator line (`-----` / `_____`, 5+ chars)
 *  - a blank line followed by an ALL-CAPS heading line
 *
 * Returns the earliest such boundary position, or `text.length` if none found.
 */
function findFootnoteSectionEnd(text: string, markerStart: number): number {
  // Skip past the marker's own line so we don't terminate immediately on it.
  const firstLineEnd = text.indexOf("\n", markerStart)
  if (firstLineEnd < 0) return text.length
  const scanFrom = firstLineEnd + 1
  if (scanFrom >= text.length) return text.length

  // Walk line by line from scanFrom.
  let lineStart = scanFrom
  let prevBlank = false
  while (lineStart < text.length) {
    const nl = text.indexOf("\n", lineStart)
    const lineEnd = nl < 0 ? text.length : nl
    const raw = text.slice(lineStart, lineEnd)
    const trimmed = raw.trim()

    // Separator line — boundary is the start of this line.
    if (/^[-_]{5,}$/.test(trimmed)) {
      return lineStart
    }

    // Blank-line + ALL-CAPS heading — boundary is the start of the blank line.
    if (prevBlank && trimmed !== "" && POST_FOOTNOTE_HEADING_RE.test(trimmed)) {
      // The previous line was blank, so this current line is the heading.
      // Boundary should be the start of the blank line (one line back).
      const blankLineStart = previousLineStart(text, lineStart)
      return blankLineStart
    }

    prevBlank = trimmed === ""
    if (nl < 0) break
    lineStart = nl + 1
  }

  return text.length
}

/**
 * Return the start index of the line that ends at `currentLineStart - 1`.
 */
function previousLineStart(text: string, currentLineStart: number): number {
  if (currentLineStart <= 0) return 0
  // currentLineStart points to the char right after a `\n`.  The previous
  // line's `\n` is at currentLineStart - 1.  Walk back to find the `\n`
  // before that, then add 1.
  const prevNl = text.lastIndexOf("\n", currentLineStart - 2)
  return prevNl < 0 ? 0 : prevNl + 1
}
