---
"eyecite-ts": patch
---

fix: case-name lookback now recognizes state-practice abbreviations missing from Bluebook T6

The case-name backward scanner uses a stem set to distinguish abbreviation periods from sentence-ending periods. Four common abbreviations were missing, so case names containing them were truncated at the abbreviation period:

- **`Tp.`** (NJ practice for "Township") — `"Parsippany-Troy Hills Tp. Council, 68 N.J. 604"` lost everything before `Council`.
- **`Tax'n`** (Taxation) — agency captions like `"Dep't of Tax'n v. ..."` lost the prefix.
- **`Enf't`** (Enforcement) — `"Drug Enf't Admin. v. ..."` lost the prefix.
- **`Rts.`** (Rights) — `"Human Rts. Watch v. ..."` and `"Civ. Rts. Div."` lost the prefix.

These appear in real captions across NJ, federal agency cases, and human-rights / civil-rights litigation. The Bluebook T6 reporters-db source we align with covers `Twp.` but not the NJ-style `Tp.` shorthand, and omits the three apostrophe-form variants. Added the four stems to `CASE_NAME_ABBREVS` with regression tests.
