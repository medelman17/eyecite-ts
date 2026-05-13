---
"eyecite-ts": patch
---

fix: Michigan `MSA` no longer mis-classified as Minnesota; bracket-subscript sections (`MSA 23.710[252]`) preserved (#370)

A 32-opinion Michigan sweep showed 100% (53/53) of `MSA` citations
mis-classified as Minnesota — `MSA` matched Minnesota's
`M\.?S\.?A\.?` regex fragment (which made dots optional). The
dotless `MSA` is in fact **Michigan Statutes Annotated** (Callaghan),
the historical companion to MCL; the dotted `M.S.A.` is the Bluebook
abbreviation for Minnesota Statutes Annotated.

### Fixes

- **MSA disambiguation**: Minnesota's regex fragment in
  `src/data/stateStatutes.ts` tightened from `M\.?S\.?A\.?`
  to literal `M\.S\.A\.` (dots required). A new Michigan entry
  for Michigan Statutes Annotated (`abbreviations: ["Mich. Stat.
  Ann.", "MSA"]`) lives alongside the existing MCL entry, so
  the canonical `code` for `MSA` citations stays `MSA` rather
  than being normalized to `MCL`.

- **Bracket-subscript sections**: section body in
  `buildAbbreviatedCodeRegex` and `ABBREVIATED_RE`
  (`extractAbbreviated.ts`) now accepts either `(...)` or
  `[...]` as trailing subscript groups. MSA cites bracket
  subscripts (`23.710[252]`) interchangeably with parens. The
  `SUBSECTION_RE` in `parseBody.ts` was extended to split on
  the first `[` as well, so `23.710[252]` parses as
  `section="23.710"`, `subsection="[252]"`.

### Behavior changes

- `MSA 23.710(254)` now emits `code: "MSA"`, `jurisdiction:
  "MI"` (was `code: "M.S.A."`, `jurisdiction: "MN"`).
- `MSA 23.710[252]` now extracts (was: dropped at tokenize
  time because section body rejected brackets).
- `M.S.A. § 480A.06` continues to emit `jurisdiction: "MN"`
  — the dotted form is the Bluebook standard for Minnesota.
- `Minn. Stat.` / `Minn. Stat. Ann.` continue to emit
  `jurisdiction: "MN"`.
- `MCL` / `MCLA` / `M.C.L.` / `Mich. Comp. Laws` continue to
  emit `jurisdiction: "MI"` with their respective canonical
  code names.

### Scope notes

The following pieces of #370 are intentionally deferred:

- **`Stat Ann 1963 Rev § 21.96`** — year-edition variant
  format, sibling to the deferred `IC YYYY` (#363), `C.R.S.
  1963` (#352), `K.S.A. Supp.` (#367) family. Needs a unified
  edition-year data model decision.
- **`PA 1901, No 206`** — Public Acts session laws.
  Deferred alongside the other session-law formats (`Ga. L.`,
  `Stats.`, `Laws of Florida`, etc.) pending a unified
  `sessionLaw` citation type.
- **Prose forms** like `section 3110(3) of the Michigan
  no-fault statute` — needs document-level context to attach
  a jurisdiction.

### Tests

6 new tests under `Michigan MSA jurisdiction + bracket
subscripts (#370)` in `tests/extract/extractStatute.test.ts`:

- `MSA 23.710(254)` → `code="MSA"`, `jurisdiction="MI"`
- `MSA 23.710[252]` → `subsection="[252]"`
- `Mich. Stat. Ann. § 23.710` → `jurisdiction="MI"`
- Regression: `M.S.A. § 480A.06` → `jurisdiction="MN"`
- Regression: `Minn. Stat. § 290.16` → `jurisdiction="MN"`
- Regression: `MCL 801.258` → `code="MCL"`,
  `jurisdiction="MI"`

Full 2589-test suite passes; no regressions.

### Related

Same disambiguation pattern as #360 (Idaho `I.C.` vs Indiana
`IC`): when two states share an abbreviated form, prefer the
formally-distinct surface (dots vs. no-dots, spacing) to
route to the more common modern usage. The Michigan side
follows the published source — Callaghan's MSA was the
modern Michigan abbreviation through the 1990s.
