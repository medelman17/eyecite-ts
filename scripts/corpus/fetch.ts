/**
 * scripts/corpus/fetch.ts — builds the committed corpus = seeds + a stratified,
 * era-spread sample of real CourtListener opinions, fetched over the REST API.
 *
 * Self-contained + deterministic: the "selection" is the nearest opinion at/after
 * each of N evenly-spaced points across the id space (`id__gte` + `order_by=id`
 * is the API's `LATERAL` nearest-id). Only opinions whose plain_text falls in
 * [MIN_LEN, MAX_LEN] are kept, so the realized yield is ~1/4 of the gid count
 * (STEP=22000 → 500 gids → ~124 real opinions). Text streams API→disk, never
 * through an agent context (a ~1k corpus is ~7M tokens of text).
 *
 * Resilient: requests retry on 429/5xx + thrown timeout/network errors, and an
 * opinion that crashes extractCitations is skipped + logged (see #881) rather
 * than aborting the whole build.
 *
 * Run:
 *   COURTLISTENER_API_TOKEN=… CORPUS_STEP=22000 pnpm corpus:fetch
 * Lower STEP → more opinions (~0.25 real per gid): 22000→~124, 9000→~300,
 * 2750→~1k. Then review the projections.json diff and commit.
 */
import { join } from "node:path"
import { type ManifestEntry, writeCorpus } from "./corpusIO"
import { projectOpinion } from "./project"
import { SEEDS } from "./seeds"

const BASE = "https://www.courtlistener.com/api/rest/v4"
const ID_MAX = 11_000_000
const STEP = Number(process.env.CORPUS_STEP ?? 22000)
const MIN_LEN = 500
const MAX_LEN = 60_000
const DELAY_MS = 350

interface OpinionResult {
  id: number
  plain_text: string | null
  type: string
  extracted_by_ocr: boolean
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Fetch with retry on 429/5xx AND thrown timeout/network errors. Returns null
 *  after exhausting attempts, so one bad request skips a gid (not the run). */
async function clGet(path: string, token: string): Promise<{ results: OpinionResult[] } | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        headers: { Authorization: `Token ${token}` },
        signal: AbortSignal.timeout(45_000),
      })
      if (res.status === 429 || res.status >= 500) {
        await sleep(5000 * 2 ** attempt) // 5s, 10s, 20s, 40s, 80s
        continue
      }
      if (!res.ok) throw new Error(`CL ${res.status}: ${res.statusText}`)
      return (await res.json()) as { results: OpinionResult[] }
    } catch (e) {
      if (attempt >= 4) {
        console.warn(`skip ${path}: ${e instanceof Error ? e.message : e}`)
        return null
      }
      await sleep(2000 * 2 ** attempt) // 2s, 4s, 8s, 16s
    }
  }
  return null
}

async function main(): Promise<void> {
  const token = process.env.COURTLISTENER_API_TOKEN
  if (!token) throw new Error("Set COURTLISTENER_API_TOKEN (the CourtListener REST API token)")

  const seen = new Set<number>()
  const real: Array<{ entry: ManifestEntry; text: string }> = []
  const fields = "id,plain_text,type,extracted_by_ocr"

  for (let gid = 1; gid <= ID_MAX; gid += STEP) {
    const page = await clGet(
      `/opinions/?id__gte=${gid}&order_by=id&page_size=5&fields=${fields}`,
      token,
    )
    if (!page) {
      await sleep(DELAY_MS)
      continue
    }
    // Nearest opinion at/after gid whose plain_text is within the length window.
    const hit = page.results.find(
      (r) => r.plain_text && r.plain_text.length >= MIN_LEN && r.plain_text.length <= MAX_LEN,
    )
    if (hit && !seen.has(hit.id)) {
      seen.add(hit.id)
      real.push({
        entry: { id: hit.id, court: "unknown", era: "unknown", type: hit.type, ocr: hit.extracted_by_ocr },
        text: hit.plain_text as string,
      })
    }
    await sleep(DELAY_MS)
  }

  const records = [...SEEDS.map((s) => ({ entry: s.entry, text: s.text })), ...real]

  // Project per-opinion so one opinion that crashes extractCitations skips
  // itself (logged for investigation) rather than killing the whole build —
  // a crash on real input is itself a finding the corpus is meant to surface.
  const manifest: ManifestEntry[] = []
  const texts: Record<number, string> = {}
  const projections: Record<number, ReturnType<typeof projectOpinion>> = {}
  const crashed: Array<{ id: number; error: string }> = []
  for (const r of records) {
    try {
      projections[r.entry.id] = projectOpinion(r.entry.id, r.text)
      manifest.push(r.entry)
      texts[r.entry.id] = r.text
    } catch (e) {
      crashed.push({ id: r.entry.id, error: e instanceof Error ? e.message : String(e) })
    }
  }

  writeCorpus(join(process.cwd(), "tests/fixtures/corpus"), { manifest, texts, projections })
  const seedsKept = manifest.filter((e) => e.type === "seed").length
  console.log(
    `corpus:fetch — wrote ${manifest.length} opinions (${seedsKept} seeds + ${manifest.length - seedsKept} real)`,
  )
  if (crashed.length) {
    console.warn(`\n⚠️  ${crashed.length} opinion(s) SKIPPED — extractCitations threw (library bug on real input):`)
    for (const c of crashed) console.warn(`   id ${c.id}: ${c.error}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
