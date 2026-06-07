import type { Citation, Parenthetical } from "../types/citation"

/**
 * Link citations nested inside explanatory parentheticals — e.g. the
 * `Doe v. City, 100 F.2d 1` in `... (quoting Doe v. City, 100 F.2d 1)` — onto
 * the enclosing `Parenthetical.citations`, as child nodes of their host
 * citation (#851, spec §4c).
 *
 * The nested citation is already extracted as a flat sibling with a stable id
 * (its core span sits inside the parenthetical span the cleaner preserves), so
 * this pass does not re-parse — it links the existing citation under its host. A
 * child is attached to the SMALLEST enclosing parenthetical, so genuinely nested
 * children land on the innermost paren (and the tree stays correct under
 * recursion).
 *
 * By default the linkage is ADDITIVE: the child is ALSO kept in the top-level
 * array, so the result is non-breaking and a later case short form can still
 * resolve to a case first cited in a parenthetical (Bluebook Rule 10.9(a)).
 * When `exclude` is true, the child is REMOVED from the top-level array (the
 * strict subordinate model) — the cross-citation groupers and the resolver no
 * longer see it as a top-level candidate, and it is reachable only via its
 * host's `Parenthetical.citations` (or `byId`).
 *
 * `Id.`/`supra` never bind to a paren-child regardless of `exclude` — that
 * exclusion lives in the resolver (Rule 4.1/4.2; #214/#799) and is unaffected.
 *
 * Runs after assignCitationIds (children keep their stable ids) and before
 * runStructuringPass / resolution. Mutates `citations` (and its parentheticals)
 * in place.
 */
export function nestParentheticalCitations(
  citations: Citation[],
  options: { exclude?: boolean } = {},
): void {
  // Every explanatory parenthetical with a locatable span, paired with its
  // owning citation. (Metadata parentheticals — court/year — are not in
  // `parentheticals`, so a `(2d Cir. 2000)` never captures children.)
  const parens: Array<{ owner: Citation; paren: Parenthetical }> = []
  for (const citation of citations) {
    const owned = (citation as { parentheticals?: Parenthetical[] }).parentheticals
    if (!owned) continue
    for (const paren of owned) {
      if (paren.span) parens.push({ owner: citation, paren })
    }
  }
  if (parens.length === 0) return

  const nested = new Set<Citation>()
  for (const child of citations) {
    const span = child.span
    if (!span) continue

    let best: Parenthetical | undefined
    let bestWidth = Number.POSITIVE_INFINITY
    for (const { owner, paren } of parens) {
      if (owner === child) continue
      const ps = paren.span
      if (!ps) continue
      if (span.cleanStart >= ps.cleanStart && span.cleanEnd <= ps.cleanEnd) {
        const width = ps.cleanEnd - ps.cleanStart
        if (width < bestWidth) {
          best = paren
          bestWidth = width
        }
      }
    }

    if (best) {
      best.citations ??= []
      best.citations.push(child)
      nested.add(child)
    }
  }

  if (!options.exclude || nested.size === 0) return

  // Strict model: drop nested children from the top-level array. The flat array
  // is in document order, so the surviving order — and the push order into each
  // `paren.citations` above — is document order too.
  let write = 0
  for (let read = 0; read < citations.length; read++) {
    if (!nested.has(citations[read])) {
      citations[write++] = citations[read]
    }
  }
  citations.length = write
}
