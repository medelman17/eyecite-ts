---
"eyecite-ts": patch
---

Stop HTML block boundaries from fusing into case names (#701)

`stripHtmlTags` turned a tag run between two block elements into a single space
(or nothing, after a period), so a heading or table cell merged into the
following paragraph's caption — `<h2>Case</h2><p>Smith v. Jones` extracted
caseName `"Case Smith v. Jones"`. Block-level boundaries (`p`, `div`, `h1`-`h6`,
`li`, `tr`/`td`, `section`, …) now collapse to a sentence boundary so the
case-name backscan stops there. `<br>` stays a space (an in-flow line break,
#693) and inline tags (`<b>`, `<a>`) keep their word-fusion-only behavior.
