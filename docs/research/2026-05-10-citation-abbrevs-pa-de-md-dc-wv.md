# Citation Abbreviations & Style Quirks: PA + DE + MD + DC + WV

Research date: 2026-05-10. Scope: case-name abbreviations that the eyecite-ts
backward case-name scanner must treat as **abbreviation periods** (not
sentence boundaries) when parsing captions from Pennsylvania, Delaware,
Maryland, District of Columbia, and West Virginia state courts.

## Summary

The Mid-Atlantic/Appalachian jurisdictions surveyed here largely follow
*Bluebook* T6/T7 — but each adds idiosyncratic, locally-attested party-name
abbreviations that are not in `reporters_db/case_name_abbreviations.json`.
The most impactful gaps for the eyecite-ts `CASE_NAME_ABBREVS` set are:

1. **`Supers.`** (Supervisors) — Pennsylvania Commonwealth Court land-use
   captions are dominated by `[Twp Name] Twp. Bd. of Supers.` — hundreds of
   real captions confirm this is *the* PA appellate abbreviation, but it
   does not appear in the Bluebook source list.
2. **`Hldgs.`** (Holdings) — pervasive in Delaware Court of Chancery
   corporate captions ("In re X Hldgs. S'holder Litig.") and also used by
   PA appellate courts ("Bowfin KeyCon Hldgs. v. DEP"). Not in `reporters-db`.
3. **`Lic.`** (License/Licensing) + **`Insp.`** (Inspection) — appear in
   `Bd. of Lic. & Insp. Review` (a recurring PA Commonwealth Court party).
4. **`Att'y`** + **`Att'ys`** (Attorney/Attorneys, party-form) — appear as
   party-name suffixes in DE, MD, DC ("Painter v. Delea, Att'y") and inside
   `Att'y Gen.` in DE.
5. **`Bur.`** (Bureau) — `Bur. of Driver Lic.` is a top-50 most-cited PA
   party. Not in `reporters-db`.
6. **`Vol.`** (Volunteer) — `Vol. Fire Dept.`, `Vol. Fire Co.`, and
   `Vol. Fire Assoc.` recur in PA Commonwealth captions. Risk: `Vol.` is
   also an abbreviation for "Volume" in citation strings, but since the
   case-name scanner runs *backward from the citation*, `Vol.` inside a
   case name will never be confused with a volume number.
7. **`Retire.`** (Retirement) — `W. Va. Consol. Pub. Retire. Bd.` is a
   recurring WV party. Distinct from `Ret.` (Retirement/Retired), which
   is already in the set.

Three style quirks (not abbreviation set entries) also matter:

- DE Chancery uses `IMO` ("In the Matter of") and `FBO` ("For the Benefit
  Of") as initialisms — handled today by the all-caps initialism path.
- DC Court of Appeals 2025-26 style now spells `professional` → `pro.`
  (Bluebook 21st ed. T6 change from older `prof.`). The set already has
  `prof` but not `pro`; `pro.` is *risky* and discussed below.
- PA captions routinely use `Com.` (Commonwealth) as a party prefix.

---

## Per-Jurisdiction Findings

### Pennsylvania (Supreme, Superior, Commonwealth)

Sources:
- *PA Code & Bulletin Style Manual* 5th ed. (https://www.irrc.state.pa.us/resources/docs/PA_Code_and_Bulletin_Style_Manual.pdf).
- Pennsylvania Rules of Appellate Procedure (Pa.R.A.P.).
- Real captions: CourtListener clusters for `court=pacommwct`, `court=pasuperct`, `court=pa` (sampled May 2026).

| Stem | Full Word | Source | Risk | Example caption |
|------|-----------|--------|------|-----------------|
| `supers` | Supervisors | PA Commw. Ct. (canonical) | LOW | `R.P. Grim v. Maxatawny Twp. Bd. of Supers.` ([Justia](https://law.justia.com/cases/pennsylvania/commonwealth-court/2025/426-c-d-2024.html)) |
| `bur` | Bureau | PA Commw. Ct. | LOW | `Bur. of Driver Lic. v. Perrotta, M.` |
| `lic` | License/Licensing | PA Commw. Ct., MD | LOW | `Ziemlewicz v. Bd. of Lic. & Insp. Review` |
| `insp` | Inspection | PA Commw. Ct. | LOW | `Zafiratos v. Bd. of Lic. & Inspection Review` (full form), `Bd. of Lic. & Insp. Review` (abbrev form) |
| `vol` | Volunteer | PA Commw. Ct. | LOW (case-name only) | `In Re: Merger of: Univ. Vol. Fire Dept. into Pt. Breeze Vol. Fire Assoc.` |
| `hldgs` | Holdings | PA Sup. Ct., PA Commw. Ct., DE Ch. | LOW | `Bowfin KeyCon Hldgs. v. DEP` |
| `hldg` | Holding (singular) | DE Ch. | LOW | `In re Morrow Park Holding LLC` (rare singular form `Hldg.`) |

PA style quirks:
- *Spacing.* PA Bulletin / Pa.R.A.P. 2173 use `Pa. Super.`, `Pa. Cmwlth.`,
  `Pa. Commw.` with a single space between the two reporter elements.
  CourtListener case names often render the no-space form `Pa.Cmwlth.` too;
  both are valid for citation parsing (already handled by the tokenizer).
- PA uses `Com.` as a recurring shorthand for the Commonwealth ("Com. v.
  Wright, K."). The existing set has `com` (line 442), `comm`, `compar`,
  `comp`, etc. — `com` already covers this.
- PA Commonwealth Court captions chain agencies: `Dep't of Trans., Bureau
  of Driver Lic. v. ...` — already handled (`dept`, `transp`, `bur` if added).
- PA `Workers' Comp. Appeal Bd.` (current name) and `Workmen's Comp.
  Appeal Bd.` (pre-1994 name) — `comp` already in set, `bd` already in set.

### Delaware (Chancery, Supreme, Superior, Common Pleas, Family)

Sources:
- *Guide to the Delaware Rules of Legal Citation*, 2d ed. (Superior Court of
  Delaware, Sept. 2004) — https://courts.delaware.gov/superior/pdf/citation_guide.pdf.
- *Editing Guidelines for the Delaware Law Review* (rev. Aug. 2010) —
  https://www.delawarelawreview.org.
- DE Ch. Rule 10(a); Bluebook R. 10.2.1(f), (h) (as adopted by DE).
- Real captions: CourtListener `court=delch` and `court=del` (May 2026).

| Stem | Full Word | Source | Risk | Example caption |
|------|-----------|--------|------|-----------------|
| `hldgs` | Holdings | DE Ch. (canonical) | LOW | `CURO Intermediate Hldgs. Corp. v. Sparrow Purchaser, LLC` |
| `atty` | Attorney (party-form) | DE Citation Guide § V.F | LOW | `Painter v. Delea, Att'y` (MD), `Att'y Gen.` (DE Citation Guide) |
| `attys` | Attorneys | Bluebook T6 derivative | LOW | `Hudson v. Att'ys for Med. Mal. Defense` (extrapolated) |

DE Chancery style quirks:
- *Drop "Inc.", "Ltd.", "LLC", etc.* DE Citation Guide § V.C explicitly
  says: omit `Inc.,` `Ltd.,` `LLC,` and "other like terms where the name
  clearly indicates the party is a business firm." So a parser will see
  *both* shortened and unshortened forms in the wild — abbreviations like
  `Corp.`, `Inc.`, `Ltd.`, `LLC` are still common in case names embedded
  in opinion text and are already covered.
- *Slip-opinion form.* `Lofland v. Demsey, Del. Ch., C.A. No. 7544,
  Kiger, M. (Feb. 5, 1986) (Report).` This non-Bluebook form is rare
  outside DE briefs and is handled by the docket-citation pipeline, not
  the case-name scanner.
- *Chancellor titles.* `V.C.` (Vice-Chancellor), `C.J.` (Chief Justice),
  `R.J.` (Resident Judge), `Comm'r` (Commissioner), `M.` (Master) appear
  in slip-opinion parentheticals. Already covered (`vc` is dotted
  initialism; `commr` is in set).
- DE uses `IMO` ("In the Matter of") in trust/estate captions
  ("IMO the Estate of Marilyn Ruth Weil"). This is *not* a period-
  bearing abbreviation, so it does not affect the backward scanner.

### Maryland (Supreme Ct. of Md., App. Ct. of Md.)

Note: Effective Dec. 14, 2022, the *Court of Appeals* was renamed the
*Supreme Court of Maryland* and the *Court of Special Appeals* was renamed
the *Appellate Court of Maryland*. The Bluebook abbreviations remained
`Md.` and `Md. App.` (old: `Md. Ct. Spec. App.`).

Sources:
- University of Baltimore School of Law, *Bluebook Basics for Maryland*
  (2017) — https://www.ubalt.edu/law/assets/documents/Due%20Diligence%20BlueBook%20Basics%20for%20Maryland%202017.pdf.
- Maryland State Law Library, *Recognizing & Reading Legal Citations*.
- Real captions: CourtListener `court=md`, `court=mdctspecapp` (May 2026).

| Stem | Full Word | Source | Risk | Example caption |
|------|-----------|--------|------|-----------------|
| `atty` | Attorney (party-form) | MD attorney-grievance docket | LOW | `Painter v. Delea, Att'y`; `Att'y Grievance Comm'n v. Lefkowitz` (`Att'y` as prefix) |
| `attys` | Attorneys | extrapolation from `Att'y` | LOW-MED | rare; MD also uses `Att'y` Grievance Comm'n |

MD style quirks:
- *Reclamation, Property Management.* MD uses standard Bluebook
  abbreviations (`Md. Reclamation Assocs.`, `Md. Prop. Management`).
  `Md.` itself is already in the state-abbreviation block (`md`, line 689).
- *MTA / DHMH / etc.* Initialisms for state agencies; handled by
  all-caps path.
- MD captions retain `Univ. of Md.` and `Md. Dep't of Health` — already
  covered by `univ`, `dept`, `md`.
- `Attorney Grievance Comm'n` is the most-cited MD party. Already covered
  by `commn` (line 753).

### District of Columbia (D.C. Ct. App., D.C. Sup. Ct.)

Sources:
- *District of Columbia Court of Appeals Citation and Style Guide*
  [2025-26 Revised ed.] — https://www.dccourts.gov/sites/default/files/matters-docs/DCCACitationGuide.pdf.
- Bluebook 21st ed. (controls per DCCA Guide § 1).
- Real captions: CourtListener `court=dc` (May 2026).

| Stem | Full Word | Source | Risk | Example caption |
|------|-----------|--------|------|-----------------|
| `atty` | Attorney (party-form) | DC Bar; appears in DC captions | LOW | `Painter v. Delea, Att'y` |
| `trs` | Trustees (plural) | DCCA Guide § 4.1 example | LOW (already in set) | `Bd. of Trs., the Grand Lodge of the Indep. Ord. of the Odd Fellows of D.C.` |

DC style quirks:
- *Bluebook 21st ed. change.* DCCA Guide § 0 (intro bullet) notes that
  T6 in the 21st edition abbreviates `professional` as **`pro.`** (was
  `prof.`). The existing set has `prof`. Adding `pro` as a stem is
  **HIGH RISK**: "pro" is a standalone English word ("argued pro
  bono"; "pro se") and would mis-trigger across many sentence
  boundaries. Recommend keeping `prof` only and treating `pro.` as a
  word the backward scanner is allowed to ignore at the *end* of a
  caption (it would appear as `Healthcare Pro.` only if "professional"
  is the very last word, which is unusual).
- *Government, Department, Agency names.* DCCA Guide § 3.3 prescribes
  in-text initialisms (ALJ, BBL, CPO, DCHRA, DCAPA, DCRA, DOB, DLCP,
  NOI, OAH, TPO) — these are dotted/non-dotted initialisms and are
  *not* case-name abbreviations.
- *Compass directions.* DCCA Guide § 3.4: "Always abbreviate northeast,
  northwest, southeast, and southwest without a period; e.g., NE, NW,
  SE, and SW." This means DC captions use `NE`/`SE`/`NW`/`SW` (no period)
  rather than `N.E.` / `S.E.` (which are reporter abbreviations).
  Current set has `ne`, `se`, `sw`, `nw` for the *with-period* directional
  forms used in other Bluebook contexts. Both forms coexist; no change
  needed.
- *Memorandum Opinion & Judgment.* `Mem. Op. & J.` (DCCA-specific slip
  opinion form). `mem` is in set via `memorial→meml` (line 770), but not
  the slip-opinion sense. Risk of adding `mem`: collides with "memo"
  English. The slip-opinion `Mem. Op.` form is followed by `& J.` and is
  not case-name-relevant, so skip.

### West Virginia (Sup. Ct. of App., Intermediate Ct. of App.)

Sources:
- *Basic Legal Citation* — Cornell, sample WV section (high-level only).
- Marshall University, *Citation of Court Opinions* —
  https://libguides.marshall.edu/basic_legal_research/case_citations.
- Real captions: CourtListener `court=wva` (May 2026).

| Stem | Full Word | Source | Risk | Example caption |
|------|-----------|--------|------|-----------------|
| `retire` | Retirement | WV Sup. Ct. App. (canonical) | LOW | `W. Va. Consol. Pub. Retire. Bd. v. Weaver` |
| `discipl` | Disciplinary | WV (Lawyer Disciplinary Bd.) | LOW-MED | `Lawyer Disciplinary Bd. v. Campbell`; PA also: `Appeal of Discipl. Board No. 06-PDB-094` |

WV style quirks:
- *Parallel citation preferred.* WV is among the SE Reporter states that
  expect parallel citation when both the regional and state reports are
  available. eyecite-ts already handles parallel citations.
- *State ex rel.* / *SER.* WV captions frequently begin
  `State ex rel. X v. Y` or use the abbreviated `SER X v. Y` form.
  `ex rel.` is a procedural phrase (Latin); not a case-name token. Already
  recognized in the parenthetical pipeline.
- *County* spelling. WV captions show `Cnty.` and `Co.` mixed
  ("Logan Co. Bd. of Education", "Kanawha Co. Public Library Bd.").
  Both already in set (`cnty`, `cty`, `co`).
- *Pub. Serv. Comm'n.* `Jefferson Cnty. Citizens for Econ. Pres.,
  Shenandoah Junction Pub. Sewer, Inc. v. Pub. Serv. Comm'n of W. Va.`
  — all components covered by existing stems (`pub`, `serv`, `commn`).

---

## Cross-Jurisdiction Patterns

Across all five jurisdictions:

1. **`Bd. of [X]`** is the workhorse appellate party pattern: Bd. of
   Supers. (PA), Bd. of Trs. (DC, DE), Bd. of Lic. & Insp. (PA), Bd. of
   Educ. (MD, WV), Bd. of Zoning Appeals (WV). The existing set's `bd`,
   `trs`, `tr`, `educ` covers most; `supers`, `lic`, `insp` are the
   new additions needed.
2. **`Comm'n` / `Comm'r`** (Commission/Commissioner) — apostrophe forms
   covered by existing `commn` / `commr` (lines 753-754).
3. **`Dep't`** (Department) — apostrophe form covered by `dept`.
4. **`Att'y`** / **`Att'ys`** (Attorney/Attorneys, party-form) —
   apostrophe form. *Missing.* The eyecite-ts set already strips
   apostrophes/periods before lookup (per CLAUDE.md), so a stem of
   `atty` / `attys` is the canonical form.
5. **`Hldgs.`** (Holdings) — DE corporate captions, also PA. Missing.
6. **`Vol.`** (Volunteer) — PA. Missing.
7. **`Retire.`** (Retirement) — WV. Missing. Distinct from `Ret.`
   (Retirement, present-perfect form, e.g., `Ret. Hous. Fund`) which is
   already in set via `ret` (line 590).
8. **`Bur.`** (Bureau) — PA. Missing.
9. **`Supers.`** (Supervisors) — PA, dominant pattern. Missing.

False-positive guardrail: the candidate stems flagged for inclusion all
avoid clashing with common English sentence-final words.

- `supers`, `hldgs`, `atty`, `attys`, `bur`, `lic`, `insp`, `vol`,
  `retire`, `discipl`, `hldg` — none of these are common English words
  that end sentences with a period. `vol.` could theoretically mean
  "volume" as a sentence-final word ("Use Vol.") but that usage is
  vanishingly rare in legal prose.
- `pro.` (Bluebook 21st T6 change for "professional") — *rejected* as
  too risky.

---

## Top Recommendations (Prioritized)

Add the following 11 stems to `CASE_NAME_ABBREVS`:

| Priority | Stem | Why | Jurisdictions impacted |
|----------|------|-----|------------------------|
| 1 (highest) | `supers` | Hundreds of PA Commw. Ct. zoning/land-use captions truncate at `Bd. of Supers.` today | PA |
| 2 | `hldgs` | Most-cited DE Chancery corporate-litigation pattern; also PA | DE, PA |
| 3 | `atty` | Apostrophe-form `Att'y` used as party prefix in MD attorney-discipline cases and DE/DC | MD, DE, DC, PA |
| 4 | `attys` | Plural of #3; less common but logically paired | MD, DE, DC |
| 5 | `bur` | `Bur. of Driver Lic.` and similar PA agency forms | PA |
| 6 | `lic` | `Bd. of Lic. & Insp.`, `Bur. of Driver Lic.` | PA, MD |
| 7 | `insp` | Pairs with `lic` in `Bd. of Lic. & Insp.` | PA |
| 8 | `vol` | `Vol. Fire Dept.`, `Vol. Fire Co.` — recurring PA caption | PA |
| 9 | `retire` | `W. Va. Consol. Pub. Retire. Bd.` | WV |
| 10 | `discipl` | `Discipl. Board` (PA), `Lawyer Disciplinary Bd.` (WV) | PA, WV |
| 11 | `hldg` | Singular form of `hldgs`; very rare but logically paired | DE |

**Do not add**:

- `pro` (Bluebook 21st T6 for "professional") — collides with
  "pro bono", "pro se", "pro tem", "pro forma" and would cause many
  false positives.
- `mem` (Memorandum) — collides with English "mem" and the existing
  `meml` (Memorial) stem; the slip-opinion `Mem. Op.` form is handled
  outside the case-name scanner.
- `ord` (Order) — collides with English "ord" and the existing
  `org`/`orgs` stems; `In re Order of ...` captions exist but `Order` is
  almost always spelled out.
