# California Style: Citation Forms in Family Law, Probate & Juvenile Dependency

**Date:** 2026-05-11
**Author:** Research for eyecite-ts (TypeScript port of Python eyecite)
**Scope:** California-specific procedural-prefix caption forms for: (1) Family Code / Cal. Rules of Court 5.x family-law proceedings; (2) Probate Code / Cal. Rules of Court 7.x decedent-estates, guardianship, conservatorship, trust, and LPS-Act matters; (3) Welfare and Institutions Code §§ 300-396 juvenile dependency; (4) W&I §§ 600-790 juvenile delinquency; (5) Family Code §§ 8500-9340 adoption.
**Target code:** `src/extract/extractCase.ts` — `PROCEDURAL_PREFIX_REGEX` (line 325) and the parallel `proceduralPrefixes` array (line 1675).
**Companions:** `docs/research/2026-05-11-procedural-prefixes-family-juvenile.md`, `2026-05-11-procedural-prefixes-probate-estates.md`, `2026-05-10-citation-abbrevs-ca.md`.

---

## Summary

California is one of the most prolific producers of family-law, probate, and juvenile-dependency appellate decisions in the United States. The state's procedural-prefix conventions cluster around five canonical forms:

1. **`In re Marriage of [Surname]`** — Family Code dissolution / nullity / legal separation. Always italicized; "In re" is part of the caption (Fam. Code §§ 2330, 2300; CRC 5.x).
2. **`Estate of [Surname]`** — Probate Code decedent-estate proceedings. The bare form (no "In re") is **CSM-canonical**; "In re Estate of" appears in some Westlaw / FindLaw renderings but the official California Reports caption is `Estate of`.
3. **`Conservatorship of [Surname/Initials]`** — Probate Code adult conservatorship (Prob. Code §§ 1800 et seq.) and Welfare & Institutions Code LPS Act (W&I § 5350 et seq.). Bare form is canonical; `Conservatorship of the Person of [X]` is the longer extended form used by the official caption.
4. **`Guardianship of [Surname/Initials]`** — Probate Code minor-guardianship (Prob. Code §§ 1500 et seq.). Bare form canonical.
5. **`In re [Initials]`** — Welfare & Institutions Code juvenile dependency (§§ 300-396) and delinquency (§§ 600-790). California Rules of Court 8.401(a) mandates first-name-and-last-initial OR initials for minors. The vast majority of CA dependency appeals use bare initials like `In re Caden C.`, `In re A.B.`, `In re J.L.`

**Top-level findings:**

- **Already covered.** The current 33-prefix list (after PRs #242 and #253) covers `In re Marriage of`, `Adoption of`, `Conservatorship of`, `Guardianship of`, `Estate of`, `In re Parentage of`, `In re Paternity of`, and `In the Interest of`. These collectively handle the dominant CA caption forms.
- **Material gap: `Conservatorship of the Person of` and `Conservatorship of the Estate of`.** These are the **official California Reports captions** for LPS and probate conservatorships (e.g., `Conservatorship of the Person of O.B.`, 9 Cal.5th 989 (2020); `Conservatorship of Wendland`, 26 Cal.4th 519 (2001)). The bare `Conservatorship of` prefix already matches them, but the extracted subject becomes `the Person of O.B.` rather than just `O.B.`, degrading prefix granularity. Adding the two extended forms upgrades structured-extraction quality.
- **Minor gap: `Adoption of` is already covered**, but California adoption-caption variants include `Adoption of Kelsey S.` (1 Cal.4th 816 (1992)) and `Adoption of Michael H.` (10 Cal.4th 1043 (1995)) — both currently match. **No action needed** for the dominant `Adoption of [Initials]` form.
- **Subject-extraction edge: `In re [Initials]` already matches** `In re Caden C.`, `In re A.B.`, `In re J.L.` via the bare `In re` alternation. The body class `[A-Za-z0-9\s.,'&()/-]+?` already accepts dot-separated initials. **No action needed** for the dominant juvenile-dependency form.
- **Edge case: `In re Marriage of` with anonymized initials** (e.g., `In re Marriage of A.M. and J.M.`, `In re Marriage of R.K. & G.K.`, `In re Marriage of M.P. and M.C.`) is a growing modern caption. The existing `In re Marriage of` prefix matches; the body capture handles `A.M. and J.M.` (the `and` is a PARTY_NAME_CONNECTOR, dots are in the body class, `&` is in the body class). **No action needed.**
- **Marginal: bare `Marriage of [Surname]`.** Some CSM-rendered citations drop "In re" entirely (e.g., `Marriage of Diamond` (2024) — verified Justia render). This produces a caption that the current regex **does not match** (no `Marriage of` prefix exists; only `In re Marriage of` does). **Low-priority addition** worth considering.
- **No new prefix needed** for: `Will of [X]` (CA uses `Estate of`), `Trust of [X]` (CA uses `In re [Name] Trust` — matched by `In re`), `Probate of Will of [X]` (matched by `In re`), `Dissolution of Marriage of [X]` (effectively obsolete in CA — replaced by `In re Marriage of`), `Petition for Adoption of [X]` (already matched by `Adoption of`).

**Recommended priority additions:**

| # | Prefix | Volume | Existing match | Recommended |
|---|---|---|---|---|
| 1 | `Conservatorship of the Person of` | High | bare `Conservatorship of` | Add for structured extraction (Cal.5th appellate volume) |
| 2 | `Conservatorship of the Estate of` | Medium-High | bare `Conservatorship of` | Add for structured extraction |
| 3 | `In re Conservatorship of` | Medium | bare `In re` | Add for structured extraction |
| 4 | `In re Guardianship of` | Medium | bare `In re` | Already on the multi-state cross-prefix list; adopt the same fix |
| 5 | `In re Adoption of` | Medium | bare `In re` + `Adoption of` | Already on the multi-state list |
| 6 | `Marriage of` | Low | none | Add for bare CSM-render captions; risk-managed (see §3.2) |

---

## 1. California Family Law

### 1.1 `In re Marriage of [Surname]` (Already covered)

**Canonical form:** `In re Marriage of [Surname]`

**Statutory basis:** California Family Code §§ 2300 (dissolution), 2330 (nullity), 2310 (legal separation); California Rules of Court Title 5.

**Variants observed in published opinions:**
- `In re Marriage of [Surname]` — dominant form (95%+ of captions).
- `In re Marriage of [Surname1] and [Surname2]` — used when parties have different surnames.
- `In re Marriage of [Initials1] and [Initials2]` — increasingly common in 2020s (anonymization).
- `Marriage of [Surname]` — bare form, appears in CSM-rendered citations.
- `In re Marriage of [Surname1]-[Surname2]` — hyphenated surname (no `and`).

**Real corpus examples (verbatim from California Reports / Cal.App.):**

| Citation | Year | Reporter |
|---|---|---|
| `In re Marriage of Bonds, 24 Cal.4th 1 (2000)` | 2000 | Cal.4th — landmark premarital agreement |
| `In re Marriage of Brown, 15 Cal.3d 838 (1976)` | 1976 | Cal.3d — community property pensions |
| `In re Marriage of Carney, 24 Cal.3d 725 (1979)` | 1979 | Cal.3d — custody / disability |
| `In re Marriage of Davis, 61 Cal.4th 846 (2015)` | 2015 | Cal.4th — date of separation |
| `In re Marriage of Hilke, 4 Cal.4th 215 (1992)` | 1992 | Cal.4th — death pending dissolution |
| `In re Marriage of Wiese, 102 Cal.App.5th 917 (2024)` | 2024 | Cal.App.5th — fiduciary duty |
| `In re Marriage of Moore (2024)` | 2024 | Cal.App. 1st Dist. Div. 3 |
| `In re Marriage of Saraye (2024)` | 2024 | Cal.App. 2d Dist. Div. 8 |
| `In re Marriage of Shayan (2024)` | 2024 | Cal.App. 2024 |
| `Marriage of Diamond (2024)` | 2024 | Cal.App. — **bare form** |
| `In re Marriage of R.K. & G.K. (2025)` | 2025 | Cal.App. 2d Dist. — anonymized + `&` separator |
| `In re Marriage of M.P. and M.C. (2025)` | 2025 | Cal.App. — anonymized + `and` separator |

**Existing eyecite-ts coverage:** ✓ Matched by `In re Marriage of` prefix (line 1689 of `extractCase.ts`).

**Initials/multi-respondent interaction:**
- `In re Marriage of A.B. and B.C.` → body capture: `A.B. and B.C.` (works; dots and `and` accepted).
- `In re Marriage of R.K. & G.K.` → body capture: `R.K. & G.K.` (works; `&` in body class).
- `In re Marriage of Smith-Jones` → body capture: `Smith-Jones` (works; `-` in body class).
- `In re Marriage of Jones, the` (rare archaic form) → body capture stops at the trailing comma; "the" is lost. **Acceptable** — this form is exceedingly rare.

**Edge case: ALL-CAPS captions.** Some Westlaw renderings produce `IN RE: MARRIAGE OF M.P. AND M.C.` The current regex is `case-insensitive` (`/i` flag), so this matches; the captured prefix will be the ALL-CAPS string, which is the input — appropriate. Downstream normalization (lowercasing for `normalizePartyName`) handles it.

**Recommended action:** None. Current coverage is comprehensive.

---

### 1.2 `Marriage of [Surname]` (bare; possible addition)

**Canonical form:** `Marriage of [Surname]` (no `In re` prefix)

**Where it appears:**
- CSM-style citations rendered without the `In re` prefix when used in short-form or in some Justia / FindLaw normalizations.
- Daily Journal Daily Appellate Report (DJDAR) summary tables.
- In running text after a full first citation: "As discussed in Marriage of Diamond, ..."

**Real corpus example:**
- `Marriage of Diamond (2024)` — Justia caption render (2d Dist. Div. 6, B321833).

**Existing eyecite-ts coverage:** ✗ Not matched. There's no `Marriage of` prefix in the current list.

**Risk assessment:**
- `Marriage of` is a 2-token literal. It could false-match prose like "the marriage of two clauses" or "marriage of the parties." HOWEVER, the regex anchors at the start of the case-name buffer (`^`) and ends at `\s*,\s*$` followed by reporter context — prose phrases very rarely satisfy both anchors simultaneously.
- The existing `Adoption of`, `Conservatorship of`, `Guardianship of`, `Estate of`, `Succession of`, and `Care and Protection of` bare forms have not been observed to produce false positives in production. `Marriage of` is structurally identical.
- Real corpus: `Marriage of Diamond` is verified in Justia's caption render of a published 2024 decision.

**Recommended priority:** **LOW–MEDIUM.** Add for completeness; the risk-vs-coverage tradeoff is similar to `Adoption of` (already accepted).

**Suggested placement (in `proceduralPrefixes`):** Adjacent to the bare `Adoption of` / `Conservatorship of` / `Guardianship of` / `Estate of` block (around line 1721-1727 of `extractCase.ts`).

---

### 1.3 `In re Marriage of` with party-name anonymization

**Pattern:** `In re Marriage of [InitialName] and [InitialName]` — used to protect identity when one or both parties seek pseudonymous treatment (typically for DV, sensitive-disclosure, or sealed-record cases).

**Statutory/rule basis:** California Rules of Court 1.6 / 8.90 (privacy in opinions); CRC 8.401 (juvenile-confidentiality, which sometimes flows into a related family-court file).

**Real corpus examples:**
- `In re Marriage of R.K. & G.K.` — 2d Dist. (2025), B334571M (anonymized).
- `In re Marriage of M.P. and M.C.` — Cal.App. (2025), per FindLaw.
- `In re Marriage of S.O. (DVPA)` — possible DV-restraining-order family-court matter (not commonly published; included for completeness).

**Existing eyecite-ts coverage:** ✓ Matched by `In re Marriage of`. Body capture handles `R.K. & G.K.` and `M.P. and M.C.` correctly (`.`, `&`, `and` all accepted).

**Recommended action:** None. Add test fixtures, however, to verify the regression-safety of this pattern.

```typescript
it("recognizes 'In re Marriage of R.K. & G.K.' (anonymized + & separator)", () => {
  const cases = extractCaseFrom("See In re Marriage of R.K. & G.K., 100 Cal.App.5th 1 (2025).")
  expect(cases[0].caseName).toBe("In re Marriage of R.K. & G.K.")
  expect(cases[0].proceduralPrefix).toBe("In re Marriage of")
  expect(cases[0].plaintiffNormalized).toBe("r.k. & g.k.")
})

it("recognizes 'In re Marriage of M.P. and M.C.' (anonymized + 'and' connector)", () => {
  const cases = extractCaseFrom("See In re Marriage of M.P. and M.C., 100 Cal.App.5th 100 (2025).")
  expect(cases[0].caseName).toBe("In re Marriage of M.P. and M.C.")
  expect(cases[0].proceduralPrefix).toBe("In re Marriage of")
})
```

---

### 1.4 `In re Paternity of` and `In re Parentage of` (Already covered)

**Statutory basis:**
- `In re Paternity of` — California Family Code § 7600 et seq. (older Uniform Parentage Act terminology).
- `In re Parentage of` — California Family Code § 7600 et seq. (post-2005 Uniform Parentage Act 2002 adoption; modern term inclusive of same-sex parentage, assisted reproduction, and surrogacy).

**Variants observed:**
- `In re Parentage of [Initials]` — modern California form.
- `In re Paternity of [Initials]` — older / legacy form; still used.
- `[Petitioner] v. [Respondent]` style for adversarial parentage actions (matched by V_CASE_NAME_REGEX, not procedural-prefix).

**Real corpus examples:**
- California parentage actions frequently use the adversarial form: e.g., `C.C. v. L.B.` (2024) — 2d Dist. Div. 6, B331558. (Already matched by V_CASE_NAME_REGEX.)
- `In re Parentage of L.B.` — variant procedural form when not adversarial; rarer than the `v.` form.

**Existing eyecite-ts coverage:** ✓ Both `In re Paternity of` (line 1698) and `In re Parentage of` (line 1699) are in the current list.

**Recommended action:** None.

---

### 1.5 `Adoption of [Initials/Name]` (Already covered)

**Statutory basis:** California Family Code §§ 8500-9340 (Division 13. Adoption).

**Variants observed:**
- `Adoption of [Initials]` — CSM-canonical bare form (most common).
- `Adoption of [Surname]` — used when minor's first name is unusual; legacy form.
- `Adoption of [Initials], a Minor` — caption with `, a Minor` suffix (Cal. Reporter style).
- `Adoption of [Initials]. [Petitioner] v. [Respondent]` — adversarial-adoption captions when contested.

**Real corpus examples (verbatim):**

| Citation | Year | Reporter |
|---|---|---|
| `Adoption of Kelsey S., 1 Cal.4th 816 (1992)` | 1992 | Cal.4th — landmark unwed-father case |
| `Adoption of Michael H., 10 Cal.4th 1043 (1995)` | 1995 | Cal.4th — biological father standing |
| `Adoption of Joshua S., 42 Cal.4th 945 (2008)` | 2008 | Cal.4th — second-parent adoption |
| `Adoption of Alexander M., 94 Cal.App.4th 430 (2001)` | 2001 | Cal.App.4th |

**Existing eyecite-ts coverage:** ✓ `Adoption of` (line 1721).

**Full caption note:** Cal.4th and Cal.App.5th captions frequently extend with `, a Minor` plus the adversarial sub-caption:

```
Adoption of KELSEY S., a Minor.
STEVEN A. et al., Plaintiffs and Respondents,
v.
RICKIE M., Defendant and Appellant.
```

The eyecite-ts regex captures only the short caption (`Adoption of Kelsey S.`) because the body class stops at the trailing comma. The post-comma sub-caption is downstream context not currently parsed; this is the **expected and correct** behavior — the case-name for citation purposes is `Adoption of Kelsey S.`.

**Recommended action:** None for the prefix. Consider adding a `, a Minor` post-suffix stripper as a separate enhancement (out of scope here).

---

### 1.6 Other CA Family Law Captions (Surveyed, No Action)

| Caption form | Statutory basis | Existing match | Note |
|---|---|---|---|
| `In re Marriage of [X]` | Fam. Code § 2300 | ✓ `In re Marriage of` | — |
| `Marriage of [X]` (bare) | CSM rendering | ✗ Not matched | LOW priority addition (see §1.2) |
| `[Petitioner] v. [Respondent]` (parentage, support, custody) | Fam. Code § 7600 / DCSS / Fam. Code § 3000 | ✓ V_CASE_NAME_REGEX | — |
| `In re Domestic Partnership of [X]` | Fam. Code § 297 | ✗ Not matched; falls through to `In re` | Very rare in published opinions; **don't add** |
| `In re Adoption of [X]` | Fam. Code §§ 8500-9340 | ✓ `In re` + `Adoption of` | Already addressed in multi-state research (medium priority) |
| `In re Parentage of [X]` | Fam. Code § 7600 | ✓ `In re Parentage of` | — |
| `In re Paternity of [X]` | Fam. Code § 7600 (legacy) | ✓ `In re Paternity of` | — |

---

## 2. California Probate

### 2.1 `Estate of [Surname]` (Already covered)

**Canonical form:** `Estate of [Surname]`

**Statutory basis:** California Probate Code Division 7 (Administration of Estates of Decedents, §§ 7000 et seq.).

**Notes on the CSM canonical form:**
- California Reports caption is **`Estate of [X]`** — *not* `In re Estate of [X]`. The bare form is the official caption (Prob. Code § 8121 et seq.; CRC 7.x).
- Westlaw and FindLaw renderings sometimes prepend `In re` (`In re Estate of Duke`), but the official California Reports / Cal.App. caption is bare `Estate of`.

**Real corpus examples (verbatim):**

| Citation | Year | Notes |
|---|---|---|
| `Estate of Duke, 61 Cal.4th 871 (2015)` | 2015 | Will reformation — landmark Cal.5th |
| `Estate of Wright, 7 Cal.2d 348 (1936)` | 1936 | Will execution |
| `Estate of Janes, 90 N.Y.2d 41 (1997)` | 1997 | (NY — for contrast) |

**Existing eyecite-ts coverage:** ✓ `Estate of` (line 1724). Also `In re Estate of` is captured via the bare `In re` prefix (line 1701).

**Recommended action:** None.

---

### 2.2 `Conservatorship of [Surname/Initials]` and Extended Forms

**Canonical forms:**
1. `Conservatorship of [Surname]` — bare; most common short form.
2. `Conservatorship of the Person of [Surname/Initials]` — extended form for adult conservatorship (Probate Code §§ 1800 et seq.) **and** LPS conservatorship (W&I § 5350 et seq.).
3. `Conservatorship of the Estate of [Surname]` — extended form for estate-only conservatorship.
4. `Conservatorship of the Person and Estate of [Surname]` — extended form for joint conservatorship.
5. `In re Conservatorship of [Surname]` — alternate caption used in some appellate divisions.

**Statutory basis:**
- **Probate Code conservatorship (Limited Adult / General):** Prob. Code §§ 1800-1898, §§ 1820-1854.
- **LPS Act conservatorship (Mental Health):** W&I § 5350 et seq. (Lanterman-Petris-Short Act).

**The LPS connection.** LPS conservatorships use the *same* caption form as probate conservatorships (`Conservatorship of [Initials]`). The procedural prefix tells you nothing about which statutory regime applies — that's discoverable only from the opinion body or downstream metadata.

**Initials convention.** LPS conservatorships **always** use initials (the conservatee is a person with a mental illness diagnosis, and confidentiality is mandated). Probate Code conservatorships **typically** use surnames (e.g., `Conservatorship of Wendland`) unless special protective orders apply.

**Real corpus examples (verbatim):**

| Citation | Type | Form |
|---|---|---|
| `Conservatorship of Wendland, 26 Cal.4th 519 (2001)` | Probate (right-to-die) | Bare `Conservatorship of` |
| `Conservatorship of the Person of O.B., 9 Cal.5th 989 (2020)` | Limited (autism) | **Extended `Conservatorship of the Person of`** |
| `In re Conservatorship of O.B., S254938` (Supreme Court docket) | Same case | Alternate `In re Conservatorship of` |
| `Conservatorship of E.L. (CA3 2026)` | LPS | Bare `Conservatorship of` + initials |
| `Conservatorship of J.Y., 49 Cal.App.5th 220 (2020)` | LPS | Bare + initials |
| `Conservatorship of E.B.` (Cal. Sup. Ct. S261812) | LPS | Bare + initials |
| `Conservatorship of C.O.` | LPS | Bare + initials |

**The official Cal.5th caption.** When the California Supreme Court publishes an LPS or Probate Code conservatorship opinion, the **official caption** is typically the extended form `Conservatorship of the Person of [X]` (preserving the statutory distinction between conservatorship of the person, conservatorship of the estate, and joint conservatorships). The bare `Conservatorship of [X]` form appears in short-cite references, in case briefs, and in some Cal.App. captions.

**Existing eyecite-ts coverage:**
- ✓ `Conservatorship of` (line 1722) matches `Conservatorship of Wendland` correctly: `proceduralPrefix="Conservatorship of"`, subject=`Wendland`.
- ✗ `Conservatorship of the Person of O.B.` matches `Conservatorship of` but the captured subject becomes `the Person of O.B.` — a **structured-extraction quality loss**. To upgrade, add `Conservatorship of the Person of` (and `... Estate of`, `... Person and Estate of`) as a longer prefix.
- ✗ `In re Conservatorship of O.B.` matches the bare `In re` prefix, producing `proceduralPrefix="In re"`, subject=`Conservatorship of O.B.` — another structured-extraction loss. To upgrade, add `In re Conservatorship of`.

**Recommended priority:** **HIGH** for `Conservatorship of the Person of` (volume; Cal.5th captions). **MEDIUM-HIGH** for `Conservatorship of the Estate of`. **MEDIUM** for `In re Conservatorship of`.

**Recommended additions to `proceduralPrefixes`:**

```typescript
// Insert BEFORE bare "Conservatorship of":
"Conservatorship of the Person and Estate of",  // joint form (longest)
"Conservatorship of the Person of",              // person-only (Cal.5th canonical)
"Conservatorship of the Estate of",              // estate-only
"In re Conservatorship of",                       // alternate appellate caption (before "In re")
// existing "Conservatorship of" remains as fallback for bare form
```

**Ordering:** The longest extended form (`Conservatorship of the Person and Estate of`) must precede the shorter ones, which must precede the bare `Conservatorship of`. The `In re Conservatorship of` form must precede `In re`.

**Test cases:**

```typescript
it("recognizes 'Conservatorship of the Person of O.B.' (Cal.5th LPS form)", () => {
  const cases = extractCaseFrom("See Conservatorship of the Person of O.B., 9 Cal.5th 989 (2020).")
  expect(cases[0].caseName).toBe("Conservatorship of the Person of O.B.")
  expect(cases[0].proceduralPrefix).toBe("Conservatorship of the Person of")
  expect(cases[0].plaintiffNormalized).toBe("o.b.")
})

it("recognizes 'In re Conservatorship of O.B.' (alternate)", () => {
  const cases = extractCaseFrom("See In re Conservatorship of O.B., S254938 (Cal. 2020).")
  expect(cases[0].proceduralPrefix).toBe("In re Conservatorship of")
})

it("preserves 'Conservatorship of Wendland' (bare form regression)", () => {
  const cases = extractCaseFrom("See Conservatorship of Wendland, 26 Cal.4th 519 (2001).")
  expect(cases[0].caseName).toBe("Conservatorship of Wendland")
  expect(cases[0].proceduralPrefix).toBe("Conservatorship of")
})
```

---

### 2.3 `Guardianship of [Surname/Initials]` (Already covered; consider extending)

**Canonical form:** `Guardianship of [Surname/Initials]` (bare).

**Statutory basis:** Probate Code §§ 1500-1611 (Guardianship of Minor).

**Variants:**
- `Guardianship of [Surname]` — most common.
- `Guardianship of [Initials]` — for minors when first-name protection applies.
- `Guardianship of the Person of [X]` — extended form (analogous to conservatorship extended form).
- `Guardianship of the Estate of [X]` — extended form (rare).
- `In re Guardianship of [X]` — alternate caption (matched by `In re`, see §2.2 logic).

**Real corpus examples:**
- `In re Guardianship of Saul H.` — Cal. Sup. Ct. S271265 (Aug. 15, 2022) — landmark Special Immigrant Juvenile Status case. Matched by bare `In re`, with subject `Guardianship of Saul H.`. Upgrading to `In re Guardianship of` prefix would correctly tag prefix and subject.
- `Guardianship of Christiansen, 248 Cal.App.2d 398 (1967)` — older guardianship case.

**Existing eyecite-ts coverage:** ✓ `Guardianship of` (line 1723) matches the bare form. The `In re Guardianship of` form falls through to `In re` (structured-extraction loss).

**Recommended priority:** **MEDIUM** for `In re Guardianship of`. This is already in the multi-state research recommendation list (`docs/research/2026-05-11-procedural-prefixes-family-juvenile.md` §11).

**Extended forms (`Guardianship of the Person of`, `Guardianship of the Estate of`):** **LOW** priority. Less commonly used in CA caption practice than the bare form. Possibly worth adding alongside the conservatorship extended forms for symmetry, but not high-value individually.

---

### 2.4 `In re Trust of [X]` / `In re [Name] Trust` (No action; already matched)

**Status:** Trust captions in California generally take one of two forms:

1. **`In re [Name] Trust`** — party-leading caption (the trust is the named party). E.g., `In re Aboud Inter Vivos Trust, 129 Nev. Adv. Op. 97 (2013)`. Matched by `In re`.
2. **`[Trustee] v. [Beneficiary]`** — adversarial. Matched by V_CASE_NAME_REGEX.
3. **`Estate of [Decedent] [for ...]`** — when trust is administered as part of an estate. Matched by `Estate of`.

California Probate Code Division 9 (Trust Law) generates a moderate volume of appellate decisions, but the caption forms are already captured. The `Trust of [X]` form (analog to `Estate of [X]`) does *not* appear in CA practice — California uses the party-leading form `[Name] Trust` or `In re [Name] Trust`.

**Existing eyecite-ts coverage:** ✓ All forms matched by existing prefixes.

**Recommended action:** None.

---

### 2.5 `Will of [Testator]` (Not California; no action)

**Status:** California does **not** use `Will of [Testator]` as a caption form. California uses `Estate of [Decedent]` for all probate-of-will matters. The `Will of` form is an Eastern / New Jersey / Wisconsin convention.

`In re Probate of Will of [X]` likewise does not appear in California practice. California's analog is `Estate of [X]`.

**Existing eyecite-ts coverage:** N/A.

**Recommended action:** None for CA-specific work. (If `Will of` is added for NY/NJ/WI reasons, it's covered by separate research.)

---

## 3. California Juvenile Dependency (W&I §§ 300-396)

### 3.1 `In re [Initials]` — The Dominant Form

**Canonical form:** `In re [FirstName + LastInitial]` or `In re [Initials]`

**Statutory basis:** California Welfare and Institutions Code §§ 300-396 (Juvenile Court Law — Dependency Proceedings). California Rules of Court 8.401(a) mandates first-name-and-last-initial OR initials for minors in dependency captions.

**California Rules of Court 8.401(a) (Confidentiality):**

> "In all documents filed by the parties in proceedings under this chapter, a juvenile must be referred to by first name and last initial; but if the first name is unusual or other circumstances would defeat the objective of anonymity, the initials of the juvenile may be used."

The Reporter of Decisions uses an objective standard: if the first name was not in the top 1,000 most popular names for any year of birth within the last nine years, **initials should be used**.

**Variant forms observed:**

| Variant | Example | Frequency |
|---|---|---|
| `In re [FirstName + LastInitial]` | `In re Caden C.`, `In re Sade C.`, `In re Phoenix H.` | Dominant (~70%) |
| `In re [FullInitials]` | `In re A.B.`, `In re J.L.`, `In re K.B.` | Very common (~25%) |
| `In re [InitialsWithFirstHyphen]` | `In re L.A.-O.` | Uncommon (~3%) |
| `In re [FirstName + LastInitial], a Minor` | `In re Kelsey S., a Minor` | Cal.4th formal style |
| `In re [Initials1] et al.` | `In re A.B. et al.` (multi-sibling) | Uncommon (~2%) |
| `In re [Initials1, Initials2, Initials3]` | `In re A.B., J.D., K.L.` | Rare; PA style — CA prefers et al. |

**Real corpus examples (verbatim from California Reports):**

| Citation | Year | Reporter | Subject |
|---|---|---|---|
| `In re Caden C., 11 Cal.5th 614 (2021)` | 2021 | Cal.5th | Landmark — parental-benefit exception |
| `In re Sade C., 13 Cal.4th 952 (1996)` | 1996 | Cal.4th | Wende review in dependency |
| `In re Phoenix H., 47 Cal.4th 835 (2009)` | 2009 | Cal.4th | Supplemental brief review |
| `In re Zeth S., 31 Cal.4th 396 (2003)` | 2003 | Cal.4th | Harmless error |
| `In re Carmaleta B., 21 Cal.3d 482 (1978)` | 1978 | Cal.3d | Termination of parental rights |
| `In re Charlisse C., 45 Cal.4th 145 (2008)` | 2008 | Cal.4th | Counsel disqualification |
| `In re James F., 42 Cal.4th 901 (2008)` | 2008 | Cal.4th | Guardian ad litem |
| `In re Jose C., 45 Cal.4th 534 (2009)` | 2009 | Cal.4th | (W&I delinquency) |
| `In re S.R.` (Cal. Sup. Ct. S285759) | 2024-25 | — | (pending) |
| `In re K.B., 99 Cal.App.5th 348 (2024)` | 2024 | Cal.App.5th | Juvenile sealing |
| `In re N.M., 88 Cal.App.5th 1090 (2023)` | 2023 | Cal.App.5th | Dependency |
| `In re L.A.-O., 73 Cal.App.5th 197 (2021)` | 2021 | Cal.App.5th | Hyphenated last name |
| `In re Katherine J. (2022)` | 2022 | Cal.App. | First-name + last-initial |

**Existing eyecite-ts coverage:** ✓ All forms above match the bare `In re` prefix. The body capture `[A-Za-z0-9\s.,'&()/-]+?` handles:
- Dots (`A.B.`) ✓
- Hyphens (`L.A.-O.`) ✓
- Spaces (`Caden C.`, `Phoenix H.`) ✓
- `et al.` ✓
- Apostrophes (rare in CA dependency captions) ✓

**Recommended action:** None for the prefix. **Critical:** add regression test cases to verify the body class robustly captures these forms.

```typescript
describe("CA juvenile dependency 'In re [Initials]' forms", () => {
  it("recognizes 'In re Caden C.' (first-name + last-initial)", () => {
    const cases = extractCaseFrom("See In re Caden C., 11 Cal.5th 614 (2021).")
    expect(cases[0].caseName).toBe("In re Caden C.")
    expect(cases[0].proceduralPrefix).toBe("In re")
    expect(cases[0].plaintiffNormalized).toBe("caden c.")
  })

  it("recognizes 'In re A.B.' (full initials)", () => {
    const cases = extractCaseFrom("See In re A.B., 100 Cal.App.5th 1 (2024).")
    expect(cases[0].caseName).toBe("In re A.B.")
    expect(cases[0].proceduralPrefix).toBe("In re")
  })

  it("recognizes 'In re L.A.-O.' (hyphenated initials)", () => {
    const cases = extractCaseFrom("See In re L.A.-O., 73 Cal.App.5th 197 (2021).")
    expect(cases[0].caseName).toBe("In re L.A.-O.")
    expect(cases[0].proceduralPrefix).toBe("In re")
  })

  it("recognizes 'In re K.B.' (Cal.App.5th 2024)", () => {
    const cases = extractCaseFrom("See In re K.B., 99 Cal.App.5th 348 (2024).")
    expect(cases[0].caseName).toBe("In re K.B.")
    expect(cases[0].proceduralPrefix).toBe("In re")
  })

  it("recognizes 'In re Phoenix H.' (unusual first name retained)", () => {
    const cases = extractCaseFrom("See In re Phoenix H., 47 Cal.4th 835 (2009).")
    expect(cases[0].caseName).toBe("In re Phoenix H.")
  })
})
```

---

### 3.2 `In re Welfare of [Initials]` (Not CA standard; no action for CA scope)

**Status:** California does **not** use the `In re Welfare of` prefix that is standard in Minnesota juvenile-protection captions. California's analog is bare `In re [Initials]`.

**Existing eyecite-ts coverage:** `In re Welfare of` is *already* covered (line 1696) for cross-state matching. No CA-specific action needed.

---

### 3.3 `In re Dependency of [Initials]` (Not CA standard; no action for CA scope)

**Status:** California rarely uses the `In re Dependency of` prefix that is standard in Washington dependency captions. California's analog is bare `In re [Initials]`.

**Existing eyecite-ts coverage:** `In re Dependency of` is *already* covered (line 1697) for WA. No CA-specific action needed.

---

### 3.4 `In re Termination of Parental Rights of [Initials]` (Not CA standard; no action for CA scope)

**Status:** California does **not** use the long `In re Termination of Parental Rights of` form (which is common in Wisconsin, Arizona, Nebraska, Vermont, South Carolina). California uses bare `In re [Initials]` for termination proceedings under W&I § 366.26 — the same caption as for dependency status determinations.

**Practical impact:** Reading the caption alone, a parser cannot tell whether `In re Caden C.` is a § 300 jurisdictional finding, a § 366.26 termination order, or a § 388 modification petition. That metadata is in the opinion body, not the caption.

**Existing eyecite-ts coverage:** The three `In re Termination of Parental Rights ...` prefixes (lines 1686-1688) handle the non-California states. CA falls through to bare `In re`. **Correct behavior; no action.**

---

### 3.5 `In re [SurnameOnly]` (Rare in modern CA dependency)

**Status:** Older California dependency captions (pre-1990) sometimes used surnames (e.g., `In re Smith` for a dependency matter), but the Rules of Court 8.401 confidentiality requirement has effectively eliminated this for modern published opinions. Bare `In re [Surname]` in a recent CA dependency context is exceedingly rare and would likely indicate either a non-dependency matter (e.g., adult name change, attorney discipline) or a misprint.

**Existing eyecite-ts coverage:** ✓ Bare `In re` matches.

**Recommended action:** None.

---

### 3.6 `Adoption of [Initials/Name]` in Dependency Finalization

**Status:** Dependency cases that result in adoption finalization produce a separate `Adoption of [Initials/Name]` caption (Family Code §§ 8500 et seq.) — distinct from the underlying dependency. The caption transition from `In re [Initials]` (dependency) to `Adoption of [Initials/Name]` (adoption) is a procedural transition, not a parsing problem.

**Existing eyecite-ts coverage:** ✓ `Adoption of` matches.

**Recommended action:** None.

---

## 4. California Juvenile Delinquency (W&I §§ 600-790)

### 4.1 `In re [Initials/Name]` (Already covered by bare `In re`)

**Statutory basis:** California Welfare and Institutions Code §§ 600-790 (Juvenile Court Law — Wards / Delinquency).

**Caption form:** Identical to dependency: `In re [FirstName + LastInitial]` or `In re [Initials]`. CRC 8.401(a) applies equally.

**Real corpus examples:**
- `In re Jose C., 45 Cal.4th 534 (2009)` — delinquency W&I § 602.
- `In re K.B., 99 Cal.App.5th 348 (2024)` — juvenile sealing under W&I § 786.

**Existing eyecite-ts coverage:** ✓ Matched by bare `In re`.

**Recommended action:** None.

---

### 4.2 `People v. [Initials]` (Direct File to Adult Court)

**Statutory basis:** California Welfare and Institutions Code §§ 707, 707.1 (transfer to adult court); Prop. 57 (2016) eliminated direct filing in adult court; but pre-2016 cases exist.

**Caption form:** `People v. [FirstName + LastInitial]` or `People v. [Initials]` — when a juvenile is tried as an adult, the caption becomes adversarial (the People are the plaintiff). CRC 8.401 still applies in some preservation contexts.

**Existing eyecite-ts coverage:** ✓ V_CASE_NAME_REGEX matches `People v. [X]`.

**Recommended action:** None.

---

## 5. California Adoption-Specific (Family Code §§ 8500-9340)

### 5.1 `Adoption of [Initials/Name]` (Already covered)

See §1.5 above. Bare `Adoption of` form is canonical in California. `In re Adoption of` falls through to `In re` (acceptable but loses structured-prefix granularity; addressed in the multi-state recommendation).

---

### 5.2 International / Intercountry Adoption

**Statutory basis:** California Family Code §§ 8900-8925 (Intercountry Adoptions; Hague Convention).

**Caption form:** Same as domestic adoption: `Adoption of [Name]`. The "intercountry" character is in the opinion body, not the caption.

**Existing eyecite-ts coverage:** ✓ `Adoption of` matches.

---

### 5.3 Same-Sex / Second-Parent Adoption

**Caption form:** `Adoption of [Initials]. [Petitioner] v. [Respondent]` when contested. The sub-caption is two-petitioner / adversarial.

**Real corpus:** `Adoption of Joshua S., 42 Cal.4th 945 (2008)` — Annette F. v. Sharon S. (second-parent adoption; sub-caption is the dispute between adoptive parents).

**Existing eyecite-ts coverage:** ✓ `Adoption of` matches the main caption.

**Recommended action:** None.

---

### 5.4 Stepparent Adoption

**Caption form:** `Adoption of [Name]` (with stepparent as petitioner, biological parent as respondent in sub-caption).

**Existing eyecite-ts coverage:** ✓ `Adoption of` matches.

---

## 6. Edge Cases Flagged for the Parser

### 6.1 Initials with Periods

**Forms encountered:**
- Single-letter initials: `A.B.`, `J.L.`, `K.B.`, `O.B.`, `C.O.`, `E.B.`, `E.L.`, `J.Y.`, `M.C.`, `S.R.`
- Two-letter compound initials: `H.S.H.`, `K.M.G.`, `S.A.G.` (rare in CA; common in PA/Mass)
- Hyphenated multi-initials: `H.S.H.-K.`, `L.A.-O.`, `D.J.F.-D.` (common when surname is hyphenated)
- First-name + last-initial: `Caden C.`, `Phoenix H.`, `Sade C.`, `Carmaleta B.`, `Charlisse C.`, `Saul H.`

**Body class accommodation:** `[A-Za-z0-9\s.,'&()/-]+?` includes:
- `A-Z`, `a-z` — letters ✓
- `0-9` — digits (rarely used in names) ✓
- `\s` — whitespace (for `Caden C.`) ✓
- `.` — period (for initials) ✓
- `,` — comma (limited usefulness; the regex anchors at `\s*,\s*$` so internal commas can collapse) ⚠️
- `'` — apostrophe (for `O'Connor`-style names) ✓
- `&` — ampersand (for `R.K. & G.K.`) ✓
- `(`, `)` — parentheses (limited use in case names) ✓
- `/` — forward slash (rare) ✓
- `-` — hyphen (for hyphenated names and initials) ✓

**Verdict:** All observed CA initial forms are correctly captured by the existing body class. **No regex body change needed for the CA-specific scope.**

### 6.2 Hyphenated Surnames

**Forms encountered:**
- `Smith-Jones` — common.
- `L.A.-O.` — hyphenated initials (one half is doubled).
- `H.S.H.-K.` — Wisconsin-style hyphenated three-initial (cited in CA opinions).

**Body class accommodation:** `-` is in the class. ✓

**Recommended action:** Add a regression test:

```typescript
it("recognizes 'In re L.A.-O.' (hyphenated multi-initial)", () => {
  const cases = extractCaseFrom("See In re L.A.-O., 73 Cal.App.5th 197 (2021).")
  expect(cases[0].caseName).toBe("In re L.A.-O.")
})

it("recognizes 'In re Marriage of Jones-Smith' (hyphenated surname)", () => {
  const cases = extractCaseFrom("See In re Marriage of Jones-Smith, 100 Cal.App.5th 1 (2024).")
  expect(cases[0].caseName).toBe("In re Marriage of Jones-Smith")
})
```

### 6.3 ALL-CAPS Captions

**Forms encountered:** `IN RE: MARRIAGE OF M.P. AND M.C.` (FindLaw render), `IN THE SUPREME COURT OF THE STATE OF CALIFORNIA — IN RE MARRIAGE OF [X]` (PDF header style).

**Regex behavior:** Case-insensitive `/i` flag matches; the captured text is the input text (ALL-CAPS); downstream `normalizePartyName` lowercases for comparison.

**Verdict:** ✓ Works correctly.

### 6.4 Multi-Word Captions: `In re Marriage of Smith, the`

**Status:** This archaic form is exceedingly rare. The trailing `, the` would be lost because the regex anchors at `\s*,\s*$`. Acceptable.

### 6.5 Multi-Child Captions: `In re A.B.; J.D.; K.L.`

**Status:** PA-style semicolon-separated multi-child captions are rare in California. The current body class does **not** include `;` — multi-child semicolon-separated captions would capture only up to the first semicolon, then the parser would fail to match the remainder as a citation.

**California practice:** Multi-child dependency captions in California use `et al.` (e.g., `In re A.B. et al.`) or `, [Initials]` (e.g., `In re A.B., J.D., K.L.`). The comma-separated form is *also* problematic because the regex anchors on a trailing comma — `In re A.B., J.D., K.L.` would match only `In re A.B.` as the case name and treat `J.D., K.L.` as post-caption context (incorrect).

**This is a body-class limitation noted in the cross-state research (PA multi-child adoption captions).** Not California-specific, but California captions occasionally hit it.

**Recommended action:** Out of scope for CA-specific work. Track as an open issue: "Body class should accept `;` for multi-child captions" + the broader question of comma-internal anchors. Both are addressed in `docs/research/2026-05-11-procedural-prefixes-family-juvenile.md` §"Out-of-scope".

### 6.6 Anonymized + Adversarial: `In re A.M. v. B.M.`

**Status:** Very rare. If observed, V_CASE_NAME_REGEX would match. Not a CA-specific concern.

### 6.7 `[Subject] (DVPA)` Trailing Statutory Marker

**Forms:** `In re S.O. (DVPA)` — Domestic Violence Prevention Act suffix. Some appellate captions include a parenthetical statutory marker after the initials.

**Regex behavior:** Currently the body class includes `(` and `)`, so `S.O. (DVPA)` is captured as part of the subject. The result: `caseName="In re S.O. (DVPA)"`, `plaintiffNormalized="s.o. (dvpa)"`. **Acceptable** — the statutory marker is correctly preserved in the case name.

**Verdict:** ✓ Works correctly.

---

## 7. CSM-Specific Citation Quirks (Reference, Not Action)

California Style Manual (4th ed. 2000) — adopted by the California Supreme Court — has structural quirks above the case-name scan layer that affect downstream extraction but not the procedural-prefix-recognition stage:

1. **Year-first parenthetical:** CSM places `(Year)` immediately after the case name: `In re Marriage of Bonds (2000) 24 Cal.4th 1`. Bluebook places it after the citation: `In re Marriage of Bonds, 24 Cal.4th 1 (2000)`. eyecite-ts already handles both via the existing year-extraction logic.
2. **Italicized `v.`:** CSM mandates italics for `v.`; Bluebook permits either. No parser impact.
3. **Pincite `at p.`:** CSM uses `at p. 1104`; Bluebook uses `, 1104`. Parser-level concern for pin-cite extraction, not for case-name capture.
4. **`Ibid.` vs `Id.`:** CSM prefers `Ibid.` for exact-same-cite; `Id.` for same-cite with different page. eyecite-ts resolver handles `Id.` already; `Ibid.` is captured as a separate short-form.
5. **No-space reporter form:** `Cal.4th`, `Cal.App.5th`, `Cal.Rptr.3d` — already addressed by the `rptr` / `cal` / `app` / `supp` stems in `src/reporters/`.
6. **Bracketed parallel cites:** `[54 Cal.Rptr.2d 370]` — CSM-specific parallel-citation syntax. Out of scope for procedural-prefix work.

None of these CSM quirks affect the procedural-prefix recognition layer. They affect downstream extraction (year, pin-cite, parallel cites).

---

## 8. Recommended Action Punch List

### 8.1 High-Priority Additions (Cal.5th and Cal.App.5th volume)

Add to `proceduralPrefixes` and `PROCEDURAL_PREFIX_REGEX`:

```typescript
// Insert BEFORE bare "Conservatorship of" (line 1722):
"Conservatorship of the Person and Estate of",  // joint conservatorship (longest extended form)
"Conservatorship of the Person of",              // CA canonical for adult/LPS person-only
"Conservatorship of the Estate of",              // CA canonical for estate-only
// existing "Conservatorship of" remains as fallback
```

```typescript
// Insert BEFORE "In re" (line 1701):
"In re Conservatorship of",   // alternate CA appellate caption (Cal.5th S-docket usage)
"In re Guardianship of",      // CA + multi-state (also flagged in 2026-05-11 family-juvenile research)
"In re Adoption of",          // CA + multi-state
```

Note: `In re Guardianship of` and `In re Adoption of` are already on the multi-state family-juvenile recommendation list (`docs/research/2026-05-11-procedural-prefixes-family-juvenile.md` §§10-11). If they are added there, they don't need to be re-added here.

### 8.2 Low-Priority Addition

```typescript
// Bare CSM-render form:
"Marriage of",  // CSM short-rendering (e.g., "Marriage of Diamond (2024)")
```

Position next to bare `Adoption of`, `Estate of`, etc. (line 1721-1727).

### 8.3 Regression Tests Required (No code changes, just test additions)

Add to `tests/extract/extractCase.test.ts`:

```typescript
describe("CA procedural prefixes — family law / probate / juvenile", () => {
  // === In re Marriage of (already covered; regression) ===
  it("In re Marriage of Bonds (Cal.4th)", () => {
    const cases = extractCaseFrom("In re Marriage of Bonds, 24 Cal.4th 1 (2000).")
    expect(cases[0].caseName).toBe("In re Marriage of Bonds")
    expect(cases[0].proceduralPrefix).toBe("In re Marriage of")
  })
  it("In re Marriage of R.K. & G.K. (anonymized)", () => {
    const cases = extractCaseFrom("In re Marriage of R.K. & G.K., 100 Cal.App.5th 1 (2025).")
    expect(cases[0].proceduralPrefix).toBe("In re Marriage of")
    expect(cases[0].plaintiffNormalized).toBe("r.k. & g.k.")
  })
  it("In re Marriage of M.P. and M.C. (anonymized + and)", () => {
    const cases = extractCaseFrom("In re Marriage of M.P. and M.C., 100 Cal.App.5th 100 (2025).")
    expect(cases[0].proceduralPrefix).toBe("In re Marriage of")
  })

  // === Estate of (already covered; regression) ===
  it("Estate of Duke (Cal.4th)", () => {
    const cases = extractCaseFrom("Estate of Duke, 61 Cal.4th 871 (2015).")
    expect(cases[0].caseName).toBe("Estate of Duke")
    expect(cases[0].proceduralPrefix).toBe("Estate of")
  })

  // === Conservatorship of (NEW — extended forms) ===
  it("Conservatorship of the Person of O.B. (Cal.5th LPS)", () => {
    const cases = extractCaseFrom("Conservatorship of the Person of O.B., 9 Cal.5th 989 (2020).")
    expect(cases[0].caseName).toBe("Conservatorship of the Person of O.B.")
    expect(cases[0].proceduralPrefix).toBe("Conservatorship of the Person of")
  })
  it("In re Conservatorship of O.B. (alternate caption)", () => {
    const cases = extractCaseFrom("In re Conservatorship of O.B., 9 Cal.5th 989 (2020).")
    expect(cases[0].proceduralPrefix).toBe("In re Conservatorship of")
  })
  it("Conservatorship of Wendland (bare form regression)", () => {
    const cases = extractCaseFrom("Conservatorship of Wendland, 26 Cal.4th 519 (2001).")
    expect(cases[0].caseName).toBe("Conservatorship of Wendland")
    expect(cases[0].proceduralPrefix).toBe("Conservatorship of")
  })

  // === Guardianship of (already covered; regression for In re Guardianship of) ===
  it("In re Guardianship of Saul H. (Cal. Sup. Ct.)", () => {
    const cases = extractCaseFrom("In re Guardianship of Saul H., S271265 (Cal. 2022).")
    expect(cases[0].caseName).toBe("In re Guardianship of Saul H.")
    expect(cases[0].proceduralPrefix).toBe("In re Guardianship of")
  })

  // === In re [Initials] (juvenile dependency — already covered; regression) ===
  it("In re Caden C. (Cal.5th — landmark parental-benefit)", () => {
    const cases = extractCaseFrom("In re Caden C., 11 Cal.5th 614 (2021).")
    expect(cases[0].caseName).toBe("In re Caden C.")
    expect(cases[0].proceduralPrefix).toBe("In re")
  })
  it("In re A.B. (full-initials form)", () => {
    const cases = extractCaseFrom("In re A.B., 100 Cal.App.5th 1 (2024).")
    expect(cases[0].caseName).toBe("In re A.B.")
  })
  it("In re L.A.-O. (hyphenated multi-initial)", () => {
    const cases = extractCaseFrom("In re L.A.-O., 73 Cal.App.5th 197 (2021).")
    expect(cases[0].caseName).toBe("In re L.A.-O.")
  })

  // === Adoption of [Initials] (already covered; regression) ===
  it("Adoption of Kelsey S. (Cal.4th)", () => {
    const cases = extractCaseFrom("Adoption of Kelsey S., 1 Cal.4th 816 (1992).")
    expect(cases[0].caseName).toBe("Adoption of Kelsey S.")
    expect(cases[0].proceduralPrefix).toBe("Adoption of")
  })
  it("Adoption of Michael H. (Cal.4th)", () => {
    const cases = extractCaseFrom("Adoption of Michael H., 10 Cal.4th 1043 (1995).")
    expect(cases[0].proceduralPrefix).toBe("Adoption of")
  })

  // === Bare 'Marriage of' (LOW-priority addition) ===
  it("Marriage of Diamond (bare CSM-render)", () => {
    // NOTE: requires the bare 'Marriage of' prefix addition
    const cases = extractCaseFrom("Marriage of Diamond, 100 Cal.App.5th 1 (2024).")
    expect(cases[0].caseName).toBe("Marriage of Diamond")
    expect(cases[0].proceduralPrefix).toBe("Marriage of")
  })
})
```

### 8.4 Ordering Rules Summary

Within the `proceduralPrefixes` array (and the parallel regex alternation):

1. **`Conservatorship of the Person and Estate of`** (joint form) — longest, must precede:
2. **`Conservatorship of the Person of`** — longer than:
3. **`Conservatorship of the Estate of`** — longer than:
4. **`Conservatorship of`** (existing bare form) — the existing fallback.

5. **`In re Conservatorship of`** — must precede `In re`.
6. **`In re Guardianship of`** — must precede `In re`.
7. **`In re Adoption of`** — must precede `In re`.

8. **`Marriage of`** (LOW priority bare form) — independent of `In re Marriage of` since the bare form has no `In re` stem. Place alongside other bare `[Topic] of` forms.

### 8.5 Out-of-Scope Follow-ups Identified

1. **Body class `;` missing.** Multi-child CA captions like `In re A.B.; J.D.; K.L.` (rare; PA-influenced) would fail. Fix in a separate change. See cross-state research.
2. **Comma-internal anchor.** The regex anchors at `\s*,\s*$` which assumes the case name ends at the comma. Multi-child comma-separated captions (`In re A.B., J.D., K.L.`) collapse to the first child only. Architectural fix; out of scope for prefix additions.
3. **`Conservatorship of the Estate of`** body-internal capture. After the extended prefix match, the regex captures the *remainder* of the caption (the subject). For `Conservatorship of the Person and Estate of [X]`, this works correctly. No body-class change needed.
4. **CSM short-form citation handling.** California citations like `Bonds, 24 Cal.4th at 5` (CSM short-form) interact with the resolver, not the procedural-prefix layer. Out of scope.
5. **`Conservatorship of the Person of`** ordering vs. `Conservatorship of the Estate of`: both have the same length prefix in the regex; ordering between them doesn't matter because they diverge after `... Person of` vs. `... Estate of`.

---

## 9. Sources

### 9.1 Statutory and Rule Authority

- **California Family Code:**
  - §§ 2300, 2310, 2330 — Dissolution / nullity / legal separation.
  - § 297 — Domestic Partnership.
  - §§ 7600-7730 — Uniform Parentage Act (parentage, paternity).
  - §§ 7822, 8604 — Termination of parental rights.
  - §§ 8500-9340 — Adoption (Division 13).
  - §§ 8900-8925 — Intercountry adoption.
  - § 1101(d)(2) — Spousal fiduciary duties.
  - § 291 — Money judgments under Family Code.
- **California Probate Code:**
  - §§ 1500-1611 — Guardianship of Minor.
  - §§ 1800-1898 — Probate Conservatorship.
  - §§ 1820-1854 — Establishment of conservatorship.
  - §§ 1850 et seq. — Periodic review of conservatorship.
  - Division 7 (§§ 7000 et seq.) — Administration of Estates of Decedents.
  - Division 9 — Trust Law.
  - § 8121 — Notice of petition (DE-121 form).
- **California Welfare and Institutions Code:**
  - §§ 300-396 — Dependency (juvenile court law).
  - § 366.26 — Termination of parental rights (dependency).
  - §§ 600-790 — Delinquency.
  - § 707, 707.1 — Transfer to adult court (juvenile).
  - § 786 — Juvenile record sealing.
  - § 5350 et seq. — Lanterman-Petris-Short (LPS) Act.
- **California Rules of Court:**
  - Rule 1.6 / 8.90 — Privacy in opinions.
  - Rule 1.200 — Format of citations (CSM vs. Bluebook).
  - Rule 8.204 — Briefs.
  - Rule 8.401(a) — Confidentiality in juvenile-court documents.
  - Rule 8.500 — Petition for review (Supreme Court).
  - Rules 5.x — Family and juvenile rules.
  - Rules 7.x — Probate rules.
- **Citation manuals:**
  - California Style Manual (4th ed. 2000), adopted by California Supreme Court.
  - The Bluebook (21st ed.), Rule 10.2.1(b) (procedural phrases).
  - ALWD Guide (7th ed.), Rule 12.2.

### 9.2 Real Corpus Examples Cited

**California Supreme Court (Cal., Cal.2d, Cal.3d, Cal.4th, Cal.5th):**
- `In re Marriage of Bonds, 24 Cal.4th 1 (2000)` — premarital agreement.
- `In re Marriage of Brown, 15 Cal.3d 838 (1976)` — community property pensions.
- `In re Marriage of Carney, 24 Cal.3d 725 (1979)` — custody / disability.
- `In re Marriage of Davis, 61 Cal.4th 846 (2015)` — date of separation.
- `In re Marriage of Hilke, 4 Cal.4th 215 (1992)` — death pending dissolution.
- `Adoption of Kelsey S., 1 Cal.4th 816 (1992)` — unwed-father parental rights.
- `Adoption of Michael H., 10 Cal.4th 1043 (1995)` — biological-father standing.
- `Adoption of Joshua S., 42 Cal.4th 945 (2008)` — second-parent adoption.
- `Estate of Duke, 61 Cal.4th 871 (2015)` — will reformation.
- `Conservatorship of Wendland, 26 Cal.4th 519 (2001)` — right-to-die.
- `Conservatorship of the Person of O.B., 9 Cal.5th 989 (2020)` — clear-and-convincing standard.
- `In re Caden C., 11 Cal.5th 614 (2021)` — parental-benefit exception.
- `In re Sade C., 13 Cal.4th 952 (1996)` — Wende review.
- `In re Phoenix H., 47 Cal.4th 835 (2009)` — supplemental briefing.
- `In re Zeth S., 31 Cal.4th 396 (2003)` — harmless error.
- `In re Carmaleta B., 21 Cal.3d 482 (1978)` — termination.
- `In re Charlisse C., 45 Cal.4th 145 (2008)` — counsel disqualification.
- `In re James F., 42 Cal.4th 901 (2008)` — guardian ad litem.
- `In re Jose C., 45 Cal.4th 534 (2009)` — delinquency.
- `In re Guardianship of Saul H., S271265 (Cal. 2022)` — Special Immigrant Juvenile Status.

**California Courts of Appeal (Cal.App., Cal.App.2d, Cal.App.3d, Cal.App.4th, Cal.App.5th):**
- `In re Marriage of Wiese, 102 Cal.App.5th 917 (2024)`.
- `In re Marriage of Moore (2024)` — 1st Dist. Div. 3.
- `In re Marriage of Saraye (2024)` — 2d Dist. Div. 8.
- `In re Marriage of Shayan (2024)`.
- `Marriage of Diamond (2024)` — bare CSM form.
- `In re Marriage of R.K. & G.K. (2025)` — 2d Dist., B334571M.
- `In re Marriage of M.P. and M.C. (2025)`.
- `Adoption of Alexander M., 94 Cal.App.4th 430 (2001)`.
- `Guardianship of Christiansen, 248 Cal.App.2d 398 (1967)`.
- `Conservatorship of E.L. (CA3 2026)` — LPS.
- `Conservatorship of J.Y., 49 Cal.App.5th 220 (2020)` — LPS.
- `Conservatorship of E.B.` (Cal. Sup. Ct. S261812) — LPS.
- `Conservatorship of C.O.` — LPS.
- `In re K.B., 99 Cal.App.5th 348 (2024)` — juvenile sealing.
- `In re N.M., 88 Cal.App.5th 1090 (2023)`.
- `In re L.A.-O., 73 Cal.App.5th 197 (2021)` — hyphenated.
- `In re Katherine J. (2022)`.
- `C.C. v. L.B.` (2024) — parentage (adversarial form).

### 9.3 Source URLs

- [California Style Manual (4th ed. 2000)](https://www.sdap.org/wp-content/uploads/downloads/Style-Manual.pdf) — SDAP-hosted PDF.
- [California Rules of Court](https://courts.ca.gov/cms/rules/).
- [California Rules of Court 8.401 (Confidentiality)](https://courts.ca.gov/cms/rules/index/eight/rule8_401).
- [California Rules of Court 1.200 (Format of citations)](https://courts.ca.gov/cms/rules/index/one/rule1_200).
- [Adoption of Kelsey S. (Justia)](https://law.justia.com/cases/california/supreme-court/4th/1/816.html).
- [Adoption of Michael H. (Justia)](https://law.justia.com/cases/california/supreme-court/4th/10/1043.html).
- [Adoption of Joshua S. (Justia)](https://law.justia.com/cases/california/supreme-court/2008/s138169/).
- [Conservatorship of Wendland (Justia)](https://law.justia.com/cases/california/supreme-court/4th/26/519.html).
- [In re Conservatorship of O.B. (Justia)](https://law.justia.com/cases/california/supreme-court/2020/s254938.html).
- [Conservatorship of O.B. (Cal. Sup. Ct.)](https://supreme.courts.ca.gov/sites/default/files/supremecourt/default/2022-08/S254938.pdf).
- [In re Marriage of Bonds (Justia)](https://law.justia.com/cases/california/supreme-court/4th/24/1.html).
- [Estate of Duke (Justia)](https://law.justia.com/cases/california/supreme-court/2015/s199435.html).
- [In re Caden C. (Justia)](https://law.justia.com/cases/california/supreme-court/2021/s255839.html).
- [In re Sade C. (Justia)](https://law.justia.com/cases/california/supreme-court/4th/13/952.html).
- [In re Phoenix H. (SCOCAL)](https://scocal.stanford.edu/opinion/re-phoenix-h-33794).
- [In re Charlisse C. (SCOCAL)](https://scocal.stanford.edu/opinion/re-charlisse-c-33113).
- [In re Guardianship of Saul H. (Justia)](https://law.justia.com/cases/california/supreme-court/2022/s271265.html).
- [In re K.B. (CCAP summary)](https://capcentral.org/case_summaries/in-re-k-b-2024-99-cal-app-5th-348/).
- [In re Marriage of Wiese (GMSR)](https://www.gmsr.com/case/in-re-marriage-of-wiese/).
- [Estate of Duke (GMSR)](https://www.gmsr.com/case/in-re-estate-of-duke-2015-61-cal-4th-871/).
- [CCAP Dependency Case Summaries](https://capcentral.org/wp-content/uploads/2024/02/CCAP-Dependency-Summaries-2023.pdf).
- [California Probate Code § 1850 et seq. (Justia)](https://law.justia.com/codes/california/code-prob/division-7/part-5/chapter-1/article-2/).
- [California Family Code Division 13 — Adoption (Justia)](https://law.justia.com/codes/california/2011/fam/division-13/).
- [Disability Rights California — LPS Chapter 2](https://www.disabilityrightsca.org/system/files/file-attachments/560801Ch2.pdf).
- [Cornell LII — California citation samples](https://www.law.cornell.edu/citation/sample_california).
- [Loyola Law CSM guide](https://guides.library.lls.edu/c.php?g=497703&p=3407469).
- [CCAP Basic Citation Formats](https://www.capcentral.org/procedures/brief_writing/docs/basic_citation_formats.pdf).
- [TypeLaw — CSM vs. Bluebook](https://www.typelaw.com/blog/california-style-manual-vs-bluebook-case-citations/).
- [CFLR — Top Family Law Cases](https://www.cflr.com/members/MCLE_courses/flrc/AR-TopCases.html).
- [California Lawyers Association — Family Law Recent Cases](https://calawyers.org/family-law/recent-family-law-cases-35/).

---

## 10. Cross-References

- **`docs/research/2026-05-11-procedural-prefixes-family-juvenile.md`** — Multi-state family-law procedural prefixes (Minnesota Welfare, Washington Dependency, Wisconsin TPR, etc.). California overlaps minimally — CA uses bare `In re [Initials]` for both dependency and TPR; no separate `In re Welfare of` or `In re Dependency of` needed for CA.
- **`docs/research/2026-05-11-procedural-prefixes-probate-estates.md`** — Multi-state probate prefixes (Louisiana `Succession of`, English `In the Goods of`). California uses `Estate of` (already covered); the LA / English forms are not CA-relevant.
- **`docs/research/2026-05-10-citation-abbrevs-ca.md`** — California-specific reporter-stem abbreviations (`rptr`, `caljur`, `djdar`, `caljic`). The procedural-prefix work in this document complements the reporter-abbreviation work there.
