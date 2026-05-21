---
"eyecite-ts": patch
---

fix(resolve): shortFormCase partyName disambiguation works when antecedent has no `v.`

When two full case citations shared the same volume + reporter and the
antecedents were one-party references (`Smith, 100 F.2d 1.`,
`Doe, 100 F.2d 5.`), the shortFormCase resolver fell back to recency
because the antecedents had `plaintiffNormalized`/`defendantNormalized`
both undefined (the `v.` separator is what splits caseName into
plaintiff + defendant). The disambiguation block at
`DocumentResolver.ts:884` only checked those two fields, so
`Smith, 100 F.2d at 3` resolved to **Doe** (most recent same-vol+reporter)
instead of **Smith** (correct party-name match).

Fix: in the party-name fallback, also check the antecedent's normalized
`caseName` when neither plaintiff nor defendant is populated. Single-
party shortform anchors now resolve correctly:

- `Smith, 100 F.2d 1. Doe, 100 F.2d 5. Smith, 100 F.2d at 3.` → resolvedTo=0 (Smith) ✓
- `Smith, 100 F.2d 1. Doe, 100 F.2d 5. Roe, 100 F.2d 9. Smith, 100 F.2d at 3.` → resolvedTo=0 ✓

Full `v.` antecedents continue to resolve via the existing plaintiff/
defendant check unchanged.

6 new tests in `tests/resolve/issueShortformPartynameDisambig.test.ts`
cover single-party + multi-party scenarios with same vol+reporter.
