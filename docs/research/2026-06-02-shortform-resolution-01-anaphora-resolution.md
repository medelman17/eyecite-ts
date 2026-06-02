# Anaphora & Coreference Resolution for Id./supra Attribution

**Date:** 2026-06-02
**Query:** Survey anaphora/coreference resolution as it bears on resolving legal short-form back-references ("Id.", "supra") by STRUCTURE and SALIENCE rather than recency. Anchor on Hobbs (1978), Centering (Grosz/Joshi/Weinstein 1995), Lappin & Leass RAP (1994), Lee et al. (2017). Distinguish accessibility (is X a candidate) from preference (ranking among candidates); pin down recency's proper subordinate role; determine the minimal structural signal that beats recency.
**Depth:** deep

---

## Summary

The NLP anaphora-resolution literature has, for 45+ years, used exactly the two-stage architecture our proposed pipeline needs, and it has used it *because pure recency fails on nested structure* — the same failure as our canonical Hogue/Corsello bug. Every classical resolver (Hobbs 1978, Lappin & Leass 1994, Centering 1995) first applies **hard constraints that eliminate candidates** (agreement, syntactic binding / scope), then ranks the survivors by **soft salience**, in which recency is only one factor and is routinely *overridden* by grammatical-structural prominence. Recency's legitimate role is narrow: an iteration/tie-break order over an *already-constrained* candidate set, never the primary selector. Critically, the deep-learning state of the art (Lee et al. 2017) discards the syntactic parser yet keeps both stages — it learns a span-level "is this even a mention" score that prunes candidates, and it bakes in an explicit **abstain** option (a dummy antecedent), directly validating stages 2 (scope filter) and 4 (abstain) of our design. The field's clearest empirical lesson for us: getting the *candidate set* right dominates getting the *ranking* right (oracle mentions buy Lee et al. +17.5 F1; the best ranking refinement buys ~1–4 F1).

---

## Key Findings

### 1. The field rigorously separates ACCESSIBILITY (hard filter) from PREFERENCE/SALIENCE (soft rank)

This is the central, load-bearing finding and it is *unanimous* across sources. Jurafsky & Martin's synthesis (SLP3 ch. 26) splits the signals into two explicitly different kinds:

- **Hard constraints** that determine whether a candidate is *possible at all*: **Number / Person / Gender Agreement** and **Binding Theory Constraints** (syntactic limits on what can corefer within a sentence — e.g. reflexives must, non-reflexives must not, corefer with the local subject).
- **Salience / preference factors** that *rank* the survivors: **Recency**, **Grammatical Role** (subject > object > oblique), **Verb Semantics** (implicit causality), **Selectional Restrictions**.

J&M frame the whole problem in terms of **accessibility** (Ariel 2001) / **salience** in a discourse model: a pronoun (the most reduced referring form) is licensed only for a referent with "a high degree of activation or salience." Short-form citations are the legal analogue of pronouns — maximally reduced forms ("Id.") that presuppose a highly salient antecedent.

> "Recency: Entities introduced in recent utterances tend to be more salient... Grammatical Role: Entities mentioned in subject position are more salient than those in object position, which are in turn more salient than those mentioned in oblique positions." — J&M SLP3 ch. 26

### 2. RAP (Lappin & Leass 1994) is a literal blueprint for "hard-filter-then-rank," with recency as just one weighted factor

RAP's resolution procedure (verified from the paper, *Computational Linguistics* 20(4):535–561) runs **hard filters first, salience ranking second, proximity only as a final tie-break**:

1. **Eliminate** candidates with the **morphological filter** (rules out NP antecedents on "non-agreement of person, number, or gender features") and the **syntactic filter / reflexive-binding algorithm** ("excludes any candidate paired in the [disjoint-reference] list with the pronoun... as well as any candidate anaphorically linked to an NP paired with the pronoun"). Pleonastic ("it rains") pronouns are detected and skipped.
2. **Rank** the survivors by a salience score that is a sum of weighted factors. The verified initial weights:

   | Salience factor | Initial weight |
   |---|---|
   | **Sentence recency** | **100** |
   | Subject emphasis | 80 |
   | Head noun emphasis | 80 |
   | Existential emphasis | 70 |
   | Accusative (direct object) emphasis | 50 |
   | Non-adverbial emphasis | 50 |
   | Indirect object / oblique emphasis | 40 |

3. **Tie-break by proximity**: "If several candidates have (exactly) the highest weight, choose the candidate closest to the anaphor. Proximity is measured on the surface string and is **not directional**."

Three points matter for us. (a) Recency *is* the highest single weight (100) — recency genuinely matters — **but it is summed with, and routinely outweighed by, structural factors**: a subject (80) two sentences back that also wins on other factors beats a more-recent oblique (40). (b) **Salience decays**: "All salience factors that have been assigned prior to the appearance of [a new] sentence have their weights degraded by a factor of two" — recency is implemented *as decay*, not as nearest-wins. (c) Proximity is demoted to a non-directional tie-break only. RAP scored **86%** overall (89% intrasentential, 74% intersentential) on 360 pronouns. The authors explicitly note the absolute weights are "arbitrary"; what matters is "the comparative relations among the factors."

### 3. Hobbs (1978): even the "naive" baseline beats recency by traversing STRUCTURE, with agreement as a hard gate

Hobbs, "Resolving pronoun references," *Lingua* 44:311–338 (1978), is "the first in a long series of syntax-based methods" (J&M). The naive algorithm walks the constituency parse tree, proposing NPs in a **left-to-right, breadth-first** order from structurally-defined start points. The widely-cited simplified version (Kehler et al. 2004) searches NPs in this order:

> "(i) in the current sentence from right-to-left, starting with the first NP to the left of the pronoun, (ii) in the previous sentence from left-to-right, (iii) in two sentences prior from left-to-right, and (iv) in the current sentence from left-to-right... The first noun group that **agrees** with the pronoun with respect to number, gender, and person is chosen."

The decisive observation for our bug: **recency here is the *iteration order*, not the selection criterion, and structure controls that order.** Hobbs searches the *current sentence's structurally-eligible NPs before* falling back to prior sentences, and agreement is a hard gate (non-agreeing NPs are skipped entirely). A pure-text "nearest preceding token" heuristic would pick differently. Hobbs reported ~**88.3%** correct on the naive algorithm, rising to **91.7%** with a few selectional constraints — "a high baseline" that a non-structural method cannot match.

### 4. Centering (Grosz, Joshi & Weinstein 1995): salience is *grammatical-role* ranking, decoupled from realization

Centering ("A Framework for Modeling the Local Coherence of Discourse," *Computational Linguistics* 21(2):203–225; ACL Test-of-Time 2020) is the canonical theory of *which entity is most salient*. Its machinery cleanly separates the two questions we care about:

- **Cf(Uₙ)** — the set of **forward-looking centers**: every entity *realized* (mentioned) in utterance Uₙ. This is the *availability/accessibility* set.
- **Cf is ranked** by grammatical role: **subject > object(s) > other.** The top-ranked element is the **preferred center Cp(Uₙ)**.
- **Cb(Uₙ)** — the **backward-looking center**: "the highest-ranked element of Cf(Uₙ₋₁) that is realized in Uₙ." This is the entity in *discourse focus* — the structural analogue of the citation an "Id." should resolve to.

The rules encode the salience preference, not availability:
- **Rule 1:** if any Cf element is realized as a **pronoun** in Uₙ, the Cb must also be pronominalized — i.e. the most reduced form is reserved for the most salient/focused entity (exactly the "Id." case).
- **Rule 2:** transition types are preferred in the order **Continue > Retain > Shift** — discourse prefers to keep focus on the same center.

Centering's lesson for us: **salience is fundamentally about discourse focus determined by structural prominence, not textual distance.** The entity in focus (Cb) is the structurally most-prominent recently-realized entity, which is *not* in general the textually nearest one.

### 5. Lee et al. (2017): dropping the parser does NOT drop the two-stage architecture — and it adds an explicit ABSTAIN

"End-to-end Neural Coreference Resolution" (EMNLP 2017) is "the first end-to-end... model [that] significantly outperforms all previous work **without using a syntactic parser or hand-engineered mention detector**." Its scoring (verified from the paper) is:

```
s(i, j) = 0                              if j = ε   (dummy antecedent)
s(i, j) = s_m(i) + s_m(j) + s_a(i, j)    otherwise
```

where `s_m(·)` is a unary **mention score** (is this span an entity at all?) and `s_a(i,j)` is the pairwise **antecedent compatibility** score. Three implications for a lightweight structural resolver:

- **The candidate-set stage survives, learned rather than parsed.** `s_m` *replaces* the explicit mention detector / parse: low-`s_m` spans are aggressively pruned (max width L=10; only λ·T spans kept; top-K antecedents). So "decide what is even a candidate" is still a first-class stage — it just became a learned score instead of a rule.
- **Abstain is built into the math.** Fixing the dummy antecedent ε to score 0 means "the model predicts the best-scoring antecedent if any non-dummy scores are positive, and it **abstains** if they are all negative." This is *exactly* our stage 4 (FLAG FOR REVIEW rather than force a wrong link).
- **Distance is a feature, but a soft, learned one.** φ(i,j) encodes speaker, genre, and a **bucketed span distance** [1,2,3,4,5–7,8–15,...]. Ablation: removing distance+width features costs **3.8 F1** — the *largest* drop of any learned feature — so structural/positional signal is powerful, but it is *combined* with content, never used as a hard nearest-wins rule.

The most actionable empirical fact in the whole survey: **the candidate set dominates the ranking.** Lee et al.'s ablation shows **oracle (perfect) mentions improve the model by +17.5 F1**, whereas the best ranking-side refinement (ensembling, attention, features) moves things 1–4 F1. The 2023 survey echoes this: mention detection "might restrict the performance of the coreference resolver" (Poesio et al. 2016), and coreference is universally formalized as a pipeline of **mention detection → mention linking** (Liu et al. 2023). For us: getting the *scope filter* (stage 2) right buys far more correctness than perfecting the salience ranker (stage 3).

---

## How This Applies to Id./supra Attribution

Map the four anchor systems onto the proposed pipeline — they validate it almost line-for-line.

| Our pipeline stage | NLP analogue | What it tells us |
|---|---|---|
| **1. Parse nesting (stack)** | Hobbs needs a constituency *parse*; Lee et al. shows you can get away with a *shallow* learned proxy | You need *some* structure recovery, but **not a full grammar** (see "minimal signal" below). A bracket/scope stack is the citation-domain analogue of the parse Hobbs traverses. |
| **2. SCOPE — hide parenthetical-internal cites from an outer Id. (HARD filter)** | RAP's **morphological + binding/disjoint-reference filters**; Centering's "realized in this utterance"; Lee et al.'s `s_m` mention pruning | This is the make-or-break stage and it is **squarely the field's "accessibility" step**. A cite inside `(quoting Corsello…)` is in an *inner scope* and is **inaccessible** to an outer `Id.` exactly as a binding-blocked NP is inaccessible to a pronoun. Filtering Corsello out *before ranking* is the same move RAP makes with its syntactic filter — and per the oracle-mention result, **this is where most of the correctness lives.** |
| **3. SALIENCE — rank sibling-scope candidates (SOFT)** | Centering's grammatical-role ranking (subject>object); RAP's weighted salience sum | Once Corsello is filtered out, Hogue is the only sibling-scope candidate and wins trivially. When multiple siblings remain, rank by *structural/discourse prominence* (the cite in focus — the one being *discussed*, not one buried in a citing parenthetical), echoing Cb/Cp. **Recency belongs here as one weighted, decaying factor — never as the selector.** |
| **4. ABSTAIN — flag for review** | Lee et al.'s **dummy antecedent ε scored 0**; RAP's salience **threshold** | The state of the art *abstains by construction* when no candidate clears the bar. Encode our "structure unrecoverable / genuinely ambiguous" case the same way: a no-link outcome that beats every positive candidate, routing to human review instead of silently falling back to recency. |
| **5. PROVENANCE — record the quoting chain** | (No direct anaphora analogue; closest is event/discourse-structure work) | Not addressed by these four; this is a domain extension. The nesting stack from stage 1 *already* contains the chain ("Hogue quoting Corsello"), so provenance is a cheap by-product of stage 1, not new machinery. |

**Why recency mis-fires on the canonical bug, in the field's own terms.** The bug —
`Hogue v. State, 123 U.S. 1 (2020) (quoting Corsello v. Verizon, 456 N.Y. 2 (2010)). Id.` →
recency picks Corsello — is the citation twin of a **binding/scope violation**. Corsello is textually nearest but lives in an *embedded scope* (the `(quoting …)` parenthetical) that an outer `Id.` cannot reach, just as "Janet bought *her* a bottle" cannot have *her* = Janet because the binding constraint blocks the structurally-local reading (J&M 26.36). Pure recency is precisely the heuristic every one of these systems was built to *correct*: Hobbs corrects it by searching structure before distance; RAP corrects it by filtering then weighting (and demoting proximity to a non-directional tie-break); Centering corrects it by ranking on grammatical role; Lee et al. corrects it by learning a mention/scope score and an abstain option.

**What MINIMAL structural signal beats recency?** The convergent answer across sources is: **a shallow nesting/scope signal, not a full parse.**
- Lee et al. (2017) *deletes the parser entirely* and still beats parser-based systems — proof that full syntax is not required.
- Kennedy & Boguraev (1996), cited by J&M, extended RAP to "avoid the need for full syntactic parses."
- Hobbs himself called the parse-walking version "naive" and still hit 88%.
For *our* problem the minimal signal is even smaller than general NLP needs: we do **not** need to parse natural-language sentence syntax at all — we need only **bracket-nesting depth and parenthetical containment** (is candidate cite C lexically *inside* a `(…)` that the `Id.` is *outside* of?). A stack-based bracket matcher (pipeline stage 1) recovers exactly that. This is the single cue that converts the canonical bug from a wrong-answer into a correct-answer, because it makes the scope filter (stage 2) possible.

---

## Trade-offs & Alternatives

- **Hard scope filter vs. soft salience penalty for nesting.** Our design (and RAP's binding filter, and Centering's "realized" set) treats inner-scope cites as a **hard** exclusion. A softer alternative is to *down-weight* parenthetical-internal cites (à la RAP's summed weights) rather than remove them. Recommendation: keep it **hard** for the "outer Id. → inner-(quoting)-cite" case (it is a genuine scope violation, like binding, not a mere preference) but consider *soft* treatment for genuinely ambiguous nesting where the bracket parse is low-confidence. The literature supports both modes living side by side (RAP has hard filters *and* soft weights).
- **Rule-based vs. learned.** Hobbs/RAP/Centering are deterministic and *fully explainable* — a decisive advantage in a legal product where every Id.→antecedent link may need to be defended. Lee et al. is more accurate on messy open-domain text but is a black box and needs labeled training data we likely lack at scale. For citations, the structure is far more regular than open-domain prose, so a **deterministic stack+filter+salience resolver is the right default**, with the neural lesson absorbed as *design principles* (mention/scope pruning, explicit abstain) rather than a neural model.
- **Where to spend effort.** The oracle-mention result (+17.5 F1) and Poesio et al.'s bottleneck finding both say: **invest in the scope/candidate stage, not the ranker.** A perfect salience ranker over a wrong candidate set still picks Corsello. Inverting the usual instinct to over-engineer ranking is the single most important takeaway.
- **Recency is not the enemy — unconstrained recency is.** RAP's top weight is recency (100) and its decay-by-2 *is* a recency model. The fix is not to delete recency but to (a) gate it behind the scope filter and (b) let structural factors outvote it, exactly as RAP sums and Centering ranks.

---

## Open Questions

1. **Does "supra" obey the same scope rules as "Id."?** "Id." is the immediate-antecedent (Continue-transition) case; "supra" deliberately reaches *further back* and is often explicitly numbered ("supra note 12"). Centering's transition taxonomy (Continue vs. Retain/Shift) suggests "supra" may need a *different, wider* accessibility window than "Id." — worth modeling as two distinct anaphor types, not one.
2. **What is the citation analogue of grammatical-role salience (subject>object)?** Among genuine sibling-scope candidates, what makes one cite the "preferred center"? Candidates: the cite introducing the *proposition currently under discussion* vs. a string-cite member; the *first-cited* vs. last; the cite the surrounding sentence's *claim* attaches to. Needs its own empirical pass (sibling to this report's salience-modeling slice).
3. **Confidence-gated abstain threshold.** Lee et al. abstain at score 0; RAP at a salience threshold. What is the right precision/recall operating point for *legal* abstention, where a wrong antecedent (false attribution) is far costlier than a flagged-for-review? Likely tune toward high-precision / liberal abstain.
4. **How robust must the bracket parser be to dirty PDF→markdown?** Hobbs degrades gracefully because the tree search is local; a stack matcher can desync badly on unbalanced brackets from OCR. The abstain stage is the safety net, but the *rate* of abstention driven by parse failure (vs. true ambiguity) needs measurement.

---

## Sources

1. **Hobbs, J. R. (1978). "Resolving pronoun references." *Lingua* 44:311–338.** — The foundational syntax-based resolver. Established that walking *structure* (left-to-right breadth-first tree traversal) with agreement as a hard gate beats naive distance; recency is the *iteration order*, not the selector. ~88% naive / 92% with selectional constraints. (Bibliographic details + algorithm cross-verified via J&M SLP3 ch.26 and the cmward/hobbs reference implementation; ISI primary page returned HTTP 410.)
2. **Grosz, B. J., Joshi, A. K., & Weinstein, S. (1995). "Centering: A Framework for Modeling the Local Coherence of Discourse." *Computational Linguistics* 21(2):203–225.** (ACL Test-of-Time Award 2020.) — The theory of *salience as grammatical-role prominence*. Cf (availability set) ranked subject>object>other; Cb (focus) = highest-ranked prior-Cf realized now; Rule 1 reserves the reduced form (pronoun / "Id.") for the most salient entity. Decouples *realized* from *most-salient*. (ACL Anthology J95-2003; full-text PDF route blocked HTTP 405, rules cross-checked against J&M.)
3. **Lappin, S., & Leass, H. J. (1994). "An Algorithm for Pronominal Anaphora Resolution." *Computational Linguistics* 20(4):535–561.** — The explicit hard-filter-then-rank blueprint (RAP). Verified salience-weight table (recency 100, subject 80, head-noun 80, ...), salience **decay by factor of 2 per sentence**, morphological + syntactic-binding filters that eliminate candidates *before* ranking, and proximity demoted to a non-directional tie-break. 86% accuracy. (Full text extracted and quoted from aclanthology.org/J94-4002.pdf.)
4. **Lee, K., He, L., Lewis, M., & Zettlemoyer, L. (2017). "End-to-end Neural Coreference Resolution." EMNLP 2017** (arXiv:1707.07045). — Modern SOTA that *drops the parser and mention detector* yet keeps both stages: learned span/mention score `s_m` for candidate pruning + pairwise `s_a`, with an explicit **abstain** via a zero-scored dummy antecedent. Verified scoring `s(i,j)=s_m(i)+s_m(j)+s_a(i,j)`; distance/width features = top learned-feature ablation (3.8 F1); **oracle mentions = +17.5 F1** (candidate set dominates ranking). (Full text extracted from luheng.github.io PDF.)
5. **Liu, R., Mao, R., Luu, A. T., & Cambria, E. (2023). "A brief survey on recent advances in coreference resolution." *Artificial Intelligence Review*** (DOI 10.1007/s10462-023-10506-3; accepted 12 May 2023). — Recent survey confirming coreference is *still* universally formalized as **mention detection → mention linking** and that mention detection "might restrict the performance of the coreference resolver" (Poesio et al. 2016) — independent corroboration that the candidate stage is the bottleneck. (Full text extracted from sentic.net PDF.)
6. **Jurafsky, D., & Martin, J. H. *Speech and Language Processing* (3rd ed. draft), Ch. 26 "Coreference Resolution."** — Authoritative synthesis used to cross-verify all four primaries. Explicitly partitions signals into **hard constraints** (Number/Person/Gender Agreement, Binding Theory) vs. **salience factors** (Recency, Grammatical Role, Verb Semantics, Selectional Restrictions), and demonstrates grammatical role **overriding** recency (Billy Bones / Jim Hawkins minimal pair, 26.38–26.39). (Full chapter extracted from web.stanford.edu/~jurafsky/slp3/26.pdf.)
