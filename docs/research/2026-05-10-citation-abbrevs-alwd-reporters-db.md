# Citation Abbreviations Authoritative Sweep: ALWD + Bluebook 21st + reporters-db

**Research date:** 2026-05-10
**Scope:** Audit primary citation reference sources for any case-name abbreviation stems missing from `src/extract/extractCase.ts`'s `CASE_NAME_ABBREVS` set (367 stems as of May 2026).
**Authoritative sources:** freelawproject/reporters-db, ALWD Guide to Legal Citation 7th ed. (2021), Bluebook 21st ed. (2020), Penn State Bluebook T6 mirror (timed out), YourDictionary T6 list, access-to-law.com 21st-ed merger commentary, UW Law Library 21st-ed change table, Marquette/Cornell/NYU LibGuides, Wikipedia legal abbreviations.

## Summary

The existing eyecite-ts `CASE_NAME_ABBREVS` set is **already very well-aligned with reporters-db** — only 3 stems normalize differently (`rr`, `ss`, `us`), and all 3 are already auto-handled by Tier 3 (internal-period dotted initialism). The gap analysis therefore focuses on:

1. **Bluebook 21st edition T6/T13 merger additions** — When the 21st ed. (2020) merged T13.2 (periodicals) into T6 (case names), it added words that historically appeared only in periodical titles but now formally apply to case names and institutional authors. Several of these surface in modern litigation captions (e.g., "Pol'y" for Policy, "Stud." for Studies, "Libr." for Library).
2. **Bluebook 21st edition new-word additions** — entirely new abbreviations introduced in 2020: `A.I.` (Artificial Intelligence), `Lab'y` (Laboratory, distinct from `Lab.` Labor), `Nat'y` (Nationality), `Socio.` (Sociology, distinct from `Soc.` Social), `Refin.` (Refining, distinct from `Ref.` Referee/Refining-old).
3. **Bluebook BT1.2 court-document party designations** — `Pet'r` (Petitioner) and `Resp't` (Respondent) appear in case captions for habeas, immigration, and administrative appeals.
4. **ALWD-specific deltas** — ALWD 5th ed. and later capitulated to Bluebook contraction forms (e.g., `Ass'n` over historical ALWD `Assn.`). Since eyecite-ts already strips apostrophes before set lookup, the apostrophe-form/period-form distinction is moot — both map to the same stem. **No ALWD-only stems are needed beyond what Bluebook covers.**

**Net new high-confidence stems to add: 16** (excluding 3 redundant dotted initialisms already handled by Tier 3).

## Section A: freelawproject/reporters-db Gap Analysis

Source: `https://github.com/freelawproject/reporters-db/blob/main/reporters_db/data/case_name_abbreviations.json` (190 entries, fetched 2026-05-10).

**Normalization rule:** lowercase, strip periods/apostrophes/curly-apostrophes.

After normalizing all 190 reporters-db keys and comparing against the 367 stems in `CASE_NAME_ABBREVS`, **only 3 stems are missing**:

| Stem | reporters-db Entry | Full Word | Already covered by | Risk |
|------|--------------------|-----------|--------------------|------|
| `rr` | `R.R.` | Railroad | Tier 3 (dotted initialism) | None — redundant |
| `ss` | `S.S.` | Steamship/Steamships | Tier 3 (dotted initialism) | None — redundant |
| `us` | `U.S.` | United States | Tier 3 (dotted initialism) | None — redundant |

**Conclusion for Section A:** No action needed. All 187 single-stem reporters-db abbreviations are present. The 3 dotted initialisms are auto-handled by Tier 3 of `isLikelyAbbreviationPeriod`, which detects words containing internal periods (`N.Y.`, `U.S.`, `D.C.`). Adding them explicitly would add belt-and-suspenders safety with no downside, but offers no functional improvement.

Also reviewed: `reporters.json` (1,235 reporter entries) and `regexes.json` — these contain reporter abbreviations (e.g., `Cal. App.`, `Mass. Rep.`) and citation regex fragments, but the *single-word stems* used mid-party-name are all the same words already covered by `CASE_NAME_ABBREVS` (state codes, court types, etc.).

The Python parent `eyecite` does NOT use a stem-set approach (see Section D below) — so there is no equivalent "list" to diff against in the Python source. reporters-db remains the closest authoritative analog.

## Section B: ALWD Guide 7th ed. Deltas

Source: ALWD Guide to Legal Citation 7th ed. (2021), Appendix 3(E) "Abbreviations for Case Names" (paid resource, content gathered indirectly via library guides and commentary).

**Key historical context:** Before ALWD 5th ed., ALWD used period-only forms for contractions (e.g., `Assn.`, `Deptmt.`, `Govt.`, `Engr.`, `Intl.`). The 5th edition (and the 7th maintains this) capitulated to Bluebook contraction forms (`Ass'n`, `Dep't`, `Gov't`, `Eng'r`, `Int'l`).

**Impact on eyecite-ts:** Because `isLikelyAbbreviationPeriod` strips both periods AND apostrophes before set lookup, period-form `assn` and apostrophe-form `ass'n` both normalize to the same stem `assn`. Eyecite-ts already has all of: `assn`, `dept`, `govt`, `engr`, `intl`, `natl`, `profl`, `pship`, `commn`, `commr`, `commcn`, `meml`, `regl`, `secy`, `sholder`, `socy`, `examr`, `exr`, `exx`, `admr`, `admx`, `empr`, `empt`, `engg`, `entmt`, `envt`, `fedn`, `invr`, `publg`, `publn`, `contl`.

**ALWD-only entries not in Bluebook T6 that I could verify:** None substantive. ALWD's Appendix 3 closely mirrors Bluebook T6 with the contraction-style difference noted above. ALWD does include some unique guidance on relator cases ("ex rel.") and court-level notation, but no unique word-level abbreviations.

**Differences from Bluebook 21st edition (per crivblog):**
- ALWD prefers "email" (no hyphen); Bluebook uses "e-mail" — n/a for case names.
- ALWD prefers "Lexis"; Bluebook uses "LEXIS" — n/a for case names.
- ALWD recommends "Westlaw Classic" / "Westlaw Edge"; Bluebook uses generic "Westlaw" — n/a for case names.

**Conclusion for Section B:** No new stems required from ALWD. ALWD historically would have justified adding period-only variants (`assn`, `intl`, etc.), but since the apostrophe-stripping normalization in `isLikelyAbbreviationPeriod` already collapses both forms to the same stem, the existing set already covers ALWD usage.

## Section C: Bluebook 21st Edition T-Table Deltas

Source: University of Washington Law Library "Major Changes in the 21st Edition", citeblog.access-to-law.com "Bluebook Weight Loss Program – Part Two: The Merger of Tables T6 and T13.2", YourDictionary's comprehensive T6 mirror, University of Colorado Bluebook guide.

### C.1: The T13.2 → T6 Merger (Major Structural Change)

Bluebook 21st ed. (2020) merged Table T13.2 (periodical abbreviations) into Table T6 (case names & institutional authors), creating a unified "one abbreviation per word" rule across T6, T10, and T13. This means words historically formal only for periodical titles now formally apply to case names too — though in practice many already appeared in institutional plaintiff names.

**Words formally moved from T13.2 into T6 in the 21st edition** (per access-to-law.com analysis):

| Word | Abbreviation | Normalized Stem | In our set? | Risk if added |
|------|--------------|-----------------|-------------|---------------|
| Africa | `Afr.` | `afr` | YES | — |
| Ancestry | (no abbrev) | n/a | n/a | — |
| British | `Brit.` | `brit` | YES | — |
| **Civil** | `Civ.` | `civ` | **NO** | LOW (cap'd "Civ." rarely sentence-end) |
| Cosmetic | `Cosm.` | `cosm` | YES | — |
| Digest | `Dig.` | `dig` | YES | — |
| **Dispute** | `Disp.` | `disp` | YES (existing) | — |
| English | `Eng.` | `eng` | YES | — |
| Faculty | `Fac.` | `fac` | YES | — |
| Forum | `F.` (or none) | `f` | n/a — single letter handled by Tier 2 | — |
| Human | `Hum.` | `hum` | YES | — |
| Injury | `Inj.` | `inj` | YES | — |
| Labor | `Lab.` | `lab` | YES | — |
| **Lawyer** | `Law.` | n/a (same as `law` already in set) | YES | — |
| **Library** | `Libr.` | `libr` | **NO** | LOW |
| Military | `Mil.` | `mil` | YES | — |
| Mineral | `Min.` | `min` | YES | — |
| Modern | `Mod.` | `mod` | YES | — |
| Patent | `Pat.` | `pat` | YES | — |
| **Policy** | `Pol'y` | `poly` | **NO** | LOW |
| Privacy | (full) | n/a | — | — |
| Record | `Rec.` | `rec` | YES | — |
| Referee | `Ref.` | `ref` | YES | — |
| Statistic | `Stat.` | `stat` | YES | — |
| **Studies** | `Stud.` | `stud` | **NO** | LOW |
| Survey | `Surv.` | `surv` | YES | — |
| **Tribune** | `Trib.` | `trib` | **NO** | LOW |
| **Week** | `Wk.` | `wk` | **NO** | LOW (2-letter, conservative add) |
| **Weekly** | `Wkly.` | `wkly` | **NO** | LOW |

### C.2: Bluebook 21st-Edition New/Changed Single-Word Abbreviations

From UW Law Library's authoritative summary of T6 changes between 20th and 21st editions:

| Word | Old Form (20th) | New Form (21st) | Stem | In our set? | Risk if added |
|------|-----------------|-----------------|------|-------------|---------------|
| **Artificial Intelligence** | (none) | `A.I.` | `ai` | **NO** | LOW (dotted, may be auto-handled) |
| Bar | (T13: `B.`) | (none) | — | n/a | — |
| Comparative | `Comp.` | `Compar.` | `compar` | YES | — |
| Employment-related | `Emp'r`/`Emp't` (T6) | `Emp.` (unified) | `emp` | YES | — |
| Environmental | `Envt'l` | `Env't` | `envt` | YES | — |
| **Laboratory** | (none / part of `Lab.`) | `Lab'y` | `laby` | **NO** | LOW |
| **Nationality** | `Nat'lity` | `Nat'y` | `naty` | **NO** | LOW |
| **Professional** | `Prof'l` (T6) / `Prof.` (T13) | `Pro.` (unified) | `pro` | YES (already) | — |
| Psychology | `Psychol.` | `Psych.` | `psych` | YES | — |
| **Refining** | `Ref.` | `Refin.` | `refin` | **NO** | LOW |
| Research | `Res.` | `Rsch.` | `rsch` | YES | — |
| Reservation | `Res.` | `Rsrv.` | `rsrv` | YES | — |
| **Sociology** | `Soc.` | `Socio.` | `socio` | **NO** | LOW (distinct from `Soc.` = Social, which we have) |

### C.3: Court-Document Party Designations (Bluebook BT1.2)

These aren't strictly T6 entries, but they appear in case captions for habeas/immigration/administrative cases and are formally documented in Bluebook BT1.2 (Bluepages) and T6:

| Word | Abbreviation | Stem | In our set? | Risk if added |
|------|--------------|------|-------------|---------------|
| **Petitioner** | `Pet'r` | `petr` | **NO** | LOW |
| **Respondent** | `Resp't` | `respt` | **NO** | LOW |
| **Appendix** | `App'x` | `appx` | **NO** | MEDIUM ("appx" rarely mid-name; safe but unnecessary) |
| **Veteran** | `Vet.` | `vet` | **NO** | LOW (used in veterans-benefits caption parties) |

### C.4: T7 (Courts) and T10 (Geographic) Changes

T7 and T10 had no substantive single-word additions in the 21st edition that aren't already in our set. T10 state abbreviations are all present (`Ala.`, `Ariz.`, `Cal.`, etc.). T7 court abbreviations (`Cir.`, `Ct.`, `Super.`, `Sup.`, `App.`, `Magis.`) are all present.

The unification rule ("one abbreviation per word across T6/T10/T13") in the 21st edition did NOT introduce new single-word stems beyond what's covered above.

## Section D: Python eyecite Comparison

Source: `https://github.com/freelawproject/eyecite/blob/main/eyecite/helpers.py` (fetched 2026-05-10).

**Python eyecite does NOT use a stem-set approach for backward case-name scanning.** Instead, it uses a token-driven state-machine architecture:

1. Backward iterates tokens from citation toward beginning of document via `find_case_name` in `helpers.py`.
2. Recognizes `StopWordToken` instances (`v`, `vs`, `ex rel`, etc.) to identify v-token position.
3. Uses `_is_capitalized_abbreviation` (lines 435–457) — but this is a coarse heuristic: returns true when word `len > 4`, ends with `.`, starts uppercase, and a v-token has been found.
4. Uses `_is_lowercase_after_v_token` and `_is_lowercase_without_v_token` to detect sentence-boundary heuristics.
5. Relies on `StopWordToken` and `PlaceholderCitationToken` token types defined in `tokenizers.py`/`models.py` to recognize structural boundaries.

**Key implication:** The Python parent's "abbreviation handling" is *implicit in its tokenizer* (which has knowledge of `reporters-db` reporter abbreviations as token types), NOT in an explicit case-name abbreviation set. eyecite-ts has made an architectural choice to use a stem set rather than a token-based approach — so the comparison surface is asymmetric.

**Reporters-db remains the most authoritative cross-referenceable data source** for case-name abbreviations because it's used (directly or indirectly) by both Python eyecite and eyecite-ts.

**There is no Python "set of stems" we can directly diff against** — Python relies on:
- The Aho-Corasick tokenizer trained on reporters_db,
- The `DISALLOWED_NAMES` list in `utils.py` (a *block-list* of AG surnames like Akerman, Ashcroft, Barr — these prevent false-positive case names, not enable abbreviation recognition).

## Top Recommendations (Prioritized)

### High Priority (Bluebook 21st edition T6 — formal authoritative additions)

These are all entries that the Bluebook 21st edition (the current authoritative standard) formally added in 2020 and that real-world citations now use. Each has LOW false-positive risk because the corresponding English word is either capitalized at start of caption or appears mid-party-name (not at sentence end as a sentence-ending common word):

1. **`poly`** ← `Pol'y` (Policy) — appears in cases like "Ctr. for Reprod. Rts. v. Health Pol'y Comm'n" and many think-tank plaintiffs.
2. **`stud`** ← `Stud.` (Studies) — "Inst. for Pol'y Stud.", "Ctr. for Strategic Stud."
3. **`libr`** ← `Libr.` (Library) — "Pub. Libr. of N.Y."
4. **`refin`** ← `Refin.` (Refining) — "Shell Refin. Co." (replaces old `Ref.` which is still valid for Referee).
5. **`socio`** ← `Socio.` (Sociology) — "Am. Socio. Ass'n" (distinct from existing `soc` for Social).
6. **`laby`** ← `Lab'y` (Laboratory) — "Bell Lab'y" (distinct from existing `lab` for Labor).
7. **`naty`** ← `Nat'y` (Nationality) — "Immigration & Nat'y Servs."

### Medium Priority (Bluebook 21st edition + cap'd terms)

8. **`civ`** ← `Civ.` (Civil) — "Civ. Rts. Div." (used in Civ. Action No. and Civ. Rts. captions).
9. **`trib`** ← `Trib.` (Tribune) — "Chi. Trib." (less common in case names; more in periodical citations).
10. **`vet`** ← `Vet.` (Veteran) — "Vet. Admin." (in VA caption parties).
11. **`wkly`** ← `Wkly.` (Weekly) — "ABA L. Wkly."
12. **`wk`** ← `Wk.` (Week) — "U.S. L. Wk." (2-letter; conservative but appears in caption tails).

### Medium Priority (Court-document party designations from BT1.2)

13. **`petr`** ← `Pet'r` (Petitioner) — appears in habeas, immigration, and administrative appeal captions.
14. **`respt`** ← `Resp't` (Respondent) — same.
15. **`ai`** ← `A.I.` (Artificial Intelligence) — emerging in modern captions; **already handled by Tier 3 dotted initialism** since it contains an internal period, but adding belt-and-suspenders safety is harmless.
16. **`appx`** ← `App'x` (Appendix) — appears in "F. App'x" reporter, but rarely as a mid-party-name word. LOW priority for explicit add.

### Low Priority (Already covered by Tier 3 — redundant safety)

17. `rr` ← `R.R.` — covered by Tier 3 (dotted initialism).
18. `ss` ← `S.S.` — covered by Tier 3.
19. `us` ← `U.S.` — covered by Tier 3.

### False-Positive Risk Assessment

Each recommended stem analyzed for collision with common English sentence-end words:

| Stem | Common English sentence-end usage? | Risk |
|------|-----------------------------------|------|
| `poly` | "Poly." not a common sentence-end. "Poly" as standalone English (e.g., "It was poly.") is unusual. | LOW |
| `stud` | "Stud." colloquial for "student" or referring to a stud horse — uncommon in formal legal opinions. | LOW |
| `libr` | "Libr." essentially never appears outside library-name contexts. | LOW |
| `refin` | Very uncommon as a standalone word. | LOW |
| `socio` | Rarely a sentence-end English word. | LOW |
| `laby` | Not a standalone English word. | LOW |
| `naty` | Not a standalone English word. | LOW |
| `civ` | Not a standalone English word. | LOW |
| `trib` | "Trib." not commonly a sentence-end English word in legal opinions. | LOW |
| `vet` | "Vet." colloquial ("Ask the vet."); but at end-of-caption in legal text it's nearly always "Veteran". Moderate care needed but LOW risk in legal-opinion context. | LOW-MEDIUM |
| `wkly` | Not a standalone English word. | LOW |
| `wk` | 2-letter; uncommon English standalone. | LOW |
| `petr` | Not a standalone English word. | LOW |
| `respt` | Not a standalone English word. | LOW |
| `appx` | Not a standalone English word. | LOW |
| `ai` | "A.I." dotted form rarely standalone end-of-sentence; bare "ai" would be initial. | LOW |

---

## Cross-Reference: All Three Sources Combined

| Stem | reporters-db | ALWD 7th | Bluebook 21st | Already in eyecite-ts? |
|------|:-:|:-:|:-:|:-:|
| `civ` | – | – | YES (T6 merger) | NO |
| `libr` | – | – | YES (T6 merger) | NO |
| `poly` | – | – | YES (T6 merger) | NO |
| `stud` | – | – | YES (T6 merger) | NO |
| `trib` | – | – | YES (T6 merger) | NO |
| `wk` | – | – | YES (T6 merger) | NO |
| `wkly` | – | – | YES (T6 merger) | NO |
| `ai` | – | – | YES (T6 new) | NO (handled by Tier 3) |
| `laby` | – | – | YES (T6 new) | NO |
| `naty` | – | – | YES (T6 changed) | NO |
| `socio` | – | – | YES (T6 changed) | NO |
| `refin` | – | – | YES (T6 changed) | NO |
| `petr` | – | – | YES (BT1.2) | NO |
| `respt` | – | – | YES (BT1.2) | NO |
| `vet` | – | – | YES (T6) | NO |
| `appx` | – | – | YES (Bluebook) | NO |
| `rr` | YES | – | – | Tier 3 |
| `ss` | YES | – | – | Tier 3 |
| `us` | YES | – | – | Tier 3 |

## References

- Bluebook 21st Edition T6 (paywalled): https://www.legalbluebook.com/bluebook/v21/tables/t6-case-names-and-institutional-authors-in-citations
- University of Washington Law Library — Major Changes in the 21st Edition: https://lib.law.uw.edu/bluebook101/editions
- access-to-law.com — Bluebook Weight Loss Program – Part Two: The Merger of Tables T6 and T13.2: https://citeblog.access-to-law.com/?p=1074
- access-to-law.com — The ALWD Guide Capitulates: https://citeblog.access-to-law.com/?p=185
- University of Colorado — Major Changes in the 21st Edition: https://guides-lawlibrary.colorado.edu/c.php?g=1153688&p=8420308
- YourDictionary — Bluebook Abbreviations: Common Words in Case Names: https://www.yourdictionary.com/articles/bluebook-abbreviations-case-names
- Marquette Faculty Blog — Abbreviating Case Names: https://law.marquette.edu/facultyblog/2013/09/whats-in-a-name-abbreviating-case-names/
- ALWD 7th edition — What's New: https://crivblog.com/2021/09/15/whats-new-in-the-alwd-7th-edition/
- ALWD ↔ Bluebook 6e correlations: https://www.alwd.org/images/resources/ALWD_to_BB_6e_correlations.pdf
- freelawproject/reporters-db case_name_abbreviations.json: https://raw.githubusercontent.com/freelawproject/reporters-db/main/reporters_db/data/case_name_abbreviations.json
- freelawproject/eyecite helpers.py: https://github.com/freelawproject/eyecite/blob/main/eyecite/helpers.py
- Wikipedia — List of legal abbreviations: https://en.wikipedia.org/wiki/List_of_legal_abbreviations
- NAAG — New Bluebook 21st Edition Changes: https://www.naag.org/attorney-general-journal/the-new-bluebook-21st-edition-has-some-significant-changes/
- NYU Law Library — Case Law Abbreviations & Acronyms: https://nyulaw.libguides.com/c.php?g=773843&p=5551853
