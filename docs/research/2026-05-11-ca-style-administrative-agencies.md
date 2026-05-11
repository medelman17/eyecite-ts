# California Administrative-Agency Citation Forms

**Date:** 2026-05-11
**Agent scope:** California administrative tribunals — decisions and orders from state regulatory bodies (WCAB, PUC, PERB, ALRB, OAH, OTA, BOE, Cal/OSHA, CARB, DPR, CalPERS, CalSTRS, DSS, SPB, AG opinions, DLSE/Labor Commissioner, FEHC).

**Repo:** `eyecite-ts` (TypeScript port of Python eyecite).

**Pattern surface audited:**
- `src/patterns/casePatterns.ts` — `federal-reporter`, `supreme-court`, `state-reporter` (the broad fallback)
- `src/patterns/neutralPatterns.ts` — Mississippi 4-segment, 3-segment hyphenated (NM/Ohio/NC), state vendor-neutral, Westlaw, LEXIS, public law, Federal Register, Statutes at Large, compact law review
- `src/extract/extractNeutral.ts` — parses tokenized neutral citations
- `data/reporters.json` — reporters-db (entries present: `Cal. Comp. Cases`, `Cal. WCC`, `Cal. I.A.C.`, `Ops.Cal.Atty.Gen.`)

---

## Summary

The eyecite-ts state-reporter regex is broad and **already catches three of the most common volume-reporter-page California admin forms with no code changes**:

| Form | Example | Status today |
|------|---------|---|
| WCAB / IAC reporter | `63 Cal. Comp. Cases 742`, `20 I.A.C. 20` | Tokenizes via `state-reporter` (reporter present in `reporters.json`) |
| AG opinions | `95 Ops.Cal.Atty.Gen. 1`, `107 Ops.Cal.Atty.Gen. 20` | Tokenizes via `state-reporter` (reporter present) |
| ALRB | `46 ALRB No. 3`, `21 ALRB No. 3` | Tokenizes via `state-reporter` BUT reporter is NOT in `reporters.json` (will pass through with low validation confidence) |
| FEHC | `FEHC Precedential Decs. 1990-1991, CEB 1, p. 26` | Partial — the "CEB 1" tail tokenizes, but the lead identifier doesn't |
| PERC reporter | `21 PERC ¶ 28099` | Tokenizes via `state-reporter` but `¶` pincite is not parsed |
| PUC official | `48 CPUC 2d 107`, `10 Cal.P.U.C.2d 773`, `41 C.R.C. 184` | `CPUC 2d` tokenizes; `Cal.P.U.C.2d` (CSM no-space form) does NOT tokenize because `P.U.C` looks like sentence boundaries inside the case-name lookback — same `Cal.Comp.Cases` problem as #237 |
| WCAB unpub. | `Smith v. ESIS, 24 Cal. Workers' Camp. Rptr. 139` | Tokenizes only if `Cal. Workers' Comp. Rptr.` ends up in reporter set |

**Five categories fall through completely** and need new patterns or a new `adminDecision` citation type:

| Form | Example | Why it falls through |
|------|---------|----|
| PUC decision number | `D.24-05-012`, `D.93-02-013`, `D.83-09-007` | Bare decision number; no volume-reporter-page anchor |
| PUC rulemaking / investigation | `R.21-03-010`, `R.18-12-005`, `I.20-04-014` | Same — bare proceeding number |
| PUC resolution | `Res. E-4567`, `Res. T-17012` | Bare resolution number |
| OTA precedential | `2024-OTA-377P`, `2019-OTA-204P`, `2023-OTA-215P` | Looks like NM/Ohio neutral but `-P` suffix breaks the 3-segment regex |
| OTA non-precedential | `2024-OTA-131`, `2024-OTA-301` | **Currently mis-extracted as a 3-segment vendor-neutral** (court="OTA"), conflating CA admin tax with Ohio/NM appellate |
| SBE legacy tax | `(99-SBE-003)`, `(94-SBE-006)`, `(84-SBE-034)` | YY-AGENCY-NNN form; not in any pattern |
| PERB decision | `PERB Decision No. 2684E`, `PERB Dec. No. 1199-S` | Decision-number form (no volume-reporter-page) |
| SPB decision | `SPB Dec. No. 93-23` | Decision-number form |
| OAH case number | `OAH No. 2024050123` | Long sequential digits, no reporter |
| Cal/OSHA appeals | (No standard cite form; `Docket No. NNN` per decision) | Non-precedential / not cited |
| CARB enforcement | Three-letter prefix + sequence (e.g., `TRU-NNNNN`, `HDVIP-NNNNN`) | Not citable as precedent |
| CalPERS / CalSTRS precedential | `Precedential Decision No. 18-03` | Decision-number form |
| DLSE ODA / opinion letter | `(O.L.)`, `(A.D.)` inline + date | Inline parenthetical convention |
| DSS state hearing | (No standard cite form; case-by-case) | Not in published reporter |

**Prioritization (high → low):**

1. **OTA precedential / non-precedential** — `YYYY-OTA-NNN[P]` — a 3-segment-shaped form that is *currently mis-tokenized as a 3-segment vendor-neutral*. Adding a dedicated pattern before the existing 3-segment rule is the highest-leverage fix. Mirror the Illinois `(-U)` pattern from #230: capture an optional `P` suffix that the extractor consumes into a `precedential: boolean` flag. (Same shape, different sovereign.)
2. **PUC `D./R./I.` numbers** — `D.YY-MM-NNN`, `R.YY-MM-NNN`, `I.YY-MM-NNN` — extremely high-volume and trivially regex-matchable. Propose a new `adminDecision` citation type with a `docketKind` discriminator (decision / rulemaking / investigation / resolution).
3. **`Cal.P.U.C.2d` / `Cal.Comp.Cases` no-space (CSM) form** — same #237 problem (no-space stems trip the case-name lookback). Solved by *abbreviation-set additions* (add `p`, `u`, `c` stems where they don't already exist + `puc` and `cpuc`), not new tokenization patterns.
4. **PERB / SPB / CalPERS / CalSTRS decision numbers** — bounded but lower volume than PUC.
5. **SBE legacy form** — `(YY-SBE-NNN)` — appears in CourtListener and OTA opinions referencing pre-2018 BOE precedent. Wrap into the same `adminDecision` proposal as PUC.
6. **OAH numeric case IDs** — long digit strings only. Low priority because cited in pleadings, not in published opinions.
7. **`Cal. Reg. Notice Reg.`** — California's analogue to Federal Register. Already shaped like the `federal-register` neutral pattern; could add a clone for completeness.

---

## Per-Agency Sections

### 1. Workers' Compensation Appeals Board (WCAB) — Cal. Comp. Cases

**Canonical citation form (CSM):**
```
<Applicant> v. <Defendant> (YYYY) <volume> Cal. Comp. Cases <page>
```

**Reporter database status:** Present in `data/reporters.json` (line 4294):
```json
"Cal. Comp. Cases": [
  {
    "cite_type": "specialty",
    "editions": { "Cal. Comp. Cases": { "end": null, "start": "1750-01-01T00:00:00" } },
    "name": "California Compensation Cases",
    "variations": { "Cal. Comp. Cas": "Cal. Comp. Cases" }
  }
]
```

Sister reporter: `Cal. WCC` (California Workers' Compensation Cases) at line 4553 — also `specialty` cite_type. Predecessor reporter: `Cal. I.A.C.` (Decisions of the Industrial Accident Commission of California, pre-1936) at line 4355.

**Form variations:**

- *Bluebook spacing* (Justia/Lexis common): `89 Cal. Comp. Cases 100`
- *CSM no-space* (CA published opinions): `63 Cal.Comp.Cases 742`
- *Truncated variant* (now in `variations`): `Cal. Comp. Cas` → resolves to `Cal. Comp. Cases`
- *IAC predecessor*: `20 I.A.C. 20` (Rabin v. Metzger (1934) 20 I.A.C. 20)
- *Unpublished proxy* (Workers' Camp Reporter): `Smith v. ESIS, Inc. (1996) SBA 74576, 24 Cal. Workers' Camp. Rptr. 139`

**WCAB caption conventions:**

- Trial-level (administrative law judge / DEU): single case caption with `ADJNNNNNNN` docket number (e.g., `ADJ10934327`). Not published unless adopted by the Reconsideration unit.
- Reconsideration *panel* decisions: 3-commissioner panel. Sometimes designated "significant panel decisions" and published in Cal. Comp. Cases.
- *En banc* decisions: All-commissioner; precedential. Format: `... (WCAB en banc) ... (YYYY) NN Cal. Comp. Cases NNN`.

**Real corpus examples (verbatim):**

| Caption | Citation | Type | Source |
|---|---|---|---|
| `Czarneki v. Golden Eagle Insurance Co.` | `(1998) 63 Cal.Comp.Cases 742` | Reconsideration | UCLA LibGuides |
| `Rabin v. Metzger` | `(1934) 20 I.A.C. 20` | IAC predecessor | UCLA LibGuides |
| `Steve Hoddinott v. Bravo Security Services, Inc.` | `89 Cal. Comp. Cases ___` | Panel | DIR / public |
| Justia samples | `71 Cal.Comp.Cases 155`, `70 Cal.Comp.Cases 133`, `66 Cal. Comp. Cases 473`, `76 Cal. Comp. Cases 343` | mixed |  |

**Current eyecite-ts behavior:**

- ✅ `89 Cal. Comp. Cases 100` (spaced) — tokenizes via `state-reporter` regex (verified above).
- ❌ `63 Cal.Comp.Cases 742` (CSM no-space) — does NOT tokenize because `Cal.Comp.Cases` runs together. The `state-reporter` regex requires `\s+` before the reporter, and the reporter capture group does not admit `.` as a word-boundary marker in the same way the federal-reporter regex handles `F.Supp.`. (This is the #237 family — case-name lookback stem additions needed: `comp`, `cas`/`cases` already in the abbreviation set, but the parser never reaches them because tokenization fails first.)

**Recommended action:** **MEDIUM**. The Bluebook form already works. The CSM no-space form is a known #237-class issue affecting all CA reporters; fix at the cleanText / tokenize-spacing layer (analogous to existing `normalizeReporterSpacing` for `F. Supp. 2d` → `F.Supp.2d`) by adding a forward normalizer `Cal.Comp.Cases` → `Cal. Comp. Cases`. Same fix would help `Cal.4th`, `Cal.App.4th`, `Cal.Rptr.3d` already, but those go through a separate path because the digit suffix is on the trailing token, not embedded in the middle.

---

### 2. Public Utilities Commission (CPUC / PUC)

CPUC has **four distinct citation forms** in active use:

**A. Decision number (most common in modern practice, 1980+):**
```
D.YY-MM-NNN
```
where `YY` is two-digit year, `MM` is two-digit month, `NNN` is the sequential decision number issued that month. Examples:

| Example | Source |
|---|---|
| `D.24-12-035` | "Decision on 2024 Renewable Portfolio Standard Procurement Plans" — CPUC web search guidance |
| `D.93-02-013` | "If the citation is a Commission Decision found in the bound volumes, it would be formatted like: D.93-02-013, 48 CPUC 2d 107, at 115" — UCLA LibGuides |
| `D.15-06-007`, `D.83-09-007` | Cal. Reg. Law Reporter; "Southern California Edison Co. (1983) Cal. P.U.C. Dec. No. 83-09-007" |

**B. Rulemaking / Investigation number:**
```
R.YY-MM-NNN    (Order Instituting Rulemaking, "OIR")
I.YY-MM-NNN    (Order Instituting Investigation, "OII")
```
Examples: `R.21-03-010`, `R.18-12-005`, `I.20-04-014`.

**C. Volume-reporter-page (older / bound volumes):**
```
<volume> Cal.P.U.C.[2d|3d] <page>
<volume> CPUC [2d|3d] <page>
<volume> C.R.C. <page>     (California Railroad Commission, 1911–1946 predecessor)
```
Examples:
- `41 C.R.C. 184` (Matter of Truck Owners' Association (1938))
- `10 Cal.P.U.C.2d 773` (SoCal Gas Co. (1983) 10 Cal.P.U.C.2d 773, 785)
- `48 CPUC 2d 107` (modern bound volume, see D.93-02-013 above)

Per UCLA LibGuides: "Volume 84 (84 Cal.P.U.C.) is followed by 2nd Series, Volume 1 (1 Cal.P.U.C.2d) and 2nd Series, Volume 86 (86 Cal.P.U.C.2d) is followed by 3rd Series, Volume 1 (1 Cal.P.U.C.3d)."

**D. Resolution / General Order:**
```
Res. <X-NNNNN>           (e.g., Res. E-4567 — electric; Res. T-17012 — telecom)
Gen. Ord. <NNN>          (e.g., Gen. Ord. 156, Gen. Ord. 95)
```

**Reporter database status:**

- ❌ `Cal.P.U.C.` / `Cal. P.U.C.` / `CPUC` — NOT in `data/reporters.json` (confirmed via grep).
- ❌ `C.R.C.` — NOT in `reporters.json` (Railroad Commission predecessor).

**Current eyecite-ts behavior:**

| Form | Tokenizes? | Notes |
|---|---|---|
| `D.24-05-012` | ❌ | Bare decision number; no pattern matches |
| `R.21-03-010` | ❌ | Same |
| `I.20-04-014` | ❌ | Same |
| `Res. E-4567` | ❌ | Same |
| `Gen. Ord. 156` | ❌ | Same |
| `48 CPUC 2d 107` | ✅ | `state-reporter` matches volume + "CPUC 2d" + page |
| `10 Cal.P.U.C.2d 773` | ❌ | No-space `Cal.P.U.C.2d` trips the case-name lookback; reporter doesn't exist in DB either |
| `41 C.R.C. 184` | ✅ | `state-reporter` matches; reporter still unknown to DB |

**Recommended action:** **HIGH**.

1. Add `Cal. P.U.C.`, `Cal. P.U.C.2d`, `Cal. P.U.C.3d`, `CPUC`, `CPUC 2d`, `CPUC 3d`, and `C.R.C.` to `data/reporters.json` (or maintain a thin override file in `src/data/` for CA admin reporters).
2. Add new `adminDecision` citation patterns to a new `src/patterns/adminPatterns.ts`:

```typescript
// CPUC bare-number forms
{
  id: "cpuc-decision",
  regex: /\bD\.\s?(\d{2})-(\d{2})-(\d{3,4})\b/g,
  description: 'CPUC decision number (e.g., "D.24-05-012")',
  type: "adminDecision",  // NEW citation type
},
{
  id: "cpuc-rulemaking",
  regex: /\b(R|I)\.\s?(\d{2})-(\d{2})-(\d{3,4})\b/g,
  description: 'CPUC rulemaking ("R.") or investigation ("I.") proceeding number',
  type: "adminDecision",
},
{
  id: "cpuc-resolution",
  regex: /\bRes\.\s+([A-Z]-\d{3,5})\b/g,
  description: 'CPUC resolution number (e.g., "Res. E-4567", "Res. T-17012")',
  type: "adminDecision",
},
{
  id: "cpuc-general-order",
  regex: /\bGen\.\s?Ord\.\s+(\d+(?:-[A-Z])?)\b/g,
  description: 'CPUC General Order (e.g., "Gen. Ord. 156", "Gen. Ord. 95")',
  type: "adminDecision",
},
```

3. The new `AdminDecisionCitation` type carries:
```typescript
interface AdminDecisionCitation extends CitationBase {
  type: "adminDecision"
  agency: "cpuc" | "perb" | "spb" | "alrb" | "ota" | "sbe" | "calpers" | "calstrs" | ...
  docketKind: "decision" | "rulemaking" | "investigation" | "resolution" | "general-order" | "precedential" | "non-precedential"
  decisionNumber: string   // canonical (e.g., "D.24-05-012")
  year?: number            // parsed from the year segment when present
  month?: number           // parsed from MM
}
```

---

### 3. Public Employment Relations Board (PERB)

**Canonical form:**
```
<Respondent> (<Charging Party>) (YYYY) PERB Decision No. <NNNN>-<X> [<vol> PERC ¶ <NNNN>, p. <NNN>]
```

Per CSM (via UCLA LibGuides): `California State Employees Association (Carrillo) (1997) PERB Dec. No. 1199-S [21 PERC ¶ 28099, p. 330]`.

**Decision-number suffixes:**

- `-S` State employer
- `-E` Local public school employer (e.g., 2684E, 0051E)
- `-M` Local government / municipal
- `-H` Higher education (UC, CSU)
- `-I` Judicial Council
- `HO-U-NNN-X` Hearing Officer unfair-practice decisions (e.g., `Dec. No. HO-U-948-C`)
- Prefix letters: `A-` administrative appeal, `I-` injunctive relief, `J-` other

**Variations observed:**
- `PERB Decision No. 2684E` (modern, full word)
- `PERB Dec. No. 1199-S` (CSM abbreviation)
- `2684E` (bare, when context obvious)
- `California State Employees Association (Carrillo)` — caption uses respondent with charging party in parens

**Parallel reporter:** California Public Employee Reporter (PERC), 1976–present. Format: `<vol> PERC ¶ <para#>, p. <pinpoint>`.

**Reporter database status:** ❌ Neither `PERB` nor `PERC` is in `data/reporters.json`.

**Real corpus examples:**

| Citation | Source |
|---|---|
| `California State Employees Association (Carrillo) (1997) PERB Dec. No. 1199-S [21 PERC ¶ 28099, p. 330]` | UCLA LibGuides / CSM |
| `Atwater Elementary Teachers Association, CTA/NEA (Garcia) (2025) PERB Decision No. 2995-E` | PERB Decision 2684E (2025) |
| `Modoc County Office of Education (2025) PERB Decision No. 2684E` | PERB website |
| `Dec. No. HO-U-948-C` | PERB hearing officer cite |

**Current eyecite-ts behavior:**

- ❌ `PERB Decision No. 2684E` — bare decision-number form, doesn't tokenize.
- ❌ `PERB Dec. No. 1199-S` — same.
- ✅ `21 PERC ¶ 28099` (partial) — `state-reporter` tokenizes "21 PERC <NNNN>" but the `¶` symbol and intervening text aren't structured as a pincite, and PERC is unknown to the reporter DB.

**Recommended action:** **MEDIUM-HIGH**.

Add to `adminPatterns.ts`:
```typescript
{
  id: "perb-decision",
  regex: /\bPERB\s+(?:Dec(?:ision)?\.?)\s+No\.\s+(\d{3,5}[A-Z]?(?:-[A-Z])?)\b/g,
  description: 'PERB decision number (e.g., "PERB Decision No. 2684E", "PERB Dec. No. 1199-S")',
  type: "adminDecision",
},
{
  id: "perb-hearing-officer",
  regex: /\bDec\.\s+No\.\s+HO-U-(\d+(?:-[A-Z])?)\b/g,
  description: 'PERB Hearing Officer unfair-practice decision (e.g., "Dec. No. HO-U-948-C")',
  type: "adminDecision",
},
```

Add `PERC` (and variants `Cal. PERC`, `Cal. Pub. Empl. Rptr.`) to the reporter DB to legitimize `21 PERC ¶ 28099`. The `¶ N` pincite token may need a new pincite parser variant (analogous to `at *3` for Westlaw); currently only `at p. N` and bare numbers are recognized.

---

### 4. Agricultural Labor Relations Board (ALRB)

**Canonical form:**
```
<Employer> (YYYY) <NN> ALRB No. <N>
```

Where `<NN>` is the consecutive-year number since ALRB's creation in 1975 (so `21 ALRB` = 1995's decisions; `46 ALRB` = 2020's).

**Real corpus examples:**

| Caption | Citation | Source |
|---|---|---|
| `Gallo Vineyards, Inc.` | `(1995) 21 ALRB No. 3, pp. 3-4` | UCLA LibGuides / CSM |
| `Monterey Mushrooms, Inc.` | `(2019) 45 ALRB No. 1` | ALRB website |
| `South Lakes Dairy Farm` | `(2013) 39 ALRB No. 1` | ALRB website |
| `San Clemente Ranch Ltd.` | `(1979) 5 ALRB No. 54` | ALRB website |
| `Ocean Mist Farms` | `(2020) 46 ALRB No. 3` | ALRB website |
| `Gerawan Farming, Inc.` | `(2013) 45 ALRB ...` | ALRB website |
| `Hickman, California` | `19 ALRB No. 13` | ALRB website |

**Reporter database status:** ❌ `ALRB` is NOT in `data/reporters.json`.

**Current eyecite-ts behavior:**

✅ `21 ALRB No. 3` tokenizes via `state-reporter` (verified: matched "21 ALRB No.", page "3"). However:
- The `reporter` field captures `ALRB No.` (with trailing "No." literal), which is unconventional.
- Without a `reporters.json` entry, validation fails — citation degrades to lower confidence.
- The `, pp. 3-4` pincite tail will not parse cleanly because the page extraction already consumed "3" as the main page.

**Recommended action:** **HIGH**.

Two options:

A. **Cheap fix — add `ALRB` to `reporters.json`** as a `specialty` reporter. The `state-reporter` regex's "No." literal in the capture is awkward but acceptable; downstream code already handles "No." in `Op. Att'y Gen.` and similar.

B. **Dedicated pattern** in `adminPatterns.ts`:
```typescript
{
  id: "alrb-decision",
  regex: /\b(\d{1,2})\s+ALRB\s+No\.\s+(\d{1,3})\b/g,
  description: 'ALRB decision (e.g., "46 ALRB No. 3")',
  type: "adminDecision",
},
```
where `volume → year-since-1975`, `decisionNumber` = the no. after "No.". This is conceptually closer because `21 ALRB` is not a "volume of a reporter" — it's a sequence indicator.

Recommend **both**: add to reporters DB for validation, and add dedicated extraction pattern for clean field semantics.

---

### 5. Office of Administrative Hearings (OAH)

**Forms in use:**

- *Case number*: `OAH No. <NNNNNNNNNN>` (10-digit) or with `.1` suffix for re-opened cases.
- *Hearing context*: OAH conducts hearings for ~1,400 agencies/programs — the cited authority is rarely "OAH itself" but rather the adopting agency (e.g., CalPERS, CalSTRS, professional licensing boards, special education).

**Real corpus examples** (search interface only — OAH does not publish a reporter):

- `OAH No. 1234567891` (10-digit form)
- `OAH No. 2024050123` (10-digit YYYYMMNNNN-style; not strictly date-encoded)

**Reporter database status:** ❌ No reporter.

**Current eyecite-ts behavior:** ❌ Does not tokenize (bare numeric case ID, no recognizable form).

**Recommended action:** **LOW**. OAH case numbers are pleading references, not published citations. Adoption decisions get cited under the adopting agency's caption (e.g., a CalPERS precedential decision cites "OAH Case No. NNNNNN" in the body but the citation is to the CalPERS precedential decision).

If needed:
```typescript
{
  id: "oah-case-number",
  regex: /\bOAH\s+(?:Case\s+)?No\.\s+(\d{7,12})(?:\.\d+)?\b/g,
  description: 'OAH case number (e.g., "OAH No. 2024050123", "OAH No. 1234567891.1")',
  type: "docket",  // arguably a docket reference, not an admin decision
},
```

---

### 6. Office of Tax Appeals (OTA)

OTA replaced BOE for state tax appeals on 2018-01-01 (Cal. Gov. Code § 15670 et seq.).

**Canonical forms:**

- *Precedential decision*: `<Year>-OTA-<NNN>P` (with trailing `P`)
- *Non-precedential opinion*: `<Year>-OTA-<NNN>` (no suffix)
- *Case caption*: `Appeal of <Taxpayer>` or `In the Matter of the Appeal of: <Taxpayer>`
- *Case number*: `OTA Case No. <NNNNNNNN>` (typically 8 digits)

**Verbatim corpus examples** (from `2024-OTA-377P-Mather-rev1-1.pdf`):

- Caption: `"In the Matter of the Appeal of: S. MATHER AND N. MATHER ) OTA Case No. 18093787"`
- Header banner: `"2024-OTA-377P Precedential"`
- Inline citations within opinion body:
  - `"(Appeal of Jali, LLC, 2019-OTA-204P.)"`
  - `"(Appeal of Buehler, 2023-OTA-215P (Buehler); see also Miller v. McColgan (1941) 17 Cal.2d 432, 441-442 ...)"`
  - `"(Appeal of Black, 2023-OTA-023P.)"`
  - `"Appeal of Callister (99-SBE-003) 1999 WL 253126 (Callister)"`
  - `"Appeal of Bartz (94-SBE-006) 1994 WL 510127"`
  - `"Appeal of Cornman (84-SBE-034) 1984 WL 16114"`
  - `"Appeal of Collamore (72-SBE-031) 1972 WL 2664"`
- Title-only references: `"2024-OTA-131 Nonprecedential, OTA Case No. 21037336"` (Microsoft Corp. & Subs.)
- `"2024-OTA-301 Nonprecedential"`

This OTA opinion *itself* demonstrates the SBE legacy form `(YY-SBE-NNN)` in active use — citations to pre-2018 BOE precedent are alive in OTA decisions.

**Reporter database status:** ❌ Neither `OTA` nor `SBE` is in `data/reporters.json` (verified).

**Current eyecite-ts behavior:**

| Form | Behavior |
|---|---|
| `2024-OTA-377P` | ❌ Does not match the 3-segment neutral regex because of trailing `P`. Does not match Mississippi 4-segment (no separator). Falls through. |
| `2024-OTA-131` | ⚠️ Currently mis-tokenizes as 3-segment `state-vendor-neutral-hyphenated` → `year=2024, court="OTA", documentNumber="131"`. This conflates CA OTA decisions with Ohio/NM appellate forms in the `NeutralCitation` type. |
| `99-SBE-003` | ❌ Does not match (`\d{4}` year required at the start). |
| `94-SBE-006`, `84-SBE-034`, `72-SBE-031` | ❌ Same — 2-digit year. |
| `Appeal of Mather` | ❌ — not a citation, but caption form. (`Appeal of` is not in the procedural-prefix list — see immigration-admin doc for similar gaps.) |
| `OTA Case No. 18093787` | ❌ Bare case number. |

**Recommended action:** **HIGHEST**.

1. **Fix the OTA mis-tokenization** by adding a dedicated, higher-priority pattern *before* the 3-segment hyphenated rule, modeled on the Mississippi 4-segment and Illinois `(-U)` patterns:

```typescript
// Add to neutralPatterns.ts BEFORE state-vendor-neutral-hyphenated
{
  id: "ca-ota-precedential",
  regex: /\b(\d{4})-OTA-(\d+)(P)?\b/g,
  description: 'CA Office of Tax Appeals decision (e.g., "2024-OTA-377P" precedential, "2024-OTA-131" non-precedential)',
  type: "adminDecision",   // OR keep "neutral" if extending NeutralCitation with `precedential` flag
},
```

The extractor consumes the optional `P` into a `precedential: boolean` flag (mirroring how Illinois Rule 23 `-U` becomes `unpublished: true`).

2. **Add SBE legacy form** (handles BOE pre-2018 cites in OTA, CourtListener, treatise text):

```typescript
{
  id: "ca-sbe-legacy",
  regex: /\((\d{2})-SBE-(\d{3})\)/g,
  description: 'CA State Board of Equalization legacy tax decision (e.g., "(99-SBE-003)", "(84-SBE-034)")',
  type: "adminDecision",
},
```

Note: the parenthesis-wrapped form is canonical per the OTA corpus; an unparenthesized form `99-SBE-003` also appears in some sources. The pattern should accept both (drop the literal parens to a non-capturing optional).

3. **Add `Appeal of` to procedural-prefix list** (`src/extract/extractCase.ts` `PROCEDURAL_PREFIX_REGEX`) — this is a separate but tightly-related fix. Many OTA citations omit the volume-reporter-page entirely and rely on the `Appeal of <Name>` caption + `<Year>-OTA-NNN[P]` neutral marker. The procedural-prefix list currently has `Application of`, `On Petition of`, `Petition of`, `Estate of`, etc. — add `Appeal of` to capture `Appeal of Jali, LLC`, `Appeal of Buehler`, `Appeal of Black`, etc.

4. **Add OTA and SBE reporters** to `data/reporters.json`:
- `OTA` (cite_type: specialty, jurisdiction: us:ca;tax.appeals, start: 2018)
- `SBE` (cite_type: specialty, jurisdiction: us:ca;board.equalization, end: 2017)
- `Cal. Tax Rep.` / `Cal. Tax Rptr.` (CCH paragraph reporter — historical secondary)

---

### 7. State Board of Equalization (BOE) — historical

See OTA section above. SBE was BOE's pre-2018 docket prefix.

**Bluebook example seen in the wild:**
- `Appeal of Harvey (1992) 5 SBE57 [Cal. Tax Rptr. (CCH) ¶ 402-272]`

The `5 SBE57` form (no space between "SBE" and the page number) is unusual but documented; the more common form is `(YY-SBE-NNN)` and a separate Cal. Tax Rptr. parallel cite.

**Recommended action:** Roll into OTA recommendation (#6).

---

### 8. State Personnel Board (SPB)

**Canonical form:**
```
(YYYY) SPB Dec. No. <YY-NN>
```

Where `YY-NN` is two-digit year + sequential decision (e.g., `93-23` = 1993's 23rd precedential decision).

**Real corpus examples:**

- `(1993) SPB Dec. No. 93-23` (precedential decision in `Prudell` — SPB website)
- `(1993) SPB Dec. No. 93-32` (`93-32 D_E.pdf` on SPB site)

**Reporter database status:** ❌ Not in `data/reporters.json`.

**Current eyecite-ts behavior:** ❌ Decision-number form, no pattern matches.

**Recommended action:** **MEDIUM**.

```typescript
{
  id: "spb-decision",
  regex: /\bSPB\s+Dec\.\s+No\.\s+(\d{2}-\d{1,3})\b/g,
  description: 'CA State Personnel Board precedential decision (e.g., "SPB Dec. No. 93-23")',
  type: "adminDecision",
},
```

---

### 9. Cal/OSHA Appeals Board (OSHAB)

**Form:** No published reporter. Decisions After Reconsideration are posted at `www.dir.ca.gov/oshab/DAR_Decisions`. Citations in practice are by docket number + agency.

**Current eyecite-ts behavior:** ❌ No standard cite to extract.

**Recommended action:** **LOW**. Skip unless a specific corpus need emerges. Document the gap.

---

### 10. California Air Resources Board (CARB) / Dept. of Pesticide Regulation (DPR)

**Form:** CARB ALJ decisions are explicitly **non-precedential** ("decisions of Administrative Law Judges are binding on the parties in the particular matter but do not have precedential value and should not be cited or relied on as precedent in any proceeding" — per CARB rules).

Enforcement citations use 3-letter prefixes (TRU, ORE, CVI, ECL, T01, T02, S01, S02, DTR, PAU, REF, SBI, SWC, STB, NOV, GHG) followed by a sequence number — these are administrative notices, not citable as opinions.

**Current eyecite-ts behavior:** ❌ No standard form.

**Recommended action:** **VERY LOW**. Document and skip. If ever needed:
```typescript
{
  id: "carb-citation",
  regex: /\b(TRU|ORE|CVI|ECL|T01|T02|S01|S02|DTR|PAU|REF|SBI|SWC|STB|NOV|GHG)-(\d+)\b/g,
  description: 'CARB enforcement citation number (non-precedential — not citable as authority)',
  type: "docket",
},
```

DPR enforcement uses similar non-precedential notices.

---

### 11. CalPERS / CalSTRS — Precedential Board Decisions

**Form:**

- *CalPERS*: `<In the Matter of …> (YYYY) Precedential Decision No. <NN-NN>`
- *CalSTRS*: same shape — `In the Matter of <Subject>: <Name>, Precedential Decision No. NN-NN, effective <Date>`

**Real corpus example (verbatim):**

- *CalSTRS*: `In the Matter of the Statement of Issues for Retirement Benefits (Disability Retirement Effective Date): Marc Bashara, Precedential Decision No. 18-03, effective July 18, 2018` — CalSTRS website

**Reporter database status:** ❌ Not in DB.

**Current eyecite-ts behavior:** ❌ Decision-number form; `In the Matter of` IS in the procedural-prefix list, so the caption is parsed correctly, but the `Precedential Decision No. 18-03` tail is not extracted as a citation token.

**Recommended action:** **MEDIUM**.

```typescript
{
  id: "calpers-calstrs-precedential",
  regex: /\b(?:Cal(?:PERS|STRS))?\s*Precedential\s+Decision\s+No\.\s+(\d{2}-\d{1,3})\b/g,
  description: 'CalPERS/CalSTRS precedential decision (e.g., "Precedential Decision No. 18-03")',
  type: "adminDecision",
},
```

The `(?:Cal(?:PERS|STRS))?` lookbehind-style prefix is optional because the agency identifier often appears in the caption rather than next to the decision number. The extractor should default `agency` based on caption context.

---

### 12. Department of Social Services (DSS) — State Hearings

**Form:** No published reporter; per-case ALJ decisions referenced by case number. CDSS State Hearings handles welfare, IHSS (In-Home Supportive Services), CalFresh, MediCal eligibility, etc.

**Current eyecite-ts behavior:** ❌ No standard cite form.

**Recommended action:** **VERY LOW**. Document the gap.

---

### 13. California Attorney General Opinions

**Canonical forms:**

- *CSM standard*: `<volume> Ops.Cal.Atty.Gen. <page>` (e.g., `95 Ops.Cal.Atty.Gen. 1`)
- *ALWD variant* (Vol. 91 (2008) – Vol. 96 (2013) only): used ALWD format per CA AG style page
- *CSM (modern)*: Vols. 97+ (2014+) returned to CSM format

**Real corpus examples:**

| Citation | Source |
|---|---|
| `84 Ops.Cal.Atty.Gen. 113` | CourtListener |
| `95 Ops.Cal.Atty.Gen. 1` | CA AG website |
| `107 Ops.Cal.Atty.Gen. 20` | CourtListener vol. 107 |
| `70 Ops.Cal.Atty.Gen. 309` | CourtListener |
| `106 Ops.Cal.Atty.Gen. 1` | reporters.json `examples` field |

**Reporter database status:** ✅ In `data/reporters.json` (line 20705):
```json
"Ops.Cal.Atty.Gen.": [
  {
    "cite_type": "state",
    "editions": { "Ops.Cal.Atty.Gen.": { "end": null, "start": null } },
    "examples": ["106 Ops.Cal.Atty.Gen. 1"],
    "mlz_jurisdiction": ["us:ca;attorney.general"],
    "name": "Opinions of the California Attorney General",
    "variations": { "Ops. Cal. Atty. Gen.": "Ops.Cal.Atty.Gen." }
  }
]
```

**Current eyecite-ts behavior:** ✅ Already tokenizes via `state-reporter` (verified: `95 Ops.Cal.Atty.Gen. 1` matches). The spaced variant `Ops. Cal. Atty. Gen.` is captured by the `variations` map and should normalize.

**Recommended action:** **NONE / VERIFY**. Confirm with a test that both spaced and unspaced forms extract correctly and that the `cite_type: "state"` classification yields the correct `CourtInference` (jurisdiction: state, state: "CA", level: appellate or unique).

A separate federal `Op. Att'y Gen.` reporter (line 20677, US AG opinions 1791–1982) coexists in the DB — make sure the extractor disambiguates by examining the `Cal.` / `Ops.` prefix. The current state-reporter regex captures the full `Ops.Cal.Atty.Gen.` and the federal `Op. Att'y Gen.` separately, so the DB lookup should correctly route. Add a regression test.

---

### 14. Division of Labor Standards Enforcement (DLSE) — Wage Claim / Berman Hearings

**Form:**

- *Opinion letters*: cited inline with parenthetical `(O.L.)` per DLSE Manual (no standalone reporter).
- *Administrative Decisions* (Labor Commissioner adjudications): `(A.D.)` parenthetical per DLSE Manual.
- *Berman hearing ODA (Order, Decision, Award)*: docket-number reference only; not published in a citable reporter.

Per DLSE Enforcement Policies and Interpretations Manual: "where the source is an opinion letter, the parenthetical abbreviation '(O.L.)' is inserted in the text, and where the source is a prior quasi-adjudicative decision of the Labor Commissioner (adopted as an 'Administrative Decision') resulting from an adjudication of a dispute, the parenthetical abbreviation '(A.D.)' is inserted in the text."

**Current eyecite-ts behavior:** ❌ Inline-parenthetical convention with no number — not extractable as a structured citation.

**Recommended action:** **VERY LOW**. Document. The CFR / DLSE Manual convention is not a citation form per se; it's a meta-annotation.

---

### 15. Fair Employment and Housing Commission (FEHC) — historical

(FEHC was abolished in 2013 and folded into the Civil Rights Department; precedential decisions 1978–2012 remain citable.)

**Canonical form (CSM):**
```
Dept. Fair Empl. & Hous. v. <Respondent> (YYYY) No. <YY-NN>, FEHC Precedential Decs. <YYYY-YYYY>, CEB <vol>, p. <page>
```

**Real corpus example:**
- `Dept. Fair Empl. & Hous. v. Madera County (1990) No. 90-03, FEHC Precedential Decs. 1990-1991, CEB 1, p. 26`

**Reporter database status:** ❌ Not in DB.

**Current eyecite-ts behavior:** ⚠️ Partial. The `CEB 1, p. 26` tail can tokenize, but the full citation is complex (multi-segment with both decision number AND publisher reporter).

**Recommended action:** **MEDIUM-LOW**. FEHC corpus is historical. If supported:

```typescript
{
  id: "fehc-decision",
  regex: /\bFEHC\s+Precedential\s+Decs\.\s+(\d{4}-\d{4}),\s+CEB\s+(\d+),\s+p\.\s+(\d+)\b/g,
  description: 'FEHC precedential decision in CEB reporter (e.g., "FEHC Precedential Decs. 1990-1991, CEB 1, p. 26")',
  type: "adminDecision",
},
```

---

### 16. Industrial Welfare Commission (IWC) Wage Orders

**Form:**
```
Wage Order <N>-YYYY    (e.g., "Wage Order 4-2001", "Cal. Code Regs., tit. 8, § 11040")
```

Wage Orders are regulations (codified in Title 8 CCR), not adjudicative decisions — strictly outside this research scope but worth noting because they appear in CA employment-law opinions side-by-side with DLSE references.

**Current eyecite-ts behavior:** ❌ Bare "Wage Order N-YYYY" doesn't tokenize. CCR citations (`Cal. Code Regs., tit. 8, § 11040`) would be handled by statute patterns, not admin patterns.

**Recommended action:** **OUT OF SCOPE** for this report. Mention only.

---

### 17. California Regulatory Notice Register

**Form:**
```
<vol>-<z> Cal. Reg. Not. Reg. <page> (YYYY)
```

Example: `32-z Cal. Reg. Not. Reg. 1113 (2020)`.

This is structurally identical to the Federal Register pattern (volume + suffix + reporter + page) but with a hyphenated volume containing the letter `z`.

**Current eyecite-ts behavior:** ⚠️ The `federal-register` neutral pattern is fixed-string `Fed. Reg.`, won't match. The `state-reporter` regex might catch `32-z Cal. Reg. Not. Reg. 1113` because the volume capture allows `-` (`\d+(?:-\d+)?`)… but `32-z` has a letter suffix, which the volume regex doesn't permit.

Let me verify: `\d+(?:-\d+)?` requires `-` followed by `\d+`, not `-z`. So the form does NOT tokenize.

**Recommended action:** **LOW**.

```typescript
{
  id: "cal-reg-notice-register",
  regex: /\b(\d+-z)\s+Cal\.\s?Reg\.\s?Not\.\s?Reg\.\s+(\d+)\b/g,
  description: 'California Regulatory Notice Register (e.g., "32-z Cal. Reg. Not. Reg. 1113")',
  type: "federalRegister",  // or new "regulatoryRegister" type
},
```

---

## Cross-Cutting Architectural Recommendations

### A. New citation type: `adminDecision`

Add `adminDecision` to the `CitationType` discriminator in `src/types/citation.ts`. The CitationBase fields plus these new fields:

```typescript
interface AdminDecisionCitation extends CitationBase {
  type: "adminDecision"
  /** Issuing agency (canonical lowercase abbreviation). */
  agency: "cpuc" | "perb" | "alrb" | "ota" | "sbe" | "spb" | "calpers" | "calstrs"
    | "fehc" | "cdss" | "dlse" | "calosha" | "carb" | "dpr" | "iwc" | "oah"
  /** What kind of docket — different agencies have different document classes. */
  docketKind:
    | "decision"         // CPUC D., PERB Dec. No., SPB Dec. No., etc.
    | "rulemaking"       // CPUC R.
    | "investigation"    // CPUC I.
    | "resolution"       // CPUC Res.
    | "general-order"    // CPUC Gen. Ord.
    | "precedential"     // OTA P, CalPERS/CalSTRS Precedential Decision
    | "non-precedential" // OTA non-P
    | "hearing-officer"  // PERB HO-U
    | "opinion-letter"   // DLSE (O.L.)
    | "advisory"
  /** Canonical decision identifier (e.g., "D.24-05-012", "2024-OTA-377P", "PERB Dec. No. 2684E"). */
  decisionNumber: string
  /** Year if encoded in the decision number (e.g., "24" in "D.24-05-012" → 2024). */
  year?: number
  /** Month, if encoded (e.g., "05" in "D.24-05-012" → 5). */
  month?: number
}
```

The discriminated union remains exhaustively-checkable.

### B. New pattern file: `src/patterns/adminPatterns.ts`

Consolidate all bare-decision-number patterns here. **Order matters** — longer/more-specific patterns first (consistent with how the existing 4-segment MS form precedes the 3-segment alternation):

```typescript
import type { Pattern } from "./casePatterns"

export const adminPatterns: Pattern[] = [
  // 1. CA OTA — precedential ("P" suffix). MUST precede the generic 3-segment
  //    neutral pattern (otherwise "2024-OTA-377P" partially matches as 3-segment
  //    losing the "P" flag, or fails entirely depending on ordering).
  {
    id: "ca-ota-precedential",
    regex: /\b(\d{4})-OTA-(\d{1,4})(P)?\b/g,
    description: 'CA Office of Tax Appeals decision (e.g., "2024-OTA-377P", "2024-OTA-131")',
    type: "adminDecision",
  },
  // 2. CA SBE legacy (pre-2018 BOE tax appeals)
  {
    id: "ca-sbe-legacy",
    regex: /\(?(\d{2})-SBE-(\d{3})\)?/g,
    description: 'CA State Board of Equalization legacy tax decision (e.g., "(99-SBE-003)")',
    type: "adminDecision",
  },
  // 3. CPUC decision number
  {
    id: "cpuc-decision",
    regex: /\bD\.\s?(\d{2})-(\d{2})-(\d{3,4})\b/g,
    description: 'CPUC decision number (e.g., "D.24-05-012")',
    type: "adminDecision",
  },
  // 4. CPUC rulemaking / investigation
  {
    id: "cpuc-rulemaking-investigation",
    regex: /\b([RI])\.\s?(\d{2})-(\d{2})-(\d{3,4})\b/g,
    description: 'CPUC rulemaking (R.) or investigation (I.) proceeding number',
    type: "adminDecision",
  },
  // 5. CPUC resolution
  {
    id: "cpuc-resolution",
    regex: /\bRes\.\s+([A-Z]-\d{3,5})\b/g,
    description: 'CPUC resolution (e.g., "Res. E-4567")',
    type: "adminDecision",
  },
  // 6. CPUC general order
  {
    id: "cpuc-general-order",
    regex: /\bGen\.\s?Ord\.\s+(\d+(?:-[A-Z])?)\b/g,
    description: 'CPUC General Order (e.g., "Gen. Ord. 156")',
    type: "adminDecision",
  },
  // 7. PERB decision (modern long form and CSM short form)
  {
    id: "perb-decision",
    regex: /\bPERB\s+(?:Decision|Dec\.)\s+No\.\s+(\d{3,5}[A-Z]?(?:-[A-Z])?)\b/g,
    description: 'PERB decision (e.g., "PERB Decision No. 2684E", "PERB Dec. No. 1199-S")',
    type: "adminDecision",
  },
  // 8. PERB hearing officer
  {
    id: "perb-hearing-officer",
    regex: /\bDec\.\s+No\.\s+HO-U-(\d+(?:-[A-Z])?)\b/g,
    description: 'PERB Hearing Officer unfair-practice decision (e.g., "HO-U-948-C")',
    type: "adminDecision",
  },
  // 9. ALRB decision
  {
    id: "alrb-decision",
    regex: /\b(\d{1,2})\s+ALRB\s+No\.\s+(\d{1,3})\b/g,
    description: 'ALRB decision (e.g., "46 ALRB No. 3", "21 ALRB No. 3")',
    type: "adminDecision",
  },
  // 10. SPB precedential decision
  {
    id: "spb-decision",
    regex: /\bSPB\s+Dec\.\s+No\.\s+(\d{2}-\d{1,3})\b/g,
    description: 'CA State Personnel Board precedential decision (e.g., "SPB Dec. No. 93-23")',
    type: "adminDecision",
  },
  // 11. CalPERS / CalSTRS precedential
  {
    id: "calpers-calstrs-precedential",
    regex: /\bPrecedential\s+Decision\s+No\.\s+(\d{2}-\d{1,3})\b/g,
    description: 'CalPERS/CalSTRS precedential decision (e.g., "Precedential Decision No. 18-03")',
    type: "adminDecision",
  },
  // 12. CA Regulatory Notice Register (z-volume form)
  {
    id: "ca-reg-notice-register",
    regex: /\b(\d+-z)\s+Cal\.\s?Reg\.\s?Not\.\s?Reg\.\s+(\d+)\b/g,
    description: 'CA Regulatory Notice Register (e.g., "32-z Cal. Reg. Not. Reg. 1113")',
    type: "adminDecision",
  },
]
```

### C. Reporter-DB additions

Extend `data/reporters.json` (or maintain a CA-admin overlay in `src/data/`) with the following missing entries:

| Abbreviation | Cite type | Jurisdiction | Notes |
|---|---|---|---|
| `Cal. P.U.C.` / `Cal. P.U.C.2d` / `Cal. P.U.C.3d` | specialty | us:ca;public.utilities.commission | volumes 1+; 2d 1-86; 3d 1+ |
| `CPUC` / `CPUC 2d` / `CPUC 3d` | specialty | us:ca;public.utilities.commission | modern short form |
| `C.R.C.` | specialty | us:ca;railroad.commission | 1911–1946 predecessor |
| `ALRB` | specialty | us:ca;agricultural.labor.relations.board | 1975+ |
| `PERC` / `Cal. PERC` | specialty | us:ca;public.employee.reporter | 1976+ paragraph reporter |
| `OTA` | specialty | us:ca;tax.appeals | 2018+ |
| `SBE` | specialty | us:ca;board.equalization | pre-2018 tax appeals |
| `Cal. Tax Rep.` / `Cal. Tax Rptr.` | specialty | us:ca;tax.cch | CCH parallel |
| `Cal. Reg. Not. Reg.` | regulatory_register | us:ca;regulatory.notice.register | weekly OAL publication |
| `FEHC Precedential Decs.` | specialty | us:ca;fair.employment.housing.commission | 1978–2012 (historical) |
| `Cal. Workers' Comp. Rptr.` | specialty | us:ca;workers.compensation | CCH parallel for WCAB unpublished |

### D. Pincite parser extension: `¶ <N>`

PERC's `21 PERC ¶ 28099, p. 330` uses paragraph (`¶`) pincite instead of page. The current `parsePincite` and the `NEUTRAL_PINCITE_LOOKAHEAD` regex in `extractNeutral.ts` recognize `at *3` (star-pagination) and bare numbers but not `¶ N`. Add:

```typescript
// In NEUTRAL_PINCITE_LOOKAHEAD or a new ADMIN_PINCITE_LOOKAHEAD
const ADMIN_PINCITE_LOOKAHEAD =
  /^(?:\s*[,\[]?\s*(?:¶\s*(\d+)|p\.\s*(\d+)))/d
```

This is also needed for some federal CFR cites (`5 C.F.R. ¶ 12345`).

### E. Procedural-prefix addition: `Appeal of`

OTA captions use `Appeal of <Taxpayer>` exclusively (per OTA Rules of Tax Appeals and the corpus examples above). The current `PROCEDURAL_PREFIX_REGEX` in `src/extract/extractCase.ts` covers `In re`, `In the Matter of`, `Estate of`, `Application of`, etc., but not `Appeal of`. Adding it captures hundreds of CA tax-appeal captions both at OTA and in CourtListener federal-court reviews. This is **independent of the bare-number admin patterns** above and is a high-value low-risk addition.

```typescript
// Insert into proceduralPrefixes array (longer-prefixes-first ordering)
"Appeal of",
```

### F. Footnote-marker safety check

The `Cal. PERC ¶ NNNN` paragraph-number convention overlaps superficially with footnote markers. The existing footnote detector (`src/footnotes/`) is opt-in via `detectFootnotes: true`. Verify that `¶ 28099` is NOT misinterpreted as a footnote marker — it shouldn't be, because the marker regexes look for `1.`, `FN1.`, `[1]`, `n.1` patterns, not `¶`. But add a regression test.

---

## Priority Punch List

| # | Action | Priority | Effort | Impact |
|---|---|---|---|---|
| 1 | Add `ca-ota-precedential` and `ca-sbe-legacy` patterns to fix mis-tokenization of `YYYY-OTA-NNN` and add `(YY-SBE-NNN)` form | HIGH | S | Fixes existing wrong-type extraction; unblocks CA tax appeal corpus |
| 2 | Add `cpuc-decision`, `cpuc-rulemaking-investigation`, `cpuc-resolution`, `cpuc-general-order` patterns | HIGH | S | Adds 4 high-volume CPUC forms |
| 3 | Add `Appeal of` to `PROCEDURAL_PREFIX_REGEX` | HIGH | XS | Unlocks OTA / BOE captions |
| 4 | Define new `AdminDecisionCitation` type with `agency` + `docketKind` discriminators | HIGH | M | Foundation for all of #1, #2, #5-#10 |
| 5 | Add `perb-decision` and `perb-hearing-officer` patterns | MEDIUM-HIGH | S | PERB is heavily cited in CA labor opinions |
| 6 | Add `alrb-decision` pattern + `ALRB` reporter to DB | MEDIUM-HIGH | S | Cleaner extraction than the accidental `state-reporter` match |
| 7 | Add `spb-decision` and `calpers-calstrs-precedential` patterns | MEDIUM | S | Pensions / personnel matters |
| 8 | Add CPUC / OTA / SBE / PERC / ALRB / Cal. Reg. Not. Reg. reporters to `data/reporters.json` | MEDIUM | M | Validation + jurisdiction inference |
| 9 | Extend pincite parser to recognize `¶ NNN` for PERC and similar paragraph reporters | MEDIUM | S | Required for clean PERC pincite extraction |
| 10 | CSM no-space form normalization for `Cal.Comp.Cases`, `Cal.P.U.C.2d` (re-use #237 strategy) | MEDIUM | M | Cross-cutting fix; affects every CA reporter |
| 11 | Add `cal-reg-notice-register` pattern | LOW | XS | Low-volume but easy |
| 12 | OAH numeric case IDs, FEHC publisher reporter, Cal/OSHA, CARB, DPR, DLSE/DSS | LOW–DEFER | varies | Document gap; defer until corpus need |

---

## Test Plan (suggested)

Add a fixtures file `tests/fixtures/ca-admin-citations.json` with the verbatim corpus snippets above and assert:

1. `2024-OTA-377P` → `adminDecision`, `agency=ota`, `docketKind=precedential`, `decisionNumber="2024-OTA-377P"`, `year=2024`.
2. `2024-OTA-131` → `adminDecision`, `docketKind=non-precedential` (NOT `neutral` as today).
3. `(99-SBE-003)` → `adminDecision`, `agency=sbe`, `year=1999`.
4. `D.24-05-012` → `adminDecision`, `agency=cpuc`, `docketKind=decision`, `year=2024`, `month=5`.
5. `R.21-03-010` → `adminDecision`, `docketKind=rulemaking`.
6. `Res. E-4567` → `adminDecision`, `docketKind=resolution`.
7. `Gen. Ord. 156` → `adminDecision`, `docketKind=general-order`.
8. `PERB Decision No. 2684E` → `adminDecision`, `agency=perb`, `decisionNumber="2684E"`.
9. `PERB Dec. No. 1199-S` → same canonical decision-number normalization.
10. `46 ALRB No. 3` → `adminDecision`, `agency=alrb`, `year=2020` (year inferred from 1975+46-1=2020).
11. `SPB Dec. No. 93-23` → `adminDecision`, `agency=spb`, `year=1993`.
12. `Precedential Decision No. 18-03` (with `CalPERS` or `CalSTRS` in caption context) → `adminDecision` with correct agency inferred.
13. `89 Cal. Comp. Cases 100` → `case` (existing behavior, regression test).
14. `95 Ops.Cal.Atty.Gen. 1` → `case` (existing behavior, regression test).
15. `21 PERC ¶ 28099, p. 330` → `case` with pincite=330 AND `paragraph=28099` (requires #9).
16. `Appeal of Jali, LLC, 2019-OTA-204P` → procedural-prefix captures "Appeal of Jali, LLC", neutral pattern captures "2019-OTA-204P".

---

## Sources

- California Style Manual, 4th ed. (Office of the Reporter of Decisions, 2000) — § 1:18 (administrative decisions), § 1:22[D] (BOE / SBE), § 2:14 (PUC), § 2:15 (PERB).
- UCLA Hugh & Hazel Darling Law Library — "Finding Administrative Decisions and Guidance" (California Administrative Law LibGuide).
- California Public Utilities Commission — Decisions Search Form (docs.cpuc.ca.gov) and Order A Document.
- California Public Employment Relations Board — Decision Search (perb.ca.gov/decisions).
- Office of Tax Appeals — 2024-OTA-377P (Mather), 2024-OTA-131 (Microsoft Corp.) — verified verbatim corpus.
- California Agricultural Labor Relations Board — alrb.ca.gov, including the published handbook and decisions 46 ALRB No. 3, 45 ALRB No. 1, 39 ALRB No. 1, 5 ALRB No. 54.
- California State Personnel Board — spb.ca.gov precedential decisions; Prudell decision; 93-32 D_E.pdf.
- California Attorney General Opinion Unit — oag.ca.gov/opinions; CourtListener vol. 107 of Ops.Cal.Atty.Gen.
- CalPERS — Precedential Board Decisions, Appeals & Hearings page; General Procedures for Administrative Hearings.
- CalSTRS — Appeals Committee Decisions and Precedential Decisions page; Precedential Decision No. 18-03 (Bashara).
- CDSS State Hearings Division — cdss.ca.gov/inforesources/state-hearings.
- DIR DLSE Enforcement Policies and Interpretations Manual (2002 update, last revised August 2019).
- California Regulatory Law Reporter, Volume 27, No. 2 (Spring 2022) — for CPUC OII / OIR examples (e.g., `R.21-03-010`, `R.18-12-005`, `D.15-06-007`).
- California Regulatory Notice Register publication norms (oal.ca.gov/california_regulatory_notice_online/).
- `data/reporters.json` (reporters-db) at `/Users/medelman/Projects/OSS/eyecite-ts/data/reporters.json`.
- `src/patterns/casePatterns.ts`, `src/patterns/neutralPatterns.ts`, `src/extract/extractNeutral.ts` for current eyecite-ts coverage.
- Prior research: `docs/research/2026-05-10-citation-abbrevs-ca.md` (CSM party-name and reporter quirks); `docs/research/2026-05-11-procedural-prefixes-immigration-admin.md` (procedural-prefix gap analysis methodology).
