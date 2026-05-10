# Citation Abbreviations & Style Quirks: Deep South + Border (MS, LA, TN, KY, AR)

Research date: 2026-05-10
Scope: Backward-scan abbreviation stems in `src/extract/extractCase.ts` for case-name
extraction in Mississippi, Louisiana, Tennessee, Kentucky, and Arkansas captions.

## Summary

eyecite-ts truncates case names when the backward sentence-boundary scan misclassifies
a real abbreviation period (e.g. `Educ. Found., Inc.` → "Found., Inc.") as a sentence
boundary. The deep-south + border block adds three families of gaps:

1. **Plural / verb-form Bluebook variants** that the existing dictionary covers only in
   the singular: `corrs` (Corrections), `telecomms` (Telecommunications), `attys` /
   `atty` (Attorney(s)), `sols` (Solutions). These appear in routine state-agency
   captions across all five states ("Ark. Bd. of Corrs.", "BellSouth Telecomms., Inc.",
   "Ass't Att'y Gen.").
2. **Louisiana civil-law vocabulary.** Louisiana has French/Spanish-origin doctrinal
   terms — succession (probate), tutorship (guardianship), usufruct, naturalization,
   matrimonial regime, paroisse (parish) — that appear in caption form ("Succession of
   X v. Y", "Tutorship of Z"). Eyecite already has `par` (Parish abbreviation) but is
   missing the full-word stems used uniquely in LA captions. These are full words, not
   periods, so they don't need stems; the LA-specific concern is at the *citation*
   layer rather than the case-name-backward-scan layer.
3. **Court-name abbreviations.** TN uniquely has three intermediate appellate courts
   ("Tenn. Ct. App.", "Tenn. Crim. App.", "Tenn. Work. Comp. App. Bd."). LA uses
   ordinal+circuit form "(La. App. 5th Cir.)" and "(La. App. 1 Cir.)". AR is unusual
   for using public-domain neutral cites "2026 Ark. 95" with no parallel S.W.3d
   required (though both are typical). These affect the citation-recognizer, not the
   abbreviation-stem set — flagged for separate work.

## Per-Jurisdiction Findings

### Mississippi (MS)

Court IDs: `miss` (MS Supreme Court → "Miss."), `missctapp` (MS Court of Appeals →
"Miss. Ct. App."), `misschanceryct` (MS Chancery → "Miss. Chanc. Ct.").

Real captions sampled:
- *Adams v. Graceland Care Ctr. of Oxford, LLC*, 208 So. 3d 575 (Miss. 2017)
- *Copiah Cnty. v. Oliver*, 51 So. 3d 205 (Miss. 2011)
- *Karpinsky v. Am. Nat'l Ins. Co.*, 109 So. 3d 84 (Miss. 2013)
- *Bearden v. BellSouth **Telecomms.**, Inc.*, 29 So. 3d 761 (Miss. 2010)
- *Joiner Ins. Agency, Inc. v. Principal Cas. Ins. Co.*, 684 So. 2d 1242 (Miss. 1996)
- *Hyer v. Caruso*, 102 So. 3d 1232 (Miss. Ct. App. 2012)
- *GEICO Cas. Co. v. Stapleton*, 315 So. 3d 464 (Miss. 2021)
- *Raddin v. Manchester Educ. Found., Inc.*, 175 So. 3d 1243 (Miss. 2015)

| Stem | Full Word | Source | Risk | Example caption |
|------|-----------|--------|------|------------------|
| `telecomms` | Telecommunications (plural) | freelawproject/reporters-db; *Bearden* | Low — non-English | "BellSouth **Telecomms.**, Inc." |

Existing eyecite-ts stems already cover the rest of MS captions surveyed (`ctr`, `cnty`,
`am`, `nat`, `natl`, `ins`, `cas`, `agency`/no-period, `educ`, `found`). MS-specific
caption style is otherwise vanilla Bluebook.

### Louisiana (LA)

Court IDs: `la` (Supreme Court of Louisiana → "La."), `lactapp` (LA Court of Appeal →
"La. Ct. App." — but cited as "La. App. 1 Cir.", "La. App. 5 Cir." etc., one circuit
per region 1–5).

Real captions sampled:
- *Succession of Brown*, 388 So. 2d 1151 (La. 1980)
- *Succession of Blythe*, 496 So. 2d 1180 (La. App. 5 Cir. 1986)
- *State v. Wetzel*, 2025-00894 (La. 12/23/25), 425 So. 3d 102 (per curiam)
- *Moore v. Louisiana Parole Board*, 2022-1278 (La. App. Ist Cir. 6/2/23), 369 So.3d 415
- *Strachan v. Eichin*, 2015-1431 (La. App. 1 Cir. 04/15/16), 195 So. 3d 61
- *O'Krepki v. O'Krepki*, 2025-00551 (La. 10/01/25), 419 So. 3d 1290
- *Bonin v. Sabine River Auth.*, 2023-1140 (La. App. 1 Cir. 12/30/24), 410 So. 3d 458,
  **writ denied**, 2025-00224 (La. 5/14/25), 415 So. 3d 902

| Stem | Full Word | Source | Risk | Example caption |
|------|-----------|--------|------|------------------|
| `succ` | Succession (probate proceedings) | LA captions; LA Civ. Code Bk III | Medium — "Succ." is rare | "**Succ.** of Brown" (occasional) |
| `paroch` | Parochial | LA Catholic-school cases | Low — uncommon | "**Paroch.** Schs. of LA" |
| `tutorship` | Tutorship (guardianship) | LA Civ. Code arts. 246–250 | Full word, not abbreviated; no stem needed | "**Tutorship of** [Minor]" |

LA captions overwhelmingly use full words ("Succession of", "Tutorship of",
"In re Interdiction of") rather than abbreviations, so the case-name backward scan
already handles them. **Par** (Parish) is already in eyecite-ts.

**Louisiana-specific citation style (not stem-related, separate fix surface):**

1. **Date-encoded subsequent history.** LA decisions use a uniform docket-style cite:
   `YYYY-NNNN (La. M/D/YY), V Rep. P, P-P`. Example: `2025-00894 (La. 12/23/25), 425
   So. 3d 102`. The pre-comma docket number (`2025-00894`) is the LA neutral
   citation, and the (La. M/D/YY) parenthetical IS the date — not subsequent history.
2. **Writ-denied / writ-granted history.** Almost every LA appellate citation chains
   subsequent history: `..., writ denied, 2025-00224 (La. 5/14/25), 415 So. 3d 902`.
   These are not new citations but history markers. The existing parenthetical-end
   scanner should already include them but warrants verification.
3. **Court-of-appeal cardinal**: "La. App. 1 Cir." / "La. App. 1st Cir." / "La. App.
   First Circuit" all appear. Real opinions today use the bare digit ("La. App. 5
   Cir."); older ones use "5th".
4. **Code citations.** `La. Code Civ. P. art. 531`, `La. Code Crim. P. art. 895(A)`,
   `La. R.S. 15:574.11` (Revised Statutes), `La. Const. art. V, § 25 (C)`. These are
   statute citations, not case names.

### Tennessee (TN)

Court IDs: `tenn` (TN Supreme Court → "Tenn."), `tennctapp` (Court of Appeals → "Tenn.
Ct. App."), `tenncrimapp` (Court of Criminal Appeals → "Tenn. Crim. App."),
`tennworkcompapp` (Workers' Comp Appeals Board → "Tenn. Work. Comp. App. Bd."),
`tennworkcompcl` (Workers' Comp Claims → "Tenn. Ct. Work. Comp. Cl.").

Real captions sampled:
- *State v. Burgins*, 464 S.W.3d 298 (Tenn. 2015)
- *State v. McCaleb*, 582 S.W.3d 179 (Tenn. 2019)
- *Lee Med., Inc. v. Beecher*, 312 S.W.3d 515 (Tenn. 2010)
- *State v. Ellis*, 89 S.W.3d 584 (Tenn. Crim. App. 2000)
- *Madden v. Holland Grp. of Tenn., Inc.*, 277 S.W.3d 896 (Tenn. 2009)
- *Mansell v. Bridgestone Firestone N. Am. Tire, LLC*, 417 S.W.3d 393 (Tenn. 2013)
- *Konvalinka v. Chattanooga-Hamilton Cnty. Hosp. Auth.*, 249 S.W.3d 346 (Tenn. 2008)
- *Thomas v. Aetna Life and Cas. Co.*, 812 S.W.2d 278 (Tenn. 1991)

| Stem | Full Word | Source | Risk | Example caption |
|------|-----------|--------|------|------------------|
| `crim` already present | Criminal | TN Crim. App. court name | n/a | "Tenn. **Crim.** App." |
| `work` | Workers' / Workers (Workers' Comp) | TN Work. Comp. court | Medium — common word | "Tenn. **Work.** Comp. App. Bd." |
| `comp` already present | Compensation | TN | n/a | "**Comp.** App. Bd." |

The case-name backward scanner handles all the surveyed TN captions, because the
problematic abbreviations (`Med.`, `Cnty.`, `Hosp.`, `Auth.`, `Cas.`, `Grp.`, `N. Am.`,
`Educ.`, `Found.`, `Inc.`) are already in `CASE_NAME_ABBREVS`. The TN-specific concern
is **court-name abbreviations** (`Work. Comp. App. Bd.` etc.) which live in the
reporter database, not the stem set.

**TN-specific style:** TN has three intermediate appellate courts hearing different
subject matters: Civil (Tenn. Ct. App.), Criminal (Tenn. Crim. App.), and Workers' Comp
Appeals Board (Tenn. Work. Comp. App. Bd.). Citations always pick exactly one.

### Kentucky (KY)

Court IDs: `ky` (KY Supreme Court → "Ky."), `kyctapp` (KY Court of Appeals 1976–
current → "Ky. Ct. App."), `kyctapphigh` (pre-1976 Court of Appeals, when KY had no
separate Supreme Court → "Ky. Ct. App.").

Real captions sampled:
- *Commonwealth v. Sawhill*, 660 S.W.2d 3 (Ky. 1983)
- *Commonwealth v. Benham*, 816 S.W.2d 186 (Ky. 1991)
- *King v. Commonwealth*, 513 S.W.3d 919 (Ky. 2017)
- *Anastasi v. Commonwealth*, 754 S.W.2d 860 (Ky. 1988)
- *Carver v. Commonwealth*, 303 S.W.3d 110 (Ky. 2010)
- *Brock v. Commonwealth*, 947 S.W.2d 24 (Ky. 1997)

| Stem | Full Word | Source | Risk | Example caption |
|------|-----------|--------|------|------------------|
| (none new) | – | – | – | KY caption style is straightforward; the state name + plaintiff/Commonwealth |

KY abandoned its official reporter (Ky.) in 1951. Modern citations use exclusively
S.W.2d / S.W.3d with `(Ky. YYYY)` or `(Ky. Ct. App. YYYY)` parenthetical. The
caption-side abbreviation needs are already covered by existing stems. Note `ky`
itself is already in the stem set (T10 state abbreviation).

**KY-specific style:**
1. Most criminal cases are *X v. Commonwealth* or *Commonwealth v. X* — never
   "State v.". This affects party-name detection more than abbreviation periods.
2. KY uses **RAP** (Rules of Appellate Procedure) — appears in opinion text:
   "Pursuant to RAP 40(D)". Statute cites use "KRS" (Kentucky Revised Statutes).
3. The pre-1976 "Court of Appeals" was the *highest* court (until KY Supreme Court was
   created). Historical citations like *Foo v. Bar*, 100 S.W.2d 1 (Ky. App. 1940)
   refer to the highest court, not an intermediate court — so "Ky. App." in pre-1976
   captions means the predecessor of "Ky." today.

### Arkansas (AR)

Court IDs: `ark` (AR Supreme Court → "Ark."), `arkctapp` (AR Court of Appeals → "Ark.
App."), `arkworkcompcom` (Workers' Comp Comm.).

Real captions sampled:
- *DeSoto Gathering Co., LLC v. Hill*, 2018 Ark. 103, 541 S.W.3d 415
- *SEECO, Inc. v. Stewmon*, 2016 Ark. 435, 506 S.W.3d 828
- *Andrews v. Payne*, 2023 Ark. 129, 674 S.W.3d 450
- *City of Helena-W. Helena v. Williams*, 2024 Ark. 102, 689 S.W.3d 62
- *Smith v. May*, 2013 Ark. 248
- *Clinton v. Bonds*, 306 Ark. 554, 816 S.W.2d 169 (1991)
- *Kennedy v. Arkansas Parole **Bd.***, 2024 Ark. 135, 696 S.W.3d 812
- *Munson v. Arkansas Dep't of Correction*, 375 Ark. 549, 294 S.W.3d 409 (2009)
- *Thurston v. League of Women Voters of Ark.*, 2022 Ark. 32, 639 S.W.3d 319
- *Griffin v. Ark. Bd. of **Corrs.***, 2025 Ark. 81, 711 S.W.3d 784
- *Garland Cnty. District Ct. v. Mercer*, 2026 Ark. 76

| Stem | Full Word | Source | Risk | Example caption |
|------|-----------|--------|------|------------------|
| `corrs` | Corrections (plural) | freelawproject/reporters-db has `Corr. -> [Corrections]`; AR Supreme Court has captions using *Corrs.* | Low — non-English | "Ark. Bd. of **Corrs.**" |
| `atty` | Attorney | "Ass't Att'y Gen." (Asst Att'y Gen.) routinely appears in AR (and elsewhere) | Low — non-English | "Ass't **Att'y** Gen." |
| `attys` | Attorneys | – | Low — non-English | "**Attys.** for Appellees" |
| `sols` | Solutions (plural of `Sol.`) | reporters-db has `Sol. -> [Solution]` | Low — non-English | "Cybersecurity **Sols.**, LLC" |

**AR-specific style:**
1. **Public-domain neutral cite first**: Since 2009 AR Supreme Court uses the form
   `YYYY Ark. N` (no volume — the year is the volume slot, sequence number replaces
   page). Parallel S.W.3d is optional. Example: "2026 Ark. 95" or "2026 Ark. 95, 711
   S.W.3d 784". The Court of Appeals uses "YYYY Ark. App. N".
2. AR opinions begin with the masthead "Cite as 2026 Ark. 95" — that explicit "Cite
   as" prefix is a high-confidence signal of a neutral cite when ingesting AR
   opinions.

## Special Note: Louisiana Civil Law Tradition

Louisiana is the only U.S. jurisdiction that follows civil law (French/Spanish
heritage, codified in the Louisiana Civil Code, with major reforms in 1808, 1825, 1870
and a full revision project 1976–present). This produces three categories of
caption-side oddity:

1. **Doctrinal-noun captions.** Cases proceed under the name of the legal proceeding
   itself: *Succession of Brown*, *Tutorship of [Minor]*, *In re Interdiction of X*,
   *Matrimonial Regime of X v. Y*. Eyecite handles "In re ___" and these full-word
   forms naturally — none of them is an abbreviation that would trip the period scan.
2. **Parish, not county.** Louisiana's political subdivisions are *parishes* (64 of
   them), not counties. The Bluebook T10 abbreviation is **Par.** (Parish) — already
   in the eyecite-ts stem set (`par`). Captions like "*Esplanade Mall Realty Holdings,
   LLC v. Lopinto, in His Capacity as Sheriff and Ex-Offico Tax Collector for
   Jefferson Parish*" use the full word *Parish*, so the abbreviation period is
   uncommon in case captions but appears in court designators like "(Parish of
   Jefferson)".
3. **Civil-law procedural vocabulary**: "lis pendens" (still in use; LA Code Civ. P.
   art. 531), "writ of mandamus", "supervisory writs", "declinatory exception", "writ
   denied / writ granted" subsequent-history markers. These are not abbreviations —
   they're Latin/French words — so they don't intersect with the case-name
   abbreviation set. They DO intersect with citation-history parsing (post-citation
   `, writ denied, ...` chains).

The civil-law tradition matters for *citation form* (date-prefixed docket numbers,
chained writ-denied history, La. App. cardinal+circuit numbering) far more than for
the case-name backward scan.

## Cross-Jurisdiction Patterns

1. **State-agency captions in plural form.** AR's "Bd. of Corrs." and MS's
   "Telecomms., Inc." are the same pattern (singular abbreviation already exists, the
   *plural with* s after the period is missing). Same fix applies to `corr → corrs`,
   `telecomm → telecomms`. **Recommend adding plurals as a class.**
2. **"Att'y" / "Atty."** appears state-side as "Ass't Att'y Gen." (Assistant Attorney
   General), and county-side as "Cnty. Att'y" (County Attorney). Already missing.
3. **All five states use "Cnty." (already covered).** MS uses "Cnty." extensively
   (state-county-government cases dominate).
4. **No new state-name abbreviations needed.** `miss`, `la`, `tenn`, `ky`, `ark` are
   all already present (T10 list, lines 686–702).
5. **No new title abbreviations needed.** Existing `j`, `jj` (implicit via single
   letter), `hon` are present.

## False-Positive Guardrail

Candidate stems flagged below have been checked against common sentence-end English
words. None of the proposed stems collide:

- `corrs` — not an English word (always plural of *correction* in title-case)
- `telecomms` — not an English word (industry abbreviation)
- `atty` — not an English word
- `attys` — not an English word
- `sols` — collides with "sols" only as a music notation (sol-fa); negligible in legal
  text. Same risk as existing `sol`.
- `succ` — collides with verb stems "succumb" etc. but "succ" as a 4-letter dotted
  abbreviation is a real risk in informal writing; recommend **NOT** adding `succ`
  unless real captions confirm need — LA cases use the full word "Succession" in
  caption form ("*Succession of Brown*"), not the abbreviation.

## Top Recommendations (Prioritized)

| Priority | Stem | Justification |
|----------|------|---------------|
| **HIGH** | `corrs` | Real AR Supreme Court caption ("Ark. Bd. of Corrs."); same pattern as singular `corr` already in set. Plural of Corrections. |
| **HIGH** | `telecomms` | Real MS Supreme Court caption ("BellSouth Telecomms., Inc."). Plural of Telecommunications. Singular `telecomm` already in set. |
| **HIGH** | `atty` | Routine in attorney-general captions across all 5 states ("Ass't Att'y Gen."). Apostrophe-form. |
| **MED** | `attys` | Plural Attorneys; less common in case captions but appears in agency-name forms. |
| **MED** | `sols` | "Solutions, LLC" plural appears in many vendor-named captions; freelawproject lists singular `Sol.`. |
| **LOW** | `succ` | Skip — LA captions use full word; risk of false positives in informal text. |

These six stems would close the deep-south + border block without overlapping any of
the other regional-research agents' likely outputs (the misses are agency-plurals and
attorney-form patterns, both cross-jurisdictional).

The non-stem follow-ups (LA writ-denied chains, LA App. Cir. cardinal handling, AR
neutral cite "YYYY Ark. N", TN Work. Comp. App. Bd. court name) are citation-recognizer
concerns, not case-name backward-scan concerns, and are flagged for a separate work
item.
