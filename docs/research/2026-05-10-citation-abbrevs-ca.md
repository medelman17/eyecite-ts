# Citation Abbreviations & Style Quirks: California

## Summary

California is the highest-value U.S. jurisdiction for parsing quirks because its
official authority — the **California Style Manual (CSM), 4th ed. (2000)**,
adopted by the California Supreme Court — diverges from Bluebook in numerous
structural ways. California Rule of Court 1.200 (effective 2008) lets filers
choose between CSM and Bluebook **but the same style must be used consistently
throughout a document**, and courts continue to recommend CSM. The published
California Official Reports (`Cal.`, `Cal.App.`, `Cal.App.Supp.`) are written
in CSM style and dominate the citation corpus. Any parser that treats
California cites as Bluebook-shaped will mis-tokenize a large fraction of
real-world input.

The biggest single category of risk for the eyecite-ts backward
case-name scanner is **CSM's no-space reporter form** — `Cal.4th`,
`Cal.App.4th`, `Cal.Rptr.3d`, `Cal.App.Supp.` — because every `.` between the
"Cal" stem and the series-digit (`4th`/`5th`) looks like a sentence boundary
unless the stems `cal`, `app`, `rptr`, `supp`, and `daily` are all in the
abbreviation set. The good news: `cal`, `app`, and `supp` are already in the
set (lines 411, 663, 675). The gap is `rptr` (and possibly `daily` for
California Daily Opinion Service / DJDAR).

The other major category is **CSM's party-name abbreviation list**. CSM § 1:10
abbreviations *largely* match Bluebook T6 (which the existing set already
covers extensively), so few new stems are needed for party names *per se*.
Real CA captions verified during research show overwhelmingly Bluebook-form
abbreviations: `Ass'n`, `Bd.`, `Inc.`, `Corp.`, `Co.`, `Comm'n`, `LLC`, `LP`,
`L.P.`. The single CSM-specific abbreviation worth highlighting is `Cal.Jur.3d`
(California Jurisprudence treatise) and the various California codes
(`Bus. & Prof. Code`, `Code Civ. Proc.`, `Veh. Code`, `Welf. & Inst. Code`)
which appear in running text inside parentheticals.

Most of the CSM departures from Bluebook (year-first ordering, parenthesized
full citation, "at p." pincite, italicized `v.`, bracketed parallel cites,
`Ibid.` vs `Id.`) are **structural quirks above the case-name scan layer**
— they affect downstream extraction of metadata (year, court, pincite) rather
than the backward case-name walk. They are documented here so future work
on California-specific extractors can use them.

---

## Per-Court Findings

### California Supreme Court

Reporter: **California Reports** = `Cal.`, `Cal.2d`, `Cal.3d`, `Cal.4th`,
`Cal.5th` (1850–present). Parallel: `Cal.Rptr.` (West, 1959–present) and `P.`/
`P.2d`/`P.3d` (Pacific Reporter, 1883–present).

CSM example: `(Loeffler v. Target Corp. (2013) 58 Cal.4th 1081, 1104, fn. 5.)`

Bluebook example: `Loeffler v. Target Corp., 58 Cal.4th 1081 (2013).`

### California Court of Appeal (six districts)

Reporter: **California Appellate Reports** = `Cal.App.`, `Cal.App.2d`,
`Cal.App.3d`, `Cal.App.4th`, `Cal.App.5th` (1904–present). Parallel:
`Cal.Rptr.` (1959–present).

Court designator format **omits district**: CSM treats `Cal.App.4th` as
self-identifying. (Bluebook adds `(Ct. App. [district])` when needed.) Real
captions verified:
- `American Building Innovation LP v. Balfour Beatty Construction, LLC,
  104 Cal.App.5th 954 (2024)`
- `Gonzalez v. Nowhere Beverly Hills LLC (2024)`
- `The Comedy Store v. Moss Adams LLP (2024)`
- `Carver v. Volkswagen Group of America, Inc. (2024)`
- `Osborne v. Pleasanton Automotive Co., LP (2024)`

### California Superior Court

**Unpublished and uncitable.** California Rules of Court 8.1115(a) prohibits
citing unpublished trial-court opinions for most purposes. Exception:
Superior Court Appellate Division decisions appear in **California Supplement**
(`Cal.App.Supp.` or `Cal.App.2d Supp.` etc., 1930–present). Note the unique
spacing: CSM 4th says `Cal.App.Supp.` early series have **no space** but
`Cal.App.2d Supp.` / `Cal.App.3d Supp.` / `Cal.App.4th Supp.` have **a space
between the series and Supp.** This is one of the few intra-CSM
internal-consistency departures.

---

## Stems Worth Adding (Prioritized)

| Stem | Full word | Source | Risk | Example caption |
|------|-----------|--------|------|-----------------|
| `rptr` | Reporter | CSM § 1:12 (`Cal.Rptr.`, `Cal.Rptr.2d`, `Cal.Rptr.3d`) | LOW — purely a reporter abbrev., never an English word | `... [54 Cal.Rptr.2d 370].` and `[79 Cal.Rptr. 178]` |
| `caljur` | California Jurisprudence (treatise) | CSM § 3:8; appears as `Cal.Jur.3d` | LOW — never English; usually preceded by volume number | `7 Cal.Jur.3d Attorneys at Law § 43 (1989)` |
| `djdar` | Daily Journal Daily Appellate Report | CSM § 1:18 (recently filed opinions) | LOW — neutral citation marker only | `(People v. Williams (9/4/92) ___ Cal.App.4th ___ [92 DJDAR 12447].)` |
| `caljic` | California Jury Instructions, Criminal | CSM § 3:5; rare standalone but appears in citation lists | LOW — never English | `(CALJIC No. 7.08 (4th ed. 1979).)` |

**Already covered (do not re-add):** `cal`, `app`, `supp`, `co`, `corp`, `inc`,
`ltd`, `assn`, `commcn`, `commn`, `commr`, `bd`, `bldg`, `bros`, `cnty`,
`cty`, `cmty`, `dept`, `dist`, `div`, `educ`, `envtl`, `intl`, `lp` (single
letters handled by tier 2), `natl`, `govt`, `mfg`, `mfr`, `transp`, `serv`,
`mun`, `pub`, `regl`. The existing set is excellent coverage for CA party
names because CSM § 1:10 abbreviations are essentially Bluebook T6.

### Notable non-gaps (verified to need no addition)

- `Cal.Const.` — only the stems `cal` and `const` are needed; both present.
- `Bus. & Prof. Code`, `Code Civ. Proc.`, `Civ. Code`, `Pen. Code`,
  `Veh. Code`, `Welf. & Inst. Code`, `Evid. Code`, `Prob. Code`, `Fam. Code`,
  `Gov. Code`, `Health & Saf. Code`, `Ins. Code` — code abbreviations appear
  in CSM citations as `(Pen. Code, § 459.)` inside parentheses, never as part
  of a case-name backward scan, so they do not affect the case-name extractor.
  All component stems (`pen`, `bus`, `civ`, `evid`, `prob`, `fam`, `veh`,
  `educ`, `ins`) are already in the set.

### False-positive risk for proposed stems

| Stem | Sentence-end ambiguity? | Notes |
|------|------------------------|-------|
| `rptr` | None | No English word collides. |
| `caljur` | None | Compound, only after a volume number. |
| `djdar` | None | Acronym specific to LA Daily Journal. |
| `caljic` | None | Acronym only. |

All four candidates are extremely low risk — they would never appear as
English sentence-end words.

---

## California Style Manual Departures from Bluebook

These quirks affect **metadata extraction** more than the backward case-name
scan, but they shape what real-world California text looks like:

### 1. No-space reporter form (CSM § 1:1[D])

CSM: `Cal.4th`, `Cal.App.4th`, `Cal.Rptr.3d`, `F.Supp.2d`, `F.3d`, `Cal.App.3d`.
Bluebook: `Cal. 4th`, `Cal. App. 4th`, `Cal. Rptr. 3d`, `F. Supp. 2d`, `F.3d`.

> "There are no spaces between the reporters and the edition: Cal.App.3d,
> Cal.3d, F.Supp.4th, F.3d." — Loyola CSM slide deck

CSM also says **"The 'Cal.' and the 'App.' should not be abbreviated 'CA.'"**

Implication: a regex parser must tolerate both `Cal. App. 4th` (Bluebook
spacing) and `Cal.App.4th` (CSM zero-space) as the same reporter. The
existing `cal`/`app`/`supp` stems already handle this for the case-name
scanner.

### 2. Year-first parenthesized citation (CSM § 1:1[B], § 1:2)

CSM: `(People v. Davis (1988) 202 Cal.App.3d 1009, 1013.)`
Bluebook: `People v. Davis, 202 Cal.App.3d 1009 (Ct. App. 1988).`

Key differences:
- Year appears in parentheses **immediately after case name**, not at end.
- **No comma** between case name and year-parenthetical.
- The **entire citation is wrapped in parentheses** when used citationally,
  with a period inside the closing paren.

Implication: extractCase's parenthetical scanner must recognize that a
parenthetical immediately following a case name in California text is
**the year**, not a court-or-explanatory parenthetical. The existing CA-style
year detection in `extractCase.ts` may need to look back to a case name when
it sees `(YYYY)` instead of only forward.

### 3. Parallel cite ordering with brackets (CSM § 1:32[B])

CSM: `(Smith v. Williams (1966) 65 Cal.2d 263, 265 [54 Cal.Rptr.2d 370].)`
Bluebook: `Smith v. Williams, 65 Cal.2d 263, 54 Cal. Rptr. 2d 370 (1966).`

Differences:
- CSM uses **brackets `[ ]`** for unofficial parallel cites; Bluebook uses
  commas.
- CSM puts **official cite FIRST** (`Cal.4th`/`Cal.App.4th`), then unofficial
  in brackets. Bluebook puts official first too but separated by comma.
- For non-CA cases cited in CA courts, CSM still uses brackets for parallels:
  `(Chapman v. California (1967) 386 U.S. 18 [17 L.Ed.2d 705, 87 S.Ct. 824].)`

### 4. Pincite form "at p." / "at pp." (CSM § 1:2)

CSM: `(People v. Davis, supra, 18 Cal.4th at p. 717.)` or
`(Davis, at p. 1097.)`
Bluebook: `Davis, 18 Cal. 4th at 717.`

CSM uses `at p.` for single page, `at pp.` for ranges, **inside the
parenthesized citation**. Bluebook drops `p.` / `pp.`

### 5. Italicized `v.` (CSM § 4:39)

CSM italicizes the **entire case name including `v.`** as well as `in re`
and `ex rel.` — not just the parties. This affects HTML-stripping more than
tokenization, but means `v.` in CA text is typically wrapped in `<i>` or
`<em>`. The existing HTML strip in `src/clean/` should handle this.

### 6. `Ibid.` vs `Id.` (CSM § 1:2[C])

CSM has a distinct `Ibid.` for "identical citation, same point page" —
Bluebook only has `Id.` CSM uses `Id. at p. ___` for same authority,
different page; `Ibid.` for identical. The resolver's `id` token detection
should recognize both `Id.` and `Ibid.` as same-class tokens (a known gap to
verify in `src/resolve/`).

### 7. `Supra` for cases (CSM § 1:2[B])

CSM **uses `supra` for primary case authority**: `(Loeffler v. Target Corp.,
supra, 58 Cal.4th at p. 1104.)` Bluebook **prohibits** `supra` for cases (only
for secondary authority). This means California text has dramatically more
`supra` tokens than Bluebook text. The existing supra resolver should be
robust to this.

### 8. Slip-opinion / recent-opinion placeholder (CSM § 1:3, § 1:18)

For just-filed opinions before the official cite is assigned:
```
(People v. Williams (9/4/92) ___ Cal.App.4th ___ [92 DJDAR 12447].)
(Kaupp v. Texas (May 5, 2003, No. 02-5636) ___ U.S. ___ [2003 U.S. LEXIS 3670].)
(In re Aggrenox Antitrust Litig. (D.Conn., Mar. 23, 2015, No. 3:14-md-2516 (SRU))
   ___ F.Supp.3d ___, ___ [2015 U.S.Dist. Lexis 35634, *38–*39].)
```

The `___` blank placeholders for volume/page and the docket-number-only form
are uniquely CSM. The `[YEAR DJDAR PAGE]` form (`92 DJDAR 12447`,
`92 C.D.O.S. 7224`) is the Daily Journal Daily Appellate Report format —
extremely common in CA opinions before official assignment.

### 9. Unpublished opinions (Cal. Rules of Court 8.1115)

Unpublished CA Court of Appeal opinions are **not citable** except for narrow
exceptions (law of the case, res judicata, criminal/disciplinary actions).
This is enforced by the rules of court, not by CSM. Westlaw and Lexis IDs
exist (`Cal.App.Unpub.LEXIS`, `WL`) but are functionally non-citable. The
parser should still recognize them as citation candidates.

### 10. Signal phrases not italicized (CSM § 4:39)

`See`, `See also`, `See, e.g.,`, `Cf.`, `Accord`, `Contra`, `But see` —
**not italicized** in CSM. Bluebook italicizes them. This is mainly a
typography concern (HTML stripping) but affects detection of signal-prefixed
citations.

### 11. California codes use comma + abbreviated code name inside parens
(CSM § 2:6, § 2:8)

In parentheses: `(Pen. Code, § 459.)`, `(Code Civ. Proc., § 564, subd. (a).)`
In running text: `Penal Code section 459` (unabbreviated, `section` spelled
out, no comma).

The comma between code abbreviation and `§` is a CSM-only quirk. The
abbreviated code list (CSM § 2:8) is:

| Code | CSM abbrev |
|------|-----------|
| Civil Code | `Civ. Code` |
| Code of Civil Procedure | `Code Civ. Proc.` |
| Evidence Code | `Evid. Code` |
| Family Code | `Fam. Code` |
| Government Code | `Gov. Code` |
| Health and Safety Code | `Health & Saf. Code` |
| Insurance Code | `Ins. Code` |
| Penal Code | `Pen. Code` |
| Vehicle Code | `Veh. Code` |
| Welfare and Institutions Code | `Welf. & Inst. Code` |
| Business and Professions Code | `Bus. & Prof. Code` |
| Probate Code | `Prob. Code` |
| Labor Code | `Lab. Code` |
| Public Utilities Code | `Pub. Util. Code` |
| Revenue and Taxation Code | `Rev. & Tax. Code` |

(Bluebook prefaces with `Cal.`: `Cal. Bus. & Prof. Code § 16700`. CSM never
uses `Cal.` before a code name.)

### 12. California Rules of Court citation form

CSM: `(Cal. Rules of Court, rule 8.220(a).)` — lowercase `rule`, comma after
"Rules of Court", spelled-out "Rules of Court".
Bluebook: `Cal. R. Ct. 8.220(a)` — abbreviated.

The CA Rules of Court abbreviation `Cal. Rules of Court,` uses the existing
`cal` stem; "Rules of Court" is not abbreviated.

### 13. California Constitution

CSM: `(Cal. Const., art. VI, § 10.)` — abbreviated `Cal.`, `Const.`, `art.`,
`§`, separated by commas.

All component stems (`cal`, `const`, `art`) need to be in the set — `cal` and
`const` already are. **`art` is not in the current set** but is a single-word
case-name component only inside parentheticals (not adjacent to party
names), so it does not affect the case-name backward scan.

### 14. Names of minors (CA Rules of Court 8.401, CSM § 5:10)

In Welfare & Institutions Code 300/600 cases, the **minor's last initial only**
is used: `In re John C.`, `Mary C. v. ...`. The existing single-letter
initial handler (tier 2 of `isLikelyAbbreviationPeriod`) already covers
the `John C.` form. No new stems needed.

### 15. Spanish-language place names

California has many Spanish-derived place names (`Los Angeles`, `San
Francisco`, `San Diego`, `San Jose`, `Santa Clara`, `Santa Monica`,
`Sacramento`, `San Bernardino`, `Palo Alto`, `Costa Mesa`, etc.). **These are
full words, not abbreviations**, and contain no periods. They are not a
case-name extraction concern. (`San` and `Santa` are common English-Spanish
ambiguity points but appear before another capitalized word, which is
caught by the existing logic.)

The one edge case to flag: `St.` (Saint) appears in California place names —
`St. Helena`, `St. Bernard`. `st` is already in the set (line 652).

---

## Real-World Examples (verified from CSM 4th ed. exemplars and CA opinions)

CSM full-form, parenthesized:

```
(People v. Marshall (1997) 15 Cal.4th 1.)
(Smiley v. Citibank (1995) 11 Cal.4th 138.)
(American Academy of Pediatrics v. Lungren (1997) 16 Cal.4th 307
   [66 Cal.Rptr.2d 210, 940 P.2d 797].)
(Loeffler v. Target Corp. (2013) 58 Cal.4th 1081, 1104, fn. 5.)
(Perez v. Public Utilities Com. (2016) 2 Cal.App.5th 1411.)
(In re Greka Energy (O.S.H.A., Dec. 3, 2003, No. 03-R4D5-9248)
   2003 WL 23111209, pp. *1–*2.)
(Smith v. Williams (1966) 65 Cal.2d 263, 265 [54 Cal.Rptr.2d 370].)
(California v. Romero (1983) 463 U.S. 992.)
(People v. Davis (1988) 18 Cal.4th 712, 724.)
```

CSM short-form:

```
(Loeffler v. Target Corp., supra, 58 Cal.4th at p. 1104.)
(Loeffler, supra, 58 Cal.4th at p. 1104.)
(Loeffler, at p. 1104.)
(Davis, supra, 18 Cal.4th at pp. 717–718.)
(Ibid.)
(Id. at p. 1105.)
(Id. at p. 1105, fn. 4.)
```

CSM with bracket parallel-cite and out-of-state:

```
(Chapman v. California (1967) 386 U.S. 18 [17 L.Ed.2d 705, 87 S.Ct. 824].)
(People v. Brittain (1972) 52 Ill.2d 91 [278 N.E.2d 815].)
(Gressler v. New York Life Ins. Co. (Utah 1945) 163 P.2d 324.)
(English v. State (Okla.Crim.App. 1969) 462 P.2d 275.)
```

Real CA 2024 captions with corporate suffixes:

```
American Building Innovation LP v. Balfour Beatty Construction, LLC
The Comedy Store v. Moss Adams LLP
Gonzalez v. Nowhere Beverly Hills LLC
Carver v. Volkswagen Group of America, Inc.
Osborne v. Pleasanton Automotive Co., LP
LCPFV, LLC v. Somatdary
Castellanos v. State of California
California-American Water Company v. Public Utilities Commission
Make UC a Good Neighbor v. The Regents of the University of California
```

Real CA captions with `Ass'n`, `Bd.`, `Comm'n`:

```
Association of California Water Agencies v. ...
California Special Districts Association v. ...
California State Association of Counties v. ...
California Air Pollution Control Officers Association v. ...
```

(All `Ass'n`/`assn` already covered. No new stems needed for these.)

---

## Top Recommendations (Prioritized)

### Priority 1: Add 1 stem to `CASE_NAME_ABBREVS`

Add `rptr` to handle `Cal.Rptr.`, `Cal.Rptr.2d`, `Cal.Rptr.3d` in parallel
cites. These bracket-form parallel cites are pervasive in real CA opinions
(every full CSM citation that follows CSM § 1:12 includes one). Without `rptr`
in the set, a sentence like:

```
... 65 Cal.2d 263, 265 [54 Cal.Rptr. 178]. Defendant ...
```

would treat the period after `Rptr` as a sentence boundary, potentially
truncating a following case-name backward scan or interfering with full-span
detection of the closing parenthetical.

### Priority 2: (Optional, defensive) Add `caljur`, `djdar`, `caljic`

These are very low-frequency but never English words. Adding them is
zero-risk and prevents edge-case truncation when CSM-formatted text mentions
California Jurisprudence, the Daily Appellate Report number, or jury
instructions inline.

### Priority 3: No party-name additions needed for CA

The CSM § 1:10 party-name abbreviation list is essentially a subset of
Bluebook T6. The existing 250+ stem set already covers CA party-name
abbreviations comprehensively. Verified by spot-checking real 2024 CA Supreme
Court and Court of Appeal captions: every observed abbreviation
(`Ass'n`, `Bd.`, `Co.`, `Comm'n`, `Corp.`, `Dep't`, `Inc.`, `LLC`, `LP`,
`L.P.`, `LLP`, `Ltd.`, `Univ.`) has a corresponding stem already.

### Priority 4 (future, separate work): CSM-aware metadata extraction

The CSM departures from Bluebook in year-first ordering, parenthesized
wrapping, `at p.` pincite, and bracketed parallel cites would benefit from
**a CSM-aware extractor mode** or improved heuristics in the existing
extractor. This is well beyond the scope of stem additions but is the
highest-value follow-up for California input. Specifically:

1. Recognize `(YYYY)` immediately after a case name as the **year**, not a
   parenthetical, when followed by a volume-reporter-page sequence.
2. Treat `[Cal.Rptr.3d ...]` (and similar bracketed parallels) as parallel
   citations to the same case, not as separate citations.
3. Parse `at p. ###` / `at pp. ###-###` as CSM pincite, equivalent to
   Bluebook `at ###`.
4. Recognize `Ibid.` as an `id`-class token (same authority, same page).
5. Treat CSM `supra` as valid for primary case citations (it currently is,
   but verify against `src/resolve/`).
6. Recognize the CSM short-form `(CaseName, supra, VOLUME REPORTER at p. PAGE.)`
   pattern.
7. Tolerate the no-space reporter form (`Cal.App.5th` vs `Cal. App. 5th`) —
   verify `src/data/reporters.ts` has both spacings normalized.

---

## Sources

- **California Style Manual, 4th ed. (2000)** — Edward W. Jessen, Reporter of
  Decisions, California Supreme Court. PDF copy hosted by Sixth District
  Appellate Program: https://www.sdap.org/wp-content/uploads/downloads/Style-Manual.pdf
- **California Rules of Court, Rule 1.200** (format of citations):
  https://courts.ca.gov/cms/rules/index/one/rule1_200
- **California Rules of Court, Rule 8.1115** (citation of opinions —
  unpublished rule):
  https://courts.ca.gov/cms/rules/index/eight/rule8_1115
- **CSM Quick Reference (Office of Reporter of Decisions, June 2018)** —
  one-page summary used by California courts internally.
- **Loyola Law School CSM LibGuide**:
  https://guides.library.lls.edu/c.php?g=497703&p=3407475
- **TypeLaw, "California Style Manual vs. Bluebook Case Citations"**:
  https://www.typelaw.com/blog/california-style-manual-vs-bluebook-case-citations/
- **LegalClarity, "California Legal Citations: CSM vs. Bluebook Rules"**:
  https://legalclarity.org/formatting-california-legal-citations/
- **Pepperdine Caruso Law Writing Center, "The Bluebook v. California Style
  Manual"**:
  https://community.pepperdine.edu/law/writing-center/content/bluebook-v-california-style.pdf
- **San Diego Law Library, "How to Use California Case Citations"**:
  https://sandiegolawlibrary.org/wp-content/uploads/2017/09/07022957/How_to_Use_California_Case_Citations.pdf
- **4DCA Self-Help Manual Appendix 4, "Citing Your Sources of Information"**:
  https://appellate.courts.ca.gov/system/files/2024-09/4dca-Self-Help-Manual-Appendix-4.pdf
- **CCAP, "Writing Briefs With Style"** — California Appellate Project guide:
  https://www.capcentral.org/procedures/brief_writing/docs/style_article.pdf
- **California Style Manual (Wikipedia)** — edition history and adoption:
  https://en.wikipedia.org/wiki/California_Style_Manual
- **SDLSA, "Bluebook & the California Style Manual: Do You Know the
  Difference?"** (Adrienne Brungess, McGeorge):
  https://www.sdlsa.org/wp-content/uploads/2021/07/Bluebook-vs-California-Style-Manual-Handout.pdf
- **freelawproject/reporters-db case_name_abbreviations.json** (Bluebook T6
  source data; CA party names overlap):
  https://github.com/freelawproject/reporters-db/blob/main/reporters_db/data/case_name_abbreviations.json
- **Justia, Supreme Court of California 2024 decisions** — used for verifying
  real 2024 case captions:
  https://law.justia.com/cases/california/supreme-court/2024/
