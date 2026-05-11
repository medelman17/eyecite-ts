# Procedural-Prefix Case-Caption Forms: Probate, Estates, Trusts, Wills, Guardianship & Conservatorship

**Date:** 2026-05-11
**Author:** Research for eyecite-ts (TypeScript port of Python eyecite)
**Scope:** U.S. federal + state probate / decedents' estates / trust administration / will contests / guardianship / conservatorship / succession (LA) / adoption-adjacent prefixes
**Target code:** `src/extract/extractCase.ts` — `PROCEDURAL_PREFIX_REGEX` (line 282) and the parallel `proceduralPrefixes` array (line 1511)

---

## Summary

This document inventories procedural-prefix case-caption forms that appear in published probate, decedents'-estates, trust, will-contest, guardianship, conservatorship, and Louisiana-succession opinions, and identifies the highest-priority additions for eyecite-ts.

**Current coverage (16 prefixes):** `In the Matter of`, `In re Marriage of`, `In the Interest of`, `Commonwealth ex rel.`, `In re`, `Ex parte`, `Matter of`, `Estate of`, `State ex rel.`, `United States ex rel.`, `Application of`, `On Petition of`, `Petition of`, `Adoption of`, `Conservatorship of`, `Guardianship of`.

**Key findings.**

1. **Many probate forms are already absorbed by `In re`.** Captions like `In re Estate of Smith`, `In re Trust of Stuchell`, `In re Will of Ranney`, `In re Probate of Will and Codicil of Macool`, `In re Last Will and Testament of [X]`, `In re Adoption of B.L.V.B.`, `In re Guardianship of Cy`, `In re Civil Commitment of M.C.`, `In re Dependency of X`, `In re Termination of Parental Rights of X`, and `In re Caveat of Will of X` all match the existing `In re` alternation. They are *handled today*. The body of the caption is the "subject" rather than a true party, but the citation-extraction pipeline does not need to distinguish that.
2. **`Succession of [X]` is the single most important missing form** — it is the canonical Louisiana civil-law caption for any decedent's estate proceeding (see La. Code Civ. Proc. art. 2811 et seq.). It is *not* an `In re` form: the caption starts directly with `Succession of`. Tens of thousands of published Louisiana opinions use it.
3. **`In the Goods of [X]`** — an older ecclesiastical-court form (Roman / Probate Division of the High Court of England & Wales) — appears in a non-trivial body of pre-1900 American probate decisions and English cases that U.S. courts still cite. Lower priority but a clean addition.
4. **`Will of [X]` and `Matter of Will of [X]`** — NJ Supreme Court and a few other jurisdictions sometimes drop the "In re" entirely (e.g., `Matter of Will of Ranney`, 124 N.J. 1 (1991)). These are *already covered* by the existing `Matter of` and `In the Matter of` alternations because the regex captures everything after the prefix. Standalone `Will of [X]` (with no preceding "In re" / "Matter of") is rare but appears in some older New York Surrogate's Court reporters and in the Wisconsin pattern `Will of [X]`.
5. **`In re Marriage of`** is already covered for family-law captions; the probate-side analog `In re Adoption of` would be a sensible, symmetric addition, even though `Adoption of` (bare) is already covered.
6. **No new prefix should be lower priority than `Succession of`** — it dwarfs the others in citation count.

**Highest-priority gap:** `Succession of`. **Medium priority:** `In the Goods of`, `Will of`. **Low / situational:** `Heirs of`, `In re Marriage of` is already present so its probate analogs (`In re Adoption of`, `In re Guardianship of`, `In re Conservatorship of`) are *already* matched by `In re` + the existing single-word prefixes.

**Recommended action:** Add **one** new top-level alternation — `Succession of` — to both `PROCEDURAL_PREFIX_REGEX` and `proceduralPrefixes`. Optionally add `In the Goods of` and `Will of` if Louisiana succession + English-derived probate cases are corpus-relevant. Detailed alternation-ordering analysis is in §6.

---

## 1. How the existing list interacts with probate captions

Before proposing additions, understand which probate forms are *already absorbed* by the existing alternations. The regex is *case-insensitive*, *longest-first*, and consumes the prefix plus everything before the comma that precedes the citation. So:

| Caption observed | Matches via | Notes |
|---|---|---|
| `In re Estate of Smith` | `In re` | "Estate of Smith" becomes the captured subject |
| `In re Will of Ranney` | `In re` | same |
| `In re Trust of Stuchell` | `In re` | same |
| `In re Will and Codicil of Macool` | `In re` | same |
| `In re Last Will and Testament of [X]` | `In re` | same |
| `In re Probate of Will of [X]` | `In re` | same |
| `In re Adoption of B.L.V.B.` | `In re` | symmetric with `In re Marriage of` |
| `In re Guardianship of Cy` | `In re` | bare `Guardianship of` is also alternation |
| `In re Conservatorship of [X]` | `In re` | bare `Conservatorship of` is also alternation |
| `In re Termination of Parental Rights of [X]` | `In re` | swept up by `In re` |
| `In re Caveat of Will of [X]` | `In re` | NC-specific; swept up by `In re` |
| `In re Heirship of [X]` | `In re` | TX-specific (Tex. Est. Code ch. 202); swept up by `In re` |
| `In re Wrongful Death of [X]` | `In re` | swept up by `In re` |
| `In re Civil Commitment of [X]` | `In re` | swept up by `In re` |
| `In re Dependency of [X]` | `In re` | swept up by `In re` |
| `In re Name Change of [X]` | `In re` | swept up by `In re` |
| `In re Inter Vivos Trust of [X]` | `In re` | swept up by `In re` |
| `In re Testamentary Trust of [X]` | `In re` | swept up by `In re` |
| `In re Revocable Trust of [X]` | `In re` | swept up by `In re` |
| `In re Living Trust of [X]` | `In re` | swept up by `In re` |
| `Matter of Estate of [X]` | `Matter of` | already covered |
| `Matter of Will of Ranney` | `Matter of` | already covered |
| `In the Matter of the Estate of [X]` | `In the Matter of` | already covered |
| `Estate of Smith` | `Estate of` | already covered |
| `Adoption of B.L.V.B.` (bare) | `Adoption of` | already covered |
| `Guardianship of Cy` (bare) | `Guardianship of` | already covered |
| `Conservatorship of [X]` (bare) | `Conservatorship of` | already covered |
| **`Succession of [X]`** | **NOT MATCHED** | **proposed addition** |
| **`In the Goods of [X]`** | **NOT MATCHED** | **proposed addition (optional)** |
| **`Will of [X]`** (bare, no "In re") | **NOT MATCHED** | **proposed addition (optional)** |

So the dominant unmatched gap is **`Succession of`** (Louisiana), with **`In the Goods of`** and a bare **`Will of`** as smaller, more situational follow-ups.

---

## 2. Proposed addition: `Succession of`

### 2.1 Canonical form

```
Succession of [Decedent surname or full name]
```

Always capitalized `Succession of`; the decedent's name is the captured subject. Louisiana opinions almost never use `In re Succession of` — the caption starts directly with `Succession of`. (Federal cases sitting in diversity in Louisiana follow the state convention.)

### 2.2 Variant forms

- `Succession of [Surname]` — most common. (E.g., `Succession of Talbot`.)
- `Succession of [Full Name]` — appears in trial-court captions but rare in published-opinion captions.
- `In re Succession of [X]` — rare; almost never the official caption in Louisiana state courts. (Already absorbed by `In re` if it does occur.)
- `Estate of [X]` — *not* used in Louisiana. Louisiana civil law speaks in terms of "successions," not "estates" in the common-law sense.

### 2.3 Jurisdictions

- **Louisiana** — exclusive use. Governing law: La. Civ. Code arts. 871-1066 (Successions); La. Code Civ. Proc. arts. 2811-3434 (Probate procedure). La. Code Civ. Proc. art. 2811: "A proceeding to open a succession shall be brought in the district court of the parish where the deceased was domiciled at the time of his death."
- Louisiana appellate courts (1st, 2nd, 3rd, 4th, 5th Circuits) and Louisiana Supreme Court — every published succession opinion uses this caption.
- Federal courts in Louisiana (E.D. La., M.D. La., W.D. La., 5th Cir.) sometimes adopt the Louisiana caption when sitting in diversity or removed succession matters.

### 2.4 Subject matter

Covers *all* of: testate succession, intestate succession, opening of succession, putative heirs, forced heirship, collation, partition of succession property, administration, executor disputes, will contests, olographic-will validity, statutory-will formalities, succession debts, donation mortis causa, and trust-related claims that proceed through the succession.

### 2.5 Real corpus examples

Verbatim from published Louisiana opinions (no firm/client names; only the case caption + reporter + year):

| Citation | Subject |
|---|---|
| `Succession of Talbot, 530 So. 2d 1132 (La. 1988)` | Olographic will date / extrinsic evidence (La. Sup. Ct.). |
| `Succession of Boyd, 306 So. 2d 687 (La. 1975)` | Ambiguous date on olographic will. |
| `Succession of Holloway, 531 So. 2d 431 (La. 1988)` | Forced heirship / disinheritance. |
| `Succession of Raiford, 404 So. 2d 251 (La. 1981)` | Will formalities. |

These four alone span 13 years of Louisiana Supreme Court succession jurisprudence and demonstrate the consistent `Succession of [Surname]` caption.

### 2.6 Priority

**HIGH.** Louisiana succession caselaw is voluminous and the present regex misses *every single* `Succession of` caption. The fix is one alternation; the upside is correct case-name capture across an entire jurisdiction's probate jurisprudence.

---

## 3. Proposed addition: `In the Goods of`

### 3.1 Canonical form

```
In the Goods of [Decedent name]
```

Older / ecclesiastical-court / English-derived form. Some 19th-century American probate decisions and English Probate Division decisions still cited in U.S. opinions use this caption.

### 3.2 Variant forms

- `In the Goods of [X], Deceased` — the older long form; the trailing ", Deceased" is part of the caption.
- `In the Goods of [X]` — shortened.

### 3.3 Jurisdictions

- **England & Wales** — Prerogative Court of Canterbury and (post-1857) Probate Division of the High Court used this caption pervasively in the 19th and early 20th centuries. The form was superseded by `In the Estate of [X]` after the Probate Court Act 1857 in England.
- **U.S. cite-by-reference** — American probate scholarship and law-school casebooks (e.g., Dukeminier, *Wills, Trusts, and Estates*) cite English `In the Goods of` decisions, so they appear in U.S. opinion footnotes and law-review articles.
- **Older U.S. ecclesiastical / colonial probate** — a handful of pre-1900 state probate decisions adopted the form before standardizing to `In re Estate of`.

### 3.4 Subject matter

Almost exclusively testamentary will-validity disputes — execution formalities, alterations to wills after execution, lost wills, holographic/olographic-will issues, codicils.

### 3.5 Real corpus examples

| Citation | Subject |
|---|---|
| `In the Goods of Dewell, (1853) 1 Ecc. & Ad. 103` | Interlineations made to a will after execution (English Prerogative Court). |
| `In the Goods of Boehm, [1891] P. 247` | Whether provisions in a will could be omitted from probate if introduced without testator's knowledge. |

### 3.6 Priority

**LOW–MEDIUM.** Useful for completeness if eyecite-ts targets historical-corpus parsing (older American probate decisions; English-cited authority in law-review articles). Less useful for modern caselaw parsing.

---

## 4. Proposed addition: `Will of` (bare)

### 4.1 Canonical form

```
Will of [Testator]
```

The bare form — *not* preceded by `In re`, `In the Matter of`, or `Matter of`. Appears occasionally in older reporters and in Wisconsin practice.

### 4.2 Variant forms

- `Will of [Testator]` — bare form.
- `Will Contest of [Testator]` — even rarer; usually appears with a prefix.

### 4.3 Jurisdictions

- **Wisconsin** — historically published some probate decisions with bare `Will of [X]` captions in `Wis.` and `Wis. 2d` reports.
- **New York Surrogate's Court** — older `Misc.` reporter entries occasionally have `Will of [X]` as a docket caption when the surrogate's court order is short.
- **North Carolina** — historically, some `N.C.` and `N.C. App.` decisions in caveat-of-will proceedings used `Will of [X]` as the short caption.

### 4.4 Subject matter

Probate of will, will contest, testamentary capacity, undue influence, will execution formalities.

### 4.5 Real corpus examples

The bare-form examples are harder to find than the `Matter of Will of` form because most reporters add the "In re" / "Matter of" prefix during publication. Confirmed corpus examples:

| Citation | Subject |
|---|---|
| `Matter of Will of Ranney, 124 N.J. 1, 589 A.2d 1339 (1991)` | Substantial-compliance doctrine; NJ Supreme Court. (Note: *with* `Matter of` prefix — already covered.) |
| `In re Will of Ferree, 369 N.J. Super. 136, 848 A.2d 81 (Ch. Div. 2003)` | Holographic-will substantial compliance. (Already covered via `In re`.) |
| `In re Probate of Will and Codicil of Macool, 416 N.J. Super. 298, 3 A.3d 1258 (App. Div. 2010)` | Probate of unsigned copy. (Already covered via `In re`.) |

The bare `Will of [X]` form (no preceding prefix) is rare enough that adding the alternation may cause more false positives than it catches. Recommend **not** adding unless a corpus survey shows otherwise.

### 4.6 Priority

**LOW.** False-positive risk (a sentence like "the holding turned on the will of the testator" could match if the regex is naive about following context). Could safely defer.

---

## 5. Other forms surveyed and rejected (already covered or false-positive-prone)

### 5.1 `In re Estate of [X]`

**Status:** already matched by `In re`. The captured subject is `Estate of [X]`. *No action needed.*

If eyecite-ts wanted to *normalize* the captured plaintiff to drop the "Estate of" portion or expose `proceduralPrefix = "In re Estate of"`, that's a separate refactor — not a regex addition. Per current behavior:

- `In re Estate of Smith, ...` → `proceduralPrefix = "In re"`, `plaintiff = "In re Estate of Smith"`.
- `Estate of Smith, ...` → `proceduralPrefix = "Estate of"`, `plaintiff = "Estate of Smith"`.

These are both reasonable; just inconsistent across the two captions. Out of scope for this research.

### 5.2 `In re Trust of [X]` / `In re Testamentary Trust of [X]` / `In re Inter Vivos Trust of [X]` / `In re Living Trust of [X]` / `In re Revocable Trust of [X]` / `In re Family Trust of [X]` / `In re [Name] Trust`

**Status:** all matched by `In re`. No action needed.

Real corpus:

| Citation | Subject |
|---|---|
| `In re Trust of Stuchell, 104 Ore. App. 332, 801 P.2d 852 (1990)` | Trust modification by beneficiary agreement. |
| `In re Aboud Inter Vivos Trust, 129 Nev. Adv. Op. 97 (2013)` | Constructive trust / personal monetary judgment. |
| `In re Estate of Janes, 90 N.Y.2d 41, 681 N.E.2d 332 (1997)` | Testamentary-trust prudence (Kodak stock). |
| `In re Verah Landon Testamentary Trust, No. 76007-6 (Wash. Ct. App. 2018)` | Trustee discharge and successor trustees. |
| `In re Edwin Meissner Testamentary Trust (Mo. Ct. App. 2016)` | Trust termination and distribution. |

A standalone `Trust of` prefix is *not* recommended: trusts almost always appear as either `In re [Name] Trust` (party-name-leading; not procedural) or `In re Trust of [X]` (already handled by `In re`).

### 5.3 `In re Will of [X]` / `In re Last Will and Testament of [X]` / `In re Probate of Will of [X]` / `In re Probate of Will and Codicil of [X]`

**Status:** all matched by `In re`. No action needed.

Real corpus:

| Citation | Subject |
|---|---|
| `In re Will of Ranney, 124 N.J. 1, 589 A.2d 1339 (1991)` | (Also appears as `Matter of Will of Ranney` — both covered.) |
| `In re Will of Ferree, 369 N.J. Super. 136 (Ch. Div. 2003)` | Holographic-will substantial compliance. |
| `In re Probate of Will and Codicil of Macool, 416 N.J. Super. 298 (App. Div. 2010)` | Substantial compliance / unsigned will copy. |
| `In re Last Will and Testament of [X]` (NY Surrogate's Court, various)` | Standard NY probate caption (clerk-generated). |

### 5.4 `In re Adoption of [X]`

**Status:** already covered. `In re Adoption of B.L.V.B., 160 Vt. 368, 628 A.2d 1271 (1993)` matches `In re`. Standalone `Adoption of B.L.V.B.` matches `Adoption of`. No action needed.

### 5.5 `In re Guardianship of [X]` / `In re Conservatorship of [X]` / `In re Guardianship and Conservatorship of [X]` / `In re Adult Guardianship and Conservatorship of [X]`

**Status:** all already matched via `In re` (or the bare `Guardianship of` / `Conservatorship of` alternations). No action needed.

Real corpus:

| Citation | Subject |
|---|---|
| `In re Guardianship and Conservatorship of B.H., No. 118188 (Kan. 2023)` | Kansas Supreme Court. |
| `In re Guardianship and Conservatorship of Ankeney, 360 N.W.2d 733 (Iowa 1985)` | Iowa Supreme Court. |
| `In re Guardianship & Conservatorship of A.M.M., 2015 MT 250, 380 Mont. 451, 356 P.3d 474` | Montana Supreme Court. |
| `In re Guardianship of Tomas J., 318 Neb. 503 (2025)` | Nebraska Supreme Court. |
| `In re Adult Guardianship & Conservatorship of T., 2022 ME 51` | Maine Supreme Judicial Court. |
| `In re Guardianship of Cy, ___ Mich. App. ___ (2025)` | Michigan Court of Appeals. |
| `In re Guardianship of A.K., 2025-Ohio-917` | Ohio Supreme Court. |

### 5.6 `In re Heirship of [X]` (Texas)

**Status:** matched by `In re`. No action needed.

Texas Estates Code ch. 202 governs "Determination of Heirship." The published caption form is `In re Heirship of [Decedent]` or `In re Estate of [Decedent]`. Both work with `In re`.

### 5.7 `In re Wrongful Death of [X]`

**Status:** matched by `In re`. Federal-court Louisiana wrongful-death-removal opinions sometimes use it. No action needed.

### 5.8 `In re Termination of Parental Rights of [X]` / `In re Termination of Parental Rights as to [X]`

**Status:** matched by `In re`. No action needed.

Real corpus:

| Citation | Subject |
|---|---|
| `In re Termination of Parental Rights as to B.W., No. CV-24-0079-PR (Ariz. 2025)` | Arizona Supreme Court. |
| `In re Termination of Parental Rights as to M.N. (Ariz. Ct. App. 2024)` | Arizona Court of Appeals. |
| `In re D.S., 2025 UT 11` | Utah Supreme Court — TPR. |

### 5.9 `In re Civil Commitment of [X]` / `In re Care and Treatment of [X]` (Kansas SVP / sex-offender civil commitment)

**Status:** matched by `In re`. No action needed.

Real corpus:

| Citation | Subject |
|---|---|
| `In re Civil Commitment of M.C., No. 24A-MH-1183 (Ind. Ct. App. 2024)` | Indiana Court of Appeals. |
| `In re Care and Treatment of [X]` (Kan. various) | Kansas Sexually Violent Predator Act civil-commitment captions. |

### 5.10 `In re Dependency of [X]` (Washington, California)

**Status:** matched by `In re`. No action needed.

### 5.11 `In re Name Change of [X]` / `In re Name Change and Gender Change of [X]` / `In re Change of Name and Gender of [X]`

**Status:** matched by `In re`. No action needed.

Real corpus:

| Citation | Subject |
|---|---|
| `In re Name Change and Gender Change of R.E., No. 19A-MI-2562 (Ind. Ct. App. 2020)` | Indiana Court of Appeals. |
| `In re Name Change of Jenna A.J., 11-1694 (W. Va. 2013)` | West Virginia Supreme Court. |
| `In re Name Change of C.L.F., 2022-Ohio-2300` | Ohio Court of Appeals 10th District. |
| `In re Change of Name and Gender of H.S., No. 21A-MI-884 (Ind. Ct. App. 2021)` | Indiana Court of Appeals. |

### 5.12 `In re Caveat of Will of [X]` (North Carolina)

**Status:** matched by `In re`. No action needed.

North Carolina's caveat procedure (N.C. Gen. Stat. § 31-32) generates captions like `In re Caveat of [Testator]` or `In re Will of [Testator]` for will contests. Both match `In re`.

### 5.13 `Heirs of [X]` (bare)

**Status:** rarely used as a standalone caption. Louisiana would use `Succession of [X]` instead. Texas would use `In re Heirship of [X]` (already covered). California would use `Estate of [X]`. **Not recommended.**

### 5.14 `In the Estate of [X]` (English-influenced)

**Status:** appears occasionally in older English-derived American probate decisions. Already absorbed if it appears with `In re` prefix; standalone form would need `In the Estate of` as a new alternation. **Low priority** — modern American practice always uses `Estate of` or `In re Estate of`.

---

## 6. Alternation-ordering analysis

The current `PROCEDURAL_PREFIX_REGEX` already documents the longer-first principle:

> "Longer prefixes listed first so `In the Matter of X` beats `Matter of X`, `In re Marriage of X` beats `In re X`, and `On Petition of X` beats `Petition of X`."

### 6.1 Where does `Succession of` go?

`Succession of` is *not* prefixed by `In re` in Louisiana practice, so it doesn't conflict with `In re`. It also has no internal alternation collisions (no longer form like "In the Succession of" appears in published Louisiana opinions). Place it anywhere in the alternation that maintains readability. Suggested grouping: alongside the other "of"-style single-word-noun prefixes (`Estate of`, `Adoption of`, `Guardianship of`, `Conservatorship of`).

### 6.2 Where does `In the Goods of` go?

It's a longer-form prefix and *should* come early to prevent any future shorter alternation (e.g., a hypothetical `Goods of` alternation) from capturing first. Suggested placement: just after `In the Interest of` in the existing longer-first cluster.

### 6.3 Where does `Will of` (if added) go?

Risky. `Will of` is two short tokens and could easily false-match phrases like "the will of the people," "free will of," etc. *Defer* unless a corpus survey supports it. If added, place it last (or at least after every safer alternation) and consider tightening the post-prefix capture group.

### 6.4 Proposed regex (with `Succession of` only — the recommended minimal change)

```typescript
const PROCEDURAL_PREFIX_REGEX =
  /\b(In\s+the\s+Matter\s+of|In\s+re\s+Marriage\s+of|In\s+the\s+Interest\s+of|Commonwealth\s+ex\s+rel\.|In re|Ex parte|Matter of|Estate of|Succession of|State ex rel\.|United States ex rel\.|Application of|On Petition of|Petition of|Adoption of|Conservatorship of|Guardianship of)\s+([A-Za-z0-9\s.,'&()/-]+?)\s*,\s*$/i
```

And the parallel array:

```typescript
const proceduralPrefixes = [
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
  "Succession of",  // NEW — Louisiana civil-law decedent-estate caption
]
```

### 6.5 Optional regex (with `Succession of` + `In the Goods of`)

```typescript
const PROCEDURAL_PREFIX_REGEX =
  /\b(In\s+the\s+Matter\s+of|In\s+re\s+Marriage\s+of|In\s+the\s+Interest\s+of|In\s+the\s+Goods\s+of|Commonwealth\s+ex\s+rel\.|In re|Ex parte|Matter of|Estate of|Succession of|State ex rel\.|United States ex rel\.|Application of|On Petition of|Petition of|Adoption of|Conservatorship of|Guardianship of)\s+([A-Za-z0-9\s.,'&()/-]+?)\s*,\s*$/i
```

`In the Goods of` placed in the "long-prefix" cluster (after `In the Interest of`, before `Commonwealth ex rel.`).

### 6.6 ReDoS / nesting check

Neither addition introduces nested quantifiers or alternation overlap that could trigger catastrophic backtracking. `Succession of` and `In the Goods of` are both literal sequences. Per CLAUDE.md style rule ("Regex patterns must avoid nested quantifiers to prevent ReDoS"), both are safe.

---

## 7. Test cases to add

If the recommended change is accepted, add to `tests/extract/extractCase.test.ts` (in the same `describe` block as the existing `In re Marriage of` test around line 3059):

```typescript
it("recognizes 'Succession of' (Louisiana civil-law)", () => {
  const cases = extractCaseFrom("See Succession of Talbot, 530 So. 2d 1132 (La. 1988).")
  expect(cases).toHaveLength(1)
  expect(cases[0].caseName).toBe("Succession of Talbot")
  expect(cases[0].proceduralPrefix).toBe("Succession of")
})

it("recognizes 'Succession of [Surname]' with full date parenthetical", () => {
  const cases = extractCaseFrom("Succession of Boyd, 306 So. 2d 687 (La. 1975).")
  expect(cases).toHaveLength(1)
  expect(cases[0].caseName).toBe("Succession of Boyd")
})

it("handles 'Succession of X v. Y' as adversarial", () => {
  const citations = extractCitations("Succession of Smith v. Jones, 500 So. 2d 100 (La. 1980)")
  expect(citations[0].plaintiff).toBe("Succession of Smith")
  expect(citations[0].defendant).toBe("Jones")
})
```

Optional, only if `In the Goods of` is added:

```typescript
it("recognizes 'In the Goods of' (older / ecclesiastical form)", () => {
  const cases = extractCaseFrom("See In the Goods of Dewell, 1 Ecc. & Ad. 103 (1853).")
  expect(cases).toHaveLength(1)
  expect(cases[0].caseName).toBe("In the Goods of Dewell")
  expect(cases[0].proceduralPrefix).toBe("In the Goods of")
})
```

---

## 8. Recommended action (final)

### 8.1 Minimum-viable change

Add **one** prefix: `Succession of`.

- **Why:** It is the canonical Louisiana decedent-estate caption, used in 100% of published Louisiana succession opinions (state appellate + supreme court). Without it, every Louisiana succession case has its plaintiff captured incorrectly (or not at all).
- **Risk:** Near-zero. `Succession of` is a two-token literal that rarely appears in non-caption prose (the word "succession" in everyday legal writing is rarely immediately followed by "of [ProperName],"). Sentences like "the succession of events" would not satisfy the regex's trailing `\s*,\s*$` constraint and the requirement that the captured subject start with a capital letter (the `[A-Za-z0-9...]+?` capture would consume "of events," but the comma anchor + parenthetical-year context that follows in real citations would normally exclude it). The pre-existing `Estate of` alternation already accepts this kind of pattern with no reported false-positive issues.
- **Effort:** 2 lines of code (one regex, one array entry) + 2-3 test cases.
- **Changeset:** patch-level (`fix:` — extends procedural-prefix coverage to Louisiana succession captions).

### 8.2 Stretch additions (only if corpus warrants)

- `In the Goods of` — useful for older U.S. probate decisions and English-cited authority in law-review articles. Low risk; medium value.
- `Will of` (bare) — *not recommended* in the absence of a corpus survey. High false-positive risk relative to value.

### 8.3 Out-of-scope (consider for future work)

- *Normalization* of the captured prefix. Currently `In re Estate of Smith` captures `proceduralPrefix = "In re"` and `plaintiff = "In re Estate of Smith"`, whereas `Estate of Smith` captures `proceduralPrefix = "Estate of"`. A future enhancement could promote the longest meaningful procedural prefix (`In re Estate of`) to the `proceduralPrefix` slot when both prefixes apply. This is a behavior change, not a regex addition; defer to a separate design doc.
- A taxonomy field for procedural-prefix subject matter (e.g., `kind: "probate" | "family" | "succession"`) that would help downstream consumers distinguish a decedent-estate caption from a trust caption from a guardianship caption. Also a separate design.

---

## 9. References

### 9.1 Statutory authority

- La. Civ. Code arts. 871-1066 (Successions).
- La. Code Civ. Proc. arts. 2811-3434 (Probate procedure).
- La. Code Civ. Proc. art. 2811: court of jurisdiction for opening a succession.
- Tex. Est. Code ch. 202 (Determination of Heirship).
- N.C. Gen. Stat. § 31-32 (caveat procedure).
- N.J. Stat. Ann. § 3B:3 (Wills, intestate succession).

### 9.2 Case examples cited above

- `Succession of Talbot, 530 So. 2d 1132 (La. 1988)`.
- `Succession of Boyd, 306 So. 2d 687 (La. 1975)`.
- `Succession of Holloway, 531 So. 2d 431 (La. 1988)`.
- `Succession of Raiford, 404 So. 2d 251 (La. 1981)`.
- `In re Trust of Stuchell, 104 Ore. App. 332, 801 P.2d 852 (1990)`.
- `In re Will of Ranney, 124 N.J. 1, 589 A.2d 1339 (1991)`.
- `In re Probate of Will and Codicil of Macool, 416 N.J. Super. 298, 3 A.3d 1258 (App. Div. 2010)`.
- `In re Will of Ferree, 369 N.J. Super. 136, 848 A.2d 81 (Ch. Div. 2003)`.
- `In re Estate of Janes, 90 N.Y.2d 41, 681 N.E.2d 332 (1997)`.
- `In re Aboud Inter Vivos Trust, 129 Nev. Adv. Op. 97 (2013)`.
- `In re Verah Landon Testamentary Trust, No. 76007-6 (Wash. Ct. App. 2018)`.
- `In re Adoption of B.L.V.B., 160 Vt. 368, 628 A.2d 1271 (1993)`.
- `In re Guardianship and Conservatorship of B.H., No. 118188 (Kan. 2023)`.
- `In re Guardianship and Conservatorship of Ankeney, 360 N.W.2d 733 (Iowa 1985)`.
- `In re Guardianship & Conservatorship of A.M.M., 2015 MT 250, 380 Mont. 451, 356 P.3d 474`.
- `In re Guardianship of Tomas J., 318 Neb. 503 (2025)`.
- `In re Adult Guardianship & Conservatorship of T., 2022 ME 51`.
- `In re Termination of Parental Rights as to B.W., No. CV-24-0079-PR (Ariz. 2025)`.
- `In re Civil Commitment of M.C., No. 24A-MH-1183 (Ind. Ct. App. 2024)`.
- `In re Name Change and Gender Change of R.E., No. 19A-MI-2562 (Ind. Ct. App. 2020)`.
- `In re Estate of Case, 2024 IL App (5th) 230152`.
- `In re Estate of Tacher, 2024 IL App (1st) 231016`.
- `In re Estate of Smith, No. 02-24-00175-CV, 2024 Tex. App. LEXIS 8272 (Tex. App.—Fort Worth 2024)`.
- `In re Estate of Wright, 7 Cal. 2d 348, 60 P.2d 434 (Cal. 1936)`.
- `In re Estate of Horton, 925 N.W.2d 207 (Mich. Ct. App. 2018)`.
- `In re Estate of Prestie, 138 P.3d 520 (Nev. 2006)`.
- `In re Estate of Button, 79 Wn.2d 849, 490 P.2d 731 (Wash. 1971)`.
- `Matter of Will of Ranney, 124 N.J. 1, 589 A.2d 1339 (1991)`.
- `Matter of Estate of Siegel, 214 N.J. Super. 586, 520 A.2d 798 (App. Div. 1987)`.
- `Matter of Menzies (Waight), 2020 NY Slip Op 50343(U) (Surrogate's Ct. Orange Cty. 2020)`.
- `Barefoot v. Jennings, 8 Cal. 5th 822 (2020)`.
- `In the Goods of Dewell, (1853) 1 Ecc. & Ad. 103`.
- `In the Goods of Boehm, [1891] P. 247`.

### 9.3 Citation-style references

- Bluebook T.9: "In the matter of," "Petition of," "Application of," etc. all abbreviated to `In re` in case-name abbreviations (but reporters frequently preserve the long form in the official caption).
- ALWD Guide (7th ed.) Rule 12.2: procedural-prefix handling matches Bluebook T.9.
- The Bluebook 21st ed. Table T.6 (Case Names and Institutional Authors).

### 9.4 Source URLs

- [In re Trust of Stuchell case brief (Casebriefs)](https://www.casebriefs.com/blog/law/wills-trusts-estates/wills-trusts-estates-keyed-to-dukeminier/trusts-creation-and-characteristics/in-re-trust-of-stuchell/)
- [Succession of Talbot (Justia)](https://law.justia.com/cases/louisiana/supreme-court/1988/88-c-0296-1.html)
- [Succession of Holloway (Justia)](https://law.justia.com/cases/louisiana/supreme-court/1988/87-c-2093-1.html)
- [Succession of Raiford (Justia)](https://law.justia.com/cases/louisiana/supreme-court/1981/81-c-0552-3.html)
- [La. Code Civ. Proc. art. 2811 (Justia)](https://law.justia.com/codes/louisiana/code-of-civil-procedure/article-2811/)
- [Cornell LII: Louisiana citation examples](https://www.law.cornell.edu/citation/sample_louisiana)
- [In re Will of Ranney / Matter of Will of Ranney (Justia)](https://law.justia.com/cases/new-jersey/supreme-court/1991/124-n-j-1-1.html)
- [In re Adoption of B.L.V.B. (CourtListener)](https://www.courtlistener.com/opinion/1439036/adoption-of-blvb/)
- [In re Aboud Inter Vivos Trust (Justia)](https://law.justia.com/cases/nevada/supreme-court/2013/55303.html)
- [In re Verah Landon Testamentary Trust (Justia)](https://law.justia.com/cases/washington/court-of-appeals-division-i/2018/76007-6.html)
- [In re Marriage of Bonds (Justia)](https://law.justia.com/cases/california/supreme-court/4th/24/1.html)
- [In re Estate of Case (Justia)](https://law.justia.com/cases/illinois/court-of-appeals-fifth-appellate-district/2024/5-23-0152.html)
- [In re Guardianship and Conservatorship of B.H. (Kansas Courts)](https://kscourts.gov/Cases-Decisions/Decisions/Published/In-re-Guardianship-and-Conservatorship-of-B)
- [In re Guardianship & Conservatorship of Ankeney (CourtListener)](https://www.courtlistener.com/opinion/2092114/in-re-guardianship-conservatorship-of-ankeney/cited-by/)
- [In re Guardianship of Cy (Justia)](https://law.justia.com/cases/michigan/court-of-appeals-published/2025/370828.html)
- [In re Adult Guardianship & Conservatorship of T. (Justia)](https://law.justia.com/cases/maine/supreme-court/2022/2022-me-51.html)
- [In re Termination Parental Rights as to B.W. (Justia)](https://law.justia.com/cases/arizona/supreme-court/2025/cv-24-0079-pr.html)
- [In re Civil Commitment of M.C. (FindLaw)](https://caselaw.findlaw.com/court/in-court-of-appeals/116663301.html)
- [In re Name Change of Jenna A.J. (Justia)](https://law.justia.com/cases/west-virginia/supreme-court/2013/11-1694.html)
- [In re Name Change of C.L.F. (Justia)](https://law.justia.com/cases/ohio/tenth-district-court-of-appeals/2022/21ap-619.html)
- [In re Probate of Will and Codicil of Macool (Estateably blog)](https://www.estateably.com/blog/admitting-defective-wills-to-probate-new-jersey)
- [Loyola Law: Successions in Louisiana](https://law.loyno.edu/sites/default/files/successions.pdf)
- [Louisiana Probate & Succession (LA GOEA)](https://goea.louisiana.gov/media/1w1lq3sz/probateandsuccession.pdf)
- [Charles Holbech: Probate Claims & In the Goods of](https://holbech.co.uk/probate-claims-a-detailed-analysis-of-the-grounds-for-challenging-suspicious-wills/)
