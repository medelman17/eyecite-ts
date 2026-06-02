# The *supra* Question: Named vs. Positional Reference

**Date:** 2026-06-02
**Query:** Does "supra" behave differently from "Id." under a scope model — is it a NAMED, cross-scope lookup rather than a positional adjacent reference? What does reference-resolution theory say about named vs. positional reference, and what is the net architectural recommendation for handling *supra* alongside the *Id.* scope model?
**Depth:** deep

## Summary

**Yes — *supra* is a fundamentally different beast from *Id.*, and the linguistics and the reference implementation agree.** *Id.* is **positional**: it points to the immediately-governing prior citation (the discourse "focus"), exactly like an unstressed pronoun. *supra* is a **named, cross-scope lookup**: it carries a key (a party/short name) and searches *outward and globally* for the full citation that key resolves to, like a proper name or a definite description. This maps cleanly onto a robust, independently-discovered distinction in computational linguistics — pronouns are resolved by **recency/salience/centering**, whereas proper names and full noun phrases are resolved by **string/head match across arbitrary distance** (Jurafsky & Martin SLP3 ch. 26; Gundel/Hedberg/Zacharski 1993; Gordon/Grosz/Gilliom 1993). The practical upshot for our resolver: **use two mechanisms, not one recency heuristic** — and, decisively, the production `eyecite` library already does exactly this (positional `last_resolution` for `id`; name-keyed `_filter_by_matching_antecedent` for `supra`, with **abstain-on-ambiguity**). The lexical-scope masking that fixes the Hogue/Corsello bug for *Id.* is **still relevant** for *supra* but plays a smaller role: *supra*'s name key already excludes most wrong candidates, so the residual disambiguation problem is "two `Smith`s," for which the literature and eyecite both favor **abstain (flag for review) when the name key does not uniquely resolve**.

## Key Findings

### 1. The legal-citation system itself distinguishes positional *Id.* from named *supra* — and explicitly exempts parentheticals

The Bluebook's own rules encode the two mechanisms we are about to rebuild:

- ***Id.* is positional/adjacent.** "*Id.* always refers to the immediately preceding cited authority… so long as it is the only authority cited in the preceding [unit]. … Intervening citations prevent its use." (Tarlton Law Library, Bluebook guide.)
- ***supra* is named.** The canonical form is **"O'Neill, *supra* note 15, at 52"** — author/party last name + `supra` + the location where the *full* citation first appeared. It reaches back **by name** to an earlier introduction that may be arbitrarily far away and across many intervening citations. (Tarlton.)
- **Direct primary-source support for the SCOPE rule.** The Bluebook states that **"Sources cited in explanatory parentheticals or phrases… are not counted as intervening authorities preventing the use of '*Id.*'."** This is the legal-citation analog of the proposed pipeline's *scope* filter: the parenthetical-internal citation (Corsello) is **invisible** to a following *Id.*, which therefore correctly stays bound to the outer authority (Hogue). The rulebook treats parentheticals as a separate, non-counting scope — exactly the stack/scope model in step 2 of our pipeline.

> Note: strict Bluebook says *supra* is for *secondary* sources (books/periodicals), not most cases. In practice, and in tools like eyecite, "Party, *supra*, at N" is widely used and parsed for cases too. Our resolver should handle the by-name pattern regardless of source type; the *mechanism* (named lookup), not the Bluebook's source-type policy, is what matters here.

### 2. Computational linguistics independently splits reference resolution into "positional/salience" vs. "by-name/string-match" — the same two mechanisms

This is the central theoretical convergence. Multiple primary sources, from different traditions, all draw the same line:

- **Jurafsky & Martin, *Speech and Language Processing* (3rd ed.), ch. 26 "Coreference Resolution and Entity Linking."** Pronoun resolution is driven by **recency and salience** ("the most recent compatible noun phrase," sensitive to discourse structure), whereas identity between **named entities** is established by **exact match, head match, or known aliases**, "enabling resolution across longer distances without requiring recent antecedents." This is *Id.* (recency) vs. *supra* (name key) almost verbatim. The classic **Hobbs algorithm** for *pronouns* searches the parse tree right-to-left in the current sentence, then previous sentences in reverse — i.e., a recency-ordered positional search, the pronoun/`Id.` mechanism.

- **Gundel, Hedberg & Zacharski (1993), "Cognitive Status and the Form of Referring Expressions in Discourse," *Language* 69(2):274–307 — the Givenness Hierarchy.** Six cognitive statuses, each entailing all lower ones: **in focus > activated > familiar > uniquely identifiable > referential > type identifiable.** The form chosen signals the *minimum* status the referent must have. Verified verbatim from the authors' own write-up: an **unstressed pronoun ("it") requires the referent be *in focus*** (working-memory, current center of attention), while a **definite "the N" requires only *uniquely identifiable***. Crucially, a referent can be *uniquely identifiable* (and thus nameable / definite-describable) **without being in focus or even activated**. Translation to our domain: ***Id.* (the pronoun) demands its target be the current focus** — the immediately-governing citation. ***supra* + a name (the definite/name form) only demands the target be uniquely identifiable** — re-findable by key anywhere in the prior discourse, no focus required. This is the precise theoretical reason a recency heuristic is wrong for *supra*: *supra* deliberately reaches for something that is *not* in focus, which is why the author re-states the name instead of writing *Id.*

- **Gordon, Grosz & Gilliom (1993), "Pronouns, Names, and the Centering of Attention in Discourse," *Cognitive Science* 17(3):311–347 — the "repeated-name penalty."** In self-paced reading, **repeating a full name** for a referent that is the **backward-looking center (Cb)** — the focused entity a pronoun would name — **slows readers down** relative to using a pronoun; the penalty disappears when the antecedent is *not* the focus (e.g., it was the object, not subject, of the prior clause). The behavioral signature is that **names and pronouns are processed by different mechanisms**: pronouns are *expected* for the focused/recent entity; a name signals "I am pointing at something that is *not* simply the current focus — go look it up by identity." A writer who chose "Smith, *supra*" over "Id." is, by this logic, signaling that the target is **not** the nearest preceding citation. A recency resolver inverts the writer's own cue.

- **Grosz, Joshi & Weinstein (1995), "Centering: A Framework for Modeling the Local Coherence of Discourse," *Computational Linguistics* 21(2):203–225 — Centering Theory.** Formalizes the focused entity (the **Cb**, backward-looking center) that pronouns preferentially realize (Rule 1: if any Cf is pronominalized, the Cb is). Centering is a model of **local** coherence — the nearest, in-focus referent. It is the right model for ***Id.*** It is explicitly *not* a model for long-distance, by-name reaching, which falls to **global focus / discourse structure** (the Grosz & Sidner attentional-stack tradition) — the right frame for ***supra*.** This is the linguistics version of "local/lexical scope (Id.) vs. outer/global scope (supra)."

- **Ariel, Accessibility Theory (1990 and later).** Referring-expression form is graded by the antecedent's **accessibility**, governed by *distance, competition, salience, unity*. **High-accessibility markers (pronouns / `Id.`)** signal a close, salient antecedent; **low-accessibility markers (full names, definite descriptions / `supra`-by-name)** signal a distant or less-salient one. The form *itself* encodes how far to look. Same conclusion: *supra* + name is a low-accessibility marker that announces "this is not adjacent."

### 3. The reference implementation (eyecite) already uses two mechanisms — and abstains on ambiguity

`eyecite` (Free Law Project; Cushman, Dahl & Lissner, 2021, *JOSS* 6(66):3617) is the de-facto standard legal-citation resolver and our own `eyecite-ts` upstream. Its `resolve.py` is direct, real-world confirmation of the two-mechanism architecture **and** of the disambiguation policy:

- ***Id.* → positional.** `_resolve_id_citation(...)` returns `last_resolution` — the resource of the *previously resolved* citation — with only a pin-cite sanity check. Pure nearest-preceding.
- ***supra* → named, global, abstain-on-tie.** `_resolve_supra_citation(...)` does nothing without an `antecedent_guess` (the parsed name key); otherwise it calls `_filter_by_matching_antecedent(resolved_full_cites, antecedent_guess)`, which scans **all** resolved full citations and matches the guess against the **plaintiff or defendant** field:

```python
# _filter_by_matching_antecedent (eyecite/resolve.py), verbatim:
matches = list(set(matches))
return matches[0] if len(matches) == 1 else None
```

Three things to internalize from this code:
1. The search is **global over all prior full citations**, not positional — the named-lookup mechanism.
2. The key is the **party name** (plaintiff/defendant), i.e., the `Smith` in "Smith, *supra*."
3. **It abstains when the name key does not uniquely resolve** — `len(matches) == 1` or return `None`. Two `Smith`s ⇒ no resolution. This is the literature's recommended behavior (see Finding 4) baked into shipping code, and it is the same **ABSTAIN** posture our pipeline's step 4 prescribes.

`eyecite` also parses the antecedent itself via a dedicated `SUPRA_ANTECEDENT_REGEX` — i.e., extracting the name key is a **separate concern** from resolving it. Our redesign should mirror that separation.

### 4. Disambiguating an ambiguous name ("two Smiths"): recency *within* the name set, salience, or abstain

When a name key matches more than one introduced authority, named-reference resolution offers a graded menu, and the sources broadly converge:

- **Filter first, then rank — never rank first.** The name key is a **hard filter** (like our *scope* filter for `Id.`), narrowing candidates to same-name authorities; only the residual ambiguity needs a **soft** tiebreak. This is the Givenness-Hierarchy logic (the form's conceptual content restricts the candidate set before accessibility/salience picks among survivors) and exactly how eyecite is structured.
- **Tiebreak options, in increasing aggressiveness:**
  - **Abstain (most conservative).** eyecite's choice: if >1 candidate, return nothing. Matches our pipeline's **ABSTAIN/flag-for-review** principle and avoids the silent-wrong-answer failure mode that the recency heuristic causes today.
  - **Recency-within-name.** Among same-name candidates, pick the most recently introduced/cited. This is *bounded* recency — recency applied only inside the name-filtered set, not over the whole document — and is defensible because legal writers typically intend the most recently discussed same-named authority. (General coreference practice: recency is a *soft* feature applied *after* hard agreement filters — J&M ch. 26.)
  - **Salience / centering-within-name.** Prefer the same-name candidate that is in (or nearest to) the current discourse focus. Strongest theoretical pedigree (Centering; Gordon et al.) but heaviest to implement and least necessary given how rarely two same-party cases co-occur.
- **Practical recommendation:** **recency-within-the-name-filtered-set, with a confidence gate that abstains when the residual set is still ambiguous after recency** (e.g., same name *and* same year, or genuinely indistinguishable). This preserves recall on the common case while inheriting eyecite's fail-closed safety on the hard case.

### 5. Does *supra*'s by-name reach BREAK the lexical-scope masking that fixes *Id.*?

**No — but the relationship is asymmetric, and this is the subtle, load-bearing point.**

- For ***Id.***, scope masking is **essential**: *Id.* is positional, so the parenthetical-internal Corsello is a live (indeed nearest) candidate, and only the **hard scope filter** (parenthetical cites invisible to outer scope) prevents the canonical bug. This is also what the Bluebook itself does ("parentheticals are not intervening authorities").
- For ***supra***, the **name key does most of the masking automatically.** "Hogue, *supra*" cannot resolve to Corsello because the key `Hogue` does not match Corsello's parties — the wrong-scope candidate is filtered out *by identity*, not by position. So *supra* does **not** "break" scope masking; rather, **scope masking is largely redundant for it**, because a named lookup is inherently scope-insensitive in the dimension that bites *Id.*
- **The residual case where scope still matters for *supra*:** ambiguity *among same-named* authorities where one introduction sits **inside a parenthetical** and another at sibling/outer scope. Scope theory says an authority **introduced only inside a "(quoting X)" parenthetical is an inner-scope declaration** and should generally be **inaccessible** as the antecedent of an outer-scope `supra` — just as a variable declared inside a block is not visible to the enclosing scope. So scope is best modeled as a **secondary filter/penalty on the name-filtered candidate set**, not as the primary mechanism. (This is a principled extension of the Bluebook's parenthetical rule from *Id.* to *supra*; the rulebook is explicit only about *Id.*, so treat the *supra* extension as a defensible design choice rather than a codified rule — see Open Questions.)

Net: **scope masking is the primary mechanism for *Id.* and a secondary/tiebreak mechanism for *supra*.** They are not in conflict; they compose.

## How This Applies to *Id.*/*supra* Attribution

Mapping each finding onto the proposed staged pipeline (parse → scope → salience → abstain → provenance):

- **Two resolvers, one shared structure (the architectural verdict).** Implement **`Id.` = positional** (nearest preceding *in-scope* citation) and **`supra` = named lookup** (search prior full citations by party/short-name key). This is favored by **every** source examined: the Bluebook (different rules), the Givenness Hierarchy and Centering (pronoun-vs-name = focus-vs-uniquely-identifiable), J&M coreference (recency-vs-string-match), and the eyecite implementation (`last_resolution` vs `_filter_by_matching_antecedent`). **Do not collapse them into one recency heuristic parameterized by a name** — the literature treats positional-salience and name-string-match as *categorically* different resolution procedures, and the eyecite codebase keeps them as separate functions. (A single function that *branches* on "do I have a name key?" is fine and even desirable for code locality, as long as the two branches run genuinely different logic.)

- **Step 1 (PARSE).** Extract the **name key** for every `supra` as a first-class, separate step (eyecite isolates this in `SUPRA_ANTECEDENT_REGEX` → `antecedent_guess`). The stack-based bracket parser still matters here so the parser knows *which scope* each full citation and each `supra` lives in (needed for the secondary scope filter in Finding 5).

- **Step 2 (SCOPE).** For `Id.`: hard-mask parenthetical-internal cites from outer-scope candidates (fixes Hogue/Corsello; matches the Bluebook). For `supra`: the name key is the primary filter; apply scope as a **secondary** filter that demotes/excludes same-named authorities introduced only inside an inner-scope parenthetical when a sibling/outer-scope introduction exists.

- **Step 3 (SALIENCE).** For `Id.`: rank sibling-scope candidates by recency/centering (the soft preference). For `supra`: salience is only a **within-name tiebreak** (recency-within-name preferred; see Finding 4) — it never reaches outside the name-filtered set.

- **Step 4 (ABSTAIN).** Inherit eyecite's posture directly: **if the name key resolves to 0 or >1 candidates after filtering+recency, flag for review — never silently fall back to recency over the whole document.** For `Id.`, abstain if the in-scope nearest candidate is ambiguous or structure couldn't be recovered. This is where the new design beats today's behavior: the recency resolver's failure on `supra` is *invisible*; an abstaining named resolver makes it a reviewable event.

- **Step 5 (PROVENANCE).** The named-lookup model makes provenance natural: a `supra` resolves to a **specific introduced authority** by identity, so the chain ("Smith, *supra*" → the full Smith cite at its first appearance → any "(quoting …)" nesting recorded there) is recoverable. eyecite's `Resource`/resolution map is a working example of associating short forms back to a canonical full citation that can anchor a provenance chain.

**Concrete payoff on the canonical bug's cousin:** Given the Hogue/Corsello example, a later "**Hogue, *supra*, at 7**" must resolve to Hogue even though Corsello is textually closer and more recent — because the **name key `Hogue` excludes Corsello outright.** A pure recency resolver could mis-handle this if it ignored the name; a named resolver gets it right *for free* and would only need scope as a tiebreak if there were a *second* Hogue. Conversely, a bare "**Id.**" after that block needs the **scope filter** to avoid Corsello. The two mechanisms cover the two failure modes.

## Trade-offs & Alternatives

- **Two mechanisms vs. one parameterized resolver.** *Two* (the recommendation) matches theory and the reference implementation and keeps each path debuggable, at the cost of slightly more code. A *single* resolver "parameterized by an optional name key" is tempting for DRY-ness but risks re-introducing recency contamination into the `supra` path (the exact class of bug we're eliminating) and obscures the categorical difference the literature insists on. Compromise: one entry point, two clearly separated internal strategies (mirror eyecite).

- **Abstain vs. recency-within-name on ambiguous names.** *Abstain* (eyecite default) maximizes precision and surfaces hard cases for human review — aligned with our pipeline's abstain principle and the "never silently fall back to recency" requirement — but lowers recall (some genuinely resolvable "two Smiths, but the recent one is obviously meant" cases get flagged). *Recency-within-name* recovers most of that recall and is theoretically sanctioned (recency as a post-filter soft cue) but can be wrong when the writer meant the *earlier* Smith. Recommended hybrid: recency-within-name **gated** by a confidence check that abstains on true ties (same name + same year, or no salience signal).

- **Name-key matching is itself fuzzy.** eyecite matches `antecedent_guess` as a substring of plaintiff/defendant. This can over-match (a short common surname appearing in multiple parties) or under-match (party name spelled/abbreviated differently between the full cite and the `supra` form, e.g., "United States v. Smith" later as "Smith, supra" vs. an institutional party). Trade-off: looser matching ⇒ more recall but more ambiguous ties (more abstains or more wrong picks); tighter matching ⇒ more misses (resolves to nothing). This is a tunable knob, and dirty PDF→markdown input (our setting) will stress it — budget for normalization of party strings before matching.

- **Scope as primary vs. secondary for *supra*.** Treating scope as a hard primary filter for *supra* (symmetric with `Id.`) is conceptually clean but mostly wasted work (the name key already excludes cross-scope wrong answers) and risks over-suppressing a legitimately inner-introduced authority that the writer *does* later `supra`-reference. Treating it as a secondary tiebreak (the recommendation) is lighter and matches how the name key actually does the heavy lifting.

## Open Questions

1. **Is an authority introduced *only* inside a "(quoting X)" parenthetical a valid `supra` antecedent at all?** Scope theory says inner-scope declarations are inaccessible from outer scope, which argues "no." But real legal practice sometimes *does* `supra`-reference a case first surfaced in a parenthetical. The Bluebook codifies the parenthetical exemption **only for *Id.***, not for *supra* — so the *supra* scope extension in Finding 5 is a **design choice, not a rule**. Needs a labeled-corpus check on how often writers `supra`-reference parenthetical-only introductions before we make inner-scope a hard vs. soft filter.

2. **How should "*supra*" with no parseable name key behave?** eyecite returns `None` (abstain). Is there a legitimate "bare *supra*" usage in our corpus that should fall back to *Id.*-like positional logic, or is abstain always correct?

3. **`hereinafter` / short-name aliases.** Writers define "(*hereinafter* `Smith`)" and later use the alias in `supra`. Does our name key need to track explicitly-declared aliases (a symbol table populated at introduction time), beyond raw party-name substring matching? This is the legal analog of *alias tables* in entity coreference (J&M ch. 26) and would materially improve name-key recall.

4. **Recency-within-name window.** Should recency-within-name be unbounded (whole document) or windowed (e.g., same section)? Centering/accessibility suggest reference reach correlates with discourse-segment structure, hinting a section-bounded window may beat global recency — untested for legal documents specifically.

5. **Cross-mechanism interaction: "Id." after a "supra".** When a `supra` re-introduces an authority and a following `Id.` should bind to *that* `supra`'s target, does the positional `Id.` resolver correctly treat the resolved `supra` as the new focus/`last_resolution`? eyecite's `last_resolution` threading suggests yes, but worth an explicit test in the redesign.

## Sources

1. **Gundel, Hedberg & Zacharski (1993), "Cognitive Status and the Form of Referring Expressions in Discourse," *Language* 69(2):274–307** (verified via the authors' own SFU write-up, sfu.ca/~hedberg). *Contributed:* the Givenness Hierarchy (in focus > activated > familiar > uniquely identifiable > referential > type identifiable); verbatim confirmation that unstressed pronouns require *in focus* while definite/name forms require only *uniquely identifiable* — the theoretical core of "Id. = focus/positional" vs. "supra-by-name = uniquely-identifiable/global." Canonical citation cross-checked against Language 69:274–307.

2. **Gordon, Grosz & Gilliom (1993), "Pronouns, Names, and the Centering of Attention in Discourse," *Cognitive Science* 17(3):311–347.** *Contributed:* the repeated-name penalty — behavioral proof that names and pronouns are processed by *different* mechanisms; a name signals the referent is *not* simply the current focus. Directly justifies not resolving `supra` by recency.

3. **Grosz, Joshi & Weinstein (1995), "Centering: A Framework for Modeling the Local Coherence of Discourse," *Computational Linguistics* 21(2):203–225** (ACL Anthology J95-2003). *Contributed:* formal model of the focused entity (Cb) that pronouns realize — the right model for *Id.* (local coherence), and the contrast with global/discourse-structure focus that governs *supra*.

4. **Jurafsky & Martin, *Speech and Language Processing* (3rd ed. draft), ch. 26 "Coreference Resolution and Entity Linking"** (web.stanford.edu/~jurafsky/slp3/26.pdf). *Contributed:* the explicit computational split — pronouns resolved by recency/salience (Hobbs algorithm, right-to-left/most-recent), named entities by exact/head/alias string match "across longer distances without requiring recent antecedents." The clearest one-to-one analog of our two mechanisms; also the source for alias-table practice (Open Question 3).

5. **eyecite — Free Law Project, `eyecite/resolve.py`** (github.com/freelawproject/eyecite; upstream of our `eyecite-ts`). *Contributed:* verbatim reference implementation of the two-mechanism design: `_resolve_id_citation` returns positional `last_resolution`; `_resolve_supra_citation` → `_filter_by_matching_antecedent` does a **global name-keyed** search over all resolved full citations matching `antecedent_guess` against plaintiff/defendant, and **abstains when the match is not unique** (`return matches[0] if len(matches) == 1 else None`). Also isolates name-key extraction in `SUPRA_ANTECEDENT_REGEX`.

6. **Cushman, Dahl & Lissner (2021), "eyecite: A tool for parsing legal citations," *Journal of Open Source Software* 6(66):3617** (verified verbatim from the JOSS PDF). *Contributed:* authoritative description of eyecite's short-form taxonomy — short case ("531 U.S., at 99"), **supra ("Bush, supra, at 100")**, **id ("Id., at 101")** — and that it "heuristically resolve[s] short case, supra, and id citations to their appropriate full case antecedents." Confirms supra's by-name form vs. id's bare form in the canonical examples.

7. **Bluebook short-form rules — Tarlton Law Library (Univ. of Texas), "Short form: Id., Infra, Supra, Hereinafter"** (tarlton.law.utexas.edu/bluebook-legal-citation/short-form). *Contributed:* the legal-domain ground truth — *Id.* is immediately-preceding/positional and blocked by intervening citations; *supra* references **by author name + location** ("O'Neill, supra note 15, at 52"); and the load-bearing **"sources cited in explanatory parentheticals… are not counted as intervening authorities preventing the use of 'Id.'"** — direct support for the SCOPE filter that fixes the Hogue/Corsello bug.

8. **Ariel, Accessibility Theory** (Mira Ariel, 1990, *Accessing Noun-Phrase Antecedents*, and overviews via Oxford Bibliographies / De Gruyter COGBIB). *Contributed:* the graded form-to-accessibility mapping (pronouns/Id. = high-accessibility/near; full names/supra-by-name = low-accessibility/far), governed by distance, competition, salience, unity — corroborates that the referring form *itself* encodes how far to search. (Secondary corroboration; primary book not fetched in full — overview sources verified.)
