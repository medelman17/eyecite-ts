---
"eyecite-ts": patch
---

fix(extract): treatise author-prefixed form recognized (#643)

Resolves #643. The treatise extractor missed Bluebook R15's canonical
full-author form (`5A Charles Alan Wright & Arthur R. Miller, Federal
Practice and Procedure § 1357`) — the dominant style in modern
federal briefs and law-review footnotes.

| input | before | after |
|---|---|---|
| `5A Charles Alan Wright & Arthur R. Miller, Federal Practice and Procedure § 1357` | 0 cites | volume=5, title=`Federal Practice and Procedure` ✓ |
| `2 Wayne LaFave, Criminal Law § 5.1` | 0 cites | volume=2, title=`Criminal Law` ✓ |
| `5 Wright & Miller, Federal Practice and Procedure § 1290` (compact form) | unchanged | unchanged ✓ |
| `1 Witkin, Cal. Procedure (5th ed. 2008) § 234` (compact + edition) | unchanged | unchanged ✓ |

Changes:
- Volume admits an optional letter suffix (`5A`, `13C`) for sub-volume citations
- Added a `KNOWN_TREATISE_BARE_TITLES` alternation (just the title, no embedded author)
- Tokenizer + extractor regexes now accept either the compact form (winning by alternation order to preserve existing tests) OR an author-prefix + bare title
- Author prefix constrained to capitalized words optionally joined by `&`, so prose can't false-positive

Known limitation (not in this patch): trailing `(3d ed. 2004)` parenthetical AFTER the section is not yet captured as edition/year. The existing pattern only handles edition-paren BEFORE the section.

5 regression tests in `tests/extract/issueTreatiseAuthorPrefix.test.ts`.
