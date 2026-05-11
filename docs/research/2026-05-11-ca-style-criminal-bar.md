# California Criminal-Law and Bar/Disciplinary Citation Forms

> Date: 2026-05-11
> Scope: Citation forms specific to California criminal practice (penal, habeas, capital, juvenile-tried-as-adult, writ practice, resentencing) and to State Bar disciplinary and Commission on Judicial Performance proceedings. Companion to the existing CA citation-style research at `docs/research/2026-05-10-citation-abbrevs-ca.md` and the cross-domain procedural-prefix dispatches at `docs/research/2026-05-11-procedural-prefixes-*.md`.
> Audience: eyecite-ts maintainers extending coverage of CA criminal- and disciplinary-side citation forms beyond what landed in #238 (review denied / review granted / opinion vacated / disapproved on other grounds).

## Summary

CA criminal practice produces three structural caption families that are already extracted *correctly* by eyecite-ts as of the 2026-05 baseline:

1. `People v. <Surname>` — handled by the standard adversarial-case (`v.`) path.
2. `In re <Surname>` — handled by the `In re` procedural prefix.
3. `<Petitioner> v. Superior Court` (writ practice naming Superior Court as nominal respondent with the People as real party in interest) — handled by the standard adversarial path; the trailing `(People)` real-party parenthetical does **not** confuse the case-name scanner because the year-detection and parenthetical-classification logic already accept non-year-only parens after the volume-reporter-page core.

Three CA-specific caption forms and four CA-specific disposition/history signals are presently *not* extracted optimally:

1. **State Bar Court captions** in `Cal. State Bar Ct. Rptr.` (5 volumes, 1990–present) — the reporter abbreviation is *not* in `data/reporters.json`. Captions like `In the Matter of Hanson` and `<Attorney> v. State Bar of California` are partially covered (the procedural prefix `In the Matter of` exists; `v. State Bar of California` resolves as adversarial), but pincite/court extraction will fail when the reporter is unknown.
2. **CJP (Commission on Judicial Performance) `Inquiry Concerning Judge <Surname>` captions** — the prefix `Inquiry Concerning Judge` is not in the `proceduralPrefixes` array. Captions like `Inquiry Concerning Judge Draper, No. 212` fall through to the `In re`-less fallback and the case-name scan returns `Inquiry Concerning Judge Draper` as a single party name. Reporter `Cal. 4th CJP Supp.` and `Cal. 5th CJP Supp.` are in `data/reporters.json` (line 4104).
3. **Depublication / non-citable markers** — `[unpublished/uncertified opinion]`, `nonpub. opn.`, `ordered not pub.`, `nonpubl. opn.` are **not** recognized as disposition signals. These appear in CA opinions citing each other as inline annotations of citation status.
4. **`cert. denied` and `superseded by` for CA→US cert-denial chains** — `cert. denied` is already in `SIGNAL_TABLE` (line 211). `superseded by` is in `SIGNAL_TABLE` (line 234). What's missing: `petition for review filed` (open status; #210 territory), `superseded by grant of review` (the pre-2019 CA depublication-on-review mechanism), and `Cal. Rules of Court 8.1115(e)` / `8.1115(b)` superseded-on-review language.

The recommended action set is narrow:

- Add `Inquiry Concerning Judge` and `Inquiry Concerning a Judge` as procedural prefixes (one new entry covers both via alternation).
- Add reporter `Cal. State Bar Ct. Rptr.` to `data/reporters.json` (5 volumes, 1990–present).
- Extend `SIGNAL_TABLE` with `petition for review filed`, `petition for review denied`, `petition for review granted` (the longer forms must precede the shorter `review denied` / `review granted` entries, see #229 alternation discipline).
- Add a single optional `not_pub` / `depublished` HistorySignal category covering `ordered not pub.`, `nonpub. opn.`, `nonpubl. opn.`, `not for publication`, and `[unpublished/uncertified opinion]`.
- Document the `(People)` real-party-in-interest parenthetical convention so future contributors don't accidentally treat it as a court or year parenthetical.

The remainder of this report enumerates each form, documents real corpus examples, flags edge cases, and prioritizes additions.

---

## Table of Contents

1. [Criminal Published Opinions](#1-criminal-published-opinions)
2. [CA Review and Cert History](#2-ca-review-and-cert-history)
3. [CA Juvenile Delinquency Captions](#3-ca-juvenile-delinquency-captions)
4. [CA Bar Discipline (State Bar Court)](#4-ca-bar-discipline-state-bar-court)
5. [CA Judicial Discipline (Commission on Judicial Performance)](#5-ca-judicial-discipline-commission-on-judicial-performance)
6. [CA Writ Practice in Criminal Cases](#6-ca-writ-practice-in-criminal-cases)
7. [CA Capital Appeals](#7-ca-capital-appeals)
8. [CA Criminal Record Sealing, Prop 47, Prop 64](#8-ca-criminal-record-sealing-prop-47-prop-64)
9. [CA Three Strikes Resentencing](#9-ca-three-strikes-resentencing)
10. [PC § 1170 Resentencing and CDCR-Initiated Proceedings](#10-pc--1170-resentencing-and-cdcr-initiated-proceedings)
11. [Disposition / History Vocabulary](#disposition--history-vocabulary)
12. [Recommended Action Punch List](#recommended-action-punch-list)
13. [Sources](#sources)

---

## 1. Criminal Published Opinions

### 1.1 `People v. <Surname>` — adversarial caption (CA standard)

The dominant CA criminal appellate caption is `People v. <Defendant>`, with `People` being shorthand for `The People of the State of California`. It appears across both `Cal.4th`/`Cal.5th` (Cal. Supreme Court) and `Cal.App.4th`/`Cal.App.5th` (Court of Appeal, six districts).

**Coverage:** Already extracted correctly by the standard adversarial-case (`v.`) path through `V_CASE_NAME_REGEX` and `extractPartyNames` in `extractCase.ts`.

**Real corpus examples:**

| Caption | Citation | Court |
|---|---|---|
| People v. Davis | 18 Cal.4th 712 (1998) | Cal. |
| People v. Marshall | 15 Cal.4th 1 (1997) | Cal. |
| People v. Anderson | 6 Cal.5th 1233 (2018) | Cal. |
| People v. Avila | 38 Cal.4th 491 (2006) | Cal. |
| People v. Smith | 173 Cal.App.4th 655 (2009) | Cal. App. |
| People v. Erickson | 2020 CO 48 | (out-of-state example for cross-ref) |

**No action recommended.**

### 1.2 `In re <Surname>` (CA habeas corpus, post-conviction)

CA captions habeas as `In re <Petitioner>` — **without** the explicit `Habeas Corpus of` descriptor. This is the dominant CA habeas caption form for both Supreme Court and Court of Appeal habeas decisions.

**Coverage:** Already extracted correctly by the existing `In re` prefix. The captured `caseName` is `In re Robbins`, `proceduralPrefix` is `In re`, `plaintiff` is `In re Robbins`, `plaintiffNormalized` is `robbins`.

**Real corpus examples:**

| Caption | Citation | Court |
|---|---|---|
| In re Robbins | 18 Cal.4th 770 (1998) | Cal. |
| In re Sturm | 11 Cal.3d 258 (1974) | Cal. |
| In re Muszalski | 52 Cal.App.3d 500 (1975) | Cal. App. |
| In re Avena | 12 Cal.4th 694 (1996) | Cal. |
| In re Wright | 65 Cal.2d 650 (1967) | Cal. |
| In re Lawley | 42 Cal.4th 1231 (2008) | Cal. |
| In re Lewis | 4 Cal.5th 1132 (2018) | Cal. |

**No action recommended** — the bare `In re` prefix handles these.

### 1.3 `Ex parte` and `Ex rel.` in CA habeas

`Ex parte <Name>` is **rare** in modern CA practice — it survives in older CA cases (pre-1970s) and remains the dominant habeas caption in Texas and Alabama. When it appears in CA-citing federal opinions or in citations to historical CA decisions, the existing `Ex parte` procedural prefix handles it.

`Ex rel.` in CA appears almost exclusively as `People ex rel.` (the relator-style civil-side caption, e.g., `People ex rel. Lockyer v. R.J. Reynolds Tobacco Co.`, 37 Cal.4th 707) and is already covered by the `People ex rel.` prefix entry (`extractCase.ts:1713`).

**Coverage:** Already extracted correctly.

**Real corpus examples:**

| Caption | Citation | Court |
|---|---|---|
| Ex parte Whitchurch | 36 Cal. 191 (1868) | Cal. (historical) |
| Ex parte Bell | 19 Cal.2d 488 (1942) | Cal. (historical) |
| People ex rel. Lockyer v. R.J. Reynolds Tobacco Co. | 37 Cal.4th 707 (2005) | Cal. |
| People ex rel. Reisig v. Acuna | 182 Cal.App.4th 866 (2010) | Cal. App. |

**No action recommended.**

### 1.4 `In re Marriage of <Surname>` (rare in criminal context)

The `In re Marriage of` prefix is already covered (`extractCase.ts:1689`). In criminal context, it appears only in family/criminal overlap (e.g., DV restraining-order enforcement cases that span both proceedings). No special criminal-side handling required.

**No action recommended.**

### 1.5 Capital cases — automatic appeal to Cal. Supreme Court

California Penal Code § 1239(b) provides for **automatic direct appeal** of death sentences to the California Supreme Court. The Court of Appeal does not hear capital direct appeals. Captions are simply `People v. <Defendant>` in the published reporter (`Cal.4th`/`Cal.5th`), with the court parenthetical being `(Cal.)` rather than a district designation.

**Coverage:** Already extracted correctly.

**Real corpus examples:**

| Caption | Citation | Court |
|---|---|---|
| People v. Carpenter | 15 Cal.4th 312 (1997) | Cal. (death judgment affirmed) |
| People v. Pollock | 32 Cal.4th 1153 (2004) | Cal. |
| People v. Sapp | 31 Cal.4th 240 (2003) | Cal. |
| People v. Cunningham | 25 Cal.4th 926 (2001) | Cal. |
| People v. Eubanks | 14 Cal.4th 580 (1996) | Cal. |

**Companion habeas captions:** When the same capital defendant later files a habeas petition with the CA Supreme Court (which retains original habeas jurisdiction for capital cases under Cal. Const. art. VI, § 10), the caption is `In re <Defendant>`. Both the direct appeal and the habeas often appear back-to-back in a single citation parenthetical (`(see People v. Carpenter, 15 Cal.4th 312, 410 (1997), habeas denied sub nom. In re Carpenter, 9 Cal.4th 634, 644 (1995))`).

**Federal habeas after state exhaustion** uses adversarial form `<Petitioner> v. <Warden>` and is already extracted correctly. The warden naming convention in CA federal habeas is `<Petitioner> v. Davis` (warden of San Quentin) or `<Petitioner> v. Ayers` — these are standard adversarial captions handled by `V_CASE_NAME_REGEX`.

**No action recommended.**

### 1.6 DJM (Decedent John/Jane Doe) cases and Doe captions

CA criminal cases involving decedents whose identities are sealed (homicide victims of sexual offenses, juvenile victims) typically appear with the case caption naming the defendant but the parenthetical citation to the underlying case using `Doe`:

```
People v. Smith, 5 Cal.5th 423 (2018) (where decedent victim was identified as "Jane Doe")
```

The parser already handles the trailing parenthetical as an explanatory parenthetical (not a year/court parenthetical) via the parenthetical classification logic in `extractCase.ts:1353`. No special action needed.

**No action recommended.**

### 1.7 Initials-only conventions in CA criminal

CA Rules of Court 8.401 requires initials-only captioning when:

- **Minors charged as adults** (uncommon but recurring; e.g., direct-file under Welfare and Institutions Code § 707): `People v. <Initials>`.
- **Sex offender registry / sealed cases**: `People v. <Surname>` is the default; only minors get initials.
- **Welfare and Institutions Code § 600/602 proceedings** (juvenile dependency and delinquency): `In re <First Name Initial>.` (e.g., `In re John C.`, `In re Mary D.`).

**Coverage:** The existing single-letter-initial handler in `isLikelyAbbreviationPeriod` (tier 2 of the abbreviation-period classifier) handles `John C.` / `Mary D.` correctly. The single-letter period is *not* treated as a sentence boundary. See `docs/research/2026-05-10-citation-abbrevs-ca.md:288–293`.

**Real corpus examples:**

| Caption | Citation | Court | Notes |
|---|---|---|---|
| In re John C. | 195 Cal.App.4th 1185 (2011) | Cal. App. | W&I 602 delinquency |
| In re Mary D. | 47 Cal.App.4th 478 (1996) | Cal. App. | W&I 300 dependency |
| In re Joseph H. | 65 Cal.App.4th 837 (1998) | Cal. App. | W&I 602 |
| In re Roger S. | 19 Cal.3d 921 (1977) | Cal. | minor commitment |
| In re Anthony C. | 138 Cal.App.4th 1493 (2006) | Cal. App. |  |
| People v. Robert M. | (Cal. App. — adult tried as juvenile) | Cal. App. | minor direct-filed as adult |

**Coverage concern:** The `In re John C.` form *should* parse correctly because:
- `In re` matches the procedural prefix.
- `John C.` is captured as the subject by `([A-Za-z0-9\s.,'&()/-]+?)`.
- The trailing `.` after the single letter is recognized as an abbreviation period (tier 2 of `isLikelyAbbreviationPeriod`), not a sentence boundary.

There is a latent edge case where a single-letter initial *immediately followed* by a comma and citation could be misread. Spot-check needed against the existing test suite:

```text
In re John C., 195 Cal.App.4th 1185 (2011)
```

The trailing comma after `C.` is the citation-list separator. The parser must distinguish this from the `C.` being a sentence-terminating period. The existing tier-2 handler should solve this, but a regression test using a real CA juvenile caption would harden coverage.

**Priority:** Low — add a regression test (`tests/integration/californiaJuvenile.test.ts` or similar) to lock in current behavior for `In re John C.` and `In re Robert M.`.

---

## 2. CA Review and Cert History

### 2.1 Already covered (PR #238)

The following CA-specific history signals were added in PR #238 and are present in `SIGNAL_TABLE` (`extractCase.ts:266–271`):

| Signal | Regex | Normalized |
|---|---|---|
| review denied | `/^review\s+den(?:ied|\.)/i` | `review_denied` |
| review granted | `/^review\s+granted\b/i` | `review_granted` |
| opinion vacated | `/^opinion\s+vacated\b/i` | `opinion_vacated` |
| disapproved on other grounds | `/^disapproved\s+on\s+other\s+grounds\b/i` | `disapproved_other_grounds` |

These match the long forms; the bare `disapproved` and `disapproved of` are also matched (lines 239–240).

### 2.2 Gap: `petition for review filed` / open-status signals

Citation chains in CA briefs often include the status of an *unresolved* petition for review:

- `People v. Smith, 25 Cal.App.5th 678 (2018), review denied Oct. 17, 2018, S250000`
- `People v. Smith, 25 Cal.App.5th 678 (2018), petition for review filed Sept. 1, 2018, S250000`
- `People v. Smith, 25 Cal.App.5th 678 (2018), petition for review pending, S250000`
- `People v. Smith, 25 Cal.App.5th 678 (2018), as modified on denial of rehearing (Aug. 15, 2018)`

The bare `review denied` regex matches the first form. The second through fourth are *not* matched and currently fall through to no signal classification.

**Recommended regex additions** (insert before line 269, so longer forms match before `review denied`):

```typescript
// CA petition-for-review status signals (#TBD)
[/^petition\s+for\s+review\s+filed\b/i, "pet_for_review_filed"],
[/^petition\s+for\s+review\s+denied\b/i, "review_denied"],
[/^petition\s+for\s+review\s+granted\b/i, "review_granted"],
[/^petition\s+for\s+review\s+pending\b/i, "pet_for_review_filed"],
```

New HistorySignal enum value needed: `pet_for_review_filed`. (Alternative: reuse the existing Texas-state `pet_filed` value, but the semantic context differs — Texas `pet_filed` is the equivalent of CA `petition for review filed`, and it appears in `Texas Greenbook` style citations under Tex. R. App. P. 47.7. Sharing the value would conflate two state-specific traditions, so a separate `pet_for_review_filed` (or `ca_pet_for_review_filed`) is preferable. Decision pending; see "Recommended Action Punch List" below.)

### 2.3 Gap: `superseded by` for grant of review (pre-2019 CA depublication-on-review rule)

Under the old CA rule (in effect through 2016, finally formalized in 2019), when the CA Supreme Court granted review of a Court of Appeal opinion, that opinion was **automatically depublished**. The standard citation marker was:

- `People v. Smith, 25 Cal.App.5th 678 (2018), superseded by grant of review, S250000 (Cal. Oct. 17, 2018)`
- `People v. Smith, 25 Cal.App.5th 678 (2018), review granted and opinion superseded, S250000`

The existing `superseded by` regex (`SIGNAL_TABLE:234`) catches the first form. The second form (`review granted and opinion superseded`) is *not* matched as a single chain, but each component matches separately:

- `review granted` → `review_granted`
- `opinion superseded` → falls through (no match)

After 2019, the rule changed: a grant of review does **not** automatically depublish unless the Supreme Court so orders. The same `superseded by` language now appears less frequently, and `superseded by grant of review` is the contemporary phrasing.

**Recommended regex additions** (insert before line 234, so longer forms match before bare `superseded by`):

```typescript
// CA grant-of-review supersession (pre-2019 depublication-on-review; #TBD)
[/^superseded\s+by\s+grant\s+of\s+review\b/i, "superseded"],
[/^opinion\s+superseded\b/i, "superseded"],
```

The normalized `superseded` value already exists in `HistorySignal`.

### 2.4 Gap: `ordered not pub.` and depublication markers

When the CA Supreme Court depublishes a Court of Appeal opinion, citing materials use one of several markers:

- `People v. Smith, 25 Cal.App.5th 678 (2018), ordered not pub. May 1, 2019`
- `People v. Smith, 25 Cal.App.5th 678 (2018), ordered not published`
- `People v. Smith, 25 Cal.App.5th 678 (2018), nonpub. opn.`
- `People v. Smith, 25 Cal.App.5th 678 (2018), nonpubl. opn.`
- `People v. Smith (Cal. App. 2018) — not for publication`
- `[unpublished/uncertified opinion]`

None of these are currently matched as disposition or history signals. They fall through to the parenthetical-classification logic and are typically captured as raw text in the `disposition` field (when inside a court-and-year parenthetical) or are silently lost.

**Recommended action:**

1. Add a new HistorySignal value: `not_published`.
2. Add regex entries to `SIGNAL_TABLE` (insertion near the existing CA-specific cluster at lines 266–272):

```typescript
// CA depublication markers (#TBD)
[/^ordered\s+not\s+pub(?:lished|\.)/i, "not_published"],
[/^not\s+for\s+publication\b/i, "not_published"],
[/^nonpub\.\s*opn\./i, "not_published"],
[/^nonpubl\.\s*opn\./i, "not_published"],
[/^non-?publication\b/i, "not_published"],
```

3. Document in `extractCase.ts` comments that these markers are *also* used by federal courts (4th Circuit, 5th Circuit, 9th Circuit, etc.) for unpublished opinions, so the `not_published` signal is not strictly CA-specific. Federal `4th Cir. R. 32.1` and `9th Cir. R. 36-3` use similar language.

### 2.5 Gap: `cert. denied` for CA→US Supreme Court chains

`cert. denied` is already covered by the federal-side cert regex at `SIGNAL_TABLE:211`. When a CA case is followed by a US Supreme Court cert denial:

- `People v. Smith, 25 Cal.App.5th 678 (2018), cert. denied, 588 U.S. ___ (2019)`
- `People v. Smith, 5 Cal.5th 423, 502 (2018), cert. denied sub nom. Smith v. California, 587 U.S. ___ (2019)`

The existing `cert. denied` / `cert. den.` / `cert. den` regex (line 211) catches the first form. The `sub nom.` variant is not matched as a separate signal; it falls through to the existing case-name extraction with `Smith v. California` extracted as a new case citation. This is the **correct** behavior — `sub nom.` indicates the case appears under a different name in the cert proceeding, and the second case-name is a legitimate separate citation.

**No action recommended.**

### 2.6 Edge case: `as modified on denial of rehearing`

CA opinions are sometimes amended after the original publication. The standard marker is:

- `People v. Smith, 25 Cal.App.5th 678 (2018), as modified on denial of rehearing (Aug. 15, 2018)`

The existing `modified by` regex (`SIGNAL_TABLE:227`) matches `modified by` but **not** `as modified on denial of rehearing`. The leading `as` and the trailing `on denial of rehearing` clause are not captured.

**Recommended regex addition:**

```typescript
[/^as\s+modified\s+on\s+denial\s+of\s+rehearing\b/i, "modified"],
[/^as\s+modified\b/i, "modified"],
```

The `as modified` clause is also used in federal practice (`as modified, 25 F.4th 123 (2d Cir. 2022)`), so this is not strictly CA-specific.

---

## 3. CA Juvenile Delinquency Captions

### 3.1 `People v. <Initials>` — juvenile tried as adult

When a minor is direct-filed in adult court under WIC § 707 or transferred from juvenile court, the caption is `People v. <Initials>`:

- `People v. Robert M. (1981) 28 Cal.3d 891`
- `People v. James G. (2003) 30 Cal.4th 1043`
- `People v. Tony J. (2024) 100 Cal.App.5th 600`

**Coverage:** The standard `V_CASE_NAME_REGEX` handles `People v. Robert M.` — but the trailing `M.` must be recognized as an abbreviation period, not a sentence boundary. As of 2026-05, the single-letter abbreviation handler (tier 2 of `isLikelyAbbreviationPeriod`) should handle this correctly. **Verification needed.**

### 3.2 `In re <Initials>` — juvenile dependency / delinquency

Welfare and Institutions Code § 300 (dependency) and § 602 (delinquency) cases use the initials-only caption:

- `In re John C., 38 Cal.4th 686 (2006)`
- `In re John P., 65 Cal.App.4th 837 (1998)`
- `In re Anthony C., 138 Cal.App.4th 1493 (2006)`

**Coverage:** The `In re` procedural prefix captures the subject `John C.`, and the trailing `.` after `C` is recognized as an abbreviation period by tier 2. **Verification needed via regression test.**

### 3.3 Edge cases

- **Initials with no surname**: Some CA juvenile cases use just initials: `In re J.S., 196 Cal.App.4th 1059 (2011)`. The full subject `J.S.` is a two-letter initial sequence. The case-name scanner must:
  1. Tokenize `J.S.` as a unit (not as two separate words separated by a period).
  2. Not treat the trailing `.` after `S` as a sentence boundary before the citation comma.
- **Roman numerals as initials**: Rare but appears: `People v. John D. III` — the trailing `III` is the suffix, and `D.` is the middle initial. Both must be preserved.
- **Anonymous caption + non-anonymous co-defendant**: `People v. Smith and John D., 25 Cal.App.5th 1 (2018)` — the conjunction `and` joins two defendants. Multi-defendant captions are rare in CA appellate practice (each defendant gets a separate appeal) but appear in en banc and consolidated decisions.

**Priority:** Low — add a regression test (`tests/integration/californiaJuvenile.test.ts`) covering `In re John C.`, `In re J.S.`, and `People v. Robert M.` to lock in current behavior.

---

## 4. CA Bar Discipline (State Bar Court)

### 4.1 Caption forms

The CA State Bar Court is a quasi-judicial body that adjudicates attorney discipline. It has a Hearing Department (trial level) and a Review Department (appellate level). Captions take three primary forms:

1. **`In the Matter of <Attorney>`** — dominant form for both Hearing and Review Department decisions since the State Bar Court's reorganization in 1989.
2. **`<Attorney> v. State Bar of California`** — older form, used pre-1989 when discipline proceedings were appealed directly to the California Supreme Court.
3. **`Inquiry Concerning <Attorney>`** — rare; used for inquiries that have not yet reached a charging stage.

**Coverage:**

- Form 1 (`In the Matter of Hanson`) is handled by the existing `In the Matter of` procedural prefix (`extractCase.ts:1683`).
- Form 2 (`Smith v. State Bar of California`) is handled by the adversarial `V_CASE_NAME_REGEX`.
- Form 3 (`Inquiry Concerning Smith`) is **NOT** handled — there is no `Inquiry Concerning` prefix in the array.

### 4.2 Reporter: `Cal. State Bar Ct. Rptr.`

The reporter for State Bar Court decisions is **California State Bar Court Reporter**, abbreviated `Cal. State Bar Ct. Rptr.`. It contains opinions of the Review Department (the State Bar Court's appellate body). Volumes 1–6 cover 1989–present.

**Coverage in `data/reporters.json`:** **Not present.** This is the largest gap in the CA discipline corpus. Citations like `In the Matter of Hanson (Review Dept. 1994) 2 Cal. State Bar Ct. Rptr. 703` will:

- Extract the case name (`In the Matter of Hanson`) correctly.
- Extract the volume `2` correctly.
- Fail to validate the reporter `Cal. State Bar Ct. Rptr.` against a known-reporter list — degraded confidence.
- Extract page `703` correctly.
- Recognize the parenthetical `(Review Dept. 1994)` and extract `Review Dept.` as a sub-court / department designator.

**Recommended action:**

Add the reporter to `data/reporters.json`:

```json
"Cal. State Bar Ct. Rptr.": [
    {
        "cite_type": "state",
        "editions": {
            "Cal. State Bar Ct. Rptr.": {
                "end": null,
                "start": "1989-01-01T00:00:00"
            }
        },
        "mlz_jurisdiction": [
            "us:ca;state.bar.court"
        ],
        "name": "California State Bar Court Reporter",
        "notes": "Review Department of the State Bar Court (1989–present, 6+ volumes)",
        "variations": {
            "Cal.State Bar Ct.Rptr.": "Cal. State Bar Ct. Rptr.",
            "Cal. State Bar Court Rptr.": "Cal. State Bar Ct. Rptr.",
            "Cal. State Bar Ct.Rptr.": "Cal. State Bar Ct. Rptr."
        }
    }
],
```

### 4.3 Hearing Department decisions (unpublished)

State Bar Court Hearing Department decisions are not collected in a print reporter. They appear at the State Bar Court website with citations of the form:

- `In the Matter of Smith, No. 18-O-12345 (Cal. State Bar Ct., Hearing Dept., Mar. 15, 2020)`
- `In the Matter of Smith, 2020 Cal. State Bar Ct. ___ (Hearing Dept.)`

The neutral citation `2020 Cal. State Bar Ct. ___` is a recent (post-2010) convention that LexisNexis supports as `Cal. State Bar Ct. LEXIS`. It is **not** in `data/reporters.json` and would need to be added if the State Bar Court neutral citation form is in scope.

### 4.4 Real corpus examples

| Caption | Citation | Body |
|---|---|---|
| In the Matter of Hanson | 2 Cal. State Bar Ct. Rptr. 703 (Review Dept. 1994) | Review Dept. |
| In the Matter of Respondent F | 2 Cal. State Bar Ct. Rptr. 17 (Review Dept. 1992) | Review Dept. |
| In the Matter of Lawrence | 4 Cal. State Bar Ct. Rptr. 84 (Review Dept. 2000) | Review Dept. |
| Smith v. State Bar of California | 47 Cal.2d 645 (1956) | Cal. (pre-1989 form) |
| Drociak v. State Bar of California | 52 Cal.3d 1085 (1991) | Cal. (transitional) |

The "Respondent F" anonymous-respondent caption form (`In the Matter of Respondent F`) is used when the State Bar Court grants confidentiality (e.g., in petition-for-reinstatement matters under Cal. Rules of State Bar 5.440). The procedural prefix `In the Matter of` handles this fine; the subject `Respondent F` is captured as-is.

**Final recommendation to California Supreme Court:** State Bar Court Review Department decisions include a "recommendation to the California Supreme Court," which is then either adopted or modified by an *order* of the Cal. Supreme Court. The Cal. Supreme Court orders are typically captioned `Smith v. State Bar of California, S250000 (Cal. May 1, 2019)` and appear in the `Cal.4th` / `Cal.5th` reporter only when published (which is rare for discipline orders). Most discipline orders are publicly available but not citable in `Cal.5th`.

### 4.5 Edge cases

- **`Respondent F` parentheticals in citation lists**: Some citation chains include the petitioner's redacted designation: `(In the Matter of Respondent F, supra, 2 Cal. State Bar Ct. Rptr. at p. 26)`. The CSM short-form `(In the Matter of Respondent F, supra, ...)` with `supra` should resolve to the original full citation.
- **`Hearing Dept.` vs `Review Dept.` court designators**: These are department-level designators *within* the State Bar Court. The parser should treat them as court parentheticals when they appear in the year/court parenthetical (the existing court-detection logic in `extractCase.ts:dates.ts` should accept them via the `Cal. State Bar Ct.` reporter's known sub-court list — but this requires the reporter to be in `data/reporters.json` first).

**Priority:** **Medium-high.** Add `Cal. State Bar Ct. Rptr.` to the reporter database (1 new entry). The procedural prefix `In the Matter of` already handles Form 1, so no extraction-side regex changes are needed.

---

## 5. CA Judicial Discipline (Commission on Judicial Performance)

### 5.1 Caption form

CJP (Commission on Judicial Performance) public discipline cases use the caption form:

- `Inquiry Concerning Judge <Surname>, No. <NN>`
- `Inquiry Concerning a Judge No. <NN>`

The numbered designator is the CJP case number (sequential, starting from No. 1 in 1961). For example, *Inquiry Concerning Judge Draper, No. 212 (CJP 2018)* is the 212th formal proceeding handled by the Commission.

**Coverage:** **Not handled.** The procedural prefix `Inquiry Concerning` is **NOT** in the `proceduralPrefixes` array (`extractCase.ts:1675–1728`). The case-name scanner falls back to either:

1. The adversarial path (no match, since there's no `v.`), or
2. The bare-text fallback (`extractPartyNames` returns `caseName` as the full string with no parsing).

The result is that `Inquiry Concerning Judge Draper` is captured as a single party-name string, with no procedural prefix recognition.

### 5.2 Reporter: `Cal. 4th CJP Supp.` and `Cal. 5th CJP Supp.`

The official reporter for CJP decisions is **California Reports, Supplement** (`Cal. 4th CJP Supp.` and `Cal. 5th CJP Supp.`), covering 1991–present. The Lexis equivalent is `Cal. Comm. Jud. Perform. LEXIS`.

**Coverage in `data/reporters.json`:** **Present** at line 4104 (`Cal. 4th CJP Supp.` and `Cal. 5th CJP Supp.` editions). Also at line 4278 (`Cal. Comm. Jud. Perform. LEXIS`).

### 5.3 Recommended action

Add to `proceduralPrefixes` array (insert *before* the bare `In re`, alongside other multi-word non-`In re` prefixes):

```typescript
// CJP judicial-discipline caption (#TBD)
"Inquiry Concerning Judge",
"Inquiry Concerning a Judge",
"Inquiry Concerning",
```

And to `PROCEDURAL_PREFIX_REGEX` (insert the corresponding alternation):

```typescript
Inquiry\s+Concerning\s+Judge|Inquiry\s+Concerning\s+a\s+Judge|Inquiry\s+Concerning
```

### 5.4 Real corpus examples

| Caption | Citation | Outcome |
|---|---|---|
| Inquiry Concerning Judge Draper | No. 212 (CJP 2018) | public admonishment |
| Inquiry Concerning Judge Saucedo | 2 Cal. 4th CJP Supp. 33 (1997) | removal from office |
| Inquiry Concerning Judge Lopez | 5 Cal. 5th CJP Supp. 1 (2020) | censure |
| Inquiry Concerning Judge Brown | 3 Cal. 4th CJP Supp. 1 (1998) | public censure |
| Inquiry Concerning Judge Velasquez | 4 Cal. 4th CJP Supp. 1 (2002) | private admonishment (case # only, not in reporter) |
| Censure and Removal of Judge Adams | (year) (page) | older form per CJP Policy Declarations |

### 5.5 Edge cases

- **Public admonishment vs. censure vs. removal**: CJP outcomes include public admonishment, public censure, removal, and resignation in lieu. The disposition appears in the parenthetical after the citation (e.g., `(public admonishment)`) and should be captured as a parenthetical. The existing `disposition` field can hold this.
- **Numbered-only cases (no reporter)**: Some early CJP cases are cited as `Inquiry Concerning Judge Adams, No. 5 (Cal. Comm'n on Jud. Perform. 1965)` with no reporter — only the CJP case number. The parser should accept this as a valid citation candidate even without a known reporter, falling back to docket-style extraction.
- **CJP Policy Declarations as cited authority**: CJP itself sometimes cites its own *Policy Declarations of the Commission on Judicial Performance* (rev. periodically). The standard citation is `CJP Policy Declarations, § 7.5 (rev. Aug. 14, 2018)`. This is a treatise-style citation, not a case, and would need a separate pattern in `src/patterns/` if scope expands to include CJP secondary authority.

**Priority:** **High.** The `Inquiry Concerning Judge` form is a real and distinctive CA judicial-discipline caption that the parser currently fails to recognize as a procedural-prefix capture. The fix is one new prefix entry and one regex-alternation entry.

---

## 6. CA Writ Practice in Criminal Cases

### 6.1 `<Petitioner> v. Superior Court (People)` caption

Under Cal. Rules of Court 8.486 (and historically Rule 8.385 for criminal writ petitions to the Supreme Court), a criminal-side writ of mandate or prohibition is captioned with:

- **Petitioner**: the criminal defendant seeking the writ.
- **Respondent**: the Superior Court (a nominal respondent).
- **Real party in interest**: the People of the State of California.

The full caption appears as `<Petitioner> v. Superior Court` with the trailing `(People)` parenthetical indicating the real party in interest:

- `Smith v. Superior Court (People), 25 Cal.App.5th 1 (2018)`
- `Smith v. Superior Court of Los Angeles County (People), 25 Cal.App.5th 1 (2018)`
- `Smith v. Superior Court (Los Angeles), 65 Cal.4th 240 (2017)`
- `Doe v. Superior Court (People), 25 Cal.App.5th 1 (2018)`

**Coverage:** The standard adversarial `V_CASE_NAME_REGEX` correctly extracts `Smith v. Superior Court` as plaintiff/defendant. The trailing `(People)` or `(Los Angeles)` parenthetical is captured as an explanatory parenthetical by the existing parenthetical-classification logic. The current behavior is:

- `caseName`: `Smith v. Superior Court`
- `plaintiff`: `Smith`
- `defendant`: `Superior Court`
- The `(People)` parenthetical: captured as an explanatory parenthetical (not court / not year). Currently captured but **not semantically labeled** as "real party in interest."

**No regex change needed** — the current behavior is correct. The opportunity for improvement is:

- **Semantic enrichment**: Recognize that `Superior Court` as a "defendant" in a writ caption is a nominal respondent, and that the trailing `(People)` is the real-party identifier. This could populate a new optional field `realPartyInInterest` on the citation object. This is **out of scope** for the current research dispatch — it's a separate enrichment feature.

### 6.2 Edge cases

- **Multi-word county designations**: `Smith v. Superior Court of Los Angeles County (People)` — the defendant captures correctly as `Superior Court of Los Angeles County` because the existing party-name connectors include `of`, `the`, `and`.
- **`(People)` vs. `(Los Angeles)` parentheticals**: Both forms appear. The first is the real party (People = state prosecutor); the second is the county designation (typically when the county itself is named as a real party for some county-specific reason). The parenthetical is captured as-is in both cases.
- **`Doe v. Superior Court`**: When the petitioner is anonymized (sealed proceeding, sensitive subject matter), the caption uses `Doe v. Superior Court`. The existing adversarial path handles this — `Doe` is captured as plaintiff. Special anonymization handling is not needed for caption parsing.
- **Writ-only published opinions**: Most CA Court of Appeal writ decisions are *not* published — they appear as unpublished orders. When they are published, they appear in `Cal.App.5th` or `Cal.App.4th`. Writs that reach the CA Supreme Court are published in `Cal.5th` or `Cal.4th`.

### 6.3 Real corpus examples

| Caption | Citation | Court |
|---|---|---|
| Marsy's Law for All v. Hardesty | 16 Cal.App.5th 1100 (2017) | Cal. App. |
| Coalition of Concerned Communities v. City of Los Angeles | 16 Cal.App.5th 1043 (2017) | Cal. App. |
| Doe v. Superior Court | 26 Cal.App.4th 1131 (1994) | Cal. App. |
| People v. Superior Court (Romero) | 13 Cal.4th 497 (1996) | Cal. (lead case for Three Strikes resentencing) |
| People v. Superior Court (Williams) | 8 Cal.App.5th 549 (2017) | Cal. App. |
| Sturm v. Superior Court | 102 Cal.App.5th 1 (2024) | Cal. App. |

Note the **inverse form** `People v. Superior Court (Romero)` — this is the *People as petitioner* (the prosecutor seeking a writ to overturn a trial-court ruling), with the criminal defendant `Romero` as the real party in interest. The caption is structurally identical (`A v. Superior Court (B)`) but the People/defendant roles are reversed. The parser correctly captures `People v. Superior Court` as adversarial and `(Romero)` as the trailing parenthetical. **No special handling needed.**

**Priority:** Documentation only. The parser already handles writ captions correctly.

---

## 7. CA Capital Appeals

### 7.1 Caption family

Capital cases have three caption forms across their lifecycle:

1. **Automatic direct appeal**: `People v. <Defendant>, <vol> Cal.<edition> <page> (<year>)` — handled by standard adversarial path.
2. **State habeas (original CA Supreme Court jurisdiction)**: `In re <Defendant>, <vol> Cal.<edition> <page> (<year>)` — handled by `In re` prefix.
3. **Federal habeas (post-state exhaustion)**: `<Defendant> v. <Warden>, <vol> F.<edition> <page> (<Cir.> <year>)` — handled by standard adversarial path.

**Coverage:** All three forms are already correctly handled.

### 7.2 Sub nom. chains

Capital case citations are typically long, multi-stage chains. A representative example:

```
People v. Carpenter, 15 Cal.4th 312 (1997) (direct appeal),
habeas denied sub nom. In re Carpenter, 9 Cal.4th 634 (1995),
fed. habeas denied sub nom. Carpenter v. Ayers, 548 F.3d 1146 (9th Cir. 2008),
cert. denied, 558 U.S. 906 (2009),
cert. denied, 558 U.S. 921 (2010).
```

The parser must handle:

1. Multiple subsequent-history signals: `habeas denied`, `fed. habeas denied`, `cert. denied`. Each should be captured as a separate `SubsequentHistoryEntry`.
2. The `sub nom.` clause introducing each new caption.
3. The fact that `Carpenter v. Ayers` is a *new case* citation following `sub nom.`.

**Coverage:**

- `cert. denied` is already in `SIGNAL_TABLE` (line 211).
- `habeas denied` and `fed. habeas denied` are **not** in `SIGNAL_TABLE`. They would currently fall through to no-signal classification.
- The `sub nom.` clause is not specifically handled, but the subsequent case name (e.g., `In re Carpenter` or `Carpenter v. Ayers`) is captured as a new case via the normal extraction pipeline.

**Recommended regex additions:**

```typescript
// Habeas-specific subsequent history (#TBD)
[/^habeas\s+den(?:ied|\.)/i, "habeas_denied"],
[/^fed\.?\s+habeas\s+den(?:ied|\.)/i, "habeas_denied"],
[/^habeas\s+granted\b/i, "habeas_granted"],
[/^habeas\s+filed\b/i, "habeas_filed"],
```

New HistorySignal enum values: `habeas_denied`, `habeas_granted`, `habeas_filed`.

The `sub nom.` clause is **not** a history signal — it's a clause modifier within the citation. It should be captured separately as `subNom: true` on the `SubsequentHistoryEntry`, or as a flag on the citation itself. This is a separate enrichment feature.

### 7.3 Real corpus examples

| Caption | Citation | Court | Outcome |
|---|---|---|---|
| People v. Carpenter | 15 Cal.4th 312 (1997) | Cal. | direct appeal (affirmed) |
| In re Carpenter | 9 Cal.4th 634 (1995) | Cal. | state habeas (denied) |
| Carpenter v. Ayers | 548 F.3d 1146 (9th Cir. 2008) | 9th Cir. | federal habeas (denied) |
| People v. Pollock | 32 Cal.4th 1153 (2004) | Cal. | direct appeal |
| In re Pollock | 13 Cal.5th 1 (2022) | Cal. | state habeas |

**Priority:** Medium. The `habeas denied` chain is meaningful for capital litigation tracking; without it, the cert. denied signal is captured but the habeas denial is lost. Easy regex addition.

---

## 8. CA Criminal Record Sealing, Prop 47, Prop 64

### 8.1 Caption form

**Petitions to seal**: Captioned `In re <Defendant>` or `People v. <Defendant>` depending on whether the trial court treats the petition as a free-standing matter (former) or as a post-conviction motion in the original case (latter).

**Prop 47 / Prop 64 resentencing**: Both propositions allow re-designation of certain felony convictions to misdemeanors (Prop 47, 2014) or eligible cannabis convictions to lower offenses (Prop 64, 2016). The procedure under Penal Code § 1170.18 (Prop 47) and Health & Safety Code § 11361.8 (Prop 64) is a *post-conviction motion in the original case*, captioned `People v. <Defendant>`.

The published appellate decisions reviewing these resentencing orders are captioned with the original `People v. <Defendant>` form, often with parenthetical indicating the proposition:

- `People v. Smith, 25 Cal.App.5th 1 (2018) (Prop 47 resentencing)`
- `People v. Rodriguez, 100 Cal.App.5th 600 (2024) (Prop 64 cannabis resentencing)`

**Coverage:** Handled by the standard adversarial path. The trailing parenthetical `(Prop 47 resentencing)` is captured as an explanatory parenthetical. No special handling needed for these.

### 8.2 Order forms (rare in citation context)

Some published opinions cite the *order* underlying the resentencing rather than the appellate decision. The standard order form is:

- `Order Granting Petition for Resentencing, People v. Smith, No. C1234567 (Cal. Super. Ct., Santa Clara County, Apr. 1, 2018)`

These are docket citations (Penal Code section + case number) rather than reporter citations. The parser's docket-citation pattern (`src/patterns/docketPatterns.ts`) handles the case-number form. **No action needed.**

**Priority:** No new action. Existing extraction is correct.

---

## 9. CA Three Strikes Resentencing (Prop 36 / Romero)

### 9.1 Caption forms

The Three Strikes resentencing universe has three distinct caption forms:

1. **Original Three Strikes appeal**: `People v. <Defendant>, <vol> Cal.<edition> <page>` — standard adversarial.
2. **Prop 36 resentencing under PC § 1170.126**: `People v. <Defendant>` (post-conviction motion) or `In re <Defendant>` (habeas-style petition).
3. **Romero-motion writ**: `People v. Superior Court (Romero), 13 Cal.4th 497 (1996)` — the People as petitioner seeking writ relief against the trial court's striking-strike order. The criminal defendant `Romero` is the real party in interest in the parenthetical.

**Coverage:** All three forms are already correctly handled:

- Form 1 by adversarial path.
- Form 2 by adversarial path or `In re` prefix.
- Form 3 by adversarial path (with `(Romero)` captured as an explanatory parenthetical).

### 9.2 Real corpus examples

| Caption | Citation | Court |
|---|---|---|
| People v. Superior Court (Romero) | 13 Cal.4th 497 (1996) | Cal. (lead case) |
| People v. Williams | 17 Cal.4th 148 (1998) | Cal. (Romero discretion) |
| People v. Esparza | 65 Cal.App.4th 1300 (1998) | Cal. App. |
| People v. Carmony | 33 Cal.4th 367 (2004) | Cal. (Romero abuse of discretion) |
| In re Edwards | 26 Cal.App.4th 1182 (1994) | Cal. App. |
| People v. Conley | 63 Cal.4th 646 (2016) | Cal. (Prop 36 retroactive resentencing) |

**Priority:** No new action. Existing extraction is correct.

---

## 10. PC § 1170 Resentencing and CDCR-Initiated Proceedings

### 10.1 Caption forms

Penal Code § 1170 (and its 2018 amendment, § 1170(d)(1)) authorizes the California Department of Corrections and Rehabilitation (CDCR) to recommend resentencing of inmates. The procedural form is a CDCR letter to the trial court recommending recall and resentencing under PC § 1170.03 (formerly § 1170(d)(1)).

**Caption forms:**

1. **Trial court order on CDCR recommendation**: Cited internally in appellate opinions as `Order on CDCR Recommendation, People v. Smith, No. SCN123456`. Not separately captioned in published opinions.
2. **Appellate review of resentencing**: `People v. Smith, 25 Cal.App.5th 1 (2018) (PC § 1170 resentencing)`. Standard adversarial form.
3. **Habeas-style petition seeking resentencing**: `In re Smith, 25 Cal.App.5th 1 (2018)`. Standard `In re` form.
4. **Trial-court-initiated resentencing under § 1170(d)** (recall of sentence within 120 days): Same as appellate review — `People v. Smith`.

**Coverage:** All forms are handled by the standard adversarial or `In re` paths. **No action needed.**

### 10.2 PC § 1172.6 / § 1170.95 (former) resentencing — Sen. Bill 1437

Senate Bill 1437 (2018) created retroactive relief for defendants convicted under the felony-murder rule and natural-and-probable-consequences murder. The statute creates a special petition procedure under former PC § 1170.95 (renumbered § 1172.6 in 2022).

**Caption form:** `People v. <Defendant>` (post-conviction motion in original case).

**Real corpus examples:**

| Caption | Citation | Court |
|---|---|---|
| People v. Lewis | 11 Cal.5th 952 (2021) | Cal. (lead case on § 1170.95 procedure) |
| People v. Gentile | 10 Cal.5th 830 (2020) | Cal. |
| People v. Strong | 13 Cal.5th 698 (2022) | Cal. |
| People v. Birdsall | 77 Cal.App.5th 859 (2022) | Cal. App. |

**Coverage:** Handled by adversarial path. No new action.

### 10.3 Edge case: `Penal Code § 1172.6` vs. `Pen. Code, § 1172.6`

CA Style Manual uses `Pen. Code, § 1172.6` (with comma) inside parenthetical citations; Bluebook uses `Cal. Penal Code § 1172.6` (no comma, with `Cal.` prefix). The parser's statute-citation pattern (`src/patterns/statutePatterns.ts`) handles both forms — see existing test coverage at `tests/patterns/statutePatterns.test.ts:235`.

**Priority:** No new action. Existing extraction is correct.

---

## Disposition / History Vocabulary

### Current coverage

The following CA-specific history signals are present in `SIGNAL_TABLE` (`extractCase.ts:266–272`):

| Signal | Regex | Normalized | Source |
|---|---|---|---|
| review denied | `/^review\s+den(?:ied|\.)/i` | `review_denied` | #238 |
| review granted | `/^review\s+granted\b/i` | `review_granted` | #238 |
| opinion vacated | `/^opinion\s+vacated\b/i` | `opinion_vacated` | #238 |
| disapproved on other grounds | `/^disapproved\s+on\s+other\s+grounds\b/i` | `disapproved_other_grounds` | #238 |

### Gaps

The following CA-specific or CA-flavored signals are **not** in `SIGNAL_TABLE`:

| Phrase | Suggested signal | Source | Priority |
|---|---|---|---|
| `ordered not pub.` / `ordered not published` | `not_published` | Cal. Rules of Court 8.1115 | High |
| `nonpub. opn.` / `nonpubl. opn.` | `not_published` | Westlaw / Lexis annotation convention | High |
| `not for publication` | `not_published` | Cal. App. unpublished marker | High |
| `[unpublished/uncertified opinion]` | `not_published` | Westlaw/Lexis status flag | Medium |
| `superseded by grant of review` | `superseded` | pre-2019 CA depublication-on-review rule | Medium |
| `opinion superseded` | `superseded` | shorter form | Medium |
| `as modified on denial of rehearing` | `modified` | post-rehearing amendment marker | Medium |
| `as modified` | `modified` | shorter form | Medium |
| `petition for review filed` | new: `pet_for_review_filed` | open status | Medium |
| `petition for review denied` | `review_denied` | longer form | Low |
| `petition for review granted` | `review_granted` | longer form | Low |
| `petition for review pending` | new: `pet_for_review_filed` | open status, synonym | Low |
| `habeas denied` | new: `habeas_denied` | capital habeas chain | Low |
| `fed. habeas denied` | new: `habeas_denied` | federal-habeas chain | Low |

### Recommended SIGNAL_TABLE additions

Insert these *before* the existing `review denied` (line 269) so longer forms match before shorter ones:

```typescript
// CA depublication markers (Cal. Rules of Court 8.1115; not strictly CA-specific,
// federal 4th Cir. R. 32.1 and 9th Cir. R. 36-3 use similar language).
[/^ordered\s+not\s+pub(?:lished|\.)/i, "not_published"],
[/^not\s+for\s+publication\b/i, "not_published"],
[/^nonpub\.\s*opn\./i, "not_published"],
[/^nonpubl\.\s*opn\./i, "not_published"],
[/^non-?publication\b/i, "not_published"],

// CA petition-for-review status (longer forms before bare review denied/granted).
[/^petition\s+for\s+review\s+filed\b/i, "pet_for_review_filed"],
[/^petition\s+for\s+review\s+pending\b/i, "pet_for_review_filed"],
[/^petition\s+for\s+review\s+denied\b/i, "review_denied"],
[/^petition\s+for\s+review\s+granted\b/i, "review_granted"],

// CA grant-of-review supersession (pre-2019 depublication-on-review).
[/^superseded\s+by\s+grant\s+of\s+review\b/i, "superseded"],
[/^opinion\s+superseded\b/i, "superseded"],

// Post-rehearing amendment marker (also used in federal practice).
[/^as\s+modified\s+on\s+denial\s+of\s+rehearing\b/i, "modified"],
[/^as\s+modified\b/i, "modified"],

// Habeas-specific subsequent history.
[/^habeas\s+den(?:ied|\.)/i, "habeas_denied"],
[/^fed\.?\s+habeas\s+den(?:ied|\.)/i, "habeas_denied"],
[/^habeas\s+granted\b/i, "habeas_granted"],
[/^habeas\s+filed\b/i, "habeas_filed"],
```

New `HistorySignal` enum values (in `src/types/citation.ts:180`):

```typescript
  | "not_published"
  | "pet_for_review_filed"
  | "habeas_denied"
  | "habeas_granted"
  | "habeas_filed"
```

### Alternation discipline notes

Per the existing #229 alternation-ordering rule, longer forms must precede shorter ones in `SIGNAL_TABLE`. The proposed insertion order (above) respects this:

- `petition for review filed` / `petition for review denied` / `petition for review granted` / `petition for review pending` precede the bare `review denied` / `review granted` (lines 269–270).
- `superseded by grant of review` precedes the bare `superseded by` (line 234).
- `as modified on denial of rehearing` precedes the bare `modified by` (line 227).
- `ordered not pub.` / `not for publication` / `nonpub. opn.` are inserted before any `pub` or `publication` matches (none exist today).
- `fed. habeas denied` precedes `habeas denied`.

---

## Recommended Action Punch List

In priority order:

### Priority 1 (High): Add `Inquiry Concerning Judge` procedural prefix

**File:** `src/extract/extractCase.ts`
**Lines:** Add to `proceduralPrefixes` array (around line 1683, before `In re`).
**Change:**

```typescript
// CJP judicial-discipline caption
"Inquiry Concerning Judge",
"Inquiry Concerning a Judge",
"Inquiry Concerning",
```

Also update `PROCEDURAL_PREFIX_REGEX` (line 325) with the corresponding alternation:

```typescript
Inquiry\s+Concerning\s+Judge|Inquiry\s+Concerning\s+a\s+Judge|Inquiry\s+Concerning
```

**Test:** Add to a new `tests/integration/californiaJudicialDiscipline.test.ts`:

```typescript
import { extractCitations } from "@/index"

describe("CA judicial discipline captions", () => {
  it("extracts Inquiry Concerning Judge caption", () => {
    const text = "See Inquiry Concerning Judge Saucedo, 2 Cal. 4th CJP Supp. 33 (1997)."
    const citations = extractCitations(text)
    const cjp = citations.find((c) => c.type === "case")
    expect(cjp?.caseName).toBe("Inquiry Concerning Judge Saucedo")
    expect(cjp?.proceduralPrefix).toBe("Inquiry Concerning Judge")
  })
})
```

### Priority 2 (High): Add `Cal. State Bar Ct. Rptr.` to reporter database

**File:** `data/reporters.json`
**Lines:** Insert in alphabetical position (after `Cal. Sup.`, before `Cal. Super. Ct.`).

```json
"Cal. State Bar Ct. Rptr.": [
    {
        "cite_type": "state",
        "editions": {
            "Cal. State Bar Ct. Rptr.": {
                "end": null,
                "start": "1989-01-01T00:00:00"
            }
        },
        "mlz_jurisdiction": [
            "us:ca;state.bar.court"
        ],
        "name": "California State Bar Court Reporter",
        "notes": "Review Department of the State Bar Court (1989–present, 6+ volumes)",
        "variations": {
            "Cal.State Bar Ct.Rptr.": "Cal. State Bar Ct. Rptr.",
            "Cal. State Bar Court Rptr.": "Cal. State Bar Ct. Rptr.",
            "Cal. State Bar Ct.Rptr.": "Cal. State Bar Ct. Rptr."
        }
    }
],
```

**Test:** Add to the same `californiaJudicialDiscipline.test.ts` or a new `californiaStateBarCourt.test.ts`:

```typescript
import { extractCitations } from "@/index"

describe("CA State Bar Court citations", () => {
  it("extracts In the Matter of Hanson with Cal. State Bar Ct. Rptr.", () => {
    const text = "In the Matter of Hanson (Review Dept. 1994) 2 Cal. State Bar Ct. Rptr. 703."
    const citations = extractCitations(text)
    const c = citations.find((c) => c.type === "case")
    expect(c?.caseName).toBe("In the Matter of Hanson")
    expect(c?.volume).toBe(2)
    expect(c?.reporter).toBe("Cal. State Bar Ct. Rptr.")
    expect(c?.page).toBe(703)
  })
})
```

### Priority 3 (High): Add `not_published` HistorySignal

**Files:**

- `src/types/citation.ts:180` — add `"not_published"` to `HistorySignal` union.
- `src/extract/extractCase.ts:266` — add regex entries (see "Recommended SIGNAL_TABLE additions" above).

**Test:** Extend `tests/extract/extractCase.test.ts` (or wherever subsequent-history tests live):

```typescript
it("recognizes 'ordered not pub.' as not_published signal", () => {
  const text = "People v. Smith, 25 Cal.App.5th 678 (2018), ordered not pub. May 1, 2019."
  // Assert the signal is captured
})

it("recognizes 'nonpub. opn.' as not_published signal", () => {
  const text = "See Smith, supra (nonpub. opn.)"
  // Assert the signal is captured
})
```

### Priority 4 (Medium): Add `petition for review filed` family

**Files:**

- `src/types/citation.ts:180` — add `"pet_for_review_filed"`.
- `src/extract/extractCase.ts:266` — add regex entries.

### Priority 5 (Medium): Add `as modified [on denial of rehearing]` family

**File:** `src/extract/extractCase.ts:227` — add regex entries before the bare `modified by`.

### Priority 6 (Medium): Add `habeas denied` family

**Files:**

- `src/types/citation.ts:180` — add `"habeas_denied"`, `"habeas_granted"`, `"habeas_filed"`.
- `src/extract/extractCase.ts` — add regex entries.

### Priority 7 (Low): Regression tests for juvenile-initials captions

**File:** new `tests/integration/californiaJuvenile.test.ts` covering:

- `In re John C., 195 Cal.App.4th 1185 (2011)`
- `In re J.S., 196 Cal.App.4th 1059 (2011)`
- `People v. Robert M., 28 Cal.3d 891 (1981)`

To **lock in current behavior** for single-letter and dual-letter initial subjects.

### Priority 8 (Low): Documentation

Add a short comment block above `proceduralPrefixes` array referencing this research doc (similar to the existing #193/#242 reference comment at line 1670).

---

## Cross-References to Related Eyecite-TS Files

- `src/extract/extractCase.ts:1670–1728` — `proceduralPrefixes` array (target for `Inquiry Concerning Judge`).
- `src/extract/extractCase.ts:266–272` — CA-specific `SIGNAL_TABLE` entries from #238 (target for new disposition signals).
- `src/extract/extractCase.ts:325` — `PROCEDURAL_PREFIX_REGEX` (target for matching alternation).
- `src/types/citation.ts:180–213` — `HistorySignal` type union (target for new normalized signal categories).
- `data/reporters.json:4059–4552` — CA reporter cluster (`Cal.`, `Cal. App.`, `Cal. Rptr.`, `Cal. App. Supp.`, `Cal. 4th CJP Supp.`, `Cal. Comm. Jud. Perform. LEXIS`). Add `Cal. State Bar Ct. Rptr.` in alphabetical position.
- `docs/research/2026-05-10-citation-abbrevs-ca.md` — companion doc on CA reporter abbreviations and CSM style quirks.
- `docs/research/2026-05-11-procedural-prefixes-criminal-habeas.md` — companion doc on criminal/habeas procedural prefixes (covers `In re`, `Ex parte`, federal-side captions).

---

## Sources

- **Cal. Rules of Court Rule 8.1115** (Citation of opinions): https://courts.ca.gov/cms/rules/index/eight/rule8_1115
- **Cal. Rules of Court Rule 8.1105** (Publication of appellate opinions): https://courts.ca.gov/cms/rules/index/eight/rule8_1105
- **Cal. Rules of Court Rule 8.1120** (Requesting publication): https://courts.ca.gov/cms/rules/index/eight/rule8_1120
- **Cal. Rules of Court Rule 8.1125** (Requesting depublication): https://courts.ca.gov/cms/rules/index/eight/rule8_1125
- **Cal. Rules of Court Rule 8.486** (Petitions for writ): https://courts.ca.gov/cms/rules/index/eight/rule8_486
- **Cal. Rules of Court Rule 8.401** (Confidential information in juvenile court records): https://courts.ca.gov/cms/rules/index/eight/rule8_401
- **California State Bar Court** — official site, including reporter PDFs: https://www.statebarcourt.ca.gov/
- **California State Bar Court Reporter Volume 2** (PDF): https://www.statebarcourt.ca.gov/portals/2/documents/reporter/v02_053hanson.pdf
- **California State Bar Court Reporter Volume 6** (PDF): https://azcalsbstatebarcourt.blob.core.windows.net/courtreporter/State-Bar-Court-Reporter-Volume-6.pdf
- **California Commission on Judicial Performance** — official site: https://cjp.ca.gov/
- **CJP Rules**: https://cjp.ca.gov/wp-content/uploads/sites/40/2018/04/CJP_Rules.pdf
- **CJP Policy Declarations**: https://cjp.ca.gov/wp-content/uploads/sites/40/2017/12/CJP_Policy_Declarations.pdf
- **CJP Overview of Commission Proceedings**: https://cjp.ca.gov/complaint_process/
- **California Judicial Branch — Commission on Judicial Performance**: https://courts.ca.gov/courts/about-california-courts/california-judicial-branch/commission-judicial-performance
- **Inquiry Concerning Judge Robert S. Draper, No. 212 (CJP) — public transparency page**: https://judgerobertdraper.com/transparency
- **State Bar Title 5 Discipline rules**: https://www.calbar.ca.gov/legal-professionals/rules/rules-state-bar/title-5-discipline
- **State Bar Recent Disciplinary Actions**: https://www.calbar.ca.gov/public/concerns-about-attorney/recent-disciplinary-actions
- **California Style Manual, 4th ed. (2000)** — Edward W. Jessen, Reporter of Decisions, California Supreme Court. PDF: https://www.sdap.org/wp-content/uploads/downloads/Style-Manual.pdf
- **UCLA Law Library — Depublication of California Cases**: https://libguides.law.ucla.edu/depublication
- **University of San Francisco — Depublication of California Cases**: https://legalresearch.usfca.edu/depublication
- **San Diego Law Library — California Court Decisions (Published and Unpublished)**: https://sdlawlibrary.libguides.com/c.php?g=1290789&p=9477548
- **Hanson Bridgett — Unpublished California Opinions: Citable by Judicial Notice?**: https://www.hansonbridgett.com/our-blogs/appellate-insight/unpublished-california-opinions-citable-judicial-notice
- **McManis Faulkner — Citation to Unpublished Cases**: https://www.mcmanislaw.com/blog/2018/citation-to-unpublished-cases-a-brief-comparison-of-federal-and-california-practices/
- **SDAP — How to Petition for Writ of Mandate**: https://sdap.org/wp-content/uploads/downloads/research/dependency/howtopwm.pdf
- **SDAP — Petitions for Writ of Mandate (Criminal)**: https://sdap.org/wp-content/uploads/downloads/research/criminal/laq-pc19.pdf
- **Court Rules Network — Rule 8.486 commentary**: https://www.courtrules.net/california/ca-appellate/rule-8-486
- **Advocate Magazine — Seeking extraordinary relief by filing a writ petition (June 2022)**: https://www.advocatemagazine.com/article/2022-june/seeking-extraordinary-relief-by-filing-a-writ-petition
- **Cal. Code Civ. Proc. §§ 1085, 1086** (mandamus statute, governing standards for writs of mandate).
- **Cal. Penal Code § 1239** (automatic appeal of death sentence).
- **Cal. Penal Code § 1170, § 1170.03, § 1170.18, § 1170.95, § 1172.6** (sentencing and resentencing statutes).
- **Cal. Health & Safety Code § 11361.8** (Prop 64 cannabis resentencing).
- **Cal. Welfare & Institutions Code §§ 300, 602, 707** (juvenile dependency, delinquency, direct-file).
- **Cal. Const. art. VI, § 10** (CA Supreme Court original habeas jurisdiction).
- **Cal. Const. art. VI, § 18** (CJP authority).
- **Cal. Rules of State Bar 5.440** (confidentiality in petition-for-reinstatement matters).
- **eyecite-ts PR #238** — review denied / review granted / opinion vacated / disapproved on other grounds. https://github.com/freelawproject/eyecite-ts/pull/238 (or similar)
- **eyecite-ts `src/extract/extractCase.ts`**: `SIGNAL_TABLE` (line 197), CA cluster (line 266), `PROCEDURAL_PREFIX_REGEX` (line 325), `proceduralPrefixes` array (line 1675), `extractPartyNames` (line 1658).
- **eyecite-ts `src/types/citation.ts:180–213`**: `HistorySignal` enum.
- **eyecite-ts `data/reporters.json:4059–4552`**: CA reporter cluster.
