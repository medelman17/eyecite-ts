---
"eyecite-ts": patch
---

fix(extract): Mass `c. NNN` chapter no longer leaks into `code` (#569)

Massachusetts citations like `G.L. c. 93A` previously placed the chapter
number (`93A`) into the `code` field and set `section=""`, conflating
two distinct identifiers. Adds a dedicated `chapter` field to
`StatuteCitation` and updates the mass-chapter extractor:

- `code` carries the corpus identifier as it appeared in the source
  (`G.L.`, `Mass. Gen. Laws`, `M.G.L.A.`, `A.L.M.`, `General Laws`).
- `chapter` carries the chapter (`93A`, `93`, `268A`, `90`).
- `section` is the trailing section number when present, otherwise
  `undefined` (no more empty-string sentinels).

`StatuteCitation.section` is now `string | undefined` to model
chapter-only citations. The bluebook formatter now emits `<code> c.
<chapter>` for chapter-only forms and `<code> c. <chapter>, § <section>`
for the full chapter+section shape. Pre-existing tests / fixture updated.
