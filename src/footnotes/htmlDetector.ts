import type { FootnoteMap, FootnoteZone } from "./types"

/**
 * Source pattern for opening tags of footnote container elements.
 * Matches: <footnote ...>, <fn ...>, <div class="footnote" ...>,
 * <div id="fn1" ...>, <aside class="footnote" ...>, etc.
 *
 * Created as a fresh RegExp per call to avoid shared mutable lastIndex state.
 */
const FOOTNOTE_OPEN_SRC =
  /<(footnote|fn)\b[^>]*>|<(div|aside|section|p|span)\b[^>]*(?:class\s*=\s*["'][^"']*\bfootnote\b[^"']*["']|id\s*=\s*["'](?:fn|footnote)\d*["'])[^>]*>/gi.source

/**
 * Extract a footnote number from an HTML tag's attributes or from leading content.
 *
 * Priority: label attr > id digits > content leading digits > sequential fallback.
 */
function extractFootnoteNumber(tag: string, content: string, sequentialIndex: number): number {
  // Try label="N" attribute
  const labelMatch = /\blabel\s*=\s*["'](\d+)["']/.exec(tag)
  if (labelMatch) return Number.parseInt(labelMatch[1], 10)

  // Try id="fn3" or id="footnote3" attribute
  const idMatch = /\bid\s*=\s*["'](?:fn|footnote)(\d+)["']/.exec(tag)
  if (idMatch) return Number.parseInt(idMatch[1], 10)

  // Strip HTML tags from content before checking for leading digits
  const textContent = content.replace(/<[^>]*>/g, "")

  // Try leading digit in text content
  const contentMatch = /^\s*(\d+)[.\s):]/.exec(textContent)
  if (contentMatch) return Number.parseInt(contentMatch[1], 10)

  // Fallback: sequential
  return sequentialIndex + 1
}

/**
 * Result of closing-tag search: the position where inner content ends
 * (start of `</tag>`) and the position after the closing tag.
 */
interface ClosingTagResult {
  /** Index of the `<` in `</tagName>` — marks the end of inner content */
  contentEnd: number
  /** Index of the character after `</tagName>` — marks the end of the element */
  tagEnd: number
}

/**
 * Find the matching closing tag for a given element, handling nesting.
 *
 * @returns Positions of the closing tag, or null if unmatched.
 */
function findClosingTag(
  html: string,
  tagName: string,
  startAfterOpen: number,
): ClosingTagResult | null {
  const openPattern = new RegExp(`<${tagName}\\b[^>]*>`, "gi")
  const closePattern = new RegExp(`</${tagName}\\s*>`, "gi")

  openPattern.lastIndex = startAfterOpen
  closePattern.lastIndex = startAfterOpen

  let depth = 1

  while (depth > 0) {
    const nextOpen = openPattern.exec(html)
    const nextClose = closePattern.exec(html)

    if (!nextClose) return null

    if (nextOpen && nextOpen.index < nextClose.index) {
      depth++
      closePattern.lastIndex = nextOpen.index + nextOpen[0].length
    } else {
      depth--
      if (depth === 0) {
        return { contentEnd: nextClose.index, tagEnd: nextClose.index + nextClose[0].length }
      }
      openPattern.lastIndex = nextClose.index + nextClose[0].length
    }
  }

  return null
}

/**
 * Detect footnote zones from HTML structural elements.
 *
 * Uses regex-based tag scanning (no DOM dependency) to find footnote
 * containers and record their content ranges.
 *
 * @param html - Raw HTML text
 * @returns FootnoteMap with zones in raw-text coordinates, sorted by start position
 */
export function detectHtmlFootnotes(html: string): FootnoteMap {
  const zones: FootnoteZone[] = []
  let match: RegExpExecArray | null

  // Fresh regex per call to avoid shared mutable lastIndex state
  const footnoteOpenRe = new RegExp(FOOTNOTE_OPEN_SRC, "gi")

  while ((match = footnoteOpenRe.exec(html)) !== null) {
    const openTag = match[0]
    const openTagStart = match.index
    const contentStart = openTagStart + openTag.length

    const tagName = match[1] || match[2]

    const closing = findClosingTag(html, tagName, contentStart)
    if (!closing) continue

    const content = html.slice(contentStart, closing.contentEnd)
    const footnoteNumber = extractFootnoteNumber(openTag, content, zones.length)

    zones.push({
      start: contentStart,
      end: closing.contentEnd,
      footnoteNumber,
    })

    footnoteOpenRe.lastIndex = closing.tagEnd
  }

  return zones.sort((a, b) => a.start - b.start)
}
