---
"eyecite-ts": minor
---

feat(extract): state-const prose article-first form (#321 partial)

Resolves the article-first prose sub-issue of #321.
`article XII, section 5 of the California Constitution` (article-first
ordering) wasn't recognized. The pre-existing
`state-const-prose-section-article` pattern handled only the
section-first form (`Section 5, Article IV of the Ohio Constitution`).

| input | before | after |
|---|---|---|
| `article XII, section 5 of the California Constitution` | 0 cites | article=12, section=5, CA ✓ |
| `article VI, section 10, of the California Constitution` (extra comma) | 0 cites | article=6, section=10, CA ✓ |
| `Section 5(B), Article IV of the Ohio Constitution` (section-first) | unchanged | unchanged ✓ |
| `art. 14 of the Massachusetts Declaration of Rights` | unchanged | unchanged ✓ |

Added `state-const-prose-article-first` pattern + matching extractor
branch. Covers all 50 US states.

4 regression tests in `tests/extract/issueStateConstProseArticleFirst.test.ts`.

This completes the major sub-issues of #321 covered in this PR series.
The original issue's `Sections 5 and 10 of Article I of the Ohio
Constitution` plural-section form remains open (rare; would need
another bare-numeral chain expansion analogous to PR #771).
