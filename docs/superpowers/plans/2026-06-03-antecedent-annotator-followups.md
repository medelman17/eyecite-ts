# Antecedent Annotator — Deferred Follow-ups

Captured during the full-stack build (Plan 2 + 3 + frontend). None block the shipped app; all were consciously deferred. Severity is relative to a local, single-trusted-team internal tool.

## Frontend architecture (from component-architecture review)
- **Decompose the God components.** `reviewer.tsx` (~860 lines) and `adjudicator.tsx` (~630) fuse data-fetch + state machine + keyboard + business logic + render. Extract: a shared `useAsyncResource<T>(loader, deps)` hook (removes the triplicated loading/cancellation boilerplate), a `viewmap.ts` (pure contract→view: `buildCiteLookup`, `computeBuriedSet`, `formatParties`, `describeDecision`, `describeGold`, `labelStatus`, gold-draft converters — currently duplicated across surfaces and partly recomputed per render), a `useWorkbenchKeyboard(bindings)` hook (kills the per-render rebind in adjudicator + the 10-entry dep array + the eslint-disables), and render sub-components `QueueRail`/`CandidatePanel`/`DecisionDock`. Target <300 lines per surface. (The Rules-of-Hooks Critical was already fixed minimally in `fix(annotator-web): call all hooks before early returns`; this is the larger structural cleanup it pointed at.)
- **`DocViewer` prop bag (11 props).** Collapse the parallel per-citation decoration inputs (`candidateIds`/`ambigSet`/`buriedSet`/`tintMap`/`labels`+`docId`) into one `getCiteDecoration(id)` resolver built by the viewmap layer; drop the redundant `docId` (derive from `doc.id`).
- **Adjudicator mutates `queue` in place** (`queue[currentIndex] = …` then relies on a separate `setCurrentIndex` to re-render). Lift `queue` into its own state and update immutably.
- **Session constants** (`CURRENT_BATCH`, `CURRENT_ANNOTATOR`, the adjudicator's `by: "lead"`, the TopBar identity) are redeclared per file. Centralize in a `session.ts` — the seam for real auth / reviewer selection (v1 has no auth by design).
- **Swallowed write error**: `reviewer.tsx` `postLabel` failure is `console.warn`-only while the UI shows success. Surface a toast (the announcer already exists for it).

## Accessibility (residual, after the a11y hardening pass)
- The hardening pass addressed all Critical/Serious + most Moderate findings (focus-visible, keyboard-operable marks/cards, dialog semantics + focus trap, live region, contrast, reduced-motion, target sizes). Residual nice-to-haves: full APG **tablist** semantics (currently `aria-current` on tab buttons — pragmatic given the global keyboard scheme owns arrows); a roving-tabindex **listbox** for the candidate panel (currently buttons + `aria-pressed`); `eslint-plugin-jsx-a11y` wired into the web package to prevent regressions; an automated axe/Lighthouse pass over all three tabs + open modals.

## Backend / engine
- **eyecite-ts core resolver gap (worth a core issue):** the seed corpus surfaced that `§ 3-2.2, supra` (a statute-section `supra` back-reference) is **not** resolved as a back-reference — the real engine produced 2 backrefs for the Whitcomb opinion where the design assumed 3. Conversely it found an extra `shortFormCase` back-reference in Hargrove (5 vs 4). These real-vs-assumed divergences are exactly what the gold corpus exists to quantify; the statute-section `supra` case is a candidate enhancement for `resolveSupra`.
- **`re-ingest of a labeled document`**: the upsert now preserves labels for stable text (positional ids stable), but if a document's text changes such that a citation/backref disappears, its labels cascade away. Acceptable for the seed-once demo; revisit if live re-ingestion of labeled docs becomes a workflow.
- **κ for >2 reviewers**: `agreement`/`BatchSummary` implement Cohen's κ (2 reviewers) and return `null` otherwise. Add Fleiss' κ if 3+-reviewer batches are introduced.

## Tooling / ops
- The backend integration tests share one Postgres instance and now run with `fileParallelism: false` for determinism. If the suite grows, consider a per-worker schema/DB for parallelism.
- CI does not currently run the annotator's integration tests (they need a Postgres service) or build the web app. If desired, add a CI job: spin up `postgres:16`, `pnpm --filter annotator migrate && vitest run`, and `pnpm --filter annotator-web build`. (The core eyecite-ts CI is unaffected — the annotator is a private workspace app and the core `src/` was never modified.)
- No changeset was added: the annotator (`apps/annotator`, `apps/annotator/web`) is `private: true` and not part of the published `eyecite-ts` package; the core was untouched, so there is nothing to release.
