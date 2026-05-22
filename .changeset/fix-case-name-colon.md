---
"eyecite-ts": patch
---

fix(extract): case-name backscan accepts colon in subtitles

V_CASE_NAME_REGEX's plaintiff/defendant char class lacked `:`, so case
names with subtitle separators returned `caseName=null`:

| input | before | after |
|---|---|---|
| `Smith v. Jones: Continued, 100 F.2d 1` | null | `Smith v. Jones: Continued` ✓ |
| `Smith v. Jones: A Sequel, 100 F.2d 1` | null | `Smith v. Jones: A Sequel` ✓ |

Added `:` to both plaintiff and defendant char classes. Case names
without colons (most cases) are unaffected.

4 regression tests in `tests/extract/issueCaseNameColon.test.ts`.
