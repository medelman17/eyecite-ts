# Procedural-Prefix Case Captions: Immigration / BIA / USCIS / Administrative Agency Adjudications

**Date:** 2026-05-11
**Agent scope:** Immigration (BIA / EOIR / USCIS) and other federal administrative-agency adjudications (FCC, NLRB, FERC, SEC, FTC, USCG, FDIC) — procedural-prefix caption forms appearing in published opinions and federal court reviews thereof.

**Repo:** `eyecite-ts` (TypeScript port of Python eyecite). Patch target: `src/extract/extractCase.ts` `PROCEDURAL_PREFIX_REGEX` (line 282-283) and parallel `proceduralPrefixes` array (line 1511-1528).

**Existing coverage (16 prefixes — do not propose duplicates):** `In the Matter of`, `In re Marriage of`, `In the Interest of`, `Commonwealth ex rel.`, `In re`, `Ex parte`, `Matter of`, `Estate of`, `State ex rel.`, `United States ex rel.`, `Application of`, `On Petition of`, `Petition of`, `Adoption of`, `Conservatorship of`, `Guardianship of`.

---

## Summary

I audited federal administrative-agency case-caption conventions across two clean datasets: (1) CourtListener's 12M-opinion search index and (2) BIA precedent decisions in `I&N Dec.` plus the federal-court opinions reviewing them. The headline conclusions:

1. **BIA's signature caption `Matter of X` is already covered** by the existing `Matter of` prefix; the only BIA-specific gap is the **hyphenated-initials respondent name** (`Matter of A-B-`, `Matter of L-E-A-`, `Matter of M-E-V-G-`, etc.). That is **tracked separately as issue #244** and is a *party-name capture* problem inside the matched subject, not a procedural-prefix gap. The prefix regex is already finding `Matter of`; the issue is what comes after.

2. **Two genuine new procedural-prefix gaps** emerge from the immigration-administrative corpus:
   - **`In re Petition for Naturalization of`** — the canonical 1950s-1990s federal district court caption for naturalization petitions under 8 U.S.C. § 1421 *et seq.* CourtListener returns >100 published opinions in this form (`In re Petition for Naturalization of Haniatakis`, `... of Matz`, `... of Todorov`, `... of Lapenieks`, etc., almost all from `F. Supp.`). Highest priority for addition.
   - **`In re Naturalization of`** — the shorter sibling form used by federal district courts (especially post-INA-1990 cases). CourtListener returns >50 hits (`In re Naturalization of Morey`, `In re Naturalization of Del Olmo`, `In re Naturalization of Vafaei-Makhsoos`, `In re Naturalization of Longstaff`, `In re Naturalization of Watson`, etc.). High priority.

3. **Three lower-priority but reportable gaps** in adjacent admin-law caption forms:
   - **`In re Complaint of`** — maritime / Coast Guard / Federal Maritime Commission (`In re Complaint of Foss Maritime Co.`, `In re Complaint of Danos & Curole Marine`) and judicial-misconduct (`In re Complaint of Judicial Misconduct` — extremely common in CA9). **Medium priority** because the maritime/agency variant occurs in a relatively narrow corpus, and the judicial-misconduct variant is a substantive (not administrative) caption.
   - **`In re Petition for Review of`** — appellate-administrative form from state and federal review-of-agency-order practice (`In re Petition for Review of Wharton Township Ordinance`, `In re Petition for Review of Panel Decision`). **Low priority** because most "Petition for Review" cases use `X v. Attorney General` style captions where the petitioner is named as plaintiff.
   - **`In re Application of`** — already implicitly partially-matched by existing `Application of` prefix in adversarial/disambiguation logic, but does NOT match through `PROCEDURAL_PREFIX_REGEX` as a standalone form. Currently extracted via `In re ...` (whose `... of X` continuation produces noisy captures). The dedicated `In re Application of` form appears in FCC licensing, Ohio public-utility, immigration, and bar-admission contexts. **Medium priority.**

4. **No "Petition for Review" stripping** — the existing `On Petition of` and `Petition of` cover `Petition of X` standalone captions (e.g., `Petition of Mason`, `Petition of Dean`). The proper noun "Petition for Review" is overwhelmingly an appellate-stage description rather than a true case caption (`Avila v. Attorney General` is the caption, with "Petition for Review" describing the procedural posture).

5. **The BIA / Attorney General Practice Manual prescribes `Matter of` exclusively for published precedent decisions** ("Cite as: Matter of [Name], NN I&N Dec. NNN (BIA YYYY)"). The older form `In re X` is used by federal *district* courts when ruling on naturalization petitions and by federal *circuit* courts as a less-formal alternative to `Matter of`. Both forms appear in real opinion text. This means **both `Matter of` and `In re` (already covered) handle BIA-style citations**, but the dedicated naturalization-petition forms are the gap.

6. **Hyphenated-initials respondent names (#244)** are NOT a procedural-prefix problem — they are a party-name capture problem. The regex `[A-Za-z0-9\s.,'&()/-]+?` already permits hyphens; the failure mode is that the backward-search heuristic treats `A-B-` as a word-boundary token, truncating early. The fix proposed in #244 (extending capture to walk `[A-Z](?:-[A-Z])+-?`) is correct and does not require adding to the prefix list.

---

## Per-Prefix Sections

### 1. `In re Petition for Naturalization of` — HIGHEST PRIORITY

**Canonical form:** `In re Petition for Naturalization of [Petitioner], NNN F. Supp. NNN (D. ___ YYYY)`

**Variant forms:**
- `In re Petition for Naturalization of [Name]` (most common — title case, mixed)
- `In Re Petition for Naturalization of [Name]` (capitalization variant from older opinions)
- `In Re: Petition for Naturalization of [Name]` (colon variant — rare)
- `Petition for Naturalization of [Name]` (without leading `In re`)
- `In the Matter of Petition for Naturalization of [Name]` (rare — federal circuit form)

**Agency / court where it appears:** U.S. district courts adjudicating naturalization petitions under the Immigration and Nationality Act (8 U.S.C. § 1421 *et seq.*); occasionally U.S. courts of appeals on direct appeal from naturalization grants/denials. Until the 1990 INA amendments, federal district courts had original jurisdiction over naturalization petitions and issued reported decisions; the form survives in district-court 8 U.S.C. § 1421(c) judicial-review proceedings and § 1447(b) stalled-application cases.

**Subject matter:** Petitions for naturalization — adjudication of good-moral-character, residency, language, civics, and oath requirements. Includes denied petitions, appeals from INS / USCIS denial, and cases where the petitioner contests an examiner's recommendation.

**Real corpus examples (verified via CourtListener — 12M-opinion index):**

| Caption | Reporter | Court | Date |
|---|---|---|---|
| `In re Petition for Naturalization of LaVoie` | 349 F. Supp. 68 | D.V.I. | 1972-08-24 |
| `In re Petition for Naturalization of Matz` | 296 F. Supp. 927 | E.D. Cal. | 1969-01-28 |
| `In re Petition for Naturalization of Todorov` | 253 F. Supp. 977 | N.D. Ill. | 1966-05-17 |
| `In re Petition for Naturalization of Lapenieks` | 249 F. Supp. 398 | S.D. Cal. | 1965-12-06 |
| `In re Petition for Naturalization of Thanner` | 253 F. Supp. 283 | D. Colo. | 1966-01-20 |
| `In re Petition for Naturalization of Lepi` | 252 F. Supp. 358 | D. Conn. | 1966-04-07 |
| `In re Petition for Naturalization of Haniatakis` | 246 F. Supp. 545 | W.D. Pa. | 1965-10-27 |
| `In re Petition for Naturalization of Regan` | 244 F. Supp. 664 | E.D.N.Y. | 1965-08-24 |
| `In re Petition for Naturalization of Meghnot` | 238 F. Supp. 479 | E.D. Mich. | 1965-01-29 |
| `In re Petition for Naturalization of Sousounis` | 239 F. Supp. 126 | E.D. Pa. | 1965-02-18 |
| `In Re Petition for Naturalization of Edgar` | 253 F. Supp. 951 | E.D. Mich. | 1966-05-05 |
| `In Re Petition for Naturalization of Sotos` | 221 F. Supp. 145 | W.D. Pa. | 1963-09-13 |
| `In re Petition for Naturalization of Kadich` | 221 F. Supp. 353 | S.D.N.Y. | 1963-08-12 |
| `In re Petition for Naturalization of Sun Cha Tom` | 294 F. Supp. 791 | D. Haw. | 1968-12-18 |
| `In re Petition for Naturalization of Turrittin` | 221 F. Supp. 929 | D. Minn. | 1963-10-07 |
| `In Re Petition for Naturalization of Van Dessel` | 243 F. Supp. 328 | E.D. Pa. | 1965-06-15 |
| `In re Petition for Naturalization of Gavieres` | 237 F. Supp. 547 | E.D.N.Y. | 1964-12-04 |
| `In re Petition for Naturalization of Dulo` | 237 F. Supp. 46 | D. Conn. | 1965-01-08 |
| `In Re Petition for Naturalization of Charles Peter Duncan` | 713 F.2d 538 | 9th Cir. | 1983-08-19 |
| `Horst Nemetz v. INS, in Re Petition for Naturalization of Horst Nemetz` | 647 F.2d 432 | 4th Cir. | 1981-04-24 |
| `Petition for Naturalization of Clarino` | 691 F. Supp. 193 | C.D. Cal. | 1988-04-28 |
| `Petition for Naturalization of Yarnie` | 565 F. Supp. 113 | S.D.N.Y. | 1983-06-16 |
| `Petition for Naturalization of Brakel` | 524 F. Supp. 300 | N.D. Ill. | 1979-11-13 |
| `In the Matter of Petition for Naturalization of Richard John Longstaff` | 716 F.2d 1439 | 5th Cir. | 1983-10-27 |
| `Petition for Naturalization of Antonio Olegario v. United States` | 629 F.2d 204 | 2d Cir. | 1980-07-16 |
| `Petition for Naturalization of Bolivar Milton Villamar v. United States` | 651 F.2d 116 | 2d Cir. | 1981-06-02 |

**Edge cases:**

- **Adversarial / appellate forms.** Sometimes the petitioner becomes the named *party* on appeal, producing hybrid captions like `Horst Nemetz v. INS, in Re Petition for Naturalization of Horst Nemetz, 647 F.2d 432 (4th Cir. 1981)` and `Petition for Naturalization of Antonio Olegario v. United States, 629 F.2d 204 (2d Cir. 1980)`. The `v.`-style portion will be matched by the existing `V_CASE_NAME_REGEX`; the procedural-prefix regex is not needed for those.
- **Capitalization variants.** Both `In re` (lowercase `re`) and `In Re` (title case) appear, plus the rare `In Re:` (with colon). The existing regex uses `/i` so all match equally.
- **Long names.** The petitioner's name can be multi-word with middle names (`Charles Peter Duncan`, `Richard John Longstaff`, `Antonio Olegario`, `Bolivar Milton Villamar`). The current capture group `[A-Za-z0-9\s.,'&()/-]+?` handles these correctly.
- **Hyphenated petitioner surnames.** `In re Petition for Naturalization of Anglo-Russo` (hypothetical but plausible — `In re Naturalization of Fang Lan Dankowski` shows mixed-language surnames already in the corpus). Same hyphen-friendly capture suffices.

**Why current `In re` coverage isn't enough.** Today's `In re X` match captures only the first `X` token after `In re`. For `In re Petition for Naturalization of Haniatakis`, the existing prefix `In re` will match `In re Petition` as the procedural prefix (or worse — fail the backward-scan altogether because "Petition" + " for" + "Naturalization" looks like a possessive prepositional phrase, not a party name). Adding a longer, more specific prefix `In re Petition for Naturalization of` ensures the longer match wins (consistent with the existing "longer-prefixes-first" ordering on line 279-281).

**Recommended priority:** **HIGH.** Adds direct support for a well-attested, high-volume historical caption form. Low false-positive risk because `In re Petition for Naturalization of` is so specific. Zero overlap with existing prefixes once placed first in the alternation.

---

### 2. `In re Naturalization of` — HIGH PRIORITY

**Canonical form:** `In re Naturalization of [Petitioner], NNN F. Supp. NNN (D. ___ YYYY)`

**Variant forms:**
- `In re Naturalization of [Name]`
- `In Re Naturalization of [Name]` (older opinions)
- `In Re: Naturalization of [Name]` (with colon)

**Agency / court where it appears:** Federal district courts (and occasionally state courts retaining naturalization jurisdiction historically) ruling on naturalization petitions. This is the **modern shortened sibling** of `In re Petition for Naturalization of` — equivalent in meaning but more compact. Often appears in 1970s-1990s opinions and continues in current 8 U.S.C. § 1421(c) judicial review of denials.

**Subject matter:** Same as #1 above — naturalization adjudication.

**Real corpus examples:**

| Caption | Reporter | Court | Date |
|---|---|---|---|
| `In re Naturalization of Morey` | 726 F. Supp. 1036 | D.S.C. | 1988-12-28 |
| `In Re Naturalization of Del Olmo` | 682 F. Supp. 489 | D. Or. | 1988-03-31 |
| `In re Naturalization of Vafaei-Makhsoos` | 597 F. Supp. 499 | D. Minn. | 1984-11-27 |
| `In Re Naturalization of Longstaff` | 538 F. Supp. 589 | N.D. Tex. | 1982-03-25 |
| `In re Naturalization of Javkin` | 500 F. Supp. 711 | N.D. Cal. | 1980-10-30 |
| `In Re Naturalization of Watson` | 502 F. Supp. 145 | D.D.C. | 1980-10-02 |
| `In re Naturalization of Kapili` | 473 F. Supp. 600 | E.D.N.Y. | 1979-06-26 |
| `In re Naturalization of Olegario` | 473 F. Supp. 185 | S.D.N.Y. | 1979-06-27 |
| `In Re Naturalization of Nisperos` | 471 F. Supp. 296 | C.D. Cal. | 1979-05-14 |
| `In re Naturalization of Valad` | 465 F. Supp. 120 | E.D. Va. | 1979-02-07 |
| `In Re Naturalization of De Bellis` | 493 F. Supp. 534 | E.D. Pa. | 1980-07-15 |
| `In Re Naturalization of Brodie` | 394 F. Supp. 1208 | D. Or. | 1975-05-15 |
| `In re Naturalization of Fang Lan Dankowski` | 478 F. Supp. 1203 | D. Guam | 1979-10-31 |
| `In re Naturalization of Huymaier` | 345 F. Supp. 339 | E.D. Pa. | 1972-06-13 |
| `In Re Naturalization of Schroers` | 336 F. Supp. 1348 | S.D.N.Y. | 1971-11-26 |
| `In re Naturalization of Arbesu` | 347 F. Supp. 1014 | E.D. La. | 1972-05-03 |
| `In re Naturalization of Roque` | 339 F. Supp. 339 | S.D. Miss. | 1971-12-03 |
| `In re Naturalization of Alon` | 342 F. Supp. 596 | E.D. La. | 1972-05-02 |
| `In re Naturalization of Vazquez` | 327 F. Supp. 935 | S.D.N.Y. | 1971-05-18 |
| `In re Naturalization of Gjerstad` | 307 F. Supp. 329 | N.D. Cal. | 1969-11-07 |

**Edge cases:**

- **Hyphenated surnames are real here.** `In re Naturalization of Vafaei-Makhsoos` is a published 8th Cir./D. Minn. case with a true Persian hyphenated surname. The current capture group already permits hyphens, so this works.
- **Multi-word names with Asian and other non-Anglo conventions.** `In re Naturalization of Fang Lan Dankowski` (Chinese-Polish mixed name); `In re Naturalization of Chin Thloot Har Wong` (224 F. Supp. 155, S.D.N.Y. 1963) — already in corpus. The existing capture handles these.
- **`In re Petition for Naturalization of` vs. `In re Naturalization of`.** These are *both* in the corpus, and `In re Petition for Naturalization of` should win as the longer prefix when it matches. The longest-prefix-first rule (line 279-281) handles this naturally.
- **Adjacent older form `Petition of [X]` (without "Naturalization of")**. E.g., `Petition of Di Franco, 339 F. Supp. 414 (S.D.N.Y. 1972)` — already covered by existing `Petition of` prefix. No new work needed.

**Why current `In re` isn't enough.** Same reasoning as #1: `In re X` alone will match `In re Naturalization` as the prefix and start the party-name search at "of", which is a `PARTY_NAME_CONNECTORS` member and produces a degenerate capture. Adding the dedicated `In re Naturalization of` prefix ensures clean extraction.

**Recommended priority:** **HIGH.** Pairs with #1 — both should be added together. Strict naturalization-specific phrasing minimizes false positives.

---

### 3. `In re Complaint of` — MEDIUM PRIORITY

**Canonical form:** `In re Complaint of [Complainant/Shipowner], NNN F. Supp. NNN (D. ___ YYYY)`

**Variant forms:**
- `In re Complaint of [Maritime Company]` (Limitation of Liability Act, Supplemental Rule F)
- `In re Complaint of [Vessel Operator]` (Coast Guard / Federal Maritime Commission)
- `In re Complaint of Judicial Misconduct` (28 U.S.C. § 351 — judicial-conduct review by judicial council)

**Agency / court where it appears:**
- **Federal district courts in admiralty.** Limitation of Liability Act petitions (46 U.S.C. § 30501 et seq.) filed under Supplemental Rule F of the Federal Rules of Civil Procedure. The shipowner files a "Complaint for Exoneration from or Limitation of Liability"; the case is captioned `In re Complaint of [Shipowner]`.
- **Federal Maritime Commission and U.S. Coast Guard adjudications.** Less commonly seen as published reporter citations.
- **Federal courts of appeals** under the Judicial Conduct and Disability Act — `In re Complaint of Judicial Misconduct` is a frequent CA9 caption (300+ published opinions in CourtListener).

**Subject matter:** Maritime limitation-of-liability proceedings (shipowner's defense to mass-claim accidents); judicial-misconduct proceedings under 28 U.S.C. § 351-364.

**Real corpus examples:**

| Caption | Reporter | Court | Date |
|---|---|---|---|
| `In re Complaint of Foss Maritime Co.` | 114 F. Supp. 3d 452 | W.D. Ky. | 2015-07-15 |
| `In Re Complaint of Danos & Curole Marine` | 278 F. Supp. 2d 783 | E.D. La. | 2003 |
| `In Re Complaint of Judicial Misconduct` | 906 F.3d 1167 | 9th Cir. | 2018-10-18 |
| `In re Complaint of Judicial Misconduct` | 838 F.3d 1029 | Jud. Council 9th Cir. | 2016-10-03 |
| `In re Complaint of Judicial Misconduct` | 828 F.3d 1179 | Jud. Council 9th Cir. | 2016-07-14 |
| `In Re Complaint of Judicial Misconduct` | 768 F.3d 998 | 9th Cir. | 2014-09-26 |
| `In Re Complaint of Judicial Misconduct` | 752 F.3d 1204 | 9th Cir. | 2014-05-27 |
| `In re Complaint of Doe` | 245 N.E.3d 391 | Ohio Ct. App. | 2024-06-04 |

**Edge cases:**

- **Hyphenated entity names.** `In re Complaint of Danos & Curole Marine` contains `&`, which is in the existing capture set.
- **Ambiguity with `In re Doe`.** The Ohio `In re Complaint of Doe` example uses pseudonymous parties — the existing `In re` already matches, but adding `In re Complaint of` would make the prefix attribution more accurate (current behavior would extract `Complaint of Doe` as the case name, which is wrong; with the new prefix, the extraction would be `In re Complaint of Doe` with prefix `In re Complaint of`).
- **`Judicial Misconduct` placeholder.** When the captioned subject is literally just `Judicial Misconduct` (no named complainant), the case name is canonical and unique — eyecite would extract `In re Complaint of Judicial Misconduct` correctly.

**Why current `In re` isn't enough.** Same pattern as #1 and #2. Without the dedicated longer prefix, `In re` alone captures `Complaint` as the start of the party name, which produces an inaccurate caption attribution.

**Recommended priority:** **MEDIUM.** Real but narrower corpus. Judicial-misconduct variant is high-frequency in CA9 but is a specialized non-administrative form. Maritime variant is high-value for admiralty practice. Suggest adding alongside #1 and #2 since the marginal cost is minimal.

---

### 4. `In re Application of` — MEDIUM PRIORITY (overlap with existing `Application of`)

**Canonical form:** `In re Application of [Applicant], NNN [Reporter] NNN (___ YYYY)`

**Variant forms:**
- `In re Application of [Company]` (FCC license applications, utility-commission docket captions)
- `In re Application of [Petitioner]` (Ohio bar admission)
- `In re Application of [Government Entity]` (county treasurer tax-sale applications in Illinois; Ohio Power Co.)
- `In re: Application of [Name]` (with colon — appears in CA4 captions)
- `In Re Application of [Name]` (older title-case)

**Agency / court where it appears:**
- **Ohio Supreme Court** — bar admission decisions (`In re Application of Aguilar`, `In re Application of Cline`).
- **Nevada Supreme Court** — bar admission and licensing (`In Re: Application Of Trost`).
- **Federal District Courts** — in the FCC / immigration / criminal-warrant context (`In Re Application of US, 727 F. Supp. 2d 571 (W.D. Tex. 2010)`).
- **Illinois Appellate Court** — county-treasurer tax-deed applications (`In re Application of the County Treasurer`).
- **Federal courts of appeals** — Pinkerton-style admission proceedings, USCIS administrative appeals (`In re Application of Mgndichian, 312 F. Supp. 2d 1250 (C.D. Cal. 2003)`).

**Subject matter:** Diverse — bar admissions, FCC broadcast/wireless license applications, tax-deed proceedings, court orders for search warrants, immigration/naturalization application reviews. The unifying theme is an *ex parte* application to a tribunal.

**Real corpus examples:**

| Caption | Reporter | Court | Date |
|---|---|---|---|
| `In re Application of Aguilar` | 2025 Ohio 2951 | Ohio | 2025-08-21 |
| `In re Application of Notestine` | 2025 Ohio 2415 | Ohio | 2025-07-08 |
| `In re Application of Daubenmire` | 249 N.E.3d 54 | Ohio | 2024-06-12 |
| `In re Application of Reinier` | 174 Ohio St. 3d 1222 | Ohio | 2023-11-17 |
| `In re Application of Cline` | 173 Ohio St. 3d 316 | Ohio | 2023-11-21 |
| `In Re: Application Of Trost` | (slip op.) | Nev. | 2022-07-15 |
| `In re Application of the County Treasurer` | 2025 IL App (1st) 240045 | Ill. App. | 2025-08-25 |
| `In re Application of Ohio Power Co.` | 2025 Ohio 3034 | Ohio | 2025-08-27 |
| `In Re Application of Baldwin.` | 2018 Ohio 4077 | Ohio | 2018-10-11 |
| `In Re Application of Columbus S. Power Co.` | 134 Ohio St. 3d 392 | Ohio | 2012-12-06 |
| `In Re Application of Mgndichian` | 312 F. Supp. 2d 1250 | C.D. Cal. | 2003-10-23 |
| `In Re Application of GCC License Corp.` | 264 Neb. 167 | Neb. | 2002-06-28 |
| `In Re Application of Southwestern Bell Tel. Co.` | 9 Kan. App. 2d 525 | Kan. App. | 1984-06-18 |
| `In re Application for Naturalization of Kolbel` | 84 Misc. 475 | N.Y. Sup. Ct. | 1914-03-15 |
| `In Re Application of US` | 727 F. Supp. 2d 571 | W.D. Tex. | 2010-07-29 |

**Edge cases:**

- **Existing `Application of` already handles some of these.** Today's `Application of X` prefix matches `Application of Pierre, 605 F. Supp. 265 (E.D. Pa. 1985)` (verified) and `Application of Chan, 426 F. Supp. 680 (S.D.N.Y. 1976)`. But it does NOT capture the `In re ` prefix when it appears — it would extract a leading `In re` as sentence context. Adding `In re Application of` ensures the prefix is correctly attributed when both forms appear.
- **Tax-deed / property captions like `In re Application of the County Treasurer`.** The captured subject is literally "the County Treasurer" — eyecite would extract the full caption `In re Application of the County Treasurer` correctly with the new prefix.
- **Possible overlap with #5 below (`In re Application for`).** These are distinct: "of" denotes the applicant; "for" denotes the relief sought. Both are real and both should be supported.

**Why current `Application of` isn't enough.** When `In re ` precedes `Application of`, the existing `Application of` prefix match captures only the trailing portion. The extracted `caseName` would be `Application of X` (missing the leading `In re`), which is an inaccurate procedural attribution but not catastrophic since the body of the case name is correct. Adding the longer prefix is **a precision improvement** rather than a correctness fix.

**Recommended priority:** **MEDIUM.** Improvement, not gap. Adds proper attribution of the `In re` ceremonial portion. If the goal is reproducing the exact published caption verbatim, this is worth adding.

---

### 5. `In re Application for` — LOWER PRIORITY

**Canonical form:** `In re Application for [Relief Sought], NNN [Reporter] NNN (___ YYYY)`

**Variant forms:**
- `In re Application for Change of Name [(Petitioner)]` (Nevada Supreme Court)
- `In re Application for a Tax Deed` (Illinois Supreme Court)
- `In re Application for Correction of Birth Record of [Name]` (Ohio)
- `In re Application for a Search Warrant` (federal district court — sealed surveillance applications)
- `In re Application for Reinstatement of [Attorney]` (Hawaii)
- `In re Application for Relief from Weapons Disability` (Ohio)
- `In re Application for the Reinstatement of [Attorney]` (Hawaii — with article)

**Agency / court where it appears:** State supreme courts (Ohio, Nevada, Hawaii, Illinois) for name changes, tax deeds, attorney reinstatement, weapons disability relief. Federal district courts for sealed surveillance and search warrant applications.

**Subject matter:** Ex parte applications for specific judicial relief (a deed, a name change, a warrant, attorney reinstatement). Distinct from `Application of [Person]` (which names the applicant) — `Application for [Thing]` names the relief.

**Real corpus examples:**

| Caption | Reporter | Court | Date |
|---|---|---|---|
| `IN RE: APPLICATION FOR CHANGE OF NAME (LOWRY)` | 549 P.3d 483 | Nev. | 2024-06-06 |
| `In re Application for a Tax Deed` | 183 N.E.3d 688 | Ill. | 2021-06-17 |
| `In re Application for Correction of Birth Record of Adelaide` | 2024 Ohio 5393 | Ohio | 2024-11-19 |
| `In re Application for a Search Warrant` | 236 F. Supp. 3d 1066 | N.D. Ill. | 2017-02-16 |
| `In re Application for Relief from Weapons Disability v. Downing` | 2023 Ohio 3034 | Ohio Ct. App. | 2023-08-29 |
| `In re Application for Reinstatement of Ferrigno` | (slip op.) | Haw. | 2017-08-22 |
| `In re: Application for the Reinstatement of Adams` | (slip op.) | Haw. | 2019-05-28 |
| `In re the Application for Naturalization of Kolbel` | 84 Misc. 475 | N.Y. Sup. Ct. | 1914-03-15 |

**Edge cases:**

- **Long noun phrases instead of named parties.** `In re Application for a Tax Deed` has no party at all — just the type of relief. The current capture group accepts this as a "case name."
- **Hybrid `v.` form.** `In re Application for Relief from Weapons Disability v. Downing` mixes the prefix form with a `v.` party — the existing logic handles this via the "adversarial case with procedural-looking plaintiff" branch (lines 1539-1545).
- **Antique `In re the Application for Naturalization of Kolbel` (1914).** Pre-1990 captions sometimes have an article ("the") inserted: `In re the Application for Naturalization of [Name]`. Today's regex would not handle this insertion. This is a rare antique edge case and not worth dedicated coverage.

**Recommended priority:** **LOW.** Real corpus exists but is fragmented across many sub-types (`Change of Name`, `Tax Deed`, `Search Warrant`, etc.). Each sub-type has only modest volume. A general `In re Application for` prefix would catch many, but the trailing subjects are highly variable and may confuse the case-name extractor. Defer unless explicit feedback from corpus tests reveals failures.

---

### 6. `In re Petition for Review of` — LOW PRIORITY

**Canonical form:** `In re Petition for Review of [Order/Decision], NNN [Reporter] NNN (___ YYYY)`

**Variant forms:**
- `In re Petition for Review of [Panel Decision against X]`
- `In re Petition for Review of [Ordinance / Township Action]`

**Agency / court where it appears:** State courts reviewing local administrative or quasi-judicial decisions. Notably absent in federal-circuit immigration practice, where the petitioner-as-plaintiff `X v. Attorney General` form dominates instead.

**Subject matter:** Review of administrative orders by state courts. Examples include attorney-discipline panel decisions, zoning ordinance challenges, and bar-admission reviews.

**Real corpus examples:**

| Caption | Reporter | Court | Date |
|---|---|---|---|
| `In re Petition for Review of Panel Decision against Panel Case No. 35104.` | 851 N.W.2d 620 | Minn. | 2014-08-06 |
| `In re Petition for Review of Wharton Township Ordinance No. 2 of 2006` | 926 A.2d 1257 | Pa. Commw. | 2007-06-21 |
| `In re Review of the Letter Decision of the Committee on Attorney Advertising` | 195 N.J. 514 | N.J. | 2008-05-29 |
| `In re Review of the Determination by the Committee on the Unauthorized Practice of Law` | 192 N.J. 64 | N.J. | 2007-06-21 |

**Edge cases:**

- **Petition for Review in immigration practice has the OPPOSITE form.** Federal circuit court immigration appeals are captioned `[Petitioner] v. [Attorney General]` (e.g., `Avila v. Attorney General United States of America, 82 F.4th 250 (3d Cir. 2023)`, `Rivas-Duran v. Barr, 927 F.3d 26 (1st Cir. 2019)`). The "petition for review" is the procedural posture, not the caption. The existing `V_CASE_NAME_REGEX` already handles these correctly.
- **State-court "Petition for Review" or "Review of Determination"** is its own form — extremely state-specific (New Jersey, Pennsylvania, Minnesota). Low cross-jurisdictional value.

**Recommended priority:** **LOW.** Most "petition for review" captions in immigration / federal admin practice are `X v. AG` and do not need a new procedural-prefix. The state-court variant is sufficiently narrow that the existing `In re` prefix handles it acceptably (capturing the long phrase as the subject).

---

### 7. `In re Suspension of` / `In re Removal of` / `In re Investigation of` — LOW PRIORITY

**Canonical forms:**
- `In re Suspension of Attorneys` (Arkansas — annual bar-fee non-payment)
- `In re Investigation of Burglary & Theft` (New Jersey — grand jury investigation)
- `In re Removal of Sites` / `In re Removal of Human Remains` (Ohio, Missouri)
- `In re Adjudication of Existing Rights` (Montana water-rights)
- `In re Inquiry of [Judge X]` (Montana, Utah — judicial-conduct)

**Real corpus examples:**

| Caption | Reporter | Court | Date |
|---|---|---|---|
| `In Re Suspension of Attorneys Who Failed to Pay 2025 Annual Attorney-License Fee` | 2025 Ark. 59 | Ark. | 2025-05-01 |
| `In re Investigation of Burglary & Theft` | 203 A.3d 893 | N.J. | 2019-03-08 |
| `In Re Removal of Sites` | 170 Ohio App. 3d 272 | Ohio Ct. App. | 2006-12-22 |
| `In Re Removal of Human Remains` | 297 S.W.3d 616 | Mo. Ct. App. | 2009-11-10 |
| `In Re Inquiry of Jb` | 138 P.3d 427 | Mont. | 2006-06-06 |
| `In Re Inquiry of a Judge Steed` | 2006 UT 10 | Utah | 2006-02-24 |
| `In Re Adjudication of Existing Rights` | 1999 MT 202 | Mont. | 1999-08-30 |

**Recommended priority:** **DEFER (Out of Scope).** These are state-specific and the existing `In re` prefix handles them adequately. Adding them would yield only marginal precision gains. Tracked as observations, not action items.

---

### 8. Hyphenated-Initials Respondent Names (`Matter of A-B-`) — NOT A PREFIX PROBLEM

**Form:** `Matter of A-B-, NN I&N Dec. NNN (BIA YYYY)`

**Status:** **Already tracked as issue #244.** This is *not* a procedural-prefix gap — the existing `Matter of` prefix is matched. The problem is in the **subject capture** afterward, where the backward-search heuristic treats `A-B-` as a multi-token sequence and truncates at the first hyphen.

**Real corpus examples** (verified via CourtListener — BIA-published decisions in the `I. & N. Dec.` reporter):

| Subject Form | Reporter Cite | Type | Notes |
|---|---|---|---|
| `Matter of A-B-` | 27 I&N Dec. 316 (A.G. 2018) | 2-letter | Sessions's landmark asylum decision |
| `Matter of A-B-` | 28 I&N Dec. 199 (A.G. 2021) | 2-letter | A-B-II |
| `Matter of A-B-` | 28 I&N Dec. 307 (A.G. 2021) | 2-letter | A-B-III |
| `Matter of A-C-A-A-` | 28 I&N Dec. 84 (A.G. 2020) | 4-letter | Asylum frivolous filings |
| `Matter of A-R-C-G-` | 26 I&N Dec. 388 (BIA 2014) | 4-letter | Domestic violence asylum precedent |
| `Matter of L-E-A-` | 27 I&N Dec. 581 (A.G. 2019) | 3-letter | Family-based asylum |
| `Matter of E-F-H-L-` | 26 I&N Dec. 319 (BIA 2014) | 4-letter | El Salvadoran asylum |
| `Matter of E-R-A-L-` | 27 I&N Dec. 767 (BIA 2020) | 4-letter | Asylum class |
| `Matter of M-E-V-G-` | 26 I&N Dec. 227 (BIA 2014) | 4-letter | PSG analysis |
| `Matter of M-R-M-S-` | 28 I&N Dec. 757 (BIA 2023) | 4-letter | Modern PSG |
| `Matter of W-G-R-` | 26 I&N Dec. 208 (BIA 2014) | 3-letter | PSG class |
| `Matter of S-O-G- & F-D-B-` | 27 I&N Dec. 462 (BIA 2018) | Multi-respondent (joined `&`) |
| `Matter of S-S-F-M-` | 29 I&N Dec. 207 (A.G. 2025) | 4-letter | Bondi reinstatement of A-B- |
| `Matter of R-E-R-M- & J-D-R-M-` | 29 I&N Dec. 202 (A.G. 2025) | Multi-respondent |
| `Matter of Garcia` | 25 I&N Dec. 332 (BIA 2010) | Non-anonymized surname |
| `Matter of Jurado-Delgado` | 24 I&N Dec. 29 (BIA 2006) | Hyphenated surname (real name) |
| `Matter of Eslamizar` | 23 I&N Dec. 684 (BIA 2004) | Non-anonymized surname |
| `Matter of Ozkok` | 19 I&N Dec. 546 (BIA 1988) | Non-anonymized surname |
| `Matter of THAKKER` | 28 I&N Dec. 843 (BIA 2024) | Non-anonymized surname (capitalized) |
| `Matter of CRUZ-VALDEZ` | 28 I&N Dec. 326 (A.G. 2021) | Non-anonymized hyphenated |
| `Matter of MAYORGA IPINA` | 29 I&N Dec. 110 (BIA 2025) | Non-anonymized two-word |
| `Matter of BAEZA-GALINDO` | 29 I&N Dec. 1 (BIA 2025) | Non-anonymized hyphenated |
| `In re Rivera-Valencia` | 24 I&N Dec. 484 (BIA 2008) | `In re` form, hyphenated |
| `In re Cuellar-Gomez` | 25 I&N Dec. 850 (BIA 2012) | `In re` form, hyphenated |

**Federal-court citation patterns** (from CA3 *Avila v. AG*, 82 F.4th 250 (3d Cir. 2023) opinion text):
- `Matter of A-B-, 28 I. & N. Dec. 307, 308 (A.G. 2021) (A-B-III) (quoting A-B-II, 28 I. & N. Dec. at 200)`
- `Matter of Garcia, 25 I & N Dec. 332, 335-36 (BIA 2010)`
- `Matter of M-E-V-G-, 26 I. & N. Dec. 227, 239-40 (BIA 2014)`
- `Matter of W-G-R-, 26 I. & N. Dec. at 215`
- `Matter of Eslamizar, 23 I & N Dec. at 686-87`
- `In re Rivera-Valencia, 24 I. & N. Dec. 484 (BIA 2008)`
- `In re Cuellar-Gomez, 25 I. & N. Dec. 850 (BIA 2012)`

**Short-form references in body text:** Federal opinions liberally use roman-numeral suffixes (`A-B-II`, `A-B-III`) and dropped-citation forms (`Matter of A-B-, 28 I. & N. Dec. at 200`) as shortform references. These are out of scope for this audit but should be handled by eyecite's shortform / supra resolver.

**Recommended priority:** **HIGH — but separate work item.** Implement per issue #244 by adjusting party-name capture to walk consecutive `[A-Z]-` token pairs, not by adding to the procedural-prefix list.

---

### 9. EOIR / BIA Citation-Manual Findings

Based on the U.S. Department of Justice EOIR citation appendices (Appx G, Appx I) and BIA Practice Manual references found via web search:

**Precedent decisions** — The BIA's "Cite as" format is **`Matter of [Surname or Initials], NN I&N Dec. NNN (BIA YYYY)`** for Board-level precedents and **`Matter of [Name], NN I&N Dec. NNN (A.G. YYYY)`** for Attorney General precedential decisions. The phrase "Matter of" is *always* used for published precedent; "In re" is not.

**Hyphenated-initials convention:**
- Used for **all asylum and criminal-immigration respondents** since the 1990s to preserve respondent confidentiality.
- Initials drawn from the respondent's full name (first, middle, last), separated by hyphens, with a trailing hyphen.
- Multi-respondent cases joined with `&`: `Matter of S-O-G- & F-D-B-`.
- For unpublished decisions, the citation format is more detailed: `J-J-S-, AXXX-XXX-789 (BIA Dec. 20, 2020)` — but the **case caption itself** still uses `[Initials]-`.
- *Note:* Per EOIR style, `"Matter of"` is reserved for *published* (precedential) decisions. Unpublished decisions are cited with just the initials. eyecite encounters both in real federal-court opinions, but only the published form needs procedural-prefix support.

**Older `In re` form** — Federal district courts in naturalization cases historically used `In re Petition for Naturalization of X` and `In re Naturalization of X`. The BIA itself never uses `In re` for its own decisions, but federal courts of appeals reviewing BIA decisions sometimes use `In re X` as a shortened cross-reference to a BIA precedent (e.g., `In re Rivera-Valencia` from the CA3 *Avila* opinion).

**No equivalent `Ex parte` form in BIA practice** — Immigration cases are not styled `Ex parte X` (that form is reserved for state habeas-style proceedings).

---

### 10. Other Administrative Agencies — Caption Form Reference

For completeness, here is how each administrative agency caption maps to the existing prefix coverage:

| Agency | Canonical Caption | Existing Prefix | Gap? |
|---|---|---|---|
| **BIA / EOIR** | `Matter of [Initials]-` or `Matter of [Surname]` | `Matter of` (covered) | No prefix gap; #244 party-name issue |
| **A.G.** | `Matter of [Name]` | `Matter of` (covered) | None |
| **FCC** | `In re Application of [Licensee]` or `Applications of [Licensee]` | `Application of`, `In re` (partial) | `In re Application of` could be added for attribution precision |
| **NLRB** | `[Company Name]` (no procedural prefix typically) — e.g., `Cemex Construction Materials Pacific, LLC, 372 NLRB No. 130 (2023)` | N/A — usually styled as direct party name | None |
| **FERC** | `[Company Name, Order No. NNN, NNN FERC ¶ NN,NNN]` | N/A — direct party name | None |
| **SEC** | `In the Matter of [Respondent]` or `[Respondent]` direct | `In the Matter of` (covered) | None |
| **FTC** | `In the Matter of [Company]` | `In the Matter of` (covered) | None |
| **FDIC** | `In the Matter of [Bank Failure]` | `In the Matter of` (covered) | None |
| **USCG ALJ** | `In re Complaint of [Mariner]` or `[Mariner Name]` | `In re` (partial) | `In re Complaint of` could be added |
| **TTAB/PTAB** | `[Mark]`, `[Patent No.]`, opposition/IPR docket | N/A — docket-based | Out of scope |
| **NLRB ALJ** | `[Employer], JD(NY)-NN-YY` | N/A — direct party name | None |
| **Federal Maritime Comm'n** | `In re Complaint of [Vessel Operator]` | `In re` (partial) | `In re Complaint of` could be added |
| **District Ct. Naturalization** | `In re Petition for Naturalization of [Petitioner]` | `In re` (partial) | **PRIMARY GAP** — add `In re Petition for Naturalization of`, `In re Naturalization of` |

**Key observation:** Most major federal agencies (NLRB, FERC, SEC, FTC) don't use "procedural-prefix" captions at all in their reported decisions — they use the direct party name or a docket-style designation. The agencies that DO use procedural prefixes (BIA, A.G., FCC, USCG, FMC, federal district courts in naturalization) are well-covered or have narrow gaps addressable by 2-3 specific additions.

---

## Recommended Action

**Proposed additions in priority order** (to be inserted in the `PROCEDURAL_PREFIX_REGEX` regex on line 282-283 and parallel `proceduralPrefixes` array on line 1511-1528, maintaining longest-prefix-first ordering):

### Tier 1 (high-impact, well-attested, low FP risk)

1. **`In re Petition for Naturalization of`** — large historical corpus (>100 reported opinions), strict phrasing minimizes false positives. Should be **first** in the alternation (longest variant of `In re ... of` family).

2. **`In re Naturalization of`** — sibling form to #1 with another >50 reported opinions. Should appear **after** #1 but **before** generic `In re`.

3. **`Petition for Naturalization of`** — captures the form without leading `In re` (`Petition for Naturalization of Clarino, 691 F. Supp. 193 (C.D. Cal. 1988)`). Strict phrasing, very low FP risk. Should appear before generic `Petition of`.

### Tier 2 (precision improvements)

4. **`In re Application of`** — promotes precision over the existing `Application of` match by absorbing the `In re` ceremonial portion. Lower urgency since the case-name body is already extracted correctly, just with a less-accurate prefix.

5. **`In re Complaint of`** — captures the maritime/admiralty and judicial-misconduct variant. Limited corpus but well-defined.

### Tier 3 (defer)

6. **`In re Application for`** — too many sub-types (`Change of Name`, `Tax Deed`, `Search Warrant`) with variable subjects; existing `In re` already provides acceptable extraction.

7. **`In re Petition for Review of`** — narrow state-court corpus; federal immigration practice uses `X v. AG` form instead.

### Not a procedural-prefix item (already tracked)

8. **`Matter of A-B-` style hyphenated initials (#244)** — Implement separately as a party-name capture enhancement. The procedural-prefix regex already matches `Matter of`; the work is in the subject extractor.

---

## Proposed Regex Patch (Reference Only — Not For Direct Application)

```typescript
// Updated PROCEDURAL_PREFIX_REGEX (line 282-283) — Tier 1 additions only:
const PROCEDURAL_PREFIX_REGEX =
  /\b(In\s+re\s+Petition\s+for\s+Naturalization\s+of|In\s+the\s+Matter\s+of|In\s+re\s+Marriage\s+of|In\s+re\s+Naturalization\s+of|In\s+the\s+Interest\s+of|Petition\s+for\s+Naturalization\s+of|Commonwealth\s+ex\s+rel\.|In re|Ex parte|Matter of|Estate of|State ex rel\.|United States ex rel\.|Application of|On Petition of|Petition of|Adoption of|Conservatorship of|Guardianship of)\s+([A-Za-z0-9\s.,'&()/-]+?)\s*,\s*$/i

// Updated proceduralPrefixes array (line 1511-1528) — Tier 1 additions only:
const proceduralPrefixes = [
  "In re Petition for Naturalization of",  // NEW — longest first
  "In the Matter of",
  "In re Marriage of",
  "In re Naturalization of",                // NEW
  "In the Interest of",
  "Petition for Naturalization of",         // NEW
  "Commonwealth ex rel.",
  "In re",
  "Ex parte",
  "Matter of",
  "State ex rel.",
  "United States ex rel.",
  "Application of",
  "On Petition of",
  "Petition of",
  "Adoption of",
  "Conservatorship of",
  "Guardianship of",
  "Estate of",
]
```

### Test Fixtures (Verbatim from Corpus)

```typescript
// Should be added to tests/extract/extractCase.test.ts under
// "procedural prefix" describe block.

// In re Petition for Naturalization of
expect(extract("In re Petition for Naturalization of Haniatakis, 246 F. Supp. 545 (W.D. Pa. 1965).")[0].caseName)
  .toBe("In re Petition for Naturalization of Haniatakis")

expect(extract("In re Petition for Naturalization of Charles Peter Duncan, 713 F.2d 538 (9th Cir. 1983).")[0].caseName)
  .toBe("In re Petition for Naturalization of Charles Peter Duncan")

// In re Naturalization of
expect(extract("In re Naturalization of Vafaei-Makhsoos, 597 F. Supp. 499 (D. Minn. 1984).")[0].caseName)
  .toBe("In re Naturalization of Vafaei-Makhsoos")

expect(extract("In re Naturalization of Fang Lan Dankowski, 478 F. Supp. 1203 (D. Guam 1979).")[0].caseName)
  .toBe("In re Naturalization of Fang Lan Dankowski")

// Petition for Naturalization of
expect(extract("Petition for Naturalization of Clarino, 691 F. Supp. 193 (C.D. Cal. 1988).")[0].caseName)
  .toBe("Petition for Naturalization of Clarino")

// Tier 2 (if added):
// In re Application of
expect(extract("In re Application of Ohio Power Co., 2025 Ohio 3034.")[0].caseName)
  .toBe("In re Application of Ohio Power Co.")

// In re Complaint of
expect(extract("In re Complaint of Foss Maritime Co., 114 F. Supp. 3d 452 (W.D. Ky. 2015).")[0].caseName)
  .toBe("In re Complaint of Foss Maritime Co.")
```

---

## Sources

- **U.S. Department of Justice, EOIR Policy Manual, Appendix G — Citations** (cited via web search; HTTP 403 on direct fetch). https://www.justice.gov/eoir/policy-manual-eoir/part-VII/appendices/g
- **U.S. Department of Justice, EOIR Policy Manual, Appendix I — Citations**. https://www.justice.gov/eoir/eoir-policy-manual/appendices-i
- **BIA Practice Manual (PDF)**. https://www.justice.gov/eoir/page/file/1284741/dl?inline=
- **BIA decision corpus** — verified via CourtListener REST API (>500 published BIA decisions in `I&N Dec.` reporter sampled).
- **Federal court corpus** — verified via CourtListener REST API search (12M opinions). Specific examples cross-checked in *Avila v. Attorney General*, 82 F.4th 250 (3d Cir. 2023) (cluster id 9426283, opinion id 9839908) for inline-citation patterns.
- **Matter of A-B-, 27 I&N Dec. 316 (A.G. 2018)** — direct opinion text fetched from CourtListener (cluster id 6207421, opinion id 6073993), confirming `Matter of A-B-, Respondent` as the canonical caption form.
- **Matter of A-B- considerations | October 2018** (ILRC). https://www.ilrc.org/sites/default/files/resources/matter_a_b_considerations-20180927.pdf
- **NLRB Style Manual**. https://www.nlrb.gov/sites/default/files/attachments/pages/node-174/stylemanual.pdf
- **Tarlton Law Library — Administrative Materials Bluebook Guide**. https://tarlton.law.utexas.edu/bluebook-legal-citation/how-to-cite/administrative-material
- **Citations for Submissions to Immigration Court** (NY Visa Lawyer summary of BIA Citation Guidelines). https://www.nyvisalawyer.com/immigration/citations-for-submissions-to-immigration-court/

---

## Cross-References

- Issue **#244** — BIA `Matter of A-B-` hyphenated initials (separate party-name work item).
- Issue **#242** — Procedural prefix expansion (Commonwealth ex rel., In the Interest of, Adoption of, etc.) — landed as 13a68db.
- Prior research: `docs/research/2026-05-10-citation-abbrevs-federal-specialty.md` (Federal specialty courts, including BIA caption discussion at lines 117-135).
- Prior research: `docs/research/2026-05-10-citation-style-quirks.md` (cross-jurisdictional style quirks audit).
- Source file under modification: `src/extract/extractCase.ts` lines 282-283 (regex) and 1511-1528 (parallel array).
- Test file: `tests/extract/extractCase.test.ts` (existing procedural-prefix coverage at lines 691-735 and 1533-1607).
