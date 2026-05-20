---
"eyecite-ts": patch
---

fix(extract): neutral cites no longer consume next parallel's volume as pincite (#507)

In Ohio Bluebook chains like `100 Ohio St.3d 152, 2003-Ohio-5372, 797 N.E.2d
71, at ¶ 33`, the neutral cite (`2003-Ohio-5372`) was greedily extracting
`pincite=797` — the volume of the next parallel — because
`NEUTRAL_PINCITE_LOOKAHEAD` had no terminator boundary. It now applies the
same parallel-cite disambiguation guard used by `LOOKAHEAD_PINCITE_REGEX`:
the pincite digit sequence must end at end-of-string, sentence punctuation,
closing bracket, or whitespace NOT followed by a capital letter (a parallel
reporter token).

Remaining work (tracked separately, out of scope here): paragraph-pincite
inheritance from the trailing parallel onto earlier parallel members. The
third parallel correctly captures `¶ 33`; propagating that pincite to the
first `100 Ohio St.3d 152` parallel requires extending `detectParallel` to
include neutral cites in the group, plus a post-pass that fills in a
shared pincite onto earlier members.
