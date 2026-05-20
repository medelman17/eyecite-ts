---
"eyecite-ts": patch
---

fix(neutral): reject docket-shaped strings and implausible years (#532)

Strings like `03A01-9103-CH-96` (a TN/IN docket number) were matching the hyphenated neutral pattern, producing a `type: "neutral"` citation with `year: 9103`. Two guards now prevent this:

- The year segment must fall in 1700-2199 (was: any 4 digits).
- A negative lookbehind rejects matches whose preceding text contains a `Case No.` / `Cause No.` / `Docket No.` prefix.

Both apply to the 3-segment (NM/Ohio/NC) and 4-segment (MS) hyphenated patterns.
