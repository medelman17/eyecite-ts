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

/**
 * Whether a sentence terminator separates citation `index` from the citation
 * before it. Used to bound an aside to its clause so a dropped *closing* paren
 * cannot leak `in-parenthetical-of` membership onto a following top-level cite.
 * Checks only the prose gap between consecutive citations, so cite-internal
 * periods (`v.`, `U.S.`) are never mistaken for sentence boundaries.
 */
function hasSentenceBoundaryBefore(text: string, citations: Citation[], index: number): boolean {
  if (index <= 0) return false
  const from = citations[index - 1].span.cleanEnd
  const to = leadStart(citations[index])
  if (to <= from) return false
  return SENTENCE_TERMINATOR_RE.test(text.slice(from, to))
}

/**
 * For each citation, the index of the citation whose explanatory parenthetical
 * it sits inside (its "aside owner"), or `undefined` if it stands on its own.
 *
 * Balance-tolerant (#801): combines the `(`/`)` depth signal with trigger-word
 * anchoring (recovers a dropped *opening* paren) and a sentence-boundary guard
 * (rejects a dropped *closing* paren that would otherwise leak onto a following
 * top-level cite). When `text` is omitted, falls back to the raw depth signal
 * only — the pre-#801 behavior.
 */
export function computeInParentheticalOwners(
  citations: Citation[],
  parenDepths: number[],
  text?: string,
): (number | undefined)[] {
  const owners: (number | undefined)[] = new Array(citations.length).fill(undefined)
  for (let i = 0; i < citations.length; i++) {
    // Trigger-anchored first: handles a dropped opening paren (depth would be 0).
    if (text !== undefined) {
      const triggered = triggerAnchoredAsideOwner(text, citations, i)
      if (triggered !== undefined) {
        owners[i] = triggered
        continue
      }
    }
    if (parenDepths[i] <= 0) continue
    // Depth says nested. With text available, reject a dropped-closing-paren
    // leak: an aside does not continue across a sentence boundary.
    if (text !== undefined && hasSentenceBoundaryBefore(text, citations, i)) continue
    for (let j = i - 1; j >= 0; j--) {
      if (parenDepths[j] < parenDepths[i]) {
        owners[i] = j
        break
      }
    }
  }
  return owners
}

/** Result of the bounded-depth bracket scan for one citation (#809). */
export interface BracketScope {
  /** Bracket-nesting depth at the citation's start (0 = top-level). */
  depth: number
  /** False when a bracket-balance anomaly occurred in this citation's lead-in clause. */
  balanceOk: boolean
}

const OPENER_FOR: Record<string, string> = { ")": "(", "]": "[", "}": "{" }

/**
 * Bounded-depth, sentence-reset bracket scan over the prose gaps between
 * citations (#809). Replaces the global linear paren counter: brackets are
 * tracked on a stack that resets at clause boundaries, so a single unbalanced
 * bracket cannot desync scope for citations in *later* clauses. Only the prose
 * gaps between citations are scanned (each citation's own lead + core is
 * skipped), so cite-internal periods (`v.`, `U.S.`) never trip the clause reset
 * and balanced year parens never inflate depth.
 *
 * Returns, per citation: the bracket `depth` at its start, and a `balanceOk`
 * flag — false when an unmatched closing bracket, or an unclosed opening bracket
 * carried into a clause boundary, was seen in its lead-in. `balanceOk` is the
 * structure-trust signal an abstain gate (#800/#810) can read.
 *
 * Citations must be sorted by `span.cleanStart`.
 */
export function computeBracketScopes(text: string, citations: Citation[]): BracketScope[] {
  const scopes: BracketScope[] = citations.map(() => ({ depth: 0, balanceOk: true }))
  if (citations.length === 0) return scopes

  const stack: string[] = []
  let prevEnd = 0
  for (let i = 0; i < citations.length; i++) {
    const to = leadStart(citations[i])
    let balanceOk = true
    for (let pos = prevEnd; pos < to && pos < text.length; pos++) {
      const ch = text[pos]
      if (ch === "(" || ch === "[" || ch === "{") {
        stack.push(ch)
      } else if (ch === ")" || ch === "]" || ch === "}") {
        if (stack.length > 0 && stack[stack.length - 1] === OPENER_FOR[ch]) {
          stack.pop()
        } else {
          balanceOk = false // unmatched close
        }
      } else if (
        ch === "\n" ||
        ch === "\r" ||
        ((ch === "." || ch === ";") && /\s/.test(text[pos + 1] ?? " "))
      ) {
        // Clause boundary: an aside cannot continue across it. A still-open
        // bracket here is an unclosed-open anomaly; reset the bounded scope.
        if (stack.length > 0) balanceOk = false
        stack.length = 0
      }
    }
    scopes[i] = { depth: stack.length, balanceOk }
    prevEnd = Math.max(prevEnd, citations[i].span.cleanEnd)
  }
  return scopes
}
