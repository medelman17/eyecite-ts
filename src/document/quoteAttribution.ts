import type { Citation } from "../types/citation"
import type { Span } from "../types/span"
import type { QuoteAttribution } from "./types"

const BLOCK_QUOTE_WORD_THRESHOLD = 50
const BLOCK_QUOTE_MAX_DISTANCE = 200
const BLOCK_QUOTE_TIGHT_DISTANCE = 50
const INLINE_QUOTE_MAX_DISTANCE = 100

/**
 * Attribute quote zones to the citations that vouch for them.
 *
 * For each quote zone, attempts to attribute via three paths:
 *   1. parenthetical-internal (highest precedence): quote inside an
 *      explanatory parenthetical of a citation; the structural relationship
 *      is unambiguous.
 *   2. block-quote (Bluebook Rule 5): markdown blockquote OR >= 50 words.
 *      Pairs with the next citation within 200 chars.
 *   3. adjacent: inline quote followed by a citation in the same sentence
 *      (no '.' between quote end and citation start), within 100 chars.
 *
 * Emits an entry for every quote zone, including unattributed ones.
 */
export function attributeQuotes(
  text: string,
  quoteZones: Array<{ start: number; end: number }>,
  citations: Citation[],
): QuoteAttribution[] {
  const result: QuoteAttribution[] = []

  for (const zone of quoteZones) {
    const quoteText = extractQuoteText(text, zone)
    const quoteSpan: Span = {
      cleanStart: zone.start,
      cleanEnd: zone.end,
      originalStart: zone.start,
      originalEnd: zone.end,
    }

    // Parenthetical-internal path takes precedence — check first.
    const parenAttribution = findParentheticalAttribution(text, zone, citations)
    if (parenAttribution !== undefined) {
      result.push({
        quoteSpan,
        quoteText,
        citationIndex: parenAttribution,
        attributionKind: "parenthetical",
        confidence: 0.95,
      })
      continue
    }

    const isBlock = isBlockQuote(text, zone)

    if (isBlock) {
      const candidate = findBlockQuoteCandidate(zone, citations)
      if (candidate !== undefined) {
        const distance = candidate.distance
        result.push({
          quoteSpan,
          quoteText,
          citationIndex: candidate.index,
          attributionKind: "block-quote",
          confidence: distance < BLOCK_QUOTE_TIGHT_DISTANCE ? 0.98 : 0.9,
        })
        continue
      }
    } else {
      const candidate = findInlineCandidate(text, zone, citations)
      if (candidate !== undefined) {
        result.push({
          quoteSpan,
          quoteText,
          citationIndex: candidate,
          attributionKind: "adjacent",
          confidence: 0.85,
        })
        continue
      }
    }

    // Unattributed
    result.push({ quoteSpan, quoteText })
  }

  return result
}

function extractQuoteText(text: string, zone: { start: number; end: number }): string {
  const raw = text.slice(zone.start, zone.end)
  // Markdown blockquote (zone starts with `>` after optional whitespace):
  // strip the leading `>` and one space from each line, then trim.
  if (/^\s*>/m.test(raw)) {
    return raw
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*>\s?/, ""))
      .join("\n")
      .trim()
  }
  // Paired ASCII or typographic quote: strip the outer mark on each side.
  return text.slice(zone.start + 1, zone.end - 1)
}

function isBlockQuote(text: string, zone: { start: number; end: number }): boolean {
  const inner = text.slice(zone.start, zone.end)
  // Markdown blockquote: contains lines starting with `>`.
  if (/^>\s/m.test(inner)) return true
  // 50+ word threshold per Bluebook Rule 5.
  const wordCount = inner.split(/\s+/).filter((w) => w.length > 0).length
  if (wordCount >= BLOCK_QUOTE_WORD_THRESHOLD) return true
  return false
}

function findBlockQuoteCandidate(
  zone: { start: number; end: number },
  citations: Citation[],
): { index: number; distance: number } | undefined {
  for (let i = 0; i < citations.length; i++) {
    const cstart = citations[i].span.originalStart
    if (cstart <= zone.end) continue
    const distance = cstart - zone.end
    if (distance > BLOCK_QUOTE_MAX_DISTANCE) return undefined
    return { index: i, distance }
  }
  return undefined
}

function findInlineCandidate(
  text: string,
  zone: { start: number; end: number },
  citations: Citation[],
): number | undefined {
  for (let i = 0; i < citations.length; i++) {
    const cstart = citations[i].span.originalStart
    if (cstart <= zone.end) continue
    const distance = cstart - zone.end
    if (distance > INLINE_QUOTE_MAX_DISTANCE) return undefined
    // No sentence-terminating period between zone end and citation start.
    // Ignore `v.` (case-name marker) and other one/two-letter abbreviations
    // — a period after such a token isn't a sentence terminator.
    const between = text.slice(zone.end, cstart)
    if (isSentenceBoundary(between)) return undefined
    return i
  }
  return undefined
}

/**
 * Detect a sentence boundary (period followed by space + capital) while
 * ignoring common legal-prose abbreviations whose trailing `.` is not a
 * sentence terminator: `v.` / `vs.` (case-name marker), one-letter initials
 * (`A. B. Smith`), and a small set of Bluebook short forms (`Inc.`, `Co.`,
 * `Corp.`, `Ltd.`, `Mr.`, `Mrs.`, `Ms.`, `Dr.`, `St.`, `Jr.`, `Sr.`, `No.`).
 */
function isSentenceBoundary(text: string): boolean {
  const ABBREV = /^(?:v|vs|[A-Za-z]|Inc|Co|Corp|Ltd|Mr|Mrs|Ms|Dr|St|Jr|Sr|No)$/
  const re = /\.\s+[A-Z]/g
  let m: RegExpExecArray | null
  m = re.exec(text)
  while (m !== null) {
    // Look back from the period to grab the token that ends here.
    const periodPos = m.index
    let tokenStart = periodPos
    while (tokenStart > 0 && /[A-Za-z]/.test(text[tokenStart - 1])) tokenStart--
    const token = text.slice(tokenStart, periodPos)
    if (!ABBREV.test(token)) return true
    m = re.exec(text)
  }
  return false
}

function findParentheticalAttribution(
  text: string,
  zone: { start: number; end: number },
  citations: Citation[],
): number | undefined {
  // For each citation, scan forward from its end looking for `(...)` groups.
  // After the citation's span (which excludes the year paren), the canonical
  // Bluebook shape places one or more trailing parens:
  //   Smith, 1 U.S. 1 (1990) (quoting "..." from prior precedent).
  //                  ^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //                  year    explanatory
  //
  // We track paren depth to find the matching `)` of each top-level group.
  // If the zone is fully contained in any group (including nested cases
  // like `Smith, 1 U.S. 1 (1990) (Other v. Else, 2 F.3d 1 (citing "..."))`),
  // attribute to this citation. Stop scanning when a non-whitespace,
  // non-`(` character appears at depth 0 (end of trailing parens).
  //
  // Returns the first citation whose trailing paren group contains the zone.
  for (let i = 0; i < citations.length; i++) {
    const c = citations[i]
    // Quote must start after the citation ends.
    if (zone.start <= c.span.originalEnd) continue
    let depth = 0
    let openPos = -1
    let abandon = false
    for (let p = c.span.originalEnd; p < text.length && !abandon; p++) {
      const ch = text[p]
      if (ch === "(") {
        if (depth === 0) openPos = p
        depth++
      } else if (ch === ")") {
        depth--
        if (depth === 0 && openPos !== -1) {
          // Found the matching close-paren for a top-level group.
          if (zone.start >= openPos && zone.end <= p + 1) {
            return i
          }
          openPos = -1 // reset; keep scanning for the NEXT `(...)` group
        } else if (depth < 0) {
          abandon = true // unbalanced; abandon this citation
        }
      } else if (depth === 0 && !/\s/.test(ch)) {
        // At top level, a non-whitespace, non-`(` char ends the trailing-
        // paren run for this citation (e.g. `; see also …` or `. Next`).
        abandon = true
      }
    }
  }
  return undefined
}
