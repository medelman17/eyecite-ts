# Procedural-Prefix Case Captions: Family / Juvenile / Adoption / Custody / Parentage / Name Change

> Research target: U.S. federal and state procedural-prefix forms used in caption phrases for family-law / juvenile / adoption / custody / parentage / name-change matters that are **not yet recognized** by `PROCEDURAL_PREFIX_REGEX` and `proceduralPrefixes` in `src/extract/extractCase.ts`.
>
> As of 2026-05-11, the regex covers 16 prefixes; recognized family-adjacent prefixes are `In re Marriage of`, `In the Interest of`, `Adoption of`, `Guardianship of`. This document identifies **13 additional family-domain procedural prefixes** worth recognizing, organized by priority.

## Summary

Family-law captions in U.S. appellate practice cluster around **three structural patterns**: (1) `In re [State-Specific Topic] of [Initials/Name]`, (2) `[Bare Topic] of [Initials/Name]` (no `In re`), and (3) `Matter of [Topic] of [Initials/Name]`. The eyecite-ts current set handles the most common generic forms (`In re`, `Matter of`, `In the Matter of`, `Adoption of`, `Guardianship of`) but misses **state-codified topic-prefix forms** that have produced hundreds of thousands of published opinions across the past 50 years.

**Top-level findings:**

1. **Minnesota's `In re Welfare of` / `In the Matter of the Welfare of`** is the single highest-volume gap. Minnesota courts use this caption for nearly every juvenile and child-protection appeal; both Court of Appeals and Supreme Court use it. The current `In re` prefix would match but only capture `Welfare` as the subject — a parser-level loss of structured prefix data, not a complete failure.
2. **Washington's `In re Dependency of`** is the second-highest gap, codified in RCW 13.34 and used in every dependency appeal.
3. **`In re Termination of Parental Rights to`** / **`...of`** is used across Wisconsin, Arizona, South Carolina, Vermont, and others, accounting for thousands of TPR appeals.
4. **Massachusetts uses two unique bare forms** — `Care and Protection of [Name]` and `Adoption of [Name]` (no `In re` prefix). The existing `Adoption of` already handles the Mass form; `Care and Protection of` is a new family-court prefix.
5. **Colorado's `In re Parental Responsibilities of` / `...Concerning`** is the codified post-Marriage-Dissolution-Act caption for what other states call custody.
6. **`In re Paternity of`** (Indiana, Wisconsin, others) and **`In re Parentage of`** (California, Illinois, Washington) are distinct but parallel forms for establishing parent-child relationships.
7. **`In re Custody of`** is used in Pennsylvania, Wisconsin, Washington (RCW 26.10), and Vermont — distinct from but overlapping with `Marriage of` and `Parental Responsibilities of`.
8. **`In re Name Change of`** is the standard caption in Indiana, Ohio, Florida, and most states.
9. **Initials-only party names** (`A.B.`, `J.K.`, `R.E.`, hyphenated `H.S.H.-K.`, multi-child `M.R.S. and N.M.M.`) dominate juvenile captions and interact with the regex by sitting in the `[A-Za-z0-9\s.,'&()/-]+?` body capture group, which already accepts dots and ampersands. No regex change is required for initials; the prefix change is.

**Recommended priority additions (highest to lowest):**

| # | Prefix | Volume | States |
|---|---|---|---|
| 1 | `In re Welfare of` | Very high | MN, WA (older cases) |
| 2 | `In re Dependency of` | High | WA |
| 3 | `In re Termination of Parental Rights to` | High | WI, SC, VT |
| 4 | `In re Termination of Parental Rights of` | High | WI, NE, NJ |
| 5 | `In re Termination of Parental Rights` (suffix-less) | High | AZ ("as to"), Many |
| 6 | `In re Paternity of` | Medium-High | IN, WI, IL |
| 7 | `In re Parentage of` | Medium-High | CA, IL, WA, NJ |
| 8 | `In re Custody of` | Medium-High | WA (older), VT, PA, WI |
| 9 | `In re Parental Responsibilities of` | Medium | CO |
| 10 | `In re Name Change of` | Medium | IN, OH, NJ, FL |
| 11 | `Care and Protection of` | Medium | MA |
| 12 | `In re Adoption of` (variant explicit) | Medium-Low | PA, OH, KS, OK, MN |
| 13 | `In re Parental Rights as to` | Medium-Low | AZ, NV |

The current regex `Adoption of`, `Guardianship of`, `Conservatorship of` already match `In re Adoption of X` only via the prior `In re` alternation, which leaves the parser thinking the prefix is `In re` and the subject is `Adoption of X` — losing the structured detail. Adding explicit `In re Adoption of`, `In re Guardianship of`, etc. is recommended **after** the longer state-specific prefixes are in place. See the regex-ordering section.

## Per-Prefix Research

### 1. `In re Welfare of` (and `In the Matter of the Welfare of`)

**Canonical forms:**
- `In re Welfare of [Initials/Name]` — most common in Minnesota
- `In the Matter of the Welfare of [Initials/Name]` — the *official* Minnesota Supreme Court caption form
- `In the Matter of the Welfare of the Child of: [Initials]` — Minnesota CHIPS case form
- `In the Matter of the Welfare of the Children of: [Initials] and [Initials]` — multi-child variant

**Common variants:** `In re Welfare of` (short journalistic), `Matter of Welfare of` (rare), `Welfare of` (very rare standalone). Minnesota's appellate caselaw uses both `In re Welfare of` (Justia / FindLaw cleaned-up) and the official `In the Matter of the Welfare of [Initials], Child` form (when extracted from PDFs).

**Jurisdictions / codification:**
- **Minnesota**: Codified by reference to Minn. Stat. ch. 260 (juvenile court) and Minn. R. Juv. Prot. P. The Minnesota Court of Appeals issues an `In the Matter of the Welfare of`-captioned opinion almost weekly.
- **Washington** (older): `In re Welfare of Sego`, 82 Wn.2d 736, 513 P.2d 831 (1973) — landmark. Washington shifted to `In re Dependency of` after RCW 13.34's modernization, but `In re Welfare of` remained for some categories.
- **Maryland** (rare): `In re Welfare of Q.B.` (CINA matters), though Maryland more commonly uses `In re [Initial]`.

**Subject matter:** CHIPS (Children in Need of Protection or Services), termination of parental rights, juvenile delinquency, foster placement, custody transfer to non-parent.

**Real corpus examples (verbatim):**
- `In the Matter of the Welfare of: G. M. D., Child` — Minn. Ct. App. A23-1357 (Mar. 11, 2024)
- `In the Matter of the Welfare of: D. M. B., Child` — Minn. Ct. App. A23-1363 (Apr. 29, 2024)
- `In the Matter of the Welfare of the Child of: T.M.A. and M. J. R.` — Minn. Ct. App. (Aug. 29, 2024)
- `In the Matter of the Welfare of J. D. C., Child` — Minn. Ct. App. A23-1986 (Aug. 13, 2024)
- `In the Matter of the Welfare of the Children of: M. R. S. and N. M. M., Parents` — Minn. Ct. App. A24-0444 (2024)
- `In the Matter of the Welfare D.J.F.-D.` — Minn. S. Ct. A22-0654 (2024)
- `In the Matter of the Welfare of the Child of: K. O. and D. W., Commissioner of Human Services, Legal Custodian` — Minn. Ct. App. A23-1199 (2024)
- `In re Welfare of M.A.B.` — Minn. Ct. App. (Jan. 22, 2024)
- `In re Welfare of the Child of: R.K.` — Minn. S. Ct. (2017)
- `In re Welfare of Sego`, 82 Wn.2d 736, 513 P.2d 831 (1973) — Washington Supreme Court
- `In re Welfare of A.W.`, 182 Wn.2d 689, 344 P.3d 1186 (2015) — Washington Supreme Court

**Initials-only interaction:** Pervasive — virtually all Minnesota juvenile captions use initials. Common patterns:
- Single child: `M.A.B.`, `J.D.C.`, `D.M.B.`
- Hyphenated initials: `D.J.F.-D.` (compound surname)
- Multi-child: `M.R.S. and N.M.M.` (parents linked by `and`)
- Possessive form: `the Child of: T.M.A. and M. J. R.`
- Space-separated initials: `J. D. C.` (with spaces — official Minnesota PDF style)

The regex body `[A-Za-z0-9\s.,'&()/-]+?` already accepts dots, hyphens, ampersands, and the `&` separator, so initials work. But the Minnesota multi-parent caption `[Initials] and [Initials]` will be captured up to the trailing comma fine.

**Recommended priority:** **HIGH** — Minnesota is one of the most prolific producers of family-law appellate decisions; missing this prefix is the single most consequential gap.

**Ordering caveat:** `In the Matter of the Welfare of` must be listed **before** `In the Matter of` (which is already first) — Wait. Actually `In the Matter of` is currently the first prefix, and the regex uses non-anchored alternation. `In the Matter of` would short-circuit and capture `In the Matter of` + `the Welfare of X, Child`. To correctly recognize the welfare-specific prefix, `In the Matter of the Welfare of` must be added **before** `In the Matter of`. Likewise, `In re Welfare of` must be added before `In re`.

---

### 2. `In re Dependency of`

**Canonical form:** `In re Dependency of [Initials]`

**Common variants:** `In the Matter of the Dependency of`, `Dependency of [Initials]` (bare, very rare in Wash. captions).

**Jurisdictions / codification:**
- **Washington** — Codified at RCW 13.34 (Juvenile Court Act, Dependency). Standard caption for every dependency appeal in WA Courts of Appeals and Supreme Court.

**Subject matter:** Dependency findings (abuse / neglect / abandonment), shelter care, dispositional orders, permanency plans, foster placement.

**Real corpus examples:**
- `In re Dependency of A.T.`, 2024 Wash. App. — FindLaw 115854947
- `In re Dependency of Q.S.`, 22 Wn. App. 2d 586, 608, 515 P.3d 978 (2022)
- `In re Dependency of Ca.R.`, 191 Wn. App. 601, 627, 365 P.3d 186 (2015)
- `In re Dependency of A.W. and A.H.` — WA Ct. App. Div. III (cited in opinion 403734)
- `In re the Dependency of: [Initials]` — WA Ct. App. (caption with `the` insertion, opinion 712667)

**Initials-only interaction:** Heavy use of initials, often punctuated (e.g., `Ca.R.` — case-sensitive first initial only of second name).

**Recommended priority:** **HIGH** — Washington's dependency dockets are very high-volume.

**Ordering caveat:** Must precede `In re`.

---

### 3. `In re Termination of Parental Rights to` / `... of`

**Canonical forms:**
- `In re Termination of Parental Rights to [Initials/Name]` — Wisconsin, South Carolina, Vermont, others
- `In re Termination of Parental Rights of [Initials/Name]` — Wisconsin (alt), Nebraska
- `In re Termination of Parental Rights as to [Initials/Name]` — Arizona, Nevada (statutory wording)
- `In re Termination Parental Rights as to [Initials/Name]` — Arizona variant (Justia normalizes "of" out)

**Common variants:** `Matter of Termination of Parental Rights`, `In re TPR`, `In re T.P.R.` (rare abbreviations).

**Jurisdictions:**
- **Wisconsin** — Wis. Stat. § 48.41–.46. Standard caption for every TPR appeal.
- **Arizona** — A.R.S. § 8-531 et seq. uses `as to`.
- **Nevada** — NRS Ch. 128 (`Parental Rights as to`).
- **South Carolina** — S.C. Code Ann. § 63-7-2510 et seq.
- **Vermont** — 33 V.S.A. § 5316.
- **New Jersey** — generally uses `In the Matter of the Adoption of` for the termination flavor coupled with adoption; pure TPR less common.
- **Indiana** — `In the Matter of the Termination of the Parent-Child Relationship of` (very long; see below).
- **Wisconsin Court of Appeals** issues weekly TPR opinions in this format.

**Subject matter:** Involuntary or voluntary termination of parental rights (statutory grounds: abandonment, unfitness, failure to assume parental responsibility, dangerous behavior, etc.).

**Real corpus examples:**
- `In re Termination of Parental Rights to K.S.`, 2023AP1404 (Wis. Ct. App. 2023)
- `In re the Termination of Parental Rights to N.H.`, 2023AP1229-1232 (Wis. Ct. App. 2023)
- `In re Termination of Parental Rights to E.M.G.`, FindLaw 116702439 (Wis. Ct. App. 2024)
- `In re Termination of Parental Rights to S.R.R.`, FindLaw 117809995 (Wis. Ct. App. 2025)
- `In re Termination Parental Rights as to B.W.`, CV-24-0079-PR (Ariz. 2025)
- `In re Termination of Parental Rights as to L.S.`, 2-CA-JV-2025-0011 (Ariz. Ct. App. Div. II)
- `In re Parental Rights as to R.A.S.`, 141 Nev. Adv. Op. 20 (Apr. 24, 2025)
- `In re Termination of Parental Rights of J.L.F.`, 91-1122 (Wis. Ct. App. Apr. 2, 1992)

**Initials-only interaction:** Universal — all initials, often `K.S.`, `B.W.`, `R.A.S.`. The `as to` form contains the connector `as` which is in `PARTY_NAME_CONNECTORS` already, but for prefix recognition it's only needed as part of the prefix literal.

**Indiana note:** Indiana uses the verbose form `In the Matter of the Termination of the Parent-Child Relationship of [Name]` — much longer. Indiana also uses `In re the Termination of`. A short-form sub-prefix `In re Termination of` could match Indiana too; whether to add the very long Indiana form is a coverage call.

**Recommended priority:** **HIGH** — Volume across WI, SC, VT, AZ, IN. Most-used family caption after the Welfare/Dependency forms.

**Ordering caveat:** All three forms (`...to`, `...of`, `...as to`) must precede `In re`. Within the group, the *longer* AZ form `In re Termination of Parental Rights as to` must precede the bare `In re Termination of Parental Rights` form if both are added; otherwise the bare form captures up to and including `Parental Rights` and then leaves `as to B.W.` as the subject (not a critical failure, but a slight subject-extraction quality drop).

---

### 4. `In re Paternity of`

**Canonical form:** `In re Paternity of [Initials]`

**Variants:** `In re the Paternity of`, `Matter of Paternity of` (rare), `In re the matter of the paternity of` (long form).

**Jurisdictions:**
- **Indiana** — Ind. Code § 31-14. Standard.
- **Wisconsin** — Wis. Stat. § 767.80 et seq.
- **Illinois** — 750 ILCS 46 (Illinois Parentage Act of 2015 partially superseded `Paternity of` with `Parentage of`).
- **Washington** — RCW 26.26A (Uniform Parentage Act adopted).
- **Indiana Court of Appeals** issues paternity opinions weekly.

**Subject matter:** Establishment of paternity, paternity disestablishment, paternity-related child support modifications.

**Real corpus examples:**
- `In re Paternity of M.R.`, 778 N.E.2d 861 (Ind. Ct. App. 2002)
- `In re the Paternity of M.R.` — alt form, same case
- (Indiana Court of Appeals: dozens of similar captions per year)

**Initials-only interaction:** Universal; usually 2-3 initials (the child).

**Recommended priority:** **MEDIUM-HIGH** — Mid-volume but well-established across multiple states.

**Ordering caveat:** Must precede `In re`. Note that `In re Paternity of` overlaps semantically with `In re Parentage of`; both are needed separately because state codes use distinct terms.

---

### 5. `In re Parentage of`

**Canonical form:** `In re Parentage of [Initials]`

**Variants:** `In re the Parentage of`, `Matter of Parentage of`.

**Jurisdictions:**
- **California** — Fam. Code § 7600 et seq. (Uniform Parentage Act). California uses both `In re Parentage of` and `[Petitioner] v. [Respondent]` styles for parentage actions, depending on procedural posture.
- **Illinois** — 750 ILCS 46 (Illinois Parentage Act of 2015).
- **Washington** — RCW 26.26A.
- **New Jersey** — N.J.S.A. 9:17.

**Subject matter:** Establishment of legal parentage (including for same-sex couples, surrogacy, assisted reproduction), determination of de facto parent status.

**Real corpus examples:**
- `In re Parentage of Scarlett Z.-D.`, 2015 IL 117904 — Illinois Supreme Court
- `In re Parentage of A.C.`, 2024 IL App (1st) 232052 — Illinois App. Ct. 1st Dist.
- `In re Parentage of I.I., a Minor`, 2016 IL App (1st) 160071 — Illinois App. Ct. 1st Dist.

**Initials-only interaction:** Pervasive; sometimes hyphenated (`Scarlett Z.-D.`).

**Recommended priority:** **MEDIUM-HIGH** — Growing volume as Uniform Parentage Act adopted by more states.

**Ordering caveat:** Must precede `In re`.

---

### 6. `In re Custody of`

**Canonical form:** `In re Custody of [Initials/Name]`

**Variants:** `In re the Custody of`, `Custody of [Name]` (bare; rare), `In re Child Custody of` (very rare).

**Jurisdictions:**
- **Washington** — RCW 26.10 (non-parent custody; superseded by RCW 26.10 in many flavors). Older WA case `In re Custody of H.S.H.-K.`, 193 Wis. 2d 649 (1995) — landmark Wisconsin parentage-like custody case.
- **Pennsylvania** — Sometimes `In re N.E.M., A Child in Custody` (No. 9 EAP 2023, Pa. S. Ct. 2024); but PA more often uses bare adversarial captions like `[Parent] v. [Parent]` for custody.
- **Wisconsin** — `In re Custody of H.S.H.-K.`, 533 N.W.2d 419 (Wis. 1995) — landmark for third-party visitation.
- **Vermont, Maryland, others.**

**Subject matter:** Non-parent custody actions, modifications, third-party custody, post-relinquishment custody.

**Real corpus examples:**
- `In re Custody of H.S.H.-K.`, 193 Wis. 2d 649, 533 N.W.2d 419 (1995) — landmark Wisconsin Supreme Court case on equitable parent doctrine
- `In re N.E.M., A Child in Custody`, No. 9 EAP 2023 (Pa. S. Ct. 2024)

**Initials-only interaction:** `H.S.H.-K.` example shows hyphenated multi-initial form (already handled by regex body).

**Recommended priority:** **MEDIUM-HIGH** — Lower direct volume than Welfare/Dependency/TPR but high-value individual decisions (landmark cases).

**Ordering caveat:** Must precede `In re`.

---

### 7. `In re Parental Responsibilities of` / `In re Parental Responsibilities Concerning`

**Canonical forms:**
- `In re Parental Responsibilities of [Initials]` — Colorado standard
- `In re Parental Responsibilities Concerning [Initials]` — Colorado alternate (post-2014 rewording)

**Jurisdictions:**
- **Colorado** — Colo. Rev. Stat. § 14-10-123 (Uniform Dissolution of Marriage Act, parental responsibilities allocation, replacing "custody" terminology). The codified state caption.

**Subject matter:** Allocation of parental responsibilities (legal decision-making and parenting time), modification, relocation.

**Real corpus examples:**
- `In re Parental Responsibilities of E.K.` — Colo. S. Ct. 22SA31 (2022)
- `In re the Parental Responsibilities of A.C.H. and A.F.` — Colo. Ct. App. Div. V (2019), FindLaw 1987234
- `In re the Parental Responsibilities Concerning S.Z.S.` — Colo. Ct. App. Div. I, 21CA1760 (2022)
- `In re Parental Responsibilities Concerning W.P.A.S.` — Colo. Lawyer summary
- `In re the Parental Responsibilities of A.R.L., a Child`, 2013 COA 170
- `In re the Parental Responsibilities of I.M., a Child`, 2013 COA 107
- `In re the Parental Responsibilities of L.K.Y. and J.R.Y., Children`, 2013 COA 108
- `In re Parental Responsibilities Concerning W.C.` — Colo. Ct. App., FindLaw 1895109

**Initials-only interaction:** Pervasive; sometimes multi-child (`A.C.H. and A.F.`, `L.K.Y. and J.R.Y.`).

**Recommended priority:** **MEDIUM** — Single-state but Colorado is high-volume and the alternative `Concerning` connective is unusual.

**Ordering caveat:** Must precede `In re`. Suggest adding both `In re Parental Responsibilities of` and `In re Parental Responsibilities Concerning` as separate alternatives in the regex (they share a long literal prefix but diverge after).

**Implementation note on `Concerning`:** This is the only place in the existing prefix set where a non-`of` connector follows the topic noun. Today's regex assumes `... of [Subject]`; the new alternation must allow `In re Parental Responsibilities Concerning [Subject]` as a parallel literal.

---

### 8. `In re Name Change of` (and variants)

**Canonical forms:**
- `In re Name Change of [Name]`
- `In re Change of Name of [Name]`
- `In re Name Change and Gender Change of [Initials]` — Indiana modern variant
- `In re Application for Change of Name of [Name]` — NJ form (very long)

**Jurisdictions:**
- **Indiana** — Ind. Code § 34-28-2.
- **Ohio** — R.C. § 2717.01. Ohio's caption is `In re Name Change of [Name]` or `In re Application for Change of Name of [Name]`.
- **Florida**, **New York**, **New Jersey** — petitions are filed in family court / probate / surrogate's; appellate review uses `In re Name Change of` or `In re Change of Name`.

**Subject matter:** Petitions for change of legal name (adults, minors), gender marker changes (modern variants combine name + gender).

**Real corpus examples:**
- `In re Name Change and Gender Change of R.E.`, No. 19A-MI-2562 (Ind. Ct. App. Mar. 12, 2020)
- `In re Name Change of C.L.F.`, 2022-Ohio-2300 — Ohio Ct. App. 10th Dist.
- `In re Johnson`, 4D18-695 (Fla. 4th DCA 2018) — note: omits the `Name Change of` topic

**Initials-only interaction:** Mixed — minor name changes use initials (`R.E.`, `C.L.F.`), adult petitions use full names.

**Recommended priority:** **MEDIUM** — Frequent but low individual stakes (each case is a brief opinion).

**Ordering caveat:** Must precede `In re`. The long Indiana variant `In re Name Change and Gender Change of` must precede the simpler `In re Name Change of`.

---

### 9. `Care and Protection of` (bare, no "In re")

**Canonical form:** `Care and Protection of [Name]`

**Jurisdictions:**
- **Massachusetts** — G. L. c. 119, § 24-29C. Massachusetts uniquely uses bare topic-only captions (no `In re`) for both adoption and care-and-protection proceedings.

**Subject matter:** Juvenile court care and protection cases (similar to dependency in WA, CHIPS in MN), often combined with TPR.

**Real corpus examples:**
- `Care and Protection of Jaylen`, 493 Mass. 798 (2024), SJC-13494
- `Care and Protection of Richard & others`, 456 Mass. 1002 (2010)
- `Care and Protection of M.C.`, 479 Mass. 246 (2018), 483 Mass. 444
- `Care and Protection of Charles`, 399 Mass. 324 (1987)
- `Care and Protection of Robert`, 408 Mass. 52 (1990)
- `Care and Protection of Perry`, 438 Mass. 1014 (2003)
- `Care and Protection of Georgette` — Mass. case
- `Care and Protection of Ollie`, 23-P-579 (Mass. App. Ct. June 6, 2024)
- `In re Care & Protection of a Minor` — Mass. S.J.C. 2023, SJC-13385 (Justia normalized with `In re` and `&`)

**Initials-only interaction:** Massachusetts uses pseudonyms (`Jaylen`, `Robert`, `Charles`, `Arianne`, `Ollie`) rather than initials — court-selected fake first names. This is the **only** prefix in the recommendation set where the body capture will look like a normal proper-noun rather than initials.

**Recommended priority:** **MEDIUM** — Massachusetts is a single state but a prolific appellate producer; the bare form is structurally unique.

**Ordering caveat:** Bare `Care and Protection of` does **not** require ordering relative to `In re` because it doesn't share that prefix. However, the alternation should still list it before the more general patterns to ensure the alternation engine matches it cleanly. Also note: a `Care and Protection of` prefix with a long capture body could be confused with the prose phrase "the care and protection of children" in commentary — but the regex anchors at the *start* of the case-name buffer (`^`) and ends at `\s*,\s*$`, so prose context can't trigger.

**Ambiguity with `&`:** Justia normalizes `Care and Protection of Richard & others` — the `&` is in the body capture group already (`[A-Za-z0-9\s.,'&()/-]+?`).

---

### 10. `In re Adoption of` (explicit form for non-bare jurisdictions)

**Canonical form:** `In re Adoption of [Initials/Name]`

**Jurisdictions where the `In re` prefix is mandatory:**
- **Kansas** — `In re Adoption of B.B.M.`, Kan. S. Ct. 100554 (2010); `In re Adoption of B.G.J.` (2006); `In re Adoption of Baby Boy B` (1994); `In re Adoption of S.E.B.` (1995)
- **Pennsylvania** — `In re Adoption of K.M.G.; A.M.G.; S.A.G.; J.C.C.`, 219 A.3d 682 (Pa. Super. 2019); `In re Adoption of A.G.R., a Minor` — 1223-MDA-2023 (Pa. Super. 2024)
- **Oklahoma** — `In re Adoption of K.P.M.A.`, 2014 OK 85 (Okla. 2014)
- **New Jersey** — `In the Matter of the Adoption of a Child by M.E.B. and K.N.` — App. Div. 2016 (note: NJ uses `In the Matter of` form already covered)
- **Ohio** — `In re Adoption of [Initials]`
- **Wisconsin, Michigan, others.**

**Note on Massachusetts and Pennsylvania:**
- Massachusetts uses the bare form `Adoption of Arianne` (already covered by the existing `Adoption of` prefix).
- Pennsylvania uses **both** the bare form `Adoption of: M.M.A., Appeal of: C.M.A.` (which has the unusual `:` separator and `Appeal of:` suffix) **and** `In re Adoption of: A.G.R., a Minor`. The bare PA form is already partially covered by `Adoption of`, but the `Appeal of: [Initials]` suffix is unique to PA caption style.

**Subject matter:** Adoption petitions, stepparent adoptions, agency adoptions, ICWA cases.

**Real corpus examples:**
- `In re Adoption of B.B.M.`, 290 Kan. 552, 232 P.3d 833 (2010)
- `In re Adoption of B.G.J.`, 281 Kan. 552 (2006)
- `In re Adoption of K.P.M.A.`, 2014 OK 85 (Okla. 2014)
- `In re Adoption of K.M.G.; A.M.G.; S.A.G.; J.C.C.`, 240 A.3d 1218 (Pa. Super. 2020) — multi-child
- `Adoption of: M.M.A., Appeal of: C.M.A.`, 1120-WDA-2023 (Pa. Super. 2024) — bare PA form with `Appeal of:` suffix
- `Adoption of Arianne`, 104 Mass. App. Ct. 716 (2024) — bare MA form
- `Adoption of Amari`, FindLaw 118328915 (Mass. Ct. App. 2026)
- `Adoption of Arlene` — Mass. SJC pseudonymous case
- `Adoption of Micah`, No. 23-P-1397 (Mass. App. Ct. 2025)

**Initials-only interaction:** Heavy use; PA uses literal punctuated multi-child (`K.M.G.; A.M.G.; S.A.G.; J.C.C.`). The `;` separator inside the body is **not** in the current body capture class `[A-Za-z0-9\s.,'&()/-]+?` — semicolons are missing. **This may need a regex body update**, but for the main prefix-recognition task, the prefix `In re Adoption of` itself can be added independently of the body class.

**Recommended priority:** **MEDIUM** — The existing `Adoption of` prefix already matches `In re Adoption of X` (via the `In re` alternation in current regex), but only the `In re` is captured as `proceduralPrefix`, with `Adoption of X` becoming the subject. Adding `In re Adoption of` explicitly upgrades the structured prefix recognition.

**Ordering caveat:** `In re Adoption of` must precede `In re`. Within the alternation, ordering against the existing `Adoption of` doesn't matter because the alternation is anchored at the start of the case name (`In re Adoption of X` only matches the `In re Adoption of` arm because `Adoption of X` doesn't have an `In re` prefix at position 0).

---

### 11. `In re Guardianship of` (explicit form)

**Canonical form:** `In re Guardianship of [Initials/Name]`

**Jurisdictions:**
- **Illinois** — `In re Guardianship of V.R.W.`, 2024 IL App (4th) 240363-U; `In re Guardianship of L.T.G., S.L.G., and I.J.G.` — Ill. S. Ct.
- **Nebraska** — `In re Guardianship of Tomas J., a minor child` — Neb. S. Ct.
- **Minnesota** — `In re Guardianship of N.E.F.`, CX-00-12 (Minn. Ct. App. 2000)
- **Connecticut** — `In re Zakai F.`, 336 Conn. 272 (2021) (note: CT drops the `Guardianship of` and uses just `In re Zakai F.`)

**Existing coverage:** `Guardianship of` is already in the list. As with `Adoption of`, the explicit `In re Guardianship of` form would upgrade prefix-extraction accuracy for IL, NE, MN, and others.

**Recommended priority:** **MEDIUM-LOW** — Same logic as `In re Adoption of`. Add for structured-extraction quality, not because of recognition failure.

**Ordering caveat:** Must precede `In re`.

---

### 12. `In re Conservatorship of` (explicit form)

**Canonical form:** `In re Conservatorship of [Name]`

**Jurisdictions:**
- **California** — `In re Conservatorship of [Surname]` is the California standard for adult conservatorship; coexists with `Conservatorship of [Surname]` (bare).
- **Other states** generally use `In re Conservatorship of` or `Matter of Conservatorship of`.

**Real corpus examples:** *(many California Court of Appeal decisions — Conservatorship of Wendland, 26 Cal. 4th 519 (2001) — though spans both adult-incapacity and minor-conservatorship contexts)*.

**Existing coverage:** `Conservatorship of` is already covered. Adding `In re Conservatorship of` is again an upgrade.

**Recommended priority:** **LOW** — Mostly an adult-incapacity caption (not strictly family law), but it appears in minor-conservatorship contexts too.

**Ordering caveat:** Must precede `In re`.

---

### 13. `In re Parental Rights as to` / `In re Parental Rights of`

**Canonical forms:**
- `In re Parental Rights as to [Initials]` — Nevada (NRS Ch. 128)
- `In re Parental Rights of [Initials]` — alternate Nevada / Arizona

**Jurisdictions:**
- **Nevada** — `In re Parental Rights as to R.A.S.`, 141 Nev. Adv. Op. 20 (2025)
- **Arizona** — sometimes uses the shorter `In re Parental Rights as to [Initials]` form when termination is not the primary issue (rare).

**Subject matter:** Establishment or modification of parental rights, not necessarily termination.

**Recommended priority:** **LOW** — Single-state and overlaps significantly with `In re Termination of Parental Rights as to` (which we've already recommended as higher priority).

**Ordering caveat:** Must precede `In re`.

---

## Recommended Action

**Apply the additions in this order** (sorted high-to-low; longer forms before shorter forms when they share a prefix):

```typescript
const proceduralPrefixes = [
  // === Existing 16 (do not duplicate) ===
  "In the Matter of",
  "In re Marriage of",
  "In the Interest of",
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
  // === New additions (must be inserted BEFORE the short generic prefixes "In re", "In the Matter of", "Matter of") ===
  // Tier 1: HIGH volume, state-codified
  "In the Matter of the Welfare of",          // MN official long form (must precede "In the Matter of")
  "In re Welfare of",                          // MN/WA short form (must precede "In re")
  "In re Dependency of",                       // WA RCW 13.34
  "In re Termination of Parental Rights as to", // AZ, NV (longer "as to" variant first)
  "In re Termination of Parental Rights to",    // WI, SC, VT
  "In re Termination of Parental Rights of",    // WI alt, NE
  "In re Termination of Parental Rights",       // generic bare suffix (fallback, after the longer "to"/"of"/"as to" forms)
  "In re Paternity of",                         // IN, WI, IL
  "In re Parentage of",                         // CA, IL, WA, NJ
  "In re Custody of",                           // WI, VT, PA, WA older
  "In re Parental Responsibilities Concerning", // CO (note: NOT "of"; rare connective)
  "In re Parental Responsibilities of",         // CO standard
  // Tier 2: MEDIUM-MEDIUM-HIGH
  "In re Name Change and Gender Change of",    // IN modern combined (longest first)
  "In re Name Change of",                       // OH, IN, NJ, FL
  "In re Change of Name of",                    // alt form (some states)
  "Care and Protection of",                     // MA unique bare form
  "In re Adoption of",                          // PA, KS, OK, MI, OH, others
  "In re Guardianship of",                      // IL, NE, MN, others
  "In re Conservatorship of",                   // CA, others
  // Tier 3: LOW (single-state)
  "In re Parental Rights as to",                // NV (post-2025 NRS Ch. 128 form)
]
```

**Total: 16 existing + 18 new = 34 prefixes.**

### Ordering rules summary

1. **Longer literal prefix sharing a common stem must precede the shorter stem.**
   - `In the Matter of the Welfare of` must precede `In the Matter of`.
   - `In re Welfare of` must precede `In re`.
   - `In re Termination of Parental Rights as to/to/of` must precede `In re Termination of Parental Rights` (bare).
   - `In re Termination of Parental Rights` (in any form) must precede `In re`.
   - `In re Name Change and Gender Change of` must precede `In re Name Change of`.
   - `In re Parental Responsibilities of` and `... Concerning` must precede `In re`.
   - `In re Adoption of` / `In re Guardianship of` / `In re Conservatorship of` must precede `In re`.
   - `In re Custody of`, `In re Paternity of`, `In re Parentage of`, `In re Dependency of` all must precede `In re`.

2. **Bare-form prefixes (no `In re`)** like `Care and Protection of` and `Adoption of` are positionally independent of the `In re` ordering — they don't share stems with `In re` prefixes.

3. **`In re Parental Rights as to`** must precede `In re Termination of Parental Rights as to`? Actually no — they share the prefix `In re ` only, not `In re Termination ...`. They are independent alternations. But if both `In re Parental Rights as to X` and `In re Termination of Parental Rights as to X` exist as captions, both should match correctly. Ordering between them doesn't matter because they diverge after `In re `.

### Regex implementation

The current regex is:

```regex
/\b(In\s+the\s+Matter\s+of|In\s+re\s+Marriage\s+of|...)\s+([A-Za-z0-9\s.,'&()/-]+?)\s*,\s*$/i
```

Apply these mechanical updates:

1. Insert each new prefix into the `(...)` alternation in the order specified above, with `\s+` between literal words. E.g., `In\s+re\s+Welfare\s+of`.
2. Mirror in the `proceduralPrefixes` array (around line 1511), preserving order. Both must accept the new prefix for it to take effect (per CLAUDE.md guidance).
3. **Verify** the body class `[A-Za-z0-9\s.,'&()/-]+?` accepts the necessary tokens:
   - Initials with dots (e.g., `R.A.S.`) — yes, `.` is in the class.
   - Hyphenated initials (e.g., `H.S.H.-K.`) — yes, `-` is in the class.
   - Ampersand (e.g., `Care and Protection of Richard & others`) — yes, `&` is in the class.
   - Multi-child semicolon separators (e.g., `K.M.G.; A.M.G.; S.A.G.; J.C.C.`) — **NO**, `;` is missing. PA multi-child captions will fail unless `;` is added to the body class. This is a separate fix (out of scope for this prefix recommendation but worth flagging).
   - Pseudonymous names (e.g., `Jaylen`, `Arianne`) — yes, plain letters.

4. **Test cases to add** in `tests/extract/extractCase.test.ts`:

```typescript
// Welfare / Dependency
it("recognizes In re Welfare of", () => { ... "In re Welfare of M.A.B., 999 N.W.2d 100 (Minn. Ct. App. 2024)," })
it("recognizes In the Matter of the Welfare of", () => { ... })
it("recognizes In re Dependency of", () => { ... })

// Termination of Parental Rights
it("recognizes In re Termination of Parental Rights to", () => { ... })
it("recognizes In re Termination of Parental Rights of", () => { ... })
it("recognizes In re Termination of Parental Rights as to (Arizona)", () => { ... })

// Paternity / Parentage / Custody
it("recognizes In re Paternity of M.R., 778 N.E.2d 861 (Ind. App. 2002)", () => { ... })
it("recognizes In re Parentage of Scarlett Z.-D., 2015 IL 117904", () => { ... })
it("recognizes In re Custody of H.S.H.-K., 193 Wis. 2d 649 (1995)", () => { ... })

// Colorado Parental Responsibilities
it("recognizes In re Parental Responsibilities of E.K., 22SA31 (2022)", () => { ... })
it("recognizes In re Parental Responsibilities Concerning S.Z.S.", () => { ... })

// Name Change
it("recognizes In re Name Change of C.L.F., 2022-Ohio-2300", () => { ... })
it("recognizes In re Name Change and Gender Change of R.E.", () => { ... })

// Massachusetts bare forms
it("recognizes Care and Protection of Jaylen, 493 Mass. 798 (2024)", () => { ... })
it("preserves Adoption of Arianne, 104 Mass. App. Ct. 716 (2024)", () => { ... }) // already passes; regression check

// In re Adoption / Guardianship / Conservatorship (upgrade existing coverage)
it("recognizes In re Adoption of B.B.M., 290 Kan. 552 (2010) — captures full prefix", () => {
  // Before this change, proceduralPrefix would be "In re" and subject "Adoption of B.B.M."
  // After this change, proceduralPrefix should be "In re Adoption of" and subject "B.B.M."
})
```

5. **Regression tests** for ordering correctness:

```typescript
it("longer Welfare prefix beats short In re prefix", () => {
  const r = extractPartyNames("In re Welfare of M.A.B.")
  expect(r.proceduralPrefix).toBe("In re Welfare of")
  expect(r.plaintiffNormalized).toBe("m.a.b.")
})

it("In re Termination of Parental Rights as to beats In re Termination of Parental Rights", () => {
  const r = extractPartyNames("In re Termination of Parental Rights as to B.W.")
  expect(r.proceduralPrefix).toBe("In re Termination of Parental Rights as to")
  expect(r.plaintiffNormalized).toBe("b.w.")
})
```

### Out-of-scope follow-ups identified during research

1. **Body class missing `;`** — PA multi-child adoption captions like `In re Adoption of K.M.G.; A.M.G.; S.A.G.; J.C.C.` will not capture beyond the first `;`. Recommend adding `;` to `[A-Za-z0-9\s.,'&()/-]+?` in a separate change.
2. **Body class missing `:`** — PA's caption form `Adoption of: M.M.A., Appeal of: C.M.A.` uses `:` immediately after the topic noun. The leading `:` after `Adoption of` would fail because `:` is not in the body class. Whether to handle PA's `Appeal of:` suffix is a separate question.
3. **Indiana's very long form** `In the Matter of the Termination of the Parent-Child Relationship of [Name]` is currently uncaptured. Whether to add it depends on Indiana-specific frequency — likely worth adding as `In re Termination of the Parent-Child Relationship of` (the shorter "In re" variant Indiana also uses) but at LOW priority given the more common Indiana form `In re Paternity of` is already covered above.
4. **Connecticut's bare `In re [InitialName]` form** (e.g., `In re Zakai F.`, `In re Bruce R.`, `In re Elvin G.`) is already matched by the existing `In re` prefix; no new prefix required.
5. **Multi-state `In re Petition for Adoption / Custody / Visitation`** — exists but lower volume; if added, must precede `Petition of` and `On Petition of` for proper ordering, but probably not worth the noise.

---

## Sources

Authoritative / corpus:
- Justia U.S. Case Law (Minnesota Court of Appeals, Minnesota Supreme Court, Wisconsin Court of Appeals, Arizona Supreme Court, Pennsylvania Superior Court, Massachusetts Appeals Court, Colorado Court of Appeals, Nebraska courts, Kansas Supreme Court, Oklahoma Supreme Court, Indiana Court of Appeals, Illinois Appellate Court, California Courts of Appeal, Connecticut Supreme Court, Vermont Supreme Court, Washington Court of Appeals): https://law.justia.com
- FindLaw caselaw browser: https://caselaw.findlaw.com
- Minnesota Law Library (Minn. Ct. App. opinions archive): https://mn.gov/law-library-stat/
- Washington Courts opinions: https://www.courts.wa.gov/opinions/
- Wisconsin Court System: https://www.wicourts.gov/
- Massachusetts Court System: https://www.mass.gov/orgs/massachusetts-supreme-judicial-court
- Arizona Court System: https://www.azcourts.gov
- Colorado Court System: https://www.coloradojudicial.gov
- Pennsylvania Unified Judicial System: https://www.pacourts.us
- Court Listener: https://www.courtlistener.com

Manuals / style guides referenced:
- Bluebook 21st ed. — Rule 10.2.1(b) (procedural phrases; "In re", "ex rel."), Table T9 (procedural phrases)
- ALWD Citation Manual 7th ed. (parallel procedural-phrase guidance)
- Minnesota Rules of Juvenile Protection Procedure
- RCW 13.34 (Washington Juvenile Court Act, Dependency)
- Colo. Rev. Stat. § 14-10-123 (Colorado Parental Responsibilities)
- Wis. Stat. §§ 48.41–.46, 767.80, 891.40 (Wisconsin family law)
- A.R.S. § 8-531 et seq. (Arizona termination of parental rights)
- NRS Ch. 128 (Nevada termination of parental rights)
- 750 ILCS 46 (Illinois Parentage Act of 2015)
- N.J.S.A. 9:17 (New Jersey Parentage)
- Mass. G. L. c. 119, § 24-29C (Massachusetts Care and Protection)
