import type { Citation } from "../types/citation"
import { computeBracketScopes } from "./parentheticalScope"

/**
 * Bracket-nesting depth at the start of each citation. Depth > 0 indicates the
 * citation is nested inside an open parenthetical block (typically an
 * explanatory `(quoting X)` / `(citing Y)` following an earlier citation).
 *
 * Delegates to {@link computeBracketScopes} (#809): a bounded-depth, clause-reset
 * bracket-stack scan over the prose gaps between citations. This replaced the
 * earlier global `(`/`)` counter, which desynced for *every* subsequent citation
 * on a single dropped/garbled bracket (common in OCR/PDF). For balanced input the
 * depths are identical; for unbalanced input corruption is now bounded to the
 * offending clause. Use `computeBracketScopes` directly when you also need the
 * per-citation `balanceOk` structure-trust signal.
 *
 * Citations must be sorted by `span.cleanStart`.
 */
export function computeParenDepths(text: string, citations: Citation[]): number[] {
  return computeBracketScopes(text, citations).map((s) => s.depth)
}
