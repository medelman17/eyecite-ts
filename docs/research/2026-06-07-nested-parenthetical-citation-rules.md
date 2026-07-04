# Nested-Parenthetical Citations: Doctrine vs. Implementation

**Date:** 2026-06-07
**Question:** How do legal citation authorities treat a citation nested inside another citation's explanatory parenthetical — e.g. `Smith v. Jones, 200 F.3d 100 (2d Cir. 2000) (quoting Doe v. City, 100 F.2d 1)` — and should an extraction tool surface it as a top-level resolvable citation or a subordinate child? (Informs eyecite-ts #851.)
**Depth:** deep (5 angles · 16 sources fetched · 62 claims → 25 verified → 19 confirmed / 6 killed · 98 agents)
**Verdict:** Doctrine and the reference implementation point in **opposite** directions. The "correct" answer is the subordinate-child model — but with one doctrinal exception (Rule 10.9(a)) that makes blanket non-resolvability **overbroad**.

> Research docs are gitignored by team convention (not committed).

---

## TL;DR

1. **Doctrine: the nested cite is SUBORDINATE, not an independent authority.** `(quoting B)` / `(citing B)` are named *parenthetical types* that occupy fixed slots within the host citation's parenthetical sequence (Bluebook Rule 1.5(b)) — a structured component of authority A, not a separately-listed authority. (High confidence.)
2. **`Id.` after `A (quoting B)` resolves to A, never B.** Rule 4.1: sources in explanatory parentheticals "are not counted as intervening authorities." Canonical example: *Tuten* (quoting *Ralston*) → later `id.` = *Tuten*. **`supra` likewise will not attach to B.** (High confidence.) — eyecite-ts already does this (#214/#799).
3. **The one exception — Rule 10.9(a):** a case *first cited in a parenthetical* **can** still anchor a later **case short form** (e.g. `100 F.2d at 5`), within the five-footnote window — even though `Id.`/`supra` ignore it. So "non-resolvable child" is doctrinally sound for `Id.`/`supra` but **overbroad** for the case-short-form pathway. (Medium confidence.) — this is exactly eyecite-ts's deliberately-kept "short-form case resolves to a parenthetical-internal citation" behavior, which turns out to be **doctrinally correct**.
4. **Peer tools do the OPPOSITE.** Python eyecite stores the parenthetical as an opaque flat string, never parses cites out of it, and `filter_citations` has an explicit branch that **keeps** a separately-tokenized nested cite as a co-equal, fully-resolvable top-level peer — so a following `Id.` empirically resolves to the buried inner cite (the Rule 4.1 violation #830/#831 exemplified). CourtListener inherits this (flat opinion→opinion edges, `depth` = frequency only, no nesting field). **Cite eyecite as the counter-example the design corrects, not as precedent.**

**Bottom line for #851:** the *nesting model* is doctrinally right and a justified divergence from upstream. Excluding children from `Id.`/`supra` is right (already done). **Fully removing them from the top-level array by default is overbroad** (breaks Rule 10.9(a) case-short-forms; diverges from the ecosystem; breaking for consumers). → Favor **additive nesting by default + the strict top-level exclusion behind an opt-in flag.**

---

## Q1 — Subordinate or independent authority?

**Subordinate.** A parenthetical is "an explanatory phrase included in parentheses at the end of a legal citation" (Georgetown Law writing-center handout, verified verbatim). Bluebook **Rule 1.5(b)** fixes the order of parenthetical *types* within a single host citation:

> `… (citations omitted) (quoting another source) (internal quotation marks omitted) (citing another source) …`

`(quoting …)` and `(citing …)` sit in that ordered sequence alongside `(emphasis added)`, `(citations omitted)`, etc. — i.e., they are **components of authority A's citation**, not separate entries in the authority list. (Corroborated by Temple Law Review Rule B.6.) Confidence: **high** (3-0 + 2-1 + 2-1 across independent guides).

## Q2 — `Id.` / `supra` / short-form resolution

**`Id.` → host A, never nested B.** Bluebook **Rule 4.1** (verbatim via Tarlton/UT, corroborated by 5+ law-school guides):

> "Sources cited in explanatory parentheticals or phrases or as part of a case prior or subsequent history are **not counted as intervening authorities** preventing the use of Id."

Hawaii LibGuide: "whatever explanatory information is contained in a preceding parenthetical is **ignored** in the Id. citation." Indigo Book (verbatim): "If there is an explanatory parenthetical or phrase in the preceding citation, it is **not incorporated** with the use of id." Canonical example: `Tuten v. United States, 460 U.S. 660, 663 (1983) (quoting Ralston v. Robinson, 454 U.S. 201, 206 (1981))` + `See id. at 664` → **Tuten**. Confidence: **high**; no contradicting source found.

> The deep-research pass *killed* (0-3 / 1-2) several plausible-sounding claims that `Id.` is **barred outright** when `A (quoting B)` "presents two authorities." Verifiers rejected that framing: under Rule 4.1 the parenthetical case is *not counted* as a second authority, so `Id.` is permitted and cleanly resolves to A. Worth recording so we don't reintroduce that wrong intuition.

**The exception — Rule 10.9(a) / Bluepages B10.2 (case short forms).** Short forms are permitted once a full citation exists and "(1) it is clear to the reader which authority is referenced; (2) the full citation falls in the same general discussion; and (3) the reader will have little trouble locating the full citation." The verifier caveat is decisive for us:

> **Rule 10.9(a)'s five-footnote rule is a genuine narrowing exception: a case first appearing in a parenthetical CAN anchor a later CASE short form, even though `supra` cannot attach to it and `Id.` ignores it.** So "non-resolvable child by default" is doctrinally defensible but **not absolute** for the case-short-form pathway specifically.

This maps **exactly** onto eyecite-ts's existing, deliberately-tuned resolver:

| Reference | Doctrine | eyecite-ts today |
|---|---|---|
| `Id.` after `A (quoting B)` | → A (Rule 4.1) | → A (#214) ✓ |
| `supra` for B | abstains (B not a proper antecedent) | abstains (#799) ✓ |
| case short form `100 F.2d at 5` for B | **permitted** (Rule 10.9(a)) | resolves to B ✓ |

The resolver is doctrinally precise. **Full top-level exclusion would break the third row.**

## Q3 — What it implies for an extraction tool

Model the nested cite as a **child/attachment of its host** and keep it **out of `Id.`/`supra` resolution** — the subordinate model. But because Rule 10.9(a) preserves the case-short-form pathway (and because removing cites from a flat list breaks ecosystem parity), the *child node should remain reachable/resolvable for case short forms*, not be deleted outright.

## Peer tools — the doctrine-vs-implementation split

- **Python eyecite (the upstream eyecite-ts ports):** parenthetical stored as `parenthetical: str | None` on `CitationBase.Metadata` — opaque text, never parsed into sub-citations (`process_parenthetical` only balances parens / drops year-only). Verified at commit `04d82c0` + current main; grep for nested/child/subordinate/recursive = 0 hits. **But** `filter_citations` deliberately **keeps** a separately-tokenized nested cite as a top-level peer:
  > `# A citation in a paren would also overlap and should be kept. … if paren and citation.matched_text() in paren: filtered_citations.append(citation); continue`
  Empirically (eyecite v2.7.6 on our example): a **flat list of 2 co-equal `FullCaseCitation`s**, and `resolve.py` is parenthetical-blind (grep `parenthetical` → no matches), so a following `Id.` resolves to the buried `100 F.2d 1`. The keep-branch is a **pure substring test with no signal-word check** — it keeps *any* tokenized cite inside the prior parenthetical, `quoting`/`citing` or not.
- **CourtListener** (powered by eyecite): citation graph is a flat opinion→opinion edge model (`OpinionsCited`: `citing_opinion`, `cited_opinion`, `depth`, `unique_together`). `depth` = citation **frequency**, not nesting. No parent/child or parenthetical-containment field. (`quoted`/`treatment` exist only as commented-out code. The separate "Parenthetical" model is court-written summary blurbs, not nested cites.)

**So eyecite-ts modeling subordination is a deliberate, doctrinally-justified DIVERGENCE from upstream — not alignment with it.** And eyecite-ts's signal-aware extraction (#851 §5) is *more precise* than eyecite's bare substring containment.

## Recommendation for #851

The research argues against the locked AC's "exclude from top-level by default" and for a more nuanced default:

- **Default (non-breaking):** additively nest paren-cites as children on `Parenthetical.citations` / short-form `parentheticalNode` (the doctrinally-correct subordination model + the `in-parenthetical-of` graph edge), **and keep them in the top-level array** so the Rule 10.9(a) case-short-form pathway and ecosystem parity survive. Resolver keeps its correct `Id.`/`supra` exclusion (#214/#799). All current tests stay green.
- **Opt-in flag** (e.g. `extractCitations(text, { excludeParentheticalChildren: true })`): the strict subordinate model — remove children from the top-level resolvable array. For consumers who want #851's original full-exclusion semantics.
- **Consider** gating nested-child extraction on the explanatory **signal** (`quoting`/`citing`/`quoted in`) rather than bare containment — doctrine ties subordination to the signal, and this avoids over-capturing year-only / pincite-only / coincidental parentheticals.

## Open questions / gaps

- **Tanbook (NY) and ALWD produced NO surviving verified claims** — the doctrinal answer rests on Bluebook + Indigo Book. The library handles many NY cites (A.D.3d, N.Y.3d), so a targeted Tanbook follow-up is warranted before treating the answer as NY-authoritative. (Texas Greenbook / Chicago Maroonbook also uncovered.)
- Does Rule 10.9(a) warrant a **narrow resolver exception** — exclude nested cases from `Id.`/`supra` but keep them eligible as case-short-form antecedents within a five-footnote window? (eyecite-ts already does roughly this; worth documenting as intentional.)
- Recursive/doubly-nested parentheticals `(citing B (quoting C))`: no peer-tool precedent for a recursive containment edge — depth semantics are an open design call.

## Source quality

Primary, code-level (eyecite/CourtListener) findings were re-verified by direct execution + at a pinned commit — very high confidence, current. Bluebook/Indigo doctrine rests on **secondary** sources (the Bluebook is paywalled), but operative rule text (4.1, 1.5(b), 10.9) was quoted verbatim and cross-corroborated across 5+ independent guides; stable across the 20th/21st (and per verifiers 22nd) editions. Indigo Book v2.x renumbers the rule (R6.2.x) without reversing the principle.

### Key sources
- Bluebook Rule 4.1 (verbatim, Tarlton Law Library/UT Austin); Rule 1.5(b) & 10.9 (Georgetown, Loyola, UC Davis, Florida A&M guides)
- Indigo Book — law.resource.org/pub/us/code/blue/IndigoBook.html (R15.3.4)
- Georgetown Law parentheticals handout (Karl Bock, 2016) — verified verbatim
- Python eyecite — models.py / find.py / helpers.py (commit `04d82c0` + main); empirical run of v2.7.6
- CourtListener — REST citations API docs + `cl/search/models.py` `OpinionsCited`
