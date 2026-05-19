# Parallel Citation Detection — Research & Scope Recommendation

**Date:** 2026-05-19
**Status:** Research only — no code changes
**Audience:** Decision-maker (`eyecite-ts` maintainer) and downstream frontend consumer
**Read time:** ~5 minutes

---

## TL;DR — Scope Recommendation

**Do scope #1 only, but do it with option C (reuse `parsePincite`).** Fix the proximity gate so pincite-between cases like `374 N.J. Super. 448, 453–55, 864 A.2d 1191` are detected. Defer the data-model change.

- The current N-citations + `groupId` + `parallelCitations[]` model is **already richer than Python eyecite's output** and aligns with how Westlaw, Lexis, CourtListener, LawCite, and CSL-M conceptually treat parallels (one logical authority, multiple reporters). The frontend pain ("two highlighted spans per case") is a renderer concern, not a parser bug — and `groupByCase()` already gives the consumer the one-per-case view they want.
- The string-cite anomaly almost certainly **resolves itself** once parallel detection succeeds: `891 A.2d 1202` is currently treated as a standalone case and becomes a string-cite peer of `416 N.J. Super. 113` via the `;` between them. Once it's tagged as a secondary of `186 N.J. 78`, the string-cite walker should skip past it correctly (verify this empirically — see Action C-3 below).
- Folding secondaries into the primary (scope #3) is a breaking API change that the Free Law Project team explicitly debated for **four years** (issue [freelawproject/eyecite#76](https://github.com/freelawproject/eyecite/issues/76), open since 2021) and still has not landed. Don't take it on as part of a bug fix.

---

## Findings

### 1. Bluebook / Indigo Book canonical form

**Verdict: "pincite-between" is the canonical Bluebook pattern, not an edge case.**

The Indigo Book covers parallel citations in **Rule R12.3** (state-court parallel cites), and explicitly says: *"Use one pincite per reporter citation."* The canonical example given is `Harden v. Playboy Enters., Inc., 261 Ill. App. 3d 443, 633 N.E.2d 764 (1993)` — one reporter pincite each side of the parallel comma. (Source: [Indigo Book § R12.3 mirror at law.resource.org](https://law.resource.org/pub/us/code/blue/IndigoBook.html); [Indigo Book 2.0 PDF](https://indigobook.github.io/versions/indigobook-2.0.pdf); pincite rules at [§ R11.7](https://library.ju.edu/bluebook-citation/parallel-citations).)

Concrete real-world example cited by Tarlton Law Library: `Williams v. Smalls, 390 S.C. 375, 378, 701 S.E.2d 772, 774 (Ct. App. 2010)` — pincites `378` and `774` sit between the two reporters. Source: [Bluebook Pages, Paragraphs, and Pincites guide](https://tarlton.law.utexas.edu/bluebook-legal-citation/pages-paragraphs-pincites).

So the structure is: `Vol1 Rptr1 Page1[, Pincite1], Vol2 Rptr2 Page2[, Pincite2] (Court Year)`. Pincite-at-end is **not** Bluebook-compliant; if you see it, treat it as a malformed input we can be permissive about, not as the standard.

**Pincite variant zoo to keep in mind:**
- Page (`453`)
- Page range (`453–55`, `453-55`, `453, 460`)
- Multiple discrete pages (`115, 153`) — already handled by `parsePincite` via `additionalPincites`
- Footnote (`570 n.3`, `nn.3-5`, `fn. 3`)
- Star pagination (`*42` — slip ops, NY Slip Op)
- Paragraph (`¶ 5`, `¶¶ 12-14`, `para. 12`) — used in neutral cites
- Combinations (`570, 575 n.3`)

All of the above are already understood by `src/extract/pincite.ts:parsePincite`. The relevance for parallel detection: **the gap text between two parallel cites can legitimately be anywhere from `, ` (2 chars) to `, ¶¶ 12-14, 32 n.5, ` (~25 chars).** `MAX_PROXIMITY = 5` cannot cover this.

---

### 2. Python eyecite's parallel handling

**Verdict: Python eyecite already detects pincite-between parallels — and its mechanism is independent of any "MAX_PROXIMITY" gate.**

Python eyecite uses `FullCaseCitation.is_parallel_citation(preceding)` ([eyecite/models.py, found in the repo](https://github.com/freelawproject/eyecite/blob/main/eyecite/models.py)):

```python
def is_parallel_citation(self, preceding: CaseCitation):
    if self.full_span_start == preceding.full_span_start:
        # if parallel get plaintiff/defendant data from
        # the earlier citation, since it won't be on the
        # parallel one.
        self.metadata.defendant = preceding.metadata.defendant
        self.metadata.plaintiff = preceding.metadata.plaintiff
        self.metadata.year = preceding.metadata.year
        self.year = preceding.year
```

Called immediately after each `_extract_full_citation` in [`eyecite/find.py`](https://github.com/freelawproject/eyecite/blob/main/eyecite/find.py).

**The key insight:** `full_span_start` is set by the **case-name backward search** (`_process_case_name` in `eyecite/helpers.py`). For a pattern like `Foo v. Bar, 12 Mass. 34, 35, 56 N.E.2d 78, 79 (1999)`, **both** `12 Mass. 34` and `56 N.E.2d 78` walk backwards through the same comma-joined tokens to the *same* `v.`-anchored case-name start. Their `full_span_start` ends up identical → they're parallel. The pincite between them does not break this because the backward scanner skips commas (`if word == ",": continue`).

The forward pincite regex `PIN_CITE_REGEX = ,?\ ?(?:at\ )?<token>(?:,\ ?<token>)* (?=...)` ([eyecite/regexes.py](https://github.com/freelawproject/eyecite/blob/main/eyecite/regexes.py)) is also greedy across comma-separated tokens. So Python eyecite assigns the first citation a pincite like `35, 56 N.E.2d 78, 79`. This is documented as messy by jcushman in issue #76 — but it does at least *link* the parallels.

**Important caveats from the Free Law Project team:**

- Issue [#76 "Link parallel cites"](https://github.com/freelawproject/eyecite/issues/76) — **still open since May 2021**. The team has debated three proposed data models (see § 3 below). None has shipped.
- Issue [#111 "Parallel citations are detected as separate citations"](https://github.com/freelawproject/eyecite/issues/111) — closed Jan 2025 as a dup of #76. No new code, just deduplication.
- Open PR [#288 "fix(citation): Ensure full_span is aligned for parallel citations"](https://github.com/freelawproject/eyecite/pull/288) (Jul 2025) — fixes a `full_span_end` greedy-regex bug that bleeds into the next citation. Confirms Python eyecite's parallel handling is **still buggy in production today**.
- jcushman, May 2021: *"the first cite has a pin_cite that contains the second cite, and the second cite has a title that contains the first cite."* — i.e., the metadata copy via `is_parallel_citation` is a Band-Aid, not a real fix.

**Bottom line:** eyecite-ts's current model (separate citations linked via `groupId` + `parallelCitations[]`) is **strictly better** than Python eyecite's (separate citations with copied plaintiff/defendant metadata and no group ID). We should keep our model and just fix the proximity gate.

---

### 3. The four-year design debate at Free Law Project (issue #76)

From `gh issue view 76 --repo freelawproject/eyecite --comments`:

**Three approaches were proposed:**

| # | Author | Shape | Verdict |
|---|--------|-------|---------|
| A | mlissner (2021) | Nested groups: `[{ citations: [c1, c2], parenthetical }]` | Rejected as too much overhead for naive callers |
| B | mlissner (2021) | Flat list w/ back-pointer: `{..., parallel_to: 0}` | Considered; not pursued |
| C | jcushman (2021) | Fold secondaries into primary: `{..., parallel_cites: [{vol, rptr, page}]}` | **Endorsed by mlissner and flooie (2025)** — *"Jack's approach wins. Let's do it."* |

A fourth idea (mattdahl) was to defer linking to `resolve_citations()`, then prune by resource-id. mattdahl himself withdrew this in 2022: *"my previous proposal is intractable because resolution is too inaccurate."*

**Despite consensus in 2022 that approach C is correct, nothing has shipped in four years.** The reason is the messy-metadata problem jcushman flagged — folding secondaries into the primary requires re-running case-name extraction, pincite extraction, and `full_span` computation against the *unified* citation, not the per-reporter slice. That's a non-trivial refactor.

**eyecite-ts is already closer to "approach C" than Python eyecite ever got.** Our `groupId` + `parallelCitations[]` is roughly approach B with a stable group key. `groupByCase()` materializes approach A on demand for consumers who want it. Switching the default `citations[]` output to approach C is a breaking change with the same refactor cost FLP has been avoiding.

---

### 4. How other systems represent parallels

| System | Data model | Source |
|---|---|---|
| **Westlaw** | One case record; parallel reporters under a "Citations" tab on the case detail page. KeyCite shows parallels under "Citing References." | [LawShun guide](https://lawshun.com/article/how-to-find-paralell-citations-on-west-law), [Pace Law Library blog](https://lawlibrary.blogs.pace.edu/2011/11/16/westlawnext-and-the-bluebook/) |
| **Lexis+** | One case record; "Parallel Citation Lookup" feature returns the canonical case from any parallel cite. | [LexisNexis InfoPro](https://www.lexisnexis.com/community/infopro/b/weblog/posts/parallel-citation-lookup-now-available-on-lexis) |
| **CourtListener** | One opinion cluster per case; `citations` is an **array field on the cluster**, holding all known parallel cites. (Each cite is not a separate record.) | [CourtListener v4 Citation API](https://wiki.free.law/c/courtlistener/help/api/rest/v4/citations) |
| **LawCite (AustLII)** | One case record with "alternative (parallel) citations" displayed alongside the title. Citation extraction is also used to **harvest new parallel cites** for existing cases. | [AustLII LawCite help](https://www.austlii.edu.au/austlii/help/lawcite_announce.html) |
| **CSL-M (Juris-M)** | Per-cite records; the **renderer** uses `parallel-first` attribute on a `cs:group` to suppress repeated variables in adjacent parallel cites. Data model is flat; presentation is grouped. | [CSL-M docs](https://citeproc-js.readthedocs.io/en/latest/csl-m/) |

**The convergent pattern:** "one logical case, multiple reporter strings" is universal at the *display/storage* layer. None of these tools rely on the **extractor** to fold parallels for them — they fold at the case/cluster boundary or at the renderer. Westlaw and Lexis don't even expose a "this is the primary" choice; the user picks via UI tabs.

For an eyecite-ts consumer building a brief viewer, the analogous architecture is: extractor returns per-reporter citations with group IDs → consumer's renderer decides whether to show one badge per reporter (Bluebook-faithful) or one badge per case (Westlaw-style). **The eyecite-ts model already supports both** via `extractCitations()` + `groupByCase()`. The frontend's "two badges per case" complaint is a *renderer choice*, not a parser limitation.

---

### 5. Why the current detection misses pincite-between cases

`src/extract/detectParallel.ts:19,27`:

```ts
const MAX_PROXIMITY = 5            // chars after the comma
const MAX_GAP_FOR_PARALLEL = 20    // total gap before early-exit
```

For `374 N.J. Super. 448, 453–55, 864 A.2d 1191`:
- Total gap = `", 453–55, "` = 10 chars → passes `MAX_GAP_FOR_PARALLEL` ✓
- `distanceAfterComma = gapText.length - commaIndex - 1` measures distance after the **first** comma → `", 453–55, "` has first comma at idx 0, length 10, so `distanceAfterComma = 9` → fails `MAX_PROXIMITY` (5) ✗

The `MAX_PROXIMITY = 5` rule effectively says *"only allow direct adjacency: a single comma plus a few spaces, nothing in between."* This is the **non-pincited** Bluebook variant. The pincited variant is, per § 1 above, the **canonical** Bluebook variant.

For `416 N.J. Super. 113, 120, 3 A.3d 584` the gap is `", 120, "` = 7 chars; `distanceAfterComma = 6 > 5` → fails.

For `186 N.J. 78, 891 A.2d 1202` the gap is `", "` = 2 chars; `distanceAfterComma = 1` → passes (this is why ~1 of 3 still works).

**So the bug is precisely the MAX_PROXIMITY heuristic mis-modeling Bluebook structure.** It allows non-pincited parallels and rejects pincited parallels.

---

### 6. Detection-fix options compared

| Option | Description | Pros | Cons |
|---|---|---|---|
| **A: Widen MAX_PROXIMITY** to ~25–30 | Quickest patch | One-line change. Covers most pincited cases. | Higher false-positive risk: `See A, but B, and C` could trigger. Doesn't validate the intermediate text is actually a pincite. |
| **B: Pincite-shape regex** in gap | Require gap to match `,\s*\d+([-–—]\d+)?(\s*n\.\s*\d+)?\s*,\s*` etc. | Tight false-positive control. No new code dependencies. | Need to maintain the regex against pincite variants (paragraphs, stars, footnotes, multi-pincite chains). Duplicates `pincite.ts` knowledge. |
| **C: Reuse `parsePincite`** on gap | Strip leading/trailing `,\s*`, hand the middle to `parsePincite`; accept if it returns non-null. | Single source of truth for "what is a pincite shape." Picks up paragraph/star/footnote forms for free. Future pincite changes propagate automatically. | One extra function call per candidate (negligible). `parsePincite` was designed for trailing pincites, not gap middle — needs a small adapter that handles multi-pincite chains (`115, 153`). |

**Recommendation: Option C.** The cost is one helper (`isPinciteGap(text: string): boolean`) and a slightly higher `MAX_GAP_FOR_PARALLEL` (e.g., 40 to cover `, 570-75, fn. 3, ¶¶ 4-6, `). The reuse means edge cases (`¶`, `*`, `n.`, ranges, multi-pincite `, 115, 153,`) are handled correctly without re-implementing.

**False-positive risk for Option C is low** because the gate is `pincite-shape + comma + same shared parenthetical + both tokens are case citations of correct adjacency`. A `See A, but B, and C` pattern fails on "but" not matching any pincite shape; `See cases such as A, B, and C` fails on `B` not being preceded by a pincite-shape token.

**One real-world risk to test:** strings like `1 U.S. 1, 2, 3, 4 S. Ct. 2` where someone writes a multi-page pincite as commas instead of `n` notation. `parsePincite("2, 3")` is ambiguous — could be page 2 + extra. The `additionalPincites` field already understands this. Suggest the adapter accepts either `parsePincite(whole)` or a regex chain of pincite-shapes joined by `,\s*`.

---

### 7. The string-cite anomaly is downstream of the parallel bug

The user reports `891 A.2d 1202` and `416 N.J. Super. 113` ended up sharing a `stringCitationGroupId`. Looking at `src/extract/detectStringCites.ts:145-228`:

- `detectStringCitations` walks **all** citations in document order and groups them whenever the gap text is `;` + optional signal word.
- The text between `891 A.2d 1202 (2006)` and `416 N.J. Super. 113` is `; see also Yellen v. Kassin, ` — but `getCitationStart(next)` uses `fullSpan?.originalStart`, which on `416 N.J. Super. 113` includes the case name `Yellen v. Kassin`. So the gap text the analyzer sees is roughly `; see also ` — matches the string-cite pattern.
- This **only happens because `891 A.2d 1202` was treated as a standalone case citation** rather than a secondary. If parallel detection had folded it into `186 N.J. 78`, then the string-cite walker would pair `186 N.J. 78` with `416 N.J. Super.` directly — which is the correct grouping (semicolon-separated authorities for separate propositions).

**Implication:** Fixing the parallel detection should fix the string-cite anomaly as a side effect. Action item: after the parallel fix lands, write a regression test that pipes the user's full brief through `extractCitations({ resolve: true })` and asserts:
1. Two parallel pairs detected (`374-N.J.-Super.-448` and `186-N.J.-78`).
2. String-cite group contains the two primaries only (`374 N.J. Super.`, `186 N.J.`, `416 N.J. Super.`), not the A.2d/A.3d secondaries.

---

## Scope decision

### Recommended: Scope #1 (Narrow detection fix) with option C, plus a regression test for the string-cite side effect.

**Concrete plan:**

1. **C-1.** Add `isPinciteGap(text: string): boolean` helper (probably in `src/extract/detectParallel.ts` or a new `src/extract/pinciteGap.ts`). Implementation sketch:
   - Trim leading `,\s*` and trailing `,\s*`.
   - If empty → true (covers `, ` direct adjacency, the current `MAX_PROXIMITY` case).
   - Else split the middle on `,\s*` and require every part to match a `parsePincite`-compatible shape, OR call `parsePincite` on the joined string and accept if non-null.
2. **C-2.** Replace `MAX_PROXIMITY` check in `detectParallel.ts:128-134` with `isPinciteGap(gapText)`. Bump `MAX_GAP_FOR_PARALLEL` to ~40 (room for multi-pincite + footnote refs).
3. **C-3.** Regression tests:
   - `tests/extract/detectParallel.test.ts`: add positive cases for `, 453–55, ` / `, 120, ` / `, 115, 153, ` / `, ¶ 5, ` / `, *42, ` / `, 570 n.3, `; add negative cases for `, but ` / `, and others, ` / `, see ` / `, e.g., `.
   - `tests/integration/`: add a fixture from the user's brief, assert 2 parallel groups + correct string-cite group membership.
4. **C-4.** Changeset (`pnpm changeset` → patch — *no* breaking API change).
5. **C-5.** Document in `docs/handoffs/` that the data-model debate (#3 here) was researched and explicitly deferred; reference issue freelawproject/eyecite#76.

**Estimated effort:** ~half a day (helper + tests + changeset). Touches one file's heuristic, one new helper, ~10 unit tests, one integration test.

### Explicitly NOT in scope

- **Folding secondaries into primaries (scope #3).** This is a breaking change that the Free Law Project team debated for 4 years and still has not shipped. The current `groupId` + `parallelCitations[]` model + `groupByCase()` helper is already richer than Python eyecite's output and gives consumers both views (per-reporter for granular highlighting, per-case via `groupByCase()`).
- **Separate string-cite investigation (scope #2).** Should resolve as a side effect of the detection fix. Add the regression test (C-3) to verify; only investigate further if the test fails.

### Frontend guidance (not a parser change)

The consumer's frontend is showing two badges per parallel pair because it iterates `extractCitations()` output directly. The fix is on the **frontend**, not the parser: either (a) call `groupByCase()` and render one badge per `CaseGroup`, with the secondary reporters as text inside the badge, or (b) keep iterating `citations` but group the rendered DOM by `groupId` (render one outer wrapper per group, with one inner span per cite).

This is the same pattern Westlaw uses: one clickable case row, parallels surfaced on hover/click. The eyecite-ts API supports this today; no parser change is required to enable it.

---

## Sources

- **Bluebook / Indigo Book**
  - [Indigo Book § R12.3 (parallel citation in state court documents) — law.resource.org mirror](https://law.resource.org/pub/us/code/blue/IndigoBook.html)
  - [Indigo Book 2.0 PDF — full citation reference](https://indigobook.github.io/versions/indigobook-2.0.pdf)
  - [Tarlton Law Library — Pages, Paragraphs, and Pincites (Bluebook 21st ed.)](https://tarlton.law.utexas.edu/bluebook-legal-citation/pages-paragraphs-pincites)
  - [Jacksonville University Bluebook guide — parallel citations](https://library.ju.edu/bluebook-citation/parallel-citations)

- **Python eyecite source**
  - [eyecite/find.py — main extraction loop, calls `is_parallel_citation`](https://github.com/freelawproject/eyecite/blob/main/eyecite/find.py)
  - [eyecite/models.py — `FullCaseCitation.is_parallel_citation`](https://github.com/freelawproject/eyecite/blob/main/eyecite/models.py)
  - [eyecite/helpers.py — `_process_case_name` sets `full_span_start`](https://github.com/freelawproject/eyecite/blob/main/eyecite/helpers.py)
  - [eyecite/regexes.py — `PIN_CITE_REGEX`](https://github.com/freelawproject/eyecite/blob/main/eyecite/regexes.py)

- **Python eyecite issues/PRs**
  - [Issue #76 — "Link parallel cites" (OPEN since May 2021; full design debate)](https://github.com/freelawproject/eyecite/issues/76)
  - [Issue #111 — "Parallel citations are detected as separate citations" (closed as dup of #76)](https://github.com/freelawproject/eyecite/issues/111)
  - [PR #288 — "fix(citation): Ensure full_span is aligned for parallel citations" (OPEN, Jul 2025)](https://github.com/freelawproject/eyecite/pull/288)
  - [Issue #25 — "Citator doesn't pick up old SCOTUS parallel citations"](https://github.com/freelawproject/eyecite/issues/25)

- **Other systems**
  - [CourtListener v4 Citation API — opinion cluster `citations` array](https://wiki.free.law/c/courtlistener/help/api/rest/v4/citations)
  - [LawCite (AustLII) — alternative-citation harvesting and display](https://www.austlii.edu.au/austlii/help/lawcite_announce.html)
  - [LexisNexis — Parallel Citation Lookup feature](https://www.lexisnexis.com/community/infopro/b/weblog/posts/parallel-citation-lookup-now-available-on-lexis)
  - [Westlaw — accessing parallel citations from the case view](https://lawshun.com/article/how-to-find-paralell-citations-on-west-law)
  - [Pace Law Library — WestlawNext and the Bluebook on parallel citation suggestions](https://lawlibrary.blogs.pace.edu/2011/11/16/westlawnext-and-the-bluebook/)
  - [CSL-M extensions docs — `parallel-first` attribute on `cs:group`](https://citeproc-js.readthedocs.io/en/latest/csl-m/)

- **Relevant local source files**
  - `/Users/medelman/Projects/OSS/eyecite-ts/src/extract/detectParallel.ts` — current detection (`MAX_PROXIMITY = 5`)
  - `/Users/medelman/Projects/OSS/eyecite-ts/src/extract/pincite.ts` — `parsePincite` to reuse for option C
  - `/Users/medelman/Projects/OSS/eyecite-ts/src/extract/detectStringCites.ts` — downstream consumer; verify regression
  - `/Users/medelman/Projects/OSS/eyecite-ts/src/extract/extractCitations.ts:395-428` — where `groupId` / `parallelCitations` are populated
  - `/Users/medelman/Projects/OSS/eyecite-ts/src/utils/groupByCase.ts` — existing per-case view for consumers
  - `/Users/medelman/Projects/OSS/eyecite-ts/src/types/citation.ts:274-288` — current `groupId` / `parallelCitations` type shape
