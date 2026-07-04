# v1 rewrite — sequencing plan (draft)

Status: **framing grilled 2026-07-04; step order still draft.** Decided at the framing level: (a) **v1 completes before new downstream consumers are built on it** — no interim consumers on 0.x; the verification nets carry the full weight during the rewrite; (b) **full committed scope stands** — format(), lint(), CLI, and the schema artifact all ship in v1, not deferred; (c) **step 0 added below** — the corpus grows a tranche of real, freshly-fetched opinion text (PDF-extracted, artifacts included) *before* rewrite work starts, so extraction is continuously tested against production-shaped input. The numbered step order and the remaining open questions are still to be grilled. Related: `2026-07-04-architecture-review.md`, `2026-07-04-v1-interface-alternatives.md`.

## Principles

- **Old tests keep passing until their seam is replaced** — each step migrates a seam and retires the tests below it (replace, don't layer).
- **The three nets come online as early as their prerequisites allow**: corpus parity (exists), round-trip law (needs `format()` + generator), gold Id./supra scoreboard (needs #829 labels).
- **Behavior changes are batched at the end** (corpus regen is one reviewed diff), except where a step's whole point is a behavior fix.

## Proposed order

0. **Corpus tranche first (decided; composition specified in `2026-07-04-court-text-conventions.md`)**: ~40 docs across NY HTML slip opinions (raw, conventions preserved), federal CourtListener `plain_text` (PDF-extraction texture preserved), and pathological diagnostics — committed as ordinary corpus fixtures via `corpus:fetch` plus one small NY-HTML fetcher. Artifact-handling scope for the rewrite follows the bound-volume rule defined in that doc.
1. **Schema first** (`eyecite-ts/schema`): the IR types, `SCHEMA_VERSION`, `validateDocument`, JSON Schema artifact. Pure types + validator — no pipeline changes. Everything else builds against this.
2. **Coordinate hiding** (candidate 2): extractors emit clean-coordinate spans; one translation pass at the orchestrator. Mechanical, ~73 signatures shrink; corpus stays green (behavior-preserving). This shrinks every later diff.
3. **Pass pipeline skeleton** (candidate 1): the 17 passes become an ordered `Pass[]`; dedup and dispatch become named modules; ordering prose becomes data + tests. Corpus green throughout (pure restructuring).
4. **IR emission**: a final pipeline stage builds the v1 `CitationDocument` (families/kinds mapping per spec §7, edges/groups from today's relationship fields, hashed ids, categorical confidence via the new single scoring pass). Old and new outputs coexist behind a flag; corpus projections re-pointed at the IR (`kind, id, refersTo`) — the one big reviewed regen.
5. **`format()` + generator + round-trip net**: the second net comes online. From here, every subsequent step is double-netted.
6. **Case-stage collapse** (candidate 3) and **statute registry** (candidate 6): internal deepening under both nets; retire the micro-helper mirror tests as stages absorb them (candidate 7).
7. **Resolver split** (candidate 5): three family resolvers; measured against the gold scoreboard (#829 labels) where available, parity + seeded hard cases otherwise — per spec §11's explicit fallback.
8. **`lint()`** (pure IR consumer, ADR 0006), **CLI**, **annotate/view**: consumers of the finished IR; they force no pipeline changes, so they land last and validate the IR's sufficiency.
9. **Surface swap**: delete 0.x exports, ship entry points per spec §1, size gates, release.

## Open sequencing questions (to grill before starting)

- Does step 4 (IR emission) come before or after step 6 (case collapse)? Emitting the IR from the *old* case internals means mapping code that gets thrown away; emitting after means the corpus regen waits longer. Current lean: IR first (the mapping code is small; the early regen de-risks everything).
- Where does #829's migration to the IR happen — at step 4 (first consumer, writes the migration guide) or step 9?
- Branch strategy: long-lived `v2` branch vs. incremental behind flags on main. Current lean: incremental — steps 2–3 are invisible refactors that belong on main regardless.
- What, if anything, ships as 0.x minors along the way (step 2/3 are release-safe improvements)?
