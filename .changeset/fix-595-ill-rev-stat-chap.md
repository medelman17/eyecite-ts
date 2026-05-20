---
"eyecite-ts": patch
---

fix(extract): accept Illinois `chap.` (full spelling) in Ill. Rev. Stat.
citations (#595)

The pre-1993 Illinois Revised Statutes pattern required `ch.` exactly;
`Ill. Rev. Stat. 1955, chap. 38, par. 602` (with full-spelled `chap.`)
was missed. Both `ch.` and `chap.` are common in modern Illinois opinions
when citing the historical statutory text.

`src/patterns/statutePatterns.ts` (`ill-rev-stat`) and
`src/extract/statutes/extractIllRevStat.ts` — extend the chapter
keyword from `[Cc]h\.` to `[Cc]h(?:ap)?\.` so both abbreviated and
full-spelled forms tokenize. Lowercase/uppercase initial letter is
preserved.
