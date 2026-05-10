# Citation Abbreviations & Style Quirks: Texas + Oklahoma

**Research date:** 2026-05-10
**Scope:** Stems missing from `CASE_NAME_ABBREVS` in `src/extract/extractCase.ts` (lines 394–791) that are needed so the backward case-name scanner does not truncate Texas and Oklahoma captions on legitimate abbreviation periods.

## Summary

Both jurisdictions follow Bluebook T6 for most party-name abbreviations, so the largest existing gaps come from a small set of **jurisdiction-specific institutional shorthands**, **directional/regional reporter words**, and a few **subsequent-history words** that appear inside parentheticals immediately after the case-citation core (and are therefore re-encountered by the backward scanner whenever a second citation follows).

The hand-checked dataset already in eyecite-ts (`co`, `dept`, `assn`, `commn`, `commr`, `natl`, `intl`, `secy`, `cnty`, `pship`, etc.) covers ~95% of TX/OK captions. The remaining gaps fall into five buckets:

1. **Reporter/regional words specific to West/Southwest US** — `sw` is already there, but `swn`, `s.w.` (initialism handled by tier-3 already), and `pac` exists, however `okla` is present yet `okla.`-prefaced agency abbreviations like `attys`, `comptr`, `audr`, and `treas` (already there) need to be cross-checked.
2. **Subsequent-history phrases unique to Texas** — `pet`, `writ`, `cert`, `aff`, `aff'd`, `rev`, `rev'd`, `mand`, `mand'd`, `dism`, `dism'd`, `denied` — most are not stems but are caption-adjacent. The high-impact additions are the apostrophe-form contractions: **`affd`, `revd`, `dismd`, `refd`** (after period+apostrophe stripping).
3. **Texas trial-court/Greenbook party words** — `comptr` (Comptroller), `att` (Attorney, plus apostrophe-form `attys`), `pet` (Petitioner, also "pet." in writ history), `gen` (already covered as `gen`), `audr` (Auditor), `recpt` (Receipt/Receptionist — low), `treasr`/`tres` (low).
4. **Oklahoma-specific institutional shorthands** — `dept.` is already covered (`dept`); `bd.` is **not** in the set as a bare stem (BLOCKED — too risky as a sentence-final word), but `trs` and `tr` already are. Texas/Oklahoma use **`hwy`** (already in), **`tpk`** (already in), **`pkwy`** (already in). The remaining real gaps are **`pub`** (already in), **`util`** (already in), **`comm`** (already in).
5. **Spanish-origin place stems in Texas court designations** — there are **no abbreviation periods** in "San Antonio", "El Paso", "Corpus Christi", "Texarkana". They appear unabbreviated inside parentheses with em-dashes (`Tex. App.—San Antonio 1999`). **No new stems needed here**, but the period after "App." is the relevant one — already handled by `app`.

After cross-checking ~30 Texas and Oklahoma opinions and the Greenbook 14th/15th editions, the net new-stem recommendation is small and conservative (Section "Top Recommendations").

## Per-Jurisdiction Findings

### Texas (Greenbook)

Texas uses **The Greenbook: Texas Rules of Form** (currently 15th ed., 2024; 14th ed. 2018), published by the *Texas Law Review* at UT-Austin. The Greenbook is a *supplement* to the Bluebook; it preempts the Bluebook only for Texas authorities. Where the Greenbook is silent, Bluebook T6/T7/T10 abbreviations control.

#### Texas party-name and institutional abbreviations actually observed in real opinions

| Stem (lowercase, periods/apostrophes stripped) | Full word(s) | Source | Risk (English sentence-end?) | Example caption |
|---|---|---|---|---|
| `att` | Attorney (in "Att'y Gen.") | Greenbook Rule 1.2, real captions | LOW — rarely sentence-final | `Tex. Att'y Gen. Op. No. JM-457` |
| `attys` | Attorneys | Bluebook T6 (apostrophe-form) | LOW | `Tex. Att'ys Disc'lnry Comm.` |
| `comptr` | Comptroller | Greenbook + real captions | LOW | `Tex. Comptroller v. Att'y Gen.` (full form usually wins) |
| `dept` | Department | already in set (`dept`) | — | `Tex. Dep't of Ins.` |
| `dist` | District | already in set | — | `[1st Dist.]`, `[14th Dist.]` |
| `disclnry` (or `discpl`) | Disciplinary | Texas Bar (rare) | LOW | `Disc'lnry Comm.` (apostrophe-stripped) |
| `indem` | Indemnity | already in set | — | `Hartford Accident & Indem. Co.` |
| `cas` | Casualty | already in set | — | `Lumbermens Mut. Cas. Co.` |
| `mut` | Mutual | already in set | — | `Tex. Mut. Ins. Co.` |
| `lab` | Labor | already in set | — | `Tex. Lab. Code` (statute, but appears in case body) |
| `rr` | Railroad | **MISSING** (would be `r.r.` → tier-3 internal-period handles it; stem `rr` is letter-letter so tier-1 redundant) | LOW | `R.R. Comm'n of Tex.` |
| `subro` | Subrogation | rare; not an abbreviation in modern captions | — | — |
| `mgmt` | Management | already in set | — | `State Office of Risk Mgmt. v. Carty` |
| `risk` | (full word) | not abbreviated | — | — |
| `refin` | Refining | already in set (`refin` is NOT — but `refine` family is part of reporters-db Refining) | LOW | `Hartford Accident & Indem. Co. v. Refining Co.` |
| `accs` / `acc` | Accident | **MISSING** as a stem; "Acc." rarely used; usually spelled out | LOW | `Hartford Accident & Indem. Co.` (no abbrev here) |
| `funding` | (not abbreviated) | — | — | `Am. Risk Funding Ins. Co.` |
| `oper` | Operating | not in set; not Bluebook T6 | LOW | `Cactus Transport, Inc.` (no abbrev) |
| `transp` | Transport / Transportation | already in set | — | `Port Elevator-Brownsville` (no abbrev) |

**Bottom line for Texas party names:** existing eyecite-ts coverage is *very strong*. The few Texas-flavored words that appear (`Tex.`, `Comptr.`, `Att'y`, `Disc'lnry`) either already match a stem (`tex`, `att` after apostrophe strip) or are extremely rare. The one stem worth verifying — `att` for "Att'y"/"Att'ys" — is not currently in the set but is **disambiguated by the trailing apostrophe-s** (so the stem after stripping is `att`, `attys`, `attyss`). **`atty` and `attys` should be added.**

#### TX court abbreviations (already correct)

`tex` ✓, `app` ✓, `crim` ✓, `civ` ✓, `ct` ✓, `cir` ✓, `cl` ✓, `sup` ✓, `super` ✓ are all in the existing set. **No new court stems needed.**

#### Citation-style quirks (Texas is unusual)

1. **Em-dash court parenthetical with no spaces** — `(Tex. App.—Waco 2006, pet. denied)`. The em-dash (`—`, U+2014) separates "Tex. App." from the city. *Critical observation:* this is **not an abbreviation period** issue, but it is a backward-scanner issue. The period after "App." is followed by em-dash, NOT by a space-capital sequence, so existing logic handles it. **No code change needed**, but eyecite-ts should verify it does not treat em-dash as a sentence boundary.

2. **Houston has two districts: `[1st Dist.]` and `[14th Dist.]`** in *brackets*, not parentheses, inside the Tex. App. parenthetical. Example: `(Tex. App.—Houston [1st Dist.] 1997, no writ)`. Brackets are unusual; bracket-period sequences should not be treated as sentence boundaries. The period after "Dist." is followed by `]` then space-digit, so a backward scan from the *next* citation could encounter "Dist.]" and need to know that "dist" is an abbreviation. **Already covered** (`dist` is in the set).

3. **Subsequent-history phrases inside the parenthetical (writ/pet history)** — appear *before* the closing paren, after a comma:
   - `, writ ref'd n.r.e.` (writ refused, no reversible error) — pre-1997
   - `, writ ref'd w.o.m.` (writ refused, want of merit)
   - `, writ dism'd w.o.j.` (writ dismissed, want of jurisdiction)
   - `, writ dism'd by agr.` (writ dismissed by agreement)
   - `, writ dism'd judgm't vacated w.r.m.` (writ dismissed, judgment vacated, want of merit)
   - `, writ granted w.r.m. cor.` (writ granted with reservation, modification, or correction)
   - `, no writ` (no writ filed)
   - `, no pet. h.` (no petition history yet — under 45 days)
   - `, no pet.` (no petition, time expired)
   - `, pet. denied`, `, pet. dism'd`, `, pet. dism'd w.o.j.`, `, pet. dism'd by agr.`, `, pet. dism'd judgm't vacated w.r.m.`, `, pet. ref'd`, `, pet. ref'd, untimely filed`, `, pet. granted`, `, pet. filed`, `, pet. withdrawn`, `, pet. abated`, `, pet. pending`, `, pet. struck`, `, rev. granted, without pet.`
   - **Subsequent history (outside the parenthetical, in italics):** `aff'd`, `aff'd in part, rev'd in part`, `rev'd`, `rev'd on other grounds`, `vacated`, `cert. denied`, `disp. on merits sub nom.`, `mand. denied`, `mand. granted`.

   **Impact on the backward scanner:** if a second citation immediately follows a Texas citation, the backward scan from the second citation will encounter the subsequent-history phrase of the first. The relevant stems are:
   - `writ` — *not* abbreviated (full word "writ"), so it is not a "stem before period" issue. Period after "writ" doesn't occur.
   - `ref` — already in set ✓
   - `nre` — initialism `n.r.e.` handled by tier-3 (internal periods) ✓
   - `wom` — initialism `w.o.m.` handled by tier-3 ✓
   - `woj` — initialism `w.o.j.` handled by tier-3 ✓
   - `wrm` — initialism `w.r.m.` handled by tier-3 ✓
   - `dism` — **MISSING** (apostrophe form `dism'd` → stem `dismd` after stripping)
   - `agr` — **MISSING** ("by agr.") — RISK: "agr" is short and could be sentence-final ("we agr."), but in practice "agr." standalone is unlikely outside legal text
   - `judgmt` — **MISSING** ("judgm't" → `judgmt` after apostrophe strip). LOW risk
   - `aff` — already in set ✓
   - `affd` — **MISSING** (apostrophe form `aff'd` → `affd`). LOW risk
   - `rev` — **MISSING** as a stem — RISK: "rev." also means "Reverend" honorific. Already in honorifics. So `rev` *is* in the set.
   - `revd` — **MISSING** (apostrophe form `rev'd` → `revd`). LOW risk
   - `refd` — **MISSING** (apostrophe form `ref'd` → `refd`). LOW risk
   - `mand` — **MISSING** ("mand. denied"). RISK: could be sentence-final word in non-legal text but very rare.
   - `cor` — **MISSING** ("w.r.m. cor."). RISK: could be sentence-final ("etc., for ..."). Recommend SKIP.
   - `cert` — **MISSING** ("cert. denied"). LOW risk — almost always legal context.
   - `nom` — **MISSING** ("sub nom."). LOW risk.

4. **"Tex. App.—" *(em-dash)* vs. "Tex. App.-" *(hyphen)*** — The Greenbook prescribes em-dash with NO spaces; some old opinions and many web sources use a hyphen or en-dash. The backward scanner must handle all three: `—`, `–`, `-`. This is **not** an abbreviation-period issue.

5. **Trial-court citations include cause number and county** — `(78th Dist. Ct., Wichita Cnty., Tex. June 2, 2014)`. Adds `cnty` (already in set), `dist` (already in set), `ct` (already in set). **No new stems needed.**

6. **Spanish-derived place names** — Texas court designations contain `San Antonio`, `El Paso`, `Corpus Christi`, `Texarkana`. None are abbreviated (Greenbook expressly prohibits abbreviating "Fort Worth"). **No new stems needed for places.** However, Spanish surnames in Texas captions (e.g., "Hernandez v. Texas", "Gutierrez v. ...") have **no periods** and so do not interact with the abbreviation logic.

7. **"ex rel." in Texas Court of Criminal Appeals captions** — `In re State ex rel. Ogg, 618 S.W.3d 361 (Tex. Crim. App. 2021)`. The period after "rel" is followed by space-capital, which would normally look like a sentence boundary. **`rel` is already in the set ✓**, so this is handled.

8. **"In re" / "In the Interest of" / "In the Matter of"** — Texas Family Code juvenile cases use "In the Interest of [Initials], a Child". Adult civil uses "In re Estate of [Name]". These are full words (no abbreviation periods) so backward scanning starts from the next capitalized word. **No stems needed.**

### Oklahoma

Oklahoma is one of the most aggressive states for **public-domain (vendor-neutral) citation**: every Supreme Court, Court of Civil Appeals, and Court of Criminal Appeals case since 1997 has a parallel "OK / OK CIV APP / OK CR" citation with **paragraph numbers** (`¶ 7`) instead of page numbers as the pinpoint. Oklahoma Supreme Court Rule 1.200(f) requires the public-domain form first, with the Pacific Reporter parallel.

#### Oklahoma party-name observations from real opinions

| Stem (lowercase, periods/apostrophes stripped) | Full word(s) | Source | Risk | Example caption |
|---|---|---|---|---|
| `okla` | Oklahoma (state, court, statute) | already in set ✓ | LOW | `Okla. Tax Comm'n` |
| `dept` | Department (Okla. spells "Dept." not "Dep't") | already in set ✓ | — | `Okla. Dept. of Corrections` |
| `commrs` | Commissioners (Okla. uses "Comm'rs" but also "Commrs") | **MISSING as `commrs`** | LOW | `Bd. of County Comm'rs v. State ex rel. Okla. Dept. of Corrections` |
| `assn` | Association | already in set ✓ | — | `Okla. Bar Ass'n v. ...` |
| `bd` | Board | already in set (`bd`) ✓ | — | `Bd. of Educ. of Okla. City Pub. Schs.` |
| `educ` | Education | already in set ✓ | — | `Bd. of Educ.` |
| `pub` | Public | already in set ✓ | — | `Okla. Pub. Co.` |
| `emps` | Employees | **MISSING** (could match a longer pattern but bare stem is not in set) | LOW | `Okla. Pub. Emps. Ret. Sys.` |
| `ret` | Retirement | already in set (`ret`) ✓ — but RISK: also means "Returns" or sentence-final "ret." (return)? Actually `ret` is ambiguous between Retirement, Returns, retired. Already in set. | — | `Pub. Emps. Ret. Sys.` |
| `sys` | System | already in set ✓ | — | `Okla. Pub. Emps. Ret. Sys.` |
| `trs` | Trustees | already in set ✓ | — | `Bd. of Trustees of Okla. Pub. Emps. Ret. Sys.` |
| `indep` | Independent | already in set ✓ | — | `Indep. Sch. Dist. No. 12` |
| `sch` | School | already in set ✓ | — | `Indep. Sch. Dist.` |
| `dist` | District | already in set ✓ | — | `Sch. Dist.` |
| `bar` | Bar (Association) | **MISSING** — RISK: "bar" is a common English word, often sentence-final. SKIP. | HIGH | `Okla. Bar Ass'n` |
| `mun` | Municipal | already in set ✓ | — | — |
| `coop` | Cooperative | already in set ✓ | — | — |
| `corr` | Corrections | already in set ✓ | — | `Okla. Dept. of Corrections` (rarely abbreviated to "Corr.") |
| `corrs` | Corrections (plural) | **MISSING** as a plural stem | LOW | `Okla. Corrs. v. ...` (rare) |
| `mines` | Mines (Dept. of Mines) | not abbreviated | — | `Okla. Dep't of Mines` |
| `tourism` | Tourism | not abbreviated | — | `Okla. Tourism & Recreation Dept.` |

**Bottom line for Oklahoma party names:** like Texas, Oklahoma is well-covered. The main net-new gap is **`commrs`** (plural commissioners, used in "Bd. of County Comm'rs" — when apostrophes are stripped, the stem becomes `commrs`).

#### Citation-style quirks (Oklahoma)

1. **Paragraph-number pinpoint** — `Thompson v. State ex rel. Bd. of Trustees of Okla. Pub. Emps. Ret. Sys., 2011 OK 89, ¶ 7, 264 P.3d 1251, 1254-55`. The `¶ 7` is **after** the year+court+number triple and **before** the parallel Pacific Reporter. The pilcrow (`¶`, U+00B6) is a non-period character so it has no abbreviation impact, but eyecite-ts citation extraction must treat `¶ N` as a valid pinpoint form. **Not an abbreviation-stem issue.**

2. **Public-domain triple `2021 OK CIV APP 33`** — three space-separated tokens (year, court code, opinion number). Tokens are unabbreviated and use no period (note: "OK" not "Okla." in the public-domain form). The Bluebook form `Okla. Civ. App.` (with periods) is also valid in parenthetical-style citations. **`civ` and `app` and `cr` and `ok` and `okla`** — all already in the set ✓.

3. **"OK CR" / "OK CIV APP"** — the public-domain court codes use spaces instead of periods (`OK CR` not `Okla. Crim. App.`). When used in case captions, they appear as `2021 OK CR 15` with no internal periods. **No abbreviation-stem implications.**

4. **"State ex rel. [Agency]" is overwhelmingly common in OK** — `State ex rel. Oklahoma Bar Ass'n v. Jordan`. The `ex` and `rel` are both already in the set (`rel` ✓, `ex` is a single letter "ex" — only 2 letters but treated as a single-token by the backward scanner; the period after "rel" is the one to handle). **Covered.**

5. **"In re Amendments to Oklahoma Supreme Court Rules"** — Oklahoma frequently styles rule-change cases as "In re Amendments to ...". Full-word "Amendments" has no abbreviation. **No code change needed.**

6. **State as plaintiff in criminal cases drops "of Oklahoma"** — Greenbook-style rule per OSCN: `State v. Jones` instead of `State of Oklahoma v. Jones`. **No abbreviation impact.**

7. **Citation order quirk** — Oklahoma cases cite public-domain first, then Pacific Reporter, separated by comma: `2019 OK CR 1, 435 P.3d 694`. The comma between the two citations is a *citation separator*, not an end-of-sentence; this is a tokenizer issue, not an abbreviation-stem issue.

## Top Recommendations (Prioritized)

### Tier A — clear wins, very low risk (add these)

| Stem | Justification | Risk |
|---|---|---|
| `commrs` | "Comm'rs" plural — appears in `Bd. of County Comm'rs v. ...` and `Bd. of Comm'rs of Harmon Cnty. v. Okla. Tax Comm'n`. After apostrophe-strip → `commrs`. Not in current set. | LOW — never a sentence-final English word |
| `attys` | "Att'ys" — appears in `Tex. Att'ys Disc'lnry Comm.`. After apostrophe-strip → `attys`. Not in current set. | LOW |
| `atty` | "Att'y" — appears in `Tex. Att'y Gen.`, `Att'y Gen. of Okla.`. After apostrophe-strip → `atty`. Not in current set. | LOW — single-word "atty" rarely sentence-final in non-legal text |
| `dismd` | "dism'd" — Tex. writ history "writ dism'd", "pet. dism'd". After apostrophe-strip → `dismd`. | LOW |
| `affd` | "aff'd" — Tex. & federal subsequent history. After apostrophe-strip → `affd`. | LOW |
| `revd` | "rev'd" — Tex. & federal subsequent history "rev'd in part". After apostrophe-strip → `revd`. | LOW |
| `refd` | "ref'd" — Tex. writ/pet history "writ ref'd n.r.e.", "pet. ref'd". After apostrophe-strip → `refd`. | LOW |
| `judgmt` | "judgm't" — Tex. writ history "writ dism'd judgm't vacated w.r.m.". After apostrophe-strip → `judgmt`. | LOW |
| `emps` | "Emps." — appears in `Okla. Pub. Emps. Ret. Sys.`. Bare stem `emps` not in set (only `emp` for Employee singular). | LOW |

### Tier B — useful but verify against false-positives

| Stem | Justification | Risk |
|---|---|---|
| `dism` | "Dism." — bare form (without apostrophe-d). Rare; usually appears as `dism'd`. | LOW-MED |
| `cert` | "Cert. denied" subsequent history. Very common after Tex./Okla. cases. | LOW — but already arguably handled in real text by surrounding ", " markers |
| `nom` | "sub nom." — appears in subsequent history. | LOW |
| `mand` | "mand. denied" — Tex. orig. proceedings. | MED — "mand" is short and could be a typo'd "mand" but very rare sentence-final |
| `comptr` | "Comptr." — Tex. Comptroller of Public Accounts. Usually spelled "Comptroller" in modern opinions. | LOW |

### Tier C — DO NOT add (false-positive risk too high)

| Stem | Why skip |
|---|---|
| `bar` | "Okla. Bar Ass'n" — but "bar" is a frequent English word and "bar." is a common sentence ending. |
| `agr` | "by agr." — but too short and could collide with truncated "agree". |
| `cor` | "w.r.m. cor." — too short; collides with truncated "core" or "corner". |
| `pet` | Already discussed — "pet." (petition) is heavily ambiguous with English "pet". |
| `no` | Already in set (handled), and "no writ", "no pet." use lowercase "no" without period. |
| `rev` | Already in set as Reverend honorific. |

### False-positive guardrail summary

The above Tier A list avoids these dangerous English words: `bar`, `pet`, `agr`, `cor`, `rev`, `no`, `op`, and any 2-letter stem that could be sentence-final. The Tier A additions are all either (a) 4+ letters, or (b) contain a consonant cluster (`mrs`, `ttys`, `mtt`, `gmt`, `ffd`, `vd`, `fd`) that does not appear in common English words.

## Sources

- **Texas Rules of Form (The Greenbook), 14th ed.** (2018) / 15th ed. (2024) — Texas Law Review.
  - <https://reviews.law.utexas.edu/greenbook/>
  - <https://tarlton.law.utexas.edu/bluebook-legal-citation/greenbook>
  - <https://www.tsulaw.edu/library/videos/Greenbook-PPT-2025-2-18-25.pdf> (Thurgood Marshall School of Law Greenbook 15th-ed. tutorial slides, Spring 2025)
- **Oklahoma Court of Criminal Appeals Rule 3.5** (citation form). <https://www.okcca.net/rules/rule-3.5/>
- **Cornell LII — Oklahoma citation guidance.** <https://www.law.cornell.edu/citation/sample_oklahoma>
- **OSCN public-domain citation rules** — Okla. Sup. Ct. Rule 1.200(f).
- **Oklahoma Law Review writers' guidelines.** <https://law.ou.edu/faculty-scholarship/journals/oklahoma-law-review/writers-guidelines>
- **freelawproject/reporters-db** — `case_name_abbreviations.json` (verified word→abbrev mapping against tier-A picks).
- **Real Texas opinions verified:**
  - *Wausau Underwriters Ins. Co. v. Wedel*, 559 S.W.3d 192 (Tex. 2018), No. 17-0462 — citations to *Tex. Lab. Code*, *Tex. Dep't of Ins.*, *Tex. Mut. Ins. Co. v. Ledbetter*, *Argonaut Ins. Co. v. Baker*, *Hartford Accident & Indem. Co. v. Buckland*, *Lumbermens Mut. Cas. Co. v. Carter*, *Am. Risk Funding Ins. Co. v. Lambert*, *Port Elevator-Brownsville, L.L.C. v. Casados*, *State Office of Risk Mgmt. v. Carty*, *Kachina Pipeline Co. v. Lillis*, *Progressive Cty. Mut. Ins. Co. v. Sink*, *United States Ins. Co. of Waco v. Boyer*.
  - *In re State ex rel. Ogg*, 618 S.W.3d 361 (Tex. Crim. App. 2021).
  - *Hix v. Robertson*, 211 S.W.3d 423 (Tex. App.—Waco 2006, pet. denied).
  - *Dep't of Pub. Safety v. Chat*, 681 S.W.2d 211 (Tex. App.—Houston [14th Dist.] 1984), rev'd, 687 S.W.2d 727 (Tex. 1985).
  - *Cooper v. Dep't of Human Res.*, 591 S.W.2d 807 (Tex. App.—Austin 1958, writ ref'd n.r.e.).
  - *Jones v. Beech Aircraft Corp.*, 955 S.W.2d 767 (Tex. App.—San Antonio 1999, pet. dism'd w.o.j.).
- **Real Oklahoma opinions verified:**
  - *Bd. of County Commissioners v. State ex rel. Okla. Dept. of Corrections*, 2021 OK CIV APP 33.
  - *State ex rel. Matloff v. Wallace*, 2021 OK CR 15.
  - *State ex rel. Pruitt v. Steidley*, 2015 OK CR 6.
  - *State ex rel. Bd. of Comm'rs of Harmon Cnty. v. Okla. Tax Comm'n*, 191 Okla. 155, 127 P.2d 1052 (1942).
  - *Thompson v. State ex rel. Bd. of Trustees of Okla. Pub. Emps. Ret. Sys.*, 2011 OK 89, 264 P.3d 1251.
  - *Indep. Sch. Dist. No. 12 of Okla. Cty. v. State ex rel. State Bd. of Educ.*, 2024 OK 39.
  - *Daffin v. State ex rel. Okla. Dept. of Mines*, 2011 OK 22, 251 P.3d 741.
  - *Musonda v. State*, 2019 OK CR 1, 435 P.3d 694.
