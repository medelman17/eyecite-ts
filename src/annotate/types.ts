import type { Citation } from '../types/citation'

/**
 * Options for annotating citations in text.
 *
 * Supports two modes:
 * - **Template mode**: Simple before/after string wrapping (e.g., `<cite>...</cite>`)
 * - **Callback mode**: Full custom annotation logic with access to citation and surrounding context
 *
 * @example Template mode
 * ```typescript
 * annotate(text, citations, {
 *   template: { before: '<mark data-type="case">', after: '</mark>' }
 * })
 * ```
 *
 * @example Callback mode
 * ```typescript
 * annotate(text, citations, {
 *   callback: (citation, surrounding) => {
 *     if (citation.type === 'case') {
 *       return `<a href="/cases/${citation.volume}-${citation.page}">${citation.matchedText}</a>`
 *     }
 *     return `<span>${citation.matchedText}</span>`
 *   }
 * })
 * ```
 */
export interface AnnotationOptions<C extends Citation = Citation> {
  /**
   * Apply annotations to cleaned text (true) or original text (false).
   *
   * - `true`: Use citation.span.cleanStart/End positions
   * - `false`: Use citation.span.originalStart/End positions
   *
   * @default false
   */
  useCleanText?: boolean

  /**
   * Auto-escape HTML entities to prevent XSS injection.
   *
   * When enabled, special HTML characters are escaped:
   * - `<` → `&lt;`
   * - `>` → `&gt;`
   * - `&` → `&amp;`
   * - `"` → `&quot;`
   * - `'` → `&#39;`
   * - `/` → `&#x2F;`
   *
   * **SECURITY WARNING:** Disabling this option introduces XSS vulnerability
   * if the text contains untrusted user input. Only disable if you are certain
   * the text comes from a trusted source.
   *
   * @default true (secure by default)
   */
  autoEscape?: boolean

  /**
   * Use full citation span from case name through parenthetical (true) or core citation only (false).
   *
   * When enabled and citation has a fullSpan field (from Phase 6+), annotation will span:
   * - Case name: "Smith v. Jones"
   * - Reporter: "500 F.2d 123"
   * - Parenthetical: "(9th Cir. 1974)"
   *
   * When disabled or fullSpan unavailable, falls back to core citation span (volume-reporter-page).
   *
   * @default false (backward compatible)
   */
  useFullSpan?: boolean

  /**
   * Callback for custom annotation logic.
   *
   * Receives each citation and surrounding context (±30 characters),
   * returns the complete markup string to replace the citation text.
   *
   * @param citation - The citation to annotate
   * @param surrounding - Text around the citation (for context-aware markup)
   * @returns Complete markup string (replaces citation.matchedText)
   */
  callback?: (citation: C, surrounding: string) => string

  /**
   * Template mode: simple before/after markup strings.
   *
   * The citation text (with auto-escaping applied if enabled) is wrapped
   * with these strings: `template.before + citationText + template.after`
   *
   * @example
   * ```typescript
   * template: {
   *   before: '<cite data-type="case">',
   *   after: '</cite>'
   * }
   * // Result: <cite data-type="case">500 F.2d 123</cite>
   * ```
   */
  template?: {
    /** Markup inserted before citation text */
    before: string
    /** Markup inserted after citation text */
    after: string
  }
}

/**
 * Result of annotation operation.
 */
export interface AnnotationResult {
  /**
   * Annotated text with markup inserted at citation positions.
   */
  text: string

  /**
   * Position mapping from original positions to annotated positions.
   *
   * Tracks how citation positions shift after markup insertion.
   * Useful for updating external indices (search, highlighting, etc.)
   *
   * Maps: original position → new position after annotation
   */
  positionMap: Map<number, number>

  /**
   * Citations that couldn't be annotated.
   *
   * Currently empty (all citations are annotated if callback/template provided).
   * Future versions may skip overlapping citations or invalid positions.
   */
  skipped: Citation[]
}
