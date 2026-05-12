---
"eyecite-ts": patch
---

feat: extract California bare-code statute citations (`Pen. Code § 148`, `Code Civ. Proc., § 1021.5`) (#296)

California opinions and single-jurisdiction California briefs cite
bare-code forms ~10× as often as the fully-qualified `Cal. Penal Code §
148`. The existing `named-code` pattern required a `Cal.` jurisdiction
prefix, so common forms like `Pen. Code § 148`, `Code Civ. Proc., §
1021.5`, `Bus. & Prof. Code § 17200`, and `Welf. & Inst. Code § 5150`
were silently dropped (returned `[]`).

Surfaced by the 200-opinion modern-era sweep as the **largest** miss
category — 633 statute misses across 200 opinions, concentrated in
California opinions which dominate any modern US case-law corpus.

### Fix

New closed-set tokenizer pattern + dedicated extractor:

- `src/data/caBareCodes.ts` — 28-entry closed alternation of California
  bare-code abbreviations (`Pen. Code`, `Civ. Code`, `Code Civ. Proc.`,
  `Code Crim. Proc.`, `Veh. Code`, `Gov. Code`, `Bus. & Prof. Code`,
  `Welf. & Inst. Code`, `Health & Safety Code`, `Fam. Code`, `Lab. Code`,
  `Pub. Util. Code`, `Pub. Cont. Code`, `Pub. Resources Code`,
  `Unemp. Ins. Code`, `Educ. Code`, `Evid. Code`, `Elec. Code`,
  `Corp. Code`, `Prob. Code`, `Ins. Code`, `Fish & Game Code`,
  `Food & Agric. Code`, `Harb. & Nav. Code`, `Mil. & Vet. Code`,
  `Rev. & Tax. Code`, `Sts. & Hy. Code`, `Water Code`). Periods and
  whitespace are flexible in the regex fragments. Alternation is sorted
  longest-first so PEG-style ordered choice picks the most specific
  match (`Code Civ. Proc.` beats `Civ. Code`).
- `src/patterns/statutePatterns.ts` — new `ca-bare-code` Pattern entry.
- `src/extract/statutes/extractCaBareCode.ts` — dedicated extractor that
  normalizes the matched code text back to its canonical form via
  `findCaBareCode` and always sets `jurisdiction: "CA"`.
- `src/extract/extractStatute.ts` — new dispatch case routes
  `ca-bare-code` tokens to the new extractor.

The closed-alternation approach (rather than making the `named-code`
jurisdiction prefix optional) avoids over-matching: phrases like
"Insurance Law applies" in non-citation prose stay unmatched because
"Insurance Law" is not in the closed list. The section-body regex
reuses the period-guarded shape from #283 so trailing sentence
punctuation is not absorbed.

### Scope notes (deferred follow-ups)

- **New York bare laws** (`Labor Law § 240(1)`, `Insurance Law`,
  `Penal Law`, `Education Law`, etc.) — same fix shape, separate PR.
- **Connecticut `General Statutes`** standalone form.
- **Pennsylvania bare** (`Pa. C.S. §`, `P.S. §`).
- **Texas bare-code** forms.
- **IRC prose forms** (`Section 130(c) of the Code`, `Internal Revenue
  Code Section 130(c)`).
- **Per-document statute context** — link bare references back to an
  opinion's earlier fully-qualified citation (analogous to short-form
  case resolution from #216 / #278).

### Tests

9 new tests under `California bare codes (#296)` in
`tests/extract/extractStatute.test.ts`:

- `Pen. Code § 148`, `Civ. Code § 1714` — single-word codes
- `Code Civ. Proc., § 1021.5` — leading "Code" + comma separator
- `Veh. Code § 23550.5` — decimal section number
- `Bus. & Prof. Code § 17200`, `Welf. & Inst. Code § 5150`,
  `Health & Safety Code § 11350` — ampersand variants
- Regression baselines: fully-qualified `Cal. Penal Code § 148` still
  parses via the existing `named-code` extractor (returns
  `code: "Penal"`); federal `42 U.S.C. § 1983` unchanged

Full 2399-test suite passes; no regressions.
