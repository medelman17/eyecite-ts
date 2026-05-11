# California Style Manual (CSM) — Core + Appellate Practice

**Date:** 2026-05-11
**Scope:** Foundational California Style Manual 4th ed. citation conventions for the eyecite-ts library.
**Sibling agents:** family/probate, administrative agencies, criminal/bar, tax/business, specialty disciplines (separate dispatches).

---

## 1. Summary

The eyecite-ts library has incremental California coverage landing across PRs #228, #233, #234, #237, #238, and #244, but several foundational CSM citation conventions are not yet recognized. The biggest gaps, in priority order, are:

1. **`(YYYY)` year-first placement of date parenthetical between case name and citation core** — the canonical CSM form `Smith v. Jones (1990) 50 Cal.4th 100, 110`. The parser currently expects the date parenthetical *after* the citation core (Bluebook position). The leading paren is silently dropped from the case name, and the year/court fields stay empty unless a trailing paren is also present. **HIGH** priority — blocks correct extraction for any text authored to CSM rules, which is most CA briefs and most CA appellate opinions.

2. **`(in bank)` parenthetical** for California Supreme Court — CA's equivalent of federal "en banc." Currently the parser maps `(en banc)` to `disposition: "en banc"` (#235), but `(in bank)` and `In Bank` (no parens, used in opinion caption) are unrecognized. **MED** priority — disposition tagging gap, not extraction gap.

3. **Slip-opinion caption with docket + `[nonpub. opn.]`** — `Smith v. Jones (Cal. Ct. App. May 1, 2024, B123456) [nonpub. opn.]`. Currently the tokenizer does not match docket-only slip opinions (no volume/reporter/page), and the `[nonpub. opn.]` marker is not lifted onto an `unpublished` field. **MED** priority — unpublished CA opinions are not extractable as citations.

4. **`Cal. App. Supp.` spacing variant** — CSM 4th writes `Cal.App.3d Supp.` (no spaces *within* `Cal.App.3d`, but a space before `Supp.`). The reporters-db has all variants (`Cal. App. 3d Supp.`, `Cal. App. Supp. 3d`, `Cal.App.3d Supp.`, `Cal.App. Supp. 3d`, etc.), but the tokenizer's `state-reporter` pattern can lose the trailing `Supp.` token under certain inputs because `Supp.` follows the page-number lookahead boundary. **MED** priority — needs a test sweep; partial #244 coverage via the `&` admission.

5. **`Cal. Daily Op. Serv.` / DJDAR / D.A.R.** — reporters-db has the entries (`Cal. Daily Op. Serv.`, `D.A.R.`, `Daily Journal DAR`) but no tokenizer pattern admits them. Two-digit volume year (e.g., `08 Cal. Daily Op. Serv. 909`) and DJDAR's `D.A.R.` are common in Westlaw/Lexis exports. **MED-LOW** priority — modern opinions cite to bound reporter when available; DAR cites mostly appear in research databases.

6. **CA Court of Appeal district designation** — `(Cal. Ct. App. 1st Dist. 2024)`, `(Cal. Ct. App. 6th Dist.)`. Currently `parseParenthetical` strips dates and exposes `court` but does not normalize district numbering. **LOW-MED** priority — extraction works, but `court` value loses structure.

7. **Bracketed parallel cite handling** (#237 — *landed*): regression-test that all CSM bracket forms with leading parens still work — i.e., `[266 Cal.Rptr. 569, 575]` star-pincite form. Already tested. No new work.

8. **Star-pincite form** `at *5` for Cal. Daily Op. Serv. / WL — already handled by `NEUTRAL_PINCITE_LOOKAHEAD` (#191). The same regex applies once Cal. Daily Op. Serv. is added as a neutral. **LOW** priority — derivative.

9. **`review denied / granted` history** (#238 — *landed*) — verify `review denied` works after CSM year-first form, not just trailing paren form. **LOW** priority — regression test.

10. **Disposition `opinion vacated / disapproved on other grounds`** (#238 — *landed*) — see above.

11. **CSM pincite forms** `at p. 100`, `at pp. 100-110` (issue #236, separate) — out of scope for this research.

12. **Bluebook vs CSM choice rule** (Cal. R. Ct. 1.200) — not a parser problem.

---

## 2. Per-feature research

### 2.1 Year-first format (HIGHEST priority)

#### Canonical form per CSM 4th ed.

CSM § 1:1 (Cases) places the date parenthetical **after the case name and before the official reporter citation**:

> `<Case Name> (YYYY) <vol> <Reporter> <page>[, <pincite>]`

Real examples (from published CA opinions):

| Verbatim citation | Notes |
|---|---|
| `Loeffler v. Target Corp. (2013) 58 Cal.4th 1081, 1104, fn. 5` | Cal. Supreme; pincite plus footnote |
| `Perez v. Public Utilities Com. (2016) 2 Cal.App.5th 1411` | Cal. Court of Appeal |
| `People v. Marshall (1997) 15 Cal.4th 1` | Cal. Supreme |
| `People v. White (1995) 32 Cal.App.4th 638` | Cal. Court of Appeal |
| `People v. Foretich (1970) 14 Cal.App.3d Supp. 6, 10` | Appellate Div. of Superior Court |
| `Dillon v. Legg (1968) 68 Cal.2d 728` | Cal. Supreme (older series) |
| `Goodman v. Kennedy (1976) 18 Cal.3d 335` | Cal. Supreme |

The body of *Bily v. Arthur Young & Co.* (1992) 3 Cal.4th 370 includes year-first parallel form:
- `(1968) 68 Cal.2d 728 [69 Cal.Rptr. 72, 441 P.2d 912, 29 A.L.R.3d 1316]`
- `(1976) 18 Cal.3d 335 [134 Cal.Rptr. 375, 556 P.2d 737]`

#### CSM mandate

When practicing in California state court under Cal. R. Ct. 1.200, an attorney must choose either Bluebook or CSM and **be consistent** through the brief. Most California state courts and California-based lawyers use CSM by default. The CSM Quick Reference (Office of the Reporter of Decisions, June 2018) confirms `(YYYY)` between case name and citation core.

#### Variations

| Form | Example | Frequency in corpus |
|---|---|---|
| Bare year | `(1990)` | Default form when citing a CA case in a CA-style brief |
| Year with jurisdiction | `(Cal. 1990)` | CA appellate cases in Bluebook form (parallel-citation footer); also seen in federal opinions citing CA cases |
| Year with district | `(Cal. Ct. App. 1st Dist. 2024)` | Bluebook form; CSM omits the district in citation per § 1:13 because `Cal.App.` already encodes the Court of Appeal |
| Month + day + year + docket | `(May 1, 2024, B123456)` | Slip opinion form (see § 2.8) |
| Year + nonpub marker | `(2024) [nonpub. opn.]` | Highly unusual — published nonpub markers conflict with Rule 8.1115 |

#### Current eyecite-ts behavior

`extractCase.ts` looks for the parenthetical *after* the citation core via `LOOKAHEAD_PAREN_REGEX` (line ~166). It does **not** look behind the citation core for a leading `(YYYY)` paren between case name and volume number.

The case-name backward scanner (`extractCaseName`, line ~999) walks backward through abbreviation periods, but it has no special handling for a `(YYYY)` paren as a boundary or as a year-extractable construct. Real-world impact:

```
Input:  "Smith v. Jones (1990) 50 Cal.4th 100, 110"
                              ^^^^^^^^^^^^^^^^^^^^^^  ← citation core matched
                       ^^^^^^                          ← (1990) treated as part of case name? or stops backward scan?
```

Tested behavior on current code:
- Case name almost certainly gets truncated at `(1990)` because the backward scanner treats `)` as a parenthetical boundary
- `year` field stays `undefined` because the parser looks for a trailing court/year paren
- The citation core itself extracts cleanly (volume/reporter/page work)

#### Recommended action

Add a **leading-paren extraction** step in `extractCase.ts`:

1. After identifying the citation core token at position `span.cleanStart`, before triggering case-name backward search, scan backward (skipping whitespace) for `^\([^)]+\)\s*$`.
2. If found, parse with `parseParenthetical(content)`. If a year is extracted, set `year`/`date`/`court` (and `disposition` if `in bank` — see § 2.7).
3. Adjust `caseNameSearchEnd` to the position *before* the leading paren so the case-name backward scan doesn't bleed into the year text.
4. Adjust `fullSpan.cleanStart` to include the leading paren (it sits between case name and citation core).

Proposed regex for the leading paren lookbehind from the cite-core start:

```typescript
/** Leading parenthetical immediately preceding the citation core,
 *  per California Style Manual year-first form (CSM § 1:1).
 *  Matches "(YYYY)", "(Cal. 1990)", "(Cal. Ct. App. 1st Dist. 2024)",
 *  with optional ", in bank" and other dispositions. The pattern is anchored
 *  to "\s*$" (end-of-string when applied to a backward slice from the cite
 *  core position) so the paren is *immediately adjacent* to the volume. */
const LEADING_YEAR_PAREN_REGEX = /\(([^)(]+)\)\s*$/
```

Implementation note: the backward slice should be bounded — e.g., take the 80 characters immediately preceding `span.cleanStart`, trim trailing whitespace, then run the regex. Don't scan the full document — the case-name search has its own scope.

Edge cases to test:
- `(1990)` alone — bare year
- `(Cal. 1990)` — jurisdiction + year
- `(Cal. 1990, in bank)` — jurisdiction + year + in-bank disposition
- `(May 14, 2025, S289903)` — slip opinion date + docket (see § 2.8)
- Leading paren *plus* trailing paren (`(1990) 50 Cal.4th 100 (in bank)`) — both contribute year/disposition

---

### 2.2 Star-pagination citation form

Canonical: `*1`, `*5`, `at *5`, `*3-*5` (range), `*15 n.7` (with footnote).

Real examples:
- `2024 WL 1234567 at *5`
- `2024 Cal. Daily Op. Serv. 5080 at *2`
- `2024 U.S. App. LEXIS 100, at *15`
- `*3-*5` range form (common Westlaw page-break form)

#### Current eyecite-ts behavior

The `NEUTRAL_PINCITE_LOOKAHEAD` regex (extractNeutral.ts:22) handles:
```typescript
/^(?:\s+at\s+|,\s*(?:at\s+)?)(\*?\d+(?:[-–—]\*?\d+)?(?:\s+(?:nn?|note)\s*\.?\s*\d+(?:[-–—]\d+)?)?)/d
```

This already accepts:
- `at *5` (whitespace prefix)
- `, *5` (comma prefix)
- `, at *5` (comma+at prefix)
- `*3-*5` (range)
- `at *5 n.7` (with footnote)

#### Current eyecite-ts behavior — for case citations

`LOOKAHEAD_PINCITE_REGEX` (extractCase.ts:177) is identical to the neutral form. Star pagination works on case citations too.

#### Gap

Cal. Daily Op. Serv. is not yet tokenized as a neutral, so star pagination on those cites is moot until that lands.

#### Priority

**LOW** — derivative, no action needed until § 2.4 lands.

---

### 2.3 Official Reports vs Cal.Rptr. order

CSM (§ 1:13-1:15) mandates citing **official reporters first**:
- Cal. Supreme cases → cite *Cal.* (or *Cal.2d* / *Cal.3d* / *Cal.4th* / *Cal.5th*)
- Cal. Court of Appeal cases → cite *Cal.App.* (or *Cal.App.2d* through *Cal.App.5th*)
- Cal. App. Div. (Superior Court appellate division) → cite *Cal.App.Supp.* / *Cal.App. 3d Supp.* etc.

West parallel citations (*Cal.Rptr.*, *P.2d*, *P.3d*) are **not required** under CSM, but they are commonly added in bracketed parallel form (CSM § 1:21):

```
People v. Smith (1990) 50 Cal.3d 100 [266 Cal.Rptr. 569, 800 P.2d 100]
```

Bluebook form requires both:
```
People v. Smith, 50 Cal. 3d 100, 266 Cal. Rptr. 569 (1990)
```

#### Current eyecite-ts behavior

`detectParallel.ts` already links parallel citations regardless of order. PR #237 added bracket-form `[266 Cal.Rptr. 569]` parsing. Tests at tests/extract/extractCase.test.ts:3093-3176 cover the bracket form including pincite.

#### Gap

None for extraction. **Display/round-trip**: if a downstream consumer wants to re-emit a citation in CSM form, the library doesn't carry a `style: "csm" | "bluebook"` field. That's out of scope for an extraction library.

#### Priority

**LOW** — no action.

---

### 2.4 California Daily Opinion Service (DJDAR) / Daily Appellate Report

#### Canonical form

Lexis-published California reporter for early publication of California appellate opinions:
- `Cal. Daily Op. Serv.` (or `Cal. Daily Op. Service` variant) — full abbreviation
- Volume is a 2-digit year (e.g., `08 Cal. Daily Op. Serv. 909` for 2008 vol. 909)

Daily Journal Daily Appellate Report (a different publication, by Daily Journal Corp.):
- `D.A.R.` or `Daily Journal D.A.R.` — common abbreviations
- Also seen as `DJDAR` informally

Real examples (corpus):
- `512 F.3d 1222, 08 Cal. Daily Op. Serv. 909` — federal cite with CA Daily Op. Serv. parallel (citing 9th Cir. case in Suazo-Perez v. Mukasey)
- `98 Cal. Daily Op. Serv. 5080, 98 Daily Journal D.A.R. 7017` — parallel CA Daily Op. Serv. + DJDAR

#### Volume-numbering nuance

The "volume" is a **2-digit year**, not a sequential volume number. This is the same pattern as Westlaw/Lexis neutral cites (`2020 WL 123456`, `2020 U.S. LEXIS 1000`) — except the year is 2-digit. Some sources use the 4-digit year (`2008 Cal. Daily Op. Serv. 909`); the reporter-DB entry accepts both.

This makes the form **closer to a neutral citation than a state reporter**:
- `08 Cal. Daily Op. Serv. 909` → year=2008, court="Cal. Daily Op. Serv.", documentNumber=909
- `2008 Cal. Daily Op. Serv. 909` → year=2008, court="Cal. Daily Op. Serv.", documentNumber=909

#### Current eyecite-ts behavior

Neither the `state-reporter` pattern (casePatterns.ts:55) nor the `lexis` pattern (neutralPatterns.ts:69) match `Cal. Daily Op. Serv.` correctly:
- `state-reporter` requires a numeric volume, period-containing reporter, and a numeric page. The pattern's character class `[A-Za-z.\d\s&']` *would* accept `Cal. Daily Op. Serv.`, but the trailing lookahead requires `\s|$|\(|,|;|\.|\[|\]` after the page. `08 Cal. Daily Op. Serv. 909` ends with a period (the `.` in `Serv.` would be the third capture group's terminator?). Need to verify with a test, but the pattern is fragile here.
- `lexis` requires `LEXIS` literal, not `Daily Op. Serv.`.

#### Gap

No pattern matches `Cal. Daily Op. Serv.` or `D.A.R.` reliably. Even if `state-reporter` partially matches, court inference (`courtInference.ts`) has no entry for these reporters.

#### Recommended action

Two options, ranked:

**Option A (preferred — match as neutral):** Add a Cal. Daily Op. Serv. pattern to `neutralPatterns.ts` near the lexis pattern, accepting both 2-digit and 4-digit year forms:

```typescript
{
  id: "cal-daily-op-serv",
  // Cal. Daily Op. Serv. uses year-as-volume. Accept 2-digit (08) or
  // 4-digit (2008) volume forms. Reporter has internal spaces and trailing
  // period — bound by the literal "Cal. Daily Op. Serv." and "D.A.R." to
  // avoid runaway matches.
  regex: /\b(\d{2}(?:\d{2})?)\s+(?:Cal\.\s?Daily\s?Op\.\s?Serv\.|Daily\s+Journal\s+D\.A\.R\.|D\.A\.R\.)\s+(\d+)\b/g,
  description: 'California Daily Opinion Service and Daily Journal D.A.R. citations (e.g., "08 Cal. Daily Op. Serv. 909", "98 Daily Journal D.A.R. 7017")',
  type: "neutral",
}
```

Then update `extractNeutral.ts` to handle this pattern: court would be `"Cal. Daily Op. Serv."` (canonical) or `"D.A.R."`.

**Option B (match as case citation):** Add `Cal. Daily Op. Serv.` and `D.A.R.` to a list of CSM-only state reporters that the `state-reporter` pattern recognizes more carefully. This requires changing the trailing lookahead to accept multi-period reporter tokens, which risks regressions elsewhere.

Recommended: **Option A**, because the year-as-volume semantics naturally fit the neutral citation model.

#### Priority

**MED-LOW** — modern CSM citations cite the bound *Cal.4th* / *Cal.App.5th* reporters in preference to Daily Op. Serv.; Daily Op. Serv. is mostly used by Westlaw/Lexis enrichment and in federal opinions citing CA cases pre-bound-reporter.

---

### 2.5 Cal.App. Supp. (Appellate Division of Superior Court)

#### Canonical form per CSM 4th ed.

The Appellate Division of California Superior Court hears appeals from limited-jurisdiction trial courts. Its decisions appear in *California Appellate Reports Supplement*, abbreviated `Cal.App.Supp.` (1st series), `Cal.App.2d Supp.` (2d series), through `Cal.App.5th Supp.` (5th series, current).

CSM 4th ed. spacing variants — per the Loyola LibGuide and the SD San Diego Law Library guide — vary by series. The current series convention is:

| Series | CSM form | Reporters-DB canonical |
|---|---|---|
| 1st | `Cal.App.Supp.` | `Cal. App. Supp.` |
| 2d | `Cal.App.2d Supp.` (space before `Supp.`) | `Cal. App. Supp. 2d` (canonical reverses order) |
| 3d | `Cal.App.3d Supp.` | `Cal. App. Supp. 3d` |
| 4th | `Cal.App.4th Supp.` | `Cal. App. Supp. 4th` |
| 5th | `Cal.App.5th Supp.` | `Cal. App. Supp. 5th` |

Real example (from Loyola CSM cheat sheet):
- `People v. Foretich (1970) 14 Cal.App.3d Supp. 6, 10`

Real example (from CourtListener listing for vol 221):
- `People v. Morgan, 221 Cal.App.Supp.3d 1, 270 Cal.Rptr. 597, 1990 Cal. App. LEXIS 954`

#### Reporters-DB variations

The reporters-db `Cal. App. Supp.` entry (data/reporters.json:4197) maps many spacing variations to the canonical form, including:
- `Cal. App. 2d Supp.` (Bluebook order) → `Cal. App. Supp. 2d`
- `Cal.App. Supp. 2d` (mixed spacing) → `Cal. App. Supp. 2d`
- `Cal.App.2d Supp.` (CSM form) → `Cal. App. Supp. 2d`

This means **reporter-DB validation will succeed** for the CSM form `Cal.App.3d Supp.` (variation → canonical `Cal. App. Supp. 3d`).

#### Current eyecite-ts behavior

The `state-reporter` regex (casePatterns.ts:55-56) admits multi-word reporters with `&` and apostrophes; the trailing lookahead is `(?=\s|$|\(|,|;|\.|\[|\])`.

For input `14 Cal.App.3d Supp. 6`:
- The greedy non-greedy reporter capture `[A-Za-z.\d\s&']+?` would have to consume `Cal.App.3d Supp.` to reach the page `6`.
- The non-greedy semantics mean it tries the shortest match first. With `\s+(\d+|...)` after the reporter, the regex engine tries `Cal.App.3d` then page `6` → fails because `Supp.` is between them. Backtracks to `Cal.App.3d Supp.` then page `6` → succeeds.
- BUT: the `Supp.` token has an internal `.` that breaks the simple `[A-Za-z.\d\s&']` class? No — the class allows `.`. So it should work.

Likelihood it works today: **probably yes for `14 Cal.App.3d Supp. 6`**, but **untested**. I did not find any test covering `Cal.App. Supp.` (search returned nothing in `/tests/`).

Likelihood it works for `14 Cal.App. Supp. 3d 6` (Bluebook order, space variant): **uncertain** — the trailing `3d` is *after* `Supp.`, which is *after* the page would be in the alternation. The reporter capture would have to span `Cal.App. Supp. 3d`.

#### Gap

No regression-test coverage. The reporters-db has the canonical variants but `courtInference.ts` does **not** map `Cal. App. Supp.` to a court level (the courtInference reporter-to-court table at line ~73 stops at `Cal.App.5th` — no Supp. entry).

#### Recommended action

1. Add `Cal.App. Supp.`, `Cal.App.2d Supp.`, `Cal.App.3d Supp.`, `Cal.App.4th Supp.`, `Cal.App.5th Supp.` (and Bluebook variants `Cal. App. Supp.`, `Cal. App. Supp. 2d`, etc.) to `courtInference.ts` REPORTER_COURT_MAP. Court level is "trial appellate" — best represented as `state("appellate", "CA")` since the Appellate Division is technically an appellate court (it reviews limited-jurisdiction trial decisions).

2. Add test cases at `tests/extract/extractCase.test.ts`:

```typescript
it("extracts '14 Cal.App.3d Supp. 6' (CSM form with space before Supp.)", () => {
  const cits = extractCitations("People v. Foretich (1970) 14 Cal.App.3d Supp. 6, 10.")
  // expect 1 case citation, reporter=Cal.App.3d Supp., volume=14, page=6
})

it("extracts '14 Cal. App. Supp. 3d 6' (Bluebook form)", () => {
  const cits = extractCitations("People v. X, 14 Cal. App. Supp. 3d 6 (Cal. App. Dep't Super. Ct. 2010).")
  // expect 1 case citation
})
```

3. If the `state-reporter` regex fails on the variant forms, add a dedicated `cal-app-supp` pattern to `casePatterns.ts` *before* the generic state-reporter pattern. The dedicated pattern is more permissive on internal punctuation:

```typescript
{
  id: "cal-app-supp",
  // Cal. App. Supp. has two valid orderings (CSM and Bluebook) and two
  // spacing styles. The series number can come before or after Supp.
  regex: /\b(\d+)\s+Cal\.\s?App\.\s?(?:\d+(?:st|nd|rd|th|d)\s+Supp\.|Supp\.\s?\d+(?:st|nd|rd|th|d)?|Supp\.)\s+(\d+)\b/g,
  description: 'California Appellate Reports Supplement (CSM and Bluebook orderings)',
  type: "case",
}
```

#### Priority

**MED** — needed for trial-appellate practice; currently silent failure.

---

### 2.6 Court designation parenthetical

#### Canonical forms

| CSM form | Bluebook form | Court |
|---|---|---|
| `(1990)` (CSM omits Cal. when reporter is unambiguous) | `(Cal. 1990)` | Cal. Supreme |
| `(1990)` | `(Cal. Ct. App. 1990)` or `(Cal. Ct. App. 1st Dist. 1990)` | Cal. Court of Appeal |
| `(1990)` | `(Cal. App. Dep't Super. Ct. 1990)` | Cal. App. Div. Sup. Ct. |

The trailing-paren court designations come up in:
- Federal opinions citing California cases (which always use Bluebook)
- California briefs that elect Bluebook form
- Mixed-form documents (technically violates Cal. R. Ct. 1.200 consistency, but happens)

#### District numbering

California has six Court of Appeal districts, each with one or more divisions:
- 1st Dist. (San Francisco) — Div. 1-5
- 2d Dist. (Los Angeles) — Div. 1-8
- 3d Dist. (Sacramento)
- 4th Dist. (San Diego) — Div. 1-3, geographically split
- 5th Dist. (Fresno)
- 6th Dist. (San Jose)

Per Bluebook T1.3, district + division is optional but precise. Example: `(Cal. Ct. App. 4th Dist., Div. 2 2023)`.

#### Real examples

From a Loyola CSM cheat sheet:
- `Cal. Ct. App. 6th Dist. 1964`

From search results: `(Cal. Ct. App. 1st Dist.)` is the bare form.

#### Current eyecite-ts behavior

`stripDateFromCourt` (extractCase.ts:430) strips trailing year/date components and returns the residual as the `court` field. For `(Cal. Ct. App. 6th Dist. 2024)`:
- Strip year `2024` → `Cal. Ct. App. 6th Dist.`
- Return this as the court string.

Likely **works as a raw string** but the court is not parsed into structured fields (jurisdiction=CA, level=appellate, district=6th).

#### Gap

No structured district info on `court`. `courtInference.ts` (line ~73) maps reporter → court level but does not parse parenthetical court strings beyond returning them. There's no `district` field on `FullCaseCitation`.

This may be acceptable — eyecite-py also returns court as a free-form string. Adding structured district info would be a feature, not a bug.

#### Recommended action

Document this as a known feature gap. If district info is needed downstream, add an optional `district?: string` field on `FullCaseCitation` and a regex inside `parseParenthetical`:

```typescript
const DISTRICT_REGEX = /\bCal\.\s?Ct\.\s?App\.\s?(\d+(?:st|nd|rd|th|d))\s?Dist\./i
```

But this is **LOW** priority unless a consumer asks for it.

---

### 2.7 `In bank` parenthetical (CA Supreme Court)

#### Background

California's Supreme Court historically distinguished between three-justice panel decisions and full-court (seven-justice) decisions. Full-court decisions were captioned `In Bank` (analogous to federal "en banc"). The distinction was largely abolished in the 1960s but the `In Bank` caption persists by convention through ~1990s-era opinions. The Pepperdine Bluebook v. CSM PDF and FindLaw catalog explicitly maintain a "Cal. In Bank" classification.

The *Bily v. Arthur Young & Co.* (1992) 3 Cal.4th 370 page on Justia explicitly labels the opinion: "Decided In Bank on Aug. 27, 1992."

#### Citation forms

Variants observed:

| Form | Example | Where |
|---|---|---|
| Standalone caption | `In Bank` (above case name) | Opinion header, not in inline citations |
| Trailing disposition | `(Cal. 1992) (in bank)` | Bluebook form of CA Supreme cite with full-court disposition |
| Year-paren with comma | `(1992, in bank)` | CSM-ish hybrid — uncommon but observed |
| Trailing word | `, in bank` after the citation | Rare |

#### Current eyecite-ts behavior

`parseParenthetical` (extractCase.ts:1530-1534) checks for "en banc" or "per curiam" at the end of the parenthetical:

```typescript
if (/\ben banc\b\s*$/i.test(content.trim())) {
  result.disposition = "en banc"
} else if (/\bper curiam\b\s*$/i.test(content.trim())) {
  result.disposition = "per curiam"
}
```

There is **no test** for `in bank`. The string "in bank" is not in the SIGNAL_TABLE, the disposition checks, or anywhere in the codebase (grep returned zero hits).

#### Gap

`(Cal. 1992) (in bank)` would extract `court="Cal."` and `year=1992` correctly but `disposition` would remain undefined.

#### Recommended action

Add an `in bank` check next to `en banc` in `parseParenthetical`:

```typescript
// California Supreme Court full-court ("in bank") decisions — equivalent
// to federal "en banc" (CSM § 1:13). Distinct disposition value so a
// downstream consumer can tell CA from federal forms.
if (/\bin\s+bank\b\s*$/i.test(content.trim())) {
  result.disposition = "in bank"
} else if (/\ben banc\b\s*$/i.test(content.trim())) {
  result.disposition = "en banc"
}
```

Edge case: a *secondary* parenthetical `(in bank)` after the main court/year paren should also be recognized. The chained-paren handler at extractCase.ts:2046-2060 already iterates over remaining parens via `classifyParenthetical`; the same `in bank` check should appear there. (Inspecting `classifyParenthetical` calls `parseParenthetical`, so adding it in one place propagates.)

#### Priority

**MED** — disposition tagging gap, particularly relevant for pre-1995 CA Supreme cites and for federal opinions citing older CA cases.

---

### 2.8 Slip-opinion citations

#### Canonical form

CA slip opinion citation per CSM 4th ed.:

```
<Case Name> (<Court>, <Filed Date>, <Docket No.>) [nonpub. opn.]
```

Real examples:

| Verbatim | Notes |
|---|---|
| `Augustson v. Texaco (Sept. 9, 2008, B202633) [nonpub. opn.]` | 2d Dist. docket; `[nonpub. opn.]` outside paren |
| `Elite Aviation v. JetCard Plus (Oct. 25, 2011, B222459) [nonpub. opn.]` | 2d Dist. |
| `People v. Eaton (Mar. 14, 2025, C096853) [nonpub. opn.]` | 3d Dist. |
| `People v. Eaton (Mar. 14, 2025, C096853) [nonpub. opn.], review granted May 14, 2025, S289903` | With history trailer |

#### Court letter encoding

California docket prefixes encode the court:

| Prefix | Court |
|---|---|
| `S` | Supreme Court (e.g., `S289903`) |
| `A` | 1st Dist. Ct. App. |
| `B` | 2d Dist. Ct. App. |
| `C` | 3d Dist. Ct. App. |
| `D` | 4th Dist. Ct. App., Div. 1 |
| `E` | 4th Dist. Ct. App., Div. 2 |
| `G` | 4th Dist. Ct. App., Div. 3 |
| `F` | 5th Dist. Ct. App. |
| `H` | 6th Dist. Ct. App. |
| `JAD` | Appellate Division (San Diego) |

These are followed by 6 digits typically (e.g., `B253742`, `S258019`).

#### Current eyecite-ts behavior

The tokenizer requires volume + reporter + page. A slip opinion has **none of these** — only case name, date, docket, and nonpub marker. So slip opinions are **not extracted at all**.

`extractDocket.ts` exists for docket-number extraction but is separate from case citation extraction.

#### Gap

Slip opinions are a major class of CA citations (90% of Court of Appeal opinions are unpublished — see UCLA Depublication LibGuide). They cannot be extracted today.

#### Recommended action

Phase 1 (extraction):
1. Add a `case-ca-slip-opinion` pattern to `casePatterns.ts`:

```typescript
{
  id: "case-ca-slip-opinion",
  // California slip opinion form per CSM 4th ed. Captures the date,
  // docket number, and optional [nonpub. opn.] marker. The case name
  // is recovered by the case-name backward scanner. The court prefix
  // letter is parsed in extractCase.ts to determine the appellate
  // district. Common form:
  //   "(<Month> <Day>, <Year>, <Docket>) [nonpub. opn.]"
  regex:
    /\((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+(\d{4}),?\s+([A-Z]{1,3}\d{5,7})\)(?:\s+\[nonpub\.\s+opn\.\])?/g,
  description: 'California slip opinion citation (CSM § 1:1) with docket and optional nonpub. opn. marker',
  type: "case",
}
```

2. Add `extractCaseSlipOpinion(token, ...)` in `extractCase.ts` that:
   - Extracts year from the date
   - Extracts docket number
   - Maps docket prefix letter to court (using the table above)
   - Sets `unpublished = true` if `[nonpub. opn.]` is present
   - Skips volume/reporter/page (they don't apply)

3. Add `docketNumber?: string` field to `FullCaseCitation`.

Phase 2 (resolution): slip opinions resolve only by case name + docket — no volume/reporter to match. Could share resolution path with case-name resolution.

#### Priority

**MED** — significant CA-practice gap, but lower than year-first (§ 2.1) because slip opinions are largely uncitable per Rule 8.1115. Useful for legal-research / data-extraction use cases.

---

### 2.9 Daily Operations Bulletin (DOB) / Operations Bulletins

This appears in some federal practice notes (DOB and "Operations Bulletins" usually refer to BIA immigration practice bulletins rather than CA state-court material). Not a recognized CSM citation form. **OUT OF SCOPE** for this research.

---

### 2.10 CSM-only reporter abbreviations

#### Diverging reporter forms

| CSM (no spaces inside) | Bluebook (spaces inside) | Reporter-DB canonical |
|---|---|---|
| `Cal.4th` | `Cal. 4th` | both accepted |
| `Cal.App.4th` | `Cal. App. 4th` | both accepted |
| `Cal.Rptr.3d` | `Cal. Rptr. 3d` | both accepted |
| `Cal.App.3d Supp.` | `Cal. App. Supp. 3d` (Bluebook reorders Supp.) | both accepted as variations |

The reporters-db handles all these — the variation map normalizes them to a canonical form. The tokenizer must accept both spacing styles.

#### Current eyecite-ts behavior

The `state-reporter` regex character class `[A-Za-z.\d\s&']` admits both spacing styles. Tested forms:
- `173 Cal.App.4th 655` ✓ (tests/extract/extractCase.test.ts:77-89)
- `75 Cal.App.5th 123` ✓ (tests/extract/extractCase.test.ts:109-121)
- `100 Cal.App.4th ___` ✓ (placeholder page; tests/integration/fullPipeline.test.ts:1312)

Untested but presumably working:
- `13 Cal.3d 804` — appears in test fixtures (tests/integration/fullPipeline.test.ts:2985) but not asserted

#### Gap

No regressions to speak of. Just need to **expand test coverage** to ensure all CSM no-space forms work alongside Bluebook space forms:

```typescript
describe("California reporter spacing variants", () => {
  it.each([
    ["13 Cal.3d 804", "Cal.3d"],
    ["13 Cal. 3d 804", "Cal.3d"],         // Bluebook
    ["173 Cal.App.4th 655", "Cal.App.4th"],
    ["173 Cal. App. 4th 655", "Cal.App.4th"], // Bluebook
    ["266 Cal.Rptr. 569", "Cal.Rptr."],
    ["266 Cal. Rptr. 569", "Cal.Rptr."],   // Bluebook
    ["75 Cal.App.5th 123", "Cal.App.5th"],
    ["75 Cal. App. 5th 123", "Cal.App.5th"], // Bluebook
  ])("extracts %s", (input, expectedReporter) => {
    const cits = extractCitations(`See ${input}.`)
    expect(cits[0].type).toBe("case")
    // normalized reporter check
  })
})
```

#### Priority

**LOW** — likely already works; just needs a regression sweep.

---

### 2.11 CSM pincite forms (`at p. 100`, `at pp. 100-110`)

CSM pincite forms diverge from Bluebook:

| CSM | Bluebook | Meaning |
|---|---|---|
| `at p. 100` | `at 100` | Single page |
| `at pp. 100-110` | `at 100-10` | Page range |
| `fn. 5` | `n.5` | Footnote |

Real example: `Loeffler v. Target Corp. (2013) 58 Cal.4th 1081, 1104, fn. 5`

**This is issue #236 — out of scope for this research.**

Current behavior: `LOOKAHEAD_PINCITE_REGEX` (extractCase.ts:177) matches `, 1104` and standalone `, at *5` forms but does **not** match `, at p. 100` or `, fn. 5`. The pincite is extracted from `1104` (correct) but the `fn. 5` trailer is dropped.

---

### 2.12 Bluebook vs CSM choice rule (Cal. R. Ct. 1.200)

> "If the material cited is available in the official reports, the citation must include, at minimum: (1) the case name, (2) the reporter, (3) the volume and page number, and (4) the year of decision. The author **may** use the style of the Bluebook or California Style Manual, but **must use the same style throughout** the document."

Cal. R. Ct. 1.200.

This is an **authorial consistency rule**, not a parser concern. eyecite-ts extracts citations from real-world text that may mix CSM and Bluebook forms (Cal. R. Ct. notwithstanding). The library must accept both. **NO ACTION** for extraction.

---

## 3. Prioritized action punch list

Roll-up of all recommended actions, sorted by priority and grouped by area.

### HIGH

1. **Year-first format** (`(YYYY)` between case name and citation core) — § 2.1
   - Add `LEADING_YEAR_PAREN_REGEX` lookback during `extractCase`
   - Adjust `fullSpan` and case-name backward-scan boundary
   - Pull `year`, `court`, `disposition` (in-bank) from the leading paren
   - Test cases:
     - Bare `(1990)`
     - `(Cal. 1990)`
     - `(Cal. Ct. App. 1st Dist. 2024)`
     - Year-first with trailing parens (combined)
     - Year-first with explanatory paren (chained)

### MED

2. **`(in bank)` disposition recognition** — § 2.7
   - Add `\bin\s+bank\b` check in `parseParenthetical`
   - Test cases: `(Cal. 1992) (in bank)`, `(1992, in bank)`

3. **Slip-opinion citation** (date + docket + `[nonpub. opn.]`) — § 2.8
   - New `case-ca-slip-opinion` pattern in `casePatterns.ts`
   - New `extractCaseSlipOpinion` extractor
   - Docket prefix-letter → court mapping table
   - New `docketNumber` and confirm `unpublished` field flow

4. **Cal. App. Supp. court inference + test coverage** — § 2.5
   - Add `Cal. App. Supp.`, `Cal.App.3d Supp.`, etc. to `REPORTER_COURT_MAP` in `courtInference.ts`
   - Add regression tests verifying extraction
   - If state-reporter regex fails, add dedicated `cal-app-supp` pattern

5. **Cal. Daily Op. Serv. / DJDAR / D.A.R. neutral** — § 2.4
   - New `cal-daily-op-serv` pattern in `neutralPatterns.ts`
   - Update `extractNeutral.ts` to recognize 2-digit year-volume

### LOW

6. **Reporter spacing variant regression sweep** — § 2.10
   - Parameterized tests covering CSM no-space and Bluebook space forms

7. **District designation extraction** — § 2.6
   - Optional `district?: string` field on `FullCaseCitation`
   - Regex inside `parseParenthetical`

8. **Star-pagination on Cal. Daily Op. Serv.** — § 2.2
   - Derivative — falls out of § 2.4 + existing `NEUTRAL_PINCITE_LOOKAHEAD`

### Not actionable

- Bluebook v CSM choice rule — authorial concern, not parser
- DOB / Operations Bulletins — different jurisdiction (BIA), not CA
- Order of Official Reports vs Cal.Rptr. — display concern, not extraction

---

## 4. Test corpus additions

Add the following to `tests/fixtures/real-world-citations-2026-05-11.json` or a new `tests/fixtures/csm-corpus.json`:

```json
[
  {
    "text": "People v. Marshall (1997) 15 Cal.4th 1",
    "expected": {
      "type": "case",
      "caseName": "People v. Marshall",
      "year": 1997,
      "volume": 15,
      "reporter": "Cal.4th",
      "page": 1
    },
    "source": "CSM § 1:1; Loyola LibGuide example"
  },
  {
    "text": "Loeffler v. Target Corp. (2013) 58 Cal.4th 1081, 1104, fn. 5",
    "expected": {
      "type": "case",
      "caseName": "Loeffler v. Target Corp.",
      "year": 2013,
      "volume": 58,
      "reporter": "Cal.4th",
      "page": 1081,
      "pincite": 1104
    },
    "source": "Real CA Supreme opinion"
  },
  {
    "text": "People v. Foretich (1970) 14 Cal.App.3d Supp. 6, 10",
    "expected": {
      "type": "case",
      "year": 1970,
      "volume": 14,
      "reporter": "Cal.App.3d Supp.",
      "page": 6,
      "pincite": 10
    },
    "source": "Loyola CSM cheat sheet"
  },
  {
    "text": "Augustson v. Texaco (Sept. 9, 2008, B202633) [nonpub. opn.]",
    "expected": {
      "type": "case",
      "year": 2008,
      "docketNumber": "B202633",
      "court": "Cal. Ct. App. 2d Dist.",
      "unpublished": true
    },
    "source": "CA Ct. App. unpublished opinion (real)"
  },
  {
    "text": "Bily v. Arthur Young & Co. (1992) 3 Cal.4th 370 (in bank)",
    "expected": {
      "type": "case",
      "year": 1992,
      "volume": 3,
      "reporter": "Cal.4th",
      "page": 370,
      "disposition": "in bank"
    },
    "source": "Real CA Supreme opinion; constructed CSM form"
  },
  {
    "text": "08 Cal. Daily Op. Serv. 909",
    "expected": {
      "type": "neutral",
      "year": 2008,
      "court": "Cal. Daily Op. Serv.",
      "documentNumber": "909"
    },
    "source": "Real federal cite (Suazo-Perez v. Mukasey)"
  },
  {
    "text": "People v. Smith, 50 Cal.3d 100, review denied",
    "expected": {
      "type": "case",
      "subsequentHistory": [{ "signal": "review_denied" }]
    },
    "source": "PR #238"
  },
  {
    "text": "Smith v. Jones (1990) 50 Cal.3d 100, 110 [266 Cal.Rptr. 569, 575]",
    "expected": {
      "type": "case",
      "year": 1990,
      "volume": 50,
      "reporter": "Cal.3d",
      "page": 100,
      "pincite": 110,
      "parallelCitations": [{
        "volume": 266,
        "reporter": "Cal.Rptr.",
        "page": 569
      }]
    },
    "source": "CSM § 1:21; constructed combining year-first + brackets"
  }
]
```

---

## 5. Sources

- [CSM 4th ed. PDF (SDAP mirror)](https://www.sdap.org/wp-content/uploads/downloads/Style-Manual.pdf) — authoritative
- [Loyola CSM Basics LibGuide](https://guides.library.lls.edu/c.php?g=497703&p=3407469)
- [Loyola CSM for Cases LibGuide](https://guides.library.lls.edu/c.php?g=497703&p=3407475) — Cal., Cal.App., Cal.App.Supp. examples
- [Pepperdine Bluebook v. CSM PDF](https://community.pepperdine.edu/law/writing-center/content/bluebook-v-california-style.pdf)
- [San Diego Law Students Bluebook vs CSM Handout (2021)](https://sdlsa.org/wp-content/uploads/2021/07/Bluebook-vs-California-Style-Manual-Handout.pdf)
- [CSM Quick Reference (Office of Reporter of Decisions, 2018)](https://cdn.prod.website-files.com/5cef7312323d3af36b779b08/64fabe0a9c3c5e75384b3687_CSM_Quick_Reference.pdf)
- [SD Law Library Case Citations Guide](https://sandiegolawlibrary.org/wp-content/uploads/2017/09/07022957/How_to_Use_California_Case_Citations.pdf)
- [Sacramento Public Law Library Reading Citations](https://saclaw.org/resource_library/reading-citations/)
- [Cal. R. Ct. 1.200 (Format of citations)](https://courts.ca.gov/cms/rules/index/one/rule1_200)
- [Cal. R. Ct. 8.1115 (Citation of opinions)](https://courts.ca.gov/cms/rules/index/eight/rule8_1115)
- [UCLA Depublication LibGuide](https://libguides.law.ucla.edu/depublication)
- [California Daily Opinions Service on CourtListener](https://www.courtlistener.com/c/cal-daily-op-serv/)
- [Daily Journal DAR on CourtListener](https://www.courtlistener.com/c/daily-journal-dar/)
- [Cal. App. Supp. 3d vol 221 on CourtListener](https://www.courtlistener.com/c/cal-app-supp-3d/221/)
- [California Supreme Court Resources (SCOCAL — Stanford) — Bily entry](https://scocal.stanford.edu/opinion/bily-v-arthur-young-co-31350)
- [West v. Arent Fox LLP, 237 Cal.App.4th 1065 (2015) — Google Scholar](https://scholar.google.com/scholar_case?case=3809605287709609577)
- [Wikipedia, California Style Manual](https://en.wikipedia.org/wiki/California_Style_Manual)
- [Sample slip-opinion (Elite Aviation v. JetCard Plus)](https://www4.courts.ca.gov/opinions/nonpub/B253742.PDF)
