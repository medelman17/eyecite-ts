---
"eyecite-ts": patch
---

fix: case-name lookback recognizes ~58 additional abbreviations from cross-jurisdictional survey

Cross-agent research canvassed 15 jurisdictional clusters and produced consensus on abbreviations that appear in real case captions but were missing from `CASE_NAME_ABBREVS`. Adding them prevents the backward case-name scanner from treating intra-caption abbreviation periods as sentence boundaries.

Categories of additions (full per-stem source citations in `src/extract/extractCase.ts`):

- **Universal apostrophe-form + Bluebook BT1.2 party designations**: `atty` (Att'y / Att'y Gen. — 32k+ corpus matches across every state and federal AG case), `attys`, `petr` (Pet'r), `respt` (Resp't), `commrs` (plural of existing commr).
- **Plurals of existing singular stems for modern LLC-era captions**: `hldgs`, `hldg`, `props`, `prods`, `ents`, `invests`, `scis`, `emps`, `sols`, `corrs`, `telecomms`, `examrs`, `cmtys`, `colls`, `cts`, `amends`.
- **Standard institutional / agency**: `civ` (Civ. — including Ala. Civ. App., Civ. Rts. Div.), `enf` (Enforcement, distinct from existing `enft`), `advis`, `utils`, `lic` (License), `bur` (Bureau), `insp` (Inspection), `conserv` (Conservation), `retire` (distinct from `ret`), `discipl`, `supers` (PA Twp. Bd. of Supers.), `edn` (Ohio Edn.), `coun` (Council, distinct from existing `couns`), `stds`, `procs`, `quals`.
- **Regional / state-specific**: `boro` (NJ long-form alternative to existing `bor`), `commw` (PA Commonwealth Court), `adv` (NV Adv. Op.), `comn` (Hawaii single-m variant of Comm'n), `irrig`, `reclam`, `rptr` (Cal.Rptr.), `vet` (Vet. App., Sec'y of Vet. Aff.), `trib`, `adj`, `vol` (PA Vol. Fire Dept.).
- **Corporate entity forms**: `pty` (Australian Pty. Ltd.).
- **Bluebook 21st edition (2020) T6/T13.2 merger additions**: `poly` (Pol'y), `stud` (Stud.), `libr` (Libr.), `refin` (Refin., distinct from existing `ref`), `socio` (Sociology, distinct from existing `soc`), `laby` (Lab'y, distinct from existing `lab`), `naty` (Nat'y / Nationality), `wkly`, `appx` (App'x / F. App'x reporter).

Adds 21 regression tests covering representative samples from each category. Per-region research reports retained in `docs/research/2026-05-10-citation-abbrevs-*.md` plus a `2026-05-10-citation-style-quirks.md` parser-improvement roadmap (paragraph pincites `¶ N`, hyphenated neutral cites like `2010-NMSC-007`, CA year-first format, TX writ history, state LEXIS) for future work.
