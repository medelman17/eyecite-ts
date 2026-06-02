---
"eyecite-ts": patch
---

fix(resolve): bounded-depth bracket scan replaces the global paren-depth counter (#809)

`computeParenDepths` was a single running `(`/`)` counter over the whole document, so one dropped or garbled bracket (common in OCR/PDF) desynced the depth for **every** subsequent citation — silently mis-scoping antecedents. It now delegates to a new `computeBracketScopes`: a bounded-depth bracket stack scanned over the prose gaps between citations, reset at clause boundaries, so corruption is confined to the offending clause. Because only prose gaps are scanned, cite-internal periods (`v.`, `U.S.`) never trip the reset and balanced year parens never inflate depth. This fixes the resolver path (where `isParentheticalAside` reads the raw depth — a stray `(` previously excluded a perfectly good top-level antecedent in a later sentence) at the root, generalizing the tactical #798/#801 workarounds. `computeBracketScopes` also exposes a per-citation `balanceOk` structure-trust signal for future abstain gates (#800/#810). Balanced input is unchanged.
