---
"eyecite-ts": minor
---

feat(extract): recognize U.S. Sentencing Guidelines citations (#577)

`U.S.S.G. § 2K2.4(b)` and the compact `USSG § 3E1.1` form are now
folded under the existing `statute` citation type with
`code: "U.S.S.G."` (no `title` — the Guidelines are organized by
chapter/section without a U.S. Code title number) and
`jurisdiction: "US"`.

Pattern `id: "ussg"` is added to `statutePatterns`; new dispatcher
case in `extractStatute` routes to `extractUssg`. Section body uses
the internal-`.` rule (`2K2.4` parses; trailing sentence period is
not absorbed) and captures `(a)(b)`-style subsection chains.

Folding under `statute` rather than introducing a dedicated
`sentencingGuideline` type is the lowest-friction choice: USSG
citations carry no metadata beyond what `StatuteCitation` already
exposes, and downstream consumers (annotate, bluebook formatting,
resolver) inherit the existing statute treatment for free.
