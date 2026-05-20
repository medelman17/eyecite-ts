---
"eyecite-ts": patch
---

fix(extract): `§§ N-M` federal ranges populate `sectionRange` (#564)

`28 U.S.C. §§ 591-99 (2000)` previously produced one citation with
`section="591-99"`, ambiguous with hyphenated state-style sections
(`19.2-81`, `32A-2-7`). Adds a structured `sectionRange: { start, end }`
field on `StatuteCitation` and populates it for federal `§§` ranges. The
`section` field now holds the range start (e.g. `"591"`) so consumers that
only read `section` keep working on the common case.

Detection guard: hyphenated state-style sections (anything with a dot, a
letter, or more than one hyphen) are NOT treated as ranges and continue
to surface in `section` unchanged.
