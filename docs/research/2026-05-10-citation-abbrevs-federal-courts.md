# Citation Abbreviations & Style Quirks: Federal Courts (Regular)

Research date: 2026-05-10
Scope: U.S. Supreme Court, U.S. Courts of Appeals (1st-11th, D.C. Cir., Fed. Cir.), and U.S. District Courts (all 94 districts, including specialty districts E.D.N.Y., S.D.N.Y., C.D. Cal., etc.).

## Summary

The vast majority of federal-court abbreviations encountered immediately before a citation core are already covered by either the existing `CASE_NAME_ABBREVS` set (T6/T7/T10 stems) or by Tier 3 (internal-period dotted initialism). Real federal opinion text overwhelmingly produces three kinds of pre-cite tokens:

1. **Dotted-initialism court designators** (`U.S.`, `S. Ct.`, `D.D.C.`, `S.D.N.Y.`, `D.C.`, `2d Cir.`, etc.) — these all contain a period followed by a letter and thus are auto-caught by Tier 3.
2. **Bluebook T6 corporate / institutional words** (`Inc.`, `Co.`, `Corp.`, `Ass'n`, `Bros.`, `Bankr.`, `Comm'r`, `Sec'y`, `Dep't`, `Fed.`, `Nat'l`) — all already present.
3. **State / geographic abbreviations** (`Mass.`, `Cal.`, `N.Y.`, `Tex.`) — present (or auto-Tier-3 for the dotted forms).

After auditing real SCOTUS, circuit, and district opinions, only one non-trivial federal-practice gap surfaces: **`Att'y` / `atty`** (Attorney). It appears constantly in federal captions as "Att'y Gen." against federal officials (e.g., "N.J. Bankers Ass'n v. Att'y Gen., 49 F.4th 849 (3d Cir. 2022)") and is currently NOT in the set. Tier 3 does not catch it because "Att'y" — once stripped of its apostrophe — produces the bare stem "atty" with no internal period.

The remaining federal-court style quirks (slip opinions, ECF cites, Westlaw cites, "per curiam", "Mem.") do not affect the backward-scanning abbreviation check because their tokens appear either as part of the citation core itself or as parentheticals AFTER the cite. They are reported below as informational style quirks but do not require new stems.

---

## Note: What's Auto-Handled by Tier 3 (Dotted Initialisms)

Tier 3 (`/\.[A-Za-z]/.test(word)`) catches any token containing an internal period followed by a letter. The following federal-court abbreviations are therefore already handled and **must not** be added as stems:

| Abbreviation | Court / meaning | Auto-handled? |
| --- | --- | --- |
| `U.S.` | United States Reports / U.S. Supreme Court | Yes |
| `S. Ct.` | Supreme Court Reporter (when scanned as `S.Ct.` or after seeing `S.`) | Yes — `S.` matches Tier 3 (single-letter initial) |
| `L. Ed.` / `L. Ed. 2d` | Lawyers' Edition | `L.` Tier 2 / `Ed.` already in set |
| `D.C. Cir.` | D.C. Circuit | `D.C.` Tier 3; `Cir.` in set |
| `Fed. Cir.` | Federal Circuit | `Fed.` and `Cir.` both in set |
| `D.D.C.` | D.D.C. | Tier 3 |
| `S.D.N.Y.` / `E.D.N.Y.` | districts of New York | Tier 3 |
| `C.D. Cal.` / `N.D. Cal.` / `E.D. Cal.` / `S.D. Cal.` | districts of California | Tier 3 (`C.D.` etc.) + `Cal.` in set |
| `N.D. Ohio` / `S.D. Ohio` / `E.D. Mo.` | other districts | Tier 3 + state stem |
| `B.A.P.` | Bankruptcy Appellate Panel | Tier 3 |
| `Ct. App.` / `App. D.C.` / `Ct. Cl.` | court parens | All stems already present (`ct`, `app`, `cl`) |
| `F.2d` / `F.3d` / `F. Supp.` / `F. Supp. 2d` / `F. Supp. 3d` | Federal Reporter / F. Supp. | `F.` Tier 2; `Supp.` in set |
| `Fed. Cl.` | Court of Federal Claims | `Fed.` + `Cl.` both in set |
| `Bankr. C.D. Cal.` | Bankruptcy court | `Bankr.` in set; `C.D.` Tier 3 |

---

## Per-Court Findings

### U.S. Supreme Court

| Stem | Full word | Source | Risk | Example caption |
| --- | --- | --- | --- | --- |
| `atty` | Attorney / Att'y | Bluebook T6, T10; SCOTUS bound volumes | Low — never a sentence-end word | `Cuomo, Att'y Gen. of N.Y. v. Clearing House Ass'n, 557 U.S. 519 (2009)` |

Notes on SCOTUS caption conventions confirmed by research:
- **"United States v. X" and "X v. United States"**: the literal phrase "United States" appears un-abbreviated; the backward scanner never needs an abbreviation rule for "United" or "States" because they are not single-period tokens.
- **Parallel cites** `___ U.S. ___, 140 S. Ct. 1234 (2020)`: all underscores in placeholders + `S. Ct.` are handled (existing stems and Tier 2/3).
- **(per curiam)** marker: appears INSIDE the parenthetical after the citation core, so it does not interact with the backward case-name scan.
- **Slip opinion**: `No. 19-123, slip op. at 5 (Mar. 1, 2020)` — `op.` is already a stem (line 724); `slip` does not end with a period; `Mar.` is handled in `dates.ts`.

### Circuit Courts of Appeals (1st–11th, D.C. Cir., Fed. Cir.)

All circuit-court court parens (`(1st Cir. 2001)` through `(11th Cir.)`, `(D.C. Cir.)`, `(Fed. Cir.)`) are constructed exclusively from tokens that are either (a) in the set (`cir`, `fed`) or (b) caught by Tier 3 (`D.C.`). No new stems are needed for circuit-court court parens.

Caption-side: same `atty` gap applies (e.g., "Att'y Gen." in countless circuit captions).

### U.S. District Courts (all 94 districts, including specialty districts E.D.N.Y., S.D.N.Y., C.D. Cal., etc.)

All 94 district designators are dotted initialisms beginning with `D.`, `E.D.`, `W.D.`, `N.D.`, `S.D.`, `M.D.`, or `C.D.` and followed by a state abbreviation (which is already a stem or, in the case of `D.C.`, itself a dotted initialism). All 94 are therefore auto-handled.

Sub-court qualifiers that may appear in district-court court parens:
- `Bankr.` — already in set (line 419).
- `Magis.` / `Mag.` — already in set (`magis`, line 668; `mag`, line 529).
- The `J.` / `C.J.` / `Sr. J.` / `Magis. J.` judge titles appear in concurrence/dissent attributions AFTER the citation core, not in the backward-scan path.

---

## Federal Practice Citation Quirks

These are documented for completeness but do **not** require new stems because they sit on the wrong side of the citation core or are already handled.

1. **Supreme Court parallel cites**: `___ U.S. ___, 140 S. Ct. 1234 (2020)`. The underscores and `S. Ct.` form is already handled.

2. **"F.Supp.2d" vs "F. Supp. 2d" spacing inconsistency**: some opinions write `F.Supp.2d` with no internal spaces. eyecite-ts already tokenizes both via reporters-db. Confirmed by inspecting `data/reporters.json` patterns.

3. **Slip opinion form**: `Smith v. Jones, No. 19-123, slip op. at 5 (D.D.C. Mar. 1, 2020)`. Tokens `No.`, `slip`, `op.`, `at`, `Mar.`, `D.D.C.` are all either already handled, plain words, or dotted initialisms.

4. **Westlaw / LEXIS cites**: `Smith v. Jones, No. 19-cv-01234, 2020 WL 1234567, at *3 (S.D.N.Y. Mar. 1, 2020)`. `WL`, `at`, `*N`, and digit tokens are not periodic words; `No.` and `S.D.N.Y.` are handled.

5. **(per curiam) / (en banc) / (mem.) suffix parentheticals**: appear AFTER the cite, not before.

6. **ECF / docket cites in opinion bodies**: `ECF No. 42 at 5`. `ECF` has no period; `No.` is handled. Not a backward-scan concern.

7. **Court of International Trade slip op. number**: `Slip Op. 26-47`. Capitalized "Slip Op." appears as a complete citation token; `Op.` already a stem.

8. **Sealed-party / pseudonym conventions**: `Doe v. ABC Corp.`, `John Doe 1 v. United States`. No periods until you hit the citation core.

9. **SCOTUSblog / law-review cite forms**: same Bluebook abbreviations; no novel tokens.

10. **"Cf.", "See", "See also", "Accord" introductory signals**: these are bare words without periods (or with handled periods like `Cf.`); the existing extractor handles them separately as signals.

---

## Top Recommendations (Prioritized)

### MUST-ADD (1 stem)

```
"atty"   // Attorney / Att'y — e.g., "Att'y Gen.", "U.S. Att'y", "Sec'y v. Att'y Gen."
```

Apostrophe-form stem (matches `atty`, `att'y` after the existing `replace(/['.]/g, "")`).

**Verification captions** (all real, sourced above):
- *N.J. Bankers Ass'n v. Att'y Gen.*, 49 F.4th 849 (3d Cir. 2022)
- *Cuomo, Att'y Gen. of N.Y. v. Clearing House Ass'n*, 557 U.S. 519 (2009)
- *U.S. Att'y for S. Dist. of N.Y. v. ...* (used routinely in district orders)

False-positive risk: **very low**. "Atty" is not a common English sentence-ending word; "att'y" is never one.

### NICE-TO-HAVE (0 new stems)

No other federal-court gaps were identified. The federal-court coverage of `CASE_NAME_ABBREVS` plus Tier 3 is already comprehensive.

### NOT TO ADD (reject list)

- Anything dotted-initialism (Tier 3 handles).
- `mem` (Memorandum) — appears INSIDE the post-cite parenthetical `(mem.)`, never in caption before cite.
- `slip` — no trailing period.
- `ecf` — no period.
- `wl` — no period; would also collide with "wl" never being a meaningful boundary word.
- `usca` / `usdc` — these are *file-system* abbreviations for docket headers, not caption tokens; risk of false positives.
- `per` / `curiam` — appears post-cite.
- `cust` — Court of Customs/Patent Appeals is a specialty court, outside this agent's scope.
- `vet` / `armed` / `forces` — specialty courts.

---

## Sources

- The Bluebook 21st ed., Tables T1.1, T6, T7, T10.
- [University of Akron Bluebook Quick Reference — Federal Court Abbreviations](https://libguides.uakron.edu/bluebook/federalabbreviations)
- [University of Akron Bluebook Quick Reference — Other Federal Court Abbreviations](https://libguides.uakron.edu/c.php?g=627783&p=4379902)
- [Loyola Chicago Bluebook Guide — Federal Cases](https://lawlibguides.luc.edu/bluebook/cases/federal)
- [Georgetown Law Library Bluebook Guide — Federal Courts](https://guides.ll.georgetown.edu/c.php?g=261289&p=2339383)
- [Legal Bluebook v21 — T1 United States Jurisdictions (index)](https://www.legalbluebook.com/bluebook/v21/tables/t1-united-states-jurisdictions)
- [NACTT Academy — Common Legal Citations for Bankruptcy Practice](https://considerchapter13.org/2016/02/07/in-your-cites-a-quick-refresher-of-common-legal-citations-for-your-bankruptcy-practice/)
- [freelawproject/reporters-db case_name_abbreviations.json](https://github.com/freelawproject/reporters-db/blob/main/reporters_db/data/case_name_abbreviations.json)
- [South Carolina Law — Citing Federal Cases (Westlaw/WL form)](https://guides.law.sc.edu/LRAWSpring/LRAW/citingfedcases)
- [Cornell LII — How to Cite Judicial Opinions (judge titles "J.", "C.J.")](https://www.law.cornell.edu/citation/2-200)
- [Federal Rules of Bankruptcy Procedure Rule 1005 — caption format](https://www.law.cornell.edu/rules/frbp/rule_1005)
- Sample real captions from Justia (Supreme Court center) and supremecourt.gov bound volumes.
