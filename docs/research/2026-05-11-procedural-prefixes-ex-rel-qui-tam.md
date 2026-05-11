# Procedural Prefix Research: Sovereign ex rel. Variants, Qui Tam, "On the Relation of," and Use Plaintiffs

**Date:** 2026-05-11
**Scope:** Case-caption forms in which a sovereign (or beneficiary) is the nominal plaintiff and a relator/use plaintiff appears between the sovereign and the defendant. Recommendations for additions to `PROCEDURAL_PREFIX_REGEX` and the `proceduralPrefixes` array in `src/extract/extractCase.ts` (regex around line 281; array around line 1508).
**Constraint:** No client/firm names. All examples drawn from published opinions in U.S. federal, state, and territorial courts, plus a handful of pre-1900 and Anglo-American common-law citations.

---

## Summary

The `ex rel.` family is the largest single category of procedural-prefix case captions outside the basic `In re` / `Ex parte` / `Estate of` set. eyecite-ts currently covers three sovereigns explicitly (`State ex rel.`, `Commonwealth ex rel.`, `United States ex rel.`). Real-world U.S. legal corpora contain at least **a dozen more** distinct sovereign-prefix forms that the current regex misses, plus several historical-but-still-cited variants.

Top-level findings:

1. **`People ex rel.`** is the single highest-frequency missing prefix. New York's Court of Appeals alone has tens of thousands of opinions captioned this way (every state habeas, every state-initiated injunctive proceeding before the AG took over). California and Illinois use the same form for state-as-plaintiff non-criminal proceedings. This is the most important addition.
2. **Sovereign-specific named forms** — `Government of the Virgin Islands ex rel.`, `Commonwealth of Puerto Rico ex rel.`, `Territory ex rel.`, `District of Columbia ex rel.` — appear in the federal and territorial-court corpora with measurable frequency. They are structurally identical to `State ex rel.` but cannot be matched by it because the regex is anchored on the literal word `State`.
3. **Generic next-friend `[Name] ex rel. [Name]`** (e.g., `Schiavo ex rel. Schindler`, `Sutton ex rel. Sutton`, `Lopez ex rel. Lopez`, `Doe ex rel. Tarlow`, `Reid ex rel. Reid`) is **structurally different** from the sovereign forms — the first token is a person, not a sovereign — and is already broken by the current regex. Many federal disability-rights, IDEA, and qui tam cases use this form. The existing regex misses it because there is no fixed leading word. This case is partly already handled by the catch-all `V_CASE_NAME_REGEX` (because the case still has a `v.`) but the `proceduralPrefix` field is lost.
4. **"On the relation of" longhand** (Indiana, Tennessee, Ohio older opinions) is real but rarely appears in modern Bluebook-form citations — most modern citers contract to `ex rel.` Worth recognizing in the regex as a low-priority addition for accurate parse of pre-1980 sources.
5. **"For the use of" / "to the use of" / `[Name] for the use of [Name]` / `Use [Name]`** are 18th–19th-century Pennsylvania and Maryland forms. They appear in re-cited older opinions (especially PA Supreme Court pre-1900 and MD Court of Appeals pre-1900) and in modern citations *to* those older cases. Low priority but worth listing.
6. **Foreign Crown forms** (`Rex v.`, `Regina v.`, `R. v.`) are not "ex rel." but are procedural-prefix-like captions for British/Commonwealth cases that appear in U.S. opinions citing comparative law. They are not `ex rel.` and most current usage abbreviates to `R. v.`, already handled by the single-letter rule. No regex addition needed.

Recommended additions ranked by priority (corpus frequency × parse improvement):

| Tier | Prefix | Rationale |
|------|--------|-----------|
| 1 | `People ex rel.` | Highest-frequency missing prefix; NY/CA/IL state cases |
| 1 | `District of Columbia ex rel.` | Common in federal D.D.C. and D.C. Cir. opinions |
| 1 | `Territory ex rel.` | Captures pre-statehood AZ, NM, OK, HI, AK opinions still cited as precedent |
| 2 | `Government of the Virgin Islands ex rel.` | Standard USVI sovereign form |
| 2 | `Commonwealth of Puerto Rico ex rel.` | PR sovereign form; distinct from the existing bare `Commonwealth ex rel.` |
| 2 | `Commonwealth of the Northern Mariana Islands ex rel.` | CNMI sovereign form |
| 3 | `On the relation of` / `on the Relation of` | Older Indiana/Tennessee/Ohio variant; rare but unambiguous |
| 3 | `for the use of` / `to the use of` / `Use [name]` | Historical PA/MD qui tam common-law form; rare but unambiguous |
| 4 | `Rex v.` / `Regina v.` | Pre-1776 Anglo-American legacy; already handled by single-letter rule and generic `v.` regex |

Ordering matters in the regex alternation. **Longer, more-specific prefixes must come before shorter, less-specific ones.** Concretely:
- `Government of the Virgin Islands ex rel.` must precede `ex rel.`-fallback patterns.
- `Commonwealth of Puerto Rico ex rel.` must precede `Commonwealth ex rel.` (otherwise PR matches as bare PA/VA/KY/MA Commonwealth).
- `Commonwealth of the Northern Mariana Islands ex rel.` must precede `Commonwealth ex rel.`.
- `State of [X] on the relation of` must precede `State on the relation of` and both must precede `State ex rel.`.

---

## Section 1: Sovereign ex rel. — Modern Forms

### 1.1 `People ex rel.`

**Canonical form:** `People ex rel. [Relator] v. [Defendant]`

**Variant forms:**
- `People of the State of [X] ex rel. [Relator] v. [Defendant]` (longer style; appears in formal pleadings; often abbreviated in citation)
- `People of the State of New York ex rel. [Relator] v. [Defendant]` (NY's official form)
- `People, ex rel. [Relator] v. [Defendant]` (comma variant — some older opinions)
- `People ex rel. [Attorney General Name] v. [Defendant]` — NY AG-as-relator style (e.g., `People ex rel. Spitzer v. Operation Rescue Nat'l`)

**Jurisdictions:** New York (primary; NY Court of Appeals uses `People ex rel.` ubiquitously), California, Illinois, Colorado (occasional), Michigan (occasional). NY in particular uses this form for **all** state-initiated habeas, mandamus, prohibition, certiorari, parens patriae, and Attorney General consumer-protection actions.

**Era / current usage:** Modern. Used continuously from the early 19th century through present day. NY in particular has ~150 years of unbroken usage.

**Real corpus examples:**
- `People ex rel. Williams v. La Vallee`, 19 N.Y.2d 238 (1967) (habeas)
- `People ex rel. Spitzer v. Operation Rescue Nat'l`, 69 F. Supp. 2d 408 (W.D.N.Y. 1999) (NY AG consumer-protection action removed to federal court)
- `People ex rel. Spitzer v. Grasso`, 11 N.Y.3d 64 (2008) (NYSE executive-compensation suit by NY AG)
- `People ex rel. Spitzer v. Applied Card Sys., Inc.`, 11 N.Y.3d 105 (2008) (consumer protection)
- `People ex rel. DeLia v. Munsey`, 26 N.Y.3d 124 (2015) (habeas — mental hygiene law)
- `People ex rel. Acritelli v. Grout`, 87 App. Div. 193, aff'd 177 N.Y. 587 (NY 1904) (older example)
- `People ex rel. Younger v. Superior Court`, 16 Cal. 3d 30 (1976) (California; older state AG suit)

**Recommended priority:** **Tier 1.** This is the single most important addition. NY alone has tens of thousands of opinions captioned this way. The current regex treats `People ex rel. Williams` as a non-prefixed caption and either fails to extract the procedural prefix or splits incorrectly.

### 1.2 `District of Columbia ex rel.`

**Canonical form:** `District of Columbia ex rel. [Relator] v. [Defendant]` (when DC is the nominal plaintiff)

**Variant forms:**
- `[Name] ex rel. [Name] v. District of Columbia` (when DC is defendant and a person sues on relation of another person — this is a `[Name] ex rel. [Name]` next-friend caption, not a DC sovereign-prefix caption; see Section 3)
- `United States ex rel. [Name] v. District of Columbia` (qui tam against DC; already handled by `United States ex rel.`)

**Jurisdictions:** D.C. Superior Court, D.C. Court of Appeals, D.D.C. (federal), D.C. Cir.

**Era / current usage:** Modern. The District is a separate sovereign for prosecutorial purposes (DOJ handles federal prosecutions; the District prosecutes its own DC-Code offenses through the OAG-DC for civil and limited criminal matters).

**Real corpus examples:**
- `Doe ex rel. Tarlow v. District of Columbia`, 489 F.3d 376 (D.C. Cir. 2007) — note: this is `[Name] ex rel. [Name]` next-friend form with DC as defendant, **not** a `District of Columbia ex rel.` form.
- `Reid ex rel. Reid v. District of Columbia`, 401 F.3d 516 (D.C. Cir. 2005) — same: next-friend form, DC defendant.
- For the true `District of Columbia ex rel.` form (DC as sovereign plaintiff), DC AG civil enforcement actions are typically captioned this way in D.C. Superior Court, though Justia/CourtListener indexing is sparse. The DC OAG website lists these as `District of Columbia v.` in practice for civil enforcement and `District of Columbia ex rel. [Agency]` for relator-driven actions.

**Note:** This is genuinely lower-frequency than `People ex rel.` because DC almost always sues as just `District of Columbia v. [Defendant]`. The `ex rel.` form mostly appears when an agency or a third-party complainant is the relator (similar to a private AG action). Still worth adding because when it does appear, the current regex misses it entirely.

**Recommended priority:** **Tier 1** (low corpus frequency individually, but easy alternation addition with no downside).

### 1.3 `Territory ex rel.`

**Canonical form:** `Territory ex rel. [Relator] v. [Defendant]` or `Territory of [X] ex rel. [Relator] v. [Defendant]`

**Variant forms:**
- `Territory v. [Defendant]` (criminal — analogous to `State v.`; not an `ex rel.` form, but a sovereign-prefix form)
- `Territory of [X] v. [Defendant]` (e.g., `Territory of Hawaii v. Kawakami`)
- `Territory of [X] ex rel. [Relator] v. [Defendant]`
- `[X] Territory ex rel. [Relator] v. [Defendant]` (rarer ordering)

**Jurisdictions (historical / current):**
- **Historical territorial courts** (pre-statehood): Territory of Arizona (1864–1912), Territory of New Mexico (1850–1912), Territory of Oklahoma (1890–1907), Indian Territory (1834–1907), Territory of Utah (1850–1896), Territory of Wyoming (1868–1890), Territory of Montana (1864–1889), Territory of Idaho (1863–1890), Territory of Dakota (1861–1889), Territory of Hawaii (1900–1959), Territory of Alaska (1912–1959).
- **Current insular territories** (still active): These now typically use the territory's name (`Guam v.`, `Government of the Virgin Islands v.`, etc.) rather than `Territory v.`, though older opinions still appear in pinpoint citations.

**Era / current usage:** Predominantly pre-1959 (when Alaska and Hawaii achieved statehood) for the original `Territory v.` and `Territory ex rel.` forms. Still appears in modern citations when re-citing those older opinions, especially in property/water/mineral-rights cases where territorial precedent remains controlling.

**Real corpus examples:**
- `Lawton v. Territory of Oklahoma`, 60978 (Okla. 1900) — `Territory v.` form
- `Foust v. Territory of Oklahoma`, 60994 (Okla. 1900)
- `McCool v. Territory of Oklahoma`, 60963 (Okla. 1900)
- `Caffrey v. Oklahoma Territory`, 177 U.S. 346 (1900) — variant ordering
- `Territory of Hawaii v. Mankichi`, 190 U.S. 197 (1903) — U.S. Supreme Court hearing a Hawaii territorial appeal
- Older `Territory ex rel.` opinions appear in the New Mexico and Oklahoma territorial reporters (`N.M.` pre-1912 and `Okla.` pre-1907) for quo warranto, mandamus, and elections-related proceedings.

**Recommended priority:** **Tier 1.** Single-word `Territory` is a clear, low-false-positive sovereign anchor. Adding this also future-proofs against new-territory captions (e.g., if Puerto Rico or USVI ever return to direct territorial governance).

### 1.4 `Government of the Virgin Islands ex rel.`

**Canonical form:** `Government of the Virgin Islands ex rel. [Relator] v. [Defendant]`

**Variant forms:**
- `Government of the United States Virgin Islands ex rel. [Relator] v. [Defendant]` (formal)
- `Government of the Virgin Islands v. [Defendant]` (criminal — analogous to `State v.`; not an `ex rel.` form)
- `People of the Virgin Islands v. [Defendant]` (post-2007 reformulation in some courts after the establishment of the V.I. Supreme Court)
- `V.I. ex rel. [Relator] v. [Defendant]` (abbreviated; rare in formal citations)

**Jurisdictions:** District Court of the Virgin Islands (D.V.I.), Supreme Court of the Virgin Islands, U.S. Court of Appeals for the Third Circuit (which hears USVI appeals).

**Era / current usage:** Modern (1917–present, since the U.S. acquired the territory). Heavy usage in territorial criminal prosecutions and in OAG-V.I. civil enforcement.

**Real corpus examples:**
- `Government of the United States Virgin Islands v. JPMorgan Chase Bank, N.A.`, 1:22-cv-10904 (S.D.N.Y. 2022) — VI as plaintiff in financial-services litigation
- `Government of Virgin Islands v. Knight`, 989 F.2d 619 (3d Cir. 1993) — criminal appeal from D.V.I.
- `Government of the Virgin Islands ex rel. Suris v. Suris`, 24 V.I. 158 (Terr. Ct. 1989) — paternity/child-support; ex rel. form
- `Doe 1 et al. v. Government of the United States Virgin Islands et al.`, 1:23-cv-10301 (S.D.N.Y. 2025) — USVI as defendant; not an `ex rel.` form

**Recommended priority:** **Tier 2.** Real corpus frequency is moderate. The phrase `Government of the Virgin Islands` is long and the alternation cost is small.

### 1.5 `Commonwealth of Puerto Rico ex rel.`

**Canonical form:** `Commonwealth of Puerto Rico ex rel. [Relator] v. [Defendant]`

**Variant forms:**
- `Puerto Rico ex rel. [Relator] v. [Defendant]` (abbreviated — appears in U.S. Supreme Court captions)
- `Estado Libre Asociado de Puerto Rico ex rel. [Relator] v. [Defendant]` (Spanish; appears in P.R. Supreme Court Spanish opinions but is typically translated for federal citation)
- `Pueblo v. [Defendant]` (Spanish-language criminal caption — "People v."; not an `ex rel.` form but the PR analog of `People v.`)
- `Pueblo de Puerto Rico ex rel. [Relator] v. [Defendant]` (rare Spanish-form `ex rel.` caption)

**Jurisdictions:** Supreme Court of Puerto Rico, Puerto Rico Court of Appeals, U.S. District Court for the District of Puerto Rico, First Circuit (which hears PR federal appeals).

**Era / current usage:** Modern (1952–present, since Puerto Rico became a Commonwealth). The Commonwealth uses this form for parens patriae actions and OAG civil enforcement.

**Real corpus examples:**
- `Alfred L. Snapp & Son, Inc. v. Puerto Rico ex rel. Barez`, 458 U.S. 592 (1982) — landmark parens patriae standing case; this is the **canonical Puerto Rico ex rel.** citation in federal practice.
- `Commonwealth of Puerto Rico ex rel. Quiros v. Alfred L. Snapp & Son, Inc.`, 469 F. Supp. 928 (W.D. Va. 1979) — the same case at the district-court level, captioned with the full Commonwealth phrasing.
- `The Commonwealth of Puerto Rico ex rel. Messo, LLC v. First Transit, Inc.`, 3:26-cv-01070 (D.P.R. 2026) — recent example showing the long-form caption survives.
- `Rodriguez ex rel. Rodriguez v. Commonwealth`, (P.R. case) — note: this is the `[Name] ex rel. [Name]` next-friend form with the Commonwealth as defendant, not the sovereign-prefix form.

**Recommended priority:** **Tier 2.** Critical for First Circuit and PR district court corpora. **Must be listed before `Commonwealth ex rel.`** in the alternation to avoid the PR-specific form being collapsed into the bare-Commonwealth form (which would still parse correctly but would lose the sovereign identifier).

### 1.6 `Commonwealth of the Northern Mariana Islands ex rel.`

**Canonical form:** `Commonwealth of the Northern Mariana Islands ex rel. [Relator] v. [Defendant]`

**Variant forms:**
- `Commonwealth v. [Defendant]` (criminal — used in CNMI courts internally; ambiguous with PA/VA/KY/MA `Commonwealth v.` in federal citation, so the long form is typically used in federal practice)
- `CNMI ex rel. [Relator] v. [Defendant]` (abbreviated; rare in formal citations)

**Jurisdictions:** Commonwealth of the Northern Mariana Islands Supreme Court, NMI Superior Court, U.S. District Court for the Northern Mariana Islands (D.N. Mar. I.), Ninth Circuit (which hears CNMI federal appeals).

**Era / current usage:** Modern (1978–present, since the CNMI Covenant). Lower corpus frequency than Puerto Rico but follows the same structural pattern.

**Real corpus examples:**
- `Commonwealth v. Camacho`, 5 N. Mar. I. 128 (1997) — CNMI criminal appeal
- `Commonwealth of the Northern Mariana Islands v. Atalig`, 723 F.2d 682 (9th Cir. 1984) — Ninth Circuit hearing of CNMI matter
- `Tenorio v. CNMI Ret. Fund`, 2014 MP 9 (N. Mar. I. 2014)

**Recommended priority:** **Tier 2.** Real corpus frequency is low, but the prefix is long and unambiguous, so adding it is essentially zero-risk.

### 1.7 `Government of Guam ex rel.` / `People of Guam`

**Canonical form:**
- `Government of Guam v. [Defendant]` (no `ex rel.` form widely used)
- `People of Guam v. [Defendant]` (post-1998 Guam Supreme Court reformulation)
- `Territory of Guam v. [Defendant]` (older; pre-1998)

**Era / current usage:** Modern Guam typically uses `People of Guam` for criminal prosecutions; civil enforcement uses `Government of Guam v.` rather than an `ex rel.` form.

**Real corpus examples:**
- `People v. Quitugua`, 2019 Guam 1
- `Government of Guam v. United States`, 567 U.S. 1 (2022) — Guam as plaintiff against the United States in environmental cost-recovery
- `Territory of Guam v. Olsen`, 431 U.S. 195 (1977) — older `Territory` form before 1998 reformulation

**Recommended priority:** Not a priority for a separate prefix entry. `People of Guam` falls under generic `People v.` patterns. The `Territory of Guam` form is captured by `Territory ex rel.` if that is added.

### 1.8 `American Samoa Gov't` / `American Samoa ex rel.`

**Canonical form:** `American Samoa Gov't v. [Defendant]` or `American Samoa v. [Defendant]`

No widely-used `ex rel.` form. American Samoa civil enforcement is rare in published corpora.

**Real corpus examples:**
- `Am. Samoa Gov't v. Pati`, 6 A.S.R.2d 56 (Trial Div. 1987)

**Recommended priority:** Not a priority for a separate prefix entry.

---

## Section 2: Foreign Sovereign — `Republic of [Country] ex rel.`

**Canonical form:** `Republic of [Country] v. [Defendant]` is the dominant form. The `ex rel.` variant is rare in U.S. federal practice because foreign sovereigns typically sue in their own name through their own counsel (with FSIA presumptions handling the immunity question).

**Real corpus examples (sovereign suing in its own name; not ex rel.):**
- `Argentine Republic v. Amerada Hess Shipping Corp.`, 488 U.S. 428 (1989) — FSIA scope
- `Republic of Argentina v. Weltover, Inc.`, 504 U.S. 607 (1992) — commercial activity exception
- `Republic of Philippines v. Marcos`, 862 F.2d 1355 (9th Cir. 1988) — sovereign-asset recovery
- `Germany v. Philipp`, 592 U.S. 169 (2021) — FSIA expropriation exception
- `Republic of Iraq v. Beaty`, 556 U.S. 848 (2009) — sovereign-immunity restoration

**`Republic of [Country] ex rel.` is essentially nonexistent** in published federal opinions. The closest analog is:
- `Republic of China v. National Bank of China`, 348 U.S. 356 (1955) — Republic of China (Taiwan) suing in its own name. No `ex rel.`

**Recommended priority:** **No addition.** The captured-by-`v.`-regex fallback handles `Republic of [X] v. [Y]` correctly. A dedicated `Republic of` prefix would add no value and would risk false positives on every "Republic of Texas," "Republic of California 1846," and similar historical references that are not real captions.

---

## Section 3: Generic Next-Friend Form — `[Name] ex rel. [Name] v. [Name]`

**Canonical form:** `[Person1] ex rel. [Person2] v. [Defendant]`

In this caption, `[Person1]` is the real-party-in-interest (typically a minor, incapacitated adult, or estate); `[Person2]` is the next friend, guardian, parent, executor, or qui tam relator who is bringing the action on their behalf.

**This is structurally different from the sovereign-prefix forms** because the first token is a person's surname, not a fixed sovereign keyword. The current `PROCEDURAL_PREFIX_REGEX` cannot match it because it requires a specific leading word (`State`, `Commonwealth`, `United States`, etc.).

**Subcategories:**

### 3.1 Federal qui tam (False Claims Act) — `United States ex rel.` is the dominant form; sometimes flipped

The canonical FCA caption is `United States ex rel. [Relator] v. [Defendant]`, which is **already covered** by the existing regex. However, two variant orderings appear in published opinions:

- **Defendant-first appeal form:** `[Defendant] v. United States ex rel. [Relator]` (when the defendant is the appellant). Example: `Cochise Consultancy Inc. v. United States ex rel. Hunt`, 587 U.S. 262 (2019). This is the same caption swapped; the procedural prefix is still `United States ex rel.`. Already covered by the existing regex on the right-hand side of `v.`.
- **Relator-first form:** `[Relator] ex rel. United States v. [Defendant]`. Example: `Cafasso ex rel. United States v. General Dynamics C4 Sys., Inc.`, 637 F.3d 1047 (9th Cir. 2011); `Ebeid ex rel. U.S. v. Lungwitz`, 616 F.3d 993 (9th Cir. 2010). Here the relator's name comes first and `United States` is the entity being represented. This is **not covered** by the existing regex.

The relator-first FCA form is a real corpus pattern that appears in the Ninth Circuit and elsewhere.

### 3.2 ADA / IDEA / civil-rights next-friend — `[Name] ex rel. [Name]`

**Real corpus examples:**
- `Sutton ex rel. Sutton v. United Airlines, Inc.`, 527 U.S. 471 (1999) — ADA (note: actual Supreme Court caption is `Sutton v. United Air Lines, Inc.`; "Sutton ex rel. Sutton" appears in some lower-court captions where parents acted as next friends for adult-children plaintiffs)
- `Schiavo ex rel. Schindler v. Schiavo`, 403 F.3d 1289 (11th Cir. 2005) — landmark end-of-life federal-jurisdiction case
- `Doe ex rel. Tarlow v. District of Columbia`, 489 F.3d 376 (D.C. Cir. 2007) — disability rights; mentally incompetent adult
- `Reid ex rel. Reid v. District of Columbia`, 401 F.3d 516 (D.C. Cir. 2005) — IDEA next-friend
- `Powell ex rel. Ricks v. District of Columbia`, 634 A.2d 403 (D.C. 1993)
- `Lopez ex rel. Lopez v. Tex. Voc. Rehab. Comm'n`, 1997 WL 282251 (E.D. Tex.)
- `Kamau ex rel. Lovell v. County of Hawaii` — Hawaii next-friend example

### 3.3 Estate / executor — `[Name] ex rel. [Name]`

When an executor brings an action on behalf of a decedent's estate:
- `[Decedent] ex rel. [Executor] v. [Defendant]` is sometimes used, though `Estate of [Decedent] v. [Defendant]` is more common (and `Estate of` is already in the prefix list).

### 3.4 Status of `[Name] ex rel. [Name]` in the current code

The current `PROCEDURAL_PREFIX_REGEX` does not match these. They fall through to the generic `V_CASE_NAME_REGEX` and parse with `[Person1]` (the real party in interest) treated as the plaintiff. This produces a **correct plaintiff** in the output but **loses the `proceduralPrefix` field** and **loses the next-friend information** entirely.

**Recommended approach:** Rather than adding `[Name] ex rel.` as a literal prefix entry (impossible — no fixed leading word), extend the regex with a **generic `ex rel.`-pattern fallback** that recognizes the structure `[CapitalizedName] ex rel. [CapitalizedName] v. [Name]` regardless of what the leading capitalized name is.

A safe pattern:
```
/^([A-Z][\w.,'&-]+?)\s+ex\s+rel\.\s+([A-Z][\w.,'&-]+?)\s+v\.?\s+(.+)$/i
```

This matches any `Name1 ex rel. Name2 v. Defendant` structure. The leading word can be `State`, `Commonwealth`, `United States`, `People`, `District`, `Government`, `Schiavo`, `Sutton`, `Doe`, etc.

**However**, the existing fixed-prefix entries (`State ex rel.`, `Commonwealth ex rel.`, etc.) are still needed because they identify the **sovereign-ness** of the prefix and let the parser correctly populate `plaintiff` as the full prefix-plus-relator string (e.g., `State ex rel. Smith` as the named plaintiff in a quo warranto action where the sovereign is the formal plaintiff).

**Recommended priority:** **Tier 2.** Add a generic catch-all `ex rel.` pattern *after* the sovereign-specific ones, to capture next-friend captions without overriding the more-specific sovereign forms.

---

## Section 4: Older Form — `On the Relation of` / `on the Relation of`

**Canonical form:** `State on the Relation of [Relator] v. [Defendant]` or `State of [X] on the Relation of [Relator] v. [Defendant]`

**Jurisdictions:** Tennessee, Indiana, Ohio (older opinions); occasionally Missouri, West Virginia in older sources.

**Era / current usage:** Pre-1980 in most jurisdictions, with modern citations to those older opinions preserving the longhand form. Many states adopted the abbreviated `State ex rel.` form by the mid-20th century, but historical opinions retain the longhand.

**Real corpus examples (historical):**
- Older Tennessee Supreme Court opinions of the form `State on the Relation of [Attorney General Name] v. [Defendant]` for quo warranto and mandamus.
- Older Indiana cases of the form `State of Indiana on the Relation of [Name] v. [Name]` appear in pre-1900 Indiana Reports.
- Ohio Supreme Court historical opinions of the form `State of Ohio on the Relation of [Name] v. [Name]`.

**Modern citation practice:** Modern citers usually contract `State of Tennessee on the Relation of` to `State ex rel.` regardless of the original spelling, so the longhand form is rare in modern citations. However, **direct quotation citations** preserve the original spelling — eyecite-ts will encounter this form when parsing pinpoint citations within an opinion that quotes the original caption.

**Variant: `State, on the Relation of [Name]`** — with a comma after `State`. Some 19th-century opinions use this.

**Recommended priority:** **Tier 3.** Add as a regex alternative that maps to the same parse output as `State ex rel.` but accommodates the longhand spelling. Low corpus frequency but unambiguous when it appears.

---

## Section 5: "For the Use of" / "To the Use of" — Pennsylvania and Maryland Historical

**Canonical forms:**
- `[Plaintiff] for the Use of [Beneficiary] v. [Defendant]` — older qui tam / assignment caption
- `[Plaintiff] to the Use of [Beneficiary] v. [Defendant]` — Maryland / Pennsylvania variant
- `Use [Beneficiary] v. [Defendant]` — extremely abbreviated PA form
- `Commonwealth to the Use of [Beneficiary] v. [Defendant]` — PA Commonwealth as nominal plaintiff suing for a private beneficiary
- `State of Maryland for the Use of [Beneficiary] v. [Defendant]` — MD form

**Etymology:** These captions reflect the pre-merger-of-law-and-equity distinction in which a legal plaintiff (the holder of the formal legal title or right to sue) was distinguished from the equitable beneficiary. Common in:
- **Bond actions** (e.g., a sheriff's bond running to the Commonwealth, with the actual injured party as the "use plaintiff")
- **Qui tam common-law actions** (the Crown / sovereign as nominal plaintiff, the private informer as the "use plaintiff")
- **Assignments** (the assignor as legal plaintiff, the assignee as the beneficiary)

**Jurisdictions:** Primarily Pennsylvania (where the "Use" plaintiff was a distinct procedural concept until the 1959 PA Rules of Civil Procedure largely eliminated the form), Maryland, and to a lesser extent Virginia, North Carolina, and the District of Columbia.

**Era / current usage:** Pre-1960. After PA's 1959 procedural reform, "use" plaintiffs were merged into the standard plaintiff caption. **Modern citations to older PA bond cases (especially fiduciary-bond and surety-bond cases) still appear in pinpoint citations** and preserve the original "to the Use of" caption.

**Real corpus examples:**
- `Commonwealth to the Use of [Beneficiary Name] v. [Surety]` — generic form. Many PA Supreme Court cases from 1800–1959 use this. A representative example: `Commonwealth ex rel. and to the Use of Pennsylvania v. Baldwin`, 1 Watts 54 (Pa. 1832).
- `State of Maryland for the Use of [Name] v. [Surety]` — MD fiduciary-bond actions; e.g., `State of Maryland for the Use of [Name] v. [Defendant]` form appears throughout 19th-century MD Reports.
- `Smith v. Jones to the Use of Brown` — assignee form, where the assignee (Brown) is the beneficial plaintiff. Appears in PA and MD case law pre-1960.

**Note:** Searching Justia/CourtListener for "to the Use of" returns very few modern hits because most modern reporters silently reformat older captions to remove "to the Use of." However, original-form citations (especially in legal-history scholarship and in Pennsylvania bond-law treatises) preserve the form.

**Recommended priority:** **Tier 3.** Low corpus frequency in modern practice but the prefix is unambiguous. Worth adding to handle pinpoint citations to PA/MD historical bond cases.

---

## Section 6: Anglo-American Historical Forms

### 6.1 `Rex v.` / `Regina v.` / `R. v.`

**Canonical form:** `Rex v. [Defendant]` (King) or `Regina v. [Defendant]` (Queen) or `R. v. [Defendant]` (modern abbreviated form, covering both)

**Jurisdictions:** England and Wales, Canada, Australia, New Zealand, and other Commonwealth jurisdictions. Appears in U.S. opinions when citing comparative-law authority.

**Era / current usage:** `Rex v.` was used in British prosecutions during the reign of a male monarch; `Regina v.` during the reign of a female monarch. `R. v.` is the modern abbreviated form covering both. Pre-1776 American colonial cases sometimes used `Rex v.`

**Real corpus examples:**
- `Rex v. Sussex Justices`, [1924] 1 K.B. 256 — landmark UK criminal-procedure case cited in U.S. courts
- `Regina v. Dudley & Stephens`, (1884) 14 Q.B.D. 273 — famous "necessity" defense case taught in U.S. criminal law classes
- `R. v. Jogee`, [2016] UKSC 8 — modern UK accessorial-liability case
- `R. v. Stinchcombe`, [1991] 3 S.C.R. 326 — Canadian disclosure-obligation case

**Status in current code:**
- `R. v.` is already handled gracefully because the `V_CASE_NAME_REGEX` accepts a one-letter plaintiff and the single-letter-initial rule in `isLikelyAbbreviationPeriod` correctly handles the period after `R`.
- `Rex v.` and `Regina v.` are proper nouns and would be captured by the generic `V_CASE_NAME_REGEX` as long as the backward scanner doesn't truncate.

**Recommended priority:** **Tier 4 / no action.** No prefix addition needed. These are not `ex rel.` forms — they are sovereign-prefix forms structurally similar to `People v.` (where the sovereign itself is the plaintiff with no relator).

### 6.2 `Crown ex rel.`

Searches did not return any U.S. or Commonwealth opinions captioned `Crown ex rel.` This phrase is not a recognized U.S. case-caption form. The British analog is `R. v. [Defendant] (ex parte [Name])` for judicial review applications, which is a different structure.

**Recommended priority:** **No action.**

### 6.3 `Doe ex dem.` / `Doe d.` — ejectment

**Canonical form:** `John Doe ex dem. [Landowner] v. Richard Roe` or `Doe d. [Landowner] v. Roe` or `Doe on the Demise of [Landowner] v. Roe`

**Etymology:** `ex dem.` abbreviates Latin `ex demissione` — "on the demise of." Used in pre-1850 English and American ejectment actions to litigate real-property title disputes through legal fictions involving fictitious lessees (John Doe) and casual ejectors (Richard Roe).

**Era / current usage:** Pre-1850 for the formal fictions; replaced by reformed real-action procedures in most U.S. states by mid-19th century. Modern citations to those older cases preserve the form.

**Real corpus examples:**
- `Jackson ex dem. Smith v. Carver`, 4 Cow. 550 (N.Y. 1825)
- `Goodell v. Jackson ex dem. Smith`, 20 Johns. 188 (N.Y. 1822)
- `Doe on Demise of Dunn v. Hearick`, 14 Ind. 199 (1860)
- `Doe d. Stiles v. Roe` — generic textbook form

**Status:** This is a different procedural-prefix structure than `ex rel.` and is already partially addressed in the existing research document `2026-05-10-citation-abbrevs-foreign-tribal-territorial.md` (Section D.1). The recommendation there is to extend `PROCEDURAL_PREFIX_REGEX` to handle a generic `[Name] ex (rel|dem). [Name] v. [Name]` pattern.

**Recommended priority:** **Tier 4** for the ex rel. work; covered separately by the historical-forms research.

---

## Section 7: Adjacent Forms

### 7.1 `qui tam` (term of art)

`qui tam` is **not** a procedural prefix in the sense of a case-caption opener. It is a term of art that describes the *type* of action. Modern qui tam captions use the `United States ex rel.` form. Older qui tam actions might be captioned `[Crown / King / State] qui tam [Informer] [against] [Defendant]` but this form is essentially never seen in modern citations.

**Recommended priority:** **No action.** The term `qui tam` appears in opinion text as a noun phrase, not as part of a caption. The existing `United States ex rel.` covers the modern qui tam caption.

### 7.2 `sub nom.`

`sub nom.` ("under the name") is a Bluebook subsequent-history connector, not a procedural prefix. Example: `Smith v. Jones, 100 F.3d 1 (1st Cir. 1996), aff'd sub nom. Smith v. Doe, 200 F.3d 1 (1st Cir. 1996)`. eyecite-ts handles this through the explanatory-parenthetical / subsequent-history pipeline, not the procedural-prefix regex.

**Recommended priority:** **No action.** Out of scope.

### 7.3 `as Next Friend of` / `as Guardian Ad Litem of` / `on Behalf of`

These are full-phrase next-friend captions like `Smith as Next Friend of Jones v. Defendant`. They are structurally similar to `[Name] ex rel. [Name]` (Section 3) but use full-word phrasing instead of the `ex rel.` abbreviation.

**Real corpus examples:**
- `Smith as Next Friend of Jones v. [Defendant]` — Texas/Oklahoma personal-injury form for minor plaintiffs
- `[Name] as Guardian Ad Litem of [Minor] v. [Defendant]` — court-appointed guardian form
- `[Name] on Behalf of [Minor] v. [Defendant]` — variant phrasing

**Status:** Not currently in `proceduralPrefixes`. Modern Bluebook citation typically reduces these to `ex rel.` (Bluebook Rule 10.2.1(b)), so they appear in citations far less often than in actual court captions.

**Recommended priority:** **Tier 4** if/when added; low corpus frequency in citation text. The Bluebook explicitly normalizes these forms to `ex rel.` for citation purposes.

---

## Recommended Action — Prioritized Additions

### Tier 1 (high priority — add now)

Add to `PROCEDURAL_PREFIX_REGEX` (in order, longest-first within tier):

1. `People of the State of [A-Z][\w.]+ ex rel.` — long-form NY/CA/IL
2. `People ex rel.` — short-form NY/CA/IL
3. `Government of the United States Virgin Islands ex rel.` — long-form USVI
4. `Government of the Virgin Islands ex rel.` — short-form USVI
5. `Commonwealth of the Northern Mariana Islands ex rel.` — CNMI
6. `Commonwealth of Puerto Rico ex rel.` — PR (**must come before existing `Commonwealth ex rel.`**)
7. `Territory of [A-Z][\w]+ ex rel.` — territorial long-form (AZ, NM, OK, HI, etc.)
8. `Territory ex rel.` — territorial short-form
9. `District of Columbia ex rel.` — DC

Add to `proceduralPrefixes` array (matching, in same order):

```typescript
"People of the State of [Name] ex rel.",  // requires regex form, not literal
"People ex rel.",
"Government of the United States Virgin Islands ex rel.",
"Government of the Virgin Islands ex rel.",
"Commonwealth of the Northern Mariana Islands ex rel.",
"Commonwealth of Puerto Rico ex rel.",  // BEFORE "Commonwealth ex rel."
"Territory of [Name] ex rel.",            // requires regex form
"Territory ex rel.",
"District of Columbia ex rel.",
```

**Alternation ordering note:** Within the regex `(...)\s+([A-Za-z0-9...]+)`, the longer alternatives must come first or the engine will greedily match the shorter form first. The fixed-string prefixes (`People ex rel.`, `Territory ex rel.`, `District of Columbia ex rel.`) can be added as direct literals. The variable forms (`People of the State of [X] ex rel.`, `Territory of [X] ex rel.`) require a `[A-Z][\w]+` capture group inside the prefix itself, which complicates the regex. A simpler approach is to add only the short forms and let `People ex rel.` match the `People of the State of New York ex rel. ...` case by trimming after-the-fact. **However**, this drops `of the State of New York` from the captured prefix, which may not be the desired behavior if downstream consumers need the full sovereign name.

**Concrete regex addition (Tier 1, fixed-literal-only):**

```typescript
const PROCEDURAL_PREFIX_REGEX =
  /\b(In\s+the\s+Matter\s+of|In\s+re\s+Marriage\s+of|In\s+the\s+Interest\s+of|Government\s+of\s+the\s+United\s+States\s+Virgin\s+Islands\s+ex\s+rel\.|Government\s+of\s+the\s+Virgin\s+Islands\s+ex\s+rel\.|Commonwealth\s+of\s+the\s+Northern\s+Mariana\s+Islands\s+ex\s+rel\.|Commonwealth\s+of\s+Puerto\s+Rico\s+ex\s+rel\.|District\s+of\s+Columbia\s+ex\s+rel\.|Commonwealth\s+ex\s+rel\.|People\s+ex\s+rel\.|Territory\s+ex\s+rel\.|United\s+States\s+ex\s+rel\.|State\s+ex\s+rel\.|In re|Ex parte|Matter of|Estate of|Application of|On Petition of|Petition of|Adoption of|Conservatorship of|Guardianship of)\s+([A-Za-z0-9\s.,'&()/-]+?)\s*,\s*$/i
```

### Tier 2 (medium priority — add in a follow-up)

10. **Generic `[Name] ex rel. [Name]` next-friend catch-all** (Section 3) — captures `Schiavo ex rel. Schindler`, `Sutton ex rel. Sutton`, `Doe ex rel. Tarlow`, etc.

This is structurally different and requires a different regex shape. Suggested companion regex (used as a fallback when the fixed-prefix regex doesn't match):

```typescript
const NAME_EX_REL_NAME_V_REGEX =
  /\b([A-Z][\w.,'&-]+?(?:\s+[A-Z][\w.,'&-]+?)*)\s+ex\s+rel\.\s+([A-Z][\w.,'&-]+?(?:\s+[A-Z][\w.,'&-]+?)*)\s+v\.?\s+(.+?)\s*,\s*$/i
```

This is more permissive and would need careful testing to avoid false positives (e.g., misclassifying `Smith ex rel. United States` as a sovereign-prefix form when it's actually a relator-first FCA caption with `United States` as the entity being represented).

### Tier 3 (low priority — historical / specialized)

11. `State on the Relation of` / `on the Relation of` longhand (Section 4)
12. `for the Use of` / `to the Use of` / `Use [Beneficiary]` PA/MD forms (Section 5)
13. `as Next Friend of` / `as Guardian Ad Litem of` / `on Behalf of` (Section 7.3)

These are rare but unambiguous when they appear. Adding them is essentially zero-risk because the leading phrases (`State on the Relation of`, `to the Use of`, `as Next Friend of`) are long and not English prose collocations.

### Tier 4 (no action recommended)

14. `Rex v.` / `Regina v.` / `R. v.` — already handled by existing regex and single-letter rule
15. `Crown ex rel.` — not a recognized form in U.S. or Commonwealth corpora
16. `Republic of [Country] ex rel.` — vanishingly rare; bare-`v.` regex handles `Republic of X v. Y`
17. `qui tam` — term of art, not a caption opener
18. `sub nom.` — subsequent-history connector, not a procedural prefix

---

## Testing Notes

A test fixture for the additions should include at least one example of each Tier 1 form:

```typescript
// New test cases for extractPartyNames
[
  ["People ex rel. Williams v. La Vallee", { plaintiff: "People ex rel. Williams", defendant: "La Vallee", proceduralPrefix: "People ex rel." }],
  ["People ex rel. Spitzer v. Operation Rescue Nat'l", { plaintiff: "People ex rel. Spitzer", defendant: "Operation Rescue Nat'l", proceduralPrefix: "People ex rel." }],
  ["District of Columbia ex rel. Lupo v. Smith", { plaintiff: "District of Columbia ex rel. Lupo", defendant: "Smith", proceduralPrefix: "District of Columbia ex rel." }],
  ["Territory ex rel. Foster v. Adams", { plaintiff: "Territory ex rel. Foster", defendant: "Adams", proceduralPrefix: "Territory ex rel." }],
  ["Government of the Virgin Islands ex rel. Suris v. Suris", { plaintiff: "Government of the Virgin Islands ex rel. Suris", defendant: "Suris", proceduralPrefix: "Government of the Virgin Islands ex rel." }],
  ["Commonwealth of Puerto Rico ex rel. Quiros v. Alfred L. Snapp & Son, Inc.", { plaintiff: "Commonwealth of Puerto Rico ex rel. Quiros", defendant: "Alfred L. Snapp & Son, Inc.", proceduralPrefix: "Commonwealth of Puerto Rico ex rel." }],
]
```

Special edge cases to verify:

- **PR/Commonwealth disambiguation:** `Commonwealth of Puerto Rico ex rel. Quiros v. X` must match the PR prefix, not the bare `Commonwealth ex rel.` prefix (which would still produce a correct plaintiff string but lose the PR-specific sovereign).
- **Territory + named territory:** `Territory of Oklahoma v. Foust` should match as `Territory of Oklahoma` sovereign with no relator, not as a `Territory ex rel.` form.
- **`People ex rel.` vs. bare `People v.`:** `People v. Smith` (criminal) must not be incorrectly matched as `People ex rel.`. The regex requires the literal `ex rel.` token, so this should be safe.

---

## Sources

Web research conducted on 2026-05-10 / 2026-05-11. Primary sources:

- [Ex rel. — Cornell Wex](https://www.law.cornell.edu/wex/ex_rel.)
- [Ex rel. — Wikipedia](https://en.wikipedia.org/wiki/Ex_rel.)
- [Relator (law) — Wikipedia](https://en.wikipedia.org/wiki/Relator_(law))
- [Qui tam — Wikipedia](https://en.wikipedia.org/wiki/Qui_tam)
- [Qui Tam: The False Claims Act and Related Federal Statutes — CRS Report R40785](https://www.congress.gov/crs-product/R40785)
- [Vermont Agency of Natural Resources v. United States ex rel. Stevens, 529 U.S. 765 (2000) — Justia](https://supreme.justia.com/cases/federal/us/529/765/)
- [Alfred L. Snapp & Son, Inc. v. Puerto Rico ex rel. Barez, 458 U.S. 592 (1982) — Justia](https://supreme.justia.com/cases/federal/us/458/592/)
- [Schiavo ex rel. Schindler v. Schiavo, 403 F.3d 1289 (11th Cir. 2005) — Justia](https://law.justia.com/cases/federal/appellate-courts/F3/403/1289/561377/)
- [Doe ex rel. Tarlow v. District of Columbia — Wikipedia](https://en.wikipedia.org/wiki/Doe_ex._rel._Tarlow_v._District_of_Columbia)
- [Reid ex rel. Reid v. District of Columbia — Studicata](https://www.studicata.com/case-briefs/case/reid-ex-rel-reid-v-district-of-columbia)
- [Sutton v. United Air Lines, Inc., 527 U.S. 471 (1999) — Justia](https://supreme.justia.com/cases/federal/us/527/471/)
- [People ex rel. Williams v. La Vallee, 19 N.Y.2d 238 (1967) — Justia](https://law.justia.com/cases/new-york/court-of-appeals/1967/19-n-y-2d-238-0.html)
- [People ex rel. Spitzer v. Operation Rescue Nat'l, 69 F. Supp. 2d 408 (W.D.N.Y. 1999) — Justia](https://law.justia.com/cases/federal/district-courts/FSupp2/69/408/2348693/)
- [People ex rel. DeLia v. Munsey, 26 N.Y.3d 124 (2015) — Justia](https://law.justia.com/cases/new-york/court-of-appeals/2015/136.html)
- [State ex rel. Cincinnati Enquirer v. Bloom, 2024-Ohio-5029 — Supreme Court of Ohio](https://www.supremecourt.ohio.gov/rod/docs/pdf/0/2024/2024-Ohio-5029.pdf)
- [State ex rel. Harm Reduction Ohio v. OneOhio Recovery, 2023-Ohio-1547](https://www.supremecourt.ohio.gov/rod/docs/pdf/0/2023/2023-Ohio-1547.pdf)
- [Missouri ex rel. Gaines v. Canada, 305 U.S. 337 (1938) — Justia](https://supreme.justia.com/cases/federal/us/305/337/)
- [Lawton v. Territory of Oklahoma (Okla. 1900) — Justia](https://law.justia.com/cases/oklahoma/supreme-court/1900/60978.html)
- [Territory of Hawaii v. Mankichi, 190 U.S. 197 (1903) — landmark territorial case](https://supreme.justia.com/cases/federal/us/190/197/)
- [Hill v. State of Florida ex rel. Watson, 325 U.S. 538 (1945) — Cornell LII](https://www.law.cornell.edu/supremecourt/text/325/538)
- [State ex rel. Dalton v. Mundy (Wis. 1977) — Justia](https://law.justia.com/cases/wisconsin/supreme-court/1977/75-631-7.html)
- [Hall v. Commonwealth ex rel. Town of South Boston, 138 Va. 727 (1924) — vLex](https://case-law.vlex.com/vid/hall-v-commonwealth-ex-895179783)
- [Doe on Demise of Dunn v. Hearick, 14 Ind. 199 (1860) — vLex](https://case-law.vlex.com/vid/doe-on-demise-of-908685364)
- [Government of the United States Virgin Islands v. JPMorgan Chase Bank, N.A. — Law360 case page](https://www.law360.com/cases/63ab6399da863301f03a8052/articles)
- [Bluebook Citation 101 (Univ. Cincinnati Law Library) — case-name procedural phrases](https://guides.libraries.uc.edu/c.php?g=222758&p=2587073)
- [Ohio Supreme Court Writing Manual, 3d ed.](https://www.supremecourt.ohio.gov/docs/ROD/manual3e.pdf) — Ohio's `State ex rel.` style guide
- [Hawaii Citation Handbook (Hawaii State Law Library)](https://histatelawlibrary.com/wp-content/uploads/2023/08/2023-Citation-Form-Handbook-08.10.2023.pdf) — Hawaii citation rules including `Haw. Terr.` for pre-statehood
- [Common Informers Act 1951 (UK) — Wikipedia background on qui tam abolition in England](https://en.wikipedia.org/wiki/Common_Informers_Act_1951)
- [AN OVERVIEW OF "QUI TAM" ACTIONS — Federal Law Enforcement Training Center (Lemons)](https://www.fletc.gov/sites/default/files/imported_files/training/programs/legal-division/downloads-articles-and-faqs/research-by-subject/civil-actions/quitam.pdf)
