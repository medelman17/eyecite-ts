/**
 * scripts/corpus/fetch.ts — MAINTAINER-RUN, replica-REQUIRED. CI never runs this.
 *
 * Deterministically selects a stratified, era-spread sample of real opinions
 * from the CourtListener replica and (re)builds the committed corpus = seeds +
 * the sample. The SELECTION query below is the auditable, reproducible "pick"
 * (same ids every run) — Claude validated it via the MCP (299 era-spread
 * opinions at STEP=22000); this script fetches the text the MCP can't carry.
 *
 * Why a script and not the MCP: ~1k opinions ≈ 28 KB each ≈ ~7M tokens of text,
 * far too much to flow through an agent/MCP context. A direct DB connection
 * streams text to disk instead.
 *
 * Run:
 *   pnpm add -D pg                     # the corpus's only out-of-tree dep
 *   CL_DATABASE_URL='postgres://…/courtlistener?sslmode=require' \
 *   CORPUS_STEP=11000 pnpm corpus:fetch   # lower STEP → more opinions (~1k at 11000)
 *
 * Then review the projections.json diff and commit the regenerated corpus.
 */
import { join } from "node:path"
import { type ManifestEntry, writeCorpus } from "./corpusIO"
import { projectOpinion } from "./project"
import { SEEDS } from "./seeds"

// Lower STEP → more candidates → more opinions. 22000≈300, 11000≈600, 7000≈~1k.
const STEP = Number(process.env.CORPUS_STEP ?? 11000)

// Deterministic, era-spread selection: the nearest valid opinion at/after each
// of N evenly-spaced points across the id range (gap-tolerant via LATERAL).
const SELECT_SQL = `
SELECT o.id, o.type, o.extracted_by_ocr AS ocr,
       (date_part('decade', c.date_filed) * 10)::int AS era,
       o.plain_text AS text
FROM generate_series(1, 11000000, $1) g(gid)
CROSS JOIN LATERAL (
  SELECT id, type, extracted_by_ocr, cluster_id, plain_text
  FROM search_opinion
  WHERE id >= g.gid AND plain_text <> '' AND length(plain_text) BETWEEN 500 AND 60000
  ORDER BY id LIMIT 1
) o
JOIN search_opinioncluster c ON c.id = o.cluster_id
ORDER BY o.id`

interface Row {
  id: number
  type: string
  ocr: boolean
  era: number
  text: string
}

/** Minimal `pg.Client` surface, self-typed so `@types/pg` isn't required. */
interface PgClient {
  connect(): Promise<void>
  query(sql: string, params: unknown[]): Promise<{ rows: Row[] }>
  end(): Promise<void>
}
interface PgModule {
  Client: new (config: { connectionString: string }) => PgClient
}

async function main(): Promise<void> {
  const url = process.env.CL_DATABASE_URL
  if (!url) throw new Error("Set CL_DATABASE_URL to the CourtListener replica connection string")
  const pg = (await import("pg")) as unknown as PgModule
  const client = new pg.Client({ connectionString: url })
  await client.connect()
  let rows: Row[]
  try {
    rows = (await client.query(SELECT_SQL, [STEP])).rows
  } finally {
    await client.end()
  }

  // Dedupe: close candidates in sparse id regions can resolve to the same opinion.
  const byId = new Map<number, Row>()
  for (const r of rows) byId.set(r.id, r)
  const real = [...byId.values()]

  const records = [
    ...SEEDS.map((s) => ({ entry: s.entry, text: s.text })),
    ...real.map((r) => ({
      entry: { id: r.id, court: "unknown", era: `${r.era}s`, type: r.type, ocr: r.ocr },
      text: r.text,
    })),
  ]
  const manifest: ManifestEntry[] = records.map((r) => r.entry)
  const texts = Object.fromEntries(records.map((r) => [r.entry.id, r.text]))
  const projections = Object.fromEntries(
    records.map((r) => [r.entry.id, projectOpinion(r.entry.id, r.text)]),
  )
  writeCorpus(join(process.cwd(), "tests/fixtures/corpus"), { manifest, texts, projections })
  console.log(`corpus:fetch — wrote ${manifest.length} opinions (${SEEDS.length} seeds + ${real.length} real)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
