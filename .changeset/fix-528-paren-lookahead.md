---
"eyecite-ts": patch
---

fix(extract): raise `collectParentheticals` lookahead so long explanatory
parens and any trailing history clause survive (#528)

The scanner's `maxLookahead=500` silently dropped any explanatory
parenthetical whose closing `)` fell past the 500-char window — and the
trailing history clause (`cert. denied, ...`, `aff'd, ...`) after it.
Modern caselaw explanatory parens routinely run hundreds of characters,
so this fired often enough to be a real defect.

The default soft cap is now 2000 chars (4× the old limit), and once an
opening `(` is seen inside the window the depth-tracking inner loop is
allowed to chase the matching `)` up to a 10,000-char hard ceiling. That
way a paren whose body overflows the soft window is still captured intact,
and the scanner can keep walking after it to pick up trailing history
signals. Perf is unchanged on representative opinions (linear walk, early
termination on the first non-paren / non-signal character).
