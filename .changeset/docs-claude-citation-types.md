---
"eyecite-ts": patch
---

docs(CLAUDE.md): include `docket` and `constitutional` in CitationType enumeration (#575)

The "Type System" architecture note in `CLAUDE.md` listed only 10 of the 12 discriminator values, omitting `docket` and `constitutional`. The real `CitationType` union at `src/types/citation.ts:16-28` and the README's exhaustive `switch` example both list all 12. Updated the enumeration to match, in document order (`case | docket | statute | journal | neutral | publicLaw | federalRegister | statutesAtLarge | constitutional | id | supra | shortFormCase`). Docs only; no runtime change.
