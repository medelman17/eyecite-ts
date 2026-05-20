---
"eyecite-ts": patch
---

fix(extract): semicolon-separated parallel cites propagate year and link
into a group (#551)

Michigan (and a handful of other states) write parallel citations with
`;` instead of `,`:

    People v Bobo, 390 Mich 355, 359; 212 NW2d 190 (1973)

Before this fix, the Mich cite got `year=undefined` and the two members
were not grouped. This was the single highest-volume year defect in the
corpus — 40/48 of the observed missed-year cases were Michigan-style
semicolon parallels.

Two changes, both narrowly scoped:

1. `src/extract/detectParallel.ts`: extend the gap-shape gate to accept
   `;` at the outer boundary (between the last pincite and the next
   reporter token).
   - Tight: `^[,;]\s*$` (was `^,\s*$`)
   - Pincite-between: `^,\s*PINCITE_LIST\s*[,;]\s*$` (was just `,`)
   Pincite lists themselves still require comma-separation; `parsePincite`
   rejects `;` segments. The shared-paren gate already in this function
   (rejecting `A (year); B (year)` shapes) continues to keep string-cite
   semantics intact.

2. `src/extract/extractCase.ts` CHAIN_BRIDGE_REGEX: add `;` to the
   bridge class (`/^[\s,;\d\-–—]*$/`). Without this, even with the group
   detected, the post-chain scan in the FIRST member would stop at the
   semicolon and the trailing year paren would not be reachable.

One pre-existing test (`does not link citations separated by semicolon`)
asserted that ANY semicolon-separated pair must be rejected — that is
now an explicit MICHIGAN-style positive case, with the rationale
documented inline. A new negative test (`does NOT link semicolon-
separated cites with their own parens (string cite)`) pins down the
opposite shape so the regression coverage is unchanged in spirit.

Listed as a precondition for #507 (Ohio neutral parallel pincite
inheritance), which depends on parallel-group membership.
