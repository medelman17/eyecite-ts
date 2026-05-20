---
"eyecite-ts": minor
---

feat(extract): add treatise extractor for common multi-volume works (#579)

Recognizes the most common federal and state treatises as a new
`treatise` citation type with `{ volume, title, section, edition?,
year? }` fields. Initial allowlist covers:

- Federal practice: Wright & Miller (`Federal Practice and Procedure`),
  Moore's Federal Practice, LaFave & Israel
- Contracts: Williston on Contracts, Corbin on Contracts
- IP: Nimmer on Copyright, McCarthy on Trademarks
- Torts: Prosser and Keeton on the Law of Torts
- Evidence: Wigmore, McCormick
- California: Witkin (Cal. Procedure, Summary of California Law)
- Administrative: Davis & Pierce
- Criminal: LaFave, Criminal Law

The allowlist approach is intentional — treatise citations are
heterogeneous and we'd rather miss an uncommon treatise than emit
false positives on arbitrary `<vol> Author, Book § N` prose. Adding
a treatise is a one-line change in `secondaryAuthorityPatterns.ts`.

Section parser handles dot-separated locators (`5.05`, `12.34`) and
bracketed sub-references common in Nimmer (`5.05[A]`). Edition
parenthetical (`5th ed. 2008`) is captured for the `edition` field
and the year is extracted into `year` via the existing plausible-year
filter.

Public API additions: `TreatiseCitation`, `extractTreatise`,
`treatise` pattern, `TreatiseComponentSpans`. `toBluebook` renders
treatises in volume + title + `§ section` form.
