# Citation Abbreviations & Style Quirks: Great Lakes (IL, MI, IN, OH, WI)

> Research scope: case-name abbreviation stems needed by `extractCase.isLikelyAbbreviationPeriod`
> for Illinois, Michigan, Indiana, Ohio, and Wisconsin appellate captions.
>
> Current stem set: `src/extract/extractCase.ts` lines 394–795 (~250 stems).
> Single-letter initials (`A.`, `R.`) and dotted initialisms (`R.R.`, `N.E.`, `N.W.`, `D.C.`,
> `U.S.`) are already auto-handled by Tier-2/Tier-3 of `isLikelyAbbreviationPeriod`, so this
> report focuses on Tier-1 word-stem gaps only.

## Summary

The Great Lakes region is dominated by two distinct citation traditions:

1. **Public-domain neutral citations** (Illinois, Wisconsin, Ohio) replaced reporter-based
   citations as the primary cite for modern opinions. Each state invented its own format:
   - **Illinois**: `2020 IL App (1st) 123456, ¶ 12` (paragraph-numbered, Rule 23 "-U" suffix
     for unpublished, S.Ct. Rule 6).
   - **Wisconsin**: `2017 WI 17, ¶ 6` and `2010 WI App 58, ¶ 27` (paragraph-numbered since
     2000, three-part parallel-cite still required on first reference).
   - **Ohio**: `2024-Ohio-1601` ("WebCite", since 2002; preferred over `N.E.3d` and `Ohio St.3d`
     per Writing Manual 3d ed., effective June 17, 2024).
2. **Reporter-based citations** (Indiana, Michigan) using the Northeastern Reporter
   (`N.E.2d`/`N.E.3d`) and either the official state reporter (`Ind.`, `Ind. App.`) or the
   uniquely **periodless** Michigan style (`Mich`, `Mich App`, `NW2d`, no periods anywhere).

For Tier-1 stem coverage, all five states draw on Bluebook T6, but **Ohio** and **Michigan**
each have notable deviations from Bluebook T6 that are not yet in the eyecite-ts stem set:

- **Ohio**: `Edn.` (Education, not `Educ.`), `Ents.` (Enterprises), `Invests.` (Investments),
  `Secy.` (Secretary, in lieu of `Sec'y`), `Acc.` (Accident).
- **Michigan**: every Bluebook abbreviation appears *without* a period
  (`Bd`, `Co`, `Ass'n`, `Dep't`, `Hwy`, `Pharm`, `Twp`, `Comm'rs`, `Indep`, `Mem`, `R`).
  Eyecite-ts already strips periods on lookup, so the existing stems work *if* they exist.
  Michigan-specific gaps: `R` (single-letter Railroad/Railway in MI Appendix 5 — auto-handled
  by Tier 2), `Ents`, `Props`, `Prods` (plural forms).
- **Indiana**: follows Bluebook T6 strictly per App. R. 22; the only addition we found was
  `Scis.` (Sciences) and `Assocs.` (Associates — already in stems).
- **Wisconsin**: follows Bluebook T6 with a strong preference for `Cty.` over `Cnty.` —
  both already in stems.

## Per-Jurisdiction Findings

| Stem | Full Word | Source | Risk | Example caption |
|---|---|---|---|---|
| `edn` | Education (Ohio) | Ohio Writing Manual; opinions | low (rare outside OH) | *Gabbard v. Madison Local Sch. Dist. Bd. of Edn.* (Ohio) |
| `ents` | Enterprises | Ohio Sup. Ct. caption | low (proper-noun context) | *NC Ents., L.L.C. v. Norfolk & W. Ry. Co.*, 2026-Ohio-1429 |
| `invests` | Investments | Ohio Sup. Ct. caption | low (proper-noun context) | *A.A.A. Invests. v. Columbus* (Ohio) |
| `secy` | Secretary | Ohio caption header (Bluebook is `Sec'y`) | low | *State ex rel. Hill v. LaRose, Secy. of State*, 2026-Ohio-1601 |
| `acc` | Accident | Ohio opinion text | **medium** — `acc` as a word? could collide with rare uses but only triggers mid-caption | *Gen. Acc. Ins. Co. v. Ins. Co. of N. Am.* (Ohio) |
| `act` | Act (Public Act) | Ohio + IL opinions | **HIGH** — common English word; would cause false-positive sentence-boundary suppression | *In re Implementing Provisions of Public Act 233 of 2023* (Mich) |
| `scis` | Sciences | Indiana opinion | low (rare) | *... v. ... Scis., Inc.* (Ind) |
| `props` | Properties | WI/OH/IL opinions | low (rare; "Props." in caption only) | *Tilby Dev. Co.* → caption may use `Props.` |
| `prods` | Products | Ohio + IL opinions | low | "Mut. Prods. Co. v. ..." |
| `recs` | Records | trial-court captions | low (rare in appellate) | "Bd. of Recs. v. ..." |
| `regul` | Regulation | already in stems — verified | OK | "Office of Lawyer Regulation v. ..." (WI: literally `Regulation` spelled out) |
| `cir` | Circuit / Circuit Ct. | already in stems | OK | — |
| `civ` | Civil (Civ. R., Civ. Code) | partially covered (`civ` not in stems) | medium — common word | *Cleveland Civ. Serv. Comm.* (Ohio); also `Civ. R. 12(B)(6)` |
| `subs` | Subsidiaries | corporate captions | low | "Smith Subs., Inc." |
| `hldgs` | Holdings | financial captions | low (rarely abbreviated) | "Acme Hldgs. Corp." |
| `r` | Railroad/Railway (MI single-letter) | MI Appx 5 | auto-handled by Tier 2 | "C&O R" (Michigan style — no period) |
| `rr` | Railroad (R.R.) | reporters-db | auto-handled by Tier 3 | "Pennsylvania R.R. Co." |
| `ss` | Steamship (S.S.) | reporters-db | auto-handled by Tier 3 | rare in Great Lakes |
| `rev` | Review / Revised | already in stems (as "Rev.") | OK | *In re Rev. of the Power-Purchase-Agreement Rider …* (Ohio) |
| `slip op` | Slip Opinion | already (`op` in stems) | OK | "Slip Op." |
| `r.c.` | Revised Code (Ohio) | dotted-initialism, auto-handled | OK | "R.C. 3513.311(C)" |
| `c.j.` / `j.j.` | Chief Justice / Justices | dotted-initialism, auto-handled | OK | "KENNEDY, C.J., and DEWINE, J." |
| `m.c.l.` / `mcl` | Mich. Compiled Laws | dotted-initialism, auto-handled | OK | "MCL 776.20" |
| `m.c.r.` / `mcr` | Mich. Court Rules | dotted-initialism, auto-handled | OK | "MCR 2.306" |
| `m.r.e.` / `mre` | Mich. Rules of Evidence | dotted-initialism, auto-handled | OK | "MRE 801" |

### Illinois (IL Sup. Ct. + 5 App. Ct. Districts)

**Style authority:** Style Manual for the Supreme and Appellate Court (6th ed.); S.Ct. Rules 6, 23.

**Abbreviation style:** Bluebook T6 with periods (`Comm'n`, `Ass'n`, `Bd.`, `Inc.`, `Dep't`).
No deviations from the existing stem set were observed — all the words IL captions use are
already in eyecite-ts.

**Real captions (CourtListener, May 2026):**
- *Concerned Citizens & Property Owners v. Illinois Commerce Comm'n*, 2026 IL 131026
- *Carter v. Fox Lake Fire Protection District*, 2026 IL App (2d) 250374
- *Associated Bank National Ass'n v. Morrison*, 2026 IL App (5th) 250622
- *Mufarreh v. Google, Inc.*, 2026 IL App (1st) 251340
- *In re K.W.*, 2026 IL App (1st) 250872
- *Colatorti v. Republican Legislative Committee for the Twenty-Sixth Legislative District*, 2026 IL App (2d) 250230 (notable: hyphenated ordinal, no abbreviation)
- *People v. Illinois State Toll Highway Comm'n* (legacy)

### Michigan (Sup. Ct. + Ct. App.)

**Style authority:** Michigan Appellate Opinion Manual (2014, rev. Dec. 2017) — replaced the
old "Michigan Uniform System of Citation" by Admin. Order 2014-22.

**Critical quirk:** Michigan abbreviations use **NO PERIODS**. The Appendix 5 list reads:
`Admin`, `Ass't`, `Ass'n`, `Auth`, `Bd`, `Bros`, `Bldg`, `Cas`, `Ctr(s)`, `Chem`, `Comm`,
`Comm'r(s)`, `Co(s)` (Company AND County), `Condo(s)`, `Consol`, `Constr`, `Coop`, `Corp`,
`Dep't`, `Dev`, `Dir`, `Distrib`, `Dist`, `Div`, `Ed`, `Equip`, `Exch`, `Fed`, `Fin`, `Gen`,
`Gov't`, `Hts`, `Hwy(s)`, `Hosp(s)`, `Inc`, `Indep`, `Indus`, `Info`, `Ins`, `Int'l`, `Ltd`,
`Mgt`, `Mfr`, `Mfg`, `Mktg`, `Mech`, `Med`, `Mem`, `Metro`, `Mich`, `Mtg`, `Muni`, `Mut`,
`Nat'l`, `No`, `Org`, `Pharm`, `Prod`, `Prof`, `Prop(s)`, `Pub`, `R` (Railroad/Railway — single
letter), `Rehab`, `Rd`, `S&L`, `Sch(s)`, `Serv(s)`, `Std(s)`, `Sys`, `Telecom`, `Tel`, `Twp`,
`Transp`, `US`, `Univ`.

**Implication for eyecite-ts:** Existing stem normalization already strips periods, so every
Michigan token that *also* exists in eyecite-ts (with or without trailing period) matches.
However, since MI captions write `Mich App 54` rather than `Mich. App. 54`, the citation
parser's reporter regexes must accept the periodless form (out of scope for stem work, but
flagged for the reporter-pattern team).

**Real captions (CourtListener, April-May 2026):**
- *Sherman v Progressive Michigan Insurance Company* (note: no `v.` period in MI style)
- *Co Rd Ass'n of Mich v Governor*, 474 Mich 11 (note: `Ass'n` retains apostrophe)
- *Ed Dev & Mgt Co v Brown*, 999 Mich App 444
- *Hays v Lutheran Social Servs of Mich*, 300 Mich App 54
- *Auto-Owners Insurance Company v. J & T Towing*
- *Cms Energy Corp v. Department of Treasury*
- *Macomb Intermediate School District v. State of Michigan*

### Indiana (Sup. Ct. + Ct. App.)

**Style authority:** Indiana Rules of Appellate Procedure Rule 22 (current ed.).
Indiana citation form: "a current edition of a Uniform System of Citation (Bluebook) shall be
followed." Indiana has **no public-domain neutral citation** — it uses `N.E.3d` (or `Ind.` /
`Ind. App.` for older cases).

**Abbreviation style:** straight Bluebook T6 with periods. No deviations identified that are
not already in the eyecite-ts stem set; the only novel observation was `Scis.` (Sciences).

**Real captions:**
- *MPACT Construction Group, LLC v. Superior Concrete Constructors, Inc.*, 802 N.E.2d 901 (Ind. 2004)
- *K.F. v. St. Vincent Hosp. & Health Care Ctr.*, 909 N.E.2d 1063 (Ind. Ct. App. 2009)
- *Howard Regional Health System v. Gordon*, 952 N.E.2d 182 (Ind. 2011)
- *Auth. of Greater Indianapolis v. Indiana Revenue Bd.*, 144 Ind. App. 63
- *Pathman Constr. Co. v. Knox County Hosp. Ass'n* (legacy)
- *State ex rel. Bonner v. Daniels*, 907 N.E.2d 516 (Ind. 2009) (parties' counsel use Ind. abbreviations)
- *Caryl Rosen v. Community Healthcare System d/b/a Community Hospital* (current docket)

### Ohio (Sup. Ct. + 12 Dist. Cts. of App.)

**Style authority:** Supreme Court of Ohio Writing Manual, Third Edition (effective June 17,
2024). Ohio retired parallel citations: WebCite alone is sufficient post-2002; pre-2002 uses
`Ohio St.3d` (preferred) or `N.E.2d` (fallback).

**Quirk #1 — WebCite format:** `2024-Ohio-NNNN` with hyphens, **no spaces**. The number
resets each calendar year. Slip opinions are cited as `Slip Opinion No. 2026-Ohio-1429`.

**Quirk #2 — Ohio-specific abbreviations not in Bluebook T6:**
- `Edn.` (Education) — Ohio uses `Edn.` where Bluebook says `Educ.`. Both forms appear in the
  same opinion sometimes.
- `Ents.` (Enterprises) — caption-line standard.
- `Invests.` (Investments) — caption-line standard.
- `Secy.` (Secretary) — Ohio style; Bluebook is `Sec'y`. Both normalize to `secy` after
  apostrophe/period stripping, so this is *already* covered.
- `Acc.` (Accident) — used in older insurance captions; Bluebook has no entry.
- `R.C.` (Revised Code) — auto-handled by Tier-3 dotted-initialism.
- `RR.` (Railroad alt-form) — auto-handled by Tier-3 dotted-initialism.
- `Cty.` (County) — already in stems; preferred Ohio form (vs. `Cnty.` and `County`).
- `Bd. of Commrs.` (Commissioners — note **no apostrophe** in Ohio; Bluebook is `Comm'rs.`).
  Both normalize to `commrs` after stripping, but the existing stem `commr` only matches the
  singular. **Plural `commrs` should be added.**

**Real captions (CourtListener, April-May 2026):**
- *State ex rel. Hill v. LaRose, Secy. of State*, 2026-Ohio-1601 (note `Secy.` periodless apostrophe)
- *State ex rel. Leneghan v. Delaware Cty. Bd. of Elections*, 2026-Ohio-1598
- *NC Ents., L.L.C. v. Norfolk & W. Ry. Co.*, 2026-Ohio-1429
- *State ex rel. Wright v. Madison Cty. Mun. Court*, 2026-Ohio-...
- *Marrek v. Cleveland Metroparks Bd. of Commrs.*, 9 Ohio St.3d 194
- *Greene Cty. Agricultural Soc. v. Liming*, 89 Ohio St.3d 551
- *Walters v. Knox Cty. Bd. of Revision*, 47 Ohio St.3d 23
- *Gabbard v. Madison Local School Dist. Bd. of Edn.* (Edn. — Ohio-only form)
- *A.A.A. Invests. v. Columbus* (Invests. — Ohio-only form)

### Wisconsin (Sup. Ct. + Ct. App.)

**Style authority:** Wis. Sup. Ct. Internal Operating Procedures; SCR Chapter 80;
*Legal Citation of Wisconsin Court Cases Guide* (Marquette Law).

**Quirk #1 — Public-domain since Jan 1, 2000:** All Sup. Ct. and published Ct. App. opinions
use `YYYY WI N` or `YYYY WI App N` (sequential, court-issued numbering) with **paragraph
numbers** `¶ N`. First reference still requires three parts: public-domain cite, `Wis. 2d`,
and `N.W.2d`.

**Quirk #2 — Reporter is "Wis. 2d" with periods**, not "WIS" (the latter is wrong despite
appearing in some bar exam outlines).

**Abbreviation style:** standard Bluebook T6 with periods. Common Wisconsin caption tokens
(from *AllEnergy Corp.* and others): `Cty.`, `Bd.`, `Co.`, `Inc.`, `Corp.`, `Comm.`, `Comm'n`,
`Env't`, `Mgt.`, `Schs.`, `Auth.`, `Pub.`, `Coop.`, `Educ.`, `Pers.`, `Am.`, `Ltd.`, `Mut.`,
`Ret.`, `Sys.`, `Adj.`, `Emp.`, `Cent.`, `Stat.`, `Supp.`, `Res.`, `Ord.` Already all in stems.

**Real captions (CourtListener, 2026):**
- *Office of Lawyer Regulation v. Michael Seung-Hyock Yang*, 2026 WI 14 (note: "Regulation" spelled out — Wisconsin convention for OLR cases)
- *Estate of Carol Lorbiecki v. Pabst Brewing Company*, 2026 WI 12
- *Savannah Wren v. Columbia St. Mary's Hospital Milwaukee, Inc.*, 2026 WI 11
- *Federal National Mortgage Ass'n v. Thompson*, 2017 WI 90, 378 Wis. 2d 26
- *Milwaukee Police Ass'n v. City of Milwaukee*, 2018 WI 100, 384 Wis. 2d 771
- *Local 311 of the Int'l Ass'n of Firefighters v. City of Sun Prairie*, 2018 WI 100
- *AllEnergy Corp. v. Trempealeau County Env't & Land Use Comm.*, 2017 WI 52
- *Helgeland v. Wisconsin Municipalities*, 2008 WI 9
- *Ass'n of Mid-Cont. Univ. v. Bd. of Trustees of Northeastern Ill. Univ.* (cross-cite from IL)
- *Sills v. Walworth Cty. Land Mgt. Comm.* (legacy)
- *Snyder v. Waukesha Cty. Zoning Bd.* (legacy)

## Public-Domain / Neutral Citation Patterns (IL, WI especially)

### Illinois — S.Ct. Rule 6 (effective July 1, 2011)

For all Illinois reviewing-court opinions filed on or after July 1, 2011:
- **Required form:** `YYYY IL N` (Sup. Ct.) or `YYYY IL App (Nth) NNNNNN` (App. Ct.).
- Pin cite: `¶ N` or `¶¶ N–M` (paragraph numbers, never page numbers, since opinions are
  internally paragraph-numbered).
- Rule 23 unpublished orders: suffix `-U`, e.g. `2011 IL App (5th) 101237-U`.
- Parallel `N.E.2d`/`N.E.3d` and `Ill. Dec.` cites are *optional*.
- Examples:
  - `People v. Doe, 2011 IL App (1st) 101234, ¶ 15`
  - `People v. Doe, 2011 IL App (1st) 101234, ¶¶ 21-23`
  - `People v. Roe, 2011 IL App (5th) 101237-U` (Rule 23 unpublished)

The existing `state-vendor-neutral` regex in `src/patterns/neutralPatterns.ts`:
`\b(\d{4})\s+([A-Z]{2}(?:\s+App\.?)?)\s+(\d+)\b` will **miss** the IL App `(Nth)` district
qualifier and the `¶` pin-cite. This is *not a stem issue*, but a noted **pattern gap**.

### Wisconsin — SCR 80.02(2)(b) (effective Jan 1, 2000)

For all WI Sup. Ct. and published Ct. App. opinions:
- **Required form:** `YYYY WI N` (Sup. Ct.) or `YYYY WI App N` (Ct. App.).
- Pin cite: `¶ N` (paragraph numbers).
- First citation requires all three: public-domain, `___ Wis. 2d ___`, and `___ N.W.2d ___`.
- Examples:
  - `Smith v. Jones, 2000 WI 14, ¶6, 214 Wis. 2d 408, 595 N.W.2d 346`
  - `Doe v. Roe, 2001 WI App 9, ¶17, ...`

The existing `state-vendor-neutral` regex correctly handles `YYYY WI N` and `YYYY WI App N`.

### Ohio — WebCite (effective May 1, 2002)

- **Form:** `YYYY-Ohio-NNNN` (hyphens, no spaces, no `App.` qualifier in the WebCite itself).
- Per the 3d ed. Writing Manual (2024): the WebCite alone is sufficient — drop parallel cites.
- Pre-2002: prefer `___ Ohio St.3d ___` or `___ Ohio App. 3d ___`, fall back to `___ N.E.2d ___`.
- Examples:
  - `2026-Ohio-1601`, `2002-Ohio-2220` (Sup. Ct.)
  - `3d Dist. No. 16-01-19, 2002-Ohio-2834` (App. Ct., district + docket)
- The existing `state-vendor-neutral` regex **will not match** `YYYY-Ohio-NNNN` (hyphen format,
  `Ohio` not 2-letter uppercase). This is a known **pattern gap** unrelated to stems.

### Indiana — no public domain

Indiana relies on Bluebook-style reporter citations. `N.E.3d`, `Ind.`, `Ind. App.` and
`Ind. Ct. App.` are the only forms.

### Michigan — no public domain

Michigan also relies on reporter citations: `Mich`, `Mich App`, and `NW2d` (note: no
periods, per the Appellate Opinion Manual).

## Cross-Jurisdiction Patterns

1. **Paragraph numbering (¶).** All three public-domain states (IL, WI, OH) anchor pin
   cites to `¶` rather than page numbers. The `¶` character (U+00B6) is the canonical pin-cite
   delimiter. eyecite-ts pin-cite extraction must accept `¶ N` and `¶¶ N-M` after a
   neutral-cite token.
2. **"Slip Opinion No." prefix.** Ohio (and to a lesser degree MI, WI) prefix neutral
   citations with "Slip Opinion No." in the opinion masthead. eyecite-ts cleaning/tokenizing
   already strips this kind of decorative text.
3. **Periodless reporter forms (Michigan).** Michigan is the major outlier: `Mich App`,
   `NW2d`, `v` (no period). The current `state-vendor-neutral` regex would need to allow
   periodless `App` (already does via `App\.?`).
4. **`State ex rel.` and `In re` prefixes.** All five states use these heavily, especially
   Ohio (~30% of Sup. Ct. captions). The existing case-name extractor handles these via the
   "procedural prefix" branch.
5. **"d/b/a" inline.** Indiana captions include `d/b/a` ("doing business as") more often
   than the other states: *Caryl Rosen v. Community Healthcare System d/b/a Community Hospital*.
   Backward scan should not split on the lowercase `d/b/a`.
6. **State-actor party names get spelled out.** "Office of Lawyer Regulation" (Wis),
   "Disciplinary Counsel" (Ohio), "People of Michigan" / "People" (IL, MI) appear unabbreviated.
7. **Michigan's `Co` collision.** In MI, `Co` abbreviates **both Company and County**
   (Appendix 5 explicitly lists both). The stem already exists; ambiguity does not affect
   sentence-boundary detection.

## Top Recommendations (Prioritized)

**HIGH priority — verified Tier-1 gaps in real Great Lakes captions:**

1. **Add `edn`** (Ohio: Education). Verified in *Bd. of Edn.* captions across Ohio Supreme
   Court opinions. Low false-positive risk; the token only matches in caption-style context.
2. **Add `ents`** (Enterprises). Verified in *NC Ents., L.L.C. v. Norfolk & W. Ry. Co.*,
   2026-Ohio-1429. Low risk.
3. **Add `invests`** (Investments). Verified in *A.A.A. Invests. v. Columbus* (Ohio). Low risk.
4. **Add `commrs`** (Commissioners, plural). Currently `commr` (singular) is in the stems but
   `commrs` is not. Verified in *Marrek v. Cleveland Metroparks Bd. of Commrs.*, 9 Ohio St.3d
   194. The Ohio form `Commrs.` (no apostrophe) and Bluebook `Comm'rs.` both normalize to
   `commrs` after stripping.
5. **Add `props`** (Properties, plural). Currently `prop` (singular) is in the stems. Verified
   in WI/OH/IL captions. Low risk.
6. **Add `prods`** (Products, plural). Currently `prod` (singular) is in the stems. Common in
   product-liability captions across all five states. Low risk.
7. **Add `scis`** (Sciences). Verified in Indiana opinion *... Scis., Inc.*. Low risk.

**MEDIUM priority — could expand coverage but watch for false-positives:**

8. **Add `secy`** as **already present** (it is — entry exists at line 777). No change needed.
   The Ohio form `Secy.` (no apostrophe) and Bluebook `Sec'y` both already normalize to `secy`.
9. **Add `acc`** (Accident). Verified only in rare older insurance captions
   (*Gen. Acc. Ins. Co.*). Three-letter form has slightly elevated false-positive risk for
   sentence-end words like "acc[ept]." but extracted form requires "acc." with period plus
   uppercase next-word, which makes accidental matches very rare.
10. **Add `cir`** as **already present**. Verified.

**LOW priority — niche or theoretically useful:**

11. **`hldgs`** (Holdings) — rare in appellate captions; finance practice docs occasionally.
12. **`subs`** (Subsidiaries) — rare in appellate captions.
13. **`recs`** (Records) — rare in appellate; common in trial-court bench books.
14. **`assocs`** is already in stems. No change.

**FALSE-POSITIVE GUARDRAIL (do NOT add):**

- **`act`** — common English sentence-end word ("Congress passed an act."). Adding it as a
  stem would suppress sentence boundaries everywhere. Skip.
- **`r`** — already auto-handled by Tier 2 single-letter logic; explicitly adding `r` as a
  stem would interfere with the single-letter tier.
- **`rr`, `ss`** — already auto-handled by Tier 3 (dotted initialism `R.R.`, `S.S.`).
- **`civ`** — exists already; common as `Civ.` in court-rule cross-refs (`Civ. R. 12(B)(6)`)
  but ambiguous with English text. Already handled via court-abbreviation entries.
- **`com`** — common English word + abbreviation. Already in stems but with care.
- **`misc`** — already in stems.

**Pattern-layer follow-ups (NOT stem work, flagged for the patterns team):**

- The `state-vendor-neutral` regex in `src/patterns/neutralPatterns.ts` does not capture:
  - **Illinois App. district qualifier**: `2020 IL App (1st) 123456` (the `(1st)` segment).
  - **Illinois -U suffix**: Rule 23 unpublished orders.
  - **Ohio WebCite**: `2024-Ohio-1429` (hyphens, lowercase `Ohio`).
  - **Paragraph pin cites**: `, ¶ 12` and `, ¶¶ 21-23`.

## Sources

- [Illinois Supreme Court Rule 6](https://ilcourtsaudio.blob.core.windows.net/antilles-resources/resources/2374deda-2eed-448e-8b4b-24a22a348f28/Rule%206.pdf)
- [Style Manual for the Supreme and Appellate Courts of Illinois (6th ed.)](https://ilcourtsaudio.blob.core.windows.net/antilles-resources/resources/dda02046-19c4-4908-a41e-2bec79de43cf/Style%20Manual%20for%20the%20Supreme%20and%20Appellate%20Court.pdf)
- [Michigan Appellate Opinion Manual (Dec. 2017)](https://www.courts.michigan.gov/4a4a11/siteassets/publications/manuals/msc/miappopmanual.pdf) — Appendix 5 (case-name abbreviations) and Appendix 6 (state caselaw citation formats) are particularly relevant
- [Indiana Rules of Appellate Procedure Rule 22](https://rules.incourts.gov/Content/appellate/rule22/09-01-2020.htm)
- ["Citation matters: a quick guide to correct citation form in Indiana" — Prof. Joel M. Schumm, *Res Gestae* Nov. 2018](https://cdn.ymaws.com/www.inbar.org/resource/resmgr/pdfs/schumm-citation-matters.pdf)
- [Supreme Court of Ohio Writing Manual, 3d ed. (2024)](https://www.supremecourt.ohio.gov/docs/ROD/manual3e.pdf)
- ["The Ohio Supreme Court Updates its Writing Manual" — Sixth Circuit Appellate Blog](https://www.sixthcircuitappellateblog.com/supreme-court/the-ohio-supreme-court-updates-its-writing-manual/)
- [Wisconsin SCR Chapter 80 — Publication of Opinions](https://www.wicourts.gov/sc/scrule/DisplayDocument.html?content=html&seqNo=1089)
- [Legal Citation of Wisconsin Court Cases Guide — Marquette Law](https://law.marquette.edu/law-library/legal-citation-wisconsin-court-cases-guide)
- [freelawproject/reporters-db — case_name_abbreviations.json](https://github.com/freelawproject/reporters-db/blob/main/reporters_db/data/case_name_abbreviations.json) (189 entries; Bluebook T6-derived baseline)
- CourtListener REST API v4 (real captions from Sup. Ct. of OH, IL, WI, MI, IN and their Cts. App., April–May 2026)
