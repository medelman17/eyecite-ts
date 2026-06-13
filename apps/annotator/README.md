# Antecedent Annotator

An annotation tool for labeling antecedent spans in legal citation text. Built on Hono (Node.js API), Postgres 16, and a Vite+React frontend.

## Quickstart — full stack via Docker

One command brings up Postgres, the API (migrated automatically on start), and the web UI:

```bash
docker compose -f apps/annotator/docker-compose.yml up --build
```

Then open **http://localhost:8080**.

| Service | Host port | Notes |
|---------|-----------|-------|
| Web (nginx) | 8080 | SPA + reverse-proxy to API |
| API (Hono) | 8787 | REST API, migrated on start |
| Postgres | 5434 | Internal port 5432 |

### Seed the demo corpus

After the stack is up, seed sample documents and a review batch in one command:

```bash
docker compose -f apps/annotator/docker-compose.yml exec api pnpm seed
```

Then visit http://localhost:8080 and navigate to the Review surface to start labeling.

### Stop and clean up

```bash
docker compose -f apps/annotator/docker-compose.yml down
```

This removes containers but preserves the named volume with Postgres data. To also remove the volume:

```bash
docker compose -f apps/annotator/docker-compose.yml down -v
```

---

## Local dev (no Docker for the app)

Run only the database in Docker and the API + web natively for fast iteration.

**1. Start Postgres:**

```bash
docker compose -f apps/annotator/docker-compose.yml up -d db
```

**2. Configure and migrate the API:**

```bash
cd apps/annotator
cp .env.example .env          # set ANNOTATOR_DB_URL=postgres://annotator:annotator@localhost:5434/annotator
pnpm migrate
pnpm seed                     # optional: load demo data
pnpm dev                      # API on http://localhost:8787
```

**3. Start the web frontend (separate terminal):**

```bash
cd apps/annotator/web
pnpm dev                      # Vite dev server on http://localhost:5173, proxies /api → :8787
```

---

## Architecture

```
apps/annotator/
  src/
    contract.ts      — shared TypeScript types (API contract)
    server.ts        — Hono app entry point
    migrate.ts       — idempotent schema migrations (runs on `pnpm migrate` or API start in Docker)
    seed.ts          — demo corpus loader
    ingest.ts        — CourtListener replica ingestion
    routes/
      batches.ts     — GET /batches (BatchSummary[])
      labels.ts      — POST /batches/:id/labels (reviewer decisions)
      adjudication.ts — adjudicator queue + gold decisions + NDJSON export
      agreement.ts   — Cohen's kappa inter-rater agreement
  migrations/        — numbered .sql migration files
  web/
    src/             — React + Vite frontend
    nginx.conf       — SPA serving + /api proxy to the api service
```

### Three annotation surfaces

| Surface | Path | Purpose |
|---------|------|---------|
| Review | `/` | Reviewers label antecedent spans in queued documents |
| Adjudicate | `/adjudicate` | Adjudicators resolve disagreements, set gold decisions |
| Dashboard | `/dashboard` | Corpus overview, batch agreement (κ), export |

The full REST contract is defined in `src/contract.ts`. All types are shared between the API and the frontend via the workspace.

### Ingesting from the CourtListener replica

The `ingest` script pulls documents from the CourtListener PostgreSQL replica:

```bash
cd apps/annotator
COURTLISTENER_REPLICA_URL=postgres://... pnpm ingest
```

The replica is accessible via the `pgedge-flp` MCP connection for development queries. Ingested documents are stored in the `documents` table with their extracted backrefs (citation spans) pre-populated by `eyecite-ts`.

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ANNOTATOR_DB_URL` | — | Postgres connection string (required) |
| `PORT` | `8787` | API listen port |
| `COURTLISTENER_REPLICA_URL` | — | Source DB for `pnpm ingest` (optional) |
