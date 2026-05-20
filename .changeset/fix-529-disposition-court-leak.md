---
"eyecite-ts": patch
---

fix(extract): stop disposition keywords from leaking into the `court` field (#529)

`(per curiam)`, `(en banc)`, `(in bank)`, `(plurality opinion)`, `(mem.)`,
and `(unpublished table decision)` parens were being written to both
`court` and `disposition`. The disposition string overwrote the
reporter-based court inference, so `455 U.S. 478 (1982) (per curiam)`
returned `court="per curiam"` instead of `court="scotus"`. Disposition is
orthogonal to court — it describes how an opinion was issued, not which
court issued it. The parser now clears `court` (and the matching span
offsets) whenever it equals the disposition text it just recognised, so
SCOTUS / circuit / state inference survives a trailing disposition paren.
