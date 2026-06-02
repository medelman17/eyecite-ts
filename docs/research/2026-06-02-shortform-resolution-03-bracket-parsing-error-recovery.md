# Recursive Bracket Parsing & Error Recovery for Citation-Nesting Reconstruction

**Date:** 2026-06-02
**Query:** Robust recursive-bracket parsing and error recovery for reconstructing citation nesting from noisy, frequently *unbalanced* PDF→markdown text. Why a stack beats a counter; what error-recovery strategies exist for unbalanced input and what they guarantee; whether nesting can be rebuilt from already-extracted citation spans + trigger tokens (islands); how to fail safe to ABSTAIN rather than corrupt global depth.
**Depth:** deep

---

## Summary

A single linear `(` / `)` *counter* is provably the wrong tool: it can recover *nesting depth* but cannot recover *nesting structure*. With multiple bracket kinds (or any need to know *which* opener a closer matches), correct matching requires a **stack/pushdown automaton** — the textbook `([)]` counterexample (counts balance, structure is wrong) is exactly our Hogue/Corsello failure in miniature, and it is what lets recency mis-resolve an `Id.` into a `(quoting …)` parenthetical. For our **real** input — OCR/markdown with *unbalanced* brackets — full bracket-balancing is fragile *and* expensive (exact Dyck-edit-distance repair is cubic and conditionally has no truly-subquadratic algorithm), so the highest-leverage design is to **not balance raw parens at all**. Instead treat the *already-extracted citations* as reliable **islands** and the messy gaps as tolerable "water" (Moonen 2001; Lavie & Tomita's GLR\* 1993), and recover only the shallow nesting our domain actually needs — outer-cite-vs-parenthetical-cite — from local trigger tokens (`quoting`, `citing`, `quoted in`). Critically, every robust parser in this literature has a defined **failure node** (tree-sitter's `ERROR`/`MISSING`, GLR\*'s "maximal parseable subset"); we should mirror that with an explicit *structure-unrecoverable → abstain* signal so one stray paren never corrupts global depth.

---

## Key Findings

### 1. A counter models depth; a stack models structure. They are not interchangeable.

The set of balanced-bracket strings is the **Dyck language**. For a *single* bracket type, a string is balanced iff every prefix has ≥0 unmatched openers and the total is 0 — a running integer counter decides this, because there is only one possible thing any `)` can match. But the moment you have **multiple bracket kinds** (or, in our case, need to know *which opener a closer belongs to*), a counter is insufficient: you must "push every opening delimiter on the stack, and whenever we reach a closing delimiter … pop the matching opening delimiter from the top of the stack" (Wikipedia, *Dyck language*; cp-algorithms, *Balanced bracket sequences*). The canonical proof-by-counterexample: **`([)]` has perfectly balanced counts but is mis-nested** — a counter accepts it, a stack rejects it (cp-algorithms; GeeksforGeeks, *Balanced parentheses*). The general (unbounded-depth) Dyck language is **context-free but not regular**, so no finite-state machine and no fixed counter recognizes it; recognizing it requires a pushdown automaton, i.e. a stack (Wikipedia, *Dyck language*; PlanetMath, *Dyck language*).

> **Direct mapping to our bug.** "An opener on the stack is in scope until its matching closer pops it" is *exactly* lexical scoping: in block-structured languages a name binds to "its lexically closest declaration," found by walking the stack of enclosing scopes outward (Wisconsin CS536 lecture notes; Aho/Sethi/Ullman symbol-table material via ScienceDirect, *Lexical scoping*). A `(quoting Corsello …)` opens an inner scope; Corsello is declared *inside* it; an outer `Id.` lives in the *enclosing* scope and therefore must **not** see Corsello — the same reason an inner-block local is invisible to the enclosing block. Recency violates scope; a stack enforces it.

### 2. Why the theory says "bracket structure = stack" — Chomsky–Schützenberger.

The deep reason bracket nesting is the *defining* structure of all context-free syntax: the **Chomsky–Schützenberger representation theorem** (N. Chomsky & M.-P. Schützenberger, "The Algebraic Theory of Context-Free Languages," in *Computer Programming and Formal Systems*, North-Holland, 1963) states every context-free language `L` can be written

> `L = h(D_k ∩ R)`

where `D_k` is the **Dyck language over k bracket pairs**, `R` is a **regular language**, and `h` is a **homomorphism** (PlanetMath, *Chomsky–Schützenberger theorem*; Isa-AFP formalization, Roos & Nipkow). Read operationally: *all* recursive structure factors into (a) balanced brackets `D_k` (the **stack** part) intersected with (b) a regular constraint `R` (the **finite-state / token-pattern** part). This is a theoretical license for our pipeline split: use a **stack** for nesting (`D_k`) and cheap **regular/lexical** rules for the trigger tokens and citation shapes (`R`) — they are complementary, not redundant.

### 3. "Bounded depth" is the subtle escape hatch — and a trap.

A Dyck language **restricted to a fixed maximum depth `m`** (`Dyck-(k,m)`) *is* regular: with at most `m` open brackets there are finitely many stack configurations, so a DFA — equivalently a saturating counter — suffices (Wikipedia, *Dyck language*; multiple formal-language sources). This is precisely *why a naive counter "mostly works"* on shallow citations and then fails silently on deep ones. Hewitt, Hahn, Ganguli, Liang & Manning, "RNNs can generate bounded hierarchical languages with optimal memory" (EMNLP 2020), quantify the memory: generating `Dyck-(k,m)` needs memory scaling like **`O(m log k)`** and prove this is tight (`o(m log k)` is impossible) — i.e. memory must grow with depth `m`. **Caveat / source divergence:** an automated summary of that paper's abstract asserted bounded-depth Dyck is "not regular"; that conflicts with standard formal-language theory and with Wikipedia. The reconcilable reading: *fixed* finite depth is regular (finite configurations), but the *memory still grows with the depth bound*, and an *unbounded* counter is not a stack. **Engineering takeaway:** legal parentheticals are empirically shallow (rarely > 2–3 deep), so a *bounded-depth stack* is entirely sufficient — but the right primitive is still a **stack with a depth cap**, not a single counter, because we need *which-opener-matches-which-closer*, not just depth.

### 4. Error recovery for *unbalanced* input: the four classical strategies and what they guarantee.

When brackets don't balance (our OCR/markdown reality), compiler theory offers four recovery strategies (Aho/Lam/Sethi/Ullman "Dragon book" taxonomy, via GeeksforGeeks *Error recovery strategies* and Rose-Hulman CSSE404 notes):

| Strategy | Mechanism | Guarantee | Risk |
|---|---|---|---|
| **Panic-mode** | discard tokens until a *synchronizing* token (a delimiter) is seen | always terminates; simplest | skips arbitrary spans unchecked; **cascading spurious errors** |
| **Phrase-level / local** | locally edit remaining input (insert/delete/replace one token) to continue | resumes parse | a wrong local fix can mis-parse downstream |
| **Error productions** | grammar explicitly encodes *common* malformations | precise handling of *anticipated* errors | only covers errors you predicted |
| **Global / minimum-distance correction** | find the parse requiring the **fewest edits** to the input | provably minimal edits | expensive (see §5) |

The minimum-distance ideal is formalized by **Aho & Peterson, "A Minimum Distance Error-Correcting Parser for Context-Free Languages," *SIAM J. Comput.* 1(4):305–312 (1972)**: it parses *any* input to completion finding the **fewest** errors (insertion / deletion / replacement), in time cubic in input length — a bound essentially unimproved for constant-size grammars since. So "repair the brackets optimally" has a clean definition and a known cost.

A key *modern correctness lesson* on recovery quality: **Diekmann & Tratt, "Don't Panic! Better, Fewer, Syntax Errors for LR Parsers" (2018; arXiv 1804.07133, cs.PL)** introduce **CPCT+**, which computes the *complete set of minimum-cost repair sequences*. On 200,000 erroneous Java files it repairs **98.37%**, and — directly relevant to us — it **halves cascading errors** vs. panic mode (435,812 vs. 981,628 reported error locations), because "incorrect error recovery causes further spurious syntax errors to be identified." **Lesson for us:** a bad repair is worse than no repair — it manufactures *new* false structure downstream. This is the engineering case for **abstaining** (§7) over guessing a repair.

### 5. Bracket "repair" as edit distance to Dyck: definition, cost, and a hardness warning.

Repairing unbalanced parentheses = computing **edit distance to the Dyck language** (min insertions/deletions/substitutions to make a string well-balanced). It has an **exact cubic-time DP**, with applications explicitly including "repairing semi-structured documents such as XML" (Saha, "Efficiently Computing Edit Distance to Dyck Language," 2013, arXiv 1311.2557, cs.DS). Because cubic doesn't scale, that line of work pursues near-linear *approximations*. The relevant **hardness signal**: general string edit distance has *no* strongly subquadratic algorithm unless SETH fails (**Backurs & Indyk, STOC 2015 / SIAM J. Comput.**, arXiv 1412.0348), and the Dyck/tree-edit variants inherit fine-grained-hardness barriers (recent dynamic-Dyck-edit-distance results). **Takeaway:** treating the whole document as one giant balancing/repair problem is both fragile and (super)quadratic. Scope any repair to *small local windows* around a citation, or avoid raw-paren repair entirely (§6).

### 6. Island grammars / noise-skipping: reconstruct nesting from citation islands, not raw parens. **(The recommended approach.)**

**Island grammars** (Leon Moonen, "Generating Robust Parsers using Island Grammars," *Proc. 8th Working Conf. on Reverse Engineering (WCRE'01)*, IEEE, 2001) "combine the detailed specification possibilities of grammars with the liberal behavior of lexical approaches." The grammar has two parts: **islands** — precise productions for the constructs you care about — and **water** — permissive catch-all productions that *consume and ignore everything else*. The result tolerates "syntactic errors, incomplete source code, language dialects and embedded languages" by design, because malformed regions simply fall into *water* instead of derailing the parse. The same idea appears in NLP as **noise-skipping GLR**: **Lavie & Tomita, "GLR\* — An Efficient Noise-Skipping Parsing Algorithm for Context-Free Grammars," *IWPT 1993* (ACL Anthology)** parses "the maximal subset of the original input that is covered by the grammar," skipping unparsable words — i.e. it returns the best *partial* structure rather than failing globally. (See also "A Systematic Approach to Fuzzy Parsing," Koppler, for partial-information parsing.)

**Feasibility for us — strong.** Our pipeline *already produces the islands*: extracted citation spans are high-precision anchors with known positions. The only structure we must recover is shallow and local: for each citation, is it **sibling-scope** (top-level) or **nested** inside another citation's parenthetical, and which trigger introduced it. That can be recovered from:
- the **local bracket context** of each citation island (scan a *bounded* window left/right with a small stack — cheap, and depth-capped per §3), and/or
- **trigger tokens** in the gap immediately *before* an island: `quoting` / `citing` / `quoted in` / `as quoted in` mark the *next* citation as nested-and-subordinate; their absence (a bare `;` or sentence boundary) marks a sibling.

This sidesteps whole-document paren-balancing (§5's cost/fragility) and the homomorphism/regular split of §2 maps onto it cleanly: islands+triggers are the **regular `R`** part; the tiny local stack is the **`D_k`** part.

**Failure modes to design against:**
- **Missing trigger / "infra"-style forward reference** — a parenthetical without `quoting` (e.g. a bare explanatory parenthetical `(holding that …)` that itself contains a cite). Bracket context still disambiguates here; triggers are a *soft* signal layered on the *hard* bracket-scope filter, not a replacement for it.
- **Island gaps that swallow a real bracket** — if "water" between two citations contains the `)` that closes the parenthetical, a naive window scan can mis-assign scope. Mitigate by anchoring the local stack scan to *paren tokens actually present between islands*, and bailing (abstain) when the local bracket count around an island is itself unbalanced.
- **Over-skipping (GLR\* lesson)** — noise-skipping can discard *too much* and "succeed" on a degenerate subset. Bound how much water you tolerate between an `Id.` and its candidate antecedent; beyond that, abstain.
- **Coordinate drift** — islands carry offsets into one text; brackets live in another (PDF vs. cleaned markdown). Mismatched coordinate spaces silently misalign island↔bracket; resolve both in one canonical space before scanning.

### 7. Fail-safe: every robust parser has an explicit failure node. So must we.

The unifying property of the robust parsers above is that **failure is a first-class, *localized* output**, never silent corruption:
- **tree-sitter** (incremental GLR; `/tree-sitter/tree-sitter`) "can build valid syntax trees with error nodes in the correct place" and *always returns a tree*, inserting **`ERROR`** nodes (unrecognized text) and **`MISSING`** nodes (expected-but-absent tokens) and resuming — e.g. an unclosed `(` yields `(MISSING ")")` rather than failing the whole file (tree-sitter error-recovery corpus, via context7). The error is *scoped to a subtree*; the rest of the parse survives.
- **GLR\*** returns the *maximal parseable subset* and reports what it skipped (Lavie & Tomita 1993).
- **CPCT+** reports the *set* of minimal repairs and explicitly works to *not* propagate spurious errors (Diekmann & Tratt 2018).

The shared principle: **localize and isolate the damage; never let one malformation corrupt global state.** A single linear paren counter does the opposite — one unmatched `(` from OCR shifts *every subsequent depth reading by one*, silently flipping later in/out-of-parenthetical judgments across the whole document. That is the single most dangerous property of the current implementation for *our* data.

---

## How This Applies to Id./supra Attribution

Mapping directly onto the proposed staged pipeline:

1. **PARSE (stack, not counter).** Replace the linear `(`/`)` counter with a **bounded-depth stack** that pushes openers and pops on matching closers (§1). This is the *only* primitive that recovers *which* parenthetical a cite sits inside — the thing recency gets wrong. Use Chomsky–Schützenberger (§2) as the design rationale: stack for nesting, regular rules for everything else.

2. **SCOPE = lexical scope as a stack (HARD filter).** Mark each extracted citation with its **bracket depth and enclosing-opener identity** at extraction time. An outer `Id.` may only resolve to candidates in its **own or an enclosing scope**; parenthetical-internal cites (Corsello, declared inside `(quoting …)`) are **filtered out entirely** before ranking (§1 scoping analogy). This *alone* fixes the canonical Hogue/Corsello bug: Corsello is unreachable from the outer scope, so recency never gets to pick it.

3. **SALIENCE (soft).** Among same-or-enclosing-scope siblings, *then* apply preference (recency among siblings, name-match, reporter/volume agreement — the kind of antecedent matching eyecite already does for short-cases). Salience operates *only on the scope-filtered set*, so it can no longer reach into a parenthetical.

4. **ABSTAIN (fail-safe).** Adopt the tree-sitter/GLR\*/CPCT+ posture (§4, §7): if the **local bracket window around the `Id.` is itself unbalanced**, or island/trigger evidence is contradictory, or more than a bounded amount of "water" separates `Id.` from its only candidate — **emit a structure-unrecoverable flag and route to human review.** Do **not** silently fall back to recency. Diekmann & Tratt's cascading-error result (§4) is the empirical argument: a wrong structural guess manufactures *new* false attributions downstream; abstention is strictly safer. This is the single most important behavioral change vs. today's code.

5. **PROVENANCE.** Because the stack records the *enclosing-opener chain*, recording the full quoting chain ("language quoted in Hogue, originally from Weinreb…") is nearly free — it's the stack contents at the citation's position. Trigger tokens (`quoting`/`quoted in`) label each edge of that chain.

**Recommended implementation strategy (synthesizing §6):** Do **not** try to balance raw document parens globally (fragile + cubic, §5). Instead run an **island-based local reconstruction**: treat extracted citations as islands, scan a *bounded, depth-capped* bracket window around each, layer trigger tokens as a soft scope-subordination signal, and **abstain whenever the local window is unbalanced**. This gives the scope filter (step 2) its inputs without ever betting global correctness on dirty paren counts.

---

## Trade-offs & Alternatives

- **Stack vs. counter.** Stack: correct structure, trivially supports provenance and per-cite scope; cost is negligible (one push/pop per bracket). Counter: O(1) memory but cannot answer *which* opener matches — disqualifying. **No real trade-off; the counter is simply incorrect for this task.**
- **Local island reconstruction vs. global Dyck repair.** Local islands: linear, fail-closed, sidesteps the cubic/quadratic-hardness wall (§5), tolerates unbalanced input by construction. Global minimum-edit Dyck repair (Aho-Peterson / Saha): yields a *globally consistent* repaired tree and an explicit edit cost (a usable confidence/abstain signal), but is cubic and can "fix" OCR noise into *plausible-but-wrong* structure. **Recommend local islands; optionally use a tiny windowed Dyck-repair only to decide abstain-vs-proceed, never to rewrite the document.**
- **Trigger-token reliance vs. bracket-only.** Triggers (`quoting`, `citing`, `quoted in`) are high-signal but incomplete (parentheticals exist without them; OCR can mangle them). Bracket-scope is more general but needs the parens to survive OCR. **Use bracket-scope as the HARD filter and triggers as a SOFT confirmer/provenance-labeler** — never let a missing trigger override clear bracket structure, nor a trigger override an unbalanced window.
- **Full island grammar (Moonen/GLR\*) vs. hand-rolled scanner.** A real island-grammar/GLR\* engine is heavy machinery for a 2–3-deep domain; a hand-rolled bounded-depth stack scanner over already-extracted spans captures 95% of the benefit at a fraction of the complexity. **Borrow the island *principle* (islands + water + maximal-partial + explicit failure node), not necessarily a parser generator.**
- **Bounded vs. unbounded depth.** A depth cap (§3) makes the structure regular and bounds memory/cost, and matches the empirical shallowness of legal parentheticals — but exceeding the cap must itself **abstain**, not silently truncate.

---

## Open Questions

1. **Empirical nesting depth.** What is the real distribution of parenthetical nesting depth in our corpus (Hogue-style 1 level vs. deeper `(quoting … (quoting …))`)? Sets the depth cap and how often abstain fires. (Hewitt et al. §3 says cost grows with depth; we need the actual `m`.)
2. **OCR bracket survival rate.** How often do `(` / `)` survive PDF→markdown intact vs. get dropped/garbled? If survival is high, bracket-scope can be the primary filter; if low, triggers must carry more weight. This single measurement determines the §6 design weighting.
3. **Abstain budget.** What false-attribution-vs-abstain trade-off is acceptable to the legal product? CPCT+ shows wrong repairs cascade; quantify the cost of a missed resolution (abstain) vs. a wrong one to tune §4's thresholds.
4. **Trigger lexicon completeness.** Beyond `quoting`/`citing`/`quoted in`, what is the full set of subordinating signals (`as recognized in`, `cited with approval in`, signals introducing *explanatory* parentheticals) and their reliability?
5. **Coordinate-space unification.** Which canonical text space do islands and brackets share, and is there existing drift between extraction offsets and the bracket-bearing text? (§6 failure mode — needs verification against the actual extraction pipeline.)

---

## Sources

1. **N. Chomsky & M.-P. Schützenberger (1963)**, "The Algebraic Theory of Context-Free Languages," in *Computer Programming and Formal Systems*, North-Holland, Amsterdam. — The representation theorem `L = h(D_k ∩ R)`: all CF structure factors into Dyck brackets (stack) ∩ a regular language. *Theoretical license for the stack-for-nesting / regular-for-triggers split.* (Verified via PlanetMath *Chomsky–Schützenberger theorem* and the Isabelle/AFP formalization by Roos & Nipkow.)
2. **Leon Moonen (2001)**, "Generating Robust Parsers using Island Grammars," *Proc. 8th Working Conf. on Reverse Engineering (WCRE'01)*, IEEE. — Islands (precise productions for constructs of interest) + water (liberal catch-all); robust to "syntactic errors, incomplete source code, language dialects, embedded languages." *The core model for "citations = islands, OCR gaps = water."* (Venue/year verified via ACM DL 10.5555/832308.837160 and Semantic Scholar; full-text PDF was access-restricted (403).)
3. **Alon Lavie & Masaru Tomita (1993)**, "GLR\* — An Efficient Noise-Skipping Parsing Algorithm for Context-Free Grammars," *IWPT 1993* (ACL Anthology, 1993.iwpt-1.12). — Parses the "maximal subset of the input covered by the grammar," skipping noise; returns best partial structure. *Primary source for noise-tolerant partial parsing + the over-skipping caution.*
4. **Lukas Diekmann & Laurence Tratt (2018)**, "Don't Panic! Better, Fewer, Syntax Errors for LR Parsers," arXiv:1804.07133 (cs.PL); final 2020. — CPCT+ computes the complete set of minimum-cost repairs; repairs 98.37% of 200k erroneous Java files; **halves cascading errors** vs. panic mode (435,812 vs. 981,628 error locations). *Empirical case that bad recovery manufactures spurious downstream errors → prefer abstain.*
5. **A. V. Aho & T. G. Peterson (1972)**, "A Minimum Distance Error-Correcting Parser for Context-Free Languages," *SIAM J. Comput.* 1(4):305–312. — Parses any input finding the fewest insert/delete/replace errors in cubic time; bound essentially unimproved for constant grammars. *Formal definition + cost of optimal bracket/structure repair.*
6. **Barna Saha (2013)**, "Efficiently Computing Edit Distance to Dyck Language," arXiv:1311.2557 (cs.DS). — Repairing unbalanced parentheses = edit distance to Dyck; exact cubic DP (explicitly cites XML repair); near-linear approximations. *Quantifies cost of global paren-repair → argues for local windows / islands instead.*
7. **Arturs Backurs & Piotr Indyk (2015)**, "Edit Distance Cannot Be Computed in Strongly Subquadratic Time (unless SETH is false)," STOC 2015 / *SIAM J. Comput.*; arXiv:1412.0348. — No strongly-subquadratic edit-distance algorithm under SETH; Dyck/tree-edit variants inherit fine-grained hardness. *Hardness warning against whole-document balancing as the primary mechanism.*
8. **J. Hewitt, M. Hahn, S. Ganguli, P. Liang & C. D. Manning (2020)**, "RNNs can generate bounded hierarchical languages with optimal memory," EMNLP 2020; arXiv:2010.07515. — Bounded-depth Dyck `Dyck-(k,m)`; generation needs `Θ(m log k)` memory (tight). *Memory grows with nesting depth → a depth-capped stack, not a single counter.* **Note:** an automated abstract summary claimed bounded-depth Dyck is "not regular," contradicting standard theory/Wikipedia; treated as a summarizer error — fixed finite depth is regular, but memory still scales with the depth bound. (Flagged as a divergence.)
9. **Wikipedia, *Dyck language*** + **cp-algorithms, *Balanced bracket sequences*** + **GeeksforGeeks, *Check for balanced parentheses*** + **PlanetMath, *Dyck language*** (cross-referenced, convergent). — The `([)]` counterexample (counts balance, structure wrong → counter fails, stack needed); multiple bracket types require a stack; unbounded Dyck is CF-not-regular; bounded-depth Dyck is regular. *Self-contained proof that a counter cannot do our job.*
10. **Compiler error-recovery taxonomy** — GeeksforGeeks, *Error recovery strategies in compiler design*; Rose-Hulman CSSE404 *Error Recovery* notes; grmtools error-recovery book (Aho/Lam/Sethi/Ullman "Dragon book" lineage). — Panic-mode / phrase-level / error-productions / global-correction and their guarantees & risks. *Catalog of recovery strategies + why panic-mode over-skips.*
11. **tree-sitter** (`/tree-sitter/tree-sitter`, context7) — Incremental GLR parser; *always* returns a tree with `ERROR` (unrecognized) and `MISSING` (expected-absent) nodes placed locally; an unclosed `(` → `(MISSING ")")`. *Canonical fail-safe model: localized failure node, never global corruption.*
12. **eyecite source** (`freelawproject/eyecite`, `resolve.py`) — `_resolve_id_citation` resolves to `last_resolution` (most-recently-resolved citation); short-case/supra use reporter/volume + name matching with **no parenthetical or scope logic**. *Confirms the current recency baseline we are replacing — purely positional, exactly the Hogue/Corsello failure.*
13. **Lexical-scoping references** — Wisconsin CS536 symbol-table/scoping lecture notes; ScienceDirect *Lexical scoping* overview; BrainKart *Symbol table per scope*. — "Each name refers to its lexically closest declaration," resolved by walking the stack of enclosing scopes. *The scope-as-stack analogy underpinning the HARD scope filter (inner-parenthetical cites invisible to outer Id.).*
