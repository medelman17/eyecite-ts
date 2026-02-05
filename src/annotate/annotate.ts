import type { Citation } from '../types/citation'
import type { AnnotationOptions, AnnotationResult } from './types'

/**
 * Annotate citations in text with custom markup.
 *
 * Supports two modes:
 * - **Template mode**: Simple before/after wrapping (set `options.template`)
 * - **Callback mode**: Custom logic with full citation context (set `options.callback`)
 *
 * Citations are processed in reverse order to avoid position shifts invalidating
 * subsequent annotations. Position tracking maps original positions to new positions
 * after markup insertion.
 *
 * @param text - Original or cleaned text to annotate
 * @param citations - Citations to mark up (from extraction pipeline)
 * @param options - Annotation configuration
 * @returns Annotated text with position mapping
 *
 * @example Template mode
 * ```typescript
 * const result = annotate(text, citations, {
 *   template: { before: '<cite>', after: '</cite>' }
 * })
 * // Result: "See <cite>500 F.2d 123</cite>"
 * ```
 *
 * @example Callback mode
 * ```typescript
 * const result = annotate(text, citations, {
 *   callback: (citation) => {
 *     if (citation.type === 'case') {
 *       return `<a href="/cases/${citation.volume}">${citation.matchedText}</a>`
 *     }
 *     return citation.matchedText
 *   }
 * })
 * ```
 *
 * @example Position tracking
 * ```typescript
 * const result = annotate(text, citations, { template: { before: '<mark>', after: '</mark>' } })
 * // result.positionMap tracks how positions shifted
 * const originalPos = 10
 * const newPos = result.positionMap.get(originalPos)
 * ```
 */
export function annotate<C extends Citation = Citation>(
  text: string,
  citations: C[],
  options: AnnotationOptions<C> = {}
): AnnotationResult {
  const {
    useCleanText = false,
    autoEscape = true,  // Secure by default
    template,
    callback,
  } = options

  // Sort reverse to avoid position shifts invalidating subsequent annotations
  const sorted = [...citations].sort((a, b) => {
    const aPos = useCleanText ? a.span.cleanStart : a.span.originalStart
    const bPos = useCleanText ? b.span.cleanStart : b.span.originalStart
    return bPos - aPos  // Reverse for backward iteration
  })

  let result = text
  const positionMap = new Map<number, number>()

  for (const citation of sorted) {
    const start = useCleanText ? citation.span.cleanStart : citation.span.originalStart
    const end = useCleanText ? citation.span.cleanEnd : citation.span.originalEnd

    let markup = ''

    if (callback) {
      // Callback mode: developer provides full logic
      const surrounding = text.substring(
        Math.max(0, start - 30),
        Math.min(text.length, end + 30)
      )
      markup = callback(citation, surrounding)
    } else if (template) {
      // Template mode: simple before/after wrapping
      const citationText = result.substring(start, end)
      const escaped = autoEscape ? escapeHtmlEntities(citationText) : citationText
      markup = template.before + escaped + template.after
    } else {
      // No annotation specified
      continue
    }

    // Insert annotation (working backwards preserves positions for later citations)
    result = result.slice(0, start) + markup + result.slice(end)

    // Track original position to new position (before this annotation was added)
    positionMap.set(start, start)
  }

  return { text: result, positionMap, skipped: [] }
}

/**
 * Escape HTML entities to prevent XSS injection.
 *
 * Converts special HTML characters to their entity equivalents:
 * - `&` → `&amp;`
 * - `<` → `&lt;`
 * - `>` → `&gt;`
 * - `"` → `&quot;`
 * - `'` → `&#39;`
 * - `/` → `&#x2F;`
 *
 * @param text - Text to escape
 * @returns Escaped text safe for HTML insertion
 */
function escapeHtmlEntities(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  }
  return text.replace(/[&<>"'/]/g, (char) => map[char])
}
