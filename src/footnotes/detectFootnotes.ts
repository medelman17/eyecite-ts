import { detectHtmlFootnotes } from "./htmlDetector"
import { detectTextFootnotes } from "./textDetector"
import type { FootnoteMap } from "./types"

const HAS_HTML_RE = /<[^>]+>/

/**
 * Detect footnote zones in text (HTML or plain text).
 *
 * Strategy: if the input contains HTML tags, try HTML structural detection
 * first. If that yields no results (HTML without footnote elements), fall
 * back to plain-text heuristic detection. For non-HTML input, use plain-text
 * detection directly.
 *
 * @param text - Raw input text (HTML or plain text)
 * @returns FootnoteMap with zones in input-text coordinates, sorted by start
 */
export function detectFootnotes(text: string): FootnoteMap {
  if (HAS_HTML_RE.test(text)) {
    const htmlZones = detectHtmlFootnotes(text)
    if (htmlZones.length > 0) return htmlZones
  }

  return detectTextFootnotes(text)
}
