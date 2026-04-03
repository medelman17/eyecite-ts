import type { FootnoteMap, FootnoteZone } from "./types"

/**
 * Regex matching opening tags for footnote container elements.
 * Matches: <footnote ...>, <fn ...>, <div class="footnote" ...>,
 * <div id="fn1" ...>, <aside class="footnote" ...>, etc.
 */
const FOOTNOTE_OPEN_RE =
  /<(footnote|fn)\b[^>]*>|<(div|aside|section|p|span)\b[^>]*(?:class\s*=\s*["'][^"']*\bfootnote\b[^"']*["']|id\s*=\s*["'](?:fn|footnote)\d*["'])[^>]*>/gi

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
 * Find the matching closing tag for a given element, handling nesting.
 *
 * @returns Index of the character after the closing tag, or -1 if not found.
 */
function findClosingTag(html: string, tagName: string, startAfterOpen: number): number {
  const openPattern = new RegExp(`<${tagName}\\b[^>]*>`, "gi")
  const closePattern = new RegExp(`</${tagName}\\s*>`, "gi")

  openPattern.lastIndex = startAfterOpen
  closePattern.lastIndex = startAfterOpen

  let depth = 1

  while (depth > 0) {
    const nextOpen = openPattern.exec(html)
    const nextClose = closePattern.exec(html)

    if (!nextClose) return -1

    if (nextOpen && nextOpen.index < nextClose.index) {
      depth++
      closePattern.lastIndex = nextOpen.index + nextOpen[0].length
    } else {
      depth--
      if (depth === 0) {
        return nextClose.index + nextClose[0].length
      }
      openPattern.lastIndex = nextClose.index + nextClose[0].length
    }
  }

  return -1
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

  FOOTNOTE_OPEN_RE.lastIndex = 0

  while ((match = FOOTNOTE_OPEN_RE.exec(html)) !== null) {
    const openTag = match[0]
    const openTagStart = match.index
    const contentStart = openTagStart + openTag.length

    const tagName = match[1] || match[2]

    const closingEnd = findClosingTag(html, tagName, contentStart)
    if (closingEnd === -1) continue

    const closingTagStart = html.lastIndexOf(`</${tagName}`, closingEnd)
    const content = html.slice(
      contentStart,
      closingTagStart > contentStart ? closingTagStart : closingEnd,
    )

    const footnoteNumber = extractFootnoteNumber(openTag, content, zones.length)

    zones.push({
      start: contentStart,
      end: closingTagStart > contentStart ? closingTagStart : closingEnd,
      footnoteNumber,
    })

    FOOTNOTE_OPEN_RE.lastIndex = closingEnd
  }

  return zones.sort((a, b) => a.start - b.start)
}
