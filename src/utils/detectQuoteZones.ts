/**
 * Classify an ASCII `"` at position `pos` as opening, closing, or ambiguous,
 * based on neighboring characters. English typographic conventions:
 *
 *   - Opening: preceded by start/whitespace/punctuation-open (`(`, `[`, `—`)
 *     AND followed by a letter or `(`.
 *   - Closing: preceded by a letter/digit/sentence punctuation
 *     (`.`, `,`, `?`, `!`, `:`, `;`, `)`, `]`) AND followed by end/
 *     whitespace/punctuation.
 *   - Ambiguous: everything else (skipped during pairing).
 */
function classifyAsciiQuote(text: string, pos: number): "open" | "close" | "ambiguous" {
  const prev = pos === 0 ? "" : text[pos - 1]
  const next = pos === text.length - 1 ? "" : text[pos + 1]

  const openPrev = prev === "" || /\s/.test(prev) || prev === "(" || prev === "[" || prev === "—"
  const openNext = /[A-Za-zÀ-ɏ]/.test(next) || next === "("
  if (openPrev && openNext) return "open"

  const closePrev = /[A-Za-z0-9À-ɏ.,?!:;)\]]/.test(prev)
  const closeNext = next === "" || /[\s.,;:)—\]]/.test(next)
  if (closePrev && closeNext) return "close"

  return "ambiguous"
}

/**
 * Detects block-quote and inline-quote zones in **original** text and
 * returns sorted, non-overlapping `{start, end}` ranges in original-text
 * coordinates. Callers must look up citations via `span.originalStart`,
 * not `cleanStart` — the clean pipeline collapses newlines so a markdown
 * `> …` becomes inline with the surrounding sentence and the line-based
 * blockquote shape is lost. Two zone shapes are recognized:
 *
 *   - Markdown blockquotes: contiguous lines whose first non-whitespace
 *     character is `>`. The zone spans from the first such line's start to
 *     the end of the last contiguous line.
 *   - Inline paired quotes: balanced `"…"` or `“…”` regions on a single
 *     content stretch. We only accept pairs that are at most ~600 chars
 *     apart, which filters most cases of stray unbalanced quotes; longer
 *     "quotes" would swallow unrelated citations and produce wrong skips.
 */
export function detectQuoteZones(text: string): Array<{ start: number; end: number }> {
  const zones: Array<{ start: number; end: number }> = []

  // Markdown blockquotes (`>` lines).
  let lineStart = 0
  let zoneStart = -1
  for (let i = 0; i <= text.length; i++) {
    const atEnd = i === text.length
    if (atEnd || text[i] === "\n") {
      const line = text.substring(lineStart, i)
      const trimmed = line.replace(/^[ \t]*/, "")
      const isQuoteLine = trimmed.startsWith(">")
      if (isQuoteLine) {
        if (zoneStart === -1) zoneStart = lineStart
      } else if (zoneStart !== -1) {
        zones.push({ start: zoneStart, end: lineStart })
        zoneStart = -1
      }
      lineStart = i + 1
    }
  }
  if (zoneStart !== -1) zones.push({ start: zoneStart, end: text.length })

  // Inline paired quotes. Two-step:
  //   1. Classify each quote-character as open / close / ambiguous based on
  //      neighboring characters (typographic conventions).
  //   2. Match opens to closes with a stack, skipping orphans and ambiguous.
  //
  // Why not greedy "first quote = open, next = close"? That mispairs when
  // input starts mid-document with an orphan close (e.g. `use." Smith...`),
  // creating a phantom zone that engulfs unrelated citations and breaks
  // Id. resolution. The classifier handles arbitrary text snippets
  // robustly. Typographic quotes (U+201C / U+201D) are unambiguous and
  // pair directly.
  //
  // Two separate stacks isolate ASCII and typographic styles so a mixed
  // open/close (e.g. ASCII `"` … typographic `”`) cannot cross-pair into
  // a phantom zone that engulfs intermediate citations.
  const MAX_INLINE_QUOTE_LEN = 600
  const asciiOpens: number[] = []
  const typographicOpens: number[] = []
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    // Typographic quotes: unambiguous.
    if (ch === "“") {
      typographicOpens.push(i)
      continue
    }
    if (ch === "”") {
      // Orphan closes are skipped — a leading typographic `”` without a
      // matching open should not retroactively turn into an open.
      const openPos = typographicOpens.pop()
      if (openPos === undefined) continue
      if (i - openPos + 1 <= MAX_INLINE_QUOTE_LEN) {
        zones.push({ start: openPos, end: i + 1 })
      }
      continue
    }

    // ASCII straight double-quote: classify by neighbors.
    if (ch !== '"') continue
    const cls = classifyAsciiQuote(text, i)
    if (cls === "open") {
      asciiOpens.push(i)
    } else if (cls === "close") {
      // Orphan closes are skipped — same rationale as the typographic branch.
      const openPos = asciiOpens.pop()
      if (openPos === undefined) continue
      if (i - openPos + 1 <= MAX_INLINE_QUOTE_LEN) {
        zones.push({ start: openPos, end: i + 1 })
      }
    }
    // ambiguous → skip
  }

  zones.sort((a, b) => a.start - b.start)
  return zones
}
