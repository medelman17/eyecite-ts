# California Tax, Business, and Employment Citation Forms

**Scope:** Specialty California citation forms outside the core CSM case-law and
state-statute corpus. Covers tax agency decisions (OTA, SBE, FTB, CDTFA),
workers' compensation, labor/employment agencies (DLSE, IWC, PERB,
Cal/OSHA), CPUC, business filings, and select regulatory enforcement agencies
(DRE, CDI, CARB, DPR).

**Audience:** eyecite-ts contributors evaluating which CA agency citations
deserve dedicated patterns vs. opportunistic coverage via existing extractors.

---

## Summary

California's tax, business, and employment citation universe is structurally
distinct from its case-law corpus and is **only partly served by existing
eyecite-ts patterns**. The good news: three of the most-cited agency reporters
(`Cal. Comp. Cases`, `Cal. WCC`, `Cal. I.A.C.`) are already in
`data/reporters.json`, and most CA statute codes used in this space
(`Rev. & Tax.`, `Lab.`, `Ins.`, `Pub. Util.`, `Unemp. Ins.`, `Bus. & Prof.`,
`Gov.`) are already mapped in `src/data/knownCodes.ts` (lines 211-340).
The state-reporter tokenizer in `src/patterns/casePatterns.ts` already
captures `<NN> Cal. Comp. Cases <NNNN>` and `<NN> Cal. WCC <NNNN>` without
modification.

The **gaps are entirely on the agency-decision side**, where citations
do not follow the `<vol> Reporter <page>` shape and instead use opaque
"docket-ish" numbers that the existing pattern set cannot recognize:

| Gap                                            | Example                                              | Current handling                |
|------------------------------------------------|------------------------------------------------------|---------------------------------|
| OTA opinions                                   | `2024-OTA-377P`                                      | Mis-tokenized as `neutral`-3seg |
| SBE (pre-2018) opinions                        | `90-SBE-001` / `1992-SBE-057`                        | Mis-tokenized as `neutral`-3seg |
| PERB decisions                                 | `PERB Dec. No. 1199-S` (+ `[21 PERC ¶ 28099]`)       | Not tokenized                   |
| PERC parallel cite                             | `21 PERC ¶ 28099, p. 330`                            | Not tokenized                   |
| CPUC decisions                                 | `D.24-05-012`                                        | Not tokenized                   |
| CPUC resolutions                               | `Res. ALJ-445`, `Res. M-4877`                        | Not tokenized                   |
| FTB Legal Ruling / Notice / Chief Counsel Ruling | `FTB Legal Ruling 2006-03`, `FTB Notice 2017-05`     | Not tokenized                   |
| IWC Wage Orders                                | `IWC Wage Order 4-2001`, `Cal. Code Regs. tit. 8, § 11040` | Statute-side OK; bare form not |
| DLSE precedential decisions                    | `DLSE-PD-001`                                        | Not tokenized                   |
| Cal/OSHA Appeals Board decisions               | `Marine Terminals Corp., 08-1920`                    | Not tokenized                   |
| Cal. Code Regs. (title-section)                | `Cal. Code Regs. tit. 18, § 30501`                   | Likely matched by named-code; needs verification |

Three patterns (OTA/SBE, FTB-administrative, CPUC) cover the **largest
identifiable corpus volume** and are the highest-priority additions. PERB and
WCAB en banc parenthetical decoration are second-tier. Cal/OSHA, DLSE,
CDI, DRE, CARB, DPR citations appear too sporadically in
real-world legal text to justify dedicated tokenizer patterns; they are
covered (incompletely) by the existing case and statute paths.

The Mississippi 4-segment pattern (`/\b(\d{4})-([A-Z]+)-(\d+)-([A-Z]+)\b/g`)
already in `neutralPatterns.ts` will **misfire on OTA-style citations**
unless the new agency pattern is sequenced ahead of the generic
3-segment hyphenated neutral pattern. Order of alternation matters here
(documented behavior — see comment at `neutralPatterns.ts:21-26`).

---

## 1. California Office of Tax Appeals (OTA, post-2018)

### Canonical citation form

**`YYYY-OTA-NNN[P|N]`** — sometimes with a trailing case-name reference.

The OTA was created by AB 102 (2017) and assumed the State Board of
Equalization's tax-appeal jurisdiction effective Jan. 1, 2018. Its opinions
are numbered sequentially per year. Suffixes:

| Suffix | Meaning                                                      |
|--------|--------------------------------------------------------------|
| `P`    | **Precedential** (binding on OTA panels and CDTFA/FTB)       |
| `N`    | **Nonprecedential** (persuasive only)                        |
| none   | Reserved / older / not yet designated                        |

OTA also uses a "**Pending Precedential**" classification, which appears
in commentary but not in the citation string itself — the suffix is still `P`.
Once an opinion is finally designated precedential after the 30-day comment
window, the `P` becomes permanent.

### Real corpus examples

- `2024-OTA-377P` (*Appeal of Mather*) — OSTC claim, precedential
- `2024-OTA-382N` — nonprecedential
- `2023-OTA-069P` (*Appeal of Smith*) — precedential
- `2020-OTA-290P` (*In re Micelle Lab'ys, Inc.*) — pending-precedential when
  decided; later finalized
- `2018-OTA-001` — earliest OTA opinion (no suffix in some indexes)

Captions: OTA caption style follows two conventions —
**`In the Matter of the Appeal of <Taxpayer>`** (formal pleading caption) or
**`Appeal of <Taxpayer>`** (short citation form). Some older sales-and-use
tax matters use **`In re <Taxpayer>`** when the proceeding was inherited
from BOE. eyecite-ts case-name backward scan already handles
`Appeal of <Party>` and `In re <Party>` because both begin with title-case
tokens preceded by procedural-prefix language; see
`src/extract/extractCase.ts` `extractCaseName` and
`docs/research/2026-05-11-procedural-prefixes-bankruptcy.md` for the
generalized `in re` handling.

### Pincite forms

OTA opinions are not paginated as a reporter; they cite to the PDF page,
typically `Appeal of <Party>, 2024-OTA-377P, at p. 8`. Some older opinions
cite slip-opinion page numbers (`slip op. at 3`).

### Current eyecite-ts handling

The `state-vendor-neutral-hyphenated` pattern at
`src/patterns/neutralPatterns.ts:32-37`:

```js
/\b(\d{4})-([A-Z][A-Za-z]+)-(\d+)\b/g
```

**will match `2024-OTA-377`** but **drops the `P`/`N` suffix**. The pattern
will emit:

```js
{ type: "neutral", year: 2024, court: "OTA", documentNumber: "377" }
```

The `P` is unconsumed and remains in the trailing text, which may then
mismatch downstream pincite/year-paren matching. Also: a precedential
opinion's status is **lost** because the suffix is not captured.

Two specific failure modes:

1. **`2024-OTA-377P` matches the 3-segment pattern, but the trailing `P` is dropped**, leaving `P` as adjacent garbage text. This is a Mississippi-pattern (`/^(\d{4})-([A-Z]+)-(\d+)-([A-Z]+)$/`) edge case: a single trailing letter is not enough to match `-[A-Z]+`, so the 4-segment Mississippi pattern is bypassed (good — wouldn't classify as MS) but the suffix is unrecognized.
2. **`90-SBE-001`** (pre-2018 BOE form) does **NOT** match the 3-segment pattern at all because the leading year is two digits, not four. Pre-2018 SBE citations escape the current tokenizer entirely.

### Recommended action

**Add a dedicated `oa-sbe-neutral` pattern**, sequenced **before**
`state-vendor-neutral-hyphenated`:

```js
{
  id: "ca-ota-sbe-neutral",
  // OTA: 4-digit year + OTA + sequential + optional P/N (precedential marker).
  // SBE (pre-2018): 2- or 4-digit year + sbe + sequential.
  // Case-insensitive on the court token because SBE indexes use lowercase
  // "sbe" in some compilations.
  regex:
    /\b(?:(\d{4})-OTA-(\d+)([PN])?|(\d{2}|\d{4})-(?:SBE|sbe)-(\d+))\b/g,
  description:
    'California Office of Tax Appeals and pre-2018 Board of Equalization opinions (e.g., "2024-OTA-377P", "2020-OTA-290P", "1992-SBE-057", "90-sbe-001")',
  type: "neutral",
}
```

In `extractNeutral.ts`, branch on the OTA vs. SBE court token and surface
the `P`/`N` suffix as `precedentialStatus: "P" | "N" | undefined` on the
citation. Document the field in the `NeutralCitation` type. Priority: **HIGH**.

---

## 2. California State Board of Equalization (BOE/SBE, pre-2018)

### Canonical citation form

**`YYYY-SBE-NNN`** (occasionally hyphenated as `YY-sbe-NNN` in compilations).

The Board of Equalization heard tax appeals from 1879 until SB 102 of 2017
transferred them to OTA. SBE decisions retain precedential authority before
OTA per **Cal. Code Regs. tit. 18, § 30501(d)(3)**, so they remain heavily
cited in modern tax practice.

Three formal opinion types appear:

| Type                    | Citation form                                                              |
|-------------------------|----------------------------------------------------------------------------|
| **Formal Opinion**      | `Appeal of <Party>, YY-SBE-NNN` — full precedential opinion                |
| **Memorandum Opinion**  | `Appeal of <Party>, YY-SBE-NNN [Memo.]` — narrower precedential decision   |
| **Letter Decision**     | `Letter Decision <NN-NNNNN>` — non-precedential; agency-internal numbering |

Real captions:

- *Appeal of Harvey* (1992) 5 SBE 57 — appears in some older indexes as a
  volume-page citation rather than a `YY-SBE-NNN` slug
- *Appeal of Borden, Inc.*, 77-SBE-007 (Feb. 3, 1977)
- *Appeal of Finnigan Corp.*, 88-SBE-022 (1988)
- *Appeal of Microsoft*, 2006-SBE-001 (sometimes cited without hyphens)

### Two parallel notation styles

SBE decisions are cited in **two distinct shapes** that the tokenizer must
handle separately:

1. **Hyphenated slug**: `1992-SBE-057` or `92-SBE-057` — agency-issued
   alphanumeric identifier
2. **Volume-page** (pre-1980 informal): `5 SBE 57` — paragraph-style
   reference to the bound SBE compilation; this form is **not** in
   `data/reporters.json` and would be dropped if encountered

The hyphenated slug dominates the citation corpus from 1980 forward. The
volume-page form is largely confined to historical scholarship and is too
rare to merit dedicated coverage.

### Current eyecite-ts handling

As noted in §1, neither form is currently tokenized. The hyphenated form
fails the 4-digit year requirement of `state-vendor-neutral-hyphenated`.

### Recommended action

Covered by the combined `ca-ota-sbe-neutral` pattern proposed in §1.
Priority: **HIGH** (same pattern, same priority).

For the volume-page form (`5 SBE 57`), no action recommended — too rare;
add `SBE` as a reporter to `reporters.json` only if real-corpus testing
turns up significant volume.

---

## 3. California Franchise Tax Board (FTB) administrative authorities

The FTB issues three distinct types of administrative guidance, all of which
appear regularly in California tax briefs:

### 3.1 FTB Legal Rulings

**Form:** `FTB Legal Ruling YYYY-NN` (modern) or `Legal Ruling NN-N` (pre-1990s).

FTB Legal Rulings are published interpretations of CA income and franchise
tax law by the FTB Chief Counsel. They are equivalent to IRS Revenue Rulings
and bind FTB staff.

Examples:
- `FTB Legal Ruling 2006-03`
- `FTB Legal Ruling 2015-01`
- `FTB Legal Ruling 1998-2`
- `FTB Legal Ruling 1992-1`
- Legacy: `Legal Ruling 426` (single-number pre-1980s form)

### 3.2 FTB Notices

**Form:** `FTB Notice YYYY-NN`.

Notices announce regulatory changes, court-decision summaries, or
administrative position statements. They are persuasive but not binding
in the same sense as Legal Rulings.

Examples:
- `FTB Notice 2009-08`
- `FTB Notice 2017-05`
- `FTB Notice 2011-01`

### 3.3 FTB Chief Counsel Rulings

**Form:** `FTB Chief Counsel Ruling YYYY-NN` (modern, 2014+) or
`Chief Counsel Ruling YY-NNNN` (legacy, e.g., `2001-1278`).

Chief Counsel Rulings are taxpayer-specific written advice; they bind FTB
with respect to the requesting taxpayer only.

Examples:
- `Chief Counsel Ruling 2019-02`
- `Chief Counsel Ruling 2016-03`
- `Chief Counsel Ruling 2001-1278` (legacy 4-digit serial form)
- `Chief Counsel Ruling 99-0571`

### Current eyecite-ts handling

**None of the three forms tokenize today.** They lack reporter shape
(`<vol> Reporter <page>`) and the trigger phrase `FTB ...` is not in any
existing pattern.

### Recommended action

**Add a dedicated `ftb-administrative` pattern** in `neutralPatterns.ts` (or
a new `agencyPatterns.ts` file if scope warrants):

```js
{
  id: "ftb-administrative",
  // Covers FTB Legal Rulings, FTB Notices, and FTB Chief Counsel Rulings.
  // Year-number form (e.g., "2024-01") dominates modern usage; the legacy
  // 4-digit serial form (e.g., "2001-1278") is preserved by the broader
  // \d+ on the trailing number.
  regex:
    /\bFTB\s+(Legal\s+Ruling|Notice|Chief\s+Counsel\s+Ruling)\s+(\d{2,4}-\d{1,4})\b/g,
  description:
    'FTB administrative authorities (Legal Ruling, Notice, Chief Counsel Ruling)',
  type: "neutral",
}
```

Extractor parses the doc type from group 1 (`court` field) and the
identifier from group 2 (`documentNumber`). Surface a new optional
`agency: "FTB"` field on the citation.

Also handle the **leading-zero short form** "**Legal Ruling NNN**" (pre-1990s),
which is more ambiguous and overlaps with general "Legal Ruling" prose in
non-tax contexts; recommend gating that on a `FTB` token within ±N tokens of
the match, or skipping it entirely (legacy citations are rare).

Priority: **HIGH**.

---

## 4. California Revenue and Taxation Code (statute references)

### Canonical citation form

**`Cal. Rev. & Tax. Code § NNNN`** (full Bluebook),
**`Rev. & Tax. Code § NNNN`** (CSM),
**`Cal. Rev. & Tax. Code § NNNN(a)(1)`** (with subsections),
**`R&T § NNNN`** (informal/Westlaw shorthand — non-canonical).

### Current eyecite-ts handling

**Already supported.** The `named-code` statute pattern at
`src/patterns/statutePatterns.ts:42-50`:

```js
regex:
  /\b(N\.?\s*Y\.?|Cal(?:ifornia)?\.?|Tex(?:as)?\.?|Md\.?|(?<!W\.?\s?)Va\.?|Ala(?:bama)?\.?)\s+((?:[A-Za-z.&',\s]+?))\s*§§?\s*(\d+[A-Za-z0-9.:/-]*(?:\([^)]*\))*(?:\s*et\s+seq\.?)?)/g
```

captures `Cal. Rev. & Tax. Code § 25120` correctly. The code-name
normalization in `src/data/knownCodes.ts:211-214` maps `"Rev. & Tax."` and
`"Revenue & Taxation"` to the canonical `RTC` short. Equivalent entries
exist for `LAB` (Labor), `INS` (Insurance), `PUC` (Public Utilities),
`UIC` (Unemployment Insurance), `BPC` (Business & Professions), and
`GOV` (Government).

The CSM no-space stylization (`Rev.&Tax. Code § 25120`) is **not** currently
matched. The named-code pattern requires whitespace between the jurisdiction
prefix and the code name. Real CSM-style briefs sometimes contract the
whitespace; this is the same `Cal.Rptr.` vs. `Cal. Rptr.` issue covered in
`docs/research/2026-05-10-citation-abbrevs-ca.md` for the case-name layer.

### `R&T § NNNN` informal shorthand

This is a Westlaw and CCH style hand-tag, not a CSM- or Bluebook-recognized
form. Real briefs occasionally use it. It is **not** matched today and is
probably not worth a dedicated pattern (rare).

### Recommended action

**No action required for the canonical form** — already covered.

If CSM no-space stylization shows up in regression tests, consider relaxing
the whitespace requirement in `named-code` to `\s*` between
jurisdiction-prefix and code-name. Priority: **LOW**.

---

## 5. Workers' Compensation Cases (`Cal. Comp. Cases`)

### Canonical citation form

The reporter is **California Compensation Cases**, abbreviated:
- `Cal. Comp. Cases` (CSM, preferred)
- `Cal. Comp. Cas.` (variant; in `reporters.json` `variations`)
- `Cal.Comp.Cases` (CSM no-space)

The standard volume-reporter-page form is:

```
<NN> Cal. Comp. Cases <NNN>
```

with case name prefix and year parenthetical:

```
LeBoeuf v. Workers' Comp. Appeals Bd. (1983) 34 Cal.3d 234 [48 Cal.Comp.Cases 587]
Camacho v. Target Corp. (2018) 24 Cal.App.5th 291 [83 Cal. Comp. Cases 1014]
In re COVID-19 State of Emergency En Banc (2020) 85 Cal. Comp. Cases 296 (En Banc)
```

Important corpus patterns:

1. **Parallel-cite bracketing**: `Cal. Comp. Cases` typically appears
   inside `[...]` as a parallel cite to a `Cal.` / `Cal.App.` decision.
   eyecite-ts state-reporter pattern already admits `]` in lookahead
   (see `casePatterns.ts:56` for the comment about CSM bracketed parallel
   cites — added in #237).
2. **En Banc marker**: trailing `(En Banc)` or `(en banc)` parenthetical
   designates an Appeals Board en banc decision binding on all panels.
   This is *separate* from the year parenthetical and currently is not
   captured as structured metadata. Eyecite-ts case extractor records
   trailing parentheticals as part of `fullSpan` but does not parse
   `(En Banc)` into a structured `enBanc: true` flag.
3. **Significant Panel Decision marker**: `(Significant Panel Decision)`
   or `(Signif. Panel Dec.)` — binding on lower-rank workers' comp
   judges per WCAB rules. Same parenthetical-pattern issue.

### LeBoeuf / Le Boeuf rule

`LeBoeuf v. Workers' Comp. Appeals Bd.` (1983) 34 Cal.3d 234 establishes
that a Bureau of Rehabilitation determination that a worker does not
qualify for vocational rehabilitation can serve as "good cause" to
reopen a prior comp award. The rule is cited so often in WCAB briefs that
"LeBoeuf rule" or "LeBoeuf analysis" is a common doctrinal shorthand.

The case name has two stylizations: **`LeBoeuf`** (Justia, Westlaw, official)
and **`Le Boeuf`** (some older sources). eyecite-ts case-name backward
scan correctly tokenizes both forms because the surname tokens are
title-case and `Le Boeuf` is a two-word surname; no special handling needed.

The phrase **"sub silentio"** does not appear in the reporter title and
has no bearing on citation parsing — it is a doctrinal label some
commentators apply to workers' comp cases that reverse prior published
panel decisions without explicitly overruling them.

### Current eyecite-ts handling

**Mostly covered.** The state-reporter tokenizer at
`src/patterns/casePatterns.ts:55-60` matches:

```
83 Cal. Comp. Cases 1014
```

because the `[A-Za-z.\d\s&']+?` character class admits the periods and
spaces in `Cal. Comp. Cases`, and the trailing lookahead admits `]` for
bracketed parallel cites. The reporter is in `data/reporters.json` at
line 4294 with `Cal. Comp. Cas` listed as a variation. The
`Cal.Comp.Cases` no-space form is *not* in variations and probably should
be added — the CA style memo (`2026-05-10-citation-abbrevs-ca.md`)
documents the parallel `Cal.Rptr.` problem and the same fix applies.

`Cal. WCC` (California Workers' Compensation Cases, a separate reporter)
is also in the JSON at line 4553. `Cal. I.A.C.` (Industrial Accident
Commission decisions, predecessor to WCAB) at line 4355.

### Recommended action

1. **Add `Cal.Comp.Cases` (no-space) to the `variations` map** for
   `Cal. Comp. Cases` in `data/reporters.json:4307-4309`. Priority: **MEDIUM**.
2. **Add `enBanc` and `significantPanelDecision` flags** to the case
   citation type and parse trailing `(En Banc)` / `(Significant Panel
   Decision)` parentheticals in `extractCase.ts` `parseParenthetical`.
   This is a structured-metadata enhancement, not a tokenization gap.
   Priority: **MEDIUM**.
3. **No new tokenizer pattern needed** for the bare reporter form.

---

## 6. Labor Commissioner (DLSE) decisions

### Canonical citation forms

DLSE issues several types of authority, each with its own citation form:

| Type                                        | Form                                       | Binding?                        |
|---------------------------------------------|--------------------------------------------|---------------------------------|
| **Precedential Decision**                   | `DLSE-PD-NNN`                              | Yes — Gov. Code § 11425.60      |
| **Opinion Letter**                          | `DLSE Op. Letter <date>` or `(O.L.)`       | Persuasive only                 |
| **Administrative Decision (Berman hearing)**| Case No., often `<JJ-CM-NNNNNN-YY>`        | Not precedential                |
| **Enforcement Manual**                      | `DLSE Enf. Pol. & Interp. Manual § <NNN>`  | Internal policy                 |

### Real corpus examples

- `DLSE-PD-001` (*Adat Shalom Board & Care, Inc.*) — Case No. 35-CM-259095-17, issued 7/12/2018
- `DLSE-PD-003` (*Garcia Pallets, Inc.*) — Case No. 35-CM-132639-16, issued 4/16/2021
- `DLSE-PD-004` (*The Exclusive Poultry, Inc.*) — Case No. 35-CM-302050-17, issued 10/25/2021
- `DLSE Opinion Letter 2019.05.03` (date-only form is common)
- `DLSE Enf. Pol. & Interp. Manual § 7.1` (manual citation)

The Berman-hearing case-number format (`35-CM-NNNNNN-YY`) is an internal
DLSE wage-claim tracking number; it is rarely cited in published authority
because Berman decisions are not precedential. The "35" is a hearing-office
designator, "CM" is "case management," then a 6-digit serial, then
2-digit year.

### Current eyecite-ts handling

- **DLSE-PD-NNN** — not tokenized; no existing pattern matches the form.
- **DLSE Op. Letter** — not tokenized.
- **Berman case numbers** — not tokenized; would fall through.
- **Enf. Pol. & Interp. Manual** — not tokenized.

### Recommended action

Given low corpus volume (most DLSE authorities are cited only in
employment-law briefs), the cost-benefit favors **a single conservative
pattern** that catches the precedential-decision form only:

```js
{
  id: "dlse-pd",
  regex: /\bDLSE-PD-(\d{3,4})\b/g,
  description: 'DLSE precedential decisions (e.g., "DLSE-PD-001")',
  type: "neutral",
}
```

Skip the Opinion Letter form (date-based, ambiguous), the Berman
case-number form (not precedential, rarely cited), and the Manual
sections (better treated as treatise-style cross-references).

Priority: **LOW-MEDIUM** (high value per match for employment-law users,
but low corpus volume overall).

---

## 7. Industrial Welfare Commission (IWC) Wage Orders & DIR

### Canonical citation forms

IWC Wage Orders have two parallel citation regimes — the agency-issued
order number and the CCR codification:

| Form                          | Example                            | Notes                                      |
|-------------------------------|------------------------------------|--------------------------------------------|
| **Order-number form**         | `IWC Wage Order 4-2001`            | Order number, hyphen, effective year       |
| **Order-number form (compact)** | `Cal. Wage Order No. 4`          | Number-only (drops the year)               |
| **CCR codification**          | `Cal. Code Regs. tit. 8, § 11040` | Title-section form; § 11040 = Order 4      |
| **Compact CCR**               | `8 CCR § 11040`                    | Westlaw / numeric form                     |

The 17 wage orders cover industry sectors (Order 1 = manufacturing,
Order 4 = professional/technical/clerical, Order 5 = public housekeeping,
Order 7 = mercantile, Order 9 = transportation, etc.). Each is codified
at `Cal. Code Regs. tit. 8, § 1101N` where the last digit matches the
order number (Order 1 = § 11010, Order 9 = § 11090).

### Real corpus examples

- `IWC Wage Order 4-2001` (professional, technical, clerical, mechanical)
- `IWC Wage Order 14-2001` (agricultural occupations)
- `Cal. Wage Order No. 5`
- `Cal. Code Regs. tit. 8, § 11040`
- `8 CCR § 11040`

### Current eyecite-ts handling

- **CCR forms** (`Cal. Code Regs. tit. 8, § 11040` and `8 CCR § 11040`)
  are **partially supported** by the `cfr` pattern modified for state
  regs and the `named-code` pattern, depending on phrasing. The
  `8 CCR § 11040` numeric-prefix form fits the `cfr`-shaped pattern
  syntactically but the `C\.?F\.?R\.?` token will not match `CCR`. The
  `Cal. Code Regs.` long form fits `named-code` — testing required.
- **Order-number forms** (`IWC Wage Order 4-2001`) are **not** tokenized.
  No agency-decision pattern recognizes the `Wage Order N-YYYY` shape.

### Recommended action

1. **Add a `ca-ccr` statute pattern** mirroring the existing `cfr` pattern:

   ```js
   {
     id: "ca-ccr",
     regex:
       /\b(\d+)\s+C\.?C\.?R\.?\s*(?:(?:Part|pt\.)\s+|§§?\s*)(\d+(?:\.\d+)?[A-Za-z0-9-]*(?:\([^)]*\))*(?:\s*et\s+seq\.?)?)/g,
     description:
       'California Code of Regulations compact form (e.g., "8 CCR § 11040")',
     type: "statute",
   }
   ```

   Priority: **MEDIUM** (broad applicability across CA admin law, not just
   wage orders).

2. **Add a Wage-Order pattern**:

   ```js
   {
     id: "ca-wage-order",
     // Matches:
     //   "IWC Wage Order 4-2001"
     //   "Wage Order 4-2001"
     //   "Cal. Wage Order No. 4"
     // Group 1: order number; group 2: year suffix (if present).
     regex:
       /\b(?:IWC\s+|Cal\.?\s+)?Wage\s+Order\s+(?:No\.?\s+)?(\d{1,2})(?:-(\d{4}))?\b/g,
     description:
       'IWC Wage Orders (e.g., "IWC Wage Order 4-2001", "Cal. Wage Order No. 5")',
     type: "neutral",
   }
   ```

   Priority: **LOW-MEDIUM** (employment-law value; narrow corpus).

3. **Verify `Cal. Code Regs. tit. 8, § 11040` is caught by `named-code`**.
   If not (likely failure because `Code Regs.` is not in
   `knownCodes.ts`), add a CCR entry. Priority: **MEDIUM**.

---

## 8. California Public Utilities Commission (CPUC)

### Canonical citation forms

CPUC issues two primary types of authority:

| Form           | Pattern                  | Example                | Notes                                    |
|----------------|--------------------------|------------------------|------------------------------------------|
| **Decision**   | `D.YY-MM-NNN`            | `D.24-05-012`          | Year, month, sequential number           |
| **Resolution** | `Res. <prefix>-<NNN>`    | `Res. ALJ-445`, `Res. M-4877` | Prefix designates type                   |

CPUC decision-number prefixes are unique because they use a 2-digit
year and 2-digit month embedded in the slug:

- `D.24-05-012` = Decision number 12, issued in May 2024
- `D.23-12-035` = Decision number 35, issued in December 2023
- `D.99-09-052` = legacy 2-digit year (99 = 1999)

Resolution prefixes vary by decision type:
- `Res. ALJ-NNN` — administrative-law-judge resolution
- `Res. M-NNNN` — main-docket resolution
- `Res. E-NNNN` — energy resolution
- `Res. T-NNNN` — telecommunications resolution
- `Res. W-NNNN` — water resolution

### Real corpus examples

- `D.24-05-012`
- `D.23-12-008`
- `D.24-12-035`
- `Resolution M-4877`
- `Res. ALJ-445`

### Current eyecite-ts handling

**None.** The `D.YY-MM-NNN` form does not match any current pattern. It
will be partially captured by the `chapter-act` pattern only if there is
prose context — unlikely. The `Res.` form is also unmatched.

A particular danger: `D.24-05-012` could be misclassified as a
docket-number (`docketPatterns.ts`) if the docket pattern admits
`D.YY-MM-NNN` shape. Worth verifying.

### Recommended action

**Add a `cpuc-decision` pattern**:

```js
{
  id: "cpuc-decision",
  // CPUC decisions and resolutions.
  //   D.24-05-012        -- decision
  //   Res. ALJ-445       -- ALJ resolution
  //   Resolution M-4877  -- main-docket resolution
  // The (Resolution|Res\.) form supports a short alphabetic prefix
  // before the sequential number (ALJ, M, E, T, W).
  regex:
    /\b(?:D\.(\d{2})-(\d{2})-(\d{3,4})|(?:Resolution|Res\.)\s+([A-Z]+)-(\d{3,5}))\b/g,
  description:
    'CPUC Decisions and Resolutions (e.g., "D.24-05-012", "Res. ALJ-445", "Resolution M-4877")',
  type: "neutral",
}
```

Year normalization: 2-digit years 50-99 → 19YY; 00-49 → 20YY.

Surface in extractor as:
```ts
{ type: "neutral", court: "CPUC", year, documentNumber: `${month}-${seq}` }
```

Priority: **MEDIUM-HIGH** (large corpus in CA regulatory and energy law).

---

## 9. California Secretary of State filings

### Canonical citation forms

Secretary of State filings are not citation forms in the academic sense —
they are business-entity records identified by entity number. They appear
in legal text as references like:

- `Cal. Sec. of State Entity No. C1234567` — pre-2024 7-digit form, "C" + numeric
- `Cal. Sec. of State Entity No. 199912510001` — LLC/LP 12-digit form
- `Cal. Sec. of State Entity No. B12-345678-9` — post-2024 12-char form
  starting with "B"

After January 2024, all newly registered corporations, LLCs, and LPs use
a 12-character ID starting with "B"; existing entities keep their old
number. The DBA (fictitious business name) is filed at the county level
and has its own separate numbering scheme.

### Real corpus examples

References in legal text are usually prose: "*Plaintiff* is a California
limited liability company, Sec. of State Entity No. 201912345678." There
is no canonical CSM-style citation slug.

### Current eyecite-ts handling

**Not applicable.** Entity numbers are not citations to authority in the
sense eyecite-ts targets — they are evidentiary references to
party-identification records.

### Recommended action

**No action.** Out of scope for a citation extractor. If a future
"administrative-identifier" extraction layer is built (separate from
authority extraction), this would belong there. Priority: **NONE**.

---

## 10. California Department of Real Estate (DRE)

### Canonical citation forms

DRE issues three primary types of administrative authority:

| Type                          | Form                                                          |
|-------------------------------|---------------------------------------------------------------|
| **Citation**                  | `DRE Citation No. NNNNNN` (informal)                          |
| **Accusation**                | OAH-style: `OAH No. L-NNNNNN`                                 |
| **Desist & Refrain Order**    | `D&R Order No. <N>` or by case name only                      |
| **Order Adopting Proposed Decision** | typically cited by case name + date (no slug)          |

DRE disciplinary actions are heard at the OAH and the proposed decision
adopted by the DRE Commissioner — so OAH case numbers (`L-NNNNNN`) appear
in the citation rather than a DRE-specific number.

### Real corpus examples

Most DRE matters in legal text are cited by case name and date because
the underlying decision is an OAH proposed decision adopted by the agency
without a published number. E.g., *In the Matter of the Accusation
against <Licensee>*, OAH No. L-2023030456 (Cal. Dept. Real Estate, Mar. 14,
2024).

### Current eyecite-ts handling

**Not tokenized.** `In the Matter of ...` captions are caught by the
case-name backward scan (as `in re` variants), but the OAH-No. trailing
identifier is not extracted.

### Recommended action

If demand emerges, add an `oah-no` pattern (covers DRE, CDI, all OAH-heard
agencies):

```js
{
  id: "oah-no",
  // OAH case numbers. Letter prefix (L = licensing, N = noncompliance,
  // R = rulemaking, S = special, etc.) + 9-10 digit sequential.
  regex: /\bOAH\s+(?:Case\s+)?No\.?\s+([A-Z])-?(\d{8,10})\b/g,
  description:
    'California Office of Administrative Hearings case numbers (e.g., "OAH No. L-2023030456")',
  type: "neutral",
}
```

Priority: **LOW** (cross-agency value but small corpus per agency).

---

## 11. California Department of Insurance (CDI)

### Canonical citation forms

CDI enforcement orders use the OAH-No. pattern (see §10) or, when
internally numbered, a case-specific format like:

- `CDI File No. UPA NNNN` (Unfair Practice Act enforcement)
- `OAH No. L-NNNNNNN`
- `In the Matter of <Licensee>` (caption form)

CDI enforcement orders come in five flavors:
1. **Accusations** — initiate disciplinary proceedings
2. **Orders to Show Cause** — pre-enforcement
3. **Notices of Non-Compliance**
4. **Orders Adopting Proposed Decision**
5. **Orders Adopting Settlement Stipulation**

### Real corpus examples

- *In the Matter of [Insurer]*, OAH No. L-2024050123 (Cal. Dept. Ins., Aug. 1, 2024)
- CDI File No. UPA 5067 (illustrative; format varies)

### Current eyecite-ts handling

Same as DRE — caption captured, identifier dropped.

### Recommended action

Covered by the optional `oah-no` pattern in §10. Priority: **LOW**.

---

## 12. California Insurance Commissioner orders

These are functionally a subset of CDI enforcement orders — issued by the
Commissioner as the final decision-maker after OAH proposed decision is
adopted. Same citation forms as §11.

Priority: **LOW**, covered by §10 pattern if added.

---

## 13. Public Employment Relations Board (PERB)

### Canonical citation form

PERB has **the most developed citation regime of any CA labor agency**
because PERB decisions are routinely cited in court briefs, especially
in MMBA / EERA / Dills Act litigation. CSM § 1:18 prescribes:

```
<Charging Party> (<Year>) PERB Dec. No. <NNNN>[-<suffix>]
                       [<NN> PERC ¶ <NNNNN>, p. <NNN>]
```

The decision number is followed by an optional jurisdictional suffix:

| Suffix | Meaning                              |
|--------|--------------------------------------|
| `-E`   | EERA (Educational Employment Relations Act) |
| `-S`   | State Employer-Employee Relations Act (Dills) |
| `-M`   | MMBA (Meyers-Milias-Brown Act)       |
| `-H`   | HEERA (Higher Education Employment Relations Act) |
| `-I`   | Trial Court Interpreter Employment Relations Act |
| `-C`   | Trial Court Employment Protection Act |
| `-Ia`  | Internal: injunctive relief          |
| `-A`   | Administrative appeal                |
| `-J`   | Other decision types                 |

### Real corpus examples

- *Atwater Elementary Teachers Association, CTA/NEA (Garcia)* (2025) PERB Dec. No. 2995-E
- *California State Employees Association (Carrillo)* (1997) PERB Dec. No. 1199-S [21 PERC ¶ 28099, p. 330]
- *Redwoods Community College District* (1996) PERB Dec. No. 1141 [20 PERC ¶ 27048]

PERC (California Public Employee Reporter) is the LRP/Lexis-published
reporter. The `¶` symbol (paragraph mark) is used as the section
identifier — distinctive enough that a pattern can hinge on it.

### Internal case-tracking numbers (rare in published authority)

PERB also assigns internal case numbers, occasionally cited:
- UPC (Unfair Practice Charge): `LA-CE-1234-E`
- RC (Representation Case): `SF-RR-567-E`

Format: `<Region>-<Type>-<Sequential>-<Jurisdiction>`. Regions:
LA (Los Angeles), SF (San Francisco), SA (Sacramento). These are not
authority citations and almost never appear in published briefs.

### Current eyecite-ts handling

- **`PERB Dec. No. NNNN[-X]`** — **not tokenized.** No pattern admits the
  "PERB" trigger token followed by a decimal number with optional dash-letter
  suffix.
- **`<NN> PERC ¶ <NNNNN>`** — **not tokenized.** Could be misinterpreted by
  `state-reporter` if PERC happens to fit the reporter shape, but the
  trailing `¶` instead of page-number digits will cause that pattern to
  fail. The `¶` paragraph mark is not currently in any pattern.

### Recommended action

**Add two PERB patterns**:

```js
{
  id: "perb-decision",
  // PERB decision number with optional jurisdictional suffix.
  //   PERB Dec. No. 1199-S
  //   PERB Decision No. 2995-E
  //   PERB Dec. 2995
  regex:
    /\bPERB\s+(?:Decision|Dec\.?)\s+(?:No\.?\s+)?(\d{1,4})(?:-([A-Z][a-z]?))?\b/g,
  description:
    'PERB decisions with optional jurisdictional suffix (E, S, M, H, I, C, A, J)',
  type: "neutral",
},
{
  id: "perc-parallel",
  // PERC parallel cite: <volume> PERC ¶ <paragraph>[, p. <page>]
  regex:
    /\b(\d+)\s+PERC\s+¶\s*(\d+)(?:,\s*p\.?\s*(\d+))?\b/g,
  description:
    'California Public Employee Reporter parallel citations (e.g., "21 PERC ¶ 28099, p. 330")',
  type: "neutral",
},
```

In the extractor, the PERB pattern emits:
```ts
{ type: "neutral", court: "PERB", year /* from year-paren */, documentNumber, jurisdictionalSuffix }
```

Priority: **MEDIUM-HIGH** (sizeable corpus in CA public-sector labor law).

---

## 14. California Cal/OSHA Appeals Board (OSHAB)

### Canonical citation form

OSHAB decisions are cited by docket number plus document type and date:

```
<Case Name>, <YY-NNNN>, DAR <MM/DD/YYYY>
```

Where:
- `YY-NNNN` is the docket number (2-digit year + 4-digit sequential)
- `DAR` = Decision After Reconsideration (vs. `DENIAL` for denied petitions)
- Date = decision date

### Real corpus examples

- *L & S Construction*, 10-1821, DAR 10/7/2016
- *Marine Terminals Corp. dba Evergreen Terminals*, 08-1920, DAR 3/5/2013
- *National Distribution Center, LP, Tri-State Staffing*, 12-0391, DAR 10/5/2015

Newer decisions are migrating to longer numeric-only docket numbers
(e.g., `1310525`, `317253953`) without the 2-digit year prefix —
suggesting the agency is moving toward a CourtListener-style flat
sequential id.

### Current eyecite-ts handling

**Not tokenized.** The `YY-NNNN` form is too short to be reliably
distinguished from random year-page patterns. The `DAR` token is
unrecognized.

### Recommended action

**Pattern with mandatory `DAR` / `DENIAL` token** to avoid false positives:

```js
{
  id: "oshab-decision",
  // Cal/OSHA Appeals Board docket numbers. The mandatory DAR/DENIAL
  // sentinel after the docket number prevents false positives on
  // random "YY-NNNN, " sequences.
  regex:
    /\b(\d{2})-(\d{4})\s*,?\s*(DAR|DENIAL)\s+(\d{1,2}\/\d{1,2}\/\d{4})\b/g,
  description:
    'Cal/OSHA Appeals Board decisions (e.g., "10-1821, DAR 10/7/2016")',
  type: "neutral",
}
```

Priority: **LOW** (narrow practice area, conservative corpus).

---

## 15. California Air Resources Board (CARB)

### Canonical citation forms

CARB enforcement is **largely settlement-based** and lacks adjudicatory
citation forms. The relevant identifiers are:

- **Notice of Violation (NOV)** number: `STB031423002SA` (free-form alphanumeric)
- **Settlement Agreement** — typically cited by entity name plus date
- **Health & Safety Code citations** for the underlying violation

CARB does not publish a numbered series of precedential decisions. The
analog of OTA/PERB does not exist here.

### Real corpus examples

- *FCA US LLC Settlement* (Jan. 2024) — generally cited prose-form
- *Quality Logistics, Inc. Settlement Agreement* — NOV: STB031423002SA

### Current eyecite-ts handling

**Not tokenized**, and **no action recommended**. The shape (`STB...SA`) is
neither stable across cases nor unique enough to pattern-match without
massive false-positive risk.

### Recommended action

**None.** CARB enforcement matters cite to underlying statutes
(`Health & Saf. Code § 43100`) and regulations (`Cal. Code Regs. tit. 13,
§ 1900`), which are already handled by named-code and (proposed) CCR
patterns. Priority: **NONE**.

---

## 16. California Department of Pesticide Regulation (DPR)

### Canonical citation forms

DPR uses a form-based enforcement system (`DPR-ENF-046` "Enforcement /
Compliance Action Summary") rather than published decision series. Most
DPR citations in legal text reference:

- **Food and Agricultural Code** sections (already handled — `FAC` in `knownCodes.ts:222-226`)
- **Cal. Code Regs. tit. 3** regulations
- **County Agricultural Commissioner (CAC) Letters** — internal guidance, rarely cited

The Pesticide Use Enforcement Program Standards Compendium has 8 volumes
of internal procedure (`PUE-PSC Vol. 6 § X.Y`); these are not citation
authorities in a Bluebook/CSM sense.

### Current eyecite-ts handling

Statutory and regulatory references are handled by existing patterns.
DPR-specific identifiers are not tokenized.

### Recommended action

**None.** Same reasoning as CARB. Priority: **NONE**.

---

## Recommended Action Punch List

Ranked by expected corpus impact within California tax / business /
employment briefs:

| # | Priority    | Pattern                          | Scope                                                                 | Effort |
|---|-------------|----------------------------------|-----------------------------------------------------------------------|--------|
| 1 | HIGH        | `ca-ota-sbe-neutral`             | OTA precedential (P/N suffix) + pre-2018 SBE                          | S      |
| 2 | HIGH        | `ftb-administrative`             | FTB Legal Ruling, Notice, Chief Counsel Ruling                        | S      |
| 3 | MEDIUM-HIGH | `cpuc-decision`                  | `D.YY-MM-NNN` + `Res. <prefix>-<N>`                                   | S      |
| 4 | MEDIUM-HIGH | `perb-decision` + `perc-parallel`| PERB decisions + PERC parallel cites                                  | M      |
| 5 | MEDIUM      | `ca-ccr`                         | `<vol> CCR § <N>` (parallels existing `cfr`)                          | S      |
| 6 | MEDIUM      | Wage-Order pattern               | `IWC Wage Order N-YYYY` + `Cal. Wage Order No. N`                     | S      |
| 7 | MEDIUM      | `Cal.Comp.Cases` no-space        | Add to `variations` in `reporters.json`                               | XS     |
| 8 | MEDIUM      | En Banc / Significant Panel flags | Parse trailing `(En Banc)` parentheticals in `extractCase.ts`         | M      |
| 9 | LOW-MEDIUM  | `dlse-pd`                        | `DLSE-PD-NNN` precedential decisions only                             | S      |
| 10| LOW         | `oah-no`                         | Cross-agency OAH case numbers (CDI, DRE)                              | S      |
| 11| LOW         | `oshab-decision`                 | Cal/OSHA Appeals Board with mandatory DAR/DENIAL sentinel             | S      |
| 12| NONE        | CARB, DPR, Sec. of State, DLSE Op. Letter, CDTFA | Out of scope for citation extractor                           | —      |

### Suggested PR sequencing

1. **PR A: OTA/SBE + FTB administrative**
   - New `agencyPatterns.ts` (or extend `neutralPatterns.ts`)
   - Sequence the new pattern **before** `state-vendor-neutral-hyphenated`
   - New optional citation fields: `agency`, `precedentialStatus`
   - Tests: real OTA opinion captions, pre-2018 SBE cites

2. **PR B: CPUC decisions and resolutions**
   - Standalone pattern with year-normalization (2-digit → 4-digit)
   - Tests: D.24-05-012, D.99-09-052, Res. ALJ-445, Res. M-4877

3. **PR C: PERB + PERC**
   - Two patterns (decision + parallel cite)
   - Tests: full CSM-style citation strings with jurisdictional suffixes

4. **PR D: CCR + Wage Orders**
   - New CCR pattern in `statutePatterns.ts`
   - Wage-Order pattern with order-number normalization
   - Tests: 8 CCR § 11040 / Cal. Code Regs. tit. 8, § 11040 / IWC Wage Order 4-2001

5. **PR E (optional): Workers' comp polish**
   - Add `Cal.Comp.Cases` no-space variation
   - Optional: structured en-banc / significant-panel flags

6. **PR F (optional): DLSE / OAH / OSHAB**
   - Three conservative patterns; only ship if regression-test corpus
   shows them adding signal

### Code-organization recommendation

Given the size of the additions, consider creating a new file
`src/patterns/agencyPatterns.ts` parallel to the existing
`neutralPatterns.ts`, exporting a single `agencyPatterns: Pattern[]` array.
This keeps the neutral patterns file focused on jurisdiction-agnostic
vendor neutrals (WL, LEXIS, Pub. L., Fed. Reg.) and isolates
state-administrative agency citations for easier maintenance and
testing. Then in `extractCitations.ts`, append `agencyPatterns` after
`neutralPatterns` in the pattern array (order matters — agency patterns
should be **before** the generic `state-vendor-neutral-hyphenated`).

A corresponding `src/extract/extractAgency.ts` extractor would handle
the type unification — alternately, extend `extractNeutral` with branches
on `patternId` since all agency citations share the
year/court/documentNumber shape with optional flags.

---

## Appendix A: Test corpus seeds

A regression test for these patterns should include the following real
or representative citations (drawn from agency publications above):

```text
1.  Appeal of Mather, 2024-OTA-377P.
2.  Appeal of Smith (2023-OTA-069P).
3.  In re Micelle Lab'ys, Inc., 2020-OTA-290P.
4.  Appeal of Finnigan Corp., 88-SBE-022 (Cal. State Bd. Equalization 1988).
5.  Appeal of Harvey (1992) 5 SBE 57.
6.  FTB Legal Ruling 2006-03 (May 5, 2006), p. 5.
7.  FTB Notice 2017-05.
8.  Chief Counsel Ruling 2001-1278.
9.  Cal. Rev. & Tax. Code § 25120(b)(1).
10. R&T § 19131.
11. LeBoeuf v. Workers' Comp. Appeals Bd. (1983) 34 Cal.3d 234 [48 Cal.Comp.Cases 587].
12. Camacho v. Target Corp. (2018) 24 Cal.App.5th 291 [83 Cal. Comp. Cases 1014].
13. In re COVID-19 State of Emergency En Banc (2020) 85 Cal. Comp. Cases 296 (En Banc).
14. DLSE-PD-001 (Adat Shalom Bd. & Care, Inc., July 12, 2018).
15. IWC Wage Order 4-2001.
16. Cal. Code Regs. tit. 8, § 11040.
17. 8 CCR § 11040.
18. D.24-05-012.
19. Resolution ALJ-445.
20. Cal. State Employees Ass'n (Carrillo) (1997) PERB Dec. No. 1199-S [21 PERC ¶ 28099, p. 330].
21. Redwoods Cmty. Coll. Dist. (1996) PERB Dec. No. 1141 [20 PERC ¶ 27048].
22. Atwater Elementary Teachers Ass'n, CTA/NEA (Garcia) (2025) PERB Dec. No. 2995-E.
23. Marine Terminals Corp., 08-1920, DAR 3/5/2013.
24. In the Matter of XYZ, OAH No. L-2023030456.
```

## Appendix B: Cross-references to existing eyecite-ts work

- **CSM no-space stylization** is documented in
  `docs/research/2026-05-10-citation-abbrevs-ca.md` for the case-name layer
  (`Cal.Rptr.` etc.); the same fix applies to `Cal.Comp.Cases` and
  `Rev.&Tax.` no-space forms.
- **`in re` and `Appeal of` case-name backward scan** is documented in
  `docs/research/2026-05-11-procedural-prefixes-bankruptcy.md`.
- **Existing CA reporter coverage**: `Cal. Comp. Cases`, `Cal. WCC`,
  `Cal. I.A.C.` already in `data/reporters.json` (lines 4294, 4553, 4355).
- **Existing CA code coverage** in `src/data/knownCodes.ts:188-364`:
  `BPC`, `CCP`, `CIV`, `COM`, `CORP`, `EDC`, `ELEC`, `EVID`, `FAC`,
  `FAM`, `FGC`, `FIN`, `GOV`, `HNC`, `HSC`, `INS`, `LAB`, `MVC`, `PCC`,
  `PEN`, `PROB`, `PRC`, `PUC`, `RTC`, `SHC`, `UIC`, `VEH`, `WAT`, `WIC` —
  all available for the `named-code` pattern.
- **Pattern-ordering principle**: see commentary at
  `src/patterns/neutralPatterns.ts:19-26` for the Mississippi 4-segment
  precedence rule that the new OTA/SBE pattern must respect.

## Appendix C: Source list

- [OTA: Opinions index](https://ota.ca.gov/opinions/) — confirms `YYYY-OTA-NNN[P|N]` format and precedential vs. nonprecedential distinction
- [OTA: 2024-OTA-377P decision PDF](https://ota.ca.gov/wp-content/uploads/sites/54/2024/11/2024-OTA-377P-Mather-rev1-1.pdf) — caption form and full citation
- [OTA: 2023-OTA-069P decision PDF](https://ota.ca.gov/wp-content/uploads/sites/54/2023/02/20036033-Smith-Opinion-120722wm-1.pdf?emrc=269a56) — second example
- [CalTax: 2024 OTA precedential roundup](https://caltax.org/2026/01/09/three-precedents-among-62-opinions-posted-by-ota/) — corpus-volume signal
- [BOE: Legal Opinions index](https://www.boe.ca.gov/legal/legalopcont.htm) — SBE Memorandum / Letter Decision typology
- [BOE: Summary Decisions (Section 40)](https://boe.ca.gov/legal/ldad.htm) — pre-2018 SBE decision archive
- [Cal. Code Regs. tit. 18, § 30501(d)(3)](https://oal.ca.gov/) — precedential authority of pre-2018 SBE opinions before OTA
- [FTB: Legal Rulings index](https://www.ftb.ca.gov/tax-pros/law/legal-rulings/index.html) — confirms `Legal Ruling YYYY-NN` format
- [FTB: FTB Notices index](https://www.ftb.ca.gov/tax-pros/law/ftb-notices/index.html) — confirms `FTB Notice YYYY-NN` format
- [FTB: Chief Counsel Rulings index](https://www.ftb.ca.gov/tax-pros/law/chief-counsel-rulings/index.html) — confirms `Chief Counsel Ruling YYYY-NN`
- [FTB: Chief Counsel Ruling 2001-1278 PDF](https://www.ftb.ca.gov/tax-pros/law/chief-counsel-rulings/2001-1278.pdf) — legacy 4-digit serial form
- [FTB Notice 2009-08](https://www.ftb.ca.gov/tax-pros/law/ftb-notices/2009-08.pdf) — example
- [WCAB: En banc decisions](https://www.dir.ca.gov/wcab/wcab_enbanc.htm) — binding-precedent rule for en banc decisions
- [WCAB: Significant panel decisions](https://www.dir.ca.gov/wcab/wcab_panel.htm) — binding on WCJs only when designated
- [LeBoeuf v. Workers' Comp. Appeals Bd. (1983) 34 Cal.3d 234 (Justia)](https://law.justia.com/cases/california/supreme-court/3d/34/234.html) — corpus example
- [DIR: Industrial Welfare Commission Wage Orders](https://www.dir.ca.gov/iwc/wageorderindustries.htm) — order-number index, Order 1-17
- [DIR: IWC Wage Order 4-2001 PDF](https://www.dir.ca.gov/iwc/iwcarticle4.pdf) — confirms `Order No. 4-2001` form
- [DLSE: Precedential Decisions](https://www.dir.ca.gov/DLSE/Precedential-Decisions.html) — `DLSE-PD-NNN` form
- [DLSE: Opinion Letters index](https://www.dir.ca.gov/dlse/dlse_opinionletters.htm) — opinion-letter date-based form
- [Gov. Code § 11425.60](https://leginfo.legislature.ca.gov/) — precedent-decision authority for DLSE
- [CPUC: Decisions search](https://docs.cpuc.ca.gov/DecisionsSearchForm.aspx) — `D.YY-MM-NNN` decision-number format
- [CPUC: Decisions and Resolutions index](https://www.cpuc.ca.gov/proceedings-and-rulemaking/decisions-and-resolutions-related-to-practice-before-the-cpuc) — `Res.` prefix taxonomy
- [PERB: Decisions search](https://perb.ca.gov/decisions/) — `PERB Dec. No.` form
- [PERB: California State Employees Ass'n (Carrillo) decision](https://perb.ca.gov/decision/2684e/) — jurisdictional-suffix examples
- [UCLA Library: PERB administrative law guide](https://libguides.law.ucla.edu/caladminlaw/perb) — PERC parallel citation, paragraph-mark form
- [OSHAB: Precedential Decisions](https://www.dir.ca.gov/oshab/Precedential_Decisions.html) — `YY-NNNN` docket-number form
- [CDI: Enforcement Actions search](https://www.insurance.ca.gov/01-consumers/120-company/13-enfactions/) — accusation / OAH-routed enforcement
- [CARB: Enforcement Case Settlements](https://ww2.arb.ca.gov/our-work/programs/enforcement-policy-reports/enforcement-case-settlements) — confirms settlement-based regime
- [DPR: Enforcement](https://www.cdpr.ca.gov/enforcement/) — DPR-ENF-046 form
- [Sec. of State: Business Search field definitions](https://www.sos.ca.gov/business-programs/business-entities/cbs-field-status-definitions) — pre/post-2024 entity-number formats
- [DRE: Disciplinary Actions](https://dre.ca.gov/Licensees/DisciplinaryActions.html) — citations, accusations, D&R orders
- [Cal. Rule of Court 1.200](https://courts.ca.gov/cms/rules/index/one/rule1_200) — CSM vs. Bluebook style election
- [Loyola: CSM Basics](https://guides.library.lls.edu/c.php?g=497703&p=3407469) — citation-style overview
- [California Style Manual, 4th ed.](https://www.sdap.org/wp-content/uploads/downloads/Style-Manual.pdf) — primary authority on CA citation form
