---
"eyecite-ts": patch
---

fix(filter): hard-reject phantoms whose reporter contains a month name (#669)

Resolves #669. Multi-word "reporter" captures containing a month-name
token (`On July`, `From January`, `By December`) are always prose, never
real citations — real reporter abbreviations never contain month names.
Previously these survived as confidence=0.1 + warning under the
penalize path; now they are hard-rejected so consumers never see them.

| input | before | after |
|---|---|---|
| `¶ 8 On July 11` | 1 cite (conf 0.1) | 0 cites ✓ |
| `¶ 2 On March 18, 2003` | 1 cite (conf 0.1) | 0 cites ✓ |
| `1-602 Applications\nOn October 19, 2015` | 1 cite (conf 0.1) | 0 cites ✓ |
| `Smith v. Jones, 100 F.2d 1` (real cite) | unchanged | unchanged ✓ |

Added `isMonthInProseReporter` to `applyFalsePositiveFilters`' hard-
reject pass alongside the existing `isMonthNameDateMisparse`. The new
check fires when the reporter has ≥2 words and any word is a month
name (case-insensitive).

Two previously-skipped tests in `issuePhantomCaseRejection.test.ts`
are now enabled. The penalize-mode test in `issue547FullspanOvershoot.test.ts`
was updated to assert hard-rejection (the cleaner outcome the issue
asked for).
