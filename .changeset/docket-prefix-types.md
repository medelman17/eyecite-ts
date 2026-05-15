---
"eyecite-ts": patch
---

fix: docket pattern accepts `C.A.` / `Civ.` / `Civil` / `Case` / `Civil Action` / `Adv.` / `Docket` prefixes

Docket-number citations preceded by a docket-type prefix were
silently dropped. The corpus survey in
`tests/fixtures/docket-citations.json` shows these forms across
all 39 states:

- `C.A. No.` — Delaware Chancery Action
- `Civ. No.` / `Civil No.` — federal civil docket (also HI, NH, MA)
- `Civil Action No.` — spelled-out federal form
- `Case No.` — generic (CA, FL, GA, MD, SC, SD, VA, WI, WV)
- `Adv. No.` — bankruptcy adversary proceeding
- `Docket No.` — MA, MI, CT, NJ, NV, NC, VT appellate/trial form

### Fix

Extended the `docket-paren-court-year` pattern and the
`extractDocket` token parser to accept an optional prefix
immediately before `No.`. The prefix is dropped from the
extracted `docketNumber` — the canonical docket number is the
alphanumeric/hyphen sequence that follows. Also extended the
docket-number character class so docket numbers may start with
letters (`CV-01-0508597`, `A08A0646`) as well as digits.

### Tests

9 new tests under `Docket-number prefixes` in
`tests/extract/extractDocket.test.ts`: every prefix family, the
user-reported `(cited in IMG Holding LLC v. Dimon, C.A. No. ...)`
parenthetical case, CT trial-court `Docket No. CV-...` form,
and a plain `No.` regression sentinel. Full 2918-test suite
passes.
