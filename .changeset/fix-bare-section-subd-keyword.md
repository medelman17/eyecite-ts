---
"eyecite-ts": patch
---

fix(extract): bare-section short-form captures subdivision keyword (#663 / #655)

Resolves the subdivision-keyword sub-issue of #663 and #655. Bare
`§ N` short-form citations that inherit from an upstream CA-code
antecedent (`Health & Saf. Code, § 1375.4`) lost their subdivision
chain — `§ 1347.15, subd. (b)(1)-(3)` extracted with
`section="1347.15"` and `subsection=undefined`.

| input (in CA-code context) | before | after |
|---|---|---|
| `§ 1347.15, subd. (b)(1)-(3)` | subsection=undefined | `(b)(1)` + range to `(3)` ✓ |
| `§ 1317, subds. (a), (b)` | section=`1317, subds.`, no subsection | section=`1317`, subsection=`(a)` ✓ |
| `§ 1371.4(e)` (no keyword) | unchanged | unchanged ✓ |
| `§ 1348.6, subd. (b)` | subsection=undefined | `(b)` ✓ |

Two coordinated changes:
1. `BARE_SECTION_RE` in `detectBareSectionShortForms` now captures the
   optional `,?\s+(?:subd\.|subdivision|subds\.|subdivisions|...)\s+(\X\)...` keyword chain plus an optional `-(N)` range trailer.
2. `normalizeSubdKeyword` in `parseBody` accepts the plural `subds.` /
   `subdivisions` forms alongside the existing singular variants.

The captured body is now passed through `parseBody`, which splits the
section from the subsection chain and surfaces `subsectionRange` when
the keyword chain ends with a paren-range trailer.

4 regression tests in `tests/extract/issueBareSectionSubd.test.ts`.

CA bare-section without an upstream code anchor (the broader #655 /
#663 scope) remains a separate issue requiring context-tracking.
