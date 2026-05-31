---
"eyecite-ts": patch
---

Recognize spelled-out bare `Article N, Section N` constitutional prose (#321)

`Article I, Section 8`, `Article 1, Section 10`, and the abbreviated-article +
word-section mix `Art. 1, Section 6` now extract as `type: "constitutional"`
(article + section). Previously only the `§`-symbol form (`Art. I, § 10`) and
the `of the <State> Constitution` prose trailer matched, so the spelled-out
form attorneys use most in argument prose fell through.

The tight comma-separated `Article <num>, Section <num>` adjacency plus a
case-sensitive `Article`/`Art.` token keep ordinary contract/bylaw prose from
matching; confidence is 0.5 (no `Const.` anchor), matching the existing bare
form. A `(?<!Const\.?,?\s)` lookbehind avoids duplicating the core of a full
`U.S. Const., Art. I, §7` citation.
