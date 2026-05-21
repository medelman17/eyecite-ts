---
"eyecite-ts": patch
---

fix(extract): capture multi-page pincites and reject explanatory paren leak — #639

Three related bugs were dropping pincite data on the floor or attaching the
wrong text to the wrong field:

- **Statutes at Large** (`100 Stat. 3743, 3755`) — the tokenizer captures
  only `100 Stat. 3743` and the extractor had no scan for a trailing
  `, NNN` continuation. The cited point on the section was silently
  discarded.
- **Short-form `at`** (`909 F.2d at 1025, 1027`) — the tokenizer captures
  only the first pincite and the extractor never looked ahead for
  comma-separated continuations, so a string of pincites in the same
  short-form cite (`at 125, 127, 130`) reduced to the first.
- **Statute explanatory parenthetical** (`ORS 161.085(2) ("voluntary act"
  defined)`) — the abbreviated-code subsection chain accepted `[^)]*`
  inside parens, so any non-year explanatory paren was absorbed into the
  subsection field (`(2)("voluntary act" defined)`).

Fixes:

- `extractStatutesAtLarge` now accepts an optional `cleanedText` argument
  and scans past `cleanEnd` for a `, NNN[-MM]` continuation using a
  pincite regex that mirrors the boundary semantics of the case-cite
  lookahead (rejects `\s+[A-Z]` so a following parallel cite isn't
  absorbed). New fields on `StatutesAtLargeCitation`: `pincite`,
  `pinciteEndPage`, `pinciteIsRange`.
- `extractShortFormCase` now scans the post-token tail in `cleanedText`
  for additional comma-separated pincites and populates
  `pinciteInfo.additionalPincites`, matching the multi-pincite handling
  in `extractCase` for full-form `, 115, 153, 200` chains (#247). The
  trailing-parenthetical scan is shifted past consumed pincites so
  `at 125, 127 (citations omitted)` still binds.
- The abbreviated-code subsection content class is tightened from
  `[^)]*` to `[A-Za-z0-9.-]+` in both the tokenizer pattern
  (`buildAbbreviatedCodeRegex` in `src/data/stateStatutes.ts`) and the
  consumer regex (`ABBREVIATED_RE` in `extractAbbreviated.ts`). The `.`
  is kept for NM decimal subsections (`(1.5)`; #565). Explanatory parens
  no longer absorb into `subsection`.
