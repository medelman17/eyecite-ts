---
"eyecite-ts": patch
---

fix(extract): only the owning sibling carries `hasEtSeq` in `§§` lists (#566)

`expandPluralSectionList` previously spread `{ ...cite }` from the head
onto every sibling, so if `et seq.` modified ONE specific section in a
plural list (`§§ 12940 et seq., 12945`), the flag rode along to every
sibling in the fanout. Symmetrically, `§§ 1331, 1332 et seq.` left `1332`
without the flag because the head was `1331` (no trailing `et seq.`).

Fix: after positioning each sibling, peek ~20 chars past the section end
and set `hasEtSeq` only when `et seq.` immediately follows. Siblings
without a trailing `et seq.` token now drop the flag regardless of the
head's value. Also clears `sectionRange` on siblings — the structured
range applied only to the head.
