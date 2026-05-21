---
"eyecite-ts": patch
---

fix(resolve): shortFormCase partyName uses token-sequence match (no prefix collisions)

PR #677's party-name disambiguation block used plain substring containment
(`name.includes(targetParty) || targetParty.includes(name)`), which
caused prefix collisions:

- `Smith v. Jones, 100 F.2d 1. Smithers v. Brown, 100 F.2d 50. Smith, 100 F.2d at 7.`
  → resolvedTo=1 (Smithers, wrong) — `"Smithers".includes("Smith")` ✗
  → now resolvedTo=0 (Smith, correct) ✓
- `Doe v. Acme, 100 F.2d 1. Doering v. Beta, 100 F.2d 50. Doe, 100 F.2d at 7.`
  → similarly fixed

Switched to the existing `containsTokenSequence` helper (whole-word,
sequential containment) so `Smith` matches `Smith Industries` but not
`Smithers`.

Additionally, renormalized the short-form's `partyName` through the
resolver's own `normalizePartyName` (instead of using the raw
`partyNameNormalized` from extraction). Corporate suffixes (`Inc.`,
`LLC`, `Corp.`) and connectors (`et al.`) are now stripped on both
sides of the comparison so `Smith, Inc., 100 F.2d at 7` matches a
`Smith v. Jones` antecedent.

5 regression tests in
`tests/resolve/issueShortformPartyNameSubstringCollision.test.ts`.
