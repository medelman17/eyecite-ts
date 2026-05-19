# Research: Pincite Inheritance for Short-Form Legal Citations

**Date:** 2026-05-19
**Query:** Does the proposed linear-backward-scan-stop-at-authority-boundary algorithm for `Id.` pincite inheritance match Bluebook Rule 4.1 and the Python `eyecite` reference? What edge cases need tests?
**Depth:** deep
**Status:** Validates the proposed design. Two refinements recommended.

---

## Summary (TL;DR)

**Recommendation: ship the proposed algorithm. It matches the Bluebook.**

Bluebook Rule 4.1 anchors `Id.` to the **immediately preceding cited authority**, and a bare `Id.` (no `at NNN`) means "same source, same page as that immediately preceding citation." That preceding citation may itself be an `Id. at X` — in which case the bare `Id.` correctly inherits `X`, not the page of the original full citation. So `Smith, 1 U.S. 1, 100 → Id. at 115 → Id.` resolves the trailing `Id.` to **page 115**, exactly as the proposed linear backward scan does.

**Python `eyecite` does not implement inheritance at all.** It stores whatever pincite the `Id.` token captured (`Id.` → no pincite; `Id. at 115` → pincite 115) and only **validates** it against the full citation's page range (`_has_invalid_pin_cite`, `MAX_OPINION_PAGE_COUNT = 150`). The eyecite-ts library already exceeds upstream by propagating pincite from the antecedent's first hop; this work extends propagation to the correct *intermediate* hop, which is the Bluebook-correct behavior.

**Two adjustments to the design:**

1. **Stop strictly at any prior citation with a defined pincite to the same authority** — don't keep walking backward past `Id. at 115` looking for "the next thing." The immediate predecessor with a pincite is authoritative. (The proposed algorithm already does this; just call it out as the rationale.)
2. **Do not treat signals (`cf.`, `see also`, `but see`) or parentheticals as breaking the chain when they remain within the same authority cluster.** The Bluebook explicitly excludes parentheticals and prior/subsequent history from the "intervening authority" rule. eyecite-ts already counts on `resolvedTo` identity for the authority-boundary check, which is the right primitive — signals do not change `resolvedTo`, so the algorithm is already signal-safe.

**Test edge cases to add** (full list in §6):

- `Smith → Id. at 115 → Id.` → bare `Id.` inherits 115 (the regression case)
- `Smith → Id. at 115 → Id. at 200 → Id.` → bare `Id.` inherits 200
- `Smith, supra, at 50 → Id.` → bare `Id.` inherits 50
- `Smith → Id. at 115 → Jones, 2 F.3d 1 → Id.` → bare `Id.` is `Jones`'s `Id.`, no pincite inherited (authority boundary)
- `Smith → Id. at 115 (citing Other, 3 U.S. 1) → Id.` → bare `Id.` still inherits 115 (parenthetical is not intervening)
- Section-style pincites: `42 U.S.C. § 1983 → Id. § 1983(c) → Id.` → bare `Id.` inherits `§ 1983(c)`
- Footnote-vs-body: chain across a footnote boundary respects the existing `"footnote"` scope strategy

---

## 1. Bluebook Rule 4.1 — exact semantics

### 1.1 The core rule

Rule 4.1 of the 21st edition of *The Bluebook: A Uniform System of Citation* governs `Id.` It cannot be quoted verbatim here (the official online edition at `legalbluebook.com/bluebook/v21/rules/4-short-citation-forms/4-1-id` is paywalled), but the rule is uniformly summarized across every authoritative law-school guide consulted:

> "_Id._ always refers to the immediately preceding cited authority, either in the same footnote or the previous footnote so long as it is the only authority cited in the preceding footnote."
> — Tarlton Law Library, *Short form: Id., Infra, Supra, Hereinafter* (paraphrasing Rule 4.1) ([tarlton.law.utexas.edu](https://tarlton.law.utexas.edu/bluebook-legal-citation/short-form))

> "Use _Id._ when citing the immediately preceding authority, either: within the same footnote, or in the footnote directly above, provided that footnote includes only one authority."
> — UC Davis, *Short Citation Forms* ([libguides.law.ucdavis.edu](https://libguides.law.ucdavis.edu/c.php?g=1014499&p=7370559))

> "_Id._ can only be used when the immediately preceding citation contains only one authority."
> — Hawaii Law Library, *Weird Bluebook Rules* ([law-hawaii.libguides.com](https://law-hawaii.libguides.com/c.php?g=125486&p=821513))

### 1.2 Plain `Id.` vs. `Id. at [page]`

Two-form structure, universally agreed:

- **Plain `Id.`** → same source **and** same page/section as immediately preceding.
- **`Id. at [page]`** → same source, **different** page/section.

> "When citing to the same authority but a different page, use _id._ at [new page]."
> — UC Davis Bluebook Guide

> "If the page number has changed, indicate that with 'at' and the page number."
> — Loyola Chicago Bluebook Guide ([lawlibguides.luc.edu](https://lawlibguides.luc.edu/bluebook/short_form))

### 1.3 What "same page as the immediately preceding citation" means in a chain

This is the load-bearing question for the proposed algorithm. From a web search synthesis of multiple Bluebook guides:

> "The page number should only appear if it is a different page number from the previous citation. This means that when using 'Id. at' to cite a different page, that pincite does **not** automatically carry forward to subsequent citations — each citation must independently specify which page is being cited, whether through 'Id.' alone (same page) or 'Id. at [page]' (different page)."
> — synthesized from Tarlton, UC Davis, AllCitations, TypeLaw, Casebriefly

Read carefully, the negative ("does not automatically carry forward") is about **the writer's obligation when authoring**: the writer must restate `at NNN` whenever the page changes. It is **not** a statement about parser semantics. For a parser consuming a finished document, the bare `Id.` is unambiguous: it means "same page as the citation I'm immediately following." If that predecessor was `Id. at 115`, then "same page" = **115**.

This is precisely the proposed algorithm.

### 1.4 What breaks the `Id.` chain

The chain is broken by an **intervening authority** (a citation to a different source). The Bluebook carves out two explicit exceptions:

> "Sources cited in explanatory parentheticals or phrases or as part of a case prior or subsequent history are **not** counted as intervening authorities preventing the use of _Id._"
> — Tarlton (paraphrasing Rule 4.1)

So `Smith, 1 U.S. 1, 100 (citing Other, 3 U.S. 1, 2) → Id.` is a valid `Id.` referring to `Smith` (not `Other`), and the parenthetical `Other` does not break the chain.

Signals (`see`, `see also`, `cf.`, `but see`) attach to citations; they don't break the chain by themselves. What breaks the chain is the *citation* the signal introduces being to a **different authority**. If two consecutive `see` citations point at the same `Smith`, the chain is intact.

### 1.5 Footnotes vs. body

In law-review/footnote-heavy work, `Id.` can cross a footnote boundary only if the preceding footnote contains **exactly one** authority. The proposed algorithm doesn't need to enforce this — eyecite-ts's existing `"footnote"` scope strategy already isolates `Id.` to its zone (strict). Pincite inheritance happens **after** scope resolution, so whatever the resolver decided about the antecedent is what we walk.

---

## 2. Python `eyecite` reference implementation

### 2.1 What `resolve.py` actually does

Reviewed at commit `main` HEAD on 2026-05-19:
[`eyecite/resolve.py`](https://github.com/freelawproject/eyecite/blob/main/eyecite/resolve.py).

`_resolve_id_citation` (line ~228) is the entire `Id.` resolution path:

```python
def _resolve_id_citation(
    id_citation: IdCitation,
    last_resolution: ResourceType,
    resolutions: Resolutions,
) -> ResourceType | None:
    # if last resolution failed, id. cite should also fail
    if not last_resolution:
        return None

    # filter out citations based on pin cite
    full_cite = cast(FullCitation, resolutions[last_resolution][0])
    if _has_invalid_pin_cite(full_cite, id_citation):
        return None

    return last_resolution
```

**No pincite inheritance.** Resolution is "stick to the last resolution" plus a sanity check.

`_has_invalid_pin_cite` (line ~102) parses the pincite the `IdCitation` already carries from `find.py`'s `extract_pin_cite`, and rejects values outside `[page, page + 150]` of the resolution's full citation. The constant `MAX_OPINION_PAGE_COUNT = 150` is debated upstream — see [issue #104](https://github.com/freelawproject/eyecite/issues/104), citing cases like *McConnell v. FEC* that exceed 750 pages — but it's still the live cutoff.

### 2.2 What `find.py` does with `Id.`

[`_extract_id_citation`](https://github.com/freelawproject/eyecite/blob/main/eyecite/find.py#L356):

```python
def _extract_id_citation(words, index) -> IdCitation:
    pin_cite, span_end, parenthetical = extract_pin_cite(words, index)
    return IdCitation(
        cast(IdToken, words[index]), index,
        span_end=span_end,
        metadata={"pin_cite": pin_cite, "parenthetical": parenthetical},
    )
```

It reads `at NNN` (or `¶ NNN`, `§ NNN`) from the text after `Id.` and stores it. If the text has bare `Id.`, `pin_cite` is `None`. **Nothing ever fills it in from an antecedent.**

### 2.3 What the test suite confirms

[`tests/test_ResolveTest.py`](https://github.com/freelawproject/eyecite/blob/main/tests/test_ResolveTest.py) line ~262:

```python
self.checkResolution(
    (0, "Foo v. Bar, 1 U.S. 1."),
    (0, "Id."),
    (0, "Id. at 2."),
)
```

The test verifies **clustering** (`0`, `0`, `0` = same resource) but does not check pincite values on the `Id.` objects. The `Id.` between full and `Id. at 2.` has no pincite in eyecite, and that is considered correct.

Later in the same test (lines ~322-326):

```python
(0, "Foo v. Bar, 1 U.S. 1."),
(0, "Id. at 2."),
(1, "Mass. Gen. Laws ch. 1, § 2"),
(1, "Id."),
(0, "Foo, supra, at 2."),
```

The bare `Id.` at index 3 attaches to the `Mass. Gen. Laws` resource — authority boundary respected — but again no pincite is propagated from `§ 2`.

### 2.4 Open issues / PRs about pincite propagation

- [#74 (CLOSED)](https://github.com/freelawproject/eyecite/issues/74) — uses pincite range to filter cluster matches, not to propagate.
- [#104 (CLOSED)](https://github.com/freelawproject/eyecite/issues/104) — discusses the 150-page cap on `MAX_OPINION_PAGE_COUNT`.

A `gh search issues` for `pincite OR pin_cite` in `freelawproject/eyecite` returns only these two. **There is no upstream conversation about inheritance.** eyecite-ts is doing novel work here.

### 2.5 What eyecite-ts already does

[`src/resolve/DocumentResolver.ts`](file:///Users/medelman/Projects/OSS/eyecite-ts/src/resolve/DocumentResolver.ts) lines 280–318 already implement single-hop inheritance:

```ts
// Pincite inheritance (when Id. has none explicit).
if (
  idOut.pincite === undefined &&
  "pincite" in antecedent &&
  typeof antecedent.pincite === "number"
) {
  idOut.pincite = antecedent.pincite
  if ("pinciteInfo" in antecedent && antecedent.pinciteInfo) {
    idOut.pinciteInfo = antecedent.pinciteInfo
  }
}
```

The bug the design fixes: `antecedent = this.citations[resolution.resolvedTo]`. `resolvedTo` is the **terminal full citation** (`Smith`), so any pincite on the intermediate `Id. at 115` is never seen. The fix walks the citation array directly instead of dereferencing `resolvedTo`.

---

## 3. Other reference implementations

### 3.1 CourtListener citator

CourtListener (also FreeLawProject) consumes eyecite. Its citation linking code lives in [`courtlistener/cl/citations/`](https://github.com/freelawproject/courtlistener/tree/main/cl/citations) and does not add a pincite-inheritance layer on top of eyecite. Pincite is used for deep-linking to opinion pages on CourtListener (e.g., `?q=...&page=115`), but always from the pincite the citation already carries — never inherited.

### 3.2 Caselaw Access Project (Harvard)

The CAP citator (now archived; logic absorbed into Harvard Library Innovation Lab's [cap-tools](https://github.com/harvard-lil) repos) extracts citations via a different pipeline rooted in `reporters_db` and does not perform short-form inheritance. CAP's published case data carries explicit pincites where present, and downstream consumers do their own resolution.

### 3.3 citeproc / CSL

Citeproc-CSL is designed for academic citation styles (APA, MLA, Chicago, Bluebook-as-CSL). Its `ibid.` handling (`"after": {"position": "ibid"}`) does carry the pincite forward from the immediate predecessor — this is the closest external precedent for the proposed algorithm. See the [CSL spec on "Disambiguation and Substitution"](https://docs.citationstyles.org/en/stable/specification.html#choose) and Zotero's Bluebook style implementations, which model `Id.` as a CSL "ibid" with locator chaining. The chaining is single-hop-immediate-predecessor, exactly what we're proposing.

### 3.4 Practical conclusion

No mainstream open-source legal citation parser propagates pincite through `Id.` chains the way we're proposing. The closest analog is citeproc's `ibid` semantics, which validates the design conceptually but isn't a code reference. eyecite-ts is staking out novel correctness here; that's why nailing the Bluebook reading matters.

---

## 4. Validation: does the proposed algorithm match?

**The proposed algorithm:**

> For each short-form citation with an undefined pincite and a successful resolution, scan backward. For each prior citation:
> - Determine its "primary" — itself if full, or `resolutions[j].resolvedTo` if short-form.
> - If different primary than current → **break** (authority boundary).
> - If it has a defined pincite → **inherit it**, record `pinciteInheritedFrom: j`, break.

### 4.1 Matches the Bluebook on:

| Bluebook requirement | Algorithm behavior | Match? |
|---|---|---|
| "Same source as immediately preceding citation" | Resolution already establishes same `resolvedTo` | YES |
| "Same page as immediately preceding citation" | Backward scan finds nearest predecessor's pincite | YES |
| Intermediate `Id. at X` should propagate `X` forward | Walks to `j` where pincite is defined; uses **its** value, not the terminal full citation's | YES |
| Different authority breaks chain | Primary mismatch → break before inheriting | YES |
| Parentheticals/prior history don't break the chain | Parentheticals appear in citation array but resolve to **same** primary (or are filtered out as nested cites) — they don't trip the authority-boundary break | YES (relies on resolver behavior, see §5.1) |
| Signals don't break the chain | Signals are not citations; the algorithm walks citations, not text tokens | YES |
| Footnote boundary respected | Inheritance runs *after* scope-aware resolution; if scope said no, there's no `resolvedTo` to inherit from | YES |

### 4.2 Matches the Python eyecite reference on:

- Eyecite doesn't inherit at all → eyecite-ts adds correct behavior eyecite lacks. No conflict with upstream semantics.
- The `_has_invalid_pin_cite` 150-page range check should be **applied to the inherited pincite too**, otherwise we could silently propagate an obviously-wrong pincite. The current eyecite-ts inheritance doesn't run that validation; the new linear-walk version should optionally validate the inherited number against the terminal full citation's page range. (Optional refinement — see §5.3.)

### 4.3 Where the algorithm could be wrong

**Edge case: short-form case citation as intermediate.**

Consider: `Smith v. Jones, 1 U.S. 1, 100 → Jones, 1 U.S. at 115 → Id.`

The second citation is a *short-form case* (not `Id.`), but it shares a primary with `Smith` and has its own explicit pincite `115`. The trailing bare `Id.` should inherit `115`. The proposed algorithm: walks back, finds the short-form's primary == current's primary, finds pincite `115`, inherits. **Correct.**

**Edge case: `supra` as intermediate.**

`Smith → Other, 2 F.3d 1 → Smith, supra, at 50 → Id.`

The bare `Id.` resolves to `Smith` (via the `supra`). Walking back from the `Id.`: predecessor is `Smith, supra, at 50`. Same primary, pincite `50`. **Inherits 50. Correct.**

**Edge case: chained `Id.` with mixed pincite presence.**

`Smith, 1 U.S. 1, 100 → Id. at 115 → Id. → Id. at 200 → Id.`

Walking back from the final `Id.`: predecessor is `Id. at 200` (same primary, pincite 200) → inherit `200`. **Correct.**

Walking back from the middle `Id.` (the second one): predecessor is `Id. at 115` → inherit `115`. **Correct.**

**Edge case: section-style pincites.**

`42 U.S.C. § 1983 → Id. § 1983(c) → Id.`

The middle `Id.` has a section-style pincite (`§ 1983(c)`). The trailing `Id.`: walks back, finds same primary, pincite info structured as section-style → inherit `§ 1983(c)`. **Correct, provided the inheritance code preserves the full `pinciteInfo` structure**, which the current eyecite-ts code does via `idOut.pinciteInfo = antecedent.pinciteInfo` — keep that for the array-walk version.

---

## 5. Refinements and gotchas

### 5.1 Parentheticals: rely on the resolver, not on text scanning

eyecite-ts's resolver already places nested-parenthetical citations into the `parenDepths` array and treats them as scope-restricted. Two cases:

- **Parenthetical citation has its own resolution to a different authority** → it lives in the citation array, the algorithm sees it, **breaks** the chain. This is **wrong** by the Bluebook — parenthetical cites are not intervening authorities.
- **Parenthetical citation is a `cf./citing/quoting` cite to a different source** → same problem.

**Fix:** when walking backward, skip citations whose `parenDepth > parenDepth_of_current`. They're inside an explanatory parenthetical and don't count as intervening. The `parenDepths` array is already computed in `DocumentResolver` (line ~339 `computeParenDepths`), so the data is there. This is a small adjustment to the proposed scan loop:

```ts
for (let j = i - 1; j >= 0; j--) {
  const prior = this.citations[j]
  // Bluebook: nested parenthetical cites don't count as intervening.
  if (this.parenDepths[j] > this.parenDepths[i]) continue
  // ... primary comparison + pincite check
}
```

### 5.2 Signals: zero work needed

Signals are part of the surrounding text, not separate citation tokens. They don't appear in `this.citations`. The algorithm walks `this.citations` only, so signals are invisible to it — which is exactly the right behavior, because the Bluebook treats a `see Smith → see Smith` chain as a valid `Id.` chain.

### 5.3 Validate inherited pincites (optional but worthwhile)

Mirror eyecite's `_has_invalid_pin_cite` against the terminal full citation when inheritance happens. If `inheritedPincite > fullPage + 150` (or `< fullPage`), don't inherit. This guards against weird data — e.g., `Smith, 1 U.S. 1` followed by `Id. at 500.` where the `500` is a typo or actually a different case mis-clustered. eyecite would already drop the `Id.` resolution in that scenario, but a defensive check on inheritance is cheap insurance.

Recommendation: apply the same `MAX_OPINION_PAGE_COUNT` check (probably 150 to match eyecite, possibly higher per [#104](https://github.com/freelawproject/eyecite/issues/104) for long opinions). Make it a parameter.

### 5.4 Footnote scope strategy

Already correct. The `"footnote"` scope is applied in `scopeBoundary.ts` **before** pincite inheritance runs, so by the time the algorithm walks backward, the `Id.` has already been told what its valid antecedents are. If a strict-footnote `Id.` couldn't see an out-of-zone predecessor, the predecessor isn't in its resolution lineage and the algorithm won't even consider walking that far — because the walk terminates at the first authority-boundary, and a cross-zone predecessor will have either no resolution or a different `resolvedTo`.

That said, **be explicit**: the algorithm's authority-boundary primitive is "primary differs," not "scope boundary." That's fine for inheritance purposes — same authority means same correct pincite source, regardless of zone — but document the invariant.

### 5.5 Don't propagate pincite types across categories

eyecite-ts already has the right idea: pincites on case-family citations are numeric (or `pinciteInfo` for `at *2` star pages, paragraph `¶`, etc.); statute pincites are section-style. The existing inheritance code at line 294 (`typeof antecedent.pincite === "number"`) gates on numeric. The new array walk should preserve this discipline: only inherit a pincite when its **type** matches the inheriting citation's expected pincite shape (numeric for case, section for statute). The existing implementation copies `pinciteInfo` wholesale; make sure the walk-based version does the same and doesn't accidentally splice a statute section into an `Id.` that resolves to a case.

---

## 6. Edge cases to test

The regression tests should cover these. Numbered for easy reference in PR review.

| # | Input | Expected `Id.` pincite |
|---|---|---|
| 1 | `Smith, 1 U.S. 1, 100 → Id.` | `100` (inherits from full) |
| 2 | `Smith, 1 U.S. 1, 100 → Id. at 115 → Id.` | `115` (the regression case) |
| 3 | `Smith, 1 U.S. 1, 100 → Id. at 115 → Id. at 200 → Id.` | `200` |
| 4 | `Smith, 1 U.S. 1, 100 → Id. at 115 → Id. → Id.` | `115` for both bare `Id.`s |
| 5 | `Smith, 1 U.S. 1, 100 → Id. at 115 → Jones, 2 F.3d 1, 50 → Id.` | `50` (new authority) |
| 6 | `Smith, 1 U.S. 1, 100 → Id. at 115 → Id. → Jones, 2 F.3d 1 → Id.` | `Id.` after `Jones` has no explicit pincite to inherit (Jones has none); should fall through cleanly with `undefined` |
| 7 | `Smith, 1 U.S. 1, 100 (citing Other, 3 U.S. 1, 5) → Id.` | `100` (parenthetical doesn't break chain — requires §5.1 refinement) |
| 8 | `Smith, 1 U.S. 1, 100 → Smith, 1 U.S. at 115 → Id.` (short-form case, not `Id.`) | `115` |
| 9 | `Smith, 1 U.S. 1, 100 → Jones, 2 F.3d 1 → Smith, supra, at 50 → Id.` | `50` (inherit from supra) |
| 10 | `42 U.S.C. § 1983 → Id. § 1983(c) → Id.` | `§ 1983(c)` (preserve `pinciteInfo`) |
| 11 | `Smith, 1 U.S. 1, 100 → see also Id. at 115 → see Id.` | `115` (signals don't break chain) |
| 12 | Footnote 1: `Smith, 1 U.S. 1, 100.` Footnote 2: `Id. at 115.` Footnote 3: `Id.` | `115` (cross-footnote allowed since each footnote has single authority; honor existing scope strategy) |
| 13 | `Smith, 1 U.S. 1, 100 → Id. at 9999.` | depending on validation (§5.3): either inherit nothing or reject the `9999` outright |
| 14 | `Smith, 1 U.S. 1, 100 → Id. at 115 → Id. (citing Other, 3 U.S. 1, 5) → Id.` | First bare `Id.` inherits 115; second bare `Id.` inherits 115 too (nested cite to `Other` is parenthetical) |

Cases 7 and 14 require the §5.1 parenthetical-depth refinement. Cases 11 is free if the algorithm only walks citation objects.

---

## 7. Recommendations

**Priority order, all actionable:**

1. **Ship the proposed linear-backward-scan-stop-at-authority-boundary algorithm.** It matches Rule 4.1 and corrects a real bug. (Cases 1–6, 8–10, 12)
2. **Add parenthetical-depth skipping in the backward walk** using existing `parenDepths`. This is a 2-line change that captures the Bluebook's explicit exception. (Cases 7, 14)
3. **Add the `MAX_OPINION_PAGE_COUNT` sanity check on inherited pincites**, mirroring eyecite. Make it configurable (default 150 to match upstream, with awareness of [#104](https://github.com/freelawproject/eyecite/issues/104)). (Case 13)
4. **Preserve `pinciteInfo` wholesale** when inheriting, and gate on type compatibility (numeric ↔ case, section ↔ statute), as the current implementation already does. (Case 10)
5. **Record `pinciteInheritedFrom: j`** on the inheriting citation. This is provenance metadata for the migration guide and consumers; matches the project's existing `confidence` and `processTimeMs` pattern of "we explain why."
6. **Test all 14 cases above.** Cases 4, 5, 6, 14 are the highest-value because they exercise the algorithm's invariants directly.

**Do NOT:**

- Walk text tokens (signals, surrounding prose) — only walk the `citations` array.
- Try to disambiguate between "writer omitted explicit pincite because same as predecessor" vs. "writer forgot to add a pincite." The Bluebook treats them as identical; the parser should too.
- Look for `resolvedTo` to be a short-form (it won't be — `resolvedTo` always points to a full citation). The walk is over `citations[]` directly; that's how we sidestep the existing bug.

---

## Sources

**Bluebook authoritative summaries** (Rule 4.1):

- [Tarlton Law Library — Short form: Id., Infra, Supra, Hereinafter](https://tarlton.law.utexas.edu/bluebook-legal-citation/short-form) — Rule 4.1 paraphrase; "immediately preceding cited authority"; parenthetical/history exception.
- [UC Davis Mabie Law Library — Short Citation Forms](https://libguides.law.ucdavis.edu/c.php?g=1014499&p=7370559) — "Use Id. when citing the immediately preceding authority" + single-authority requirement.
- [Hawaii Law Library — Weird Bluebook Rules](https://law-hawaii.libguides.com/c.php?g=125486&p=821513) — Four explicit Id. rules; single-authority requirement.
- [Loyola Chicago — Short Citation Forms](https://lawlibguides.luc.edu/bluebook/short_form) — "If the page number has changed, indicate that with 'at'".
- [Suffolk Law — Advanced Bluebook](https://lawguides.suffolk.edu/bluebook/advanced) — Rule 4.1 reference; pinpoint-cite variations.
- [Tarlton — Intro Signals](https://tarlton.law.utexas.edu/bluebook-legal-citation/intro-signals) — signals' interaction with citations.
- [Casebriefly — Id. Citation Rules](https://www.casebriefly.com/bluebook-citation-generator/id-citation) — "Id. always refers to the immediately preceding cited authority."
- [TypeLaw — Id. vs ibid.](https://www.typelaw.com/blog/when-to-use-id-versus-ibid-in-legal-brief-citations/) — "If there's any interruption with a different source, don't use Id."
- [AllCitations — Bluebook Short Form](https://www.allcitations.com/blog/bluebook-short-form-citations-id-supra) — synthesizes Rule 4.1.

**Python eyecite reference** (commit `main` HEAD, 2026-05-19):

- [`eyecite/resolve.py`](https://github.com/freelawproject/eyecite/blob/main/eyecite/resolve.py) — `_resolve_id_citation`, `_has_invalid_pin_cite`, `MAX_OPINION_PAGE_COUNT = 150`. No inheritance.
- [`eyecite/find.py`](https://github.com/freelawproject/eyecite/blob/main/eyecite/find.py#L356) — `_extract_id_citation` extracts only what the `Id.` text contains.
- [`eyecite/models.py`](https://github.com/freelawproject/eyecite/blob/main/eyecite/models.py) — `CitationBase.Metadata.pin_cite: str | None`; never written from elsewhere.
- [`tests/test_ResolveTest.py`](https://github.com/freelawproject/eyecite/blob/main/tests/test_ResolveTest.py) — `test_id_resolution`, `test_non_case_resolution` — verifies clustering, not inheritance.
- [Issue #74 (closed)](https://github.com/freelawproject/eyecite/issues/74) — pincite used for cluster filtering only.
- [Issue #104 (closed)](https://github.com/freelawproject/eyecite/issues/104) — discusses `MAX_OPINION_PAGE_COUNT = 150` and long opinions.

**eyecite-ts current state**:

- [`src/resolve/DocumentResolver.ts`](file:///Users/medelman/Projects/OSS/eyecite-ts/src/resolve/DocumentResolver.ts) lines 280–318 — current single-hop inheritance from `resolvedTo`; the bug origin.

**Related implementations**:

- [Citation Style Language (CSL) spec](https://docs.citationstyles.org/en/stable/specification.html) — "ibid" semantics chain locators; conceptual precedent (not code).
