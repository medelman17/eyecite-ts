# California Style — Environmental, Land Use, and Specialty Practice Citation Forms

> Research scope: CEQA litigation, Coastal Commission decisions, OPR advisory
> opinions, State Water Resources Control Board (SWRCB), Regional Water Quality
> Control Boards (RWQCB), Department of Toxic Substances Control (DTSC),
> construction defect (SB 800), real property / land use (quiet title,
> mechanic's lien, UD, HOA Davis-Stirling, Subdivision Map Act), CA local
> government (LAFCO, JPA, charter cities), CA Indian Gaming + Gambling Control
> Commission, Department of Health Care Services (DHCS) Medi-Cal, California
> Department of Social Services (CDSS) state hearings, Department of Motor
> Vehicles (DMV) APS, Department of Real Estate (DRE), California Energy
> Commission (CEC), CalRecycle, Native American Heritage Commission (NAHC).

## Summary

1. **Most of the case-law side is already covered.** All published opinions
   from environmental, land use, HOA, construction defect, real-property, UD
   appellate, Davis-Stirling, Subdivision Map Act, and CA Indian Gaming cases
   appear in `Cal.`, `Cal.App.Nth`, `Cal.Rptr.Nd`, and the federal `F.3d` /
   `F.Supp.3d` reporters and tokenize cleanly through the existing
   `state-reporter` and `federal-reporter` patterns. CSM no-space spacing
   (`Cal.App.4th`) and Bluebook spacing (`Cal. App. 4th`) both already work.
2. **The high-value gap is statutes.** CEQA is `Pub. Res. Code § 21000` —
   already covered by `knownCodes` entry `PRC`. SWRCB orders are routinely
   cited by the underlying `Wat. Code § 13301` (CDO) or `Health & Saf. Code
   § 25358.3` (DTSC) — codes `WAT` and `HSC` are already in `knownCodes`. SB
   800 / Right to Repair is `Civ. Code §§ 895–945.5` — `CIV` already covered.
   Davis-Stirling is `Civ. Code §§ 4000–6150` — same. Subdivision Map Act is
   `Gov. Code §§ 66410 et seq.` — `GOV` already covered. **No new statutory
   codes are needed for this scope.**
3. **The genuine gaps are agency decision identifiers.** None of the
   distinctive numbering schemes for CCC appeals (`A-3-PSB-22-0064`), SWRCB
   orders (`WR 2008-0015`, `WQO 2013-0001-DWQ`), RWQCB orders
   (`R5-2025-0506`), DHCS APLs (`APL 25-016`), CGCC disciplinary cases
   (`CGCC-2022-0512-7`), CEC dockets (`16-RPS-01`, `17-HYD-01`), DMV DS-367,
   OAH decisions, or NAHC orders are currently tokenized. These are *agency
   docket identifiers*, not case-law cites, and most are referenced
   parenthetically or in the body of a brief rather than as the citation
   anchor for a binding rule of law. Their primary value is **link
   resolution** (you want to detect them so the host application can hyperlink
   to the order PDF or e-filing system), not formal Bluebook citation.
4. **CEQA "Notice" / SCH numbers** (e.g., `SCH No. 2021080123`,
   `SCH#2019019004`) are the State Clearinghouse identifiers used to find
   the environmental review record on CEQAnet. These look like federal
   docket-style identifiers and could be added cheaply but are low priority.
5. **Construction defect captions** are entirely standard
   `Association v. Builder` Cal.App. cases. Nothing distinctive about the
   caption form; existing case-name backward scan handles them.
6. **Coastal Commission staff reports** are not citations, they are agency
   documents. The relevant *citable* artifact from a CCC proceeding is the
   final Commission action (a vote on `Appeal No. A-X-YYY-NN-NNNN` or
   `CDP No. N-YY-NNNN`), referenced in briefs by appeal number. Worth
   tokenizing if eyecite-ts is to support agency-decision linking.
7. **CDSS state hearing decisions** carry a paragraph 22-XXX or 22-NNN
   regulation cite (e.g., `MPP 22-045.3`), which is **already covered** under
   the abbreviated-code pattern if the user uses `Manual of Policies and
   Procedures` or `MPP` — but those are not currently in the known-code list.
   This is the only meaningful state-side regulatory gap.
8. **The DMV DS-367 form** has no citation; it is an evidentiary form (the
   "pink slip"). DMV APS hearing decisions also have no formal published
   citation — they are unpublished agency dispositions. Treating these as
   citation candidates is out of scope.
9. **LAFCO, JPA, and charter-city ordinances** are not citable as case law.
   Their relevant artifacts are local ordinance numbers (`Ord. No. 2024-15`,
   `Resolution No. 2025-007`), which collide with too many other docket
   number forms and have low extraction value.
10. **Net recommendation: do not add per-agency regex patterns yet.** The
    statutory backbone is already there; add the four CEC/CCC/SWRCB/RWQCB
    identifier shapes only if and when a downstream consumer specifically
    requests agency-decision links. The single defensible addition right now
    is a generic California State Clearinghouse `SCH No.` recognizer because
    it appears in published CEQA case captions and parenthetical CEQA
    references where the SCH number is treated as authoritative project ID.

---

## Per-Area Sections

### 1. CEQA (California Environmental Quality Act) Litigation

**Statutory anchor:** Public Resources Code § 21000 et seq.; implemented by
Title 14, California Code of Regulations, §§ 15000–15387 (the CEQA
Guidelines).

**Typical captions:**

| Form | Real example |
|------|--------------|
| Petitioner v. Lead Agency | `Bess Bair et al. v. California Department of Transportation et al. (2026) 119 Cal.App.5th 579` |
| Citizens group v. City | `Coalition of Pacificans for an Updated Plan v. City Council of the City of Pacifica (2025) 117 Cal.App.5th 647` |
| Environmental NGO v. DTSC | `Physicians for Social Responsibility – Los Angeles v. Department of Toxic Substances Control (2026) 118 Cal.App.5th 1071` |
| State-side standard | `Planning & Conservation League v. Department of Water Resources (2000) 83 Cal.App.4th 892` |

The form is plain Cal.App.Nth / Cal.Nth. No "(CEQA)" parenthetical convention
exists. The fact that the case is CEQA is established by the statutory
citation in the body, not by anything in the caption.

**SCH (State Clearinghouse) numbers** appear in case captions only rarely —
typically in administrative-record disputes (e.g.,
`(SCH No. 2021080123)` appended to a project name in the body of an
opinion). When they appear, they look like an 8-to-10 digit number
preceded by `SCH No.`, `SCH#`, or `State Clearinghouse No.`. Prior to 2000,
8 digits; after 2000, 10 digits (YYYYMMNNNN).

**Statutory citation forms (already covered):**

```
Pub. Res. Code § 21000          → knownCodes "PRC" (✓)
Pub. Res. Code § 21080(b)        → knownCodes "PRC" (✓)
Pub. Res. Code §§ 21082.2-21083  → knownCodes "PRC" (✓)
Cal. Code Regs., tit. 14, § 15000 (CEQA Guidelines) → not currently a named-code lookup, but matches generic "Cal. Code Regs." regex used elsewhere
```

**CEQA-specific quirk:** Briefs commonly cite the **CEQA Guidelines** as
`CEQA Guidelines, § 15064(b)` or `Guidelines, § 15064(b)` — a shorthand for
`14 Cal. Code Regs. § 15064(b)`. The existing parser will not recognize
`Guidelines, § ...` as a statute. This is a CEQA-only convention used
inside CEQA opinions and would require a special-case pattern.

**Current eyecite-ts handling:**

- Case-name backward scan: works (party names use standard Bluebook abbreviations).
- Case reporter: works (`Cal.App.5th`, `Cal.4th` already tokenize).
- Pub. Res. Code § X: works (`PRC` is in `knownCodes`).
- `Guidelines § X`: **not handled** — would tokenize as the bare `§ X`
  which `extractStatute` rejects without a code prefix.
- `SCH No. NNNNNNNNNN`: **not handled** — generic-text, not currently
  recognized.

**Recommended action:**

- **Priority 4 (low/optional)**: Add a `Cal. Code Regs.`-aware regex (some
  CEQA briefs say `14 CCR § 15064` or `Title 14, § 15064`). Most CEQA cases
  already use `Pub. Res. Code` which works.
- **Priority 5 (defer)**: Recognize the bare `CEQA Guidelines, § 15064`
  short-form. Implementation cost: low (a single shortform pattern with a
  fixed `CEQA Guidelines` literal). Value: low (rarely the primary citation
  in case extraction; usually the statute is cited fully elsewhere in the
  brief).

**Recommended regex (proposal, do not add without sign-off):**

```typescript
// CEQA Guidelines short form: "CEQA Guidelines, § 15064(b)(2)" or "Guidelines § 15064"
// Resolves to 14 Cal. Code Regs. § <body>. Match only inside a parenthetical
// or after a comma+space, to reduce false positives.
{
  id: "ceqa-guidelines-short",
  regex: /\b(?:CEQA\s+Guidelines|Guidelines)\s*,?\s*§\s*(\d+(?:\.\d+)?(?:\([^)]*\))*)/g,
  description: 'CEQA Guidelines short-form section reference (resolves to 14 CCR §)',
  type: "statute",
}
```

---

### 2. California Coastal Commission Decisions

**Order types:**

| Type | Numbering scheme | Example |
|------|------------------|---------|
| CDP application (post-cert) | `N-YY-NNNN` or `N-YY-NNNN-A` | `CDP No. 9-18-0629` |
| CDP appeal | `A-D-LLL-YY-NNNN` | `Appeal No. A-5-VEN-21-0069`, `A-3-PSB-22-0064` |
| Local Coastal Program (LCP) amendment | `LCP-D-LLL-YY-NNNN` | `LCP-3-PSB-22-0001` |
| Consistency determination | `CD-NNN-YY` | `CD-019-22` |
| Cease and desist order | `CCC-YY-CD-NNN` | `CCC-22-CD-001` |
| Enforcement action | `V-D-YY-NNNN` (violation) | `V-5-21-0123` |

**Where each segment comes from:**

- First digit (`9`, `5`, `3`): the **Coastal Commission district** (1=North
  Coast, 2=North Central, 3=Central, 5=South Central / South, 6=San Diego,
  7=Statewide, 9=South Coast / Los Angeles County; the codes are
  geographic, not strictly numbered).
- `LLL`: a 3-letter local-government code (e.g., `VEN` = Ventura, `PSB` =
  Pismo Beach, `MAL` = Malibu, `SCR` = Santa Cruz, `SF`  = San Francisco).
- `YY`: 2-digit year.
- `NNNN`: 4-digit sequential.

**Citation form in briefs:**

```
Appeal No. A-5-VEN-21-0069 (Cal. Coastal Comm'n, May 12, 2022) (substantial issue findings).
CDP No. 9-18-0629 (Cal. Coastal Comm'n, Mar. 10, 2020).
```

Note the **agency designator** is `Cal. Coastal Comm'n` — the `Comm'n` stem
is already in the abbreviation set.

**Current eyecite-ts handling:**

- The appeal number itself (e.g., `A-5-VEN-21-0069`) does not match any
  current tokenizer pattern. It looks docket-like but starts with `A-`
  rather than `No.`, so the `docket-paren-court-year` pattern misses it.
- If wrapped as `No. A-5-VEN-21-0069 (Cal. Coastal Comm'n 2022)`, the docket
  pattern would match — but the agency designator `Cal. Coastal Comm'n`
  must end with a `\d{4}` year inside the same parenthetical.
- The `Cal. Coastal Comm'n` agency identifier itself is just text from
  eyecite's perspective — there is no concept of an "agency" citation in
  the type system.

**Recommended action:**

- **Priority 3**: If agency-decision linking becomes a requirement, add a
  CCC-specific tokenizer that recognizes the `A-` / `CDP No.` / `LCP-` /
  `CCC-YY-CD-` prefixes and emits a new `agencyOrder` citation type. Given
  no other agency citations are currently typed, this is a meaningful new
  type-system addition. Defer until cross-agency need is established.

**Proposed regex (for future work):**

```typescript
// California Coastal Commission appeal number: A-D-LLL-YY-NNNN
// (allows the optional -EX or -R suffix on rehearing/extensions)
{
  id: "ccc-appeal",
  regex: /\bA-(\d)-([A-Z]{2,4})-(\d{2})-(\d{4})(?:-[A-Z]{1,3})?/g,
  description: 'California Coastal Commission appeal number (district-locality-year-sequence)',
  type: "agencyOrder",  // new type
}

// California Coastal Commission Coastal Development Permit
{
  id: "ccc-cdp",
  regex: /\bCDP\s+No\.\s*(\d)-(\d{2})-(\d{4})(?:-[A-Z]{1,3})?/g,
  description: 'California Coastal Commission CDP number',
  type: "agencyOrder",
}
```

---

### 3. Office of Planning and Research (OPR) Advisory Opinions

**Order type:** OPR issues *Technical Advisories* on CEQA topics; these are
not regulations and are not binding. They are referenced by **title +
date** rather than a docket number.

**Citation form in briefs:**

```
OPR, Technical Advisory: CEQA and Climate Change (Dec. 2018).
OPR, Technical Advisory on Evaluating Transportation Impacts in CEQA (Dec. 2018).
OPR, Discussion Draft Advisory on Climate Change (Dec. 28, 2018).
```

In 2024 OPR was reorganized as the **Office of Land Use and Climate
Innovation (LCI)**, accessible at `lci.ca.gov`. Future citations will say
`Cal. Office of Land Use and Climate Innovation, Technical Advisory: ...
(YYYY)`. The OPR name persists in historical case law.

**Current eyecite-ts handling:** Not citation-shaped; these are
title-and-date references that look like book/report citations. The case-
name backward scan correctly will not treat `OPR, Technical Advisory: ...`
as a case caption.

**Recommended action:** No tokenizer work. These references are linkable by
external systems (e.g., citation linker frontends) using OPR's document
title; no regex would help.

---

### 4. State Water Resources Control Board (SWRCB)

**Order categories and their numbering schemes:**

| Category | Numbering format | Example |
|----------|------------------|---------|
| Water Rights Decision (formal adjudication) | `Decision NNNN` (3- or 4-digit) | `Decision 1644` (Bay-Delta) |
| Water Rights Order | `WR YYYY-NNNN` | `WR 2008-0015`, `WR 2009-0061` |
| Water Quality Order | `WQO YYYY-NNNN-XXX` | `WQO 2013-0001-DWQ` |
| Cease and Desist Order (WR) | `WR YYYY-NNNN-DWR` | `WR 2014-0042-DWR` |
| Administrative Civil Liability (ACL) Order | `WR YYYY-NNNN-DWR` or `RX-YYYY-NNNN-DWQ` | `WR 2022-0029-DWR` |

Old-style (pre-2000) used 2-digit year: `WQO 97-10`, `WR 96-1`. Modern
format uses 4-digit year and 4-digit sequence.

Suffixes:
- `-DWQ`: Division of Water Quality
- `-DWR`: Division of Water Rights
- `-EX`: Executive Officer issued

**Citation form in briefs:**

```
State Water Bd. Order WR 2008-0015 (June 18, 2008).
State Water Resources Control Bd. Order No. WQO 2013-0001-DWQ.
SWRCB Order WR 96-1 (Lagunitas Creek).
State Water Bd. Decision 1644 (Mar. 1, 2000) (Bay-Delta).
```

**Current eyecite-ts handling:**

- The format `WR 2008-0015` is not recognized by any current pattern.
- Could partially be caught by the `state-vendor-neutral-hyphenated` pattern
  (`2008-XXXX-NNNN-XXX`) if reversed — but the year-first ordering is
  inverted from the existing format expectation.
- The `Decision 1644` form is too generic to tokenize without strong
  context.

**Recommended action:**

- **Priority 3**: Add an `swrcb-order` tokenizer pattern if cross-agency
  decision linking is added.

**Proposed regex (for future work):**

```typescript
// SWRCB Water Rights or Water Quality Order
// Forms: "WR 2008-0015", "WQO 2013-0001-DWQ", "WR 96-1", "WR 2014-0042-DWR"
{
  id: "swrcb-order",
  regex: /\b(?:WR|WQO|WRO)\s+(\d{2,4})-(\d{1,4})(?:-(DWQ|DWR|EX|CDO|ACL))?/g,
  description: 'State Water Resources Control Board Order/Decision number',
  type: "agencyOrder",
}
```

---

### 5. Regional Water Quality Control Board (RWQCB) — 9 Regions

**Order numbering scheme:** `RX-YYYY-NNNN` where `X` is the region number
(R1 = North Coast, R2 = San Francisco Bay, R3 = Central Coast, R4 = Los
Angeles, R5 = Central Valley, R6 = Lahontan, R7 = Colorado River Basin, R8
= Santa Ana, R9 = San Diego).

| Type | Format | Example |
|------|--------|---------|
| Order (general) | `RX-YYYY-NNNN` | `R5-2025-0506` |
| Stipulated CDO | `RX-YYYY-NNNN-stip` (informal) | `R5-2020-0529` |
| ACL Complaint | `RX-YYYY-NNNN` (with `-ACL` suffix sometimes) | `R5-2024-0123-ACL` |

**Citation form:**

```
Cal. Reg'l Water Quality Control Bd., Cent. Valley Region, Order No. R5-2025-0506.
RWQCB-5 Order R5-2020-0529 (Stip. CDO).
```

**Current eyecite-ts handling:** Not tokenized. Could conflict with the
`state-vendor-neutral` pattern because the year-NNNN structure resembles
neutral citations.

**Recommended action:**

- **Priority 3**: Co-located with SWRCB tokenizer above. The RWQCB form
  could share the same regex:

```typescript
{
  id: "rwqcb-order",
  regex: /\bR([1-9])-(\d{4})-(\d{4})(?:-(stip|ACL|CDO|EX))?/g,
  description: 'Regional Water Quality Control Board Order (region-year-sequence)',
  type: "agencyOrder",
}
```

---

### 6. Department of Toxic Substances Control (DTSC)

**Order types:**

| Type | Statutory basis | Numbering |
|------|-----------------|-----------|
| Imminent and Substantial Endangerment (ISE) Determination & Order | Health & Saf. Code § 25358.3(a) | `HSA No. ENF-YYYY-NNNN` (informal); often no public docket number, identified by site name (e.g., `Berkeley-Auto`, `BKK Landfill`, `Ascon Landfill`) |
| Remedial Action Order (RAO) | Health & Saf. Code § 25355.5(a)(1)(B) | Site-name based |
| Voluntary Cleanup Agreement (VCA) | Health & Saf. Code § 25355.5 | Contract reference, no docket |
| Permit Decision | Health & Saf. Code § 25200 | `EPA ID No. CADNNNNNNNNNN` |

**Where to find them:** DTSC Envirostor database. Each site has an
"Envirostor ID" (`NN-NNNNNN` or `NNNNNNNN`) which is the closest thing to a
docket number.

**Citation form:**

```
Dep't of Toxic Substances Control, Imminent and Substantial Endangerment Determination and Order
   (Berkeley-Auto Body Shop site, July 14, 2017).
DTSC Envirostor No. 60003008 (Ascon Landfill).
```

**Current eyecite-ts handling:** Not tokenized. DTSC orders are typically
referenced by site name + date, which is not citation-shaped.

**Recommended action:** No new tokenizer. DTSC orders are usually cited
through their statutory authority (`Health & Saf. Code § 25358.3` —
already covered) plus a site/date prose reference.

---

### 7. Construction Defect / SB 800 (Right to Repair Act)

**Statutory anchor:** Civil Code §§ 895–945.5 (added by Stats. 2002, ch.
722, SB 800). Covered by `knownCodes` entry `CIV` already.

**Caption pattern:** `<HOA Name> v. <Developer/Builder>`, standard
Cal.App.Nth form:

```
Liberty Mut. Ins. Co. v. Brookfield Crystal Cove LLC (2013) 219 Cal.App.4th 98.
McMillin Albany LLC v. Superior Court (2018) 4 Cal.5th 241.
Belasco v. Wells (2015) 234 Cal.App.4th 409.
Greystone Homes, Inc. v. Midtec, Inc. (2008) 168 Cal.App.4th 1194.
```

**Tokenization status:** Already handled. Plain Cal.App.Nth form, party
names use only abbreviations already in the set (`LLC`, `Inc.`, `Mut.`,
`Ins.`, `Co.`).

**No action required.**

---

### 8. Real Property / Land Use (Quiet Title, Mechanic's Lien, Unlawful Detainer Appellate)

**Statutory anchors:**
- Quiet title: Code Civ. Proc. § 760.010 et seq. — `CCP` covered.
- Mechanic's lien: Civ. Code §§ 8000–9566 (rewrite of former §§ 3082–3267) —
  `CIV` covered.
- Unlawful detainer: Code Civ. Proc. § 1161 et seq. — `CCP` covered.

**Captions** are standard Cal.App.Nth and Cal.App.Supp. forms:

```
Kennecott Corp. v. Union Oil Co. (1987) 196 Cal.App.3d 1179, 242 Cal.Rptr. 403.
Linthicum v. Butterfield (2009) 175 Cal.App.4th 259.
Paterra v. Hansen (2021) 64 Cal.App.5th 507.
Nickell v. Matlock (2012) 206 Cal.App.4th 934.
Husain v. California Pacific Bank (2021) 61 Cal.App.5th 717.
Visitacion Investment, LLC v. 424 Jessie Historic Properties, LLC (2023) 92 Cal.App.5th 1081.
Selby Constructors v. McCarthy (1979) 91 Cal.App.3d 517.
Palomar Grading & Paving, Inc. v. Wells Fargo Bank, N.A. (2014) 230 Cal.App.4th 686.
```

**Unlawful detainer appellate:** UD appeals from limited civil cases go to
the Appellate Division of the Superior Court, reported in **`Cal.App.Supp.`**
(or, in newer series, `Cal.App.4th Supp.` / `Cal.App.5th Supp.`). The
existing `cal`, `app`, and `supp` stems handle this.

**Note re: spacing quirk (from CA Style Manual research doc):** Cal.App.
Supp. uses inconsistent spacing — early series `Cal.App.Supp.` with no
space, later series `Cal.App.4th Supp.` with a space. The existing CA
style research notes this; verify with corpus tests.

**Tokenization status:** Already handled. No action required for case-law
references.

**Status of common phrases:**

| Phrase | Tokenized? | Notes |
|--------|------------|-------|
| `Code Civ. Proc., § 1161, subd. (2)` | Yes — CCP | CSM comma-form already works |
| `CCP § 437c` (Bluebook) | Yes — CCP | |
| `Civ. Code §§ 8000–9566` | Yes — CIV | Range form supported by existing parser |
| `mechanic's lien claim` (prose) | N/A | Not a citation |

---

### 9. HOA Assessment / Davis-Stirling Act

**Statutory anchor:** Civil Code §§ 4000–6150 (the Davis-Stirling Common
Interest Development Act, recodified in 2014 from former §§ 1350–1376). `CIV`
covered.

**Captions:** Standard Cal.App.Nth / Cal.Nth:

```
Lamden v. La Jolla Shores Condominium Homeowners Assn. (1999) 21 Cal.4th 249.
Bear Creek Master Assn. v. Edwards (2005) 130 Cal.App.4th 1470.
Cisneros v. Sierra Bldg. Maint., Inc. (2010) 187 Cal.App.4th 1093.
Tract 7260 Assn., Inc. v. Parker (2017) 10 Cal.App.5th 24.
```

`Assn.` is the CSM form (Bluebook is `Ass'n`). Both are stem-covered:
`assn` already in the abbreviation set.

**Tokenization status:** Already handled. No action required.

---

### 10. Subdivision Map Act Challenges

**Statutory anchor:** Government Code §§ 66410–66499.40 (the Subdivision
Map Act). `GOV` covered.

**Captions:**

```
Ailanto Properties, Inc. v. City of Half Moon Bay (2006) 142 Cal.App.4th 572.
Friends of Riverside's Hills v. City of Riverside (2008) 168 Cal.App.4th 743.
Anza Parking Corp. v. City of Burlingame (1987) 195 Cal.App.3d 855.
```

**Tokenization status:** Already handled. No action required.

---

### 11. California Local Government (Charter vs. General Law Cities, LAFCO, JPA)

**Charter vs. general law cities — citation conventions:**

Charter city ordinances are cited as part of the **municipal code**
(e.g., `San Francisco Mun. Code § 102.1`), while general law cities cite
their **ordinance number** (`Ord. No. 2024-15` or `Ord. No. 24-15`). No
distinction in case captions — both appear as `Smith v. City of XXX`.

**LAFCO** (Local Agency Formation Commission) — one per county (58 total),
authorized by Government Code §§ 56000 et seq. (Cortese-Knox-Hertzberg Local
Government Reorganization Act of 2000).

LAFCO **resolutions** carry numbers like:

```
LAFCO Resolution No. 2024-07
LAFCO Resolution No. SLO-2023-15  (San Luis Obispo)
LAFCO Determination No. 2024-3 (Marin)
```

No statewide format — each county LAFCO sets its own.

**JPA (Joint Powers Authority):** Government Code §§ 6500 et seq. — `GOV`
covered. JPA agreements are referenced by JPA name (e.g.,
`California State Association of Counties Excess Insurance Authority`)
plus document title and date. No formal docket numbering.

**Citation form in case captions:**

```
City of Riverside v. Inland Empire Patients Health & Wellness Center, Inc. (2013) 56 Cal.4th 729.
County of San Diego v. Cal. Water & Tel. Co. (1947) 30 Cal.2d 817.
Bishop v. City of San Jose (1969) 1 Cal.3d 56  (charter-city case).
```

`Cal. Const., art. XI, § 5` is the canonical charter-city authority — `cal`,
`const`, `art` already covered (the `art` stem is in the case-name
abbreviation set per CA style doc, line 285).

**Tokenization status:** Captions already handled. LAFCO and JPA docket
numbers are not currently tokenized.

**Recommended action:** No new pattern. The `Resolution No. YYYY-NN`
form is too generic and would produce many false positives.

---

### 12. CA Indian Gaming Appellate Cases + Gambling Control Commission

**Federal forum:** Most Indian Gaming Regulatory Act (IGRA) compact-
formation disputes go to the Ninth Circuit (e.g.,
`In re Indian Gaming Related Cases (Coyote Valley II)` (9th Cir. 2003) 331
F.3d 1094). Plain `F.3d` form, already covered.

**California state forum:** Some compact-implementation challenges go to
state court:

```
Pala Band of Mission Indians v. State of California (2018) 31 Cal.App.5th 28.
San Pasqual Band of Mission Indians v. State (2015) — discussed but no published cite found in search; verify.
Oliver v. County of Los Angeles (1998) 66 Cal.App.4th 1397 (player-banked games).
```

Plain Cal.App. form. Captions use the standard `<Tribe> v. State of
California` or `<Tribe> v. Cal. Gambling Control Comm'n`.

**California Gambling Control Commission (CGCC) disciplinary orders:**

| Format | Example |
|--------|---------|
| CGCC matter number | `CGCC-YYYY-MMDD-N` | `CGCC-2022-0512-7` |
| Companion Bureau of Gambling Control number | `BGC-HQYYYY-NNNNNSL` | `BGC-HQ2022-00009SL` |

**Citation form in briefs:**

```
Cal. Gambling Control Comm'n, In re XYZ Cardroom, Case No. CGCC-2022-0512-7 (Dec. 12, 2022).
```

**Current eyecite-ts handling:** CGCC matter numbers do not match any
existing pattern. Could be added as part of a generic agency-order pattern.

**Recommended action:**

- **Priority 4 (low)**: Add CGCC pattern if cross-agency decision linking
  is implemented. Otherwise these orders are referenced only in
  enforcement-bar specialty practice.

---

### 13. California Department of Health Care Services (DHCS) — Medi-Cal

**Order types:**

| Type | Numbering | Example |
|------|-----------|---------|
| All Plan Letter (APL) | `APL YY-NNN` | `APL 25-016`, `APL 21-011` |
| Policy Letter (PL) | `PL YY-NNN` | `PL 22-007` |
| Information Notice (IN) | `IN YY-NNN` | `IN 24-005` |
| Provider Bulletin | `[YYYY-]NN` issue number | `Bulletin 506`, `Bulletin 25-12` |
| Plan/State Plan Amendment | `SPA YY-NNNN` | `SPA 19-0030` |

**Citation form in briefs:**

```
Dep't of Health Care Servs., All Plan Letter 25-016 (Mar. 14, 2025).
DHCS APL 21-011.
DHCS, Medi-Cal Provider Bulletin No. 506 (Apr. 2023).
```

**Note on provider appeals:** DHCS provider appeals from claim denials are
adjudicated by the **Office of Administrative Hearings (OAH)** under the
Administrative Procedure Act (Gov. Code § 11340 et seq.). The resulting
proposed/final decision carries an OAH case number (`OAH No. NNNNNNNNNN`)
which is itself an opaque numeric — see OAH section below.

**Beneficiary appeals:** Go through the CDSS State Hearings Division — see
CDSS section.

**Current eyecite-ts handling:** APL numbers do not match existing patterns.

**Recommended action:**

- **Priority 4 (low)**: Add an `agency-letter` pattern for the family of
  `APL`, `PL`, `IN`, `MCEDL`, `MHSUDS-IN` (DHCS Mental Health Services
  Information Notice). Many state agencies use the same `<3-letter
  prefix> YY-NNN` format (CDPH, CDSS, DMV, DGS).

**Proposed regex (for future work):**

```typescript
// State agency policy/information/all-plan letters: APL 25-016, PL 22-007, IN 24-005
{
  id: "agency-letter",
  regex: /\b(APL|PL|IN|MCEDL|MHSUDS-IN|ACIN|ACL|CCL|CSI|ENF|MIN|PIN)\s+(\d{2})-(\d{3,4})\b/g,
  description: 'State agency policy/information letter (e.g., DHCS APL 25-016, CDSS ACIN 24-30)',
  type: "agencyOrder",
}
```

Caveat: `ACL` and `ACL` collide between CDSS All-County Letters and water
board Administrative Civil Liability — context-disambiguation must happen
in the extractor by looking at the surrounding agency designator.

---

### 14. California Department of Social Services (CDSS) — State Hearings

**Order types:**

| Type | Numbering | Example |
|------|-----------|---------|
| All-County Letter (ACL) | `ACL YY-NN` | `ACL 24-42` |
| All-County Information Notice (ACIN) | `ACIN I-YY-NN` | `ACIN I-24-12` |
| Manual of Policies and Procedures (MPP) | `MPP § XX-YYY.Z` | `MPP § 22-045.3` |
| State Hearing Decision | individual case number, not published | (sealed; no public docket) |

**Caveat:** Individual state hearing decisions (CalWORKs, CalFresh, IHSS,
Welfare, Medi-Cal beneficiary appeals) are **not publicly indexed**. They
are referenced internally by claim ID. The body of state-hearing law is
the **MPP** plus periodic **ACL/ACIN** letters interpreting the MPP.

**Citation form in briefs:**

```
Cal. Dep't of Soc. Servs., All-County Letter 24-42 (Sept. 18, 2024).
CDSS ACL 24-42.
MPP § 22-045.3 (CDSS state-hearing regulations).
```

**Current eyecite-ts handling:** MPP citations are *not* tokenized. The
`MPP` prefix is not in any known-code list. The `ACL`/`ACIN` letter form
is not tokenized.

**Recommended action:**

- **Priority 2 (medium)**: Add `MPP § XX-YYY.Z` as a recognized state code
  reference. This is the canonical regulation for CalWORKs/CalFresh/IHSS/
  Medi-Cal hearing law and appears in many briefs and orders. The format
  is unambiguous:

```typescript
// CDSS Manual of Policies and Procedures: "MPP § 22-045.3", "Manual § 22-045.3"
// Resolves to 22 California Code of Regulations equivalent (CDSS regulations).
{
  id: "cdss-mpp",
  regex: /\b(?:MPP|Manual\s+of\s+Policies\s+(?:and|&)\s+Procedures)\s*§§?\s*(\d{1,2}-\d{3,4}(?:\.\d+)*)/g,
  description: 'CDSS Manual of Policies and Procedures section',
  type: "statute",
}
```

(Could share the same MPP-aware extractor that produces a statute citation
with `jurisdiction: "CA"`, `code: "MPP"`.)

---

### 15. California Department of Motor Vehicles (DMV)

**Order types and forms:**

| Type | Numbering | Notes |
|------|-----------|-------|
| Notice of Suspension / Temporary Driver License (DS-367) | form identifier only | The "pink slip"; not citable, evidentiary |
| Administrative Per Se (APS) Order of Suspension | individual driver license number; no public docket | Issued at hearing |
| DMV Hearing Decision | DSO case number, not published | Internal |
| Implied Consent regulations | `13 Cal. Code Regs. § N` | Title 13 of the CCR |

**Statutory anchor:** Vehicle Code § 13353 et seq. (suspension/revocation
procedures), § 13557 (hearing on order). `VEH` covered.

**Citation form:** DMV decisions are unpublished and **not citable as
binding authority**. Briefs typically cite the underlying Vehicle Code
section, the hearing officer's findings of fact (as record material), and
appellate decisions on APS challenges (e.g.,
`Lake v. Reed (1997) 16 Cal.4th 448`).

**Current eyecite-ts handling:** Veh. Code already covered. No DMV order
form to tokenize.

**Recommended action:** No new tokenizer.

---

### 16. California Department of Real Estate (DRE)

**Order types:**

| Type | Numbering | Notes |
|------|-----------|-------|
| Disciplinary Order (Accusation) | `H-NNNNN [LL]` | `H-12345 LA` (region code suffix) |
| Citation (administrative) | `M-YY-NNNNNN` or sequential | Civil penalty letter |
| Statement of Issues (license denial) | `H-NNNNN [LL]` | Same form as accusation |
| Desist & Refrain Order | `D&R Order No. NNNN` | |

DRE decisions are published in monthly "Real Estate Bulletin" / enforcement
summary newsletters and aggregated in the DRE Monthly Disciplinary Actions
report.

**Citation form:**

```
Cal. Dep't of Real Estate, Accusation, Case No. H-12345 LA (2023).
DRE Real Estate Bulletin (Spring 2024) (cited disciplinary summaries).
```

**Current eyecite-ts handling:** Not tokenized. Format collides with the
generic docket pattern but lacks the `(Court YYYY)` parenthetical that
triggers `docket-paren-court-year`.

**Recommended action:** Priority 5 (defer). DRE orders are specialty real
estate practice; rare in mainline citation corpora.

---

### 17. California Energy Commission (CEC)

**Order types:**

| Type | Numbering | Example |
|------|-----------|---------|
| Docket | `YY-PRG-NN` | `17-HYD-01`, `16-RPS-01`, `09-AFC-7` |
| Power Plant Application For Certification (AFC) | `YY-AFC-NN` | `09-AFC-7` (Calico Solar) |
| Renewable Portfolio Standard (RPS) docket | `YY-RPS-NN` | `16-RPS-01` |
| Decision/Order | Publication number `CEC-NNN-YYYY-NNN-EDX-CMF` | `CEC-300-2016-006-ED9-CMF` |
| Commission Decision | by docket + date | `Calico Solar Project, Docket No. 09-AFC-7, Commission Decision, Aug. 2010` |

**Citation form:**

```
Cal. Energy Comm'n, Docket No. 17-HYD-01.
CEC, Renewables Portfolio Standard Eligibility Guidebook, Ninth Edition,
   CEC-300-2016-006-ED9-CMF (May 2017).
```

**Current eyecite-ts handling:**

- `17-HYD-01` could be misinterpreted by the `state-vendor-neutral-
  hyphenated` pattern, which requires `YYYY-PRG-NN` (4-digit year). Since
  CEC uses 2-digit year, it currently does *not* match the neutral
  hyphenated pattern. Good — no false positives.
- `CEC-300-2016-006-ED9-CMF` does not match any pattern.

**Recommended action:**

- **Priority 4 (low)**: Add a CEC docket pattern if agency-decision
  linking is requested.

**Proposed regex:**

```typescript
// CEC docket: 2-digit year + program code + sequence
{
  id: "cec-docket",
  regex: /\b(\d{2})-(AFC|RPS|HYD|EVS|IEPR|MISC|BTP|TRAN|REPI|GHG)-(\d{1,3})\b/g,
  description: 'California Energy Commission docket (year-program-sequence)',
  type: "agencyOrder",
}
```

---

### 18. CalRecycle Enforcement Orders

**Order types:** CalRecycle (formally, the California Department of
Resources Recycling and Recovery, post-2010 merger) issues:

| Type | Statutory basis | Numbering |
|------|-----------------|-----------|
| Notice and Order (N&O) | Pub. Res. Code § 45000 et seq. | site-name based |
| Cease and Desist Order | Pub. Res. Code § 45011 | site-name based |
| Stipulated Notice and Order | same | site-name based |
| Solid Waste Facility Inventory listing | none | listing only |

LEAs (Local Enforcement Agencies) actually issue most N&Os, with
CalRecycle providing oversight. **No statewide docket numbering scheme.**
Each LEA assigns its own ID.

**Citation form:**

```
CalRecycle, Notice and Order (Smith Landfill, Mar. 2022) (issued by
   Riverside Co. LEA).
14 Cal. Code Regs. § 18304 (LEA enforcement authority).
```

**Current eyecite-ts handling:** Not tokenized. References are site-name
+ date.

**Recommended action:** No new pattern.

---

### 19. California Native American Heritage Commission (NAHC)

**Order types:** NAHC is a 9-member appointed commission (created 1976 by
Pub. Res. Code § 5097.91 et seq.) tasked with:
- Identifying Most Likely Descendants (MLD) when Native American remains
  are discovered (Health & Saf. Code § 7050.5);
- Adjudicating disputes under CalNAGPRA (Health & Saf. Code §§ 8010 et
  seq., the Calif. Native American Graves Protection and Repatriation Act).

NAHC determinations are issued as **Commission decisions / orders** but
**do not carry a public docket number** in the way water board or CCC
orders do. They are referenced by:

```
NAHC, MLD Determination for [Site Name] (Date).
NAHC, Sacred Sites Listing.
NAHC, CalNAGPRA Determination, [Tribe Name] v. [Museum] (Date).
```

**Citation form:** Title + date + parties (if any). No numeric identifier.

**Statutory anchors:**
- Pub. Res. Code § 5097 — already covered (`PRC`)
- Health & Saf. Code § 7050.5 / § 8010 — already covered (`HSC`)

**Current eyecite-ts handling:** Not citation-shaped beyond the statute
references.

**Recommended action:** No new pattern.

---

### 20. Office of Administrative Hearings (OAH) — Cross-Agency

Many of the agencies above route their hearings through **OAH**
(Government Code § 11370 et seq.). OAH issues:

| Type | Numbering |
|------|-----------|
| Proposed Decision | `OAH No. NNNNNNNNNN` (10-digit case number) |
| Final Decision | inherits same `OAH No.` |
| Reconsidered Final | `OAH No. NNNNNNNNNN.1` (appended `.1`) |

**Citation form:**

```
In the Matter of XYZ Inc., OAH No. 2023050123 (Final Decision, Dec. 1, 2023).
```

The leading 4 digits are the year of filing; the remaining 6 are sequential
within the year.

**Current eyecite-ts handling:** Generic 10-digit number; not tokenized.

**Recommended action:**

- **Priority 4 (low)**: Add an `oah-decision` pattern co-located with the
  agency-letter family above.

**Proposed regex:**

```typescript
// OAH case number: "OAH No. 2023050123" (10 digits, optional ".1" rehearing suffix)
{
  id: "oah-decision",
  regex: /\bOAH\s+No\.\s+(\d{10})(?:\.(\d))?\b/g,
  description: 'Office of Administrative Hearings (Cal.) case number',
  type: "agencyOrder",
}
```

---

## Cross-Cutting Patterns

### Agency Designators

Every California agency uses a `Comm'n` or `Dep't` or `Bd.` designator.
All required stems are already in the existing abbreviation set:

| Agency token | Stem(s) needed | Status |
|--------------|----------------|--------|
| `Cal. Coastal Comm'n` | `cal`, `commn` | ✓ |
| `State Water Resources Control Bd.` / `SWRCB` | `bd`, `resour` | ✓ for `bd`; `resour` covered via word splitting |
| `Reg'l Water Quality Control Bd.` | `regl`, `bd` | ✓ |
| `Dep't of Toxic Substances Control` / `DTSC` | `dept` | ✓ |
| `Dep't of Health Care Servs.` / `DHCS` | `dept`, `serv` | ✓ |
| `Dep't of Soc. Servs.` / `CDSS` | `dept`, `soc`, `serv` | ✓ |
| `Dep't of Motor Vehicles` / `DMV` | `dept` | ✓ |
| `Dep't of Real Estate` / `DRE` | `dept` | ✓ |
| `Cal. Energy Comm'n` / `CEC` | `cal`, `commn` | ✓ |
| `CalRecycle` | (single token) | ✓ (no period) |
| `Office of Planning and Research` / `OPR` | (single token) | ✓ |
| `Native American Heritage Comm'n` / `NAHC` | `commn` | ✓ |
| `Local Agency Formation Comm'n` / `LAFCO` | `commn` | ✓ |
| `Gambling Control Comm'n` / `CGCC` | `commn` | ✓ |
| `Office of Administrative Hearings` / `OAH` | (single token) | ✓ |

**Conclusion:** All agency designator abbreviations work with the existing
stem set. No new stems required.

### CEQA Guidelines and Title 14 CCR Cross-References

CEQA case briefs frequently shift between:

```
Pub. Res. Code § 21000        ← parsed as statute (PRC) ✓
14 Cal. Code Regs. § 15064    ← parsed as state regulation; format works
CEQA Guidelines, § 15064(b)   ← NOT parsed; needs new pattern
Guidelines § 15064            ← NOT parsed; needs new pattern
CEQA § 15064                  ← NOT parsed; rare but seen
```

Recommended (Priority 4):

```typescript
{
  id: "ceqa-guidelines-short",
  regex: /\b(?:CEQA\s+Guidelines|Guidelines)\s*,?\s*§§?\s*(\d+(?:\.\d+)?(?:\([^)]*\))*(?:\s*et\s+seq\.?)?)/g,
  description: 'CEQA Guidelines short-form section reference (resolves to 14 CCR § <body>)',
  type: "statute",
}
```

### State Clearinghouse (SCH) Numbers

SCH numbers identify environmental review records on CEQAnet. They appear
in CEQA opinions when discussing the administrative record:

```
The City of San Diego's Final EIR (SCH No. 2021080123) ...
The Project (SCH No. 2019019004) ...
SCH# 2024050056
```

**Format:** 8 digits (pre-2000: `YYNNMMNN` for 1990–1999) or 10 digits
(post-2000: `YYYYMMNNNN`). Always preceded by `SCH No.`, `SCH#`, or
`State Clearinghouse No.`.

**Current eyecite-ts handling:** Not tokenized.

**Recommended action:**

- **Priority 3 (medium-low)**: Add an SCH pattern. It is a project-level
  identifier rather than a citation, but it is the canonical link to the
  full administrative record on CEQAnet:

```typescript
{
  id: "ceqa-sch",
  regex: /\b(?:SCH\s*(?:No\.)?#?|State\s+Clearinghouse\s+(?:No\.)?#?)\s*(\d{8}|\d{10})\b/g,
  description: 'CEQA State Clearinghouse project number (links to CEQAnet)',
  type: "agencyOrder",   // or new "projectId" type
}
```

---

## Recommended Action Punch List

Ordered by impact / cost ratio.

### Priority 1 — No-op (verify only)

- **Confirm** that all known-code lookups for `PRC` (Pub. Res. Code), `WAT`
  (Wat. Code), `HSC` (Health & Saf. Code), `CIV` (Civ. Code), `GOV` (Gov.
  Code), `CCP` (Civ. Proc.), `VEH` (Veh. Code), `WIC` (Welf. & Inst. Code),
  `LAB`, `FIN`, `INS`, `EVID`, `PEN` work correctly in real CEQA / Coastal
  Act / SB 800 / DTSC / Davis-Stirling / Subdivision Map Act case-law
  corpora. They are coded; confirm by adding integration tests.

### Priority 2 — Add MPP §

Add a tokenizer for `MPP § XX-YYY.Z` (CDSS Manual of Policies and
Procedures), routing to a statute citation with `jurisdiction: "CA"`,
`code: "MPP"`. Update `knownCodes.ts` to include an `MPP` entry:

```typescript
{
  jurisdiction: "CA",
  abbreviation: "MPP",
  family: "abbreviated",
  patterns: ["MPP", "Manual of Policies and Procedures", "Manual of Policies & Procedures"],
}
```

This is the only meaningful statutory addition in this entire research
scope. The MPP is the operative regulation for the bulk of CDSS state-
hearing practice (CalWORKs, CalFresh, IHSS, Medi-Cal beneficiary appeals).

### Priority 3 — Add SCH No.

Add the State Clearinghouse number recognizer. Single regex, single
extractor. No new code lookups. Type can be a new `projectId` or reuse the
`agencyOrder` placeholder type if introduced.

### Priority 4 — Defer (agency order family)

Introduce a new `agencyOrder` citation type covering:

- CCC appeal numbers (`A-D-LLL-YY-NNNN`, `CDP No. N-YY-NNNN`)
- SWRCB orders (`WR YYYY-NNNN`, `WQO YYYY-NNNN-DWQ`)
- RWQCB orders (`RX-YYYY-NNNN`)
- CEC dockets (`YY-AFC-NN`, etc.)
- DHCS/CDSS letters (`APL YY-NNN`, `ACL YY-NN`)
- OAH decisions (`OAH No. NNNNNNNNNN`)
- CGCC matter numbers (`CGCC-YYYY-MMDD-N`)

This is **roughly 8 new regex patterns** plus a new type-system entry. Each
is low-risk individually but together they introduce a large surface area
that should be driven by actual downstream consumer demand, not speculation.
Defer until a concrete downstream user (e.g., a state-agency case manager
frontend) requests linking of these identifiers.

### Priority 5 — Decline

- **DTSC, NAHC, CalRecycle, DRE, DMV, LAFCO, JPA, OPR** orders/letters:
  No formal numeric docket scheme that survives across the agency, or
  references that are title-and-date based and not citation-shaped. No
  meaningful regex addition possible. Statutory anchors are already
  covered.
- **CEQA Guidelines short-form** (`Guidelines § 15064`): The fully-
  qualified `Pub. Res. Code` / `14 CCR` forms appear in nearly all
  serious CEQA briefs alongside any short-form Guidelines reference.
  Adding the short form catches a small marginal corpus at cost of
  potential false positives against any other use of the word
  "Guidelines."

---

## Confidence and Coverage Notes

**High confidence** (verified against published agency / case examples):
- SWRCB Water Rights Order format `WR YYYY-NNNN` and Water Quality Order
  `WQO YYYY-NNNN-DWQ`.
- RWQCB regional format `RX-YYYY-NNNN`.
- CCC appeal format `A-D-LLL-YY-NNNN` and CDP format `N-YY-NNNN`.
- DHCS APL format `APL YY-NNN`.
- CGCC matter format `CGCC-YYYY-MMDD-N`.
- CEC docket format `YY-PRG-NN`.
- SCH project number `NNNNNNNN` or `NNNNNNNNNN`.
- All Cal.App.Nth / Cal.Nth / Cal.App.Supp. case captions in the scope are
  standard CSM/Bluebook forms already handled.

**Medium confidence:**
- DTSC ENF and ISE order numbering (no consistent public docket scheme
  observed; usually site-name based).
- LAFCO resolution numbering (varies by county; not statewide).
- DRE disciplinary case number format (`H-NNNNN [LL]` observed in some
  sources but not verified across full corpus).
- OAH `.1` rehearing suffix convention.

**Low confidence (untested by this research):**
- Charter-city ordinance citation conventions (varies city by city; no
  uniform format).
- Whether CDSS state-hearing decision numbers are ever publicly cited
  (this research found no public docket; they appear to be internal).

---

## Sources

- California Coastal Commission, Appeal Information Sheet:
  https://documents.coastal.ca.gov/assets/cdp/Appeal-Information-Sheet.pdf
- California Coastal Commission, CDP Appeal Process:
  https://documents.coastal.ca.gov/assets/cdp/appeals-faq.pdf
- California Coastal Commission, Final Local Action Notices:
  https://www.coastal.ca.gov/lcp/final-local-action-notices/
- California Coastal Commission, Enforcement Program:
  https://www.coastal.ca.gov/enforcement/
- CCC staff report example (F19a-5-2022 substantial issue determination):
  https://documents.coastal.ca.gov/reports/2022/5/F19a/f19a-5-2022-report.pdf
- State Water Resources Control Board, Adopted Orders:
  https://www.waterboards.ca.gov/board_decisions/adopted_orders/
- SWRCB Water Rights Decisions, Orders and Judgments:
  https://www.waterboards.ca.gov/waterrights/board_decisions/adopted_orders/
- SWRCB Water Quality Order Example WQO 2013-0001-DWQ:
  https://www.waterboards.ca.gov/board_decisions/adopted_orders/water_quality/2013/wqo2013_0001dwq.pdf
- SWRCB Order WR 2008-0015:
  https://www.waterboards.ca.gov/waterrights/board_decisions/adopted_orders/orders/2008/wro2008_0015.pdf
- SWRCB Cease and Desist Order practice:
  https://www.waterboards.ca.gov/waterrights/water_issues/programs/enforcement/compliance/cease_desist_actions/
- Central Valley RWQCB Order example R5-2025-0506:
  https://www.waterboards.ca.gov/rwqcb5/board_decisions/adopted_orders/yuba/r5-2025-0506_stip.pdf
- Active ACL Complaints (San Diego RWQCB):
  https://www.waterboards.ca.gov/sandiego/water_issues/programs/compliance/acl_complaints.html
- Department of Toxic Substances Control, Berkeley-Auto ISE Order:
  https://dtsc.ca.gov/wp-content/uploads/sites/31/2017/11/Berkeley-Auto_ENF_ISE.pdf
- DTSC Imminent and Substantial Endangerment Policy:
  https://dtsc.ca.gov/wp-content/uploads/sites/31/2018/07/eo-93-009-pp.pdf
- DTSC Ascon Landfill RAO:
  https://dtsc.ca.gov/wp-content/uploads/sites/31/2017/11/Ascon_ENF_RAO.pdf
- DHCS All Plan Letters listing:
  https://www.dhcs.ca.gov/formsandpubs/Pages/AllPlanLetters.aspx
- DHCS Managed Care APL & PL Subject Listing:
  https://www.dhcs.ca.gov/formsandpubs/Pages/MgdCareAPLPLSubjectListing.aspx
- DHCS APL 25-002 example:
  https://www.dhcs.ca.gov/formsandpubs/Documents/MMCDAPLsandPolicyLetters/APL%202025/APL25-002.pdf
- CDSS State Hearings:
  https://www.cdss.ca.gov/inforesources/state-hearings
- CDSS Regulations (Manual of Policies and Procedures, Division 22):
  https://www.cdss.ca.gov/ord/entres/getinfo/pdf/4cfcman.pdf
- California Energy Commission Dockets:
  https://www.energy.ca.gov/proceedings/dockets/california-energy-commission-dockets
- CEC Docket 16-RPS-01 (RPS Eligibility Guidebook 9th Ed.):
  https://efiling.energy.ca.gov/getdocument.aspx?tn=217317
- CEC Docket Log 17-HYD-01:
  https://efiling.energy.ca.gov/Lists/DocketLog.aspx?docketnumber=17-HYD-01
- California Gambling Control Commission CGCC-2022-0512-7 example:
  https://www.cgcc.ca.gov/documents/adminactions/decision/GEKE-002616_decision.pdf
- CGCC Compacts page:
  https://www.cgcc.ca.gov/?pageID=compacts
- Cal. Dep't of Real Estate, Disciplinary Actions:
  https://dre.ca.gov/Licensees/DisciplinaryActions.html
- CalRecycle Enforcement Orders:
  https://www2.calrecycle.ca.gov/Docs/EnforcementOrder/
- CalRecycle Notice and Order Toolkit:
  https://calrecycle.ca.gov/SWFacilities/Enforcement/NoticeOrder/
- California Native American Heritage Commission:
  https://nahc.ca.gov/
- Office of Land Use and Climate Innovation (formerly OPR), CEQA Technical
  Advisories:
  https://lci.ca.gov/ceqa/technical-advisories.html
- LCI / OPR CEQA Guidelines:
  https://lci.ca.gov/ceqa/guidelines/
- State Clearinghouse / CEQAnet:
  https://ceqanet.lci.ca.gov/
- State Clearinghouse Handbook 2021:
  https://lci.ca.gov/sch/docs/20210820-SCH_Handbook_2021.pdf
- DMV Administrative Per Se DS-367 background:
  https://www.shouselaw.com/ca/defense/dmv-hearing/admin-per-se/
- DMV APS DS-367 description (dmv-defenders):
  https://www.dmv-defenders.com/ds-367-dmv-administrative-hearing/
- California Office of Administrative Hearings:
  https://www.dgs.ca.gov/OAH
- OAH DDS Decisions search/format notes:
  https://www.dgs.ca.gov/OAH/Case-Types/General-Jurisdiction/Resources/Information-for-Searching-DDS-Decisions
- Government Code § 66410 (Subdivision Map Act):
  https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=66410
- SB 800 / Right to Repair Act (Civ. Code §§ 895–945.5):
  https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=200120020SB800
- Davis-Stirling Common Interest Development Act:
  https://www.davis-stirling.com/HOME/Statutes/Davis-Stirling-Act-Civil-Codes
- Code Civ. Proc. § 1161 (Unlawful Detainer):
  https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1161
- Eyecite-ts CA Style Manual research (companion document):
  /Users/medelman/Projects/OSS/eyecite-ts/docs/research/2026-05-10-citation-abbrevs-ca.md
- Eyecite-ts `src/patterns/casePatterns.ts`, `src/patterns/neutralPatterns.ts`,
  `src/extract/extractNeutral.ts`, `src/data/knownCodes.ts`,
  `src/data/stateStatutes.ts` (current implementation reviewed during this
  research).
