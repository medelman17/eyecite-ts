# Procedural Prefix Case-Caption Forms: Criminal Procedural, Habeas Corpus, Extraordinary Writs, and Extradition

> Date: 2026-05-11
> Scope: Procedural-prefix case captions used in criminal-procedural, habeas-corpus, extraordinary-writ, grand-jury, surveillance/FISA, and extradition proceedings. Companion to `PROCEDURAL_PREFIX_REGEX` and the `proceduralPrefixes` array in `src/extract/extractCase.ts`.
> Audience: eyecite-ts maintainers extending procedural-prefix coverage beyond the 16 forms shipped as of 2026-05-11.

## Summary

The existing 16-prefix list focuses on civil, probate, family, and ex-rel forms. The criminal-side caption universe is dominated by a much smaller core of canonical forms (`In re`, `Ex parte`, `Matter of`, `In the Matter of`) followed by a **subject-descriptor noun phrase** rather than a party name. That structural shift — caption topic instead of party — is the central difference and the source of nearly all parsing ambiguity in this domain.

Three observations frame the recommendations:

1. **Most criminal/habeas captions already match an existing prefix** (`In re`, `Ex parte`, `Matter of`, or `In the Matter of`). The parser correctly identifies the prefix and then captures everything that follows up to the citation comma as the "subject." The real risk is *not* a missing prefix — it is that the captured subject may be a long descriptor (e.g., `Grand Jury Subpoena Duces Tecum Dated March 25, 2011`) that confuses downstream consumers expecting a clean party name.
2. **A small number of multi-word procedural phrases are sufficiently common in published reporters to warrant first-class prefix entries**, mainly to compete with the shorter `In re` so that the longer descriptor is captured atomically. Top candidates: `In re Extradition of`, `In re Application of`, `In the Matter of the Extradition of`, `In the Matter of the Application of`.
3. **A handful of subject-descriptor forms benefit more from documentation than from new regex prefixes**: `In re Grand Jury Subpoena`, `In re Grand Jury Investigation`, `In re Sealed Case`, `In re Search Warrant`, etc. These are valid captions, already covered by the bare `In re` prefix, and adding them as separate entries would only matter if eyecite-ts intends to classify *subject categories* (which is a separate feature, not a prefix-coverage issue).

The recommended action is therefore narrow: add four longer-form variants (`In re Extradition of`, `In re Application of`, `In the Matter of the Extradition of`, `In the Matter of the Application of`) and one specialty form (`People ex rel.` for NY-style habeas). All other criminal/habeas/extraordinary-writ forms covered in this report already resolve correctly through the existing `In re`, `Matter of`, `In the Matter of`, and `Ex parte` entries.

The remainder of this report enumerates each candidate, documents real-corpus examples, flags edge cases (including grand-jury-subject ambiguity and sealed-case redaction conventions), and prioritizes additions.

---

## Background: Why Criminal Captions Differ

Civil and probate caption forms (`Estate of X`, `Guardianship of X`, `In re Marriage of X and Y`) name a **legal status of a specific person or estate**. The procedural prefix is followed by an identifying party name, and the citation behaves like a normal `Party, vol Reporter page (Court Year)` pattern.

Criminal-procedural captions, by contrast, often have no human subject in the caption at all. They name the **proceeding itself**:

- `In re Grand Jury Subpoena` — the subpoena is the subject
- `In re Sealed Case` — the case is the subject, sealed for confidentiality
- `In re Search Warrant` — the warrant application is the subject
- `In re Investigative Subpoena re Homicide of Lance C. Morton` — the subpoena is the subject; a witness/victim name follows as a `re` clause

When a human is named, they are typically:

- **A petitioner whose detention is challenged** (`Ex parte Smith` in TX/AL habeas)
- **The fugitive in an extradition proceeding** (`In re Extradition of Kirby`)
- **An anonymous witness or subject** (`In re Doe`, `In re John Doe`, `In re Sealed Witness`)
- **A defendant whose subpoena/warrant is at issue** (`In re Subpoena to Witness Firm`)

For eyecite-ts, the upshot is that the parser cannot rely on the subject portion of a criminal caption looking like a party name. It must accept lowercase descriptors (`subpoena`, `application`, `warrant`, `extradition`, `petition`), trailing dates and docket-number-like strings (`Dated March 25, 2011`), and multi-clause subjects (`re Homicide of X`). The existing `PROCEDURAL_PREFIX_REGEX` second capture group `([A-Za-z0-9\s.,'&()/-]+?)` accepts all of these by virtue of its broad character class.

---

## 1. `In re Extradition of [Person]`

### Canonical and variant forms

- `In re Extradition of [Person]` — the dominant federal form post-1980
- `In re Requested Extradition of [Person]` — variant emphasizing the requesting state's role
- `In the Matter of the Extradition of [Person]` — Justice Manual sample caption; common in DOJ filings
- `In the Matter of the Requested Extradition of [Person]`
- `In re Matter of Extradition of [Person]` — occasional variant

### Jurisdictions

International extradition is exclusively a federal matter under 18 U.S.C. §§ 3181–3196. Cases are filed in U.S. district courts where the fugitive is found, and decisions are not directly appealable — challenge proceeds via habeas under 28 U.S.C. § 2241. Captions appear in:

- District court extradition orders (`F. Supp.`, `F. Supp. 2d`, `F. Supp. 3d`, slip opinions)
- Circuit court habeas appeals from extradition (`F.2d`, `F.3d`, `F.4th`)
- Occasionally Supreme Court decisions (older era — `Valentine v. United States ex rel. Neidecker`, 299 U.S. 5 (1936) — used `ex rel.` rather than `In re Extradition of`)

### Subject matter

Extradition certification proceedings under § 3184, including:

- Probable-cause findings
- Treaty applicability and dual-criminality analysis
- Specialty doctrine challenges
- Political-offense exceptions
- Humanitarian/rule-of-non-inquiry challenges

### Real corpus examples

| Caption | Citation | Court |
|---|---|---|
| In re Extradition of Robertson | No. 11-MJ-0310 KJN, 2012 WL 5199152 | E.D. Cal. 2012 |
| In re Requested Extradition of Kirby | 106 F.3d 855 | 9th Cir. 1996 |
| In re Doherty | 599 F. Supp. 270 | S.D.N.Y. 1984 |
| In the Matter of the Extradition of Atta | 706 F. Supp. 1032 | E.D.N.Y. 1989 |
| In re Extradition of Lin Hung-Sheng | 137 F. Supp. 2d 1167 | C.D. Cal. 2001 |

The Department of Justice's Justice Manual § 9-15.000 and the Federal Judicial Center's *International Extradition: A Guide for Judges* (Hedges, 2014) both reference `In the Matter of the Extradition of [Person]` as the preferred caption for the certification order.

### Edge cases

- **Compound names**: `In re Extradition of [First Middle Last]`, `In re Extradition of Lin Hung-Sheng` — multi-word names cross hyphens and the `[A-Za-z0-9\s.,'&()/-]+?` character class handles them fine.
- **Aliases inside the subject**: `In re Extradition of Smith, a/k/a Jones` — the inner comma might prematurely terminate the subject capture; this is the same risk that exists today for `Estate of Smith, also known as Jones`.
- **Treaty references after the name**: `In re Extradition of Smith (Treaty Extradition Request from Mexico)` — handled by the trailing parenthetical, not the prefix.
- **"Requested Extradition of"**: A small but non-negligible 9th Circuit pattern. Without an explicit longer variant, `In re` captures and the subject becomes `Requested Extradition of Kirby`, which is acceptable.

### Recommended priority

**High.** International extradition decisions are a meaningful share of federal habeas-adjacent caselaw, and `In re Extradition of` has a distinctive structure that benefits from atomic capture. Adding it as a multi-word prefix (longer than `In re`) ensures the captured subject is just the person's name. The variant `In the Matter of the Extradition of` is also worth adding because the DOJ-preferred form pattern is regularly cited in academic and judicial materials.

---

## 2. `In re Application of [Petitioner / United States]`

### Canonical and variant forms

- `In re Application of [Name]` — habeas-style and pre-1948 federal practice; surviving today in older state captions and electronic-surveillance applications
- `In the Matter of the Application of [Name]`
- `In re Application of the United States` — the dominant modern federal form for surveillance, pen register, stored-communications, and tower-dump orders
- `In re Application for [Order Type]` — variant where "for" follows "Application" (e.g., `In re Application for Pen Register and Trap/Trace Device`)
- `In re Application of the United States for an Order` — long-form invocation

### Jurisdictions

- **Federal magistrate / district**: Heavy use for surveillance-order applications under 18 U.S.C. §§ 2703, 3121–3127, and Title III wiretap orders.
- **FISC (Foreign Intelligence Surveillance Court)**: `In re Application of the FBI for an Order Requiring the Production of Tangible Things from [REDACTED]`, No. BR 06-05.
- **State (NY)**: `In re Application of [Name]` survives as an older habeas form. NY today more typically uses `People ex rel.` or `Matter of` for civil-side applications.
- **Older federal habeas (pre-1948)**: `In re Application of [Petitioner] for a Writ of Habeas Corpus`.

### Subject matter

- Electronic surveillance authorizations (pen register, Title III, § 2703(d))
- Stored Communications Act applications
- FISA business-records orders (Section 215)
- Older-form habeas petitions
- Material-witness warrant applications under 18 U.S.C. § 3144

### Real corpus examples

| Caption | Citation | Court |
|---|---|---|
| In re Application of the U.S. for Historical Cell Site Data | 724 F.3d 600 | 5th Cir. 2013 |
| In re Application for Pen Register and Trap/Trace Device with Cell Site Location Authority | 396 F. Supp. 2d 747 | S.D. Tex. 2005 |
| In re Application of the FBI for an Order Requiring the Production of Tangible Things from [REDACTED] | No. BR 06-05 | FISC May 24, 2006 |
| In re Application of U.S. for Material Witness Warrant | 213 F. Supp. 2d 287 | S.D.N.Y. 2002 |
| In re Order Authorizing Installation of Pen Register | 846 F. Supp. 1555 | M.D. Fla. 1994 |

### Edge cases

- **`Application of` is already covered**. The existing entry `Application of` matches captions where "In re" is absent (e.g., `Application of Smith, 100 F.2d 200 (2d Cir. 1939)`).
- **The longer `In re Application of` is *not* covered** as a single atomic prefix today — it matches the shorter `In re` and leaves `Application of [Name]` in the subject. That is acceptable for downstream consumers but loses the signal that this is an *application*-type proceeding versus a generic "In re" docket.
- **Government as applicant**: `In re Application of the United States` produces a subject starting with `the United States`. This is grammatically the *applicant*, not a party in an adversarial sense.
- **Long descriptive subjects**: `In re Application of the United States of America for an Order Authorizing the Use of a Pen Register and Trap and Trace Device on a Cellular Telephone` — these are long but parseable; the trailing comma before the citation terminates the subject correctly.

### Recommended priority

**Medium-high.** The longer `In re Application of` is worth adding so that the captured subject is just the applicant. Without it, eyecite-ts captures `Application of the United States` as the subject of an `In re` caption, which is semantically odd. The variant `In the Matter of the Application of` also appears frequently in federal magistrate filings.

---

## 3. `In re Habeas Corpus of [Petitioner]` / `In re Petition for Writ of Habeas Corpus`

### Canonical and variant forms

- `In re Habeas Corpus of [Person]` — relatively rare; appears in some older state cases
- `In re Petition for Writ of Habeas Corpus` — descriptor-style, sometimes without a name
- `In re Petition for Writ of Habeas Corpus by [Person]`
- `In re Application of [Person] for a Writ of Habeas Corpus` — older federal/state form

### Jurisdictions

- **Older federal practice (pre-1948 reorganization of habeas under § 2241/§ 2254/§ 2255)**: All four forms appear in U.S. and F.2d reports.
- **Modern state practice**: A handful of states (CA, IL, AL in certain procedural postures) use `In re [Petitioner]` for habeas without the explicit "Habeas Corpus" descriptor in the caption.
- **California**: Habeas petitions are routinely captioned `In re [Petitioner Name]` and cited as `In re Robbins (1998) 18 Cal.4th 770`. The "Habeas Corpus of" qualifier is unusual.
- **Alabama**: `Ex parte [Petitioner]. PETITION FOR WRIT OF HABEAS CORPUS (In re: State of Alabama vs. [Person])` — the full Alabama caption is a compound that the existing `Ex parte` prefix handles, with the "PETITION FOR WRIT OF HABEAS CORPUS" line typically dropped from the citation in practice.

### Subject matter

- State and federal post-conviction habeas
- Pre-trial habeas (TX Art. 11.07/11.071/11.09 writs, often captioned `Ex parte [Petitioner]`)
- Extradition-incident habeas (`In re [Fugitive]` after extradition certification)

### Real corpus examples

| Caption | Citation | Court |
|---|---|---|
| In re Robbins | 18 Cal.4th 770 | Cal. 1998 |
| In re Muszalski | 52 Cal.App.3d 500 | Cal. Ct. App. 1975 |
| In re White | 55 F. 54 | 2d Cir. 1893 |
| Ex parte Mable | 443 S.W.3d 129 | Tex. Crim. App. 2014 |
| Ex parte Warfield | 618 S.W.3d 69 | Tex. Crim. App. 2021 |
| Ex parte Stokes | 1070054 | Ala. 2008 |
| Ex parte Davis | 2130954 | Ala. Civ. App. 2014 |

### Edge cases

- **California habeas captioning**: California consistently drops "Habeas Corpus" from the caption — habeas decisions are cited as `In re [Petitioner]`, identical in form to non-habeas `In re` matters. Adding `In re Habeas Corpus of` as a separate prefix would not match these — they are already matched by `In re`.
- **Federal habeas under § 2241/§ 2254**: Modern federal habeas appears with both adversarial captions (`Smith v. Warden`) and `In re` captions (especially for second-or-successive petition gatekeeping under § 2244(b)(3)).
- **Compound TX/AL captions**: `Ex parte [Petitioner]` already handles TX and AL habeas. The trailing "PETITION FOR WRIT OF HABEAS CORPUS (In re: State of Alabama vs. X)" is generally normalized out before citation; if it appears in input text, the existing `Ex parte` prefix will capture only the petitioner name as the subject.

### Recommended priority

**Low to medium.** The pure form `In re Habeas Corpus of [Person]` is rare enough that adding it as a prefix would yield little benefit. The dominant modern habeas forms (`Ex parte Smith`, `In re Smith`) are already handled. Documenting the convention is more valuable than adding a prefix.

---

## 4. `In re Grand Jury Subpoena` / `In re Grand Jury Investigation` / `In re Grand Jury Proceedings` / `In re Grand Jury`

### Canonical and variant forms

- `In re Grand Jury` — generic, often used for Supreme Court captions (e.g., `In re Grand Jury, 598 U.S. ___ (2023)`)
- `In re Grand Jury Subpoena` — most common appellate form
- `In re Grand Jury Subpoena Duces Tecum` — when the subpoena demands documents
- `In re Grand Jury Subpoena Duces Tecum Dated [Date]` — disambiguates among multiple subpoenas in one investigation
- `In re Grand Jury Investigation` — broader, often used when the subpoena recipient is not the focus
- `In re Grand Jury Proceedings` — even broader, often pre-indictment
- `In re Grand Jury Proceedings (Doe)`, `In re Grand Jury Subpoena (Doe)` — anonymous-subject convention
- `In re Special Grand Jury` — rare; for special grand jury investigations under 18 U.S.C. § 3331
- `In re Witness Before the Grand Jury` — witness-centric variant
- `In re Subpoena to Testify Before the Grand Jury` — alternate witness-centric form
- `In re Subpoena to Testify Before the Grand Jury, [Name]` — names the witness inline

### Jurisdictions

Almost exclusively federal. State equivalents exist but are rarer because most state grand jury proceedings are not subject to the same secrecy-driven `In re` captioning. Notable state variant: Michigan's `In re Investigative Subpoena re [Subject]` (see § 6).

### Subject matter

- Federal grand jury subpoena enforcement and contempt
- Attorney-client privilege and work-product disputes in grand jury context
- Crime-fraud exception applications
- Grand jury secrecy under Fed. R. Crim. P. 6(e)

### Real corpus examples

| Caption | Citation | Court |
|---|---|---|
| In re Grand Jury Subpoena Duces Tecum | 112 F.3d 910 | 8th Cir. 1997 |
| In re Grand Jury Subpoena | 341 F.3d 331 | 4th Cir. 2003 |
| In re Grand Jury Subpoena | 223 F.3d 213 | 3d Cir. 2000 |
| In re Grand Jury Subpoena | 274 F.3d 563 | 1st Cir. 2001 |
| In re Grand Jury Subpoena | 138 F.3d 442 | 1st Cir. 1998 |
| In re Grand Jury Subpoena | 220 F.3d 406 | 5th Cir. 2000 |
| In re Grand Jury Subpoena | 419 F.3d 329 | 5th Cir. 2005 |
| In re Grand Jury Investigation | 445 F.3d 266 | 3d Cir. 2006 |
| In re Grand Jury Investigation | 916 F.3d 1047 | D.C. Cir. 2019 |
| In re Grand Jury Investigation | 918 F.2d 374 | 3d Cir. 1990 |
| In re Grand Jury | 103 F.3d 1140 | 3d Cir. 1997 |
| In re Grand Jury | 286 F.3d 153 | 3d Cir. 2002 |
| In re Grand Jury | 598 U.S. ___ | U.S. 2023 |
| In re Grand Jury Subpoenas Dated March 24, 2003 | 265 F. Supp. 2d 321 | S.D.N.Y. 2003 |
| In re Grand Jury Subpoena Duces Tecum Dated March 25, 2011 | 670 F.3d 1335 | 11th Cir. 2012 |
| In re Subpoena to Testify Before the Grand Jury (Alexiou) | 39 F.3d 973 | 9th Cir. 1994 |
| In re Special Grand Jury No. 81-1 (Harvey) | 676 F.2d 1005 | 4th Cir. 1982 |

### Edge cases

- **The "Dated [date]" qualifier introduces a trailing date that contains a comma**: `In re Grand Jury Subpoena Duces Tecum Dated March 24, 2003`. The existing PROCEDURAL_PREFIX_REGEX terminates the subject at `\s*,\s*$` (before the citation). The internal date comma is *inside* the subject, not the trailing comma, so the regex's `.+?` non-greedy match should consume through it. However, when the citation immediately follows (`In re Grand Jury Subpoena Duces Tecum Dated March 24, 2003, 265 F. Supp. 2d 321`), the parser sees *two* commas and must choose which terminates the subject. The non-greedy `+?` will pick the *first* comma (after "March 24"), incorrectly truncating to `In re Grand Jury Subpoena Duces Tecum Dated March 24`. This is a latent bug in the existing grand-jury caption handling.
- **Disambiguation between subpoena target and case caption**: `In re Grand Jury Subpoena, John Doe v. United States` — the appellate caption sometimes adds a `Doe v. United States` style after the In re phrase to clarify who the appellant is. The PROCEDURAL_PREFIX_REGEX would match `In re Grand Jury Subpoena` as prefix and `John Doe v. United States` as subject; the embedded `v.` then triggers the adversarial fallback path in `extractPartyNames` (lines 1538–1559 of `extractCase.ts`), which is the correct behavior.
- **Anonymous-witness parentheticals**: `In re Grand Jury Subpoena (Doe)`, `In re Grand Jury (John Doe)` — these are captured as `In re` + `Grand Jury Subpoena (Doe)` subject. The trailing `(Doe)` parenthetical is part of the subject, not a citation parenthetical, so it should not be confused with a year/court parenthetical.
- **The bare `In re Grand Jury, 598 U.S. ___ (2023)`**: The Supreme Court's January 2023 decision was captioned simply `In re Grand Jury`. The existing `In re` prefix handles it fine — subject is `Grand Jury`.

### Recommended priority

**Documentation only**, not a new prefix. The existing `In re` prefix correctly captures `Grand Jury Subpoena`, `Grand Jury Investigation`, etc., as the subject. Adding `In re Grand Jury Subpoena` as a separate longer prefix would help the captured subject be only the date or `(Doe)` qualifier, but at the cost of a larger regex with no obvious downstream benefit.

**The latent comma-in-subject bug for "Dated [Date]" forms deserves a separate fix** independent of prefix coverage — likely a special-case carve-out where dates inside the subject (`Dated Month Day, Year`) are recognized atomically.

---

## 5. `In re Sealed Case` / `In re Sealed Application` / `In re Sealed Search Warrant` / `In re Sealed Indictment`

### Canonical and variant forms

- `In re Sealed Case` — the dominant D.C. Circuit form, used when the entire underlying litigation is sealed
- `In re Sealed Application`
- `In re Sealed Search Warrant`
- `In re Sealed Indictment`
- `In re Sealed Affidavit`
- `In re Sealed Subpoena`
- `In re Sealed Search Warrant Affidavit`

These are all subject-descriptor captions where the entire identifying information about the underlying matter is redacted. They are not aliases for unsealed cases; they are *the* canonical caption for any matter whose unsealing would defeat the proceeding's purpose.

### Jurisdictions

- **D.C. Circuit**: Heavy use because much of the politically sensitive grand jury and surveillance docket originates in D.D.C. and is sealed by default.
- **FISA Court of Review (FISCR)**: Two landmark opinions both captioned `In re Sealed Case` — 310 F.3d 717 (FISA Ct. Rev. 2002) (the *first* FISCR opinion) and subsequent FISCR decisions.
- **Other circuits**: Used routinely for grand jury contempt, sealed-witness disputes, and CIPA-related matters.

### Subject matter

- Sealed grand jury proceedings
- FISA Court of Review opinions
- Special counsel / independent counsel matters
- Sealed indictment unsealing motions
- Sealed search warrant applications and unsealings
- Nondisclosure orders for electronic surveillance and § 2703(d) orders

### Real corpus examples

| Caption | Citation | Court |
|---|---|---|
| In re Sealed Case | 310 F.3d 717 | FISA Ct. Rev. 2002 |
| In re Sealed Case | 121 F.3d 729 | D.C. Cir. 1997 |
| In re Sealed Case | 124 F.3d 230 | D.C. Cir. 1997 |
| In re Sealed Case | 877 F.2d 83 | D.C. Cir. 1989 |
| In re Sealed Case | 825 F.2d 494 | D.C. Cir. 1987 |
| In re Sealed Case | 107 F.3d 46 | D.C. Cir. 1997 |
| In re Sealed Case | 80 F.4th 355 | D.C. Cir. 2023 |
| In re Sealed Case | 77 F.4th 815 | D.C. Cir. 2023 |
| In re Sealed Case No. 02-001 | (FISA Ct. Rev. 2002) | (also reported at 310 F.3d 717) |
| In re Sealed Search Warrant | (various) | Various |

### Edge cases

- **Multiple `In re Sealed Case` decisions in the same year**: Because the caption is identical across many sealed matters, ambiguity is resolved by docket number, date, and citation rather than caption. eyecite-ts has nothing to do here — the citation does the disambiguation, not the caption.
- **Disambiguating sub-types**: When the caption is `In re Sealed Search Warrant`, `In re Sealed Subpoena`, etc., the parser captures the entire descriptor as the subject of `In re`. If the goal is to *classify* sealed cases by type, that would require a separate post-processing step keyed on the subject content (not a prefix change).
- **"Sealed" as the subject head**: For an `In re Sealed [Noun]` caption, the subject after the `In re` prefix begins with "Sealed", a non-personal-name token. The existing prefix regex accepts this; the issue is only that downstream consumers should not treat "Sealed Case" as a party name.

### Recommended priority

**Documentation only.** Already correctly handled by `In re`. No new prefix needed unless eyecite-ts grows a notion of subject-category classification.

---

## 6. `In re Search Warrant` / `In re Warrant` / `In re Investigative Subpoena`

### Canonical and variant forms

- `In re Search Warrant` — bare form
- `In re Search Warrant for [Location/Item]` — descriptor variant
- `In re Search Warrant Dated [Date]`
- `In re Search of [Premises / Email Account / Device]`
- `In re Warrant to Search [...]`
- `In re Warrant for [...]`
- `In re Application for Search Warrant`
- `In re Investigative Subpoena re [Subject]` — Michigan state form (one-of-a-kind in state corpora)
- `In re Order Authorizing [...]`
- `In re Order Requiring Apple, Inc. to Assist [...]`

### Jurisdictions

- **Federal magistrate / district**: Heavy use. Often unpublished or available via PACER only.
- **Federal circuit**: When unsealing or scope disputes are appealed.
- **Michigan**: `In re Investigative Subpoena re Homicide of Lance C. Morton` (Mich. Ct. App. 2003) is the canonical Michigan investigative-subpoena form (MCL 767A.1 et seq.).
- **Delaware Superior**: `Matter of 2 Sealed Search Warrants` (Del. Super. 1997).
- **Other states**: Sporadic use; most state warrant proceedings are not captioned this way.

### Subject matter

- Pre-indictment search warrant applications and challenges
- Stored Communications Act warrants
- Cross-border data warrant disputes (Microsoft Ireland)
- All Writs Act applications to compel third-party assistance (Apple iPhone)
- Cell-tower dump warrants

### Real corpus examples

| Caption | Citation | Court |
|---|---|---|
| In re Search Warrant | 362 F. Supp. 2d 1298 | (Federal District) |
| In re Search Warrant Dated July 4, 1977 | 436 F. Supp. 689 | D.D.C. 1977 |
| In re Warrant to Search a Certain E-Mail Account Controlled and Maintained by Microsoft Corp. | 15 F. Supp. 3d 466 | S.D.N.Y. 2014 |
| In re Warrant to Search a Certain E-Mail Account Controlled and Maintained by Microsoft Corp. | 829 F.3d 197 | 2d Cir. 2016 |
| In re Order Requiring Apple, Inc. to Assist in the Execution of a Search Warrant | 149 F. Supp. 3d 341 | E.D.N.Y. 2016 |
| In re Investigative Subpoena re Homicide of Lance C. Morton | 258 Mich. App. 507 | Mich. Ct. App. 2003 |
| In re Search Warrant for Secretarial Area | 855 F.2d 569 | 8th Cir. 1988 |
| In re Leopold to Unseal Certain Electronic Surveillance Applications | 964 F.3d 1121 | D.C. Cir. 2020 |

### Edge cases

- **Very long descriptors with embedded commas and proper nouns**: `In re Warrant to Search a Certain E-Mail Account Controlled and Maintained by Microsoft Corporation`. The non-greedy `+?` will probably consume through to the citation comma, but there is risk that an embedded comma (none in this exact caption) could prematurely terminate.
- **Date qualifiers** (`Dated July 4, 1977`): Same comma-in-subject latent bug as for grand jury subpoenas.
- **`In re Search of [Premises]`**: Uses "Search of" rather than "Search Warrant". The existing `In re` prefix handles it; the subject becomes `Search of [Premises]`.
- **Michigan `In re Investigative Subpoena re X`**: The inner `re` is the procedural-prefix preposition again ("In re ... re ..."), which is grammatically awkward but standard. The PROCEDURAL_PREFIX_REGEX captures `Investigative Subpoena re Homicide of Lance C. Morton` as the subject — acceptable.

### Recommended priority

**Documentation only.** All variants are correctly captured by `In re`. The longer forms (`In re Warrant to Search`, `In re Order Requiring`, `In re Investigative Subpoena re`) are too varied and case-specific to warrant individual prefix entries.

---

## 7. `In re Special Counsel Investigation` / `In re Independent Counsel Investigation`

### Canonical and variant forms

- `In re Special Counsel Investigation` — rare; more often captioned `In re Grand Jury Investigation` because the public-facing caption avoids naming the special counsel
- `In re Grand Jury Investigation` (with Special Counsel as litigant) — the *de facto* caption for most special-counsel-related rulings
- `In re Sealed Case` — when the matter is sealed even more comprehensively
- `In re Madison Guaranty Savings & Loan` — variant naming the underlying entity (Independent Counsel era)
- `In re Application of the Independent Counsel` — older variant

### Jurisdictions

- **D.C. Circuit**: Almost all special-counsel litigation transits the D.C. Circuit due to D.D.C. originating district.
- **D.D.C.**: Originating court for grand jury subpoena enforcement actions.
- **Special Division of the D.C. Circuit (defunct)**: Under the now-expired Independent Counsel statute (28 U.S.C. § 49).

### Subject matter

- Appointments Clause challenges to Special Counsel authority
- Grand jury subpoena enforcement during special counsel investigations
- Privilege disputes (executive, attorney-client, work product)

### Real corpus examples

| Caption | Citation | Court |
|---|---|---|
| In re Grand Jury Investigation (Miller) | 916 F.3d 1047 | D.C. Cir. 2019 |
| In re Grand Jury Investigation (Mueller) | various, unpublished | D.D.C., D.C. Cir. |
| In re Sealed Case (re Mueller) | various | D.C. Cir. |
| In re Madison Guaranty Sav. & Loan | 13 F.3d 411 | D.C. Cir. 1993 |

### Edge cases

- **Caption rarely says "Special Counsel" explicitly**: Even in Mueller-era and Smith-era litigation, the published caption is typically `In re Grand Jury Investigation` or `In re Sealed Case`. The phrase "Special Counsel" lives in the body of the opinion, not the caption.
- **Parenthetical clarifier in commentary**: Practitioners often add `(Mueller)` or `(Special Counsel)` in their own citations — `In re Grand Jury Investigation (Mueller)` — but this is post-hoc, not the official caption.

### Recommended priority

**Not needed.** Already covered by `In re` (and indirectly by `In re Grand Jury Investigation` discussion in § 4). Adding `In re Special Counsel Investigation` as a separate prefix would match a very small fraction of opinions.

---

## 8. FISA Court Captions: `In re Directives` / `In re Production` / `In re Orders`

### Canonical and variant forms

- `In re Directives Pursuant to Section 105B of the Foreign Intelligence Surveillance Act`
- `In re Production of Tangible Things from [Redacted]`
- `In re Application of the FBI for an Order Requiring the Production of Tangible Things from [REDACTED]`
- `In re Orders of this Court Interpreting Section 215 of the Patriot Act`
- `In re Sealed Case` (also a FISCR form — see § 5)
- `In re Certified Question of Law`
- `In re Certification of Questions of Law to the [Foreign Intelligence Surveillance Court of Review]`

### Jurisdictions

- **FISA Court (FISC)**: Trial-level surveillance authorizations
- **FISA Court of Review (FISCR)**: Appellate review under 50 U.S.C. § 1803(b)
- Both bodies use `In re` captioning almost exclusively because the matters are sealed and there are no opposing parties at the issuance stage.

### Subject matter

- Section 702 / 215 / 105B authorizations
- Compelled provider compliance (e.g., Yahoo!, in *In re Directives*)
- Bulk metadata collection authorizations
- Reauthorizations and interpretive opinions

### Real corpus examples

| Caption | Citation | Court |
|---|---|---|
| In re Directives Pursuant to Section 105B | 551 F.3d 1004 | FISA Ct. Rev. 2008 |
| In re Sealed Case | 310 F.3d 717 | FISA Ct. Rev. 2002 |
| In re Production of Tangible Things from [Redacted] | No. BR 08-13 | FISA Ct. Dec. 12, 2008 |
| In re Application of the FBI for an Order Requiring the Production of Tangible Things from [REDACTED] | No. BR 06-05 | FISA Ct. May 24, 2006 |
| In re Orders of this Court Interpreting Section 215 of the Patriot Act | No. Misc. 13-02 | FISA Ct. Sept. 13, 2013 |

### Edge cases

- **FISA captions often contain `[Redacted]` or `[REDACTED]` literal tokens**: This is a non-name token in the subject. The existing character class `[A-Za-z0-9\s.,'&()/-]+?` does *not* include `[` or `]`. A FISA caption like `In re Production of Tangible Things from [REDACTED]` would have the subject truncated at the `[`. Captions in published reporters typically reformat to drop the brackets, but the underlying FISC docket forms include them.
- **Docket-number citations**: FISA decisions are often cited by docket number (`No. BR 06-05`) rather than by reporter. eyecite-ts may not match these as citations at all unless the reporter `(FISA Ct.)` or `(FISA Ct. Rev.)` appears.
- **Section reference inside the caption**: `In re Directives Pursuant to Section 105B of the Foreign Intelligence Surveillance Act` — the subject is a long noun phrase containing punctuation. The non-greedy match should handle it, but it produces a long, descriptor-style "subject" rather than a party name.

### Recommended priority

**Low.** FISA captions are a small share of the corpus, and the existing `In re` prefix handles them adequately. The `[REDACTED]` bracket issue is a real but narrow concern; consider relaxing the subject character class to include `[` and `]` in a future revision (separate from this prefix work).

---

## 9. `People ex rel.` (NY Habeas)

### Canonical and variant forms

- `People ex rel. [Petitioner] v. [Respondent]` — NY habeas form under CPLR Article 70
- `People ex rel. [Petitioner] v. Superintendent`
- `People ex rel. [Petitioner] v. Warden`
- `People of the State of [State] ex rel. [Petitioner] v. [Respondent]` — long form
- `People ex rel. [Petitioner] on Behalf of [Real Party in Interest] v. [Respondent]` — common in family/child custody and the Nonhuman Rights Project cases

### Jurisdictions

- **New York (state)**: Dominant form for habeas corpus under CPLR Article 70. NY uses `People ex rel.` rather than `Ex parte` or `In re` for habeas.
- **Illinois (state, older)**: Some `People ex rel.` habeas captions.
- **Federal courts hearing NY-originated cases**: Captions are sometimes preserved.

### Subject matter

- New York state habeas (state-prisoner custody, parole challenges, immigration detention in NY)
- Nonhuman Rights Project animal-habeas litigation
- Family Court habeas
- Pretrial detention challenges

### Real corpus examples

| Caption | Citation | Court |
|---|---|---|
| People ex rel. Warren v. People | 171 A.D.2d 768 | N.Y. App. Div. 1991 |
| People ex rel. Morejohn v. NYS Bd. of Parole | 183 Misc. 2d 435 | N.Y. Sup. Ct. 1999 |
| People ex rel. Nonhuman Rights Project, Inc. v. Lavery | 124 A.D.3d 148 | N.Y. App. Div. 2014 |
| People ex rel. Davis v. Superintendent of Willard Drug Treatment Campus | 2006 N.Y. Slip Op. 50529(U) | N.Y. Sup. Ct. 2006 |
| People ex rel. Brunson v. (respondent) | 2021 NY Slip Op | N.Y. 2021 |
| Nonhuman Rights Project, Inc. ex rel. Hercules and Leo v. Stanley | 49 Misc. 3d 746 | N.Y. Sup. Ct. 2015 |

### Edge cases

- **Already covered indirectly by `Commonwealth ex rel.`, `State ex rel.`, `United States ex rel.`**: The existing prefix list has *three* `ex rel.` forms keyed to specific relator names (`Commonwealth`, `State`, `United States`). Adding `People ex rel.` would parallel these and capture the dominant NY form.
- **Adversarial after the relator**: All `ex rel.` captions include a `v.` after the relator phrase, leading to a *compound* caption: `People ex rel. Smith v. Warden`. The existing handling for `State ex rel. Smith v. Jones` should generalize.
- **Lowercase "ex"/"rel"**: The existing prefix list uses `ex rel.` with a period. NY filings sometimes use `Ex Rel.`, `Ex. Rel.`, `ex rel`, etc. — case-insensitive matching handles capitalization, but `ex rel` without the period is a separate variant.

### Recommended priority

**High** for adding `People ex rel.` to the prefix list. NY habeas opinions are a non-negligible share of the state habeas corpus corpus, and this form is not currently anchored as a procedural prefix — eyecite-ts will treat `People ex rel. Smith v. Warden` as an adversarial `People v.` style caption (since "People" is a recognized party-name fragment), which misclassifies the relator/respondent structure.

---

## 10. `In re Petition of [Person]` — already covered

The existing `Petition of` and `On Petition of` prefixes capture this form. No action needed.

Examples:

- *Petition of Doe*, 50 F. Supp. 2d 100 (D. Mass. 1999)
- *On Petition of Smith*, 100 F.3d 200 (1st Cir. 1996)

### Recommended priority

**None.** Already covered.

---

## 11. Sealed Case Conventions and Subject-Capture Considerations

Beyond the prefix question, two structural conventions in sealed-case captions deserve documentation for future eyecite-ts work:

### 11.1 Redacted bracket tokens

FISA, grand jury, and sealed-case captions routinely contain literal `[REDACTED]`, `[Redacted]`, or `[under seal]` tokens in the subject position:

- `In re Production of Tangible Things from [REDACTED]`
- `In re Search Warrant for [Premises Under Seal]`
- `In re Application of the FBI for [REDACTED]`

The current `PROCEDURAL_PREFIX_REGEX` second capture group character class `[A-Za-z0-9\s.,'&()/-]+?` excludes square brackets. If eyecite-ts is asked to parse these captions verbatim, the subject would be truncated. The fix is independent of prefix coverage: extend the character class to include `[]` (and possibly other punctuation common to sealed captions).

### 11.2 Anonymous-party parentheticals

`In re [Form] (Doe)`, `In re [Form] (John Doe No. 1)`, `In re [Form] (Witness Firm)` — the trailing parenthetical *identifies the appellant in an otherwise anonymous appeal*. This is part of the caption, not a court-year parenthetical. The existing regex accepts `(` and `)`, but `findParentheticalEnd` and related helpers may misinterpret the trailing `(Doe)` as a citation-side parenthetical. Worth a separate test case.

### 11.3 Date-in-subject captions

The `Dated [Date]` qualifier introduces a comma inside the subject:

- `In re Grand Jury Subpoena Duces Tecum Dated March 25, 2011`
- `In re Search Warrant Dated July 4, 1977`

The existing PROCEDURAL_PREFIX_REGEX uses a non-greedy `+?` followed by `\s*,\s*$`, so it greedily consumes through internal commas only if the next token doesn't look like a citation. When the citation immediately follows the date (`...Dated March 25, 2011, 670 F.3d 1335`), the parser sees two candidate terminating commas. Whether the non-greedy match correctly extends through "March 25" to the *second* comma depends on the regex engine's behavior and the broader context. This is a latent risk that deserves a focused test.

---

## 12. Recommended Actions

### Tier 1 (high value — add to prefix list)

1. **`In re Extradition of`** — distinct subject matter, distinctive structure, meaningful federal docket share. Adding it ensures `Extradition of` is not part of the captured subject when downstream consumers want the bare petitioner name.
2. **`In the Matter of the Extradition of`** — DOJ-preferred caption for certification orders; appears in published reporters.
3. **`In re Application of`** — captures longer-form surveillance, pen register, and § 2703(d) captions. Distinguishes from the bare `In re` to avoid capturing `Application of the United States` as the subject of an unspecified `In re`.
4. **`In the Matter of the Application of`** — variant of the above.
5. **`People ex rel.`** — NY habeas form. Parallels `Commonwealth ex rel.`, `State ex rel.`, `United States ex rel.` already in the list. Without this, NY habeas captions are misclassified as adversarial.

### Tier 2 (consider — documentation today, possibly prefix later)

6. **`In re Habeas Corpus of`** — rare but unambiguous; would slightly improve subject capture. Low corpus volume.
7. **`In re Grand Jury Subpoena`**, **`In re Grand Jury Investigation`**, **`In re Grand Jury Proceedings`** — only worth adding if eyecite-ts grows a subject-category classification feature. Otherwise no improvement over the bare `In re` prefix.

### Tier 3 (no action needed)

8. **`In re Sealed Case`**, **`In re Sealed Application`**, **`In re Sealed Search Warrant`**, **`In re Sealed Indictment`** — covered by `In re`.
9. **`In re Search Warrant`**, **`In re Warrant`**, **`In re Investigative Subpoena`** — covered by `In re`. Subject descriptors are too varied to enumerate.
10. **`In re Special Counsel Investigation`**, **`In re Independent Counsel Investigation`** — not the actual caption form; published opinions use `In re Grand Jury Investigation` or `In re Sealed Case`.
11. **`In re Subpoena`**, **`In re Subpoena Duces Tecum`**, **`In re Material Witness`**, **`In re Witness Before the Grand Jury`** — covered by `In re`.
12. **`In re Directives`**, **`In re Production`**, **`In re Orders`** (FISA) — covered by `In re`.

### Independent of prefix work — separate issues

- **Character class extension to include `[` and `]`**: Required for FISA `[REDACTED]` and sealed-bracket conventions. Affects all prefixes.
- **Date-in-subject parsing**: `Dated March 25, 2011` introduces an internal comma that may confuse the non-greedy `+?` match. Needs a dedicated test case for `In re Grand Jury Subpoena Duces Tecum Dated [Date]` and `In re Search Warrant Dated [Date]`.
- **Anonymous-party parentheticals** at end of subject: `In re Grand Jury Subpoena (Doe)`. Worth a test case to confirm that the trailing `(Doe)` is captured as part of the subject and not interpreted as a court/year parenthetical.

### Proposed final prefix list (criminal/habeas additions only — preserves all existing entries)

Add the following five entries (with longer-first ordering preserved in both the regex and the array):

```
"In the Matter of the Extradition of"
"In the Matter of the Application of"
"In re Extradition of"
"In re Application of"
"People ex rel."
```

Ordering note: In the existing regex/array, longer prefixes precede shorter ones so that `In re Marriage of X` matches before the regex falls through to `In re X`. The same logic applies here: `In the Matter of the Extradition of` must precede `In the Matter of`; `In re Extradition of` must precede `In re`; and `People ex rel.` does not collide with anything currently in the list.

The resulting array (with new entries inserted by length):

1. In the Matter of the Extradition of (new)
2. In the Matter of the Application of (new)
3. In the Matter of
4. In re Marriage of
5. In the Interest of
6. In re Extradition of (new)
7. In re Application of (new)
8. Commonwealth ex rel.
9. United States ex rel.
10. People ex rel. (new)
11. State ex rel.
12. Conservatorship of
13. Guardianship of
14. On Petition of
15. Adoption of
16. Petition of
17. Application of (existing — note collision risk with new entry above; the longer `In re Application of` wins by ordering)
18. Estate of
19. Matter of
20. Ex parte
21. In re

Note that "Application of" (existing) and "In re Application of" (proposed) coexist because longer matches win; older case captions that drop the `In re` prefix (e.g., older NY/SDNY style) still match the bare `Application of`. Same logic for `Extradition of` — the existing list does *not* contain a bare `Extradition of`, and one is not needed since extradition captions always carry either `In re` or `In the Matter of`.

---

## 13. References

- The Bluebook: A Uniform System of Citation, R. 10.2 (procedural phrases including "In re" and "ex rel.")
- Justice Manual § 9-15.000 (International Extradition and Related Matters), U.S. Department of Justice
- Federal Judicial Center, *International Extradition: A Guide for Judges* (Hedges 2014)
- 18 U.S.C. § 3184 (extradition certification proceedings)
- 18 U.S.C. § 3144 (material witness arrest)
- 18 U.S.C. §§ 3121–3127 (pen register / trap and trace devices)
- 18 U.S.C. § 2703 (Stored Communications Act)
- 50 U.S.C. § 1803 (FISA Court / FISA Court of Review jurisdiction)
- 28 U.S.C. § 2241 (federal habeas corpus)
- 28 U.S.C. § 2244(b)(3) (second-or-successive habeas authorization — generates `In re` motion practice)
- N.Y. CPLR Art. 70 (state habeas — `People ex rel.` form)
- Fed. R. Crim. P. 6(e) (grand jury secrecy)
- Fed. R. Crim. P. 41 (search warrants)
- Tex. Code Crim. Proc. Art. 11.07, 11.071, 11.09 (habeas — `Ex parte` form)
- *In re Sealed Case*, 310 F.3d 717 (FISA Ct. Rev. 2002) (foundational FISCR opinion)
- *In re Directives Pursuant to Section 105B*, 551 F.3d 1004 (FISA Ct. Rev. 2008)
- *In re Grand Jury Investigation (Miller)*, 916 F.3d 1047 (D.C. Cir. 2019) (special counsel Appointments Clause)
- *In re Grand Jury*, 598 U.S. ___ (2023) (attorney-client privilege, dismissed as improvidently granted)

---

## 14. Cross-References to eyecite-ts Source

- `PROCEDURAL_PREFIX_REGEX`: `src/extract/extractCase.ts` (~line 281)
- `proceduralPrefixes` array: `src/extract/extractCase.ts` (~line 1508)
- `extractPartyNames`: `src/extract/extractCase.ts` (~line 1498) — the function that consumes a caption and returns plaintiff/defendant/prefix triples
- `PARTY_NAME_CONNECTORS`: `src/extract/extractCase.ts` (~line 296) — relevant because criminal captions often have lowercase descriptor tokens in the subject (`subpoena`, `application`, `warrant`)
- `findParentheticalEnd`: `src/extract/extractCase.ts` — relevant to the anonymous-party `(Doe)` concern in § 11.2

---

## 15. Open Questions for Maintainers

1. **Subject classification feature**: Should eyecite-ts emit a `subjectCategory` field for procedural captions (e.g., `grandJury`, `searchWarrant`, `extradition`, `sealed`)? If yes, the longer-form prefixes in Tier 2 become more valuable. If no, the existing `In re` prefix is sufficient.
2. **Character class for sealed/redacted brackets**: Is there appetite for relaxing the subject character class to include `[` and `]`? This affects FISA and sealed-case parsing.
3. **Date-in-subject test coverage**: A test for `In re Grand Jury Subpoena Duces Tecum Dated March 25, 2011, 670 F.3d 1335 (11th Cir. 2012)` would verify whether the non-greedy match correctly extends past the internal date comma. Strongly recommended regardless of prefix additions.
4. **`People ex rel.` ordering and collisions**: Confirm that adding `People ex rel.` before `People v.` -style adversarial matching does not regress existing NY criminal captions (`People v. Smith` should still match `V_CASE_NAME_REGEX`, not the new prefix). The prefix regex anchor `\b` followed by `People ex rel.` should not match `People v. Smith` because of the `ex rel.` literal — but a regression test is prudent.
