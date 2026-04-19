# eyecite-ts

## 0.10.3

### Patch Changes

- [#189](https://github.com/medelman17/eyecite-ts/pull/189) [`7425448`](https://github.com/medelman17/eyecite-ts/commit/74254483a962ec8a37a92630e88cf7f84dc4102f) Thanks [@medelman17](https://github.com/medelman17)! - fix: close remaining case-name boundary gaps for NY-style citations (#187, #188)

  Two root causes behind remaining `caseName` failures on real-world NY briefs:

  - **Missing geographic/street abbreviations.** `Is.` (Island), `Mt.` (Mount),
    `Ft.` (Fort), `Pt.` (Point), `Rt.` (Route), `St.` (Saint/Street), `Blvd.`,
    `Sq.`, `Hwy.`, `Pkwy.`, and `Hts.` were not in `CASE_NAME_ABBREVS`, so the
    backward scanner treated their periods as sentence boundaries and truncated
    names like `Clark-Fitzpatrick, Inc. v. Long Is. R.R. Co.` and
    `Matter of Long Is. Power Auth. Hurricane Sandy Litig.`. Added to the
    Bluebook T6/T10 set.
  - **Missing paren signal words.** `quoted in`, `accord`, and the
    `citing, e.g.,` form were not recognized as hard boundaries, so backward
    scans of citations introduced by those signals overshot into the prior
    citation's trailing parenthetical. Extended `PAREN_SIGNAL_BOUNDARY_REGEX`.

## 0.10.2

### Patch Changes

- [#185](https://github.com/medelman17/eyecite-ts/pull/185) [`e1a46d0`](https://github.com/medelman17/eyecite-ts/commit/e1a46d0085f50ae9553277085e90ef889a104873) Thanks [@medelman17](https://github.com/medelman17)! - fix: robust case-name boundary detection with Bluebook T6/T10 abbreviations (#182, #183, #184)

  Replace the narrow LEGAL_ABBREVS regex (~30 entries) with a comprehensive Bluebook-sourced abbreviation set (200+ entries from T6/T7/T10) backed by heuristics for single-letter initials and dotted initialisms. Add hard boundary detection for Id. markers and parenthetical signal words (quoting, citing, cited in). Fixes case names that were undefined, truncated, or overshot when party names contained abbreviation chains like "Cent. Sch. Dist.", "Mgt., Inc.", or "A.N.L.Y.H. Invs."

## 0.10.1

### Patch Changes

- [#178](https://github.com/medelman17/eyecite-ts/pull/178) [`d72ba1e`](https://github.com/medelman17/eyecite-ts/commit/d72ba1ea17a6b28dea1eaf35ffedea66717af095) Thanks [@medelman17](https://github.com/medelman17)! - Fix case name extraction still capturing sentence context in two scenarios: sentence-initial pronouns like "This" bypassing the trimming guard, and "In" prefix not being stripped from caseName after extractPartyNames removes it from plaintiff.

## 0.10.0

### Minor Changes

- [#177](https://github.com/medelman17/eyecite-ts/pull/177) [`fc83dff`](https://github.com/medelman17/eyecite-ts/commit/fc83dff3aae6d8a9e5e3ae3c84827d3e37bb0645) Thanks [@medelman17](https://github.com/medelman17)! - Add granular component spans for all citation types. Each citation now carries a `spans` record with per-component position data (volume, reporter, page, court, year, caseName, plaintiff, defendant, signal, etc.). Explanatory parentheticals gain a `span` field. New `spanFromGroupIndex` utility exported for power users. Closes #172, closes #171.

### Patch Changes

- [#175](https://github.com/medelman17/eyecite-ts/pull/175) [`76bd36d`](https://github.com/medelman17/eyecite-ts/commit/76bd36d3a1e43b60f4ee4e9deee47aaf512c24da) Thanks [@medelman17](https://github.com/medelman17)! - Fix case name extraction capturing preceding sentence context as plaintiff. Add `isLikelyPartyName` validation with trimming when lowercase non-connector words are detected.

- [#173](https://github.com/medelman17/eyecite-ts/pull/173) [`d96719a`](https://github.com/medelman17/eyecite-ts/commit/d96719a56956e2c095a43b2c122a5bafa8ade773) Thanks [@medelman17](https://github.com/medelman17)! - Fix Id. resolution to correctly resolve through short-form, supra, and non-case citations. Remove dead `allowNestedResolution` option.

## 0.9.0

### Minor Changes

- [#166](https://github.com/medelman17/eyecite-ts/pull/166) [`42fc27d`](https://github.com/medelman17/eyecite-ts/commit/42fc27d8753892cd37ce19f71a4cc5913d55f52d) Thanks [@medelman17](https://github.com/medelman17)! - Add statute citation patterns for 31 additional US state jurisdictions

  Expands the `abbreviated-code` pattern family from 12 to 43 states using a data-driven
  regex generation approach. Each new state was verified against real citation formats from
  court opinions and legislative text.

  New jurisdictions: AK, AZ, AR, CT, DC, HI, IA, ID, KS, KY, LA, ME, MN, MO, MS, MT,
  ND, NE, NH, NM, NV, OK, OR, RI, SC, SD, TN, VT, WI, WV, WY.

## 0.8.4

### Patch Changes

- [#164](https://github.com/medelman17/eyecite-ts/pull/164) [`449e1ea`](https://github.com/medelman17/eyecite-ts/commit/449e1eaf2ce856b08898bbf7be30e7ec308faf11) Thanks [@medelman17](https://github.com/medelman17)! - Fix constitutional citation extraction gaps: support comma after "Const." separator, recognize "Amdt." abbreviation, and add low-confidence bare article pattern for standalone "Art. I, §8" references

## 0.8.3

### Patch Changes

- [#162](https://github.com/medelman17/eyecite-ts/pull/162) [`919c8c9`](https://github.com/medelman17/eyecite-ts/commit/919c8c9ed7ce6ef0ee93b76344fefe47c34dd7d8) Thanks [@medelman17](https://github.com/medelman17)! - fix: prevent greedy false matches in position mapping lookahead (#161)

  The `rebuildPositionMaps` lookahead found the _first_ matching character,
  not the _correct_ one. When `normalizeDashes` expanded em-dashes (— → ---)
  near text containing hyphens (e.g., page ranges like "110-115"), the
  deletion lookahead grabbed the wrong "-", collapsing subsequent position
  mappings and producing zero-length original spans on extracted citations.

  The fix adds a confirmation check: a lookahead match is only accepted when
  at least 3 characters after the match point also align. Both deletion and
  insertion directions are searched simultaneously and the shorter confirmed
  match wins, preventing greedy false matches.

## 0.8.2

### Patch Changes

- [#158](https://github.com/medelman17/eyecite-ts/pull/158) [`c46326b`](https://github.com/medelman17/eyecite-ts/commit/c46326b94ac96e15ff73b2b598c6797bedd3f866) Thanks [@medelman17](https://github.com/medelman17)! - fix: scale position mapping lookahead to handle long HTML tags (#154)

  The `rebuildPositionMaps` function used a fixed 20-character lookahead to match
  characters between before/after text during cleaning. HTML tags with attributes
  (e.g., `<span class="citation" data-id="1">` at 35+ chars) exceeded this
  window, causing the algorithm to fall back to 1:1 replacement mapping. This
  produced corrupted position maps where many clean-text positions collapsed to
  the same original position, resulting in zero-length original spans on
  extracted citations.

  The fix scales the lookahead dynamically based on the length difference between
  before and after text, with a floor of 40 characters.

## 0.8.1

### Patch Changes

- [#152](https://github.com/medelman17/eyecite-ts/pull/152) [`9dc0024`](https://github.com/medelman17/eyecite-ts/commit/9dc0024bb8fff64da12241aad5c5c8330a6631a9) Thanks [@medelman17](https://github.com/medelman17)! - Recalibrate confidence scoring for case and short-form case citations (#147). Case citations now use multi-factor scoring: base 0.2 + reporter recognition (+0.3) + year (+0.2) + case name (+0.15) + court (+0.1). This creates clear separation between real citations (0.7-1.0) and garbage extractions (0.2-0.3). Short-form case citations also factor in reporter recognition instead of using a hardcoded 0.7. Blank page citations use a floor of 0.5 instead of overriding to 0.8.

- [#148](https://github.com/medelman17/eyecite-ts/pull/148) [`307525a`](https://github.com/medelman17/eyecite-ts/commit/307525ab750dc32c94243024c7d566ab385b756e) Thanks [@medelman17](https://github.com/medelman17)! - Reduce false positive case citations from zip codes, docket numbers, and footnote markers (#145). Four fixes: (1) confidence scoring now uses exact reporter matching instead of substring (prevents "TCPA." from matching "A."); (2) new volume plausibility check flags volumes > 2000 (catches zip codes like 20006); (3) new docket-number pattern detection flags hyphenated volumes like "24-30706"; (4) expanded small-volume heuristic (1–20, was 1–9) now validates period-containing reporters against reporters-db instead of skipping them.

- [#153](https://github.com/medelman17/eyecite-ts/pull/153) [`8ae6849`](https://github.com/medelman17/eyecite-ts/commit/8ae6849181333b66f248d27bff50c2afe1fd43b3) Thanks [@medelman17](https://github.com/medelman17)! - Extend false positive filters to cover short-form case citations (#146). The `getReporter()` function only checked `type === "case"`, so `shortFormCase` citations with implausible reporters (prose text captured by the "at" keyword) bypassed all validation. Now all reporter/volume heuristics apply to short-form citations too.

- [#151](https://github.com/medelman17/eyecite-ts/pull/151) [`59df210`](https://github.com/medelman17/eyecite-ts/commit/59df2106b9ab05cd1d75217e5cb4ee1b18ae867a) Thanks [@medelman17](https://github.com/medelman17)! - Fix missing type declarations (#149). The package.json exports map pointed to `.d.ts` files that don't exist — the build emits `.d.mts` (ESM) and `.d.cts` (CJS). Updated exports to use conditional types per format so TypeScript consumers get proper type information for all entry points.

## 0.8.0

### Minor Changes

- [#143](https://github.com/medelman17/eyecite-ts/pull/143) [`821b5a3`](https://github.com/medelman17/eyecite-ts/commit/821b5a36b28843bee2a95f008088aedd08022a6c) Thanks [@medelman17](https://github.com/medelman17)! - Change default resolution scope strategy from `"paragraph"` to `"none"` (#131). The paragraph scope (`\n\n+` boundaries) was too restrictive for real court opinions where HTML stripping produces frequent double-newlines, blocking 87% of Id. and short-form resolutions. Resolution accuracy improves from 13% to ~97%. Users can still opt into paragraph scope via `resolutionOptions: { scopeStrategy: "paragraph" }`.

- [#138](https://github.com/medelman17/eyecite-ts/pull/138) [`1cc1c36`](https://github.com/medelman17/eyecite-ts/commit/1cc1c36b748c04f87adc05d0a88da68852bb7934) Thanks [@medelman17](https://github.com/medelman17)! - Add standalone supra citation extraction (#132). Previously, supra required a preceding party name, missing common footnote patterns like `supra note 12`, `supra at 15`, and `supra § 3`. New STANDALONE_SUPRA_PATTERN matches these with confidence 0.8. The `partyName` field on `SupraCitation` is now optional to support standalone references.

### Patch Changes

- [#139](https://github.com/medelman17/eyecite-ts/pull/139) [`7520153`](https://github.com/medelman17/eyecite-ts/commit/7520153ae7949c546e817236f634084e07a2baee) Thanks [@medelman17](https://github.com/medelman17)! - Add `rejoinHyphenatedWords` cleaner to restore words split across line breaks (#130). Court opinions wrap long words with hyphens at line breaks (e.g., `F. Sup-\np. 3d`), which prevented reporter recognition. The new cleaner runs before whitespace normalization, removing `hyphen + newline` sequences while preserving accurate span mappings to the original text.

- [#137](https://github.com/medelman17/eyecite-ts/pull/137) [`e80c737`](https://github.com/medelman17/eyecite-ts/commit/e80c73783e550d73855b78657c9df6a415de2180) Thanks [@medelman17](https://github.com/medelman17)! - Improve Id. citation precision with confidence differentiation and context validation (#129). Standard `Id. at N` gets confidence 1.0, comma variant `Id., at N` gets 0.9, lowercase `id.` gets 0.85. Mid-sentence non-citation uses (e.g., "The Id. card") are penalized to 0.4 via preceding-context validation.

- [#135](https://github.com/medelman17/eyecite-ts/pull/135) [`752c28f`](https://github.com/medelman17/eyecite-ts/commit/752c28f22eeb004d984a94002cd1b8f9367a28e0) Thanks [@medelman17](https://github.com/medelman17)! - Fix ~233 false positive case citations caused by paragraph/footnote markers (e.g., ¶2) being misidentified as citation volumes (#128). Single-digit volumes (1-9) with unrecognized reporters are now flagged by the false-positive filter, using reporters-db validation when loaded or an expanded prose-word blocklist as fallback.

- [#140](https://github.com/medelman17/eyecite-ts/pull/140) [`45f30a3`](https://github.com/medelman17/eyecite-ts/commit/45f30a3bf6b40cfd97d9dae87ba8a57ed0e57b71) Thanks [@medelman17](https://github.com/medelman17)! - Fix short-form case citation recall for comma-before-at patterns (#127). The regex now accepts an optional comma between the reporter and `at` keyword (`\s*,?\s+at`), matching SCOTUS style (`597 U.S., at 721`), federal circuit style (`116 F.4th, at 1193`), nominative reporters (`9 Wheat., at 201`), and law review short forms (`133 Harv. L. Rev., at 580`). Expected recall improvement from ~47.6% to ~75%+.

- [#142](https://github.com/medelman17/eyecite-ts/pull/142) [`5ef4e34`](https://github.com/medelman17/eyecite-ts/commit/5ef4e34c04f2873fa693e9d5b94772c1c17e998d) Thanks [@medelman17](https://github.com/medelman17)! - Fix signal detection accuracy from 11.2% to ~98% (#133). The root cause was broken span mapping (from #134) cascading into the leading-signal detector — wrong spans computed wrong gap text, so signals couldn't be found near their citations. Split `normalizeWhitespace` into `replaceWhitespace` (same-length, each char replaced individually) and `collapseSpaces` (pure deletion) so the position mapper handles each transformation type correctly.

- [#141](https://github.com/medelman17/eyecite-ts/pull/141) [`265daee`](https://github.com/medelman17/eyecite-ts/commit/265daee840e8eab52e99a459421efb48b202f779) Thanks [@medelman17](https://github.com/medelman17)! - Fix span mapping when input text contains newlines (#134). The `rebuildPositionMaps` algorithm's deletion lookahead misinterpreted same-length character replacements (e.g., `\n` → ` `) as multi-character deletions, causing `originalStart`/`originalEnd` to point to wrong positions. Added a fast-path: when remaining text lengths are equal, all mismatches are treated as 1:1 replacements without lookahead.

## 0.7.3

### Patch Changes

- [#125](https://github.com/medelman17/eyecite-ts/pull/125) [`d63a379`](https://github.com/medelman17/eyecite-ts/commit/d63a37923015044218248bb80c29327f0bf2ab45) Thanks [@medelman17](https://github.com/medelman17)! - Fix four extraction bugs: fullSpan now extends through pincites and closing parentheticals (#120); prose false positives like "2 Court dismissed..." are detected and penalized (#121); dispositions like (per curiam) and (en banc) are captured from second parentheticals (#123); signal words no longer absorbed into caseName (#124). Issue #122 (pincite capture) was already working — regression test added.

## 0.7.2

### Patch Changes

- [#118](https://github.com/medelman17/eyecite-ts/pull/118) [`2f7b964`](https://github.com/medelman17/eyecite-ts/commit/2f7b96457b65a582d67df09f7e9d0ca1d6e29f2e) Thanks [@medelman17](https://github.com/medelman17)! - Improve short-form citation recall for Id., supra, and shortFormCase patterns.

  - Id: handle comma before pincite (`Id., at 105`) and page range pincites (`Id. at 5-6`)
  - Supra: support hyphenated names, apostrophes, period-ending names, and `supra note N` with pincite
  - ShortFormCase: fix two-letter ordinal suffixes in reporters (`F.4th`, `Cal.4th`)

## 0.7.1

### Patch Changes

- [#115](https://github.com/medelman17/eyecite-ts/pull/115) [`0c108cc`](https://github.com/medelman17/eyecite-ts/commit/0c108ccb5373b020c90172fd31609d887b8452d6) Thanks [@medelman17](https://github.com/medelman17)! - Fix case name backward search extending too far — fullSpan now correctly stops at sentence boundaries and previous citation parentheticals instead of reaching back to position 0. Fixes #114.

## 0.7.0

### Minor Changes

- [#112](https://github.com/medelman17/eyecite-ts/pull/112) [`bb26fb4`](https://github.com/medelman17/eyecite-ts/commit/bb26fb44117ecb6215607bf336abe9a5b044cff1) Thanks [@medelman17](https://github.com/medelman17)! - Add signal detection for isolated citations. eyecite-ts now detects Bluebook introductory signals (See, But see, Cf., Accord, See also, See generally, Compare, Contra, But cf.) preceding any citation type, not just within string citation groups. Closes #111.

## 0.6.1

### Patch Changes

- [#109](https://github.com/medelman17/eyecite-ts/pull/109) [`79a492b`](https://github.com/medelman17/eyecite-ts/commit/79a492b71a867bdb9493d8c985b9e5c726949fa8) Thanks [@medelman17](https://github.com/medelman17)! - internal: binary search for paragraph boundary assignment

- [#107](https://github.com/medelman17/eyecite-ts/pull/107) [`9bf3f70`](https://github.com/medelman17/eyecite-ts/commit/9bf3f70372960bef6b73bb14bfce9c6685dfb7a8) Thanks [@medelman17](https://github.com/medelman17)! - internal: BK-tree for supra citation party name matching

- [#110](https://github.com/medelman17/eyecite-ts/pull/110) [`f9266e9`](https://github.com/medelman17/eyecite-ts/commit/f9266e9f2732e475b428806ee41725d2bcc4f165) Thanks [@medelman17](https://github.com/medelman17)! - internal: segment-based position mapping with binary search lookup

- [#105](https://github.com/medelman17/eyecite-ts/pull/105) [`334d0df`](https://github.com/medelman17/eyecite-ts/commit/334d0df9dc9e02286cc33368cbf57879de963b05) Thanks [@medelman17](https://github.com/medelman17)! - internal: space-optimized Levenshtein DP with early termination

- [#108](https://github.com/medelman17/eyecite-ts/pull/108) [`db11730`](https://github.com/medelman17/eyecite-ts/commit/db117305b39c547af41f1d79a75f2f932e3a4d76) Thanks [@medelman17](https://github.com/medelman17)! - internal: union-find for subsequent history chain linking

## 0.6.0

### Minor Changes

- [#99](https://github.com/medelman17/eyecite-ts/pull/99) [`764890e`](https://github.com/medelman17/eyecite-ts/commit/764890e6a4ad34b1a47bf9b9ce58dc33959e6feb) Thanks [@medelman17](https://github.com/medelman17)! - Add `toBluebook` utility function to `eyecite-ts/utils` for canonical Bluebook-style citation formatting across all 11 citation types

- [#83](https://github.com/medelman17/eyecite-ts/pull/83) [`5e76ca2`](https://github.com/medelman17/eyecite-ts/commit/5e76ca284b26ce85743956301b8eb882fad67487) Thanks [@medelman17](https://github.com/medelman17)! - Add constitutional citation extraction (U.S. and state constitutions) with article, amendment, section, and clause parsing

- [#86](https://github.com/medelman17/eyecite-ts/pull/86) [`bce6f9a`](https://github.com/medelman17/eyecite-ts/commit/bce6f9ad48e4d9b2542b0f0cc100e9b959344e42) Thanks [@medelman17](https://github.com/medelman17)! - Add court inference from reporter series: new `inferredCourt` field on `FullCaseCitation` with `level`, `jurisdiction`, `state`, and `confidence` derived from a curated lookup table of ~40 common reporters

- [#100](https://github.com/medelman17/eyecite-ts/pull/100) [`c2d1a2d`](https://github.com/medelman17/eyecite-ts/commit/c2d1a2d339bf3ec876501500a398c62658c13cc6) Thanks [@medelman17](https://github.com/medelman17)! - Add `normalizedCourt` field on `FullCaseCitation` that normalizes court strings from parentheticals (space collapse, trailing period)

- [#87](https://github.com/medelman17/eyecite-ts/pull/87) [`9c977da`](https://github.com/medelman17/eyecite-ts/commit/9c977dab196e8e3435d3cbb2aff7952363fcb896) Thanks [@medelman17](https://github.com/medelman17)! - Extract and classify explanatory parentheticals: new `parentheticals` field on `FullCaseCitation` with signal-word classification (holding, citing, quoting, etc.). Replaces unused `parenthetical?: string` field with `parentheticals?: Parenthetical[]`. Refactors parenthetical scanning into a single-pass `collectParentheticals()` primitive.

- [#90](https://github.com/medelman17/eyecite-ts/pull/90) [`da3aa2f`](https://github.com/medelman17/eyecite-ts/commit/da3aa2f58525d1619c91ec094736c2da92d74692) Thanks [@medelman17](https://github.com/medelman17)! - Add `filterFalsePositives` option to `ExtractOptions` for flagging or removing non-US and historical citation false positives. Default mode (false) penalizes confidence to 0.1 and adds warnings. Opt-in mode (true) removes flagged citations entirely. Uses a static blocklist of ~16 non-US reporter abbreviations and a year plausibility heuristic (< 1750).

- [#104](https://github.com/medelman17/eyecite-ts/pull/104) [`330c58a`](https://github.com/medelman17/eyecite-ts/commit/330c58ab08c21b380121ba072d80dc55685680e9) Thanks [@medelman17](https://github.com/medelman17)! - Add footnote-aware citation extraction (#79)

  - Add `detectFootnotes(text)` function that detects footnote zones in HTML (structural tags) and plain text (separator + marker heuristics)
  - Add `detectFootnotes: true` option to `extractCitations` for opt-in footnote annotation
  - Add `inFootnote` and `footnoteNumber` fields to `CitationBase`
  - Export `FootnoteMap` and `FootnoteZone` types from the public API
  - Make the `"footnote"` scope strategy functional in the resolver: Id. resolves within same zone only, supra/shortFormCase can cross from footnotes to body

- [#99](https://github.com/medelman17/eyecite-ts/pull/99) [`764890e`](https://github.com/medelman17/eyecite-ts/commit/764890e6a4ad34b1a47bf9b9ce58dc33959e6feb) Thanks [@medelman17](https://github.com/medelman17)! - Add `groupByCase` utility function to `eyecite-ts/utils` that groups resolved citations by underlying case using parallel detection, volume/reporter/page identity, and short-form resolution

- [#103](https://github.com/medelman17/eyecite-ts/pull/103) [`2fd463b`](https://github.com/medelman17/eyecite-ts/commit/2fd463b9ef2e30bdf48b4c5d8a27d827f2f70a4e) Thanks [@medelman17](https://github.com/medelman17)! - Support nominative reporter citations in early SCOTUS cases (#49, #16)

  - Fix extraction of citations with nominative parentheticals like `5 U.S. (1 Cranch) 137` (previously produced 0 results)
  - Capture nominative reporter metadata as `nominativeVolume` and `nominativeReporter` fields on `FullCaseCitation`
  - Supports all early SCOTUS nominative reporters: Black, Cranch, How., Wall., Wheat., Pet., Dall.

- [#99](https://github.com/medelman17/eyecite-ts/pull/99) [`764890e`](https://github.com/medelman17/eyecite-ts/commit/764890e6a4ad34b1a47bf9b9ce58dc33959e6feb) Thanks [@medelman17](https://github.com/medelman17)! - Add `toReporterKey` and `toReporterKeys` utility functions to `eyecite-ts/utils` for extracting volume-reporter-page lookup keys from case citations

- [#100](https://github.com/medelman17/eyecite-ts/pull/100) [`c2d1a2d`](https://github.com/medelman17/eyecite-ts/commit/c2d1a2d339bf3ec876501500a398c62658c13cc6) Thanks [@medelman17](https://github.com/medelman17)! - Add `normalizeReporterSpacing` cleaner to default pipeline, collapsing inconsistent spaces in reporter abbreviations (U. S. → U.S., F. 2d → F.2d)

- [#89](https://github.com/medelman17/eyecite-ts/pull/89) [`1f78e9f`](https://github.com/medelman17/eyecite-ts/commit/1f78e9f12c9ca3cb64d8cf4dc8aea86bad57cac0) Thanks [@medelman17](https://github.com/medelman17)! - Add string citation grouping to detect semicolon-separated citations supporting the same legal proposition. Citations in a group share a `stringCitationGroupId`, with `stringCitationIndex` and `stringCitationGroupSize` for position tracking. Introductory signal words (see, see also, cf., but see, etc.) are now captured on the `signal` field of all citation types via the new `CitationSignal` type.

- [#100](https://github.com/medelman17/eyecite-ts/pull/100) [`c2d1a2d`](https://github.com/medelman17/eyecite-ts/commit/c2d1a2d339bf3ec876501500a398c62658c13cc6) Thanks [@medelman17](https://github.com/medelman17)! - Add `parsePincite` function and `pinciteInfo` field on `FullCaseCitation` for structured pincite parsing (page ranges, footnotes, abbreviated end pages)

- [#88](https://github.com/medelman17/eyecite-ts/pull/88) [`3c21f5e`](https://github.com/medelman17/eyecite-ts/commit/3c21f5e77f9782228148d5c7fceaf04ce2f4cfb7) Thanks [@medelman17](https://github.com/medelman17)! - Extract and normalize subsequent history signals: new `subsequentHistoryEntries` and `subsequentHistoryOf` fields on `FullCaseCitation` with 36 pattern variants normalized to 15 canonical `HistorySignal` values. Bidirectional parent-child linking with chained history aggregation. Replaces unused `subsequentHistory?: string` field.

- [#99](https://github.com/medelman17/eyecite-ts/pull/99) [`764890e`](https://github.com/medelman17/eyecite-ts/commit/764890e6a4ad34b1a47bf9b9ce58dc33959e6feb) Thanks [@medelman17](https://github.com/medelman17)! - Add `getSurroundingContext` utility function to `eyecite-ts/utils` for legal-text-aware sentence and paragraph boundary detection around citation spans

- [#102](https://github.com/medelman17/eyecite-ts/pull/102) [`964c217`](https://github.com/medelman17/eyecite-ts/commit/964c2177eb016107d3db8468ddc336cf9c5cb765) Thanks [@medelman17](https://github.com/medelman17)! - Expand Unicode normalization for OCR'd legal documents (#11)

  - Expand `normalizeWhitespace` to handle non-breaking space (U+00A0), thin/hair/en/em spaces, and other Unicode whitespace
  - Expand `normalizeDashes` to handle horizontal bar (U+2015), Unicode hyphen (U+2010), and figure dash (U+2012)
  - Add `normalizeTypography` cleaner (default pipeline): converts prime marks to apostrophes and strips zero-width characters
  - Add `stripDiacritics` opt-in cleaner: removes diacritical marks from OCR artifacts using NFD decomposition

- [#99](https://github.com/medelman17/eyecite-ts/pull/99) [`764890e`](https://github.com/medelman17/eyecite-ts/commit/764890e6a4ad34b1a47bf9b9ce58dc33959e6feb) Thanks [@medelman17](https://github.com/medelman17)! - Add `eyecite-ts/utils` entry point with shared types (`SurroundingContext`, `ContextOptions`, `CaseGroup`) for post-extraction utility functions

### Patch Changes

- [#100](https://github.com/medelman17/eyecite-ts/pull/100) [`c2d1a2d`](https://github.com/medelman17/eyecite-ts/commit/c2d1a2d339bf3ec876501500a398c62658c13cc6) Thanks [@medelman17](https://github.com/medelman17)! - Fix court normalization to collapse spaces before lowercase letters, support en-dash/em-dash ranges in pincite parsing, export `normalizeCourt` from main entry point, reorder court inference map to prefer normalized forms, and add integration tests for `pinciteInfo` and `normalizedCourt`

- [#85](https://github.com/medelman17/eyecite-ts/pull/85) [`e163c54`](https://github.com/medelman17/eyecite-ts/commit/e163c5485c236b288a0f1cf71240a3e2d6f2b81a) Thanks [@medelman17](https://github.com/medelman17)! - O(1) parallel citation metadata lookups; extract shared resolveOriginalSpan and test TransformationMap helpers

- [#101](https://github.com/medelman17/eyecite-ts/pull/101) [`977d453`](https://github.com/medelman17/eyecite-ts/commit/977d453444a7458abf5ec6219d744d3c53b7aa16) Thanks [@medelman17](https://github.com/medelman17)! - Fix Unicode em-dash (U+2014) not recognized as blank page placeholder in citations like `500 F.4th — (2024)`. The `normalizeDashes` cleaner now converts em-dash to `---` (matching the existing blank page pattern) and en-dash to `-` (for page ranges). Closes #54.

- [#99](https://github.com/medelman17/eyecite-ts/pull/99) [`764890e`](https://github.com/medelman17/eyecite-ts/commit/764890e6a4ad34b1a47bf9b9ce58dc33959e6feb) Thanks [@medelman17](https://github.com/medelman17)! - Fix groupByCase empty-string groupId false match, replace unsafe double casts with type guards, eliminate redundant string slicing in getSurroundingContext, and add missing test coverage for constitutional edge case and default maxLength

## 0.5.0

### Minor Changes

- [#70](https://github.com/medelman17/eyecite-ts/pull/70) [`9acdc81`](https://github.com/medelman17/eyecite-ts/commit/9acdc81954bdf23b4f2c07f89e860777effe7c43) Thanks [@medelman17](https://github.com/medelman17)! - Add Illinois ILCS chapter-act citation extraction and remove legacy state-code pattern.

  - New `chapter-act` pattern and `extractChapterAct` extractor for "735 ILCS 5/2-1001" format
  - Removed broad `state-code` pattern — fully superseded by named-code + abbreviated-code families
  - Eliminates duplicate citation output for state codes that previously matched both patterns

- [#69](https://github.com/medelman17/eyecite-ts/pull/69) [`4efd7fc`](https://github.com/medelman17/eyecite-ts/commit/4efd7fc11bb21e8e307aa09856614a71be641510) Thanks [@medelman17](https://github.com/medelman17)! - Add state statute citation extraction for 19 jurisdictions across three pattern families:

  **Federal (PR #67):** Enhanced USC/CFR patterns with subsection capture, et seq., §§ ranges. Added prose-form "section X of title Y". Refactored extractStatute into dispatcher architecture.

  **Abbreviated-code (PR #68):** Added knownCodes registry and extraction for 12 states using compact abbreviations: FL, OH, MI, UT, CO, WA, NC, GA, PA, IN, NJ, DE.

  **Named-code (PR #69):** Added extraction for 7 states using jurisdiction prefix + code name: NY (21 laws), CA (29 codes), TX (29 codes), MD (36 articles), VA, AL, MA (chapter-based).

  New `StatuteCitation` fields: `subsection`, `jurisdiction`, `pincite`, `hasEtSeq`. Shared `parseBody` helper for section/subsection/et seq splitting. ~970 tests (up from 528).

### Patch Changes

- [#64](https://github.com/medelman17/eyecite-ts/pull/64) [`a128e50`](https://github.com/medelman17/eyecite-ts/commit/a128e50a94c96bba76450b7306fdc6fa2ea76598) Thanks [@medelman17](https://github.com/medelman17)! - Fix lookahead pattern bugs #52 and #53 that prevented year extraction:

  - **Bug #52**: Fixed footnote reference (n.3) preventing year extraction - updated lookahead pattern to skip optional footnote markers like "n.3" or "note 7"
  - **Bug #53**: Fixed pincite ranges (152-53, 163-64) preventing year extraction - updated lookahead pattern to handle hyphenated ranges and multiple comma-separated pincites

  These fixes improve year extraction accuracy for citations with complex pincite formats, promoting 2 test cases from known limitations to passing tests.

- [#65](https://github.com/medelman17/eyecite-ts/pull/65) [`62578d7`](https://github.com/medelman17/eyecite-ts/commit/62578d7ff662d1e964be62e7cbae5798eaf10ad2) Thanks [@medelman17](https://github.com/medelman17)! - Fix multi-word state reporters bug #45 that prevented matching reporters like "Ohio St. 3d" and "Md. App.":

  - **Bug #45**: Updated state-reporter pattern to allow spaces and digits in reporter names while excluding journal patterns
  - Pattern now uses negative lookahead `(?! L\.[JQR\s])` to prevent misclassifying journal citations like "Yale L.J." as case citations
  - Promotes 2 test cases from known limitations to passing tests

  This fix improves tokenization accuracy for state reporters with multi-word names and ensures journal citations remain correctly classified.

- [#66](https://github.com/medelman17/eyecite-ts/pull/66) [`4c26c7b`](https://github.com/medelman17/eyecite-ts/commit/4c26c7b6237ac300d07a2ad79c1e50da0138099b) Thanks [@medelman17](https://github.com/medelman17)! - Fix neutral citation type classification bugs #50 and #51:

  - **Bug #50**: State vendor-neutral citations like "2007 UT 49", "2017 WI 17", "2013 IL 112116" now correctly classified as "neutral" type instead of "case"

    - Added state-vendor-neutral pattern: YYYY STATE_CODE NUMBER
    - Pattern runs before case patterns in extraction pipeline, ensuring correct type assignment

  - **Bug #51**: U.S. App./Dist. LEXIS citations like "2021 U.S. App. LEXIS 12345" and "2021 U.S. Dist. LEXIS 67890" now matched as neutral citations
    - Expanded LEXIS pattern to include optional "App." and "Dist." court identifiers
    - Updated extraction regex to handle variable court formats

  Promotes 7 test cases from known limitations to passing tests. Improves accuracy for state and federal neutral citation extraction.

- [#63](https://github.com/medelman17/eyecite-ts/pull/63) [`8485b1d`](https://github.com/medelman17/eyecite-ts/commit/8485b1de31c827ce58e7ac502dbc2b2803da6a46) Thanks [@medelman17](https://github.com/medelman17)! - Fix four tokenization pattern bugs discovered during corpus testing:

  - **Bug #44**: Added F. App'x (Federal Appendix) support - added apostrophe variant to federal-reporter pattern and updated extraction regex
  - **Bug #46**: Added USC without periods support - pattern now matches both "U.S.C." and "USC"
  - **Bug #47**: Added C.F.R. (Code of Federal Regulations) pattern - new statute pattern for CFR citations
  - **Bug #48**: Made "No." optional in Public Law citations - pattern now matches both "Pub. L. No." and "Pub. L."

  These fixes promote 4 test cases from known limitations to passing tests, improving extraction coverage for federal citations with variant formats.

- [#61](https://github.com/medelman17/eyecite-ts/pull/61) [`61152d1`](https://github.com/medelman17/eyecite-ts/commit/61152d1aeea7eeb16823840e3b9d72ec7d7bea4e) Thanks [@medelman17](https://github.com/medelman17)! - Fix three quick-win bugs discovered during corpus testing:

  - **Bug #43**: Fixed `§§` (double section symbol) crashing extractStatute by updating regex to accept one or more section symbols
  - **Bug #55**: Added HTML entity decoding (`&sect;` → §, `&amp;` → &, etc.) to cleaning pipeline
  - **Bug #54**: Added Unicode dash normalization (en-dash/em-dash → ASCII hyphen) to cleaning pipeline

  These fixes promote 3 test cases from known limitations to passing tests, improving extraction accuracy for real-world legal documents with HTML entities and Unicode punctuation.

## 0.4.0

### Minor Changes

- [#38](https://github.com/medelman17/eyecite-ts/pull/38) [`49a4055`](https://github.com/medelman17/eyecite-ts/commit/49a40554c87ebae42bedbaa85362bf8356faf335) Thanks [@medelman17](https://github.com/medelman17)! - Add full citation span, case name extraction, complex parenthetical parsing, and blank page support

  - Extract case names via backward search for "v." pattern and procedural prefixes (In re, Ex parte, Matter of)
  - Calculate `fullSpan` field covering case name through closing parenthetical, including chained parens and subsequent history
  - Unified parenthetical parser supporting court+year, full dates (abbreviated/full month/numeric), and year-only formats
  - Structured `date` field with ISO string and parsed `{ year, month?, day? }` object
  - `disposition` field for "en banc" and "per curiam" from chained parentheticals
  - Blank page placeholder recognition (`___`, `---`) with `hasBlankPage` flag and confidence 0.8
  - All new fields optional — zero breaking changes for existing consumers

- [#40](https://github.com/medelman17/eyecite-ts/pull/40) [`5c6134f`](https://github.com/medelman17/eyecite-ts/commit/5c6134fde13bedf980013e082da67722cf27ccbe) Thanks [@medelman17](https://github.com/medelman17)! - Extract plaintiff and defendant party names from case citations and improve supra resolution matching

  - Split case names on "v."/"vs." into `plaintiff` and `defendant` fields with raw text preserved
  - Normalized fields (`plaintiffNormalized`, `defendantNormalized`) strip et al., d/b/a, aka, corporate suffixes, and leading articles
  - Procedural prefix detection (In re, Ex parte, Matter of, etc.) with `proceduralPrefix` field
  - Government entities (United States, People, Commonwealth, State) recognized as plaintiffs, not procedural prefixes
  - Supra resolution uses extracted party names for higher-accuracy matching before Levenshtein fallback
  - Defendant name prioritized in resolution history per Bluebook convention
  - All new fields optional — zero breaking changes for existing consumers

- [#41](https://github.com/medelman17/eyecite-ts/pull/41) [`fb18be2`](https://github.com/medelman17/eyecite-ts/commit/fb18be281b3835e90d46ad2e5e3e2229c6e43667) Thanks [@medelman17](https://github.com/medelman17)! - Link parallel citations into groups and add full-span annotation mode

  - Detect comma-separated case citations sharing a parenthetical as parallel citations
  - `groupId` field identifies citation groups, `parallelCitations` array on primary citation references secondaries
  - All citations still returned individually for backward compatibility
  - `useFullSpan` annotation option to annotate from case name through closing parenthetical
  - Golden test corpus with 28 real-world samples for regression testing
  - All new fields optional — zero breaking changes for existing consumers

### Patch Changes

- [#42](https://github.com/medelman17/eyecite-ts/pull/42) [`5e8544b`](https://github.com/medelman17/eyecite-ts/commit/5e8544ba271bc73545bb9fc877dd636f9a301dba) Thanks [@medelman17](https://github.com/medelman17)! - Improve extraction performance with TypeScript-specific optimizations

  This release includes three performance optimizations that significantly speed up citation extraction:

  **Regex Compilation Hoisting:** Moved 11 frequently-used regex patterns from inline definitions to module-level constants, eliminating redundant compilations (5-10ms savings per document).

  **Deduplication Bitpacking:** Optimized token deduplication by using bitpacked integers instead of string concatenation for Set keys in typical documents (<65KB), with automatic fallback for larger documents (2-5ms savings).

  **Parallel Detection Early Exit:** Added distance-based early exit in parallel citation detection to skip expensive validation when tokens are too far apart, reducing algorithmic complexity from O(n²) to O(n×k) (3-8ms savings).

  **Expected impact:** 20-60% performance improvement on typical 10KB legal documents (from <49ms to 19-39ms baseline). All optimizations are transparent to consumers with zero breaking changes.

## 0.3.0

### Minor Changes

- [#32](https://github.com/medelman17/eyecite-ts/pull/32) [`a070d35`](https://github.com/medelman17/eyecite-ts/commit/a070d352adb8c76ec2f313c0ddd0911342012fa9) Thanks [@medelman17](https://github.com/medelman17)! - Support hyphenated volume numbers (e.g., "1984-1 Trade Cas. 66"). Volume type changed from `number` to `number | string` across all citation types — numeric volumes remain numbers, hyphenated volumes are strings.

- [#26](https://github.com/medelman17/eyecite-ts/pull/26) [`18ae4c2`](https://github.com/medelman17/eyecite-ts/commit/18ae4c2f19af46ce9b89a72f9061b5133d4816f3) Thanks [@medelman17](https://github.com/medelman17)! - Add `statutesAtLarge` citation type for Statutes at Large references (e.g., "124 Stat. 119"). Previously these were misclassified as case citations via the broad state-reporter pattern.

### Patch Changes

- [#24](https://github.com/medelman17/eyecite-ts/pull/24) [`0a064ed`](https://github.com/medelman17/eyecite-ts/commit/0a064edcc132df16f7a1a8a8440915660f64ee3d) Thanks [@medelman17](https://github.com/medelman17)! - Add support for 4th and 5th series reporters in case citation patterns

- [#29](https://github.com/medelman17/eyecite-ts/pull/29) [`fb1e58f`](https://github.com/medelman17/eyecite-ts/commit/fb1e58f674e3a443c6b1f594fd258f3ab33b572c) Thanks [@medelman17](https://github.com/medelman17)! - Fix compact journal citations (e.g., "93 Harv.L.Rev. 752") being misclassified as case citations. Added a specific pattern for compact law review abbreviations containing L.Rev., L.J., or L.Q. that runs before the broad state-reporter case pattern.

- [#35](https://github.com/medelman17/eyecite-ts/pull/35) [`14320ad`](https://github.com/medelman17/eyecite-ts/commit/14320ad56e9b639ec6ea33e6babc2dcf48776b8a) Thanks [@medelman17](https://github.com/medelman17)! - Fix annotation markers being inserted inside HTML tags when mapping back to original text

- [#34](https://github.com/medelman17/eyecite-ts/pull/34) [`195403e`](https://github.com/medelman17/eyecite-ts/commit/195403e737e820ae89cc0d38805719806b10d022) Thanks [@medelman17](https://github.com/medelman17)! - Fix court extraction when parenthetical contains month/day date (e.g., "(2d Cir. Jan. 15, 2020)")

- [#31](https://github.com/medelman17/eyecite-ts/pull/31) [`77f30ce`](https://github.com/medelman17/eyecite-ts/commit/77f30ce22ad6a81398cb6e59e9f6ac593e5cc972) Thanks [@medelman17](https://github.com/medelman17)! - Fix year and court not extracted from parentheticals on full case citations. The extractor now looks ahead in the cleaned text for trailing parentheticals like `(1989)` or `(9th Cir. 2020)`. Also strips year from court field and infers `scotus` for Supreme Court reporters.

- [#33](https://github.com/medelman17/eyecite-ts/pull/33) [`c05948b`](https://github.com/medelman17/eyecite-ts/commit/c05948b9833c0bdb564abdcba412928b6711e46e) Thanks [@medelman17](https://github.com/medelman17)! - Fix supra resolution failing when antecedent citation is preceded by signal words (In, See, Compare, etc.)

- [#30](https://github.com/medelman17/eyecite-ts/pull/30) [`70d70a7`](https://github.com/medelman17/eyecite-ts/commit/70d70a76866964be98871cd98ae69074da63fb57) Thanks [@medelman17](https://github.com/medelman17)! - Fix "U. S." (with internal space) not being recognized as a Supreme Court reporter. Added optional whitespace between "U." and "S." in the supreme-court tokenization pattern.

- [#27](https://github.com/medelman17/eyecite-ts/pull/27) [`6fa73a8`](https://github.com/medelman17/eyecite-ts/commit/6fa73a816e3cdc20d91ab56f9bcf6a4b7d1d80bf) Thanks [@medelman17](https://github.com/medelman17)! - Fix statute sections with trailing letters (e.g., "18 U.S.C. § 1028A") not being recognized. Updated tokenization patterns for both USC and state code statutes to allow alphanumeric section suffixes.

- [#28](https://github.com/medelman17/eyecite-ts/pull/28) [`dba6092`](https://github.com/medelman17/eyecite-ts/commit/dba609256eec9a0007223de88b8bd8504bd64dc4) Thanks [@medelman17](https://github.com/medelman17)! - Fix supra pattern failing when a space precedes the comma (e.g., "Twombly , supra"), which occurs when HTML tags are cleaned from text like `<em>Twombly</em>, supra`.
