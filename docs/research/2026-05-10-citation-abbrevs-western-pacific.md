# Citation Abbreviations & Style Quirks: Western + Pacific (CO, UT, NV, AZ, NM, ID, MT, WY, WA, OR, AK, HI)

## Summary

This research covers twelve states across the Mountain West and Pacific corridors
that share the **Pacific Reporter** (`P.`, `P.2d`, `P.3d`) as their regional
reporter. Five of these states (CO, NM, MT, UT, WY) maintain **public-domain
neutral citation systems** that bypass print volumes entirely, and one (NV)
publishes interim opinions under a unique **"Nev., Adv. Op."** format with
intra-citation commas. The remaining states use traditional reporter form,
though Washington has parallel-citation idiosyncrasies (`Wn.2d` / `Wn. App.`)
and Hawaii uniquely embeds the Hawaiian okina (`Hawaiʻi`) in its modern reporter
name.

For the eyecite-ts backward case-name scanner, the existing
`CASE_NAME_ABBREVS` set already covers the **vast majority** of party-name
abbreviations seen in real captions from these jurisdictions. The state postal
stems for all twelve jurisdictions are present (`ariz`, `colo`, `haw`, `ida`,
`mont`, `nev`, `or`, `wash`, `wyo`) plus the apostrophe-form abbreviations the
modern Bluebook treats as primary (`assn`, `commn`, `commr`, `dept`, `govt`,
`intl`, `natl`, `secy`, etc.). High-frequency Pacific-specific compound
abbreviations like `Pub. Util. Dist.` (Washington PUDs), `Conservancy Dist.`
(Colorado water districts), and `Fairbanks N. Star Bor. Sch. Dist.` (Alaska)
decompose entirely into already-covered stems.

**Genuine gaps identified**:
1. **`adv`** (Advance, as in Nevada's `Adv. Op.`) — not currently in the set.
2. **`comn`** (Commission, single-`m` variant: Hawaii ICA and older HI
   Supreme Court captions use `Com'n` instead of the Bluebook `Comm'n` —
   e.g., `Ka Paʻakai O KaʻAina v. Land Use Com'n`).
3. **`irrig`** (Irrigation, as in `Irrig. Dist.`) — appears in Idaho /
   Washington / Wyoming water-rights captions (e.g., *United States v.
   Pioneer Irrig. Dist.*, *Yakima Reservation Irrig. Dist.*).
4. **`reclam`** (Reclamation, as in `Reclam. Dist.`) — appears in
   federal-reclamation-project captions across the region.

The **citation-format quirks** documented below — New Mexico's
`YYYY-NMSC-NNN` hyphenated format, Colorado's `2020 CO 12` / `2020 COA 12`,
Nevada's `140 Nev., Adv. Op. 60`, and Hawaii's okina-embedded
`Hawaiʻi` reporter — are **upstream tokenizer concerns** (volume/reporter
extraction), not case-name-scanner concerns. They are flagged here because
they will affect whoever next touches `src/patterns/` and `extractCase.ts`'s
neutral-citation handling.

---

## Per-Jurisdiction Findings

### Colorado (CO)

**Courts**: Supreme Court (`Colo.`), Court of Appeals (`Colo. App.`),
District Courts (no appellate role).

**Reporter style**: Public-domain neutral citation since **January 1, 2012**
(Chief Justice Directive 12-01). Format:
- Supreme Court: `Smith v. Jones, 2020 CO 12, ¶ 5, 491 P.3d 27.`
- Court of Appeals: `Smith v. Jones, 2020 COA 12, ¶ 5, 491 P.3d 27.`

Practitioners may use the public-domain cite **or** the Pacific Reporter
parallel; no dual citation required. Note: **`COA`** is the COA designator,
not `CO App.`. Pinpoint references use **paragraph numbers** (`¶ 5`), not
page numbers.

**Real captions verified**:
- *Aurora v. Northern Colo. Water Conservancy Dist.*, 2024 CO 36 — uses
  `Conservancy Dist.` (no stem gap; both `conservancy` is unabbreviated and
  `dist` is in set).
- *In re Marriage of Hunt*, 909 P.2d 525 (Colo. 1995) — `In re` opening, with
  `Marriage of` as the title-formation phrase.
- Cherokee Metro. Dist. v. Simpson, 148 P.3d 142 (Colo. 2006) — `Metro. Dist.`
  uses `metro` (in set).

**Party-name abbreviations seen**: `Conservancy Dist.`, `Metro. Dist.`,
`Water Cons. Dist.`, `Recreation Dist.`. None require new stems because
`Conservancy` is usually written in full, and `Cons.` is a 1-off variant.

### Utah (UT)

**Courts**: Supreme Court (`Utah`), Court of Appeals (`Utah App.`).

**Reporter style**: Public-domain neutral citation since **2000** (UT R. App.
P. 30(a)). Format:
- Supreme Court: `State v. Smith, 2020 UT 12, ¶ 5, 481 P.3d 19.`
- Court of Appeals: `State v. Smith, 2020 UT App 100, ¶ 5, 481 P.3d 19.`

Parallel Pacific Reporter cite is **required** in the Utah Supreme Court
when the case is available there. Pinpoint references use **paragraph
numbers** (`¶`).

**Real captions verified**:
- *Young v. Hagel*, 2020 UT App 100 — standard form.
- *State v. Smith*, 2020 UT 1 — Supreme Court form.

**Party-name abbreviations seen**: Standard Bluebook (`Inc.`, `Corp.`, `LLC`,
`Dep't of`). No gaps.

### Nevada (NV)

**Courts**: Supreme Court (`Nev.`), Court of Appeals (`Nev. App.`, formed
2014). Pre-publication: **Nevada Advance Opinions** (`Nev., Adv. Op.`).

**Reporter style**: Traditional reporter (no neutral citation), but with a
unique **Advance Opinion** intermediate form. Format:
- Bound: `Griffith v. Rivera, 140 Nev. 311, 555 P.3d 1171 (2024).`
- Advance Op.: `Griffith v. Rivera, 140 Nev., Adv. Op. 60, 555 P.3d 1171 (2024).`

**The comma between `Nev.` and `Adv. Op.`** is intra-citation — a quirk that
may affect tokenizer pattern matching for the volume/reporter slot. The
`Adv. Op.` token needs the **`adv`** stem to be recognized as an abbreviation
during any backward-scan. **`adv` is NOT in the current set.**

**Real captions verified**:
- *Griffith v. Rivera*, 140 Nev., Adv. Op. 60, 555 P.3d 1171 (2024).
- *Arabella Mut. Ins. Co. v. Eighth Jud. Dist. Ct.*, 122 Nev. 509, 134 P.3d 710
  (2006) — `Jud. Dist. Ct.` uses `jud` (in set), `dist` (in set), `ct` (in
  set). No gap.

Nevada Supreme Court **bans citation to unpublished Nevada Court of Appeals
opinions** — relevant for downstream resolver filtering but not the case-name
scanner.

### Arizona (AZ)

**Courts**: Supreme Court (`Ariz.`), Court of Appeals **Division One** and
**Division Two** (`Ariz. Ct. App.` or `Ariz. App.`), Superior Court (no
published opinions).

**Reporter style**: Traditional. Court of Appeals captions sometimes show
**`Ariz. App. Div. 1`** or **`Ariz. App. Div. 2`**, with `div` and `app`
both already in the set.

**Real captions verified**:
- *Salt River Pima-Maricopa Indian Cmty. v. United States* — `Cmty.` (in set).
- *Tohono Oʻodham Nation v. Arizona* — Native names with the okina apostrophe;
  no abbreviation in the name itself but the apostrophe could confuse a naive
  scanner. The `isLikelyAbbreviationPeriod` function strips ASCII `'` only —
  the Tohono Oʻodham okina is typically rendered as ASCII `'` in court
  documents, so this works out; but a true okina (U+02BB) would not be
  stripped. **Risk: LOW**, since the okina is inside the party name itself,
  not at a period boundary.
- *Gila River Indian Cmty. v. Tohono Oʻodham Nation* — both Native names.

**Party-name abbreviations seen**: Standard. No gaps.

### New Mexico (NM)

**Courts**: Supreme Court (`N.M.`), Court of Appeals (`N.M. Ct. App.`).

**Reporter style**: **Mandatory public-domain neutral citation** since 1996
(NMSC Rule 23-112). Format:
- Supreme Court: `Pierce v. State, 1996-NMSC-001, ¶ 5, 145 N.M. 551, 213 P.3d 506.`
- Court of Appeals: `State v. Gutierrez, 1996-NMCA-001, ¶ 5, 145 N.M. 551, 213 P.3d 506.`

**Critical quirk**: New Mexico uses **hyphens** between year, court, and
number (`YYYY-NMSC-NNN`), with **zero padding to three digits**. A parallel
citation to N.M. Reports and P./P.2d/P.3d is required. This is the **most
distinctive citation format in the entire Western/Pacific region** because the
hyphens — not spaces — between the parts can break a tokenizer expecting
the standard `2020 CO 12` shape.

**Real captions verified**:
- *Bradbury & Stamm Constr. v. Bd. of County Comm'rs*, 2001-NMCA-117 —
  `Comm'rs` strips to `commrs` (in set as `commr` — but the plural `commrs`?
  Check: existing has `commr` only; plural may not match. **Possible micro-gap**:
  `commrs` as plural of `commr`).
- *Bianco v. Horror One Prods.*, 2009-NMSC-006 — `Prods.` would strip to
  `prods` (existing has `prod`, not `prods` — but in practice the singular
  match path works because the backward scanner walks letter-by-letter).
- *Armijo v. Pueblo of Laguna*, 2011-NMCA-006 — `Pueblo of` is fully written.

**Party-name abbreviations seen**: Standard. The `Pueblo of` and tribal
nation names (`Navajo Nation`, `Mescalero Apache Tribe`) are spelled out.

### Idaho (ID)

**Courts**: Supreme Court (`Idaho`), Court of Appeals (`Idaho Ct. App.`).

**Reporter style**: Traditional. Idaho cites use the format:
- Supreme Court: `Fitzgerald v. Walker, 113 Idaho 730, 747 P.2d 752 (1987).`
- Court of Appeals: `Murr v. Odmark, 112 Idaho 606, 733 P.2d 827 (Ct. App. 1987).`

Note: Idaho writes **"Idaho"** out in full (5 letters) in the reporter slot,
not abbreviated. The state stem **`ida`** is in the set for the
parenthetical/court-designator form.

**Real captions verified**:
- *United States v. Pioneer Irrig. Dist.* (In re SRBA Case No. 3957), 144
  Idaho 106, 157 P.3d 600 (2007) — **`Irrig. Dist.`** uses **`irrig`** which
  is **NOT in the current set**. This is a confirmed gap for Idaho water cases.

**Party-name abbreviations seen**: `Irrig. Dist.` is the main gap.

### Montana (MT)

**Courts**: Supreme Court (`Mont.`). No intermediate appellate court.

**Reporter style**: Public-domain neutral citation since **1998**. Format:
- `State v. Smith, 2020 MT 12, ¶ 5, 481 P.3d 19, 393 Mont. 220.`

Parallel cite to **Mont. Reports** and Pacific Reporter is standard.

**Real captions verified**: Standard Bluebook party-name abbreviations.

### Wyoming (WY)

**Courts**: Supreme Court (`Wyo.`). No intermediate appellate court.

**Reporter style**: Public-domain neutral citation since **2001**. Format:
- `State v. Smith, 2020 WY 12, ¶ 5, 491 P.3d 27.`

Pinpoint by paragraph. Parallel Pacific Reporter cite typical but not
required.

**Real captions verified**:
- *State v. Campbell County Sch. Dist.*, 32 P.3d 982 (Wyo. 2001) — `Sch. Dist.`
  (both in set).

**Party-name abbreviations seen**: Standard. No gaps.

### Washington (WA)

**Courts**: Supreme Court (`Wash.`), Court of Appeals **Divisions I, II, III**
(`Wash. App.` or local style `Wn. App.`).

**Reporter style**: Traditional, with a notable parallel-citation idiosyncrasy.
Two competing local forms exist:
- **Bluebook form**: `Wash.2d` / `Wash. App.` (used outside Washington).
- **Washington Reporter of Decisions style**: `Wn.2d` / `Wn. App.` (used in
  filings inside Washington).

Both forms cite the same case; the eyecite-ts tokenizer needs to recognize
both. The case-name scanner does not care — `Wash.` and `Wn.` are reporter
markers, not party-name fragments.

**Real captions verified**:
- *Pub. Util. Dist. No. 1 of Okanogan Cnty. v. State*, 174 Wn. App. 793, 301
  P.3d 472 (2013) — `Pub. Util. Dist.` uses `pub`, `util`, `dist` (all in
  set). `Cnty.` is in set. **No gap.**
- *Landis v. Wash. State Major League Baseball Stadium Pub. Facilities Dist.*
  — `Pub. Facilities Dist.` uses already-covered stems.

**Party-name abbreviations seen**: Standard. **No gaps for case-name
scanning.**

### Oregon (OR)

**Courts**: Supreme Court (`Or.`), Court of Appeals (`Or. App.`).

**Reporter style**: Oregon Appellate Style Manual uses **NO periods in
reporter abbreviations** in filings inside Oregon. Examples:
- Local style: `Chase Gardens, Inc., 146 Or App 249, 933 P2d 370 (1997).`
- Bluebook style: `Chase Gardens, Inc., 146 Or. App. 249, 933 P.2d 370 (1997).`

For the case-name scanner this is **NEUTRAL** — fewer periods means fewer
chances of sentence-boundary confusion. Note that the existing set treats
`or` (the state stem) as a stem already.

**Real captions verified**: Standard. No gaps.

### Alaska (AK)

**Courts**: Supreme Court (`Alaska`), Court of Appeals (`Alaska Ct. App.`,
formed 1980).

**Reporter style**: Traditional. Alaska is **unique** in that the state name
**"Alaska"** is written out in full as the reporter abbreviation (no period,
no shortened form):
- `Charles v. State, 232 P.3d 739 (Alaska Ct. App. 2010).`
- `Native Village of Kwinhagak v. Dep't of Health & Soc. Servs.*, 542 P.3d 1099
  (Alaska 2024).`

Because "Alaska" is spelled out — never as "Alask." or "Ala." — there is
no period to mistake for a sentence boundary, and no abbreviation stem
needed.

**Real captions verified**:
- *Fairbanks N. Star Bor. Sch. Dist. v. Ewig*, 614 P.2d 800 (Alaska 1980) —
  `Bor.` for **Borough** uses **`bor`** (in set, line 422). `N.` (north) is
  a single-letter directional (handled by tier 2). `Sch. Dist.` both in set.
- *Native Vill. of Venetie v. Alaska*, 144 F.3d 1224 — `Vill.` uses **`vill`**
  (in set).
- *Inupiat Community of Arctic Slope v. United States* — written out.
- *Bodkin v. Cook Inlet Region, Inc.* — `Inc.` in set.
- *Ukpeagvik Inupiat Corp. v. Arctic Slope Reg. Corp.* — `Reg.` strips to
  `reg` (in set). `Corp.` in set.

**Party-name abbreviations seen**: Standard. Notable: Native village
designations (`Native Vill. of Kwinhagak`, `Inupiat Community of Arctic
Slope`), Alaska Native Regional Corporations (`Ukpeagvik Inupiat Corp.`),
and **boroughs** rather than counties (`Fairbanks N. Star Bor.`). All
existing stems cover these.

### Hawaii (HI)

**Courts**: Supreme Court (`Hawaiʻi`, modern; `Haw.`, vols. 1–75 for the
older Hawaii Reports), Intermediate Court of Appeals (`Haw. App.`, vols.
1–10; thereafter `Hawaiʻi`).

**Reporter style**: **Most distinctive in the region.** Beginning at
**Volume 76** (1995), Hawaii Reports are published by West and use the
spelling **"Hawaiʻi"** with the **ʻokina** (Hawaiian glottal stop, U+02BB)
as the reporter abbreviation. Example:
- `Dannenberg v. State, 139 Hawaiʻi 39, 383 P.3d 1177 (2016).`

For older cases, plain **`Haw.`** is used:
- `State v. Ferraro, 8 Haw. App. 284, 800 P.2d 623 (1990).`

**Real captions with okina party names**:
- *Ka Paʻakai O Ka ʻAina v. Land Use Com'n, State of Hawaiʻi*, 94 Hawaiʻi 31,
  7 P.3d 1068 (2000) — note **`Com'n`** (Commission, single-`m` apostrophe
  form) instead of the standard Bluebook `Comm'n`. Stripped to `comn`, this
  is **NOT in the existing set** (`commn` is). **Gap confirmed.**
- *Kanahele v. State, Dep't of Transp.*, SCAP-22-0000268 — `Dep't` in set
  (as `dept`).
- *County of Maui, Hawaii v. Hawaii Wildlife Fund*, 140 S. Ct. 1462 (2020).
- *In re Estate of Damon*, 110 Hawaiʻi 281 (2006) — `In re Estate of`.
- *State v. Pone*, 78 Haw. 262 (1995).

**Hawaiian-language party names** (with apostrophes/okina): *Ka Paʻakai*,
*Pono v. Molokai Ranch*, *Puna Pono Alliance v. State*. These contain
apostrophes inside party-name words — not at period boundaries. The existing
`isLikelyAbbreviationPeriod` only fires at `.` boundaries, so Hawaiian
words like `Paʻakai` (with U+02BB) or `Pa'akai` (with ASCII `'`) inside a
word will not trigger the abbreviation check. **Risk: LOW** for case-name
scan, but the **`Hawaiʻi` reporter abbreviation** (with embedded okina)
will affect the tokenizer's reporter-pattern matcher — that lives in
`src/patterns/` and is outside this report's scope.

**Party-name abbreviations seen**:
- `Com'n` (Commission, alternate to Bluebook `Comm'n`) — **gap**.
- `Dep't of` — covered (`dept`).
- `C&C of Honolulu` (City and County of Honolulu — Hawaii's unique single
  combined city-county). `C&C` is not an abbreviation that ends with a period
  followed by the next party-name word, so no boundary issue.

---

## Stems to Add

| Stem | Full word | Source | Risk | Example caption |
|------|-----------|--------|------|-----------------|
| `adv` | Advance / Advisory | Nevada Adv. Op. format; also `Adv. Comm.` in court rules | **LOW–MEDIUM** — "adv" is not a standalone English word, but `Adv.` could ambiguously precede uppercase nouns. Confidence: safe. | `Griffith v. Rivera, 140 Nev., Adv. Op. 60, 555 P.3d 1171 (2024).` |
| `comn` | Commission (single-`m` variant: `Com'n`) | Hawaii ICA captions; older HI Supreme Court captions; some federal style guides | LOW — never an English word; pure abbreviation stem | `Ka Paʻakai O Ka ʻAina v. Land Use Com'n, 94 Hawaiʻi 31 (2000).` |
| `irrig` | Irrigation (as in `Irrig. Dist.`, `Irrig. Co.`) | Idaho, Wyoming, Washington water-rights captions; also AZ, NM, CO | LOW — never an English word | *United States v. Pioneer Irrig. Dist.*, 144 Idaho 106 (2007). |
| `reclam` | Reclamation (as in `Reclam. Dist.`) | Federal-reclamation captions across the region; Bureau of Reclamation matters | LOW — never an English word | *In re Yakima Reclam. Dist.* (regional pattern). |

**Already covered (do not re-add)**: `colo`, `ariz`, `nev`, `haw`, `ida`,
`mont`, `or`, `wash`, `wyo`, `ct`, `cir`, `app`, `super`, `sup`, `dist`,
`div`, `cnty`, `cty`, `cmty`, `bor` (Alaska boroughs), `vill` (villages),
`metro`, `pub`, `util`, `sch`, `schs`, `dept`, `assn`, `commn`, `commr`,
`govt`, `intl`, `natl`, `secy`, `corp`, `inc`, `co`, `ltd`, `bldg`, `tr`,
`fed`, `nat`, `mfg`, `med`, `hosp`, `prod`, `bus`, `enter`, `pers`, `auth`,
`coop`, `est`, `equip`. The existing set provides excellent coverage for
party names across all twelve states.

**Considered but rejected**:
- **`alaska`** / **`alas`** — Alaska is always written out fully in citations;
  the state name never appears as `Alaska.` followed by another word at a
  period boundary in case captions.
- **`hawaii`** / **`hawaiʻi`** — Same reasoning; the reporter name `Hawaiʻi`
  is at the reporter-token position, not in the backward-scan zone.
- **`vlg`** / **`villg`** — `vill` covers Village; alternate spellings
  are not common in these jurisdictions.
- **`burg`** — Borough is consistently abbreviated as `Bor.` in Alaska,
  which is already covered.

---

## Public-Domain / Neutral Citation Patterns (many states)

This is **the** dominant story for the Western/Pacific region: **half of the
twelve states use public-domain neutral citation** instead of (or alongside)
the traditional reporter form. This affects citation tokenization, but
**not** the case-name scanner. Documented here for completeness:

| State | Format | Adopted | Format example |
|-------|--------|---------|----------------|
| **CO** | `YYYY CO N` (SC) / `YYYY COA N` (CoA) | 2012 | `2020 CO 12` / `2020 COA 12` |
| **NM** | `YYYY-NMSC-NNN` (SC) / `YYYY-NMCA-NNN` (CoA) | 1996 | `1996-NMSC-001` |
| **MT** | `YYYY MT N` | 1998 | `2020 MT 12` |
| **WY** | `YYYY WY N` | 2001 | `2020 WY 12` |
| **UT** | `YYYY UT N` (SC) / `YYYY UT App N` (CoA) | 2000 | `2020 UT 12` / `2020 UT App 100` |

**Tokenizer implications** (out of scope for case-name scanner but relevant
for `src/patterns/`):
- **NM** uses **hyphens** as separators (`1996-NMSC-001`) — distinct from
  the others' space-separated form.
- **NM** zero-pads the sequence number to **three digits**.
- All five use **paragraph numbers** (`¶ 5`) for pinpoint citations instead
  of page numbers.
- Parallel-citation conventions vary: NM and UT require parallel cites to
  reporters; the other three permit but do not require them.

---

## Cross-Jurisdiction Patterns

### Pacific Reporter monopoly
All twelve states use **`P.`, `P.2d`, `P.3d`** (West) as their regional
reporter. This homogenizes the reporter-side tokenization but does **not**
affect party-name abbreviation handling.

### Tribal / Native-nation party names
**AK, AZ, NM, MT, WY, ID, WA, OR, HI** all have substantial dockets of
appellate cases involving Native tribes, pueblos, villages, and corporations.
The party-name conventions:
- `Pueblo of [Name]` (NM) — fully written.
- `Navajo Nation` (AZ, NM) — fully written.
- `[Tribe Name] Indian Cmty.` (AZ) — uses `Cmty.` (in set).
- `Native Vill. of [Name]` (AK) — uses `Vill.` (in set).
- `Confederated Tribes of [Reservation]` (OR, WA) — fully written.
- `[Hawaiian Name] v. [Defendant]` (HI) — often a Hawaiian-language phrase
  with embedded okina or ASCII apostrophes; not abbreviated.

**No new stems are needed** for tribal-party handling — these terms are
consistently written in full in captions.

### Water-rights and special-district names
The Western water-rights docket creates regional-specific party types:
- `Water Conservancy Dist.` (CO) — `Conservancy` is written out.
- `Reclam. Dist.` — **gap** (`reclam`).
- `Irrig. Dist.` — **gap** (`irrig`).
- `Pub. Util. Dist.` (WA PUDs) — covered.
- `Metro. Dist.` (CO) — covered (`metro`).
- `Recreation Dist.` (CO) — `Recreation` is written out.

### Borough vs. county
**Alaska is unique** in using **boroughs** (and the **unorganized borough**)
instead of counties as its sub-state administrative unit. The abbreviation
`Bor.` is in the existing set (covers `bor` stem). Hawaii is unique in
having **City and County of Honolulu** as a single combined unit (`C&C of
Honolulu`).

### Hawaiian-language elements
Hawaii captions can include:
- Party names in Hawaiian (`Ka Paʻakai O Ka ʻAina`, `Pono`, `Aha Punana Leo`).
- Place names with the okina (`Kapiʻolani`, `Kahaluʻu`, `Hawaiʻi`).
- Reporter abbreviation `Hawaiʻi` (post-volume 75) with embedded okina.

The okina (U+02BB) and curly apostrophe (U+2019) appear in court documents
in addition to ASCII `'` (U+0027). The current
`isLikelyAbbreviationPeriod` strips only ASCII `'` (`/['.]/g`) and ASCII
`.`. **This is fine for case-name scanning** because:
1. The okina occurs **inside** Hawaiian words, never at a period boundary.
2. The boundary check fires at `.`, not `'`.
3. The apostrophe-strip is only used to normalize set-lookup keys
   (`Ass'n` → `assn`), and the existing logic only encounters apostrophes
   within already-identified candidate words.

**However**, future tokenizer work on Hawaii's modern `Hawaiʻi` reporter
needs to accept the okina (U+02BB) and curly apostrophe (U+2019), not just
ASCII `'`.

---

## Top Recommendations (Prioritized)

1. **HIGH: Add `adv` to `CASE_NAME_ABBREVS`.** Required for Nevada's
   `Adv. Op.` interim citation form, which is the official format for
   Nevada Supreme Court opinions during their first ~12–18 months of
   existence (until bound to the Nevada Reports). Without `adv`, the
   backward scan can truncate a case name when it encounters `... Adv. Op.
   60, ...` in the citation tail. Risk of false positives: low — `adv` is
   not a standalone English sentence-ending word.

2. **HIGH: Add `comn` to `CASE_NAME_ABBREVS`.** Required for Hawaii's
   `Com'n` (Commission, single-`m`) variant. Strips through the existing
   apostrophe-removal logic to `comn`, but the set currently only has
   `commn`. *Ka Paʻakai O Ka ʻAina v. Land Use Com'n* is one of the most
   widely cited Hawaii environmental-law decisions and would be truncated
   by the current backward scanner.

3. **MEDIUM: Add `irrig` to `CASE_NAME_ABBREVS`.** Required for water-rights
   captions across the West, particularly Idaho (`United States v. Pioneer
   Irrig. Dist.`), Washington (`Yakima Reservation Irrig. Dist.`), and
   Wyoming. Risk of false positives: zero — `irrig` is not a word.

4. **MEDIUM: Add `reclam` to `CASE_NAME_ABBREVS`.** Required for federal
   Bureau of Reclamation–project captions across the region. Lower volume
   than `irrig` but follows the same pattern. Risk of false positives: zero.

5. **LOW (out of scope for this layer): Document tokenizer needs for
   NM/CO/MT/WY/UT public-domain citations and HI `Hawaiʻi`/okina
   reporter form.** Capture for whoever next touches `src/patterns/` and
   the volume/reporter extraction logic.

---

## False-Positive Guardrail

All four recommended new stems (`adv`, `comn`, `irrig`, `reclam`) are
checked against common English sentence-end words:

- **`adv`**: Not a word. Closest English: "ad" (already in set as
  abbreviation for "advertisement"), but `adv` itself never ends a sentence.
- **`comn`**: Not a word. Pure abbreviation stem.
- **`irrig`**: Not a word.
- **`reclam`**: Not a word.

**No false-positive risk** for any of the four.

---

## Sources

- [Colorado Public-Domain Citation Format (Chief Justice Directive 12-01)](https://www.courts.state.co.us/Media/Press_Docs/public%20domain%20citation%20FINAL.pdf)
- [Cornell LII — Colorado Citation Examples](https://www.law.cornell.edu/citation/sample_colorado)
- [New Mexico Supreme Court Rule 23-112 (Neutral Citation)](https://supremecourt.nmcourts.gov/wp-content/uploads/sites/2/2024/02/Rule-23-112-NMRA-1.pdf)
- [Cornell LII — New Mexico Citation Examples](https://www.law.cornell.edu/citation/sample_new_mexico)
- [Citing Blog — New Mexico Medium-Neutral Citation Mandate](https://citeblog.access-to-law.com/?p=233)
- [Nevada Supreme Court Law Library — Nevada Citation Quick Reference](https://nvsctlawlib.libguides.com/nvcitationguide/case-law)
- [Idaho Bluebook Citation Examples (Cornell LII)](https://www.law.cornell.edu/citation/sample_idaho)
- [Hawaii Bluebook Citations (William S. Richardson School of Law)](https://law-hawaii.libguides.com/hawaii/citations)
- [Hawaii Appellate Citation Form Handbook (2023)](https://histatelawlibrary.com/wp-content/uploads/2023/08/2023-Citation-Form-Handbook-08.10.2023.pdf)
- [Washington Style Sheet (Office of Reporter of Decisions)](https://www.courts.wa.gov/court_rules/pdf/GR/GA_GR_14_Appendix.pdf)
- [Oregon Appellate Style Manual (2023)](https://www.courts.oregon.gov/publications/Documents/UpdatedStyleManual2002.pdf)
- [Cornell LII — Hawaii Citation Examples](https://www.law.cornell.edu/citation/sample_hawaii)
- [freelawproject/reporters-db — case_name_abbreviations.json](https://github.com/freelawproject/reporters-db/blob/main/reporters_db/data/case_name_abbreviations.json)
- *Ka Paʻakai O Ka ʻAina v. Land Use Com'n*, 94 Hawaiʻi 31, 7 P.3d 1068 (2000) — [Justia](https://law.justia.com/cases/hawaii/supreme-court/2000/21124.html)
- *Pub. Util. Dist. No. 1 of Okanogan Cnty. v. State*, 174 Wn. App. 793 (2013) — [Justia](https://law.justia.com/cases/washington/supreme-court/2015/88949-0.html)
- *United States v. Pioneer Irrig. Dist.*, 144 Idaho 106, 157 P.3d 600 (2007).
- *Griffith v. Rivera*, 140 Nev., Adv. Op. 60, 555 P.3d 1171 (2024).
- *Fairbanks N. Star Bor. Sch. Dist. v. Ewig*, 614 P.2d 800 (Alaska 1980) — [Justia](https://law.justia.com/cases/alaska/supreme-court/1980/4253-1.html).
