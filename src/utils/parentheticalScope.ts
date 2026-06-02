/**
 * Trigger-anchored parenthetical-aside detection.
 *
 * The running `(`/`)` depth counter in `computeParenDepths` is the primary
 * signal for "this citation sits inside another cite's explanatory
 * parenthetical" (`(quoting X)` / `(citing Y)`). But dropped or unbalanced
 * parentheses — common in OCR'd / PDF-extracted opinions — defeat it: with a
 * missing opening `(`, the nested cite has depth 0 and looks top-level.
 *
 * This module recognises the aside from its *trigger word* instead, so the
 * relationship survives a missing paren. It is shared between the resolver
 * (`Id.`/`supra` antecedent selection, #214/#798/#799) and the citation graph's
 * `in-parenthetical-of` edges (#801).
 */

import type { Citation } from "../types/citation"

/**
 * Explanatory-parenthetical signal words that *introduce* a nested citation.
 * Kept small and named so both the resolver and the citation graph share one
 * vocabulary. (End-of-parenthetical markers like "emphasis added" are not here:
 * they do not introduce a citation.)
 */
export const PARENTHETICAL_TRIGGER_WORDS = ["quoting", "citing", "quoted in", "cited in"] as const

/** Matches a trigger word at the very end of a region (optionally `… from`/`… to`). */
const TRIGGER_AT_END_RE = /\b(?:quoting|citing|quoted in|cited in)(?:\s+(?:from|to))?[\s,]*$/i

/** A sentence terminator (`. ` / `; ` / newline) — bounds an aside to its clause. */
const SENTENCE_TERMINATOR_RE = /[.;]\s|[\n\r]/

/**
 * The start offset of a citation's lead-in: for `case`/`docket` citations the
 * `fullSpan` start (covering the case name `Bar v. Baz`), otherwise the core
 * span start. The trigger word sits immediately before this point.
 */
function leadStart(c: Citation): number {
  if ((c.type === "case" || c.type === "docket") && c.fullSpan) {
    return c.fullSpan.cleanStart
  }
  return c.span.cleanStart
}

/**
 * If an explanatory-parenthetical trigger word directly introduces the citation
 * at `index` — even with no opening `(` — return the index of the citation that
 * owns the aside (the citing authority immediately before the trigger). Returns
 * `undefined` when the citation is not trigger-introduced.
 *
 * Positions are clean-text offsets, so callers must pass the same cleaned text
 * the citation spans were computed against.
 */
export function triggerAnchoredAsideOwner(
  text: string,
  citations: Citation[],
  index: number,
): number | undefined {
  if (index <= 0) return undefined
  const prev = citations[index - 1]
  const cur = citations[index]
  const from = prev.span.cleanEnd
  const to = leadStart(cur)
  if (to <= from) return undefined

  const region = text.slice(from, to)
  // The trigger must directly introduce THIS citation as an aside of `prev`: a
  // sentence terminator anywhere in the gap means it does not.
  if (SENTENCE_TERMINATOR_RE.test(region)) return undefined
  if (!TRIGGER_AT_END_RE.test(region)) return undefined
  return index - 1
}
