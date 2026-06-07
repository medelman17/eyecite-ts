---
"eyecite-ts": minor
---

refactor(resolve) + feat(extract): thread the `Id.` section-pincite terminal forward (#847)

The resolver's `Id.` family preference (case vs statute) used to peek ~20 chars of raw text after `Id.` for a `§`, because `extractId`'s pincite regex captures only page/paragraph shapes. Extraction now emits a `sectionPincite` terminal on `IdCitation` (the locator after `§`/`§§`, e.g. `1983(c)`), and the resolver reads that structured field instead of re-scanning prose — collapsing two duplicate raw-text peeks (`tailHasSection` + `getIdPreferredFamily`) into one field read. Behavior-preserving; the short-form resolution suite is green.

First slice of #847 (CST→AST: stop re-parsing prose in the resolver). The remaining case-name-inference sites (the 80-char mismatch re-tokenize and the 400-char `Party v. Party` scans) are split into a follow-up, to land with the authoritative-grammar / capture-group-threading work (#844).
