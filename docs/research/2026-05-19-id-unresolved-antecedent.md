# Research: `Id.` Resolution When Predecessor Is an Unresolved Short-Form

**Date:** 2026-05-19
**Query:** When `Id.` follows a short-form citation whose own antecedent cannot be located (because the case name was introduced in prose rather than as a structured full citation), what should the resolver do? Is the right answer to (A) relax `resolvedTo` to accept short-forms, (B) add a separate `clusterId`, or (C) add an `antecedentIndex` pointer alongside `resolvedTo`?
**Depth:** deep

---

## TL;DR Recommendation

**Adopt Option C (`antecedentIndex`) as the data-model change, paired with a narrow extension to `resolveId` and forward-looking prose case-name extraction.**

The Bluebook is explicit that `Id.` anchors to the **immediately preceding cited authority**, not to its resolved bibliography entry. CSL/citeproc treats `ibid` the same way — purely positional. Python eyecite's choice to drop the `Id.` is a documented limitation of its bibliographic resolver model (it can't represent "this is a chained citation but the underlying authority is unknown"), and the eyecite team has been actively shipping patches in that exact area (`ReferenceCitation`, PRs #191/#200/#202/#247, Jan–May 2025) precisely because the model can't grow.

`antecedentIndex` is the smallest surgical fix that:

1. Matches Bluebook semantics — `Id.` always points to the preceding citation, full stop, regardless of whether that citation has a deeper authority resolved.
2. Has prior art *inside this very codebase*: `ShortFormCaseCitation.pinciteInheritedFrom` is already a `number` chain pointer with the same shape, documented as "Records the immediate predecessor; follow transitively for the chain's originator" (`src/types/citation.ts:832-838`).
3. Is additive — no downstream consumer breaks. Existing `resolvedTo` semantics stay strict ("points to a successfully resolved full cite").
4. Naturally generalizes: short-forms also get `antecedentIndex` if we want to expose their position-chain.

Option A (relax `resolvedTo`) silently changes the contract for every existing consumer — they get a short-form back from what they thought was a guaranteed-full-cite pointer. Option B (`clusterId`) solves a different problem (post-hoc grouping for UI) and answers neither "where do I look up the page?" nor "what's the predecessor?" in O(1).

A modest follow-on (independent of the data model) is to **extend prose case-name extraction** so the `Leach …` / "In Yellen v. Kassin" / "Yellen, 416 N.J. Super. at 590" sequence resolves Yellen's short-form properly via the prose-introduced name. eyecite-ts already extracts `partyName` on `ShortFormCaseCitation` (`src/types/citation.ts:848`), and Python eyecite added a `ReferenceCitation` path in PR #191 to harvest forward references — the missing piece is a **backward** sweep when a short-form's vol+reporter has no in-history match.

---

## The Specific Bug

User input (real brief):

> Leach v. Anderl, 218 N.J. Super. 18, 30–31 (App. Div. 1987). **In Yellen v. Kassin**, the Appellate Division squarely held that … **Yellen, 416 N.J. Super. at 590–91**, **3 A.3d at 590–91**. The court reversed … **Id. at 590.**

Author intent: `Id.` → Yellen. Bluebook compliant.

Current behavior (`src/resolve/DocumentResolver.ts:452-465`):

```ts
for (let i = currentIndex - 1; i >= 0; i--) {
  const c = this.citations[i]
  let primaryIdx: number

  if (isFullCitation(c)) {
    primaryIdx = i
  } else {
    // shortForm/Id./supra — follow the resolution chain. If it failed to
    // resolve we skip it: a broken short-form shouldn't pin Id. to a
    // citation the writer didn't successfully cite.
    const prev = this.resolutions[i]
    if (!prev || prev.resolvedTo === undefined) continue
    primaryIdx = prev.resolvedTo
  }
  ...
```

Because the Yellen short-form has `resolution.resolvedTo === undefined` (eyecite-ts has no full Yellen citation in `citations[]` to match against — only the prose mention), the walk skips it and lands on **Leach**. Wrong authority.

This is the *exact* failure mode the docstring above worries about ("a broken short-form shouldn't pin Id. to a citation the writer didn't successfully cite"), but the cure is worse than the disease — it pins `Id.` to a citation the writer **deliberately walked past**.

---

## Finding 1 — Bluebook Rule 4.1 / Indigo Book R6.2.2: `Id.` is Positional, Not Bibliographic

### Convergent authority

Every secondary source the search surfaced says the same thing:

> `Id.` always refers to the **immediately preceding cited authority**.
> ([Bluebook v21 R4.1](https://www.legalbluebook.com/bluebook/v21/rules/4-short-citation-forms/4-1-id), via [Tarlton Law Library](https://tarlton.law.utexas.edu/bluebook-legal-citation/short-form))

Indigo Book R15.3.1 phrases the same rule:

> _Id._ should be used only if the preceding citation cites to one source.
> ([Indigo Book §R15.3](https://law.resource.org/pub/us/code/blue/IndigoBook.html))

The Bluebook's only constraints on `Id.` are positional (immediately preceding) and disambiguation-based (preceding citation must cite only one source; intervening string-cites or multi-authority sentences kill `Id.`). **There is no Bluebook rule that conditions `Id.` on the preceding citation being a full citation, nor on the preceding citation being "resolvable" in any bibliographic sense.** The Bluebook predates structured citation databases by 70 years; it speaks of typographical adjacency, not graph edges.

### What the Bluebook actually requires of the writer

The writer's duty is satisfied when **the reader can identify the cited authority from context**. Bluebook R10.9 (short form for cases) says the short form is permissible "if it will be clear from context to the reader what is being referenced." A case name introduced narratively in prose — "In _Yellen v. Kassin_, the Appellate Division held…" — does in fact establish the authority for a reader, and the Bluebook explicitly permits a subsequent short-form citation under R10.9. So the writer here is doing nothing wrong; the parser, not the brief, is short of state.

### Implication for the resolver

`Id.` resolution should ask *"what authority did the writer just talk about?"*, not *"what authority did my full-citation database successfully match?"* The current eyecite-ts model fuses those two questions. Splitting them is the design move.

---

## Finding 2 — Python Eyecite Drops the `Id.` Entirely (and Knows This Is a Limitation)

### Verbatim reference behavior

From [`eyecite/resolve.py`](https://github.com/freelawproject/eyecite/blob/main/eyecite/resolve.py) (base64-decoded):

```python
def _resolve_id_citation(
    id_citation: IdCitation,
    last_resolution: ResourceType,
    resolutions: Resolutions,
) -> ResourceType | None:
    """Resolve id citations to the resource of the previously resolved citation."""
    # if last resolution failed, id. cite should also fail
    if not last_resolution:
        return None
    ...
```

And from the main loop:

```python
last_resolution = resolution  # only set when the cite resolved
if resolution:
    resolutions[resolution].append(citation)
# else: citation is silently dropped from the resolutions dict
```

`last_resolution` is updated on **every** iteration to the current cite's `resolution`. If the current cite is a short-form that returns `None`, `last_resolution = None` and the next `Id.` also returns `None` and is dropped. The `tests/test_ResolveTest.py` test suite confirms this with a fixture (`"Foo v. Bar, 1 U.S. 1." → "2 F.2d, at 2." → "Id. at 2."`) expecting all three of `(0, None, None)`.

### Why this is a model limit, not a design choice

Python eyecite's `Resolutions` is `dict[ResourceType, list[CitationBase]]` — a one-to-many index keyed by *resolved authority*. There is no native shape for "this short-form and this `Id.` are clustered together but the underlying `Resource` is unknown." The data structure forces "drop on failure."

### eyecite has been actively patching around this

Beginning January 2025, eyecite added `ReferenceCitation` ([PR #191](https://github.com/freelawproject/eyecite/pull/191)) — a wholly new citation class for the "[NAME] at [PAGE]" prose pattern that appears *after* a full citation. Follow-ups #200, #202, #203, #207, #214, #241, #247, #251, #260, #263 (Jan–May 2025) all expand prose-name extraction. Crucially, `ReferenceCitation` is **forward-only**: it scans text after a known full citation looking for `Smith at 240`, but **does not handle the reverse case** where the prose mention precedes the structured short-form. eyecite's WebFetch'd `find_case_name(short=True)` path only looks at HTML emphasis tags adjacent to the short-form, not at preceding prose.

So: Python eyecite (a) cannot resolve the Yellen short-form, (b) drops the chained `Id.`, and (c) is the upstream reference implementation but has an active open gap in this area. eyecite-ts can do better here without diverging from upstream's *philosophy* — just from upstream's *data shape*.

### Issues to watch

- [#75 (open)](https://github.com/freelawproject/eyecite/issues/75) — Skip supra cites to current document
- [#299 (open)](https://github.com/freelawproject/eyecite/issues/299) — `Id.` doesn't capture pin cite with § references
- No open issue specifically about "Id. after unresolved short-form" (checked all open & closed issues), suggesting upstream considers the current behavior a known constraint of the bibliographic model.

---

## Finding 3 — CourtListener Citator Adds an Outer Resolution Layer

[CourtListener](https://www.courtlistener.com/help/api/rest/citation-lookup/) consumes eyecite output and adds a **post-extraction reverse-matching layer**: when a citation is ambiguous (matches multiple opinions in their database), they "search the case name from each potential match in the original document and if there is only one match, then that becomes the linked citation." They explicitly call out that "Reference citations lacking a full case name can be difficult to extract accurately" and that "Eyecite allows for an initial citation extraction, followed by a secondary reference resolution step. If you have an external database that provides resolved case names, you can use this feature."

This validates the architectural separation Option C creates: **antecedent linking (parser concern) is distinct from authority resolution (citator/database concern).** A library can confidently say "these citations are part of the same chain" without committing to "and they all refer to record `xyz` in your database."

---

## Finding 4 — CSL / citeproc `ibid` Is Purely Positional

The [CSL 1.0.2 spec](https://docs.citationstyles.org/en/stable/specification.html) defines `ibid` strictly by sequence position relative to the previous cite — *not* by whether the previous cite successfully matched a bibliography entry:

> The "ibid"/"ibid-with-locator"/"subsequent" positions apply to cites referencing previously cited items, which have the "subsequent" position.
> When the preceding cite does not have a locator … the position of the current cite is "ibid".

The position assignment runs against the **citation stream**, independent of bibliography resolution. citeproc-js's later refactor (`processCites` returning `[[(Cite, Maybe Reference)]]`) institutionalized this separation: a citation can have a position-context (ibid) and an *unresolved* reference simultaneously. That is exactly the shape we need.

[pandoc-citeproc issue #53](https://github.com/jgm/pandoc-citeproc/issues/53) and the [Hayagriva position bug](https://github.com/typst/hayagriva/issues/122) both wrestle with the same problem from the other side — sequence-vs-resolution is so canonically separable that bugs arise when implementations conflate them.

---

## Finding 5 — `antecedentIndex` Already Has Prior Art Inside `eyecite-ts`

`ShortFormCaseCitation.pinciteInheritedFrom: number` (added for #303-class inheritance work) is documented in `src/types/citation.ts:832-838`:

```ts
/**
 * Array index of the citation from which `pincite` was inherited.
 * Indexes into the same array this citation appears in — i.e., the
 * output of `extractCitations(...).citations` (or
 * `DocumentResolver.resolve()`'s output, which preserves input order).
 * Set only when `pinciteInherited` is true. Records the immediate
 * predecessor; follow transitively for the chain's originator.
 */
pinciteInheritedFrom?: number
```

Same shape (`number` index into the citation array), same semantics ("records the immediate predecessor; follow transitively for the chain's originator"), same backward-compat story (additive, optional). Adopting `antecedentIndex` on the resolution object is internally consistent with how the codebase already models predecessor links.

Note also that `SupraCitation` carries the **same** `pinciteInheritedFrom` field (`src/types/citation.ts:793-800`) — chain pointers are not a novel concept here.

---

## Finding 6 — Prose Case-Name Extraction is Half-Built

`extractCaseName` already exists in `src/extract/extractCase.ts:1150` and is invoked from full-citation extraction (`extractCase.ts:2615+`). It does a structured backward walk for `Party v. Party` patterns within a bounded window.

`extractShortForms.ts:443-488` already extracts a `partyName` from text *embedded in the short-form itself* (`Yellen, 416 N.J. Super. at 590` → `partyName = "Yellen"`). And the resolver at `DocumentResolver.ts:809-826` already uses `partyName` to disambiguate when multiple full cites match `416 N.J. Super.`.

The missing capability — adapting `extractCaseName` (or a sibling) to scan **backward from a short-form** when no in-history full citation matches the short-form's vol+reporter — would not be a new architectural axis. It's a forward extension of work already in flight.

---

## The Three Candidate Fixes — Trade-Off Matrix

| Dimension | A: Relax `resolvedTo` to accept short-forms | B: Add `clusterId` field | **C: Add `antecedentIndex` field** |
|---|---|---|---|
| **Bluebook fidelity** | Partial — `Id.` finds something, but consumers still have to chase pointers to get the actual authority | Weak — `clusterId` says "same group" but doesn't preserve adjacency / direction | **Strong — directly encodes "immediately preceding" semantic** |
| **Python eyecite prior art** | None — they don't do this | None — they don't do this either | Closest: `Resolutions` keyed by `Resource` is the same idea inverted; CSL `position=ibid` is the same idea |
| **In-repo prior art** | None — would invert the existing strict-full contract | None | **Strong: `pinciteInheritedFrom`** is the same field shape, same semantics |
| **Breaking change** | **Yes** — every consumer expecting `citations[resolvedTo]` to be a `FullCitation` breaks (type narrowing, UI rendering, downstream resolvers) | No — additive | **No — additive** |
| **Type system cost** | `resolvedTo: number` becomes `resolvedTo: number /* may be short-form */` and the discriminated union loses a guarantee | Trivial: `clusterId?: string` | Trivial: `antecedentIndex?: number` |
| **Solves the real bug?** | Yes — `Id.` would chain through unresolved short-forms | **No** — consumer still has to ask "what's `Id.`'s real predecessor?" — `clusterId` alone gives you the set but not the order | **Yes — `Id.` writes its `antecedentIndex` to the unresolved short-form, and the chain is walkable** |
| **Handles the wider class of clustering needs (UI grouping, parallel cites)?** | No | **Yes** — but at the cost of being a parallel solution to a different problem | Partial — `antecedentIndex` is a chain pointer, so transitive closure gives you the cluster |
| **Effort estimate** | Tiny code change, huge consumer-facing fallout | Small, but unclear payoff for the actual bug | Small — single field add + resolver tweak + tests |

### A's failure mode in detail

If we relax `resolvedTo`, consider what `citations[id.resolution.resolvedTo]` returns: a `ShortFormCaseCitation` with no full case-name fields, no court, no year. Every existing consumer that does `if (target.type === "case") { render(target.caseName) }` silently produces empty strings. This is the most expensive option *because* it looks cheap.

### B's mismatch with the question

`clusterId` is the right answer to a *different* question — "give me all the citations to authority X for de-duping in a UI." It's a worthwhile field on its own. But it doesn't tell `Id.` who its immediate predecessor is, and it doesn't preserve sequence. You'd still need either A's relaxation or C's chain pointer to make the resolver work; `clusterId` would always sit alongside one of them.

### C's strengths

- The resolver writes a small change: when the walk finds a non-full citation at index `i` whose `resolvedTo` is undefined, it **stops** there and records `antecedentIndex = i` (instead of skipping). The strict `resolvedTo` contract for full-cite resolution is preserved by leaving `resolvedTo` undefined in that case.
- Consumers who want to walk the chain do `while (antecedentIndex !== undefined) { ... }` and get the originator — the same idiom the codebase already documents for `pinciteInheritedFrom`.
- Consumers who only care about the resolved authority continue to use `resolvedTo` and get back a guaranteed `FullCitation` — the existing contract.
- Annotators that just want to render `Id. → "Yellen"` use `citations[antecedentIndex].partyName ?? citations[antecedentIndex].text` — no full-cite lookup required.

---

## Recommended Implementation Sketch

> **Not implementation — scope-of-change estimate to inform the decision.**

### Data-model change (`src/resolve/types.ts`)

```ts
export interface ResolutionResult {
  /** Index of the FULL citation this resolves to. Unchanged contract. */
  resolvedTo?: number
  /**
   * Index of the immediately preceding cited authority in document order,
   * regardless of whether that citation itself resolved to a full cite.
   * Always set when the resolver could anchor `Id.`/short-form to *some*
   * preceding citation. May equal `resolvedTo` for clean chains; differs
   * when the predecessor is itself an unresolved short-form (Bluebook R4.1
   * compliance for prose-introduced authorities).
   */
  antecedentIndex?: number
  failureReason?: string
  warnings?: string[]
  confidence: number
}
```

### Resolver change (`src/resolve/DocumentResolver.ts:452-465`)

Two-pass walk: prefer the closest full-cite-resolved candidate (current behavior), but if **no candidate at all is found**, fall back to the most recent non-full citation and set `antecedentIndex` (leaving `resolvedTo` undefined). Confidence drops to ~0.7. Add a warning: `"Id. antecedent has unresolved authority; chained by position only"`.

### Optional follow-on: backward prose-name extraction

When a short-form fails vol+reporter lookup, run `extractCaseName` on the preceding ~200 chars of prose. If it finds `Party v. Party` and the short-form's `partyName` matches either side, **promote** the prose mention to an implicit full-citation anchor (or attach it to the short-form's metadata so downstream consumers can do the lookup). This addresses the upstream gap eyecite hasn't filled, would close out a real class of brief-writing styles, and is independent of the data-model change.

### Test cases to add

1. The literal Leach/Yellen fixture from the bug report — `Id.` must land on Yellen's short-form, not Leach.
2. `Id.` after an unresolved short-form whose vol+reporter has no match anywhere — `antecedentIndex` set, `resolvedTo` undefined, warning emitted.
3. `Id.` after a resolved short-form — `resolvedTo` and `antecedentIndex` both point through to the originating full cite (or `antecedentIndex` to the short-form, `resolvedTo` to the full cite — pick one and document it; the latter is more consistent with "immediately preceding").
4. Chain of two `Id.`s after an unresolved short-form — both anchor, no drift.
5. Regression: confirm existing tests around quote zones, footnote scope, parenthetical-child, and weak-signal filtering still produce identical `resolvedTo` values (the strict contract is untouched).

---

## Open Questions for the Implementer

1. **Should `antecedentIndex` point at the immediately preceding citation always, or at the most recent "primary" citation (skipping parenthetical children and weak-signal asides)?** The Bluebook says strictly immediately preceding (excluding string-cite members and parentheticals — see R4.1 carve-outs). Recommend: mirror the existing filters but allow short-forms regardless of resolution state.
2. **For resolved chains, does `antecedentIndex` point at the predecessor cite (one step back) or transitively at the originator?** Recommend: one step back. Transitive walk is the consumer's job, and that's how `pinciteInheritedFrom` is already documented.
3. **Should the resolver emit an `Id.` resolution with `resolvedTo` populated by *following* the antecedent's own `antecedentIndex` chain to find a full cite, if one is upstream?** I.e., if `Id. → unresolved short-form → some earlier full cite (because the short-form had a different unresolved name)`. Recommend: no, at least for v1. The Bluebook says `Id.` is anchored to the *immediately* preceding authority; if the writer chained short-forms to two different authorities through a prose name, only the predecessor authority is what `Id.` actually means.
4. **Naming.** `antecedentIndex` is clear but verbose; `predecessorIndex` and `priorCiteIndex` are alternatives. Whatever name is picked should differ from `resolvedTo` enough that the distinction is hard to miss.

---

## Sources

### Bluebook & Indigo Book
- [Bluebook v21 R4.1 "Id."](https://www.legalbluebook.com/bluebook/v21/rules/4-short-citation-forms/4-1-id) — primary rule; "Id. always refers to the immediately preceding cited authority."
- [Indigo Book §R15.3 (R6.2.2 in earlier numbering)](https://law.resource.org/pub/us/code/blue/IndigoBook.html) — "Id. should be used only if the preceding citation cites to one source."
- [Tarlton Law Library — Short form: Id., Infra, Supra, Hereinafter](https://tarlton.law.utexas.edu/bluebook-legal-citation/short-form) — secondary summary, confirms positional rule.
- [UC Davis Bluebook Guide — Short Citation Forms](https://libguides.law.ucdavis.edu/c.php?g=1014499&p=7370559) — ambiguity-avoidance gloss.
- [Bluebook R10.9 — Short Forms for Cases](https://guides.ll.georgetown.edu/c.php?g=261289&p=2339389) — "clear from context to the reader."

### Python Eyecite (Reference Implementation)
- [`eyecite/resolve.py` (main)](https://github.com/freelawproject/eyecite/blob/main/eyecite/resolve.py) — `_resolve_id_citation` source; "if last resolution failed, id. cite should also fail."
- [`eyecite/find.py` (main)](https://github.com/freelawproject/eyecite/blob/main/eyecite/find.py) — `find_case_name(short=True)` only looks at HTML emphasis tags, not prose.
- [`eyecite/models.py` (main)](https://github.com/freelawproject/eyecite/blob/main/eyecite/models.py) — no chain pointer field on `IdCitation`/`ShortCaseCitation`; `Resolutions` is `dict[ResourceType, list[CitationBase]]`.
- [PR #191 — Add Reference Citation Extractor](https://github.com/freelawproject/eyecite/pull/191) (Jan 2025) — introduces forward-only prose-name extraction; 1,188 new references in 1% sample.
- [PR #200 — feat(ReferenceCitation): use resolved_case_name](https://github.com/freelawproject/eyecite/pull/200) (Feb 2025) — `ReferenceCitation` integrated with resolved case names.
- [PR #202 / #203 / #207 / #214 / #241 / #247 / #251 / #260 / #263](https://github.com/freelawproject/eyecite/pulls?q=is%3Apr+is%3Aclosed+reference) — successive reference-citation refinements through May 2025.
- [Issue #299 (open) — Id. doesn't capture pin cite with § references](https://github.com/freelawproject/eyecite/issues/299) — adjacent `Id.` resolution edge case.
- [Issue #75 (open) — Skip supra cites to current document](https://github.com/freelawproject/eyecite/issues/75) — confirms upstream openness to refining short-form semantics.

### CourtListener (Downstream Consumer)
- [Citation Lookup and Verification API](https://www.courtlistener.com/help/api/rest/citation-lookup/) — outer reverse-matching layer atop eyecite; "Reference citations lacking a full case name can be difficult to extract accurately."
- [CourtListener FAQ — Citator](https://www.courtlistener.com/faq/) — describes the reverse-matching strategy for ambiguous citations.

### CSL / citeproc (Cross-Domain Reference)
- [CSL 1.0.2 Specification — Position](https://docs.citationstyles.org/en/stable/specification.html) — `ibid` defined purely by stream position, independent of bibliography resolution.
- [pandoc-citeproc Issue #53 — Disambiguation problems in ibid styles](https://github.com/jgm/pandoc-citeproc/issues/53) — illustrates the value of separating position from resolution.
- [Hayagriva Issue #122 — CSL position "ibid" isn't tested well](https://github.com/typst/hayagriva/issues/122) — same separation surfacing in a different impl.
- [pandoc-citeproc 0.16+ changelog](https://hackage.haskell.org/package/pandoc-citeproc-0.16.0.1/changelog) — `processCites` type evolved to `[[(Cite, Maybe Reference)]]` to permit position-without-resolution.

### eyecite-ts Internal Prior Art
- `src/types/citation.ts:783-800` — `SupraCitation.pinciteInheritedFrom: number` — existing chain-pointer field.
- `src/types/citation.ts:817-852` — `ShortFormCaseCitation` already carries `partyName`/`partyNameNormalized` and `pinciteInheritedFrom`.
- `src/resolve/DocumentResolver.ts:452-528` — current `resolveId` algorithm where the skip-on-unresolved happens.
- `src/resolve/DocumentResolver.ts:604-705` — `applyCaseNameWindowCheck` already detects prose names near `Id.` and downgrades confidence; logical extension point for `antecedentIndex` warnings.
- `src/extract/extractCase.ts:1150` — `extractCaseName` backward search, candidate for adaptation to short-form backward prose extraction.
- `src/extract/extractShortForms.ts:443-488` — short-form `partyName` extraction already in place.
