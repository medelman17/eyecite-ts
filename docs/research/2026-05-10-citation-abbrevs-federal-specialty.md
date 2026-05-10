# Citation Abbreviations & Style Quirks: Federal Specialty Courts

**Date:** 2026-05-10
**Agent scope:** Federal specialty courts — Tax, Bankruptcy, Court of Federal Claims, Court of International Trade, Vet App, CAAF, military CCAs, BIA, PTAB, TTAB, NLRB, FERC, ITC, USPTO

---

## Summary

I audited the existing `CASE_NAME_ABBREVS` set in `src/extract/extractCase.ts` (lines 394–795) against the case-caption vocabulary that appears in real opinions from each of the assigned specialty tribunals. The headline finding is that **the major institutional abbreviations are already covered**: `commn`, `commr`, `secy`, `dept`, `bankr`, `tr`, `bd`, `intl`, `assn`, `natl`, `fedn`, `mil`, `cl`, and `ct` all already live in the set, so canonical captions like `Comm'r v. X`, `Sec'y of Veterans Affairs v. X`, `Dep't of the Treasury v. X`, `In re X, Debtor`, and `United States v. Smith (C.A.A.F.)` should already pass the backward scan.

The remaining gaps are concentrated in three pockets that **specialty-court practice uses but Bluebook T6 / reporters-db do not**:

1. **Party-role nouns** — `Resp.` (Respondent), `Pet'r` (Petitioner), `Debtor`, `Trustee` (when written `Trs.` plural form), `Applicant`, `Opposer`, `Patentee`, `Movant`, `Claimant`. These appear as full caption parties in BIA, PTAB, TTAB, and bankruptcy adversary captions.
2. **Military / armed-forces stems** — `A.F.`, `N.M.`, `C.G.`, `J.A.G.`, abbreviation `Servicemember`, and the `M.J.` reporter context. Most are already dotted initialisms (auto-handled), but **`Servicemember`** and a few mid-caption phrases like `U.S.M.C.`, `U.S.N.`, `U.S.A.F.` rely on internal-period detection.
3. **Tribunal-context single tokens** — `Adv.` (Advertising — already in set via `adver`), `Bankr.` (already), `Vet.` (Veterans — **MISSING**), `Immigr.` (already as `immigr`), `Int'l` (already as `intl`), `Op.` (Opinion, already), `Bro.` (Brotherhood, **already as `bhd`** but `bros` is the plural form **already in set**).

The single highest-impact missing stem is **`vet`** (Veterans — appears as `Vet.` in `Sec'y of Veterans Affairs` short captions and adjacent role nouns; also `Vet. Aff.`). All other meaningful gaps are role-noun stems and a small handful of single-letter service abbreviations (the C.A.A.F. / military service abbreviations are dotted initialisms and auto-handled by tier-3).

The **style quirks** — `T.C. Memo. YYYY-NNN`, `Matter of X-Y-, 28 I&N Dec.`, `IPR2020-12345, Paper 5`, slip-opinion numbers, FERC paragraph `¶ 61,001` form, and NLRB `365 NLRB No. 5` — are *not* abbreviation-set issues; they are **tokenizer/pattern** issues. They are out of scope for this stem-list audit but flagged below for downstream work.

---

## Per-Court Findings

### U.S. Tax Court (T.C., T.C. Memo., T.C. Summ. Op.)

Canonical caption: `[Petitioner] v. Commissioner of Internal Revenue` (almost always abbreviated `Comm'r`). Many petitioners are individuals (no abbreviation issues). Some are entities: `Estate of X v. Comm'r`, `X Trust v. Comm'r`. The court itself almost never writes `Commr` without the apostrophe — but eyecite strips the apostrophe before lookup, so `commr` (already in the set, line 754) catches it.

| Stem | Full Word | Source | Risk | Example caption |
|---|---|---|---|---|
| `commr` | Commissioner | reporters-db | **EXISTS** (line 754) — verified | `Storey v. Comm'r, T.C. Memo. 2012-115` |
| `commn` | Commission | reporters-db | **EXISTS** (line 753) | n/a in Tax Ct caption itself |
| `intl` | Internal | reporters-db (via Int'l) | **EXISTS** (line 768) | `Internal Revenue` |
| `estate` | Estate | **MISSING — not in reporters-db either** | LOW — capitalized, unlikely sentence-end | `Estate of Smith v. Comm'r` |
| `pet` | Petitioner / Pet'r | **MISSING** | MEDIUM — `Pet.` (Petition) appears as common English | `Pet'r's Br. 5` (in-text) |
| `petr` | Petitioner | **MISSING** | LOW — distinctive | `Pet'r v. Comm'r` (in shortform) |

**Note:** Tax Court captions in citations themselves are almost always full names, so the missing party-role stems matter for *cross-references and short-forms inside an opinion's body text*, not for primary citation extraction.

---

### U.S. Bankruptcy Courts (B.R., Bankr.)

Two caption shapes:
- **Main case:** `In re Harrison, 599 B.R. 173 (Bankr. N.D. Fla. 2019)`
- **Adversary proceeding:** `Spence v. Hintze (In re Hintze), 570 B.R. 369 (Bankr. N.D. Fla. 2017)` — parenthetical-administrative-name form

| Stem | Full Word | Source | Risk | Example caption |
|---|---|---|---|---|
| `bankr` | Bankruptcy | Bluebook T7/T10 | **EXISTS** (line 419) | `Bankr. N.D. Fla.` |
| `tr` | Trustee | reporters-db | **EXISTS** (line 617) | `Tr. v. Smith` |
| `trs` | Trustees | (eyecite-ts local) | **EXISTS** (line 618) | `Bd. of Trs. v. ...` |
| `debtor` | Debtor | **MISSING** | LOW — capital-D party label, unlikely English sentence-end | `In re X, Debtor` |
| `creditor` | Creditor | **MISSING** | LOW | `Creditor v. Trustee` |
| `mvt` / `movant` | Movant | **MISSING** | LOW | `Movant v. Resp't` |
| `liq` | Liquidating | **MISSING** | LOW | `Liq. Tr. v. ...` |
| `chap` | Chapter | **MISSING** | MEDIUM — common English word | `Chapter 7 Trustee v. ...` |

**Quirk:** The `(In re X)` administrative-name parenthetical inside an adversary citation is **not** a case-name abbreviation problem — it is a tokenizer pattern problem. Eyecite's parenthetical parser needs to recognize `(In re X)` as part of `fullSpan` for the adversary citation, not as an explanatory parenthetical.

---

### U.S. Court of Federal Claims (Fed. Cl., Cl. Ct.)

Captions are virtually always `X v. United States`. `Fed. Cl.` and `Cl. Ct.` are court abbreviations handled by the court-inference pipeline, not the case-name stem set.

| Stem | Full Word | Source | Risk | Example caption |
|---|---|---|---|---|
| `fed` | Federal | Bluebook T6 | **EXISTS** (line 493) | `Fed. Cl.` |
| `cl` | Claims | Bluebook T7 | **EXISTS** (line 664) | `Fed. Cl.` |

No gaps. Captions are simple `Name v. United States`.

---

### U.S. Court of International Trade (CIT, Ct. Int'l Trade)

| Stem | Full Word | Source | Risk | Example caption |
|---|---|---|---|---|
| `intl` | International | reporters-db (Int'l) | **EXISTS** (line 768) | `Ct. Int'l Trade` |
| `imp` | Importer / Importation | reporters-db | **EXISTS** (line 506) | `XYZ Imp. Corp. v. United States` |
| `exp` | Exporter / Exportation | reporters-db | **EXISTS** (line 489) | `XYZ Exp. Co.` |
| `trade` | Trade | **MISSING** | LOW — capital T, distinct | `Int'l Trade Comm'n` |

`CIT` itself is a dotted initialism / acronym — tier-2/3 covers it.

---

### U.S. Court of Appeals for Veterans Claims (Vet. App.)

Canonical caption: `Smith v. Sec'y of Veterans Affairs` (older) or `Smith v. McDonough` / `Smith v. Wilkie` (modern, named for current Secretary). `Sec'y` is covered by `secy` (line 777).

| Stem | Full Word | Source | Risk | Example caption |
|---|---|---|---|---|
| `secy` | Secretary | Bluebook T6 / reporters-db | **EXISTS** (line 777) | `Sec'y of Veterans Affairs` |
| `vet` | Veterans / Veteran | **MISSING** (high impact) | LOW — usually capitalized | `Vet. App.`, `Vet. Aff.` |
| `aff` | Affairs | Bluebook T6 | **EXISTS** (line 403) | `Veterans Aff.` |

**Recommendation:** Add `vet`. The `Vet.` token appears mid-caption in `Sec'y of Vet. Aff. v. X` and inside `Vet. App.` itself when used as text rather than a citation (e.g., "the Court of Appeals for Vet. Claims held..."). False-positive risk is low because lowercase `vet.` at sentence end (referring to a veterinarian) is uncommon in legal prose.

---

### U.S. Court of Appeals for the Armed Forces (C.A.A.F.)

Canonical caption: `United States v. Smith, 70 M.J. 320 (C.A.A.F. 2011)`. The court is a **dotted initialism** (auto-handled by tier-3). `M.J.` reporter is auto-handled. The party `United States` is auto-handled (capitalized, full word, not at sentence end).

| Stem | Full Word | Source | Risk | Example caption |
|---|---|---|---|---|
| `caaf` | (court acronym, written as `C.A.A.F.`) | dotted form | tier-3 handles | `(C.A.A.F. 2011)` |
| `mj` | (reporter, `M.J.`) | dotted form | tier-3 handles | `70 M.J. 320` |
| `usca` | (`U.S.C.A.A.F.`) | dotted form | tier-3 handles | rare |

**No new stems needed.** Military service-branch tokens (`A.F.`, `N.M.`, `C.G.`, `U.S.M.C.`, `U.S.N.`) are all dotted initialisms.

---

### Military Courts of Criminal Appeals (CCAs)

Caption: `United States v. Jones, ___ M.J. ___ (A. Ct. Crim. App. 2024)` and analogs for `A.F. Ct. Crim. App.`, `N.M. Ct. Crim. App.`, `C.G. Ct. Crim. App.`.

| Stem | Full Word | Source | Risk | Example caption |
|---|---|---|---|---|
| `crim` | Criminal | Bluebook T6 | **EXISTS** (line 462) | `A. Ct. Crim. App.` |
| `app` | Appeals / Appellate / Application | Bluebook T6 | **EXISTS** (line 411) | `Ct. Crim. App.` |

**Note:** `A.`, `A.F.`, `N.M.`, `C.G.` are all dotted initialisms — tier-3 catches them.

---

### Board of Immigration Appeals (BIA)

Caption: `Matter of A-B-, 28 I&N Dec. 199 (BIA 2021)` or `Matter of McDonald, 29 I&N Dec. 249 (BIA 2025)`. EOIR Practice Manual explicitly says **"Matter of" is favored over "In re"**. The respondent name is often initials with hyphens (`A-B-`, `M-S-`, `J-J-S-`) for privacy.

| Stem | Full Word | Source | Risk | Example caption |
|---|---|---|---|---|
| `immigr` | Immigration | (eyecite-ts local) | **EXISTS** (line 505) | `Bd. of Immigr. App.` |
| `bd` | Board | Bluebook T6 | **EXISTS** (line 421) | `Bd. of Immigr. App.` |
| `app` | Appeals | Bluebook T6 | **EXISTS** (line 411) | `(BIA 2025)` |
| `resp` | Respondent | Bluebook T6 / reporters-db | **EXISTS** (line 588) | `Resp't' Br.` (but watch — see Risk) |
| `matter` | (caption-leading word) | n/a — full word | n/a | `Matter of A-B-` |

**Quirk:** `Matter of X-Y-Z-` is **not** an abbreviation-set issue — it is a **caption pattern** issue. The backward scanner needs to recognize `Matter of` as a caption-leading phrase (like `In re`). The hyphenated-initials respondent name (`A-B-`, `J-J-S-`) needs the scanner to walk through hyphens without treating them as boundary tokens.

---

### Patent Trial and Appeal Board (PTAB)

Citation: `[Petitioner] v. [Patent Owner], IPR2020-12345, Paper 5 (P.T.A.B. Aug. 25, 2020)`. Captions are usually full company names. `P.T.A.B.` is a dotted initialism.

| Stem | Full Word | Source | Risk | Example caption |
|---|---|---|---|---|
| `pat` | Patent | reporters-db | **EXISTS** (line 560) | `Bd. of Pat. App. & Interferences` |
| `ptab` | (acronym, `P.T.A.B.`) | dotted form | tier-3 handles | `(P.T.A.B. 2020)` |
| `ipr` | (proceeding type, `IPR2020-12345`) | n/a — embedded in docket | n/a | not a stem issue |
| `paper` | Paper | n/a — full word | n/a | `Paper 5` (tokenizer issue) |

**Quirk:** `IPR2020-12345, Paper 5` is a **docket-citation pattern**, not a stem-set issue. The docket-citation extractor already exists (`src/patterns/docketPatterns.ts`); it may need to be extended to recognize IPR docket numbers.

---

### Trademark Trial and Appeal Board (TTAB)

Citation: `[Opposer] v. [Applicant], Opposition No. 91234567 (T.T.A.B. 2020)` or registration-cancellation form. `T.T.A.B.` is a dotted initialism.

| Stem | Full Word | Source | Risk | Example caption |
|---|---|---|---|---|
| `ttab` | (acronym) | dotted form | tier-3 handles | `(T.T.A.B. 2020)` |
| `opp` | Opposition | **MISSING** | MEDIUM — common English ("opp." for "opposite/opposed") | `Opposition No. 91234567` |
| `applicant` / `app` | Applicant | (existing `app` = Appellate, multi-meaning) | n/a — `app` already in set | `Applicant's Br.` |
| `opposer` | Opposer | **MISSING** | LOW — distinctive | `Opposer's Reply` |

**Quirk:** The TBMP says citations should be to *USPQ* if available; otherwise to TTABVUE database. Real captions don't usually use abbreviated party roles — the parties are full company names, with `(Opposer)` or `(Applicant)` in parentheses for clarity, not as the case-name token.

---

### National Labor Relations Board (NLRB)

Citation: `Auto Workers Local 1989 (Caterpillar Tractor), 249 NLRB 1145 (1980)` or `X Corp., 365 NLRB No. 5 (2017)`. **The NLRB Style Manual prescribes**: insert an abbreviated company name in parentheses after a union name with a Local number.

| Stem | Full Word | Source | Risk | Example caption |
|---|---|---|---|---|
| `nlrb` | (acronym) | n/a (no periods) | n/a | `365 NLRB No. 5` |
| `loc` | Local | Bluebook T6 | **EXISTS** (line 527) | `Local 1989` (usually full word, not `Loc.`) |
| `union` | Union | n/a — full word | n/a | `Steelworkers Union` |
| `bhd` | Brotherhood | reporters-db | **EXISTS** (line 425) | `Bhd. of Carpenters` |
| `dist` | District | Bluebook T6 | **EXISTS** (line 472) | `Dist. Council` |
| `coun` / `coun.` | Council | **MISSING** (`couns` exists for Counsel, line 459) | MEDIUM — easy to confuse with `couns` | `Dist. Council 4` |

**Recommendation:** Add `coun` for Council (separate from `couns` Counsel). Example real captions: `Sheet Metal Workers Int'l Ass'n, Local 124 (Reynolds Group)`, `Dist. Council 9, Painters & Allied Trades`, `Joint Council 16`.

**Quirk:** The `365 NLRB No. 5` format (volume + reporter + `No.` + slip number) is a tokenizer pattern, not a stem issue. The `(Caterpillar Tractor)` in-parentheses company name is an explanatory parenthetical of a unique sort — extractor needs to keep it inside `fullSpan`.

---

### Federal Energy Regulatory Commission (FERC)

Citation: `Southwest Corp., 85 F.E.R.C. ¶ 61,201 (1998)` or modern dotless form `162 FERC ¶ 61,001`. **Second-reference convention drops the party name entirely** — making position tracking even more critical.

| Stem | Full Word | Source | Risk | Example caption |
|---|---|---|---|---|
| `ferc` | (acronym, both `F.E.R.C.` and `FERC`) | dotted form | tier-3 handles dotted; bare acronym needs no abbreviation | `162 FERC ¶ 61,001` |
| `corp` | Corporation | Bluebook T6 | **EXISTS** (line 455) | `Southwest Corp.` |

**No new stems needed.** The paragraph-citation form `¶ 61,001` and the second-reference dropping the party name are tokenizer concerns.

---

### International Trade Commission (ITC / USITC)

Citation: `Certain X, Inv. No. 337-TA-1234, Comm'n Op. (USITC May 1, 2020)`. **Captions almost always start with `Certain` followed by a product description** — no proper-noun party name. This is a tokenizer challenge: the case "name" is literally `Certain Magnetic Resonance Imaging Devices`, not a person.

| Stem | Full Word | Source | Risk | Example caption |
|---|---|---|---|---|
| `inv` | Investment / Investor (Bluebook) | reporters-db | **EXISTS** (line 518) | `Inv. No. 337-TA-1234` — but here `Inv.` means **Investigation**, not Investment |
| `usitc` / `itc` | (acronym) | dotted/bare | tier-3 handles | `(USITC 2020)` |
| `investigation` | Investigation | **MISSING — distinct meaning of `Inv.`** | LOW — distinctive context | `Investigation No. 337-TA-` |

**Quirk:** `Inv.` is ambiguous (Investment vs. Investigation). In ITC context the latter dominates; in case-name context the former does. eyecite's stem-set lookup doesn't care which expansion, only whether the period is sentence-end. So `inv` already in the set covers both meanings.

---

## Citation Quirks Unique to Each Tribunal

Items below are **pattern/tokenizer-level concerns**, not stem-set entries. Flagged for downstream extractor work.

### Tax Court
- `T.C. Memo. YYYY-NNN` — hyphenated case number serves as the "volume-reporter-page" tuple; `T.C. Memo. 2020-123` should parse as `volume=2020, reporter=T.C. Memo., page=123`.
- `T.C. Summ. Op. YYYY-NNN` — same shape.
- `T.C.M. (CCH)` and `T.C.M. (RIA)` are publisher-variant reporters — already handled by reporters-db, but extractor needs the publisher-parenthetical.
- Slip-opinion form: `Leyh v. Comm'r, No. 20533-18, 157 T.C., slip op. at 5` — docket-number-then-volume-then-`slip op. at` pinpoint.

### Bankruptcy
- `In re X, Debtor` — `Debtor` parenthetical-style suffix after comma. Caption parser must not truncate the case name at the comma.
- `Spence v. Hintze (In re Hintze)` — administrative-name in parentheses. The parenthetical is **part of the case name**, not an explanatory parenthetical.
- `Adv. Pro. No. 23-1001` — adversary proceeding number is a docket-style identifier.
- B.A.P. (Bankruptcy Appellate Panel) decisions: `(B.A.P. 1st Cir. 2020)`.

### Court of International Trade
- `Slip Op. YY-NNN` — slip-opinion identifier like `Slip Op. 25-66`.
- "Certain X" captions — see ITC below.

### Veterans Court
- Captions almost always reference the current Secretary's surname: `Smith v. McDonough`, `Jones v. Wilkie`. **No special abbreviation work needed** — same as ordinary appellate `Name v. Name`.

### CAAF / CCAs
- `United States v. Smith, 70 M.J. 320 (C.A.A.F. 2011)` — completely standard, fully handled by existing patterns.
- Service-branch court abbreviations (`A. Ct. Crim. App.`, `A.F. Ct. Crim. App.`, `N.M. Ct. Crim. App.`, `C.G. Ct. Crim. App.`) — dotted initialisms.

### BIA
- **`Matter of`** is the canonical caption-leader (NOT `In re`). The eyecite-ts pipeline already handles `In re`; it needs to handle `Matter of` symmetrically.
- Hyphenated-initials respondent names: `Matter of A-B-`, `Matter of J-J-S-`, `Matter of M-R-M-S-`. The backward scanner must walk through ASCII hyphens followed by uppercase letters as part of the caption, not stop at them.
- Reporter: `I&N Dec.` — embedded ampersand, no space; tokenizer must allow.
- A-number anonymization in unpublished cases: `J-J-S-, AXXX-XXX-789 (BIA Dec. 20, 2020)`.

### PTAB
- `IPR2020-12345, Paper 5 (P.T.A.B. Aug. 25, 2020)` — docket-citation form. Eyecite-ts has a docket-pattern module (`src/patterns/docketPatterns.ts`) which should be extended.
- Also: `CBM2020-00001`, `PGR2020-00001`, `Reexam. No. 90/012,345` — sibling proceeding types.
- `Decided 8/25/2020` form vs. parenthetical date — both appear.

### TTAB
- `Opposition No. 91234567` / `Cancellation No. 92012345` — proceeding numbers.
- Citations preferred to *USPQ* (e.g., `113 U.S.P.Q.2d 1234`) — reporters-db handles `U.S.P.Q.` series.
- TTABVUE database citations: `Opp. No. 91234567, Dkt. No. 15 (T.T.A.B. June 1, 2020)`.

### NLRB
- `Vol NLRB Page` form: `249 NLRB 1145 (1980)` (older) vs. `365 NLRB No. 5 (2017)` (modern slip-opinion form).
- Local-number form: `Auto Workers Local 1989 (Caterpillar Tractor)` — abbreviated company name in parentheses is **part of the caption**.
- Administrative Law Judge decisions ("ALJ Decisions") — `JD-NNN-NN` slip identifiers.

### FERC
- `162 FERC ¶ 61,001` — paragraph-style pinpoint with `¶` symbol and comma-separated paragraph number.
- Older dotted form `85 F.E.R.C.` and modern dotless `162 FERC` both appear.
- **Second references drop the party name entirely** — `85 F.E.R.C. ¶ 61,201, at 61,821`. This breaks case-name-required heuristics for short-form resolution.

### ITC
- **`Certain X` captions**: `Certain Magnetic Resonance Imaging Devices, Inv. No. 337-TA-1234, Comm'n Op. (USITC May 1, 2020)`. The case "name" has no `v.` separator. eyecite-ts's case extractor requires `v.` — these would fail as case citations and need a separate ITC-investigation pattern.
- `337-TA-NNNN` is the standard ITC docket prefix.

---

## False-Positive Guardrail

Stems flagged for false-positive risk:

| Candidate stem | English meaning | Mitigation |
|---|---|---|
| `pet` | "pet" (animal); also `Pet.` (Petition) | **DO NOT ADD** as bare `pet` — too ambiguous |
| `chap` | "chap" (informal, person); also `Chap.` (Chapter) | **DO NOT ADD** — sentence-end "old chap" possible |
| `opp` | "opposite/opposed" abbrev | Acceptable risk — `Opp.` (Opposition) is distinctive in legal text |
| `vet` | "vet" (veterinarian); also `Vet.` (Veterans) | Acceptable risk — legal contexts dominate |
| `matter` | English word "matter" (no abbreviation) | n/a — full word, not a stem issue |
| `paper` | English word "paper" | n/a — full word, not a stem |
| `debtor` | English word | n/a — full word, capital-D party label |

**Rule of thumb:** Single-syllable common English words that are also case-name abbreviations (`pet`, `chap`, `opp`) require period-context guards (e.g., next char must be space + capital). These cannot safely be added to a bare stem set without risking sentence-boundary false negatives.

---

## Top Recommendations (Prioritized)

### Tier 1 — Add to `CASE_NAME_ABBREVS` (high confidence, low risk)

```typescript
// ── Federal specialty courts: Veterans, councils, etc. ──
"vet",   // Vet. (Veterans) — "Vet. App.", "Sec'y of Vet. Aff."
"coun",  // Coun. (Council) — "Dist. Council 9", "Joint Council 16"
         // distinct from "couns" (Counsel) already in set
```

**Rationale:** Both stems have low false-positive risk, fill a real gap (Veterans Court and NLRB labor-union captions), and have no English-sentence-end collisions in legal prose.

### Tier 2 — Consider for caption-leading parser (NOT stem set)

These are **caption-pattern** issues, not abbreviation-stem issues. They should be handled by extending the backward-scan caption parser in `extractCaseName`, not by adding to `CASE_NAME_ABBREVS`:

1. **`Matter of`** as alternate caption-leader (sibling to `In re`).
2. **`Certain X, Inv. No. 337-TA-NNNN`** as an ITC investigation case-name pattern.
3. **Hyphenated-initials respondent names** (`A-B-`, `J-J-S-`) — walk through hyphens.
4. **`In re X, Debtor`** — don't truncate at comma when next token is a party-role label.

### Tier 3 — Tokenizer / pattern extensions (out of scope for this audit)

1. PTAB / IPR docket pattern: `IPR2020-12345, Paper 5 (P.T.A.B. YYYY)`.
2. ITC investigation pattern: `Inv. No. 337-TA-NNNN`.
3. FERC paragraph pinpoint: `¶ 61,001`.
4. NLRB slip-opinion form: `365 NLRB No. 5`.
5. Tax Court memo/summary number-based citations: `T.C. Memo. YYYY-NNN`.

---

## Verification — Real captions checked against existing set

| Caption | Source | Backward-scan result with existing set |
|---|---|---|
| `Storey v. Comm'r, T.C. Memo. 2012-115` | Tax Court | ✓ `commr` in set, scan succeeds |
| `In re Harrison, 599 B.R. 173 (Bankr. N.D. Fla. 2019)` | Bankruptcy | ✓ `bankr` in set, scan succeeds; `In re` leader handled |
| `Spence v. Hintze (In re Hintze), 570 B.R. 369` | Bankruptcy adversary | ⚠ admin-name parenthetical — extractor concern |
| `Smith v. McDonough, 36 Vet. App. 1 (2024)` | Vet App | ⚠ `Vet.` token — `vet` MISSING, may truncate |
| `United States v. Smith, 70 M.J. 320 (C.A.A.F. 2011)` | CAAF | ✓ all dotted initialisms / standard |
| `Matter of A-B-, 28 I&N Dec. 199 (BIA 2021)` | BIA | ⚠ caption-leader pattern, not stem issue |
| `Apple Inc. v. ITC, IPR2020-12345, Paper 5 (P.T.A.B. 2020)` | PTAB | ✓ stems fine; docket pattern is extractor concern |
| `Auto Workers Local 1989 (Caterpillar Tractor), 249 NLRB 1145` | NLRB | ⚠ admin-name parenthetical; `coun` not needed here |
| `Sheet Metal Workers Local 124, Dist. Council 4` | NLRB | ⚠ `Council` after `Dist.` — `coun` MISSING |
| `Southwest Corp., 85 F.E.R.C. ¶ 61,201 (1998)` | FERC | ✓ stems fine; `¶` pattern is extractor concern |
| `Certain Magnetic Resonance Imaging Devices, Inv. No. 337-TA-1234` | ITC | ⚠ no `v.` — separate pattern needed |

---

## Sources

- The Bluebook, A Uniform System of Citation (21st ed.), Tables T1.1 (federal courts), T1.2 (federal admin), T6, T7
- U.S. Tax Court Citation and Style Manual (2025.09 update)
- EOIR Practice Manual, BIA citation guidelines (Justice.gov)
- NLRB Style Manual (nlrb.gov)
- Army CCA Citation Guide (8th ed. 2019); AFCCA Citation Guide (2017); Military Citation Guide (TJAGLCS 25th ed. 2022)
- TBMP (Trademark Trial and Appeal Board Manual of Procedure, June 2025)
- TMEP § 705.05 (citation of decisions)
- U.S. Court of Federal Claims Citation Formats (uscfc.uscourts.gov)
- USPTO Trial Practice Guide (PTAB)
- freelawproject/reporters-db — case_name_abbreviations.json
- Energy Law Journal Style Manual (Rev. 01-2023) — FERC citation guidance
- Real opinions: cit.uscourts.gov slip op. 25-66; BIA Matter of McDonald 29 I&N Dec. 249; cited Tax Court memos at justia.com
