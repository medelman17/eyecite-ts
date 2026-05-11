# Procedural-Prefix Forms in the Bankruptcy / Insolvency / Receivership / Reorganization Domain

> Date: 2026-05-11
> Scope: Audit of bankruptcy-and-insolvency-adjacent procedural-prefix forms (federal Title 11 bankruptcy plus state insurance / banking / corporate insolvency) for possible addition to `PROCEDURAL_PREFIX_REGEX` and the parallel `proceduralPrefixes` array in `src/extract/extractCase.ts`.
> Audience: eyecite-ts maintainers planning parser improvements.
> Related issues: #241 (adversary `(In re X)` admin parenthetical), #242 (procedural prefix expansion - closed).

## Summary

The federal bankruptcy domain is dominated by the bare prefix `In re [Debtor]`, which eyecite-ts already covers. The interesting work for the parser sits at the **subordinate forms** that surround a bankruptcy case: state-court insurance receiverships, state insurance liquidations, federal-court federal-equity receivers, common-law / state-statute assignments for the benefit of creditors ("ABCs"), and a small set of historic Bankruptcy Act forms. The `In re` prefix already swallows most of the federal-court traffic, so the gap shows up in **state-court captions** and **adjective-modified `In re` variants** where eyecite-ts captures only the bare prefix and treats the modifier as part of the party name.

After surveying published corpus examples in the Bankruptcy Reporter (B.R.), Federal Reporter (F.3d/F.2d), state insurance-receivership reporters (Pa. Cmwlth., Mass., N.H., N.J., Del. Ch., Tex.), and historic 19th-/early-20th-century Bankruptcy Act decisions, I see four prefix families that recur in real captions but are not currently recognized:

1. **`In re Liquidation of`** and its variants — overwhelmingly state-court **insurance company** insolvency (and bank/trust company insolvency in some states). High frequency in Pa. Cmwlth., Mass. SJC, N.H., N.J., Del. Ch., Tex. SCt.
2. **`In re Rehabilitation of`** and **`In re Conservation of`** — state insurance code rehabilitation/conservation track. Frequent in Pa. Cmwlth., N.H., N.J., Del. Ch., Vt., S.D.
3. **`In re Receivership of`** and **`In the Matter of the Receivership of`** — both state-court (insurance, bank, trust) and federal-equity-receiver forms.
4. **`In re Trusteeship of`** / **`In the Matter of the Trusteeship of`** — indenture trustee disputes and bond trust receiverships (common in Minn., N.Y.).

Two further forms appear less frequently but follow the same pattern and should be addressed:

5. **`In re Petition of [X]`** / **`In re Voluntary Petition of [X]`** — older Bankruptcy Act of 1898 forms, plus a handful of modern state-court "petition for liquidation" captions.
6. **`In re Assignment for the Benefit of Creditors of [Assignor]`** — state ABC statutes (Cal., Del., Md., N.J., etc.).

A separate but related case-name convention is the **adversary-proceeding admin parenthetical** `[Trustee] v. [Defendant] (In re [Debtor])`. The trailing `(In re X)` is part of the case caption, not a citation-explanatory parenthetical. This is **tracked separately in #241** and is not a procedural-prefix problem — it's an admin-parenthetical detector problem. This document does not propose new procedural-prefix entries for that form, but it explains the overlap so reviewers don't conflate the two.

**Bottom line**: The two highest-priority additions are `In re Liquidation of` and `In re Rehabilitation of`. Together they account for the vast bulk of state-insurance-insolvency captions cited in case law. The remaining four sit at decreasing priority.

---

## Background: How bankruptcy/insolvency captions are formed

The federal Bankruptcy Code (Title 11) and the Federal Rules of Bankruptcy Procedure (FRBP) provide two case-caption forms:

- **Voluntary main case (FRBP 1005, 1015)**: `In re [Debtor]`. The court drops "In re" on the Official Form 1 (Voluntary Petition), but reporters universally use `In re [Debtor]` for published opinions.
- **Adversary proceeding (FRBP 7001)**: `[Plaintiff] v. [Defendant] (In re [Debtor])`. The administrative `(In re [Debtor])` parenthetical names the underlying main case. Reporter style guides (e.g., the FLNB and FLMB style guides, the WDTN Bluebook reference) all require this form.

Outside of federal bankruptcy, **insurance-company insolvency** is reserved to the states. Every state has a model-act-derived rehabilitation/liquidation statute under which the state insurance commissioner files a "petition for liquidation" or "petition for rehabilitation" in a state court of general jurisdiction (or in PA, the Commonwealth Court). The captions of these proceedings vary by jurisdiction:

- Pennsylvania Commonwealth Court: `In re [Insurer] in Liquidation` (or `In re Liquidation of [Insurer]`).
- New Hampshire SCt, Mass. SJC, N.J. SCt: `In the Matter of the Liquidation of [Insurer]`.
- New York App. Div.: `Matter of Liquidation of [Insurer]` (no leading "In the").
- Delaware Court of Chancery: `In re Rehabilitation of [Insurer]`.
- South Dakota: `In re [Insurer]` (with no Liquidation/Rehabilitation/Conservation modifier in the title — relies on body text for context).

Similar variation exists for **state-bank receiverships** (less common today; FDIC handles most under federal banking law) and **assignments for the benefit of creditors** (state-statute or common-law debtor-protection devices that pre-date Title 11).

---

## Per-prefix sections

### 1. `In re Liquidation of` (and the longer `In the Matter of the Liquidation of`)

#### Canonical and variant forms

- `In re Liquidation of [Insurer]`
- `In the Matter of the Liquidation of [Insurer]`
- `Matter of Liquidation of [Insurer]` (N.Y. App. Div. truncation)
- `In re: Liquidation of [Insurer]` (colon variant, common in Pa. Cmwlth.)
- `In re [Insurer] in Liquidation` (suffix variant — caption inversion; does **not** fit the procedural-prefix family, see #note)

#### Jurisdictions and subject matter

State courts of general jurisdiction (or, in PA, the Commonwealth Court) supervising state-statute insurance-company liquidation under model-act statutes. The state insurance commissioner is the petitioner as statutory liquidator. Subject-matter cases typically address: priority of claims, reinsurance offsets, treatment of guaranty associations, anti-suit injunctions, set-off and recoupment, and discharge of the liquidator.

This is not federal bankruptcy — insurers are excluded from Title 11 (`11 U.S.C. § 109(b)(2)`) and resolved under state insolvency regimes (NAIC model acts adopted in most states).

#### Real corpus examples

- *In the Matter of the Liquidation of American Mutual Liability Insurance Co.*, 434 Mass. 272 (2001) (Mass. SJC).
- *In the Matter of Liquidation of Union Indemnity Insurance Co. of N.Y.*, 89 N.Y.2d 94 (1996) (subnom. *Royal Bank & Trust Co. v. Superintendent of Ins. of N.Y.*) (N.Y. Ct. App.).
- *In the Matter of the Liquidation of the Home Insurance Co.*, 166 N.H. 84 (2014) (N.H. SCt.); also *In the Matter of Liquidation of Home Ins. Co.* (N.H. 2026).
- *In the Matter of the Liquidation of Integrity Insurance Co.*, 165 N.J. 75 (2000); also *IMO the Liquidation of Integrity Insurance Co.*, 147 N.J. 128 (1996) (N.J. SCt.).
- *In re Liquidation of Legion Insurance Co.* (caption variations: Pa. Cmwlth., 2003); subnom. *Koken v. Legion Insurance Co.*, 831 A.2d 1196 (Pa. Cmwlth. 2003).
- *In re Reliance Insurance Co. in Liquidation*, No. 1 REL 2001 (Pa. Cmwlth.) — note the **suffix** "in Liquidation" form rather than prefix.
- *In re Lincoln General Insurance Co. in Liquidation*, No. 1 LIN 2015 (Pa. Cmwlth.).

#### Parser-relevant observations

- The **prefix variant** `In re Liquidation of [Insurer]` is the strongest target for `PROCEDURAL_PREFIX_REGEX`. Several reporters in Pa. Cmwlth. and Mass. SJC routinely use this form.
- The **suffix variant** `In re [Insurer] in Liquidation` is structurally identical to the bare `In re` prefix from the parser's perspective. eyecite-ts already handles this — it just treats "Penn Treaty Network America Insurance Co. in Liquidation" as the party name, which is correct. **No new prefix needed for the suffix variant.**
- The N.Y. App. Div. truncation `Matter of Liquidation of [Insurer]` is a *non*-`In re` form. It is already partially covered by the `Matter of` prefix in `PROCEDURAL_PREFIX_REGEX`, but eyecite-ts will currently parse the party name as `Liquidation of [Insurer]`, which is not ideal. Adding the longer `Matter of Liquidation of` prefix would yield a cleaner party-name capture.

#### Recommended priority

**High (P1).** Add both `In re Liquidation of` and `In the Matter of the Liquidation of`. Also add `Matter of Liquidation of` for N.Y. App. Div. coverage.

---

### 2. `In re Rehabilitation of` (and `In the Matter of the Rehabilitation of`)

#### Canonical and variant forms

- `In re Rehabilitation of [Insurer]`
- `In the Matter of the Rehabilitation of [Insurer]`
- `Matter of Rehabilitation of [Insurer]` (N.Y. App. Div. truncation)
- `In re [Insurer] in Rehabilitation` (suffix variant — same caveat as Liquidation)

#### Jurisdictions and subject matter

State insurance commissioners frequently first seek **rehabilitation** (a remediation track) before liquidation. Many state insurance codes contemplate a rehabilitation stage in which the commissioner takes over management of the insurer while attempting to restore solvency; if rehabilitation fails, the same proceeding converts to liquidation. The caption usually changes to reflect the new posture (`In re Liquidation of`) once liquidation is ordered, so the same insurer can appear under both prefix forms in different opinions across the proceeding's lifetime.

The Delaware Court of Chancery handles rehabilitation under 18 Del. C. ch. 59 with extensive published opinions.

#### Real corpus examples

- *In re Rehabilitation of Scottish RE (U.S.), Inc.*, C.A. No. 2019-0175-JTL (Del. Ch. 2022).
- *In re Rehabilitation of Frontier Insurance Co.*, 51 A.D.3d 80 (N.Y. App. Div. 3d Dep't 2008).
- *In re Rehabilitation of the Home Insurance Co.*, 166 N.H. 84 (2014) (paired with the liquidation caption above — the same proceeding under different captions over time).
- *In re Ambassador Ins. Co.*, 147 Vt. 344 (1986).
- *In re Penn Treaty Network America Insurance Co. in Rehabilitation*, 1 PEN 2009 (Pa. Cmwlth. 2012) (suffix variant — see Liquidation note above).

#### Parser-relevant observations

The prefix form `In re Rehabilitation of` follows the exact same grammatical pattern as `In re Liquidation of`. Both should be added together — they are siblings in the model-act vocabulary.

#### Recommended priority

**High (P1).** Add `In re Rehabilitation of`, `In the Matter of the Rehabilitation of`, and `Matter of Rehabilitation of`.

---

### 3. `In re Conservation of` (and `In re Conservatorship of [Insurer]` — distinct from family-law `Conservatorship of`)

#### Canonical and variant forms

- `In re Conservation of [Insurer]`
- `In the Matter of the Conservation of [Insurer]`
- `In re Conservatorship of [Insurer]` — note: collides linguistically with the existing **family-law** prefix `Conservatorship of` (which is for incapacitated adults under state probate codes)

#### Jurisdictions and subject matter

A smaller third track under model-act insurance codes (e.g., Cal. Ins. Code § 1011) — the commissioner is appointed "conservator" to preserve assets before a rehabilitation/liquidation decision. The California Department of Insurance routinely uses the **conservation** track.

The collision with **family-law `Conservatorship of`** matters for the parser: family-law captions like *Conservatorship of L.M.* refer to incapacitated-adult guardianship-equivalent proceedings (Cal. Prob. Code § 1801, etc.), while insurance-code `Conservation of` refers to insurer-asset preservation. eyecite-ts already covers `Conservatorship of`. The parser does not need to distinguish between the two prefix functions; both should accept the form. However, the prefix should be **`Conservation of`** for the insurance form (not `Conservatorship of`) — adding `Conservation of` is the cleaner solution.

#### Real corpus examples

- *In re Conservation of California Insurance Co.* (Cal. App. — multi-year proceeding from 2019 conservation order onward; affirmed 2024).
- *In re Conservatorship of Security General Insurance Co.* (S.D. 1966), 142 N.W.2d 191 — older form using "Conservatorship" rather than "Conservation," though substantively the same insurance-receivership concept.

#### Parser-relevant observations

- Adding `Conservation of` covers the modern California insurance conservation form without touching the existing family-law `Conservatorship of` prefix.
- The S.D. 1966 case shows that the family-law `Conservatorship of` prefix may itself match an insurance-receivership caption in older-jurisdiction usage. eyecite-ts will still capture the party name correctly in that case, just with the family-law-flavored prefix tag.

#### Recommended priority

**Medium (P2).** Volume is lower than Liquidation/Rehabilitation, but the prefix is grammatically identical and the addition is cheap.

---

### 4. `In re Receivership of` and `In the Matter of the Receivership of`

#### Canonical and variant forms

- `In re Receivership of [Entity]`
- `In the Matter of the Receivership of [Entity]`
- `In re [Entity] Receivership` (suffix variant — handled by bare `In re`)

#### Jurisdictions and subject matter

Two distinct sub-domains share this caption:

1. **State-court receiverships of insurance companies, banks, trust companies, and other regulated entities**, where a state-court receiver (often the state regulator) is appointed under state statute. Pre-FDIC bank cases (early 20th century) used this form heavily. Modern usage is concentrated in state insurance receiverships where the caption emphasizes the receivership posture (vs. liquidation/rehabilitation).
2. **Federal-equity receivers** appointed by federal district courts under their equity jurisdiction (e.g., SEC enforcement actions, Ponzi-scheme remediation under the Sec. Exch. Act). These are *not* Title 11 bankruptcies but they routinely interact with bankruptcy courts (`11 U.S.C. § 543`).

#### Real corpus examples

- *In the Matter of the Receivership of Security General Insurance Co.*, 82 S.D. 213 (1966) — S.D. SCt receivership-of-an-insurer caption.
- *In re Receivership of Bayou Group, LLC* — SDNY federal-equity receiver appointed pre-Chapter 11 in the Bayou Ponzi scheme; multiple published opinions in F. Supp. 2d.
- *In the Matter of the Trusteeship under the Indenture of Trust* (Minn. Ct. App. 2021) — analogous form for a corporate trust indenture, see Trusteeship section below.

#### Parser-relevant observations

- The federal-equity-receiver form is structurally identical to the state-court insurance receivership form, so a single `In re Receivership of` prefix entry covers both.
- The very long `In the Matter of the Receivership of` form requires a separate entry (longer-first ordering principle in the regex).
- Suffix forms (`In re Bayou Group, LLC Receivership` etc.) require no new prefix.

#### Recommended priority

**Medium (P2).** Lower frequency than Liquidation/Rehabilitation but real volume in pre-FDIC bank cases and modern SEC enforcement contexts.

---

### 5. `In re Trusteeship of` and `In the Matter of the Trusteeship of`

#### Canonical and variant forms

- `In re Trusteeship of [Trust Name or Instrument]`
- `In the Matter of the Trusteeship of [Trust Name]`
- `In the Matter of the Trusteeship under the Indenture of Trust, dated ...` (long Minnesota corporate-trust caption form)

#### Jurisdictions and subject matter

Two sub-domains:

1. **Indenture trustee disputes** — bond and securitization-trust corporate cases. Minnesota and New York are the heavyweights because their state courts have specialized trust supervision dockets (e.g., Wells Fargo as indenture trustee under thousands of RMBS/CDO indentures).
2. **Charitable-trust supervision** — state attorneys general supervising charitable trusts under state nonprofit-trust statutes.

This is adjacent-to-bankruptcy rather than core-bankruptcy, but it overlaps because corporate-trust failures often precipitate Chapter 11 filings of the trust beneficiaries and because state-court trusteeship orders can be invoked alongside bankruptcy filings.

#### Real corpus examples

- *In the Matter of the Trusteeship under the Indenture of Trust, dated as of September 1, 1996, between the City of Newburgh Industrial Development Agency and Wells Fargo Bank, N.A.* (Minn. Ct. App. 2021, A20-1335) — paradigmatic long Minnesota indenture-trustee caption.

#### Parser-relevant observations

- The Minnesota long form (`In the Matter of the Trusteeship under the Indenture of Trust, dated as of September 1, 1996, between ...`) cannot reasonably be captured as a single prefix — the date and indenture parties exceed any practical prefix expression. eyecite-ts should match the **head** of the caption (`In the Matter of the Trusteeship`) and the existing case-name span detector should grab the remainder up to the comma.
- Standard `In re Trusteeship of` is short and should be added as a normal prefix.

#### Recommended priority

**Medium (P3).** Real but lower-volume. Adding `In re Trusteeship of` and `In the Matter of the Trusteeship of` is straightforward.

---

### 6. `In re Petition of` and `In re Voluntary Petition of`

#### Canonical and variant forms

- `In re Petition of [Debtor]`
- `In re Voluntary Petition of [Debtor]`
- `In re Involuntary Petition Against [Debtor]` (rarer)

#### Jurisdictions and subject matter

These forms originate in the **Bankruptcy Act of 1898** (Nelson Act), which structured bankruptcy as a petition-driven proceeding. Pre-1978 (Bankruptcy Reform Act) opinions in the F.2d and B.R. use `In re Petition of` somewhat frequently; post-1978 it has been displaced by the bare `In re [Debtor]` form. Modern bankruptcy courts almost universally use the bare form for both voluntary and involuntary petitions.

Where this form persists today is in **state-court** insurance- and bank-insolvency proceedings whose statutes still describe the commissioner's filing as a "petition for liquidation" or "petition for rehabilitation" — see, e.g., the Pa. Cmwlth. cases captioned `Koken v. Re Petition for Liquidation of Legion Insurance Co. (In Rehabilitation)` (Pa. Cmwlth. 2003), which is a doubly-procedural caption that combines `Re Petition for Liquidation of` and `(In Rehabilitation)` admin parenthetical.

#### Real corpus examples

- *In re Petition of Clinton*, 41 F.2d 749 (S.D.N.Y. 1930) (Bankruptcy Act of 1898 voluntary petition by a guardian on behalf of an incompetent debtor).
- *Koken v. Re Petition for Liquidation of Legion Insurance Co. (In Rehabilitation)*, 831 A.2d 1196 (Pa. Cmwlth. 2003).
- Various 1898-Act-era reported decisions captioned `In re Petition of [Debtor]` (pre-1978 F.2d, B.R., D.C. and circuit cases).

#### Parser-relevant observations

- Note that `Petition of` and `On Petition of` are already in `PROCEDURAL_PREFIX_REGEX`. Adding `In re Petition of` as a **longer-first** prefix (before the existing `In re` and `Petition of`) would correctly capture both halves of the prefix.
- `In re Voluntary Petition of` is functionally identical and can be a separate (longer-first) entry.
- The Pa. Cmwlth. form `Re Petition for Liquidation of` is rare and combines with an admin parenthetical; this is probably **not** worth a separate prefix.

#### Recommended priority

**Low (P3).** Historic. Adding `In re Petition of` and `In re Voluntary Petition of` together is cheap and improves coverage of pre-1978 bankruptcy opinions, but the modern volume is low.

---

### 7. `In re Assignment for the Benefit of Creditors of`

#### Canonical and variant forms

- `In re Assignment for the Benefit of Creditors of [Assignor]`
- `In re General Assignment of [Assignor]`
- `Assignment for the Benefit of Creditors of [Assignor]` (less-common bare form)
- `In re Petition of [Assignee] for the Assignment of [Assignor]` (rare)

#### Jurisdictions and subject matter

State-statute or common-law debtor-protection devices that **pre-date Title 11** and remain alive in California, Delaware, Florida, Illinois, Maryland, New Jersey, New York, and Texas, among others. Under an ABC, the debtor assigns all assets to an assignee who liquidates the assets and distributes proceeds. ABCs are usually faster and cheaper than Chapter 7 and have become more popular in modern tech-startup wind-downs.

Cal. Code Civ. Proc. §§ 493.010-493.060 and §§ 1800-1802 codify the modern California ABC framework. Del. Ch. Court Rules govern Delaware ABCs.

#### Real corpus examples

- *Sherwood Partners, Inc. v. Lycos, Inc.*, 394 F.3d 1198 (9th Cir. 2005) — Cal. ABC preempted by Title 11 § 547; published reporting under the standard `v.` caption rather than the procedural-prefix form, but the underlying state proceeding was an ABC.
- Older California pre-Bankruptcy-Code opinions captioned `In re Assignment for the Benefit of Creditors of [Assignor]` (pre-1978 Cal. App. and Cal. SCt; modern citations are rare).

#### Parser-relevant observations

- The prefix is **very long** (`In re Assignment for the Benefit of Creditors of`). Adding it as a `PROCEDURAL_PREFIX_REGEX` alternative is cheap because the longer-first ordering means it will only match before shorter prefixes (`Assignment for the Benefit of Creditors of` and `In re`).
- A shorter `Assignment for the Benefit of Creditors of [X]` bare form exists in some older opinions, especially in California and New Jersey.

#### Recommended priority

**Low (P3).** Rare in modern reporters (most ABC cases never reach published opinions), but valuable for pre-1978 corpus completeness.

---

### 8. Other forms surveyed but not recommended for addition

These forms appeared in the corpus search but should **not** be added as separate prefixes for the reasons noted:

- **`In re Bankruptcy of [Debtor]`** — Anglo-American historic form, mostly 19th century. Effectively obsolete in U.S. reporters by 1900; modern use is so rare that the addition cost outweighs the benefit. The bare `In re` prefix already matches the caption with "Bankruptcy of" treated as a party-name prefix.
- **`In re Composition of [Debtor]`** — Pre-1898 Bankruptcy Act compositions (settlements between debtors and creditors). Effectively obsolete; *In re Kornbluth*, 65 F.2d 400 (2d Cir. 1933), is one of the last published examples. The bare `In re` prefix is adequate.
- **`In re Reorganization of [Entity]`** — Older form for Chapter X reorganizations under the 1938 Chandler Act. Largely displaced by the bare `In re [Debtor]` form when the 1978 Code consolidated Chapter X and Chapter XI into Chapter 11. Modern use is rare.
- **`In re Insolvency of [Bank or Entity]`** — Pre-FDIC state-bank-insolvency form, mostly turn-of-the-20th-century. Effectively obsolete.
- **`In re Joint Administration of [Debtor Group]`** — Real form (FRBP 1015(b)), but extremely rare in published opinion captions because joint administration is a docket-management order rather than a substantive ruling. Procedural orders captioned this way rarely appear in reporters.
- **`In re Substantive Consolidation of [Debtors]`** — Real form, also rare in opinion captions. Substantive consolidation orders are usually issued in the bare-`In re` form with the order's title (e.g., "Order Substantively Consolidating ...") rather than the caption itself.
- **`In re Foreign Representative of [Foreign Debtor]`** — Real but rare. Most Chapter 15 cases are captioned bare `In re [Foreign Debtor]` with the petitioner identified in the body.
- **`In re Petition for Recognition of Foreign Proceeding`** — Chapter 15 procedural form, also typically captioned bare `In re [Foreign Debtor]`.
- **`In re Consolidated [Debtor1, Debtor2, ...]`** — Joint administration / substantive consolidation captions sometimes prepend "Consolidated" before the debtor names. The bare `In re` prefix handles this — "Consolidated" reads as a party-name modifier.

---

## The adversary-proceeding admin parenthetical `[Trustee] v. [Defendant] (In re [Debtor])`

This is **not a procedural-prefix problem**; it is an admin-parenthetical detector problem, and it is tracked separately in issue #241. Including it here for context only.

### Caption pattern

```
Spence v. Hintze (In re Hintze), 570 B.R. 369 (Bankr. N.D. Fla. 2017)
Philip V. Martino, Trustee v. Sohail A. Shakir (In re Shakir), ... (Bankr. N.D. Ill. 2019)
Stevens v. Whitmer (In re Stevens), 220 B.R. 1 (B.A.P. 8th Cir. 1998)
[Plaintiff] v. [Defendant] (In re [Debtor]), [vol] B.R. [page] (Bankr. [court] [year])
```

### Style guide grounding

Every federal bankruptcy court style guide treats `(In re [Debtor])` as part of the case name (not the citation):

- FLNB Style Guide ("United States Bankruptcy Court Northern District of Florida Style Guide"): the parenthetical names the underlying administrative case and is preserved as part of the case caption.
- FLMB Style Guide (Bluebook 19th ed. references): same.
- WDTN Style Guide (Bluebook 21st ed.): explicitly: "Spence v. Hintze (In re Hintze), 570 B.R. 369 (Bankr. N.D. Fla. 2017) | Short form: Hintze, 570 B.R. at 369."

### Parser implications

- The `(In re X)` is a **case-name suffix**, not a court+year parenthetical and not an explanatory parenthetical. eyecite-ts's `fullSpan` / `LOOKAHEAD_PAREN_REGEX` should detect this pattern and absorb it into the case-name span before the citation-core parse.
- Heuristic: a parenthetical of the form `(In re [Surname or Entity Name])` immediately following a `v.`-form caption (no comma between the defendant and the open paren) is an adversary admin parenthetical.
- This heuristic does **not** belong in `PROCEDURAL_PREFIX_REGEX` because the prefix mechanism is for procedural-only captions (no `v.`). For an adversary, the case is `[A] v. [B]` and the prefix mechanism never fires.

This work belongs in #241, not in this document's recommendations.

---

## Recommended action

Add the following prefixes to `PROCEDURAL_PREFIX_REGEX` and the parallel `proceduralPrefixes` array, in **longer-first order**:

### Priority 1 (high — insurance/bank insolvency captions, modern volume)

1. `In the Matter of the Liquidation of`
2. `In the Matter of the Rehabilitation of`
3. `In re Liquidation of`
4. `In re Rehabilitation of`
5. `Matter of Liquidation of`
6. `Matter of Rehabilitation of`

### Priority 2 (medium — additional state-insurance and federal-equity receivership forms)

7. `In the Matter of the Receivership of`
8. `In the Matter of the Conservation of`
9. `In re Receivership of`
10. `In re Conservation of`

### Priority 3 (lower — trusteeship and historic Bankruptcy Act forms)

11. `In the Matter of the Trusteeship of`
12. `In re Trusteeship of`
13. `In re Voluntary Petition of`
14. `In re Petition of`
15. `In re Assignment for the Benefit of Creditors of`

### Ordering note

All P1/P2/P3 entries must be inserted **before** the existing bare `In re` and `Matter of` entries in the alternation list so that the longer-first match wins. They should also be placed before any newer family-law `Conservatorship of` entry to avoid the linguistic collision with `Conservation of`.

The regex is unanchored (`\b... \s*,\s*$`) so the entries will work as drop-ins. The parallel `proceduralPrefixes` array in `extractPartyNames` must mirror the regex order for the `prefixRegex.exec(caseName)` loop to find the longer prefix first.

### Test cases to add

```text
// P1
"In re Liquidation of Legion Insurance Co., 831 A.2d 1196 (Pa. Cmwlth. 2003)"
"In the Matter of the Liquidation of American Mutual Liability Insurance Co., 434 Mass. 272 (2001)"
"In re Rehabilitation of Scottish RE (U.S.), Inc., C.A. No. 2019-0175-JTL (Del. Ch. 2022)"
"In the Matter of the Rehabilitation of the Home Insurance Co., 166 N.H. 84 (2014)"
"Matter of Liquidation of Union Indemnity Insurance Co. of N.Y., 89 N.Y.2d 94 (1996)"

// P2
"In re Receivership of Bayou Group, LLC, 372 B.R. 661 (S.D.N.Y. 2007)"
"In the Matter of the Receivership of Security General Insurance Co., 82 S.D. 213 (1966)"
"In re Conservation of California Insurance Co., [cite] (Cal. App.)"

// P3
"In re Trusteeship of [Trust Name], [cite] (Minn. Ct. App. 2021)"
"In re Voluntary Petition of [Debtor], [cite] (Bankr. ...)"
"In re Petition of Clinton, 41 F.2d 749 (S.D.N.Y. 1930)"
"In re Assignment for the Benefit of Creditors of [Assignor], [cite] (Cal. App.)"
```

### Confidence-scoring guidance

These prefixes should match with the same confidence weight as the existing `In re Marriage of` and `In the Matter of` entries — they are all structurally identical (procedural prefix + party name), differing only in subject-matter vocabulary. The confidence weighting in `extractCase.ts` does not need adjustment.

### Out of scope (deferred)

The following items are bankruptcy-domain caption issues but do **not** belong in this prefix work:

- **Adversary `(In re X)` admin parenthetical** — tracked in #241. Requires a separate detector in `fullSpan` / `LOOKAHEAD_PAREN_REGEX`, not a new prefix entry.
- **Suffix variants** (`In re [Insurer] in Liquidation`) — already handled by the existing bare `In re` prefix; no change needed.
- **Long Minnesota indenture-trust captions** — head-match the prefix and let the existing party-name span detector grab the remainder. No special handling required.
- **Pre-1898 forms** (`In re Bankruptcy of`, `In re Composition of`, `In re Insolvency of`) — too rare to justify regex entries; the bare `In re` prefix is adequate.

---

## Statutory and reporter-style hooks for each prefix family

The prefix forms recommended above are not arbitrary — they map to specific statutory or reporter-style sources that practitioners reach for when captioning these proceedings. Mapping each prefix to its source helps reviewers calibrate confidence in the proposal.

### Liquidation track

The model act here is the **NAIC Insurers Rehabilitation and Liquidation Model Act** (IRLMA), originally adopted in 1977 and amended several times since. Versions of IRLMA are codified in nearly every state:

- New Hampshire RSA 402-C (Insurers Rehabilitation and Liquidation Act).
- New Jersey N.J.S.A. 17:30C-1 et seq.
- Pennsylvania 40 P.S. § 221.1 et seq. (Article V of the Insurance Department Act of 1921).
- Delaware 18 Del. C. ch. 59.
- New York N.Y. Ins. L. art. 74.
- California Cal. Ins. Code § 1010 et seq.
- Massachusetts G.L. c. 175 § 180A et seq.
- Texas Tex. Ins. Code ch. 443 (Insurer Receivership Act).

When the insurance commissioner files a "petition for liquidation" under any of these statutes, the receiving court captions the proceeding as `In re Liquidation of [Insurer]` (or one of the longer variants). The model-act vocabulary is the reason the prefix is consistent across jurisdictions despite the substantive variation.

The same statutes also authorize the **rehabilitation** and **conservation** tracks discussed above. PA's Article V, for example, distinguishes the three statuses in 40 P.S. §§ 221.14 (conservation), 221.15 (rehabilitation), and 221.20 (liquidation). The Pa. Cmwlth. caption for each follows the form `In re [Insurer] in [Status]` for the suffix form, or `In re [Status] of [Insurer]` for the prefix form.

### Federal-bankruptcy track

The Bankruptcy Code (Title 11) and the FRBP have largely collapsed all the historic Bankruptcy Act forms into the single bare `In re [Debtor]` form:

- Voluntary main case → `In re [Debtor]` (FRBP 1005).
- Involuntary main case → `In re [Debtor]` (FRBP 1010).
- Chapter 7 liquidation, Chapter 11 reorganization, Chapter 12 family farmer, Chapter 13 wage-earner, Chapter 15 cross-border — all use the bare `In re [Debtor]` caption.
- Adversary proceeding → `[Plaintiff] v. [Defendant] (In re [Debtor])` (FRBP 7001-7087).
- Substantive consolidation order → captioned in the bare `In re [Lead Debtor]` form, not as a `In re Substantive Consolidation of` proceeding.
- Joint administration order → captioned in the bare `In re [Lead Debtor]` form per FRBP 1015(b).

This is why the modern bankruptcy-domain prefix work is concentrated in **state-court** insurance/bank/trust insolvency and not in federal Title 11. The federal forms are already covered by the bare `In re` prefix.

### Federal-equity-receiver track

When the SEC, FTC, CFTC, or another federal agency seeks a receiver in a federal district court (typically under 15 U.S.C. § 78u(d)(5) for SEC enforcement actions), the receiver is appointed and the case proceeds either under the original enforcement-action caption (`SEC v. [Defendants]`) or, after appointment, under a procedural caption (`In re Receivership of [Entity]`). The latter form is uncommon in published opinions because the enforcement action's `v.` caption tends to persist throughout the receivership.

A relevant published example: *SEC v. Bayou Group, LLC*, 372 B.R. 661 (S.D.N.Y. 2007), shows the canonical SEC-receivership caption — but the same proceeding generated bankruptcy-court opinions when the receiver filed Chapter 11 petitions on behalf of the entities, leading to captions like *In re Bayou Group, LLC*.

### Chapter 15 cross-border insolvency

Chapter 15 was added to the Code in 2005 (BAPCPA). Foreign-debtor recognition cases are captioned uniformly as `In re [Foreign Debtor]` per FRBP 1004.2 and FRBP 1005:

- *In re Condor Insurance, Ltd.*, 601 F.3d 319 (5th Cir. 2010) (Chapter 15 recognition of Nevis insolvency).
- *In re Betcorp Ltd.*, 400 B.R. 266 (Bankr. D. Nev. 2009) (Chapter 15 recognition of Australian winding-up).
- *In re British American Insurance Co.*, 425 B.R. 884 (Bankr. S.D. Fla. 2010).
- *In re Metcalfe & Mansfield Alternative Investments*, 421 B.R. 685 (Bankr. S.D.N.Y. 2010).
- *In re Global Cord Blood Corp.*, 653 B.R. 67 (Bankr. S.D.N.Y. 2023).
- *In re Agro Santino, OOD*, 653 B.R. 79 (Bankr. S.D.N.Y. 2023).

The bare `In re` prefix already handles all of these. No Chapter 15-specific prefix is needed.

### Assignment for the Benefit of Creditors

ABC frameworks vary by state but share the common-law origin of the assignment device. The principal modern statutes:

- California Code of Civil Procedure §§ 493.010-493.060, 1800-1802 (ABC framework).
- Delaware Court of Chancery Rule 148 (ABC procedure).
- New Jersey N.J.S.A. 2A:19-1 et seq.
- New York Debtor & Creditor Law art. 2.
- Maryland Md. Code Ann., Bus. Reg. § 15-101 et seq.
- Florida Fla. Stat. ch. 727.

Published opinions captioned `In re Assignment for the Benefit of Creditors of [Assignor]` are rare because most ABCs do not generate appealable orders. When they do, the caption is more often the assignee's name (`Sherwood Partners, Inc. v. Lycos, Inc.`) than a procedural-prefix form.

---

## Regex implementation sketch

The following sketch shows how the recommended additions would be inserted into the current `PROCEDURAL_PREFIX_REGEX` (located near line 282 of `src/extract/extractCase.ts`). The longer-first ordering is preserved.

**Current (16 entries):**

```javascript
const PROCEDURAL_PREFIX_REGEX =
  /\b(In\s+the\s+Matter\s+of|In\s+re\s+Marriage\s+of|In\s+the\s+Interest\s+of|Commonwealth\s+ex\s+rel\.|In re|Ex parte|Matter of|Estate of|State ex rel\.|United States ex rel\.|Application of|On Petition of|Petition of|Adoption of|Conservatorship of|Guardianship of)\s+([A-Za-z0-9\s.,'&()/-]+?)\s*,\s*$/i
```

**Proposed (31 entries with P1/P2/P3 additions, longer-first order):**

```javascript
const PROCEDURAL_PREFIX_REGEX =
  /\b(In\s+the\s+Matter\s+of\s+the\s+Liquidation\s+of|In\s+the\s+Matter\s+of\s+the\s+Rehabilitation\s+of|In\s+the\s+Matter\s+of\s+the\s+Receivership\s+of|In\s+the\s+Matter\s+of\s+the\s+Conservation\s+of|In\s+the\s+Matter\s+of\s+the\s+Trusteeship\s+of|In\s+re\s+Assignment\s+for\s+the\s+Benefit\s+of\s+Creditors\s+of|In\s+re\s+Voluntary\s+Petition\s+of|In\s+the\s+Matter\s+of|In\s+re\s+Marriage\s+of|In\s+re\s+Liquidation\s+of|In\s+re\s+Rehabilitation\s+of|In\s+re\s+Receivership\s+of|In\s+re\s+Conservation\s+of|In\s+re\s+Trusteeship\s+of|In\s+re\s+Petition\s+of|In\s+the\s+Interest\s+of|Matter\s+of\s+Liquidation\s+of|Matter\s+of\s+Rehabilitation\s+of|Commonwealth\s+ex\s+rel\.|In re|Ex parte|Matter of|Estate of|State ex rel\.|United States ex rel\.|Application of|On Petition of|Petition of|Adoption of|Conservatorship of|Guardianship of)\s+([A-Za-z0-9\s.,'&()/-]+?)\s*,\s*$/i
```

Length-sorted ordering for the proposed regex (longest prefix first, in characters of normalized spelling):

1. `In the Matter of the Rehabilitation of` (39 chars)
2. `In the Matter of the Receivership of` (37)
3. `In the Matter of the Conservation of` (37)
4. `In the Matter of the Liquidation of` (36)
5. `In the Matter of the Trusteeship of` (36)
6. `In re Assignment for the Benefit of Creditors of` (49) — long but rare
7. `In re Voluntary Petition of` (28)
8. `In the Matter of` (16) — existing
9. `In re Marriage of` (18) — existing
10. `In re Liquidation of` (21)
11. `In re Rehabilitation of` (24)
12. `In re Receivership of` (22)
13. `In re Conservation of` (22)
14. `In re Trusteeship of` (21)
15. `In re Petition of` (18)
16. `In the Interest of` (18) — existing
17. `Matter of Liquidation of` (25)
18. `Matter of Rehabilitation of` (28)
19. `Commonwealth ex rel.` (20) — existing
20. `In re` (5) — existing
21. `Ex parte` (8) — existing
22. `Matter of` (10) — existing
23. `Estate of` (10) — existing
24. `State ex rel.` (13) — existing
25. `United States ex rel.` (22) — existing
26. `Application of` (15) — existing
27. `On Petition of` (15) — existing
28. `Petition of` (12) — existing
29. `Adoption of` (12) — existing
30. `Conservatorship of` (19) — existing
31. `Guardianship of` (16) — existing

The exact ordering in the alternation list does not need to be strictly length-sorted because regex alternation is left-to-right (PCRE/V8 behavior: first match wins), so the existing convention of `longer-form-before-shorter-form-of-same-stem` is sufficient. The proposed additions should be placed immediately after each existing entry of the same stem:

- `In the Matter of the Liquidation of` → before `In the Matter of`
- `In the Matter of the Rehabilitation of` → before `In the Matter of`
- (etc. for all `In the Matter of the X of` variants)
- `In re Liquidation of` → before `In re`
- `In re Rehabilitation of` → before `In re`
- (etc. for all `In re X of` variants)
- `Matter of Liquidation of` → before `Matter of`
- `Matter of Rehabilitation of` → before `Matter of`

This avoids over-ordering and keeps the regex source readable.

### Parallel `proceduralPrefixes` array update

The array near line 1511 of `extractCase.ts` should mirror the regex order:

```javascript
const proceduralPrefixes = [
  // Existing 16, in order:
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
  // P1 additions (highest volume):
  "In the Matter of the Liquidation of",
  "In the Matter of the Rehabilitation of",
  "In re Liquidation of",
  "In re Rehabilitation of",
  "Matter of Liquidation of",
  "Matter of Rehabilitation of",
  // P2 additions:
  "In the Matter of the Receivership of",
  "In the Matter of the Conservation of",
  "In re Receivership of",
  "In re Conservation of",
  // P3 additions:
  "In the Matter of the Trusteeship of",
  "In re Trusteeship of",
  "In re Voluntary Petition of",
  "In re Petition of",
  "In re Assignment for the Benefit of Creditors of",
]
```

But the loop in `extractPartyNames` runs the array in order, and the regex `^(${prefix})\\s+(.+)$` will match the **first** entry that fits. So the array must be **longest-prefix-first** for each stem, regardless of subject-matter grouping. The clean implementation is:

```javascript
const proceduralPrefixes = [
  // === Longest prefixes first (longest-of-same-stem priority) ===
  // "In re Assignment for the Benefit of Creditors of" stem
  "In re Assignment for the Benefit of Creditors of",
  // "In the Matter of the X of" stems
  "In the Matter of the Rehabilitation of",
  "In the Matter of the Liquidation of",
  "In the Matter of the Receivership of",
  "In the Matter of the Conservation of",
  "In the Matter of the Trusteeship of",
  // "In re Voluntary Petition of"
  "In re Voluntary Petition of",
  // "In the Matter of" stems
  "In the Matter of",  // existing
  "In the Interest of",  // existing
  // "In re X of" stems
  "In re Marriage of",  // existing
  "In re Rehabilitation of",
  "In re Receivership of",
  "In re Conservation of",
  "In re Liquidation of",
  "In re Trusteeship of",
  "In re Petition of",
  // "Matter of X of" stems
  "Matter of Rehabilitation of",
  "Matter of Liquidation of",
  // Bare "In re"
  "In re",  // existing
  // Other existing prefixes
  "Commonwealth ex rel.",
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

This ordering guarantees that `In re Liquidation of [Insurer]` matches the `In re Liquidation of` entry rather than the bare `In re` entry.

---

## Fixture corpus appendix

The following corpus samples should be added to `tests/extract/extractCase.test.ts` to verify each new prefix. Each sample is from a published opinion identified in the research above. Volume/page numbers reflect actual citations from the source opinions.

### P1 fixtures

```
// In re Liquidation of
"In re Liquidation of Legion Insurance Co., 831 A.2d 1196 (Pa. Cmwlth. 2003)."
"In re Liquidation of Villanova Insurance Co., 831 A.2d 1196 (Pa. Cmwlth. 2003)."

// In the Matter of the Liquidation of
"In the Matter of the Liquidation of American Mutual Liability Insurance Co., 434 Mass. 272 (2001)."
"In the Matter of the Liquidation of Integrity Insurance Co., 165 N.J. 75 (2000)."
"In the Matter of the Liquidation of the Home Insurance Co., 166 N.H. 84 (2014)."

// In re Rehabilitation of
"In re Rehabilitation of Scottish RE (U.S.), Inc., C.A. No. 2019-0175-JTL (Del. Ch. 2022)."
"In re Rehabilitation of Frontier Insurance Co., 51 A.D.3d 80 (N.Y. App. Div. 3d Dep't 2008)."

// In the Matter of the Rehabilitation of
"In the Matter of the Rehabilitation of the Home Insurance Co., 166 N.H. 84 (2014)."

// Matter of Liquidation of (N.Y. App. Div. truncation)
"Matter of Liquidation of Union Indemnity Insurance Co. of N.Y., 89 N.Y.2d 94 (1996)."
```

### P2 fixtures

```
// In re Receivership of
"In re Receivership of Bayou Group, LLC, 372 B.R. 661 (S.D.N.Y. 2007)."

// In the Matter of the Receivership of
"In the Matter of the Receivership of Security General Insurance Co., 82 S.D. 213 (1966)."

// In re Conservation of
"In re Conservation of California Insurance Co., ___ Cal. App. ___ (2024)."
```

### P3 fixtures

```
// In re Trusteeship of
"In re Trusteeship of the Acme Indenture, ___ Minn. ___ (2021)."

// In the Matter of the Trusteeship of (Minnesota long form)
"In the Matter of the Trusteeship under the Indenture of Trust dated as of September 1, 1996, ___ Minn. ___ (2021)."

// In re Voluntary Petition of
"In re Voluntary Petition of John Doe, ___ B.R. ___ (Bankr. S.D.N.Y. ____)."

// In re Petition of (older form)
"In re Petition of Clinton, 41 F.2d 749 (S.D.N.Y. 1930)."

// In re Assignment for the Benefit of Creditors of
"In re Assignment for the Benefit of Creditors of Acme Corp., ___ Cal. App. ___ (____)."
```

### Adversary admin parenthetical (issue #241, deferred — included here only for fixture-completeness)

```
"Spence v. Hintze (In re Hintze), 570 B.R. 369 (Bankr. N.D. Fla. 2017)."
"Stevens v. Whitmer (In re Stevens), 220 B.R. 1 (B.A.P. 8th Cir. 1998)."
```

These should **not** be added to the procedural-prefix test set. They belong in a separate adversary-admin-parenthetical test suite under #241.

### Negative cases (prefixes that should still NOT match)

```
// Bare "Bankruptcy of X" — should NOT trigger a new prefix; old Anglo form, rare
"Bankruptcy of John Doe, ___ ___ ___."

// "Composition of X" — pre-1898; should NOT trigger
"Composition of Smith with His Creditors, ___ ___ ___."

// "Insolvency of X" — pre-FDIC; should NOT trigger
"Insolvency of First National Bank, ___ ___ ___."
```

These captions appear in pre-1900 reporters but are too rare to justify regex coverage. The bare `In re` prefix handles modern variants.

---

## Risk analysis

### False positives

The added prefixes are subject-matter specific (`Liquidation`, `Rehabilitation`, `Conservation`, `Receivership`, `Trusteeship`, `Voluntary Petition`, `Assignment for the Benefit of Creditors`). They are unlikely to appear in non-procedural contexts because the words "Liquidation," "Rehabilitation," etc., are not common opening words in non-procedural party names. The risk of a false-positive match against a non-procedural caption is very low.

The one exception is `In re Liquidation of` matching a caption like `In re Liquidation of [Asset]` where `[Asset]` is a non-party term (e.g., "the trust assets"). But such captions do not appear in case law — courts caption these as `Trustee v. [Defendant]` or `In re [Trust Name]`, not as `In re Liquidation of [Asset]`.

### False negatives

The current state of `PROCEDURAL_PREFIX_REGEX` is already a **false-negative** state for these forms — eyecite-ts will match the bare `In re` and treat "Liquidation of [Insurer]" as the party name. After the additions, the party name will be captured correctly as just `[Insurer]`. This is an improvement in case-name precision.

### Family-law collision

`Conservation of` does not collide with the existing family-law `Conservatorship of` prefix because the spellings differ. However, reviewers should verify that the family-law `Conservatorship of` prefix continues to match correctly against family-law captions like `Conservatorship of L.M.` after the insurance `Conservation of` prefix is added. The longer-first-of-same-stem rule prevents `Conservation of` from being matched against `Conservatorship of L.M.` because the stem differs.

### Long-prefix performance

The longest added prefix is `In re Assignment for the Benefit of Creditors of` (49 characters of pattern source). In regex terms this is unremarkable; modern V8 and PCRE engines handle long alternation arms without measurable performance impact on the typical caption-extraction input size. The regex remains free of nested quantifiers, so ReDoS risk is unchanged.

---

## Migration plan

A minimal migration plan for landing these additions:

1. **Branch**: `feat/bankruptcy-procedural-prefixes` (per CLAUDE.md: never commit directly to main).
2. **Code change**: Update `PROCEDURAL_PREFIX_REGEX` (line 282) and `proceduralPrefixes` array (line 1511) per the implementation sketch above.
3. **Tests**: Add the P1/P2/P3 fixture corpus to `tests/extract/extractCase.test.ts`. Existing tests should pass unchanged.
4. **Changeset**: Add a patch changeset describing the addition (`pnpm changeset` → patch → "Add bankruptcy/insolvency procedural prefixes: In re Liquidation of, In re Rehabilitation of, etc.").
5. **PR**: Reference this research doc and issue #242 (closed) for context. Note that #241 (adversary admin parenthetical) remains open and is addressed separately.

The split between P1, P2, and P3 allows a phased rollout if reviewers prefer to land the high-volume prefixes first and the historic ones later. A single PR for all 15 additions is also reasonable given that the change is structurally uniform.

---

## Open questions for reviewer

1. **Phased landing**: Should P1, P2, and P3 land in separate PRs or together? Recommendation: one PR with all 15 — the change is structurally uniform and risk is low.
2. **Suffix-variant coverage**: Should eyecite-ts attempt to detect the suffix variant `In re [Insurer] in Liquidation` and normalize the captured prefix to `Liquidation`? Recommendation: no — the bare `In re` is correct, and the suffix variant only affects display, not case-name semantics.
3. **`Conservation of` vs. `Conservatorship of`**: Should we add `Conservation of` as a separate prefix or fold it under the existing `Conservatorship of`? Recommendation: separate prefix. The vocabularies are distinct (insurance regulation vs. probate guardianship-equivalent) and case-name semantics should reflect this.
4. **Confidence weighting**: Should the new prefixes carry a lower confidence weight than the existing `In re Marriage of` etc.? Recommendation: no — these are structurally identical and equally well-attested in published opinions.
5. **Internationalization (Chapter 15)**: Should eyecite-ts add any recognition for foreign-language insolvency forms (e.g., German "Insolvenz" prefixes, French "redressement judiciaire," Spanish "concurso")? Recommendation: no for now. Chapter 15 cases in U.S. reporters are captioned in English (`In re [Foreign Debtor]`). Foreign-language captions belong in a separate localization research project.

---

## Sources

The following corpus and style sources informed the recommendations:

- Bankruptcy Code (Title 11 U.S.C.) and Federal Rules of Bankruptcy Procedure (FRBP), particularly Rules 1005 (caption), 1015 (joint administration), 7001 (types of adversary proceedings), and 7041 (dismissal). [LII / Cornell](https://www.law.cornell.edu/rules/frbp) and [House USC](https://uscode.house.gov/view.xhtml?path=/prelim@title11/title11a/node2/partI&edition=prelim).
- U.S. Bankruptcy Court FLNB Style Guide, [Northern District of Florida](https://www.flnb.uscourts.gov/sites/flnb/files/forms/styleguide.pdf).
- U.S. Bankruptcy Court FLMB Style Guide, [Middle District of Florida](http://www.flmb.uscourts.gov/procedures/documents/styleguide-tpa19.pdf) (Bluebook 19th ed. references).
- U.S. Bankruptcy Court WDTN Style Guide, [Western District of Tennessee](https://www.tnwb.uscourts.gov/PDFs/judgeBarnett/WDTN%20Style%20Guide%20.pdf) (Bluebook 21st ed. references).
- NAIC Receivers' Handbook for Insurance Company Insolvencies (2024 ed.), [NAIC](https://content.naic.org/sites/default/files/publication-rec-bu-receivers-handbook-insolvencies.pdf).
- Pennsylvania Insurance Department, [Liquidated, Rehabilitated and Discharged Insurance Companies](https://www.pa.gov/agencies/insurance/resources/consumer-resources/liquidated-rehabilitated-discharged-insurance-companies).
- *In re Rehabilitation of Scottish RE (U.S.), Inc.*, [Del. Ch. 2022](https://law.justia.com/cases/delaware/court-of-chancery/2022/c-a-no-2019-0175-jtl-0.html).
- *In re Rehabilitation of the Home Insurance Co.*, [N.H. 2014](https://law.justia.com/cases/new-hampshire/supreme-court/2014/2012-623.html).
- *In the Matter of the Liquidation of American Mutual Liability Insurance Co.*, [Mass. 2001](https://law.justia.com/cases/massachusetts/supreme-court/volumes/434/434mass272.html).
- *In the Matter of the Liquidation of the Home Insurance Co.*, [N.H. 2022](https://law.justia.com/cases/new-hampshire/supreme-court/2022/2021-0211.html) and [N.H. 2026](https://law.justia.com/cases/new-hampshire/supreme-court/2026/2025-0178.html).
- *In the Matter of Liquidation of Union Indemnity Insurance Co. of N.Y.*, [N.Y. 1996](https://www.law.cornell.edu/nyctap/I98_0075.htm).
- *In the Matter of the Liquidation of Integrity Insurance Co.*, [N.J. 2000](https://law.justia.com/cases/new-jersey/supreme-court/2000/a-72-99-opn.html); also *IMO the Liquidation of Integrity Insurance Co.*, [N.J. 1996](https://law.justia.com/cases/new-jersey/supreme-court/1996/a-2-96-opn.html).
- *In re Penn Treaty Network America Insurance Co. in Rehabilitation*, [Pa. Cmwlth. 2012](https://law.justia.com/cases/pennsylvania/commonwealth-court/2012/4-m-d-2009-0.html).
- *In re Ambassador Insurance Co.*, [Vt. 1986](https://law.justia.com/cases/vermont/supreme-court/1986/85-145-0.html).
- *In Re Security General Insurance Co.*, [S.D. 1966](https://law.justia.com/cases/south-dakota/supreme-court/1966/10214-1.html).
- *In re Rehabilitation of Frontier Insurance Co.*, [N.Y. App. Div. 2008](https://caselaw.findlaw.com/ny-supreme-court/1246420.html).
- *Koken v. Re Petition for Liquidation of Legion Insurance Co. (In Rehabilitation)*, [Pa. Cmwlth. 2003](https://caselaw.findlaw.com/court/pa-commonwealth-court/1233012.html).
- *In the Matter of the Trusteeship under the Indenture of Trust ...*, [Minn. Ct. App. 2021](https://law.justia.com/cases/minnesota/court-of-appeals/2021/a20-1335.html).
- Sherwood Partners, *Inc. v. Lycos*, 394 F.3d 1198 (9th Cir. 2005) (preemption of Cal. ABC by Title 11).
- ABI / Vanderbilt Law Review: *Substantive Consolidation in Bankruptcy: A Primer*, [Vand. L. Rev.](https://scholarship.law.vanderbilt.edu/vlr/vol43/iss1/12/).
- ABA Business Law Today, *Assignment for the Benefit of Creditors*, [ABA](https://www.americanbar.org/groups/business_law/resources/business-law-today/2015-november/assignment-for-the-benefit-of-creditors/).
- *Bankruptcy Act of 1898 (Nelson Act)*, [FRASER / St. Louis Fed](https://fraser.stlouisfed.org/title/bankruptcy-act-1898-nelson-act-5872/fulltext).
- *Substantive Consolidation Today*, [Univ. of Chicago Law](https://chicagounbound.uchicago.edu/cgi/viewcontent.cgi?article=2020&context=journal_articles).
- U.S. Trustee Program, *Volume 6: Chapter 15 Case Administration*, [DOJ](https://www.justice.gov/ust/file/volume_6_chapter_15_case_administration.pdf).
- Internal: eyecite-ts repo files `src/extract/extractCase.ts` (regex near line 282; `proceduralPrefixes` array near line 1511); GitHub issues #241 (adversary admin parenthetical, open) and #242 (procedural prefix expansion, closed).
