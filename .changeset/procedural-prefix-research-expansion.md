---
"eyecite-ts": patch
---

fix: cross-domain procedural prefix expansion — 29 additions from 6-agent research dispatch

Follow-up to #242. Six parallel research dispatches canvassed federal and
state caption forms across the family, probate, bankruptcy, immigration,
criminal/habeas, and ex rel./qui tam domains. Adds 29 new procedural-prefix
forms appearing in published opinions but missed by the prior regex.

Domain-by-domain summary:

- **Family / juvenile** — `In re Welfare of` (MN), `In the Matter of the
  Welfare of` (MN long form), `In re Dependency of` (WA), `In re Termination
  of Parental Rights as to/to/of` (AZ, NV, WI, SC, VT, NE), `In re Paternity
  of` (IN, WI, IL), `In re Parentage of` (CA, IL, WA, NJ), `Care and Protection
  of` (MA bare form).
- **Probate (Louisiana)** — `Succession of` (LA civil-law decedent-estate
  caption — does not use "Estate of"; the bare-form caption misses entirely
  under the old regex).
- **Bankruptcy / state insurance insolvency** — `In re Liquidation of`, `In re
  Rehabilitation of`, `In re Receivership of`, plus the `In the Matter of the
  [X] of` and `Matter of [X] of` long-form variants.
- **Immigration / naturalization** — `In re Petition for Naturalization of`,
  `In re Naturalization of`, `Petition for Naturalization of`.
- **Criminal / habeas / extradition** — `In re Extradition of`, `In the Matter
  of the Extradition of`, `In re Application of`, `In the Matter of the
  Application of` (precision upgrade over the existing bare `Application of`).
- **Sovereign ex rel. variants** — `People ex rel.` (NY/CA/IL — large corpus),
  `District of Columbia ex rel.`, `Commonwealth of Puerto Rico ex rel.` (must
  precede `Commonwealth ex rel.` to avoid sovereign-identity loss), `Government
  of the Virgin Islands ex rel.`.

All additions follow the longer-first alternation convention so the regex
prefers the more specific match (e.g., `In re Welfare of` beats `In re`;
`Commonwealth of Puerto Rico ex rel.` beats `Commonwealth ex rel.`). The
parallel `proceduralPrefixes` array in `extractPartyNames` mirrors the regex
order so `proceduralPrefix` is correctly set on the returned citation.

Adds 31 corpus-sourced regression tests (29 new prefixes + 4 regression
controls including a `People v. Smith` test that verifies `People ex rel.`
does not capture criminal adversarial captions). All test inputs are verbatim
case captions from published opinions cited in the research docs at
`docs/research/2026-05-11-procedural-prefixes-*.md`.
