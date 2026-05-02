---
"eyecite-ts": patch
---

fix: case-name extraction cluster (#220, #221, #222, #223, #224)

- **#220**: export `DocketCitation` type from package entry so consumers can `import type { DocketCitation } from "eyecite-ts"`.
- **#221**: stop the case-name scanback at paragraph boundaries (`\n\n`) so a citation at the start of a new paragraph no longer absorbs the previous heading and intro prose. The default cleaner collapses newlines to spaces, so paragraph breaks are recovered from the original text via the `transformationMap`.
- **#222**: detect consolidated captions (`X v. Y, Matter of A, P v. Q,` chained in one citation) and truncate the defendant at its first comma so `caseName` stays a single party pair instead of concatenating multiple segments.
- **#223**: trim lead-in clauses ("Under the controlling authority of … in", "Pursuant to the rule announced in") off the plaintiff. Removed `"in"` from the party-name connector set (it's almost always a prose preposition) and tightened the `firstWordIsProperName` guard so it only suppresses trimming when an internal qualifier (`d/b/a`, `a/k/a`, `f/k/a`, `n/k/a`, with or without slashes) is present.
- **#224**: in subsequent-history chains (`<cite-A>, modified on other grounds, <cite-B>`), inherit the chain root's case name onto the child citation per Bluebook 10.7. Without this pass, the second citation's `caseName` absorbed the first citation + history connector.
