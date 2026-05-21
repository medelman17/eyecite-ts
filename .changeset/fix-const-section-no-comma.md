---
"eyecite-ts": patch
---

fix(constitutional): capture `§ N` section without comma separator

`OPTIONAL_SECTION` and `OPTIONAL_CLAUSE` in the constitutional body
regex required a leading `[,;]` between the article/amendment numeral
and the `§`/`cl.` token. Real-world Bluebook citations frequently omit
the separator:

- `U.S. Const. amend. XIV § 1` → section dropped (now: `section="1"`)
- `U.S. Const. art. III § 2` → section dropped (now: `section="2"`)
- `Cal. Const. art. I § 7` → section dropped (now: `section="7"`)
- `U.S. Const. art. III § 2 cl. 1` → section + clause dropped

Made the leading punctuation optional. Existing comma/semicolon forms
continue to parse as before. The bare-numeral guard
(`U.S. Const. amend. XIV 1` — no `§`) still rejects, because the regex
still requires `§ <numeral>` to capture as section.

7 regression tests in `tests/extract/issueConstSectionNoComma.test.ts`.
