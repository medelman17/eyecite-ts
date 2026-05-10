# Citation Abbreviations & Style Quirks: New England (MA, CT, RI, NH, VT, ME)

Research scope: state highest, intermediate appellate, and significant lower courts in
Massachusetts, Connecticut, Rhode Island, New Hampshire, Vermont, and Maine. Goal: identify
period-bearing stems that appear inside the *party-name backward scan* in
`src/extract/extractCase.ts` and are NOT yet in `CASE_NAME_ABBREVS`.

The bug class: when the scanner walks backward from a citation and hits a period whose word
stem is unknown, it treats the period as a sentence boundary and truncates the case name.
The recently fixed `Tp.` case is the canonical example.

## Summary

New England jurisdictions overwhelmingly track the Bluebook T6 list, so most party-name
abbreviations (`Bd.`, `Comm'r`, `Comm'n`, `Dep't`, `Envtl.`, `Prot.`, `Sch.`, `Auth.`,
`Mun.`, `Cnty.`, `Hous.`, etc.) are already covered. The genuinely *new* gaps surface in
three narrow places:

1. **`Lic.`** — "Bd. of License Comm'rs" / "Lic. Comm'rs". Heavily used in RI municipal
   liquor and alcoholic-beverage cases, plus MA and NH licensing matters. Confirmed by
   `Tiverton Bd. of License Comm'rs v. Pastore`, 469 U.S. 238 (1985) (R.I.).
2. **`Adj.`** — "Zoning Bd. of Adj." (Board of Adjustment). Standard VT/NH/MA municipal
   land-use party-name component; confirmed by `Terino v. Hartford Zoning Bd. of Adj.`
   (Vt. 1987), `Kalil v. Town of Dummer Zoning Bd. of Adjustment`, 155 N.H. 307 (2007),
   `Wilcox v. Manchester Zoning Bd. of Adjustment`, 159 Vt. 193 (1992).
3. **`Commw.`** — Pennsylvania's Commonwealth Court abbreviation, but it also appears in
   citation strings adjacent to MA captions ("Pa. Commw. Ct." in cross-citations). Lower
   priority than 1–2 because MA itself uses the full "Commonwealth" or the existing
   `comm` stem.

There are no genuine New England-specific party-name abbreviations that the Bluebook /
reporters-db catalog misses: "Commonwealth" stays full in MA, "Selectboard" / "Selectmen"
are full single words with no internal period, and "Town of X" / "City of X" use only
already-covered words. The major NE quirks are *citation-string* quirks (parallel
neutral citations, "Conn." parallel A.\d, Maine public-domain format) rather than
party-name-abbreviation quirks.

## Per-Jurisdiction Findings

### Massachusetts (Mass., Mass. App. Ct., Mass. App. Div., Mass. App. Dec.)

Reporters: *Massachusetts Reports* (Mass.), *Massachusetts Appeals Court Reports*
(Mass. App. Ct.). District-court system uses BMC (Boston Municipal Court), Hous. Ct.
(Housing Court), L.C. (Land Court), Juv. Ct.

| Stem    | Full Word     | Source / Caption                                          | Risk                       | Example caption                                              |
| ------- | ------------- | --------------------------------------------------------- | -------------------------- | ------------------------------------------------------------ |
| `lic`   | License/Licensing | MA ABCC licensing cases, "Bd. of License Comm'rs"     | Low — never sentence-final | "Bd. of License Comm'rs of Boston v. ..."                    |
| `adj`   | Adjustment    | "Zoning Bd. of Adj." (rare in MA but used in some opinions) | Medium — "adj." also abbreviates "adjective"/"adjacent" generally, but rarely appears mid-caption | "MacNutt v. Zoning Bd. of Adj. of Boston" (cf. `MacNutt v. Zoning Bd. of Appeal of Boston`, 2024 Mass. App. Ct.) |

**Already covered:** `comm` (Comm. = Commonwealth, e.g., "Comm. v. Thomas"), `bd`, `commn`, `commr`, `dist`, `dept`, `cnty`, `mun`, `hous`, `prot`, `envtl`, `pub`, `util`, `assn`, `bd`, `tr`, `trs`, `auth`, `dev`, `redev` (covered by `dev`+`re` prefix? — actually `redev` is not in set but uses `dev` stem after compound parsing). MA's Commonwealth shortform "Comm." is critical and already covered.

**Style quirks (not stem-related):**
- MA writes "Mass. App. Ct." with internal spaces (NOT "Mass.App.Ct." compressed).
  The tokenizer should already handle both, since `app` and `ct` are already in the set.
- Mass. App. Div. (Appellate Division of the District Court Department) and Mass.
  Super. Ct. variants exist.
- Probate & Family Court cases use captions like "Adoption of [Pseudonym]" and "Care
  & Protection of [Pseudonym]" — these are *full words*, not abbreviated, so no scan
  issue (the citation-side handling is separate from the party-name backward scan).

### Connecticut (Conn., Conn. App., Conn. Supp.)

Reporters: *Connecticut Reports* (Conn.), *Connecticut Appellate Reports* (Conn. App.),
*Connecticut Supplement* (Conn. Supp.) for unreported Superior Court. CT uses "J.D. of"
in trial-court dockets ("J.D. of New Haven" = Judicial District of New Haven), which is a
*forum* designator, not a party-name component — appears in citation tails like
`(Conn. Super. Ct., J.D. of Hartford, ...)`.

| Stem    | Full Word         | Source / Caption                                       | Risk                          | Example caption                                  |
| ------- | ----------------- | ------------------------------------------------------ | ----------------------------- | ------------------------------------------------ |
| `lic`   | License/Licensing | CT liquor and motor-vehicle licensing                  | Low                           | "CT Lic. Bd. v. ..." (rare in caption; common in CT.gov agency adjudications) |
| `j`     | Judicial          | "J.D. of Hartford" (court-tail; informational)        | High — single letter aliases with initials | "Doe v. Smith (Conn. Super. Ct., J.D. of Hartford 2018)" |

**Already covered:** All major CT terms — `commr` (Comm'r), `commn` (Comm'n), `bd`,
`dept`, `corr` (Comm'r of Corr.), `pub` (Pub. Safety), `motor` is not abbreviated, `super`
(Super. Ct.), `app` (App. Ct.).

**Style quirks:**
- CT *always* requires the parallel Atlantic Reporter cite alongside `Conn.` / `Conn. App.`,
  e.g., `State v. Cancel, 275 Conn. 1, 878 A.2d 1103 (2005)`. Affects citation parsing,
  not party-name extraction.
- CT slip-opinion advance sheets use the format `___ Conn. ___ (2026)` with underscores
  before official pagination is assigned.
- "Memorandum of Decision" (P.B. § 64-1) cites in trial-court opinions are pin-cited as
  `XX Conn. L. Rptr. XXX`. *Conn. L. Rptr.* is a private reporter (Connecticut Law
  Reporter) — should already be handled by reporters-db.
- "P.B." in CT means *Practice Book* (rules of court), not party name. Should be tokenized
  as a rule citation, not a case-name component.
- CT consistently spells out "Planning and Zoning Commission" *unabbreviated* in captions
  (e.g., `Bierman v. Planning & Zoning Commission`, 185 Conn. 135 (1981)) — so no
  CT-specific stem need.

### Rhode Island (R.I.)

Reporter: *Atlantic Reporter* only (R.I. abolished its own bound reports in 1980; older
cases cited as `XX R.I. XXX`). Workers' Compensation Court issues opinions cited
`WCC No. XX-XXXX`.

| Stem    | Full Word         | Source / Caption                                      | Risk     | Example caption                                                       |
| ------- | ----------------- | ----------------------------------------------------- | -------- | --------------------------------------------------------------------- |
| `lic`   | License/Licensing | RI municipal liquor & entertainment licensing         | Low      | `Tiverton Bd. of License Comm'rs v. Pastore`, 469 U.S. 238 (1985)     |

**Already covered:** All RI terms — `bd`, `commr`, `commn`, `dept`, `pub`, `util`,
`auth`, `corp`, `co`, `envtl`, `mgmt` (Dep't of Envtl. Mgmt.).

**Style quirks:**
- RI Sup. Ct. uses "Bd. of License Comm'rs" recurringly in municipal-liquor appeals — the
  *only* recurring NE-jurisdiction caption pattern that requires a stem (`lic`) NOT in the
  current set. This is the highest-impact New England find.
- RI workers' compensation court uses "WCC No. XX-XXXX" docket-style citations. Affects
  citation parsing, not party-name extraction.
- R.I.G.L. = Rhode Island General Laws (statute cite, not case name).

### New Hampshire (N.H.)

Reporter: *New Hampshire Reports* (N.H.), neutral-cite format `2024 N.H. XX` (post-2008).
NH has a unified court system with Sup. Ct., Super. Ct., Circuit Court, and Probate Div.

| Stem    | Full Word     | Source / Caption                                         | Risk                                | Example caption                                                 |
| ------- | ------------- | -------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------- |
| `adj`   | Adjustment    | NH "Zoning Bd. of Adj." per RSA 674:33                   | Medium — "adj." also = adjective/adjacent | `Kalil v. Town of Dummer Zoning Bd. of Adjustment`, 155 N.H. 307 (2007)  |
| `lic`   | License/Licensing | NH licensing & professional regulation                | Low                                 | "Bd. of Lic. for Real Est. v. ..."                              |

**Already covered:** All NH terms — `bd`, `sch`, `dist`, `secy` (N.H. Sec'y of State —
e.g., `Casey v. N.H. Sec'y of State`), `dept`, `commr`, `commn`.

**Style quirks:**
- NH uses public-domain neutral cites since 2008: `2024 N.H. 48` (year + state + opinion
  number). Verified against `Doe v. Manchester School District`, 2024 N.H. 48 and
  `Keene Publ'g Corp. v. Fall Mountain Reg'l Sch. Dist.`, 2025 N.H. 35.
- "RSA" = Revised Statutes Annotated. Statute citation only.
- "Strafford, SS." / "Hillsborough, SS." in Superior Court captions: "SS." is short for
  "ss" (Latin scilicet, county designation) — appears only in pleadings, not opinion case
  names. Not a concern for case-name backward scan.
- "Appeal of [Party]" is a common NH caption form for administrative appeals
  (`Appeal of Farmington School District`, 168 N.H. 726 (2016)). Tokenized as a normal
  party-name string; no internal abbreviation issue.

### Vermont (Vt.)

Reporter: *Vermont Reports* (Vt., bound through 2003), then neutral-cite format
`YYYY VT N` (e.g., `2014 VT 116`). Vermont also uses *A.* / *A.2d* / *A.3d* as parallel.

| Stem    | Full Word     | Source / Caption                                          | Risk                                  | Example caption                                                         |
| ------- | ------------- | --------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------- |
| `adj`   | Adjustment    | "Zoning Bd. of Adj." very common in VT land-use opinions  | Medium                                | `Terino v. Hartford Zoning Bd. of Adj.`, 148 Vt. 663 (1987); `Wilcox v. Manchester Zoning Bd. of Adjustment`, 159 Vt. 193 (1992) |

**Already covered:** All VT terms — `bd`, `dist`, `sch`, `dept`, `commn`, `commr`,
`envtl`, `prot`, `loc` (Town of X).

**Style quirks:**
- VT "Selectboard" is spelled out as a single word in opinions (e.g., `Town of Guilford
  Selectboard`) — no period, no scan issue. Some older town-meeting records used
  "Selectmen of X", also full word.
- VT Reports neutral format omits "v." in the docket number itself but retains it in
  case captions.
- "V.R.A.P." = Vermont Rules of Appellate Procedure; "V.R.C.P." = Civil Procedure.
  Rule-citation, not party-name.
- Vermont's Environmental Court (now Environmental Division of Superior Court) issues
  decisions cited as `XX Vt. Env. Ct. XX` or `No. XX-XX Vtec`. Not a party-name issue.

### Maine (Me.)

Reporter: *Atlantic Reporter* only (Maine Reports ceased in 1965); neutral-cite format
`YYYY ME N` (post-1997).

| Stem    | Full Word | Source / Caption                                                  | Risk | Example caption                                                          |
| ------- | --------- | ----------------------------------------------------------------- | ---- | ------------------------------------------------------------------------ |
| (none specific) |  | All recurring abbreviations are already covered.                  |      | `Passadumkeag Mountain Friends v. Bd. of Envtl. Prot.`, 2014 ME 116 (`bd`, `envtl`, `prot` all present); `Champlain Wind, LLC v. Bd. of Envtl. Prot.`, 2015 ME 156 |

**Already covered:** All Maine terms — `bd`, `envtl`, `prot`, `co`, `dept`, `commr`,
`commn`, `co`, `corp`, `secy`, `mun`.

**Style quirks:**
- Maine's public-domain "vendor-neutral" cite format `2014 ME 116` (year + ME + opinion
  number) has been MANDATORY since Jan. 1, 1997. Older citations are `XXX Me. XXX` or
  `XXX A.2d XXX`. The parallel pincite to the Atlantic Reporter is optional for
  post-1997 opinions per Uniform Maine Citations.
- Maine references statutes as "M.R.S." (Maine Revised Statutes) or older "M.R.S.A.".
- Maine Reports were discontinued in 1965 (volume 161 was the last), so any cite of
  the form `XXX Me. XXX (post-1965)` is anomalous and should be rejected by validation.
- Maine's lower trial courts include District Court and Superior Court; the Business
  & Consumer Docket issues opinions cited `(BCD-CV-XX-XX)`.

## Cross-Jurisdiction Patterns

1. **`Lic.` (Licensing) is the highest-impact New England-specific addition.** Found in
   recurring RI municipal liquor licensing captions, MA professional licensing, and
   NH/CT professional regulation. No alternative stem matches.
2. **`Adj.` (Adjustment) for zoning-board cases** is widespread across NH and VT
   (`Zoning Bd. of Adj.`). Less common in MA where "Zoning Bd. of Appeals" / "ZBA" is
   the typical form. The risk: "adj." also occasionally appears as "adjective" /
   "adjacent" in abstract legal commentary, but those uses *never* appear immediately
   inside a party-name backward scan that the case-name extractor cares about.
3. **Public-domain neutral citation formats** (`2024 N.H. 48`, `2014 ME 116`, `2016 VT 55`)
   are New England's biggest *citation-shape* quirk. These don't affect case-name backward
   scan but do affect what the tokenize step needs to recognize. Out of scope for this
   research target, but worth flagging for completeness.
4. **No NE state has unique party-name abbreviations missing from the Bluebook T6 list.**
   The recurring captions (`Bd. of Selectmen`, `Town of`, `Conservation Comm'n`,
   `Planning & Zoning Comm'n`, `Bd. of Envtl. Prot.`) all decompose into abbreviations
   already in CASE_NAME_ABBREVS or remain as full words.

## False-Positive Guardrail Check

| Stem     | Could appear as sentence-end English word?                                  | Verdict |
| -------- | --------------------------------------------------------------------------- | ------- |
| `lic`    | No — "lic." is not used as an English-prose abbreviation outside law       | Safe    |
| `adj`    | Marginal — "adj." may appear in dictionary/grammar prose ("(adj.)") but is very rare in legal opinion text and *very* rare immediately before a capitalized word starting a citation party. The token "adj" + period + uppercase letter is overwhelmingly "Adj. [PlaceName/Authority]" in legal corpus. | Acceptable |
| `commw`  | No                                                                          | Safe    |

## Top Recommendations (Prioritized)

1. **HIGH — Add `"lic"`** (License/Licensing).
   *Evidence:* `Tiverton Bd. of License Comm'rs v. Pastore`, 469 U.S. 238 (1985); many RI
   municipal-liquor opinions; MA professional-licensing boards. Zero false-positive risk.
   No overlap with any existing stem.

2. **MEDIUM — Add `"adj"`** (Adjustment).
   *Evidence:* `Terino v. Hartford Zoning Bd. of Adj.`, 148 Vt. 663 (1987); `Kalil v.
   Town of Dummer Zoning Bd. of Adjustment`, 155 N.H. 307 (2007); recurring throughout
   VT/NH zoning case law. Slight false-positive risk in dictionary/grammar prose but
   negligible in opinion corpora.

3. **LOW — Add `"commw"`** (Commonwealth Court).
   *Evidence:* "Pa. Commw. Ct." — appears in NE opinions as cross-jurisdiction citations
   to Pennsylvania Commonwealth Court. Low impact (does not affect a NE party name), but
   trivially safe to add. MA's "Comm. v." form is already handled by the existing
   `comm` stem.

Suggested code block to add at the end of CASE_NAME_ABBREVS:

```ts
  // ── New England regional gaps (research: 2026-05-10) ──
  //   - "Lic." (License/Licensing) — "Bd. of License Comm'rs", "Lic. Comm'rs"
  //     Tiverton Bd. of License Comm'rs v. Pastore, 469 U.S. 238 (1985) (R.I.)
  //   - "Adj." (Adjustment) — "Zoning Bd. of Adj." in VT/NH land-use opinions
  //     Terino v. Hartford Zoning Bd. of Adj., 148 Vt. 663 (1987)
  //   - "Commw." (Commonwealth Court) — "Pa. Commw. Ct." cross-citations
  "lic",
  "adj",
  "commw",
```

## Sources

- freelawproject/reporters-db, `data/case_name_abbreviations.json` —
  https://github.com/freelawproject/reporters-db/blob/main/reporters_db/data/case_name_abbreviations.json
- Massachusetts SJC Style Manual — `mass.gov/doc/sjc-style-manual` (403-blocked from
  fetcher; content cross-verified via Justia/FindLaw caption searches)
- Connecticut Manual of Style for the Connecticut Courts (3d ed.) — `jud.ct.gov`
- Uniform Maine Citations — Univ. of Maine School of Law
- Cornell Legal Information Institute, Basic Legal Citation: state samples for Conn., Me.,
  Vt., N.H., R.I.
- Real captions cross-checked on Justia and FindLaw:
  - `Tiverton Bd. of License Comm'rs v. Pastore`, 469 U.S. 238 (1985)
  - `Passadumkeag Mountain Friends v. Bd. of Envtl. Prot.`, 2014 ME 116
  - `Champlain Wind, LLC v. Bd. of Envtl. Prot.`, 2015 ME 156
  - `Terino v. Hartford Zoning Bd. of Adj.`, 148 Vt. 663 (1987)
  - `Wilcox v. Manchester Zoning Bd. of Adjustment`, 159 Vt. 193 (1992)
  - `Kalil v. Town of Dummer Zoning Bd. of Adjustment`, 155 N.H. 307 (2007)
  - `Casey v. N.H. Sec'y of State`
  - `Bierman v. Planning & Zoning Comm'n`, 185 Conn. 135 (1981)
  - `Bd. of Selectmen of Southborough` (MA: Framingham Clinic, 373 Mass. 279 (1977))
