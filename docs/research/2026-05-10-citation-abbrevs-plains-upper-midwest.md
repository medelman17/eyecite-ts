# Citation Abbreviations & Style Quirks: Plains + Upper Midwest (MN, IA, MO, KS, NE, ND, SD)

> Research scope: case-name abbreviation stems needed by `extractCase.isLikelyAbbreviationPeriod`
> for the seven Plains / Upper-Midwest jurisdictions.
>
> Current stem set: `src/extract/extractCase.ts` lines 394–863 (~330 stems after the
> 2026-05-10 14-jurisdiction survey expansion). Single-letter initials (`A.`, `J.`) and
> dotted initialisms (`U.S.`, `N.W.`, `R.R.`, `S.S.`) are auto-handled by Tier-2/Tier-3
> of `isLikelyAbbreviationPeriod`, so this report focuses on Tier-1 word-stem gaps only.
>
> Verification: real captions pulled from CourtListener `/api/rest/v4/search/` across all
> twelve target appellate courts (`minn`, `minnctapp`, `iowa`, `iowactapp`, `mo`,
> `moctapp`, `kan`, `kanctapp`, `neb`, `nebctapp`, `nd`, `sd`).

## Summary

This region is **substantially Bluebook-conforming**. Minnesota, Iowa, Missouri, Kansas,
North Dakota, and South Dakota use standard Bluebook T6 abbreviations as already covered
by eyecite-ts. The one significant outlier is **Nebraska**, which has a documented
in-house style that drops the apostrophe from `Comm'r`/`Comm'rs`/`Ass'n` (writing them as
`Comr.`/`Comrs.`/`Assn.`) and abbreviates `Equalization` as `Equal.` — a pattern present
in hundreds of "Bd. of Equal." captions. North Dakota and South Dakota are notable not
for caption abbreviations but for **public-domain neutral citations** (`2020 ND 12`,
`2020 SD 12`) adopted in 1997/1996 respectively; these are tokenizer concerns rather
than backward-scan concerns.

Net Tier-1 gap is small: 6–8 stems concentrated in Nebraska + agricultural co-op patterns.

## Per-Jurisdiction Findings

### Minnesota (Sup. Ct. + Ct. App.)

**Style authority:** Minnesota Statewide Standard Citation rules and the
Minnesota Style Manual (formerly *Minn. Manual of Style*). MN appellate rules permit
Bluebook citation forms.

**Real captions sampled (CourtListener):**
- *Lake Country Power Coop. v. Comm'r of Revenue* (minn)
- *Glacial Plains Coop. v. Chippewa Valley Ethanol Co., LLLP* (minn)
- *McEa v. Comr. of Mpca* (minnctapp) — note `Comr.` here (rare in MN)
- *Anderson v. Indep. Sch. Dist. 696* (minnctapp)
- *Roemer v. Board of Supervisors of Elysian Twp.* (minn)
- *In re Annexation of Certain Real Prop. to the City of Proctor from Midway Twp.* (minn)
- *In re Condemnation by Sub-Urban Hennepin Regional Park District* (minnctapp)
- *Investors Sav. Bank, F.S.B. v. Miller* (minnctapp)
- *Middle-Snake-Tamarac Rivers Watershed District v. Stengrim* (minn)
- *Rolling Meadows Cooperative, Inc. v. Macatee* (minnctapp)
- *Phone Recovery Servs., LLC v. Qwest Corp.* (minn)

**Gaps:** **None confirmed** — every abbreviation observed (`Coop.`, `Comm'r`, `Indep.`,
`Twp.`, `Prop.`, `Sav.`, `Servs.`) is already in the stem set. Minnesota captions tend
to spell out party names in full ("State of Minnesota v. ..."), so the
abbreviation surface is small.

### Iowa (Sup. Ct. + Ct. App.)

**Style authority:** Iowa Court Rules; legislative services agency style manual; Bluebook.
Iowa R. App. P. 6.1601 — *Chart D: Citation Examples*.

**Real captions sampled:**
- *Worthwhile Wind, LLC v. Worth County Board of Supervisors* (iowa)
- *State of Iowa ex rel. Iowa Dep't of Transp. v. Honey Creek Drainage District No. 6 Board of Trustees …* (iowa)
- *Lindflott v. Drainage Dist. No. 23* (iowactapp)
- *Pieper, Inc. v. Green Bay Levee & Drainage District No. 2* (iowactapp)
- *NEW Cooperative, Inc. v. Lee Clemon* (iowactapp)
- *Viafield, F/K/A Progressive Ag Cooperative and Farmers Cooperative v. Robert Engels* (iowactapp)
- *Midwest Ambulance Serv. of Iowa, Inc. v. Del. Twp.* (iowactapp)
- *Sheeler v. Nev. Cmty. Sch. Dist.* (iowactapp)
- *Bethany Lutheran Health Services v. Patricia Cumpston* (iowactapp)
- *Veatch v. Bartels Lutheran Home* (iowactapp)
- *Morrison ex rel. Estate v. Grundy Cnty. Rural Elec. Coop.* (iowactapp)
- *Rottinghaus v. Lincoln Sav. Bank* (iowactapp)
- *Stateline Cooperative v. Property Assessment Appeal Board* (iowactapp)

**Gaps:** **None confirmed.** Iowa captions show heavy Drainage District / Levee / Co-op
content but all use stems already in the set (`Dist.`, `Coop.`, `Sav.`, `Serv.`, `Cmty.`,
`Sch.`, `Cnty.`, `Elec.`). Iowa is not a public-domain experimenter; reporter cites are
N.W.2d only.

### Missouri (Sup. Ct. + Ct. App. — E.D., W.D., S.D.)

**Style authority:** *Show Me Citations: A Manual for Legal Citations in Missouri Courts*
(2016 ed.); Mo. S. Ct. R. 84.04(d).

**Real captions sampled:**
- *Treasurer of the State of Missouri – Custodian of the Second Injury Fund v. Diana Penney* (mo)
- *Comprehensive Health of Planned Parenthood Great Plains, et al., Respondents, vs. State of Missouri, et al., Appellants.* (mo)
- *State ex rel. Mo. Dep't of Soc. Servs. v. Dougherty* (moctapp)
- *Mo. Pub. Serv. Comm'n v. Union Elec. Co.* (mo)
- *New Madrid County v. St. John Levee & Drainage District* (moctapp)
- *Consolidated Drainage District No. 2 of Scott County v. Mock* (moctapp)
- *Bare v. Carroll Elec. Coop. Corp.* (moctapp)
- *Moody v. Kan. City Bd. of Police Comm'rs* (moctapp)
- *Hogan v. Bd. of Police Com'rs of Kan. City* (moctapp) — `Com'rs` apostrophe-form
- *Zoological Park Subdistrict of the Metro. Park Museum Dist. v. Smith* (moctapp)
- *Ste. Genevieve County Levee District 2 v. Luhr Bros., Inc.* (moctapp)
- *Treas. of Missouri-Custodian v. Hudgins* (moctapp)
- *Bd. of Directors of Richland Twp. v. Kenoma, LLC* (moctapp)

**Gaps:** **None confirmed.** MO uses Bluebook T6 (`Coop.`, `Elec.`, `Dist.`, `Bros.`,
`Twp.`, `Treas.`, `Comm'rs`, `Soc.`, `Servs.`, `Dep't`) — all in the set. The
**E.D./W.D./S.D.** district designations are court-name abbreviations (handled at
citation-form level, not party-name backward scan) and are dotted initialisms auto-handled
by Tier 3.

### Kansas (Sup. Ct. + Ct. App.)

**Style authority:** Kan. S. Ct. R. 6.07, 6.08. Kansas requires the **official Kansas
reporter citation** plus parallel `P.2d`/`P.3d` (Pacific). Caption form is Bluebook T6.

**Real captions sampled:**
- *Stormont-Vail Healthcare v. Kansas Dept. of Health and Environment* (kanctapp)
- *Bd. of Riley County Comm'rs v. Kansas Historical Society* (kanctapp)
- *Deters v. Nemaha-Marshall Electric Cooperative Ass'n* (kanctapp)
- *Prairie Land Electric Cooperative, Inc. v. Kansas Electric Power Cooperative, Inc.* (kan)
- *FreeState Electric Cooperative, Inc. v. Kansas Dept. of Revenue* (kan)
- *Wheatland Electric Cooperative v. Polansky* (kan)
- *Bank IV Olathe v. Capitol Fed'l Savings & Loan Ass'n* (kan)
- *Sajadi v. Kansas Bd. of Healing Arts* (kanctapp)
- *KAW RIVER DRAINAGE DIST. v. Lindstrom* (kanctapp)
- *Dougan v. Rossville Drainage District* (kan)
- *Fed. Nat'l Mortg. Ass'n v. Sharp* (kanctapp)
- *Estate of Kuebler v. Kansas Village at Old Town* (kanctapp)
- *Bluestem Telephone Co. v. Kansas Corporation Comm'n* (kanctapp)
- *Robertson v. Bayer CropScience AG* (kan)
- *Rural Water District No. 3 v. Rural Water District No. 8* (kanctapp)
- *Smith v. Ruskin Mfg.* (kanctapp)
- *Estate of Sajadi v. Kan. Dep't of Revenue*-style cites use `Dept.` (no apostrophe)

**Gaps observed but already in set:** `Dept.` (handled via existing `dept`), `Coop.`,
`Mfg.`, `Comm'n`, `Ass'n` — all present.

**Quirk:** Kansas opinions historically used `Dept.` (no apostrophe) more than `Dep't`,
but both forms strip to `dept` post-normalization and hit the same stem.

### Nebraska (Sup. Ct. + Ct. App.)

**Style authority:** Neb. Ct. R. App. P. 2-103; Nebraska Reporter style. Nebraska's
in-house citation style **drops apostrophes** from certain Bluebook contractions —
producing `Comr./Comrs./Assn.` rather than `Comm'r/Comm'rs/Ass'n`. This is a
substantive deviation from T6.

**Real captions sampled (illustrating the deviation):**
- *Amorak v. Cherry Cty. Bd. of Comrs.* (neb) — `Comrs.`
- *Kowalewski v. Madison Cty. Bd. of Comrs.* (neb)
- *Frenchman Valley Co-op v. Deuel Cty. Bd. of Comrs.* (nebctapp)
- *Lancaster Cty. Bd. of Equal. v. Moser* (neb) — `Equal.` (Equalization)
- *Cain v. Custer Cty. Bd. of Equal.* (neb)
- *Inland Ins. Co. v. Lancaster Cty. Bd. of Equal.* (neb)
- *Perkins Cty. Bd. of Equal. v. Mid America Agri Prods.* (neb)
- *Hillsborough Homeowners Assn. v. Karnish* (nebctapp) — `Assn.` no apostrophe
- *Nebraska Firearms Owners Assn. v. City of Lincoln* (neb)
- *McGill Restoration v. Lion Place Condo. Assn.* (neb)
- *Heineman v. Evangelical Lutheran Good Samaritan Soc'y* (neb)
- *Dodge Cty. Humane Soc. v. City of Fremont* (neb)
- *Ag Valley Co-op v. Servinsky Engr.* (neb) — `Engr.` (Engineering)
- *Nelson Engr. Constr. v. Austin Bldg. & Design* (nebctapp)
- *Jacobs Engr. Group v. ConAgra Foods* (neb)
- *Cramer v. Union Pacific RR. Co.* (neb) — `RR.` (Tier-3 auto-handled)
- *Cyboron v. Merrick County* (neb)
- *Skyline Ranches Prop. Owners Assn. v. City of Omaha* (nebctapp)
- *Maloley v. Cent. Neb. Pub. Power & Irrigation Dist.* (neb)
- *Aksamit Resource Mgmt. v. Nebraska Pub. Power Dist.* (neb)
- *Diversified Telecom Servs. v. State* (neb)
- *Workman v. Hornady Mfg. Co.* (nebctapp)
- *FIRST FEDERAL SAV. & LOAN v. Wyant* (neb)
- *NEBRASKA LEAGUE OF SAV. & LOAN v. Johnson* (neb)
- *Country Partners Cooperative v. Steenson* (nebctapp)
- *Hintz v. Farmers Co-op Assn.* (neb)
- *Becher v. Hunt Irrigation* (nebctapp)
- *State ex rel. Counsel for Dis. v. Pearson* (neb) — `Dis.` (Discipline?)

| Stem | Full Word | Source | Risk | Example caption |
|---|---|---|---|---|
| `comrs` | Commissioners (Nebraska — no apostrophe variant) | Neb. reporter style | low — clearly proper-noun mid-caption context | *Amorak v. Cherry Cty. Bd. of Comrs.* |
| `comr` | Commissioner (Nebraska — no apostrophe variant) | Neb. reporter style | low | *McEa v. Comr. of Mpca* (MN); *Frenchman Valley Co-op v. Deuel Cty. Bd. of Comrs.* |
| `equal` | Equalization (Nebraska Board of Equal.) | Neb. reporter style | **medium** — `equal` is a common English word; **DOES NOT** appear before final period in normal prose mid-sentence, but the `Bd. of Equal. v.` pattern is so common in NE that this is worth the small risk | *Lancaster Cty. Bd. of Equal. v. Moser*, *Hilt v. Douglas Cty. Bd. of Equal.* |
| `engrs` | Engineers plural (Nebraska + national engineering captions) | corpus | low | *Hillsborough Homeowners Assn. v. Karnish*-style; *EAD Engr. v. Purac America* (sing. already in set) |
| `dis` | Discipline (Nebraska "Counsel for Dis.") | Neb. attorney-discipline opinions | **HIGH** — `dis` is also a common-English prefix/word fragment; recommend **NOT adding** | *State ex rel. Counsel for Dis. v. Pearson* |

Note: `Assn.` (without apostrophe) is already covered by existing `assn` stem (added in
2026-05-10 expansion). `Engr.` is already covered by existing `engr`. `Co-op` (hyphenated)
contains no period and is not abbreviation-detected.

### North Dakota (Sup. Ct. + Ct. App. — public-domain since Jan 1, 1997)

**Style authority:** N.D. R. Ct. 11.6 — Medium-Neutral Case Citations (effective Mar 5,
1997). For opinions issued on or after Jan 1, 1997, the public-domain citation is
**required** in addition to the N.W.2d citation.

**Real captions sampled:**
- *Gjovig v. New Century Ag* (nd) — `Ag` (Agriculture)
- *Bobcat of Mandan v. Doosan Bobcat North America* (nd)
- *Galpin v. Cantina Holdings* (nd)
- *Poseley v. Homer Township* (nd)
- *Arnegard v. Arnegard Township* (nd)
- *Owego Township v. Pfingsten* (nd)
- *Skogen v. Hemen Township Board of Township Supervisors* (nd)
- *Fairville Township v. Wells Cty. Water Resource District* (nd)
- *Grand Prairie Agriculture v. Pelican Township Board of Supervisors* (nd)
- *Nodak Electric Coop. v. N.D. Public Svc. Commission* (nd)
- *McKenzie Electric Coop., Inc. v. El-Dweek* (nd)
- *Grzeskowiak v. Nodak Electric Coop.* (nd)
- *McKenzie Cnty. Soc. Servs. v. G.F. (In re Interest of G.F.)* (nd)
- *Cass Cnty. Soc. Servs. v. A.C. (In re Interest of A.C.)* (nd)
- *Grinnell Mut. Reins. Co. v. Farm & City Ins. Co.* (nd) — `Reins.`
- *American Federal Bank v. Grommesh* (nd)
- *First Federal Sav. and Loan Ass'n v. Scherle* (nd)
- *Northern Pacific Railway Co. v. Morton County* (nd)
- *Superior, Inc. v. Behlen Mfg. Co.* (nd)
- *Frith v. The Park District of the City of Fargo* (nd)
- *Kondrad Ex Rel. McPhail v. Bismarck Park District* (nd)

| Stem | Full Word | Source | Risk | Example caption |
|---|---|---|---|---|
| `reins` | Reinsurance | T6 + ND/IA opinions | low (proper-noun context) | *Grinnell Mut. Reins. Co. v. Farm & City Ins. Co.* (ND) |
| `ag` | Agriculture (bare/short form, distinct from existing `agric`) | ND + region | **HIGH** — `ag` collides with common English ("from ag students…"). **NOT recommended** | *Gjovig v. New Century Ag* (nd) — appears at *end* of caption, not before period |

Note: most ND captions spell out `Township`, `Park District`, `County`, `Public Service`,
etc. — minimal abbreviation surface compared to Nebraska. The neutral-citation form
`2020 ND 12, ¶ 5` is a tokenizer/extractor concern, not a backward-scan concern; eyecite
already handles `ND` as a known reporter via reporters-db.

### South Dakota (Sup. Ct. — public-domain since Jan 1, 1996)

**Style authority:** S.D. R. App. P. 15-26A-69 — public-domain citation system. The ND
rule (Mar 1997) explicitly mentions following the South Dakota model.

**Real captions sampled:**
- *Little v. Hanson County Drainage Board* (sd)
- *Hostler v. Davison County Drainage Commission* (sd)
- *Ellingson Drainage v. Dep't of Revenue* (sd)
- *Matter of Drainage Permit of McAreavey* (sd)
- *Schuelke v. Belle Fourche Irrigation District* (sd)
- *Barnaud v. Belle Fourche Irrigation District* (sd)
- *Nelson v. Belle Fourche Irrigation District* (sd)
- *Ehlebracht v. Crowned Ridge Wind II, LLC and S.D. Pub. Util. Comm'n* (sd)
- *Coester v. Waubay Twp.* (sd)
- *McLAEN v. WHITE TOWNSHIP* (sd)
- *Niemi v. Fredlund Township* (sd)
- *Krier v. Dell Rapids Twp.* (sd)
- *Alto Township v. Mendenhall* (sd)
- *Rosander v. Bd. of Cty. Comr's of Butte Cty.* (sd) — `Comr's` apostrophe-form
- *Mrose Development Co. v. Turner County Bd. of Commissioners* (sd)
- *Peterson v. Evangelical Lutheran Good Samaritan Society* (sd)
- *Scotlynn Transport, LLC v. Plains Towing & Recovery, LLC* (sd)
- *Guardianship and Conservatorship of Flyte* (sd)
- *Conservatorship of Bachand* (sd)

**Gaps:** **None confirmed.** SD captions are minimal-abbreviation. Bluebook T6 stems
(`Twp.`, `Bd.`, `Cty.`, `Comm'rs`, `Coop.`, `Mut.`, `Pub. Util. Comm'n`) all present.
SD's *neutral-citation form* `2020 SD 12, ¶ 12` is a reporter/parsing concern handled
elsewhere.

## Neutral-Citation Patterns (ND, SD)

Both ND and SD are early adopters of medium-neutral / public-domain citation, predating
all other states except OK. These are **citation-form** quirks, not party-name-abbreviation
quirks — but they affect tokenizer expectations.

| Court | Adoption | Form | Pinpoint | Notes |
|---|---|---|---|---|
| ND Sup. Ct. | Jan 1, 1997 | `2020 ND 12` | `, ¶ 5` (paragraph) | Required *in addition to* N.W.2d cite per Rule 11.6 |
| ND Ct. App. | Jan 1, 1997 | `2020 ND App 12` | `, ¶ 5` | Separate sequence from Sup. Ct. |
| SD Sup. Ct. | Jan 1, 1996 | `2020 SD 12` (or `S.D.`) | `, ¶ 12` | First state to adopt; ND followed |
| NE | none (regional only) | `309 Neb. 12` or `8 Neb. App. 12` | page-based | NE has **no** public-domain citation; uses N.W.2d + Neb. + Neb. App. |
| MN | none | `911 N.W.2d 12` | page-based | No public-domain experiment; uses N.W.2d only |
| IA | none | `912 N.W.2d 99` | page-based | No public-domain experiment |
| MO | none | `911 S.W.3d 12` | page-based | Three Ct. App. districts: Mo. Ct. App. E.D., W.D., S.D. — dotted initialisms |
| KS | none | `311 Kan. 12` / `60 Kan. App. 2d 12` (parallel to P.3d) | page-based | Rule 6.08 requires official Kansas reporter cite + Pacific Reporter |

The `2020 ND 12` and `2020 SD 12` forms have **no period** inside the court designator
(unlike "S.D." in `S.D. Pub. Util. Comm'n` which is the geographic abbreviation), so
they don't trigger the backward-scanner. They are tokenized as neutral cites in
`src/patterns/`.

## Cross-Jurisdiction Patterns

1. **N.W. / N.W.2d / N.W.3d** is the dominant regional reporter for MN, IA, NE, ND, SD.
   The dotted-initialism `N.W.` triggers Tier 3 of `isLikelyAbbreviationPeriod` and is
   already auto-handled.
2. **Co-op / Cooperative** is heavily represented in this agricultural region. Captions
   use both the hyphenated `Co-op` (no period — irrelevant for backward scan) and the
   abbreviated `Coop.` (in set). Examples: *Stateline Cooperative*, *Ag Valley Co-op*,
   *Frenchman Valley Co-op*, *FreeState Electric Cooperative*, *Nodak Electric Coop.*,
   *Hintz v. Farmers Co-op Assn.*
3. **Drainage District / Levee District / Irrigation District** are common in IA, MO,
   KS, SD, NE. All use `Dist.` (in set).
4. **Bd. of Equal.** is the most distinctive Nebraska pattern — see Nebraska section.
5. **County abbreviations**: NE/SD/MO use `Cty.` (in set) more than `Cnty.` (in set);
   both already covered.

## False-Positive Guardrails

Stems I considered but **decline to recommend** because the false-positive risk on
ordinary English exceeds the value:

| Stem | Why I Considered It | Why I Decline |
|---|---|---|
| `ag` | *Gjovig v. New Century Ag* (ND) | `ag` collides with sentence-end "ag" (e.g., "from ag.") and is too short to be safe. The single ND caption uses `Ag` *at end of name* (no period in `Ag` — it's the proper-noun spelling), so it doesn't even need a stem. |
| `equal` | Nebraska "Bd. of Equal." pattern (many real captions) | `equal` is an extremely common English adjective. While "Bd. of Equal. v. …" is a clear caption context, the rest of normal English prose ("they were equal. then …") would fire false positives. **Recommend testing**: if false-positive rate is low, add. |
| `dis` | *State ex rel. Counsel for Dis.* (NE) | Too generic / common prefix; would fire on any sentence ending "dis." or "discount." etc. |
| `aux` | Considered for "Aux." (Auxiliary) | Few matches; collides with French "aux" and corporate names |
| `sam` | *Good Samaritan Soc'y* → considered abbreviating Samaritan | Not actually abbreviated in any sampled caption — full word "Samaritan" or "Sam." rare in this region |

## Top Recommendations (Prioritized)

After de-duplicating against the existing ~330-stem set (and the recently-added 58 stems):
**only 3 new Tier-1 stems** are needed, plus **1 medium-risk stem** for consideration.

### Tier 1 — Add now (low risk)

1. `comrs` — Commissioners (Nebraska no-apostrophe variant). Real-caption confirmation in
   *Amorak v. Cherry Cty. Bd. of Comrs.*, *Kowalewski v. Madison Cty. Bd. of Comrs.*,
   *Frenchman Valley Co-op v. Deuel Cty. Bd. of Comrs.* Distinct from existing `commrs`
   (with two m's).

   **Wait** — checking the existing set more carefully: `commrs` IS already present (line
   804), and after normalization `Comm'rs.` → `commrs` (strip apostrophe and period).
   `Comrs.` → `comrs` after normalization. These are **different stems** because the
   underlying spelling differs by one `m`. Need to add `comrs` separately.

2. `comr` — Commissioner (singular Nebraska variant). Real-caption: *McEa v. Comr. of
   Mpca* (MN), *Frenchman Valley Co-op v. Deuel Cty. Bd. of Comrs.* (sing. forms also
   appear in NE attorney-discipline captions). Distinct from existing `commr`.

3. `reins` — Reinsurance. Real-caption: *Grinnell Mut. Reins. Co. v. Farm & City Ins.
   Co.* (ND); also common nationally (T6 lists "Reins." for Reinsurance). Low risk —
   `reins` is a noun ("reins" on a horse) but rarely sentence-final.

### Tier 2 — Add with caution (test for false positives)

4. `equal` — Equalization (Nebraska "Bd. of Equal."). High-volume Nebraska pattern but
   `equal` is a common English adjective. **Recommend: do not add** unless eyecite's
   sentence-boundary logic already weights "preceded by capitalized word + period"
   strongly. If a guard exists that requires the preceding token to be capitalized AND
   followed by a capitalized token (`Bd. of Equal. v.` → "v." is capitalized), the risk
   is low; otherwise skip.

### Skip (already covered)

The following appeared in research but are **already in the set** and don't need
re-adding:
- `assn` (Nebraska `Assn.` no-apostrophe) — line 751 of `extractCase.ts`
- `engr` (`Engr.` Engineering, common in NE) — line 760
- `engrs` is **NOT** in the set, but plural `Engrs.` was not observed as common in
  sampled captions (singular `Engr.` covers the dominant Nebraska pattern). Optional add.
- `treas` (`Treas.`) — line 616
- `soc` (`Soc.`) — line 600
- `mfg` — already present
- `dept` (`Dept.` Kansas variant) — line 756
- `cty`, `cnty`, `coop`, `dist`, `bd`, `pub`, `serv`, `sav`, `mut`, `ins`, `elec`,
  `twp`, `sch`, `cmty`, `indep`, `prop`, `prods`, `props` — all present.

### Stems to add (final list)

```typescript
// ── 2026-05-10 Plains + Upper Midwest additions ──
// Nebraska reporter style drops apostrophes from Comm'r/Comm'rs/Ass'n,
// producing spellings that differ from the Bluebook T6 forms. `Assn.`
// is already covered (assn, line 751); `Comm'r/Comm'rs` map to commr/commrs
// after apostrophe stripping. The single-m forms `Comr./Comrs.` are
// genuinely distinct stems that must be added separately.
"comr",  //  Comr. — Neb. "Cherry Cty. Bd. of Comr." (sing.); also MN sporadic
"comrs", //  Comrs. — Neb. "Cherry Cty. Bd. of Comrs.", "Madison Cty. Bd. of Comrs."
// Reinsurance — Bluebook T6; common in ND/IA insurance captions
"reins", //  Reins. — "Grinnell Mut. Reins. Co. v. Farm & City Ins. Co." (ND)
```

### Optional (low-priority)

- `engrs` — `Engrs.` (Engineers plural). Useful for "Soc'y of Civ. Engrs." but not
  observed in this region's captions; sing. `Engr.` is dominant. Add only if a
  parallel survey of national engineering-society captions finds it.
- `equal` — `Equal.` (Equalization). Nebraska-specific. Defer until false-positive
  testing is complete (see Tier 2 above).

## Sources

- Real captions: CourtListener `/api/rest/v4/search/` (May 2026) across 12 state
  appellate courts (`minn`, `minnctapp`, `iowa`, `iowactapp`, `mo`, `moctapp`, `kan`,
  `kanctapp`, `neb`, `nebctapp`, `nd`, `sd`).
- N.D. R. Ct. 11.6 — Medium-Neutral Case Citations (1997).
- S.D. R. App. P. 15-26A-69 — public-domain citations (1996).
- Mo. S. Ct. R. 84.04(d); *Show Me Citations* (2016 ed.).
- Kan. S. Ct. R. 6.07, 6.08.
- Neb. Ct. R. App. P. 2-103.
- Minnesota Statewide Standard Citation rules.
- Iowa Court Rules, Ch. 6 — Rules of Appellate Procedure; R. 6.1601 — Chart D.
- *The Bluebook: A Uniform System of Citation* 21st ed. (2020), T6 (case-name
  abbreviations) and T10 (state geographic abbreviations).
- Cornell LII Basic Legal Citation, state-specific tables.
- *Citation Practices of the Kansas Supreme Court and Court of Appeals* (Case Western
  Faculty Scholarship).
