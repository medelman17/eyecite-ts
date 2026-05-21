---
"eyecite-ts": patch
---

fix(extract): case-name backscan handles non-ASCII letters (umlaut, accents, cedilla)

The plaintiff/defendant character class in `V_CASE_NAME_REGEX` was
ASCII-only (`[A-Za-z0-9\s.,'&()/-]+?`), so any case name containing
non-ASCII letters failed the backscan and surfaced as `caseName=null`:

- `Müller v. Schmidt, 100 F.2d 1 (1990)` → `caseName=null` ⇒ now `Müller v. Schmidt` ✓
- `Société Générale v. Banque, 100 F.2d 1 (1990)` → null ⇒ `Société Générale v. Banque` ✓
- `Pérez v. González, 100 F.2d 1 (1990)` → null ⇒ `Pérez v. González` ✓
- `Çelik v. Banque, 100 F.2d 1 (1990)` → null ⇒ `Çelik v. Banque` ✓
- `Smith v. Müller, 100 F.2d 1 (1990)` → null ⇒ `Smith v. Müller` ✓

Extended the character class to include Latin-1 Supplement (`À`-`ÿ`) and
Latin Extended-A (`Ā`-`ſ`), which covers the bulk of accented characters
in real case names (French, German, Spanish, Polish, etc.). The
uppercase anchor accepts both ASCII and uppercase Latin-1
(`À`-`Þ`), so plaintiffs whose name begins with `Ç`, `É`, `Ö` still
anchor the scan correctly.

6 regression tests in `tests/extract/issueCaseNameUnicode.test.ts`.
