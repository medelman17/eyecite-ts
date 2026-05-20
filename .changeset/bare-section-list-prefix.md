---
"eyecite-ts": patch
---

fix(extract): emit citations for bare-prefix `§§ N, N` lists (#563)

`§§ X, Y, Z` lists without an explicit code identifier in front of the
`§§` marker produced ZERO citations. The existing `expandPluralSectionList`
post-pass only fires *after* a head citation already exists in the result
set, so naked sequences like `See §§ 12940, 12945` or `Code §§ 19.2-81 and
18.2-266` never seeded a head and the whole list dropped silently.

Adds `detectBareSectionLists` running just before the expander. The pass
scans the cleaned text for `[Code ]§§ N(, N)+` shapes that don't overlap
an existing citation and seeds a head with `code` set to the prefix (or
`"§"` when none is present) so the expander picks up the siblings. The
section grammar in both the new detector and the expander now allows
dotted section numbers (`19.2-81`, `12940.5`).

Confidence on the seeded head is intentionally low (0.5) because no code
identifier means no jurisdiction grounding — downstream inheritance passes
remain authoritative for jurisdictional context.
