# Citation-Style Quirks Affecting eyecite-ts Parsing

> Date: 2026-05-10
> Scope: Citation-style quirks **beyond abbreviations** — year formatting, reporter formatting, neutral cites, pincite conventions, signals, subsequent history, parallel citations, short-forms, non-standard signals, slip/electronic decisions.
> Audience: eyecite-ts maintainers planning parser improvements.

## Summary

eyecite-ts inherits most of its citation-format expectations from `reporters-db`, which covers the canonical formats reasonably well. The remaining gaps cluster around **non-Bluebook house styles** (California, New York, Texas Greenbook), **public-domain/neutral citations** (especially formats with hyphens, paragraph references, and `(U)` suffixes), and **signal/history phrase placement** that breaks otherwise correct citation regexes.

The single largest class of parsing risks comes from the **paragraph-pin-cite convention** (`¶ 12` / `¶¶ 12-15`). Internally, eyecite-ts treats pincites as numeric page references (`PinciteInfo.page: number`), and the look-ahead regexes never recognize `¶`. Anywhere a neutral cite is followed by `¶`, the pincite is dropped on the floor, and downstream short-form resolution mis-aligns.

Beyond pincites, three structural conventions reliably break parsing today:

1. **Bracket-year `[2018]` in NY Tanbook**, which is partly handled in `extractCase.ts` (existing test exists) but breaks for slip-op and Misc.3d cites that combine `[U]` markers with `[2018]`.
2. **Slash-date court parentheticals** in Louisiana neutral cites (`La. App. 3d Cir. 10/3/07`), which `parseParenthetical` cannot interpret as a court+date.
3. **Trailing writ/petition history fragments** in Texas (`writ ref'd n.r.e.`), which eyecite-ts treats as junk or chops the citation prematurely.

This report enumerates the quirks and recommends concrete library improvements.

---

## 1. Year Formatting

### 1.1 Bracket-year `[2018]` (NY Tanbook + a few others)

**Tanbook style (NY)** wraps the year in square brackets:

```
Matter of Murphy, 6 NY3d 36 [2005]
Cox v. NAP Constr. Co., Inc., 10 NY3d 592, 607 [2008]
Dormitory Auth. of the State of N.Y. v. Samson Constr. Co., 30 NY3d 704, 712 [2018]
```

**Status in eyecite-ts**: Existing test exists at `tests/extract/extractCase.test.ts` ("scans past `NY3d`") — the case-name resolver knows to stop before `30 NY3d`, but the year-in-brackets parse path is partial. The `LOOKAHEAD_PAREN_REGEX` only handles `(...)` parentheticals, so `[2018]` never reaches `parseParenthetical`.

**Failing inputs (likely)**:

```
Matter of Doe, 25 NY3d 750, 765 [2015] (Smith, J., concurring)
Pickard v. Tarnow, 2007 NY Slip Op 52377(U), at *2 [Sup Ct, NY County 2007]
```

The second test combines `[2007]` (Tanbook year), `(U)` (unpublished marker that breaks the page extractor), and `at *2` (star pincite — currently supported in `PINCITE_REGEX`).

### 1.2 Year-first `(YYYY) volume reporter page` (California Style Manual)

CSM places the date parenthetical **immediately after the case name**, not at the end:

```
People v. Smith (1990) 50 Cal.3d 100
People v. Smith (1990) 50 Cal.3d 100, 115         (with pincite)
People v. Smith (1990) 50 Cal.3d 100, 115 [266 Cal.Rptr. 569]   (with parallel)
```

**Status**: Completely unsupported. Current `casePatterns.state-reporter` regex expects volume-then-reporter at the citation start; the year prefix is interpreted as a stray parenthetical and rejected. The case-name backward search will also misfire because `(1990)` looks like a court+year parenthetical attached to a *prior* citation.

**Failing input**:

```
The court relied on People v. Smith (1990) 50 Cal.3d 100, 115 to reject the claim.
```

`extractCase` will probably attach `(1990)` to whatever preceded it and fail to identify the `50 Cal.3d 100` citation, or it will attach `(1990)` as the citation year but leave the case-name span empty.

### 1.3 Subsequent-history year-first parentheticals (Texas Greenbook)

Texas Greenbook citations chain *court-date-writ-history* in a single parenthetical:

```
Richardson v. Kays, 234 S.W.3d 657 (Tex. App.—Fort Worth 2003, no pet.)
In re Google, LLC, 705 S.W.3d 479, 484 (Tex. App.—15th Dist. 2025, no pet. h.)
Smith v. State, 100 S.W.3d 1, 5 (Tex. App.—Houston [1st Dist.] 2002, writ ref'd n.r.e.)
```

Key structural points:
- The em-dash `—` separates `Tex. App.` from the city.
- Nested brackets `[1st Dist.]` distinguish co-located Houston courts.
- A second comma introduces writ/petition history *inside* the same parenthetical.

**Status**: `parseParenthetical` doesn't anticipate em-dashes, nested brackets, or post-year subordinate clauses. The citation core extracts, but the `court` field will likely include the bracket text or stop at the em-dash.

### 1.4 Year omitted in subsequent short-form

Standard Bluebook short-form drops the year:

```
Roe v. Wade, 410 U.S. 113 (1973). The Court held… See Wade, 410 U.S. at 115.
```

**Status**: Largely supported via `SHORT_FORM_CASE_PATTERN`. However, the patterns assume reporters with no internal spaces (or fall back to `[A-Z][A-Za-z.''\s]+?`), which means `116 F.4th, at 1193` is supported but `Cox v. NAP Constr. Co., 10 NY3d at 595` may fail to bind the antecedent during resolution.

---

## 2. Reporter Formatting

### 2.1 Period-less reporters (`NY3d`, `AD3d`, `Misc.3d`)

NY Tanbook drops periods entirely:

| Tanbook | Bluebook |
|---|---|
| `NY3d` | `N.Y.3d` |
| `AD3d` | `App. Div. 3d` |
| `Misc.3d` | `Misc. 3d` |

**Status**: `casePatterns.state-reporter` is broad enough to match these; reporter-DB has `NY3d`, `AD3d`, etc. as variations. Confirmed working in current tests.

### 2.2 Compound reporters with no internal whitespace

```
Cal.App.4th     (CSM)
Mass.App.Ct.    (Mass.)
N.Y.S.2d        (NY in non-Tanbook contexts)
```

**Status**: `COMMON_REPORTERS` in `extractCase.ts` lists `So. 2d` (with space) but not `So.2d`. Reporter-DB variations cover this, but the **confidence-boost path** in extractCase may miss the no-space variant, lowering scores on otherwise valid citations.

### 2.3 Reporter with edition number ordinals

```
F.2d / F.3d / F.4th
Cal.5th / Cal.App.5th
N.Y.3d / NY3d
```

**Status**: `casePatterns.federal-reporter` enumerates `F.2d|F.3d|F.4th` but **not** future editions (`F.5th`). State edition suffixes are handled by the broad state-reporter regex, but the explicit list approach is fragile — when courts move to `F.5th` or `Cal.6th`, the federal-reporter regex will break.

### 2.4 Slip opinion forms

The major patterns:

| Form | Example |
|---|---|
| `Slip Op.` (generic) | `slip op. at 5` |
| Westlaw | `2020 WL 12345, at *3` |
| LEXIS | `2020 U.S. Dist. LEXIS 12345` |
| NY Slip Op | `2024 NY Slip Op 51192[U]` |
| Ohio | `2024-Ohio-764` |

**Status**: `neutralPatterns.westlaw` and `neutralPatterns.lexis` cover WL/LEXIS. `NY Slip Op` is in reporters-db but the regex pattern in `casePatterns.state-reporter` requires a *numeric* volume followed by a reporter; for `2024 NY Slip Op 51192`, the `2024` is the year-prefix (not a volume), and the reporter spans two tokens. Currently passes through `casePatterns.state-reporter` only because the volume `2024` is accepted as a volume; semantically this is wrong (it's a year-of-decision, not a volume).

### 2.5 Native vs reporter-based forms

Many states require BOTH the neutral cite AND the regional reporter:

```
Kelly v. Estate of Edwards, 2009 Ark. 78, at 2, 301 S.W.3d 156, 157
Smith v. Ohio State Univ., 2024-Ohio-764, ¶ 2, 232 N.E.3d 1
```

**Status**: eyecite-ts will likely extract *two separate citations* for the same case. This is technically correct (the parallel-cite detector in `detectParallel.ts` should link them), but it leaves room for resolution mismatches if the parallel detector's heuristics miss the link.

---

## 3. Neutral / Public-Domain Citations

### 3.1 Full inventory

A comprehensive matrix of states that have adopted neutral citation, along with format strings:

| Jurisdiction | Format String | Example |
|---|---|---|
| **Arkansas Supreme** | `YYYY Ark. NNN` | `2009 Ark. 78` |
| **Arkansas Court of Appeals** | `YYYY Ark. App. NNN` | `2009 Ark. App. 93` |
| **Colorado** | `YYYY CO NN` | `2020 CO 12` |
| **Colorado App.** | `YYYY COA NN` | `2020 COA 5` |
| **Illinois Supreme** | `YYYY IL NNNNNN` | `2011 IL 102345` |
| **Illinois Appellate** | `YYYY IL App (Nd) NNNNNN[-U]` | `2011 IL App (1st) 101234` |
| **Louisiana (date-based)** | `YY-NNNN (La. App. Nd Cir. MM/DD/YY)` | `07-393 (La. App. 3d Cir. 10/3/07)` |
| **Maine** | `YYYY ME NN` | `2020 ME 15` |
| **Mississippi** | `YYYY-CT-NNNNN-XX` | `2010-CT-01234-SCT` |
| **Montana** | `YYYY MT N` | `2020 MT 12` |
| **New Hampshire** | `YYYY N.H. N` | `2024 N.H. 1` |
| **New Mexico Supreme** | `YYYY-NMSC-NNN` | `2010-NMSC-007` |
| **New Mexico App.** | `YYYY-NMCA-NNN` | `2005-NMCA-078` |
| **NM Cert.** | `YYYY-NMCERT-NNN` | `2010-NMCERT-001` |
| **North Carolina** | `YYYY-NCSC-N` / `YYYY-NCCOA-N` | `2020-NCSC-118` |
| **North Dakota** | `YYYY ND N` | `2020 ND 12` |
| **ND App.** | `YYYY ND App N` | `2020 ND App 5` |
| **Ohio (WebCite)** | `YYYY-Ohio-NNNN` | `2024-Ohio-764` |
| **Oklahoma Supreme** | `YYYY OK NN` | `2020 OK 21` |
| **Oklahoma Civ App** | `YYYY OK CIV APP NN` | `2020 OK CIV APP 67` |
| **Oklahoma Cr.** | `YYYY OK CR N` | `2019 OK CR 1` |
| **Pennsylvania** | `YYYY PA Super NN` (also `YYYY PA NN`) | `2020 PA Super 15` |
| **South Dakota** | `YYYY SD NN` | `2020 SD 12` |
| **Tennessee** | `YYYY Tenn. NN` | uses Tenn. directly |
| **Utah** | `YYYY UT NN` | `2020 UT 12` |
| **Utah App.** | `YYYY UT App NN` | `2020 UT App 5` |
| **Vermont** | `YYYY VT N` | `2003 VT 4` |
| **Wisconsin Supreme** | `YYYY WI NN` | `2004 WI 74` |
| **Wisconsin App.** | `YYYY WI App N` | `2020 WI App 12` |
| **Wyoming** | `YYYY WY NN` | `2020 WY 12` |
| **NY Slip Op** | `YYYY NY Slip Op NNNNN[(U)]` | `2024 NY Slip Op 51192[U]` |

### 3.2 Quirks by format family

#### Hyphenated (NM, Ohio, NC, MS)

These use `YYYY-XXX-NNN` rather than `YYYY XXX NNN`:

```
2010-NMSC-007
2024-Ohio-764
2020-NCSC-118
```

**Status**: reporters-db has the `format_neutral` and `format_neutral_3_4` regex templates. `casePatterns.state-vendor-neutral` is `\b(\d{4})\s+([A-Z]{2}(?:\s+App\.?)?)\s+(\d+)\b` — **whitespace-separated only**. Hyphenated forms are unrecognized.

**Failing inputs**:
```
The court held in 2010-NMSC-007 that...
State v. Dickert, 2012-NMCA-004, ¶ 15.
Smith v. Ohio State Univ., 2024-Ohio-764.
```

#### Multi-word court (`IL App (1st)`, `OK CIV APP`, `WI App`)

The pattern `[A-Z]{2}(?:\s+App\.?)?` allows one optional `App` token, but doesn't handle:
- `IL App (1st)` — parenthesized district number
- `OK CIV APP` — three tokens
- `WI App` — handled
- `ND App` — handled

**Failing input**:
```
People v. Doe, 2011 IL App (1st) 101234, ¶ 15
Stewart v. Gonzalez, 2020 OK CIV APP 67, ¶ 2
```

The current regex requires `[A-Z]{2}` for court, so `IL App` matches (two letters), but `(1st)` is treated as part of the *next* token (likely a court parenthetical) and the number `101234` is mis-bound.

#### Date-in-number (Louisiana)

Louisiana uses docket numbers inside the citation:

```
Herff Jones, Inc. v. Girouard, 07-393, p. 2 (La. App. 3d Cir. 10/3/07), 966 So. 2d 1127, 1130
```

The `07-393` is a docket number; `(La. App. 3d Cir. 10/3/07)` has a slash-date.

**Status**: Completely unsupported. `parseParenthetical` is hard-coded to look for `Mon. D, YYYY` or `YYYY`. Slash-dates fail the date check.

#### `(U)` and `[U]` markers (NY Slip Op)

NY uses both forms (parens for older, brackets for newer):

```
2007 N.Y. Slip Op. 52377(U)
2024 NY Slip Op 64325(U)
2024 NY Slip Op 51192[U]
```

reporters-db has variation patterns for both; eyecite-ts likely passes them through. But the `(U)` will probably be misinterpreted as a "blank page" placeholder in the `BLANK_PAGE_REGEX` check, and the page number `52377` will be stripped to `5237` or rejected entirely.

### 3.3 Paragraph references `¶ N` (CRITICAL gap)

Every neutral-citation jurisdiction uses **paragraph numbers, not page numbers**, for pin cites:

```
People v. Leach, 2012 IL 111534, ¶ 5
Cole, 2004 WI 74, ¶ 18
State v. LeClaire, 2003 VT 4, ¶ 9
2024 N.H. 1, ¶¶ 5-6
2024-Ohio-764, ¶ 2
Stewart v. Gonzalez, 2020 OK CIV APP 67, ¶ 2
```

**Status**: `PINCITE_REGEX`, `LOOKAHEAD_PINCITE_REGEX`, and `parsePincite` only recognize `at NN`, `at *NN`, or `, NN`. The `¶` symbol is unknown. **Every paragraph-pin-cite is silently dropped**, leaving `pincite = undefined` for neutral citations.

This is the single highest-impact bug in the parser for neutral-state jurisdictions.

**Failing inputs** (massive class):

```
People v. Doe, 2011 IL App (1st) 101234, ¶ 15
State v. Smith, 2020-NMSC-001, ¶ 22
Cole, 2004 WI 74, ¶ 18
Smith v. Ohio State Univ., 2024-Ohio-764, ¶ 2
2024 N.H. 1, ¶¶ 5-6      (paragraph range with double-pilcrow)
```

---

## 4. Pincite Conventions

### 4.1 Inventory of pincite forms

| Form | Meaning | Bluebook | Status |
|---|---|---|---|
| `at 105` | page 105 | yes | supported |
| `at *5` | star-page 5 (slip/Westlaw/LEXIS) | yes | supported |
| `at *5-*7` | star-page range | yes | supported (#201) |
| `, 105` | page 105 (post-reporter) | yes | supported |
| `, 105 n.5` | page 105 footnote 5 | yes | supported |
| `, 105 nn.5-7` | page 105 footnotes 5-7 | yes | supported (#202) |
| `at p. 105` | page 105 (CSM) | CSM-only | **unsupported** |
| `at pp. 105-110` | pages 105-110 (CSM) | CSM-only | **unsupported** |
| `at ¶ 12` | paragraph 12 | neutral cites | **unsupported (CRITICAL)** |
| `, ¶ 12` | paragraph 12 (post-reporter) | neutral cites | **unsupported** |
| `, ¶¶ 12-15` | paragraph range | neutral cites | **unsupported** |
| `¶ 12` (no comma/at) | bare paragraph (after neutral cite) | neutral cites | **unsupported** |
| `at 105 n.5` | page+footnote combined | yes | supported |
| `at 105, 110` | multiple discrete pages | yes | partial (`PINCITE_SKIP_REGEX` handles outer loop, but `PinciteInfo` stores only one page) |
| `passim` | "throughout" | yes (rare in pincites) | unsupported |
| `at *3, *9-12` | mixed star pincites | Westlaw | partial |

### 4.2 California `at p./pp.` (high frequency in CA briefs)

```
(Smith, supra, 50 Cal.3d at p. 115)
Smith, supra, at p. 115
Smith, supra, at pp. 115-117
```

**Status**: `LOOKAHEAD_PINCITE_REGEX` and `SUPRA_PATTERN` both require `at <number>`, never `at p. <number>`. Every CA `supra at p.` reference produces an incomplete supra match.

### 4.3 Multiple discrete pincites

```
See Roe v. Wade, 410 U.S. 113, 115, 153 (1973)
```

`PinciteInfo.page` is a single number. The second pincite is silently dropped. This is technically a multi-page citation, not a range.

### 4.4 Bare paragraph pincite as continuation

For neutral cites, pincite-only short forms also appear:

```
Leach, 2012 IL 111534, ¶ 5. The court further explained, id. ¶ 12, that...
```

`ID_PATTERN` is `[Ii]d\.(?:,?\s+at\s+(\*?\d+(?:...))?)`. The `¶ 12` after `id.` is not at all anticipated.

---

## 5. Signal Phrases

### 5.1 Inventory

In Bluebook order:
- (no signal) — direct support
- `E.g.,` — italicized
- `Accord` — italicized
- `See` — italicized
- `See also` — italicized
- `Cf.` — italicized
- `Compare ... with ...` — italicized
- `Contra` — italicized
- `But see` — italicized
- `But cf.` — italicized
- `See generally` — italicized

### 5.2 Combined signals: `See, e.g.,`

The Bluebook rules: `See, e.g.,` — the *first* comma is italicized (part of the signal); the trailing comma is NOT italicized.

**Status**: `VALID_SIGNALS` in `extractCase.ts` is `["see", "see also", "see generally", "cf", "but see", "but cf", "compare", "accord", "contra"]`. **Missing: `e.g.`, `see, e.g.`, `but see, e.g.`, `compare ... with ...`**. The combined signal "See, e.g.," is treated as plain `See` with a stray `e.g.,` that confuses the case-name regex.

**Failing inputs**:
```
See, e.g., Smith v. Jones, 500 F.2d 123 (9th Cir. 2020).
But see, e.g., id. at 130.
Compare Smith v. Jones, 500 F.2d 123 (9th Cir. 2020), with Doe v. Roe, 600 F.2d 200 (2d Cir. 2021).
```

The case-name backward search may fail to identify `Smith v. Jones` as the citation case name because the `e.g.,` is between the signal and the case name.

### 5.3 Signal as verb (not italicized)

```
The Court has held this rule applies. See Smith, 410 U.S. at 113.
The Smith court relied on Jones. The court there held in Doe, 500 F.2d at 125, that...
```

When `see` is used as a *verb* in a sentence ("the court did not see fit to"), it should NOT be parsed as a signal. eyecite-ts's signal-strip regex is anchored on whitespace which mostly prevents this, but mid-sentence `see` after a period can still trigger false-positive signal detection.

### 5.4 String-citation signals across multiple cites

```
See Smith, 410 U.S. at 113; see also Doe, 500 F.2d at 130; Jones, 600 F.2d at 200.
```

The semicolons are signal separators within a string cite. Inside `detectStringCites.ts`, this should be a clue that the citations are linked. **Status**: existing partial support via `detectStringCites.ts`.

### 5.5 Compare/With

```
Compare Smith, 100 U.S. 1 (2000), with Jones, 200 U.S. 2 (2001), and Doe, 300 U.S. 3 (2002).
```

The `with` and `and` are connectors *between* cited authorities, all italicized in Bluebook. eyecite-ts treats `with` and `and` as random text between citations, which is mostly safe — but the *grouping* (these are all comparison authorities for the same proposition) is lost.

---

## 6. Subsequent History

### 6.1 Federal Bluebook history (Table T8)

| Abbreviation | Meaning |
|---|---|
| `aff'd` | affirmed |
| `aff'g` | affirming |
| `rev'd` | reversed |
| `rev'g` | reversing |
| `vacated` | vacated |
| `vacating` | vacating |
| `modified` | modified |
| `cert. denied` | certiorari denied |
| `cert. granted` | certiorari granted |
| `cert. dismissed` | certiorari dismissed |
| `reh'g denied` | rehearing denied |
| `mandamus denied` | mandamus denied |
| `overruled by` | overruled by |
| `superseded by` | superseded by statute |
| `abrogated by` | abrogated |
| `disapproved by` | disapproved |

**Status**: `SIGNAL_TABLE` in `extractCase.ts` covers most of these (lines 167-214). The `SubsequentHistoryEntry` array supports chaining.

### 6.2 Texas writ/petition history (Greenbook Rule 6, Table)

This is where Bluebook diverges from state house style. Texas writ history sits **inside the court-and-year parenthetical**, not as a separate appended phrase:

| Abbreviation | Meaning |
|---|---|
| `writ ref'd` | writ refused (writ of error refused — Texas pre-1997) |
| `writ ref'd n.r.e.` | writ refused, no reversible error |
| `writ ref'd w.m.j.` | writ refused, want of merit |
| `writ dism'd` | writ dismissed |
| `writ dism'd w.o.j.` | writ dismissed, want of jurisdiction |
| `writ denied` | writ denied |
| `no writ` | no writ filed |
| `pet. ref'd` | petition refused |
| `pet. denied` | petition denied |
| `pet. dism'd` | petition dismissed |
| `no pet.` | no petition filed |
| `no pet. h.` | no petition history |
| `pet. granted` | petition granted |
| `pet. for review filed` | petition for review filed |

**Status**: `SIGNAL_TABLE` has no entries for writ/petition history. The current parser will likely accept the court-and-year, then drop the writ-history fragment as junk text.

**Failing inputs**:
```
Smith v. State, 100 S.W.3d 1 (Tex. App.—Houston [1st Dist.] 2002, writ ref'd n.r.e.)
Brown v. State, 200 S.W.3d 2 (Tex. App.—Dallas 2010, no pet.)
Wilson v. State, 300 S.W.3d 3 (Tex. App.—Austin 2018, pet. ref'd)
```

### 6.3 California history

CA briefs use abbreviations not in Bluebook Table T8:

| Abbreviation | Meaning |
|---|---|
| `review den.` | review denied |
| `review granted` | review granted (CA Supreme Court) |
| `disapproved on other grounds` | disapproved on other grounds in [citation] |
| `cert. denied` | (overlap with federal) |

**Status**: `SIGNAL_TABLE` doesn't include "review denied" or "review granted".

### 6.4 Multi-stage history chains

```
Smith v. Jones, 100 F.2d 100 (2d Cir. 1990), aff'd, 200 U.S. 1 (1992), overruled by Doe v. Roe, 300 U.S. 50 (2010).
```

Current `SubsequentHistoryEntry[]` supports a chain of follow-ons, but the parser stops after one signal. The chain `aff'd, ..., overruled by ...` requires recursive parsing of the same citation slot.

---

## 7. Parallel Citation Ordering

### 7.1 Official vs unofficial first

Bluebook practitioner format requires **state reporter first, regional reporter second**:

```
People v. Smith, 50 Cal.3d 100, 266 Cal.Rptr. 569 (1990)
```

But Bluebook **academic** format prefers the regional reporter only (omit state if regional is available). California Style Manual requires:
- Cal. reporter first
- Cal.Rptr. parallel in **brackets** (not parens)

```
People v. Smith (1990) 50 Cal.3d 100 [266 Cal.Rptr. 569]
```

**Status**: `detectParallel.ts` exists but the bracket-style CA parallel cite is not recognized — the brackets are interpreted as a Tanbook year, then fail because the contents aren't a 4-digit year.

### 7.2 Three-way parallels (SCOTUS, older opinions)

```
Roe v. Wade, 410 U.S. 113, 93 S. Ct. 705, 35 L. Ed. 2d 147 (1973)
```

**Status**: Currently extracted as three separate citations and linked via `detectParallel.ts`. Confidence on these depends on adjacency heuristics that may break across line wraps.

### 7.3 Native + regional (neutral states)

```
Kelly v. Estate of Edwards, 2009 Ark. 78, at 2, 301 S.W.3d 156, 157
Stewart v. Gonzalez, 2020 OK CIV APP 67, ¶ 2, 481 P.3d 285, 286
```

**Status**: Two separate citations extracted. The `, at 2,` between them is interpreted as a pincite on the neutral cite (`Ark. 78, at 2`), which is *correct* for the Ark. neutral. But then `301 S.W.3d 156` is a fresh extraction with no case-name attached — the case-name backward search will not skip over the prior neutral cite to find `Kelly v. Estate of Edwards`.

---

## 8. Short-Form Conventions

### 8.1 Bluebook variants

| Form | Example |
|---|---|
| `Id.` | `Id.` |
| `Id. at <page>` | `Id. at 113` |
| `Id. at <page> n.N` | `Id. at 113 n.5` |
| `Ibid.` | `Ibid.` (UK/older) |
| `<name>, <vol> <reporter> at <page>` | `Smith, 410 U.S. at 113` |
| `<name>, supra` | `Smith, supra` |
| `<name>, supra at <page>` | `Smith, supra, at 113` |
| `<name>, supra note <N>` | `Smith, supra note 15` |
| `supra note <N>` | `supra note 15` (standalone) |
| `supra at <page>` | `supra at 15` |
| `infra note <N>` | `infra note 15` |

**Status**: All `Id.`, `Ibid.`, `supra` variants are in `shortForm.ts`. `infra` is **NOT** in any pattern — every `infra` reference is dropped.

### 8.2 California short forms

CSM idioms (Bluebook avoids):

```
(Smith, supra, 50 Cal.3d at p. 115)
Smith, supra, at p. 115
```

**Status**: `SUPRA_PATTERN` doesn't match `at p. <page>`. CA briefs will lose supra pincites.

### 8.3 Neutral-cite short forms with `¶`

```
Leach, supra, ¶ 5
Cole, 2004 WI 74 at ¶ 18
```

**Status**: Unsupported (see Section 4.3).

### 8.4 Hybrid short forms

```
30 NY3d at 595, n. 2
597 U.S., at 721
```

NY uses `, n. 2` (with comma-space). Federal uses `597 U.S., at 721` (comma before `at`). Both partially handled.

---

## 9. Non-Standard / Jurisdiction-Specific Signals

### 9.1 Party identifiers within case names

| Token | Meaning | Treatment |
|---|---|---|
| `et al.` | "and others" | omit per Bluebook |
| `a/k/a` | "also known as" | omit |
| `d/b/a` | "doing business as" | omit |
| `f/k/a` | "formerly known as" | omit |
| `n/k/a` | "now known as" | omit |

**Status**: `PARTY_NAME_CONNECTORS` includes `et`, `al`, but does **not** include the slashed forms. Case names like `Acme Corp. f/k/a Beta Inc. v. Jones` would either truncate the name at the first slash or capture random downstream tokens.

### 9.2 Procedural prefixes

| Prefix | Meaning |
|---|---|
| `In re` | "in the matter of" |
| `In the Matter of` | (longer form) |
| `Ex parte` | "from one party" |
| `Matter of` | (NY-specific) |
| `Estate of` | |
| `State ex rel.` | "on relation of" |
| `United States ex rel.` | qui tam |
| `Application of` | |
| `Petition of` | |
| `Commonwealth ex rel.` | (PA-specific, MA-specific) |
| `for the use of` | (older form, rare) |

**Status**: `PROCEDURAL_PREFIX_REGEX` covers the common ones explicitly. Missing: `Commonwealth ex rel.`, `for the use of`, `On Petition of`, `In the Interest of` (juvenile/family cases), `Adoption of`.

### 9.3 Weight-of-authority parentheticals

| Phrase | Meaning |
|---|---|
| `(per curiam)` | unsigned opinion |
| `(en banc)` | full-court hearing |
| `(in banc)` | older spelling of en banc |
| `(plurality opinion)` | |
| `(memorandum)` / `(mem.)` | summary memorandum |
| `(unpublished table decision)` | |
| `(2-1 decision)` | split vote |
| `(<Justice>, J., concurring)` | concurrence |
| `(<Justice>, J., dissenting)` | dissent |
| `(<Justice>, J., concurring in part and dissenting in part)` | hybrid |

**Status**: `parseParenthetical` recognizes `en banc` and `per curiam` only. The Justice-name patterns (`Brandeis, J.`, `Kennedy, J., dissenting`) are unsupported. The `(mem.)` / `(plurality opinion)` markers are unsupported.

---

## 10. Slip-Opinion + Electronic Decisions

### 10.1 Westlaw formats

```
2020 WL 12345                          (basic)
2020 WL 12345, at *5                   (with star pincite)
2020 WL 12345, at *5, *9-12            (mixed pincites)
2020 WL 12345 (E.D. Va. May 1, 2020)   (with court+date)
```

**Status**: `neutralPatterns.westlaw` matches the volume-WL-page form. The `extractNeutral` extractor pulls star pincites via `NEUTRAL_PINCITE_LOOKAHEAD`. Mixed-page pincites (`*5, *9-12`) are partially supported.

### 10.2 LEXIS formats

```
2020 U.S. LEXIS 5000
2020 U.S. App. LEXIS 12345
2020 U.S. Dist. LEXIS 67890
2020 Cal. LEXIS 1000           (state LEXIS)
2020 N.Y. Misc. LEXIS 500      (NY trial-court LEXIS)
```

**Status**: `neutralPatterns.lexis` is `(\d{4})\s+U\.S\.(?:\s+(?:App|Dist)\.)?\s+LEXIS\s+(\d+)`. **Federal-only**. Every state LEXIS citation (Cal. LEXIS, N.Y. LEXIS, Tex. LEXIS, etc.) is unsupported.

**Failing inputs**:
```
Smith v. Jones, 2020 Cal. LEXIS 1000 (Apr. 15, 2020)
Brown v. State, 2020 Tex. App. LEXIS 5000 (Tex. App.—Dallas May 1, 2020)
Doe v. Roe, 2020 N.Y. Misc. LEXIS 500 (Sup. Ct., NY County June 1, 2020)
```

### 10.3 NY Slip Op format

```
2024 NY Slip Op 51192[U]
2024 NY Slip Op 51192(U), at *2
Pickard v. Tarnow, No. 116095/06, 2007 N.Y. Slip Op. 52377(U), at *2 (Sup. Ct. Dec. 3, 2007)
```

**Status**: NY Slip Op is in reporters-db as `state` (not `neutral`). The `[U]` / `(U)` suffix on the page is partially handled by reporters-db variations. But:
- The `[U]` markers may collide with `BLANK_PAGE_REGEX`.
- The pincite `at *2` should be picked up by `NEUTRAL_PINCITE_LOOKAHEAD`, but the citation might extract through the case-pattern path, not the neutral-pattern path.

### 10.4 Other vendor neutrals

| Vendor | Format | Status |
|---|---|---|
| **WestlawNext** | identical to WL | supported |
| **Lexis+** | identical to LEXIS | supported |
| **CourtListener / FreeLaw** | none (uses citation strings) | n/a |
| **Bloomberg Law** | `2020 BL 12345` | **unsupported** |
| **Fastcase** | `2020 FC 12345` | **unsupported** |

---

## Top Parsing Risks for eyecite-ts (Prioritized)

These are concrete LIBRARY IMPROVEMENT TARGETS, ranked by frequency × impact in real-world corpora.

### Priority 1 — High-frequency, blocks accurate pincite extraction

1. **Paragraph pincites (`¶ N`, `¶¶ N-M`)** are unrecognized in all pincite regexes. This affects every neutral citation in IL, WI, UT, MT, WY, SD, ND, NM, OH, VT, NH, NC, OK, CO. Probably the single highest-impact bug.
2. **Hyphenated neutral cites (`2010-NMSC-007`, `2024-Ohio-764`)** are unrecognized by `state-vendor-neutral` pattern. Affects all NM, OH, NC, MS cases.
3. **California year-first format `(YYYY) vol Cal.Nth page`** is completely unrecognized.
4. **Texas writ/petition history inside court parenthetical** (`writ ref'd n.r.e.`, `no pet.`) is dropped.
5. **State LEXIS (Cal. LEXIS, Tex. App. LEXIS, NY Misc. LEXIS)** is unrecognized; only `U.S. LEXIS` patterns match.

### Priority 2 — Medium-frequency, breaks adjacent extraction

6. **Multi-word neutral court designations (`IL App (1st)`, `OK CIV APP`)** are partially parsed; the parenthesized district causes mis-binding.
7. **NY Slip Op `[U]`/`(U)` markers** collide with `BLANK_PAGE_REGEX` and break page extraction in edge cases.
8. **Louisiana docket-number format `07-393 (La. App. 3d Cir. 10/3/07)`** is completely unsupported.
9. **Combined signals (`See, e.g.,`)** confuse the case-name backward search.
10. **CSM pincite `at p./pp.`** drops every CA short-form pincite.

### Priority 3 — Lower-frequency but explicit gaps

11. **`infra` references** are dropped (no pattern in `shortForm.ts`).
12. **`F.5th`, `Cal.6th`, future edition numbers** will break the explicit federal-reporter enumeration when courts adopt new editions.
13. **Justice-attribution parentheticals (`Brandeis, J., dissenting`)** are unsupported.
14. **CA `review denied/granted` history signals** are unsupported.
15. **Party identifiers `d/b/a`, `f/k/a`, `n/k/a`, `a/k/a`** break case-name extraction.
16. **Procedural prefixes `Commonwealth ex rel.`, `In the Interest of`** are unsupported.

---

## Recommendations for Library Improvements

### A. Pincite parser refactor (impacts P1.1, P2.10, P3.11)

Replace the current pincite regex zoo with a small grammar:

```
PINCITE  := SEPARATOR? POSITION (RANGE)? (FOOTNOTE)?
SEPARATOR := "at" | "," ("at")?
POSITION := PAGE | STAR_PAGE | PARAGRAPH | PAGE_WORD
PAGE     := \d+
STAR_PAGE := "*" \d+
PARAGRAPH := ("¶" | "¶¶") \s* \d+
PAGE_WORD := "p." \s* \d+ | "pp." \s* \d+
RANGE    := "-" POSITION
FOOTNOTE := ("n." | "nn." | "note") \s* \d+ ("-" \d+)?
```

Update `PinciteInfo` to include a `kind` field:

```ts
export interface PinciteInfo {
  kind: "page" | "starPage" | "paragraph"  // NEW
  page: number          // legacy: stays as numeric for backward compat
  endPage?: number
  // ...
}
```

This single change fixes paragraph pincites, CSM `p./pp.` pincites, and gives the resolver a way to distinguish page vs paragraph for short-form binding.

### B. Hyphenated neutral pattern (P1.2)

Extend `casePatterns.state-vendor-neutral` to accept hyphens:

```
\b(\d{4})[-\s]+([A-Z]{2,}(?:\s+App\.?|\s+CIV\s+APP|\s+CR)?)[-\s]+(\d+)\b
```

Or add a separate pattern `state-vendor-neutral-hyphenated` that captures the NM/Ohio/NC format explicitly. The reporter-DB already has the canonical formats; eyecite-ts just needs to recognize the surface form.

### C. California year-first detector (P1.3)

Add a new pattern:

```
\b([A-Z][A-Za-z.'\s-]+?(?:\s+v\.?\s+[A-Z][A-Za-z.'\s-]+?))\s+\((\d{4})\)\s+(\d+)\s+(Cal\.(?:App\.|Rptr\.)?\d*(?:th|d|st|nd|rd)?)\s+(\d+)(?:\s*,\s*(\d+))?
```

Reorder the standard pattern to handle year-before-volume. Tag the resulting citation with a `style: "csm"` flag.

### D. Texas writ-history extension (P1.4)

Add writ-history signals to `SIGNAL_TABLE`:

```ts
[/^writ\s+ref'?d\s+n\.r\.e\./i, "writ_refused_nre"],
[/^writ\s+ref'?d\s+w\.m\.j\./i, "writ_refused_wmj"],
[/^writ\s+ref'?d\b/i, "writ_refused"],
[/^writ\s+dism'?d\s+w\.o\.j\./i, "writ_dismissed_woj"],
[/^writ\s+dism'?d\b/i, "writ_dismissed"],
[/^writ\s+denied\b/i, "writ_denied"],
[/^no\s+writ\b/i, "no_writ"],
[/^pet\.\s+ref'?d\b/i, "pet_refused"],
[/^pet\.\s+denied\b/i, "pet_denied"],
[/^pet\.\s+dism'?d\b/i, "pet_dismissed"],
[/^no\s+pet\.\s+h\.\b/i, "no_pet_history"],
[/^no\s+pet\.\b/i, "no_pet"],
```

Update `parseParenthetical` to allow a trailing writ/petition clause after a second comma.

### E. State LEXIS pattern (P1.5)

Generalize `neutralPatterns.lexis`:

```
\b(\d{4})\s+([A-Z][A-Za-z.\s]+?)\s+LEXIS\s+(\d+)\b
```

Validate the court abbreviation against reporters-db; reject if no jurisdiction matches.

### F. Multi-word neutral court (P2.6)

Extend the neutral pattern's court group to allow:

```
(IL App \(\d+(?:st|nd|rd|th)\)|OK CIV APP|OK CR|OK AG|OK JUD ETH|...)
```

Or maintain an explicit list (currently scattered in reporters-db) of vendor-neutral court tokens that may contain parentheses or multiple uppercase words.

### G. Bracket-year `[U]`/`(U)` slip-op support (P2.7)

Update `BLANK_PAGE_REGEX` to be anchored, or move the U-marker recognition into a separate "page suffix" parser. Tag the resulting citation with `unpublished: true` for downstream consumers.

### H. CSM bracket parallel cite (P2.10)

Add a parallel-cite detector that recognizes `[<vol> <reporter> <page>]` as a CA-style parallel rather than a Tanbook year. Disambiguation: brackets containing a 4-digit number alone = year; brackets containing reporter format = parallel cite.

### I. Signal phrase expansion (P2.9)

Add to `VALID_SIGNALS`:

```ts
"e.g.",
"see, e.g.",
"but see, e.g.",
"compare",
"with",
```

Update `SIGNAL_STRIP_REGEX` to recognize trailing `e.g.,` after `see`.

### J. `infra` pattern (P3.11)

Add to `shortForm.ts`:

```ts
export const INFRA_PATTERN: RegExp =
  /\b([A-Z][a-zA-Z'']+\.?(?:\s+v\.?\s+[A-Z][a-zA-Z'']+\.?)*)?\s*,?\s+infra(?:\s+note\s+(\d+))?(?:,?\s+at\s+(\*?\d+))?/g
```

### K. Reporter edition future-proofing (P3.12)

Replace the explicit enumeration `F\.|F\.2d|F\.3d|F\.4th` with `F\.(?:\d+(?:st|nd|rd|th)|\dd)?`:

```
F\.(?:2d|3d|4th|5th|6th|7th|8th|9th|\d+(?:st|nd|rd|th))?
```

Similarly for Cal., A., P., etc.

### L. Justice-attribution parsing (P3.13)

Extend `parseParenthetical` to recognize:

```
<Surname>, J\.,?\s+(concurring|dissenting|concurring in (?:the )?judgment|...)
```

Tag with `disposition: "concurrence"` / `"dissent"` etc.

### M. Party identifier handling (P3.15)

Treat `d/b/a`, `f/k/a`, `n/k/a`, `a/k/a` as **transparent** in the case-name regex — match them as multi-character glue without splitting the name.

### N. Procedural prefix expansion (P3.16)

Add to `PROCEDURAL_PREFIX_REGEX`:

```
Commonwealth ex rel.
In the Interest of
Adoption of
In re Marriage of
Conservatorship of
Guardianship of
```

---

## Test cases that would currently fail

Each test below targets a distinct quirk; suggested as fixtures for `tests/integration/`:

```typescript
// 1. Paragraph pincite (CRITICAL)
const t1 = "People v. Doe, 2011 IL App (1st) 101234, ¶ 15 (Smith, J., concurring)."
// expected: type=neutral, court="IL App (1st)", documentNumber=101234, pincite=15 (kind=paragraph)

// 2. Hyphenated NM neutral
const t2 = "State v. Dickert, 2012-NMCA-004, ¶ 8."
// expected: type=neutral, court="NMCA", documentNumber=4, pincite=8 (kind=paragraph)

// 3. Hyphenated Ohio webcite
const t3 = "Smith v. Ohio State Univ., 2024-Ohio-764, ¶ 2, 232 N.E.3d 1."
// expected: 2 citations linked via parallel detector

// 4. CSM year-first
const t4 = "The court relied on People v. Smith (1990) 50 Cal.3d 100, 115 to reject."
// expected: type=case, caseName="People v. Smith", year=1990, pincite=115

// 5. CSM bracket parallel
const t5 = "People v. Smith (1990) 50 Cal.3d 100, 115 [266 Cal.Rptr. 569, 575]."
// expected: 2 case citations, linked as parallel

// 6. CSM at-p. pincite
const t6 = "Smith, supra, at p. 115."
// expected: supra citation, pincite=115

// 7. Texas writ history (most common)
const t7 = "Brown v. State, 200 S.W.3d 2, 5 (Tex. App.—Dallas 2010, no pet.)."
// expected: subsequentHistory=[{signal: "no_pet"}]

// 8. Texas writ history with em-dash + city + bracket
const t8 = "Smith v. State, 100 S.W.3d 1 (Tex. App.—Houston [1st Dist.] 2002, writ ref'd n.r.e.)."
// expected: court="Tex. App.—Houston [1st Dist.]", subsequentHistory=[{signal: "writ_refused_nre"}]

// 9. State LEXIS
const t9 = "See Smith v. Jones, 2020 Cal. LEXIS 1000, at *5 (Apr. 15, 2020)."
// expected: type=neutral, court="Cal. LEXIS"

// 10. NY Slip Op with [U] marker and bracket year
const t10 = "Pickard v. Tarnow, 2007 NY Slip Op 52377(U), at *2 [Sup Ct, NY County 2007]."
// expected: type=case (or neutral), unpublished=true, pincite={page:2, starPage:true}

// 11. Combined signal
const t11 = "See, e.g., Smith v. Jones, 500 F.2d 123 (9th Cir. 2020); see also id. at 130."
// expected: citation with signal="see, e.g.", id citation following

// 12. Bare paragraph after id.
const t12 = "Leach, 2012 IL 111534, ¶ 5. The court further explained, id. ¶ 12, that..."
// expected: id citation with pincite=12 (kind=paragraph)

// 13. Infra
const t13 = "The rule is discussed at length infra note 22."
// expected: infra citation, noteNumber=22

// 14. Justice attribution
const t14 = "Smith v. Jones, 410 U.S. 113, 130 (1973) (Brennan, J., dissenting)."
// expected: parsedParen={disposition: "dissent", justice: "Brennan"}

// 15. f/k/a in case name
const t15 = "Acme Corp. f/k/a Beta Inc. v. Jones, 500 F.3d 100 (2d Cir. 2020)."
// expected: caseName="Acme Corp. f/k/a Beta Inc. v. Jones" (kept intact)

// 16. Multi-stage history
const t16 = "Smith v. Jones, 100 F.2d 100 (2d Cir. 1990), aff'd, 200 U.S. 1 (1992), overruled by Doe v. Roe, 300 U.S. 50 (2010)."
// expected: citation with subsequentHistory chain of length 2, plus separate Doe citation

// 17. CA review denied
const t17 = "People v. Smith (1990) 50 Cal.3d 100, review den. (May 15, 1990)."
// expected: subsequentHistory=[{signal: "review_denied"}]

// 18. Future edition
const t18 = "Smith v. Jones, 100 F.5th 200 (9th Cir. 2025)."
// expected: type=case, reporter="F.5th"

// 19. WL with mixed pincites
const t19 = "Doe v. Roe, 2020 WL 12345, at *5, *9-12 (D. Conn. May 1, 2020)."
// expected: type=neutral, pincite handled as multi-page

// 20. Louisiana docket-number format
const t20 = "Herff Jones, Inc. v. Girouard, 07-393, p. 2 (La. App. 3d Cir. 10/3/07), 966 So. 2d 1127, 1130."
// expected: citation linked to parallel So.2d, slash-date parsed as 2007-10-03
```

---

## Sources

- [Cornell — Basic Legal Citation](https://www.law.cornell.edu/citation/) (Peter Martin)
- [University of South Carolina — Universal Citation Guide](https://guides.law.sc.edu/universalcitation)
- [The Indigo Book](https://www.law.cornell.edu/citation/) — open-source Bluebook
- [California Style Manual 4th ed.](https://www.sdap.org/wp-content/uploads/downloads/Style-Manual.pdf)
- [NY Tanbook (2022 ed.)](https://nycourts.gov/reporter/Styman_menu.shtml)
- [Texas Greenbook](https://tarlton.law.utexas.edu/bluebook-legal-citation/greenbook)
- [Illinois Supreme Court Rules 6 and 23](https://courts.illinois.gov/SupremeCourt/Rules/)
- [New Mexico Rule 23-112 NMRA](https://supremecourt.nmcourts.gov/)
- [Ohio Supreme Court Writing Manual](https://www.supremecourt.ohio.gov/opinions-cases/opinions/writing-manual/)
- [reporters-db (Free Law Project)](https://github.com/freelawproject/reporters-db)
- [eyecite (Python parent project)](https://github.com/freelawproject/eyecite)
- [Free Law Project — Neutral Citations advocacy](https://free.law/advocacy/neutral-citations/)
