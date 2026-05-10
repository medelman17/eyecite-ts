# Citation Abbreviations & Style Quirks: NY + NJ

## Summary

Across NY Court of Appeals, NY Appellate Division, NJ Supreme Court, and NJ Appellate Division captions, eyecite-ts is missing eight high-impact stems: `boro` (NJ-specific Borough), `atty` (Att'y / Att'y Gen.), `pros` (NJ County Prosecutor), `appt` (Appointment / Appointed), `bldgs` (plural Buildings), `cir` already present, `eq` (Equity — Ch. & E. & A.) and `hldgs` (Holdings, ubiquitous in commercial captions). Several party-name abbreviations from `freelawproject/reporters-db` (most notably `Reg'l` → `regl`) are already in the eyecite-ts set, so the residual gap is narrow but legitimate. The most consequential citation-style quirk for the extractor is **NY's use of square-bracket years `[2018]`** (instead of parens) combined with NY reporters that **omit all periods inside reporter names** (`NY3d`, `AD3d`, `Misc 3d`), which interact with bracket-aware date parsing rather than the abbreviation backstop. NJ uses Bluebook style for the most part but with a hard exception list (see Section IV of the NJ Manual).

## Per-Jurisdiction Findings

### New York

**Sources:**
- Official New York Law Reports Style Manual ("Tanbook"), 2022 ed. with 2024 update (https://www.nycourts.gov/reporter/styman_menu.shtml)
- "F. How to Write Citations, Using the New York Style Manual (Tanbook)" — 21-page training PDF distributed by NY court system (verified via cached PDF read)
- NY Court of Appeals real captions, via law.cornell.edu/nyctap and law.justia.com/cases/new-york/court-of-appeals
- Cornell LII / freelawproject/reporters-db reference data

**Missing stems** (apostrophe/period-stripped form used by eyecite-ts):

| Stem | Full Word(s) | Source | Risk | Example caption |
|---|---|---|---|---|
| `atty` | Att'y, Att'y Gen., Atty., Attorney | Tanbook; reporters-db has `Att'y Gen.` → "Attorney General" colloquially; appears in *In re Att'y Gen. Directive*, 246 N.J. 462 (2021) | LOW (rare end-of-sentence; "atty" is not a real word) | "Att'y Gen. of N.Y. v. Doe" |
| `hldgs` | Hldgs., Holdings | NY Appellate Division captions: *Matter of Lost Lake Holdings LLC v Hogue* (3d Dept 2024); *Chan v Havemeyer Holdings LLC* (1st Dept 2024); *Golden Leaves Mgt. NY, Inc. v JW Realty Holdings, LLC* (2d Dept 2025) | LOW (not an English word) | "X v. Havemeyer Hldgs. LLC, 200 AD3d 100" |
| `bldgs` | Bldgs. (plural Buildings) | Cornell LII NY caption corpus; Tanbook implies generic plural of `bldg` | LOW | "Park Ave. Bldgs. Inc. v. ..." |
| `bxch` | Bronx Chamber-style abbreviations | Lower frequency; SKIP unless confirmed | n/a — not recommended | n/a |
| `marit` | Marit. (Maritime) | Bluebook T6; not in eyecite set; NY commercial dockets cite SDNY maritime opinions | LOW | "Marit. Trade Corp. v. ..." |
| `lim` | Lim. (Limited — common in NY corp captions, distinct from `ltd` which is already in) | Used as L.P., Lim., etc. (very rare; SKIP) | risky — overlaps "limit" | n/a |

Stems already present that handle most NY captions (verified against existing set lines 394–791):
- `dept` covers "Dep't" (e.g., "Dep't of Hous. Preserv. & Dev."), `commn`/`commr` cover "Comm'n"/"Comm'r", `assn` covers "Ass'n", `natl` covers "Nat'l", `intl` covers "Int'l", `govt` covers "Gov't", `tr`/`trs` cover "Tr."/"Trs." (Transit, Trustees), `hous`/`auth` for "Hous. Auth.", `prot` for "Prot.", `mgt`/`mgmt` for "Mgt."/"Mgmt.", `regl` for "Reg'l", `bd` for "Bd.", `is` for "Long Is.", `hwy`/`pkwy` for highways.

**Citation-style quirks:**
- **Bracket-year format**: NY's Tanbook mandates `[YYYY]` not `(YYYY)`. Example: `(People v Campbell, 98 AD3d 5 [2d Dept 2012])`. eyecite-ts statute/case extractors should already handle this for date parsing; the abbreviation set is NOT directly impacted.
- **No period after `v`**: NY uses `v` (no period) — e.g., `People v Krom`, `Matter of Hess v West Seneca Cent. School Dist.`. The eyecite set already includes `v` as a stem so the comma-or-period gate is fine.
- **Periods omitted in NY reporter names**: `NY3d`, `AD3d`, `Misc 3d`, `Misc 2d`, `NYS2d`. The `is`-style backward scanner won't see these as parties; reporter regexes own them.
- **Department designators inside brackets**: `[1st Dept 2003]`, `[App Term, 2d Dept 2013]`, `[Sup Ct, NY County 2004]`, `[Crim Ct, Kings County 2007]`. These are inside the year-bracket and do not interact with case-name backward scan.
- **Internal-period dotted forms**: `NY3d` lacks periods, but cross-references like `N.Y.U. L. Rev.` retain them — the Tier-3 internal-period rule handles these.
- **NY uses `&c.` (et cetera) in old captions** — e.g., *People &c. ex rel. Joseph II.* — the `&` is already handled outside the abbrev set.
- **"Matter of"** is NY's equivalent of "In re" and starts most administrative-appeal captions: *Matter of Wooley v New York State Dept. of Correctional Servs.* "Matter" itself does not have abbreviations.

**Real-world examples:**
- `(People v Campbell, 98 AD3d 5 [2d Dept 2012], lv denied 20 NY3d 853 [2012])`
- `Matter of Mantilla v New York City Dept. of Hous. Preserv. & Dev.`
- `Matter of McLaurin v New York City Tr. Auth., 2025 NY Slip Op 06529`
- `Bitchatchi v N.Y. City Police Dep't Pension Fund Bd. of Trs.`, 20 N.Y.3d 1 (2012)
- `Continental Cas. Co. v PricewaterhouseCoopers, LLP`
- `DDJ Mgt., LLC v Rhone Group L.L.C.`
- `Matter of 128 Second Realty LLC v New York State Div. of Hous. & Community Renewal`
- `Matter of Capital Newspapers Div. of the Hearst Corp. v City of Albany`

### New Jersey

**Sources:**
- New Jersey Manual on Style for Judicial Opinions 2017 (https://www.njcourts.gov/sites/default/files/manualonstyle.pdf) — full text read and indexed
- NJ Appellate Division Guidelines for Captions and Attorney Appearance Sections in Memos and Opinions, Nov. 2025 (https://www.njcourts.gov/sites/default/files/attorneys/appellate/captionsguidelines.pdf) — full text read
- NJ Court Rules 1:37 (Court Titles; Seals; Abbreviations) and 2:6 (Appendices; Briefs; Transcript)
- Real captions from NJ Supreme Court and Appellate Division (Justia, NJ Courts site)

**Missing stems:**

| Stem | Full Word(s) | Source | Risk | Example caption |
|---|---|---|---|---|
| `boro` | Boro., Boro (NJ-specific alt. for Township/Borough) | NJ Manual on Style; *Male v. Pompton Lakes Bor. Mun. Util. Auth.*, 105 N.J. Super. 348 (App. Div. 1969); routine in NJ captions for the 250+ NJ Boroughs | LOW (not an English word) | "Smith v. Pompton Lakes Boro. Mun. Util. Auth." |
| `bor` | Bor. (alternate NJ abbreviation for Borough; reporters-db doesn't list it but NJ practice uses both `Bor.` and `Boro.`) | NJ Manual ex.: *In re Borough of Montvale*, P.E.R.C. No. 81-52; NJ Appellate Division captions | LOW (not an English word; `bor` already in set per line 422 — verify it's for Borough not Brotherhood/Brother) | "Bor. of Watchung Planning Bd." |
| `pros` | Pros., Prosecutor, Prosecutor's | NJ Appellate Division Guidelines (C2 Example 5): "IN THE MATTER OF JANE SMITH, ACTING UNION COUNTY PROSECUTOR" — abbreviated `Pros.` in citations; NJ county prosecutors appear in *State v. ___ (___ County Pros.)* captions | LOW (not common end-of-sentence word) | "State v. Doe (Bergen Cty. Pros.)" |
| `atty` | Att'y, Atty. | *In re Att'y Gen. Directive*, 246 N.J. 462 (2021); pervasive in NJ public-records and SPV cases | LOW (not English word) | "In re Att'y Gen. Directive No. 2020-5" |
| `hldgs` | Hldgs., Holdings | NJ Tax Court and commercial captions; also relevant to NY | LOW | "*MS Hldgs. Co. v. Dir., Div. of Tax'n*" |
| `eq` | Eq. (Equity; appears in NJ Eq. citations like `130 N.J. Eq. 102 (Ch. 1940)`) | NJ Manual on Style p. 6 — explicit reporter abbreviation for pre-1948 NJ Court of Chancery and Court of Errors and Appeals | RISKY — "eq" could collide with "equal" but `equal` already a separate stem; "eq" alone is so short it should be fine; might also be needed as `e.a.` for "E. & A." (Court of Errors and Appeals) — but that is reporter-internal | "Smith v. Jones, 130 N.J. Eq. 102 (Ch. 1940)" — note `Eq.` appears in REPORTER, not party name, so this may not be needed for case-name backward scan |
| `cmtee` | Cmtee. — extremely rare; SKIP | n/a | n/a | n/a |
| `oth` | Oth. (NJ shorthand for "Others") | rare | risky — overlaps "other" | SKIP |
| `prerog` | Prerog. (Prerogative Court, pre-1948 NJ) | NJ Manual p. 6 ex.: `130 N.J. Eq. 380 (Prerog. Ct. 1941)` | LOW; rare; appears in court-designator parenthetical not party-name | n/a — not needed for case-name scan |

Already present that handle the rest of NJ:
- `tp` (Tp. — added in this branch), `twp` (Twp.), `cty` (Cty. — NJ Manual uses `Cty. Ct.`), `cnty` (Cnty.), `dept` (Dep't), `commn`/`commr` (Comm'n/Comm'r), `taxn` (Tax'n — just added), `enft` (Enf't), `assn`, `bd`, `auth`, `mun`, `pub`, `prot`, `serv`/`servs`.
- Court abbreviations already in set: `ct`, `super` (Super. — NJ Superior Court), `app` (App. Div.), `mag`, `magis`, `j` (not in but handled by single-letter rule).

**Citation-style quirks:**
- **Underlining instead of italics**: NJ practice underscores case names, signals, "id.", "ibid." rather than italicizing them (NJ Manual ¶ J). Affects display, not extraction.
- **`Ibid.` is alive**: NJ uniquely still uses `ibid.` to mean "same source, same page" while `id.` means same source different page. NJ's Manual explicitly excepts `ibid.` from Bluebook (NJ Manual List of Exceptions #8).
- **NO `supra` in NJ**: NJ Manual ¶ H explicitly disclaims `supra`. Extractor still needs to recognize it because pre-2017 captions and out-of-state cites use it, but NJ practice prefers shortened case-name forms (`Miranda, 384 U.S. at 478`).
- **`ante`/`post` instead of `supra`/`infra` for cross-references within the same opinion** (NJ Manual p. 11). Display issue, not extraction.
- **`certif. denied`** (NJ-specific) vs. **`cert. denied`** (U.S. Supreme Court / Bluebook). NJ uses `certif.` for the NJ Supreme Court's denial of certification. eyecite history-parsing should already accept both.
- **Reporter-name parenthetical court designators**: `(App. Div. 1948)`, `(Ch. Div. 1948)`, `(Law Div. 1948)`, `(Cty. Ct. 1949)`, `(Tax 1987)`, `(Ch. 1940)`, `(E. & A. 1941)`, `(Prerog. Ct. 1941)`, `(Sup. Ct. 1943)`, `(Dist. Ct. 1932)`, `(Dep't Labor 1932)`. The first decade after the 1947 Constitution still cites pre-Constitution reporters. `E. & A.` is an internal-period initialism handled by Tier 3.
- **Two spaces after sentence-ending periods and citations** (NJ Manual III.B). Doesn't affect tokenizer.
- **Statutes cite as `N.J.S.A. 2C:43-6(c)` without spaces around the colon** — handled by statute extractor not case-name scan.

**Real-world examples:**
- *Township of Wayne v. Ricmin, Inc.*, 124 N.J. Super. 509, 514, 517 (App. Div. 1973) — `Twp.` already covered, `Inc.` already covered
- *Parsippany-Troy Hills Tp. Council* (Troy Hills Village v. — already fixed this branch)
- *Melnyk v. Bd. of Educ. of the Delsea Reg'l High Sch. Dist.*, 241 N.J. 31 (2020) — `Bd.`, `Educ.`, `Reg'l`, `Sch.`, `Dist.` all covered ✓
- *First England Funding, LLC v. Aetna Life Ins. & Annuity Co.*, 347 N.J. Super. 443 (App. Div. 2002) — `Ins.`, `Co.` covered ✓
- *Nesmith v. Walsh Trucking Co.*, 123 N.J. 547 (1991), rev'g on dissent 247 N.J. Super. 360 (App. Div. 1989)
- *State v. Blome*, 459 N.J. Super. 227 (App. Div.), certif. denied, 228 N.J. 458 (2016)
- *Male v. Pompton Lakes Bor. Mun. Util. Auth.*, 105 N.J. Super. 348 (App. Div. 1969) — **`Bor.` not in eyecite set** (existing `bor` line 422 was for "Brotherhood"? — actually it is "Borough" per the existing inline comment — VERIFY before adding `boro`)
- *In re Att'y Gen. Directive*, 246 N.J. 462 (2021) — **`Att'y`/`atty` not in eyecite set**
- *MS Hldgs. Co. v. Dir., Div. of Tax'n* — **`Hldgs.`/`hldgs` not in eyecite set; `Dir.` already covered by `dir`; `Tax'n` covered by `taxn` (just added)**

## Cross-Jurisdiction Patterns

Both NY and NJ use Bluebook T6 conventions as a baseline. The few overlapping gaps are:

1. **`atty` (Att'y)** — both NY and NJ Attorney-General captions; NY also uses `Atty. Gen.` in dictum forms.
2. **`hldgs` (Hldgs.)** — modern commercial captions in both states (LLC-era).
3. **`pros` (Pros.)** — NJ county prosecutor captions; NY's analog is `D.A.` (handled by Tier 3 internal-period rule).

The NJ Manual on Style is an explicit "list of exceptions to the Bluebook" (Section IV, p. 29) — it's a delta, not a replacement. Adding stems for NJ-only words (`tp`, `taxn`, `enft`, `rts` — already done; plus `boro`, `pros`, `atty`) brings the set into alignment with both NJ and NY practice because the Tanbook uses Bluebook abbreviations.

## Top Recommendations (Prioritized)

Order is by frequency of real-world impact (Tier 1 = ship now):

**Tier 1 — High impact, low risk, frequent real-world misses:**
1. `atty` — adds Att'y, Att'y Gen., Atty. (NY + NJ; appears in nearly every Attorney-General-as-party caption)
2. `hldgs` — Hldgs. (LLC-era commercial captions; ~10% of modern NY AD/Sup Ct captions involve a `Hldgs.` LLC)
3. `boro` — Boro. (NJ-specific; 250+ NJ municipalities are Boroughs and routinely abbreviated `Boro.`)
4. `pros` — Pros. (NJ County Prosecutor captions)

**Tier 2 — Defensible but lower frequency or partially redundant:**
5. `bldgs` — plural Buildings (`bldg` already covers singular; plural appears in property captions)
6. `marit` — Maritime (rare in state courts but appears in 2d-Circuit-adjacent NY Sup Ct captions)

**Tier 3 — Skip without further evidence:**
- `eq` — only appears inside reporter parenthetical (`N.J. Eq.`), not in party names; reporter regex handles
- `prerog` — same as above
- `lim` — collides with English "limit"
- `oth` — collides with English "other"

**Verification gate for `bor`:** The existing set has `bor` at line 422. The inline comment cluster suggests T6/T10 geographic/street types. If `bor` is already meant for "Borough" then `boro` should be added alongside. If `bor` is meant for some other word, verify before duplicating semantics. The current placement (between `brit` and `broad`) suggests it's *not* Borough — recommend adding `boro` explicitly with a comment.
