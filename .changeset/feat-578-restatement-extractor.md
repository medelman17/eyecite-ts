---
"eyecite-ts": minor
---

feat(extract): add Restatement extractor (#578)

Recognizes `Restatement (Edition) of Subject § Section` citations as
a new `restatement` citation type with `{ edition, subject, section,
subsection? }` fields.

Edition accepts both spelled-out (`First`, `Second`, `Third`, `Fourth`)
and ordinal short forms (`1st`, `2d`, `3d`, `4th`), normalized to the
canonical spelled-out form. Subject body permits multi-word subjects
including `"the Law Governing Lawyers"`, `"Foreign Relations Law"`, etc.

Section parsing uses the internal-`.` rule so a trailing sentence
period is not absorbed (`Restatement (Second) of Trusts § 187.` →
`section: "187"`). Trailing court/publisher parentheticals like
`(Am. L. Inst. 1965)` are left for downstream parsing.

Public API additions:
- `RestatementCitation` interface
- `extractRestatement` extractor
- `restatement` pattern in `secondaryAuthorityPatterns`
- `RestatementComponentSpans`
- `"restatement"` added to `CitationType` and `FullCitationType` unions
- `toBluebook` renders Restatement in canonical Bluebook form
