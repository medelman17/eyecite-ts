# eyecite-ts

## 0.17.0

### Minor Changes

- [#462](https://github.com/medelman17/eyecite-ts/pull/462) [`fe7614e`](https://github.com/medelman17/eyecite-ts/commit/fe7614ee1a1cbe9fa9b6ec7e5d64f55338b1bdd7) Thanks [@medelman17](https://github.com/medelman17)! - feat: `Id.` inherits caseName / plaintiff / defendant from antecedent

  Previously, `Id.` citations carried only pincite metadata (with
  pincite-inheritance added in v0.16.1). The caption fields
  (`caseName`, `plaintiff`, `defendant`, `proceduralPrefix`) had
  to be retrieved via `resolution.resolvedTo` walking, which is
  inconvenient for consumers that just want each citation to
  describe its case.

  ### Fix

  `IdCitation` now exposes optional `caseName`, `plaintiff`,
  `defendant`, `plaintiffNormalized`, `defendantNormalized`, and
  `proceduralPrefix` fields. The resolver populates them from the
  antecedent when `resolve: true` and the antecedent is a `case`
  citation. Behavior unchanged for:

  - statute / non-case antecedents (no caption to inherit)
  - `resolve: false` (no resolver pass)
  - `Id.` with no antecedent

  ### Tests

  9 new tests in `tests/resolve/idInheritsCaseName.test.ts`:
  basic case inheritance, `In re` proceduralPrefix propagation,
  plaintiff/defendant inheritance, chained `Id.`, no-antecedent
  no-op, statute-antecedent no-op, `resolve: false` no-op, and
  short-form chain transitive inheritance. Full 2901-test suite
  passes.

## 0.16.3

### Patch Changes

- [#460](https://github.com/medelman17/eyecite-ts/pull/460) [`05e9f2e`](https://github.com/medelman17/eyecite-ts/commit/05e9f2e8e6c3a2a130548c523576f6d3a46a26c5) Thanks [@medelman17](https://github.com/medelman17)! - fix: `Id.` skips citations inside a shortform's explanatory parenthetical

  When a short-form citation is followed by an explanatory
  parenthetical containing another full citation
  (`Dormitory Auth., 30 N.Y.3d at 710 (quoting Port Chester ...,
40 N.Y.2d 652, 656 (1976))`), the inner citation is a
  sub-reference of the parent and must not become the antecedent
  for a subsequent `Id.`. Previously, only `case` and `docket`
  full citations had a `fullSpan` extending through their trailing
  parenthetical, so the resolver correctly detected paren-children
  of those types — but `shortFormCase` (and other non-case full
  citations) did not carry `fullSpan`, leaving their paren-children
  visible as Id. antecedents.

  ### Fix

  `DocumentResolver` now precomputes parenthesis depth at every
  citation's start position from the raw text. A citation at
  depth > 0 is flagged as a parenthetical child regardless of
  which prior citation opened the `(`. The legacy `fullSpan`-based
  check is preserved as a fallback. `Id.` no longer resolves to
  citations buried inside an earlier explanatory parenthetical.

  ### Tests

  7 new tests in `tests/resolve/idSkipsParenChildOfShortform.test.ts`
  covering the user-reported Dormitory Auth./Port Chester case,
  shortform-with-`(citing X)` parens, the existing case-with-paren
  regression, nested `(See A (citing B))` depth, statute inside a
  case paren, and `Id.` itself inside a parenthetical. Full
  2892-test suite passes.

## 0.16.2

### Patch Changes

- [#459](https://github.com/medelman17/eyecite-ts/pull/459) [`6181fcd`](https://github.com/medelman17/eyecite-ts/commit/6181fcd850e1bbcb1dc22075f5778c67015ad975) Thanks [@medelman17](https://github.com/medelman17)! - fix: plural `§§ N, N` / `§§ N and N` emits one citation per section (#453)

  When a statute reference uses the plural section symbol `§§`
  followed by multiple sections (`§§ 18-8004, 18-8005(5)`,
  `§§ 13-108 and 13-621`), only the first section was captured —
  **60 occurrences across 10 states** in the v0.16.0 corpus were
  losing the second and subsequent sections.

  ### Fix

  New `expandPluralSectionList` post-extract pass (step 4.4 in
  `extractCitations.ts`):

  1. For each statute citation whose `matchedText` contains `§§`,
     scan the cleaned text immediately after its end.
  2. Match a continuation pattern of `(,|and|to) <section>` and
     emit one new `StatuteCitation` per match.
  3. Each continuation inherits `code`, `jurisdiction`, `title`,
     `year`, `publisher`, `editionLabel`, etc. from the head
     citation; only `section` differs.

  Connectors: `,` / `and` / `to`. Section format covers
  `12940`, `18-8004`, `12945(b)`, `707-701(1)`.

  ### Tests

  11 new tests in `tests/extract/issue453PluralSection.test.ts`:
  comma-separated lists, three-section lists, `and` connector,
  inherited code/jurisdiction, singular-§ regression, span
  fidelity, subsection on second section, and space-padded
  connector. Full 2885-test suite passes.

  The range form `§§ 16-1605-1607` (chapter+range expansion) is
  deferred to a follow-up issue — this fix covers the most common
  comma/`and`-separated forms.

- [#457](https://github.com/medelman17/eyecite-ts/pull/457) [`145e63d`](https://github.com/medelman17/eyecite-ts/commit/145e63df38be3b19bef52a184e9d626fb5488f5a) Thanks [@medelman17](https://github.com/medelman17)! - fix: bare-party shortform accepts `at p. N` / `at pp. N-M` / `at page N` (#454)

  The #439 fix recognized `Smith, at 12` but not the California
  Style Manual variant `Smith, at p. 12` — **26 CA occurrences**
  in the v0.16.0 replay used the `p.` / `pp.` page-prefix form and
  were dropped.

  ### Fix

  Extended the pincite-capture regex in
  `detectBarePartyBackReferences` to accept an optional
  `p.` / `pp.` / `page` / `pages` between `at` and the digit:

  ```
  (?<![A-Za-z'])(<name>)\s*,\s*at\s+(?:pp?\.?\s*|pages?\s+)?(<pincite>)
  ```

  ### Tests

  7 new tests under `California style \`at p. N\` / \`at pp. N-M\`
  (#454)`in`tests/extract/issue439BarePartyShortform.test.ts`:
`at p. N`, `at pp. N-M`, `at page N`, `at pages N-M`, multi-word
  plaintiff, non-digit FP rejection, and the no-prefix regression.
  Full 2874-test suite passes.

## 0.16.1

### Patch Changes

- [#455](https://github.com/medelman17/eyecite-ts/pull/455) [`2714267`](https://github.com/medelman17/eyecite-ts/commit/2714267e0cab886cce3ac08918683b6f25801073) Thanks [@medelman17](https://github.com/medelman17)! - fix: `Id.` without explicit pincite inherits antecedent's pincite (Bluebook 4.1)

  When a full citation carries a pincite — `Smith v. Jones, 100
F.2d 50, 55 (1990)` — and is followed by a bare `Id.` (no
  `at NNN`), Bluebook Rule 4.1 says the `Id.` refers to the same
  page cited in the antecedent. Previously, the resolver left
  `Id.pincite` as `undefined` in that case, losing the page
  reference.

  ### Fix

  In `DocumentResolver.resolve()`, after `Id.` resolution attaches
  `resolvedTo`, propagate the antecedent's `pincite` and
  `pinciteInfo` onto the `Id.` citation when the `Id.` does not
  already carry an explicit `at NNN`. Behavior unchanged for:

  - `Id. at 62` (explicit pincite wins)
  - Antecedent with no pincite (nothing to inherit)
  - `resolve: false` (no resolver pass, no inheritance)

  ### Tests

  12 new tests in `tests/resolve/idInheritsPincite.test.ts`:
  basic inheritance, range pinciteInfo propagation, `Ibid.`
  support, explicit-override paths, no-antecedent and
  no-resolve no-op paths, chained-`Id.` semantics, and
  statute-antecedent edge case. Full 2867-test suite passes.

## 0.16.0

### Minor Changes

- [#451](https://github.com/medelman17/eyecite-ts/pull/451) [`52809b4`](https://github.com/medelman17/eyecite-ts/commit/52809b42630457dc5542501d8b2fef225c54e2bb) Thanks [@medelman17](https://github.com/medelman17)! - feat: bare-party shortform back-references `Smith, at 12` (#439)

  After a full citation establishes `Smith v. Jones, 100 F.2d 50`,
  subsequent shorthand `Smith, at 12` is the standard Bluebook
  back-reference but was not captured by the regex tokenizer because
  it lacks the volume+reporter shape. **47 occurrences** across
  the 50-state baseline were unrecognized — common forms include
  `Striker, at 871`, `Pacheco, at 65`, `Hutchison, at 887-88`, and
  multi-word entities like `South Hollywood Hills Citizens Ass'n,
at 73`.

  ### Fix

  New `detectBarePartyBackReferences` post-extract pass in
  `src/extract/extractCitations.ts` (step 4.72):

  1. Builds a party-name index from full case citations using
     `plaintiff` / `defendant` (plus stripped variants that drop
     procedural prefixes like `In re`, `Estate of`, and
     sentence-initial connectors like `See`, `Cf.`, `Then`).
  2. For each indexed name, scans the cleaned text for
     `<name>, at <pincite>` matches that come after the anchor's
     position and do not overlap an existing citation.
  3. Emits a `ShortFormCaseCitation` inheriting `volume` /
     `reporter` / `page` from the anchor, with `partyName` and
     `pincite` set from the match.

  When multiple anchors share a name, the most-recent one whose
  end precedes the bare-ref wins (Bluebook short-form refers to the
  most recent establishment).

  ### False-positive defenses

  - **Anchor required**: only names that already appear as a party
    in an earlier full citation can match. Bare `Smith, at 12` with
    no prior `Smith v. ...` is left as prose.
  - **Min name length (3)**: 2-character anchors (`Wu`, `Lu`) are
    not indexed.
  - **Blocklist**: common captions (`United States`, `State`,
    `People`, signal/connector words) are blocked.
  - **Word-boundary lookbehind**: `(?<![A-Za-z'])` prevents
    partial-prefix matches like `mySmith, at 12`.
  - **Numeric pincite required**: `Smith, at noon` or `Smith, at
the time` are rejected.
  - **Mandatory comma**: `Smith at 12` (no comma) is rejected as
    ambiguous prose.

  ### Tests

  57 new tests under `tests/extract/issue439BarePartyShortform.test.ts`
  covering basic positive cases, pincite shapes (single, hyphenated
  range, comma-list, short-hyphen `887-88`), name shapes (apostrophe,
  hyphen, multi-word, `In re Smith`), multi-reference scenarios,
  most-recent anchor selection, span fidelity (clean + original with
  HTML cleaning), false-positive avoidance, real samples from the
  issue body, citation metadata, resolver integration, compatibility
  with existing supra/`Id.`/short-form patterns, and state-reporter
  forms (Wis. 2d, Mass.). Full 2855-test suite passes.

  Closes the final outstanding bug in the 15-bug cross-cutting
  cluster from #450.

## 0.15.12

### Patch Changes

- [#448](https://github.com/medelman17/eyecite-ts/pull/448) [`f0f3242`](https://github.com/medelman17/eyecite-ts/commit/f0f32420ee09f0b19d5046230d27f38d7f98ba39) Thanks [@medelman17](https://github.com/medelman17)! - fix: WV bare-section follow-ons inherit WV jurisdiction (#432)

  Bare-section citations of the form `§ N-N-N` were always routed
  to New Mexico (`NM`), because the `nm-bare-section` pattern
  defaults to NM regardless of document context. In West Virginia
  opinions, the conventional follow-on after one fully-qualified
  `W.Va. Code §` or `Code 1931 §` reference is `§ 55-7B-7`,
  `§ 61-3-12`, `§ 8-24-1`, etc. — **33 occurrences** mis-routed
  to NM in WV-sample opinions.

  ### Fix

  New `inheritBareSectionJurisdiction` post-extract pass in
  `src/extract/extractCitations.ts`. Forward single-pass over
  citations: tracks the most recent WV / NM jurisdictional context
  established by a full-form statute citation, and reassigns
  bare-section `NMSA 1978` citations to `W. Va. Code` (jurisdiction
  `WV`) when WV context is active.

  This is the fourth and final entry in the cross-jurisdiction
  routing cluster: #54 (MSA→MN), #58 (R.C.→OH), #422 (I.C.→IN),
  now this. Each used context-aware disambiguation rather than
  hardcoding state precedence.

  ### Tests

  6 new tests under `WV bare-section context propagation (#432)`
  in `tests/extract/extractStatute.test.ts` covering: WV-context
  inheritance, multi-bare inheritance, no-context default-to-NM,
  NM-context regression, and WV→NM context switching mid-document.
  Full 2792-test suite passes; no regressions.

## 0.15.11

### Patch Changes

- [#440](https://github.com/medelman17/eyecite-ts/pull/440) [`e32ed31`](https://github.com/medelman17/eyecite-ts/commit/e32ed31bfa2cfb4aac67417524d321079840017e) Thanks [@medelman17](https://github.com/medelman17)! - fix: caseName field no longer absorbs trailing year, court+year, and parallel-citation tokens (#436)

  The `caseName` field was absorbing content that doesn't belong to
  the name itself: **451 confirmed boundary violations** across all
  39 sampled states (379 trailing year `(YYYY)`, 9 trailing
  court+year `(Court YYYY)`, 63 trailing parallel-cite start
  `, NNN <reporter> NN`).

  ### Fix

  After `extractCaseName` returns, strip trailing tokens from
  `caseName` in `src/extract/extractCase.ts`:

  - Trailing `(YYYY)` or `(Court YYYY)` paren → strip whole paren
  - Trailing `, NNN <Reporter> NN` parallel-cite start → strip
  - Trailing `, NNNN <STATE> NN` neutral-cite shape → strip

  The CSM year-first form's year continues to be captured into
  the `year` field by `extractCaseName`; only the surface text of
  the case name is cleaned.

  ### Behavior changes

  - `Holton v. F. H. Stoltze Land & Lumber Co. (1981), 195 Mont. 1`
    → `caseName="Holton v. F. H. Stoltze Land & Lumber Co."` (was
    `"Holton v. F. H. Stoltze Land & Lumber Co. (1981)"`)
  - `United States v. Villano (10th Cir. 1987), 829 F.2d 1158`
    → `caseName="United States v. Villano"` (was `"... v. Villano
(10th Cir. 1987)"`)
  - `State v. Lane, 1998 MT 76, 962 P.2d 1190` → `caseName="State
v. Lane"` on the P.2d cite (was `"State v. Lane, 1998 MT 76"`)

  ### Tests

  3 new tests under `caseName trailing-token absorption (#436)`
  in `tests/extract/extractCase.test.ts`. Full 2766-test suite
  passes; no regressions.

- [#446](https://github.com/medelman17/eyecite-ts/pull/446) [`4d71bf1`](https://github.com/medelman17/eyecite-ts/commit/4d71bf1fb0a1e96a1895d0200396004f5c93c981) Thanks [@medelman17](https://github.com/medelman17)! - feat: state admin codes NMAC / OAR / COMAR / IDAPA / ARM (#438)

  Five state administrative-code citation families were unrecognized
  — **105 misses** across the 50-state baseline. Extends #320
  (state admin codes) for these specific code abbreviations.

  | Code  | State      | Volume | Form                            |
  | ----- | ---------- | ------ | ------------------------------- |
  | NMAC  | New Mexico | 55     | postfix: `19.25.13.27 NMAC`     |
  | OAR   | Oregon     | 24     | prefix: `OAR 734-050-0050`      |
  | COMAR | Maryland   | 14     | prefix: `COMAR 20.32.01.04F`    |
  | IDAPA | Idaho      | 5      | prefix: `IDAPA 58.01.03.004.03` |
  | ARM   | Montana    | 3      | postfix: `26.3.142(6), ARM`     |

  ### Fix

  New `state-admin-code` tokenizer pattern in
  `src/patterns/statutePatterns.ts` + `extractStateAdminCode` in
  `src/extract/statutes/extractStateAdminCode.ts`. Each form is
  anchored on the distinctive abbreviation so the pattern only
  fires for real admin-code references.

  Emits `code: <abbreviation>`, `jurisdiction: <state>`,
  `section: <hierarchical-id>`.

  ### Tests

  5 new tests under `state admin codes (#438)` in
  `tests/extract/extractStatute.test.ts`. Full 2770-test suite
  passes; no regressions.

- [#445](https://github.com/medelman17/eyecite-ts/pull/445) [`8c1e01e`](https://github.com/medelman17/eyecite-ts/commit/8c1e01e3902c3f3a3d8a9e6627584c31e2edd3c5) Thanks [@medelman17](https://github.com/medelman17)! - feat: case name backward search now runs on neutral citations (`YYYY ST NNN`) (#441)

  Neutral (vendor-neutral / public-domain) citations of the form
  `YYYY ST NNN` (`2015 MT 255`, `2004 MT 108`) and database forms
  (`1994 WL 49932`) were extracting successfully but **never
  captured a case name** — 80 occurrences in the corpus where
  canonical `<caseName>, YYYY ST NNN` form should have produced
  the name.

  ### Fix

  `extractNeutral` now runs the same `extractCaseName` backward
  search as full-case extraction:

  - Runs when `cleanedText` is provided (matching the case
    extractor's signature)
  - Applies the same trailing-token cleanup as #436 (strip
    trailing year paren, parallel-cite start, neutral-cite
    shape)
  - Strips leading prose/signal prefixes (`In`, `See`, `See
also`, `Cf.`, `But see`, `Accord`, `Contra`, `Compare`,
    `E.g.`)

  `NeutralCitation` type extended with optional `caseName?:
string` field.

  ### Behavior changes

  - `In Christian v. Atl. Richfield Co., 2015 MT 255` →
    `caseName="Christian v. Atl. Richfield Co."` (was `null`)
  - `See Farmers Union Mut. Ins. Co. v. Staples, 2004 MT 108` →
    `caseName="Farmers Union Mut. Ins. Co. v. Staples"`
  - `Blair v. Mid-Continent Cas. Co., 2007 MT 208` →
    `caseName="Blair v. Mid-Continent Cas. Co."`

  ### Tests

  3 new tests under `neutral-citation caseName backward search
(#441)` in `tests/extract/extractCase.test.ts`. Full 2766-test
  suite passes; no regressions.

## 0.15.10

### Patch Changes

- [#433](https://github.com/medelman17/eyecite-ts/pull/433) [`54ee35b`](https://github.com/medelman17/eyecite-ts/commit/54ee35bbdcbbe5b4d34b4f69864aa960c649a345) Thanks [@medelman17](https://github.com/medelman17)! - fix: signal field no longer falsely attached from distant prose (#430)

  The `signal` field on a citation was being populated with `see`,
  `see also`, `cf.`, etc. when no signal-word actually preceded the
  citation — the detector found a signal word somewhere in the gap
  between the previous citation and the current one (even
  hundreds of characters back) and attached it. 146 occurrences
  across all 39 sampled states.

  ### Fix

  `detectLeadingSignals` in `src/extract/detectStringCites.ts` now
  rejects signals whose `end` position is more than 80 chars before
  the citation start. Real `<signal> <case name>, <citation>`
  patterns are typically under 80 chars; longer gaps indicate the
  signal-word is stranded prose belonging to an earlier citation
  or unrelated sentence.

  ### Behavior changes

  - `the court applied Hawkins v. Mahoney, 1999 MT 82` — no signal
    attached (was: `signal: "see"` if any prior `see` appeared in
    the gap)
  - `we see no reason to disturb the holding. The legislature
enacted NRS 616.110(2)` — no signal (was: false `signal: "see"`)
  - `See Smith v. Jones, 100 U.S. 200 (1980)` — `signal: "see"`
    unchanged
  - `See also Brown v. Board, 347 U.S. 483` — `signal: "see also"`
    unchanged

  ### Tests

  4 new tests under `signal field not falsely attached from
distant prose (#430)` in `tests/extract/extractCase.test.ts`.
  Full 2754-test suite passes; no regressions.

- [#435](https://github.com/medelman17/eyecite-ts/pull/435) [`f5f0d1f`](https://github.com/medelman17/eyecite-ts/commit/f5f0d1fbb8b7d2ed5ec2d385ce9f5e26f07f6043) Thanks [@medelman17](https://github.com/medelman17)! - fix: explanatory parentheticals `(holding that...)` no longer routed to `court` field (#431)

  When a citation had a trailing **explanatory parenthetical** —
  `(holding that...)`, `(emphasis added)`, `(citations omitted)`,
  `(internal citations omitted)`, etc. — eyecite-ts mis-routed the
  content to the `court` field, leaving the case citation looking
  like it came from a non-existent court. 171 occurrences across
  15 states.

  ### Fixes

  Two coordinated changes in `src/extract/extractCase.ts`:

  1. **`stripDateFromCourt` rejects explanatory text**: after the
     date-stripping pass, the function now checks if the residual
     text is actually a court abbreviation. Court abbreviations
     (Bluebook T7) virtually always contain a period (`D.C. Cir.`,
     `9th Cir.`, `S.D.N.Y.`). Text with no period and starting
     with a known explanatory-signal word (`holding`, `finding`,
     `quoting`, `emphasis`, `internal`, `citations`, `omitted`,
     etc.), or text containing 3+ lowercase prose words, is now
     rejected as a court candidate.

  2. **Explanatory first-paren falls through to classification**:
     the parenthetical-chaining logic in `extractCase` used to
     always skip the first paren on the assumption that it
     carried metadata (year/court). With the fix above, an
     explanatory first paren produces no metadata, so it now
     falls through to be classified as a `Parenthetical` and
     added to the `parentheticals` array.

  ### Behavior changes

  - `336 Mont. 225 (holding that we review de novo)` →
    `court=undefined`, `parentheticals=[{text: "holding that...",
type: "holding"}]` (was: `court="holding that we review..."`)
  - `368 Mont. 189 (emphasis in original)` → `court=undefined`
  - `243 P.3d 415 (internal citations omitted)` →
    `court=undefined`
  - `100 U.S. 200 (D.C. Cir. 1980)` → unchanged
  - `100 U.S. 200 (1980)` → unchanged

  ### Tests

  5 new tests under `explanatory parentheticals not routed to
court field (#431)` in `tests/extract/extractCase.test.ts`.
  Full 2758-test suite passes; no regressions.

## 0.15.9

### Patch Changes

- [#421](https://github.com/medelman17/eyecite-ts/pull/421) [`36425d4`](https://github.com/medelman17/eyecite-ts/commit/36425d4ec6d2cf2593da1d309a0d0856e4667b98) Thanks [@medelman17](https://github.com/medelman17)! - fix: `et seq.` captured by state-postfix patterns (FL, ID, MCA, TN, WI) (#419)

  The `et seq.` suffix was systematically dropped from state-postfix
  citations — `§§ 77-6-301 et seq., MCA` extracted only `77-6-301`
  and lost the legally-significant "and the following sections"
  marker. A 50-state baseline corpus showed 59 misses across 17
  states (some via abbreviated-code which already worked; the
  remainder via the postfix patterns introduced in #356, #360,
  #372, #398, #414).

  ### Fix

  The section-body capture group in all five state-postfix
  tokenizer patterns + their mirroring extractor regexes now
  accepts the optional `(?:\s+et\s+seq\.?)?` trailer:

  - `florida-postfix` + `florida-prefix-spelled` (#356)
  - `idaho-postfix` (#360)
  - `mca-postfix` (#372)
  - `tca-postfix` (#398)
  - `wi-stats-postfix` (#414)

  `parseBody` already strips the trailer and sets `hasEtSeq:
true` — the fix just lets the trailer get captured in the
  section group so it reaches parseBody.

  The Wisconsin extractor's whitespace-collapse step
  (`replace(/\s+/g, "")`) was updated to split off the `et seq.`
  trailer first, preserving the marker while still collapsing
  spaces inside `(N)` subsection groups.

  ### Behavior changes

  - `§§ 77-6-301 et seq., MCA` → `hasEtSeq=true`, jur=MT (was:
    not extracted as MCA — instead silently mis-routed to NM via
    the bare-section fallback because the postfix container
    failed)
  - `§ 812.035 et seq., Florida Statutes` → `hasEtSeq=true`
  - `Section 23-908 et seq., Idaho Code` → `hasEtSeq=true`
  - `§ 39-904 et seq., T.C.A.` → `hasEtSeq=true`
  - `§ 76.09 et seq., Stats.` → `hasEtSeq=true`

  ### Scope notes

  The following pieces of #419 are intentionally deferred:

  - **CA Code Regs.** (`Cal. Code Regs., tit. 14, § 15000 et
seq.`) — admin regs broadly deferred per #320.
  - **NJ Admin Code** (`N.J.A.C. 18:46-1.1 et seq.`) — same.
  - **Treatises** (`1 Larson, Workmen's Compensation Law § 15.00
et seq.`) — deferred per #307.
  - **Rules** (`RALJ 1.1 et seq.`, `RAP 16.3 et seq.`) — deferred
    per #295.

  The dominant statute occurrences (the 50 in the issue's
  distribution) are now captured.

  ### Tests

  6 new tests under `et seq. captured by state-postfix patterns
(#419)` in `tests/extract/extractStatute.test.ts`:

  - MCA postfix `§§ 77-6-301 et seq., MCA`
  - Florida postfix `§ 812.035 et seq., Florida Statutes`
  - Idaho postfix `Section 23-908 et seq., Idaho Code`
  - TN postfix `§ 39-904 et seq., T.C.A.`
  - WI postfix `§ 76.09 et seq., Stats.`
  - Regression: `Ark. Code Ann. § 9-27-301 et seq. (Supp. 1989)`

  Full 2735-test suite passes; no regressions.

  ### Related

  This fix also incidentally repairs a Montana-→-NM
  mis-classification: `§§ 77-6-301 et seq., MCA` was previously
  silently mis-routed to NM because the MCA postfix pattern
  failed (didn't capture et seq.), letting the NM bare-section
  pattern (#382) match the inner `§§ 77-6-301`. With the postfix
  container now capturing the full citation, MT wins.

- [#425](https://github.com/medelman17/eyecite-ts/pull/425) [`602dfbc`](https://github.com/medelman17/eyecite-ts/commit/602dfbcd96aada9abc1972943ee3265c79123602) Thanks [@medelman17](https://github.com/medelman17)! - fix: hyphenated year-range edition parentheticals `(Supp.1975-76)` (#420)

  The no-space and spaced single-year forms (`(Supp. 1998)`,
  `(Supp.1998)`, `(Repl.1996)`) already worked via the year-paren
  absorber. Only the hyphenated year-range form
  (`(Supp.1975-76)`, `(Supp.1973-1975)`) was rejected because the
  regex's closing `\)` expected to immediately follow the captured
  `(\d{4})` year.

  ### Fix

  `STATUTE_YEAR_PAREN_REGEX` in `src/extract/extractCitations.ts`
  now consumes an optional `(?:-\d{2,4})?` suffix after the year.
  The first year is captured as the `year` field; the suffix is
  consumed but not separately reported.

  ### Behavior changes

  - `(Supp.1975-76)` → `year=1975`, `editionLabel="Supp."` (was:
    not extracted)
  - `(Supp.1973-1975)` → `year=1973`, `editionLabel="Supp."`
  - `(Supp.1998)`, `(Supp. 1998)`, `(Repl.1996)`, `(Reissue 2003)`
    — all unchanged

  ### Scope notes

  The following pieces of #420 are intentionally deferred:

  - **Section ranges** (`§§ 15-78-10 to -200`, `§§ 13-108 and
13-621`) — multi-section family.
  - **Bare-section + edition paren follow-on** (`42-17-40
(Supp.2003)`) — short-form citation problem.

  ### Tests

  4 new tests under `Year-range edition parentheticals (#420)` in
  `tests/extract/extractStatute.test.ts`:

  - Hyphenated year `(Supp.1975-76)`
  - Full year suffix `(Supp.1973-1975)`
  - Regression: no-space `(Supp.1998)`
  - Regression: spaced `(Supp. 1998)`

  Full 2735-test suite passes; no regressions.

- [#429](https://github.com/medelman17/eyecite-ts/pull/429) [`5235ee5`](https://github.com/medelman17/eyecite-ts/commit/5235ee50cae343f89ef391ebd689ba429bed36d0) Thanks [@medelman17](https://github.com/medelman17)! - fix: Federal `USC` / `CFR` / `USCA` / "United States Code" variants extracted as statutes (#428)

  Federal-statute variants used in court-published opinions were
  mis-typed as `case` or not extracted at all. 29 mis-typed
  occurrences + 8 unextracted across 11 states.

  ### Variants now supported

  - `42 USC 1983` (no periods, no §) — previously mis-typed as case
  - `42 CFR 447` — same
  - `11 USCA § 544(a)(3)` (West annotated) — previously not extracted
  - `49 U.S.C. Section 1513` (word `Section`) — was mis-typed as case
  - `42 United States Code section 1983` (spelled-out) — was
    mis-typed as case

  ### Fixes

  Three coordinated changes:

  1. **Pattern alternation**: USC and CFR regexes in
     `src/patterns/statutePatterns.ts` extended to accept `USC` /
     `USCA` / `U.S.C.` / `U.S.C.A.` / `United States Code` for the
     USC side and `C.F.R.` / `CFR` / `Code of Federal Regulations`
     for the CFR side. Connector (`§§?` / `Section(s)` / `Sec.` /
     `Part`) made optional so bare `N USC NNNN` form matches.

  2. **Pattern priority**: USC/CFR/IRC patterns moved BEFORE
     `casePatterns` in `extractCitations.ts` so the broad
     `state-reporter` regex (which would otherwise match
     `42 USC 1983` as vol-reporter-page) is subsumed by the
     federal-statute container.

  3. **Extractor regex**: `FEDERAL_SECTION_RE` and
     `FEDERAL_PART_RE` in `extractFederal.ts` match the same
     expanded alternation, with an optional connector. Code is
     canonicalized to Bluebook form (`U.S.C.` for USC family,
     `C.F.R.` for CFR family) via stripped-form comparison.

  4. **False-positive blocklist**: USC/CFR/USCA added to the
     `BLOCKED_REPORTERS` set in `filterFalsePositives.ts` so any
     residual `state-reporter` match falls back to the
     false-positive filter (low confidence + warning).

  ### Behavior changes

  - `42 USC 1983` → `code="U.S.C."`, `title=42`, `section="1983"`
    (was: type=case, warnings)
  - `42 CFR 447` → `code="C.F.R."`, `title=42`, `section="447"`
  - `11 USCA § 544(a)(3)` → `code="U.S.C."`, `title=11`,
    `section="544"`, `subsection="(a)(3)"`
  - `49 U.S.C. Section 1513` → `code="U.S.C."`, `title=49`
  - `42 United States Code section 1983` → `code="U.S.C."`,
    `title=42`
  - `42 U.S.C. § 1983` (canonical Bluebook) — unchanged

  ### Behavior notes

  The `code` field is now canonicalized to Bluebook form. Previously
  the no-period variants would emit `code="USC"` / `"CFR"`
  preserving the input surface. Two existing tests (extractFederal
  "should extract USC without periods", "should handle CFR without
  periods") were updated to reflect the new canonicalized output;
  the corpus fixture entry for `15 USC § 78j` was updated similarly.

  ### Scope notes

  The following pieces of #428 are intentionally deferred:

  - **`Title 18, USC Section 659`** title-prefix prose — needs
    prose-form pattern with `Title N` prefix
  - **Multi-title shortcut** (`21 U.S.C. and 42`) — semantic
    shorthand for "title 21 and title 42 of the U.S.C."

  ### Tests

  7 new tests under `Federal USC / CFR variants (#428)` in
  `tests/extract/extractStatute.test.ts`. Full 2747-test suite
  passes; one corpus fixture and two extractFederal tests
  updated for the new canonicalized `code` output.

## 0.15.8

### Patch Changes

- [#409](https://github.com/medelman17/eyecite-ts/pull/409) [`dc75d7b`](https://github.com/medelman17/eyecite-ts/commit/dc75d7b3503b645b4173547f7024568defb74837) Thanks [@medelman17](https://github.com/medelman17)! - feat: Virginia bare `Code § 18.2-308.2` form + tighten Georgia pre-1983 disambiguator (#405)

  Virginia uses a bare `Code §` form (no `Va.` prefix) as its
  canonical statutory citation style. A 50-opinion VA sample
  produced 30+ misses — the largest single-state miss volume in
  the sweep series.

  ### Fix

  - **New `va-bare-code` tokenizer pattern + extractor**: matches
    bare `Code § N.N-NNN` and the explicit `Virginia Code §
N.N-NNN`. Output: `code: "Code"` / `"Virginia Code"`,
    `jurisdiction: "VA"`.

  - **Disambiguator from Georgia pre-1983**: Virginia sections
    always include at least one PERIOD (`18.2-308.2`,
    `20-107.3(D)`, `8.01-581.17`), while Georgia pre-1983 sections
    never do (`26-2101`, `27-2501`, `110-501`). The VA pattern
    matches `(?:\d+\.\d+-\d+(?:\.\d+)?|\d+-\d+\.\d+)` — either
    title has period or section has period (or both).

  - **Tighten Georgia pre-1983 pattern**: added negative
    lookahead `(?!\.\d)` after the section so Virginia sections
    with period-followed-by-digit don't mis-route to Georgia.
    Sentence-end periods (`Code § 26-2101.`) still allow
    Georgia matching because `(?!\.\d)` only rejects when period
    is followed by digit. Fixes a regression introduced with the
    Georgia pre-1983 pattern (#358).

  ### Behavior changes

  - `Code § 18.2-308.2` → `code="Code"`, `jurisdiction="VA"`
    (was: not extracted)
  - `Code § 46.2-1571` → VA (was: not extracted)
  - `Code § 20-107.3(D)` → VA, `subsection="(D)"` (was:
    mis-classified as GA with truncated section "20-107")
  - `Virginia Code § 8.01-581.17` → VA (was: not extracted)
  - `Code § 27-2501` → unchanged (GA, no periods in section)
  - `Va. Code Ann. § 18.2-308.2` → unchanged (VA via named-code)

  ### Scope notes

  The following pieces of #405 are intentionally deferred:

  - **Bare-section follow-on** (`§ 8.01-20.1`) — short-form
    citation problem, not extraction.

  ### Tests

  6 new tests under `Virginia bare Code form (#405)` in
  `tests/extract/extractStatute.test.ts`:

  - `Code § 18.2-308.2` (canonical VA)
  - `Code § 46.2-1571` (period in title only)
  - `Code § 20-107.3(D)` (period in section only, with subsection)
  - `Virginia Code § 8.01-581.17` (explicit prefix)
  - Regression: Georgia `Code § 27-2501` still routes to GA
  - Regression: `Va. Code Ann. § 18.2-308.2` continues to work

  Full 2701-test suite passes; no regressions.

  ### Related

  This is the largest-impact fix in the bare-code family. The
  period-vs-no-period disambiguator is a clean structural
  distinction that should be robust against false positives in
  either direction. Pairs the Georgia pre-1983 pattern (#358)
  with a corresponding Virginia pattern, with disjoint section
  formats keeping them mutually exclusive.

- [#411](https://github.com/medelman17/eyecite-ts/pull/411) [`9d9971d`](https://github.com/medelman17/eyecite-ts/commit/9d9971d1a4a6a70e468d523f7888daa92fb055a2) Thanks [@medelman17](https://github.com/medelman17)! - feat: West Virginia `W.Va.Code` (no space) routing + historical `Code 1931` form (#406)

  WV opinions interchange `W.Va. Code` (with space) and `W.Va.Code`
  (no space). The no-space form was unrecognized, and worse, the NM
  bare-section pattern (#382) was silently capturing the `§ N-N-N`
  suffix and mis-routing every no-space WV citation to **New Mexico**
  (same family of regressions as the SC #397 fix).

  Modern WV opinions also cite the historical `Code 1931` form for
  statutory history — unrecognized.

  ### Fixes

  - **WV fragment**: `\s+` between `W.Va.` and `Code` relaxed to
    `\s*` so the no-space form matches the WV container pattern.
    Span dedup then subsumes the NM bare-section match. WV
    abbreviations reordered so `W. Va. Code Ann.` (Bluebook) is
    canonical; no-space variants normalize via stripped-form
    fallback.
  - **New `wv-code-1931` pattern**: matches `Code 1931, N-N-N, as
amended` / `Code, 1931, N-N-N` / `Code, N-N-N` (bare, no year).
    The 3-part hyphenated section format disambiguates from
    Georgia pre-1983 (2-part) and Virginia bare-Code (always
    contains period). When the `1931` year is present, captures
    as `year`. Listed BEFORE `ga-pre-1983` so WV 3-part sections
    win span dedup.

  ### Behavior changes

  - `W.Va.Code § 8-24-28` (no space) → `jurisdiction="WV"` (was:
    mis-routed to NM)
  - `Code 1931, 49-6-3, as amended` → `code="W. Va. Code"`,
    `jurisdiction="WV"`, `year=1931` (was: not extracted)
  - `Code, 1931, 49-6-3` → `year=1931` (was: not extracted)
  - `Code, 14-2-13` → WV (was: not extracted)
  - `W.Va. Code § 55-7B-1` (with space) → unchanged
  - `W. Va. Code Ann. § 17C-5-2` → unchanged

  ### Scope notes

  The following pieces of #406 are intentionally deferred:

  - **Section ranges** (`W.Va. Code §§ 55-7B-1 to -12`) —
    multi-section deferred across all states.
  - **Repl./Cum. Supp. parentheticals** (`(1976 Repl.Vol.)`,
    `(Supp.2007)`) — these mostly attach via the generic year-paren
    absorber from #349 #373, but the `Repl.Vol.` form may need
    additional patterns.
  - **Chapter/Article prose** (`Chapter 5A, Article 3 of the Code
of West Virginia`) — prose form needs a different pattern.
  - **Local ordinances** (`Fairmont, W.Va. Ordinance 425, § 1.200`)
    — out of scope for statutory extraction.

  ### Tests

  5 new tests under `West Virginia W.Va. Code + historical Code
1931 (#406)` in `tests/extract/extractStatute.test.ts`:

  - `W.Va.Code § 8-24-28` (no space — fixes NM mis-routing)
  - `Code 1931, 49-6-3, as amended` (historical with year)
  - `Code, 1931, 49-6-3` (comma-separated)
  - `Code, 14-2-13` (bare, no year)
  - Regression: `W.Va. Code § 55-7B-1` (with space)

  Full 2708-test suite passes; no regressions.

  ### Related

  Second jurisdiction-routing regression caused by the NM
  bare-section pattern (#382) — first was SC (#397). Pattern:
  when a state's container regex requires `\s+` where the
  real-world form has `\s*`, the bare-section pattern matches
  the inner `§ N-N-N` and steals the citation. The fix is
  straightforward: relax the state's whitespace requirement.

- [#413](https://github.com/medelman17/eyecite-ts/pull/413) [`fe01958`](https://github.com/medelman17/eyecite-ts/commit/fe019580c2ccfc6a13e9550ba73b96d33732edfd) Thanks [@medelman17](https://github.com/medelman17)! - feat: Washington RCW chapter-postfix form `chapter 49.60 RCW` (#408)

  Canonical Washington court style places the chapter number BEFORE
  RCW (postfix form), unlike the prefix `RCW chapter NN` form used
  in other states. The `NN.NN` chapter format is distinctively
  Washington.

  ### Fix

  New `rcw-chapter-postfix` tokenizer pattern + dedicated
  `extractRcwChapterPostfix` extractor. Accepts both lowercase
  `chapter` and capitalized `Chapter`. Emits `code: "RCW"`,
  `jurisdiction: "WA"`, with the chapter ID in `section` (matching
  the convention from `rsa-chapter` #378, `oh-chapter` #388,
  `ors-chapter` #387).

  ### Scope notes

  The following pieces of #408 are intentionally deferred:

  - **`Laws of YYYY, ch. NNN, § N`** session laws — pending
    unified `sessionLaw` citation type.
  - **`[former] N.NN.NN [(YYYY)]`** bracketed annotation — marks
    superseded sections; needs separate handling.
  - **Section continuation** (`RCW 60.04 -.181(3)`) — multi-section
    family.

  ### Tests

  3 new tests under `Washington RCW chapter-postfix form (#408)` in
  `tests/extract/extractStatute.test.ts`:

  - `chapter 49.60 RCW` (lowercase)
  - `Chapter 41.26 RCW` (capitalized)
  - Regression: `RCW 10.88.330` (prefix form)

  Full 2717-test suite passes; no regressions.

  ### Related

  Sixth chapter-only state pattern (after NH `rsa-chapter` #378,
  OH `oh-chapter` #388, OR `ors-chapter` #387, plus the WV-1931
  historical pattern). Washington's distinctive postfix variant
  (chapter BEFORE the code abbreviation) is unique in the family.

- [#416](https://github.com/medelman17/eyecite-ts/pull/416) [`9857d0e`](https://github.com/medelman17/eyecite-ts/commit/9857d0e68f4c760b6ffecc24e35b18c831629e72) Thanks [@medelman17](https://github.com/medelman17)! - feat: Wisconsin Statutes postfix form `§ NN.NN, Stats.` + uppercase `STATS.` (#414)

  Wisconsin court style places the `Stats.` abbreviation AFTER the
  section, separated by a comma — `§ 76.09, Stats.`, `sec. 805.13(3),
Stats.`, `§ 48.415(l)(a)3, STATS.` (uppercase). The dominant
  Wisconsin citation form (11 occurrences in a 50-opinion sample
  for `§ 76.09, Stats.` alone) was unrecognized.

  ### Fix

  New `wi-stats-postfix` tokenizer pattern + dedicated
  `extractWiStatsPostfix` extractor. Sibling to florida-postfix,
  idaho-postfix, mca-postfix, tca-postfix — fifth state-postfix
  pattern, distinguished from the others by its trailing
  alphanumeric sub-subsection marker (`3` in `48.415(l)(a)3`).

  - Section connector accepts `§`, `§§`, `sec.`/`Sec.`,
    `section`/`Section`.
  - Code abbreviation accepts both lowercase `Stats.` and
    uppercase `STATS.`.
  - Section body allows trailing alphanumeric after paren chain
    (`(l)(a)3`) for Wisconsin's sub-subsection notation.

  Emits `code: "Wis. Stat."`, `jurisdiction: "WI"`, section body
  with full subsection chain.

  ### Scope notes

  The following pieces of #414 are intentionally deferred:

  - **`sec. (Rule) NN.NN, Stats.`** — Wisconsin evidence rules
    cited as Stats. sections; needs handling of the inserted
    `(Rule)` annotation.
  - **Bare-section follow-ons** (`§ 19.36(3)`, `§ 68.13`) —
    short-form citation problem, not extraction.

  ### Tests

  5 new tests under `Wisconsin Stats. postfix form (#414)` in
  `tests/extract/extractStatute.test.ts`:

  - `§ 76.09, Stats.` (canonical lowercase)
  - `§ 48.415(l)(a)3, STATS.` (uppercase + trailing
    sub-subsection)
  - `sec. 805.13(3), Stats.` (word sec.)
  - `Section 48.415, Stats.` (capitalized word Section)
  - Regression: `Wis. Stat. § 803.04(2)` (modern prefix)

  Full 2721-test suite passes; no regressions.

  ### Related

  Fifth state-postfix pattern after FL (#356), ID (#360), MT
  (#372), TN (#398). Wisconsin is unique in supporting trailing
  alphanumeric sub-subsection markers — other postfix states stop
  at the closing paren of the last subsection.

- [#417](https://github.com/medelman17/eyecite-ts/pull/417) [`1f74b14`](https://github.com/medelman17/eyecite-ts/commit/1f74b1492985704d772fb1ed889bf7f80f064703) Thanks [@medelman17](https://github.com/medelman17)! - fix: Louisiana `La.R.S.` (no space) — colon title:section form (#415)

  Louisiana court style commonly uses `La.R.S. NN:NNN` (no space
  between `La.` and `R.S.`). The LA fragment required `\s+` between
  the prefix and `R.S.`, so the no-space form was unrecognized.

  ### Fix

  - **LA fragment**: `\s+` between `La.` and `R.S.` relaxed to
    `\s*` so the no-space form matches.
  - **Canonical normalization**: LA abbreviations reordered so
    `La. R.S.` (Bluebook standard) is the last element /
    canonical. The no-space variant normalizes to `La. R.S.` via
    the stripped-form fallback.

  ### Behavior changes

  - `La.R.S. 48:453` → `code="La. R.S."`, `jurisdiction="LA"`,
    `section="48:453"` (was: not extracted)
  - `La.R.S. 23:1032` → LA, section preserves colon
  - `La. R.S. 48:453` (with space) → unchanged

  ### Scope notes

  The following pieces of #415 are intentionally deferred:

  - **Bare `R.S. NN:NNN`** (no `La.` prefix) — too generic
    without context.
  - **Section ranges** (`La.R.S. 48:441 to 460`,
    `La.R.S. 39:1401-06`) — multi-section deferred across all
    states.
  - **OCR variant** (`R.S. 23 :- 1061`) — OCR cleanup upstream.
  - **Code of Civil Procedure / Criminal Procedure Article N** —
    named-article statutory codes; needs separate pattern.
  - **Bare `Article N` follow-ons** — short-form citation
    problem.
  - **`Act N of YYYY`** session laws — pending unified
    `sessionLaw` citation type.

  ### Tests

  3 new tests under `Louisiana \`La.R.S.\` no-space variant
  (#415)`in`tests/extract/extractStatute.test.ts`:

  - `La.R.S. 48:453` (no space)
  - `La.R.S. 23:1032` (canonical court style)
  - Regression: `La. R.S. 48:453` (with space)

  Full 2726-test suite passes; no regressions.

  ### Related

  Whitespace-tolerance + canonical-reorder fix in the same family
  as SC (#397), WV (#406), PA (#392), and the broader spacing-
  tolerance family (AZ #348, OH #388, TN #398).

## 0.15.7

### Patch Changes

- [#365](https://github.com/medelman17/eyecite-ts/pull/365) [`1657ccb`](https://github.com/medelman17/eyecite-ts/commit/1657ccb0b1b724376ceba64025c9d9b73d826ad8) Thanks [@medelman17](https://github.com/medelman17)! - fix: Florida postfix and spelled-out-prefix statute forms (#356)

  Florida courts use a distinctive postfix citation syntax where the
  code name appears AFTER the section number — opposite the typical
  Bluebook prefix order. eyecite-ts handled the canonical Bluebook
  `Fla. Stat. § N` form but missed every Florida-specific variant. A
  50-opinion Florida sample produced 15+ statute misses dominated by
  these forms:

  - `section 812.035(7), Florida Statutes`
  - `§83.15, Florida Statutes`
  - `§120.68, Fla. Stat.`
  - `Florida Statute 679.504(3)` (singular code name, no `section`/`§`)
  - `Florida Statutes §73.071(3)(b)`

  ### Fix

  Two new tokenizer patterns + one new extractor:

  - **`florida-postfix`** — section first, then code name
    (`section <body>, Florida Statutes|Fla. Stat.` /
    `§<body>, Florida Statutes|Fla. Stat.`). Uses a lookbehind
    `(?<![A-Za-z])` boundary so the pattern can start at `§` (a `\b`
    anchor doesn't match before a non-word char).
  - **`florida-prefix-spelled`** — spelled-out code name first
    (`Florida Statute(s) [§] <body>`). Distinct from the canonical
    Bluebook `Fla. Stat. §` prefix already handled by `abbreviated-code`.

  Both patternIds dispatch to a new
  `src/extract/statutes/extractFloridaStatute.ts`, which emits
  `code: "Fla. Stat."` (normalized) and `jurisdiction: "FL"`.

  The patterns are listed BEFORE `abbreviated-code` in `statutePatterns.ts`
  so the container shapes win span dedup over the trailing `Florida
Statutes` token (which would otherwise tokenize on its own with a
  phantom section).

  ### Scope notes

  Two pieces of #356 are intentionally deferred:

  - **Chapter-only references** (`Chapter 78, Florida Statutes`,
    `Chapters 74-310 and 75-191, Florida Statutes`) — needs a data
    model change (separate `chapter` field, or a chapter-only marker)
    that's larger than a tight regex fix.
  - **Florida session laws** (`Chapters 74-310 and 75-191, Laws of
Florida`) — needs a new `sessionLaw` citation type. Tracked
    separately alongside California `Stats.`, Colorado `Sess. Laws`,
    and Arkansas equivalents.

  ### Tests

  7 new tests under `Florida postfix + spelled-out-prefix statute forms
(#356)` in `tests/extract/extractStatute.test.ts`:

  - Postfix word-section: `section 812.035(7), Florida Statutes`
  - Postfix §-section (no space): `§83.15, Florida Statutes`
  - Postfix §-section with `Fla. Stat.`: `§120.68, Fla. Stat.`
  - Spelled-out singular prefix: `Florida Statute 679.504(3)`
  - Spelled-out plural prefix + §: `Florida Statutes §73.071(3)(b)`
  - Regression: canonical `Fla. Stat. § 812.035(7)`
  - Regression: abbreviated `F.S. § 812.035`

  Full 2569-test suite passes; no regressions.

  ### Related

  Same family as #348 (Arizona), #349 (Arkansas), #352 (Colorado), #330
  (Illinois pre-1993), #343 (Alabama 1940). Each state's statute code
  has its own ordering, abbreviation, and connector conventions that
  need explicit pattern coverage.

- [#407](https://github.com/medelman17/eyecite-ts/pull/407) [`68657f0`](https://github.com/medelman17/eyecite-ts/commit/68657f01aa8909e79650aff8b39e63ccc7f1bf2b) Thanks [@medelman17](https://github.com/medelman17)! - feat: Georgia pre-1983 Code (`Code Ann. § 26-2101`, `Code § 27-2501`) (#358)

  Georgia replaced its old "Code" / "Code of Georgia Annotated" with
  OCGA in 1983. Modern Georgia opinions still cite the pre-1983 code
  for statutory history. Bare `Code Ann.` (no state prefix) and bare
  `Code` are unambiguously Georgia — other states use prefixed forms
  (`Md. Code Ann.`, `Ind. Code Ann.`) which are handled by the
  `named-code` / `abbreviated-code` patterns.

  ### Fix

  New `ga-pre-1983` tokenizer pattern + dedicated `extractGaPre1983`
  extractor. The TWO-part hyphenated section format (`\d+-\d+` with
  negative lookahead `(?![\d-])` so 3-part OCGA-style sections like
  `15-11-26` don't partial-match) serves as the disambiguator. Listed
  AFTER `abbreviated-code` so prefixed forms (`Ark. Code Ann.`,
  `Idaho Code`, etc.) win span dedup.

  Emits `code: "Code"` or `"Code Ann."`, `jurisdiction: "GA"`, and
  the two-part section.

  ### Scope notes

  The following pieces of #358 are intentionally deferred:

  - **Code parenthetical history** (`Code Ann. § 67-1316 (Ga. L.
1958, p. 655; as amended)`) — the inner `(Ga. L. ...)`
    session-law parenthetical needs separate parsing.
  - **`Ga. L. YYYY, p. NNN` session laws** — pending unified
    `sessionLaw` citation type.
  - **CPA parenthetical cross-references** (`CPA § 17(a) (Code Ann.
§ 81A-117(a))`) — same family.

  ### Tests

  6 new tests under `Georgia pre-1983 Code (#358)` in
  `tests/extract/extractStatute.test.ts`:

  - `Code Ann. § 26-2101` (bare with Ann.)
  - `Code § 27-2501` (bare, no Ann.)
  - `Code § 110-501` (longer title)
  - Regression: Maryland `Md. Code Ann. § 10-105` (still MD)
  - Regression: modern OCGA `OCGA § 15-11-26(b)` (3-part, no
    partial match)
  - Regression: `Ga. Code Ann. § 16-5-1` (3-part, exactly one
    citation — named-code wins via span dedup)

  Full 2694-test suite passes; no regressions.

  ### Related

  The bare-pattern approach mirrors the NY bare named-code form
  (#386) but with a more constrained section-format disambiguator.
  The 2-part vs. 3-part hyphenated-section distinction (`26-2101`
  vs. `15-11-26`) is the same disambiguator used by the NM
  bare-section pattern (#382) but in the opposite direction —
  Georgia uses 2-part while NM uses 3-part.

- [#369](https://github.com/medelman17/eyecite-ts/pull/369) [`fb94f03`](https://github.com/medelman17/eyecite-ts/commit/fb94f03494722f2d76e1aa516a7a6af72c95faa6) Thanks [@medelman17](https://github.com/medelman17)! - feat: extract Revised Laws of Hawaii (pre-1955) `RLH YYYY § N` citations (#359)

  Hawaii compiled its statutes as `RLH 1935`, `RLH 1945`, and `RLH 1955`
  before adopting the modern Hawaii Revised Statutes (HRS) in 1968.
  Modern Hawaii opinions still cite RLH when referencing pre-1955
  statutory history. A 50-opinion Hawaii sample showed these forms
  weren't extracted.

  ### Fix

  New `rlh` tokenizer pattern in `src/patterns/statutePatterns.ts` and
  dedicated `extractRlh` extractor at
  `src/extract/statutes/extractRlh.ts`.

  Tokenizer regex:

  ```
  \bRLH\s+(\d{4})\s+§\s+(<section-body>)
  ```

  The `RLH` abbreviation is distinctively Hawaii-only, so no
  jurisdiction disambiguation is needed. Output:
  `code: "RLH"`, `jurisdiction: "HI"`, `year` = edition (1935/1945/1955),
  `section` (and `subsection` if present).

  ### Scope notes

  The dominant Hawaii citation form `HRS § N` already worked (handled by
  the abbreviated-code pattern). This PR adds only the historical RLH
  compilation. The following pieces of #359 are intentionally deferred:

  - **HRS Chapter-only references** (`HRS Chapter 353E`) — needs a
    `chapter`/section-less data model.
  - **HRS multi-section lists** (`HRS §§ 705-500, 707-701(1) (1985)`)
    — same multi-section scope deferred for other states.
  - **Hawaii Session Laws** (`1927 Sess. L., Act 206, § 4, at 209`) —
    needs a new `sessionLaw` citation type, tracked alongside the
    unified-session-law work for CA / FL / CO / AR / GA.
  - **Prose form with okina** (`Section X of the Hawai'i Revised
Statutes`) — sibling to `extractColoradoProse` (#352); deferred.

  ### Tests

  4 new tests under `Revised Laws of Hawaii (pre-1955) (#359)` in
  `tests/extract/extractStatute.test.ts`:

  - Canonical `RLH 1935 § 2545`
  - `RLH 1945 § 7186`
  - Hyphenated section `RLH 1955 § 100-1`
  - Regression: modern `HRS § 658-8 (1976)` continues to work

  Full 2574-test suite passes; no regressions.

  ### Related

  Companion to #330 (pre-1993 Illinois Revised Statutes) and #343
  (Code of Alabama 1940) — historical state-statute formats that
  remain in active citation.

- [#374](https://github.com/medelman17/eyecite-ts/pull/374) [`d02c1c3`](https://github.com/medelman17/eyecite-ts/commit/d02c1c3e3ebec79b6abc9999ada39037af16c055) Thanks [@medelman17](https://github.com/medelman17)! - feat: extract Idaho Code variants — `Idaho Code, § N`, postfix `Section N, Idaho Code`, and `I.C.` / `I. C.` abbreviations (#360)

  Idaho courts cite the Idaho Code in five interchangeable forms within a
  single opinion. Only the canonical `Idaho Code § N` and the universal
  `Idaho Code section N` (#348) variants were extracted. A 50-opinion
  Idaho sample produced 20+ Idaho Code misses — the dominant statutory
  citation form.

  ### Fixes

  - **Comma form** (`Idaho Code, § 19-4906(c)`) — added optional comma
    between code name and section connector in the `abbreviated-code`
    tokenizer regex (`buildAbbreviatedCodeRegex` in
    `src/data/stateStatutes.ts`) and the mirroring extractor regex
    (`ABBREVIATED_RE` in `src/extract/statutes/extractAbbreviated.ts`).
    Universal change; harmless to other states.
  - **Postfix form** (`Section 23-908(4), Idaho Code`) — new
    `idaho-postfix` tokenizer pattern (sibling to `florida-postfix`),
    routed to dedicated `extractIdahoPostfix` extractor. Emits
    `code: "Idaho Code"`, `jurisdiction: "ID"`.
  - **`I.C. § N`** / **`I. C. § N`** — Idaho regex fragment now admits
    `I\.?\s*C\.?` (canonical dotted + inter-letter spacing variants).
    The stripped-form fallback in `findAbbreviatedCode` resolves
    spacing variants to the canonical `I.C.` abbreviation.

  ### Indiana / Idaho disambiguation

  Bare `I.C.` (with dots) is the Idaho abbreviation; Indiana opinions
  use the dotless `IC` or the spelled-out `Ind. Code` forms instead.
  The Indiana regex fragment in `src/data/stateStatutes.ts` was
  tightened from `I\.?C\.?` (which matched both `IC` and `I.C.`) to
  literal `IC`, freeing the dotted form for Idaho. Indiana coverage of
  `IC`, `Ind. Code`, `Indiana Code`, and `Burns Ind. Code Ann.` is
  unchanged.

  ### Scope notes

  The following pieces of #360 are intentionally deferred:

  - **Multi-section lists** (`I.C. §§ 61-624, 61-629`,
    `Idaho Code §§ 19-4904 and 19-852`) — deferred across all states
    pending a unified multi-section data-model decision.
  - **Section ranges** (`I.C. §§ 16-1605-1607`) — ambiguous parse
    (range vs. weird single section); deferred with the multi-section
    work.

  ### Tests

  8 new tests under `Idaho Code variants (#360)` in
  `tests/extract/extractStatute.test.ts`:

  - `Idaho Code section 15-5-209`
  - `Idaho Code section 19-2715(5)` with subsection
  - `Idaho Code, § 19-4906(c)` (comma form)
  - `Section 23-908(4), Idaho Code` (postfix form)
  - `I.C. § 61-623` (canonical dotted)
  - `I. C. § 61-623` (spaced)
  - Regression: `IC 35-42-1-1` still routes to Indiana
  - Regression: `Ind. Code § 35-42-1-1` still routes to Indiana

  Full 2583-test suite passes; no regressions.

  ### Related

  Sibling to #356 (Florida postfix), #348 (universal word-section
  connector), and #349 (Arkansas inter-letter spacing). Every state
  with a dotted-abbreviation code (A.R.S., C.R.S., I.C., etc.) needs
  both spacing tolerance and an audit against neighboring states that
  might collide on the stripped form.

- [#389](https://github.com/medelman17/eyecite-ts/pull/389) [`133bb7f`](https://github.com/medelman17/eyecite-ts/commit/133bb7f86ebeabfe588644c76df7ee1d5d892711) Thanks [@medelman17](https://github.com/medelman17)! - feat: Indiana pre-1976 Burns Statutes, `IC YYYY` year-edition mis-parse, uppercase `IND. CODE` (#363)

  A 50-opinion Indiana sweep produced 15+ Indiana statute misses
  covering three distinct failure modes:

  1. **Pre-1976 Burns Indiana Statutes Annotated** — modern
     Indiana opinions still cite this when referencing pre-1976
     statutory text (`Burns Ind. Stat. Ann.`, `Burns' Indiana
Statutes Annotated`, `Ind. Stat. Ann.`, `Ind. Ann. Stat.`).
     All variants were entirely unrecognized.
  2. **`IC YYYY` year-edition mis-parse** — `IC 1971, 35-13-4-4`
     captured the year as section (silently substituting `1971`
     for the actual section `35-13-4-4`), same family as the
     year-edition mis-parses fixed for Colorado #352, Minnesota
     #371, and Kansas #367.
  3. **Uppercase `IND. CODE`** — Indiana case captions and some
     treatises use the all-caps form, but the Indiana regex
     fragment only matched the mixed-case `Ind. Code`.

  ### Fixes

  - **Pre-1976 Burns entry**: new separate Indiana entry in
    `src/data/stateStatutes.ts` for the historical Burns Indiana
    Statutes Annotated compilation. Fragment matches
    `Burns(?:'s|')?\s+Ind(?:iana)?\.?\s+Stat(?:utes)?\.?
(?:\s+Ann(?:otated)?\.?)?` plus the `Ind. Stat. Ann.` and
    `Ind. Ann. Stat.` forms. Sibling to Arkansas's modern/pre-1987
    split (#349).

  - **Apostrophe-aware stripped lookup**: `findAbbreviatedCode`
    in `src/data/knownCodes.ts` now strips apostrophes (along
    with dots and whitespace) when computing the canonical
    stripped-form key. This lets `Burns' Indiana Statutes
Annotated` resolve to the apostrophe-less entry.

  - **IC year-edition pattern**: new `ic-year-edition` tokenizer
    pattern + dedicated `extractIcYearEdition` extractor. Captures
    `IC 1971, 35-13-4-4` as `code: "IC"`, `year: 1971`,
    `section: "35-13-4-4"`, `jurisdiction: "IN"`. The trailing
    `, NN-N-N` separator distinguishes year-edition from bare
    `IC NN-N-N` modern cites. Listed BEFORE `abbreviated-code`.

  - **`IND. CODE` uppercase**: Indiana regex fragment extended
    with `IND\.?\s+CODE` to accept the all-caps variant.

  ### Behavior changes

  - `IC 1971, 35-13-4-4` → `section="35-13-4-4"`, `year=1971`
    (was: `section="1971"`)
  - `Burns Ind. Stat. Ann., § 10-3401 (1956 Repl.)` →
    `jurisdiction="IN"`, `year=1956`, `editionLabel="Repl."`
    (was: not extracted)
  - `Burns' Indiana Statutes Annotated § 48-702` →
    `jurisdiction="IN"` (was: jurisdiction undefined; apostrophe
    blocked stripped-form lookup)
  - `IND. CODE 6-5-1-7` → `jurisdiction="IN"`, `section="6-5-1-7"`
    (was: not extracted)
  - Modern `IC 35-42-1-1` → unchanged

  ### Scope notes

  The following pieces of #363 are intentionally deferred:

  - **Indiana Acts session laws** (`Indiana Acts 1905, ch. 129,
§ 243`, `Acts 1929, ch. 172, § 49, p. 536`) — pending
    unified `sessionLaw` citation type alongside session-law
    formats for other states.

  ### Tests

  7 new tests under `Indiana pre-1976 Burns + IC year-edition +
IND. CODE (#363)` in `tests/extract/extractStatute.test.ts`:

  - Year-edition `IC 1971, 35-13-4-4`
  - Uppercase `IND. CODE 6-5-1-7`
  - Pre-1976 `Burns Ind. Stat. Ann., § 10-3401 (1956 Repl.)`
  - Pre-1976 `Ind. Stat. Ann. § 28-1710 (Burns 1971)`
  - Pre-1976 `Burns' Indiana Statutes Annotated § 48-702`
    (apostrophe form)
  - Pre-1976 `Ind. Ann. Stat. § 10-4709`
  - Regression: bare modern `IC 35-42-1-1`

  Full 2628-test suite passes; no regressions.

  ### Related

  Companion to #330 (pre-1993 Illinois Revised Statutes), #343
  (Code of Alabama 1940), #359 (Revised Laws of Hawaii pre-1955),
  #349 (Arkansas pre-1987 Statutes Annotated), and #373 (Nebraska
  R.R.S. 1943) — historical state-statute compilations that
  remain in active citation. The `IC YYYY` mis-parse fix joins
  Colorado #352, Minnesota #371, and Kansas #367 in the
  year-edition pattern family.

- [#385](https://github.com/medelman17/eyecite-ts/pull/385) [`e7bd3f8`](https://github.com/medelman17/eyecite-ts/commit/e7bd3f827916a3716b4b1427cdd7508893717cda) Thanks [@medelman17](https://github.com/medelman17)! - fix: Massachusetts `G.L. c.` spacing variants, `sec.` connector, chapter-only, and spelled-out `General Laws` (#364)

  A 50-opinion Massachusetts sample showed 15+ misses dominated by
  the bare `G.L. c.` form — the canonical Massachusetts court style
  since 1932. The `mass-chapter` pattern only matched the strict
  `G.L. c. NNN, § NN` form, missing the common variants:

  - `G.L.c. NNN` (no space between `G.L.` and `c.`)
  - `G. L. c. NNN` (spaced abbreviation)
  - `G.L. c. NNN, sec. NN` (`sec.` instead of `§`)
  - `G.L. c. NNN` (chapter-only, no section)
  - `General Laws c. NNN, § NN` (spelled-out without `Mass.`)

  Beyond losing the statutory citation, the unrecognized text spilled
  forward and corrupted case-name extraction for the **next**
  citation (`G.L.c. 93A. Begelfer v. Najarian` →
  `caseName="G.L.c. 93A. Begelfer v. Najarian"`).

  ### Fixes

  Two regexes updated in tandem — the `mass-chapter` tokenizer
  pattern in `src/patterns/statutePatterns.ts` and the mirroring
  `MASS_CHAPTER_RE` in `src/extract/statutes/extractNamedCode.ts`:

  1. Spacing between corpus prefix and `c.` made optional
     (`\s+(?:ch\.?|c\.?)` → `\s*(?:ch\.?|c\.?)`) so `G.L.c.`
     matches.
  2. Section connector accepts `§` / `§§` / `sec.` / `Sec.` /
     `section` / `Section` alongside the canonical `§`.
  3. Section portion now optional (chapter-only citations like
     `G.L. c. 93A` are valid by themselves and need to extract
     so the unrecognized text doesn't pollute the next citation's
     case-name).
  4. Corpus alternation extended with `General Laws` (spelled-out
     without the `Mass.` prefix — common in Massachusetts
     opinions which omit the home-state qualifier).

  The extractor in `extractNamedCode.ts` defaults the section body
  to empty string when missing — `code` (chapter), `jurisdiction:
"MA"`, and `section: ""` for chapter-only citations.

  ### Scope notes

  The following pieces of #364 are intentionally deferred:

  - **`St. YYYY, c. NNN, § N`** session laws (Acts/Statutes of
    Massachusetts) — pending unified `sessionLaw` citation type.
  - **`NNN CMR § N.NN`** (Code of Massachusetts Regulations) —
    administrative regulations broadly deferred per #320.
  - **`§ N.NN`** short-form regulation follow-on — short-form
    citation problem, not extraction.

  ### Tests

  7 new tests under `Massachusetts G.L. c. spacing/sec./chapter-only
variants (#364)` in `tests/extract/extractStatute.test.ts`:

  - `G.L. c. 268A, sec. 25` (sec. connector)
  - `G.L.c. 93A` (no space)
  - `G. L. c. 93A` (spaced abbreviation, chapter-only)
  - `G.L.c. 90, §34M`
  - `G.L.c. 272, §99E(3)` (with subsection)
  - `General Laws c. 94C, § 32A(a)` (spelled-out)
  - Regression: `Mass. Gen. Laws c. 93A, § 2`

  Full 2620-test suite passes; no regressions.

- [#383](https://github.com/medelman17/eyecite-ts/pull/383) [`e1f392b`](https://github.com/medelman17/eyecite-ts/commit/e1f392bc0b832473a71c20358ea597052c8d02eb) Thanks [@medelman17](https://github.com/medelman17)! - fix: Kansas `K.S.A. YYYY Supp.` year-edition mis-parse + comma-section format (#367)

  A 43-opinion Kansas sweep showed the same mis-parse 30+ times:
  every `K.S.A. YYYY Supp. NN-NNN` cite had the year mis-captured as
  the section number, silently substituting (e.g.) `2009` for the
  actual section `44-501(d)(2)`. Separately, Kansas's
  comma-section format `NN-N,NNN` (e.g. `K.S.A. 23-9,101`) was being
  truncated at the comma, dropping `,101`.

  ### Fixes

  - **Year-edition pattern**: new `ksa-year-edition` tokenizer
    pattern + dedicated `extractKsaYearEdition` extractor. Captures
    `K.S.A. 2009 Supp. 44-501(d)(2)` as `code: "K.S.A."`,
    `year: 2009`, `editionLabel: "Supp."`, `section: "44-501"`,
    `subsection: "(d)(2)"`. The `Supp.` marker is optional —
    bound-volume cites (`K.S.A. YYYY NN-NNN` without `Supp.`) also
    match. Listed BEFORE `abbreviated-code` so this shape wins.

  - **Comma-section format**: the universal section-body regex (in
    `buildAbbreviatedCodeRegex` and `ABBREVIATED_RE`) now accepts
    `,(?=\d)` — comma followed by digit — alongside the existing
    alphanumeric/colon/slash/hyphen character class. So `K.S.A.
23-9,101` parses as `section: "23-9,101"` rather than
    truncating to `"23-9"`. The lookahead guard prevents a sentence
    comma from being absorbed.

  ### Behavior changes

  - `K.S.A. 2009 Supp. 44-501(d)(2)` → `section="44-501"`,
    `year=2009`, `editionLabel="Supp."` (was: `section="2009"`,
    everything else dropped)
  - `K.S.A. 23-9,101` → `section="23-9,101"` (was: `"23-9"`)
  - `K.S.A. 44-501` → unchanged

  ### Scope notes

  The following pieces of #367 are intentionally deferred:

  - **Kansas session laws** (`L. 1985, ch. 176, § 2`) — deferred
    alongside the other session-law formats (`Ga. L.`, `Stats.`,
    `Laws of Florida`, `Ind. Acts`, `PA YYYY`, `Sess. L.`) pending a
    unified `sessionLaw` citation type.

  ### Tests

  5 new tests under `Kansas K.S.A. year-edition + comma-section
(#367)` in `tests/extract/extractStatute.test.ts`:

  - `K.S.A. 2009 Supp. 44-501(d)(2)` (year-edition + subsection)
  - `K.S.A. 1988 Supp. 44-556` (year-edition without subsection)
  - `K.S.A. 23-9,101` (comma-section)
  - `K.S.A. 23-9,316`
  - Regression: bare `K.S.A. 44-501`

  Full 2608-test suite passes; no regressions.

  ### Related

  Year-edition is sibling to Minnesota `Minn. St. YYYY, § N` (#371
  landed), Colorado `C.R.S. 1963` (#352 landed), and Nebraska
  `R.R.S. 1943, Reissue YYYY` (#373 landed). The comma-section
  character-class change is universal but Kansas-driven: no other
  state uses the `NN-N,NNN` form so the impact is bounded.

- [#384](https://github.com/medelman17/eyecite-ts/pull/384) [`b627091`](https://github.com/medelman17/eyecite-ts/commit/b627091ae7de0a40cba100c708ba06ab8619a239) Thanks [@medelman17](https://github.com/medelman17)! - feat: Maryland article-letter codes (`HG § 19-906`, `CP § 10-105`, `R.P. § 8-211`, ...) (#368)

  Maryland reorganized its statutory code in 2002 into ~30 named
  articles, each cited by a 2- or 3-letter prefix (`HG` for
  Health-General, `CP` for Criminal Procedure, `R.P.` for Real
  Property, etc.). This is the dominant Maryland court style for
  every modern Maryland appellate opinion. A 38-opinion Maryland
  sweep showed 25+ Maryland statute misses, dominated by these
  article-letter forms — none were extracted.

  ### Fix

  New `md-article-letter` tokenizer pattern in
  `src/patterns/statutePatterns.ts` + dedicated
  `extractMdArticleLetter` extractor at
  `src/extract/statutes/extractMdArticleLetter.ts`. The letter
  prefixes are a closed enumeration matching the published
  Maryland-Code article list:

  ```
  AB AG BO BR CJ CL CP CR CS EC ED EL EN ET FI FL GP HG HO HS
  HU IN LE LG LU NR PS PUC R.P. RP SF SG TA TG TP TR
  ```

  Both dotted (`R.P.`) and dotless (`RP`) variants of Real Property
  are accepted. The mandatory `§` connector disambiguates the
  letter prefix from ordinary prose tokens that happen to appear at
  sentence-initial position. Emits `code: <surface form>`,
  `jurisdiction: "MD"`, `section`, `subsection` (preserves the
  deep-subsection chains common in Maryland statutes:
  `CP § 10-105(e)(4)(ii)(2)`).

  ### Scope notes

  The following pieces of #368 are intentionally deferred:

  - **Long-form Bluebook** (`Md. Code Ann., Health-Gen. § 19-906`)
    — the existing `named-code` regex breaks on the hyphen in
    `Health-Gen.`; a one-character regex change there is sufficient
    but deferred to a follow-up PR.
  - **Pre-2002 numbered articles** (`Article 27, § 36`,
    `Article 101, § 56(e)`) — requires a different pattern; some
    collision risk with `Article` in other prose contexts.
  - **Postfix prose** (`Section X of the Y Article`) — requires
    enumerating the article-name forms.
  - **Maryland session laws** (`1987 Md. Laws, ch. 670`,
    `2001 Md. Laws, Chap. 10, § 2`) — pending unified
    `sessionLaw` type.

  ### Tests

  6 new tests under `Maryland article-letter codes (#368)` in
  `tests/extract/extractStatute.test.ts`:

  - `HG § 19-906` (Health-General)
  - `CP § 10-105(e)(4)(ii)(2)` (deep-subsection chain)
  - `R.P. § 8-211` (dotted variant)
  - `BR § 1-101` (Business Regulation)
  - `FL § 5-1027` (Family Law — doesn't collide with Florida)
  - Regression: `Fla. Stat. § 119.07` continues to route to Florida

  Full 2614-test suite passes; no regressions.

  ### Related

  The Maryland article-letter code system is unique among U.S.
  states — no other jurisdiction uses 2-letter prefixes as the
  bare citation form. The pattern complements the existing
  `named-code` family that handles `N.Y. Penal Law § N`,
  `Cal. Civ. Code § N`, etc.

- [#375](https://github.com/medelman17/eyecite-ts/pull/375) [`945fd11`](https://github.com/medelman17/eyecite-ts/commit/945fd1105b469d3fc70ae8b40bde751441a471cb) Thanks [@medelman17](https://github.com/medelman17)! - fix: Michigan `MSA` no longer mis-classified as Minnesota; bracket-subscript sections (`MSA 23.710[252]`) preserved (#370)

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

- [#379](https://github.com/medelman17/eyecite-ts/pull/379) [`7f6965c`](https://github.com/medelman17/eyecite-ts/commit/7f6965c4d3c4d3daa51ac3faf1c21c54e22f12d5) Thanks [@medelman17](https://github.com/medelman17)! - feat: Minnesota `Minn. St.` short form, year-edition (`Minn. St. YYYY, § N`), and spelled-out `Minnesota Statutes` extraction (#371)

  A 35-opinion Minnesota sweep produced 30+ Minnesota statute misses.
  `Minn. St.` (without the `at`) is the canonical Minnesota court style
  — distinct from the federal Bluebook's `Minn. Stat.` Modern Minnesota
  opinions and pre-1980 historical opinions use the year-edition form
  `Minn. St. 1971, § 176.66` to indicate which compilation was in
  effect at the time of the events.

  ### Fixes

  - **Modern `Minn. St. N.NN`**: Minnesota regex fragment in
    `src/data/stateStatutes.ts` extended to accept `Minn. St.` (short
    form) alongside `Minn. Stat.` (Bluebook). The abbreviations array
    adds `Minn. St.` so the canonical `code` field preserves the
    surface form when extracted.

  - **Spelled-out `Minnesota Statutes`**: fragment also matches the
    spelled-out short title plus optional `Ann.` / `Annotated`
    trailer. Pairs with the universal optional-comma + word "Section"
    connector (added in #348/#360) to handle prose forms like
    `Minnesota Statutes, Section 120.10`.

  - **Year-edition `Minn. St. YYYY, § N`**: new `minn-st-year-edition`
    tokenizer pattern (listed BEFORE `abbreviated-code` so it wins for
    the year-edition shape) routed to dedicated extractor
    `extractMinnStYearEdition`. Captures the edition year (1971 /
    1974 / 1967 / etc.) into the `year` field and the actual section
    into `section`. Emits `code: "Minn. Stat."` (normalized canonical).
    The `, § N` separator is REQUIRED so we don't false-positive on
    bare years that happen to follow `Minn. St.`

  ### Behavior changes

  - `Minn. St. 48.30` → `code="Minn. St."`, `jurisdiction="MN"`,
    `section="48.30"` (was: not extracted)
  - `Minn. St. 1971, § 176.66` → `code="Minn. Stat."`, `year=1971`,
    `section="176.66"`, `jurisdiction="MN"` (was: section
    mis-captured as "1971" by abbreviated-code, then not extracted at
    all since `Minn. St.` wasn't in the fragment)
  - `Minnesota Statutes, Section 120.10` → `code="Minnesota Statutes"`,
    `section="120.10"`, `jurisdiction="MN"` (was: not extracted)
  - `Minn. Stat. § 480A.06` continues to work (Bluebook form
    unchanged)

  ### Scope notes

  The following pieces of #371 are intentionally deferred:

  - **Subdivision parsing** (`, subd. 5`, `subds. 1 and 2`,
    `Subdivision 2`): the section extracts correctly but the trailing
    `subd.` text is dropped. Requires either a `subdivision` field on
    `StatuteCitation` or an extension to the subsection chain
    grammar.
  - **Laws of Minnesota session laws** (`L. 1969, c. 570`): deferred
    alongside the other session-law formats (`Ga. L.`, `Stats.`,
    `Laws of Florida`, `Ind. Acts`, `PA YYYY`) pending a unified
    `sessionLaw` citation type.

  ### Tests

  6 new tests under `Minnesota \`Minn. St.\` short form and
  year-edition (#371)`in`tests/extract/extractStatute.test.ts`:

  - Modern `Minn. St. 48.30`
  - Criminal `Minn. St. 609.035`
  - Year-edition `Minn. St. 1971, § 176.66`
  - Year-edition with subsection `Minn. St. 1974, § 80A.14(n)`
  - Spelled-out `Minnesota Statutes, Section 120.10`
  - Regression: Bluebook `Minn. Stat. § 480A.06`

  Full 2596-test suite passes; no regressions.

  ### Related

  Year-edition form is sibling to Colorado `C.R.S. 1963` (#352
  landed), Indiana `IC 1971` (#363 deferred), Kansas `K.S.A. Supp.
YYYY` (#367 deferred), and Stat Ann year-edition (#370 deferred).
  Each state with a year-edition variant needs its own tokenizer
  pattern because the year semantics differ: Colorado names the
  compilation year in the abbreviation (`C.R.S. 1963` is the
  compilation, not an edition of `C.R.S.`); Minnesota uses the
  year-edition to mark which compilation was in force when the events
  occurred (more like a parenthetical edition than a code-name
  component).

- [#380](https://github.com/medelman17/eyecite-ts/pull/380) [`478fdce`](https://github.com/medelman17/eyecite-ts/commit/478fdce8d298f7d41bf98c654cfc17b335e4d23d) Thanks [@medelman17](https://github.com/medelman17)! - feat: Montana Code Annotated postfix form (`§ N, MCA`) and edition-year parentheticals (#372)

  Montana's canonical court style places the section before the code
  name, with the code name `MCA` after a comma — same shape as
  Florida's `§ N, Florida Statutes` and Idaho's `§ N, Idaho Code`. A
  22-opinion Montana sweep produced 30+ MCA misses; every modern
  Montana Supreme Court opinion uses this form.

  ### Fix

  New `mca-postfix` tokenizer pattern in `src/patterns/statutePatterns.ts`
  and dedicated `extractMcaPostfix` extractor at
  `src/extract/statutes/extractMcaPostfix.ts`. Listed BEFORE
  `abbreviated-code` so the container-shape wins span dedup. Emits
  `code: "MCA"`, `jurisdiction: "MT"`, `section`, and optional
  `subsection`.

  The trailing edition-year parenthetical (`MCA (1983)`) is attached
  by the generic year-paren absorber in `extractCitations.ts` — no
  extractor change needed.

  ### Scope notes

  The following pieces of #372 are intentionally deferred:

  - **Abbreviated section continuation** (`§61-4-205 and -206, MCA`)
    — the second section `-206` carries forward title/article from
    the first (`61-4-`); deferred alongside the other multi-section
    patterns.
  - **Multi-section lists** in general — same deferral.

  ### Tests

  5 new tests under `Montana Code Annotated postfix form (#372)` in
  `tests/extract/extractStatute.test.ts`:

  - `§ 77-6-205(2), MCA`
  - `Section 40-4-121(7)(a), MCA` (word "section")
  - `§ 39-71-703, MCA (1983)` (edition year)
  - Regression: `Mont. Code Ann. § 77-6-205`
  - Regression: `MCA § 77-6-205`

  Full 2597-test suite passes; no regressions.

  ### Related

  Third state-postfix pattern after Florida (#356) and Idaho (#360).
  The pattern shape is now reusable: every state with a postfix
  citation style follows the same template.

- [#381](https://github.com/medelman17/eyecite-ts/pull/381) [`e30ffe9`](https://github.com/medelman17/eyecite-ts/commit/e30ffe995f14c15773c85f7c8a87eaadac0039c7) Thanks [@medelman17](https://github.com/medelman17)! - feat: Nebraska R.R.S. 1943 historical form + `Reissue YYYY` edition label (#373)

  A 23-opinion Nebraska sweep produced 15+ Nebraska statute misses.
  The modern `Neb. Rev. Stat. § N-NNNN` form worked, but two pieces
  were broken:

  1. The historical `R.R.S. 1943` form (Reissue Revised Statutes of
     Nebraska, 1943) was completely unrecognized — Nebraska compiled
     its statutes in 1943 and re-issues volumes on a rolling basis, so
     pre-1990 Nebraska opinions cite this form heavily and modern
     opinions still cite it when referencing statutory history.
  2. The Nebraska-specific `(Reissue YYYY)` parenthetical was being
     captured as a `year` but not labeled — it should populate
     `editionLabel: "Reissue"` alongside the year (parallel to the
     `Repl.` / `Supp.` / `Cum. Supp.` labels added in #349).

  ### Fixes

  - **R.R.S. 1943 pattern**: new `rrs-1943` tokenizer pattern in
    `src/patterns/statutePatterns.ts` + dedicated `extractRrs1943`
    extractor. Handles `section 38-901, R. R. S. 1943` (no Reissue)
    and `§ 30-2806, R. R. S. 1943, Reissue 1975` (with Reissue).
    Accepts inter-letter spacing in `R.R.S.` (common OCR variant).
    Emits `code: "R.R.S. 1943"`, `jurisdiction: "NE"`, `section`,
    and — when present — `year` (the Reissue year) plus
    `editionLabel: "Reissue"`.

  - **Reissue edition label**: `EDITION_LABEL_REGEX` in
    `extractCitations.ts` extended to recognize `Reissue` as an
    edition label (joining `Repl.`, `Supp.`, `Cum. Supp.`). The
    generic year-paren absorber now correctly routes
    `Neb. Rev. Stat. § 71-5016 (Reissue 2003)` to
    `editionLabel: "Reissue"`, `year: 2003`.

  ### Scope notes

  The following pieces of #373 are intentionally deferred:

  - **Section ranges** (`§§ 71-5016 to 71-5041 (Reissue 2003)`) —
    multi-section deferred across all states.
  - **Bare-section follow-on with Cum. Supp.** (`43-253 (Cum. Supp.
2002)`) — this is a short-form citation problem (resolves to the
    parent full-form citation), not an extraction problem.

  ### Tests

  4 new tests under `Nebraska R.R.S. 1943 + Reissue edition label
(#373)` in `tests/extract/extractStatute.test.ts`:

  - `section 38-901, R. R. S. 1943` (no Reissue)
  - `§ 30-2806, R. R. S. 1943, Reissue 1975` (with Reissue year)
  - `Neb. Rev. Stat. § 71-5016 (Reissue 2003)` (Reissue paren)
  - Regression: bare modern `Neb. Rev. Stat. § 71-5016`

  Full 2603-test suite passes; no regressions.

  ### Related

  Companion to #330 (pre-1993 Illinois Revised Statutes), #343 (Code
  of Alabama 1940), and #359 (Revised Laws of Hawaii pre-1955) —
  historical state-statute compilations that remain in active
  citation. The Reissue edition label joins the family established
  by #349 (Arkansas `Repl.` / `Supp.` / `Cum. Supp.`).

- [#390](https://github.com/medelman17/eyecite-ts/pull/390) [`2dcb622`](https://github.com/medelman17/eyecite-ts/commit/2dcb622515b36ccc7cfb99c34f19abc899348317) Thanks [@medelman17](https://github.com/medelman17)! - fix: `I.R.C. § N` (Internal Revenue Code) no longer mis-classified as Ohio Revised Code (#376)

  A 37-opinion New Jersey sweep showed 14 out of 14 (100%) `I.R.C.`
  citations mis-routed to Ohio: the regex engine matched Ohio's
  `R\.?C\.?` fragment starting at the second character of `I.R.C.`,
  silently producing `code: "R.C.", jurisdiction: "OH"` and
  truncating the federal IRC reference. Every federal-tax statutory
  citation in the corpus was lost.

  ### Fix

  New `irc` tokenizer pattern in `src/patterns/statutePatterns.ts`

  - dedicated `extractIrc` extractor at
    `src/extract/statutes/extractIrc.ts`. Matches both the dotted
    `I.R.C.` and dotless `IRC` forms. Listed BEFORE
    `abbreviated-code` so the longer `I.R.C.` match wins span dedup
    over Ohio's `R.C.` match at the same position. Output:
    `code: "I.R.C."`, `jurisdiction: "US"`, `section`, `subsection`.
    Dotless `IRC` is also normalized to canonical `"I.R.C."`.

  ### Behavior changes

  - `I.R.C. § 1367` → `code="I.R.C."`, `jurisdiction="US"` (was:
    `code="R.C."`, `jurisdiction="OH"`)
  - `I.R.C. § 1366(a)(1)` → with subsection
  - `IRC § 1341` → `code="I.R.C."` (normalized)
  - Ohio `Ohio Rev. Code Ann. § 2925.03` → unchanged
  - Ohio `R.C. § 2925.03` → unchanged

  ### Scope notes

  The following pieces of #376 are intentionally deferred:

  - **Prose `§ N et seq. of the Internal Revenue Code`** —
    prose-form IRC references; needs a different pattern.
  - **N.J.S.A. colon-shorthand** (`N.J.S.A. 54A:9-8(c) and :8-7`
    — `:8-7` is title-carry-forward shorthand) — same family as
    Montana `-206` form, deferred with multi-section work.

  ### Tests

  5 new tests under `Internal Revenue Code I.R.C. — federal, not
Ohio (#376)` in `tests/extract/extractStatute.test.ts`:

  - `I.R.C. § 1367`
  - `I.R.C. § 1366(a)(1)` with subsection
  - Bare `IRC § 1341` (normalized to I.R.C.)
  - Regression: `Ohio Rev. Code Ann. § 2925.03`
  - Regression: `R.C. § 2925.03`

  Full 2636-test suite passes; no regressions.

  ### Related

  Same family of jurisdiction-routing bugs as #370 (Michigan MSA
  → Minnesota) and #360 (Idaho I.C. → Indiana) — when a longer
  abbreviation contains a shorter state-code abbreviation as a
  suffix, the regex engine matches the shorter pattern at the
  wrong position. The fix pattern (longer-match wins via container
  shape + span dedup) is now established across these three
  state-pair mis-classifications.

- [#391](https://github.com/medelman17/eyecite-ts/pull/391) [`ef8ef80`](https://github.com/medelman17/eyecite-ts/commit/ef8ef807e50adf0dd7a002e9dd96934b168879a1) Thanks [@medelman17](https://github.com/medelman17)! - feat: New Hampshire `RSA chapter NNN-X` and `RSA ch. NNN-X` chapter-only form (#378)

  NH uniquely cites the chapter number alone as a complete citation:
  `RSA chapter 169-D`, `RSA ch. 458-C`, `RSA [chapter] 173-B`. The
  colon-section form `RSA 511:2` was already handled by the
  `abbreviated-code` family, but the chapter-only variants were
  completely unrecognized.

  ### Fix

  New `rsa-chapter` tokenizer pattern in
  `src/patterns/statutePatterns.ts` + dedicated `extractRsaChapter`
  extractor at `src/extract/statutes/extractRsaChapter.ts`. Handles:

  - `RSA chapter 169-D` (spelled `chapter`)
  - `RSA ch. 458-C` (abbreviated `ch.`)
  - `RSA [chapter] 173-B` (bracketed-chapter typographical
    convention used by some NH opinions)

  Emits `code: "RSA"`, `jurisdiction: "NH"`, with the chapter
  identifier in `section` (NH treats the chapter as the citation's
  identifier when no individual subsection is pin-cited).

  ### Scope notes

  The following pieces of #378 are intentionally deferred:

  - **Roman-numeral subsections** (`RSA 511:2, XIX`) — the trailing
    `, XIX` is dropped; preserving it requires a different
    subsection-grammar handling.
  - **Edition parentheticals** (`RSA chapter 458 (Supp. 2000)`,
    `RSA chapter 165 (1977 and Supp. 1983)`) — single `Supp.` is
    attached by the existing year-paren absorber; multi-edition
    parentheticals (`(1977 and Supp. 1983)`) require additional
    parsing.
  - **Session laws** (`Laws 1979, 377:1`, `Laws 2011, 268:4`) —
    pending unified `sessionLaw` citation type.

  ### Tests

  6 new tests under `New Hampshire RSA chapter form (#378)` in
  `tests/extract/extractStatute.test.ts`:

  - `RSA chapter 169-D`
  - `RSA chapter 597`
  - `RSA ch. 458-C` (abbreviated)
  - `RSA [chapter] 173-B` (bracketed)
  - Regression: colon-section `RSA 511:2`
  - Regression: full Bluebook `N.H. Rev. Stat. Ann. § 511:2`

  Full 2642-test suite passes; no regressions.

  ### Related

  NH is the only state whose primary citation form is
  chapter-only (the chapter number functions as a complete
  identifier — there's no implicit "section 1" assumption). This
  makes the pattern simple and unambiguous: the `RSA` prefix is
  distinctively NH.

- [#394](https://github.com/medelman17/eyecite-ts/pull/394) [`aae0aeb`](https://github.com/medelman17/eyecite-ts/commit/aae0aebb3b26d72fdbc65b8ed0f14bc49e245a87) Thanks [@medelman17](https://github.com/medelman17)! - feat: New Mexico bare-section form `Section 32A-2-7(A)` / `§ 41-2-2` (#382)

  NM opinions cite NMSA 1978 sections in a distinctive bare form
  without the code abbreviation — the three-hyphen section format
  (`\d[A-Z]?-\d[A-Z]?-\d[A-Z]?`) is unique among state codes and
  serves as the disambiguator. A 50-opinion NM sweep produced
  dozens of misses on these forms.

  ### Fix

  New `nm-bare-section` tokenizer pattern in
  `src/patterns/statutePatterns.ts` + dedicated
  `extractNmBareSection` extractor at
  `src/extract/statutes/extractNmBareSection.ts`. Matches both
  `§ 41-2-2` (symbol form) and `Section 32A-2-7(A)` (spelled-out
  form). Listed AFTER `abbreviated-code` so that a full
  `NMSA 1978, § 41-2-2` citation isn't double-counted (the
  abbreviated-code container would otherwise tie with this
  contained pattern, leaving a duplicate cite at the inner span).

  Uses `(?<![A-Za-z])` lookbehind anchor instead of `\b` because
  the pattern can start at `§` (non-word char where `\b` doesn't
  apply).

  Emits `code: "NMSA 1978"`, `jurisdiction: "NM"`, `section` with
  the three-hyphen body, and `subsection` for any trailing
  parenthetical (`(A)`, `(B)`, `(1)`).

  ### Scope notes

  The following pieces of #382 are intentionally deferred:

  - **NMRA rule citations** (`Rule 16-110(C) NMRA`) — rule
    citations broadly deferred per #295.
  - **Public Law form** (`Public Law 567`) — used in NM opinions
    for federal statutes; separate `publicLaw` family.

  ### Tests

  5 new tests under `New Mexico bare-section form (#382)` in
  `tests/extract/extractStatute.test.ts`:

  - `Section 32A-2-7(A)` (letter-prefix first part)
  - `Section 22-10A-27(B)` (letter-prefix middle part)
  - `§ 41-2-2` (symbol form, no subsection)
  - Regression: `NMSA 1978, § 41-2-2` produces exactly one
    citation (no duplicate from the contained inner span)
  - Regression: Maryland `CP § 10-105(e)` (two-hyphen) doesn't
    collide — the three-hyphen requirement keeps the patterns
    disjoint

  Full 2649-test suite passes; no regressions.

- [#399](https://github.com/medelman17/eyecite-ts/pull/399) [`3c5793b`](https://github.com/medelman17/eyecite-ts/commit/3c5793be0177052e26b28ce5138766e9660d0e9c) Thanks [@medelman17](https://github.com/medelman17)! - feat: New York bare named-code form `Penal Law § N`, `Labor Law § N [3]` (#386)

  NY opinions omit the `N.Y.` prefix when citing their own state's
  codes — `Penal Law § 130.52` rather than `N.Y. Penal Law §
130.52`. The disambiguator is the word `Law` after the code name
  (other states use `Code`). NY also uses **bracket-subdivision**
  form `[1]`, `[3-a]`, `[a]`, `[iv]` interchangeably with the
  canonical paren form `(1)`. Both were unrecognized.

  ### Fix

  New `ny-bare-named-code` tokenizer pattern + dedicated
  `extractNyBareLaw` extractor. Listed AFTER `named-code` so the
  longer `N.Y. <Law> § N` form wins span dedup when the prefix is
  present. The enumerated list of NY law names is closed; matching
  is restricted to known NY codes so the false-positive risk is
  bounded.

  Section body accepts both `(...)` and `[...]` trailing groups,
  so `Penal Law § 130.00 [3]` and `Labor Law § 220 [3-a]` parse
  with the bracket subdivision in `subsection`.

  Emits `code: "<Name> Law"` (e.g., `"Penal Law"`),
  `jurisdiction: "NY"`.

  Supported NY law names: Penal, Labor, Real Property, General
  Business, General Obligations, General Municipal, Municipal
  Home Rule, Criminal Procedure, Insurance, Executive, Judiciary,
  Civil Practice, Civil Rights, Education, Public Health, Banking,
  Domestic Relations, Environmental Conservation, Election, Social
  Services, Estates Powers and Trusts, Vehicle and Traffic,
  Surrogate's Court Procedure, Family Court, Court of Claims,
  Workers' Compensation, Highway, Tax, Personal Property.

  ### Scope notes

  The following pieces of #386 are intentionally deferred:

  - **CPLR / SCPA / N-PCL bare forms** (`CPLR 5601 (a)`, `SCPA
1803`, `N-PCL 1411 [a]`) — these don't follow the `<Name>
Law` pattern; need their own bare patterns.
  - **`CPLR article 78`** — article-based citation, separate
    parse.
  - **`L YYYY, ch NNN` session laws** — pending unified
    `sessionLaw` citation type.
  - **Town Code / municipal codes** — broadly out of scope.

  ### Tests

  5 new tests under `New York bare named-code + bracket
subdivisions (#386)` in `tests/extract/extractStatute.test.ts`:

  - Bare `Penal Law § 130.52`
  - `Penal Law § 130.00 [3]` (bracket subdivision)
  - `Labor Law § 220 [3-a]` (bracket with hyphen-letter)
  - `General Municipal Law § 874`
  - Regression: `N.Y. Penal Law § 130.52` (no duplicate)

  Full 2665-test suite passes; no regressions.

  ### Related

  Companion to issue #12 (state bare-statute) for the NY laws
  that are commonly cited without prefix. The bracket-subdivision
  fix builds on the bracket-section work in #370 (MSA
  `23.710[252]`) — brackets are now accepted in three contexts:
  abbreviated-code section body, parseBody subsection chain, and
  NY named-code section body.

- [#396](https://github.com/medelman17/eyecite-ts/pull/396) [`218eadb`](https://github.com/medelman17/eyecite-ts/commit/218eadb04dadef42a8fad3481fe9e6e49cf5fa34) Thanks [@medelman17](https://github.com/medelman17)! - feat: Oregon `ORS chapter NN` chapter-only form (#387)

  The modern `ORS NNN.NNN` section form was already handled by
  `abbreviated-code`, but the chapter-only reference `ORS chapter
34` (treating the chapter number as a complete citation, like NH
  RSA and OH R.C.) was unrecognized.

  ### Fix

  New `ors-chapter` tokenizer pattern + dedicated
  `extractOrsChapter` extractor. Emits `code: "ORS"`,
  `jurisdiction: "OR"`, with the chapter ID in `section` (matching
  the convention from NH `rsa-chapter` #378 and OH `oh-chapter`
  #388).

  ### Scope notes

  The following pieces of #387 are intentionally deferred:

  - **Oregon Laws session laws** (`Or Laws 2013, ch 25, § 1`,
    `Oregon Laws 1981, chapter 784`) — pending unified
    `sessionLaw` citation type.
  - **Oregon municipal codes** (`Cornelius City Code section
10.40.030`, `CCC section 10.40.030`) — municipal codes
    broadly out of scope.

  ### Tests

  2 new tests under `Oregon ORS chapter-only form (#387)` in
  `tests/extract/extractStatute.test.ts`:

  - `ORS chapter 34` (chapter-only)
  - Regression: `ORS 131.315(7)` (modern form)

  Full 2662-test suite passes; no regressions.

  ### Related

  Third chapter-only state pattern after NH `rsa-chapter` (#378)
  and OH `oh-chapter` (#388). The shape is becoming a reusable
  template for states whose statute compilations support
  chapter-level references.

- [#395](https://github.com/medelman17/eyecite-ts/pull/395) [`4bc5430`](https://github.com/medelman17/eyecite-ts/commit/4bc5430da1f909928cf5ffeab7a0d35a7b128a00) Thanks [@medelman17](https://github.com/medelman17)! - fix: Ohio `R. C.` (spaced) and `R.C. Chapter N` (chapter-only) forms (#388)

  Ohio's canonical statutory abbreviation is `R.C.` (Revised Code),
  but the spelled-out form `R. C.` with a space between `R.` and
  `C.` is the dominant form in court-published Ohio opinions — more
  common than the no-space `R.C.` variant. eyecite-ts didn't
  recognize the spaced form, and the `R. C. Chapter NNNN`
  chapter-only variant was also missing for both spacings.

  ### Fixes

  - **Spaced `R. C.`**: Ohio regex fragment in
    `src/data/stateStatutes.ts` now admits inter-letter spacing
    (`R\.?\s*C\.?` instead of `R\.?C\.?`). The federal Internal
    Revenue Code (`I.R.C.`, #376) has its own dedicated pattern
    with higher priority, so the `I.` prefix won't trigger Ohio.
  - **Canonical normalization**: Ohio's abbreviations array was
    reordered so `R.C.` (Bluebook standard, with dots) is the last
    element and becomes the canonical short form. Spaced variants
    (`R. C.`, `R . C .`) and dotless variants (`RC`) all resolve
    to `R.C.` via the stripped-form fallback.
  - **Chapter form**: new `oh-chapter` tokenizer pattern +
    dedicated `extractOhChapter` extractor handles both spacings
    of `R.C. Chapter N` / `R. C. Chapter N`. The chapter
    identifier goes into the `section` field (matching the
    convention established by the NH `rsa-chapter` extractor for
    chapter-only citations).

  ### Behavior changes

  - `R. C. 713.15` → `code="R.C."`, `jurisdiction="OH"`,
    `section="713.15"` (was: not extracted)
  - `R. C. 5321.15(C)` → with subsection `(C)`
  - `R. C. Chapter 1702` → `section="1702"` (was: not extracted)
  - `R.C. Chapter 4509` → `section="4509"` (was: not extracted)
  - `R.C. 5302.20` → unchanged
  - `I.R.C. § 1367` → unchanged (still federal, not Ohio)

  ### Scope notes

  The following pieces of #388 are intentionally deferred:

  - **Prose form** (`section 120.33 of the Revised Code`) — needs
    a different pattern; multiple states have similar prose forms.

  ### Tests

  6 new tests under `Ohio R. C. spacing variant + R.C. Chapter
form (#388)` in `tests/extract/extractStatute.test.ts`:

  - Spaced `R. C. 713.15`
  - Spaced `R. C. 5321.15(C)` with subsection
  - Spaced chapter `R. C. Chapter 1702`
  - No-space chapter `R.C. Chapter 4509`
  - Regression: `R.C. 5302.20`
  - Regression: federal `I.R.C. § 1367` still routes to federal

  Full 2655-test suite passes; no regressions.

  ### Related

  Spacing-tolerance fix follows the pattern established by Arizona
  A.R.S. (#348), Arkansas (#349), Hawaii I.C. → Idaho (#360), and
  Indiana → Idaho disambiguation (#360). Chapter-only form mirrors
  NH `rsa-chapter` (#378).

- [#403](https://github.com/medelman17/eyecite-ts/pull/403) [`d213ecc`](https://github.com/medelman17/eyecite-ts/commit/d213eccf4eda12b32d24a4d8ddb450922c7a7a39) Thanks [@medelman17](https://github.com/medelman17)! - fix: Pennsylvania `P. S.` / `Pa. C. S.` (spaced) variants normalize to canonical forms (#392)

  Pennsylvania court opinions interchange `P.S.` / `P. S.` (Purdon's
  Statutes) and `Pa.C.S.` / `Pa. C. S.` / `Pa. C.S.` (Consolidated
  Statutes) freely. The spaced variants were unrecognized.

  ### Fix

  - **Pennsylvania consolidated** (Pa.C.S.) fragment relaxed from
    `Pa\.?\s*C\.?S\.?A?\.?` to `Pa\.?\s*C\.?\s*S\.?\s*A?\.?`,
    allowing inter-letter whitespace.
  - **Pennsylvania unconsolidated** (P.S.) fragment relaxed from
    `P\.?S\.?` to `P\.?\s*S\.?`.
  - **Canonical reordering**: abbreviations arrays reordered so
    Bluebook canonical forms (`Pa.C.S.`, `P.S.`) are the last
    elements. Spaced and dotless variants normalize to them via
    the stripped-form fallback.

  ### Behavior changes

  - `75 P. S. § 1037` → `code="P.S."`, `title=75`,
    `section="1037"` (was: not extracted)
  - `42 Pa. C. S. § 7341` → `code="Pa.C.S."` (was: not extracted)
  - `40 P.S. § 991.1801`, `42 Pa.C.S. § 7341` → unchanged

  ### Scope notes

  The following pieces of #392 are intentionally deferred:

  - **`Act of [Date], P.L. NNN, No. NNN, § N` session laws** —
    pending unified `sessionLaw` citation type.
  - **Named-act references** (`Section 7(1) of the Wills Act of
1947`, `Section 319 of the Workmen's Compensation Act`) —
    prose form; matches named-act registry rather than abbreviated
    code.
  - **OCR variant** (`77 P:S. §671` — colon for period) — OCR
    cleanup belongs upstream.

  ### Tests

  4 new tests under `Pennsylvania P.S. / Pa.C.S. spacing variants
(#392)` in `tests/extract/extractStatute.test.ts`:

  - Spaced `75 P. S. § 1037` (canonicalized to P.S.)
  - Spaced `42 Pa. C. S. § 7341` (canonicalized to Pa.C.S.)
  - Regression: `40 P.S. § 991.1801`
  - Regression: `42 Pa.C.S. § 7341`

  Full 2689-test suite passes; no regressions.

  ### Related

  Spacing-tolerance fix is the fifth in this family: Arizona
  A.R.S. (#348), Ohio R.C. (#388), Tennessee T.C.A. (#398),
  South Carolina S.C. Code Ann. (#397), and now Pennsylvania
  P.S./Pa.C.S. Combined with the canonical reordering, the pattern
  established for these states is now used routinely.

- [#402](https://github.com/medelman17/eyecite-ts/pull/402) [`a0fef81`](https://github.com/medelman17/eyecite-ts/commit/a0fef81ae1e361c103ab34ccf0869868914bfb62) Thanks [@medelman17](https://github.com/medelman17)! - feat: Rhode Island General Laws 1956 `G.L. 1956 (1969 Reenactment) §N-N-N` (#393)

  RI uses `G.L. 1956` (General Laws of 1956) as its modern
  statutory code, with an optional `(YYYY Reenactment)`
  parenthetical indicating which reenactment volume was in
  effect. The `1956` literal year is the disambiguator from
  Massachusetts `G.L. c. NNN` (chapter form).

  ### Fix

  New `rigl-1956` tokenizer pattern + dedicated `extractRigl1956`
  extractor. Captures both the canonical full form
  (`G.L. 1956 (1969 Reenactment) §11-23-1`) and the simpler forms
  (`G.L. 1956 §N-N-N`, `G. L. 1956, §N-N-N`). The reenactment
  year goes into the `year` field and `editionLabel` is set to
  `"Reenactment"` when present.

  ### Scope notes

  The following pieces of #393 are intentionally deferred:

  - **Bare-section follow-ons** (`§45-32-22`, `§11-8-3`) —
    short-form citation problem, not extraction.
  - **Bare-section ranges** (`§§45-32-11 to 45-32-21`,
    `§§45-32-4 and 45-32-11`) — multi-section deferred across all
    states.
  - **`(YYYY Reenactment)` as bare parenthetical** after a
    bare-section follow-on — would need standalone-paren
    handling.
  - **`P.L. YYYY, ch. NNN` public laws** — pending unified
    `sessionLaw` citation type.
  - **OCR variant** (`§6A-9-307(l)` — `l` is misread `1`) —
    edge case; OCR cleanup belongs upstream.

  ### Tests

  5 new tests under `Rhode Island General Laws 1956 (#393)` in
  `tests/extract/extractStatute.test.ts`:

  - `G.L. 1956 (1969 Reenactment) §11-23-1` (full form)
  - `G. L. 1956 (1969 Reenactment) §9-21-2` (spaced)
  - `G. L. 1956, §10-7-1` (no reenactment paren)
  - `G.L. 1956 §11-23-1` (no comma, no reenactment)
  - Regression: Massachusetts `G.L. c. 93A` still routes to MA

  Full 2684-test suite passes; no regressions.

  ### Related

  The disambiguation pattern (year literal vs. chapter marker)
  follows the precedent established by Colorado `C.R.S. 1963`
  (#352), Alabama `Code 1940` (#343), Hawaii `RLH 1935` (#359),
  Nebraska `R.R.S. 1943` (#373). Every state with a 19xx-year
  compilation has its own pattern with the year embedded.

- [#401](https://github.com/medelman17/eyecite-ts/pull/401) [`12d45a4`](https://github.com/medelman17/eyecite-ts/commit/12d45a49dd5d6cd19717c512dc630d33b610abdd) Thanks [@medelman17](https://github.com/medelman17)! - fix: South Carolina `S.C.Code Ann.` (no space) routing + canonical normalization (#397)

  S.C. opinions interchange `S.C.Code Ann.` (no space between `S.C.`
  and `Code`) with `S.C. Code Ann.` (with space). The no-space form
  was unrecognized — and worse, the NM bare-section pattern (#382)
  was silently capturing the `§ N-N-N` suffix and mis-routing every
  no-space SC citation to **New Mexico** jurisdiction.

  ### Fix

  - **SC fragment**: `\s+` between `S.C.` and `Code` relaxed to
    `\s*` so the no-space form matches the SC container pattern.
    Once the container matches, span dedup correctly subsumes the
    NM bare-section pattern's contained match on `§ N-N-N`.
  - **Canonical `S.C. Code Ann.`**: SC abbreviations reordered so
    `S.C. Code Ann.` (Bluebook standard with `Ann.`) is the last
    element / canonical. The no-space `S.C.Code Ann.` form now
    normalizes to it via the stripped-form fallback.

  ### Behavior changes

  - `S.C.Code Ann. § 42-11-70 (1985)` → `code="S.C. Code Ann."`,
    `jurisdiction="SC"`, `year=1985` (was: mis-routed to NM)
  - `S.C.Code Ann. § 42-15-40 (Supp. 1998)` →
    `year=1998`, `editionLabel="Supp."` (Supp. label was already
    recognized from #349)
  - `S.C.Code Ann. section 38-53-100(D)` → SC (was: NM)
  - `S.C. Code § 20-8-130(B)(1)` → unchanged
  - `S.C. Code Ann. § 42-11-70` → unchanged
  - `Section 32A-2-7(A)` (bare NM form) → unchanged (still NM)

  ### Scope notes

  The following pieces of #397 are intentionally deferred:

  - **Postfix prose** (`section 20-3-130 of the South Carolina
Code`) — prose form needs a different pattern.
  - **Bare-section follow-ons** (`§ 38-77-160`,
    `section 38-77-142`) — short-form citation problem, not
    extraction.

  ### Tests

  6 new tests under `South Carolina S.C.Code Ann. spacing variants
(#397)` in `tests/extract/extractStatute.test.ts`:

  - `S.C.Code Ann. § 42-11-70 (1985)` (no-space, year paren)
  - `S.C.Code Ann. § 42-15-40 (Supp. 1998)` (Supp.
    editionLabel)
  - `S.C.Code Ann. section 38-53-100(D)` (word section)
  - Regression: `S.C. Code § 20-8-130(B)(1)` (spaced, no Ann.)
  - Regression: `S.C. Code Ann. § 42-11-70`
  - Regression: NM `Section 32A-2-7(A)` still routes to NM

  Full 2677-test suite passes; no regressions.

  ### Related

  The NM mis-routing problem demonstrates the importance of
  keeping container-shape patterns broad enough to match all
  state-style variants. The fix pattern (relax whitespace
  requirements in state fragments + reorder canonical
  abbreviations) follows the precedent established by Ohio (#388)
  and Tennessee (#398).

- [#400](https://github.com/medelman17/eyecite-ts/pull/400) [`68f17ce`](https://github.com/medelman17/eyecite-ts/commit/68f17cec7639ff32dda10b0cf166768b7d07c385) Thanks [@medelman17](https://github.com/medelman17)! - fix: Tennessee `T.C.A.` variants — `sec.` connector, postfix form, dotless `TCA` (#398)

  Tennessee opinions interchange every stylistic variant of the
  T.C.A. abbreviation. Most worked already, but the `sec.` / `Sec.`
  section connector (universal across multiple states) and the
  postfix `§ N, T.C.A.` form were unrecognized.

  ### Fixes

  - **Universal `sec.` / `Sec.` section connector**: the section
    connector in `buildAbbreviatedCodeRegex` and `ABBREVIATED_RE`
    now accepts `sec.` / `Sec.` alongside `§`, `§§`, and the
    spelled-out word `section(s)` / `Section(s)`. This is a
    Tennessee-driven change but benefits any state that
    interchanges these forms.
  - **T.C.A. postfix pattern**: new `tca-postfix` tokenizer +
    dedicated `extractTcaPostfix` extractor for `§ 39-904, T.C.A.`
    Sibling to florida-postfix, idaho-postfix, mca-postfix.
  - **Canonical `T.C.A.`**: Tennessee abbreviations array
    reordered so `T.C.A.` (Bluebook standard with dots) is the
    last element / canonical. The dotless `TCA` and spaced variants
    now normalize to `T.C.A.` via the stripped-form fallback.

  ### Behavior changes

  - `T.C.A. sec. 40-2407` → extracted (was: not extracted)
  - `T.C.A. Sec. 40-3809` → extracted
  - `TCA sec. 40-2528` → `code="T.C.A."` (canonicalized)
  - `§ 39-904, T.C.A.` (postfix) → extracted
  - `T.C.A. § 39-2404` → unchanged
  - `T.C.A. 40-2020` (no connector) → unchanged

  ### Scope notes

  The following pieces of #398 are intentionally deferred:

  - **Multi-section lists** (`T.C.A. Secs. 40-3806, 40-3814, and
40-3818`) — multi-section deferred across all states.
  - **OCR variant `TOA`** (TCA misread) — edge case; OCR
    cleanup belongs upstream of citation extraction.

  ### Tests

  6 new tests under `Tennessee T.C.A. variants + postfix (#398)`
  in `tests/extract/extractStatute.test.ts`:

  - `T.C.A. sec. 40-2407` (sec. connector)
  - `T.C.A. Sec. 40-3809` (capital Sec.)
  - `TCA sec. 40-2528` (dotless, canonicalized)
  - `§ 39-904, T.C.A.` (postfix)
  - Regression: `T.C.A. § 39-2404`
  - Regression: `Tenn. Code Ann. § 39-2404`

  Full 2671-test suite passes; no regressions.

  ### Related

  Universal `sec.` connector follows the pattern established by
  the universal `Section`/`section` word connector (#348). Postfix
  form is the fourth state-postfix pattern after Florida (#356),
  Idaho (#360), and Montana (#372). The canonicalization
  reordering matches the Ohio pattern (#388).

## 0.15.6

### Patch Changes

- [#354](https://github.com/medelman17/eyecite-ts/pull/354) [`0058673`](https://github.com/medelman17/eyecite-ts/commit/00586739288a123e752cedd5a1c6214f66d08043) Thanks [@medelman17](https://github.com/medelman17)! - fix: Arizona A.R.S. accepts word `section`, spacing/OCR variants, and normalizes `code` (#348)

  Arizona statutes appear in many forms across published opinions —
  `A.R.S. § 25-331`, `A.R.S. section 14-2804(A)`, `ARS § 35-213`,
  `A. R.S. § 36-1002.02`, `AR.S. § 35-213`. The tokenizer recognized
  only the canonical fully-dotted-with-`§` form, and even the partially
  matching variants (`ARS`, `AR.S.`) emitted with `code` reflecting the
  raw match instead of the canonical `A.R.S.`. A 42-opinion Arizona
  sample showed 20+ statute misses on these variants alone.

  ### Fix

  Three coordinated surface-level changes:

  1. **`src/data/stateStatutes.ts`** — the abbreviated-code section
     connector accepts the spelled-out word `section(s)` /
     `Section(s)` alongside `§` / `§§`:

     ```
     …\\s*(?:§§?|[Ss]ections?)?\\s*…
     ```

     This is a universal change benefiting all abbreviated-code
     jurisdictions; Arizona is the immediate driver per #348.

  2. **`src/data/stateStatutes.ts`** — the Arizona `regexFragment`
     admits inter-letter whitespace so spacing/OCR variants tokenize:

     ```
     A\\.?\\s*R\\.?\\s*S\\.?     (was: A\\.?R\\.?S\\.?)
     ```

     `A. R.S.`, `AR.S.`, `ARS` all match.

  3. **`src/data/knownCodes.ts` + `src/extract/statutes/extractAbbreviated.ts`**
     — added a stripped-form fallback to `findAbbreviatedCode` (matches
     on dots+spaces removed) and a normalization step in the extractor.
     When the raw match doesn't appear in `entry.patterns` verbatim
     (i.e., it's an OCR/spacing variant), `code` is set to the canonical
     short abbreviation (`A.R.S.`). Exact-match inputs are left
     unchanged, so `Ariz. Rev. Stat. § 14-1234` continues to emit
     `code: "Ariz. Rev. Stat."` (no regression for Bluebook full forms).

  ### Scope

  - **Multi-section ranges** (`A.R.S. §§ 23-941 through 23-952`) are
    intentionally deferred — they require either a `sectionRange` field
    or producing multiple citations from one match, neither of which
    is a tight regex change.
  - **Bare-section context propagation** (`§ 36-3706` resolving to
    A.R.S. via earlier context) is tracked separately under the
    general per-document statute context proposal.

  ### Tests

  8 new tests under `Arizona A.R.S. format variants (#348)` in
  `tests/extract/statutes/extractAbbreviated.test.ts`:

  - Canonical with subsection: `A.R.S. § 25-331(E)`
  - Word `section` lowercase: `A.R.S. section 14-2804(A)`
  - Word `Section` capital: `A.R.S. Section 22-318`
  - No-dots variant: `ARS § 35-213` → code normalized to `A.R.S.`
  - Extra-space variant: `A. R.S. § 36-1002.02` → code normalized
  - OCR variant: `AR.S. § 35-213` → code normalized
  - Regression: `Ariz. Rev. Stat. § 14-1234` → code preserved as-is
  - Regression: `Ariz. Rev. Stat. Ann. § 14-1234` → code preserved as-is

  Full 2535-test suite passes; no regressions.

  ### Related

  Surfaced by 42-opinion Arizona sample. Same family as #12 (state
  bare-statute forms), #330 (pre-1993 Illinois Revised Statutes), #343
  (Code of Alabama 1940) — each state's most common statute family has
  its own abbreviation/spacing/subdivision quirks that have to be
  covered explicitly.

- [#357](https://github.com/medelman17/eyecite-ts/pull/357) [`b907d20`](https://github.com/medelman17/eyecite-ts/commit/b907d209db2de161f9416b2078230b896d86c2fc) Thanks [@medelman17](https://github.com/medelman17)! - fix: Arkansas Code Annotated + `(Repl. YYYY)` / `(YYYY Supp.)` edition parentheticals (#349)

  Arkansas's primary statute code is **Arkansas Code Annotated** (post-1987)
  or **Arkansas Statutes Annotated** (pre-1987). Three failures combined
  to drop almost every Arkansas statute citation in a 50-opinion sample
  (20+ misses):

  1. The spelled-out `Arkansas Code Annotated` form wasn't accepted
     (the regex required `Ann.` rather than `Annotated`).
  2. `Ark. Stat. Ann.` (the pre-1987 code) had no entry at all.
  3. `(Repl. YYYY)`, `(YYYY Supp.)`, `(Cum. Supp. YYYY)` edition
     parentheticals were dropped even when the citation tokenized —
     the existing year-paren regex (#285) only recognized
     `(Publisher? YYYY)`-shaped bodies.

  ### Fix

  Four coordinated changes:

  1. **`src/data/stateStatutes.ts`** — extended the Arkansas Code
     Annotated entry to accept the spelled-out `Annotated` form
     (`Ann(?:otated)?\.?`); added `"Arkansas Code Annotated"` to the
     abbreviations array.

  2. **`src/data/stateStatutes.ts`** — added a second Arkansas entry
     for the pre-1987 **Arkansas Statutes Annotated** code family
     (`Ark. Stat. Ann.`, `Ark. Stat.`, `Arkansas Statutes Annotated`).

  3. **`src/extract/extractCitations.ts`** — extended
     `STATUTE_YEAR_PAREN_REGEX` so the parenthetical body accepts a
     trailing dot on the publisher/label word (`Repl.`, `Supp.`,
     `Cum. Supp.`) and a year-first variant (`(1969 Supp.)`,
     `(1985 Cum. Supp.)`). `attachStatuteYearParen` routes the
     non-year token to the new `editionLabel` field when it matches
     `Repl. | Supp. | Cum. Supp.` (case-insensitive); otherwise the
     token continues to populate `publisher` as before.

  4. **`src/types/citation.ts`** — added an optional
     `editionLabel?: string` field to `StatuteCitation`. Distinct from
     `publisher` (West/Lexis) — captures replacement/supplement
     volume markers. Non-breaking additive change.

  ### Side fix

  `src/extract/statutes/extractAbbreviated.ts` — mirrored the
  tokenizer's word-`section` tolerance from #348 in the internal
  `ABBREVIATED_RE`, so the abbreviation capture no longer absorbs the
  word `section` when it appears between the code name and the section
  body. Without this, `Arkansas Code Annotated section 11-9-102` would
  produce `abbrevText="Arkansas Code Annotated section"` and fall
  through to canonical-form normalization.

  ### Tests

  7 new tests under `Arkansas Code Annotated + edition parenthetical
(#349)` in `tests/extract/statutes/extractAbbreviated.test.ts`:

  - `Ark. Code Ann. § 11-9-514(a)(1) (Repl. 1996)` → all fields
    populated, `editionLabel: "Repl."`
  - `Arkansas Code Annotated § 16-89-111(e)(1) (1987)` — spelled-out
    form, bare year (no edition label)
  - `Arkansas Code Annotated section 11-9-102(5)(A)(i) (Repl. 1996)` —
    spelled-out + word `section`, code preserved verbatim
  - `Ark. Stat. Ann. § 41-1201 (Repl. 1964)` — pre-1987 code
  - `(1969 Supp.)` year-first edition label
  - Regression: `(West 2018)` continues to populate `publisher`
  - Regression: bare `(1976)` continues to populate `year` only

  Full 2542-test suite passes; no regressions.

  ### Scope

  Bare-section context propagation (`§ 41-1201` resolving to
  `Ark. Stat. Ann.` via earlier-in-document context) is tracked
  separately under the general per-document statute context proposal.

- [#361](https://github.com/medelman17/eyecite-ts/pull/361) [`3949d57`](https://github.com/medelman17/eyecite-ts/commit/3949d57166440662230b462dd7941ef7146f9468) Thanks [@medelman17](https://github.com/medelman17)! - fix: Colorado `C.R.S. 1963` / `C.R.S. 1973` year-edition and prose form (#352)

  Colorado has two compilations: pre-1973 (`C.R.S. 1963`) and post-1973
  (`C.R.S.` / `C.R.S. 1973`). The year suffix is part of the **code
  name**, distinguishing the edition — not an edition parenthetical and
  not a section number. Three failures combined to mis-parse every
  pre-1973 Colorado statute reference in a 38-opinion sample:

  1. **Year suffix consumed as section number**: `C.R.S. 1963 §
148-21-34` extracted `section: "1963"` (the year), dropping the
     real section number `148-21-34` entirely.
  2. **Code name truncated**: `code` was reported as `C.R.S.` rather
     than `C.R.S. 1963`, losing the edition information.
  3. **Prose form not extracted**: `Section 148-21-34, Colorado Revised
Statutes 1963` (the dominant pre-1973 form, with section BEFORE
     the code name) produced no citation.

  ### Fix

  Two coordinated changes:

  1. **`src/data/stateStatutes.ts`** — extended the Colorado regex
     fragment with an optional `\s+19\d{2}` tail that absorbs `1963` /
     `1973` into the abbreviation capture. Added the canonical
     year-suffixed forms (`C.R.S. 1963`, `C.R.S. 1973`, `Colorado
Revised Statutes 1963`, `Colorado Revised Statutes 1973`) and the
     spelled-out base form (`Colorado Revised Statutes`,
     `Colorado Revised Statutes Annotated`) to the abbreviations array.
     With this `findAbbreviatedCode` resolves the year-suffixed forms
     via exact match and `code` is preserved verbatim.

  2. **New `colorado-prose` tokenizer pattern + `extractColoradoProse`
     extractor** — handles the section-first prose form
     `Section 148-21-34, Colorado Revised Statutes 1963`. The pattern
     is listed BEFORE `abbreviated-code` in `statutePatterns.ts` so
     it wins span dedup over the abbreviated-code match (which would
     otherwise still consume the trailing `Colorado Revised Statutes
1963` and emit a duplicate citation with `section: "1963"`).

  ### Scope notes

  - **Chapter-article-section structured fields** (pre-1973 Colorado's
    `148-21-34` = chapter 148, article 21, section 34) are deferred —
    the full section body is preserved in `section`, and consumers can
    split it themselves. Surfacing `chapter` / `article` as typed fields
    would require new optional fields on `StatuteCitation`.
  - **`Article 18 of Chapter 148, Colorado Revised Statutes 1963`**
    (article-of-chapter prose form) is deferred — separate pattern
    shape from the section-first form covered here.
  - **Colorado session laws** (`Colo. Sess. Laws YYYY, ch. NNN, § N`)
    are a separate citation family entirely and tracked separately.

  ### Tests

  8 new tests under `Colorado pre-1973 and year-edition variants (#352)`
  in `tests/extract/extractStatute.test.ts`:

  - Inline `C.R.S. 1963 § 148-21-34` — code preserved with year suffix
  - Inline `C.R.S. 1973 § 13-25-126` — modern edition variant
  - Prose `Section 148-21-34, Colorado Revised Statutes 1963`
  - Prose + `(1965 Supp.)` trailing parenthetical → year + editionLabel
  - Prose with subsection: `Section 82-4-8(8)(f), Colo. Rev. Stat. 1963`
  - Regression: modern `C.R.S. § 13-25-126` (no year suffix) unchanged
  - Regression: `C.R.S. § 13-25-126 (1973)` — trailing year parenthetical
    continues to populate `year`
  - Regression: federal `42 U.S.C. § 1983 (1976)` unaffected

  Full 2551-test suite passes; no regressions.

  ### Related

  Surfaced by 38-opinion Colorado sweep. Companion to #348 (Arizona),
  #349 (Arkansas), #330 (Illinois pre-1993), #343 (Alabama 1940) — each
  state's pre-modern statute code has distinct conventions not in the
  default abbreviated-code pattern.

- [#362](https://github.com/medelman17/eyecite-ts/pull/362) [`011c17a`](https://github.com/medelman17/eyecite-ts/commit/011c17a215c906a0b5a677aef999a7d034b393cd) Thanks [@medelman17](https://github.com/medelman17)! - fix: Connecticut comma-pincite for Id./Ibid./supra back-references (#353)

  Connecticut courts use a distinctive citation style where the page
  follows a comma rather than the Bluebook `at`:

  ```
  Id., 822          (vs. Bluebook `Id. at 822`)
  Smith, supra, 522 (vs. Bluebook `Smith, supra, at 822`)
  Ibid., 250
  ```

  This convention is mandated by Connecticut Practice Book Rule 67-11
  and the Connecticut Style Manual. In a 28-opinion Connecticut sample,
  56 pincites were silently dropped because the existing `Id.`/`Ibid.`/
  `supra` patterns required the word `at` (or a paragraph marker)
  between the back-reference and the page.

  ### Fix

  Extended the pincite-connector alternation in `ID_PATTERN`,
  `IBID_PATTERN`, and `SUPRA_PATTERN` (`src/patterns/shortForm.ts`) and
  the corresponding `idRegex` / `partySupraRegex` in
  `src/extract/extractShortForms.ts` from

  ```
  (,?)\s*(?:at\s+(?:pp?\.\s*)?|(?=¶|paras?\.?\b))
  ```

  to

  ```
  (?:,\s+|,?\s+(?:at\s+(?:pp?\.\s*)?|(?=¶|paras?\.?\b)))
  ```

  The new `,\s+` branch requires a literal comma, so it doesn't conflict
  with the existing typo-guard at the head of the pattern
  (`Id, at` is still only matched by `Id\s*,(?=\s+at\s)`).

  Group numbering in the extractor changed: the previous group 4
  (optional post-period comma) became group 4 (connector capture). The
  extractor now detects the "post-period comma" signal via
  `match[4]?.startsWith(",")` to preserve the existing confidence
  penalty for non-canonical forms.

  ### Confidence policy

  - `Id. at 822` (canonical Bluebook) → confidence 1.0 unchanged
  - `Id., 822` (Connecticut comma-pincite) → confidence 0.9 (regional
    convention; not a typo, but non-Bluebook)
  - `Id., at 253` (period-then-comma, Bluebook-tolerant) → confidence
    0.9 unchanged
  - `Id, at 1483` (typo: comma instead of period) → confidence 0.7
    unchanged

  ### Scope

  The bracketed-reporter `supra, [24 Conn. App.] 554` and the
  section-comment-page `supra, § 2.09, comment 3, p. 375` forms are
  more complex pincite shapes and are deferred. Multi-page lists
  (`Id., 380, 383`) capture the first pincite only — same as existing
  hyphen-range behavior.

  ### Tests

  9 new tests under `Connecticut comma-pincite for Id./Ibid./supra
(#353)` in `tests/extract/extractShortForms.test.ts`:

  - `Id., 6` → pincite=6
  - `Id., 14-15` → pincite=14, endPage=15, isRange=true
  - `Id., 380, 383` → first pincite captured (list scope deferred)
  - `Smith, supra, 522` → pincite=522
  - `Ibid., 250` → pincite=250
  - Regression: `Id. at 822` → confidence=1.0
  - Regression: `Smith, supra, at 822`
  - Regression: `Id., at 253` (post-period comma)
  - Regression: `Id, at 1483` (typo comma) — confidence ≤ 0.7

  Full 2560-test suite passes; no regressions.

  ### Related

  Surfaced by 28-opinion Connecticut sweep. Same family as #305 (Id./
  Ibid. punctuation variants), #281 / #247 (pincite forms), #344
  (short-form `at page N` word). Each is a pincite-prefix tolerance fix
  for back-reference shapes outside strict Bluebook.

## 0.15.5

### Patch Changes

- [#347](https://github.com/medelman17/eyecite-ts/pull/347) [`418595e`](https://github.com/medelman17/eyecite-ts/commit/418595e61902e60236ad9f0824997426a8a6faad) Thanks [@medelman17](https://github.com/medelman17)! - feat: extract pre-1975 Alabama Code (`Code of Alabama 1940`) citations (#343)

  Alabama used a distinct Title/Section statutory format before adopting
  the modern `Ala. Code § N-NN-N` form. Pre-1975 statutes — and continuing
  back-references to them in modern opinions — use forms like
  `Code 1940, T. 15, § 389` or `Title 26, Section 214, Code of Alabama
1940, as Recompiled 1958`. None of these tokenized — surfaced as the
  dominant statute miss pattern in a 50-opinion Alabama sample (15+
  misses).

  ### Fix

  Three tokenizer patterns in `src/patterns/statutePatterns.ts`, one
  dedicated extractor at `src/extract/statutes/extractAlaCode1940.ts`:

  - **`ala-code-prefix`** — `Code 1940, T. NN, § NNN` / `Code of Alabama
1940, T. NN, § NNN` (Code-first form; year hardcoded to 1940)
  - **`ala-title-trailer`** — `Title NN, Section NNN, Code of Alabama
1940[, as Recompiled YYYY]` (Title-first, requires Code trailer)
  - **`ala-tit-bare`** — `Tit. NN, § NNN[, Code 1940...]` (abbreviated
    `Tit.` form, optional Code trailer)

  Each pattern routes to `extractAlaCode1940`, which emits a
  `StatuteCitation` with `code: "Code of Alabama 1940"`, `jurisdiction:
"AL"`, the parsed `title`, `section`, `subsection`, and optionally
  `year` (edition year, e.g. 1940) and `recompiledYear` (1958 when the
  recompilation clause is present).

  `recompiledYear?: number` is a new optional field on `StatuteCitation`
  — additive change, no breaking API impact. Distinct from `year` (the
  original edition year).

  ### Scope notes

  - **Bare `Title 7, § 508` form (no Code clause, spelled-out `Title`)**
    is intentionally NOT matched. The spelled-out form without an
    Alabama-specific signal would false-positive on bare USC-style
    `Title 18, § 1001` prose. The `Tit.` abbreviation is recognized
    bare because the abbreviation is itself an Alabama-distinctive
    signal (USC opinions spell out `Title`). A future enhancement
    could pick up bare spelled-out `Title N, § N` when a contextual
    jurisdiction marker is present.

  - **Multi-section lists** (`Title 52, Sections 486 and 487, ...`)
    match the first section only; the `, 487` is left for downstream.
    Same shape as the existing multi-paragraph match on Illinois ILRS.

  ### Tests

  8 new tests under `Code of Alabama 1940 — pre-1975 statutes (#343)` in
  `tests/extract/extractStatute.test.ts`:

  - Code-prefix: `Code 1940, T. 15, § 389`
  - Title-first w/ recompiledYear: `Title 26, Section 214, Code of
Alabama 1940, as Recompiled 1958`
  - Title-first w/ comma-before-year: `Title 7, Section 273, Code of
Alabama, 1940`
  - Title-first w/ abbreviated trailer: `Title 7, § 21, Code 1940`
  - Title-first w/ §-then-trailer: `Title 43, § 30, Code 1940`
  - Abbreviated bare: `Tit. 52, § 361`
  - Negative: bare `Title 7, § 508` does not match (USC false-positive
    guard)
  - Regression: modern `Ala. Code § 6-2-39` still extracts

  Full 2521-test suite passes; no regressions.

  ### Related

  Surfaced by 50-opinion Alabama sample. Companion to #330 (pre-1993
  Illinois Revised Statutes) — both are pre-modern state code formats
  that remain in active citation.

- [#345](https://github.com/medelman17/eyecite-ts/pull/345) [`74642c0`](https://github.com/medelman17/eyecite-ts/commit/74642c0a18fbee0271e964106e8d16208212f30c) Thanks [@medelman17](https://github.com/medelman17)! - fix: short-form case pincite accepts spelled-out `at page` / `at pages` (#344)

  Short-form back-references using the full word `at page NNN` (rather
  than the abbreviated `at NNN` or CSM `at p. NNN`) were tokenized as
  `journal` citations instead of `shortFormCase`:

  ```
  "281 Ala. at page 322" → type: "journal"     (was; should be shortFormCase)
  "38 Ala.App. at page 186" → type: "journal"   (was; should be shortFormCase)
  ```

  This is an Alabama-style writing convention but appears in other state
  corpora as well. Downstream consumers filtering for `shortFormCase`
  missed the citations entirely; the short-form resolver couldn't link
  them to their full-cite antecedents.

  ### Fix

  Extended the pincite-prefix alternation in both the tokenizer pattern
  and the extractor's anchored re-match regex from `(?:pp?\.\s*)?` to
  `(?:pp?\.\s*|pages?\s+)?`:

  - `src/patterns/shortForm.ts` — `SHORT_FORM_CASE_PATTERN`
  - `src/extract/extractShortForms.ts` — internal `shortFormRegex`

  Both forms (`page`, `pages`) are now accepted before the digit pincite.

  ### Scope

  Multi-pincite lists (`at pages 261 and 262`) capture the first pincite
  only; the `and 262` is left for the surrounding text. Same as existing
  behavior on hyphen-range pincites. A separate multi-pincite extension
  (beyond `#247`) could pick up the second endpoint as a follow-up.

  The same prefix tolerance for `Id. at page` / `Ibid. at page` is
  explicitly out of scope — the issue points to a separate tracking
  ticket for those.

  ### Tests

  6 new tests under `spelled-out at page / at pages pincite prefix
(#344)` in `tests/extract/extractShortForms.test.ts`:

  - `281 Ala. at page 322` → shortFormCase, `pincite: 322`, no journal
    misclassification
  - `38 Ala.App. at page 186` → shortFormCase, `pincite: 186`
  - `261 Ala. at pages 494` → shortFormCase, `pincite: 494`
  - `252 Ala. at pages 261 and 262` → first pincite captured (list scope
    out of scope)
  - Regression: abbreviated `at 322` still works
  - Regression: CSM `at p. 717` still works

  Full 2516-test suite passes; no regressions.

## 0.15.4

### Patch Changes

- [#334](https://github.com/medelman17/eyecite-ts/pull/334) [`b0e97df`](https://github.com/medelman17/eyecite-ts/commit/b0e97df8bf94e369a4e2b131ef58f9575dbb936a) Thanks [@medelman17](https://github.com/medelman17)! - fix: plaintiff field no longer absorbs leading transition words or preceding sentences (#323)

  `Invoking Younger v. Harris, 401 U.S. 37 (1971)` populated
  `plaintiff: "Invoking Younger"` instead of `"Younger"`. Same pattern
  for `Citing`, `Under`, `Unlike`, `Following`, and similar sentence-
  initial transition words. A more catastrophic shape — parenthesized
  citations after a sentence-ending period like `... discretion.
(Burquet v. Brumbaugh, 223 Cal.App.4th 1140.)` — captured the entire
  preceding sentence into `plaintiff` because the case-name backward
  walk crossed both the period and the open-paren.

  ### Fix

  Two targeted changes in `src/extract/extractCase.ts`:

  1. **Transition-word rejection in `isLikelyPartyName`.** Added
     citation-introducing transition words to `SENTENCE_INITIAL_WORDS`
     (`under`, `invoking`, `citing`, `following`, `unlike`, `whereas`,
     `pursuant`, `applying`) and updated `isLikelyPartyName` to reject
     a candidate whose first word is in that set. These words pass the
     all-capitalized-words check (every word starts with a capital
     letter) but are sentence-prose, not party names. With the new
     guard, the downstream trim loop strips the transition word and
     the actual party name (the next capitalized word) is preserved.

  2. **`. (` sentence boundary detection.** Extended
     `SENTENCE_BOUNDARY_REGEX` from `/[.)]\s+(?=[A-Z])/g` to
     `/[.)]\s+(?=[A-Z(])/g` so the case-name walk stops at the open
     paren when a citation envelope opens immediately after a sentence-
     ending period. Without it, the walk crosses the boundary and
     absorbs the entire preceding sentence.

  ### Tests

  7 new tests under `plaintiff field over-capture — transition words +
sentence-paren boundary (#323)` in `tests/extract/extractCase.test.ts`:

  - `Invoking Younger v. Harris` → `plaintiff: "Younger"`
  - `Citing Pederson v. Smith` → `plaintiff: "Pederson"`
  - `Unlike State v. Q.D.` → `plaintiff: "State"`
  - `Under People v. Smith` → `plaintiff: "People"`
  - Catastrophic: `... discretion. (Burquet v. Brumbaugh, ...)` →
    `plaintiff: "Burquet"`
  - Regression: `See, e.g., Ivanhoe Irrigation District v. McCracken` →
    `plaintiff: "Ivanhoe Irrigation District"`, `signal: "see, e.g."`
  - Regression: `In re Smith` → `caseName: "In re Smith"` (prefix
    preserved)

  Full 2463-test suite passes; no regressions.

- [#336](https://github.com/medelman17/eyecite-ts/pull/336) [`39b709e`](https://github.com/medelman17/eyecite-ts/commit/39b709e3cf794b3364705d8d4eb0828ed96a1cee) Thanks [@medelman17](https://github.com/medelman17)! - fix: preserve `v` punctuation fidelity in `caseName` — NY-style `v` (no period) and `vs.` variant (#326)

  `Rocovich v Consolidated Edison Co., 78 N.Y.2d 509` previously produced
  `caseName: "Rocovich v. Consolidated Edison Co."` — the extractor was
  silently adding a period to the NY-court `v` separator. The same
  happened to `Romano v Hotel Carlyle Owners Corp.`. New York courts use
  `v` without a period as the canonical form; rewriting it as `v.` breaks
  round-trip fidelity and NY court records search compatibility.

  ### Fix

  Two changes in `src/extract/extractCase.ts`:

  1. **`extractCaseName` (`v.` capture site, line 1335)** — replaced the
     hardcoded `${plaintiff} v. ${defendantText}` with a captured
     separator from the regex match:

     ```
     const sepMatch = /\bvs?\.?(?=\s)/.exec(vMatch[0])
     const sep = sepMatch?.[0] ?? "v."
     ```

     The matched separator (`v`, `v.`, `vs`, or `vs.`) is whichever form
     appeared in the source.

  2. **`extractCase`'s caseName rebuild site (line ~2688)** — when
     `extractPartyNames` modifies the plaintiff (signal-strip, transition-
     word-strip, etc.), the rebuilt caseName now preserves whichever `v`
     form was already in the existing caseName, detected via
     `/\s+(vs?\.?)\s+/.exec(caseName)`.

  ### Companion fix — internal `vRegex` consistency

  The `extractPartyNames` internal regex for splitting plaintiff/defendant
  on `v` (`/\s+v\.?\s+/i`) didn't accept the `vs?` variant. Before #326,
  the case-name rebuild always normalized to `v.`, so the inconsistency
  was masked. With `vs.` and `v` now preserved in `caseName`, the
  internal regex needed updating to match the same alternation
  (`/\s+vs?\.?\s+/i`). Applied to all five internal regex sites in the
  file. Without this, `Smith vs. Jones, 500 F.2d 123` would extract
  `caseName: "Smith vs. Jones"` correctly but leave `plaintiff` and
  `defendant` undefined.

  ### Tests

  5 new tests under `\`v\` punctuation fidelity in caseName (#326)`in`tests/extract/extractCase.test.ts`:

  - `Rocovich v Consolidated Edison Co.` → NY `v` preserved
  - `Romano v Hotel Carlyle Owners Corp.` → NY `v` preserved
  - `Smith v. Jones` → federal `v.` preserved
  - `Smith vs. Jones` → `vs.` preserved; plaintiff/defendant captured
  - `In re K.F.` → no `v` at all, unchanged

  Full 2468-test suite passes; no regressions.

- [#337](https://github.com/medelman17/eyecite-ts/pull/337) [`d8650d3`](https://github.com/medelman17/eyecite-ts/commit/d8650d37f40e81a1824082ee369a8d29229dd574) Thanks [@medelman17](https://github.com/medelman17)! - fix: named-code statute tokenizer no longer absorbs intervening prose into `matchedText` (#328)

  When a sentence contained a stray earlier jurisdictional prefix
  (`California`) followed by lowercase prose and then a real citation
  (`California Penal Code § 549`), the named-code tokenizer matched the
  **first** `California` and absorbed the entire intervening clause into
  the `code` field and `matchedText`:

  ```
  matchedText: "California for solicitation, acceptance or referral of
                fraudulent insurance claims, in violation of California
                Penal Code § 549"
  ```

  This violated the `matchedText.length === span.originalEnd -
span.originalStart` invariant and broke annotation, highlighting, and
  round-trip operations.

  ### Root cause

  The code-name capture group in the `named-code` tokenizer pattern
  (`src/patterns/statutePatterns.ts`) was `[A-Za-z.&',\s]+?` — accepting
  both upper- and lowercase letters. Real code names are title-case
  (`Penal Code`, `Civ. Prac. & Rem. Code Ann.`, `Insurance Law`) but the
  permissive class let prose like `for solicitation, acceptance ...`
  flow through. The lazy quantifier kept extending until it found
  `\s*§§?\s*\d+`, which happened only at the SECOND `California`.

  ### Fix

  Changed the code-name capture from `[A-Za-z.&',\s]+?` to:

  ```
  [A-Z][A-Za-z.&']*(?:(?:\s+|,\s+)(?:&|[A-Z][A-Za-z.&']*))*
  ```

  - Must start with a capital letter
  - Each subsequent word is also capital-letter-led (or a standalone `&`)
  - Separator between words is either whitespace or `,\s+` so Maryland's
    `Code Ann., Crim. Law` and `Code, Ins.` shapes still parse

  The lowercase prose words `for`, `or`, `of`, `in`, `to` no longer
  match — the regex skips the first `California` and lands on the
  real citation context.

  ### Tests

  4 new tests under `named-code does not absorb intervening prose (#328)`
  in `tests/extract/extractStatute.test.ts`:

  - Catastrophic case: `California ... in violation of California Penal Code
§ 549` → `matchedText: "California Penal Code § 549"` (no prose),
    plus span-invariant check
  - Regression: `Md. Code Ann., Crim. Law § 3-202` (comma inside name)
  - Regression: `Md. Code, Ins. § 27-101` (comma + abbrev)
  - Regression: `Tex. Civ. Prac. & Rem. Code Ann. § 17.42` (ampersand +
    multi-word)

  Full 2472-test suite passes; no regressions.

- [#342](https://github.com/medelman17/eyecite-ts/pull/342) [`7ae7786`](https://github.com/medelman17/eyecite-ts/commit/7ae77869779284e6154ea37e4a0bf994cdc0a401) Thanks [@medelman17](https://github.com/medelman17)! - fix: state constitution prefix preserved on no-space `Pa.Const.` form (#329)

  When a state constitutional citation used the abbreviated form with no
  space between the state prefix and `Const.` — `Pa.Const. art. VIII, § 4`,
  `Cal.Const. art. I, § 6`, `N.Y.Const. art. III` — the `state-constitution`
  tokenizer pattern required a whitespace separator and didn't match. The
  input fell through to `bare-constitution`, producing `matchedText: "Const.
art. VIII, § 4"` with `jurisdiction: undefined`. The jurisdictional
  attribution was silently dropped, even though it was present in the source.

  ### Fix

  Two surface-level updates:

  1. **Pattern** (`src/patterns/constitutionalPatterns.ts`): the separator
     between the state abbreviation and `Const.` is now `(?:\.\s*|\s+)` —
     either `.` followed by 0+ whitespace, OR 1+ whitespace. Both forms
     require a separator, so `PaConst.` (no `.` and no space) still does
     not match, preventing word-glue false positives from any word
     starting with a state-abbreviation stem.

  2. **Extractor** (`src/extract/extractConstitutional.ts`):
     `STATE_PREFIX_RE` now uses `\.?\s*Const` instead of `\.?\s+Const`,
     so the prefix is captured from `Pa.Const.` and `N.Y.Const.` the same
     way as from `Pa. Const.` / `N.Y. Const.`. `resolveStateJurisdiction`
     already strips spaces and dots before lookup, so jurisdiction
     resolution is unchanged downstream.

  ### Tests

  7 new tests:

  `tests/patterns/constitutionalPatterns.test.ts` (4):

  - `Pa.Const. art. VIII, § 4` matches state-constitution
  - `Cal.Const. art. I, § 6` matches state-constitution
  - `N.Y.Const. art. III` (multi-part) matches state-constitution
  - `PaConst.` (no separator at all) does NOT match — false-positive guard

  `tests/extract/extractConstitutional.test.ts` (3):

  - `Pa.Const.` → `jurisdiction: "PA"`, `article: 8`, `section: "4"`
  - `Cal.Const.` → `jurisdiction: "CA"`
  - `N.Y.Const.` → `jurisdiction: "NY"`, `article: 3`

  Full 2510-test suite passes; existing spaced and `U.S. Const.` forms
  unchanged.

  ### Related

  Surfaced by a 200-opinion modern sweep. Other constitutional-citation
  coverage gaps (bare `Eighth Amendment` prose form, populated `document`
  field on the output) are tracked as separate issues.

- [#338](https://github.com/medelman17/eyecite-ts/pull/338) [`65ee122`](https://github.com/medelman17/eyecite-ts/commit/65ee12254d16623fe93ce25170144990332c5930) Thanks [@medelman17](https://github.com/medelman17)! - feat: extract pre-1993 Illinois Revised Statutes (`Ill. Rev. Stat. YYYY, ch. N, par. N`) (#330)

  Illinois used a distinct statutory citation format before adopting
  Illinois Compiled Statutes (ILCS) in 1993. Pre-1993 forms continue
  to appear in modern Illinois opinions when referencing the historical
  version of a statute: `Ill. Rev. Stat. 1985, ch. 40, par. 504(a)`.
  None of these tokenized — surfaced as the dominant statute miss
  pattern in a 16-opinion Illinois sample (20+ misses).

  ### Fix

  New `ill-rev-stat` pattern in `src/patterns/statutePatterns.ts` and
  dedicated `extractIllRevStat` extractor at
  `src/extract/statutes/extractIllRevStat.ts`.

  Tokenizer regex:

  ```
  \bIll\.?\s*Rev\.?\s*Stat\.?,?\s+(\d{4}),?\s+[Cc]h\.\s+(\d+[A-Z]?),?\s+pars?\.\s+(\d+(?:[A-Za-z0-9:-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*(?:\s*et\s+seq\.?)?)
  ```

  Tolerance:

  - Spaced or no-space (`Ill. Rev. Stat.` / `Ill.Rev.Stat.`)
  - Capitalized or lowercase `[Cc]h.`
  - Singular or plural `pars?.`
  - Optional commas after `Stat.` and after the chapter number
  - Letter-suffix chapter (`110A`)
  - Section-body uses the period-followed-by-alphanumeric guard from #283

  Captures:

  - Group 1 → `year` (e.g., 1985 — the embedded year-of-edition)
  - Group 2 → `title` (chapter, e.g., 40)
  - Group 3 → paragraph body, parsed into `section` / `subsection` via
    the shared `parseBody` helper

  Jurisdiction is hardcoded `"IL"`; `code` is normalized to `"Ill. Rev. Stat."`
  regardless of source spacing/punctuation.

  ### Scope notes

  - **Multi-paragraph lists** (`pars. 8-102, 8-103`) match the first
    paragraph only; the trailing `, 8-103` is left for downstream. Same
    shape as the existing single-paragraph match on canonical ILCS.

  ### Tests

  6 new tests under `Illinois Revised Statutes (pre-1993) (#330)` in
  `tests/extract/extractStatute.test.ts`:

  - Canonical `Ill. Rev. Stat. 1985, ch. 40, par. 504(a)`
  - No-space + capitalized `Ill.Rev.Stat. 1985, Ch. 127, par. 780.04`
  - Plural `pars.` (matches first only)
  - Letter-suffix chapter `110A`
  - Stray comma + `et seq.`
  - Regression: modern `735 ILCS 5/2-1001` still routes through `chapter-act`

  Full 2479-test suite passes; no regressions.

- [#339](https://github.com/medelman17/eyecite-ts/pull/339) [`7fe50c8`](https://github.com/medelman17/eyecite-ts/commit/7fe50c8a2bcfb7cde8a03b9dd7b726a3269c5cfd) Thanks [@medelman17](https://github.com/medelman17)! - fix: ILCS trailing sentence period no longer absorbed into section (#331)

  Modern Illinois Compiled Statutes (ILCS) citations that end a sentence
  were leaving the period attached to the `section` field:

  ```
  "See 5 ILCS 100/1-1." → section: "1-1."   (was; should be "1-1")
  "See 225 ILCS 60/22." → section: "22."    (was; should be "22")
  ```

  This is the same anti-pattern fixed for other section bodies in #283,
  applied to the `chapter-act` family.

  ### Fix

  Both the tokenizer pattern (`chapter-act` in
  `src/patterns/statutePatterns.ts`) and the extractor's anchored re-match
  regex (`CHAPTER_ACT_RE` in `src/extract/statutes/extractChapterAct.ts`)
  now use the period-followed-by-alphanumeric guard for the section body:

  ```
  \d+(?:[A-Za-z0-9:-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*(?:\s*et\s+seq\.?)?
  ```

  A period is consumed only when followed by an alphanumeric (preserving
  internal decimal sections such as `1-1.5`); a trailing sentence period
  is left for the surrounding prose.

  ### Field mapping clarification

  The issue also reported that "chapter is lost." It is not — the chapter
  has always been emitted on the `title` field on the extracted
  `StatuteCitation` (e.g., `750 ILCS 36/305(b)` → `title: 750`,
  `code: "36"`, `section: "305"`, `subsection: "(b)"`). The act number
  sits in `code`. These field names predate the issue and are kept for
  backward compatibility.

  ### Tests

  6 new tests under `ILCS trailing-period absorption (#331)` in
  `tests/extract/extractStatute.test.ts`:

  - `5 ILCS 100/1-1.` — trailing period stripped from hyphenated section
  - `225 ILCS 60/22.` — trailing period stripped from bare-numeric section
  - `735 ILCS 5/2-1001.` — trailing period stripped from canonical-shape section
  - `750 ILCS 36/305(b).` — subsection preserved, trailing period stripped
  - `820 ILCS 405/1100 et seq.` — `hasEtSeq` set, trailing period not absorbed
  - `5 ILCS 100/1-1.5` — internal decimal period preserved (regression guard)

  Full 2485-test suite passes; no regressions.

- [#340](https://github.com/medelman17/eyecite-ts/pull/340) [`81e33ad`](https://github.com/medelman17/eyecite-ts/commit/81e33ad64b4139286118458298c739ce901d44ef) Thanks [@medelman17](https://github.com/medelman17)! - fix: suppress phantom case citation for `vol Ill. 2d R. ruleNum` (#332)

  Illinois Supreme Court Rules are cited as `177 Ill. 2d R. 234`
  (volume + reporter + `R.` + rule number). The state-reporter
  tokenizer pattern's lazy reporter capture was absorbing ` R.` into
  the reporter (yielding `reporter: "Ill.2d R."`, `page: 234`) and
  emitting a phantom case citation for a non-existent case.

  ### Fix

  Add a negative lookahead `(?! R\.\s+\d)` to the inner loop of the
  `state-reporter` pattern in `src/patterns/casePatterns.ts`. When the
  lazy reporter expansion would consume ` R.` followed by a digit, the
  lookahead fires, the whole match fails, and the input is left
  untokenized.

  Resulting behavior on `177 Ill. 2d R. 234`:

  ```
  before: { type: "case", volume: 177, reporter: "Ill.2d R.", page: 234 }
  after:  (no citation emitted)
  ```

  ### Scope

  This is the minimum fix that removes the wrong output. Producing a
  typed rule citation (`type: "rule"` with `ruleSet` / `rule` fields) is
  a larger feature — it requires a new citation type in the discriminated
  union and isn't done here. Suppressing the false positive is strictly
  better than emitting a wrong one downstream.

  Other Illinois rule forms outside the canonical `vol Ill. (2d )?R. num`
  shape (`Ill. R. Evid. 403`, `Ill. R. App. P. 5`, `Sup. Ct. R. 137`) are
  left for a follow-up — they either don't tokenize as cases today or
  need their own pattern.

  ### Tests

  7 new tests under `Illinois rule-marker boundary in state-reporter
pattern (#332)` in `tests/extract/extractCase.test.ts`:

  - `177 Ill. 2d R. 234` → 0 case citations
  - Normalized `177 Ill.2d R. 234` → 0
  - Trailing year-paren `177 Ill. 2d R. 431 (1997)` → 0
  - Older `100 Ill. R. 5` → 0
  - Mixed text: rule suppressed, real `234 Ill. 2d 5` case preserved
  - Regression: real `177 Ill. 2d 1` still emits a case citation
  - Regression: `123 Ill. App. 3d 456` reporter unaffected

  Full 2492-test suite passes; no regressions.

- [#341](https://github.com/medelman17/eyecite-ts/pull/341) [`5242565`](https://github.com/medelman17/eyecite-ts/commit/5242565eb41a85b748a4071d8ae4c64ad35e769f) Thanks [@medelman17](https://github.com/medelman17)! - fix: in-word em-dashes normalize to a single hyphen (#333)

  Illinois opinions (and OCR'd reporter text more generally) use the
  em-dash character `—` (U+2014) where most jurisdictions use a hyphen.
  The `normalizeDashes` cleaner was rewriting every em-dash to triple
  hyphen (`---`), the blank-page placeholder form. As a result, citations
  like `par. 13—214(a)`, `pars. 8—102, 8—103`, and `at 875—877` were
  contaminated with `---` in the section/pincite body, blocking
  extraction or polluting downstream output.

  ### Fix

  Context-aware substitution in `src/clean/cleaners.ts:normalizeDashes`.
  A new in-word rule runs first:

  ```
  text.replace(/(?<=\w)[—―](?=\w)/g, "-")
  ```

  - Between word characters → single hyphen (`13—214` → `13-214`,
    `84—C—4508` → `84-C-4508` — both em-dashes converted in one pass via
    zero-width lookbehind/lookahead).
  - Standalone (whitespace on either side) → triple hyphen, preserving
    the `500 F.4th — (2024)` blank-page placeholder behavior.

  Em-dash-to-hyphen is length-preserving (1 codepoint each), so the
  existing transformation map continues to map `originalStart` /
  `originalEnd` 1:1 to the em-dash position in the source text.

  ### Tests

  11 new tests:

  `tests/clean/cleanText.test.ts` (6):

  - In-word em-dash between digits → single hyphen
  - In-word em-dash in page range → single hyphen
  - Adjacent em-dashes in docket separators handled in one pass
  - Standalone em-dash → triple hyphen (regression for blank-page form)
  - Mixed input (in-word vs standalone)
  - In-word horizontal bar (U+2015) → hyphen

  `tests/extract/extractStatute.test.ts` (5):

  - End-to-end: `par. 13—214(a)` now extracts as `section: "13-214"`,
    `subsection: "(a)"`
  - Em-dash and hyphen variants produce equivalent statute output
  - Multi-paragraph em-dash form (first paragraph matched)
  - Blank-page em-dash still tokenizes as case with `---`
  - Span check: `originalStart`/`originalEnd` map back to the em-dash
    position in the source

  Full 2503-test suite passes; no regressions.

  ### Related

  Surfaced by a 16-opinion Illinois sample. Companion to #330 (the ILRS
  pattern itself); fixing #330 alone wouldn't help inputs that used the
  canonical Illinois em-dash subdivision form. Page-range pincite capture
  (`at 875—877` extracting both endpoints as a range, not just the first)
  is a separate issue.

## 0.15.3

### Patch Changes

- [#312](https://github.com/medelman17/eyecite-ts/pull/312) [`d4ce47e`](https://github.com/medelman17/eyecite-ts/commit/d4ce47ecba5fc281576693ac551b2af4360a7733) Thanks [@medelman17](https://github.com/medelman17)! - fix: supra/short-form `partyName` captures multi-word names with `&` and corporate suffixes (#301)

  The supra and short-form case-cite patterns truncated `partyName` to
  the last token when the name contained `&` or trailing corporate
  suffixes after a comma. `Walker & Horwich, supra` captured only
  `"Horwich"`; `Thorn Americas, Inc., supra` captured only `"Inc."`.
  Surfaced as 50+ partyName findings in the 200-opinion modern-era
  sweep with direct impact on #278's resolver disambiguation.

  ### Root cause

  `SUPRA_PATTERN` and `SHORT_FORM_CASE_PATTERN` in
  `src/patterns/shortForm.ts` (and the duplicate parser regexes in
  `src/extract/extractShortForms.ts`) allowed only `\s+v\.?\s+` and
  plain `\s+` between capitalized words in the party-name capture. So:

  - `Walker & Horwich`: `&` is neither whitespace nor `v.`. The regex
    captured `Walker` then failed to find `, supra` immediately
    after — backtracked and re-matched starting at `Horwich`.
  - `Thorn Americas, Inc.`: `,` is not a continuation character. The
    regex captured `Thorn Americas` then failed to find `, supra` (the
    next token is `, Inc.`) — backtracked and re-matched starting at
    `Inc.`.

  ### Fix

  Added two continuation alternatives to the party-name capture group
  in both `SUPRA_PATTERN` and `SHORT_FORM_CASE_PATTERN`, and to the
  mirror regexes in `extractShortForms.ts`:

  - `\s+&\s+` — ampersand-joined parties
  - `,\s+` — comma continuation for corporate suffixes / multi-clause
    party names

  Both require a capital-letter follow-on, so the lowercase `supra`
  terminator is unaffected.

  ### Intentionally out of scope

  - **`In re X, supra` preserving the prefix.** The issue's third
    example wants `In re Bluetooth, supra` → `partyName: "In re
Bluetooth"`, but the resolver's BKTree indexes full-cite party
    names with `In re` stripped (per existing #216 / #21 convention).
    Adding the prefix here would break supra-to-fullcite resolution.
    The existing pinned regression at `extractShortForms.test.ts:1150`
    (`In re Smith, supra` → `partyName: 'Smith'`) reflects that
    convention. Fixing this requires resolver-side normalization
    (matching with prefix-equivalence) — a separate, larger change.
  - **Bare back-reference resolution.** Cases like `Strawn v. Farmers
Ins. Co. of Oregon, supra` where the source only writes
    `Oregon, supra` cannot be fixed by pattern changes — only the
    literal token text is available to the regex. The resolver must
    walk back to the prior full citation to recover the full caption.

  ### Tests

  5 new tests under `multi-word party name capture (#301)` in
  `tests/extract/extractShortForms.test.ts`:

  - `Thorn Americas, Inc., supra` → `partyName: "Thorn Americas, Inc."`
  - `Walker & Horwich, supra` → `partyName: "Walker & Horwich"`
  - `In re Foo, supra` → `partyName: "Foo"` (pins the resolver-aware
    In-re-stripping behavior; calls out the scope decision in the
    test comment)
  - Regression: single-word `Smith, supra` → `partyName: "Smith"`
  - Regression: `Smith v. Jones, supra` → `partyName: "Smith v. Jones"`

  Full 2411-test suite passes; no regressions.

- [#314](https://github.com/medelman17/eyecite-ts/pull/314) [`09ed456`](https://github.com/medelman17/eyecite-ts/commit/09ed45621333ea8166b1722c3753704b2d0c0833) Thanks [@medelman17](https://github.com/medelman17)! - fix: hard-reject `<day> <Month> <year>` phantom citations like `8 April 1988` (#302)

  The state-reporter tokenizer's broad `<volume> <Word> <page>` pattern
  was capturing date-shaped prose as phantom case citations:
  `8 April 1988` became `volume=8, reporter="April", page=1988`. The
  existing false-positive filter could catch these but only when callers
  opted into `filterFalsePositives: true`; without the opt-in, the
  phantoms flooded downstream consumers.

  ### Fix

  Added a **hard-reject** pre-pass to `applyFalsePositiveFilters` that
  unconditionally drops citations matching the date-shape pattern,
  regardless of the caller's `filterFalsePositives` flag. The check
  fires when:

  1. `reporter` is one of the 12 English month names, AND
  2. `volume` is a plausible day-of-month (1–31), AND
  3. `page` is a plausible report year (1700 to current year + 5)

  All three conditions must hold; any single legitimate-shaped value
  keeps the citation in the pipeline (where the standard soft-flag pass
  can still flag it). This narrow shape exists explicitly to avoid
  collateral damage on cases where one component is a legitimate value.

  ### Why hard-reject (rather than soft-flag by default)

  Soft-flagging would still emit the phantom citation with a low
  confidence and a warning, but the citation would still appear in the
  result array — and most downstream consumers treat the array as
  "these are the citations." There is no policy under which `<day>
<Month> <year>` should be reported as a citation, so removing it is
  correct under every caller policy.

  ### Tests

  - 6 new unit tests in `tests/extract/filterFalsePositives.test.ts`
    under `month-name date misparse hard-reject (#302)`: covers
    representative day/month/year shapes for each of the 12 months and
    the two non-rejection boundaries (volume > 31, year < 1700).
  - 4 new integration tests in `tests/integration/falsePositives.test.ts`
    exercising the full pipeline: `On 8 April 1988`, `On 15 May 2010`
    produce 0 citations; `100 F.3d 200` and `42 U.S.C. § 1983` baselines
    still extract.

  Full 2421-test suite passes; no regressions.

- [#315](https://github.com/medelman17/eyecite-ts/pull/315) [`db86c00`](https://github.com/medelman17/eyecite-ts/commit/db86c0026ec5b32dc4308f3d6c83b48af83cba2a) Thanks [@medelman17](https://github.com/medelman17)! - feat: capture trailing parentheticals on `Id.`, `supra`, and short-form case citations (#303)

  `Id. at 770 (Marsh)`, `Id. at 770 (citation omitted)`,
  `Smith, supra, at 200 (holding that ...)`, and
  `100 F.3d at 770 (citations omitted)` previously dropped the trailing
  parenthetical content silently. The short-form extractors now capture
  the parenthetical text on a new `parenthetical?: string` field,
  mirroring how `extractCase` handles trailing parens on full citations.

  Surfaced as 80+ findings in the 200-opinion modern-era sweep — the
  third-largest field-issue bucket after caseName and court.

  ### Fix

  Added a lightweight `extractTrailingParenthetical(cleanedText, cleanEnd)`
  helper in `src/extract/extractShortForms.ts`. It scans the cleaned text
  starting at the citation's `span.cleanEnd` for `^[\s,]*\(([^()]*)\)` and
  returns the inner text. Wired into all three short-form extractors:

  - `extractId(token, transformationMap, cleanedText)` — already received
    `cleanedText` for context validation (#216); reuse it.
  - `extractSupra` — new third parameter.
  - `extractShortFormCase` — new third parameter.

  `extractCitations` now passes `cleaned` to all three call sites.

  ### Fields added

  - `IdCitation.parenthetical?: string`
  - `SupraCitation.parenthetical?: string`
  - `ShortFormCaseCitation.parenthetical?: string`

  The captured value is the raw text between the parens. Consumers can
  post-classify it as a short-form identifier (`Marsh`), drop-citation
  marker (`citation omitted`), or explanatory holding by inspecting the
  content — the lightweight extractor intentionally doesn't classify, since
  short-form parens are rarely chained and classification adds value
  mostly on full case cites.

  ### Scope notes

  - **Single paren only.** The extractor captures the first `(...)` that
    immediately follows the citation. Chained parens on short-form cites
    are rare and not in scope.
  - **No `parentheticals[]` array.** The full-cite `parentheticals`
    array with structured `Parenthetical` objects (including signal-word
    classification, span, and kind) remains case-cite-only. Adding it to
    short-forms would require porting the full `collectParentheticals`
    pipeline, which is heavier than the gap this PR addresses.
  - **No new `shortFormIdentifier` / `dropCitation` kinds.** The issue
    suggested adding these to `ParentheticalType`, but with the raw
    `parenthetical: string` field consumers can do their own classification
    cheaply; adding union variants would expand the public type without
    much practical benefit.

  ### Tests

  6 new tests under `trailing parenthetical capture on short-form cites
(#303)` in `tests/extract/extractShortForms.test.ts`:

  - `Id. at 770 (Marsh)` → `parenthetical: "Marsh"`
  - `Id. at 770 (citation omitted)` → `parenthetical: "citation omitted"`
  - `Id. at 100` (no paren) → no `parenthetical` field
  - `Smith, supra, at 200 (holding ...)` → `parenthetical: "holding that the rule applies"`
  - `Smith, supra, at 460` (no paren) → no `parenthetical` field
  - `100 F.3d at 770 (citations omitted)` → `parenthetical: "citations omitted"`

  Full 2427-test suite passes; no regressions.

- [#316](https://github.com/medelman17/eyecite-ts/pull/316) [`9cebd56`](https://github.com/medelman17/eyecite-ts/commit/9cebd56f64a7841fea18dab04cbf7fc5f8fc4dbd) Thanks [@medelman17](https://github.com/medelman17)! - fix: don't set `signal` on citations introduced by lowercase prose (#304)

  `Contra plaintiff's argument, Bolling v. Sharpe, 347 U.S. 497 (1954)`
  and similar forms (`Accord between parties, ...`,
  `Compare the rule from ...`) populated `signal: "contra"` / `"accord"` /
  `"compare"` on the extracted citation even though those words were
  used as ordinary English prepositions, not Bluebook signal phrases.

  ### Root cause

  Two independent paths set `signal`:

  1. **`extractPartyNames`** in `extractCase.ts` runs `SIGNAL_STRIP_REGEX`
     on the captured plaintiff. When `extractCaseName` over-captured
     sentence prose (e.g., `Contra plaintiff's argument, Bolling`), the
     leading word looked like a signal and got stripped — but the
     remainder of the plaintiff (`plaintiff's argument, Bolling`) was
     plain English, not a case-name.

  2. **`detectLeadingSignals`** in `detectStringCites.ts` scans the gap
     text before a citation for any signal occurrence. For text like
     `Contra plaintiff's argument, [cite]`, it finds `Contra` as the
     only match in the gap and accepts it without verifying that the
     intervening text is case-name-shaped.

  ### Fix

  Both paths now require the post-signal text to begin with a capital
  letter — a heuristic that distinguishes a real signal-introduced
  citation context (capital-letter case-name following the signal) from
  sentence prose (lowercase word following the signal):

  - `extractPartyNames`: wrap the existing signal-strip block in a
    guard that only applies the strip when the remainder of the
    plaintiff begins with a capital letter. False-positive prose
    remainders keep the signal unset.
  - `detectLeadingSignals`: after selecting the best signal match,
    inspect `gapText.substring(best.end)` and skip the assignment when
    the first non-whitespace, non-comma character is lowercase.

  Multi-word signals (`see also`, `but see`, `see, e.g.`) are already
  captured as complete units by `SIGNAL_PATTERNS`, so the guard does
  not interfere with valid signal forms — only sentence-internal
  English words that happen to coincide with signal spellings.

  ### Tests

  5 new tests under `false-positive signal rejection (#304)` in
  `tests/extract/extractCase.test.ts`:

  - `Contra plaintiff's argument, Smith v. Jones, ...` → `signal: undefined`
  - `Accord between parties, Smith v. Jones, ...` → `signal: undefined`
  - `Compare the rule from Smith v. Jones, ...` → `signal: undefined`
  - Regression: `Contra Smith v. Jones, ...` → `signal: "contra"` (real
    signal with capital-letter case-name follow-on)
  - Regression: `See Smith v. Jones, ...` → `signal: "see"`

  Full 2432-test suite passes; no regressions.

- [#317](https://github.com/medelman17/eyecite-ts/pull/317) [`4860c99`](https://github.com/medelman17/eyecite-ts/commit/4860c998fdd50d7a46563f0b8885bb4386d0fd39) Thanks [@medelman17](https://github.com/medelman17)! - fix: tolerate `Id.` / `Ibid.` punctuation variants — `Id .`, `Ibid .`, `Id, at N` (#305)

  OCR'd PDFs and older typesetting routinely produce `Id .` (with a
  space before the period) and the analogous `Ibid .`; some opinions
  also write `Id, at p. 1483` as a typo for `Id., at p. 1483`. All three
  variants were silently dropped by the tokenizer. Surfaced as 30+
  misses in the 200-opinion modern-era sweep.

  ### Fix

  Updated both the tokenizer patterns (`src/patterns/shortForm.ts`) and
  the parser regex in `extractShortForms.ts`:

  - `[Ii]d\.` → `[Ii]d\s*\.` — optional whitespace before the period
    (`Id .`, `Ibid .`).
  - Comma-instead-of-period typo: `[Ii]d\s*,(?=\s+at\s)` — guarded by a
    lookahead so bare `Id,` in prose (`"She showed her Id, but..."`) is
    not misread as a citation.
  - Same `\s*\.` allowance for `[Ii]bid`.

  The parser regex group layout shifted to expose both punctuation forms
  separately for confidence scoring:

  - Group 2 = `.` (canonical form)
  - Group 3 = `,` (typo form)
  - Group 4 = optional post-period comma (canonical-only)
  - Group 5 = pincite

  Typo-comma form gets a `0.7` confidence cap (down from `0.9` for the
  post-period comma variant), reflecting that `Id, at N` is almost
  always a typo rather than a stylistic choice.

  ### Scope notes

  - **`Id. sec. 185b`** (section-instead-of-page pincite) tokenizes as
    bare `Id.` with no pincite, matching previous behavior. The issue
    suggested adding a structured `pinciteKind: "section"` field —
    that's a public-type addition rather than a tokenization fix and is
    out of scope for this PR.

  ### Tests

  7 new tests under `Id./Ibid. punctuation tolerance (#305)` in
  `tests/extract/extractShortForms.test.ts`:

  - `Id . at 326` → `pincite: 326`
  - `Ibid .` tokenizes
  - `Id, at p. 1483` → `pincite: 1483`, confidence < 0.95
  - `Id . at p. 1192` → `pincite: 1192`
  - `She showed her Id, but ...` → no match (prose guard works)
  - Regression: canonical `Id. at 326` → `pincite: 326`, `confidence: 1.0`
  - Regression: canonical `Ibid.` tokenizes

  Full 2439-test suite passes; no regressions.

- [#318](https://github.com/medelman17/eyecite-ts/pull/318) [`409b6e4`](https://github.com/medelman17/eyecite-ts/commit/409b6e49a548a117a5f430f25962e6a409c6dbf1) Thanks [@medelman17](https://github.com/medelman17)! - feat: recognize bracketed `[supra]` forms — Connecticut style (#306)

  Connecticut Supreme/Appellate opinions enclose `supra` in square
  brackets when the supra reference is nested inside a string-cite or
  quotation: `State v. Jarzbek, [supra, 705]`, `State v. Jarzbek,
[supra]`, `[supra at 78-82]`. None of these tokenized — all returned
  `[]`. Surfaced by the 200-opinion modern-era sweep as a systematic
  recall gap for Connecticut citation extraction.

  ### Fix

  Added a new tokenizer pattern `BRACKETED_SUPRA_PATTERN` to
  `src/patterns/shortForm.ts`:

  ```regex
  (?:\b([A-Z]...)\s*,?\s+)?\[supra(?:(?:,\s+|\s+at\s+(?:pp?\.\s*)?)(\d+(?:[-–—]\d+)?))?\]
  ```

  Captures:

  - Group 1: party name (optional — undefined for the bare standalone
    `[supra at N]` form)
  - Group 2: pincite (optional, accepts both Connecticut's `, N` form
    and the canonical `at N` form, plus range `N-M`)

  The bracket-comma pincite shape `[supra, 705]` deliberately accepts
  no `at` before the page — that's the Connecticut convention.

  `extractSupra` adds a fast-path branch that recognizes bracketed
  token text (via `text.includes("[supra")`) and parses it through the
  new regex. Falls through to the canonical `partySupraRegex` for
  non-bracketed forms — zero impact on existing supra extraction.

  ### Tests

  4 new tests under `bracketed [supra] forms (#306)` in
  `tests/extract/extractShortForms.test.ts`:

  - `State v. Jarzbek, [supra, 705]` → partyName + pincite
  - `State v. Jarzbek, [supra]` → partyName, no pincite
  - `[supra at 78-82]` → no partyName, pincite 78 (range start)
  - Regression: `Smith, supra, at 100` continues to work

  Updated the pattern-count test in `tests/patterns/shortForm.test.ts`
  from "all five patterns" → "all six patterns".

  Full 2448-test suite passes; no regressions.

- [#319](https://github.com/medelman17/eyecite-ts/pull/319) [`bddb55f`](https://github.com/medelman17/eyecite-ts/commit/bddb55f8b7240e0c1ef7e16e586810e334677b96) Thanks [@medelman17](https://github.com/medelman17)! - fix: `, fn. 3` California footnote variant + neutral-cite paragraph pincites (#311 partial)

  #311 surfaces four independent pincite-extraction gaps. This PR
  addresses two of them; the other two are deferred (see scope notes).

  ### Fixed in this PR

  **Sub-bug 3 — `, fn. 3` California footnote variant.**
  `Smith v. Jones, 45 Cal.3d 744, 768, fn. 3` previously captured
  `pincite: 768` but dropped the footnote reference. The canonical
  `768 n.3` form already captured the footnote — only the
  California-Style-Manual-style `, fn. 3` variant (comma instead of
  whitespace separator, `fn.` instead of `n.`) missed.

  Extended:

  - `LOOKAHEAD_PINCITE_REGEX` (case-cite lookahead in `extractCase.ts`):
    footnote-suffix separator accepts `\s+` or `,\s+`; alternation
    includes `fn` / `fns` alongside `n` / `nn` / `note`.
  - `PINCITE_PARSE_REGEX` (structured pincite parser in `pincite.ts`):
    same comma-or-space separator + `fn`/`fns` alternation.

  `Smith v. Jones, 45 Cal.3d 744, 768, fn. 3` → `pincite: 768, footnote: 3`.
  `, fns. 3-5` multi-footnote ranges also captured.

  **Sub-bug 4 — neutral-cite paragraph pincites.**
  `State v. Flores, 2015-NMCA-072, ¶ 2` previously captured the neutral
  cite but `pincite` and `pinciteInfo` were both undefined. State
  appellate practice universally uses paragraph numbering (`¶ N`) instead
  of page numbers on neutral cites; missing them was a systematic recall
  floor.

  Extended `NEUTRAL_PINCITE_LOOKAHEAD` in `extractNeutral.ts` to accept
  the paragraph alternatives `¶¶? \d+(?:-\d+)?` / `paras?\.? \d+(?:-\d+)?`
  already used by the case-cite lookahead (#204). Also added a fallback
  in the extractor: `pincite = pinciteInfo?.page ?? pinciteInfo?.paragraph`
  so the top-level numeric `pincite` field reflects the paragraph number
  when no page is available.

  `2015-NMCA-072, ¶ 2` → `pincite: 2`, `pinciteInfo: { paragraph: 2 }`.
  `2015-NMCA-072, ¶¶ 14-16` → `pincite: 14`, `pinciteInfo: { paragraph:
14, endParagraph: 16, isRange: true }`.

  ### Intentionally deferred (separate follow-up PRs)

  **Sub-bug 1 — page ranges in citation core (`109 N.E. 875-877`).** The
  state-reporter tokenizer regex requires a single digit run for the
  page, so `875-877` overflows the page slot and the citation isn't
  extracted at all. Fixing requires changing the tokenizer's page
  capture (`\d+` → `\d+(?:-\d+)?`) AND threading range parsing through
  the downstream pipeline. Larger, riskier change.

  **Sub-bug 2 — CSM `pp. 238, 233` multi-page list.** `462 U.S. at pp.
238, 233` captures only the first pincite. The existing
  `ADDITIONAL_PINCITE_REGEX` (added in #247 for `113, 115, 153` chains)
  doesn't fire on the `pp.`-prefixed short-form path. Requires
  identifying the additional-pincite entry point on short-form cites
  and extending it.

  ### Tests

  - 2 new tests in `tests/extract/pincite.test.ts`: California footnote
    variants `768, fn. 3` and `768, fns. 3-5`.
  - 3 new tests in `tests/extract/extractCase.test.ts` under
    `California \`, fn. 3\` footnote pincite variant (#311)`: case-cite
    integration + multi-footnote + regression baseline.
  - 3 new tests in `tests/extract/extractNeutralHyphenated.test.ts`
    under `paragraph pincite on neutral cites (#311)`: single
    paragraph, paragraph range, regression baseline for database
    cites.

  Full 2456-test suite passes; no regressions.

## 0.15.2

### Patch Changes

- [#291](https://github.com/medelman17/eyecite-ts/pull/291) [`c03cb76`](https://github.com/medelman17/eyecite-ts/commit/c03cb76acc7796d07c9ffec2e85da365c54056f7) Thanks [@medelman17](https://github.com/medelman17)! - fix: propagate `caseName` from primary to parallel-cite secondaries (#282)

  For parallel reporter citations like `Roe v. Wade, 410 U.S. 113, 93 S. Ct. 705,
35 L. Ed. 2d 147 (1973)`, only the primary cite carried the shared caption;
  the secondaries had `caseName === undefined` even though they refer to the
  same case. The disambiguation fix in #281 prevented secondaries from leaking
  the prior reporter cite into their own caseName — this PR fills in the
  correct caption rather than `undefined`.

  ### Root cause

  `detectParallelCitations` already populates the shared `groupId` on every
  cite in a group and the `parallelCitations` array on the primary, but no
  pass propagates the caption metadata. The per-cite case-name scanner only
  runs for cites that have a directly preceding caption — by construction
  only the first cite in the group does.

  ### Fix

  Added `inheritParallelCaseName` (modeled on the existing
  `inheritSubsequentHistoryCaseName` pass for #224 history-chain children).
  Runs at "Step 4.6" in `extractCitations`, immediately after the
  subsequent-history inheritance pass so a primary that inherited from a
  history chain root still flows that caption to its parallels.

  Joins on `groupId`, takes the first cite per group that has a `caseName`
  (the primary by construction), and copies `caseName`, `plaintiff`,
  `defendant`, `plaintiffNormalized`, `defendantNormalized`, and
  `proceduralPrefix` onto every other cite in the same group. Does not
  overwrite an existing `caseName` on a secondary (defensive — shouldn't
  happen, but pinned by test). Does not touch `spans` or `fullSpan` — the
  secondary's own citation core is unchanged.

  ### Tests

  4 new tests under `Parallel Citation caseName Propagation (#282)` in
  `tests/integration/fullPipeline.test.ts`:

  - Roe v. Wade (3 reporters) — all 3 cites carry `Roe v. Wade` + `Roe` / `Wade`
  - Nixon v. Nixon (2 reporters)
  - People v. Smith (California bracketed parallel: `(2001) 24 Cal.4th 849
[102 Cal.Rptr.2d 731]`)
  - Single non-parallel cite — baseline that propagation doesn't touch
    cites without a `groupId`

  Full 2372-test suite passes; no regressions.

- [#297](https://github.com/medelman17/eyecite-ts/pull/297) [`5b68534`](https://github.com/medelman17/eyecite-ts/commit/5b685345d6422d7856406f9d8e22162eaa724ff4) Thanks [@medelman17](https://github.com/medelman17)! - feat: extract year (and optional publisher) from trailing parenthetical on statute citations (#285)

  A statute citation followed by `(YYYY)` or `(Publisher YYYY)` —
  `HRS § 91-14(a) (1985)`, `42 U.S.C. § 1983 (1976)`,
  `28 U.S.C. § 1331 (West 2018)` — now carries the year-of-edition (and
  publisher when present) on the `StatuteCitation` object.

  ### Why

  Code editions matter for statutory interpretation: a 2010 edition of NMSA
  § 38-3-3 may codify a different version than the 2020 edition. Without
  `year`, downstream consumers can't distinguish citations to different
  editions of the same section or render the citation in canonical
  Bluebook form. Surfaced as the second-largest finding bucket
  (79 instances) in the 200-opinion spectrum sweep behind #281.

  ### Fix

  Added a new post-pass `attachStatuteYearParen` in
  `src/extract/extractCitations.ts` (Step 4.65, immediately after the
  `#282` parallel-caseName inheritance pass). For each statute citation,
  it scans the cleaned text starting at `span.cleanEnd` for an optional
  year-of-edition parenthetical:

  ```
  ^\s*(?:,\s*(?:at\s+)?\d+(?:-\d+)?\s*)?\(\s*([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)?\s*(\d{4})\s*\)
  ```

  The body is anchored on `\d{4}` so a trailing subsection paren like
  `(a)` or `(1)` is never confused for a year. An optional capitalized
  publisher word (`West`, `Lexis`, `Lexis Nexis`) is captured before the
  year.

  The new fields `year?: number` and `publisher?: string` were added to
  the `StatuteCitation` interface in `src/types/citation.ts`. Behavior is
  purely additive — citations without a trailing year paren still have
  `year === undefined` (no regressions).

  ### Scope notes

  - **`NMSA 1978, § 38-3-3 (2010)`** — the leading `1978` of `NMSA 1978`
    is currently misparsed by the named-code tokenizer (it claims `1978`
    as the section). That's a separate tokenizer bug; this PR does not
    fix it. The year-paren post-pass would still apply once the
    tokenizer correctly identifies the citation core.
  - **`8 CCAR 28 (07-22-05)`** — tribal court reporter not yet in any
    tokenizer pattern; out of scope.
  - The matchedText and span are intentionally **not** extended to
    include the trailing paren — only the metadata fields are populated.
    Consumers that need full extent can pair with `fullSpan` once that
    field is generalized to statutes.

  ### Tests

  7 new tests under `year-of-edition parenthetical (#285)` in
  `tests/extract/extractStatute.test.ts`:

  - `42 U.S.C. § 1983 (1976)` → `year: 1976`
  - `28 U.S.C. § 1331 (West 2018)` → `year: 2018`, `publisher: "West"`
  - `HRS § 91-14(a) (1985)` → `subsection: "(a)"`, `year: 1985`
  - `HRS § 91-14 (1985)` (no subsection) → `year: 1985`
  - `42 U.S.C. § 1983(a)(2)` (subsection only) → no year (defensive)
  - `42 U.S.C. § 1983` (no paren) → no year (regression baseline)
  - String-cite `§ 1983; § 1331 (West 2018)` — year attaches only to
    the second cite (the one the paren directly follows)

  Full 2379-test suite passes; no regressions.

- [#298](https://github.com/medelman17/eyecite-ts/pull/298) [`ebcfb82`](https://github.com/medelman17/eyecite-ts/commit/ebcfb82f59854aa3cc3968543702cf067462fc66) Thanks [@medelman17](https://github.com/medelman17)! - fix: extract court from CSM year-first parenthetical `(court year)` (#293)

  California Style Manual citations place the court+year parenthetical
  **before** the volume-reporter-page rather than after:
  `Camden I Condominium Assn. v. Dunkle (11th Cir. 1991) 946 F.2d 768`.
  The existing year-first machinery (#19) captured the year but dropped
  the court — `court` ended up `undefined` even though `(11th Cir. ...)`
  explicitly states it.

  Surfaced by a 200-opinion modern-era sweep as the **largest** field-
  extraction gap (195 instances) — California opinions are the largest
  single-jurisdiction body of US case law and use CSM almost universally,
  so federal cites within California opinions show this pattern dozens of
  times per opinion.

  ### Fix

  Two pieces:

  1. `V_CASE_NAME_REGEX` and `PROCEDURAL_PREFIX_REGEX` now accept an
     optional court prefix inside the CSM trailing paren:
     `\((?:([^)]*?\.[^)]*?)\s+)?(\d{4})\)`. The court text must contain
     a period so loose forms like `(March 1991)` aren't mis-attributed as
     courts — Bluebook T7 court abbreviations all contain at least one
     period. Group 3 = court (optional), group 4 = year.
  2. Both consumer sites build a `precedingDocketMeta` payload when both
     court and year are captured. The existing Louisiana-docket meta
     handler at the consumer end (`extractCase.ts` line ~2502) already
     propagates `precedingDocketMeta.court` onto the citation as
     fallback when no trailing court paren is present.

  Year-only CSM (`In re K.F. (2009)`) continues to work via the dedicated
  `year`/`yearStart`/`yearEnd` fields — unchanged for that path. Trailing-
  paren form still wins when both forms are present (defensive — extremely
  rare in practice).

  ### Tests

  5 new tests under `CSM year-first with court (#293)` in
  `tests/extract/extractCase.test.ts`:

  - `(11th Cir. 1991)` in v. form — court="11th Cir.", year=1991
  - `(2d Cir. 2005)` in v. form
  - `(9th Cir. 2014)` in procedural-prefix form
  - Year-only `(2013)` — court undefined, no regression
  - Year-only procedural prefix `In re K.F. (2009)` — court undefined,
    no regression

  Full 2384-test suite passes; no regressions.

- [#299](https://github.com/medelman17/eyecite-ts/pull/299) [`6f379c6`](https://github.com/medelman17/eyecite-ts/commit/6f379c66c629d86c1bbe3d8bc62f3957d396f056) Thanks [@medelman17](https://github.com/medelman17)! - fix: route WL/LEXIS to `database`, recover real court from trailing paren on neutral cites (#294)

  Westlaw and Lexis database cites — `2001 WL 1077846`,
  `2014 WL 1924465 (Tex. App. May 8, 2014)`, `2021 U.S. App. LEXIS 12345`
  — were storing the database identifier in the `court` field
  (`court: "WL"`, `court: "U.S. App. LEXIS"`). Downstream consumers
  treating `court` as a court abbreviation got back a static database tag.
  For the form `2014 WL 1924465 (Tex. App. May 8, 2014)` the _real_
  court (`Tex. App.`) was in the trailing paren and dropped entirely.

  ### Type changes (additive but field-shape-breaking for WL/LEXIS)

  `NeutralCitation` now has two new optional fields:

  - `database?: string` — for vendor-database identifiers (`WL`, `LEXIS` /
    `U.S. LEXIS` / `Fed. App. LEXIS`, `BL`).
  - `date?: StructuredDate` — for the parsed decision date recovered from
    a trailing `(court date)` parenthetical.

  `court` is now `string | undefined` (was `string`). For Westlaw/Lexis
  cites this field is now `undefined` instead of `"WL"`/`"LEXIS"` — any
  consumer that compared `c.court === "WL"` needs to check `c.database`
  instead. Real jurisdictional neutral cites (`2008-Ohio-4571`,
  `2013 IL 112116`) still populate `court` and leave `database` undefined.

  ### Fix

  In `src/extract/extractNeutral.ts`:

  - New helper `isDatabaseIdentifier(s)` returns true for `WL`, `BL`, or
    any string containing a `LEXIS` word boundary.
  - After the existing year/court/documentNumber parse, if the captured
    middle segment is a database identifier, move it to `database` and
    set `court = undefined` (also clears `spans.court` since the database
    tag's position is meaningless as a court span).
  - When `database` is set, a new lookahead pattern
    `NEUTRAL_PAREN_LOOKAHEAD` scans the cleaned text after the citation
    core for an optional `(court date)` parenthetical (allowing an
    intervening `, at *N` pincite). The captured paren is passed to
    the existing `parseParenthetical` helper from `extractCase`, which
    produces a `{ court, date }` result wired onto the citation.

  ### Scope notes (intentionally NOT addressed here)

  - The pincite-as-volume bug on neutral/Id. citation paths in string-cite
    chains (`2008-Ohio-4571, 894 N.E.2d ...` → pincite=894 from the next
    cite's volume) is the same architectural shape as #281 and deserves
    its own PR — that fix requires plumbing sibling-span data into
    `extractNeutral` / `extractId`.

  ### Tests

  5 new tests under `database identifier routing + trailing court paren
(#294)` in `tests/extract/extractNeutralHyphenated.test.ts`:

  - WL cite with trailing `(N.D. Cal. Sept. 4, 2001)` paren
  - U.S. LEXIS cite with trailing `(1st Cir. Aug. 30, 2001)` paren
  - Bare WL cite (no paren) — `database: "WL"`, `court: undefined`
  - WL cite with full date in trailing paren — `date.iso: "2014-05-08"`
  - Real jurisdictional `Ohio`/`IL` neutrals — still populate `court`,
    not `database`

  Migrated 17 existing test/fixture assertions from `court: "WL"` /
  `court: "U.S. App. LEXIS"` to `database` (covers state LEXIS variants
  in `extractLexisStateVariants.test.ts`, `extractOthers.test.ts`,
  `componentSpans.others.test.ts`, `fullPipeline.test.ts`, and the
  golden/expanded/thorny corpus JSON fixtures).

  Full 2389-test suite passes; no regressions.

- [#300](https://github.com/medelman17/eyecite-ts/pull/300) [`70e1dc5`](https://github.com/medelman17/eyecite-ts/commit/70e1dc531c9d9d1484b5fc5ea7c77d5328b1d840) Thanks [@medelman17](https://github.com/medelman17)! - feat: extract California bare-code statute citations (`Pen. Code § 148`, `Code Civ. Proc., § 1021.5`) (#296)

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

## 0.15.1

### Patch Changes

- [#286](https://github.com/medelman17/eyecite-ts/pull/286) [`0ea9a01`](https://github.com/medelman17/eyecite-ts/commit/0ea9a01a95a9e2b5b56a56d17e22c576f3df98f7) Thanks [@medelman17](https://github.com/medelman17)! - fix: statute `section` field no longer absorbs the sentence-ending period (#283)

  When a statute citation was the last token of a sentence — `17 P.S. § 91.`,
  `Ariz. Rev. Stat. Ann. § 16-141.`, `N.Y. Election Law § 131.`, `M.G.L. c. 93A, § 2.`
  — the section-body regex greedily consumed the trailing period, producing
  `section: "91."` / `"16-141."` / `"131."` / `"2."`. The contamination also
  extended into `matchedText`, breaking exact-match equality, deduplication
  against canonical statute references, and offset-based annotation.

  ### Root cause

  Three tokenizer regexes used a section-body character class that included
  `.` directly (`[A-Za-z0-9.:/-]*` and `[\w./-]+`):

  - `abbreviated-code` in `src/data/stateStatutes.ts` (most states)
  - `named-code` in `src/patterns/statutePatterns.ts` (NY/CA/TX/MD/VA/AL)
  - `mass-chapter` in `src/patterns/statutePatterns.ts` (MA)

  USC and CFR patterns were unaffected because their classes already
  excluded `.` (CFR uses the safer `\d+(?:\.\d+)?[A-Za-z0-9-]*` shape).

  ### Fix

  Replaced the period-permissive class with a guarded alternation:

  ```
  (?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*
  ```

  A period is only consumed when followed by an alphanumeric character
  (positive lookahead). Internal decimals (`226.5`, `17.46`, `1.5(a)`) and
  hyphenated sections (`16-141`, `39-13-101`) are preserved unchanged;
  a terminal period followed by end-of-string or whitespace is left for the
  sentence to keep. Same fix applied to `ABBREVIATED_RE` in
  `extractAbbreviated.ts` as defense in depth at the secondary parser.

  ### Tests

  7 new tests under `sentence-ending period boundary (#283)` in
  `tests/extract/extractStatute.test.ts` covering the four pattern families,
  internal-decimal preservation, and mid-sentence regression baselines. Full
  2353-test suite passes with no regressions.

- [#289](https://github.com/medelman17/eyecite-ts/pull/289) [`3a4a600`](https://github.com/medelman17/eyecite-ts/commit/3a4a6006a31a659c7af7e1a233491fd10f3a61cd) Thanks [@medelman17](https://github.com/medelman17)! - fix: spaced statute code abbreviations (`42 U. S. C.`, `29 C. F. R.`) now extract correctly (#284)

  Historical and OCR'd legal text — pre-1990 Supreme Court opinions, scanned PACER
  PDFs, Harvard CAP corpus — writes federal code abbreviations with spaces
  between the letters: `42 U. S. C. § 1973`, `29 C. F. R. § 1604.11`. The
  clean-pipeline normalization handled 2-letter case-cite abbreviations
  (`U.S.`, `S.Ct.`, `L.Ed.`, `F.Supp.`) but had no rules for the 3-letter
  code abbreviations, so spaced statute citations were silently dropped by
  the tokenizer.

  ### Root cause

  `normalizeReporterSpacing` in `src/clean/cleaners.ts` had only 2-letter
  rules. For `42 U. S. C. § 1983` the existing `U. S. → U.S.` rule fired
  but left a dangling `C.`: `42 U.S. C. § 1983`. The statute tokenizer
  expects the literal `U.S.C.` shape and could not match the
  partially-normalized form, so the citation was dropped entirely (no
  fallback, no signal that a citation existed).

  ### Fix

  Added two targeted rules placed _before_ the existing 2-letter ones so
  the full 3-letter shape collapses in one pass on every spacing variant:

  ```
  \bU\.\s*S\.\s*C\.  →  U.S.C.
  \bC\.\s*F\.\s*R\.  →  C.F.R.
  ```

  `\s*` (zero or more, not `\s+`) so the rules also act as idempotent
  canonicalizers on already-compact input and on partial forms like
  `U.S. C.` and `U. S.C.`. The lookahead bound is implicit — the trailing
  `C.` / `R.` literal prevents `U. S.` (case-cite) from being intercepted.

  ### Tests

  - 7 new tests under `three-letter code abbreviations (#284)` in
    `tests/clean/reporterSpacing.test.ts`: fully-spaced, partially-spaced
    (both directions), canonical idempotency, and a non-interception check
    for `410 U. S. 113` case cites.
  - 5 new tests under `spaced code abbreviations (#284)` in
    `tests/extract/extractStatute.test.ts`: end-to-end extraction through
    the full `extractCitations` pipeline, including subsection capture
    (`29 U. S. C. § 158(a)(3)`).

  Full 2365-test suite passes; no regressions.

- [#290](https://github.com/medelman17/eyecite-ts/pull/290) [`96806ca`](https://github.com/medelman17/eyecite-ts/commit/96806ca519b7b948a6b4b1ef7defb8af011dc3aa) Thanks [@medelman17](https://github.com/medelman17)! - fix: add `Vil.` and `Enters.` to case-name abbreviation set (#288)

  `extractCitations` truncated `caseName` when a party name contained `Vil.`
  (the NY-court single-L variant of Bluebook `Vill.` for "Village"). The
  case-name scanback treated the `.` as a sentence terminator and restarted
  the case-name candidate after it — captions like
  `Bristol Harbour Vil. Assn., Inc.` (NY 4th Dep't) and
  `Smithtown Vil. Bd.` truncated to `"Assn., Inc."` and `"Bd."`
  respectively. The Bluebook double-L `Vill.` was already in the
  abbreviation set and worked correctly, confirming a missing-variant gap
  rather than a structural scanback issue.

  ### Fix

  Added two entries to `CASE_NAME_ABBREVS` in `src/extract/extractCase.ts`:

  - **`vil`** — Bluebook T6 `Vill.` variant used by NY Reporter / Slip
    Opinion captions, especially 4th Dep't. Placed alongside the existing
    state-practice gap `"tp"` (NJ alternative to `Twp.` for "Township"),
    with the same comment-block style.
  - **`enters`** — Bluebook T6 plural of `Enter.` (Enterprises). Surfaced
    by the same issue's first repro case (`Fields Enters. Inc. v. Bristol
Harbour Vil. Assn., Inc.`) — once the `Vil.` gap was fixed, the
    scanback still truncated at the `Enters.` boundary, revealing a
    separate but identically-shaped missing-stem gap. Placed next to the
    existing singular `"enter"`.

  No regex changes; both additions are single-stem entries in the existing
  set.

  ### Tests

  Three new tests in `tests/extract/extractCase.test.ts` under the
  existing `case name boundary bugs` block:

  - `#288: handles Vil. in Bristol Harbour Vil. Assn., Inc. (4th Dep't)`
    — full caption with both `Enters.` and `Vil.` abbreviations.
  - `#288: handles Smithtown Vil. Bd.` — `Vil.` in isolation.
  - `#288: regression — Bluebook Vill. still works` — guards against
    accidental change to the canonical double-L form.

  Full 2368-test suite passes; no regressions.

## 0.15.0

### Minor Changes

- [#279](https://github.com/medelman17/eyecite-ts/pull/279) [`aa8f33c`](https://github.com/medelman17/eyecite-ts/commit/aa8f33c006e03637217787d627fd812d51f42f11) Thanks [@medelman17](https://github.com/medelman17)! - feat: short-form case back-reference party name + resolver disambiguation (#278)

  Bluebook short-forms commonly include a leading back-reference name
  (`Smith, 500 F.2d at 125`). Previously the tokenizer recognized only the bare
  `vol reporter at page` form, dropping the disambiguating name. The resolver
  then matched purely on volume + reporter, so when two earlier full citations
  shared those values the short-form silently resolved to the wrong antecedent.

  ### Changes

  - **`ShortFormCaseCitation`** gains `partyName?: string` and
    `partyNameNormalized?: string` mirroring `SupraCitation.partyName`.
  - **`SHORT_FORM_CASE_PATTERN`** (tokenizer) and the local `shortFormRegex`
    (extractor) now accept an optional leading `[A-Z][a-zA-Z''\-]+(\s+v\.?\s+|\s+)...,\s+`
    party-name segment before the volume. Group order shifts:
    `1 = partyName? | 2 = volume | 3 = reporter | 4 = pincite`.
  - **`extractShortFormCase`** runs the captured raw party name through
    `stripSupraPartyPrefix` (#216 helper) so leading citation signals
    (`See`, `Cf.`, `Compare`, etc.) and sentence-initial connectors (`Then`,
    `Also`, `In` but not `In re`) are stripped before assignment.
  - **`resolveShortFormCase`** collects all backward in-scope candidates that
    match volume + reporter. When `partyNameNormalized` is set, it prefers
    the candidate whose plaintiff or defendant normalized name overlaps
    (substring containment in either direction tolerates abbreviation
    patterns); recency breaks ties. Bare short-forms (no party name) continue
    to fall back to recency — no regression.

  Disambiguated short-forms get confidence 0.98 (vs. 0.95 for vol+reporter-only
  matches) because the additional party-name constraint tightens the match.

  ### Tests

  6 new tests under `short-form case party-name back-reference (#278)`:

  - **Regex captures** (4): bare form, `Smith,`, `See Smith,` (signal strip),
    `Smith v. Jones,`.
  - **Resolver disambiguation** (2): two cases share vol+reporter →
    party-named short-form picks the right one; bare short-form falls back to
    recency.

  Pattern-level tests in `tests/patterns/shortForm.test.ts` were updated to
  the new group order; one new test confirms the optional partyName group.

### Patch Changes

- [#281](https://github.com/medelman17/eyecite-ts/pull/281) [`0c6e1ff`](https://github.com/medelman17/eyecite-ts/commit/0c6e1ff667bf2ba1ef5772b8d24aca7a2c3d421f) Thanks [@medelman17](https://github.com/medelman17)! - fix: parallel-cite volume mistakenly consumed as pincite + lost year/caseName on parallel chains

  When a primary cite was followed by a comma-separated parallel cite —
  e.g., `Nixon v. Nixon, 329 Pa. 256, 198 A. 154 (1938)` or Roe's three-reporter
  `410 U.S. 113, 93 S. Ct. 705, 35 L. Ed. 2d 147 (1973)` — the volume of the
  parallel cite (`198`, `93`, `35`) was greedily matched by
  `LOOKAHEAD_PINCITE_REGEX` as a pincite for the first cite. Downstream effects:

  - The first cite's trailing year parenthetical was unreachable (hidden behind
    the parallel cite), leaving `year` undefined.
  - The case-name backward walk for a parallel cite started at its own position
    and walked unbounded, scooping the prior reporter cite into its `caseName`
    (e.g., `Nixon v. Nixon, 329 Pa. 256`).

  ### Fix (two layers)

  **(A) Pincite regex disambiguation.** `LOOKAHEAD_PINCITE_REGEX` and
  `ADDITIONAL_PINCITE_REGEX` now require the captured pincite to terminate at
  end-of-string, sentence punctuation, paren/bracket close, or whitespace NOT
  followed by a capital letter. `, 198 A.` no longer matches (capital `A`
  starts a parallel reporter); `, 117 (1973)` still does; bracketed pincites
  `[266 Cal.Rptr. 569, 575]` still terminate cleanly on `]`.

  **(B) Span-aware extraction.** `extractCase` now receives the spans of
  sibling case-citation tokens and uses them to:

  - Skip past a contiguous parallel-cite chain (separated only by commas,
    whitespace, and digit/dash runs for intervening pincites) when searching
    for the shared trailing year parenthetical — both in the look-ahead paren
    scan and in `collectParentheticals` so `fullSpan` extends through the
    shared paren.
  - Bound the case-name backward walk by the prior sibling's end so a parallel
    cite cannot absorb the preceding reporter cite's text into its caseName.
  - Populate `fullSpan` on secondary parallel cites (which have no captured
    caseName) when a close preceding sibling indicates a parallel chain, so
    string-citation grouping and downstream span consumers see the full
    citation extent through the shared trailing paren.

  ### Tests

  9 new tests under `parallel-cite pincite disambiguation (regression)` in
  `tests/extract/extractCase.test.ts`:

  - **Two-reporter parallel** (`329 Pa. 256, 198 A. 154 (1938)`): no false
    pincite on the first cite; both cites get `year=1938`; the second cite's
    `caseName` does not leak the first reporter cite.
  - **Three-reporter parallel** (Roe v. Wade): no false pincites on any of
    the three cites; all three get `year=1973`.
  - **Pincite WITH following parallel** (`410 U.S. 113, 117, 93 S. Ct. 705
(1973)`): the real pincite `117` is captured; no additional false pincite
    from the parallel volume; the first cite still gets `year=1973`.
  - **Multi-discrete pincite regression** (`410 U.S. 113, 115, 153 (1973)`):
    the #247 feature continues to work — `pincite=115`,
    `additionalPincites=[{page: 153}]`, `year=1973`.

  Full 2346-test suite passes including the existing California bracketed
  parallel pincite test (`[266 Cal.Rptr. 569, 575]`) and the string-citation
  grouping integration test that depends on `fullSpan` extending through the
  shared trailing paren.

## 0.14.0

### Minor Changes

- [#275](https://github.com/medelman17/eyecite-ts/pull/275) [`feb1ee8`](https://github.com/medelman17/eyecite-ts/commit/feb1ee8a6c4a3dde94a7bd3ee57e7441d542a6dc) Thanks [@medelman17](https://github.com/medelman17)! - feat: paragraph-marker pincites — `¶ N`, `¶¶ N-M`, `para. N`, `paras. N-M` (#204)

  Paragraph-marker pincites are the standard form for NY Slip Op, Canadian
  neutrals, and other paragraph-numbered opinion sources. `Doe v. Roe, 45 NY2d
101, ¶¶ 12-14 (1978)` previously produced a citation with `pinciteInfo`
  undefined; it now yields `{ paragraph: 12, endParagraph: 14, isRange: true,
raw: "¶¶ 12-14" }`.

  ### Schema changes (`PinciteInfo`)

  - `page` is now `number | undefined` (was required `number`). Paragraph-only
    pincites leave `page` undefined.
  - New: `paragraph?: number`, `endParagraph?: number`.

  The top-level convenience `pincite` field on the citation continues to mirror
  `page` only, so it stays undefined for paragraph-only pincites. Consumers
  that need paragraph data read `pinciteInfo.paragraph` / `pinciteInfo.endParagraph`.

  ### Coverage

  - Full case (lookahead from citation core): `45 NY2d 101, ¶ 12`,
    `45 NY2d 101, ¶¶ 12-14`, `45 NY2d 101, para. 12`,
    `45 NY2d 101, paras. 12-14`
  - Id.: `Id. ¶ 12`, `Id. at ¶ 12`, `Id. ¶¶ 12-14`
  - Supra: `Smith, supra, ¶ 12`, `Smith, supra, at ¶ 12`,
    `Smith, supra, paras. 12-14`
  - `parsePincite` recognizes raw input directly.

  Regex zoo updated across `LOOKAHEAD_PINCITE_REGEX`, `PINCITE_SKIP_REGEX`,
  `ID_PATTERN`, `IBID_PATTERN`, `SUPRA_PATTERN`, `STANDALONE_SUPRA_PATTERN`,
  `SHORT_FORM_CASE_PATTERN`, and the four local copies in
  `extractShortForms.ts`. Paragraph forms allow `at` to be optional (lookahead-
  only on the marker); page forms still require `at` or the existing comma form.

- [#276](https://github.com/medelman17/eyecite-ts/pull/276) [`522c6a1`](https://github.com/medelman17/eyecite-ts/commit/522c6a1d17a6d19dae2102eea5081bcce83adb5e) Thanks [@medelman17](https://github.com/medelman17)! - feat: capture multiple discrete pincites (`113, 115, 153`) (#247)

  `Roe v. Wade, 410 U.S. 113, 115, 153 (1973)` previously dropped the `153`
  pincite — only the first comma-separated pincite survived. `PinciteInfo` now
  carries an optional `additionalPincites: PinciteInfo[]` array; the primary
  pincite continues to live in `page` / `endPage` / `paragraph` etc. (no API
  break) and subsequent pincites accumulate as nested entries that each preserve
  their own range / footnote / star-page semantics.

  ### Coverage

  - `, 115, 153` → primary `page: 115`, additional `[{ page: 153 }]`
  - `, 105, 110, 120` → primary + 2 additional
  - Mixed range+discrete: `, 105-110, 120` → primary has `endPage: 110`,
    additional `[{ page: 120 }]`
  - Discrete+range: `, 115, 105-110` → primary `page: 115`, additional has
    range info preserved

  ### API

  - New: `pinciteInfo.additionalPincites?: PinciteInfo[]`.
  - The top-level convenience `citation.pincite: number` continues to mirror
    only the primary pincite — consumers needing all pincites read the
    `additionalPincites` array.

  Implementation: after `LOOKAHEAD_PINCITE_REGEX` captures the primary pincite,
  a small loop matches a new `ADDITIONAL_PINCITE_REGEX` (comma + page form)
  repeatedly from the scan position, parsing each via `parsePincite` and
  appending to `additionalPincites`.

### Patch Changes

- [#267](https://github.com/medelman17/eyecite-ts/pull/267) [`f3b4dc9`](https://github.com/medelman17/eyecite-ts/commit/f3b4dc99f6c1526eef46ad09865434041a336a93) Thanks [@medelman17](https://github.com/medelman17)! - fix: bankruptcy adversary `(In re X)` admin parenthetical cleanup (#241)

  In bankruptcy adversary proceedings, the case caption includes an administrative parenthetical naming the underlying debtor:

  ```text
  Spence v. Hintze (In re Hintze), 570 B.R. 369 (Bankr. D. Mass. 2017)
  ```

  **Finding:** the acceptance criteria from the issue were already satisfied by the existing parser — `caseName` preserves `(In re Hintze)`, `court` and `year` are correct, `fullSpan` covers the entire caption. The bug surfaced as a quality issue: the `defendant` field carried the admin parenthetical (`"Hintze (In re Hintze)"`), which polluted downstream consumers and `defendantNormalized`.

  **Improvement:** the trailing `(In re <Debtor>)` is now stripped off the `defendant` field and exposed via a new `adminParenthetical?: string` field. The `caseName` continues to preserve the full caption text (including the admin paren) via the case-name rebuild step.

  Example output for `Spence v. Hintze (In re Hintze), 570 B.R. 369 (Bankr. D. Mass. 2017)`:

  | Field                 | Before                              | After                               |
  | --------------------- | ----------------------------------- | ----------------------------------- |
  | `caseName`            | `"Spence v. Hintze (In re Hintze)"` | `"Spence v. Hintze (In re Hintze)"` |
  | `plaintiff`           | `"Spence"`                          | `"Spence"`                          |
  | `defendant`           | `"Hintze (In re Hintze)"`           | `"Hintze"`                          |
  | `defendantNormalized` | `"hintze (in re hintze)"`           | `"hintze"`                          |
  | `adminParenthetical`  | —                                   | `"In re Hintze"`                    |
  | `court`               | `"Bankr. D. Mass."`                 | `"Bankr. D. Mass."`                 |
  | `year`                | 2017                                | 2017                                |

  Adds 7 regression tests: 2 acceptance-criteria assertions (caseName preservation + fullSpan + non-regression in explanatory parens), 3 cleanup assertions (defendant strip, compound debtor name, hyphenated debtor name), 2 regression controls confirming non-bankruptcy parens don't trigger admin-paren handling.

- [#268](https://github.com/medelman17/eyecite-ts/pull/268) [`a9b3128`](https://github.com/medelman17/eyecite-ts/commit/a9b31283a345f46a132f820ec1c3ad8274269969) Thanks [@medelman17](https://github.com/medelman17)! - fix: California bracketed parallel citations `[266 Cal.Rptr. 569]` now extract and link (#237)

  California Style Manual wraps parallel reporter citations in brackets rather than placing them after a comma:

  ```text
  Smith v. Jones, 50 Cal.3d 100 (Cal. 1990) [266 Cal.Rptr. 569]
  ```

  Pre-fix, the bracketed cite either fell through to the journal pattern (wrong type) or failed to tokenize entirely. `detectParallel.ts` required a comma + shared parenthetical between citations to link them, so even when both extracted, they weren't recognized as parallels.

  Two coordinated changes:

  1. **`state-reporter` trailing lookahead** extended from `(?=\s|$|\(|,|;|\.|\[)` to `(?=\s|$|\(|,|;|\.|\[|\])` so a bracketed-end-of-citation pattern (`<vol> <Reporter> <page>` followed by `]`) tokenizes correctly. Without this, the broader journal pattern absorbed the citation with the wrong type.
  2. **CA bracket-mode parallel detection** added to `detectParallel.ts` ahead of the comma-requirement gate. When the gap text between two adjacent case citations contains `[` and the secondary citation is immediately followed by `]`, the pair is treated as a parallel — no shared-paren requirement (CA cites often have a `(<year>)` paren _between_ the primary and the bracket, which would otherwise trip the existing separate-parens rejection).

  Example output for `Smith v. Jones, 50 Cal.3d 100 (Cal. 1990) [266 Cal.Rptr. 569]`:

  | Citation  | volume | reporter    | page | groupId                |
  | --------- | ------ | ----------- | ---- | ---------------------- |
  | Primary   | 50     | `Cal.3d`    | 100  | `50-Cal.3d-100`        |
  | Bracketed | 266    | `Cal.Rptr.` | 569  | `50-Cal.3d-100` (same) |

  Adds 7 regression tests: 4 bracketed-cite extraction tests (incl. compound `Cal.Rptr.2d`, pincite inside brackets, `Cal.4th`+`P.3d` parallel), 1 parallel linking assertion (shared `groupId`), 2 regression controls confirming NY Slip Op `[U]` unpublished markers (#231) and existing comma-separated parallels still work.

- [#269](https://github.com/medelman17/eyecite-ts/pull/269) [`64431bf`](https://github.com/medelman17/eyecite-ts/commit/64431bf36bf286fbcb301a7f1e6df2a1d3d42cbe) Thanks [@medelman17](https://github.com/medelman17)! - fix: California research Tier 1 — 8 procedural prefixes, 7 history signals, `(in bank)` disposition

  Synthesis of a six-agent research dispatch that audited California Style Manual citation forms across all practice disciplines (CSM core + appellate practice, family/probate/dependency, administrative agencies, criminal + bar, tax + business + employment, environmental + land use + specialty). Six research docs land alongside this change at `docs/research/2026-05-11-ca-style-*.md`.

  This PR implements the **Tier 1 mechanical additions** — items where the existing parser infrastructure can absorb the change with a regex edit or table entry. Bigger structural items (CSM year-first format from #19, `Cal. Daily Op. Serv.` tokenization, slip-op-with-docket pattern, agency-decision citation type, `¶ N` paragraph pincite) are flagged in the research docs for follow-on work.

  ### Procedural prefix additions (8)

  - `Conservatorship of the Person and Estate of` — longest first; CA combined form
  - `Conservatorship of the Person of` — CA Probate
  - `Conservatorship of the Estate of` — CA Probate
  - `In re Conservatorship of` — precision upgrade
  - `In re Guardianship of` — precision upgrade
  - `In re Adoption of` — precision upgrade (e.g., `In re Adoption of Kelsey S.`)
  - `Inquiry Concerning Judge` — Commission on Judicial Performance discipline captions (e.g., `Inquiry Concerning Judge Saucedo, 2 Cal. 4th CJP Supp. 33`)
  - `Appeal of` — Office of Tax Appeals (OTA) and predecessor BOE captions (e.g., `Appeal of Jali, LLC`)

  ### `HistorySignal` additions (6)

  - `not_published` — depublication: `ordered not pub.`, `nonpub. opn.`, `not for publication`
  - `petition_for_review_filed` / `_granted` / `_denied` — CA Supreme Court petition-for-review status (parallels federal cert. denied/granted)
  - `superseded_by_grant_of_review` — pre-2019 CA depublication-on-review rule
  - `modified_on_denial_of_rehearing` — common CA post-judgment modification signal

  ### Disposition addition

  - `in bank` — California Supreme Court's en-banc equivalent. Anchored at content end so it doesn't trip on `dissenting from denial of rehearing in bank` (same defense applied to `en banc` in #235).

  ### Tests

  16 new regression tests + 2 regression controls confirming `(en banc)` still maps to `en banc` (not `in bank`) and the prior `review denied` signal (from #238) is unaffected.

- [#270](https://github.com/medelman17/eyecite-ts/pull/270) [`f04bb6a`](https://github.com/medelman17/eyecite-ts/commit/f04bb6aea5ca0ebe23d5d32e702ddd0559fee843) Thanks [@medelman17](https://github.com/medelman17)! - fix: California Style Manual year-first citation format (#19)

  The California Style Manual (CSM rule 1:1) and the California Rules of Court
  place the year in parentheses _before_ the volume-reporter-page, not after —
  e.g., `In re K.F. (2009) 173 Cal.App.4th 655` rather than the Bluebook
  `In re K.F., 173 Cal.App.4th 655 (Cal. Ct. App. 2009)`. This is the canonical
  form for California state-court opinions and is required for briefs filed in
  CA courts.

  Previously the parser tokenized the volume/reporter/page correctly but failed
  to extract the case name (because the case-name scanback regexes anchored on a
  trailing comma) and the year (because there was no trailing court parenthetical
  to recover it from).

  ### Changes

  - `V_CASE_NAME_REGEX` and `PROCEDURAL_PREFIX_REGEX` now accept either `,\s*$`
    (Bluebook) or `\((\d{4})\)\s*$` (CSM year-first) as the trailing form, with
    the year captured as group 3.
  - Both regexes carry the `d` flag so the caller can compute a clean-coordinate
    year span.
  - `extractCaseName` returns optional `year`, `yearStart`, `yearEnd` fields.
  - `processCaseToken` plumbs the year and year span into the citation when a
    trailing court paren did not already provide them.

  ### Tests

  Seven regression tests covering procedural-prefix and `v.`-style year-first
  forms, plus regression controls confirming Bluebook form still parses
  correctly.

- [#273](https://github.com/medelman17/eyecite-ts/pull/273) [`b6fda80`](https://github.com/medelman17/eyecite-ts/commit/b6fda8091262c99ee041b63fd79274d1860e6ef4) Thanks [@medelman17](https://github.com/medelman17)! - fix: strip citation signals and sentence-initial connectors from supra partyName (#216)

  `SUPRA_PATTERN`'s party-name group greedily captures any sequence of
  capitalized words before `supra`, so `See Gall, supra`, `Cf. Gall, supra`,
  `Then Gall, supra`, and `In Gall, supra` all leaked the leading word into
  `partyName` — preventing `DocumentResolver` from matching the supra back to
  its full-cite antecedent.

  `extractSupra` now post-processes the captured party name through
  `stripSupraPartyPrefix`, which removes leading:

  - Citation signals: `See`, `See also`, `See, e.g.`, `But see`, `But cf.`,
    `Compare`, `Cf.` / `Cf`, `Accord`, `E.g.`
  - Sentence-initial connectors: `Also`, `Then`, `In` (but never `In re` —
    the `(?!\s+re\b)` negative lookahead preserves the bankruptcy/dependency
    caption prefix)

  The original captured name is preserved when stripping would leave an empty
  string (defensive: prevents a wholesale signal token from blanking out the
  party name).

  ### Tests

  12 new tests under `supra party-name signal-leak (#216)`: 5 citation signals

  - 3 sentence-initial connectors + 4 regression controls (including `In re
Smith, supra` → preserves `Smith`, `Smith v. Jones, supra` → preserves both,
    `See Smith v. Jones, supra` → strips `See` but keeps `Smith v. Jones`).

- [#277](https://github.com/medelman17/eyecite-ts/pull/277) [`5910680`](https://github.com/medelman17/eyecite-ts/commit/5910680e81cdfd47c9fbd909542a0c2d0e5b1eda) Thanks [@medelman17](https://github.com/medelman17)! - fix: Louisiana date-in-number citations + two-digit-year slash dates (#232)

  Louisiana practice prepends a docket-style identifier and slash-date court
  parenthetical before the reporter citation:

  ```
  Herff Jones, Inc. v. Girouard, 07-393, p. 2 (La. App. 3d Cir. 10/3/07),
    966 So. 2d 1127, 1130
  ```

  Previously the docket-prefix segment bled into the case name on the trailing
  `So. 2d` / `So. 3d` citation, producing garbage like
  `Herff Jones, Inc. v. Girouard, 07-393, p. 2 (La. App. 3d Cir. 10/3/07)`,
  and the year/court/date metadata in the docket paren was dropped entirely
  (no year, no court, no date on the citation).

  ### Changes

  - **`parseDate` accepts two-digit years**. `10/3/07`, `2/15/10`, `6/30/20`
    now parse with century inferred at the 50 pivot (00-50 → 21st century,
    51-99 → 20th century). Four-digit years continue to parse as before.
  - **LA docket-prefix excision in case-name scanback**. The new
    `LA_DOCKET_BOUNDARY_REGEX` recognizes the LA shape
    `NN-NNNN (La. ... M/D/YY)` (with optional `, p. N` pincite) when it sits
    between caption and reporter, splices it out of `precedingText` (leaving
    just `, `), and surfaces the docket paren's court + date.
  - **Metadata transfer**. `extractCaseName` returns an optional
    `precedingDocketMeta` field; `processCaseToken` applies its court / year /
    date as fallback for the trailing reporter citation when that citation has
    no court paren of its own.

  The Louisiana docket-prefix is not yet emitted as its own first-class
  citation (linked via `detectParallel.ts` per the issue's full acceptance
  criteria) — that remains follow-up work. The primary `So. 2d` / `So. 3d`
  citation now carries clean caseName plus structured year / court / date.

  ### Tests

  - **`parseDate` two-digit years**: 7 new tests in `tests/extract/dates.test.ts`
    covering the pivot, ranges, and 4-digit regression.
  - **Louisiana citations**: 3 new fixtures (all three from the issue
    reproduction) + 2 regression controls (plain `(La. 2010)` and non-LA
    month-name dates).

- [#272](https://github.com/medelman17/eyecite-ts/pull/272) [`3217d21`](https://github.com/medelman17/eyecite-ts/commit/3217d215641c1954027baaea83cac40b408fea2c) Thanks [@medelman17](https://github.com/medelman17)! - fix: California Style Manual `at p.` / `at pp.` pincites (#236)

  `LOOKAHEAD_PINCITE_REGEX`, `PINCITE_SKIP_REGEX`, all five short-form tokenizer
  patterns (`ID_PATTERN`, `IBID_PATTERN`, `SUPRA_PATTERN`,
  `STANDALONE_SUPRA_PATTERN`, `SHORT_FORM_CASE_PATTERN`), and the four local
  regexes in `extractShortForms.ts` (`idRegex`, `partySupraRegex`,
  `standaloneRegex`, `shortFormRegex`) now accept an optional `p.` / `pp.`
  prefix between `at` and the page number, plus page-range support on supra
  matches. This is the California Style Manual standard form
  (`Smith, supra, at p. 115`, `Id. at pp. 125-130`, `18 Cal.4th at p. 717`,
  `50 Cal.3d 100, at p. 115`).

  ### Why

  CSM rule 1:1 requires `at p.` / `at pp.` for pincites, not Bluebook bare
  `at <N>`. Every CA `supra at p.`, `Id. at p.`, and short-form `at p.` reference
  previously produced a partial match with the pincite silently dropped, and
  the bare full-case form `50 Cal.3d 100, at p. 115` lost the trailing pincite
  entirely.

  ### State-reporter pattern tightened

  The state-reporter pattern in `casePatterns.ts` previously absorbed
  `18 Cal.4th at p. 717` as `reporter: "Cal.4th at p."` because the broad
  multi-word reporter character class accepts `[A-Za-z.\d\s&']` and the
  non-greedy quantifier extended through the literal "at" word. A negative
  lookahead `(?!\s+at\s)` now rejects that boundary, letting the short-form
  case pattern correctly handle CSM mid-paragraph short-form references.

  ### Tests

  11 new tests (8 fixtures + 3 regression controls) cover supra, Id., short-form
  case, and full case with `at p.` / `at pp.`, plus page-range forms.

- [#274](https://github.com/medelman17/eyecite-ts/pull/274) [`3e01f2b`](https://github.com/medelman17/eyecite-ts/commit/3e01f2b88c9231dffdcc065c44ae68db5605bc25) Thanks [@medelman17](https://github.com/medelman17)! - fix: rehearing signals + multi-stage subsequent-history chain regression coverage (#246)

  Add two new HistorySignal values — `rehearing_denied` and `rehearing_granted` —
  and four SIGNAL_TABLE entries covering `reh'g denied`, `rehearing denied`,
  `reh'g granted`, `rehearing granted`. Without these entries, `Acme Corp. v.
Beta, 50 F.4th 1 (9th Cir. 2022), reh'g denied, 60 F.4th 50 (9th Cir. 2023)`
  silently dropped the rehearing link AND let the case-name scanback over-scan
  backward through the prior citation when extracting the next case name.

  The broader multi-stage chain machinery (`aff'd, X, overruled by Y`,
  `modified, X, cert. denied, Y`) already worked thanks to the earlier
  `pendingSignal` flush fix; this PR locks the behavior in with 9 regression
  tests under `multi-stage subsequent history chains (#246)`. Two of those test
  the working `aff'd` and `modified` chains, four test the new rehearing
  signals, two test single-link regression controls, and one tests the
  `review granted, opinion vacated` no-paren chain that the earlier fix
  landed.

  These additions are distinct from the CA-specific
  `modified_on_denial_of_rehearing` compound disposition, which anchors on
  `^as modified on denial of rehearing` and remains separately matched.

- [#271](https://github.com/medelman17/eyecite-ts/pull/271) [`0d7f907`](https://github.com/medelman17/eyecite-ts/commit/0d7f9074e399fd19a65f13f9836ca4c80965f479) Thanks [@medelman17](https://github.com/medelman17)! - test: regression fixtures for California year-first form (#263)

  Eight regression tests covering the specific fixtures from issue #263 — all
  documented California-style citations with year-first parentheticals between
  caption and reporter that previously dropped caseName/plaintiff/defendant.

  #263 reported 100% caseName-extraction failure on cluster 2636992 (People v.
  Talibdeen, Cal. SC 2002) and ~5% on cluster 2252939 (In re Marriage of
  Falcone & Fyke, Cal. Ct. App. 2008). All eight fixtures from the bug report
  now pass — the underlying parser fix landed in #270 — and these tests pin
  the behavior so any regression surfaces immediately.

  Fixtures: `People v. Tillman (2000)`, `(People v. Tillman (2000))`,
  `In re Marriage of Bower (2002)`, `(People v. Rubalcava (2000))`,
  `In re Sophia B. (1988)`, `(Khan v. Medical Board (1993))`,
  `People v. Smith (2001) ... [102 Cal.Rptr.2d 731]` (parallel form).

- [#266](https://github.com/medelman17/eyecite-ts/pull/266) [`d1ec87b`](https://github.com/medelman17/eyecite-ts/commit/d1ec87ba5124fda9e713b8ccb0ae8a72c959043d) Thanks [@medelman17](https://github.com/medelman17)! - fix: structured justice-attribution parentheticals + en-banc false-positive fix (#235)

  `parseParenthetical` previously recognized only `en banc` and `per curiam` as metadata-dispositions, so the very common justice-attribution form `(Brennan, J., dissenting)` landed as an unstructured "other" parenthetical. Three coordinated changes plus an en-banc false-positive fix:

  1. **`FullCaseCitation`** gains two new fields:
     - `justices?: string[]` — surnames captured from `(Brennan, J., dissenting)` or `(Brennan and Marshall, JJ., dissenting)`.
     - `scope?: string` — qualifier value (`in_judgment`, `in_part`, `from_denial`).
  2. **`parseParenthetical`** detects the justice-attribution pattern (`<Surname>(, <Surname>)*(?:,? and <Surname>)?,? (C\.J\.|J\.|JJ\.),? <role>`) and classifies the role into:
     - `disposition`: `"dissent"`, `"concurrence"`, `"mixed"` (concurring in part and dissenting in part), `"majority"` (joining).
     - `scope`: `"in_judgment"`, `"in_part"`, or `"from_denial"`.
  3. **Non-justice disposition parens** newly recognized: `(plurality opinion)`, `(mem.)`, `(unpublished table decision)`.
  4. **En-banc false-positive fix:** the `\ben banc\b` check is now anchored at the trimmed content end (`/\\ben banc\\b\\s*$/`) so a parenthetical like `(Cabranes, J., dissenting from denial of rehearing en banc)` no longer mistakenly sets `disposition = "en banc"`.

  Example output for `(Roberts, C.J., concurring in part and dissenting in part)`:

  ```ts
  {
    disposition: "mixed",
    justices: ["Roberts"],
    scope: "in_part",
  }
  ```

  Adds 9 regression tests covering: single-justice dissent/concurrence, scope qualifiers (in_judgment / in_part / from_denial), `(plurality opinion)` / `(mem.)`, and 2 regression controls confirming `(en banc)` and `(per curiam)` still extract.

- [#264](https://github.com/medelman17/eyecite-ts/pull/264) [`8ee7303`](https://github.com/medelman17/eyecite-ts/commit/8ee73039561f6e14263cdce08323ed905366fdff) Thanks [@medelman17](https://github.com/medelman17)! - fix: NY Slip Op `(U)` / `[U]` unpublished markers no longer pollute the court field (#231)

  New York Slip Opinion citations carry a trailing `(U)` (older form) or `[U]` (newer form) marker immediately after the document number to flag an unpublished disposition. Pre-fix, the parser misread `(U)` as a court parenthetical and set `court = "U"`. The `[U]` bracket form additionally caused mis-classification as a `journal` citation because the state-reporter regex's trailing-character lookahead didn't accept `[`.

  Three coordinated changes:

  1. **`FullCaseCitation` interface** gains an `unpublished?: boolean` field (mirrors the existing flag on `NeutralCitation` from #230).
  2. **`state-reporter` regex trailing lookahead** extended from `(?=\s|$|\(|,|;|\.)` to `(?=\s|$|\(|,|;|\.|\[)` so `[U]` doesn't break the page-boundary check.
  3. **Pre-lookahead `(U)`/`[U]` consumer in `extractCase`.** Before `LOOKAHEAD_PAREN_REGEX` runs on the post-token text, a small regex `/^\s*(?:\(U\)|\[U\])/` detects and consumes the unpublished marker so the lookahead reaches the real court parenthetical (e.g., `(Sup. Ct. 2007)`) instead of capturing `(U)` as the court.

  Result for `Pickard v. Tarnow, 2007 N.Y. Slip Op. 52377(U) (Sup. Ct. 2007)`:

  | Field         | Before           | After                 |
  | ------------- | ---------------- | --------------------- |
  | `page`        | 52377            | 52377                 |
  | `court`       | `"U"`            | `"Sup. Ct."`          |
  | `year`        | undefined        | 2007                  |
  | `unpublished` | —                | `true`                |
  | `caseName`    | (sometimes lost) | `"Pickard v. Tarnow"` |

  Adds 7 regression tests covering the bare `(U)` form, the `[U]` bracket form, citations with a following real court paren, and 2 regression controls (non-(U) Slip Op + federal cite) confirming no regression.

## 0.13.4

### Patch Changes

- [#256](https://github.com/medelman17/eyecite-ts/pull/256) [`6ef1f8e`](https://github.com/medelman17/eyecite-ts/commit/6ef1f8e190d03a3d1dc5705be2296aae44685e91) Thanks [@medelman17](https://github.com/medelman17)! - fix: BIA `Matter of A-B-` hyphenated-initials captions parse (root cause: `&` missing from reporter char class) (#244)

  Issue #244 reported that BIA caption forms like `Matter of A-B-, 27 I&N Dec. 316 (BIA 2018)` extracted with a truncated case name. Investigation showed the hyphenated-initials caption capture was already correct under the existing `PROCEDURAL_PREFIX_REGEX` (the subject character class accepts hyphens). The actual root cause was upstream: the `state-reporter` tokenization regex and the `VOLUME_REPORTER_PAGE_REGEX` parser both excluded `&` from their reporter character classes, so `I&N Dec.` (and the spaced Bluebook variant `I. & N. Dec.`) never produced a citation token. Without a citation token there was no case-name lookback at all.

  Two-character-class fix:

  - `casePatterns.ts` `state-reporter` regex — character class extended from `[A-Za-z.\s\d]` to `[A-Za-z.\s\d&']`. Apostrophe was also missing; admitting it here makes the fallback pattern consistent with the federal-reporter alternation (which already handles `F. App'x`).
  - `extractCase.ts` `VOLUME_REPORTER_PAGE_REGEX` — same `&` addition.

  Once the reporter tokenizes, the existing prefix-and-subject logic handles every hyphenated-initials form correctly: two-letter (`A-B-`), three-letter (`L-E-A-`, `W-G-R-`), four-letter (`A-R-C-G-`, `M-E-V-G-`, `E-F-H-L-`, `M-R-M-S-`), ALL-CAPS surnames (`THAKKER`, `CRUZ-VALDEZ`), real hyphenated surnames (`Jurado-Delgado`, `Rivera-Valencia`), and non-anonymized forms (`Matter of Garcia`). All 24 verbatim BIA-precedent corpus citations from the immigration research doc parse to the expected `caseName`.

  Adds 17 regression tests covering: 2 reporter-recognition tests for `I&N Dec.` and `I. & N. Dec.` variants; 6 hyphenated-initials caption tests (2/3/4-letter forms across the highest-corpus precedents); 4 non-anonymized BIA caption tests; 1 `In re` form test; 3 regression controls (`U.S.`, `F.3d`, `N.E.2d`) confirming reporters without `&` are unaffected.

- [#262](https://github.com/medelman17/eyecite-ts/pull/262) [`db6f8f4`](https://github.com/medelman17/eyecite-ts/commit/db6f8f4c10d154fcf05a5fe8021a6fb134e93738) Thanks [@medelman17](https://github.com/medelman17)! - fix: California `review denied/granted` and chained-signal history (#238)

  `SIGNAL_TABLE` covered federal `cert. denied/granted` and the standard Bluebook subsequent-history words, but missed California Supreme Court's `review denied` / `review granted` / `opinion vacated` and the CA-specific `disapproved on other grounds` form. After-citation history clauses with these phrases silently dropped.

  Three coordinated changes:

  1. **`HistorySignal` discriminated union** gains 4 California-specific values: `review_denied`, `review_granted`, `opinion_vacated`, `disapproved_other_grounds`.
  2. **`SIGNAL_TABLE`** gets matching regex entries. The longer `disapproved on other grounds` precedes the bare `disapproved` so alternation prefers the more specific match. `review den.` (abbreviated) and `review denied` both map to `review_denied` via `^review\s+den(?:ied|\.)`.
  3. **`collectParentheticals` multi-stage chain bug fix.** Found while writing tests: when a second signal arrives without an intervening parenthetical (e.g., `..., review granted, opinion vacated.`), the previous `pendingSignal` was overwritten and lost. The fix flushes `pendingSignal` to `signals` (with `nextParenIndex = -1`) before assigning the new one. This also enables federal chains like `aff'd, cert. denied` (without trailing paren) to capture both links.

  Adds 9 regression tests: 3 `review denied` / `review den.` / `review granted`, 1 `opinion vacated`, 1 `disapproved on other grounds`, 1 multi-stage chain (`review granted, opinion vacated` → 2 entries), and 3 regression controls confirming bare `disapproved`, federal `cert. denied`, and the existing `aff'd` chain are unaffected.

- [#255](https://github.com/medelman17/eyecite-ts/pull/255) [`1fe817e`](https://github.com/medelman17/eyecite-ts/commit/1fe817efd9cf292e36d6468659c521109259353a) Thanks [@medelman17](https://github.com/medelman17)! - fix: recognize combined `, e.g.` signals (Bluebook Rule 1.3) — `see, e.g.`, `but see, e.g.`, etc. (#239)

  `VALID_SIGNALS` and the `SIGNAL_PATTERNS` lookup in `detectStringCites.ts`
  recognized only the bare introductory signals (`see`, `but see`, `cf`, …),
  not the combined `, e.g.,` forms. Captions like `See, e.g., Smith v. Jones`
  silently fell back to the bare `see` signal because the trailing `, e.g.,`
  between the signal stem and the case name confused the regex anchors.

  Three coordinated changes:

  1. **`CitationSignal` discriminated union** gains five values: `"e.g."`,
     `"see, e.g."`, `"see also, e.g."`, `"but see, e.g."`, `"cf., e.g."`,
     `"but cf., e.g."`. Mirrors `VALID_SIGNALS` in `extractCase.ts`.
  2. **`SIGNAL_PATTERNS` in `detectStringCites.ts`** now lists the combined forms
     _before_ their bare counterparts so the alternation prefers the longer match.
     Trailing `,?` accommodates the comma that normally separates the signal from
     the citation.
  3. **`SIGNAL_STRIP_REGEX` in `extractCase.ts`** now allows an optional trailing
     comma (`,?\s+`) so `See also, e.g.,` strips correctly off the plaintiff in
     `extractPartyNames`. The signal-lookup checks the un-stripped form first
     (because combined signals end with a real period that belongs in the
     canonical signal value) before falling back to the period-stripping path
     that handles `Cf.` → `cf`.

  Adds 5 regression tests covering each combined-signal form plus a non-regression
  control for bare `see`. The `Compare ... with ...` grouping (a related issue
  from #239) is structurally different — it requires multi-citation scope
  linking, not a new signal entry — and is deferred.

- [#258](https://github.com/medelman17/eyecite-ts/pull/258) [`a7c1c48`](https://github.com/medelman17/eyecite-ts/commit/a7c1c48d87e079a91d28657ffb34e3fee96731b2) Thanks [@medelman17](https://github.com/medelman17)! - fix: hyphenated public-domain neutral citations (NM, Ohio, NC, MS) now extract (#233)

  The `casePatterns.state-vendor-neutral` regex was whitespace-separated only. Hyphenated public-domain formats used by New Mexico, Ohio, North Carolina, and Mississippi silently produced zero citations.

  Two new tokenization patterns in `neutralPatterns.ts`:

  - **`state-vendor-neutral-hyphenated`** (3-segment) — `\b(\d{4})-([A-Z][A-Za-z]+)-(\d+)\b/g`. Covers NM (`2010-NMSC-007`, `2012-NMCA-004`, `2015-NMCERT-009`), Ohio (`2024-Ohio-764` — note the mixed-case "Ohio" token), and NC (`2020-NCSC-118`, `2023-NCCOA-450`).
  - **`state-vendor-neutral-hyphenated-ms`** (4-segment) — `\b(\d{4})-([A-Z]+)-(\d+)-([A-Z]+)\b/g`. Covers Mississippi's `year-caseType-number-appellateTrack` form (`2010-CT-01234-SCT`, `2015-CA-00567-COA`). Listed first in the pattern array so the regex engine prefers the longer match when both could fire.

  `extractNeutral.ts` extended with a Mississippi-aware parse path. The 4-segment form composes the `court` field as `${caseType}-${appellateTrack}` (e.g., `CT-SCT`) so the single `court` field preserves the full sovereign identifier. The 3-segment hyphenated form falls through to a generalized whitespace-or-hyphen separator regex that also covers the existing UT/WI/IL/WL/LEXIS shapes.

  Adds 13 corpus-shaped regression tests in `tests/extract/extractNeutralHyphenated.test.ts`: 3 NM variants, 2 Ohio, 2 NC, 2 MS, and 4 whitespace-separated regression controls (UT, WI, IL, WL) confirming the existing pattern shapes are unaffected.

- [#260](https://github.com/medelman17/eyecite-ts/pull/260) [`31c31ae`](https://github.com/medelman17/eyecite-ts/commit/31c31ae584053a4a6e6fc334696e83e41ffc3df3) Thanks [@medelman17](https://github.com/medelman17)! - fix: multi-word neutral court designations (IL App, OK CIV APP, OK CR) now extract (#230)

  The existing `state-vendor-neutral` court group was `[A-Z]{2}(?:\s+App\.?)?` — only single-word state codes with an optional `App.` suffix. Two real-world formats fell through:

  - **Illinois Rule 23 appellate form** — `2011 IL App (1st) 101234`, `2020 IL App (2d) 190123-U`. The district parenthetical `(1st)/(2d)/(3d)/(4th)/(5th)` was treated as the start of a court parenthetical, so the document number got misbound and the citation silently extracted as zero matches.
  - **Oklahoma multi-word courts** — `2020 OK CIV APP 67` (Civil Court of Appeals), `2019 OK CR 1` (Court of Criminal Appeals), `2024 OK AG 5` (Attorney General opinions). These surfaced as weak `case` matches with no court/year/documentNumber populated.

  Additionally, Illinois Rule 23 unpublished decisions carry a `-U` suffix on the document number (e.g., `190123-U`). Previously this was not handled at all.

  ### Three coordinated changes

  1. **`state-vendor-neutral` regex** extended with two new alternatives ordered before the existing single-word fallback:
     ```regex
     \b(\d{4})\s+(
       IL\s+App\s+\(\d+(?:st|nd|rd|th|d)\)
       |OK\s+(?:CIV\s+APP|CR|AG)
       |[A-Z]{2}(?:\s+App\.?)?
     )\s+(\d+(?:-U)?)\b
     ```
  2. **`extractNeutral.ts`** consumes the `-U` suffix into a new `unpublished` flag and strips it from `documentNumber`.
  3. **`NeutralCitation` interface** gains an `unpublished?: boolean` field. Only set to `true` for citations with the `-U` suffix; absent or `false` otherwise.

  Adds 15 corpus-shaped regression tests in `tests/extract/extractNeutralMultiWord.test.ts`: 6 IL App district variants (1st/2d/3d/4th/5th plus the `-U` unpublished case), 4 OK forms (CIV APP, CR, AG, plus bare OK as fallback), and 5 regression controls (bare IL, UT, WI, Ohio hyphenated from #233, U.S. App. LEXIS from #228).

- [#253](https://github.com/medelman17/eyecite-ts/pull/253) [`10acd4f`](https://github.com/medelman17/eyecite-ts/commit/10acd4f7098c90eda8a42d78437be125ca66b963) Thanks [@medelman17](https://github.com/medelman17)! - fix: cross-domain procedural prefix expansion — 29 additions from 6-agent research dispatch

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

- [#261](https://github.com/medelman17/eyecite-ts/pull/261) [`63fb56d`](https://github.com/medelman17/eyecite-ts/commit/63fb56dc19955b9a7d8619bf3cd12fd9702294bd) Thanks [@medelman17](https://github.com/medelman17)! - test: add 130 real-world citation regression fixtures from Harvard CAP corpus; add `pet_filed` Texas history signal

  Mines verbatim citations from the Harvard CAP corpus (federal F.3d, F.Supp.3d, state appellate reporters) and pins them down as regression fixtures across the patterns landed in recent PRs:

  - 20 Texas writ/pet history (#229) — verified `subsequentHistoryEntries` is populated with a Texas-specific signal
  - 15 combined-signal `, e.g.` (#239) — `See, e.g.,` (10) + `But see, e.g.,` (5), verified `signal` field
  - 15 `In re Marriage of` (#242)
  - 14 `In re Estate of` (existing)
  - 9 `In re Adoption of` (#253)
  - 8 `In re Welfare of` (#253)
  - 8 `In the Interest of` (#242)
  - 5 `In re Parentage of` (#253)
  - 1 `In re Termination of Parental Rights of` (#253)
  - 9 `Succession of` (LA civil-law, #253)
  - 15 `People ex rel.` (#253)
  - 8 `Commonwealth ex rel.` (#242)
  - 3 `d/b/a` slash-alias (#240)

  Real-world inputs surfaced a missed Texas signal: `pet. filed` (petition for review filed but not yet decided — a status, distinct from `pet. ref'd`/`pet. denied`). Added as a new `HistorySignal` value (`pet_filed`) with a matching `SIGNAL_TABLE` entry.

  Fixtures live in `tests/fixtures/real-world-citations-2026-05-11.json` and are exercised by `tests/extract/realWorldCorpusFixtures.test.ts`. Each fixture is a full case-name-plus-citation-plus-year-paren extracted by a Python mining script (`/tmp/mine_fixtures_v2.py`, not committed); the test file imports the JSON and runs each input through `extractCitations`, asserting category-appropriate fields (case-name prefix, signal, subsequentHistory signal classification).

- [#259](https://github.com/medelman17/eyecite-ts/pull/259) [`97fc190`](https://github.com/medelman17/eyecite-ts/commit/97fc190a670895c2ec1a3e07ea697c9cf48ce544) Thanks [@medelman17](https://github.com/medelman17)! - fix: state LEXIS variants (Cal. LEXIS, Tex. App. LEXIS, N.Y. Misc. LEXIS, etc.) now extract (#228)

  The existing `lexis` pattern in `neutralPatterns.ts` was hard-coded for federal courts only — `\b(\d{4})\s+U\.S\.(?:\s+(?:App|Dist)\.)?\s+LEXIS\s+(\d+)\b`. State LEXIS variants (Cal. LEXIS, Tex. App. LEXIS, N.Y. Misc. LEXIS, Ill. App. LEXIS, Fla. LEXIS, Pa. Super. LEXIS, etc.) silently fell through to the broad state-reporter fallback and surfaced as weak `case` matches with no court/year/documentNumber populated.

  Generalized the regex to accept any uppercase-prefixed court abbreviation before LEXIS:

  ```regex
  \b(\d{4})\s+[A-Z][A-Za-z.\s]+?\s+LEXIS\s+(\d+)\b
  ```

  The non-greedy `[A-Z][A-Za-z.\s]+?` is bounded by the literal `\s+LEXIS` that follows it, so there's no runaway risk. The downstream `extractNeutral.ts` already parses arbitrary `<court> LEXIS` shapes via the generalized 3-group regex from #233, so no extractor changes were required.

  Adds 13 corpus-shaped regression tests in `tests/extract/extractLexisStateVariants.test.ts`: 2 California (Cal. + Cal. App.), 2 Texas (Tex. + Tex. App.), 2 New York (N.Y. Misc. + N.Y. App. Div.), 1 Illinois (Ill. App.), 3 additional high-corpus jurisdictions (Fla., Ohio, Pa. Super.), and 3 federal regression controls (U.S., U.S. App., U.S. Dist.) confirming the existing tokenizations still pass.

- [#257](https://github.com/medelman17/eyecite-ts/pull/257) [`3d8d6c2`](https://github.com/medelman17/eyecite-ts/commit/3d8d6c22004aaf013affe922270e68d423566a63) Thanks [@medelman17](https://github.com/medelman17)! - fix: Texas writ/petition history inside court parenthetical now captured (#229)

  Texas Greenbook (Tex. R. App. P. 47.7) places writ-of-error and petition history _inside_ the court-and-year parenthetical after a second comma — e.g., `(Tex. App.—Houston [1st Dist.] 2002, writ ref'd n.r.e.)`. This is structurally different from federal-style subsequent history (which appears between parentheticals). The library previously dropped the writ/pet phrase as junk and left the court field polluted with the year and trailing clause.

  Three coordinated changes:

  1. **`HistorySignal` discriminated union** extended with 10 Texas-specific
     categories: `writ_refused`, `writ_dismissed`, `writ_denied`, `writ_granted`,
     `no_writ` (pre-Sept. 1997 writ-of-error practice); `pet_refused`,
     `pet_denied`, `pet_dismissed`, `pet_granted`, `no_pet` (post-Sept. 1997).
  2. **`SIGNAL_TABLE`** gains 14 new regex entries covering all common Texas
     writ/pet phrase variants (`writ ref'd n.r.e.`, `writ ref'd w.m.j.`,
     `writ dism'd w.o.j.`, `no pet. h.`, etc.). Longer disposition modifiers
     precede the bare forms so alternation prefers the more specific match.
  3. **`parseParenthetical`** now detects a trailing `,\s*<signal>` clause after
     the year, strips it from the working content before `stripDateFromCourt`
     runs (so the court field is correctly bounded), and returns the parsed
     signal in a new `internalHistory` field. `extractCase` then emits this as
     the first entry (order 0) in `subsequentHistoryEntries`, with proper
     `signalSpan` offsets translated through the transformation map.

  The em-dash `—` is converted to `---` by the existing `normalizeDashes`
  cleaner (it doubles as the blank-page placeholder pattern). Court strings
  therefore appear as `Tex. App.---Houston [1st Dist.]` rather than with the
  literal em-dash — that's pre-existing cleaning behavior, not a regression.

  Adds 21 corpus-sourced regression tests: 4 court-extraction tests (em-dash

  - city, em-dash + nested-bracket district), 7 writ-history variant tests,
    6 petition-history variant tests, 1 end-to-end issue-body input, and 3
    regression controls (`9th Cir.`, `S.D.N.Y.`, and a between-parens `aff'd`
    chain) confirming no impact on federal-style parsing.

## 0.13.3

### Patch Changes

- [#249](https://github.com/medelman17/eyecite-ts/pull/249) [`c84494e`](https://github.com/medelman17/eyecite-ts/commit/c84494ee3385c797bded11a2bbed85d12c874054) Thanks [@medelman17](https://github.com/medelman17)! - fix: normalizePartyName strips slash-alias variants `f/k/a`, `n/k/a`, `a/k/a` (#240)

  Case captions commonly use slash-form party-name aliases to indicate prior or alternative names (e.g., `Acme Corp. f/k/a Beta Inc. v. Jones`). The case-name extractor already preserves these in the full caseName via `INTERNAL_QUALIFIER_REGEX`, but `normalizePartyName` only stripped the `d/b/a` slash form and the bare-word `aka`. The forms `f/k/a` (formerly known as), `n/k/a` (now known as), and `a/k/a` (also known as) leaked into `plaintiffNormalized`/`defendantNormalized`, producing canonical-form values like `"acme corp. f/k/a beta"` instead of `"acme"`.

  Combines all four slash-form aliases into a single strip rule so the canonical form is the head-of-name only. Estimated corpus impact: ~96k captions per the cross-jurisdictional parser audit (`docs/research/2026-05-10-citation-style-quirks.md` §M, government-agencies + entity-forms research).

  Adds 4 regression tests covering each alias variant with both `caseName` preservation and `plaintiffNormalized` stripping assertions.

- [#252](https://github.com/medelman17/eyecite-ts/pull/252) [`13a68db`](https://github.com/medelman17/eyecite-ts/commit/13a68db2c17d983778a8c3001f8b5ee24228445b) Thanks [@medelman17](https://github.com/medelman17)! - fix: procedural prefix expansion — Commonwealth ex rel., In the Interest of, Adoption of, etc. (#242)

  `PROCEDURAL_PREFIX_REGEX` and the parallel `proceduralPrefixes` array in
  `extractPartyNames` recognized only 9 procedural prefixes (`In re`,
  `Ex parte`, `Matter of`, `Estate of`, etc.). Several common family/probate
  and state-practice prefixes were missing, causing captions like `In re
Marriage of Smith` to lose the `Marriage of` segment, `On Petition of
P.Q.` to lose the leading `On`, and `Adoption of J.K.` / `Conservatorship
of L.M.` / `Guardianship of N.O.` to fall through to the broad single-party
  fallback with no `proceduralPrefix` field set.

  Adds 7 prefixes (longer forms ordered before shorter ones so alternation
  prefers the longer match):

  - `Commonwealth ex rel.` (PA practice)
  - `In the Interest of` (juvenile / family — handles initials-only parties like A.B., J.K.)
  - `In re Marriage of` (CA family — must beat `In re`)
  - `Adoption of`
  - `Conservatorship of` (CA probate)
  - `Guardianship of`
  - `On Petition of` (older form — must beat `Petition of`)

  Adds 10 regression tests covering the 7 new prefixes plus 3 existing-prefix
  controls (`In re`, `Petition of`, `Estate of`).

- [#251](https://github.com/medelman17/eyecite-ts/pull/251) [`d6982f3`](https://github.com/medelman17/eyecite-ts/commit/d6982f3dafdf588772c38f45abc037cc073d1eb0) Thanks [@medelman17](https://github.com/medelman17)! - fix: generalize federal-reporter pattern and pre-register future editions in COMMON_REPORTERS (#234)

  The `federal-reporter` and `supreme-court` tokenization regexes hard-coded
  edition suffixes (`F.|F.2d|F.3d|F.4th|F.Supp.*`, `L.Ed.|L.Ed.2d`). The broad
  `state-reporter` fallback already caught future formats like `F.5th` and
  `Cal.6th`, so extraction itself did not fail — but the missing entries in
  `COMMON_REPORTERS` cost the +0.3 reporter-match confidence boost, leaving
  `100 F.5th 200 (9th Cir. 2025)` at 0.65 confidence vs. 0.95 for `100 F.4th 200`.

  Two changes, both defensive:

  1. **Generalized regex edition suffix**: replace the explicit enumeration with
     `(?:\d+(?:st|nd|rd|th)|2d|3d)?` so any ordinal — including `F.5th`, `F.10th`,
     `F.Supp.5th`, `L.Ed.3d` — is captured by the precise federal/Supreme Court
     patterns rather than falling through to the state-reporter fallback.

  2. **Pre-registered future editions in `COMMON_REPORTERS`**: added the next
     one-to-two editions for every series already in the set (F.5th–F.7th,
     F.Supp.5th–6th, P.4th, A.4th, N.E.4th, N.W.3d, S.E.3d, S.W.4th, So.4th,
     L.Ed.3d) so confidence scoring stays accurate the moment a court adopts
     them — no emergency patch needed.

  Adds 7 regression tests: 2 assert confidence parity between `F.5th` / `F.6th`
  and `F.4th`, 2 assert clean extraction of future state-reporter editions
  (`Cal.6th`, `Cal.7th`) via the broad fallback, and 3 are regression controls
  for existing editions (`F.4th`, `F.3d`, `F.2d`).

## 0.13.2

### Patch Changes

- [#227](https://github.com/medelman17/eyecite-ts/pull/227) [`9fdf174`](https://github.com/medelman17/eyecite-ts/commit/9fdf174237c97e189fb8edab614d02769794ce1a) Thanks [@medelman17](https://github.com/medelman17)! - fix: case-name lookback recognizes ~58 additional abbreviations from cross-jurisdictional survey

  Cross-agent research canvassed 15 jurisdictional clusters and produced consensus on abbreviations that appear in real case captions but were missing from `CASE_NAME_ABBREVS`. Adding them prevents the backward case-name scanner from treating intra-caption abbreviation periods as sentence boundaries.

  Categories of additions (full per-stem source citations in `src/extract/extractCase.ts`):

  - **Universal apostrophe-form + Bluebook BT1.2 party designations**: `atty` (Att'y / Att'y Gen. — 32k+ corpus matches across every state and federal AG case), `attys`, `petr` (Pet'r), `respt` (Resp't), `commrs` (plural of existing commr).
  - **Plurals of existing singular stems for modern LLC-era captions**: `hldgs`, `hldg`, `props`, `prods`, `ents`, `invests`, `scis`, `emps`, `sols`, `corrs`, `telecomms`, `examrs`, `cmtys`, `colls`, `cts`, `amends`.
  - **Standard institutional / agency**: `civ` (Civ. — including Ala. Civ. App., Civ. Rts. Div.), `enf` (Enforcement, distinct from existing `enft`), `advis`, `utils`, `lic` (License), `bur` (Bureau), `insp` (Inspection), `conserv` (Conservation), `retire` (distinct from `ret`), `discipl`, `supers` (PA Twp. Bd. of Supers.), `edn` (Ohio Edn.), `coun` (Council, distinct from existing `couns`), `stds`, `procs`, `quals`.
  - **Regional / state-specific**: `boro` (NJ long-form alternative to existing `bor`), `commw` (PA Commonwealth Court), `adv` (NV Adv. Op.), `comn` (Hawaii single-m variant of Comm'n), `irrig`, `reclam`, `rptr` (Cal.Rptr.), `vet` (Vet. App., Sec'y of Vet. Aff.), `trib`, `adj`, `vol` (PA Vol. Fire Dept.).
  - **Corporate entity forms**: `pty` (Australian Pty. Ltd.).
  - **Bluebook 21st edition (2020) T6/T13.2 merger additions**: `poly` (Pol'y), `stud` (Stud.), `libr` (Libr.), `refin` (Refin., distinct from existing `ref`), `socio` (Sociology, distinct from existing `soc`), `laby` (Lab'y, distinct from existing `lab`), `naty` (Nat'y / Nationality), `wkly`, `appx` (App'x / F. App'x reporter).

  Adds 21 regression tests covering representative samples from each category. Per-region research reports retained in `docs/research/2026-05-10-citation-abbrevs-*.md` plus a `2026-05-10-citation-style-quirks.md` parser-improvement roadmap (paragraph pincites `¶ N`, hyphenated neutral cites like `2010-NMSC-007`, CA year-first format, TX writ history, state LEXIS) for future work.

- [#227](https://github.com/medelman17/eyecite-ts/pull/227) [`9fdf174`](https://github.com/medelman17/eyecite-ts/commit/9fdf174237c97e189fb8edab614d02769794ce1a) Thanks [@medelman17](https://github.com/medelman17)! - fix: case-name lookback recognizes Nebraska's apostrophe-dropped Comr./Comrs. and Bluebook Reins.

  Re-dispatched the Plains + Upper Midwest research agent (MN, IA, MO, KS, NE, ND, SD) after its first run stalled. The region is substantially Bluebook-conforming, but three real gaps remained:

  - **`comr` / `comrs`** — Nebraska reporter style drops the apostrophe from "Comm'r" / "Comm'rs" and uses the single-m spellings "Comr." / "Comrs." (e.g., "Cherry Cty. Bd. of Comrs."). These normalize to distinct stems from the existing two-m `commr` / `commrs`.
  - **`reins`** — "Reinsurance" abbreviation from Bluebook T6, common in ND/IA insurance captions like "Grinnell Mut. Reins. Co. v. Farm & City Ins. Co."

  Adds 2 regression tests. Report retained at `docs/research/2026-05-10-citation-abbrevs-plains-upper-midwest.md`.

  Deferred: `equal` (Nebraska "Bd. of Equal." Equalization) — too common as a sentence-ending English word; would need stronger false-positive guards.

- [#227](https://github.com/medelman17/eyecite-ts/pull/227) [`9fdf174`](https://github.com/medelman17/eyecite-ts/commit/9fdf174237c97e189fb8edab614d02769794ce1a) Thanks [@medelman17](https://github.com/medelman17)! - test: expand corpus-sourced regression tests with 12 additional captions

  Follow-up to the earlier 22-caption real-world test set: an expanded corpus mining sweep (more reporters, more volumes per reporter, broader patterns) recovered captions for several stems that were missed in the first pass. Adds 12 more verbatim captions covering: `hldgs` (NY 1st Dep't, 3d Cir.), `hldg` (singular), `telecomms` (Erie Telecomms., Denver Area Educ. Telecomms.), `cmtys` (Residential Cmtys.), `scis` (Health Scis. Ctr.), `conserv` (Soil & Water Conserv. Dist. v. United States ex rel. Wilson), `insp` (Grain Insp. Serv.), `reins` (Bellefonte Reins., Gerling Global Reins.), and `appx` (United States v. Stenson, F. App'x).

  Total real-world test count: 34 captions across 21 distinct stems. Combined with the synthetic tests from the earlier commits, the new abbreviation stems are now exercised by both stylistically diverse synthetic captions and verbatim real-world citations from the Harvard Caselaw Access Project corpus.

  A few stems remain without corpus matches in the volumes sampled — typically because the abbreviated form doesn't appear in published opinions (e.g., `supers` for "Supers." is rare in PA appellate text where "Supervisors" is usually spelled out; `vol` for "Vol. Fire" appears as "Volunteer Fire" in real text). These remain covered by synthetic tests and are still valid set entries for any future opinion that does use the abbreviated form.

- [#227](https://github.com/medelman17/eyecite-ts/pull/227) [`9fdf174`](https://github.com/medelman17/eyecite-ts/commit/9fdf174237c97e189fb8edab614d02769794ce1a) Thanks [@medelman17](https://github.com/medelman17)! - test: add 22 corpus-sourced regression tests for newly added abbreviation stems

  The earlier commits on this branch added ~65 abbreviation stems based on style-manual research and synthetic test captions. This commit hardens that work with **22 verbatim case captions mined from the Harvard CAP corpus** — real opinions from federal Circuit, U.S. Supreme Court, NJ Supreme Court, Ohio Supreme Court, and other state appellate courts.

  Each test is a real citation pulled from a published opinion that exercises one of the newly added stems. Together they constitute regression evidence: if any of the stem additions are removed, these tests fail because the case-name backward scanner would treat the abbreviation period as a sentence boundary and truncate the caption.

  Stems covered by real-world captions: `tp`, `atty`, `commrs`, `hldgs`, `props`, `prods`, `ents`, `sols`, `corrs`, `colls`, `utils`, `bur`, `examrs`, `edn`, `conserv`, `emps`, `invests`, `boro`.

  Example mined captions:

  - `Levin v. Tp. Committee of Tp. of Bridgewater, 57 N.J. 506` (cited in _State v. Hatch_, 64 N.J. 179)
  - `Stephens v. Att'y Gen. of Cal., 23 F.3d 248` (cited in _Chavez v. Weber_, 497 F.3d 796)
  - `Board of County Comm'rs of Sedgwick County v. United States, 105 F. Supp. 995` (cited in _Rohr Aircraft Corp. v. County of San Diego_, 362 U.S. 628)
  - `Sokol Hldgs., Inc. v. BMB Munal, Inc., 542 F.3d 354` (cited in _TicketNetwork, Inc. v. Darbouze_, 133 F. Supp. 3d 442)
  - `Bd. of Regents of State Colls. v. Roth, 408 U.S. 564` (cited across many federal opinions)

  Tests live in `tests/extract/realWorldCaptions.test.ts` as a data-driven block.

- [#227](https://github.com/medelman17/eyecite-ts/pull/227) [`9fdf174`](https://github.com/medelman17/eyecite-ts/commit/9fdf174237c97e189fb8edab614d02769794ce1a) Thanks [@medelman17](https://github.com/medelman17)! - fix: case-name lookback now recognizes state-practice abbreviations missing from Bluebook T6

  The case-name backward scanner uses a stem set to distinguish abbreviation periods from sentence-ending periods. Four common abbreviations were missing, so case names containing them were truncated at the abbreviation period:

  - **`Tp.`** (NJ practice for "Township") — `"Parsippany-Troy Hills Tp. Council, 68 N.J. 604"` lost everything before `Council`.
  - **`Tax'n`** (Taxation) — agency captions like `"Dep't of Tax'n v. ..."` lost the prefix.
  - **`Enf't`** (Enforcement) — `"Drug Enf't Admin. v. ..."` lost the prefix.
  - **`Rts.`** (Rights) — `"Human Rts. Watch v. ..."` and `"Civ. Rts. Div."` lost the prefix.

  These appear in real captions across NJ, federal agency cases, and human-rights / civil-rights litigation. The Bluebook T6 reporters-db source we align with covers `Twp.` but not the NJ-style `Tp.` shorthand, and omits the three apostrophe-form variants. Added the four stems to `CASE_NAME_ABBREVS` with regression tests.

## 0.13.1

### Patch Changes

- [#225](https://github.com/medelman17/eyecite-ts/pull/225) [`b2a10b8`](https://github.com/medelman17/eyecite-ts/commit/b2a10b8be5e664d5a5884607d9ffb872ce9c2540) Thanks [@medelman17](https://github.com/medelman17)! - fix: case-name extraction cluster (#220, #221, #222, #223, #224)

  - **#220**: export `DocketCitation` type from package entry so consumers can `import type { DocketCitation } from "eyecite-ts"`.
  - **#221**: stop the case-name scanback at paragraph boundaries (`\n\n`) so a citation at the start of a new paragraph no longer absorbs the previous heading and intro prose. The default cleaner collapses newlines to spaces, so paragraph breaks are recovered from the original text via the `transformationMap`.
  - **#222**: detect consolidated captions (`X v. Y, Matter of A, P v. Q,` chained in one citation) and truncate the defendant at its first comma so `caseName` stays a single party pair instead of concatenating multiple segments.
  - **#223**: trim lead-in clauses ("Under the controlling authority of … in", "Pursuant to the rule announced in") off the plaintiff. Removed `"in"` from the party-name connector set (it's almost always a prose preposition) and tightened the `firstWordIsProperName` guard so it only suppresses trimming when an internal qualifier (`d/b/a`, `a/k/a`, `f/k/a`, `n/k/a`, with or without slashes) is present.
  - **#224**: in subsequent-history chains (`<cite-A>, modified on other grounds, <cite-B>`), inherit the chain root's case name onto the child citation per Bluebook 10.7. Without this pass, the second citation's `caseName` absorbed the first citation + history connector.

## 0.13.0

### Minor Changes

- [#217](https://github.com/medelman17/eyecite-ts/pull/217) [`2e07a41`](https://github.com/medelman17/eyecite-ts/commit/2e07a41826f3164b0655632fab775eb1a8ea28b0) Thanks [@medelman17](https://github.com/medelman17)! - feat: extract docket-number citations like `Party v. Party, No. 51 (N.Y. 2023)` (#215)

  Adds a new `"docket"` citation type for cases identified by docket / slip-opinion number rather than a traditional reporter assignment. Common shapes:

  - NY Court of Appeals slip ops: `IKB Int'l, S.A. v. Wells Fargo Bank, N.A., No. 51 (N.Y. 2023)`
  - Federal district-court pre-reporter: `Smith v. Jones, No. 19-cv-12345 (S.D.N.Y. 2024)`
  - Bankruptcy / `In re` shapes: `In re Smith, No. 22-bk-1234 (Bankr. S.D.N.Y. 2024)`

  **Added:**

  - `DocketCitation` type with `docketNumber`, `caseName`, `plaintiff`/`defendant`, `court`/`normalizedCourt`, `year`/`date`, `proceduralPrefix`, `fullSpan`, and party-name `*Normalized` fields
  - `"docket"` discriminator added to `CitationType`, `FullCitationType`, and the `Citation` / `FullCitation` unions
  - `docketPatterns` array with a single tokenizer pattern (`docket-paren-court-year`)
  - `extractDocket` extractor with case-name backward-search and disambiguation guard
  - `toBluebook` support for the new docket type

  **Disambiguation:** A bare `No. 51 (N.Y. 2023)` is too generic to surface on its own, so the extractor only emits a `DocketCitation` when a preceding `Party v. Party,` or `In re Party,` anchor is found. Confidence is 0.7 (lower than reporter-based citations because there is no reporter to validate against).

  `isFullCitation` now returns `true` for `"docket"` cites, so they participate in `Id.` and `supra` resolution like other full citations.

  8 new tests in `tests/extract/extractDocket.test.ts` cover the NY slip-op shape, federal docket numbers (with and without month/day), `In re` shape, two false-positive guards (no case-name anchor, no year), span coverage, and coexistence with reporter-based cites.

### Patch Changes

- [#217](https://github.com/medelman17/eyecite-ts/pull/217) [`2e07a41`](https://github.com/medelman17/eyecite-ts/commit/2e07a41826f3164b0655632fab775eb1a8ea28b0) Thanks [@medelman17](https://github.com/medelman17)! - fix: resolve `Id.` to the parent citation, not a citation inside its `(citing X)` parenthetical (#214)

  Bluebook Rule 4.1: `Id.` refers to the immediately preceding _cited authority_. A full citation parsed inside another citation's explanatory parenthetical (`(citing X)`, `(quoting Y)`, etc.) is a sub-reference within the parent's citation, not the cited authority of that sentence — so it must not become `Id.`'s default antecedent.

  Previously `DocumentResolver` unconditionally promoted every full citation to `lastResolvedIndex`, including ones parsed inside another citation's explanatory parenthetical. After this fix, the resolver detects parenthetical-internal full citations by checking whether the current cite's `span` lies within an earlier full cite's `fullSpan`, and skips them when updating `lastResolvedIndex`. Such cites are still tracked for `supra` and short-form-case resolution.

  Regression coverage: 7 new tests in `tests/integration/resolution.test.ts` covering the bug repro, supra/short-form lookups into parenthetical-internal cites, plain `Id.` after a single full cite, string cites with `;` separators, parallel cites, and subsequent history (`aff'd`).

## 0.12.0

### Minor Changes

- [#213](https://github.com/medelman17/eyecite-ts/pull/213) [`6104fb9`](https://github.com/medelman17/eyecite-ts/commit/6104fb99efcd9eb0afe2ef5ad15129fc2361703f) Thanks [@medelman17](https://github.com/medelman17)! - feat: populate `spans.pincite` on `ShortFormCaseCitation`, `IdCitation`, `SupraCitation`, and `NeutralCitation` (#210)

  Previously `spans.pincite` was populated only on `FullCaseCitation`. The
  four short-form / short-form-like citation types did not surface a
  pincite offset, so downstream consumers had to either trust
  `span.originalEnd` (which works for short-form/Id/supra by coincidence
  but sits _before_ the pincite on `NeutralCitation`) or fall back to a
  brittle `indexOf(pinciteInfo.raw, ...)` search.

  **Added:**

  - `IdComponentSpans`, `SupraComponentSpans`, `ShortFormCaseComponentSpans`
    types (currently carrying just `pincite?: Span`, extensible)
  - `pincite?: Span` on the existing `NeutralComponentSpans`
  - `spans?: <Type>ComponentSpans` on `IdCitation`, `SupraCitation`,
    `ShortFormCaseCitation`
  - Populated `spans.pincite` in `extractId`, `extractSupra`,
    `extractShortFormCase`, and `extractNeutral`, using the existing
    `spanFromGroupIndex` helper and the same pattern used by
    `FullCaseCitation`

  **Behavior:**

  - `spans.pincite` is set when (and only when) the extractor captures a
    pincite via its regex. Absent pincite → `spans.pincite` undefined.
  - The `spans.pincite.originalStart` / `originalEnd` point to the pincite
    substring in the original (pre-clean) text — e.g. `462-65`,
    `462 n.14`, `*3-*5`.

  Seven new tests covering all four types, footnote-carrying pincite,
  star-page range pincite, and the no-pincite case.

  No breaking changes — all additions are optional fields on types that
  already permitted `spans` on their full-case counterpart.

### Patch Changes

- [#211](https://github.com/medelman17/eyecite-ts/pull/211) [`46d723b`](https://github.com/medelman17/eyecite-ts/commit/46d723b4b727691bb494a768a3cf364c599716dd) Thanks [@medelman17](https://github.com/medelman17)! - fix: drop phantom overlap citations via priority-aware subsumption dedup (#209)

  0.11.3 regression: `extractCitations` emitted a phantom `case` citation
  alongside a legitimate `shortFormCase` whose pincite ended in a footnote
  suffix. Input `"... Smith, 100 F.3d at 462 n.14."` produced three
  citations — the real full-case, the real shortFormCase, and a phantom
  `case` whose span ended just before ` n.14` and whose `pinciteInfo.raw`
  was `undefined`.

  **Root cause.** The `state-reporter` tokenizer pattern is broad enough
  to match `100 F.3d at 462` by treating `F.3d at` as a multi-word reporter
  name. Before `#202`, the `shortFormCase` token covered the same span
  exactly, and position-key dedup kept only one. `#202` grew the
  shortFormCase token by ` n.14` to include the footnote. Same-span dedup
  no longer caught it, and the phantom state-reporter survived into
  extraction. Same shape as `#207` (law-review version of the same bug).

  **Fix.** Replaced the exact-position dedup with priority-aware
  subsumption dedup. Each token's priority is its first-occurrence index
  in the composed pattern list — more specific patterns (neutral,
  shortForm) come earlier than broader ones (case, journal). A token is
  dropped if another kept token's span covers it _and_ that kept token is
  from an equal-or-more-specific pattern. This correctly:

  - drops the phantom `state-reporter [61,76]` inside
    `shortFormCase [61,81]` (#209)
  - drops the phantom `law-review [x,y]` inside `shortFormCase` (#207,
    now handled structurally rather than by the `(?!\s+at\s+\d)` band-aid,
    which is kept as belt-and-braces defense)
  - **preserves** legitimate cases where a broader pattern contains a
    more-specific one — e.g. a `named-code` token wrapping a
    `state-constitution` token for `"Cal. Const. art. I, § 7."`. The
    broader `named-code` has a _lower_ priority (later in the pattern
    list), so it does not swallow the more-specific `state-constitution`.

  Four new regression tests for #209. Full suite 1825/1825 green.

## 0.11.3

### Patch Changes

- [#208](https://github.com/medelman17/eyecite-ts/pull/208) [`fc5e3d2`](https://github.com/medelman17/eyecite-ts/commit/fc5e3d2b5bf44f335f77f29c9eeaccf8437089ca) Thanks [@medelman17](https://github.com/medelman17)! - fix: capture `*N-*M` neutral-citation star-page ranges (#203)

  `NeutralCitation` with a star-page range pincite (common on Westlaw,
  Lexis, and NY Slip Op) captured only the starting page. Input
  `See 2020 WL 1234567, at *3-*5 (S.D.N.Y. 2020).` produced
  `{ page: 3, isRange: false, raw: '*3', starPage: true }` instead of
  `{ page: 3, endPage: 5, isRange: true, raw: '*3-*5', starPage: true }`.
  The `*3-5` form (star on first end only) already worked; `*3-*5` did not.

  **Root cause.** `NEUTRAL_PINCITE_LOOKAHEAD`'s range tail `(?:-\d+)?`
  accepted a trailing hyphen+digits but not the optional `*` prefix on the
  range end. `parsePincite` already handled `*3-*5` correctly (its existing
  unit test `parses a star-paginated range with star on both ends` passes);
  the lookahead just never sent it the full text.

  **Fix.** Changed the range tail to `(?:[-–—]\*?\d+)?` so the capture
  group includes an optional star on the range end (and also accepts
  en-dash/em-dash variants for consistency with `parsePincite`).

  Three new regression tests: `*3-*5`, `*3-5`, and a non-range `*3`
  regression guard.

- [#205](https://github.com/medelman17/eyecite-ts/pull/205) [`9e9dec9`](https://github.com/medelman17/eyecite-ts/commit/9e9dec90d21c83e4352a253c593f85e5a604dca4) Thanks [@medelman17](https://github.com/medelman17)! - fix: populate `PinciteInfo.footnote` from `n.N` / `nn.N-N` pincite suffixes (#202)

  `PinciteInfo.footnote` was declared on the public type but never populated at
  runtime. A pincite like `460 n.14` produced `{ page: 460, isRange: false, raw: '460' }`
  instead of the expected `{ page: 460, footnote: 14, isRange: false, raw: '460 n.14' }`.
  The footnote suffix was dropped entirely, and `raw` was truncated so callers
  couldn't even recover the footnote text themselves.

  **Root cause.** `parsePincite` already supported `n.N` / `note N` in its
  regex, but every upstream capture regex that fed it stopped at
  `\*?\d+(?:-\d+)?` — page digits and an optional range, nothing more. So
  `parsePincite` never saw the footnote text. This affected all citation types
  with a `pinciteInfo` field: full-case, short-form case, `Id.`, `Ibid.`,
  `supra`, and neutral.

  **Fix.** Extended every pincite-capture regex (both tokenizer patterns in
  `shortForm.ts` and extractor regexes in `extractCase`, `extractShortForms`,
  `extractNeutral`) to include an optional trailing
  `(?:\s+(?:nn?|note)\s*\.?\s*\d+(?:[-–—]\d+)?)?` suffix. Extended
  `parsePincite` to accept Bluebook's `nn.` multi-note prefix and to capture a
  range end into a new `footnoteEnd?: number` field: `460 nn.14-15` now parses
  as `{ page: 460, footnote: 14, footnoteEnd: 15, ... }`.

  Seven new regression tests across full-case, short-form, `Id.`, neutral, and
  `parsePincite` unit tests.

- [#207](https://github.com/medelman17/eyecite-ts/pull/207) [`6a8de98`](https://github.com/medelman17/eyecite-ts/commit/6a8de98c1571dbdcb27409d32782ab42781fb9ca) Thanks [@medelman17](https://github.com/medelman17)! - fix: capture range end page on `ShortFormCaseCitation` pincites (#201)

  `ShortFormCaseCitation` dropped the end page of range pincites. Input
  `Smith, 100 F.3d at 462-65.` produced `pinciteInfo = { page: 462,
isRange: false, raw: '462' }` instead of the expected `{ page: 462,
endPage: 465, isRange: true, raw: '462-65' }`. The same range shape works
  correctly on `FullCaseCitation`.

  **Root cause.** `SHORT_FORM_CASE_PATTERN` (tokenizer) and `shortFormRegex`
  (extractor) captured only `(\*?\d+)` for the pincite — no range. When
  `parsePincite` finally ran, the text had already been truncated to the
  starting page.

  **Fix.** Extended both regexes to capture an optional range tail
  `(?:[-–—]\*?\d+)?` after the starting page. Also permits mixed star
  prefixes on range ends (`462-*65`) for neutral-cite compatibility.

  **Collateral fix — journal false-positive.** Growing the short-form span
  by `-NN` broke an identical-span dedup that had been silently absorbing a
  latent law-review false-positive: the pattern
  `\b(\d+)\s+([A-Z][A-Za-z.\s]+)\s+(\d+)\b` matched `554 U.S. at 621`
  inside a short-form cite, treating `U.S. at` as a journal name. Before
  `#201`, the short-form token covered the exact same span and won dedup;
  after `#201`, the short-form token ends at `-22` and the phantom journal
  slips through. Tightened the law-review pattern with an extra negative
  lookahead `(?!\s+at\s+\d)` so a run of capitalised words can't span an
  `at <digit>` token. No real journal name contains `" at <digit>"`.

  Four new regression tests for short-form ranges (plain, full digits,
  range + footnote, single-page regression guard). Full suite 1818/1818.

## 0.11.2

### Patch Changes

- [#199](https://github.com/medelman17/eyecite-ts/pull/199) [`6797408`](https://github.com/medelman17/eyecite-ts/commit/6797408ae37fe6e9c19cef6b8cfdfd22dca54e5e) Thanks [@medelman17](https://github.com/medelman17)! - fix: suppress phantom citations emitted from numeric-prefixed party names (#196)

  Real-world NY caption like `Board of Mgrs. of the 15 Union Sq. W. Condominium
v. BCRE 15 Union St., LLC, 2025 NY Slip Op 00784` emitted two `case`
  citations: the real slip op plus a phantom `15 Union Sq. W. Condominium v.
BCRE 15` extracted from inside the plaintiff's name. The phantom read `15`
  as volume, `Union Sq. W. Condominium v. BCRE` as reporter, and `15` as page.

  **Root cause.** The `state-reporter` regex's non-greedy reporter capture
  (`[A-Za-z.\d\s]+?`) happily spanned the `" v. "` case-name separator and
  backtracked until a second number appeared. The downstream false-positive
  filter caught this only when `reporters-db` was loaded — which is opt-in for
  bundle-size reasons, so most consumers saw the phantom pass through.

  **Fix.** Added negative lookahead `(?!\s+vs?\.\s)` to both `state-reporter`
  and `law-review` patterns so the reporter/journal capture cannot span a
  `" v. "` or `" vs. "` token. No real US reporter or journal name contains
  that sequence. Applied to both patterns because a first-pass guard on just
  `state-reporter` surfaced the same phantom under `law-review`.

  Five new regression tests: the exact #196 text, a `vs.` variant, a cross-type
  guard (no phantom `journal`), and two adversarial controls.

## 0.11.1

### Patch Changes

- [#197](https://github.com/medelman17/eyecite-ts/pull/197) [`925a719`](https://github.com/medelman17/eyecite-ts/commit/925a71987b36d0440bf3ec09c34b40ea63a3295e) Thanks [@medelman17](https://github.com/medelman17)! - fix: align `CASE_NAME_ABBREVS` with reporters-db Bluebook T6 list + ampersand support

  After three consecutive bug reports (#187, #188, #193) exposing missing
  abbreviations, this change aligns `CASE_NAME_ABBREVS` with the canonical
  Bluebook T6 case-name abbreviation list maintained by Free Law Project
  ([reporters-db/case_name_abbreviations.json](https://github.com/freelawproject/reporters-db/blob/main/reporters_db/data/case_name_abbreviations.json)).

  Three improvements:

  - **Strip internal apostrophes in stem lookup.** `isLikelyAbbreviationPeriod`
    previously kept inner apostrophes, so `Nat'l.` computed stem `nat'l` which
    no reasonable pure-letter set could match. Now normalized to `natl`, which
    matches the Bluebook's apostrophe-form abbreviations as pure-letter stems.
  - **41 new entries in `CASE_NAME_ABBREVS`.** Period-forms (`co`, `cmty`,
    `envtl`, `gend`, `par`, `prot`, `ref`, `sol`, `cty`, `adver`) and
    apostrophe-forms (`assn`, `dept`, `natl`, `intl`, `govt`, `commn`, `commr`,
    `contl`, `fedn`, `meml`, `pship`, `profl`, `secy`, `sholder`, `socy`,
    `commcn`, `engg`, `engr`, `entmt`, `envt`, `examr`, `invr`, `admr`, `admx`,
    `empr`, `empt`, `exr`, `exx`, `publg`, `publn`, `regl`). `co` was the
    highest-impact gap — "Smith & Co. United States Corp." was silently
    truncated to "United States Corp." because "Co. U" fired the
    sentence-boundary scan.
  - **`&` in `isLikelyPartyName`.** Ampersand is ubiquitous in corporate
    captions ("Smith & Jones", "Goldman, Sachs & Co.") and previously caused
    the Priority-3 single-party fallback (#193) to reject such captions. Now
    treated as a valid standalone token.

  7 new regression tests covering period-forms, apostrophe-forms with trailing
  period, adversarial `Dep't …` caption, and ampersand patterns.

## 0.11.0

### Minor Changes

- [#192](https://github.com/medelman17/eyecite-ts/pull/192) [`7f84d0c`](https://github.com/medelman17/eyecite-ts/commit/7f84d0c788d0ac7f9d84a15dc5997708dac756fc) Thanks [@medelman17](https://github.com/medelman17)! - feat: star-pagination (`at *N`) support on all pincite-bearing citation types (#191)

  Star-pagination pincites (`at *1`, `at *2-4`) were silently dropped on `id`,
  `supra`, `shortFormCase`, full case cites with slip-opinion reporters (NY Slip
  Op), and neutrals (Westlaw, Lexis). In real-world NY state-court briefs this
  meant a significant fraction of pincites came back `undefined`. Plain-integer
  pincites (`at 465`) continued to work.

  Changes:

  - **`parsePincite` / `PinciteInfo`** — accept optional `*` prefix; new
    `starPage?: boolean` flag distinguishes slip-opinion pages from reporter
    pages. Existing `page: number` still carries the numeric portion, so
    backward compatibility for consumers reading `pincite` as a number is
    preserved.
  - **Full case cites** — `PINCITE_REGEX`, `LOOKAHEAD_PINCITE_REGEX`, and
    `PINCITE_SKIP_REGEX` now accept an optional `at` keyword and `*` prefix.
    Pincite extraction also runs when no trailing parenthetical is present,
    so forms like `2020 NY Slip Op 00001 at *2` capture the pin even though
    there is no `(Court YYYY)` block.
  - **Short-form citations** — `ID_PATTERN`, `IBID_PATTERN`, `SUPRA_PATTERN`,
    `STANDALONE_SUPRA_PATTERN`, and `SHORT_FORM_CASE_PATTERN` now accept `*?`
    before the pincite digits. The matching extractors populate
    `pinciteInfo.starPage` and now expose `pinciteInfo` on `IdCitation`,
    `SupraCitation`, and `ShortFormCaseCitation`.
  - **Neutral citations** — `NeutralCitation` gains `pincite?: number` and
    `pinciteInfo?: PinciteInfo` fields. `extractNeutral` now accepts the
    cleaned source text and extracts a trailing `, at *N` / ` at *N` pincite.
    Previously, **numeric** pincites on neutrals were also silently dropped;
    this change fixes that as a side effect.

  Known limitation: the second occurrence of a NY Slip Op short-form
  (`2020 NY Slip Op 00001 at *2`) is still classified as `case` rather than
  `shortFormCase`, because `SHORT_FORM_CASE_PATTERN` forbids a page between
  the reporter and `at`. The pincite data itself is captured correctly.
  Shortform classification for NY Slip Op will be addressed in a follow-up.

### Patch Changes

- [#195](https://github.com/medelman17/eyecite-ts/pull/195) [`f10c234`](https://github.com/medelman17/eyecite-ts/commit/f10c2347d368a3b87f5af81e191a223661ca4e82) Thanks [@medelman17](https://github.com/medelman17)! - fix: recognize single-party corporate captions and `In the Matter of …` prefix (#193)

  `FullCaseCitation.caseName` came back `null` for any caption that didn't
  contain `v.` or match the short procedural-prefix list (`In re`,
  `Matter of`, `Estate of`, `Ex parte`, etc.). Common NY patterns like
  `Board of Mgrs. of the St. Tropez Condominium` and `Board of Directors
of Hill Park` silently lost their case names — downstream UI fell back
  to displaying the bare reporter triple.

  Two root causes:

  - **Missing long-form procedural prefix.** `In the Matter of X` was
    reduced to `Matter of X` because the short prefix matched mid-string
    before the long one could. Added `In the Matter of` to
    `PROCEDURAL_PREFIX_REGEX` and the `extractPartyNames` prefix list, both
    with priority over `Matter of`.
  - **No generic fallback for single-party captions.** When both `V.` and
    procedural-prefix scans fail, the backward scanner now uses the
    post-truncation `precedingText` itself as the caption, after stripping
    any leading signal word (`See`, `cf.`, etc.) and validating via
    `isLikelyPartyName` + `SENTENCE_INITIAL_WORDS`. Because the truncation
    step already bounds `precedingText` by sentence/citation/paren-signal
    boundaries, sentence prose like "The court held that..." is not
    mis-matched.

  11 new regression tests cover corporate captions (`Board of Mgrs. of`,
  `Board of Managers of`, `Board of Directors of`, bare `Corp.`),
  `In the Matter of` priority over `Matter of`, sentence-prose safety, and
  pre-existing adversarial/`Estate of`/`ex rel.` controls.

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
