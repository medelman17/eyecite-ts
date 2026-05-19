---
"eyecite-ts": patch
---

Recognize `e. g.` (with internal whitespace) as the `e.g.` signal.

The Bluebook abbreviation `e.g.` appears in two typesetting variants: the closed form `e.g.` and the older spaced form `e. g.` (with whitespace between the letters), common in older opinions and some publishers' styles. The closed form already worked; the spaced form was silently missed, dropping the signal entirely.

Both the prefix matchers (`SIGNAL_PATTERNS` in `detectStringCites.ts`) and the leading-signal scanner (`detectLeadingSignals`) now accept optional whitespace between `e.` and `g.`. Affects all six combined forms: `e.g.`, `see, e.g.`, `see also, e.g.`, `but see, e.g.`, `cf., e.g.`, `but cf., e.g.`.

Surfaced by a CAP-corpus signal-extraction audit: e.g. `See, e. g., New State Ice Co. v. Liebmann, 285 U.S. 262 (1932)` was extracting the case but losing the signal.
