---
"eyecite-ts": minor
---

fix(extract): chained subsequent history attaches each link's entry to its
immediate parent, not the chain root (#527)

In a chain like `<root>, aff'd, <A>, cert. denied, <B>`, A is the
affirmance of the root and B is the cert. denial OF A (not of the
original root). The scanner already correctly attached `affirmed` to the
root and `cert. denied` to A. The Union-Find linker then collapsed
everything into a single component and aggregated all entries onto the
root, with two visible defects:

- A lost its own `subsequentHistoryEntries` (the linker cleared them
  during aggregation), so the trailing chain link was effectively
  dropped from A.
- B's `subsequentHistoryOf` pointed back at the root rather than at A,
  breaking downstream `citationGraph` "history-of" edges.

The linker now skips Union-Find aggregation entirely. Each child resolves
to the lowest-indexed parent that paired with it (the primary cite of the
immediately-preceding chain link, naturally found via the scanner's own
position-based pairing). Entries stay where the scanner attached them.

This is a behavior change for the shape of `subsequentHistoryEntries`
across multi-link chains — the original cite now holds ONLY its direct
child's signal, with downstream signals living on the intermediate cites.
Existing tests that asserted "all entries on root" were updated to the
correct semantics.
