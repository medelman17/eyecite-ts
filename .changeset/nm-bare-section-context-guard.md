---
"eyecite-ts": patch
---

fix(statute): require NM signal in context for bare `§ N-N-N` cites (#531)

The bare three-hyphen section shape (`§ 12-17-189`, `Section 32A-2-7(A)`) was defaulting to New Mexico (`code: "NMSA 1978", jurisdiction: "NM"`) because the pattern is common there — but the shape is too generic and the same form appears in Virginia, Alabama, and other states. We now require an explicit NM signal (`NMSA`, `N.M.`, `New Mexico`) within ~200 chars before the cite. Without it, the bare section is still emitted but with `jurisdiction` and `code` left undefined.

Minor type change: `StatuteCitation.code` is now `string | undefined` to support these untagged bare cites.
