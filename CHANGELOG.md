# eyecite-ts

## 0.32.0

### Minor Changes

- [#867](https://github.com/medelman17/eyecite-ts/pull/867) [`e8977fb`](https://github.com/medelman17/eyecite-ts/commit/e8977fbc83d8415a757146eb8c47369f6d6ef423) Thanks [@medelman17](https://github.com/medelman17)! - feat(extract): nest citations inside explanatory parentheticals as child citations (#851)

  A citation nested inside an explanatory parenthetical — e.g. the `Doe v. City, 100 F.2d 1` in `Smith v. Jones, 200 F.3d 100 (2d Cir. 2000) (quoting Doe v. City, 100 F.2d 1)` — is now linked onto its host parenthetical's new `Parenthetical.citations` array as a child citation, keyed by its own stable `CitationId` (the `in-parenthetical-of` edge). Per Bluebook Rule 1.5(b) such a cite is a subordinate component of the citing authority, not a separate authority.

  This is **additive and non-breaking by default**: the nested cite is also kept as a top-level result, so a later case short form can still resolve to a case first cited in a parenthetical (Bluebook Rule 10.9(a)). A new `excludeParentheticalChildren` option opts into the strict subordinate model — `extractCitations(text, { excludeParentheticalChildren: true })` removes the nested cite from the top-level array, leaving it reachable only via its host's `parentheticals[].citations`, and hidden from the cross-citation groupers and the resolver. Children land on the smallest enclosing parenthetical, so genuinely nested asides like `(citing B (quoting C))` build a correct tree.

  Either mode preserves the existing, doctrinally-correct resolver behavior: `Id.`/`supra` never bind to a parenthetical-nested citation (Bluebook Rule 4.1/4.2) — only the host authority.

## 0.31.0

### Minor Changes

- [#862](https://github.com/medelman17/eyecite-ts/pull/862) [`9fb3362`](https://github.com/medelman17/eyecite-ts/commit/9fb3362590da859a18897f3b4a8139695d35259a) Thanks [@medelman17](https://github.com/medelman17)! - feat(resolve)+refactor(extract): consolidated structuring pass + id-based resolution references (#860)

  The cross-citation linking passes — subsequent-history chains, parallel-caption propagation, string-cite grouping, and leading-signal detection — now run in a single `runStructuringPass` **after** `assignCitationIds` and on the final filtered array, so the relationships they build are keyed by stable `CitationId` rather than array position (and `subsequentHistoryOf.index` is no longer stale when false-positive filtering drops a citation). Set-changing passes (synthesis + filtering) continue to run before id-assignment.

  Additively, resolution now exposes **id-based references** alongside the existing numeric indices: `ResolutionResult.resolvedToId` / `antecedentId`, and `pinciteInheritedFromId` on `Id.`/`supra`/short-form-case citations. These survive a consumer `filter`/`sort`/`map` of the result array, unlike the positional indices. Behavior-preserving for existing fields; the new id fields are additive. Unblocks the inter-citation aggregate slices (#849/#850/#857).

- [#864](https://github.com/medelman17/eyecite-ts/pull/864) [`c988839`](https://github.com/medelman17/eyecite-ts/commit/c988839fcdd88ac5826d74fad400d29ed9919a54) Thanks [@medelman17](https://github.com/medelman17)! - feat(extract): HistoryChain aggregate + id-based subsequent-history reference (#849)

  Subsequent-history chains now expose an ordered `historyChain` aggregate (root → latest), shared by every member of the chain and keyed by stable `CitationId` — with new exported types `HistoryChain` / `HistoryLink`. The `subsequentHistoryOf` back-reference additionally carries `priorId` (the parent's stable id) alongside the retained numeric `index`. Built in the consolidated structuring pass (#860), so these relationships survive a consumer `filter`/`sort`/`map` of the result array. Additive — the flat `subsequentHistoryEntries` and `subsequentHistoryOf.index` fields are unchanged.

- [#865](https://github.com/medelman17/eyecite-ts/pull/865) [`59f0b76`](https://github.com/medelman17/eyecite-ts/commit/59f0b768911414c0dd932ef77750bf89b174517c) Thanks [@medelman17](https://github.com/medelman17)! - feat(extract): ParallelGroup aggregate (#850)

  Parallel citations (the same case reported in multiple reporters) now expose a `parallelGroup` aggregate (new exported `ParallelGroup` type) listing every member — including itself — by stable `CitationId` in document order. Combined with `byId()`, this resolves the full sibling citations rather than the lossy `{ volume, reporter, page }` value-copies on `parallelCitations`. Built in the consolidated structuring pass (#860), so it survives a consumer `filter`/`sort`/`map`. Additive — the flat `groupId` label and `parallelCitations` array are unchanged.

- [#866](https://github.com/medelman17/eyecite-ts/pull/866) [`928953d`](https://github.com/medelman17/eyecite-ts/commit/928953d1e9d1fdd6aee93e41944ad44beb56b235) Thanks [@medelman17](https://github.com/medelman17)! - feat(extract): StringCitationGroup aggregate (#857)

  String citations (citations chained for one proposition, `See A; B; C`) now expose a `stringCitationGroup` aggregate (new exported `StringCitationGroup` type) listing every member — including itself — by stable `CitationId` in document order, plus the group's leading signal. Built in the consolidated structuring pass (#860), so it survives a consumer `filter`/`sort`/`map`. Additive — the flat `stringCitationGroupId` / `stringCitationIndex` / `stringCitationGroupSize` fields are unchanged. Completes the inter-citation aggregates alongside HistoryChain (#849) and ParallelGroup (#850).

## 0.30.0

### Minor Changes

- [#838](https://github.com/medelman17/eyecite-ts/pull/838) [`2674a6b`](https://github.com/medelman17/eyecite-ts/commit/2674a6b4fdeec5d86ce7e7419ad7fdfd88f7fcbe) Thanks [@medelman17](https://github.com/medelman17)! - Add `toDurableLocator` / `toDurableLocators` to `eyecite-ts/utils`. They turn each extracted citation into a portable, W3C-style durable locator (TextQuoteSelector + TextPositionSelector) — a quote plus sentence-bounded context, a document-order occurrence ordinal, and a content hash — that survives edits to the source document. eyecite produces the locator; resolving it back to a range is left to the consumer.

- [#861](https://github.com/medelman17/eyecite-ts/pull/861) [`7b42f9b`](https://github.com/medelman17/eyecite-ts/commit/7b42f9bc1a66ed853a43f0286a3621de5e5893a1) Thanks [@medelman17](https://github.com/medelman17)! - feat(types): add a stable `CitationId` to every citation (#856)

  `extractCitations()` now stamps each result citation with a stable `id` (`c0`, `c1`, … in document order) on `CitationBase`, and exports a `byId(citations)` helper mapping ids to citations. The id is stable **within a single result set** — it survives consumer `filter`/`sort`/`map`, unlike array position — and is the identity basis for the forthcoming inter-citation aggregates (parallel groups, history chains, short-form references). It is **not** durable across runs; use `toDurableLocator()` for cross-run identity. Additive and non-breaking: `id` is optional and is always populated by `extractCitations()`.

- [#855](https://github.com/medelman17/eyecite-ts/pull/855) [`d1f008e`](https://github.com/medelman17/eyecite-ts/commit/d1f008e245362422260e65aa910f74f771abbba4) Thanks [@medelman17](https://github.com/medelman17)! - Add a built-in `stripMarkdownEmphasis` cleaner and an `additionalCleaners` option (#835). Markdown legal text — e.g. LLM-drafted briefs with emphasized case names like `*Leon v. Martinez*` — now has a ready-made, opt-in cleaner that strips `*`/`**`/`***` emphasis while preserving star-pagination pincites (`at *3`) and underscores (blank locators like `[____]`). The new `additionalCleaners` option appends cleaners to the default chain, so adding one no longer silently disables the defaults — unlike `cleaners`, which replaces them.

### Patch Changes

- [#839](https://github.com/medelman17/eyecite-ts/pull/839) [`470a3bf`](https://github.com/medelman17/eyecite-ts/commit/470a3bf6d22091bc8c30e9815bdeb0f327197b6d) Thanks [@medelman17](https://github.com/medelman17)! - Refactor case-citation extraction internals around explicit parser, semantic, and draft modules while preserving existing extraction behavior.

- [#841](https://github.com/medelman17/eyecite-ts/pull/841) [`dc1ba6c`](https://github.com/medelman17/eyecite-ts/commit/dc1ba6c08302352b7d5074158eb62cb84a23d689) Thanks [@medelman17](https://github.com/medelman17)! - Fix short-form resolution binding to the wrong case when a length-changing `cleaner` is used (#830). The resolver assumed clean-text offsets equaled original-text offsets and read its bracket-scope / trigger-anchor / name-window analysis against the original text using clean offsets. A cleaner that shrinks the text (e.g. markdown-emphasis stripping) made those offsets diverge — accumulating drift with preceding removed content — so parenthetical-child detection misfired and a trailing `Id.` could bind to a `(quoting …)` child instead of the citation-sentence's main case. The resolver now reads clean-coordinate offsets against the cleaned text and maps derived spans back to original coordinates, so resolution via a cleaner matches resolution of pre-stripped text.

- [#842](https://github.com/medelman17/eyecite-ts/pull/842) [`232d2d2`](https://github.com/medelman17/eyecite-ts/commit/232d2d2073fe666fe3c9ed7b6738d435bb4c0975) Thanks [@medelman17](https://github.com/medelman17)! - Recognize bracketed-blank (`[____]`) slip-op / WL locators instead of dropping the citation (#831)

- [#859](https://github.com/medelman17/eyecite-ts/pull/859) [`1d5b30a`](https://github.com/medelman17/eyecite-ts/commit/1d5b30ae7b9be2acb585b41b1c3898ff48fa944d) Thanks [@medelman17](https://github.com/medelman17)! - Fix `isFullCitation` silently misclassifying `regulation` and `stateRule` (#843). The guard hand-listed only 18 of the 20 `FullCitationType` members, so any consumer routing on it (e.g. `groupByCase`, custom pipelines) dropped those two types. The guard now reads a runtime inventory (`FULL_CITATION_TYPES`) that the compiler proves is an exact bijection with `FullCitationType` — via a `Record<FullCitationType, true>` map whose keys must list every union member — so the guard can never again omit a full type. Adds an exhaustiveness test asserting `isFullCitation` accepts every `FullCitationType` literal and rejects every `ShortFormCitationType` literal.

- [#838](https://github.com/medelman17/eyecite-ts/pull/838) [`2674a6b`](https://github.com/medelman17/eyecite-ts/commit/2674a6b4fdeec5d86ce7e7419ad7fdfd88f7fcbe) Thanks [@medelman17](https://github.com/medelman17)! - fix(types): classify regulation as a full citation. `RegulationCitation` is now part of the `FullCitation` union and `"regulation"` is included in `FullCitationType`, so consumers narrowing on full-citation types see regulations.

## 0.29.2

### Patch Changes

- [#825](https://github.com/medelman17/eyecite-ts/pull/825) [`1c61809`](https://github.com/medelman17/eyecite-ts/commit/1c61809d75514fd31f0fa6e3496d97aa93b94389) Thanks [@medelman17](https://github.com/medelman17)! - fix(resolve): degrade `Id.` parenthetical-child exclusion to soft on bracket-balance failure (#820)

  `resolveId` hard-dropped a candidate antecedent whenever its bracket depth said
  "nested", even when that depth came from a clause whose brackets did not balance
  (`balanceOk=false` — e.g. a dropped/garbled paren from OCR/PDF) — silently
  resolving to a farther cite at confidence 1.0. The #809 `balanceOk` signal is now
  consumed: a depth-only paren-child exclusion in a balance-failed clause is
  degraded to **soft** — the candidate is kept, confidence is capped, and a warning
  is emitted, so `idConfidenceFloor` (#800) can abstain. Trigger-anchored asides and
  `fullSpan`-contained cites stay hard exclusions (they don't depend on the fragile
  depth count), and balanced clauses are unchanged.

- [#826](https://github.com/medelman17/eyecite-ts/pull/826) [`fe29f46`](https://github.com/medelman17/eyecite-ts/commit/fe29f469d11759b8747afaea2031fa280dcbd2be) Thanks [@medelman17](https://github.com/medelman17)! - fix(resolve): `supra` abstains / degrades on non-unique party-name keys (#818)

  `resolveSupra` silently committed to one authority at confidence 1.0 when a
  `supra`'s party-name key matched **>1 distinct in-scope authority** (the
  name-keyed history collapsed them via last-write-wins, hiding the ambiguity).
  `fullCitationHistory` is now a `Map<string, number[]>`, and `resolveSupra` applies
  a hybrid policy: exactly one authority resolves as before; a **true tie** (same
  name + same year, indistinguishable by the key) **abstains**; otherwise it picks
  the most-recent-within-name but **caps confidence and warns**, with
  `idConfidenceFloor` able to fail it closed — mirroring the `Id.` path (#800/#820).
  Parallel-cite siblings and re-citations (shared `groupId`, or volume-reporter-page)
  collapse to a single authority, so they never trigger false ambiguity.

- [#823](https://github.com/medelman17/eyecite-ts/pull/823) [`8e89979`](https://github.com/medelman17/eyecite-ts/commit/8e89979f0e6a3f7c33be2edd83fd4e50bcb3d772) Thanks [@medelman17](https://github.com/medelman17)! - fix(resolve): `supra` no longer leaks into string-cite parenthetical members (#819)

  `computeBracketScopes` treated the `;` separator in a `(citing A; B; C)` string
  cite as a clause boundary even while the outer `(` was still open, resetting its
  bounded bracket stack so 2nd-and-later members read depth 0 (and
  `balanceOk=false`) and escaped the #799 parenthetical-aside filter — `resolveSupra`
  could then accept a string-cite-internal authority as a named antecedent. A `;`
  inside an open paren is now treated as a string-cite separator, not a clause
  boundary, so every member reads the enclosing paren depth and is excluded like the
  first. The `.`/newline reset that confines genuinely-dangling parens (#809) is
  unchanged. This also de-pollutes the `balanceOk` structure-trust signal.

- [#827](https://github.com/medelman17/eyecite-ts/pull/827) [`e866472`](https://github.com/medelman17/eyecite-ts/commit/e866472c39fc11b365fa4eacd0bbf54acdd03ac8) Thanks [@medelman17](https://github.com/medelman17)! - fix(resolve): recognize prior-/subsequent-history subordinators in the trigger lexicon (#821)

  The resolver-shared parenthetical-aside detector recognized only `quoting` /
  `citing` / `quoted in` / `cited in`. Under a dropped or garbled opening paren
  (OCR/PDF), a citation introduced by a history subordinator (`overruled by`,
  `abrogated by`, `superseded by`, `cited with approval in`, `as recognized in`) was
  not seen as an aside, so the #214/#799 exclusion never fired and recency
  mis-resolved `Id.`/`supra` to the subordinated cite. These tokens are now in the
  lexicon. It is a **soft** signal: it only changes resolution on dropped/garbled-paren
  input (balanced asides are already caught by bracket depth), and the regex stays
  ReDoS-safe (flat alternation, `\s+`-joined multi-word tokens).

## 0.29.1

### Patch Changes

- [#814](https://github.com/medelman17/eyecite-ts/pull/814) [`3a43214`](https://github.com/medelman17/eyecite-ts/commit/3a4321469e07b68144b9376a017268c52601eacc) Thanks [@medelman17](https://github.com/medelman17)! - fix(resolve): bounded-depth bracket scan replaces the global paren-depth counter (#809)

  `computeParenDepths` was a single running `(`/`)` counter over the whole document, so one dropped or garbled bracket (common in OCR/PDF) desynced the depth for **every** subsequent citation — silently mis-scoping antecedents. It now delegates to a new `computeBracketScopes`: a bounded-depth bracket stack scanned over the prose gaps between citations, reset at clause boundaries, so corruption is confined to the offending clause. Because only prose gaps are scanned, cite-internal periods (`v.`, `U.S.`) never trip the reset and balanced year parens never inflate depth. This fixes the resolver path (where `isParentheticalAside` reads the raw depth — a stray `(` previously excluded a perfectly good top-level antecedent in a later sentence) at the root, generalizing the tactical #798/#801 workarounds. `computeBracketScopes` also exposes a per-citation `balanceOk` structure-trust signal for future abstain gates (#800/#810). Balanced input is unchanged.

- [#816](https://github.com/medelman17/eyecite-ts/pull/816) [`28594b8`](https://github.com/medelman17/eyecite-ts/commit/28594b8c3638aa0eaed52d9f0b3e97c3e959c5c8) Thanks [@medelman17](https://github.com/medelman17)! - refactor(resolve): route `Id.` antecedent selection through a candidate-list scorer seam (#811)

  `resolveId`'s inline `preferred ?? candidates[0]` (family-preference + recency) pick is now expressed as an explicit `scoreAntecedentCandidates` / `selectAntecedent` step — the deterministic seam for a future feature-based learning-to-rank model, swappable without changing callers. **No behavior change**: the scorer reproduces the prior selection exactly (all existing resolutions identical). `supra` (similarity-ranked) and short-form-case (party-name overlap) selection route through the same seam in a follow-up, since they weight different features.

## 0.29.0

### Minor Changes

- [#806](https://github.com/medelman17/eyecite-ts/pull/806) [`42957d5`](https://github.com/medelman17/eyecite-ts/commit/42957d5fa050200859a5bbdaacc5b25618893dd8) Thanks [@medelman17](https://github.com/medelman17)! - feat(extract): historical-reform constitutional citations `former … (now …)` (#789)

  `former art. XX, § 21 (now art. XIV, § 4)` (and the spelled-out `former article XX, section 21 (now art. XIV, § 4)`) now extract as a single `constitutional` citation: the primary fields hold the _former_ location, and a new `currentLocation` field holds the _current_ location parsed from the `(now …)` parenthetical. The distinctive `(now …)` reform parenthetical is the trigger, so the form extracts with or without a `U.S./State Const.` anchor; requiring both `former` and a `(now <location>)` keeps ordinary prose ("the former article of the treaty") from matching. `toBluebook`, component spans (`currentLocation`), and the `ConstitutionalCitation` type are updated; ordinary constitutional citations are unaffected (`currentLocation` undefined).

- [#805](https://github.com/medelman17/eyecite-ts/pull/805) [`a1ea39f`](https://github.com/medelman17/eyecite-ts/commit/a1ea39fb9c2e5f3fe2ea186dbb0c8f45e8276119) Thanks [@medelman17](https://github.com/medelman17)! - feat(resolve): opt-in `idConfidenceFloor` abstention threshold for `Id.` (#800)

  `resolveId` downgrades confidence and warns when the prose before `Id.` names a different case than the chosen antecedent, but always commits — unlike `resolveSupra`, which abstains below `partyMatchThreshold`. New resolution option `idConfidenceFloor` lets callers make `Id.` fail closed: when set and the computed confidence falls below it, `Id.` returns an unresolved result (carrying the existing ambiguity warning and a `failureReason`) instead of committing. Default is unset — behavior is unchanged and non-breaking.

### Patch Changes

- [#804](https://github.com/medelman17/eyecite-ts/pull/804) [`4f53d9a`](https://github.com/medelman17/eyecite-ts/commit/4f53d9a99290204e5eb8d4c5e7261f4d5d0ba5b1) Thanks [@medelman17](https://github.com/medelman17)! - fix(document): `in-parenthetical-of` citation-graph edges tolerate unbalanced parentheses (#801)

  `buildCitationGraph` derived `in-parenthetical-of` edges from the raw `computeParenDepths` counter, so dropped/unbalanced parentheses (OCR/PDF) corrupted them — a dropped opening paren lost the aside edge, and a dropped closing paren leaked a spurious edge onto every following top-level citation. Edges are now computed via a balance-tolerant owner (`computeInParentheticalOwners`) that reuses #798's trigger-anchored signal for dropped opening parens and a sentence-boundary guard for dropped closing parens. Balanced input (including parallel-cite siblings inside an aside) is unchanged.

- [#808](https://github.com/medelman17/eyecite-ts/pull/808) [`ef348e4`](https://github.com/medelman17/eyecite-ts/commit/ef348e402c59fe36047f52ad0a370da9ced765cb) Thanks [@medelman17](https://github.com/medelman17)! - fix(resolve): recognise `(quoting …)` / `(citing …)` asides even when the opening parenthesis is dropped (#798)

  The `Id.` parenthetical-child guard (#214) relied solely on a running `(`/`)` depth counter, so OCR/PDF text with an unbalanced or dropped opening paren caused `Id.` to resolve to the quoted-within authority instead of the citing one. A new shared, trigger-anchored signal (`triggerAnchoredAsideOwner`, with a named `PARENTHETICAL_TRIGGER_WORDS` vocabulary) now recognises the aside from its trigger word, bounded to the same clause, so the relationship survives a missing paren. The signal feeds both `Id.` and `supra` (via `isParentheticalAside`) and is exported for reuse by the citation graph (#801).

- [#802](https://github.com/medelman17/eyecite-ts/pull/802) [`32d7d42`](https://github.com/medelman17/eyecite-ts/commit/32d7d425ad11133912bb7e12ed5559cb596ea382) Thanks [@medelman17](https://github.com/medelman17)! - fix(resolve): `supra` no longer resolves to a case cited only inside another citation's parenthetical (#799)

  `resolveSupra` now excludes parenthetical-internal asides (`(quoting X)` / `(citing Y)`) as antecedents, matching `resolveId`'s #214 exclusion — so `X v. Y, supra` no longer attaches to a case named only inside another cite's aside. The exclusion uses a precise depth-based aside signal (`isParentheticalAside`) that, unlike the fullSpan-containment fallback, does **not** drop parallel-cite siblings (e.g. `Roe v. Wade, 410 U.S. 113, 93 S. Ct. 705`), which remain valid supra antecedents.

## 0.28.1

### Patch Changes

- [#796](https://github.com/medelman17/eyecite-ts/pull/796) [`a191501`](https://github.com/medelman17/eyecite-ts/commit/a1915012fc5962259cf46103b5df64bd153dc501) Thanks [@medelman17](https://github.com/medelman17)! - fix(resolve): supra/shortFormCase `antecedentIndex` agrees with `resolvedTo` on success path (#795)

  #508 established that a resolved short-form's `antecedentIndex` mirrors
  `resolvedTo` on the success path so consumers have one source of truth, but
  applied the fix only to the `Id.` resolver. The supra and short-form-case
  success paths still computed `antecedentIndex` from a position-only
  `findImmediatePredecessor` walk, so when an intervening citation of a
  different case sat between the resolved antecedent and the short form, the
  two pointers disagreed: `resolvedTo` pointed at the resolved antecedent
  while `antecedentIndex` pointed at the intervening cite.

  The three success paths now mirror `resolvedTo`:
  `createSupraSuccess`, the short-form-case party-name match, and the
  short-form-case recency fallback. `findImmediatePredecessor` remains the
  fallback only for the unresolved/positional path, where `resolvedTo` is
  undefined (e.g. the case name appears only in prose) and a subsequent `Id.`
  still needs to cluster with the short form.

  Example: `Brown ... Mapp ... Brown, supra` now reports
  `antecedentIndex = resolvedTo` (Brown) instead of pointing at the
  intervening Mapp.

## 0.28.0

### Minor Changes

- [#786](https://github.com/medelman17/eyecite-ts/pull/786) [`7a368f5`](https://github.com/medelman17/eyecite-ts/commit/7a368f50f2ac4c8776ce0b4525956d7ba0912bf1) Thanks [@medelman17](https://github.com/medelman17)! - Add `canon` citation type for Code of Judicial Conduct canons (#310)

  `Canon 7(B)(1)`, `Canon 2(A) of the Code of Judicial Conduct`, and bare `Canon 1` now extract as `type: "canon"` with `canon`, optional `subsection`, and (when stated) `ruleSet`. Distinct from attorney disciplinary/model rules (#295). Requires a capital `Canon` + number so lowercase "canon of …" prose is not matched.

- [#784](https://github.com/medelman17/eyecite-ts/pull/784) [`a63976e`](https://github.com/medelman17/eyecite-ts/commit/a63976e9af60841b2c593fef96a761455f09343c) Thanks [@medelman17](https://github.com/medelman17)! - Add `legislativeMaterial` citation type (#308)

  House/Senate committee reports (`H.R. Rep. No. 94-1487, p. 16 (1976)`, spacing-tolerant `H. R.`, with optional `Nth Cong.` / `Nth Sess.` / page / year) and the Congressional Record (`112 Cong. Rec. 1234`) now extract as `type: "legislativeMaterial"` with a `kind: "report" | "congressionalRecord"` discriminator — carrying `chamber`, `reportNumber`, `congress`, `session`, `volume`, `page`, and `year`. The "U.S. Code Cong. & Admin. News" form is a follow-up.

- [#785](https://github.com/medelman17/eyecite-ts/pull/785) [`60481c0`](https://github.com/medelman17/eyecite-ts/commit/60481c068bc80e646bbc8720d31a81dbcc17221b) Thanks [@medelman17](https://github.com/medelman17)! - Add `localOrdinance` citation type for municipal ordinances (#778)

  Clark County Code/Ordinance references (`CCCO § 2.12.010(1)`, including parenthetical subsections) now extract as `type: "localOrdinance"` with `code` (`"CCCO"`), `locality` (`"Clark County, NV"`), and `section`. The type is jurisdiction-general — designed to also fit Cook County, L.A. County, and Miami-Dade municipal codes.

- [#782](https://github.com/medelman17/eyecite-ts/pull/782) [`06d5e95`](https://github.com/medelman17/eyecite-ts/commit/06d5e9552c3af64ca1e41f5519e893c2e11bfa1a) Thanks [@medelman17](https://github.com/medelman17)! - Add `sessionLaw` citation type for state session laws (#350, #779)

  California Statutes (`Stats. 1992, ch. 726, § 2, p. 3523`) and Nevada session laws (`2003 Nev. Stat., ch. 427, §§ 25-26, at 2590-95`) now extract as `type: "sessionLaw"`, carrying `jurisdiction` (`CA`/`NV`), `code` (`Stats.`/`Nev. Stat.`), `year`, `chapter`, and section/page fields — single (`§ 2`), list (`§§ 6, 7, 8` → `sections`), and range (`§§ 25-26` → `sectionRange`; `pp. 3038-3039` / `at 2590-95` → `pageRange`) forms. The federal `statutesAtLarge` form (`100 Stat. 2085`) and Nevada `NRS`/`NAC` statutes are unchanged.

- [#783](https://github.com/medelman17/eyecite-ts/pull/783) [`2572b0e`](https://github.com/medelman17/eyecite-ts/commit/2572b0e2c819d16bbce39308d762290a60b0d85c) Thanks [@medelman17](https://github.com/medelman17)! - Add `treaty` citation type for treaty-series citations (#309)

  Treaty-series citations now extract as `type: "treaty"`: "No."-style series (`T.I.A.S. No. 1502`, spacing-tolerant `T. I. A. S.`) and volume-series-page forms (`1155 U.N.T.S. 331`, `123 U.S.T. 456`), carrying `series` + `seriesNumber`, or `series` + `volume` + `page`. Named-treaty metadata (`treatyName` / `article` / `paragraph`) is reserved for a follow-up — the series cite inside a named-treaty string still extracts. Federal `statutesAtLarge` (`Stat.`) is unaffected.

### Patch Changes

- [#791](https://github.com/medelman17/eyecite-ts/pull/791) [`6fc9505`](https://github.com/medelman17/eyecite-ts/commit/6fc9505940a24b86ea1f1d9602d7f80550afe76f) Thanks [@medelman17](https://github.com/medelman17)! - Fix case-name backscan for zero-width-space and `<br>` artifacts (#693)

  Two PDF/HTML artifacts that dropped or fragmented case captions are now handled
  in the cleaner:

  - Zero-width space (U+200B) standing in for a separator (`Smith‹ZWSP›v. Jones`)
    was stripped (joining `Smithv.`) and lost the plaintiff; it now normalizes to
    a space.
  - `<br>` line breaks (`Smith<br>v.<br>Jones`) only became a space when word
    chars flanked both sides, so `v.<br>Jones` fused to `v.Jones`; `<br>` now
    always collapses to a space.

  Trademark/registered symbols were already handled (#744). Em-dash and ellipsis
  separators remain documented limitations — the punctuation marks an
  interruption/omission, not a continuous case name.

- [#787](https://github.com/medelman17/eyecite-ts/pull/787) [`cc0fb6b`](https://github.com/medelman17/eyecite-ts/commit/cc0fb6bb62c073d12cca7738ad30b6967b2dc433) Thanks [@medelman17](https://github.com/medelman17)! - Recognize spelled-out bare `Article N, Section N` constitutional prose (#321)

  `Article I, Section 8`, `Article 1, Section 10`, and the abbreviated-article +
  word-section mix `Art. 1, Section 6` now extract as `type: "constitutional"`
  (article + section). Previously only the `§`-symbol form (`Art. I, § 10`) and
  the `of the <State> Constitution` prose trailer matched, so the spelled-out
  form attorneys use most in argument prose fell through.

  The tight comma-separated `Article <num>, Section <num>` adjacency plus a
  case-sensitive `Article`/`Art.` token keep ordinary contract/bylaw prose from
  matching; confidence is 0.5 (no `Const.` anchor), matching the existing bare
  form. A `(?<!Const\.?,?\s)` lookbehind avoids duplicating the core of a full
  `U.S. Const., Art. I, §7` citation.

- [#794](https://github.com/medelman17/eyecite-ts/pull/794) [`4d950c7`](https://github.com/medelman17/eyecite-ts/commit/4d950c7f0bea98261e4527ecb168e7b59dc50f23) Thanks [@medelman17](https://github.com/medelman17)! - Extract long-form federal rule citations (#295)

  `Fed. Rule Bankr. P. 3001` and `Fed. Rule Crim. Proc. 46(b)` — the older
  long-form spellings that use `Rule` for `R.` and `Proc.` for `P.` — now extract
  as `federalRule` alongside the canonical abbreviations (`Fed. R. Crim. Proc. 46`
  also works). Bare `Rule N`, state procedural rules, and disciplinary rules
  remain other slices of #295.

- [#793](https://github.com/medelman17/eyecite-ts/pull/793) [`5c029d3`](https://github.com/medelman17/eyecite-ts/commit/5c029d340c9d779ccec3e65dcda7c5507fd986a9) Thanks [@medelman17](https://github.com/medelman17)! - Stop HTML block boundaries from fusing into case names (#701)

  `stripHtmlTags` turned a tag run between two block elements into a single space
  (or nothing, after a period), so a heading or table cell merged into the
  following paragraph's caption — `<h2>Case</h2><p>Smith v. Jones` extracted
  caseName `"Case Smith v. Jones"`. Block-level boundaries (`p`, `div`, `h1`-`h6`,
  `li`, `tr`/`td`, `section`, …) now collapse to a sentence boundary so the
  case-name backscan stops there. `<br>` stays a space (an in-flow line break,
  #693) and inline tags (`<b>`, `<a>`) keep their word-fusion-only behavior.

- [#780](https://github.com/medelman17/eyecite-ts/pull/780) [`437120b`](https://github.com/medelman17/eyecite-ts/commit/437120b0673150c93be04cde0506ffdfac8a4f3d) Thanks [@medelman17](https://github.com/medelman17)! - Recognize NY Slip Op citations as neutral, not case (#692)

  `2024 NY Slip Op 51234` — and the `(U)`/`(UV)`/`[U]` unpublished and `N.Y. Slip Op.` period variants — now extract as `type: "neutral"` with `database: "NY Slip Op"` and a `documentNumber`, instead of being mis-typed as `case` (with `reporter`/`page`). The `(U)`/`[U]` marker sets `unpublished: true`, and a trailing `(court year)` parenthetical still populates `court`/`year`. Case-name attachment is preserved.

  Also fixes neutral case-name extraction to keep the `In re` / `In the Matter of` prefix instead of stripping the leading `In` as a signal word.

- [#792](https://github.com/medelman17/eyecite-ts/pull/792) [`4fc9600`](https://github.com/medelman17/eyecite-ts/commit/4fc96003a5e24b1d88d33c1101a37a629714dc26) Thanks [@medelman17](https://github.com/medelman17)! - Tolerate OCR stray pincite numbers before the year paren (#525)

  Year/court extraction no longer breaks when an OCR'd citation has a stray bare
  number between the page and the `(court year)` parenthetical:

  - a pincite with a missing comma (`128 F.2d 645 648 (4th Cir. 1942)`), and
  - a space-separated pincite range (`300 U.S. 342, 347 351 (1937)`, OCR'd from
    `347-351`).

  The parenthetical lookahead now skips one stray ` N` before the paren. The
  required trailing `(` is the false-positive guard — a stray number followed by
  a reporter (a new citation) still won't match, so string and parallel cites are
  unaffected.

- [#790](https://github.com/medelman17/eyecite-ts/pull/790) [`fef45aa`](https://github.com/medelman17/eyecite-ts/commit/fef45aab1ec5e3b4a99b89f573525de451020200) Thanks [@medelman17](https://github.com/medelman17)! - Handle PDF/OCR artifacts: soft hyphens and page-break markers (#676)

  - Soft hyphen (U+00AD) is now stripped during Unicode normalization, so a
    reporter split across a PDF line break (`100 F.­2d 123`) extracts cleanly.
  - Page-break marker lines — a number fenced by dashes on its own line
    (`100\n— 14 —\nF.2d 123`) — are removed by a new `stripPageBreakMarkers`
    cleaner so the citation rejoins across the artifact. Conservative: the
    number must be dash-fenced AND line-bounded, so ordinary dashed prose is
    untouched.

  Paragraph pincites (`¶ 12`) were already captured in `pinciteInfo.paragraph`
  (#204); a URL-safety invariant (`https://…/100/U.S./123` extracts nothing) now
  has explicit regression coverage.

- [#788](https://github.com/medelman17/eyecite-ts/pull/788) [`588518d`](https://github.com/medelman17/eyecite-ts/commit/588518d3096a70ec8636fb1f33c3311c08e835ad) Thanks [@medelman17](https://github.com/medelman17)! - Extract plural-section constitutional prose (#321)

  `Sections 5 and 10 of Article I of the Ohio Constitution` (and Oxford-comma
  lists like `Sections 5, 7, and 10 of …`) now emit one `constitutional`
  citation per section, each sharing the article and jurisdiction. Previously
  the section-first prose pattern matched a single `Section N` only, so the
  coordinated plural form dropped every section. Mirrors the plural-section
  statute expansion (#453); the plural `Sections` keyword + `of Article`
  connector + closed `of the <State> Constitution` trailer keep false
  positives out.

## 0.27.0

### Minor Changes

- [#770](https://github.com/medelman17/eyecite-ts/pull/770) [`33f99d8`](https://github.com/medelman17/eyecite-ts/commit/33f99d80ba031be79741d8ac7f65c9745f2af64f) Thanks [@medelman17](https://github.com/medelman17)! - feat(extract): constitutional preamble citations (`U.S. Const. pmbl.`) (#321 partial)

  Resolves the preamble sub-issue of #321. `U.S. Const. pmbl.` and
  `U.S. Const. preamble` references weren't extracted — the BODY_TAIL
  regex required `art.` / `amend.` + numeral.

  Added a `PREAMBLE` alternative (`pmbl.` / `preamble`) to BODY_TAIL.
  A new `preamble: boolean` field on `ConstitutionalCitation` is set
  to `true` when the preamble branch matches. The field is mutually
  exclusive with `article` and `amendment` (none of which apply to
  the preamble).

  | input                                  | before    | after                            |
  | -------------------------------------- | --------- | -------------------------------- |
  | `U.S. Const. pmbl.`                    | 0 cites   | preamble=true, jurisdiction=US ✓ |
  | `U.S. Const, pmbl.` (comma)            | 0 cites   | preamble=true ✓                  |
  | `U.S. Const. preamble` (unabbreviated) | 0 cites   | preamble=true ✓                  |
  | `U.S. Const. art. III, § 2` (control)  | unchanged | unchanged ✓                      |
  | `U.S. Const. amend. XIV` (control)     | unchanged | unchanged ✓                      |

  5 regression tests in `tests/extract/issueConstitutionPreamble.test.ts`.

  Other #321 sub-issues (plural `amends.`, full prose form
  `article XII, section 5 of the California Constitution`) remain
  open.

- [#773](https://github.com/medelman17/eyecite-ts/pull/773) [`1c48967`](https://github.com/medelman17/eyecite-ts/commit/1c48967a39a2c2833b69ddd86a7d6e00f8b880d7) Thanks [@medelman17](https://github.com/medelman17)! - feat(extract): Nevada Administrative Code (`NAC`) recognized (#377 partial)

  Resolves the NAC sub-issue of #377. Nevada Administrative Code citations
  (`NAC 616.650`) weren't extracted. The NRS (Nevada Revised Statutes)
  entry was already supported; NAC needed its own entry because it's
  a separate regulation code.

  | input                              | before    | after                         |
  | ---------------------------------- | --------- | ----------------------------- |
  | `NAC 616.650`                      | 0 cites   | code=`NAC`, jurisdiction=NV ✓ |
  | `Nev. Admin. Code 616.650`         | 0 cites   | code=`Nev. Admin. Code`, NV ✓ |
  | `NRS 174.295` (regression control) | unchanged | unchanged ✓                   |

  Other #377 sub-issues (CCCO Clark County Ordinances, Nevada session
  laws `Nev. Stat., ch. NNN, § N`) remain open.

  3 regression tests in `tests/extract/issueNevadaNAC.test.ts`.

- [#771](https://github.com/medelman17/eyecite-ts/pull/771) [`f819987`](https://github.com/medelman17/eyecite-ts/commit/f8199876ea426018b02e3044e42a80b08ba6ff3d) Thanks [@medelman17](https://github.com/medelman17)! - feat(extract): plural `amends.` / `arts.` with chained continuations (#321 partial)

  Resolves the plural-amendments sub-issue of #321.
  `U.S. Const. amends. V, XIV` (plural `amends.` form) wasn't
  tokenized at all; even after enabling the plural form, only the
  first amendment was extracted.

  | input                             | before    | after                       |
  | --------------------------------- | --------- | --------------------------- |
  | `U.S. Const. amends. V, XIV`      | 0 cites   | 2 cites (amendment=5, 14) ✓ |
  | `U.S. Const. amends. V and XIV`   | 0 cites   | 2 cites ✓                   |
  | `U.S. Const. arts. I, II, III`    | 0 cites   | 3 cites (article=1, 2, 3) ✓ |
  | `U.S. Const. amend. V` (singular) | unchanged | unchanged ✓                 |

  Two coordinated changes:

  1. `ARTICLE_OR_AMENDMENT` regex now accepts `arts?` / `amends?` /
     `amdts?` plural forms.
  2. `expandChainedConstitutional` accepts a bare-numeral continuation
     (`, XIV` / ` and XIV`) inheriting the article-or-amendment type
     from the head cite — alongside the existing `; art./amend. <numeral>`
     continuation shape from #707.

  4 regression tests in `tests/extract/issuePluralAmendsChain.test.ts`.

  Other #321 sub-issues (full prose form `article XII, section 5 of
the California Constitution`) remain open.

- [#772](https://github.com/medelman17/eyecite-ts/pull/772) [`bde9139`](https://github.com/medelman17/eyecite-ts/commit/bde9139809ac669a184ae933c09a4c7eb396f094) Thanks [@medelman17](https://github.com/medelman17)! - feat(extract): state-const prose article-first form (#321 partial)

  Resolves the article-first prose sub-issue of #321.
  `article XII, section 5 of the California Constitution` (article-first
  ordering) wasn't recognized. The pre-existing
  `state-const-prose-section-article` pattern handled only the
  section-first form (`Section 5, Article IV of the Ohio Constitution`).

  | input                                                                  | before    | after                       |
  | ---------------------------------------------------------------------- | --------- | --------------------------- |
  | `article XII, section 5 of the California Constitution`                | 0 cites   | article=12, section=5, CA ✓ |
  | `article VI, section 10, of the California Constitution` (extra comma) | 0 cites   | article=6, section=10, CA ✓ |
  | `Section 5(B), Article IV of the Ohio Constitution` (section-first)    | unchanged | unchanged ✓                 |
  | `art. 14 of the Massachusetts Declaration of Rights`                   | unchanged | unchanged ✓                 |

  Added `state-const-prose-article-first` pattern + matching extractor
  branch. Covers all 50 US states.

  4 regression tests in `tests/extract/issueStateConstProseArticleFirst.test.ts`.

  This completes the major sub-issues of #321 covered in this PR series.
  The original issue's `Sections 5 and 10 of Article I of the Ohio
Constitution` plural-section form remains open (rare; would need
  another bare-numeral chain expansion analogous to PR #771).

- [#768](https://github.com/medelman17/eyecite-ts/pull/768) [`a0d6951`](https://github.com/medelman17/eyecite-ts/commit/a0d6951ec656df7565a19b134ad44f1e9392dcef) Thanks [@medelman17](https://github.com/medelman17)! - feat(extract): Tax Court Memorandum decisions (`T.C. Memo. YYYY-NNN`) (#324)

  Resolves #324. Tax Court Memorandum decisions — the dominant authority
  in U.S. Tax Court opinions and common in any federal tax-related
  opinion — weren't recognized.

  | input                                                | before  | after                                               |
  | ---------------------------------------------------- | ------- | --------------------------------------------------- |
  | `T.C. Memo. 2002-89`                                 | 0 cites | neutral / court=`T.C. Memo.` / year=2002 / doc=89 ✓ |
  | `Robida v. Commissioner, T.C. Memo. 1970-86`         | 0 cites | neutral with caseName backscan ✓                    |
  | `Shollenberger v. Commissioner, T.C. Memo. 2009-306` | 0 cites | neutral ✓                                           |

  Added a new `tc-memo` pattern in `neutralPatterns` and a matching
  branch in `extractNeutral`. Treated as a neutral citation because the
  year acts as the volume identifier. Requires the periodized `T.C.`
  form (`TC Memo.` without periods does not match — strict to avoid
  false positives).

  4 regression tests in `tests/extract/issueTcMemo.test.ts`.

### Patch Changes

- [#777](https://github.com/medelman17/eyecite-ts/pull/777) [`920558a`](https://github.com/medelman17/eyecite-ts/commit/920558a3a093c7d1d70b921ef192dee7b8d64669) Thanks [@medelman17](https://github.com/medelman17)! - Verify in CI that the published package loads on Node 18 — the tarball is now built once (Node 20+) and exercised by a real consumer on Node 18/20/22, closing a gap where Node 18 was never tested against the actual published artifact. Also enforce the vitest coverage thresholds, which previously sat at the wrong config level and were silently ignored. No public API or runtime behavior changes. Closes #776.

- [#749](https://github.com/medelman17/eyecite-ts/pull/749) [`33f5808`](https://github.com/medelman17/eyecite-ts/commit/33f5808f1220bb52bf57b62d69e9e4e62578873e) Thanks [@medelman17](https://github.com/medelman17)! - docs: update `subsequentHistoryEntries` JSDoc for post-#527 contract (#619)

  Resolves #619. The JSDoc still said "Only populated on the parent
  (original) citation" — that was true before PR #617's #527 rewrite,
  which changed the field to populate on every chain link that received
  a history clause from the scanner. The minor version bump (0.22.0)
  flagged the contract change but the JSDoc was not updated.

  Replaced with text documenting the new contract:

  > Populated on every chain link that received a history clause from
  > the scanner — not just the chain's root. For `Smith, aff'd, X,
cert. denied, Y`, both Smith and X populate this field.

  No code changes. Doc-only patch.

- [#763](https://github.com/medelman17/eyecite-ts/pull/763) [`9a98615`](https://github.com/medelman17/eyecite-ts/commit/9a986159121726c0864c65e92d37d453c7e44d5f) Thanks [@medelman17](https://github.com/medelman17)! - docs: document supra party-name case-sensitivity constraint (#688)

  Resolves #688 via the "document as explicit constraint" path the
  issue author offered as an acceptable resolution. SUPRA_PATTERN
  requires an uppercase initial on the party-name capture — `Smith,
supra` matches; `smith, supra` does not.

  Adds a prominent **CASE SENSITIVITY (#688)** block to SUPRA_PATTERN's
  JSDoc explaining why: a lowercase-permissive regex generates 18+
  regressions in resolver tests because words like `Later`, `However`,
  and `In re` would be absorbed as multi-word party names.

  Lowercase party-name supras (informal/OCR-extracted text) must
  either be hand-corrected upstream or handled by a future
  resolver-side fuzzy match.

  No code change. Doc-only patch.

- [#759](https://github.com/medelman17/eyecite-ts/pull/759) [`5dd731c`](https://github.com/medelman17/eyecite-ts/commit/5dd731cd6eb10dddc9eb3377634d90bfc4ea3dca) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): strip sentence-internal connector prefix from caseName (#670 part)

  Resolves the connector-prefix sub-issue of #670. The trim block in
  `extractCaseName` considered words like `Rather,` as plausible
  party-name prefixes (`Rather, State v. Epps` → caseName=`Rather,
State v. Epps`) because they pass the `firstWordIsProperName` check.

  Fix: added common sentence-internal connector adverbs (`rather`,
  `moreover`, `furthermore`, `however`, `nevertheless`, `accordingly`,
  `consequently`, `instead`, `meanwhile`, `indeed`, `thus`, `hence`) to
  `SENTENCE_INITIAL_WORDS`. This routes them to the prefix-strip branch.

  | input                                  | before                    | after              |
  | -------------------------------------- | ------------------------- | ------------------ |
  | `Rather, State v. Epps, 100 F.2d 1`    | `Rather, State v. Epps`   | `State v. Epps` ✓  |
  | `However, Smith v. Jones, 100 F.2d 1`  | `However, Smith v. Jones` | `Smith v. Jones` ✓ |
  | `Moreover, Doe v. Roe, 100 F.2d 1`     | `Moreover, Doe v. Roe`    | `Doe v. Roe` ✓     |
  | `Indeed, Brown v. Board, 347 U.S. 483` | `Indeed, Brown v. Board`  | `Brown v. Board` ✓ |
  | `Smith v. Jones, 100 F.2d 1` (control) | unchanged                 | unchanged ✓        |

  Real party names that start with these adverbs are vanishingly rare;
  the false-negative risk is dominated by the false-positive cost of
  absorbing prose context.

  Known limitations (not in this patch): all-caps preamble absorption
  and the additional `Professional Conduct.` sentence-prefix forms
  remain open.

  6 regression tests in `tests/extract/issueBackscanSentencePrefix.test.ts`.

- [#767](https://github.com/medelman17/eyecite-ts/pull/767) [`fe8df95`](https://github.com/medelman17/eyecite-ts/commit/fe8df954a5d350ece7fffd4a9d78d0069e72f772) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): `bare-article` accepts Arabic numerals (`Art. 1, § 10`) (#321 partial)

  Resolves the bare-article-Arabic sub-issue of #321. The `bare-article`
  pattern previously required Roman numerals only (`Art. I, § 8`),
  missing the common-in-modern-state-codes Arabic form (`Art. 1, § 10`).

  | input                                | before    | after                   |
  | ------------------------------------ | --------- | ----------------------- |
  | `Art. 1, § 10`                       | 0 cites   | article=1, section=10 ✓ |
  | `Art. 42, §3`                        | 0 cites   | article=42, section=3 ✓ |
  | `Art. I, § 8` (Roman)                | unchanged | unchanged ✓             |
  | `Art. 42 of the treaty` (no section) | 0 cites   | unchanged ✓             |

  Fix: extended the numeral capture from `[IVX]+` to `([IVX]+|\d+)`.
  The mandatory `§ N` requirement keeps false-positive risk low —
  prose like `Art. 1 of the treaty` (no section) still won't match.

  One existing test in `constitutionalPatterns.test.ts` asserted the
  old Roman-only behavior — updated to reflect the new acceptance and
  added a regression control for the no-section case.

  5 regression tests in `tests/extract/issueBareArticleArabic.test.ts`.

  Other #321 sub-issues (plural `amends.`, `pmbl.`, full prose form)
  remain open.

- [#738](https://github.com/medelman17/eyecite-ts/pull/738) [`17482e4`](https://github.com/medelman17/eyecite-ts/commit/17482e4117387d61facaaf1efb2c681fd02ea7ec) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): bare `§§ N, M` lists (no code prefix) get lower confidence (#726)

  Resolves #726. `detectBareSectionLists` produced statute citations
  from `§§ 1983, 1985` (bare section-list with no code prefix) at
  confidence 0.5 — same as a real statute. The `code` field defaulted
  to the literal `§` character, which isn't a meaningful code
  identifier.

  Lowered confidence to 0.3 when the only code marker is `§` (no
  surrounding `Code`/`Code Ann.` prefix). Downstream consumers can now
  confidently filter these out at the 0.5 threshold unless they
  specifically want unbound section refs.

  | input                                               | before         | after            |
  | --------------------------------------------------- | -------------- | ---------------- |
  | `§§ 1983, 1985`                                     | confidence=0.5 | confidence=0.3 ✓ |
  | `Code §§ 19.2-81 and 18.2-266` (with `Code` prefix) | confidence=0.5 | unchanged ✓      |
  | `42 U.S.C. § 1983` (real code)                      | unchanged      | unchanged ✓      |

  3 regression tests in `tests/extract/issueBareSectionConfidence.test.ts`.

- [#761](https://github.com/medelman17/eyecite-ts/pull/761) [`b3bdc9f`](https://github.com/medelman17/eyecite-ts/commit/b3bdc9f52cbfea2e0a3ec9dac5ba330fab669f9d) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): bare-section short-form captures subdivision keyword (#663 / #655)

  Resolves the subdivision-keyword sub-issue of #663 and #655. Bare
  `§ N` short-form citations that inherit from an upstream CA-code
  antecedent (`Health & Saf. Code, § 1375.4`) lost their subdivision
  chain — `§ 1347.15, subd. (b)(1)-(3)` extracted with
  `section="1347.15"` and `subsection=undefined`.

  | input (in CA-code context)    | before                                | after                              |
  | ----------------------------- | ------------------------------------- | ---------------------------------- |
  | `§ 1347.15, subd. (b)(1)-(3)` | subsection=undefined                  | `(b)(1)` + range to `(3)` ✓        |
  | `§ 1317, subds. (a), (b)`     | section=`1317, subds.`, no subsection | section=`1317`, subsection=`(a)` ✓ |
  | `§ 1371.4(e)` (no keyword)    | unchanged                             | unchanged ✓                        |
  | `§ 1348.6, subd. (b)`         | subsection=undefined                  | `(b)` ✓                            |

  Two coordinated changes:

  1. `BARE_SECTION_RE` in `detectBareSectionShortForms` now captures the
     optional `,?\s+(?:subd\.|subdivision|subds\.|subdivisions|...)\s+(\X\)...` keyword chain plus an optional `-(N)` range trailer.
  2. `normalizeSubdKeyword` in `parseBody` accepts the plural `subds.` /
     `subdivisions` forms alongside the existing singular variants.

  The captured body is now passed through `parseBody`, which splits the
  section from the subsection chain and surfaces `subsectionRange` when
  the keyword chain ends with a paren-range trailer.

  4 regression tests in `tests/extract/issueBareSectionSubd.test.ts`.

  CA bare-section without an upstream code anchor (the broader #655 /
  #663 scope) remains a separate issue requiring context-tracking.

- [#723](https://github.com/medelman17/eyecite-ts/pull/723) [`47a3df7`](https://github.com/medelman17/eyecite-ts/commit/47a3df7b95046fe8177aff53ae1a23105a3b1f2a) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): case-name backscan accepts colon in subtitles

  V_CASE_NAME_REGEX's plaintiff/defendant char class lacked `:`, so case
  names with subtitle separators returned `caseName=null`:

  | input                                   | before | after                         |
  | --------------------------------------- | ------ | ----------------------------- |
  | `Smith v. Jones: Continued, 100 F.2d 1` | null   | `Smith v. Jones: Continued` ✓ |
  | `Smith v. Jones: A Sequel, 100 F.2d 1`  | null   | `Smith v. Jones: A Sequel` ✓  |

  Added `:` to both plaintiff and defendant char classes. Case names
  without colons (most cases) are unaffected.

  4 regression tests in `tests/extract/issueCaseNameColon.test.ts`.

- [#713](https://github.com/medelman17/eyecite-ts/pull/713) [`5db83e8`](https://github.com/medelman17/eyecite-ts/commit/5db83e8b76f07d207c6d453cbf84661eac668205) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): case-name backscan preserves ordinal-prefix party names

  The numeric prefix in `V_CASE_NAME_REGEX` was `(?:\d[\d-]*\s+)?` — bare
  digits only, with no ordinal-suffix support. When a real party name
  began with an ordinal (`21st Century Fox`, `1st National Bank`,
  `100th Anniversary`), the regex skipped the ordinal prefix entirely
  because the digit-prefix branch couldn't consume `21st` and the
  plaintiff branch started at the next uppercase letter.

  | input                                    | before                   | after                          |
  | ---------------------------------------- | ------------------------ | ------------------------------ |
  | `21st Century Fox v. Smith, 100 F.2d 1`  | `Century Fox v. Smith`   | `21st Century Fox v. Smith` ✓  |
  | `1st National Bank v. Smith, 100 F.2d 1` | `National Bank v. Smith` | `1st National Bank v. Smith` ✓ |
  | `100th Anniversary v. Smith, 100 F.2d 1` | `Anniversary v. Smith`   | `100th Anniversary v. Smith` ✓ |

  Extended the numeric prefix to `(?:\d[\d-]*(?:st|nd|rd|th)?\s+)?` so
  ordinal suffixes are absorbed. Bare-number prefixes (`12 Lincoln
Square`) and no-prefix names (`Smith v. Jones`) continue to work.

  7 regression tests in `tests/extract/issueCaseNameOrdinalPrefix.test.ts`.

- [#686](https://github.com/medelman17/eyecite-ts/pull/686) [`891614f`](https://github.com/medelman17/eyecite-ts/commit/891614f9673c4a1144841f65f63c7cdd3859d895) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): case-name backscan handles non-ASCII letters (umlaut, accents, cedilla)

  The plaintiff/defendant character class in `V_CASE_NAME_REGEX` was
  ASCII-only (`[A-Za-z0-9\s.,'&()/-]+?`), so any case name containing
  non-ASCII letters failed the backscan and surfaced as `caseName=null`:

  - `Müller v. Schmidt, 100 F.2d 1 (1990)` → `caseName=null` ⇒ now `Müller v. Schmidt` ✓
  - `Société Générale v. Banque, 100 F.2d 1 (1990)` → null ⇒ `Société Générale v. Banque` ✓
  - `Pérez v. González, 100 F.2d 1 (1990)` → null ⇒ `Pérez v. González` ✓
  - `Çelik v. Banque, 100 F.2d 1 (1990)` → null ⇒ `Çelik v. Banque` ✓
  - `Smith v. Müller, 100 F.2d 1 (1990)` → null ⇒ `Smith v. Müller` ✓

  Extended the character class to include Latin-1 Supplement (`À`-`ÿ`) and
  Latin Extended-A (`Ā`-`ſ`), which covers the bulk of accented characters
  in real case names (French, German, Spanish, Polish, etc.). The
  uppercase anchor accepts both ASCII and uppercase Latin-1
  (`À`-`Þ`), so plaintiffs whose name begins with `Ç`, `É`, `Ö` still
  anchor the scan correctly.

  6 regression tests in `tests/extract/issueCaseNameUnicode.test.ts`.

- [#766](https://github.com/medelman17/eyecite-ts/pull/766) [`8e872a2`](https://github.com/medelman17/eyecite-ts/commit/8e872a204286916f58258e163f8374029710fd8e) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): `cert. denied[,]` (bracketed comma) detects subsequent history (#526)

  Resolves #526. The `cert. denied` history-signal regex required the
  next char to be whitespace / comma / semicolon / paren / EOF — `[`
  was not admitted. The `cert. denied[,]` form (bracketed comma — an
  editorial-insertion convention used by some reporters) silently
  dropped the subsequent-history clause. Both the parent's
  `subsequentHistoryEntries` and the child's `subsequentHistoryOf`
  back-pointer were lost.

  | input                                     | before     | after                                       |
  | ----------------------------------------- | ---------- | ------------------------------------------- |
  | `cert. denied[,] 479 U.S. 1059`           | no history | parent=`[cert_denied]`, child back-points ✓ |
  | `cert. denied, 479 U.S. 1059` (canonical) | unchanged  | unchanged ✓                                 |

  Fix: extended the lookahead character class to include `[`.

  2 regression tests in `tests/extract/issueCertDeniedBracketedComma.test.ts`.

- [#750](https://github.com/medelman17/eyecite-ts/pull/750) [`09aaa0d`](https://github.com/medelman17/eyecite-ts/commit/09aaa0d37be75d299e3b8ec21c464a15016976a7) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): CFR `Title 12, C.F.R.` form recognized (#630)

  Resolves #630. CFR pattern's title→code separator required pure
  whitespace (`\s+`), missing the comma-tolerant form that USC got in
  Sprint H (#586).

  | input                               | before     | after        |
  | ----------------------------------- | ---------- | ------------ |
  | `Title 12, C.F.R. § 226`            | 0 cites    | regulation ✓ |
  | `Title 12, C.F.R., § 226`           | 0 cites    | regulation ✓ |
  | `Title 12 C.F.R. § 226` (no comma)  | regulation | unchanged ✓  |
  | `12 C.F.R. § 226` (no Title prefix) | regulation | unchanged ✓  |

  Fix: change CFR title→code separator from `\s+` to `\s*,?\s+` —
  mirrors the USC fix for #586. Trailing letter alternation is USC-only,
  so no other changes.

  5 regression tests in `tests/extract/issueCfrTitleComma.test.ts`.

- [#709](https://github.com/medelman17/eyecite-ts/pull/709) [`8a03866`](https://github.com/medelman17/eyecite-ts/commit/8a038669a956e4c41446c108e4c478fa9471c81e) Thanks [@medelman17](https://github.com/medelman17)! - fix(clean): preserve space in `<X>. <N>th Cir.` court parentheticals

  The reporter-spacing cleaner's general ordinal-suffix rule
  (`([A-Za-z])\.\s+(\d+[a-z]+)` → collapse) blindly stripped the space
  before any ordinal token, even when the ordinal was a circuit number
  rather than a reporter edition:

  | input              | before            | after                |
  | ------------------ | ----------------- | -------------------- |
  | `B.A.P. 9th Cir.`  | `B.A.P.9th Cir.`  | `B.A.P. 9th Cir.` ✓  |
  | `Bankr. 9th Cir.`  | `Bankr.9th Cir.`  | `Bankr. 9th Cir.` ✓  |
  | `La. App. 3d Cir.` | `La. App.3d Cir.` | `La. App. 3d Cir.` ✓ |

  Fix: anchor the ordinal with `\b` to defeat greedy backtracking, then
  add a negative lookahead `(?!\s+Cir\.)` so the collapse skips circuit
  numbers. Reporter editions (`Wis. 2d`, `F. Supp. 2d`, `So. 2d`, `Cal.
Rptr. 2d`) continue to collapse correctly.

  Pre-existing Louisiana date-in-number tests (#232) that pinned the
  buggy `La. App.3d Cir.` form are updated to expect the canonical
  Bluebook T7 form `La. App. 3d Cir.`.

  6 regression tests in `tests/extract/issueCleanerBAPSpacing.test.ts`.

- [#743](https://github.com/medelman17/eyecite-ts/pull/743) [`f70130d`](https://github.com/medelman17/eyecite-ts/commit/f70130d89dabbdab967c17e9ee777ed7298a6af1) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): `compare A with B` propagates compare signal to B (#702)

  Resolves #702. Bluebook Rule 1.2(b) treats `compare A with B` as a
  paired signal — both citations belong to the same comparison. The
  extractor previously assigned `signal=compare` only to A, leaving B
  with `signal=undefined`.

  | input                                             | before                 | after                                   |
  | ------------------------------------------------- | ---------------------- | --------------------------------------- |
  | `Compare Smith, 100 F.2d 1, with Doe, 200 F.3d 5` | A=compare, B=undefined | A=compare, B=compare ✓                  |
  | `Compare Smith, 100 F.2d 1 with Doe, 200 F.3d 5`  | A=compare, B=undefined | A=compare, B=compare ✓                  |
  | `See Smith, 100 F.2d 1, with Doe, 200 F.3d 5`     | A=see, B=undefined     | unchanged (no compare) ✓                |
  | `Compare A; see Doe, 200 F.3d 5`                  | A=compare, B=see       | unchanged (explicit signal preserved) ✓ |

  Added `propagateCompareWithSignal` post-process pass: when a citation
  carries `signal=compare` and the gap to the next citation contains
  `with`, propagate `compare` to the following citation. Does not
  overwrite an explicit signal on the follow-on.

  5 regression tests in `tests/extract/issueCompareWithSignal.test.ts`.

- [#699](https://github.com/medelman17/eyecite-ts/pull/699) [`3f226b7`](https://github.com/medelman17/eyecite-ts/commit/3f226b7f9b86a61e2a3c216ab96db3e8b9e43868) Thanks [@medelman17](https://github.com/medelman17)! - fix(constitutional): invalid Roman numerals downgraded to low confidence

  The constitutional body regex matches `[IVX]+` permissively (to support
  real Roman numerals up to `XXVII`), but `parseNumeral` rejects
  non-canonical Roman forms like `IIII`, `IIIIIII`, and out-of-range
  numerals like `XXVIII`. The extractor previously surfaced these as
  constitutional citations with confidence 0.9 but with `amendment=undefined`
  AND `article=undefined` — a structurally useless citation passed through
  at the same confidence as a valid one.

  | input                        | before                                         | after      |
  | ---------------------------- | ---------------------------------------------- | ---------- |
  | `U.S. Const. amend. IIII`    | type=constitutional, amend=undefined, conf=0.9 | conf=0.1 ✓ |
  | `U.S. Const. amend. IIIIIII` | type=constitutional, amend=undefined, conf=0.9 | conf=0.1 ✓ |
  | `U.S. Const. art. XXVIII`    | type=constitutional, art=undefined, conf=0.9   | conf=0.1 ✓ |

  When both `amendment` and `article` fail to parse, confidence is now
  downgraded to 0.1 so downstream consumers can filter it out.

  5 regression tests in `tests/extract/issueConstInvalidNumeral.test.ts`.

- [#679](https://github.com/medelman17/eyecite-ts/pull/679) [`da209d5`](https://github.com/medelman17/eyecite-ts/commit/da209d5549b57dcd21b7c8ebd2c04906f1a466a2) Thanks [@medelman17](https://github.com/medelman17)! - fix(constitutional): capture `§ N` section without comma separator

  `OPTIONAL_SECTION` and `OPTIONAL_CLAUSE` in the constitutional body
  regex required a leading `[,;]` between the article/amendment numeral
  and the `§`/`cl.` token. Real-world Bluebook citations frequently omit
  the separator:

  - `U.S. Const. amend. XIV § 1` → section dropped (now: `section="1"`)
  - `U.S. Const. art. III § 2` → section dropped (now: `section="2"`)
  - `Cal. Const. art. I § 7` → section dropped (now: `section="7"`)
  - `U.S. Const. art. III § 2 cl. 1` → section + clause dropped

  Made the leading punctuation optional. Existing comma/semicolon forms
  continue to parse as before. The bare-numeral guard
  (`U.S. Const. amend. XIV 1` — no `§`) still rejects, because the regex
  still requires `§ <numeral>` to capture as section.

  7 regression tests in `tests/extract/issueConstSectionNoComma.test.ts`.

- [#741](https://github.com/medelman17/eyecite-ts/pull/741) [`f34ac7e`](https://github.com/medelman17/eyecite-ts/commit/f34ac7e718a9c6615f693c2e18aa9af06cb5024e) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): constitutional citations chained with `;` now expand (#707)

  Resolves #707. String-cited constitutional references separated by `;`
  (`U.S. Const. art. III, § 2, cl. 1; amend. XIV, § 1`) only produced
  a citation for the head — the trailing `;\s*art./amend. ...` had no
  `Const.` anchor for the tokenizer pattern to match. Common in
  scholarly footnotes and brief arguments.

  | input                                               | before | after               |
  | --------------------------------------------------- | ------ | ------------------- |
  | `U.S. Const. art. III, § 2, cl. 1; amend. XIV, § 1` | 1 cite | 2 cites ✓           |
  | `U.S. Const. art. I, § 8; art. II, § 1`             | 1 cite | 2 cites ✓           |
  | `U.S. Const. art. I, § 1; amend. V; amend. XIV`     | 1 cite | 3 cites ✓           |
  | `Cal. Const. art. I, § 7; art. II, § 2`             | 1 cite | 2 cites (both CA) ✓ |

  Added a post-extraction pass `expandChainedConstitutional` that scans
  forward from each constitutional cite's cleanEnd across `;` separators
  for additional body-tail matches (`art./amend. <numeral> [§ N] [cl. M]`)
  and emits a synthetic citation per element inheriting the head's
  jurisdiction (US / state code).

  6 regression tests in `tests/extract/issueConstSemicolonChain.test.ts`.

- [#715](https://github.com/medelman17/eyecite-ts/pull/715) [`3285798`](https://github.com/medelman17/eyecite-ts/commit/32857989c69745741b8b989232bffce480a6b649) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): date-strip handles dashed and ISO-format dates

  The numeric-date strip in `stripDateFromCourt` only handled `M/D/YYYY`
  (slash separator). Other common formats leaked partial date content
  into the `court` field:

  | input                   | before                      | after                |
  | ----------------------- | --------------------------- | -------------------- |
  | `(9th Cir. 02-15-2020)` | `court="9th Cir. 02-15-"`   | `court="9th Cir."` ✓ |
  | `(9th Cir. 2020-02-15)` | `court="9th Cir. 2020-02-"` | `court="9th Cir."` ✓ |
  | `(9th Cir. 2020/02/15)` | `court="9th Cir. 2020/02/"` | `court="9th Cir."` ✓ |

  Extended to two regex alternatives:

  - `\d{1,2}[/-]\d{1,2}[/-]\d{4}` — day-first or M/D forms
  - `\d{4}[/-]\d{1,2}[/-]\d{1,2}` — ISO year-first forms

  6 regression tests in `tests/extract/issueCourtDateFormatLeaks.test.ts`.

- [#704](https://github.com/medelman17/eyecite-ts/pull/704) [`bd89cd7`](https://github.com/medelman17/eyecite-ts/commit/bd89cd708a3b254de4a023eab0fdb8f64e5692d0) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): year + trailing disposition modifier no longer leaks into court field

  When a court parenthetical had `<court> <year> <modifier>` shape — e.g.,
  `(9th Cir. 1990 mem.)`, `(2d Cir. 1990 unpublished)`,
  `(D. Mass. 1990 per curiam)` — the year sat in the middle and the bare
  trailing-`\d{4}` strip could not reach it. The full `<year> <modifier>`
  chunk leaked into the `court` field:

  | input                                           | before                              | after                |
  | ----------------------------------------------- | ----------------------------------- | -------------------- |
  | `Smith, 100 F.2d 1 (9th Cir. 1990 mem.)`        | `court="9th Cir. 1990 mem."`        | `court="9th Cir."` ✓ |
  | `Smith, 100 F.2d 1 (9th Cir. 1990 unpublished)` | `court="9th Cir. 1990 unpublished"` | `court="9th Cir."` ✓ |
  | `Smith, 100 F.2d 1 (9th Cir. 1990 per curiam)`  | leaks                               | `court="9th Cir."` ✓ |
  | `Smith, 100 F.2d 1 (9th Cir. 1990 en banc)`     | leaks                               | `court="9th Cir."` ✓ |

  Added an early-pass `\s*\d{4}\s+(?:mem\.?|unpub\.?|unpublished|per\s+curiam|en\s+banc|slip\s+op\.?|table|supp\.?)\s*$`
  regex in `stripDateFromCourt` that lifts the year+modifier suffix before
  the existing date-component strips run.

  7 regression tests in `tests/extract/issueCourtWithTrailingModifier.test.ts`.

- [#685](https://github.com/medelman17/eyecite-ts/pull/685) [`132cb4d`](https://github.com/medelman17/eyecite-ts/commit/132cb4dc468c86d85fd7f268c0f86d10b7d4ae4d) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): date-modifier verbs (`filed`, `decided`, `argued`, etc.) no longer pollute `court` field

  Following the disposition + editorial + judge-attribution fixes,
  Bluebook Rule 10.5 date-modifier verbs that prefix a date inside the
  court parenthetical still leaked into the `court` field:

  - `(filed Jan. 15, 1990)` → `court="filed"` ⇒ now `undefined`
  - `(decided Mar. 15, 1990)` → `court="decided"` ⇒ now `undefined`
  - `(argued Apr. 1, 1990)` → `court="argued"` ⇒ now `undefined`
  - `(submitted Jan. 1, 1990)` → `court="submitted"` ⇒ now `undefined`
  - `(effective Jan. 1, 1990)` → `court="effective"` ⇒ now `undefined`
  - `(entered Jan. 1, 1990)` → `court="entered"` ⇒ now `undefined`
  - `(heard Jan. 1, 1990)` → `court="heard"` ⇒ now `undefined`
  - `(argued ..., decided ...)` → `court="argued Apr. 1, 1990, decided"` ⇒ now `undefined`

  Detection: after year+date-stripping, content starting with one of
  these verb prefixes is rejected.

  10 regression tests in `tests/extract/issueDateModifierAsCourt.test.ts`.

- [#678](https://github.com/medelman17/eyecite-ts/pull/678) [`9bb4755`](https://github.com/medelman17/eyecite-ts/commit/9bb47551295c2c3674c037c2e84a40ff03321a6c) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): disposition tokens no longer pollute the court field

  When a citation's parenthetical contained a bare disposition signal
  (Bluebook Rule 10.7) without a court abbreviation —
  `Smith, 100 F.2d 1 (rev'd 1990)`, `(per curiam 1990)`, `(en banc)`,
  `(cert. denied 1990)`, `(dismissed 1990)` — the post-year-strip token
  fell through `stripDateFromCourt` and surfaced as a (wrong) court value:
  `court="rev'd"`, `court="per curiam"`, etc.

  Fix: after stripping the trailing date, reject content that matches a
  known disposition signal (`rev'd`, `aff'd`, `rev'g`, `aff'g`, `mod'd`,
  `cert. denied|granted|dismissed`, `appeal denied|dismissed|docketed`,
  `dismissed`, `reversed`, `vacated`, `vacating`, `overruled (by)`,
  `overruling`, `en banc`, `per curiam`), optionally followed by
  `in part`, `on other grounds`, or `sub nom.`.

  The disposition information itself is not yet surfaced as a structured
  field for bare-parenthetical cases like `(en banc)` — that remains a
  follow-up. This patch only stops the wrong value from leaking into
  `court`.

  8 regression tests in `tests/extract/issueDispositionAsCourt.test.ts`.

- [#695](https://github.com/medelman17/eyecite-ts/pull/695) [`d15422a`](https://github.com/medelman17/eyecite-ts/commit/d15422a613923e92f3879c3f5c06bfd24d8f3788) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): Federal Register and Statutes at Large pages accept thousands-grouping commas

  The Federal Register and Statutes at Large patterns + extractors used
  bare `\d+` for the page, so a comma-grouped page (`12,345`,
  `1,234,567`) truncated to just the digits before the first comma:

  | input                 | before                                     | after                                               |
  | --------------------- | ------------------------------------------ | --------------------------------------------------- |
  | `85 Fed. Reg. 12,345` | `matchedText="85 Fed. Reg. 12"`, `page=12` | `matchedText="85 Fed. Reg. 12,345"`, `page=12345` ✓ |
  | `134 Stat. 1,234`     | `matchedText="134 Stat. 1"`, `page=1`      | `matchedText="134 Stat. 1,234"`, `page=1234` ✓      |

  Federal Register pages routinely exceed 10,000 so the comma form is
  common in practice. Both pattern and extractor regex now accept
  `\d{1,3}(?:,\d{3})+|\d+`; the integer `page` field strips commas
  before `parseInt`.

  4 regression tests in `tests/extract/issueFedRegCommaPage.test.ts`.

- [#708](https://github.com/medelman17/eyecite-ts/pull/708) [`0124ac3`](https://github.com/medelman17/eyecite-ts/commit/0124ac311ee75a2cd182e9609d61e15daf92c77b) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): Federal Register year extracts from trailing parens beyond the matched token

  The Federal Register extractor's year regex only scanned the matched
  token text. Since the token only covers `<vol> Fed. Reg. <page>` (not
  the trailing date parenthetical), the year was never extracted:

  | input                                | before         | after       |
  | ------------------------------------ | -------------- | ----------- |
  | `85 Fed. Reg. 12,345 (2020)`         | year=undefined | year=2020 ✓ |
  | `85 Fed. Reg. 12,345 (Mar. 1, 2020)` | year=undefined | year=2020 ✓ |
  | `85 Fed. Reg. 12345 (2020)`          | year=undefined | year=2020 ✓ |

  Mirrored the `cleanedText`-based year scan from `extractStatutesAtLarge`:
  extend the scan window 64 characters beyond `span.cleanEnd` to catch
  the trailing date paren. Plausibility filter (`isPlausibleYear`) still
  rejects page-like numbers.

  5 regression tests in `tests/extract/issueFedRegYear.test.ts`.

- [#734](https://github.com/medelman17/eyecite-ts/pull/734) [`1f448f6`](https://github.com/medelman17/eyecite-ts/commit/1f448f6786f292d14234a833c5d7ecd0b0ab6858) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): federal rule acronym forms recognized (`FRCP`, `F.R.C.P.`, `FRE`, etc.) (#696)

  Resolves #696. The federal-rule extractor recognized only the canonical
  `Fed. R. Civ. P. 12` and spelled-out `Federal Rule of Civil Procedure 12`
  forms. Common acronym shorthand used in casual writing, court orders,
  and briefs was silently dropped:

  | input           | before  | after                |
  | --------------- | ------- | -------------------- |
  | `FRCP 12(b)(6)` | 0 cites | ruleSet=civil ✓      |
  | `FRE 401`       | 0 cites | ruleSet=evidence ✓   |
  | `FRAP 4(a)`     | 0 cites | ruleSet=appellate ✓  |
  | `FRCrP 11`      | 0 cites | ruleSet=criminal ✓   |
  | `FRBP 7001`     | 0 cites | ruleSet=bankruptcy ✓ |
  | `F.R.C.P. 12`   | 0 cites | ruleSet=civil ✓      |
  | `F.R.E. 401`    | 0 cites | ruleSet=evidence ✓   |
  | `F.R.A.P. 4(a)` | 0 cites | ruleSet=appellate ✓  |

  Added a third pattern (`fed-rule-acronym`) for bare acronyms and dotted
  forms, plus matching entries in `RULE_SET_MAP`. The dotted forms
  (`F.R.C.P.`) normalize via the period-and-space strip to the same key
  as the bare form (`FRCP`).

  10 regression tests in `tests/extract/issueFedRuleAcronym.test.ts`.

- [#755](https://github.com/medelman17/eyecite-ts/pull/755) [`1e45cdf`](https://github.com/medelman17/eyecite-ts/commit/1e45cdf4c2649be91cac0cc5858d442c28fe517a) Thanks [@medelman17](https://github.com/medelman17)! - fix(filter): warn when applyFalsePositiveFilters called without originalText (#606)

  Resolves #606. `applyFalsePositiveFilters` silently skipped the
  line-crossing check (#547) when the `originalText` parameter was
  omitted, letting line-crossing false positives slip through.

  Now emits a one-time `console.warn` (per process, idempotent across
  repeated calls) when called without `originalText` AND the input
  contains at least one case/shortFormCase citation (the only types
  the line-crossing check applies to). Pure statute / journal / neutral
  inputs do not trigger the warning.

  The signature is unchanged so this is a non-breaking patch. JSDoc
  updated to mark `originalText` as **strongly recommended**.

  Internal export `_resetMissingOriginalTextWarning()` added for test
  fixtures.

  5 regression tests in
  `tests/extract/issueFpFilterMissingOriginalTextWarning.test.ts`.

- [#727](https://github.com/medelman17/eyecite-ts/pull/727) [`d3925e3`](https://github.com/medelman17/eyecite-ts/commit/d3925e3e1f21eccc45789a214380405491d1b8fb) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): `Id.at 5` (no space before `at`) captures pincite

  Resolves #683. The Id./Ibid. pincite-capture regexes required at least
  one whitespace character between the closing period/comma and the `at`
  keyword. OCR / compressed text frequently omits this space, producing
  `Id.at 5` which silently dropped the pincite:

  | input                           | before                               | after                              |
  | ------------------------------- | ------------------------------------ | ---------------------------------- |
  | `Smith, 100 F.2d 1. Id.at 5.`   | matchedText=`Id.`, pincite=undefined | matchedText=`Id.at 5`, pincite=5 ✓ |
  | `Smith, 100 F.2d 1. Ibid.at 5.` | similar                              | pincite=5 ✓                        |

  Changed `\s+at` to `\s*at` in three regexes: `ID_PATTERN` and
  `IBID_PATTERN` (tokenizer) and the inline `idRegex` in `extractId`
  (extractor). Canonical `Id. at 5` and bare `Id.` continue to work.

  5 regression tests in `tests/extract/issueIdAtNoSpace.test.ts`.

- [#764](https://github.com/medelman17/eyecite-ts/pull/764) [`d6060d4`](https://github.com/medelman17/eyecite-ts/commit/d6060d40558530851874f1f1bee0be8ca236c276) Thanks [@medelman17](https://github.com/medelman17)! - fix(resolve): bare `Id.` attaches to immediately preceding cite of any type (#721)

  Resolves #721. Per Bluebook Rule 4.1, bare `Id.` (no pincite)
  attaches to the immediately preceding cited authority of any type.
  The resolver's case-family-preference filter overrode positional
  priority — `42 U.S.C. § 1983. Id.` resolved to an earlier case if
  one was in scope.

  | input                                                                             | before       | after       |
  | --------------------------------------------------------------------------------- | ------------ | ----------- |
  | `Smith, 100 F.2d 1. 42 U.S.C. § 1983. Id.`                                        | Smith (case) | statute ✓   |
  | `42 U.S.C. § 1983. Id.` (statute only)                                            | statute      | unchanged ✓ |
  | `Smith, 100 F.2d 1. 42 U.S.C. § 1983. Id. at 5.` (page pincite, case family)      | Smith        | unchanged ✓ |
  | `Smith, 100 F.2d 1. 42 U.S.C. § 1983. Id. § 7.` (section pincite, statute family) | statute      | unchanged ✓ |
  | `42 U.S.C. § 1983. Smith, 100 F.2d 1. Id.` (case is most recent)                  | Smith        | unchanged ✓ |

  `resolveId` now skips family preference when Id. has NO pincite AND
  NO trailing `§ N` section marker — the bare form is unambiguously
  positional. Id. WITH an explicit pincite still uses family
  preference (the pincite shape disambiguates: `Id. § 5` → statute
  family; `Id. at 27` → case family).

  Two existing tests (issue480_idAntecedent.test.ts:217, integration/
  resolution.test.ts:239) asserted the old behavior — both updated to
  match the corrected positional rule.

  5 regression tests in `tests/extract/issueIdCrossType.test.ts`.

- [#760](https://github.com/medelman17/eyecite-ts/pull/760) [`9eefef7`](https://github.com/medelman17/eyecite-ts/commit/9eefef757d825b7417c821ca3a746d94a91709e4) Thanks [@medelman17](https://github.com/medelman17)! - fix(filter): hard-reject vol=0, page=0, vol > 999999 (#673 bugs 6-8)

  Resolves bugs 6-8 of #673. Implausible volume / page magnitudes are
  now hard-rejected — real reporters always have volume ≥ 1 and page
  ≥ 1, and volumes never reach 10-digit territory. These citations
  come from misread digit sequences in prose.

  | input                         | before                 | after           |
  | ----------------------------- | ---------------------- | --------------- |
  | `0 U.S. 1`                    | extracts with conf=0.6 | hard-rejected ✓ |
  | `1 U.S. 0`                    | extracts with conf=0.6 | hard-rejected ✓ |
  | `1234567890 U.S. 1`           | extracts with conf=0.1 | hard-rejected ✓ |
  | `100 U.S. 1` (normal)         | unchanged              | unchanged ✓     |
  | `100 U.S. 1234` (normal page) | unchanged              | unchanged ✓     |

  Added `isImplausibleVolumePageMagnitude` to the hard-reject pass.
  The existing `isImplausibleVolume` flag-and-penalize behavior still
  applies for the in-between range (vol > 2000 but ≤ 999999) so
  year-as-volume neutral citations continue to work.

  The previously-asserted `0 F.2d 1` → vol=0 test case in
  `issueLeadingZeroVolume.test.ts` was updated to expect 0 cites
  (leading-zero forms `01`, `001` etc. still parse correctly to
  integer values).

  7 regression tests in `tests/extract/issueImplausibleVolPage.test.ts`
  covering the three rejection paths plus regression controls.

- [#736](https://github.com/medelman17/eyecite-ts/pull/736) [`0897e12`](https://github.com/medelman17/eyecite-ts/commit/0897e12da4f9fe5085b071d6382fd47c0b28ae9a) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): impossible dates (Feb 30, Apr 31, Feb 29 non-leap) fall back to month-only (#716)

  Resolves #716. `parseDate` accepted syntactically well-formed but
  semantically impossible dates (`Feb 30`, `Apr 31`, `Feb 29` in non-leap
  years), producing a syntactically valid ISO string for a date that
  doesn't exist:

  | input                    | before                       | after                              |
  | ------------------------ | ---------------------------- | ---------------------------------- |
  | `Feb 30 2020`            | `iso="2020-02-30"`, `day=30` | `iso="2020-02"`, `day=undefined` ✓ |
  | `Apr 31 2020`            | `iso="2020-04-31"`           | `iso="2020-04"` ✓                  |
  | `Feb 29 2021` (non-leap) | `iso="2021-02-29"`           | `iso="2021-02"` ✓                  |
  | `Feb 29 2020` (leap)     | `iso="2020-02-29"`           | unchanged ✓                        |

  Added `isValidDate(year, month, day)` helper with leap-year awareness
  (div-4, except centuries unless div-400). All four parseDate code paths
  (abbreviated month, full month, ISO, European) now drop the `day`
  field when invalid and return `{ year, month }` instead.

  6 regression tests in `tests/extract/dates.invalidDate.test.ts`.

- [#761](https://github.com/medelman17/eyecite-ts/pull/761) [`b3bdc9f`](https://github.com/medelman17/eyecite-ts/commit/b3bdc9f52cbfea2e0a3ec9dac5ba330fab669f9d) Thanks [@medelman17](https://github.com/medelman17)! - Fix `loadReporters()` packaging — `data/reporters.json` was missing from the published tarball and the loader used the deprecated `assert: { type: "json" }` import attribute that Node 22+ rejects. Both compounded: every fresh `npm install` produced `ERR_MODULE_NOT_FOUND`, and even with the file present, modern Node failed with `ERR_IMPORT_ATTRIBUTE_MISSING`. A third latent bug shipped a 485 KB orphan chunk that nothing imported.

  `reporters.json` is now codegenned into a TypeScript module (`src/data/reporters.gen.ts`) at build time, wrapped in `JSON.parse('...')` for V8's fast-path. Rolldown auto-splits the dynamic import into a sibling ESM + CJS chunk in `dist/`, preserving lazy loading without any import-attribute syntax. The generated chunks' sourcemaps (~2.3 MB, no debugging value for a `JSON.parse` blob) are excluded from the tarball, trimming the unpacked install by ~33%. Includes a new integration test that builds, packs, and installs the tarball into a fresh consumer to prevent regression.

  Fixes #642.

- [#775](https://github.com/medelman17/eyecite-ts/pull/775) [`746a1ad`](https://github.com/medelman17/eyecite-ts/commit/746a1ad03dd842440323c00b5cacd7702421ac30) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): filter journal phantom matches in standalone prose (#615)

  Resolves #615. The journal `law-review` regex is intentionally broad
  (no journals-db gate) so it can fire on any `[volume] [Capitalized Run]
[page]` shape — including pure prose like `In 1974 Senator Smith Jones
500 cases were filed.`. The post-#614 overlap-dedup pass catches phantoms
  that overlap higher-priority citations, but standalone-prose phantoms
  slipped through.

  The extractor now drops multi-word journal captures that lack BOTH a
  period AND a short (≤2 char) word. Real journal abbreviations satisfy
  at least one of:

  - single word (`Neurology`, `JAMA`, `Science`), OR
  - contains a period (`Harv. L. Rev.`, `Yale L.J.`), OR
  - contains a short token (`Brook L Rev`, `Yale L J` — `L`, `J`, `Rev`).

  | input                                               | before                                | after       |
  | --------------------------------------------------- | ------------------------------------- | ----------- |
  | `In 1974 Senator Smith Jones 500 cases were filed.` | phantom journal `Senator Smith Jones` | dropped ✓   |
  | `70 Brook L Rev 1045`                               | journal `Brook L Rev`                 | unchanged ✓ |
  | `96 Yale L J 1234`                                  | journal `Yale L J`                    | unchanged ✓ |
  | `53 Neurology 1107`                                 | journal `Neurology`                   | unchanged ✓ |
  | `100 Harv. L. Rev. 500`                             | journal `Harv. L. Rev.`               | unchanged ✓ |
  | `285 JAMA 2486`                                     | journal `JAMA`                        | unchanged ✓ |

  7 regression tests in `tests/extract/issue615JournalPhantom.test.ts`.

- [#735](https://github.com/medelman17/eyecite-ts/pull/735) [`666b677`](https://github.com/medelman17/eyecite-ts/commit/666b6774f7d8d955bcbf4e1de64f4de0e227780c) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): leading-zero volumes consistently parse as integers (#703)

  Resolves #703. The case-extractor's `parseVolume` used `String(num) === raw`
  to decide whether a volume was purely numeric. Leading-zero forms
  (`"01"`, `"001"`) failed that equality check (`String(1) !== "01"`) and
  fell through to the string branch, producing inconsistent typing:

  | input           | before                     | after                 |
  | --------------- | -------------------------- | --------------------- |
  | `0 F.2d 1`      | volume=`0` (number)        | volume=`0` (number) ✓ |
  | `01 F.2d 1`     | volume=`"01"` (string)     | volume=`1` (number) ✓ |
  | `001 F.2d 1`    | volume=`"001"` (string)    | volume=`1` (number) ✓ |
  | `1984-1 F.2d 1` | volume=`"1984-1"` (string) | unchanged ✓           |

  Fix: parse purely-digit volumes via `Number.parseInt` unconditionally
  (detected by `/^\d+$/`). Hyphenated forms (`1984-1`) still return as
  strings.

  7 regression tests in `tests/extract/issueLeadingZeroVolume.test.ts`.

- [#733](https://github.com/medelman17/eyecite-ts/pull/733) [`f80f57c`](https://github.com/medelman17/eyecite-ts/commit/f80f57c0c7cb834fb5adfa59570139f93a73f93d) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): misspelled / OCR-mangled month names stripped from court (#717)

  Resolves #717. The date-strip pipeline only knew canonical month names
  and abbreviations (`Jan`-`Dec`, `January`-`December`). Misspelled or
  truncated month names (`Jaunary` for January, `Ferbuary` for February,
  `Marc` for March, `Septmber` for September) leaked into the court field:

  | input                                           | before                    | after              |
  | ----------------------------------------------- | ------------------------- | ------------------ |
  | `Smith, 100 F.2d 1 (9th Cir. Jaunary 15, 2020)` | court=`9th Cir. Jaunary`  | court=`9th Cir.` ✓ |
  | `Smith, 100 F.2d 1 (9th Cir. Ferbuary 2020)`    | court=`9th Cir. Ferbuary` | court=`9th Cir.` ✓ |
  | `Smith, 100 F.2d 1 (9th Cir. Marc 15, 2020)`    | court=`9th Cir. Marc`     | court=`9th Cir.` ✓ |

  Added a fuzzy-match strip after the canonical month strip: if the
  trailing word is Title-Case, 3-12 chars, starts with the same letter
  as a month name, and has Levenshtein distance ≤ 2 from that month,
  strip it. The first-letter constraint prevents real court abbreviations
  like `Cal.` (distance 2 from `Jan`) from being mis-stripped.

  A `NO_STRIP_TRAILING` blocklist (Cir, Ct, App, Sup, Dist, Div, etc.)
  provides an explicit safety net for court abbreviation tokens.

  8 regression tests in `tests/extract/issueMisspelledMonthStrip.test.ts`.

- [#747](https://github.com/medelman17/eyecite-ts/pull/747) [`1f3b86f`](https://github.com/medelman17/eyecite-ts/commit/1f3b86ff5ef36b73a455bfd6a3ffbc8e5e4877db) Thanks [@medelman17](https://github.com/medelman17)! - fix(filter): hard-reject phantoms whose reporter contains a month name (#669)

  Resolves #669. Multi-word "reporter" captures containing a month-name
  token (`On July`, `From January`, `By December`) are always prose, never
  real citations — real reporter abbreviations never contain month names.
  Previously these survived as confidence=0.1 + warning under the
  penalize path; now they are hard-rejected so consumers never see them.

  | input                                     | before            | after       |
  | ----------------------------------------- | ----------------- | ----------- |
  | `¶ 8 On July 11`                          | 1 cite (conf 0.1) | 0 cites ✓   |
  | `¶ 2 On March 18, 2003`                   | 1 cite (conf 0.1) | 0 cites ✓   |
  | `1-602 Applications\nOn October 19, 2015` | 1 cite (conf 0.1) | 0 cites ✓   |
  | `Smith v. Jones, 100 F.2d 1` (real cite)  | unchanged         | unchanged ✓ |

  Added `isMonthInProseReporter` to `applyFalsePositiveFilters`' hard-
  reject pass alongside the existing `isMonthNameDateMisparse`. The new
  check fires when the reporter has ≥2 words and any word is a month
  name (case-insensitive).

  Two previously-skipped tests in `issuePhantomCaseRejection.test.ts`
  are now enabled. The penalize-mode test in `issue547FullspanOvershoot.test.ts`
  was updated to assert hard-rejection (the cleaner outcome the issue
  asked for).

- [#698](https://github.com/medelman17/eyecite-ts/pull/698) [`1d3cbf5`](https://github.com/medelman17/eyecite-ts/commit/1d3cbf57c69ab613ce1f00ef6bfa5d8ee5d62362) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): approximate-year prefixes (`c.`, `circa`, `about`, `cir.`) no longer pollute court

  Extends PR #685 (date-modifier verbs) by catching additional non-court
  prefixes that leak after year-stripping:

  | input                              | before                | after             |
  | ---------------------------------- | --------------------- | ----------------- |
  | `Smith, 100 F.2d 1 (c. 1990)`      | `court="c."`          | `court=undefined` |
  | `Smith, 100 F.2d 1 (circa 1990)`   | `court="circa"`       | `court=undefined` |
  | `Smith, 100 F.2d 1 (about 1990)`   | `court="about"`       | `court=undefined` |
  | `Smith, 100 F.2d 1 (approx. 1990)` | `court="approx."`     | `court=undefined` |
  | `Smith, 100 F.2d 1 (cir. 1990)`    | `court="cir."` (typo) | `court=undefined` |

  These are approximate-year prefixes that historians, academic writing,
  and OCR artifacts use when the exact decision date is unknown. The
  lowercase `cir.` is a common typo for `Cir.`. Added a leading-word
  check for `c.|circa|about|approx.|approximately|cir.` after year/date
  stripping.

  8 regression tests in `tests/extract/issueMoreNonCourtPrefixes.test.ts`.

- [#732](https://github.com/medelman17/eyecite-ts/pull/732) [`c4e7621`](https://github.com/medelman17/eyecite-ts/commit/c4e7621338a061c7c7f5f0ffcb1b2138c2a2a484) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): nested year parenthetical does not leak into court (#682)

  Resolves #682. When a citation's year parenthetical contained a nested
  disposition paren (`(1990 (en banc))`, `(9th Cir. 1990 (per curiam))`),
  the trailing-year strip couldn't reach the year because `(en banc)`
  sat between it and end-of-string. The whole `1990 (en banc)` residue
  leaked into the `court` field:

  | input                                         | before                          | after              |
  | --------------------------------------------- | ------------------------------- | ------------------ |
  | `Smith, 100 F.2d 1 (1990 (en banc))`          | court=`1990 (en banc)`          | undefined ✓        |
  | `Smith, 100 F.2d 1 (9th Cir. 1990 (en banc))` | court=`9th Cir. 1990 (en banc)` | court=`9th Cir.` ✓ |

  Added a leading-pass that strips a trailing nested `\([^()]*\)` before
  the year/date strips run. The year stays in the parent paren and is
  extracted normally; the nested disposition is discarded (could be
  surfaced as structured disposition in a future enhancement).

  4 regression tests in `tests/extract/issueNestedYearParen.test.ts`.

- [#757](https://github.com/medelman17/eyecite-ts/pull/757) [`8a86e2d`](https://github.com/medelman17/eyecite-ts/commit/8a86e2d41ef6a7dea74b928b98afef2df9fe93fb) Thanks [@medelman17](https://github.com/medelman17)! - fix(clean): strip vulgar fractions, numero sign, CJK units pre-NFKC (#605)

  Resolves #605. Sprint A audit identified additional chars beyond
  ™ ® ℠ © that NFKC expands to multi-char ASCII — `½` → "1⁄2",
  `№` → "No", `㎡` → "m2", `℃` → "°C", etc. These expansions break
  the implicit invariant that cleaning never lengthens text, and can
  drift position mapping or create false-positive citation matches.

  Extended `normalizeUnicode` to strip these chars before NFKC:

  - Vulgar fractions (`¼-¾`, `⅐-⅞`)
  - Numero sign (`№`)
  - CJK compatibility units + Letterlike Symbols (`㎀-㏿`, `℀-⅏`)

  These chars are vanishingly rare in legal text — when they do appear
  (`Case № 12-345`), surrounding context preserves the meaning, so
  stripping is a safer default than letting NFKC expand inline.

  The cleaned text length is now guaranteed never to _exceed_ the
  original length under `normalizeUnicode`.

  6 regression tests in `tests/clean/issueNfkcExpansionAudit.test.ts`,
  including a length-invariant assertion across a sample of inputs.

- [#680](https://github.com/medelman17/eyecite-ts/pull/680) [`9802b4d`](https://github.com/medelman17/eyecite-ts/commit/9802b4df313acefe032da415aefe2dc0f9d5ec18) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): editorial and judge-attribution parentheticals no longer pollute `court` field

  Following the disposition-token fix, several other non-court tokens
  still leaked into the `court` field when they appeared in the
  year/court parenthetical position:

  - **Editorial status**: `(n.d.)`, `(no date)`, `(year omitted)`,
    `(unpub.)`, `(unpublished)`, `(slip op.)`, `(table)`, `(mem.)`
  - **Judge attribution with role**: `(Smith, J., dissenting)`,
    `(Jones, J., concurring)`, `(Doe, JJ., joining)` — the existing
    trailing-only `, J.` guard missed these because the role word
    (`dissenting`/`concurring`/`joining`) followed the `J.` marker.

  Added two new guards inside `stripDateFromCourt`:

  1. A mid-string `, J.,` / `, JJ.,` followed by a role keyword
  2. A whole-content regex for editorial status tokens

  Real court abbreviations (`9th Cir.`, `D. Mass.`, `S.D.N.Y.`) continue
  to pass through unchanged.

  11 regression tests in `tests/extract/issueNonCourtParentheticals.test.ts`.

- [#730](https://github.com/medelman17/eyecite-ts/pull/730) [`a12a7ca`](https://github.com/medelman17/eyecite-ts/commit/a12a7cad47088079d76fbd7968fe6ea98c7adf55) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): adverb-prefixed disposition tokens don't pollute court (#719)

  Resolves #719. PR #678's disposition-token rejection required the
  disposition to start the content (`^(?:rev'd|aff'd|...|reversed|...)`).
  When the disposition is prefixed with `now`, `previously`, `formerly`,
  or `since`, the regex didn't match and the prefix+disposition leaked
  into court:

  | input                                          | before               | after       |
  | ---------------------------------------------- | -------------------- | ----------- |
  | `Smith, 100 F.2d 1 (now reversed, 1990)`       | court=`now reversed` | undefined ✓ |
  | `Smith, 100 F.2d 1 (previously vacated, 1990)` | leaks                | undefined ✓ |
  | `Smith, 100 F.2d 1 (formerly aff'd, 1990)`     | leaks                | undefined ✓ |
  | `Smith, 100 F.2d 1 (since overruled, 1990)`    | leaks                | undefined ✓ |

  Added an optional leading adverb (`(?:(?:now|previously|formerly|since)\s+)?`)
  before the disposition token. Existing bare-disposition forms continue
  to be rejected.

  8 regression tests in `tests/extract/issueNowReversedDisposition.test.ts`.

- [#756](https://github.com/medelman17/eyecite-ts/pull/756) [`7209e5e`](https://github.com/medelman17/eyecite-ts/commit/7209e5ebc0b9f6fdadab391d989e35e06c782958) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): `NYC Admin. Code` bare prefix routes to NY (#594)

  Resolves the bare-prefix gap of #594. The canonical `N.Y.C. Admin.
Code` and spelled-out `New York City Administrative Code` forms were
  already correct, but the bare-period form (`NYC Admin. Code § 8-107`)
  was mis-tagged as Georgia by the `ga-pre-1983` fallback because the
  `nyc-admin-code` pattern only matched the period-rich variant.

  | input                                       | before          | after                      |
  | ------------------------------------------- | --------------- | -------------------------- |
  | `NYC Admin. Code § 8-107`                   | code=`Code`, GA | `N.Y.C. Admin. Code`, NY ✓ |
  | `NYC Admin Code § 8-107` (no `.`)           | code=`Code`, GA | `N.Y.C. Admin. Code`, NY ✓ |
  | `N.Y.C. Admin. Code § 8-107(1)(a)`          | unchanged       | unchanged ✓                |
  | `New York City Administrative Code § 8-107` | unchanged       | unchanged ✓                |

  Extended the tokenizer (`nyc-admin-code` pattern) and the matching
  extractor regex to accept the bare `NYC` prefix alongside the
  period-rich `N.Y.C.` form.

  4 regression tests in `tests/extract/issueNycAdminCodeBare.test.ts`.

- [#740](https://github.com/medelman17/eyecite-ts/pull/740) [`d9b4473`](https://github.com/medelman17/eyecite-ts/commit/d9b447362e76d8f3091a20cf4dfcf5e1b50bd6eb) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): OCR-typo ordinal reporters normalize to canonical form (#687)

  Resolves #687. Common OCR misreadings and spelled-ordinal variants of
  the `2d`/`3d` reporter suffix left `normalizedReporter` undefined,
  breaking parallel-citation grouping and `reporterKey`-based resolution:

  | input                           | before               | after       |
  | ------------------------------- | -------------------- | ----------- |
  | `100 F.2nd 1` (spelled ordinal) | normalized=undefined | `F.2d` ✓    |
  | `100 F.2ds 1` (spurious `s`)    | normalized=undefined | `F.2d` ✓    |
  | `100 F.2cl 1` (OCR `d`→`cl`)    | normalized=undefined | `F.2d` ✓    |
  | `100 F.3rd 1` (spelled)         | normalized=undefined | `F.3d` ✓    |
  | `100 F.3cl 1` (OCR)             | normalized=undefined | `F.3d` ✓    |
  | `100 Cal.2nd 1`                 | normalized=undefined | `Cal.2d` ✓  |
  | `100 F.4th 1` (canonical)       | unchanged            | unchanged ✓ |

  `resolveNormalizedReporter` now applies an OCR-typo fallback when the
  literal reporter is not in reporters-db. The literal `reporter` field
  on the citation is preserved verbatim — only `normalizedReporter`
  switches to the canonical key. This lets downstream consumers
  (`reporterKey`, parallel-group matching) link the typo'd variant to
  its real reporter without needing to re-clean the source text.

  8 regression tests in `tests/extract/issueOcrTypoReporters.test.ts`.

- [#737](https://github.com/medelman17/eyecite-ts/pull/737) [`d827acf`](https://github.com/medelman17/eyecite-ts/commit/d827acf3b93bf3666c48bd7819a3114c8f146378) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): page ranges in non-Federal case citations followed by a year (#705 partial)

  Case citations written as `<vol> <reporter> <pageStart>-<pageEnd> (<year>)`
  now extract for the U.S./S.Ct./L.Ed. and generic state-reporter patterns
  (the Federal Reporter already accepts page ranges). Previously only a bare
  page number `\d+` was accepted for these, so the citations were silently
  dropped:

  | input                                 | before  | after    |
  | ------------------------------------- | ------- | -------- |
  | `100 U.S. 1-5 (1990)`                 | 0 cites | 1 cite ✓ |
  | `100 Cal.4th 1-5 (1990)`              | 0 cites | 1 cite ✓ |
  | `Smith v. Jones, 100 U.S. 1-5 (1990)` | 0 cites | 1 cite ✓ |

  The new page-range alternative is gated on a following year parenthetical,
  which preserves K.S.A. statute extraction: `K.S.A. 1988 Supp. 44-556` (no
  year paren) still extracts as a statute, not as a phantom case.

  The `page` field still reports the start of the range (`1` for `1-5`); the
  full range is in `matchedText`. Surfacing the end page as a structured
  field is a follow-up.

  8 regression tests in `tests/extract/issuePageRangeHyphenWithYear.test.ts`.

- [#746](https://github.com/medelman17/eyecite-ts/pull/746) [`256a06c`](https://github.com/medelman17/eyecite-ts/commit/256a06c7e14997521ec877ee2bfa74313d8b3056) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): page-range with hyphen and no comma now extracts (#705)

  Resolves #705. `100 F.2d 1-5` (page range without comma) produced
  zero citations. The federal-reporter tokenizer's page-capture
  trailing lookahead (`-\D`) required hyphen + non-digit, which
  rejected the digit-hyphen-digit shape.

  | input                 | before    | after               |
  | --------------------- | --------- | ------------------- |
  | `100 F.2d 1-5`        | 0 cites   | page=1 ✓            |
  | `See 100 F.2d 1-5.`   | 0 cites   | page=1 ✓            |
  | `100 F.2d 1-5 (1990)` | 0 cites   | page=1, year=1990 ✓ |
  | `100 F.2d 1`          | unchanged | unchanged ✓         |
  | `100 F.2d 1, 5`       | unchanged | unchanged ✓         |

  Fix: extend the page capture in both the federal-reporter tokenizer
  pattern and the `VOLUME_REPORTER_PAGE_REGEX` extractor to accept
  `\d+-\d+` (range form) alongside `\d+` (single page).

  The `page` field reports the start of the range (1). End-of-range
  capture as a structured field is not part of this fix.

  5 regression tests in `tests/extract/issuePageRangeHyphen.test.ts`.

- [#690](https://github.com/medelman17/eyecite-ts/pull/690) [`64bfe4a`](https://github.com/medelman17/eyecite-ts/commit/64bfe4a0d06a4a5f511f048a1c7074c4e6d6404b) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): page terminators accept trailing quote, asterisk, angle brackets

  Extends PR #684's terminator fix. Citations followed by trailing quote
  or markdown asterisk were silently dropped:

  | input                           | before  | after    |
  | ------------------------------- | ------- | -------- |
  | `Smith, 100 F.2d 1"`            | 0 cites | 1 cite ✓ |
  | `Smith, 100 F.2d 1”` (curly)    | 0 cites | 1 cite ✓ |
  | `Smith, 100 F.2d 1*` (markdown) | 0 cites | 1 cite ✓ |
  | `Smith, 100 F.2d 1>`            | 0 cites | 1 cite ✓ |
  | `Smith, 100 F.2d 1<`            | 0 cites | 1 cite ✓ |

  Added `"`, `“`, `”`, `*`, `<`, `>` to the page-terminator character class
  across all three case-citation patterns. Real reporters never end with
  these characters, so this is safe and recovers common quoted/markdown
  trailing forms.

  8 regression tests in `tests/extract/issuePageTerminatorQuoteAsterisk.test.ts`.

- [#684](https://github.com/medelman17/eyecite-ts/pull/684) [`41e4dcb`](https://github.com/medelman17/eyecite-ts/commit/41e4dcb5a53e95f51b735a519ccc055139a4ed08) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): page terminators accept `!`, `?`, em/en dash, possessive `'s`

  The page-terminator character classes in all three case-citation
  patterns (federal, supreme, state) accepted only `\s`, `$`, parens,
  comma, semicolon, period, and brackets. Citations followed by
  common trailing punctuation were silently dropped:

  | input                              | before      | after        |
  | ---------------------------------- | ----------- | ------------ |
  | `Smith, 100 F.2d 1!`               | 0 citations | 1 citation ✓ |
  | `Smith, 100 F.2d 1?`               | 0 citations | 1 citation ✓ |
  | `Smith, 100 F.2d 1's holding`      | 0 citations | 1 citation ✓ |
  | `Smith, 100 F.2d 1—a notable case` | 0 citations | 1 citation ✓ |
  | `Smith, 100 F.2d 1–a notable case` | 0 citations | 1 citation ✓ |

  Added `!`, `?`, em dash (`—`), en dash (`–`), and apostrophe (`'`)
  to the terminator class. Also added `-` followed by `\D` (non-digit),
  because `normalizeDashes` rewrites in-word em/en dashes to ASCII `-`
  before tokenization, so `1—a` arrives as `1-a`. The `\D` lookahead
  preserves page-range syntax: `K.S.A. 2009 Supp. 44-501(d)(2)` is still
  parsed as the K.S.A. statute (not as a phantom case with page 44).

  8 regression tests in `tests/extract/issueTrailingPunctTerminator.test.ts`.

- [#762](https://github.com/medelman17/eyecite-ts/pull/762) [`81170f3`](https://github.com/medelman17/eyecite-ts/commit/81170f3db0ce7e72d3f9fd515a0f33c9ba9a3e83) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): parallel cites without year-paren propagate caseName (#653)

  Resolves #653. Parallel-cite caseName propagation required a shared
  closing parenthetical. When the chain ended at sentence-end (`.` or
  `;`) without a year-paren — common in older opinions citing parallel
  reporters — `caseName` did not propagate to the secondary.

  | input                                                          | before                       | after                            |
  | -------------------------------------------------------------- | ---------------------------- | -------------------------------- |
  | `Kauffman v. Griesemer, 26 Pa. 407, 67 Am. Dec. 437.`          | secondary caseName=undefined | both = `Kauffman v. Griesemer` ✓ |
  | `Smith v. Jones, 100 F.2d 1, 200 F. Supp. 5;`                  | secondary caseName=undefined | both = `Smith v. Jones` ✓        |
  | `Smith v. Jones, 100 F.2d 1, 200 F.2d 5 (1990).`               | unchanged                    | unchanged ✓                      |
  | `Smith v. Jones, 100 F.2d 1, 200 F. Supp. 456` (no terminator) | unchanged (strict)           | unchanged ✓                      |

  `isParallelChainTerminator` accepts `.` or `;` (followed by space/EOF)
  as an alternate chain terminator alongside the existing
  `hasSharedParenthetical` check. EOF alone is still rejected — that's
  the pre-existing test asserting strict behavior to prevent
  unrelated-cite grouping in truncated text.

  4 regression tests in `tests/extract/issueParallelNoYearParen.test.ts`.

- [#765](https://github.com/medelman17/eyecite-ts/pull/765) [`95b7843`](https://github.com/medelman17/eyecite-ts/commit/95b78433ad22f79a0c06e805a97651f099881030) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): parseDate handles `Mon., DD, YYYY` (comma after period) (#554)

  Resolves the remaining sub-issue of #554. `parseDate` dropped month/day
  for the `Mon., DD, YYYY` form (comma immediately after the period).
  The other non-canonical forms (ISO, European, slash, missing-space-
  after-period) had already been fixed by prior PRs.

  | input                       | before                       | after       |
  | --------------------------- | ---------------------------- | ----------- |
  | `Jan., 15, 2020`            | year=2020, month/day dropped | full date ✓ |
  | `Feb., 9, 2015`             | year=2015, month/day dropped | full date ✓ |
  | `Jan. 15, 1990` (canonical) | full date                    | unchanged ✓ |
  | `Jan.15, 1990` (no space)   | full date                    | unchanged ✓ |
  | `Jan 15, 1990` (no period)  | full date                    | unchanged ✓ |

  Fix: extended the abbreviated-month regex separator alternation from
  `(?:\.?\s+|\.\s*)` to `(?:\.?,?\s+|\.,?\s*)` to accept an optional
  comma between the period and the day.

  5 regression tests in `tests/extract/issueParseDateCommaAfterPeriod.test.ts`.

- [#774](https://github.com/medelman17/eyecite-ts/pull/774) [`4592683`](https://github.com/medelman17/eyecite-ts/commit/4592683cca82a52bffdef341daba3a944868fae8) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): partial-decimal section ranges populate sectionRange (#694 pt 3)

  Resolves part 3 of #694. Bluebook shorthand for state codes with
  decimal-suffixed sections (`Tex. Bus. & Com. Code Ann. §§ 17.50-.55`,
  where the trailing endpoint inherits the integer stem) and the full
  repeated form (`§§ 17.50-17.55`) weren't expanded into structured
  `sectionRange` data.

  | input                                             | before                          | after                                      |
  | ------------------------------------------------- | ------------------------------- | ------------------------------------------ |
  | `Tex. Bus. & Com. Code Ann. §§ 17.50-.55`         | section=`17.50-.55`, no range   | section=`17.50` + range `(17.50, 17.55)` ✓ |
  | `Tex. Bus. & Com. Code Ann. §§ 17.50-17.55`       | section=`17.50-17.55`, no range | section=`17.50` + range `(17.50, 17.55)` ✓ |
  | `Va. Code § 18.2-308.2` (regression: not a range) | unchanged                       | unchanged ✓                                |
  | `Tex. Bus. & Com. Code Ann. § 17.50` (single)     | unchanged                       | unchanged ✓                                |

  `parseBody` recognizes both partial (`.NN`) and full (`X.NN-X.MM`)
  decimal-range shorthand. The full-repeated form requires the integer
  stem to match on both sides to avoid mis-parsing VA hyphenated
  section identifiers (`18.2-308.2`) as ranges.

  Wired sectionRangeEnd through `extractAbbreviated` and `extractNamedCode`
  so the new sectionRange field is surfaced on the returned
  StatuteCitation.

  4 regression tests in `tests/extract/issuePartialDecimalSectionRange.test.ts`.

  This completes all 3 sub-issues of #694 across PRs #742, #754, and this PR.

- [#729](https://github.com/medelman17/eyecite-ts/pull/729) [`cdf623a`](https://github.com/medelman17/eyecite-ts/commit/cdf623abdf199d151c9c23ff032777818ac4e72d) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): pincite range accepts asymmetric spacing around hyphen (#722)

  Resolves #722. The pincite range regex required either no spaces or
  symmetric spaces around the hyphen. The asymmetric form (`5- 7`,
  `5 -7`) silently dropped the pincite:

  | input                      | before            | after       |
  | -------------------------- | ----------------- | ----------- |
  | `Smith, 100 F.2d 1, 5 - 7` | pincite=5         | pincite=5 ✓ |
  | `Smith, 100 F.2d 1, 5- 7`  | pincite=undefined | pincite=5 ✓ |
  | `Smith, 100 F.2d 1, 5 -7`  | pincite=5         | pincite=5 ✓ |
  | `Smith, 100 F.2d 1, 5-7`   | pincite=5         | pincite=5 ✓ |

  Changed `[-–—~]` to `\s*[-–—~]\s*` in three regexes:

  - `PINCITE_REGEX` (extractCase.ts inner)
  - `LOOKAHEAD_PINCITE_REGEX` (extractCase.ts trailing pincite scan)
  - `PINCITE_PARSE_REGEX` (pincite.ts numeric parser)

  All asymmetric and symmetric spacing forms now parse correctly.

  5 regression tests in `tests/extract/issuePinciteAsymmetricSpacing.test.ts`.

- [#725](https://github.com/medelman17/eyecite-ts/pull/725) [`855888d`](https://github.com/medelman17/eyecite-ts/commit/855888d952878633a58c50119e899c50708f2e6a) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): pincite parser accepts typography terminator (†, ‡, §, ¶, ©, °)

  Extends PR #724 (page terminator) to the pincite parsers. When a
  pincite digit was immediately followed by a typographic reference
  mark (`Smith, 100 F.2d 1, 5†`), the LOOKAHEAD_PINCITE_REGEX and
  ADDITIONAL_PINCITE_REGEX terminator classes did not include these
  chars, so the pincite was silently dropped:

  | input                   | before            | after       |
  | ----------------------- | ----------------- | ----------- |
  | `Smith, 100 F.2d 1, 5†` | pincite=undefined | pincite=5 ✓ |
  | `Smith, 100 F.2d 1, 5‡` | undefined         | 5 ✓         |
  | `Smith, 100 F.2d 1, 5§` | undefined         | 5 ✓         |
  | `Smith, 100 F.2d 1, 5¶` | undefined         | 5 ✓         |
  | `Smith, 100 F.2d 1, 5©` | undefined         | 5 ✓         |
  | `Smith, 100 F.2d 1, 5°` | undefined         | 5 ✓         |

  Added the six typography markers to both pincite-regex terminator
  character classes.

  8 regression tests in `tests/extract/issuePinciteTypographyTerminator.test.ts`.

- [#739](https://github.com/medelman17/eyecite-ts/pull/739) [`aa7e2f7`](https://github.com/medelman17/eyecite-ts/commit/aa7e2f7172847f27acf433921d43aff93b4de88b) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): case names inside quotation marks now capture caseName (#691)

  Resolves #691. When a case caption was wrapped in quotation marks
  (`"Smith v. Jones," 100 F.2d 1`), the V_CASE_NAME_REGEX anchored on
  a trailing comma and never matched — the closing quote sat between
  the defendant and the comma, breaking the anchor. Both common
  quote/comma orderings were affected:

  | input                                     | before             | after              |
  | ----------------------------------------- | ------------------ | ------------------ |
  | `"Smith v. Jones," 100 F.2d 1` (American) | caseName=undefined | `Smith v. Jones` ✓ |
  | `"Smith v. Jones", 100 F.2d 1` (British)  | caseName=undefined | `Smith v. Jones` ✓ |
  | `as held in "Smith v. Jones," 100 F.2d 1` | caseName=undefined | `Smith v. Jones` ✓ |
  | `“Smith v. Jones,” 100 F.2d 1` (curly)    | caseName=undefined | `Smith v. Jones` ✓ |
  | `Smith v. Jones, 100 F.2d 1` (no quotes)  | unchanged          | unchanged ✓        |

  Fix: in `extractCaseName`, strip a leading straight/curly quote and a
  trailing straight/curly quote adjacent to the citation-side comma
  before applying V_CASE_NAME_REGEX. Quote chars are not legal-citation
  punctuation; nothing real depends on them surviving at these
  positions.

  6 regression tests in `tests/extract/issueQuotedCaseName.test.ts`.

- [#769](https://github.com/medelman17/eyecite-ts/pull/769) [`2f3af24`](https://github.com/medelman17/eyecite-ts/commit/2f3af2448530f87e61eb7b9b849f4b20b7ec87a4) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): semicolon between page and pincite still extracts year+court (#525)

  Resolves the semicolon-pincite sub-issue of #525. OCR'd older
  opinions sometimes use a semicolon between page and pincite
  (`256 F.Supp. 572; 573-574 (S.D.N.Y. 1966)`). The comma-only
  separator in both `LOOKAHEAD_PINCITE_REGEX` and `LOOKAHEAD_PAREN_REGEX`
  dropped both the pincite AND the trailing year/court paren.

  | input                                                    | before                       | after                                      |
  | -------------------------------------------------------- | ---------------------------- | ------------------------------------------ |
  | `256 F.Supp. 572; 573-574 (S.D.N.Y. 1966)`               | pincite/year/court=undefined | pincite=573, year=1966, court=`S.D.N.Y.` ✓ |
  | `Smith, 100 F.2d 1; 5-7 (9th Cir. 1990)`                 | pincite/year=undefined       | pincite=5, year=1990 ✓                     |
  | `256 F.Supp. 572, 573 (S.D.N.Y. 1966)` (canonical comma) | unchanged                    | unchanged ✓                                |
  | `256 F.Supp. 572 at 573 (S.D.N.Y. 1966)` (at form)       | unchanged                    | unchanged ✓                                |

  Both lookahead regexes now accept `[,;]` as the page-to-pincite
  separator.

  4 regression tests in `tests/extract/issueSemicolonPincite.test.ts`.

- [#677](https://github.com/medelman17/eyecite-ts/pull/677) [`b73d042`](https://github.com/medelman17/eyecite-ts/commit/b73d0428cb6e0eb669aa596c86b3992f212afba5) Thanks [@medelman17](https://github.com/medelman17)! - fix(resolve): shortFormCase partyName disambiguation works when antecedent has no `v.`

  When two full case citations shared the same volume + reporter and the
  antecedents were one-party references (`Smith, 100 F.2d 1.`,
  `Doe, 100 F.2d 5.`), the shortFormCase resolver fell back to recency
  because the antecedents had `plaintiffNormalized`/`defendantNormalized`
  both undefined (the `v.` separator is what splits caseName into
  plaintiff + defendant). The disambiguation block at
  `DocumentResolver.ts:884` only checked those two fields, so
  `Smith, 100 F.2d at 3` resolved to **Doe** (most recent same-vol+reporter)
  instead of **Smith** (correct party-name match).

  Fix: in the party-name fallback, also check the antecedent's normalized
  `caseName` when neither plaintiff nor defendant is populated. Single-
  party shortform anchors now resolve correctly:

  - `Smith, 100 F.2d 1. Doe, 100 F.2d 5. Smith, 100 F.2d at 3.` → resolvedTo=0 (Smith) ✓
  - `Smith, 100 F.2d 1. Doe, 100 F.2d 5. Roe, 100 F.2d 9. Smith, 100 F.2d at 3.` → resolvedTo=0 ✓

  Full `v.` antecedents continue to resolve via the existing plaintiff/
  defendant check unchanged.

  6 new tests in `tests/resolve/issueShortformPartynameDisambig.test.ts`
  cover single-party + multi-party scenarios with same vol+reporter.

- [#689](https://github.com/medelman17/eyecite-ts/pull/689) [`5a0ef9b`](https://github.com/medelman17/eyecite-ts/commit/5a0ef9b1cd3e9a81633dd6578a683e8992030b70) Thanks [@medelman17](https://github.com/medelman17)! - fix(resolve): shortFormCase partyName uses token-sequence match (no prefix collisions)

  PR #677's party-name disambiguation block used plain substring containment
  (`name.includes(targetParty) || targetParty.includes(name)`), which
  caused prefix collisions:

  - `Smith v. Jones, 100 F.2d 1. Smithers v. Brown, 100 F.2d 50. Smith, 100 F.2d at 7.`
    → resolvedTo=1 (Smithers, wrong) — `"Smithers".includes("Smith")` ✗
    → now resolvedTo=0 (Smith, correct) ✓
  - `Doe v. Acme, 100 F.2d 1. Doering v. Beta, 100 F.2d 50. Doe, 100 F.2d at 7.`
    → similarly fixed

  Switched to the existing `containsTokenSequence` helper (whole-word,
  sequential containment) so `Smith` matches `Smith Industries` but not
  `Smithers`.

  Additionally, renormalized the short-form's `partyName` through the
  resolver's own `normalizePartyName` (instead of using the raw
  `partyNameNormalized` from extraction). Corporate suffixes (`Inc.`,
  `LLC`, `Corp.`) and connectors (`et al.`) are now stripped on both
  sides of the comparison so `Smith, Inc., 100 F.2d at 7` matches a
  `Smith v. Jones` antecedent.

  5 regression tests in
  `tests/resolve/issueShortformPartyNameSubstringCollision.test.ts`.

- [#745](https://github.com/medelman17/eyecite-ts/pull/745) [`554836f`](https://github.com/medelman17/eyecite-ts/commit/554836f2cbcf797294009c569b00109dc7a6718a) Thanks [@medelman17](https://github.com/medelman17)! - fix(clean): soft-wrapped pincite ranges (`5-\n7`) preserve hyphen (#681)

  Resolves #681. `rejoinHyphenatedWords` stripped every `<word>-\n<word>`
  shape on the assumption it was a wrapped word (`Dil-\nlinger` →
  `Dillinger`). A wrapped pincite range — `5-\n7` — got the same
  treatment and fused into a fabricated `57` pincite that didn't exist
  in the source.

  | input                        | before        | after                      |
  | ---------------------------- | ------------- | -------------------------- |
  | `5-\n7`                      | `57`          | `5-7` ✓                    |
  | `100 F.2d 1, 5-\n7 (1990)`   | pincite=`57`  | pincite=`5`, range `5-7` ✓ |
  | `Dil-\nlinger` (word wrap)   | `Dillinger`   | unchanged ✓                |
  | `F. Sup-\np. 3d` (word wrap) | `F. Supp. 3d` | unchanged ✓                |

  Fix: `rejoinHyphenatedWords` now preserves the hyphen when both sides
  of the wrap are digits (range form). Letter on either side keeps the
  existing word-rejoin behavior.

  5 regression tests in `tests/clean/issueSoftWrapPinciteRange.test.ts`.

- [#706](https://github.com/medelman17/eyecite-ts/pull/706) [`a05c620`](https://github.com/medelman17/eyecite-ts/commit/a05c6201097867284cbbd390789e8c3526d0d0bd) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): Statutes at Large pincite accepts thousands-grouping commas

  Extends PR #695 (which fixed comma-grouped pages on Fed. Reg. and
  Statutes at Large) to also handle comma-grouped pincites. Previously,
  `134 Stat. 1,234, 1,236` parsed `pincite=1` instead of `1236` because
  the pincite regex `^,\s*(\d+)` stopped at the first comma in the
  pincite token.

  | input                          | before               | after                     |
  | ------------------------------ | -------------------- | ------------------------- |
  | `134 Stat. 1,234, 1,236`       | page=1234, pincite=1 | page=1234, pincite=1236 ✓ |
  | `134 Stat. 1,234, 1,236-1,240` | range broken         | pincite=1236, end=1240 ✓  |

  Extended `SAL_PINCITE_REGEX` to accept `\d{1,3}(?:,\d{3})+|\d+` on both
  endpoints. Integer parse strips commas. Abbreviated-end-page detection
  uses post-strip digit length so `285-99` still expands to `299`.

  5 regression tests in `tests/extract/issueStatPinciteComma.test.ts`.

- [#754](https://github.com/medelman17/eyecite-ts/pull/754) [`0b103e2`](https://github.com/medelman17/eyecite-ts/commit/0b103e2e271696c0e156f7670c4431418c865eba) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): state statute subsection ranges populate subsectionRange (#694)

  Resolves part 2 of #694. State statute extractors (`named-code` for
  `Cal. Civ. Code §...`, `extractCaBareCode` for `Civ. Code §...`)
  dropped the `-(c)` subsection-range trailer entirely. Federal USC
  already populated `subsectionRange: {start, end}` for the same shape.

  | input                                       | before                     | after                     |
  | ------------------------------------------- | -------------------------- | ------------------------- |
  | `Cal. Civ. Code §§ 1714.5(a)-(c)`           | subsection=`(a)`, no range | `(a)` + range `(a)→(c)` ✓ |
  | `Cal. Penal Code § 148(b)-(d)`              | subsection=`(b)`, no range | `(b)` + range `(b)→(d)` ✓ |
  | `42 U.S.C. § 1983(a)-(c)` (federal control) | unchanged                  | unchanged ✓               |
  | `Cal. Civ. Code § 1714.5(a)` (single)       | unchanged                  | unchanged ✓               |

  Four parallel sites updated:

  1. `named-code` tokenizer pattern in `statutePatterns.ts`
  2. `buildCaBareCodeRegex` tokenizer in `caBareCodes.ts`
  3. `extractNamedCode` extractor regex + parseBody destructure + return
  4. `extractCaBareCode` extractor regex + parseBody destructure + return

  4 regression tests in `tests/extract/issueStateSubsectionRange.test.ts`.

  Parts 1 and 3 of #694 (`to` connector — fixed earlier in PR #742;
  partial-range `.55` semantics) closed elsewhere.

- [#712](https://github.com/medelman17/eyecite-ts/pull/712) [`6c72b71`](https://github.com/medelman17/eyecite-ts/commit/6c72b713ec1816276cb651403203f5e03635a356) Thanks [@medelman17](https://github.com/medelman17)! - fix(statute): publisher/supplement markers no longer mis-parsed as subsection

  The statute body parser's `SUBSECTION_RE` accepted any paren content as
  a subsection chain. Bluebook publisher/supplement markers and
  parenthetical context phrases were silently captured as `subsection`:

  | input                                 | before                          | after       |
  | ------------------------------------- | ------------------------------- | ----------- |
  | `42 U.S.C. § 1983 (Supp. III)`        | subsection=`(Supp. III)`        | undefined ✓ |
  | `42 U.S.C. § 1983 (West)`             | subsection=`(West)`             | undefined ✓ |
  | `42 U.S.C. § 1983 (Cum. Supp. 2020)`  | subsection=`(Cum. Supp. 2020)`  | undefined ✓ |
  | `28 U.S.C. § 1331 (federal question)` | subsection=`(federal question)` | undefined ✓ |

  Reject paren content as a subsection when it contains internal whitespace
  OR matches a known publisher word (`West`, `Lexis`, `Supp.`, `Cum.`,
  `Pamphlet`, `Pocket`). When rejected, also strip the paren content from
  the `section` field so section stays clean (`1331`, not `1331 (federal
question)`).

  Wisconsin's idiosyncratic `48.415(l)(a)3` format (#414) where the
  section legitimately contains parens is unaffected — the reject-and-
  strip path only fires when the rejection criteria match.

  7 regression tests in `tests/extract/issueStatuteSupplementSubsection.test.ts`.

- [#742](https://github.com/medelman17/eyecite-ts/pull/742) [`c450199`](https://github.com/medelman17/eyecite-ts/commit/c4501991d565802a6329b8ed00e1fd75e40ac0d7) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): `§§ N to M` statute ranges populate sectionRange (#694)

  Resolves part 1 of #694. `§§ 1983 to 1985` produced two sibling
  statute citations with no range marker, despite `to` being a
  canonical Bluebook range connector.

  | input                        | before                         | after                                                      |
  | ---------------------------- | ------------------------------ | ---------------------------------------------------------- |
  | `42 U.S.C. §§ 1983 to 1985`  | 2 cites (1983, 1985), no range | 1 cite with `sectionRange: {start: "1983", end: "1985"}` ✓ |
  | `42 U.S.C. §§ 1983 and 1985` | 2 siblings                     | unchanged ✓                                                |
  | `42 U.S.C. §§ 1983, 1984`    | 2 siblings                     | unchanged ✓                                                |
  | `42 U.S.C. § 1983`           | 1 cite                         | unchanged ✓                                                |

  `expandPluralSectionList` now captures the connector substring. When
  the connector matches `^\s+to\s+$` (range form), it populates
  `sectionRange` on the head citation and skips emitting the sibling.
  Comma/and connectors continue to emit siblings (list semantics).

  5 regression tests in `tests/extract/issueStatuteRangeTo.test.ts`.

  Subsection range gaps and partial-range semantics (parts 2 and 3 of
  #694) remain open.

- [#748](https://github.com/medelman17/eyecite-ts/pull/748) [`3b4d6e3`](https://github.com/medelman17/eyecite-ts/commit/3b4d6e31ed91ca5dfba485c309c60bc5b3fb2997) Thanks [@medelman17](https://github.com/medelman17)! - fix(score): `inheritSubsequentHistoryCaseName` recomputes child confidence (#613)

  Resolves #613. `inheritSubsequentHistoryCaseName` mutated `caseName` /
  `plaintiff` / `defendant` onto subsequent-history child citations
  AFTER `buildCaseCitation` had already locked in their confidence
  score. The +0.15 caseName bonus never fired for the child.

  This is the same bug pattern as #556 (parallel-cite secondaries),
  fixed there in PR #611. Mechanical port: call `computeCaseConfidence`
  on each child after the caption mutation.

  | input                                                           | before                                 | after                    |
  | --------------------------------------------------------------- | -------------------------------------- | ------------------------ |
  | `Smith v. Jones, 100 F.2d 1 (9th Cir. 1990), aff'd, 200 U.S. 5` | child confidence missed caseName bonus | child confidence ≥ 0.9 ✓ |
  | `Smith v. Jones, 100 F.2d 1, rev'd, 200 U.S. 5`                 | child confidence missed caseName bonus | child confidence ≥ 0.9 ✓ |
  | `Smith v. Jones, 100 F.2d 1` (standalone)                       | unchanged                              | unchanged ✓              |

  3 regression tests in `tests/extract/issueSubsequentHistoryConfidence.test.ts`.

- [#720](https://github.com/medelman17/eyecite-ts/pull/720) [`d6a5aa1`](https://github.com/medelman17/eyecite-ts/commit/d6a5aa1b257bd743a91522d45fef4fe75a27a4ba) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): supra `partyName` strips additional sentence-initial connectors

  `SUPRA_PARTY_PREFIX_REGEX` stripped `See`, `Cf.`, `Compare`, `Accord`,
  `But see`, `But cf.`, `E.g.`, `Also`, `In` (non-`In re`), and `Then`.
  It did not strip bare `But`, `However`, `Moreover`, `Therefore`,
  `Indeed`, or `Contra` (Bluebook contrastive signal). Result: when a
  supra followed a contrastive connector in prose, `partyName` absorbed
  the connector:

  | input                          | before                      | after       |
  | ------------------------------ | --------------------------- | ----------- |
  | `But Smith, supra, at 7`       | `partyName="But Smith"`     | `"Smith"` ✓ |
  | `However Smith, supra, at 7`   | `partyName="However Smith"` | `"Smith"` ✓ |
  | `Moreover Smith, supra, at 7`  | leaks                       | `"Smith"` ✓ |
  | `Therefore Smith, supra, at 7` | leaks                       | `"Smith"` ✓ |
  | `Indeed Smith, supra, at 7`    | leaks                       | `"Smith"` ✓ |
  | `Contra Smith, supra, at 7`    | leaks                       | `"Smith"` ✓ |

  Added `But`, `Contra`, `However`, `Moreover`, `Therefore`, `Indeed` to
  the alternation. Existing `In(?!\s+re\b)` negative lookahead is
  unchanged.

  9 regression tests in `tests/extract/issueSupraButPrefix.test.ts`.

- [#752](https://github.com/medelman17/eyecite-ts/pull/752) [`1b1270b`](https://github.com/medelman17/eyecite-ts/commit/1b1270b925d56f876ec5f1ee2f037f699ea32b4e) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): topological inheritance for multi-link history chains (#620)

  Resolves #620. `inheritSubsequentHistoryCaseName` iterated linearly and
  worked for multi-link chains (`<root>, aff'd, <A>, cert. denied, <B>`)
  only because chain links appear in document order. Any future re-
  ordering of the citations array would silently break multi-link
  propagation.

  Fix: run the inheritance loop until quiescence (fixed-point iteration).
  Robust to array order, bounded by chain depth + 1.

  3 regression tests in `tests/extract/issueTopologicalInheritance.test.ts`
  covering two-link chains, single-link controls, and standalone-cite
  controls.

- [#744](https://github.com/medelman17/eyecite-ts/pull/744) [`98001d6`](https://github.com/medelman17/eyecite-ts/commit/98001d61c7a076215bc16adc1543690e1229d60e) Thanks [@medelman17](https://github.com/medelman17)! - fix(clean): strip ™ ® ℠ © before NFKC normalization (#693)

  Resolves part 1 of #693. NFKC normalization decomposed `™` → "TM",
  `®` → "(R)", `℠` → "SM" inline, which corrupted party names
  (`Smith™ v. Jones®` produced caseName=`SmithTM v. Jones`) and broke
  case-name backscan.

  | input                         | before                       | after              |
  | ----------------------------- | ---------------------------- | ------------------ |
  | `Smith™ v. Jones, 100 F.2d 1` | caseName=`SmithTM v. Jones`  | `Smith v. Jones` ✓ |
  | `Smith v. Jones®, 100 F.2d 1` | caseName=`Smith v. Jones(R)` | `Smith v. Jones` ✓ |
  | `Acme℠ v. Beta, 100 F.2d 1`   | caseName=`AcmeSM v. Beta`    | `Acme v. Beta` ✓   |
  | `Smith v. Jones, 100 F.2d 1`  | unchanged                    | unchanged ✓        |

  Fix: in `normalizeUnicode`, strip the four mark symbols (`™ ® ℠ ©`)
  BEFORE applying NFKC. They are decorative and never affect canonical
  citation text.

  Em-dash separators, ellipses, and zero-width-space-as-separator
  (other parts of #693) have different root causes and remain open.

  6 regression tests in `tests/extract/issueTrademarkSymbols.test.ts`.

- [#758](https://github.com/medelman17/eyecite-ts/pull/758) [`c781704`](https://github.com/medelman17/eyecite-ts/commit/c781704a9180d324133e5e291e1836ba01d5ebb5) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): treatise author-prefixed form recognized (#643)

  Resolves #643. The treatise extractor missed Bluebook R15's canonical
  full-author form (`5A Charles Alan Wright & Arthur R. Miller, Federal
Practice and Procedure § 1357`) — the dominant style in modern
  federal briefs and law-review footnotes.

  | input                                                                              | before    | after                                              |
  | ---------------------------------------------------------------------------------- | --------- | -------------------------------------------------- |
  | `5A Charles Alan Wright & Arthur R. Miller, Federal Practice and Procedure § 1357` | 0 cites   | volume=5, title=`Federal Practice and Procedure` ✓ |
  | `2 Wayne LaFave, Criminal Law § 5.1`                                               | 0 cites   | volume=2, title=`Criminal Law` ✓                   |
  | `5 Wright & Miller, Federal Practice and Procedure § 1290` (compact form)          | unchanged | unchanged ✓                                        |
  | `1 Witkin, Cal. Procedure (5th ed. 2008) § 234` (compact + edition)                | unchanged | unchanged ✓                                        |

  Changes:

  - Volume admits an optional letter suffix (`5A`, `13C`) for sub-volume citations
  - Added a `KNOWN_TREATISE_BARE_TITLES` alternation (just the title, no embedded author)
  - Tokenizer + extractor regexes now accept either the compact form (winning by alternation order to preserve existing tests) OR an author-prefix + bare title
  - Author prefix constrained to capitalized words optionally joined by `&`, so prose can't false-positive

  Known limitation (not in this patch): trailing `(3d ed. 2004)` parenthetical AFTER the section is not yet captured as edition/year. The existing pattern only handles edition-paren BEFORE the section.

  5 regression tests in `tests/extract/issueTreatiseAuthorPrefix.test.ts`.

- [#724](https://github.com/medelman17/eyecite-ts/pull/724) [`7461c54`](https://github.com/medelman17/eyecite-ts/commit/7461c542ea69d3c33cdd3d7668d48705c9d6588a) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): page terminator accepts typography / footnote markers (†, ‡, §, ¶, ©, °)

  When a citation was immediately followed by a typographic reference
  mark (`100 F.2d 1†`, `100 F.2d 1‡`, `100 F.2d 1§`), the terminator
  character class did not include these characters and the whole citation
  was silently dropped:

  | input                | before  | after    |
  | -------------------- | ------- | -------- |
  | `Smith, 100 F.2d 1†` | 0 cites | 1 cite ✓ |
  | `Smith, 100 F.2d 1‡` | 0 cites | 1 cite ✓ |
  | `Smith, 100 F.2d 1§` | 0 cites | 1 cite ✓ |
  | `Smith, 100 F.2d 1¶` | 0 cites | 1 cite ✓ |
  | `Smith, 100 F.2d 1©` | 0 cites | 1 cite ✓ |
  | `Smith, 100 F.2d 1°` | 0 cites | 1 cite ✓ |

  Added `†`, `‡`, `§`, `¶`, `©`, `°` to the page-terminator character
  class across all three case patterns. Real reporters never end with
  these characters.

  7 regression tests in `tests/extract/issueTypographyTerminator.test.ts`.

- [#718](https://github.com/medelman17/eyecite-ts/pull/718) [`2d14a6b`](https://github.com/medelman17/eyecite-ts/commit/2d14a6b0e7cda4ca01d38832d03abd0b08509daf) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): URL/filepath in court parenthetical no longer polluting court field

  When a citation's court parenthetical contained a URL (web link or
  filepath), the URL leaked into the `court` field. Real court
  abbreviations never contain `://` or `file:///`:

  | input                                                  | before                         | after               |
  | ------------------------------------------------------ | ------------------------------ | ------------------- |
  | `Smith, 100 F.2d 1 (file:///opinions/100-f2d-1.pdf)`   | `court="file:///opinions/..."` | `court=undefined` ✓ |
  | `Smith, 100 F.2d 1 (https://example.com/100-f2d-1)`    | leaks                          | `court=undefined` ✓ |
  | `Smith, 100 F.2d 1 (avail. at https://courts.gov/...)` | leaks                          | `court=undefined` ✓ |

  Added a URL-detection check in `stripDateFromCourt` — `://` (any URI
  scheme) or `file:///` triggers rejection.

  6 regression tests in `tests/extract/issueUrlInParensCourt.test.ts`.

- [#728](https://github.com/medelman17/eyecite-ts/pull/728) [`a6adc4f`](https://github.com/medelman17/eyecite-ts/commit/a6adc4f92f1de58c99033c580d0015509d1d4c43) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): volume/page reference parentheticals not parsed as court (#700)

  Resolves #700. Parentheticals starting with volume/page reference
  tokens (`Vol. 100`, `p. 5`, `at 7`, `note 7`) leaked into the `court`
  field. Worse, the trailing-day-strip regex chewed 1-2 digits off
  `Vol. 100` producing the malformed `court="Vol. 1"`.

  | input                          | before         | after       |
  | ------------------------------ | -------------- | ----------- |
  | `Smith, 100 F.2d 1 (Vol. 100)` | court=`Vol. 1` | undefined ✓ |
  | `Smith, 100 F.2d 1 (p. 5)`     | court=`p.`     | undefined ✓ |
  | `Smith, 100 F.2d 1 (at 7)`     | court=`at`     | undefined ✓ |
  | `Smith, 100 F.2d 1 (note 7)`   | court=`note`   | undefined ✓ |

  Added an early-exit check at the top of `stripDateFromCourt` that
  rejects parentheticals starting with `Vol.|vol.|p.|pp.|at|n.|note`
  followed by a digit. This runs BEFORE the date-strip pipeline so the
  digits don't get chewed away.

  9 regression tests in `tests/extract/issueVolParenNotCourt.test.ts`.

- [#753](https://github.com/medelman17/eyecite-ts/pull/753) [`035bb44`](https://github.com/medelman17/eyecite-ts/commit/035bb44d8cc80d23c0c570618c3172acfd9dff6d) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): strip variable single-letter prefix from plaintiff (#710)

  Resolves part of #710. When `<single-letter>. ` appears immediately
  before what looks like a party name (`held that X. Smith v. Jones`)
  and the trim block fires (because the regex captured surrounding
  prose context), strip the single-letter prefix — it's a sentence-
  internal variable, not an initial.

  Disambiguator: the dropped word immediately before the single-letter
  token must be a lowercase ≥4-char word (verb/conjunction like
  `that`/`because`/`unless`/`when`). Signal contexts (`See J. Smith`)
  and procedural-prefix contexts (`In re J. Smith`) are unaffected
  because those drop different prefixes.

  | input                                             | before               | after       |
  | ------------------------------------------------- | -------------------- | ----------- |
  | `The Smith case held that X. Smith v. Jones, ...` | plaintiff=`X. Smith` | `Smith` ✓   |
  | `In re J. Smith v. Jones`                         | plaintiff=`J. Smith` | unchanged ✓ |
  | `See J. Smith v. Jones`                           | plaintiff=`J. Smith` | unchanged ✓ |
  | `K. Brown was right; M. Jones v. K. Brown`        | plaintiff=`M. Jones` | unchanged ✓ |
  | `The court held that K. Brown v. Smith`           | plaintiff=`K. Brown` | `Brown` ✓   |

  Known limitation (not covered by this fix): standalone shapes where
  the regex doesn't trim at all (e.g., `held because X. Smith v. Y`
  with no longer surrounding prose) still produce `X. Smith`. Those
  need a different anchor and are deferred.

  5 regression tests in `tests/extract/issueXVarPrefixStrip.test.ts`.

- [#714](https://github.com/medelman17/eyecite-ts/pull/714) [`01a6914`](https://github.com/medelman17/eyecite-ts/commit/01a6914fa1909d4c8f37ce782139b0f8cd267661) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): year+comma+modifier form (`1990, en banc`) no longer leaks into court

  Extends PR #704. The strip-pass for trailing year+modifier accepted only
  whitespace between year and modifier (`1990 mem.`). Bluebook also allows
  a comma form (`1990, en banc`, `1990, per curiam`):

  | input                         | before                           | after                |
  | ----------------------------- | -------------------------------- | -------------------- |
  | `(9th Cir. 1990, en banc)`    | `court="9th Cir. 1990, en banc"` | `court="9th Cir."` ✓ |
  | `(9th Cir. 1990, per curiam)` | leaks                            | `court="9th Cir."` ✓ |
  | `(1990, mem.)`                | `court="1990, mem."`             | `court=undefined` ✓  |

  The regex now accepts `\d{4}(?:\s+|,\s+)<modifier>` so both forms work.

  6 regression tests in `tests/extract/issueYearCommaModifier.test.ts`.

- [#675](https://github.com/medelman17/eyecite-ts/pull/675) [`ae1c143`](https://github.com/medelman17/eyecite-ts/commit/ae1c14357d8723aa1075638b58bf302dcc86192d) Thanks [@medelman17](https://github.com/medelman17)! - test(extract): adversarial-input regression suite round 2 — 16 passing + 4 documented gaps

  Continued probing the extractor with adversarial inputs. Added 20 more
  regression tests in `tests/extract/issueAdversarialInputs2.test.ts`:

  **Verified safe today (16 passing):**

  - Form feed character (`\f`) and line breaks inside citations normalize correctly
  - String citation grouping with `;` separator and `and` connector
  - String cites with mixed leading signals (`See`, `see also`, `cf.`)
  - `Id.` resolves to immediately preceding case (with `resolve: true`)
  - `Id.` chain anchors to MOST RECENT case across multiple
  - `Id.` skips over intervening statute and resolves to the case
  - `Id.` without antecedent doesn't crash (resolvedTo = undefined)
  - `supra` after parallel cite resolves to the parallel group
  - Non-English party names (accented characters)
  - Annotation roundtrip with template wrapping
  - Annotation handles overlapping cites
  - Annotation no-op when neither template nor callback provided
  - Bare-section pincite (`100 F.2d 100` with no pincite) extracts

  **Documented gaps (4 `it.todo`):**

  - Soft hyphen `­` (U+00AD) inside reporter breaks extraction (PDF artifact)
  - Page-number artifact `Smith, 100\n— 14 —\nF.2d 123` breaks extraction
  - Paragraph pincite `¶ 12` not captured by pincite parser
  - URL with citation-shaped path doesn't currently false-positive (documented invariant)

  No production code changes — pure verification + documentation of current
  behavior. The annotate-roundtrip tests are particularly valuable since
  the annotation API hasn't had broad smoke coverage in the regression
  suite before.

- [#672](https://github.com/medelman17/eyecite-ts/pull/672) [`0994fed`](https://github.com/medelman17/eyecite-ts/commit/0994fed67d8262ff5b52ca5d7006e1d789d130fe) Thanks [@medelman17](https://github.com/medelman17)! - test(extract): adversarial-input regression suite documenting current behavior + 8 known gaps

  Probed the extractor with adversarial inputs across multiple categories
  to find ways to break it. Added 21 regression tests in
  `tests/extract/issueAdversarialInputs.test.ts`:

  **Verified safe today (13 passing):**

  - Empty string, single space, just punctuation — no crash
  - 100 repeated identical citations — completes in <500ms
  - Extremely long case names (500-char party names) — no hang
  - Deeply nested parens, unbalanced parens — no crash
  - `v.` inside party names — handled
  - Unicode normalization for NBSP / tab between volume / reporter / page
  - Fullwidth digits normalized to ASCII
  - Smart-quote handling in case names
  - HTML formatting tags split across citation
  - HTML entities (numeric) treated as literal — sensible no-op

  **Documented gaps (8 `it.todo`):**

  - `100 U..S. 123` (doubled period) extracts phantom reporter `U..S.`
  - `100 US 123` (missing periods) extracts 2-letter all-caps as reporter
  - `100 U . S . 123` (spaced periods) doesn't extract
  - `100 U.S. 1,234` (thousands separator) parses as page=1+pincite=234
  - `100 U.S. 1-5` (page range) mis-routes to journal
  - Implausible volumes: `0 U.S. 1`, `1 U.S. 0`, `1234567890 U.S. 1`

  Each gap has a comment explaining why it wasn't fixed in this PR — most
  require coordinated changes across multiple patterns or the FP filter
  that would break pre-existing tests. The `.todo` markers ensure these
  surface in test counts as known follow-up work.

  No production code changes — pure documentation of current behavior.

- [#751](https://github.com/medelman17/eyecite-ts/pull/751) [`3da5d01`](https://github.com/medelman17/eyecite-ts/commit/3da5d01210c48698779048254829308abe9d94c6) Thanks [@medelman17](https://github.com/medelman17)! - test: backfill isPlausibleYear coverage for FedReg + StatutesAtLarge (#623)

  Resolves #623. Sprint E audit verified `isPlausibleYear` is applied
  at the FedReg and StatutesAtLarge extractors but no direct
  integration tests covered those sites. Added 5 tests covering the
  [1700, currentYear+1] window for both extractors.

  No code changes. Test-only.

## 0.26.0

### Minor Changes

- [#668](https://github.com/medelman17/eyecite-ts/pull/668) [`54122c1`](https://github.com/medelman17/eyecite-ts/commit/54122c1ffb6ef7ebd38c34696ad05c7d159193ab) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): reject phantom case/journal citations harvested from prose

  The broad `state-reporter` (case) and `law-review` (journal) regex
  patterns used a lazy `[A-Za-z.\d\s&']+?` capture for the reporter
  name, which absorbed lowercase prose words after a space. Real
  reporters are always Title Case + periods + digit suffixes, so any
  lowercase-starting token is a near-perfect prose signal.

  Token-aware capture: after the first uppercase letter, each
  subsequent space-separated token must START with uppercase letter,
  digit, or `&`. Within a token, any of `[A-Za-z.\d&']` are still
  allowed.

  Phantoms killed (each had been emitted with prose absorbed as
  "reporter"):

  **Case-citation phantoms:**

  - `¶ 2 Beginning in 2011` (paragraph marker + prose)
  - `¶ 7 All of the items seized for evidence on March 18`
  - `15 ODC maintains that Tennant violated Rule 1.5`
  - `771 The Administrator also argues that respondent's violation`
  - `2009 General Primary Election due to the fact that...`
  - `2001 Vickers contends that the review panel erred`
  - `2003 Senate Staff Analysis and Economic Impact Statement to argue...`
  - `11 Juror No. 11` (section heading)
  - `100 AND 200` / `50 OR 100` (already fixed via lookahead in earlier PR)

  **Journal-citation phantoms:**

  - `20006 Counsel for Appellees 20004` (zip code + prose)

  Real reporters and journals unaffected:

  - `100 U.S. 1`, `500 F.2d 123`, `100 Cal. App. 4th 200`
  - `100 F. Supp. 2d 200`, `100 Ohio St. 3d 200`, `100 Idaho 50`
  - `27 I. & N. Dec. 100` (BIA Immigration with ampersand)
  - `100 A.L.R.2d 1234`
  - `120 Harv. L. Rev. 500`, `100 Yale L.J. 200`

  Three further phantom shapes (`On July`, `On March`, `Violates
Section`) are still emitted with confidence 0.1 + warnings — both
  tokens start with uppercase so the regex accepts them. Removing
  them entirely requires extending the FP filter's hard-reject pass,
  which would break pre-existing tests asserting penalize-mode
  behavior. Skipped tests in `issuePhantomCaseRejection.test.ts`
  document the gap.

  Two pre-existing tests updated to reflect the new (strictly better)
  behavior: a phantom case is now removed entirely instead of being
  penalized to confidence 0.1 + warning.

  28 new tests in `tests/extract/issuePhantomCaseRejection.test.ts`
  covering paragraph markers, section headings, numbered list items

  - prose, year-prefixed prose phantoms, bare conjunction phantoms
    (regression for the earlier AND/OR fix), date-shape phantoms, and
    extensive regression guards for legitimate reporters.

### Patch Changes

- [#668](https://github.com/medelman17/eyecite-ts/pull/668) [`54122c1`](https://github.com/medelman17/eyecite-ts/commit/54122c1ffb6ef7ebd38c34696ad05c7d159193ab) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): reject `AND` / `OR` as phantom reporter abbreviations

  The broad `state-reporter` lazy regex was capturing fully-capitalized
  conjunction words in prose (`Plaintiff cited 100 AND 200`) as case
  citations with `reporter: "AND"`, `volume: 100`, `page: 200`.

  Added negative-lookahead `(?!(?:AND|OR)\s+\d)` to the state-reporter
  pattern, matching the existing `Ibid` / `Id.` guard from #549.

  The bare-conjunction shape is rare in real legal writing but appears
  in user-formatted text and structured documents where conjunctions
  get capitalized for emphasis. Legitimate reporters like `Or.`
  (Oregon) and `Ore.` are unaffected because they contain a period.

  10 new tests in `tests/extract/issueAndReporterRejection.test.ts`
  cover bare `47 AND 100`, prose `Plaintiff cited 100 AND 200`, the
  parallel `OR` case, and regression guards for `U.S.`, `F.2d`,
  `A.L.R.2d`, `Or.`, `Ore.` reporters.

## 0.25.0

### Minor Changes

- [#664](https://github.com/medelman17/eyecite-ts/pull/664) [`0de4d12`](https://github.com/medelman17/eyecite-ts/commit/0de4d12c103fcfb6166c2bef5002433c66019de8) Thanks [@medelman17](https://github.com/medelman17)! - feat(extract): prose-form state-constitutional citations — #656

  State opinions frequently cite their own constitution in natural prose
  instead of the canonical Bluebook `<State>. Const. art. <N>` form:

  - `art. 14 of the Massachusetts Declaration of Rights`
  - `Section 5(B), Article IV of the Ohio Constitution`
  - `Section 2, Article I of the Pennsylvania Constitution`

  Two new tokenizer patterns + extractor handling:

  1. `state-const-prose-declaration` — matches the MA/PA/VT/NH/MD/NC/DE/NJ
     "Declaration of Rights" / "Constitution" prose form with closed
     state-name alternation.

  2. `state-const-prose-section-article` — matches the more general
     `Section <N>, Article <N> of the <State> Constitution` form across all
     50 states.

  Both patterns map full state names ("Massachusetts", "New Jersey") to
  2-letter jurisdiction codes via a new FULL_STATE_NAME_TO_CODE table.
  Closed alternations keep false positives bounded: `art. 14 of the
document` does not match because `document` is not in the state list.

  10 new tests in `tests/extract/issue656StateConstProse.test.ts` cover
  both shapes across MA, OH, PA, NJ; mid-sentence prose; regression
  guards for `U.S. Const.` and `Cal. Const.` canonical forms; and
  false-positive guards for non-state contexts.

- [#660](https://github.com/medelman17/eyecite-ts/pull/660) [`9fb434a`](https://github.com/medelman17/eyecite-ts/commit/9fb434a5f9b7b6b0d52d0f5b2e86c6e1d54e3ff2) Thanks [@medelman17](https://github.com/medelman17)! - feat(extract): emit each amendment in coordinated lists — #657

  `the Fifth and Sixth Amendment`, `Fourth, Fifth, and Fourteenth
Amendments`, `his Fifth and Sixth Amendment rights` previously only
  emitted a citation for the LAST amendment in the chain — the
  `bare-amendment-word` pattern (#534) requires `<ordinal>\s+Amendment`
  adjacently, and leading ordinals (Fifth, Fourth) have no trailing
  `Amendment` word.

  New `bare-amendment-coord` tokenizer pattern matches each leading
  ordinal in a coordinated list using a lookahead that requires the
  chain to terminate in `<ordinal>\s+Amendments?`. Each match emits a
  separate amendment citation; the trailing `<ordinal> Amendment`
  continues to be captured by `bare-amendment-word`.

  Documented examples (each emits an amendment citation per number):

  - `the Fifth and Sixth Amendment` → 5, 6
  - `the Fifth and Sixth Amendments` → 5, 6
  - `his Fifth and Sixth Amendment rights` → 5, 6
  - `Fourth and Fourteenth Amendments` → 4, 14
  - `the Fifth, Sixth, and Fourteenth Amendments` → 5, 6, 14
  - `First, Fourth, Fifth, and Fourteenth Amendments` → 1, 4, 5, 14
  - `5th and 6th Amendments` → 5, 6

  Confidence matches `bare-amendment-word` (0.5) since both are
  bare-prose matches without a `Const.` anchor. Single-amendment forms
  (`the Fifth Amendment`, `U.S. Const. amend. V`) are unchanged.

  11 new tests in `tests/extract/issue657MultiAmendmentList.test.ts`
  cover two/three/four-amendment lists, ordinal-abbreviation forms,
  regression guards for singular forms, and a false-positive guard for
  prose that mentions ordinals without the `Amendment` word.

  One pre-existing thorny-corpus fixture entry (death-penalty brief with
  `the Eighth and Fourteenth Amendments`) was updated to expect the
  additional Eighth Amendment citation that now emits.

### Patch Changes

- [#662](https://github.com/medelman17/eyecite-ts/pull/662) [`a4eff3f`](https://github.com/medelman17/eyecite-ts/commit/a4eff3f6096177a7cba390424a1079d930f1a3b1) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): accept abbreviated `Health & Saf. Code` form — #655 (partial)

  CA appellate practice uses `Health & Saf. Code` (with `Saf.` abbreviated)
  as the dominant style; the parser only accepted `Health & Safety Code`
  (unabbreviated `Safety`). Added the abbreviated regex fragment alongside
  the unabbreviated one; both canonicalize to `Health & Saf. Code`.

  Documented examples:

  - `Health & Saf. Code, § 1375.4` → `code: "Health & Saf. Code"`, `section: "1375.4"`
  - `Health & Saf. Code, § 1375.4, subd. (b)(4)` → with subdivision
  - `Cal. Health & Saf. Code § 1375.4` → with explicit `Cal.` prefix

  The dominant bare-section follow-on pattern (`Pen. Code § 148. Then § 149.`)
  already works via existing inheritance — multiple bare-section cites in
  CA opinions correctly inherit the upstream `Pen. Code` (or other bare-code
  canonical).

  **Scope note**: #655 also identified bare `§ 1347.15, subd. (a)` cites
  (CA-shape section numbers `digits.digits`) that no tokenizer currently
  captures. Tracked as a separate follow-up — requires either extending the
  `nm-bare-section` shape to admit CA-shape numbers, or adding a new
  `ca-bare-section` pattern. Deferred from this PR to keep the surface area
  small.

  Also updates one pre-existing extractStatute test and the caBareCodes
  self-match invariant test to handle the new "multiple input fragments →
  one canonical" mapping.

- [#665](https://github.com/medelman17/eyecite-ts/pull/665) [`ff7e53f`](https://github.com/medelman17/eyecite-ts/commit/ff7e53f33c13587211a70560c1860f36033c8903) Thanks [@medelman17](https://github.com/medelman17)! - feat(extract): tribal court rule citations — #658 (partial)

  Extend `stateRulePatterns` (#636) to cover two tribal/territorial court
  rule sets that appeared in the post-Sprint-K judge sweep:

  - Ho-Chunk Nation Rules of Civil Procedure: `HCN R. Civ. P. 5(C)(1)`,
    `HCN R. Civ. P. 27(B)`
  - Territorial Courts Rules of Civil Procedure: `T.C.R.C.P. 19(a)`

  Both follow the same shape as existing state-rule patterns (closed
  prefix alternation + mandatory trailing rule number) so false positives
  on bare-prose mentions are bounded.

  Jurisdiction codes:

  - HCN — Ho-Chunk Nation
  - TC — Territorial Courts

  10 new tests covering both rule sets, mid-sentence prose, federal-rule
  and state-rule regression guards, and false-positive guards.

  **Scope note**: #658 originally bundled three tribal-court coverage gaps.
  This PR covers only the rules. Two sub-issues deferred to follow-ups:

  - Tribal constitutions (`Constitution of the Ho-Chunk Nation, Art. VII,
sec. 7(B)`, `HCN Const. Art. V, § 4`)
  - Tribal codes (CS&KT `Section 2-1-813` style bare-section cites)

- [#661](https://github.com/medelman17/eyecite-ts/pull/661) [`465b619`](https://github.com/medelman17/eyecite-ts/commit/465b619d05b6f46c381f2e2ba33f205a3424c2c4) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): bare `Code § N` cites in DC opinions route to D.C. Code — #659

  Both DC and VA write statute cites as bare `Code § N` without
  jurisdiction prefix, and both use overlapping section formats (period-
  laden `22-404.01` and no-period `22-404`). The existing
  `extractVaBareCode` and GA pre-1983 extractors silently claimed every
  bare `Code §` for VA or GA based on the section number's punctuation —
  so DC opinions citing their own code came out as `Va. Code` or `Ga.
Code`, breaking jurisdictional filters.

  New post-process pass `reassignDcCodeJurisdiction` walks citations in
  document order, looks back ~400 chars for the most recent
  jurisdiction signal (`D.C. Code`, `D.C. Cir.`, `D.C.`, `District of
Columbia` vs `Va.`, `Virginia`), and re-routes bare-`Code §` cites
  tagged as VA or GA to DC when DC is the nearest signal.

  Documented examples:

  - `D.C. Code § 22-404(a). The court also considered Code § 22-404.01(a)(2).` → both DC
  - `District of Columbia statute at issue is Code § 22-404(a)(2).` → DC (period-less section)
  - `See Smith v. Jones, 500 F.2d 100 (D.C. Cir. 2010). Per Code § 22-404.01(a)(2), ...` → DC

  Regression guards:

  - `Code § 18.2-308.2` (no DC context) → still VA
  - `Virginia Code § 8.01-581.17` → still VA
  - VA opinion with subsequent bare cite → still VA
  - Mixed `D.C. Code ... Va. Code ... Code § N` (VA is most recent) → VA

  8 new tests in `tests/extract/issue659DcCodeJurisdiction.test.ts`.

## 0.24.0

### Minor Changes

- [#650](https://github.com/medelman17/eyecite-ts/pull/650) [`52279dd`](https://github.com/medelman17/eyecite-ts/commit/52279dd9d68d1bdd7d0089170025822083db077f) Thanks [@medelman17](https://github.com/medelman17)! - feat(extract): Puerto Rico LPRA / L.P.R.A. statute citations — #635

  Add `lpra` tokenizer pattern + `extractLpra` extractor for citations to
  _Leyes de Puerto Rico Anotadas_ — previously the entire Puerto Rico
  statutory corpus was invisible to the parser.

  Supported forms:

  - `23 LPRA § 72` — bare acronym, § connector
  - `23 LPRA §72` — glued §
  - `23 LPRA §72(a)` — with subsection chain
  - `23 LPRA § 72` — with space
  - `21 L.P.R.A. § 4615` — periodized
  - `21 L.P.R.A. § 4615(a)(1)` — periodized with chained subsections
  - `32 LPRA § 3651-c` — hyphenated section

  Each match emits `code: "L.P.R.A."` (canonical Bluebook form) and
  `jurisdiction: "PR"`. Closed `(L\.P\.R\.A\.|LPRA)` alternation +
  mandatory § connector + trailing digits keep false positives bounded
  — bare-acronym mentions in prose (`The LPRA includes...`) do not
  match.

  The appendix-rule form (`4 LPRA Ap. XXII-A, R. 40`) is not yet
  covered and deferred to a follow-up; the dominant bare-section form
  covers the majority of LPRA citations in the wild.

- [#651](https://github.com/medelman17/eyecite-ts/pull/651) [`e5c764d`](https://github.com/medelman17/eyecite-ts/commit/e5c764d7390a4a2ba9f711b169b0c7288a122321) Thanks [@medelman17](https://github.com/medelman17)! - feat(extract): state court rule citations — #636

  Add a new `StateRuleCitation` type alongside `FederalRuleCitation` and a
  family of `state-rule` patterns / `extractStateRule` extractor. The
  Sprint I federal-rule extractor (#576) covered only Fed. R. Civ. P. /
  Crim. P. / Evid. / App. / Bankr.; state rules were silently dropped.

  **New `StateRuleCitation` interface** in the discriminated `Citation`
  union with `type: "stateRule"`, `jurisdiction` (2-letter state code or
  `CFC`), `ruleSet` (civil/criminal/evidence/appellate/bankruptcy/other),
  `rule`, and optional `subsection`.

  **Supported state rule abbreviations:**

  - Idaho — `I.R.C.P. 60(b)(6)`, `Idaho Rule of Civil Procedure 60(b)`
  - North Carolina — `N.C. R. App. P. 10(b)(1)`, `N.C.R.App. P. 37`,
    `N.C. R. Civ. P. 12(b)`
  - South Carolina — `Rule 268(d)(2), SCACR` (postfix style)
  - Court of Federal Claims — `RCFC 56(c)`

  Each pattern is a closed alternation with mandatory trailing rule
  digits, so bare-`Rule N` mentions in prose (`The court applied Rule
60.`) do not match, and standalone abbreviation mentions
  (`The SCACR governs appellate practice.`) do not match either.

  Pattern ordering: `state-rule` patterns are inserted between
  `federalRulePatterns` and `secondaryAuthorityPatterns` in the dispatcher,
  both ahead of `casePatterns` so the broad state-reporter regex does not
  phantom-match these citations as cases.

  `toBluebook(stateRule)` renders `<jurisdiction> R. <ruleSet>. <rule><sub>`
  matching the abbreviation conventions.

- [#646](https://github.com/medelman17/eyecite-ts/pull/646) [`a53dcde`](https://github.com/medelman17/eyecite-ts/commit/a53dcdebaeeb228e195830cb194917eaa7d87ffe) Thanks [@medelman17](https://github.com/medelman17)! - feat(types): CFR citations emit `type: "regulation"` instead of `"statute"` — #637

  C.F.R. citations are regulations issued by executive agencies under
  delegated authority, not statutes enacted by a legislature. Previously
  every CFR citation came out as `type: "statute"`, indistinguishable
  from USC. Downstream consumers wanting to filter regulations vs
  statutes had to resort to `code === "C.F.R."` string matching.

  **New `RegulationCitation` interface** in the discriminated union — same
  field shape as `StatuteCitation` (title, code, section, subsection,
  chapter, sectionRange, subsectionRange, jurisdiction, pincite,
  hasEtSeq, year, publisher, recompiledYear, editionLabel, spans), but
  discriminated as `type: "regulation"`. `Citation` union, `CitationType`
  enum, and `attachStatuteYearParen` post-processor all extended.

  Documented examples:

  - `42 C.F.R. § 100.3` → `{ type: "regulation", title: 42, code: "C.F.R.", section: "100.3" }`
  - `29 C.F.R. § 779.238` → regulation
  - `19 C.F.R. § 351.412(e)` → regulation with subsection
  - `42 CFR 447` (no §, no periods) → regulation
  - `12 C.F.R., § 226` (#587 comma form) → regulation
  - `12 C.F.R. § 226.5(a)(2018)` (#588 year-glued) → regulation with year
  - `42 C.F.R. Part 100` → regulation

  USC remains `type: "statute"`. The internal `extractFederal` dispatcher
  routes both USC and CFR through the same parser; the only difference is
  the `type` discriminator chosen based on the canonicalized `code` field.

  **Bluebook rendering preserved**: `toBluebook()` handles `statute` and
  `regulation` identically — same `title code § section(subsection)` shape.

  **Migration**: consumers that previously did
  `citations.filter(c => c.type === "statute" && c.code === "C.F.R.")` can
  simplify to `citations.filter(c => c.type === "regulation")`. Code that
  unconditionally branches on `type === "statute"` for CFR will need to
  add a `regulation` branch or use `type === "statute" || type === "regulation"`.

- [#649](https://github.com/medelman17/eyecite-ts/pull/649) [`c352bba`](https://github.com/medelman17/eyecite-ts/commit/c352bba58110b0d315528350e26eefaa215563a5) Thanks [@medelman17](https://github.com/medelman17)! - feat(extract): bare-abbreviation journals + bare-ALR annotations — #638

  Two coverage gaps the broad state-reporter regex was silently swallowing
  into `type: "case"`:

  **1. Bare-abbreviation journals (no periods).** Curated list of well-known
  scientific/medical journals + period-stripped law reviews. New
  `bare-journal` pattern in `secondaryAuthorityPatterns` (positioned
  before casePatterns) wins span dedup against the broad state-reporter
  match.

  Documented examples:

  - `53 Neurology 1107` → journal (was case)
  - `285 JAMA 2486` → journal
  - `344 New Eng. J. Med. 678` → journal
  - `70 Brook L Rev 1045` → journal (period-stripped law review)
  - `96 Yale L J 1234` → journal

  Curated list (extensible — one-line change to add): Neurology, Nature,
  Science, JAMA, Pediatrics, Lancet, New Eng. J. Med., Am. J. Psychiatry,
  Am. J. Pub. Health + a couple dozen common law-review abbreviations in
  period-stripped form (Brook L Rev, Yale L J, Harv L Rev, Stan L Rev,
  NYU L Rev, etc.).

  Bare-acronym mentions in prose (`Neurology specialists agree.`) do NOT
  match — the trailing volume + page digits gate the pattern.

  **2. Bare-ALR annotations (no periods).** Extended `alr-annotation`
  tokenizer + `extractAnnotation` parsing regex to accept the
  period-stripped form alongside the canonical `A.L.R.2d`:

  Documented examples:

  - `48 ALR 749` → annotation (was case)
  - `100 ALR2d 567` → annotation
  - `23 ALR Fed 3d 456` → annotation
  - `100 A.L.R.2d 1234` continues to work (regression guard)

- [#644](https://github.com/medelman17/eyecite-ts/pull/644) [`89eddee`](https://github.com/medelman17/eyecite-ts/commit/89eddee0776476433ec3025bf9aea1141fd0763e) Thanks [@medelman17](https://github.com/medelman17)! - feat(extract): recognize NY acronymized code citations (RPAPL, RPL, BCL, EPTL, SCPA, DRL, LLCL, VTL) — #640

  Documented examples:

  - `RPAPL 711 [5]` — Real Property Actions and Proceedings Law, bracket subdivision
  - `RPAPL 741 [4]`, `RPAPL 1304`
  - `N.Y. RPAPL 711 [5]` (with N.Y. prefix)
  - `EPTL § 5-1.1` — Estates Powers and Trusts Law
  - `BCL § 1104-a` — Business Corporation Law
  - `SCPA 1410` — Surrogate's Court Procedure Act
  - `DRL § 240` — Domestic Relations Law
  - `LLCL § 702` — Limited Liability Company Law
  - `VTL § 1192` — Vehicle and Traffic Law
  - `RPL § 5-703` — Real Property Law (distinct from RPAPL)

  Previously the entire family of NY acronymized codes was invisible to the
  tokenizer — only `CPLR` had a dedicated pattern (`ny-cplr-bare`, #592).
  This added a sibling pattern (`ny-acronym-bare`) using the same shape:
  closed alternation over a curated acronym list with mandatory trailing
  digits, so bare-acronym mentions in prose (`The RPAPL governs.`) still do
  not match.

  Subsection chaining accepts both bracket (`[5]`) and paren (`(5)`) groups
  and any mix (`RPAPL 711 [5] (a)` → `subsection: "[5](a)"`). The
  underlying `parseBody` already accepted both delimiters (#370); this PR
  just adds the missing tokenizer coverage.

  Each match emits `code: "N.Y. <ACRONYM>"` (canonical prefix) and
  `jurisdiction: "NY"` regardless of input shape.

### Patch Changes

- [#645](https://github.com/medelman17/eyecite-ts/pull/645) [`44c7360`](https://github.com/medelman17/eyecite-ts/commit/44c7360e534d1b882c56dfa7868777f194c80299) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): reject short-form case nicknames as court in California (and all reporter) parentheticals — #634

  A California reporter (or Cal.Xth) citation followed by a parenthetical
  short-form case anchor (Bluebook Rule 10.9) — `(Macaluso)`, `(Privette)`,
  `(Fox Johns)`, `(SeaBright)`, `(Regalado)`, etc. — was populating the
  `court` field with that nickname. Root cause: `stripDateFromCourt`
  returned any letter-bearing string as a "court" after stripping dates;
  existing reject filters only caught lowercase signal-word leads or
  3+ word lowercase prose, so a single Title-Case word slipped through.

  Every Bluebook T7 court abbreviation contains at least one period
  (`Cal.`, `9th Cir.`, `D. Mass.`, `S.D.N.Y.`, `Ct. App.`). The fix
  extends the no-period rejection inside `stripDateFromCourt`: when the
  content has no period anywhere AND every alphabetic word starts with
  uppercase AND no word is an ordinal indicator (`2d`, `9th`, `1st`), it
  is a short-form case anchor — not a court — and is rejected.

  Affected reproductions (all 8 from issue #634 now return
  `court: undefined`):

  - `162 Cal.Rptr.3d 318 (Macaluso)`
  - `162 Cal.Rptr.3d 571 (Fox Johns)`
  - `5 Cal.4th 689 (Privette)`
  - `27 Cal.4th 198 (Hooker)`
  - `3 Cal.App.5th 582 (Regalado)`
  - `52 Cal.4th 590 (SeaBright)`
  - `129 Cal.Rptr.3d 601 (SeaBright)`
  - `207 Cal.Rptr.3d 712 (Regalado)`

  Reporter-based `inferredCourt` (level/jurisdiction/state) is unaffected
  — Cal.4th still resolves to `{level: "supreme", jurisdiction: "state",
state: "CA"}` even when the parenthetical is rejected. Legitimate court
  parentheticals (`(9th Cir.)`, `(D. Mass. 2019)`, `(Cal. Ct. App.)`,
  `(Ct. App.)`, `(2d Cir. 2020)`) continue to extract court correctly.

  24 new tests in
  `tests/extract/issue634CalCourtParentheticalPollution.test.ts` cover
  all 8 reproductions, reporter coverage (Cal.4th / Cal.App.5th /
  Cal.Rptr.3d), single-word/two-word/camel-case nicknames, mixed
  name+year parens (`(Macaluso, 2013)`, `(Privette 2013)`), legitimate
  court abbreviation regressions, and reporter-inference preservation.

- [#648](https://github.com/medelman17/eyecite-ts/pull/648) [`f2842b2`](https://github.com/medelman17/eyecite-ts/commit/f2842b28b21cf71742125b18696228e19fcf60ad) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): capture multi-page pincites and reject explanatory paren leak — #639

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

- [#652](https://github.com/medelman17/eyecite-ts/pull/652) [`48947cc`](https://github.com/medelman17/eyecite-ts/commit/48947cc7b8d154b801b9adeeb7abf00ed7551e9b) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): preserve leading numeric prefix in case-name extraction — #641 (partial)

  `V_CASE_NAME_REGEX` required the plaintiff capture to begin with `[A-Z]`,
  so address-derived party names that lead with a digit prefix lost it:

  - `2312-2316 Realty Corp. v. Font` → was `Realty Corp. v. Font` (numeric prefix dropped)
  - `235 East 73rd Street, Inc. v. Smith` → was `East 73rd Street, Inc. v. Smith`
  - `125 Broadway Associates v. NYC` → was `Broadway Associates v. NYC`

  Common in NY real-property and tax cases where the legal name is the
  street address. Extended the leading character class to admit an optional
  `\d[\d-]*\s+` prefix before the required `[A-Z]` proper-noun head.

  5 new tests in `tests/extract/issue641LeadingNumericCaseName.test.ts`
  cover hyphenated address ranges, intermediate digits in addresses, and
  regression guards for the existing citation-boundary detection and
  ordinary alphabetic case names.

  Scope note: #641 originally bundled three sub-issues. Only the
  leading-numeric trim is addressed here. Two siblings remain open as
  follow-ups:

  - Parallel-cite caseName propagation without a closing `(YYYY)` paren
    (`Kauffman v. Griesemer, 26 Pa. 407, 67 Am. Dec. 437.`)
  - Puerto Rico DPR / JTS reporter coverage (the reporters themselves
    aren't in reporters-db so the case extractor doesn't tokenize them)

## 0.23.0

### Minor Changes

- [#626](https://github.com/medelman17/eyecite-ts/pull/626) [`6f10815`](https://github.com/medelman17/eyecite-ts/commit/6f10815c36ed8a2550c11275aba54607203be927) Thanks [@medelman17](https://github.com/medelman17)! - feat(extract): add Federal Rules of Procedure extractor (#576)

  Recognizes citations to the four primary federal rule sets — Civil,
  Criminal, Evidence, Appellate — plus Bankruptcy. Both the abbreviated
  Bluebook form (`Fed. R. Civ. P. 56`) and the spelled-out form
  (`Federal Rule of Civil Procedure 56`) parse to a new `federalRule`
  citation type with `{ ruleSet, rule, subsection? }`. The compact
  no-space form (`Fed.R.Civ.P. 56`) is also accepted.

  `ruleSet` is one of `"civil" | "criminal" | "evidence" | "appellate" |
"bankruptcy"`. The `rule` field is a string to preserve any leading
  zeros or non-numeric suffixes; the optional `subsection` field captures
  the chained `(b)(6)`-style suffix when present.

  Pattern priority is inserted above `casePatterns` in the tokenizer so
  the federal-rule match wins overlap dedup against the broad
  state-reporter regex that previously mis-typed
  `Fed. R. Civ. P. 12(b)(6)` as a phantom case citation (~58% of modern
  federal opinions affected).

  Public API additions:

  - `FederalRuleCitation` interface (exported from package root)
  - `extractFederalRule` extractor (exported from `@/extract`)
  - `federalRulePatterns` array (exported from `@/patterns`)
  - `FederalRuleComponentSpans` (exported from `@/types/componentSpans`)
  - `"federalRule"` added to `CitationType` and `FullCitationType` unions
  - `toBluebook` renders federal rules in canonical Bluebook form

- [#626](https://github.com/medelman17/eyecite-ts/pull/626) [`6f10815`](https://github.com/medelman17/eyecite-ts/commit/6f10815c36ed8a2550c11275aba54607203be927) Thanks [@medelman17](https://github.com/medelman17)! - feat(extract): recognize U.S. Sentencing Guidelines citations (#577)

  `U.S.S.G. § 2K2.4(b)` and the compact `USSG § 3E1.1` form are now
  folded under the existing `statute` citation type with
  `code: "U.S.S.G."` (no `title` — the Guidelines are organized by
  chapter/section without a U.S. Code title number) and
  `jurisdiction: "US"`.

  Pattern `id: "ussg"` is added to `statutePatterns`; new dispatcher
  case in `extractStatute` routes to `extractUssg`. Section body uses
  the internal-`.` rule (`2K2.4` parses; trailing sentence period is
  not absorbed) and captures `(a)(b)`-style subsection chains.

  Folding under `statute` rather than introducing a dedicated
  `sentencingGuideline` type is the lowest-friction choice: USSG
  citations carry no metadata beyond what `StatuteCitation` already
  exposes, and downstream consumers (annotate, bluebook formatting,
  resolver) inherit the existing statute treatment for free.

- [#626](https://github.com/medelman17/eyecite-ts/pull/626) [`6f10815`](https://github.com/medelman17/eyecite-ts/commit/6f10815c36ed8a2550c11275aba54607203be927) Thanks [@medelman17](https://github.com/medelman17)! - feat(extract): add Restatement extractor (#578)

  Recognizes `Restatement (Edition) of Subject § Section` citations as
  a new `restatement` citation type with `{ edition, subject, section,
subsection? }` fields.

  Edition accepts both spelled-out (`First`, `Second`, `Third`, `Fourth`)
  and ordinal short forms (`1st`, `2d`, `3d`, `4th`), normalized to the
  canonical spelled-out form. Subject body permits multi-word subjects
  including `"the Law Governing Lawyers"`, `"Foreign Relations Law"`, etc.

  Section parsing uses the internal-`.` rule so a trailing sentence
  period is not absorbed (`Restatement (Second) of Trusts § 187.` →
  `section: "187"`). Trailing court/publisher parentheticals like
  `(Am. L. Inst. 1965)` are left for downstream parsing.

  Public API additions:

  - `RestatementCitation` interface
  - `extractRestatement` extractor
  - `restatement` pattern in `secondaryAuthorityPatterns`
  - `RestatementComponentSpans`
  - `"restatement"` added to `CitationType` and `FullCitationType` unions
  - `toBluebook` renders Restatement in canonical Bluebook form

- [#626](https://github.com/medelman17/eyecite-ts/pull/626) [`6f10815`](https://github.com/medelman17/eyecite-ts/commit/6f10815c36ed8a2550c11275aba54607203be927) Thanks [@medelman17](https://github.com/medelman17)! - feat(extract): add treatise extractor for common multi-volume works (#579)

  Recognizes the most common federal and state treatises as a new
  `treatise` citation type with `{ volume, title, section, edition?,
year? }` fields. Initial allowlist covers:

  - Federal practice: Wright & Miller (`Federal Practice and Procedure`),
    Moore's Federal Practice, LaFave & Israel
  - Contracts: Williston on Contracts, Corbin on Contracts
  - IP: Nimmer on Copyright, McCarthy on Trademarks
  - Torts: Prosser and Keeton on the Law of Torts
  - Evidence: Wigmore, McCormick
  - California: Witkin (Cal. Procedure, Summary of California Law)
  - Administrative: Davis & Pierce
  - Criminal: LaFave, Criminal Law

  The allowlist approach is intentional — treatise citations are
  heterogeneous and we'd rather miss an uncommon treatise than emit
  false positives on arbitrary `<vol> Author, Book § N` prose. Adding
  a treatise is a one-line change in `secondaryAuthorityPatterns.ts`.

  Section parser handles dot-separated locators (`5.05`, `12.34`) and
  bracketed sub-references common in Nimmer (`5.05[A]`). Edition
  parenthetical (`5th ed. 2008`) is captured for the `edition` field
  and the year is extracted into `year` via the existing plausible-year
  filter.

  Public API additions: `TreatiseCitation`, `extractTreatise`,
  `treatise` pattern, `TreatiseComponentSpans`. `toBluebook` renders
  treatises in volume + title + `§ section` form.

- [#626](https://github.com/medelman17/eyecite-ts/pull/626) [`6f10815`](https://github.com/medelman17/eyecite-ts/commit/6f10815c36ed8a2550c11275aba54607203be927) Thanks [@medelman17](https://github.com/medelman17)! - feat(extract): add A.L.R. `annotation` citation type (#581)

  Previously, A.L.R. citations like `100 A.L.R.2d 1234` were harvested by
  the broad state-reporter regex and emitted as
  `{ type: "case", reporter: "A.L.R.2d" }`. The American Law Reports
  series is secondary authority (annotations on narrow legal issues), not
  case law, so this mis-classification leaked into downstream consumers.

  A new `annotation` citation type captures these correctly with
  `{ series, volume, page, year? }`. The pattern recognizes the full
  A.L.R. series family:

  - `A.L.R.` (first series)
  - `A.L.R.2d`, `A.L.R.3d`, `A.L.R.4th`, `A.L.R.5th`, `A.L.R.6th`, `A.L.R.7th`
  - `A.L.R. Fed.`, `A.L.R. Fed. 2d`, `A.L.R. Fed. 3d`

  Pattern priority is set above `casePatterns` so the A.L.R. match wins
  overlap dedup against the state-reporter regex; the previous phantom
  case citation is no longer emitted.

  Public API additions: `AnnotationCitation`, `extractAnnotation`,
  `alr-annotation` pattern, `AnnotationComponentSpans`. `"annotation"`
  added to `CitationType` and `FullCitationType` unions. `toBluebook`
  renders annotations as `<vol> <series> <page>` with optional `(year)`.

- [#626](https://github.com/medelman17/eyecite-ts/pull/626) [`6f10815`](https://github.com/medelman17/eyecite-ts/commit/6f10815c36ed8a2550c11275aba54607203be927) Thanks [@medelman17](https://github.com/medelman17)! - feat(extract): recognize Bankruptcy Code alias and normalize to 11 U.S.C. (#585)

  `Bankruptcy Code § 548(a)(1)(B)(i)` and the postfix form
  `§ 547 of the Bankruptcy Code` are now extracted as `statute`
  citations with `title: 11, code: "U.S.C.", jurisdiction: "US"`. The
  alias is normalized to the equivalent explicit citation
  (`11 U.S.C. § …`) so downstream consumers — resolver, annotator,
  bluebook formatter — treat them identically.

  Two new pattern IDs: `bankruptcy-code-prefix` for the conventional
  form and `bankruptcy-code-postfix` for the `§ N of the Bankruptcy
Code` form. Both route to `extractBankruptcyCode` which sets the
  constant `title=11, code="U.S.C."` and parses the section/subsection
  via the shared `parseBody` helper.

  Real `11 U.S.C. § N` citations continue to win on overlap dedup so
  this change does not shadow the existing extraction path.

  ~3% of bankruptcy reporter opinions affected; normalize-to-USC is the
  simplest fold per the design recommendation.

### Patch Changes

- [#624](https://github.com/medelman17/eyecite-ts/pull/624) [`27d74fd`](https://github.com/medelman17/eyecite-ts/commit/27d74fd16f75aafcfa0594446e20782e8f898d80) Thanks [@medelman17](https://github.com/medelman17)! - docs(CLAUDE.md): include `docket` and `constitutional` in CitationType enumeration (#575)

  The "Type System" architecture note in `CLAUDE.md` listed only 10 of the 12 discriminator values, omitting `docket` and `constitutional`. The real `CitationType` union at `src/types/citation.ts:16-28` and the README's exhaustive `switch` example both list all 12. Updated the enumeration to match, in document order (`case | docket | statute | journal | neutral | publicLaw | federalRegister | statutesAtLarge | constitutional | id | supra | shortFormCase`). Docs only; no runtime change.

- [#624](https://github.com/medelman17/eyecite-ts/pull/624) [`27d74fd`](https://github.com/medelman17/eyecite-ts/commit/27d74fd16f75aafcfa0594446e20782e8f898d80) Thanks [@medelman17](https://github.com/medelman17)! - docs(README): fix Post-Extraction Utilities example to match real signatures (#574)

  The example block in "Post-Extraction Utilities" called `groupByCase`, `toReporterKey`, and `getSurroundingContext` with arguments that don't type-check. `groupByCase` requires `ResolvedCitation[]` (so the example now calls `extractCitations(text, { resolve: true })`), `toReporterKey` requires a `FullCaseCitation` (narrowed via `isCaseCitation`), and `getSurroundingContext` takes a `{ start, end }` span plus a `{ maxLength }` option — not the citation itself with `{ chars }`. The example output for `toReporterKey` is also corrected from `"500-F.2d-123"` to `"500 F.2d 123"` to match the real `formatKey` output. No runtime behaviour changes; docs only.

- [#625](https://github.com/medelman17/eyecite-ts/pull/625) [`bc35997`](https://github.com/medelman17/eyecite-ts/commit/bc3599771a46db053a8c30e3a9f8ebd2c32e17f6) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): admit `<vol> <Reporter>, <page>` comma form (#570)

  Old typesetting (and OCR over older volumes) inserts a comma between the
  reporter abbreviation and the page number — `3 Den., 594`, `252 S. W., 20`,
  `26 N. Y., 279`, `217 Ill. App., 427`, `125 N. E., 793`. Pre-fix every
  probe returned 0 citations. Sample-and-judge attributed 70% of misses
  across a 300-opinion sample to this single shape.

  Two coordinated changes:

  1. **Tokenizer patterns** (`src/patterns/casePatterns.ts`): the
     `federal-reporter`, `supreme-court`, and `state-reporter` patterns
     each get a second separator alternative `\s*,\s+` alongside the
     canonical `\s+`. The comma branch carries a tighter trailing
     lookahead `(?=$|[.;,)\]])` that rejects phantoms like
     `10 Corp., 2025 NY Slip Op 00784` — the supposed "page" 2025 is
     actually the start of the next (neutral) citation and the trailing
     ` N` (whitespace + capital letter) is excluded by the constraint.

  2. **`VOLUME_REPORTER_PAGE_REGEX`** (`src/extract/extractCase.ts`): the
     single-regex extractor splits into a canonical pass plus a comma-form
     fallback. Canonical runs first so synthetic token text containing a
     trailing pincite (`500 F.2d 123, 125`) still resolves to
     `reporter=F.2d`, `page=123`, `pincite=125`. The canonical regex also
     gains the same trailing terminator lookahead, which causes inputs
     like `33 Ill. App. 2d, 100` to fail the canonical pass and route
     correctly to the comma form (avoiding the greedy backtrack to
     `reporter=Ill. App.`, `page=2`).

  Both branches share the same capture-group shape so downstream consumers
  (span computation, nominative parenthetical, pincite scan) need no
  changes.

  Coverage: 28 new repro tests in
  `tests/extract/issue570CommaBetweenReporterAndPage.test.ts` covering 9
  state reporters with `,`-after-period forms, 9 multi-word state
  reporters with internal periods, 3 federal-reporter comma forms, 3
  SCOTUS comma forms, a phantom-suppression regression guard
  (`3 Den., 594` produces exactly one cite), and 3 baseline tests pinning
  the original whitespace-only forms.

- [#625](https://github.com/medelman17/eyecite-ts/pull/625) [`bc35997`](https://github.com/medelman17/eyecite-ts/commit/bc3599771a46db053a8c30e3a9f8ebd2c32e17f6) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): wire `normalizedReporter` + add periodless variants (#571)

  Compact reporter forms used by NY/IL/OH/CA/federal slip-ops (`725 F2d
1091`, `24 Ill2d 270`, `60 Ill App2d 39`, `140 N.J.Eq. 496`, `17 Oh St
649`, `125 OhioSt. 219`, `329 FedAppx. 1`) were extracted into a `case`
  citation, but `normalizedReporter` stayed `undefined` — so downstream
  consumers (`reporterKey`, `bluebook`, parallel-group matching) couldn't
  link them to their canonical Bluebook form.

  Two compounding causes, both fixed here:

  1. **`normalizedReporter` was never populated.** The field was advertised
     on `FullCaseCitation` and consumed by `src/utils/reporterKey.ts` and
     `src/utils/bluebook.ts`, but the case extractor never wrote it. Even
     inputs whose variation entries WERE in reporters-db (`NE2d`, `P2d`)
     came back with `normalizedReporter: undefined`. New helper
     `resolveNormalizedReporter` (`src/extract/extractCase.ts`) looks the
     reporter literal up via `byAbbreviation` — matches an edition key
     directly when one exists, otherwise resolves through the
     `variations` map. Returns `undefined` when reporters-db is not
     loaded (preserves degraded-mode behaviour) or when the literal is
     unknown.

  2. **Missing variations.** Even with the wiring in place, several
     periodless / no-space forms had no DB entry to resolve against. Added
     to `data/reporters.json`:

     - `F.` (Federal Reporter): `F2d`, `F2d.`
     - `F. App'x` (Federal Appendix): `FedAppx`, `FedAppx.`
     - `Ill.` (Illinois Reports): `Ill2d`
     - `Ill. App.` (Illinois Appellate): `Ill App2d`, `Ill App3d`,
       `IllApp2d`, `IllApp3d`
     - `Ohio St.` (Ohio State): `Oh St`, `Oh St 2d`, `Oh St 3d`,
       `Oh St.`, `OhSt.`, `OhioSt.`, `OhioSt.2d`, `OhioSt.3d`
     - `N.J. Eq.` (NJ Equity): `N.J.Eq.`, `NJ Eq.`, `NJEq.`

  Coverage: 15 new tests in
  `tests/extract/issue571PeriodlessReporterNormalization.test.ts`
  covering pre-existing baselines (NE2d, P2d), all newly-added variants
  for federal / Illinois / Ohio / NJ reporters, canonical-edition
  regression guards (F.2d / U.S. / N.E.2d resolve to themselves), the
  post-cleaning Cal.4th → reporters-db `Cal. 4th` mapping (pins the
  inner-space mismatch documented in #555), and the unknown-reporter
  fallback path (no DB hit → `normalizedReporter` stays `undefined`).

- [#625](https://github.com/medelman17/eyecite-ts/pull/625) [`bc35997`](https://github.com/medelman17/eyecite-ts/commit/bc3599771a46db053a8c30e3a9f8ebd2c32e17f6) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): disambiguate `Black.` SCOTUS vs Blackford by era (#572)

  Two reporters share the `Black.` abbreviation:

  - `Black` — Black's Supreme Court Reports (SCOTUS, 1861-1862)
  - `Blackf.` — Indiana Reports, Blackford (1817-1847)

  The literal `Black.` is listed in reporters-db as a variation of
  `Blackf.`, so every input citation `<vol> Black. <page>` was normalizing
  to `Blackf.` — even when surrounded by SCOTUS context like
  `Dred Scott v. Sandford, 1 Black. 219 (U.S. 1862)`.

  Adds an era heuristic in `resolveNormalizedReporter`
  (`src/extract/extractCase.ts`): when the captured reporter literal is
  `Black.` (case-insensitive) AND a parsed year falls inside the SCOTUS
  window [1861, 1862] inclusive, the result switches to `Black`. Outside
  that window — or when no year was extracted — the default `Blackf.`
  resolution stands. The literal `reporter` field is preserved verbatim;
  only `normalizedReporter` shifts.

  Deliberately narrow: only fires on the `Black.` literal (so direct
  `Blackf.` inputs and other shared abbreviations are unaffected), only
  shifts the normalized form (not the raw reporter), and only when the
  year evidence is unambiguous. Picked option (b) from the issue's
  three-option discussion as the cleanest balance.

  Coverage: 14 new tests in
  `tests/extract/issue572BlackEraDisambiguation.test.ts` covering the
  SCOTUS era (4 cases at 1861 / 1862), the Indiana era (5 cases at 1820,
  1840, 1847, plus 1860 and 1870 boundary years that fall outside the
  SCOTUS window), the no-year fallback (defaults to Blackf.), and direct
  `Blackf.` inputs (heuristic does not fire — even when paired with a
  SCOTUS-era year).

- [#626](https://github.com/medelman17/eyecite-ts/pull/626) [`6f10815`](https://github.com/medelman17/eyecite-ts/commit/6f10815c36ed8a2550c11275aba54607203be927) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): reject `<year> Fed.R.X.X. N` case-shape false positives (#582)

  Pre-fix behavior: the broad state-reporter regex matched
  `1983 Fed.R.Civ.P. 17` as `{ volume: 1983, reporter: "Fed.R.Civ.P.",
page: 17 }` — a phantom case citation where `1983` was an incidental
  year sitting next to a federal-rule citation. The existing volume cap
  in `isSuspiciousSmallVolume` only triggered for volumes 1–20, so the
  1900s-2099 window slipped through.

  The primary cure is the new federal-rule extractor from #576, which
  wins overlap dedup against the state-reporter match and emits a clean
  `federalRule` citation. This change adds the defense-in-depth filter
  the issue called for:

  - New `isFederalRulePhantom` check in `filterFalsePositives.ts` flags
    any `case` citation whose volume is in `[1900, 2099]` AND whose
    reporter matches `/^Fed\.\s?R\./i` (i.e., the `Fed. R.` / `Fed.R.`
    federal-rule family — `Civ.P.`, `Crim.P.`, `Evid.`, `App.P.`,
    `Bankr.P.`).
  - Real Federal Reporter series (`Fed. Cl.`, `F. App'x`, `F. Supp.`)
    are unaffected — the `Fed. R.` prefix is unique to the federal rules.
  - Wired into both `isFalsePositive` (hard reject) and
    `collectFalsePositiveReasons` (soft flag + warning) for parity with
    the existing FP filters.

  Behavior: in `filterFalsePositives: true` mode the phantom is removed;
  in default mode it gets confidence `0.1` and a warning explaining the
  mis-tokenization.

- [#629](https://github.com/medelman17/eyecite-ts/pull/629) [`00743a1`](https://github.com/medelman17/eyecite-ts/commit/00743a125211252bc7f189591a0d0843bec8c52a) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): recognize U.S.C.S. (LEXIS-annotated US Code) variant (#584)

  Documented examples:

  - `26 U.S.C.S. § 7433`
  - `42 U.S.C.S. § 1983 (LEXIS 2020)`
  - `28 U.S.C.S. § 1331(a)`

  The USC tokenizer regex accepted West's annotated `U.S.C.A.` (trailing
  `A?`) but never LEXIS's annotated `U.S.C.S.`, so every USCS citation
  silently disappeared. Extend the trailing-letter alternative from `A?`
  to `[AS]?` (and the no-period `USCA?` to `USC[AS]?`) in both
  `src/patterns/statutePatterns.ts` (the tokenizer) and
  `src/extract/statutes/extractFederal.ts` (the parser used for
  extraction). Both annotated editions normalize to canonical `U.S.C.`
  through the existing `stripped.includes("CFR")` else-branch — no
  extractor logic change is required beyond accepting the wider regex.

  The Sprint F `(?![^)]*\d{4})` year-paren lookahead is preserved
  intact, so a trailing `(LEXIS 2020)` still routes to the post-process
  year/publisher binder; `(LEXIS through 2020)` (lowercase intermediate
  token) does not match the canonical publisher-year shape and is
  correctly left unbound while the citation core still extracts.

- [#629](https://github.com/medelman17/eyecite-ts/pull/629) [`00743a1`](https://github.com/medelman17/eyecite-ts/commit/00743a125211252bc7f189591a0d0843bec8c52a) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): accept comma between `Title NN` and `U.S.C.` (#586)

  Documented examples:

  - `Title 18, U.S.C. § 3742`
  - `Title 8, U.S.C. § 1326`
  - `Title 15, U.S.C. § 78`
  - `Title 42, U.S.C. § 1983(a)`

  The USC tokenizer regex required `\b(\d+)\s+U\.S\.C\.` — only a bare
  whitespace separator between the title digits and the code
  abbreviation. The comma-free prose form `Title 18 U.S.C. § 3742`
  worked by accident: the embedded `18 U.S.C. § 3742` substring matched
  with the leading `Title` word left outside the match. The comma form
  `Title 18, U.S.C. § 3742` (equally common in federal appellate
  opinions) broke that accident because `18, U.S.C.` could not satisfy
  `\d+\s+U\.S\.C\.`, so every comma-after-title citation silently
  disappeared.

  Allow an optional comma between the title digits and the code
  abbreviation by changing the separator from `\s+` to `\s*,?\s+` in:

  - `src/patterns/statutePatterns.ts` (the `usc` tokenizer)
  - `src/extract/statutes/extractFederal.ts` (`FEDERAL_SECTION_RE`
    and `FEDERAL_PART_RE`)

  The `\s*,?\s+` shape requires at least one space after the optional
  comma, so the malformed `18,U.S.C.` (no space) still does not
  tokenize. CFR was left unchanged in this commit (the issue scope is
  USC); a follow-up could mirror the change for `Title NN, C.F.R.`
  if real-world coverage demands it.

- [#629](https://github.com/medelman17/eyecite-ts/pull/629) [`00743a1`](https://github.com/medelman17/eyecite-ts/commit/00743a125211252bc7f189591a0d0843bec8c52a) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): accept comma between code abbreviation and `§` (#587)

  Documented examples:

  - `45 U.S.C., § 151`
  - `11 U.S.C., § 362`
  - `28 U.S.C., § 636`
  - `12 C.F.R., § 226`
  - `42 U.S.C., § 1983 (1976)` (year-paren still binds)
  - `Title 18, U.S.C., § 3742` (composes with #586)

  The USC and CFR tokenizer regexes had `\s*` between the code
  abbreviation and the (optional) section connector. A comma in that
  position (`42 U.S.C., § 1983`) rejected the match — the comma is
  neither whitespace nor a valid connector — so every citation in
  this older / regulatory style silently disappeared.

  Allow optional comma between code and connector by changing the
  separator from `\s*` to `\s*,?\s*` in:

  - `src/patterns/statutePatterns.ts` (the `usc` and `cfr` tokenizers)
  - `src/extract/statutes/extractFederal.ts` (`FEDERAL_SECTION_RE`
    and `FEDERAL_PART_RE`)

  Sprint F's negative lookahead `(?![^)]*\d{4})` lives INSIDE the
  subsection body (after the section digits) and is preserved intact
  by this fix — the comma tolerance is added BEFORE the section.
  `attachStatuteYearParen` continues to bind trailing year/publisher
  parentheticals on comma-prefixed citations (verified by the
  regression tests in `issue587CommaBeforeSection.test.ts`).

- [#627](https://github.com/medelman17/eyecite-ts/pull/627) [`ebd0f2a`](https://github.com/medelman17/eyecite-ts/commit/ebd0f2a78909bca7001709d748e3a33632838eae) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): attach California `, subd.` / `paragraph` / `par.` subsection
  keywords to the `subsection` field (#589)

  California opinions write subsections with an explicit keyword between the
  section number and the paren chain — `Pen. Code, § 1238, subd. (a)(8)`,
  `Welf. & Inst. Code, § 111, subd. (c)`, `Code Civ. Proc., § 430.10, subd.
(e)`. The previous tokenizer body regex stopped at the section number; the
  `, subd. (X)` tail was sliced off the match entirely, leaving every CA
  `subd.` citation with `subsection: undefined`. Documented as 100% of CA
  `subd.` citations affected — every California opinion citing Penal /
  Probate / Vehicle / Welfare-and-Institutions / Civil-Procedure codes loses
  the subsection.

  Three coordinated changes:

  - `src/data/caBareCodes.ts` (`buildCaBareCodeRegex`) — tokenizer body group
    now optionally consumes `,?\s+(?:subd\.|subdivision|paragraph(s)?|par(s)?\.)\s+
\((X)\)(\((Y)\))*` so the matched token includes the keyword tail.
  - `src/patterns/statutePatterns.ts` (`named-code`) — same keyword tail
    appended to the section group so fully-qualified `Cal. Penal Code §
1238, subd. (a)` is captured in full.
  - `src/extract/statutes/parseBody.ts` — new `normalizeSubdKeyword`
    helper rewrites `1238, subd. (a)(8)` to `1238(a)(8)` (and collapses
    `(a) (8)` → `(a)(8)`) before the SUBSECTION_RE split, so the existing
    section/subsection routing works unchanged.

  The keyword alternation accepts singular/plural (`paragraph(s)`, `par(s)`),
  abbreviated/spelled-out (`subd.` / `subdivision`), and tolerates the
  optional leading comma. Bracket subscripts (`[a]`) are also accepted to
  match the NY `[3-a]` convention.

- [#627](https://github.com/medelman17/eyecite-ts/pull/627) [`ebd0f2a`](https://github.com/medelman17/eyecite-ts/commit/ebd0f2a78909bca7001709d748e3a33632838eae) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): allow whitespace between section number and subsection
  paren (#590)

  Documented examples:

  - `8 U.S.C. § 1101 (a)(43)`
  - `OCGA § 15-11-2 (8) (A)`
  - `I.C. § 19-4907 (b)`
  - `M.G.L. c. 106 § 1-205 (4)`

  The previous federal / abbreviated / mass-chapter tokenizer body
  regexes required the leading subsection paren to be adjacent to the
  section digits (`§ 1101(a)`). A single space between section number
  and subsection paren (typical court style for many state and federal
  opinions) silently dropped the subsection.

  Five coordinated changes:

  - `src/patterns/statutePatterns.ts` (`usc`, `cfr`, `mass-chapter`) —
    subsection paren alternative now accepts `\s*\(...\)`.
  - `src/data/stateStatutes.ts` (`buildAbbreviatedCodeRegex`) — same
    whitespace tolerance applied to the dynamically-built
    abbreviated-code regex.
  - `src/extract/statutes/extractAbbreviated.ts` (`ABBREVIATED_RE`) —
    same shape mirrored in the extractor's anchored regex.
  - `src/extract/statutes/parseBody.ts` — collapse `)\s+(` and `]\s+[`
    inside the body before splitting so `(8) (A)` → `(8)(A)` for the
    SUBSECTION_RE match.

  All four tokenizer / extractor changes carry a negative lookahead
  `(?![^)]*\d{4})` so a year-of-edition parenthetical (`(1976)`,
  `(West 2018)`, `(Repl. 1996)`) is NOT absorbed as subsection — the
  existing post-process `attachStatuteYearParen` continues to bind
  those parens as `year`/`publisher`/`editionLabel`. Existing tests
  asserting `year=1976`, `publisher="West"`, etc. all continue to
  pass without modification.

- [#627](https://github.com/medelman17/eyecite-ts/pull/627) [`ebd0f2a`](https://github.com/medelman17/eyecite-ts/commit/ebd0f2a78909bca7001709d748e3a33632838eae) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): capture subsection range endpoints (`(a)-(b)`,
  `(9)—(16)`) (#591)

  Range subsections like `35 U.S.C. §§ 311(a)-(b)`, `37 C.F.R. §
42.107(a)-(b)`, and `77 P.S. § 513(9) — (16)` previously dropped the
  second endpoint. `subsection` captured only `(a)` / `(9)`; the
  `-(b)` / `— (16)` tail was sliced off and the `matchedText` did not
  include the range — downstream consumers had no signal that a range
  was even cited.

  Adds structured `subsectionRange: { start, end }` on `StatuteCitation`:

  - `src/types/citation.ts` — new optional field, mirrors the existing
    `sectionRange` pattern (#564). `subsection` continues to carry the
    start endpoint for backward compatibility.
  - `src/extract/statutes/parseBody.ts` — new `SUBSECTION_RANGE_TRAILER_RE`
    detects a trailing `-(X)` / `—(X)` after the paren chain and slices
    it off the body. The dash class accepts multi-hyphen `---` (which
    `normalizeDashes` produces from a standalone em-dash like `(9) —
(16)` → `(9) --- (16)`) so the cleaned form still matches. Returns
    the captured endpoint as `subsectionRangeEnd` in `ParsedBody`.
  - `src/patterns/statutePatterns.ts` (`usc`, `cfr`) and
    `src/data/stateStatutes.ts` (`buildAbbreviatedCodeRegex`) —
    tokenizer body groups now consume the optional dash + paren trailer
    so the token's matched text includes the full range.
  - `src/extract/statutes/extractAbbreviated.ts` and
    `src/extract/statutes/extractFederal.ts` — propagate
    `subsectionRangeEnd` into the new `subsectionRange` field when a
    subsection start is present.

  Plain `(a)(1)` chains (no trailing dash) continue to leave
  `subsectionRange` undefined.

- [#627](https://github.com/medelman17/eyecite-ts/pull/627) [`ebd0f2a`](https://github.com/medelman17/eyecite-ts/commit/ebd0f2a78909bca7001709d748e3a33632838eae) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): recognize bare NY CPLR citations (`CPLR 3025 (b)`,
  `C.P.L.R. § 3211`) (#592)

  NY courts dominantly cite the Civil Practice Law and Rules as bare `CPLR
NNNN` with no `N.Y.` prefix and no `§` connector — `CPLR 3025 (b)`,
  `CPLR 3211 (a) (4)`, `CPLR 3108`, `CPLR 4518 [a]`. Documented as ~42
  hits across a 600-opinion sample; every NY case using the CPLR was
  losing the citation entirely. Dotted (`C.P.L.R.`) and §-prefixed
  (`CPLR § 3211`) variants were also missing because no abbreviated-code
  or named-code alternation owned the `CPLR` token.

  Adds a dedicated `ny-cplr-bare` tokenizer pattern and an
  `extractNyCplrBare` extractor:

  - `src/patterns/statutePatterns.ts` — new pattern recognizing
    `(?:N\.Y\.\s*)?C\.?\s*P\.?\s*L\.?\s*R\.?\s*(?:§§?\s*)?<digits>...`
    with optional paren/bracket subsection chain. Placed BEFORE the
    generic `named-code` alternation so the longer optional-`N.Y.`
    prefix subsumes the named-code match for fully-qualified
    `N.Y. C.P.L.R. § 211` citations and the canonical `N.Y. C.P.L.R.`
    code string is emitted regardless of input form.
  - `src/extract/statutes/extractNyCplrBare.ts` — new extractor that
    collapses interior whitespace between paren groups
    (`(a) (4)` → `(a)(4)`) before delegating to `parseBody`. Always
    emits `code: "N.Y. C.P.L.R."` and `jurisdiction: "NY"`.
  - `src/extract/extractStatute.ts` — dispatch the new `ny-cplr-bare`
    patternId to the new extractor.

  False-positive guard: bare `CPLR` without a trailing digit
  ("The CPLR governs procedure.") does not match because the mandatory
  section-digit group has no acceptable backoff.

- [#627](https://github.com/medelman17/eyecite-ts/pull/627) [`ebd0f2a`](https://github.com/medelman17/eyecite-ts/commit/ebd0f2a78909bca7001709d748e3a33632838eae) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): accept N.J.S.A. with inter-letter spacing (`N. J. S. A.`)

  - normalize whitespace/no-period variants to canonical `N.J.S.A.` (#593)

  The previous NJ regex fragment required no whitespace between the
  inter-letter periods, so `N. J. S. A. 2:100-26` (whitespace between
  every letter — common in older NJ Super and NJ reporters) failed to
  tokenize. Documented as 38 hits across a 600-opinion sample.

  Two coordinated changes to `src/data/stateStatutes.ts`:

  - Extend the NJ regex fragment from
    `N\.?J\.?\s*S(?:tat)?\.?\s*A?\.?` to
    `N\.?\s*J\.?\s*S(?:tat)?\.?\s*A?\.?` so whitespace is permitted
    between every letter pair. Same tolerance pattern already used for
    Pennsylvania (`Pa.C.S.` / `Pa. C.S.` / `Pa. C. S.`) and Ohio
    (`R.C.` / `R. C.`).
  - Reorder the `abbreviations` array so `N.J.S.A.` is LAST (canonical
    Bluebook form). `findAbbreviatedCode`'s stripped-form fallback emits
    the LAST entry as the normalized `code` for spaced/no-period
    variants — previously the last entry was the bare shorthand `NJS`,
    so `N. J. S. A.` resolved with `code="NJS"` rather than the
    expected canonical `code="N.J.S.A."`. The reordering matches the
    Arizona pattern (`["Ariz. Rev. Stat. Ann.", "Ariz. Rev. Stat.",
"A.R.S."]`) where the canonical Bluebook abbreviation is last.

- [#627](https://github.com/medelman17/eyecite-ts/pull/627) [`ebd0f2a`](https://github.com/medelman17/eyecite-ts/commit/ebd0f2a78909bca7001709d748e3a33632838eae) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): route NYC Admin Code citations to NY (not Georgia) (#594)

  `N.Y.C. Admin. Code § 8-107(1)(a)` (and the spelled-out `New York City
Administrative Code § 8-107(1)(a)`) previously matched the Georgia
  pre-1983 `Code §` fallback. The bare `Code § 8-107` suffix slotted into
  the GA pattern, so the citation extracted as `code: "Code"`,
  `jurisdiction: "GA"` — the entire NYC prefix was silently dropped and
  the jurisdiction was wrong.

  Adds a dedicated `nyc-admin-code` tokenizer pattern and
  `extractNycAdminCode` extractor:

  - `src/patterns/statutePatterns.ts` — new pattern recognizing both
    abbreviated (`N.Y.C. Admin. Code`) and spelled-out (`New York City
Administrative Code`) prefixes plus the two-part hyphen section
    body. Listed BEFORE `ga-pre-1983` so the longer prefix-qualified
    match wins span dedup.
  - `src/extract/statutes/extractNycAdminCode.ts` — new extractor that
    always emits `code: "N.Y.C. Admin. Code"` (canonical) and
    `jurisdiction: "NY"`.
  - `src/extract/extractStatute.ts` — dispatch the new patternId.

  The GA `Code §` fallback still owns plain `Code § N-N` citations
  without an NYC prefix, so existing pre-1983 GA support is unchanged.

- [#627](https://github.com/medelman17/eyecite-ts/pull/627) [`ebd0f2a`](https://github.com/medelman17/eyecite-ts/commit/ebd0f2a78909bca7001709d748e3a33632838eae) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): accept Illinois `chap.` (full spelling) in Ill. Rev. Stat.
  citations (#595)

  The pre-1993 Illinois Revised Statutes pattern required `ch.` exactly;
  `Ill. Rev. Stat. 1955, chap. 38, par. 602` (with full-spelled `chap.`)
  was missed. Both `ch.` and `chap.` are common in modern Illinois opinions
  when citing the historical statutory text.

  `src/patterns/statutePatterns.ts` (`ill-rev-stat`) and
  `src/extract/statutes/extractIllRevStat.ts` — extend the chapter
  keyword from `[Cc]h\.` to `[Cc]h(?:ap)?\.` so both abbreviated and
  full-spelled forms tokenize. Lowercase/uppercase initial letter is
  preserved.

- [#629](https://github.com/medelman17/eyecite-ts/pull/629) [`00743a1`](https://github.com/medelman17/eyecite-ts/commit/00743a125211252bc7f189591a0d0843bec8c52a) Thanks [@medelman17](https://github.com/medelman17)! - test(extract): lock in year-glued-subsection behavior (#588)

  Documented examples:

  - `42 U.S.C. § 1472(c)(2000)` → `subsection="(c)"`, `year=2000`
  - `49 U.S.C. § 10502(a)(2000)` → `subsection="(a)"`, `year=2000`
  - `42 U.S.C. § 1472(c)(50)` → `subsection="(c)(50)"`, `year=undefined`
  - `42 U.S.C. § 1331(a)(West 2018)` → `publisher="West"`, `year=2018`

  Compact `§ NNNN(c)(YYYY)` forms (no whitespace before the year
  parenthetical) used to merge the year into the subsection chain
  because the year-paren absorber only ran when whitespace separated
  the subsection from the year. Sprint F (#590) added a negative
  lookahead `(?![^)]*\d{4})` to the USC/CFR subsection body that
  rejects any parenthetical containing four consecutive digits — the
  fix composes orthogonally with the post-process
  `attachStatuteYearParen` binder which accepts zero leading
  whitespace (`^\s*\(`), so the compact form now binds year correctly
  as a side-effect of Sprint F.

  This changeset adds `tests/extract/issue588YearGluedSubsection.test.ts`
  to lock in that post-Sprint-F behavior so future changes to the
  subsection / year-paren shape cannot silently regress it. No
  runtime change.

## 0.22.1

### Patch Changes

- [#621](https://github.com/medelman17/eyecite-ts/pull/621) [`3323c2c`](https://github.com/medelman17/eyecite-ts/commit/3323c2cbc36e9a318172e2965940b0b9acd34da8) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): plausibility-filter extracted years to drop OCR artifacts and
  page-number leaks (#523)

  Without a sanity range check, any 4-digit number harvested into the year
  slot was accepted. OCR-mangled values like `1372` (intended `1972`) and
  `1076` (intended `1976`) slipped through silently; #522's page-number leak
  (`3021` mistaken for a year) was a related symptom that a trivial range
  check would have caught upfront.

  Adds `isPlausibleYear(year)` exported from `src/extract/dates.ts`, with the
  range `[1700, currentYear + 1]` (inclusive). The lower bound matches the
  practical floor of U.S. citation corpora; the `currentYear + 1` cap
  tolerates opinions filed right around the new year.

  Applied at every site that publishes a `year` field from a raw `\d{4}`
  match — defense-in-depth across the parser:

  - `parseDate` (one check per pattern branch, plus the year-only fallback).
    Implausible years cause the matcher to return `undefined` rather than
    reporting a bad year with month/day.
  - `extractCase` case-name backsearch: both the `v.` (`V_CASE_NAME_REGEX`)
    and the procedural-prefix (`PROCEDURAL_PREFIX_REGEX`) CSM `(court year)`
    paths.
  - `extractJournal` lookahead `(YYYY)` paren.
  - `extractFederalRegister` paren year.
  - `extractStatutesAtLarge` paren year.

  Neutral citations (`2020 IL 12345`) are intentionally not filtered: the
  year is a structural component of the citation pattern itself, not an
  optional metadata field, so an implausible year there indicates the entire
  match is suspect — handled upstream by the tokenizer's strict year-prefix
  patterns.

  One pre-existing two-digit-year test (`1/1/50` → 2050) is updated to use
  `1/1/27` → 2027 so the pivot-boundary assertion does not collide with the
  new plausibility cap; the two-digit pivot itself (`<=50` → 21st century,
  `>50` → 20th) is unchanged.

- [#621](https://github.com/medelman17/eyecite-ts/pull/621) [`3323c2c`](https://github.com/medelman17/eyecite-ts/commit/3323c2cbc36e9a318172e2965940b0b9acd34da8) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): Georgia-style parenthesized parallel cite propagates the
  trailing year to the inner member (#524)

  In Georgia opinions (and a handful of other state systems), a parallel
  citation is wrapped in parens:

                                275 Ga. 486, 488-489 (2) (569 SE2d 502) (2002)

  The inner cite `569 SE2d 502` is the parenthesized parallel; the
  trailing `(2002)` is the shared year for both members. Before this fix,
  the inner cite got `year=undefined` because the lookahead-paren scan saw
  `) (2002)` immediately after the page and bailed — the leading `)`
  blocked `LOOKAHEAD_PAREN_REGEX` (which requires a `(` after at most
  whitespace + an optional pincite).

  The fix consumes a single leading close-paren or close-bracket (with
  optional whitespace) before running LOOKAHEAD_PAREN_REGEX, so the inner
  cite can reach the trailing year paren. The outer Ga cite already gets
  2002 via the `postChainStart` chain-skip logic; this patch fills in the
  inner member.

  Only one close-bracket is stripped — deeper nesting (e.g., `))`) is too
  ambiguous to attribute safely. Bracketed parallel `[569 SE2d 502]
(2002)` is also handled. Volume hit-rate: ~15-50 per 300 GA-reporter
  opinions.

- [#621](https://github.com/medelman17/eyecite-ts/pull/621) [`3323c2c`](https://github.com/medelman17/eyecite-ts/commit/3323c2cbc36e9a318172e2965940b0b9acd34da8) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): semicolon-separated parallel cites propagate year and link
  into a group (#551)

  Michigan (and a handful of other states) write parallel citations with
  `;` instead of `,`:

                                People v Bobo, 390 Mich 355, 359; 212 NW2d 190 (1973)

  Before this fix, the Mich cite got `year=undefined` and the two members
  were not grouped. This was the single highest-volume year defect in the
  corpus — 40/48 of the observed missed-year cases were Michigan-style
  semicolon parallels.

  Two changes, both narrowly scoped:

  1. `src/extract/detectParallel.ts`: extend the gap-shape gate to accept
     `;` at the outer boundary (between the last pincite and the next
     reporter token).

     - Tight: `^[,;]\s*$` (was `^,\s*$`)
     - Pincite-between: `^,\s*PINCITE_LIST\s*[,;]\s*$` (was just `,`)
       Pincite lists themselves still require comma-separation; `parsePincite`
       rejects `;` segments. The shared-paren gate already in this function
       (rejecting `A (year); B (year)` shapes) continues to keep string-cite
       semantics intact.

  2. `src/extract/extractCase.ts` CHAIN_BRIDGE_REGEX: add `;` to the
     bridge class (`/^[\s,;\d\-–—]*$/`). Without this, even with the group
     detected, the post-chain scan in the FIRST member would stop at the
     semicolon and the trailing year paren would not be reachable.

  One pre-existing test (`does not link citations separated by semicolon`)
  asserted that ANY semicolon-separated pair must be rejected — that is
  now an explicit MICHIGAN-style positive case, with the rationale
  documented inline. A new negative test (`does NOT link semicolon-
separated cites with their own parens (string cite)`) pins down the
  opposite shape so the regression coverage is unchanged in spirit.

  Listed as a precondition for #507 (Ohio neutral parallel pincite
  inheritance), which depends on parallel-group membership.

- [#621](https://github.com/medelman17/eyecite-ts/pull/621) [`3323c2c`](https://github.com/medelman17/eyecite-ts/commit/3323c2cbc36e9a318172e2965940b0b9acd34da8) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): preserve trailing `(year)` paren after a bare `at`-pincite
  (#552)

  `Smith v. Jones, 491 S.W.2d 636 at 638 (1973)` returned `pincite=638`,
  `year=undefined`, `court=undefined`. The LOOKAHEAD_PINCITE_REGEX captured
  the at-pincite correctly, but LOOKAHEAD_PAREN_REGEX only accepted the
  comma form (`,\s*[at\s+]?\d+`) as a pincite-skip prefix. With ` at 638`
  (no leading comma), the regex failed to advance past the pincite and
  never reached the trailing `(1973)` paren. The comma-bearing forms
  (`, 638 (1973)`, `, at 638 (1973)`) already worked.

  Extends LOOKAHEAD_PAREN_REGEX to accept ` at [pp.|pages] *N[-N]` as an
  alternative pincite-skip prefix, mirroring the leading branch of
  LOOKAHEAD_PINCITE_REGEX:

      /^(?:(?:,\s*(?:at\s+(?:(?:pp?\.|pages?)\s*)?)?
            |\s+at\s+(?:(?:pp?\.|pages?)\s*)?)
          \*?\d+(?:-\d+)?)*
       (?:\s+(?:n|note)\s*\.?\s*\d+)?\s*\(([^)]+)\)/

  Covers star-pagination (`at *3`), spelled-out page prefix (`at p. 638`,
  `at pp. 638-640`, `at page 638`), and ranges (`at 638-640`). Existing
  comma-bearing forms continue to work; the at-form is repeatable for
  parity with the comma form.

- [#621](https://github.com/medelman17/eyecite-ts/pull/621) [`3323c2c`](https://github.com/medelman17/eyecite-ts/commit/3323c2cbc36e9a318172e2965940b0b9acd34da8) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): accept hyphenated-year parens like `(1965-1966)` on journal
  citations (#553)

  Case citations already handle the hyphenated-year paren correctly because
  they route the parenthetical through `parseDate`, which falls through to
  the year-only matcher and returns the first 4-digit year. The journal
  extractor used a tighter custom regex (`/\((?:.*?\s)?(\d{4})\)/`) that
  required the year to abut the closing paren, so `(1965-1966)` and the
  shorthand `(1965-66)` returned `year=undefined`.

  The fix extends the regex to absorb an optional trailing `[-–—]\d{2,4}`
  range:

      /\((?:.*?\s)?(\d{4})(?:[-–—]\d{2,4})?\)/d

  Only the leading 4-digit year is exported (matching the case-cite
  semantics). Hyphen, en-dash, and em-dash separators are all accepted —
  typographic dashes show up in journal volume runs.

  Component spans still point at the captured group 1 (the first year), so
  position information remains consistent with the case-cite path.

- [#621](https://github.com/medelman17/eyecite-ts/pull/621) [`3323c2c`](https://github.com/medelman17/eyecite-ts/commit/3323c2cbc36e9a318172e2965940b0b9acd34da8) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): parse ISO, European, and missing-space-after-period date
  formats in `parseDate` (#554)

  Before this fix, `parseDate` silently dropped the month and day for any
  date format outside the two US-style forms (`Jan. 15, 2020`, `January 15,
2020`) and `MM/DD/YYYY`. ISO 8601 (`2020-06-15`), ISO with slashes
  (`2020/06/15`), European order (`15 June 2020`, `15 Jun 2020`), and the
  common OCR artifact `Jan.15, 1990` (no space after the period) all fell
  through to the year-only matcher and produced `year: 2020` (or 1990) with
  no month/day.

  Four new branches are added between the existing patterns:

  1. **ISO 8601** — `\b(\d{4})([-/])(\d{1,2})\2(\d{1,2})\b`, placed BEFORE
     the US numeric matcher so the leading 4-digit group is unambiguously a
     year. The back-reference on the separator (`\2`) requires both
     separators to match, preventing `2020-06/15` from being half-parsed.
  2. **Missing-space-after-period** — folded into the abbreviated-month
     regex by changing the gap between month abbreviation and day from
     `\.?\s+` to `(?:\.?\s+|\.\s*)`. This accepts `Jan. 15`, `Jan 15`, and
     `Jan.15` but still rejects bare `Jan15` (the period or space is
     required as an anchor).
  3. **European day-month-year** — `\b(\d{1,2})\s+(month|abbr)\.?\s+
(\d{4})\b`, placed AFTER the US matchers so `Jan. 15, 2020` is read
     left-to-right as month-day-year and is not re-interpreted as a
     day-month-year string.
  4. (No code change needed for ISO-slash beyond branch #1 — the
     back-reference handles both `-` and `/`.)

  Year-only fallback is preserved so unrecognized formats still surface a
  year when one is present in the string.

## 0.22.0

### Minor Changes

- [#617](https://github.com/medelman17/eyecite-ts/pull/617) [`8109366`](https://github.com/medelman17/eyecite-ts/commit/8109366b324b9e9f0cec3ebeee190883a7d269a3) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): chained subsequent history attaches each link's entry to its
  immediate parent, not the chain root (#527)

  In a chain like `<root>, aff'd, <A>, cert. denied, <B>`, A is the
  affirmance of the root and B is the cert. denial OF A (not of the
  original root). The scanner already correctly attached `affirmed` to the
  root and `cert. denied` to A. The Union-Find linker then collapsed
  everything into a single component and aggregated all entries onto the
  root, with two visible defects:

  - A lost its own `subsequentHistoryEntries` (the linker cleared them
    during aggregation), so the trailing chain link was effectively
    dropped from A.
  - B's `subsequentHistoryOf` pointed back at the root rather than at A,
    breaking downstream `citationGraph` "history-of" edges.

  The linker now skips Union-Find aggregation entirely. Each child resolves
  to the lowest-indexed parent that paired with it (the primary cite of the
  immediately-preceding chain link, naturally found via the scanner's own
  position-based pairing). Entries stay where the scanner attached them.

  This is a behavior change for the shape of `subsequentHistoryEntries`
  across multi-link chains — the original cite now holds ONLY its direct
  child's signal, with downstream signals living on the intermediate cites.
  Existing tests that asserted "all entries on root" were updated to the
  correct semantics.

### Patch Changes

- [#617](https://github.com/medelman17/eyecite-ts/pull/617) [`8109366`](https://github.com/medelman17/eyecite-ts/commit/8109366b324b9e9f0cec3ebeee190883a7d269a3) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): stop nested-paren content from leaking page numbers as `year`
  and prose body as `court` (#522)

  The metadata-paren regexes (`PAREN_REGEX`, `LOOKAHEAD_PAREN_REGEX`) match
  non-greedy `[^)]+`, so a paren that contains a nested paren —
  `(quoting United States v. Janis, 428 U.S. 433, 458, 96 S.Ct. 3021, 49
L.Ed.2d 1046 (1976))` — was truncated at the first `)`. `parseParenthetical`
  then picked up the first 4-digit token as the year (the page number `3021`)
  and the entire truncated prose body as the court. SCOTUS opinions hit this
  constantly because explanatory `(quoting/citing/see ... (YYYY))` patterns
  are everywhere.

  The fix adds `isNonMetadataParenContent(content)`, used everywhere a
  parenthetical is about to be fed to `parseParenthetical`. The helper
  recognises three explanatory-paren shapes that must never produce metadata:
  unbalanced parens (regex truncated past an inner `(`), a leading signal
  word, or a nested `(YYYY)` paren in the body. Hit any of these → skip
  metadata extraction. Year/court fields stay unset on the outer cite, and
  the SCOTUS / circuit / state reporter inference downstream applies as if
  the paren were absent. The full balanced paren is then captured by
  `collectParentheticals` (depth-tracking) and surfaced through
  `parentheticals` with the correct signal type (`quoting`, `citing`, etc.).

- [#617](https://github.com/medelman17/eyecite-ts/pull/617) [`8109366`](https://github.com/medelman17/eyecite-ts/commit/8109366b324b9e9f0cec3ebeee190883a7d269a3) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): raise `collectParentheticals` lookahead so long explanatory
  parens and any trailing history clause survive (#528)

  The scanner's `maxLookahead=500` silently dropped any explanatory
  parenthetical whose closing `)` fell past the 500-char window — and the
  trailing history clause (`cert. denied, ...`, `aff'd, ...`) after it.
  Modern caselaw explanatory parens routinely run hundreds of characters,
  so this fired often enough to be a real defect.

  The default soft cap is now 2000 chars (4× the old limit), and once an
  opening `(` is seen inside the window the depth-tracking inner loop is
  allowed to chase the matching `)` up to a 10,000-char hard ceiling. That
  way a paren whose body overflows the soft window is still captured intact,
  and the scanner can keep walking after it to pick up trailing history
  signals. Perf is unchanged on representative opinions (linear walk, early
  termination on the first non-paren / non-signal character).

- [#617](https://github.com/medelman17/eyecite-ts/pull/617) [`8109366`](https://github.com/medelman17/eyecite-ts/commit/8109366b324b9e9f0cec3ebeee190883a7d269a3) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): stop disposition keywords from leaking into the `court` field (#529)

  `(per curiam)`, `(en banc)`, `(in bank)`, `(plurality opinion)`, `(mem.)`,
  and `(unpublished table decision)` parens were being written to both
  `court` and `disposition`. The disposition string overwrote the
  reporter-based court inference, so `455 U.S. 478 (1982) (per curiam)`
  returned `court="per curiam"` instead of `court="scotus"`. Disposition is
  orthogonal to court — it describes how an opinion was issued, not which
  court issued it. The parser now clears `court` (and the matching span
  offsets) whenever it equals the disposition text it just recognised, so
  SCOTUS / circuit / state inference survives a trailing disposition paren.

## 0.21.7

### Patch Changes

- [#614](https://github.com/medelman17/eyecite-ts/pull/614) [`64c9fc7`](https://github.com/medelman17/eyecite-ts/commit/64c9fc7c89ac906472755890a108cc1aec88aad7) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): drop tokens properly overlapped by higher-priority tokens during dedup (#558)

  Block-element fusion in HTML input — e.g. `<p>500 F.2d 123</p><p>Then citing 600 F.2d 234</p>` — cleaned to `500 F.2d 123 Then citing 600 F.2d 234`. The broad journal regex then matched `123 Then citing 600` as a phantom journal cite that overlapped the trailing page of the first real cite AND the leading volume of the second. The previous dedup pass only handled strict containment, so the phantom slipped through alongside the two real federal-reporter citations.

  A second dedup pass now walks the surviving tokens in priority order and drops any token properly overlapped by a higher-priority kept token. Strict containment is still handled by the first pass; equal-priority overlaps are still preserved. The two real `500 F.2d 123` and `600 F.2d 234` cites survive, the phantom journal does not. Cleaned text and span positions are unchanged.

  Closes #558. Sprint A's #583 word-neighbor space insertion already prevented the worst form of fusion (digits → letters with no separator); this commit removes the secondary symptom.

- [#614](https://github.com/medelman17/eyecite-ts/pull/614) [`64c9fc7`](https://github.com/medelman17/eyecite-ts/commit/64c9fc7c89ac906472755890a108cc1aec88aad7) Thanks [@medelman17](https://github.com/medelman17)! - fix(clean): close three HTML-entity decoder gaps in `decodeHtmlEntities` (#562)

  Three bugs:

  - `&ndash;` and `&mdash;` were not in the named-entity table. Both are common in legal text (page-range pincites like `100&ndash;105` and stylistic dashes in court opinions like `as such&mdash;a court of equity`). Both are now decoded to the corresponding Unicode dashes; downstream `normalizeDashes` then rewrites them to ASCII hyphens (or the blank-page `---` placeholder for standalone em-dashes).
  - The hex numeric-entity regex required a lowercase `x` (`&#x167;`), but `x` is case-insensitive in the HTML numeric form — `&#X167;` should decode identically. The regex now uses the `i` flag.
  - `String.fromCharCode` silently truncates code points above `0xFFFF` (it expects a UTF-16 code unit, not a code point). `&#128512;` for U+1F600 GRINNING FACE produced an empty string. The decoder now uses `String.fromCodePoint` with a bounds check so out-of-range values (> 0x10FFFF) fall back to the original entity instead of throwing `RangeError`.

- [#614](https://github.com/medelman17/eyecite-ts/pull/614) [`64c9fc7`](https://github.com/medelman17/eyecite-ts/commit/64c9fc7c89ac906472755890a108cc1aec88aad7) Thanks [@medelman17](https://github.com/medelman17)! - fix(clean): strip `<script>` / `<style>` bodies and unwrap `<![CDATA[…]]>` markers in `stripHtmlTags` (#559, #561)

  `stripHtmlTags` previously ran a single tag-shape regex over the whole document, with two side effects:

  - `<script>` / `<style>` bodies were preserved (only the opening and closing tags were stripped), so JS string literals like `"999 F.2d 999"` and CSS `content:` values leaked into the cleaned text and the tokenizer happily emitted phantom citations from them (#559).
  - `<![CDATA[…]]>` sections matched the tag regex as one greedy "tag" (the leading `!` was in the allowed set and the section contains no `>` until the very end), so the entire body — including any embedded citation — was deleted (#561).

  `stripHtmlTags` now runs three pre-passes before the generic tag-stripper: delete `<script>…</script>` bodies in full, delete `<style>…</style>` bodies in full, and unwrap `<![CDATA[…]]>` markers (keep the body, drop the markup). Script/style body matching is non-greedy so an unclosed opener does not eat the rest of the document.

## 0.21.6

### Patch Changes

- [#609](https://github.com/medelman17/eyecite-ts/pull/609) [`e59b265`](https://github.com/medelman17/eyecite-ts/commit/e59b2654b8f55c48196151764eb3df756f51609b) Thanks [@medelman17](https://github.com/medelman17)! - fix(score): broaden mid-sentence `Id.` penalty to recognize preceding Bluebook signal phrases (#557)

  `extractShortForms.ts` was clamping `Id.` confidence to 0.4 when the citation followed a sentence-level signal like `See`, `See also`, `Compare`, `Accord`, `Contra`, `See generally`, `But see`, `See, e.g.`, `E.g.`, or `But see, e.g.` — the existing punctuation check only accepted `.;)\]—:` so signals ending on alphabetic characters or a comma were misread as mid-sentence prose. About 66% of `id` citations in a 300-opinion CAP-corpus audit landed at exactly 0.4 because of this. The context check now also matches a trailing signal phrase (mirroring `SIGNAL_PATTERNS` in `detectStringCites.ts`) and uses a 60-char lookback window so signals after a real preceding citation (`... (1974). See id.`) no longer trip the penalty either. `Id.` after lowercase prose ("The Id. card", "His Id.") still gets the 0.4 cap.

- [#612](https://github.com/medelman17/eyecite-ts/pull/612) [`bb11feb`](https://github.com/medelman17/eyecite-ts/commit/bb11feb7427640b570b6dc1724133685966728d4) Thanks [@medelman17](https://github.com/medelman17)! - Restore the +0.3 reporter-match confidence boost for SCOTUS, F.Supp._, So._, and common state reporters in degraded mode (#555).

  `cleaners.normalizeReporterSpacing` collapses inner spaces in known reporter abbreviations (`S. Ct.` → `S.Ct.`, `L. Ed. 2d` → `L.Ed.2d`, `F. Supp. 2d` → `F.Supp.2d`, `So. 2d` → `So.2d`). The `COMMON_REPORTERS` fallback set used by `extractCase.ts` was authored against the pre-cleaning Bluebook canonicals — so those spaced entries were dead and never matched anything the extractor actually produced. State reporters from the audit (`Mass.`, `Va.`, `Pa.`, `Idaho`) and the Cal. family (`Cal.4th`, `Cal.Rptr.2d`, etc.) were absent entirely. The fallback only matters when reporters-db has not been loaded — but `extractCitations` is synchronous and never auto-loads it, so this code path is hit on every default invocation.

  Result, pre-fix: a 300-opinion CAP-corpus audit found 100% of `S.Ct.` / `L.Ed.2d` / `Mass.` / `Cal.Rptr.2d` / `Va.` citations scoring 0.65 (or lower without a court parenthetical) instead of the 0.95 they should reach. Mean case-citation confidence: 0.46, with 81% under 0.7.

  `COMMON_REPORTERS` now uses the post-cleaning canonical forms (no inner spaces) and explicitly includes the audited state reporters and the full Cal. family. The spaced Bluebook forms are kept alongside for defensiveness in case a code path skips the cleaner. The fix surfaces both ways: the existing `extractCase.ts` confidence scoring and the `extractShortForms.ts` short-form reporter check both benefit, since both consume the same set.

  Auto-loading the reporters-db from `extractCitationsAsync` was considered as a complementary fix but deferred — it couples the core bundle to the data chunk and surfaces a separate pre-existing dist-runtime path-resolution issue that warrants its own focused PR.

- [#611](https://github.com/medelman17/eyecite-ts/pull/611) [`960ef84`](https://github.com/medelman17/eyecite-ts/commit/960ef8472138ef1b9c0232f8f87f15fa54e30b2b) Thanks [@medelman17](https://github.com/medelman17)! - Recompute confidence for parallel-cite secondary citations after `inheritParallelCaseName` propagates the shared caption (#556).

  `inheritParallelCaseName` runs as a post-pass and mutates `caseName` / `plaintiff` / `defendant` onto each secondary cite in a parallel-cite group (e.g. `93 S. Ct. 705` and `35 L. Ed. 2d 147` in `Roe v. Wade, 410 U.S. 113, 93 S. Ct. 705, 35 L. Ed. 2d 147 (1973)`). But each secondary's `confidence` was already locked in by `buildCaseCitation()` when its `caseName` was still `undefined`, so the score missed the `+0.15` caseName signal it now qualifies for. CAP-corpus audit (300 opinions): roughly 94% of citations that had a full case name, a year, and a court but landed under 0.7 confidence were parallel secondaries stuck at the pre-inheritance score.

  Fix:

  - Extract the case-citation confidence formula out of `buildCaseCitation` into a pure helper `computeCaseConfidence({ reporter, year, caseName, court, hasBlankPage })`.
  - Call it from the original site (no behavior change for citations that don't go through inheritance).
  - After `inheritParallelCaseName` mutates the caption fields on a secondary, recompute its confidence with the same helper so the inherited `caseName` registers in the score.

  The recompute only fires on secondaries whose `caseName` was previously undefined (the inheritance loop already short-circuits for ones that already have one). Primary cites and non-parallel cites are untouched.

  Concrete deltas for repros in the issue:

  - `Roe v. Wade, 410 U.S. 113, 93 S. Ct. 705, 35 L. Ed. 2d 147 (1973)` — each secondary picks up +0.15 (`0.5 → 0.65` for the SCOTUS secondaries, bounded by the reporter-database lookup tracked separately by #555).
  - `Nixon v. Nixon, 329 Pa. 256, 198 A. 154 (1938)` — `198 A. 154` rises from 0.70 to 0.85.
  - `People v. Smith (2001) 24 Cal.4th 849 [102 Cal.Rptr.2d 731]` — `102 Cal.Rptr.2d 731` rises from 0.20 to 0.35.

- [#598](https://github.com/medelman17/eyecite-ts/pull/598) [`67b4aae`](https://github.com/medelman17/eyecite-ts/commit/67b4aaedece1b0ddb6e3c608c09fff95405d1f9e) Thanks [@medelman17](https://github.com/medelman17)! - fix(resolve): prefer same-case full-caption supra matches

  `Plaintiff v. Defendant, supra` resolution now first looks for a single
  antecedent whose plaintiff and defendant both match the caption. This prevents
  an unrelated case with a stronger one-sided fuzzy match from beating the
  intended antecedent.

## 0.21.5

### Patch Changes

- [#599](https://github.com/medelman17/eyecite-ts/pull/599) [`8ca9e5d`](https://github.com/medelman17/eyecite-ts/commit/8ca9e5d77eca7e7ec9efbd1fbe532eff04eb19e5) Thanks [@medelman17](https://github.com/medelman17)! - Collapse the horizontal ellipsis (`…`, U+2026) to the ASCII 3-dot form during text cleaning instead of relying on the implicit NFKC compatibility decomposition (#548).

  Earlier the only thing turning `…` into ASCII dots was `normalizeUnicode`'s call to `String.prototype.normalize("NFKC")`. That made the substitution opaque — readers could not tell from the cleaner pipeline that ellipses were being rewritten, and in the worst-cited audit case the expansion left cleaned text longer than the original span. `normalizeTypography` now performs the substitution explicitly with `…` → `...`, so the rewrite is visible, intentional, and capped at the standard Bluebook 3-dot form. The cleaner still expands 1 input character into 3 output characters, but the expansion is now bounded and documented rather than emerging as a side-effect of compatibility decomposition.

- [#602](https://github.com/medelman17/eyecite-ts/pull/602) [`d4d0ebc`](https://github.com/medelman17/eyecite-ts/commit/d4d0ebc90d43b8342a562ddb5a2de2524fd47607) Thanks [@medelman17](https://github.com/medelman17)! - Fix `fullSpan` overshoot into preceding prose on regex false-positive citations (#547).

  The broad state-reporter regex (`\d+ Capitalized+ \d+`) sometimes matched volume-reporter-page shapes that straddled a hard line break in the source — section headings concatenated with body sentences (`2. Denials of 1-602 Applications\nOn October 19`), form-field addresses (`5713 Monona Drive\nMonona WI 53716`), and smart-quote-artifact rule references (`56\nFed. R. Civ.' P. 56`). The cleaner collapsed `\n` to space, so the tokenizer never saw the break. The case-name backward scan then absorbed the preceding heading or form-label line into `caseName` and extended `fullSpan` across it, producing user-visible spans that mixed unrelated prose into the citation.

  `applyFalsePositiveFilters` now inspects the original (pre-cleaning) source text. A `case` (or `shortFormCase`) citation whose original-text span contains a `\n` is treated as a structural false positive — real reporter abbreviations never wrap a line break, and OCR-wrapped citations like `F. Sup-\np. 3d` are already stitched by `rejoinHyphenatedWords` before whitespace normalization. Flagged citations get confidence `0.1` plus a `#547` warning; their `fullSpan` is stripped so downstream consumers (`annotate`, `citationBounds`, `document/proseOffsets`) fall back to the cite-core span instead of surfacing surrounding prose. With `filterFalsePositives: true`, the phantom is dropped entirely. Across 758 case citations in a 100-opinion CAP sample, every cite crossing a newline was a confirmed false positive — no observed false negatives.

  `applyFalsePositiveFilters` gained an optional third parameter `originalText`; existing call sites that pass only two arguments continue to work, with the line-crossing check skipped.

- [#600](https://github.com/medelman17/eyecite-ts/pull/600) [`f403565`](https://github.com/medelman17/eyecite-ts/commit/f403565c2892178ff73d7428318e8cff1c7b49ce) Thanks [@medelman17](https://github.com/medelman17)! - Fix `extractCitations` producing overlapping core spans on `Case, supra, vol Reporter page` and `vol Id. page` patterns (#549).

  Two tokenizer collisions slipped through the existing containment-only dedup pass and produced overlapping `span.cleanStart`/`cleanEnd` pairs on roughly 4-5% of CAP-corpus opinions:

  - **Mode A** — `Barrett, supra, 229 Conn. 274-76`. `SUPRA_PATTERN`'s Connecticut comma-pincite alternative (`, NNN`, #353) greedily consumed the `229` as supra's pincite, even though the digits are actually the volume of a following full citation. The result: a `supra` span ending at `229` overlapping a `case`/`journal` span starting at `229`. `ID_PATTERN` and `IBID_PATTERN` exhibited the identical bug on the same shape.
  - **Mode B** — `Hawkins v. Giles, 45 Id. 318`. The broad `state-reporter` and `law-review` patterns treated `Id.` as a reporter abbreviation, matching `45 Id. 318` as a full case citation. The correct `id` pattern matched `Id.` at the same time, producing a contained-overlap pair that the priority dedup kept around (because the `id` token has higher priority and the existing rule only drops the contained side).

  The overlapping spans were the root cause of #545 (annotate sentinel corruption, already defended downstream) and broke `fullSpan` splice logic in #543.

  Fix is at the regex layer so the overlap is never produced — keeping both legitimate citations cleanly:

  - `SUPRA_PATTERN` / `ID_PATTERN` / `IBID_PATTERN` comma-pincite branches gain `(?!\d+\s+[A-Z])` so the comma-pincite does not fire when the digits are followed by a reporter shape. The legitimate Connecticut comma-pincite (`Smith, supra, 522.`) keeps working because its digits are not followed by a capital-letter reporter.
  - `state-reporter` (in `casePatterns`) and `law-review` (in `journalPatterns`) gain `(?!(?:Ibid|Id)\.?\s+\d)` after the volume so `Id.` / `Ibid.` cannot masquerade as reporter abbreviations. `Idaho` and other reporters starting with `Id` are unaffected — the lookahead only fires on the short-form shape (`Id.` / `Ibid.` immediately followed by a page digit).
  - The mirrored regexes inside `extractShortForms.ts` (`idRegex`, `partySupraRegex`) gain the same lookahead so the tokenizer and the re-extractor stay in lock-step.

- [#603](https://github.com/medelman17/eyecite-ts/pull/603) [`1f5f443`](https://github.com/medelman17/eyecite-ts/commit/1f5f4433d2b7b91581b41e0d8ad1baad1499eb68) Thanks [@medelman17](https://github.com/medelman17)! - fix(clean): repair catastrophic `TransformationMap` collapse (#546, #550)

  The text-cleaning pipeline was producing zero-width / orphan citation
  spans for two distinct inputs:

  1. **Plain text with a stray `<` and `>` pair** (OCR artifacts in CAP
     opinions like `consenting te< waive any objection ... da>`).
     `stripHtmlTags` greedily matched everything between the two
     characters, deleting thousands of chars of legitimate prose.
     The regex now requires a tag's first character to be a letter, `/`,
     or `!`, and rejects matches that contain raw line breaks.
  2. **HTML with adjacent same-tag deletions** (every word wrapped in
     `<span class="word">…</span>`). `rebuildPositionMaps` rejected the
     correct lookahead because the character right after a tag deletion
     is `<` (the start of the next tag), failing its strict 3-char
     confirmation check. It then accepted a coincidental 3-gram match
     far downstream, collapsing 41,000+ clean positions onto a single
     original position.

  `rebuildPositionMaps` now tracks both a strong match (full 3-char
  confirmation) and a weak match (head + at least 1 confirm char where
  the next before-character is `<`, the structural signal of another
  adjacent deletion). When both exist, the shorter displacement wins.

  Effect on the CAP-corpus span-fidelity audit (100 opinions, seed 42):

  - Total violations: **393 → 29**
  - HTML-bucket zero-width spans: **76/105 cites → 0/105 cites**
  - Resolves #550 (pen-w/3/0072-01 zero-width spans) as a downstream
    consequence.

## 0.21.4

### Patch Changes

- [#573](https://github.com/medelman17/eyecite-ts/pull/573) [`4a439b7`](https://github.com/medelman17/eyecite-ts/commit/4a439b7e5d3c3641be45591fcd78334fb2dcf065) Thanks [@medelman17](https://github.com/medelman17)! - Fix `annotate` engulfing prose around bare `<` characters (#544).

  `snapOutOfHtmlTags` treated ANY unpaired `<` as the open of an HTML tag, so when the source contained bare `<` characters from OCR or math notation (`A < B`, `rate is < 30%`, `<®=»`), citation start positions snapped backwards to the bare `<` and the `<cite>` wrap engulfed everything between the bare `<` and the citation. Catastrophic with the canonical `<cite>` template.

  `findContainingTag` now only treats a `<` as a tag open when it is IMMEDIATELY followed by `[a-zA-Z!/]` — the only characters that begin a well-formed HTML tag, comment, doctype, or close-tag. Bare `<` followed by whitespace, digits, punctuation, or end-of-text is left alone, so prose with mathematical / inequality syntax annotates cleanly.

- [#573](https://github.com/medelman17/eyecite-ts/pull/573) [`4a439b7`](https://github.com/medelman17/eyecite-ts/commit/4a439b7e5d3c3641be45591fcd78334fb2dcf065) Thanks [@medelman17](https://github.com/medelman17)! - Fix `annotate` corrupting wraps for parallel-reporter sequences when `useFullSpan: true` (#543).

  When `useFullSpan: true`, `annotate` sorted citations by `span.originalStart` (the core citation) but wrapped using `fullSpan.originalStart`/`fullSpan.originalEnd`. For parallel-reporter sequences whose `fullSpan`s all extend back to the same case name (e.g., `Roe v. Wade, 410 U.S. 113, 93 S.Ct. 705, 35 L.Ed.2d 147 (1973)`), the sort order disagreed with the wrap ranges. The reverse-iterate splice then dropped `<cite>` tags inside text that subsequent (outer) wraps were about to encompass, producing nested `<cite>` tags, mid-token truncations like `L. Ed. 2</cite>d`, and HTML-escaped sentinels like `&lt;cite&gt;`. The pathology hit roughly 21% of opinions in a CAP-corpus audit.

  `annotate` now resolves each citation's wrap range up-front (core span or `fullSpan`, depending on `useFullSpan`) and sorts/iterates against that range. It also performs explicit overlap detection: when two wraps intersect, the earlier-starting (outer/wider) wrap wins and the inner citation is surfaced via the `skipped` array — matching the promise in `AnnotationResult.skipped`'s docstring. Parallel-reporter clusters now produce a single outer `<cite>…</cite>` around the case name + reporters + parenthetical, with the inner two citations reported as skipped.

- [#573](https://github.com/medelman17/eyecite-ts/pull/573) [`4a439b7`](https://github.com/medelman17/eyecite-ts/commit/4a439b7e5d3c3641be45591fcd78334fb2dcf065) Thanks [@medelman17](https://github.com/medelman17)! - Fix `annotate` producing malformed sentinels for overlapping core spans (#545).

  When two citations' core `span.originalStart`/`originalEnd` ranges overlapped (e.g., a statute false-positive nested inside a case name's core span), `annotate` spliced both wraps and chopped one sentinel into the middle of the other's text, producing malformed output. Roughly 7% of opinions were affected.

  The overlap detection added in #543 now applies to core-span wraps too, and is confidence-aware: when two wraps intersect, the citation with the higher `confidence` score wins and the other is surfaced via the `skipped` array. Nested wraps (one fully inside another) always keep the outer wrap. The `AnnotationResult.skipped` docstring is updated to reflect the new behaviour.

- [#597](https://github.com/medelman17/eyecite-ts/pull/597) [`bc8c456`](https://github.com/medelman17/eyecite-ts/commit/bc8c456748dc97bbf39e4a97aa0feb702c8b255c) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): emit citations for bare-prefix `§§ N, N` lists (#563)

  `§§ X, Y, Z` lists without an explicit code identifier in front of the
  `§§` marker produced ZERO citations. The existing `expandPluralSectionList`
  post-pass only fires _after_ a head citation already exists in the result
  set, so naked sequences like `See §§ 12940, 12945` or `Code §§ 19.2-81 and
18.2-266` never seeded a head and the whole list dropped silently.

  Adds `detectBareSectionLists` running just before the expander. The pass
  scans the cleaned text for `[Code ]§§ N(, N)+` shapes that don't overlap
  an existing citation and seeds a head with `code` set to the prefix (or
  `"§"` when none is present) so the expander picks up the siblings. The
  section grammar in both the new detector and the expander now allows
  dotted section numbers (`19.2-81`, `12940.5`).

  Confidence on the seeded head is intentionally low (0.5) because no code
  identifier means no jurisdiction grounding — downstream inheritance passes
  remain authoritative for jurisdictional context.

- [#597](https://github.com/medelman17/eyecite-ts/pull/597) [`bc8c456`](https://github.com/medelman17/eyecite-ts/commit/bc8c456748dc97bbf39e4a97aa0feb702c8b255c) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): bare `§ N` after a full statute is a short-form reference (#567)

  Cross-reference forms like `42 U.S.C. § 1983; see also § 1985` previously
  produced only one citation — the bare `§ 1985` was dropped because no
  tokenizer pattern fires without a code identifier. Adds
  `detectBareSectionShortForms` that walks each full statute citation and
  scans up to 300 chars forward (capped at the next statute) for bare
  `§ N` shapes. Each match emits an inherited StatuteCitation carrying the
  antecedent's `title`, `code`, and `jurisdiction`.

  Guards:

  - Antecedent must have a code identifier; bare-section antecedents owned
    by the NM dispatcher (NMSA 1978) are skipped.
  - Three-hyphen state-section shapes (`32A-2-7`) remain owned by the NM
    pipeline.
  - The pass respects existing citation spans (no overlap re-emission).

- [#583](https://github.com/medelman17/eyecite-ts/pull/583) [`84b388f`](https://github.com/medelman17/eyecite-ts/commit/84b388fd04879f7ed45a56690607dfbe11f1c846) Thanks [@medelman17](https://github.com/medelman17)! - Insert a token-boundary space when stripping HTML tags between adjacent word characters (#542).

  `stripHtmlTags` previously deleted tags with no replacement, so HTML like `100 F.3d 200<footnote label="3">200 F.3d 300</footnote>` collapsed to `100 F.3d 200200 F.3d 300`. The tokenizer then read the fused digit run as a single malformed citation (`100 F.3d 200200`), and the second reporter cite was lost entirely.

  When a tag (or run of adjacent tags) sits between two word characters, the cleaner now inserts a single space in its place. Tags between non-word neighbors (spaces, punctuation, start/end of string) are still removed with no insertion, preserving existing behavior for the common case (`Smith v. <b>Doe</b>, 500 F.2d 123`).

  The position-mapping algorithm handles inserted spaces correctly via its existing insertion branch — no additional adjustments needed.

- [#596](https://github.com/medelman17/eyecite-ts/pull/596) [`e146e6b`](https://github.com/medelman17/eyecite-ts/commit/e146e6b2dc284e83d86fedb1753f93816c323e48) Thanks [@medelman17](https://github.com/medelman17)! - fix(constitutional): accept ordinal abbreviation and word-form amendments (#534)

  The constitutional patterns only matched Roman numerals or Arabic numbers after `art./amend.` (e.g., `U.S. Const. amend. XIV`). Real-world citations frequently use ordinal abbreviations (`U.S. Const., 5th Amend.`) and spelled-out word forms (`U.S. Const., Fifth Amendment`), neither of which tokenized.

  Three additions:

  - The numeral group now accepts `1st`..`27th` and `First`..`Twenty-Seventh` (in either hyphenated or space-separated form).
  - The amendment word accepts unabbreviated `Amendment` alongside `amend.` / `amdt.`.
  - A new `bare-amendment-word` pattern catches prefix forms without `Const.` (e.g., "the Fifth Amendment", "the Fourteenth Amendment") with confidence 0.5.

  The extractor parses all four numeral forms (Roman, Arabic, ordinal abbreviation, word ordinal) into the existing `amendment` / `article` integer fields.

- [#597](https://github.com/medelman17/eyecite-ts/pull/597) [`bc8c456`](https://github.com/medelman17/eyecite-ts/commit/bc8c456748dc97bbf39e4a97aa0feb702c8b255c) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): only the owning sibling carries `hasEtSeq` in `§§` lists (#566)

  `expandPluralSectionList` previously spread `{ ...cite }` from the head
  onto every sibling, so if `et seq.` modified ONE specific section in a
  plural list (`§§ 12940 et seq., 12945`), the flag rode along to every
  sibling in the fanout. Symmetrically, `§§ 1331, 1332 et seq.` left `1332`
  without the flag because the head was `1331` (no trailing `et seq.`).

  Fix: after positioning each sibling, peek ~20 chars past the section end
  and set `hasEtSeq` only when `et seq.` immediately follows. Siblings
  without a trailing `et seq.` token now drop the flag regardless of the
  head's value. Also clears `sectionRange` on siblings — the structured
  range applied only to the head.

- [#583](https://github.com/medelman17/eyecite-ts/pull/583) [`84b388f`](https://github.com/medelman17/eyecite-ts/commit/84b388fd04879f7ed45a56690607dfbe11f1c846) Thanks [@medelman17](https://github.com/medelman17)! - Cap final plain-text footnote zone at next post-footnote boundary (#539).

  `detectTextFootnotes` previously bounded the last footnote zone at `text.length`, so post-footnote body content (e.g., a "GOVERNMENT BRIEF" section that follows the numbered notes) was swallowed into the trailing footnote. Any citation appearing after the footnote section was misannotated `inFootnote: true`, and footnote-scoped resolution refused to link it to body antecedents.

  The detector now scans past the final marker for the earliest of: another separator line (5+ dashes/underscores), or a blank line followed by an ALL-CAPS heading line. The zone stops at that boundary. End-of-text remains the fallback when no such boundary exists.

- [#583](https://github.com/medelman17/eyecite-ts/pull/583) [`84b388f`](https://github.com/medelman17/eyecite-ts/commit/84b388fd04879f7ed45a56690607dfbe11f1c846) Thanks [@medelman17](https://github.com/medelman17)! - Anchor plain-text footnote markers at column 0 (#540).

  `MARKER_SRC` previously began with `^\s*`, so indented numbered sub-list items inside a footnote body (` 1.`, ` 2.`) were read as new footnote markers, splitting a single footnote into multiple spurious zones. Citations inside the same footnote were then misannotated as belonging to fabricated sibling footnotes, and the resolver's `"footnote"` scope refused to link them.

  The marker pattern now requires the digit/`FN`/`[N]`/`n.` prefix to start at column 0 (no leading whitespace). Indented sub-lists inside footnote bodies are correctly treated as continuation text.

- [#583](https://github.com/medelman17/eyecite-ts/pull/583) [`84b388f`](https://github.com/medelman17/eyecite-ts/commit/84b388fd04879f7ed45a56690607dfbe11f1c846) Thanks [@medelman17](https://github.com/medelman17)! - Reject short separator + numbered-list false positives in plain-text footnote detection (#541).

  A signature block like `/s/ Judge Smith\n\n-----\n\n1. The first issue...` was mis-classified as a footnote section because the existing 5+ dashes/underscores separator pattern matched the decorative rule and the numbered list looked like markers. Citations in the numbered analysis were then annotated `inFootnote: true` incorrectly.

  Tighten in two ways:

  - Short separators (5..7 chars) now require the separator to appear at least 25% into the document. Long separators (8+ chars) bypass this gate.
  - The digit-period marker pattern now requires the marker line to contain non-whitespace content after the period (`(\d+)\.\s+\S`), rejecting heading-style `1.\n\n`.

- [#597](https://github.com/medelman17/eyecite-ts/pull/597) [`bc8c456`](https://github.com/medelman17/eyecite-ts/commit/bc8c456748dc97bbf39e4a97aa0feb702c8b255c) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): Mass `c. NNN` chapter no longer leaks into `code` (#569)

  Massachusetts citations like `G.L. c. 93A` previously placed the chapter
  number (`93A`) into the `code` field and set `section=""`, conflating
  two distinct identifiers. Adds a dedicated `chapter` field to
  `StatuteCitation` and updates the mass-chapter extractor:

  - `code` carries the corpus identifier as it appeared in the source
    (`G.L.`, `Mass. Gen. Laws`, `M.G.L.A.`, `A.L.M.`, `General Laws`).
  - `chapter` carries the chapter (`93A`, `93`, `268A`, `90`).
  - `section` is the trailing section number when present, otherwise
    `undefined` (no more empty-string sentinels).

  `StatuteCitation.section` is now `string | undefined` to model
  chapter-only citations. The bluebook formatter now emits `<code> c.
<chapter>` for chapter-only forms and `<code> c. <chapter>, § <section>`
  for the full chapter+section shape. Pre-existing tests / fixture updated.

- [#597](https://github.com/medelman17/eyecite-ts/pull/597) [`bc8c456`](https://github.com/medelman17/eyecite-ts/commit/bc8c456748dc97bbf39e4a97aa0feb702c8b255c) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): named-code `code` carries the full identifier (#568)

  Named-code citations like `Cal. Civ. Code § 51` previously dropped both
  the jurisdiction prefix and the trailing `Code` / `Law` suffix, storing
  only the cleaned body — `Civ.` instead of `Cal. Civ. Code`, `Penal`
  instead of `N.Y. Penal Law`. Consumers couldn't reconstruct the original
  identifier from the parsed citation.

  `extractNamedCode` now stores the full identifier in `code`: the
  jurisdiction prefix as it appeared in the source, plus the body (Code
  name + suffix), e.g. `Cal. Civ. Code`, `Cal. Penal Code`, `California
Civil Code`, `N.Y. Penal Law`, `Tex. Penal Code`. Internal registry
  lookups continue to use the cleaned body as the lookup key.

  Three pre-existing tests (and one golden-corpus fixture) that asserted
  the truncated body shape have been updated to the full identifier.

- [#596](https://github.com/medelman17/eyecite-ts/pull/596) [`e146e6b`](https://github.com/medelman17/eyecite-ts/commit/e146e6b2dc284e83d86fedb1753f93816c323e48) Thanks [@medelman17](https://github.com/medelman17)! - fix(neutral): reject docket-shaped strings and implausible years (#532)

  Strings like `03A01-9103-CH-96` (a TN/IN docket number) were matching the hyphenated neutral pattern, producing a `type: "neutral"` citation with `year: 9103`. Two guards now prevent this:

  - The year segment must fall in 1700-2199 (was: any 4 digits).
  - A negative lookbehind rejects matches whose preceding text contains a `Case No.` / `Cause No.` / `Docket No.` prefix.

  Both apply to the 3-segment (NM/Ohio/NC) and 4-segment (MS) hyphenated patterns.

- [#596](https://github.com/medelman17/eyecite-ts/pull/596) [`e146e6b`](https://github.com/medelman17/eyecite-ts/commit/e146e6b2dc284e83d86fedb1753f93816c323e48) Thanks [@medelman17](https://github.com/medelman17)! - fix(statute): require NM signal in context for bare `§ N-N-N` cites (#531)

  The bare three-hyphen section shape (`§ 12-17-189`, `Section 32A-2-7(A)`) was defaulting to New Mexico (`code: "NMSA 1978", jurisdiction: "NM"`) because the pattern is common there — but the shape is too generic and the same form appears in Virginia, Alabama, and other states. We now require an explicit NM signal (`NMSA`, `N.M.`, `New Mexico`) within ~200 chars before the cite. Without it, the bare section is still emitted but with `jurisdiction` and `code` left undefined.

  Minor type change: `StatuteCitation.code` is now `string | undefined` to support these untagged bare cites.

- [#597](https://github.com/medelman17/eyecite-ts/pull/597) [`bc8c456`](https://github.com/medelman17/eyecite-ts/commit/bc8c456748dc97bbf39e4a97aa0feb702c8b255c) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): NM bare-section decimal subsection + jurisdiction guard (#565)

  Two paired bugs on the NM bare-section path:

  1. The `nm-bare-section` regex didn't accept `.` inside parens, so
     `§ 32A-2-7(A)(1.5)` silently dropped the `(1.5)` portion of the
     subsection chain. Pattern + extractor regex now allow decimals and
     bracket subscripts inside subsection parens.
  2. The default `NM` / `NMSA 1978` tag fired on every bare `§ N-N-N`
     shape, even with no nearby NM signal — the same misattribution
     pattern that drove #531 for the named-code path. Adds a jurisdiction
     guard: if the cleaned text within 200 chars before the citation
     doesn't contain `NMSA`, `N.M.`, or `New Mexico`, both `jurisdiction`
     and `code` are dropped so consumers don't trust a guess.

  `StatuteCitation.code` is now `string | undefined` to model the
  guard-dropped case. The bluebook formatter renders `§ <section>` without
  a code prefix when code is missing. Three pre-existing tests that asserted
  the implicit NM default have been rewritten to either supply NM context
  or assert the new dropped-jurisdiction contract.

- [#596](https://github.com/medelman17/eyecite-ts/pull/596) [`e146e6b`](https://github.com/medelman17/eyecite-ts/commit/e146e6b2dc284e83d86fedb1753f93816c323e48) Thanks [@medelman17](https://github.com/medelman17)! - fix(publicLaw): accept spelled-out `Public Law` and `Public Law No.` (#533)

  The public-law pattern only matched the abbreviated `Pub. L.` / `Pub. L. No.` forms, so spelled-out variants like `Public Law 116-127` and `Public Law No. 116-127` (common in House/Senate reports and in opinions that introduce the citation without prior abbreviation) were never tokenized. Both forms now extract correctly with `congress` and `lawNumber` populated.

- [#597](https://github.com/medelman17/eyecite-ts/pull/597) [`bc8c456`](https://github.com/medelman17/eyecite-ts/commit/bc8c456748dc97bbf39e4a97aa0feb702c8b255c) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): `§§ N-M` federal ranges populate `sectionRange` (#564)

  `28 U.S.C. §§ 591-99 (2000)` previously produced one citation with
  `section="591-99"`, ambiguous with hyphenated state-style sections
  (`19.2-81`, `32A-2-7`). Adds a structured `sectionRange: { start, end }`
  field on `StatuteCitation` and populates it for federal `§§` ranges. The
  `section` field now holds the range start (e.g. `"591"`) so consumers that
  only read `section` keep working on the common case.

  Detection guard: hyphenated state-style sections (anything with a dot, a
  letter, or more than one hyphen) are NOT treated as ranges and continue
  to surface in `section` unchanged.

- [#597](https://github.com/medelman17/eyecite-ts/pull/597) [`bc8c456`](https://github.com/medelman17/eyecite-ts/commit/bc8c456748dc97bbf39e4a97aa0feb702c8b255c) Thanks [@medelman17](https://github.com/medelman17)! - fix(resolve): prefer same-case full-caption supra matches

  `Plaintiff v. Defendant, supra` resolution now first looks for a single
  antecedent whose plaintiff and defendant both match the caption. This prevents
  an unrelated case with a stronger one-sided fuzzy match from beating the
  intended antecedent.

- [#596](https://github.com/medelman17/eyecite-ts/pull/596) [`e146e6b`](https://github.com/medelman17/eyecite-ts/commit/e146e6b2dc284e83d86fedb1753f93816c323e48) Thanks [@medelman17](https://github.com/medelman17)! - fix(statute): surface `Va. Code` / `Ala. Code` instead of bare `"Code"` in the `code` field (#530)

  Named-code extraction for Virginia and Alabama produced `code: "Code"` because the registry only stores the bare suffix (`"Code"`, `"Code Ann."`) and `cleanCodeName()` strips the trailing word. The extractor now re-attaches the jurisdictional prefix so consumers see `"Va. Code"`, `"Va. Code Ann."`, `"Ala. Code"`, or `"Ala. Code Ann."`. The Virginia bare-Code extractor (`Code §`, `Virginia Code §`) is normalized to `"Va. Code"` for the same reason.

## 0.21.3

### Patch Changes

- [#537](https://github.com/medelman17/eyecite-ts/pull/537) [`e5eb8b7`](https://github.com/medelman17/eyecite-ts/commit/e5eb8b7af162374139837e170c23d0796ffe1069) Thanks [@medelman17](https://github.com/medelman17)! - Fix `analyzeDocument` prose-span coordinate confusion (#535, #536).

  `computeProseOffsets` derived prose-span boundaries via `getCitationStart` / `getCitationEnd`, which return CLEAN-text coordinates, then wrote those same numbers into the output `Span`'s `originalStart` / `originalEnd`. For any text where cleaning shifts positions (HTML, smart quotes, collapsed whitespace, Unicode normalization — i.e., most real opinions), slicing the original text with the wrong coordinates produced invalid prose text. Roughly 25% of opinions were affected, with cumulative drift up to 40+ characters.

  `computeProseOffsets` now tracks both clean and original cursors independently, reading each citation's `span.clean*` and `span.original*` (or `fullSpan` when present) directly. Two new helpers `getCitationOriginalStart` / `getCitationOriginalEnd` mirror the existing clean-coord helpers.

  `analyzeDocument`'s `transformationMap` option is no longer needed for correctness — citations already carry both coordinate systems — but the option remains in the signature for API compatibility (its value is unused; previously declared as `_transformationMap`, which was itself the cause of #536).

  Surfaced by a CAP-corpus `analyzeDocument` quality audit.

## 0.21.2

### Patch Changes

- [#518](https://github.com/medelman17/eyecite-ts/pull/518) [`908e2b5`](https://github.com/medelman17/eyecite-ts/commit/908e2b57a5457a1c5b5a53f630c7dcb8604cda46) Thanks [@medelman17](https://github.com/medelman17)! - fix(resolve): supra resolution handles `Plaintiff v. Defendant` captions (#504)

  `extractSupra` captures the full caption (`"Fitzgerald v. Cleveland"` for
  `Fitzgerald v. Cleveland, supra`), but the BK-tree is indexed under the
  _individual_ normalized plaintiff/defendant names. Querying the combined
  caption against per-name keys produced Levenshtein distances above the
  threshold-derived `maxDistance`, so resolution silently failed for every
  `"X v. Y, supra"` form — ~59% of supra citations in the CAP corpus.

  `resolveSupra` now splits on `v.` / `vs.` and queries each half
  independently in addition to the combined caption, picking the highest-
  similarity in-scope match. Single-name supras (`Smith, supra`) and
  non-caption forms (`Walker & Horwich, supra`) are unaffected.

- [#519](https://github.com/medelman17/eyecite-ts/pull/519) [`466e272`](https://github.com/medelman17/eyecite-ts/commit/466e272bdfb03492cef01435cfbf366ad0ac8a1b) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): pincite terminator class now accepts `:`, `[`, `»`, and curly/straight quotes (#505)

  `LOOKAHEAD_PINCITE_REGEX` and `ADDITIONAL_PINCITE_REGEX` previously required
  the page-number capture to end at sentence punctuation, closing bracket, or
  whitespace+non-capital. Real-world citations also delimit the pincite with
  `:` (block-quote intro), `[` (bracketed parallel cite), `»` (OCR artifact),
  and the four common curly/straight quote characters. Adding these
  characters to the terminator class recovers pincites that were silently
  dropped at ~6–10 per 1,000 citations.

  Now extracts pincite from:

  - `376 N.E.2d 578, 579: "Judgments..."` → 579
  - `135 Md.App. 563, 570[, 763 A.2d 252] (2000)` → 570
  - `9 Humph. 187, 193: Love v. Smith` → 193
  - `38 F. C. C. 683, 713» Id., 713-730` → 713
  - `376 N.E.2d 578, 579"…"` and curly-quote variants → 579

- [#519](https://github.com/medelman17/eyecite-ts/pull/519) [`466e272`](https://github.com/medelman17/eyecite-ts/commit/466e272bdfb03492cef01435cfbf366ad0ac8a1b) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): neutral cites no longer consume next parallel's volume as pincite (#507)

  In Ohio Bluebook chains like `100 Ohio St.3d 152, 2003-Ohio-5372, 797 N.E.2d
71, at ¶ 33`, the neutral cite (`2003-Ohio-5372`) was greedily extracting
  `pincite=797` — the volume of the next parallel — because
  `NEUTRAL_PINCITE_LOOKAHEAD` had no terminator boundary. It now applies the
  same parallel-cite disambiguation guard used by `LOOKAHEAD_PINCITE_REGEX`:
  the pincite digit sequence must end at end-of-string, sentence punctuation,
  closing bracket, or whitespace NOT followed by a capital letter (a parallel
  reporter token).

  Remaining work (tracked separately, out of scope here): paragraph-pincite
  inheritance from the trailing parallel onto earlier parallel members. The
  third parallel correctly captures `¶ 33`; propagating that pincite to the
  first `100 Ohio St.3d 152` parallel requires extending `detectParallel` to
  include neutral cites in the group, plus a post-pass that fills in a
  shared pincite onto earlier members.

- [#518](https://github.com/medelman17/eyecite-ts/pull/518) [`908e2b5`](https://github.com/medelman17/eyecite-ts/commit/908e2b57a5457a1c5b5a53f630c7dcb8604cda46) Thanks [@medelman17](https://github.com/medelman17)! - fix(resolve): Id. `antecedentIndex` agrees with `resolvedTo` on success path (#508)

  After #498 made `resolveId` a single-source-of-truth resolver, the two
  pointers were still computed separately: `resolvedTo` from the family/
  scope-aware primary chase, `antecedentIndex` from a position-only
  `findImmediatePredecessor` walk. The two diverged in ~8% of `Id.`
  citations — typically when an intervening statute sat between a
  case-style `Id.` and its full case antecedent.

  `resolveId` now sets `antecedentIndex` to the primary-chase result on
  the success path so consumers see one source of truth.
  `findImmediatePredecessor` still drives the pass-2 fallback for chained
  unresolved short-forms. Supra and short-form-case resolution paths are
  unchanged.

  Note: chained `Id. Id.` sequences (`Smith. Id. Id.`) now report
  `antecedentIndex = 0` (Smith) on the second `Id.` rather than `1`
  (first `Id.`), reflecting the post-#498 invariant that `Id.` anchors
  to a specific resolved authority.

- [#519](https://github.com/medelman17/eyecite-ts/pull/519) [`466e272`](https://github.com/medelman17/eyecite-ts/commit/466e272bdfb03492cef01435cfbf366ad0ac8a1b) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): full-case extractor accepts `at page N` / `at pages N-M` (#510)

  `LOOKAHEAD_PINCITE_REGEX` only allowed the abbreviated `p.` / `pp.` prefix
  for spelled-out page references, while the short-form extractor already
  accepts `page` / `pages` (#344). The full-case path now matches, so
  citations like `90 A.2d 653, at page 655` and `90 A.2d 660, at page 664
(Del. Sup. Ct. 1952)` extract the pincite correctly. `PINCITE_SKIP_REGEX`
  is updated in lockstep so later metadata parens still parse after a
  spelled-out pincite.

- [#519](https://github.com/medelman17/eyecite-ts/pull/519) [`466e272`](https://github.com/medelman17/eyecite-ts/commit/466e272bdfb03492cef01435cfbf366ad0ac8a1b) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): full-case `at *10-*11` star-pincite range now extracted (#513)

  `LOOKAHEAD_PINCITE_REGEX` page body `\*?\d+(?:-\d+)?` only allowed the
  star-pagination marker on the START of a range. The short-form extractor
  already allows `\*?\d+[-–—]\*?\d+` (#201), so star ranges with stars on
  both ends now extract from full-case citations as well. Test case:
  `2012 PA Super 169 at *10-*11 (Pa.Super.Ct. 2012)`.

- [#518](https://github.com/medelman17/eyecite-ts/pull/518) [`908e2b5`](https://github.com/medelman17/eyecite-ts/commit/908e2b57a5457a1c5b5a53f630c7dcb8604cda46) Thanks [@medelman17](https://github.com/medelman17)! - fix(resolve): Id. family preference falls back to any in-scope authority (#514)

  `getIdPreferredFamily` defaults to `"case"` for any `Id.` not followed by
  `§` — including `Id.`, `Id. at N`, and `Id. ¶ N`. In documents whose only
  prior authority is a statute (~8% of `Id.` citations per the audit), the
  scorer's `+1000` family-match boost left the candidate set's first entry
  as the winner only by accident (no preferred-family member to override
  it). A future scorer refactor could easily regress this.

  `resolveId` now selects the antecedent via an explicit two-step rule:
  prefer the most recent candidate of the preferred family, otherwise the
  most recent candidate of any family. The behavior matches the previous
  implementation but the intent is now obvious in the code, and regression
  tests pin the statute-only context for both `Id.`, `Id. at N`, and the
  `Id. ¶ N` "complaint paragraph N" idiom the audit flagged.

- [#519](https://github.com/medelman17/eyecite-ts/pull/519) [`466e272`](https://github.com/medelman17/eyecite-ts/commit/466e272bdfb03492cef01435cfbf366ad0ac8a1b) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): footnote-only pincite (`, n. 7`) no longer silently dropped (#515)

  `PINCITE_REGEX` / `LOOKAHEAD_PINCITE_REGEX` previously made page digits
  mandatory, so a footnote-only reference (`16 Mass. 299, n. 7.`) — used when
  the cited material is on the citation's start page and the author only
  references the footnote — dropped the pincite entirely. `parsePincite` now
  recognizes a footnote-only branch (`nn?\.\s*\d+(?:[-–—~]\d+)?` plus `note`,
  `fn`, `fns` variants), and `LOOKAHEAD_PINCITE_REGEX` adds a matching
  alternation that captures the bare footnote suffix. The structured result
  surfaces with `footnote=N` / `footnoteEnd=M` and `page=undefined`.

  Now extracts:

  - `16 Mass. 299, n. 7.` → `footnote: 7`
  - `2 Hoffman's Ch. Pr. 95, n. 3` → `footnote: 3`
  - `16 Mass. 299, note 7.` → `footnote: 7`

- [#519](https://github.com/medelman17/eyecite-ts/pull/519) [`466e272`](https://github.com/medelman17/eyecite-ts/commit/466e272bdfb03492cef01435cfbf366ad0ac8a1b) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): tilde (`~`) accepted as pincite range separator (#516)

  `LOOKAHEAD_PINCITE_REGEX`, `ADDITIONAL_PINCITE_REGEX`, `PINCITE_SKIP_REGEX`,
  and the `parsePincite` regexes (page body, footnote suffix, paragraph
  range) now accept `~` alongside hyphen / en-dash / em-dash as a range
  separator. Tilde shows up as an OCR artifact in scanned reporters and in
  some PDF dehyphenators, and dropping it silently lost the range end page.

  Example: `2012 PA Super 169 at *10~*11` now extracts a star-page range
  with `pincite=10`, `endPage=11`.

- [#520](https://github.com/medelman17/eyecite-ts/pull/520) [`8df11fa`](https://github.com/medelman17/eyecite-ts/commit/8df11fa94fab578d3ba9f64210d67df2743d25b0) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): strip old-style date prefix from caseName + harvest year (#511)

  The pre-Bluebook citation form `Name, YEAR, vol Reporter page` and the
  more elaborate `Name, COURT, MONTH DAY, YEAR, vol Reporter page` left the
  date/court tokens inside the captured `caseName` (e.g., `MacPherson v.
Buick Motor Co., 1916`).

  Add two post-extract caseName trims (alongside the existing trailing
  parenthetical / parallel-cite / neutral-cite trims):

  - `,\s+(?:Cir|App|Ct|Dist).,\s+<Month> DD, YYYY` for the federal "circuit
    - filing date" prefix.
  - `,\s+(?:17|18|19|20)\d{2}` for the bare-year prefix.

  When a year is trimmed, surface it on the citation's `year` field so the
  historical date isn't lost.

- [#520](https://github.com/medelman17/eyecite-ts/pull/520) [`8df11fa`](https://github.com/medelman17/eyecite-ts/commit/8df11fa94fab578d3ba9f64210d67df2743d25b0) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): recover caseName when citation core sits inside `(...)` (#509)

  Two issues blocked caseName extraction for sentence-internal parenthetical
  citations like `(Smith v. Jones, 100 F.2d 1)`:

  1. The case-pattern tokenizers (`federal-reporter`, `supreme-court`,
     `state-reporter`) omitted `)` from their trailing terminator alternation,
     so `100 F.2d 1)` failed to tokenize as a case at all. Adds `\)` alongside
     the existing `\s|$|\(|,|;|\.|\[|\]` terminators.
  2. When the caption sits OUTSIDE the parenthetical (`Name, (vol Reporter
page)`), `extractCaseName`'s precedingText ends with `, (`, which
     `V_CASE_NAME_REGEX` can't match because the regex anchors on a trailing
     comma or year-paren. Strip a trailing `(\s*$` so the comma is reachable.

  The fix is the complement of #512 (which requires the opposite — STOP at
  the open paren when the caption is INSIDE the wrapper).

- [#520](https://github.com/medelman17/eyecite-ts/pull/520) [`8df11fa`](https://github.com/medelman17/eyecite-ts/commit/8df11fa94fab578d3ba9f64210d67df2743d25b0) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): stop case-name scan at wrapping `(` (#512)

  When a citation appears as a sentence-internal parenthetical
  `(Name v. Name, vol Reporter page)`, the backward case-name scan
  absorbed any preceding capitalized prose into the captured caseName
  (yielding caseNames 100–366 chars long). The V_CASE_NAME_REGEX
  character class allows `(` inside party names, so adjacent all-cap
  prose was treated as plaintiff context.

  Add a right-to-left scan for the wrapping paren that has a `v.`-style
  caption (or procedural prefix) immediately inside. Truncate
  precedingText to start just after that `(` so the regex sees only the
  caption. The complement of #509 (paren-before-core, which strips a
  TRAILING `(\s*$`).

  Guarded against #241 admin-parens (`Spence v. Hintze (In re Hintze)`):
  when a complete `Name v. Name` caption exists BEFORE the candidate
  `(`, the `(` is an inline explanatory clause, not a wrapping boundary.

- [#520](https://github.com/medelman17/eyecite-ts/pull/520) [`8df11fa`](https://github.com/medelman17/eyecite-ts/commit/8df11fa94fab578d3ba9f64210d67df2743d25b0) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): reject literal `Id.` / `Ibid.` as caseName (#517)

  The older parallel-reporter form `Id., NN <reporter> NN` (e.g.,
  `physical injury. Id., 584 N.Y.S.2d 744`) isn't matched by ID_PATTERN
  (which requires `Id. at <pincite>`), so the tokenizer falls through to
  the case extractor and the backward case-name scan picks up the bare
  `Id.` (or `Id`) as a single-party caption — yielding case citations
  with `caseName="Id."`.

  Refuse short-form citation markers (`Id`, `Id.`, `Ibid`, `Ibid.`,
  `supra`) as captured captions in the single-party fallback. The case
  citation still surfaces (so the resolver can attach it to the Id.
  antecedent's parallel reporter); it just doesn't carry a phantom
  `caseName`.

- [#520](https://github.com/medelman17/eyecite-ts/pull/520) [`8df11fa`](https://github.com/medelman17/eyecite-ts/commit/8df11fa94fab578d3ba9f64210d67df2743d25b0) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): strip comma-separated signal variants from caseName (#506)

  `SIGNAL_STRIP_REGEX` now accepts older typesetting variants — `See, also,`
  (extra inter-word comma), `See, generally,`, `See e.g.,` (spaced/comma-less
  `e.g.`), and the canonical Bluebook forms with relaxed punctuation. A small
  set of post-signal prose connectors (`the case of`, `the opinion in`) is
  also stripped so captions like `See also the case of King v. Carter` no
  longer carry the connector into `caseName`. Mirrors the signal-detection
  relaxation from PR #503.

## 0.21.1

### Patch Changes

- [#502](https://github.com/medelman17/eyecite-ts/pull/502) [`32f220c`](https://github.com/medelman17/eyecite-ts/commit/32f220cfa2a73738da7f28d544e68645edf8796b) Thanks [@medelman17](https://github.com/medelman17)! - Fix `Id,` (typo comma, no period) crash on opinions with unusual pincite prefixes.

  `extractCitations` would throw `Error: Failed to parse Id. citation: Id,` when an opinion contained text like `Id, at pages 2-4` (or `Id, at section 3`, etc.) — kinds where the tokenizer matched `Id,` as the start of an Id. citation via its `(?=\s+at\s)` lookahead, but then the optional pincite branch refused to extend the match because `pages` / `section` / etc. is not a recognized pincite prefix. The matched `text` field was just `Id,` (3 characters). `extractId` then re-applied the same lookahead-bearing regex against only those 3 characters — where the lookahead has nothing to look at — and threw.

  The lookahead in `extractId` was redundant defensive code: the tokenizer (`ID_PATTERN`) has already enforced it. Removing it lets `extractId` parse `Id,` as a valid (typo-comma) Id citation with no pincite, matching the rest of the function's tolerance for partial parses.

  Surfaced by a CAP-corpus signal-extraction audit on `f-supp-2d/876/json/0128-01.json` (`"to understand the procedure (Id, at pages 2-4)"`). No behavior change for citations that parse fully — `Id, at 1483`, `Id., at 253`, `Id. at p. 125`, and `Id. ¶ 12` all still produce identical output.

- [#501](https://github.com/medelman17/eyecite-ts/pull/501) [`77e2c92`](https://github.com/medelman17/eyecite-ts/commit/77e2c92bf0d5a4e4b33c25e5c7c61be2c3e318e1) Thanks [@medelman17](https://github.com/medelman17)! - Recognize `e. g.` (with internal whitespace) as the `e.g.` signal.

  The Bluebook abbreviation `e.g.` appears in two typesetting variants: the closed form `e.g.` and the older spaced form `e. g.` (with whitespace between the letters), common in older opinions and some publishers' styles. The closed form already worked; the spaced form was silently missed, dropping the signal entirely.

  Both the prefix matchers (`SIGNAL_PATTERNS` in `detectStringCites.ts`) and the leading-signal scanner (`detectLeadingSignals`) now accept optional whitespace between `e.` and `g.`. Affects all six combined forms: `e.g.`, `see, e.g.`, `see also, e.g.`, `but see, e.g.`, `cf., e.g.`, `but cf., e.g.`.

  Surfaced by a CAP-corpus signal-extraction audit: e.g. `See, e. g., New State Ice Co. v. Liebmann, 285 U.S. 262 (1932)` was extracting the case but losing the signal.

- [#503](https://github.com/medelman17/eyecite-ts/pull/503) [`78d2783`](https://github.com/medelman17/eyecite-ts/commit/78d278354f0259c3aa0de8977335f4936e18254a) Thanks [@medelman17](https://github.com/medelman17)! - Recognize `See, also,` (extra inter-word comma) as the `see also` signal.

  Older typesetting variants in legal opinions sometimes insert an extra comma between `See` and `also`, producing forms like `See, also, The Plymouth, 70 U.S. (3 Wall.) 20`. The canonical `See also` worked; the comma-bearing variant was missed entirely (signal=undefined).

  Both the prefix matcher (`SIGNAL_PATTERNS` in `detectStringCites.ts`) and the leading-signal scanner (`detectLeadingSignals`) now accept optional `\s*,?\s+` between `see` and `also`. Affects both `see also` and the combined `see also, e.g.` form.

  Surfaced by a CAP-corpus signal-extraction audit on a 19th-century admiralty case. The canonical `See also` continues to extract identically.

- [#499](https://github.com/medelman17/eyecite-ts/pull/499) [`2f845cc`](https://github.com/medelman17/eyecite-ts/commit/2f845cc8ca175a788a3242e4b1915f2a2c8b10b6) Thanks [@medelman17](https://github.com/medelman17)! - Fix `Id.` resolves-to skipping weakly-signaled antecedent (#498).

  `resolveId` previously down-ranked candidates carrying `See`, `Cf.`, `See also`, `Compare`, `But cf.`, or `See generally` signals (`+100 if !weak` in the scorer), which let a more-distant strong-signal full cite beat a more-recent weak-signal one. The bug surfaced when the same input was extracted with vs. without a `See` prefix on the most-recent full cite — the single-character delta flipped `Id.`'s resolved cluster from the immediately-preceding case to the prior unsignaled one.

  Per Bluebook Rule 4.1 (and matching the Python eyecite reference implementation, which is signal-blind), `Id.` anchors to the immediately preceding cited authority regardless of signal phrase. The signal qualifies _how_ the source supports the proposition, not whether the citation can be the referent of a following `Id.`

  The fix removes the weak-signal scoring component from `resolveId`. Family preference (case vs. statute based on `Id.`'s pincite shape), quote-zone filtering, parenthetical-child filtering, and case-name window checks are unchanged. `resolution.resolvedTo` and `resolution.antecedentIndex` now agree in every signal case.

  **Behavior change for #480 weak-signal scenarios:** in `STRONG. See WEAK. Id.` patterns, `Id.` now resolves to the `See`-signaled cite (the immediately preceding citation), not the strong cite. This aligns with Python eyecite and the strict Rule 4.1 reading. Six tests in `tests/resolve/issue480_idAntecedent.test.ts` were updated to encode the new (correct) expectation.

## 0.21.0

### Minor Changes

- [#495](https://github.com/medelman17/eyecite-ts/pull/495) [`982f0bd`](https://github.com/medelman17/eyecite-ts/commit/982f0bd294baccec4dec5a99de1d7194efd68d1c) Thanks [@medelman17](https://github.com/medelman17)! - feat: `analyzeDocument` API — prose offsets, quote attribution, citation graph

  Adds a sibling function to `extractCitations` that projects the extraction output into a richer `Document` view for document-understanding consumers.

  ```ts
  import { extractCitations, analyzeDocument } from "eyecite-ts";

  const cites = extractCitations(text, { resolve: true });
  const doc = analyzeDocument(text, cites);
  // doc.proseSpans          — Span[] for prose between citations
  // doc.precedingProse      — Map<citationIndex, Span>
  // doc.followingProse      — Map<citationIndex, Span>
  // doc.quoteAttributions   — quoted-text zones paired with citations
  // doc.citationGraph       — { nodes, edges: Edge[] } with 7 typed edge kinds
  // doc.footnoteZones?      — present when extractCitations was called
  //                            with detectFootnotes: true
  ```

  **Three new capabilities:**

  - **Prose offsets** — geometric inverse complement of citations. Top-level array + per-citation views. Uses `fullSpan` (when available) to bound citations so case names aren't mislabeled as prose.

  - **Quote attribution** — every quoted-text zone (paired `"..."` / `"..."` / markdown `>`) gets attribution attempted. Three kinds: `block-quote` (Bluebook Rule 5 canonical form), `adjacent` (inline quote in same sentence as a citation), `parenthetical` (quote inside an explanatory parenthetical). Confidence stratified per kind (0.85–0.98). Unattributed zones still surface with `citationIndex` undefined.

  - **Citation graph** — every relationship eyecite-ts already computes (`resolvedTo`, `antecedentIndex`, `groupId` parallels, `subsequentHistoryOf`, `pinciteInheritedFrom`, `stringCitationGroupId`, parenthetical nesting) projected into a unified typed-edge graph. Seven edge kinds: `resolves-to | antecedent | parallel | history-of | pincite-inherit | string-cite | in-parenthetical-of`.

  **New type — `AnalyzedFootnoteZone`** — the document-level footnote zone (with `citationIndices`). The simpler `FootnoteZone` from the footnotes module remains unchanged. Use `AnalyzedFootnoteZone` when you need the analysis enrichment; the existing `FootnoteZone` when you only need positional info.

  **No breaking changes.** `extractCitations` continues to return `Citation[]` unchanged. The new API is additive.

  **Three pure refactors land in this PR** to support the new module:

  - `detectQuoteZones` moves from `DocumentResolver.ts` to `src/utils/detectQuoteZones.ts`.
  - `getCitationStart` / `getCitationEnd` move from `detectStringCites.ts` to `src/utils/citationBounds.ts`.
  - `computeParenDepths` moves from `DocumentResolver` (private method) to `src/utils/parenDepths.ts`.

  Same algorithms; now reusable.

  See `docs/superpowers/specs/2026-05-19-document-understanding-api-design.md` for the full design and `docs/research/2026-05-19-document-understanding-api.md` for the legal-tech / NLP / academic-bibliometrics reference validation.

## 0.20.1

### Patch Changes

- [#493](https://github.com/medelman17/eyecite-ts/pull/493) [`e72881d`](https://github.com/medelman17/eyecite-ts/commit/e72881dcd651e21f36ff77b07f60b2730a353a94) Thanks [@medelman17](https://github.com/medelman17)! - fix(extract): detect parallel citations across pincite-between gaps (Bluebook canonical)

  `detectParallel` now accepts the **Bluebook-canonical pincite-between form** per Indigo Book R12.3, where the primary's pincite sits between the two parallel cites:

  ```
  374 N.J. Super. 448, 453–55, 864 A.2d 1191 (App. Div. 2005)
  ```

  Previously, `MAX_PROXIMITY = 5` chars after the comma rejected this form, so eyecite-ts only detected the less-common no-pincite variant (`186 N.J. 78, 891 A.2d 1202`). The fix delegates to the existing `parsePincite` helper as single source of truth for "what counts as a pincite," automatically covering all forms (page, range, star, paragraph, footnote, etc.).

  **Behavior changes:**

  - Parallel citations across pincite-between gaps are now grouped via `groupId` and `parallelCitations[]`. Consumers calling `groupByCase()` will see fewer logical case groups for inputs containing this form (parallel pairs now collapse from two groups into one — correct behavior).
  - `detectStringCites` now skips parallel-secondary cites when building string-citation groups. This fixes a related defect where a parallel secondary could be mis-grouped via `stringCitationGroupId` with an unrelated primary across a `;` separator (e.g., the secondary of an affirmance's parallel cite ending up in the same group as a `see also` cite for a different case).

  **No API changes.** Existing `groupId`, `parallelCitations[]`, `stringCitationGroupId`, and `groupByCase()` work as before; they just get populated correctly for more inputs.

  See `docs/superpowers/specs/2026-05-19-parallel-cites-pincite-between-design.md` for the full design and `docs/research/2026-05-19-parallel-citation-detection.md` for the Bluebook + Python eyecite + industry reference validation.

## 0.20.0

### Minor Changes

- [#491](https://github.com/medelman17/eyecite-ts/pull/491) [`2290e05`](https://github.com/medelman17/eyecite-ts/commit/2290e05f4bba30af7df6e5b242417743d42b27cd) Thanks [@medelman17](https://github.com/medelman17)! - fix(resolve): Id. clusters with immediately preceding citation per Bluebook Rule 4.1, even when predecessor is an unresolved short-form

  Three coordinated fixes resolve a class of bugs where `Id.` referred to the wrong authority when the immediately preceding short-form had no extractable full-citation antecedent (typically because the author introduced the case name in prose rather than as a structured citation).

  **Behavior changes:**

  - **`Id.` now clusters with the immediately preceding citation regardless of resolution state** (Bluebook Rule 4.1 / Indigo Book R6.2.2). Previously, `Id.` would chase past an unresolved short-form to the previous full citation — wrong authority. The bug surfaced in passages like `Leach v. Anderl, 218 N.J. Super. 18 (1987). In Yellen v. Kassin, ... Yellen, 416 N.J. Super. at 590-91, 3 A.3d at 590-91. ... Id. at 590.` where `Id. at 590` now correctly clusters with the Yellen short-form (whose case name was inferred from the prose mention) rather than resolving to Leach.
  - **Short-form citations now carry `inferredCaseName`** when their case name was found in preceding prose (within ~400 chars) and their vol+reporter has no full-citation match in the array. The short-form remains formally unresolved (`resolvedTo` undefined), but consumers can render the case name via `caseName ?? inferredCaseName ?? partyName`.
  - **Quote-zone detection is more robust** for mid-document text inputs. The previous greedy ASCII-quote pairing mistook orphan close-quotes (from snippets starting mid-sentence) for opens, creating phantom zones that broke `Id.` resolution. The new context-based classifier handles both typographic (`"` `"`) and ASCII (`"`) quotes correctly.

  **New optional fields:**

  - `ResolutionResult.antecedentIndex?: number` — chain pointer to the immediately preceding cited authority, regardless of resolution state. Same shape as the existing `ShortFormCaseCitation.pinciteInheritedFrom` from 0.19.0. Walk transitively for the chain's originator.
  - `ShortFormCaseCitation.inferredCaseName?: string` — case name recovered from preceding prose when vol+reporter lookup fails.
  - `ShortFormCaseCitation.inferredPlaintiff?: string`, `inferredDefendant?: string`, `inferredCaseNameSpan?: Span` — supporting fields for the inferred name.

  **Migration:**

  - No breaking changes. All new fields are optional; `resolvedTo` semantics unchanged.
  - Consumers wanting to follow the new chain pointer use `let cur = id.resolution.antecedentIndex; while (cur !== undefined) { /* inspect cites[cur]; advance cur = cites[cur].resolution?.antecedentIndex */ }`.
  - Consumers rendering case names should fall back: `caseName ?? inferredCaseName ?? partyName`.
  - The `Id.` resolution outcome for the unresolved-short-form-predecessor scenario changes from "resolves to previous full cite" (incorrect) to "antecedentIndex set, resolvedTo undefined" (Bluebook-correct). If any test was relying on the previous behavior, update it to use `antecedentIndex` for the chain walk.

  See `docs/superpowers/specs/2026-05-19-id-resolves-past-unresolved-shortform-design.md` for the full design and `docs/research/2026-05-19-id-unresolved-antecedent.md` for the Bluebook + Python eyecite + CSL/citeproc reference validation.

## 0.19.0

### Minor Changes

- [#489](https://github.com/medelman17/eyecite-ts/pull/489) [`5104dde`](https://github.com/medelman17/eyecite-ts/commit/5104ddec27bb2c77c740b66559b49856d71564d1) Thanks [@medelman17](https://github.com/medelman17)! - fix(resolve): inherit pincite from immediate same-authority predecessor (Bluebook Rule 4.1)

  `Id.`, `supra`, and short-form-case citations now inherit their pincite from the **immediately preceding same-authority citation** — including from intermediate `Id. at X` or `supra, at X` predecessors — rather than only from the terminal full citation. This matches Bluebook Rule 4.1 / Indigo Book R6.2.2 and fixes a real bug.

  **Behavior changes:**

  - `Smith → Id. at 115 → bare Id.` now produces `pincite = 115` on the bare `Id.` (previously `55`, chasing past the intermediate to Smith's pincite).
  - `Smith → Other → Smith, supra, at 50 → bare Id.` now produces `pincite = 50` (previously `undefined`).
  - `Smith, at 100 → Id. at 115 → Id. → Id.` — all three trailing citations now correctly inherit `115`.
  - `Supra` and `ShortFormCaseCitation` gain pincite inheritance for the first time. Previously only `Id.` inherited.

  **New optional fields on `IdCitation`, `SupraCitation`, `ShortFormCaseCitation`:**

  - `pinciteInherited?: boolean` — true when `pincite` was inherited per Rule 4.1.
  - `pinciteInheritedFrom?: number` — array index (in `extractCitations(...).citations`) of the immediate predecessor that supplied the pincite. Follow transitively for the chain's originator.

  **Migration:** No code changes required for consumers reading `pincite`. The inherited value is semantically equivalent to one extracted directly (Rule 4.1 makes them identical). Consumers wanting to distinguish "explicit in text" from "inherited per rule" should branch on `pinciteInherited`.

  **Non-goals (future work):** statute-chain inheritance (blocked by the type system today — short-form pincite is `number` only); `MAX_OPINION_PAGE_COUNT`-style range validation on inherited pincites; expanding case-name inheritance to `Supra` and `ShortFormCaseCitation`.

  See `docs/superpowers/specs/2026-05-19-pincite-inheritance-design.md` for the full design and `docs/research/2026-05-19-pincite-inheritance.md` for the Bluebook + Indigo Book + Python eyecite reference validation.

## 0.18.1

### Patch Changes

- [#483](https://github.com/medelman17/eyecite-ts/pull/483) [`51f66cd`](https://github.com/medelman17/eyecite-ts/commit/51f66cd7597edf81e7a1645aecae543f657ae3ab) Thanks [@medelman17](https://github.com/medelman17)! - fix: year-as-volume neutral citations survive `filterFalsePositives` (NY Slip Op, WL, LEXIS, IL App)

  `MAX_PLAUSIBLE_VOLUME = 2000` flagged any citation with volume > 2000 as a
  likely zip code or junk number. Vendor-neutral reporters use the year of
  decision as the "volume" (`2026 NY Slip Op 01627`, `2024 WL 12345`,
  `2025 IL App (1st) 230456`, `2026 U.S. App. LEXIS 7890`), so every such
  citation from 2001 onward was being dropped when callers passed
  `filterFalsePositives: true`.

  ### Fix

  `isImplausibleVolume` now allows volumes in the plausible-year range
  (1900–2099) regardless of the cap. Truly garbage values — 5-digit zip
  codes (≥ 10000), 4-digit numbers outside the year window (e.g., `3500`)
  — still flag.

  ### Tests

  4 new tests in `tests/extract/issue480FollowupNeutralYearVolume.test.ts`:

  - `2026 NY Slip Op 01627` survives filtering (the original reproduction
    from the user report).
  - `2030 NY Slip Op` survives (future-year safety through 2099).
  - `DC 20006 Counsel for Appellees 20004` still filtered (5-digit zip).
  - `3500 F.3d 5` still filtered (4-digit but not year-shaped).

  Full suite: 2966 tests pass.

## 0.18.0

### Minor Changes

- [#481](https://github.com/medelman17/eyecite-ts/pull/481) [`7273ba9`](https://github.com/medelman17/eyecite-ts/commit/7273ba935220d86a84c50b57d63dab48b8b347ea) Thanks [@medelman17](https://github.com/medelman17)! - fix: `Id.` antecedent resolution respects Bluebook signals, quote zones, and pincite shape (#480)

  The resolver previously stamped the nearest preceding full citation as
  `Id.`'s antecedent, regardless of how the citation appeared. In
  documents with intervening signal-phrase citations (`See also …`,
  `Cf. …`), block-quoted material, or mixed case/statute references,
  this produced wrong antecedents for downstream consumers.

  ### What changed

  `DocumentResolver.resolveId` now walks back over the citations list and
  scores candidates instead of taking the last-set `lastResolvedIndex`. The
  new scoring axes:

  1. **Signal-phrase awareness.** Citations introduced with `see`, `see
also`, `see generally`, `cf.`, `but cf.`, `compare`, or any `, e.g.`
     variant are treated as _asides_ and skipped when a non-signaled
     candidate is in scope. Direct-engagement signals (`accord`, `contra`,
     `but see`) remain strong. Members of a string-cite group inherit the
     group's leading signal.
  2. **Quote-boundary respect.** Citations inside markdown blockquotes
     (`> …` lines) or inline paired double-quotes (`"…"`) don't compete
     for `Id.`'s antecedent unless `Id.` itself is in the same quote zone.
  3. **Family preference from pincite shape.** `Id. at NNN` prefers a
     case-family antecedent; `Id. § NNN(x)` prefers a statute-family
     antecedent. A statute in the gap no longer captures a following
     `Id. at 125` when an earlier case is in scope.
  4. **Case-name window check.** When the prose immediately before `Id.`
     names a case that doesn't match the picked antecedent (`"As Resek
held, … Id."`), the resolver commits to the chosen antecedent but
     reports `confidence: 0.75` and an ambiguity warning so consumers
     can surface the conflict for review.

  The short-form chain behavior is preserved: a `shortFormCase`/`supra`/
  `Id.` that resolved to an earlier full citation still re-anchors the
  "current authority" for a following `Id.`.

  ### Behavior change

  Two existing tests were updated to reflect criterion 5 (non-case
  deprioritization): when a statute interrupts a case discussion and the
  next `Id.` has a page-style pincite, the resolver now points to the
  case rather than the statute. Consumers that relied on the previous
  "most-recent authority of any type" rule will see different
  `resolution.resolvedTo` indices in these mixed-type sequences. A
  statute-only context still resolves `Id.` to the statute.

  ### Tests

  18 new tests in `tests/resolve/issue480_idAntecedent.test.ts` cover all
  five acceptance criteria from the issue: simple `case → Id.`
  (no regression), signal-phrase intervening cites (`see also`, `cf.`,
  `see`, `but cf.`, `compare`, `see generally`), block-quote and inline-
  quote skip, matching/mismatching case-name window, and case/statute
  family routing. Full suite: 2962 tests pass.

## 0.17.5

### Patch Changes

- [#479](https://github.com/medelman17/eyecite-ts/pull/479) [`2162f31`](https://github.com/medelman17/eyecite-ts/commit/2162f311a509c1d84eecb6c5ed8e72e2c1ab106d) Thanks [@medelman17](https://github.com/medelman17)! - fix: caseName multi-`v.` recovery preserves entity-suffix commas (`, Inc.` / `, LLC` / `, Corp.`)

  Follow-up to the heading-boundary fix (#477). When a section
  heading + body produces a defendant with multiple `v.` anchors
  AND no heading-verb boundary (e.g., the body cite uses a docket
  number rather than a reporter), the recovery fell back to the
  existing comma-trim logic, which truncates at the FIRST comma
  in the defendant — incorrectly stripping entity suffixes like
  `, Inc.`:

  ```
  Collins v. Anthem, Inc. Is Distinguishable
  In Collins v. Anthem, Inc., No. 20-CV-01969 (E.D.N.Y. Mar. 19, 2024) ...

  got: caseName="Collins v. Anthem"
  exp: caseName="Collins v. Anthem, Inc."
  ```

  ### Fix

  Multi-`v.` recovery is now reordered and entity-aware:

  1. **Heading-verb boundary first** (definitive). If the
     defendant contains a standalone to-be verb (`Is`/`Are`/
     `Was`/`Were`), truncate there. This preserves entity-suffix
     commas because the verb sits between the entity suffix and
     the heading-prose.
  2. **Comma-trim with entity-suffix skip**. When no heading-verb
     is present, scan for commas — but skip any comma immediately
     followed by `Inc.`, `LLC`, `Corp.`, `Co.`, `Ltd.`, `LLP`,
     `LP`, `P.C.`, `N.A.`, `S.A.`, `GmbH`, or `S.p.A.`.

  ### Tests

  3 new tests added to
  `tests/extract/issueCaseNameHeadingBoundary.test.ts` covering
  `Anthem, Inc.` / `Acme, LLC` / `Acme, Corp.` in the heading +
  body shape. Full 2952-test suite passes; #222 consolidated
  captions and #436 entity-suffix tests still pass.

- [#477](https://github.com/medelman17/eyecite-ts/pull/477) [`e0dee15`](https://github.com/medelman17/eyecite-ts/commit/e0dee15e9c7a47d33ff8d8ba891ab6fe016a819e) Thanks [@medelman17](https://github.com/medelman17)! - fix: caseName backward search truncates at section-heading `Is`/`Are`/`Was`/`Were` boundary

  In documents where a section heading repeats the case name —
  common in legal briefs:

  ```
  Des Roches v. California Physicians' Service Is Distinguishable
  In Des Roches v. California Physicians' Service, 320 F.R.D. 486 (N.D. Cal. 2017), ...
  ```

  — the case-name backward search absorbed the heading's text into
  the defendant, producing
  `caseName="Des Roches v. California Physicians' Service Is
Distinguishable In Des Roches v. California Physicians' Service"`.
  The existing consolidated-caption recovery (#222) only truncates
  at the first comma in the defendant; section headings have no
  internal commas so the recovery didn't fire.

  ### Fix

  After the multi-`v.` comma-truncation step, also check for a
  standalone capitalized to-be verb (`Is`, `Are`, `Was`, `Were`)
  inside the defendant. Real corporate / party names don't contain
  these verbs as standalone tokens, so their presence is a reliable
  heading-boundary signal. Truncate the defendant at the verb.

  ### Tests

  7 new tests in `tests/extract/issueCaseNameHeadingBoundary.test.ts`:
  heading + body with the same case name (3 variants — `Is`,
  `Are`), plus regressions for `Anthem, Inc.` (real defendant
  preserved), single citations with no heading, California
  year-first form, and consolidated-caption first-comma trim.
  Full 2949-test suite passes.

## 0.17.4

### Patch Changes

- [#475](https://github.com/medelman17/eyecite-ts/pull/475) [`fe3e7ea`](https://github.com/medelman17/eyecite-ts/commit/fe3e7eaaf5bfad8c0ee499c75684d871777f3417) Thanks [@medelman17](https://github.com/medelman17)! - fix: docket-number pattern accepts PACER colon prefix (e.g. `2:17-cv-00413`)

  Federal district courts use the PACER/CM/ECF format where the
  docket number has a court-division colon prefix:
  `2:17-cv-00413` (E.D.N.Y. division 2, case year 2017,
  civil-type, sequence 00413). The previous pattern did not
  include `:` in the docket-number character class, so

  ```
  G. v. United Healthcare, No. 2:17-cv-00413 (D. Utah June 9, 2020)
  ```

  was silently dropped.

  ### Fix

  Extended the docket-number regex to accept an optional
  single-colon division prefix: `[A-Za-z\d]+(?::?[A-Za-z\d]+)?`
  in front of the existing hyphen/space-separated parts.

  ### Tests

  3 new tests in `tests/extract/extractDocket.test.ts`:

  - PACER `No. 2:17-cv-00413 (D. Utah June 9, 2020)` (user-reported)
  - PACER with `Civil No.` prefix and colon
  - anonymized single-letter plaintiff `G. v. United Healthcare`

  Full 2942-test suite passes; existing hyphen-only and
  space-separated formats still extract.

## 0.17.3

### Patch Changes

- [#473](https://github.com/medelman17/eyecite-ts/pull/473) [`b82005a`](https://github.com/medelman17/eyecite-ts/commit/b82005a8fcfcf5683195dbaec84f852c87ec84d4) Thanks [@medelman17](https://github.com/medelman17)! - fix: docket-number pattern accepts space-separated parts (e.g. `18 C 7039`)

  Northern District of Illinois (and some other federal district
  courts) use space-separated docket numbers like `18 C 7039`
  (year + court code + sequence). The pattern only allowed
  hyphen-separated parts, so:

  ```
  Carter v. Illinois Gaming Board, No. 18 C 7039 (N.D. Ill. Nov. 25, 2019)
  ```

  was silently dropped.

  ### Fix

  Extended the docket-number character class in both
  `docketPatterns.ts` and `extractDocket.ts` to allow space
  separators alongside hyphens:

  ```
  [A-Za-z\d]+(?:[-\s][A-Za-z\d]+)*
  ```

  The outer pattern's mandatory `\s+\(` before the court+year
  parenthetical preserves the natural bound — the docket-number
  stops where the court+year paren begins.

  ### Tests

  3 new tests in `tests/extract/extractDocket.test.ts`:

  - N.D. Ill. `No. 18 C 7039 (N.D. Ill. Nov. 25, 2019)` (user-reported)
  - N.D. Ill. shorter form `No. 18 CV 1234`
  - hyphen-separated `No. 18-cv-7039` regression sentinel

  Full 2939-test suite passes.

## 0.17.2

### Patch Changes

- [#471](https://github.com/medelman17/eyecite-ts/pull/471) [`ec742fa`](https://github.com/medelman17/eyecite-ts/commit/ec742fab245f2ef16747161fc01f16aafb340a60) Thanks [@medelman17](https://github.com/medelman17)! - fix: Illinois `Ill. App. 3d` and Minnesota `N.W.2d` reporter normalization (#465, #466)

  Two reporter-spacing normalizations were inconsistent with
  Bluebook T1:

  - **#465** — `Ill. App.3d` (no space before ordinal) preserved
    as-is. The Bluebook canonical form is `Ill. App. 3d` (with
    space). 19 occurrences in the IL sample.
  - **#466** — `N. W.2d` (space between `N.` and `W.`) preserved
    as-is. The canonical form is `N.W.2d` (no inner space). 13
    occurrences in the MN sample. Same pattern affects `S.W.`,
    `N.E.`, `S.E.` regional reporters.

  ### Fix

  In `normalizeReporterSpacing`:

  1. **Regional-reporter inner-space collapse** runs before the
     general ordinal-suffix collapse:
     `\b([NS])\.\s+([WE])\.` → `$1.$2.` covers
     `N.W.` / `N.E.` / `S.W.` / `S.E.` regardless of input
     spacing.
  2. **Illinois Appellate restore** runs after the general
     collapse to add back the space the general rule strips:
     `\bIll\.\s+App\.(\d+[a-z]+)` → `Ill. App. $1`.

  ### Tests

  11 new tests in `tests/clean/reporterSpacingIllNw.test.ts`
  covering both directions (already-canonical and corrupted
  input) for `Ill. App. 2d/3d` and the four regional reporters
  `N.W.2d / S.W.2d / N.E.2d / S.E.2d`. Updated one existing #332
  regression sentinel to reflect the new canonical Illinois form.
  Full 2936-test suite passes.

## 0.17.1

### Patch Changes

- [#470](https://github.com/medelman17/eyecite-ts/pull/470) [`e3450af`](https://github.com/medelman17/eyecite-ts/commit/e3450af954f79b5a8159824dd12352d362da6642) Thanks [@medelman17](https://github.com/medelman17)! - fix: caseName backward search stops at prior citation's `(YYYY)` paren when followed by a list connector

  In citation lists with lowercase connectors like
  `...(Del. 1984), and Rales v. Blasband, 634 A.2d 927 (Del. 1993)`,
  the case-name backward search was crossing the previous
  citation's `(YYYY)` closing paren and absorbing it into the
  third citation's plaintiff:

  ```
  got: caseName="Del. 1984), and Rales v. Blasband"
       plaintiff="Del. 1984), and Rales"
  exp: caseName="Rales v. Blasband"
       plaintiff="Rales"
  ```

  `SENTENCE_BOUNDARY_REGEX` (`[.)]\s+(?=[A-Z(])`) requires the
  character after the boundary to be uppercase, so it skipped the
  lowercase `and` connector and let the backward search continue.

  ### Fix

  New `PRIOR_YEAR_PAREN_BOUNDARY_REGEX` recognizes
  `<year>)\s*(?:,\s*(and|or|see|but\s+see|see\s+also|e\.g\.)|;)\s+`
  as a citation boundary. The connector word is required so the
  boundary doesn't false-positive on Montana / California
  year-first captions where the comma after the year leads to a
  parallel reporter (`Holton v. Co. (1981), 195 Mont. 1` — the
  `, 195` is a reporter, not a list connector).

  ### Tests

  7 new tests in `tests/extract/issueCaseNameYearParenBoundary.test.ts`:
  three-case list with `, and`, two-case list with `, and`,
  semicolon connector, `see also` connector, multi-period court
  abbrev, and two regression sentinels (simple single citation,
  first citation in a list). Full 2925-test suite passes;
  existing #436 Montana-year-paren and #19 California-year-first
  tests still pass.

- [#469](https://github.com/medelman17/eyecite-ts/pull/469) [`e8c9a4a`](https://github.com/medelman17/eyecite-ts/commit/e8c9a4acc9c56fe189b9652ceecc67747c820480) Thanks [@medelman17](https://github.com/medelman17)! - fix: docket pattern accepts `C.A.` / `Civ.` / `Civil` / `Case` / `Civil Action` / `Adv.` / `Docket` prefixes

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

- [#467](https://github.com/medelman17/eyecite-ts/pull/467) [`f105a72`](https://github.com/medelman17/eyecite-ts/commit/f105a722f50a7b53496060a4146d33cab600d2da) Thanks [@medelman17](https://github.com/medelman17)! - fix: extend bare-section jurisdiction context to MT (MCA) and CO (C.R.S.) (#464)

  The #432 fix introduced per-document context propagation for
  bare-section citations (`§ N-N-N`), but only recognized West
  Virginia (`W.Va. Code`). **29 occurrences** across MT (17) and
  CO (12) in the v0.16.2 replay were still routed to NM:

  | State | Trigger          | Example                           |
  | ----- | ---------------- | --------------------------------- |
  | MT    | `, MCA` postfix  | `§§ 49-2-205 and -303, MCA`       |
  | CO    | `C.R.S.` context | `C.R.S. § 13-25-126; § 13-25-130` |

  ### Fix

  Generalized `inheritBareSectionJurisdiction` (step 4.7) to a
  table-driven override map covering WV, CO, and MT. Additionally,
  when a bare `§ N-N-N` is followed within the same sentence by a
  `, MCA` (or `, M.C.A.`) postfix, the citation is rerouted to MT
  even without preceding C.R.S./W.Va. Code context.

  ### Tests

  8 new tests in `tests/extract/issue464MtCoBareSection.test.ts`:
  MT trailing-postfix in list, MT standalone (regression), MT
  same-paragraph not-attached postfix, CO `C.R.S.` propagation, CO
  `Colo. Rev. Stat.` propagation, NM default preserved, WV (#432)
  regression, NMSA regression. Full 2909-test suite passes.

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
