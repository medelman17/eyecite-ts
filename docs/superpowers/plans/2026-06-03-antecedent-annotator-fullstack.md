# Antecedent Annotator — Full-Stack Plan (Plan 2 + Plan 3 + Frontend)

> **For agentic workers:** executed via superpowers:subagent-driven-development. This extends the slice-1 backend (`2026-06-03-antecedent-annotator-backend.md`, Tasks 1–8 merged on this branch) to the full three-persona app the approved design calls for. Steps are TDD where logic is testable; the frontend is a faithful port of the approved Claude-design bundle.

**Goal:** Stand up the complete, locally-dockerized Antecedent Annotator: the slice-1 read API **plus** label-write (Plan 2), adjudication + inter-annotator agreement (κ) + gold export (Plan 3), a seed of canonical hard-case opinions run through the *real* eyecite-ts engine, and a Vite + React + TS frontend (Reviewer · Adjudicator · Corpus) wired to the live API.

**Design source of truth:** the Claude-design handoff bundle (extracted at `/tmp/annotator-design/eyecite-ts-corpus-annotation/`): `project/app/{reviewer,adjudicator,dashboard,components}.jsx`, `styles.css`, `Antecedent Annotator.html`, `data.js`, `chats/chat1.md`. The README says: recreate faithfully in the stack that fits (here: Vite+React+TS), match the visual output, don't copy the prototype's internal structure verbatim.

**Aesthetic (from the design):** calm **dark** expert tool; **Spectral** serif for opinion prose, **IBM Plex Sans** for chrome, **IBM Plex Mono** for keycaps/confidence; warm-gold accent for the engine's pick/confirm. Keyboard-first: `Enter` confirm · `1–9` pick · `A` abstain · `M` ambiguous · `F` flag · `←/→` nav · `J` next-unlabeled · `E` context · `⌘Z` undo · `?` help. Adjudicator: `A`/`B` accept reviewer · `G` accept engine · `1–9` pick · `X` gold=none · `R` rationale · `Enter` record.

---

## Contract refinements (`apps/annotator/src/contract.ts`)

The design's view-model is ~our contract with these deltas. The **backend contract is authoritative**; the frontend consumes it (one wire format, no client-side shape divergence).

1. `DocumentPayload`: add optional `caption?: string` and `docket?: string` (the Reviewer/Adjudicator headers show them; real ingest may omit → UI falls back to court/year).
2. `Label.decision` ambiguous variant carries the picked set: `{ type: "ambiguous"; citationIds: string[] }` (the design's ambiguous mode selects 2+). Other variants unchanged: `{type:"antecedent"; citationId}` | `{type:"abstain"}` | `{type:"flag"}`.
3. `Label` gains server-assigned `createdAt: string` (ISO) on read responses; clients don't send it.
4. New read types for the new surfaces (frontend imports these):
   - `BatchSummary { id, name, mode: "single"|"double", docCount, backrefCount, labeled, reviewers: string[], kappa: number|null, disagreements: number, flagged: number, status: string, mix: { confirm, correct, abstain, ambiguous, flag } }`
   - `NextItem { document: DocumentPayload; backref: Backref } | null`
   - `AdjudicationItem { id, documentId, backrefId, reason: "disagreement"|"flag", reviewers: { annotatorId, decision }[], engineGuess: string|null, gold: GoldDecision|null }`
   - `GoldDecision { type: "antecedent"|"abstain"|"ambiguous"|"none"; citationId?; citationIds?; rationale?; by; at }`

## Schema migration `002_labels_and_metadata.sql`

- `alter table documents add column if not exists caption text;`
- `alter table documents add column if not exists docket text;`
- `alter table labels add column if not exists ambiguous_citation_ids jsonb;` (the ambiguous pick set)
- `alter table labels add constraint labels_citation_fk foreign key (document_id, citation_id) references citations(document_id, id) on delete cascade;` (data integrity for the antecedent pick; nullable citation_id → MATCH SIMPLE skips the check for abstain/flag/ambiguous)
- `create table if not exists gold (` document_id, backref_id, type text check (...), citation_id text, ambiguous_citation_ids jsonb, rationale text, by text, at timestamptz default now(), `primary key (document_id, backref_id)`, FK to backrefs `on delete cascade` `);`
- Indexes: `create index if not exists labels_doc_backref on labels (document_id, backref_id);`

## Upsert hardening (`src/persist.ts`) — preserve labels on re-ingest

`upsertDocumentPayload` currently deletes+reinserts citations/backrefs, which cascades-deletes labels (gold data). Change to **upsert by PK**: `insert ... on conflict (document_id, id) do update` for each citation/backref, then delete only rows whose ids are no longer present. Prefill ids are positional and stable for stable text, so re-ingesting the same doc preserves labels. (TDD: a test that labels survive a re-ingest of the same document.) Also persist/read `caption`/`docket`.

---

## Endpoints (added to `makeApp` / split into route modules)

**Plan 2 — write & workflow**
- `GET /annotators`, `POST /annotators {id,name}`
- `GET /batches`, `GET /batches/:id`, `POST /batches {name, mode, documentIds, reviewers}`
- `GET /batches/:id/next?annotator=` → `NextItem` (first backref in the batch with no label by that annotator; null when done)
- `GET /documents/:id/labels?annotator=` → `Label[]` (resume)
- `POST /labels` → upsert a `Label` (unique on document/backref/annotator), returns the stored row with `createdAt`

**Plan 3 — adjudication, agreement, export**
- `GET /batches/:id/adjudication` → `AdjudicationItem[]` (backrefs where reviewers disagree, or any flag)
- `GET /gold/:documentId/:backrefId`, `POST /gold` → record `GoldDecision`
- `GET /batches/:id/agreement` → `{ kappa: number|null, perAnnotatorCounts, observedAgreement, expectedAgreement }` (Cohen's κ for 2 annotators over the canonical decision category; Fleiss' κ for >2; null when <2 annotators or no shared items)
- `GET /batches/:id/export` → `application/x-ndjson` gold JSONL, one line per backref with a gold decision: `{ documentId, backrefId, kind, backrefText, decision, candidates, court, year, source }`

**κ category canonicalization** (shared util, unit-tested): a label → category string `antecedent:<citationId>` | `abstain` | `ambiguous:<sorted ids joined>` | `flag`. Cohen's κ = (pₒ − pₑ)/(1 − pₑ) over the backrefs both annotators labeled.

---

## Seed (`src/seed.ts`, `pnpm seed`)

Author the design's four canonical opinions as raw text + metadata (caption/docket/court/year/source) — Hargrove (Hogue/Corsello buried-paren, Smith-supra same-name, string-cite abstain, Yellen prose-chain), Ferro (Williston/Cobalt), Castellano (Bryant/Davis nested, OCR), Whitcomb (Ferris/EPTL). Run each through the **real** `buildDocumentPayload` (so the engine's *actual* guesses/candidates/`isBuriedAside` show — not the mock's hand-authored values), persist; create two annotators (`r-okafor`, `t-vasquez`), a `double` batch over all four docs, and a couple of demo labels so the dashboard/adjudication surfaces have content. Idempotent (`on conflict`).

---

## Frontend (`apps/annotator/web/`, Vite + React + TS)

Faithful port of the bundle. Structure:
- `web/package.json` (vite, react, react-dom, typescript, @vitejs/plugin-react), `web/vite.config.ts` (dev proxy `/api` → `http://localhost:8787`), `web/tsconfig.json`, `web/index.html` (fonts + root).
- `web/src/styles.css` — port `styles.css` verbatim (it's the design language; 404 lines).
- `web/src/types.ts` — import/redeclare the contract types (DocumentPayload, Backref, Candidate, Label, BatchSummary, AdjudicationItem, …).
- `web/src/api.ts` — typed fetch client for every endpoint.
- `web/src/components.tsx` — KeyCap, StatusDot, ConfidenceMeter, PositionBar, CandidateCard, DocViewer, DocMap, decision vocab (ported, typed; spans come from the contract's `[start,end]`, not client-computed `find`).
- `web/src/reviewer.tsx`, `web/src/adjudicator.tsx`, `web/src/dashboard.tsx` — the three surfaces, ported, wired to `api.ts` (labels persist to the DB via POST /labels; localStorage only as offline cache).
- `web/src/App.tsx`, `web/src/main.tsx` — shell (TopBar tabs, legends) + mount.

Port rules: match the visual output and interactions exactly (dimmed-context focus, doc-map gutter, hover-candidate-lights-citation, buried/aside demotion, undo/toasts/completion, ambiguous multi-select in-doc, adjudicator side-by-side tints). Map contract→view: `displayText` (not `display`), `parties:{plaintiff,defendant}` → `"P v. D"`, candidate index `i+1` for the `1–9` keys (ignore 0-based `rank` for display), `KIND_LABEL` covers `id|supra|shortFormCase|full`. Keep accessibility: focus management on item change, `aria` on controls, visible focus rings, target sizes.

---

## Task breakdown (subagent-driven; TDD on backend logic, controller-verified port on frontend)

1. **Schema 002 + contract refinements + upsert hardening** (TDD: re-ingest preserves labels; caption/docket round-trip; ambiguous label round-trip).
2. **Plan 2 write API** — annotators, batches, next, labels, resume (integration TDD per endpoint).
3. **Plan 3 adjudication + κ + export** — adjudication queue, gold, agreement (κ util unit-tested + endpoint), export JSONL (integration TDD).
4. **Seed script** — curated opinions → real prefill → DB + annotators + batch + demo labels (run + verify row counts).
5. **Frontend scaffold** — vite/react/ts, index.html (fonts), styles.css port, types.ts, api.ts; `pnpm --filter annotator-web build` clean.
6. **Frontend shared + Reviewer** — components.tsx + reviewer.tsx wired to API; build clean; manual smoke via dev server against seeded API.
7. **Frontend Adjudicator + Dashboard** — adjudicator.tsx + dashboard.tsx wired; build clean.
8. **Docker capstone** — compose `postgres + api + web`, Dockerfiles, full-stack README; `docker compose up` brings up the whole app.

## Testing strategy
- Backend: vitest integration against the docker DB (host 5434), as established; κ category + math unit-tested with known fixtures; export shape asserted.
- Frontend: `tsc` + `vite build` must pass; component logic that's pure (κ display, decision vocab, contract→view mappers) unit-tested where it has logic; the UI itself is verified by build + a dev-server smoke against the seeded API (and accessibility review of the interactive surfaces).
- No `any`; NodeNext `.js` on backend imports; never touch eyecite-ts core `src/`.
