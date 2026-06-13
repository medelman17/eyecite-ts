# Antecedent Annotator — Backend Implementation Plan (Slice 1: foundation + data pipeline + read contract)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a local, dockerized backend that (a) samples real legal documents from the CourtListener replica, (b) runs eyecite-ts to pre-compute each back-reference's engine guess + candidate set into Postgres, and (c) serves that data contract over HTTP — so the externally-designed frontend can build against live data.

**Architecture:** A new pnpm **workspace package** `apps/annotator/` that imports the published `eyecite-ts` surface (no changes to the zero-dependency core). A pure `prefill` module maps `extractCitations(text, { resolve: true })` output into the spec's contract (`DocumentPayload`). An `ingest` script pulls documents from the replica (read-only, via `COURTLISTENER_REPLICA_URL`), runs prefill, and writes Postgres. A small Hono API serves the contract. Postgres + API run via docker compose.

**Tech stack:** TypeScript (ESM), `eyecite-ts` (workspace:\*), Hono + @hono/node-server (API), postgres.js (`postgres`) (DB client), plain numbered SQL migrations, vitest (tests, already in repo), docker compose (postgres:16 + node api).

**Scope boundary:** This slice = schema + prefill + ingestion + **read** contract API + docker. **Out of scope (follow-on plans):** Plan 2 = label-write API + batch assignment; Plan 3 = adjudication queue + inter-annotator agreement (κ) + gold export. The core `eyecite-ts` package and its `src/` are **not** modified by any task here.

**Prereqs the engineer needs:** Docker + docker compose; pnpm 10; the replica URL in `apps/annotator/.env` as `COURTLISTENER_REPLICA_URL=postgres://…` (read-only credentials — owner-provided; the queries in Task 7 were validated against `ogbono.courtlistener.com/courtlistener`).

---

## File structure (created by this plan)

```
pnpm-workspace.yaml                      # MODIFY: add `packages: ["apps/*"]`
apps/annotator/
  package.json                           # workspace pkg: deps eyecite-ts, hono, postgres
  tsconfig.json
  vitest.config.ts
  .env.example                           # COURTLISTENER_REPLICA_URL, ANNOTATOR_DB_URL
  docker-compose.yml                     # postgres:16 + api service
  Dockerfile                             # api image
  migrations/001_init.sql                # documents, citations, backrefs, candidates, batches, annotators, labels
  src/
    contract.ts                          # DocumentPayload / Citation / Backref / Candidate / Label types
    prefill.ts                           # buildDocumentPayload(text, meta) — PURE; eyecite-ts -> contract
    html.ts                              # stripHtml(html) -> text (for opinion html_with_citations)
    db.ts                                # postgres.js client factory
    migrate.ts                           # apply migrations/*.sql in order (idempotent)
    persist.ts                           # upsertDocumentPayload(sql, payload) -> documentId
    ingest.ts                            # replica -> prefill -> persist (CLI)
    server.ts                            # Hono app (routes) + node-server entry
  tests/
    prefill.test.ts                      # PURE unit tests (no DB) — the domain core
    html.test.ts
    persist.test.ts                      # integration (needs ANNOTATOR_DB_URL)
    server.test.ts                       # integration (needs ANNOTATOR_DB_URL)
```

---

## Task 1: Workspace scaffold

**Files:**
- Modify: `pnpm-workspace.yaml`
- Create: `apps/annotator/package.json`, `apps/annotator/tsconfig.json`, `apps/annotator/vitest.config.ts`, `apps/annotator/.env.example`

- [ ] **Step 1: Add the apps glob to the workspace** (keep the existing allowlist)

`pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
onlyBuiltDependencies:
  - esbuild
```

- [ ] **Step 2: Create `apps/annotator/package.json`**

```json
{
  "name": "annotator",
  "private": true,
  "type": "module",
  "scripts": {
    "migrate": "tsx src/migrate.ts",
    "ingest": "tsx src/ingest.ts",
    "dev": "tsx watch src/server.ts",
    "start": "tsx src/server.ts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "eyecite-ts": "workspace:*",
    "hono": "^4.6.0",
    "@hono/node-server": "^1.13.0",
    "postgres": "^3.4.0"
  },
  "devDependencies": {
    "tsx": "^4.0.0",
    "typescript": "^5.0.0",
    "vitest": "^4.0.0",
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 3: Create `apps/annotator/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 4: Create `apps/annotator/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
})
```

- [ ] **Step 5: Create `apps/annotator/.env.example`**

```
# Read-only CourtListener replica (owner-provided creds). Used only by `ingest`.
COURTLISTENER_REPLICA_URL=postgres://user:pass@host:5432/courtlistener?sslmode=require
# Local annotation database (docker compose provides this).
ANNOTATOR_DB_URL=postgres://annotator:annotator@localhost:5433/annotator
```

- [ ] **Step 6: Install + verify the workspace resolves**

Run: `pnpm install`
Run: `pnpm --filter annotator exec tsc --noEmit`
Expected: install succeeds; tsc prints nothing (no files yet → no errors).

- [ ] **Step 7: Commit**

```bash
git add pnpm-workspace.yaml apps/annotator/package.json apps/annotator/tsconfig.json apps/annotator/vitest.config.ts apps/annotator/.env.example pnpm-lock.yaml
git commit -m "feat(annotator): scaffold apps/annotator workspace package"
```

---

## Task 2: Contract types (`src/contract.ts`)

**Files:** Create `apps/annotator/src/contract.ts`

- [ ] **Step 1: Write the contract types** (exactly the spec's data shapes)

```ts
// apps/annotator/src/contract.ts
export type CitationKind = "full" | "id" | "supra" | "shortFormCase"

export interface ContractCitation {
  id: string // stable within a document, e.g. `c${index}`
  kind: CitationKind
  span: [number, number] // [start, end) in the document text
  displayText: string
  parties?: { plaintiff?: string; defendant?: string }
  year?: number
}

export interface Candidate {
  citationId: string // refers to a "full" ContractCitation
  rank: number // 0 = the engine's pick, then ascending
  confidence?: number // engine confidence for the pick; undefined for others
  isBuriedAside: boolean // candidate sits inside another cite's parenthetical
  why: string // short human-readable reason ("engine pick", "prior full cite", "buried in (quoting …)")
}

export interface Backref {
  id: string // = the back-reference's ContractCitation id
  span: [number, number]
  kind: "id" | "supra" | "shortFormCase"
  engineGuess: string | null // citationId, or null when the engine abstained
  engineConfidence: number | null
  engineWarning: string | null
  candidates: Candidate[]
}

export interface DocumentPayload {
  id: string
  source: "ocr" | "native"
  court: string | null
  year: number | null
  text: string
  citations: ContractCitation[]
  backrefs: Backref[]
}

export interface Label {
  backrefId: string
  decision:
    | { type: "antecedent"; citationId: string }
    | { type: "abstain" }
    | { type: "ambiguous" }
    | { type: "flag" }
  annotatorId: string
  agreedWithEngine: boolean
  note?: string
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `pnpm --filter annotator exec tsc --noEmit` → Expected: passes.
```bash
git add apps/annotator/src/contract.ts
git commit -m "feat(annotator): define the UI data contract types"
```

---

## Task 3: Prefill mapping (`src/prefill.ts`) — the domain core, TDD

**What it does:** Pure function `buildDocumentPayload(text, meta) → DocumentPayload`. Runs `extractCitations(text, { resolve: true })`, assigns each citation a stable id (`c${index}`), classifies kind, and for every `id`/`supra`/`shortFormCase` builds a `Backref` with the engine guess (`resolution.resolvedTo`), confidence, warning, and a candidate list = the **prior full citations** (document order), with the guess ranked first and each candidate flagged `isBuriedAside` when its span is wholly inside an earlier citation's `fullSpan` (public signal; the canonical "(quoting X)" buried case). No DB, no I/O.

**Files:** Create `apps/annotator/tests/prefill.test.ts`, then `apps/annotator/src/prefill.ts`

- [ ] **Step 1: Write failing tests** (cover: id-guess, supra, candidate ordering, buried-aside, abstain)

```ts
// apps/annotator/tests/prefill.test.ts
import { describe, expect, it } from "vitest"
import { buildDocumentPayload } from "../src/prefill"

const meta = { id: "d1", source: "native" as const, court: null, year: null }

describe("buildDocumentPayload", () => {
  it("emits one citation per extraction with stable ids and kinds", () => {
    const p = buildDocumentPayload("Smith v. Jones, 100 F.2d 1 (1990). Id. at 5.", meta)
    expect(p.citations.map((c) => c.kind)).toEqual(["full", "id"])
    expect(p.citations[0].id).toBe("c0")
    expect(p.citations[1].id).toBe("c1")
  })

  it("an Id. backref carries the engine guess + confidence and ranks it first", () => {
    const p = buildDocumentPayload("Smith v. Jones, 100 F.2d 1 (1990). Id. at 5.", meta)
    const b = p.backrefs.find((x) => x.kind === "id")!
    expect(b.engineGuess).toBe("c0")
    expect(b.engineConfidence).toBe(1)
    expect(b.candidates[0]).toMatchObject({ citationId: "c0", rank: 0 })
  })

  it("candidates are the PRIOR full cites, guess-first then reverse document order", () => {
    const p = buildDocumentPayload(
      "Smith v. Jones, 100 F.2d 1. Doe v. Roe, 200 F.3d 2. Id. at 5.",
      meta,
    )
    const b = p.backrefs.find((x) => x.kind === "id")!
    // guess = most-recent (Doe, c1); both priors are candidates; the buried-cite test covers asides
    expect(b.engineGuess).toBe("c1")
    expect(b.candidates.map((c) => c.citationId)).toEqual(["c1", "c0"])
    expect(b.candidates.every((c) => !c.isBuriedAside)).toBe(true)
  })

  it("flags a candidate buried in another cite's parenthetical via fullSpan containment", () => {
    // Bar v. Baz is inside Foo's (quoting …) → buried aside.
    const p = buildDocumentPayload(
      "Foo v. Goo, 500 U.S. 100 (quoting Bar v. Baz, 200 U.S. 50). Id.",
      meta,
    )
    const bar = p.citations.find((c) => c.displayText.includes("200 U.S. 50"))!
    const b = p.backrefs.find((x) => x.kind === "id")!
    const barCand = b.candidates.find((c) => c.citationId === bar.id)!
    expect(barCand.isBuriedAside).toBe(true)
  })

  it("records an abstain (engineGuess null) when the resolver does not resolve", () => {
    const p = buildDocumentPayload("Id. at 5.", meta) // nothing precedes it
    const b = p.backrefs.find((x) => x.kind === "id")!
    expect(b.engineGuess).toBeNull()
    expect(b.candidates).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter annotator exec vitest run tests/prefill.test.ts`
Expected: FAIL — "Cannot find module '../src/prefill'".

- [ ] **Step 3: Implement `src/prefill.ts`**

```ts
// apps/annotator/src/prefill.ts
import { extractCitations } from "eyecite-ts"
import type {
  Backref,
  Candidate,
  ContractCitation,
  CitationKind,
  DocumentPayload,
} from "./contract"

type AnyCitation = {
  type: string
  matchedText?: string
  span: { cleanStart: number; cleanEnd: number; originalStart: number; originalEnd: number }
  fullSpan?: { cleanStart: number; cleanEnd: number }
  plaintiff?: string
  defendant?: string
  year?: number
  resolution?: { resolvedTo?: number; confidence?: number; warnings?: string[] }
}

const BACKREF_TYPES = new Set(["id", "supra", "shortFormCase"])

function kindOf(type: string): CitationKind {
  return BACKREF_TYPES.has(type) ? (type as CitationKind) : "full"
}

/** A candidate is "buried" if its core span sits wholly inside an earlier cite's fullSpan. */
function isBuried(cand: AnyCitation, all: AnyCitation[], candIdx: number): boolean {
  for (let i = 0; i < candIdx; i++) {
    const fs = all[i].fullSpan
    if (!fs) continue
    if (fs.cleanStart <= cand.span.cleanStart && fs.cleanEnd >= cand.span.cleanEnd) return true
  }
  return false
}

export function buildDocumentPayload(
  text: string,
  meta: { id: string; source: "ocr" | "native"; court: string | null; year: number | null },
): DocumentPayload {
  const cites = extractCitations(text, { resolve: true }) as unknown as AnyCitation[]
  const id = (i: number) => `c${i}`

  const citations: ContractCitation[] = cites.map((c, i) => ({
    id: id(i),
    kind: kindOf(c.type),
    span: [c.span.originalStart, c.span.originalEnd],
    displayText: c.matchedText ?? text.slice(c.span.cleanStart, c.span.cleanEnd),
    parties:
      c.plaintiff || c.defendant ? { plaintiff: c.plaintiff, defendant: c.defendant } : undefined,
    year: c.year,
  }))

  const backrefs: Backref[] = []
  for (let i = 0; i < cites.length; i++) {
    const c = cites[i]
    if (!BACKREF_TYPES.has(c.type)) continue

    const guessIdx = c.resolution?.resolvedTo
    const guessId = guessIdx === undefined ? null : id(guessIdx)

    // Candidate universe: prior FULL citations, most-recent first.
    const candidates: Candidate[] = []
    for (let j = i - 1; j >= 0; j--) {
      if (BACKREF_TYPES.has(cites[j].type)) continue // skip prior back-refs
      candidates.push({
        citationId: id(j),
        rank: 0, // fixed below
        confidence: j === guessIdx ? c.resolution?.confidence : undefined,
        isBuriedAside: isBuried(cites[j], cites, j),
        why: j === guessIdx ? "engine pick" : "prior full citation",
      })
    }
    // Guess first, then keep reverse-document order; assign ranks.
    candidates.sort((a, b) => (a.citationId === guessId ? -1 : b.citationId === guessId ? 1 : 0))
    candidates.forEach((cand, r) => {
      cand.rank = r
    })

    backrefs.push({
      id: id(i),
      span: [c.span.originalStart, c.span.originalEnd],
      kind: c.type as Backref["kind"],
      engineGuess: guessId,
      engineConfidence: c.resolution?.confidence ?? null,
      engineWarning: c.resolution?.warnings?.[0] ?? null,
      candidates,
    })
  }

  return { ...meta, text, citations, backrefs }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm --filter annotator exec vitest run tests/prefill.test.ts`
Expected: PASS (5 tests). If the candidate-ordering test fails on ranks, confirm the guess is sorted to index 0.

- [ ] **Step 5: Commit**

```bash
git add apps/annotator/src/prefill.ts apps/annotator/tests/prefill.test.ts
git commit -m "feat(annotator): pure prefill mapping eyecite-ts -> UI contract (TDD)"
```

---

## Task 4: HTML→text for opinion bodies (`src/html.ts`)

**Why:** RECAP docs give raw `plain_text`; opinions give `html_with_citations`. Strip tags to feed `buildDocumentPayload`.

**Files:** Create `apps/annotator/tests/html.test.ts`, then `apps/annotator/src/html.ts`

- [ ] **Step 1: Failing test**

```ts
// apps/annotator/tests/html.test.ts
import { expect, it } from "vitest"
import { stripHtml } from "../src/html"

it("strips tags, decodes entities, preserves paragraph breaks", () => {
  expect(stripHtml("<p>Smith v. Jones, 1 U.S. 1.</p><p>Id. at 5.</p>")).toBe(
    "Smith v. Jones, 1 U.S. 1.\n\nId. at 5.",
  )
  expect(stripHtml('See <a href="x">Smith &amp; Co.</a>')).toBe("See Smith & Co.")
})
```

- [ ] **Step 2: Verify fail** — Run: `pnpm --filter annotator exec vitest run tests/html.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement `src/html.ts`**

```ts
// apps/annotator/src/html.ts
export function stripHtml(html: string): string {
  return html
    .replace(/<(p|div|br|li|h[1-6])\b[^>]*>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
```

- [ ] **Step 4: Verify pass** — Run the test → PASS (1 test). Adjust the block-tag regex if the paragraph-break expectation differs.

- [ ] **Step 5: Commit**
```bash
git add apps/annotator/src/html.ts apps/annotator/tests/html.test.ts
git commit -m "feat(annotator): stripHtml for opinion html_with_citations"
```

---

## Task 5: Postgres schema + migrate runner

**Files:** Create `apps/annotator/migrations/001_init.sql`, `apps/annotator/src/db.ts`, `apps/annotator/src/migrate.ts`, `apps/annotator/docker-compose.yml`

- [ ] **Step 1: Schema** — `apps/annotator/migrations/001_init.sql`

```sql
create table if not exists documents (
  id          text primary key,
  source      text not null check (source in ('ocr','native')),
  court       text,
  year        int,
  text        text not null,
  created_at  timestamptz not null default now()
);
create table if not exists citations (
  document_id text not null references documents(id) on delete cascade,
  id          text not null,
  kind        text not null check (kind in ('full','id','supra','shortFormCase')),
  span_start  int not null,
  span_end    int not null,
  display_text text not null,
  plaintiff   text,
  defendant   text,
  year        int,
  primary key (document_id, id)
);
create table if not exists backrefs (
  document_id text not null references documents(id) on delete cascade,
  id          text not null,
  kind        text not null check (kind in ('id','supra','shortFormCase')),
  span_start  int not null,
  span_end    int not null,
  engine_guess      text,
  engine_confidence double precision,
  engine_warning    text,
  candidates  jsonb not null,
  primary key (document_id, id)
);
create table if not exists annotators (
  id   text primary key,
  name text not null
);
create table if not exists batches (
  id         text primary key,
  name       text not null,
  created_at timestamptz not null default now()
);
create table if not exists batch_items (
  batch_id    text not null references batches(id) on delete cascade,
  document_id text not null references documents(id) on delete cascade,
  primary key (batch_id, document_id)
);
create table if not exists labels (
  id           bigserial primary key,
  document_id  text not null,
  backref_id   text not null,
  annotator_id text not null references annotators(id),
  decision_type text not null check (decision_type in ('antecedent','abstain','ambiguous','flag')),
  citation_id  text,
  agreed_with_engine boolean not null,
  note         text,
  created_at   timestamptz not null default now(),
  unique (document_id, backref_id, annotator_id),
  foreign key (document_id, backref_id) references backrefs(document_id, id) on delete cascade
);
```

- [ ] **Step 2: DB client** — `apps/annotator/src/db.ts`

```ts
// apps/annotator/src/db.ts
import postgres from "postgres"

export function makeSql(url = process.env.ANNOTATOR_DB_URL) {
  if (!url) throw new Error("ANNOTATOR_DB_URL is not set")
  return postgres(url, { onnotice: () => {} })
}
```

- [ ] **Step 3: Migrate runner** — `apps/annotator/src/migrate.ts`

```ts
// apps/annotator/src/migrate.ts
import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { makeSql } from "./db"

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations")

export async function migrate(sql = makeSql()): Promise<string[]> {
  await sql`create table if not exists _migrations (name text primary key, applied_at timestamptz default now())`
  const applied = new Set((await sql`select name from _migrations`).map((r) => r.name as string))
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()
  const ran: string[] = []
  for (const f of files) {
    if (applied.has(f)) continue
    await sql.unsafe(readFileSync(join(dir, f), "utf8"))
    await sql`insert into _migrations (name) values (${f})`
    ran.push(f)
  }
  return ran
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sql = makeSql()
  migrate(sql).then((r) => {
    console.log(`applied: ${r.length ? r.join(", ") : "(none — up to date)"}`)
    return sql.end()
  })
}
```

- [ ] **Step 4: docker compose** — `apps/annotator/docker-compose.yml`

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: annotator
      POSTGRES_PASSWORD: annotator
      POSTGRES_DB: annotator
    ports: ["5433:5432"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U annotator"]
      interval: 2s
      timeout: 3s
      retries: 20
```

- [ ] **Step 5: Apply + verify** (DB integration starts here — needs Docker)

Run: `docker compose -f apps/annotator/docker-compose.yml up -d db`
Run: `cd apps/annotator && cp .env.example .env && pnpm migrate`
Expected: `applied: 001_init.sql`. Re-run `pnpm migrate` → `applied: (none — up to date)`.

- [ ] **Step 6: Commit**
```bash
git add apps/annotator/migrations apps/annotator/src/db.ts apps/annotator/src/migrate.ts apps/annotator/docker-compose.yml
git commit -m "feat(annotator): postgres schema + idempotent migrate runner + compose db"
```

---

## Task 6: Persist a DocumentPayload (`src/persist.ts`) — integration TDD

**Files:** Create `apps/annotator/tests/persist.test.ts`, then `apps/annotator/src/persist.ts`. (Tests require `docker compose up -d db` + `pnpm migrate`.)

- [ ] **Step 1: Failing test**

```ts
// apps/annotator/tests/persist.test.ts
import { afterAll, beforeAll, expect, it } from "vitest"
import { makeSql } from "../src/db"
import { migrate } from "../src/migrate"
import { upsertDocumentPayload, getDocumentPayload } from "../src/persist"
import { buildDocumentPayload } from "../src/prefill"

const sql = makeSql()
beforeAll(async () => { await migrate(sql) })
afterAll(async () => { await sql`delete from documents where id = 'tdoc'`; await sql.end() })

it("round-trips a DocumentPayload through Postgres", async () => {
  const payload = buildDocumentPayload("Smith v. Jones, 1 U.S. 1 (1990). Id. at 5.", {
    id: "tdoc", source: "native", court: "scotus", year: 1990,
  })
  await upsertDocumentPayload(sql, payload)
  const got = await getDocumentPayload(sql, "tdoc")
  expect(got?.citations.length).toBe(payload.citations.length)
  expect(got?.backrefs[0].engineGuess).toBe(payload.backrefs[0].engineGuess)
})
```

- [ ] **Step 2: Verify fail** — Run: `cd apps/annotator && pnpm exec vitest run tests/persist.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement `src/persist.ts`**

```ts
// apps/annotator/src/persist.ts
import type { Sql } from "postgres"
import type { DocumentPayload } from "./contract"

export async function upsertDocumentPayload(sql: Sql, p: DocumentPayload): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`insert into documents (id, source, court, year, text)
      values (${p.id}, ${p.source}, ${p.court}, ${p.year}, ${p.text})
      on conflict (id) do update set source = excluded.source, text = excluded.text`
    await tx`delete from citations where document_id = ${p.id}`
    await tx`delete from backrefs where document_id = ${p.id}`
    for (const c of p.citations) {
      await tx`insert into citations (document_id, id, kind, span_start, span_end, display_text, plaintiff, defendant, year)
        values (${p.id}, ${c.id}, ${c.kind}, ${c.span[0]}, ${c.span[1]}, ${c.displayText}, ${c.parties?.plaintiff ?? null}, ${c.parties?.defendant ?? null}, ${c.year ?? null})`
    }
    for (const b of p.backrefs) {
      await tx`insert into backrefs (document_id, id, kind, span_start, span_end, engine_guess, engine_confidence, engine_warning, candidates)
        values (${p.id}, ${b.id}, ${b.kind}, ${b.span[0]}, ${b.span[1]}, ${b.engineGuess}, ${b.engineConfidence}, ${b.engineWarning}, ${sql.json(b.candidates)})`
    }
  })
}

export async function getDocumentPayload(sql: Sql, id: string): Promise<DocumentPayload | null> {
  const [doc] = await sql`select * from documents where id = ${id}`
  if (!doc) return null
  const citations = await sql`select * from citations where document_id = ${id} order by id`
  const backrefs = await sql`select * from backrefs where document_id = ${id} order by id`
  return {
    id: doc.id, source: doc.source, court: doc.court, year: doc.year, text: doc.text,
    citations: citations.map((c) => ({
      id: c.id, kind: c.kind, span: [c.span_start, c.span_end], displayText: c.display_text,
      parties: c.plaintiff || c.defendant ? { plaintiff: c.plaintiff, defendant: c.defendant } : undefined,
      year: c.year ?? undefined,
    })),
    backrefs: backrefs.map((b) => ({
      id: b.id, kind: b.kind, span: [b.span_start, b.span_end], engineGuess: b.engine_guess,
      engineConfidence: b.engine_confidence, engineWarning: b.engine_warning, candidates: b.candidates,
    })),
  }
}
```

- [ ] **Step 4: Verify pass** — Run the test → PASS (1 test).
- [ ] **Step 5: Commit**
```bash
git add apps/annotator/src/persist.ts apps/annotator/tests/persist.test.ts
git commit -m "feat(annotator): persist + read DocumentPayload (postgres)"
```

---

## Task 7: Ingestion from the replica (`src/ingest.ts`)

**What it does:** Connects to the read-only replica (`COURTLISTENER_REPLICA_URL`), samples documents (RECAP `ocr_status` arm + native arm; over-sampling string-cite/parenthetical-dense docs), builds payloads via prefill, persists them. CLI: `pnpm ingest --arm ocr --limit 50`.

**Files:** Create `apps/annotator/src/ingest.ts`. (Validated queries: `search_recapdocument.ocr_status` 1=OCR/2=native + `plain_text`.)

- [ ] **Step 1: Implement `src/ingest.ts`**

```ts
// apps/annotator/src/ingest.ts
import postgres from "postgres"
import { makeSql } from "./db"
import { buildDocumentPayload } from "./prefill"
import { upsertDocumentPayload } from "./persist"

const REPLICA = process.env.COURTLISTENER_REPLICA_URL
const arm = (process.argv.find((a) => a.startsWith("--arm="))?.split("=")[1] ?? "ocr") as "ocr" | "native"
const limit = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 25)
const ocrStatus = arm === "ocr" ? 1 : 2

async function main() {
  if (!REPLICA) throw new Error("COURTLISTENER_REPLICA_URL is not set")
  const replica = postgres(REPLICA, { onnotice: () => {} })
  const db = makeSql()
  try {
    // Over-sample hard cases: docs containing a string-cite/parenthetical trigger.
    const rows = await replica`
      select id, plain_text
      from search_recapdocument tablesample system (1.5)
      where ocr_status = ${ocrStatus}
        and length(plain_text) between 1500 and 80000
        and plain_text ~* '\\(\\s*(quoting|citing|noting|holding)'
      limit ${limit}`
    let n = 0
    for (const r of rows) {
      const payload = buildDocumentPayload(r.plain_text as string, {
        id: `recap-${r.id}`, source: arm, court: null, year: null,
      })
      if (payload.backrefs.length === 0) continue // only keep docs with back-refs to label
      await upsertDocumentPayload(db, payload)
      n++
    }
    console.log(`ingested ${n}/${rows.length} ${arm} documents (with back-refs)`)
  } finally {
    await replica.end()
    await db.end()
  }
}
main()
```

- [ ] **Step 2: Smoke-run against the replica** (manual; needs `COURTLISTENER_REPLICA_URL`)

Run: `cd apps/annotator && pnpm ingest --arm=ocr --limit=10`
Expected: `ingested N/10 ocr documents (with back-refs)` (N ≥ 1). Verify: `psql $ANNOTATOR_DB_URL -c "select count(*) from backrefs"` → > 0.
(No automated test — it depends on live replica creds. The pure logic it calls is covered by Tasks 3 & 6.)

- [ ] **Step 3: Commit**
```bash
git add apps/annotator/src/ingest.ts
git commit -m "feat(annotator): ingest sampled replica documents -> prefill -> postgres"
```

---

## Task 8: Read API (`src/server.ts`) — Hono, integration TDD

**Endpoints (read-only this slice):** `GET /healthz`, `GET /documents/:id` → `DocumentPayload`, `GET /documents` → `[{id, source, backrefCount}]`.

**Files:** Create `apps/annotator/tests/server.test.ts`, then `apps/annotator/src/server.ts`. (Tests need DB up + migrated.)

- [ ] **Step 1: Failing test**

```ts
// apps/annotator/tests/server.test.ts
import { afterAll, beforeAll, expect, it } from "vitest"
import { makeSql } from "../src/db"
import { migrate } from "../src/migrate"
import { upsertDocumentPayload } from "../src/persist"
import { buildDocumentPayload } from "../src/prefill"
import { makeApp } from "../src/server"

const sql = makeSql()
const app = makeApp(sql)
beforeAll(async () => {
  await migrate(sql)
  await upsertDocumentPayload(sql, buildDocumentPayload("Smith v. Jones, 1 U.S. 1 (1990). Id. at 5.", {
    id: "srvdoc", source: "native", court: null, year: 1990,
  }))
})
afterAll(async () => { await sql`delete from documents where id='srvdoc'`; await sql.end() })

it("GET /healthz returns ok", async () => {
  const res = await app.request("/healthz")
  expect(res.status).toBe(200)
})

it("GET /documents/:id returns the contract", async () => {
  const res = await app.request("/documents/srvdoc")
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.backrefs[0].kind).toBe("id")
  expect(body.backrefs[0].engineGuess).toBe("c0")
})
```

- [ ] **Step 2: Verify fail** — Run: `cd apps/annotator && pnpm exec vitest run tests/server.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement `src/server.ts`**

```ts
// apps/annotator/src/server.ts
import { serve } from "@hono/node-server"
import { Hono } from "hono"
import type { Sql } from "postgres"
import { makeSql } from "./db"
import { getDocumentPayload } from "./persist"

export function makeApp(sql: Sql) {
  const app = new Hono()
  app.get("/healthz", (c) => c.json({ ok: true }))
  app.get("/documents", async (c) => {
    const rows = await sql`
      select d.id, d.source, count(b.*)::int as "backrefCount"
      from documents d left join backrefs b on b.document_id = d.id
      group by d.id, d.source order by d.id`
    return c.json(rows)
  })
  app.get("/documents/:id", async (c) => {
    const payload = await getDocumentPayload(sql, c.req.param("id"))
    return payload ? c.json(payload) : c.json({ error: "not found" }, 404)
  })
  return app
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = makeApp(makeSql())
  const port = Number(process.env.PORT ?? 8787)
  serve({ fetch: app.fetch, port })
  console.log(`annotator api on :${port}`)
}
```

- [ ] **Step 4: Verify pass** — Run the test → PASS (2 tests).
- [ ] **Step 5: Commit**
```bash
git add apps/annotator/src/server.ts apps/annotator/tests/server.test.ts
git commit -m "feat(annotator): read API (Hono) serving the document contract"
```

---

## Task 9: Wire it together + run docs

**Files:** Create `apps/annotator/README.md`; extend `docker-compose.yml` with the api service + `apps/annotator/Dockerfile`.

- [ ] **Step 1: Dockerfile** — `apps/annotator/Dockerfile`

```dockerfile
FROM node:22-slim
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
WORKDIR /repo/apps/annotator
CMD ["pnpm", "start"]
```

- [ ] **Step 2: Add the api service to `docker-compose.yml`** (append under `services:`)

```yaml
  api:
    build: { context: ../.., dockerfile: apps/annotator/Dockerfile }
    environment:
      ANNOTATOR_DB_URL: postgres://annotator:annotator@db:5432/annotator
      PORT: "8787"
    ports: ["8787:8787"]
    depends_on:
      db: { condition: service_healthy }
```

- [ ] **Step 3: README** — `apps/annotator/README.md` (quickstart)

```markdown
# Antecedent Annotator (backend)
1. `cp .env.example .env` and set `COURTLISTENER_REPLICA_URL`.
2. `docker compose up -d db && pnpm migrate`
3. `pnpm ingest --arm=ocr --limit=50` (and `--arm=native`)
4. `pnpm dev` → API on http://localhost:8787 (`GET /documents`, `GET /documents/:id`).
The frontend consumes the contract in `src/contract.ts`. Plan 2 adds the label-write API.
```

- [ ] **Step 4: Full app test run + typecheck**

Run: `cd apps/annotator && pnpm exec tsc --noEmit && pnpm test`
Expected: typecheck clean; prefill + html pass unconditionally; persist + server pass when `docker compose up -d db` + migrate have run.

- [ ] **Step 5: Commit**
```bash
git add apps/annotator/Dockerfile apps/annotator/docker-compose.yml apps/annotator/README.md
git commit -m "chore(annotator): dockerize api + quickstart docs"
```

---

## Self-review (against the spec)

- **Spec coverage:** corpus sampling (Task 7), resolver-prefill incl. guess/candidates/confidence/warning/isBuriedAside (Task 3), Postgres schema (Task 5), serve-the-contract API (Task 8), docker compose (Tasks 5, 9), tests (Tasks 3, 4, 6, 8). **Deferred to Plan 2/3 (explicitly out of scope):** label-write API, batch assignment, adjudication, κ agreement, gold export, annotator identity. Contract `Label` type is defined (Task 2) so Plan 2 has the shape.
- **Core untouched:** no task edits `src/` of `eyecite-ts`; the annotator imports the published surface (`eyecite-ts`). `isBuriedAside` uses public `fullSpan` (richer depth/trigger asides would need a future `eyecite-ts/utils` export of `computeBracketScopes` — noted, not required here).
- **Type consistency:** `buildDocumentPayload`, `upsertDocumentPayload`/`getDocumentPayload`, `makeApp`, `makeSql`, `migrate` signatures match across Tasks 3/6/8. Citation ids are `c${index}` throughout; `candidates` is `jsonb` in SQL and `Candidate[]` in TS.
- **No placeholders:** every step has concrete code/commands.

## Follow-on plans (separate spec→plan→build cycles)
- **Plan 2 — Annotation write API:** `POST /labels`, `GET /backrefs/next?batch=`, batch creation/assignment, annotator identity. Consumes the `Label` contract type.
- **Plan 3 — Adjudication + agreement + export:** disagreement queue, gold resolution, Cohen's/Fleiss' κ, `GET /export` (gold JSONL for the ranker / calibration).
