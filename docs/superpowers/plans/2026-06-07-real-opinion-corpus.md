# Real-Opinion Snapshot Regression Corpus — Implementation Plan (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a committed, replica-free snapshot regression net — ~1k stratified real CourtListener opinions, each reduced to a compact behavior projection — that fails when extraction/resolution behavior changes, so "the corpus test is green" means "behavior preserved."

**Architecture:** Generation (replica-required, Claude-driven via the pgedge-flp MCP) is split from checking (replica-free). A shared pure `projectOpinion(id, text)` produces the projection; the snapshot test re-runs it on committed text and diffs vs. committed projections; `corpus:regen` recomputes projections from committed text (re-baseline, no replica); the replica is touched only to draw/refresh the sample.

**Tech Stack:** TypeScript, vitest 4, `node:zlib`/`node:fs` (gzip the committed texts), tsx for scripts. Zero new runtime deps (corpus code is dev-only under `scripts/` + `tests/`).

**Spec:** `docs/superpowers/specs/2026-06-07-real-opinion-corpus-design.md`

---

## File Structure

- `scripts/corpus/project.ts` — **pure** projection: `projectOpinion(id, text)` + `OpinionProjection`/`CitationProjection` types. Imports `extractCitations`. The single source of projection truth (test + regen + sample all use it).
- `scripts/corpus/corpusIO.ts` — read/write the committed fixtures: `manifest.json`, `texts.json.gz` (gzip), `projections.json`. Pure I/O, no extraction.
- `scripts/corpus/regen.ts` — CLI (`pnpm corpus:regen`): load manifest+texts → project each → write `projections.json`. Replica-free.
- `scripts/corpus/sample.ts` — CLI (`pnpm corpus:sample`): read a Claude-produced `raw-sample.json` ({id, court, era, type, ocr, text}[]) → write `manifest.json` + `texts.json.gz`, then delegate to regen. The replica DRAW that produces `raw-sample.json` is a documented Claude-via-MCP procedure (Task 6).
- `tests/fixtures/corpus/manifest.json` · `texts.json.gz` · `projections.json` — committed corpus.
- `tests/integration/corpusProject.test.ts` — unit tests for `projectOpinion`.
- `tests/integration/corpus.test.ts` — the snapshot diff test.

---

## Task 1: Projection function + types

**Files:**
- Create: `scripts/corpus/project.ts`
- Test: `tests/integration/corpusProject.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/integration/corpusProject.test.ts
import { describe, expect, it } from "vitest"
import { projectOpinion } from "../../scripts/corpus/project"

describe("projectOpinion (#corpus)", () => {
  it("projects type, key (matchedText), span, and resolvedTo", () => {
    const text = "Smith v. Jones, 100 F.3d 1 (2d Cir. 1990). Id. at 5."
    const p = projectOpinion(42, text)

    expect(p.id).toBe(42)
    expect(p.count).toBe(2)

    const [full, id] = p.citations
    expect(full.type).toBe("case")
    expect(full.key).toBe("100 F.3d 1")
    expect(full.span[1]).toBeGreaterThan(full.span[0])
    expect(full.resolvedTo).toBeNull() // a full cite is an antecedent, not resolved

    expect(id.type).toBe("id")
    expect(id.resolvedTo).toBe("100 F.3d 1") // Id. resolves to the full cite's key
  })

  it("is deterministic (same input → same projection)", () => {
    const text = "See 42 U.S.C. § 1983. Id. § 1983(c)."
    expect(projectOpinion(1, text)).toEqual(projectOpinion(1, text))
  })
})
```

- [ ] **Step 2: Run it, verify it fails**

Run: `pnpm exec vitest run tests/integration/corpusProject.test.ts`
Expected: FAIL — cannot find module `../../scripts/corpus/project`.

- [ ] **Step 3: Implement `scripts/corpus/project.ts`**

```ts
import { extractCitations } from "../../src/index"
import type { Citation } from "../../src/types/citation"
import type { ResolvedCitation } from "../../src/resolve/types"

/** One citation reduced to its behavior-defining fields. */
export interface CitationProjection {
  type: string
  /** Normalized locator = the matched citation text (stable, readable, and the
   *  `resolvedTo` reference). Not parsed. */
  key: string
  /** Core span in original coordinates: [start, end). */
  span: [number, number]
  /** The resolved antecedent's `key`, or null (full cites + unresolved short forms). */
  resolvedTo: string | null
}

export interface OpinionProjection {
  id: number
  count: number
  citations: CitationProjection[]
}

const keyOf = (c: Citation): string => c.matchedText

/** Pure, deterministic projection of one opinion's extraction+resolution. */
export function projectOpinion(id: number, text: string): OpinionProjection {
  const cites = extractCitations(text, { resolve: true }) as ResolvedCitation[]
  const keys = cites.map(keyOf)
  return {
    id,
    count: cites.length,
    citations: cites.map((c, i) => {
      const idx = c.resolution?.resolvedTo
      const resolvedTo =
        typeof idx === "number" && idx >= 0 && idx < keys.length ? keys[idx] : null
      return {
        type: c.type,
        key: keys[i],
        span: [c.span.originalStart, c.span.originalEnd],
        resolvedTo,
      }
    }),
  }
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `pnpm exec vitest run tests/integration/corpusProject.test.ts`
Expected: PASS (2 tests). If `full.key` mismatches, log `projectOpinion(42, text)` and adjust the expected `key` to the actual `matchedText` (it is deterministic) — do NOT change the projection logic.

- [ ] **Step 5: Commit**

```bash
git add scripts/corpus/project.ts tests/integration/corpusProject.test.ts
git commit -m "feat(corpus): pure opinion projection (type/key/span/resolvedTo)"
```

---

## Task 2: Corpus I/O (fixtures read/write + gzip)

**Files:**
- Create: `scripts/corpus/corpusIO.ts`
- Test: `tests/integration/corpusIO.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/integration/corpusIO.test.ts
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, it } from "vitest"
import { readCorpus, writeCorpus } from "../../scripts/corpus/corpusIO"

const dir = mkdtempSync(join(tmpdir(), "corpus-io-"))
afterAll(() => rmSync(dir, { recursive: true, force: true }))

describe("corpus I/O", () => {
  it("round-trips manifest + gzipped texts + projections", () => {
    const manifest = [{ id: 7, court: "scotus", era: "1970s", type: "010combined", ocr: false }]
    const texts = { 7: "410 U.S. 113 (1973)." }
    const projections = { 7: { id: 7, count: 1, citations: [] } }

    writeCorpus(dir, { manifest, texts, projections })
    const back = readCorpus(dir)

    expect(back.manifest).toEqual(manifest)
    expect(back.texts).toEqual(texts)
    expect(back.projections).toEqual(projections)
  })
})
```

- [ ] **Step 2: Run it, verify it fails**

Run: `pnpm exec vitest run tests/integration/corpusIO.test.ts`
Expected: FAIL — cannot find module `corpusIO`.

- [ ] **Step 3: Implement `scripts/corpus/corpusIO.ts`**

```ts
import { gunzipSync, gzipSync } from "node:zlib"
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { OpinionProjection } from "./project"

export interface ManifestEntry {
  id: number
  court: string
  era: string
  type: string
  ocr: boolean
}

export interface Corpus {
  manifest: ManifestEntry[]
  texts: Record<number, string>
  projections: Record<number, OpinionProjection>
}

const MANIFEST = "manifest.json"
const TEXTS = "texts.json.gz"
const PROJECTIONS = "projections.json"

export function writeCorpus(dir: string, corpus: Corpus): void {
  writeFileSync(join(dir, MANIFEST), `${JSON.stringify(corpus.manifest, null, 2)}\n`)
  writeFileSync(join(dir, TEXTS), gzipSync(Buffer.from(JSON.stringify(corpus.texts))))
  writeFileSync(join(dir, PROJECTIONS), `${JSON.stringify(corpus.projections, null, 2)}\n`)
}

export function readCorpus(dir: string): Corpus {
  const manifest = JSON.parse(readFileSync(join(dir, MANIFEST), "utf8")) as ManifestEntry[]
  const texts = JSON.parse(gunzipSync(readFileSync(join(dir, TEXTS))).toString("utf8")) as Record<
    number,
    string
  >
  const projections = JSON.parse(readFileSync(join(dir, PROJECTIONS), "utf8")) as Record<
    number,
    OpinionProjection
  >
  return { manifest, texts, projections }
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `pnpm exec vitest run tests/integration/corpusIO.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/corpus/corpusIO.ts tests/integration/corpusIO.test.ts
git commit -m "feat(corpus): fixture I/O with gzipped texts"
```

---

## Task 3: Regen CLI (texts → projections, replica-free)

**Files:**
- Create: `scripts/corpus/regen.ts`
- Modify: `package.json` (add `corpus:regen` script)

- [ ] **Step 1: Implement `scripts/corpus/regen.ts`**

```ts
import { join } from "node:path"
import { readCorpus, writeCorpus } from "./corpusIO"
import { projectOpinion } from "./project"

/** Recompute expected projections from the committed texts. Replica-free; this
 *  is the re-baseline step after an intended behavior change. */
export function regen(dir: string): { changed: number } {
  const corpus = readCorpus(dir)
  const projections: typeof corpus.projections = {}
  let changed = 0
  for (const { id } of corpus.manifest) {
    const next = projectOpinion(id, corpus.texts[id])
    if (JSON.stringify(next) !== JSON.stringify(corpus.projections[id])) changed++
    projections[id] = next
  }
  writeCorpus(dir, { ...corpus, projections })
  return { changed }
}

const CORPUS_DIR = join(__dirname, "../../tests/fixtures/corpus")
if (process.argv[1]?.endsWith("regen.ts")) {
  const { changed } = regen(CORPUS_DIR)
  console.log(`corpus:regen — ${changed} projection(s) changed`)
}
```

- [ ] **Step 2: Add the script to `package.json`**

In the `"scripts"` block, add:

```json
"corpus:regen": "tsx scripts/corpus/regen.ts",
```

- [ ] **Step 3: Commit**

```bash
git add scripts/corpus/regen.ts package.json
git commit -m "feat(corpus): corpus:regen (recompute projections from committed texts)"
```

---

## Task 4: Seed corpus (replica-free), including the #878 guard

**Files:**
- Create: `scripts/corpus/seeds.ts` (hand-authored long-tail shapes)
- Create: `tests/fixtures/corpus/{manifest.json,texts.json.gz,projections.json}` (generated)

- [ ] **Step 1: Create `scripts/corpus/seeds.ts`**

Hand-authored opinions exhibiting shapes the curated corpus missed. Negative ids mark seeds (real opinions use positive CourtListener ids).

```ts
import type { ManifestEntry } from "./corpusIO"

export interface Seed {
  entry: ManifestEntry
  text: string
}

export const SEEDS: Seed[] = [
  {
    // #878: prose-led single-party caption (no `v.`) — extraction attaches no
    // party name, so `Miranda, supra` must still resolve via the fallback.
    entry: { id: -1, court: "seed", era: "seed", type: "seed", ocr: false },
    text: "The holding in Miranda, 384 U.S. 436 (1966), is broad. Miranda, supra, at 444.",
  },
  {
    entry: { id: -2, court: "seed", era: "seed", type: "seed", ocr: false },
    text: "Smith v. Jones, 200 F.3d 100 (2d Cir. 2000) (quoting Doe v. City, 100 F.2d 1). Id. at 110.",
  },
]
```

- [ ] **Step 2: Generate the seed corpus**

Run (one-off, replica-free) — writes the three fixture files from SEEDS:

```bash
pnpm exec tsx -e "
import { writeCorpus } from './scripts/corpus/corpusIO'
import { projectOpinion } from './scripts/corpus/project'
import { SEEDS } from './scripts/corpus/seeds'
const dir = 'tests/fixtures/corpus'
const manifest = SEEDS.map(s => s.entry)
const texts = Object.fromEntries(SEEDS.map(s => [s.entry.id, s.text]))
const projections = Object.fromEntries(SEEDS.map(s => [s.entry.id, projectOpinion(s.entry.id, s.text)]))
writeCorpus(dir, { manifest, texts, projections })
console.log('seed corpus written:', manifest.length)
"
```

Expected: `seed corpus written: 2`. Confirm `tests/fixtures/corpus/` now has the three files.

- [ ] **Step 3: Sanity-check the #878 seed projection**

Run: `pnpm exec tsx -e "import {readCorpus} from './scripts/corpus/corpusIO'; const c=readCorpus('tests/fixtures/corpus'); console.log(JSON.stringify(c.projections[-1].citations,null,1))"`
Expected: the `supra` citation's `resolvedTo` is **non-null** (it resolves to the Miranda full cite's key) — this is the behavior #878 would have broken.

- [ ] **Step 4: Commit**

```bash
git add scripts/corpus/seeds.ts tests/fixtures/corpus/manifest.json tests/fixtures/corpus/texts.json.gz tests/fixtures/corpus/projections.json
git commit -m "feat(corpus): seed corpus with long-tail shapes (incl. #878 prose-led supra)"
```

---

## Task 5: The snapshot test

**Files:**
- Create: `tests/integration/corpus.test.ts`

- [ ] **Step 1: Write the test**

```ts
// tests/integration/corpus.test.ts
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { readCorpus } from "../../scripts/corpus/corpusIO"
import { projectOpinion } from "../../scripts/corpus/project"

const corpus = readCorpus(join(__dirname, "../fixtures/corpus"))

describe("real-opinion snapshot corpus", () => {
  it("has a committed projection for every manifest entry", () => {
    for (const { id } of corpus.manifest) {
      expect(corpus.texts[id], `text for ${id}`).toBeDefined()
      expect(corpus.projections[id], `projection for ${id}`).toBeDefined()
    }
  })

  for (const { id } of readCorpus(join(__dirname, "../fixtures/corpus")).manifest) {
    it(`opinion ${id}: behavior matches committed projection`, () => {
      const actual = projectOpinion(id, corpus.texts[id])
      expect(actual).toEqual(corpus.projections[id])
    })
  }
})
```

- [ ] **Step 2: Run it, verify it PASSES on the seed corpus**

Run: `pnpm exec vitest run tests/integration/corpus.test.ts`
Expected: PASS (seed count + 1).

- [ ] **Step 3: Verify it is a real canary (must fail on drift)**

Temporarily edit `tests/fixtures/corpus/projections.json` — change the `-1` seed's `supra` `resolvedTo` from its key to `null`. Run the test.
Expected: FAIL on `opinion -1`. Then `git checkout tests/fixtures/corpus/projections.json` to restore.

- [ ] **Step 4: Commit**

```bash
git add tests/integration/corpus.test.ts
git commit -m "test(corpus): snapshot regression test over the committed corpus"
```

---

## Task 6: Stratified replica draw → ~1k core corpus (Claude-driven via MCP)

> This task acquires data; the deterministic writer is `sample.ts`, the replica draw is a Claude-via-MCP procedure. CI never runs this.

**Files:**
- Create: `scripts/corpus/sample.ts`
- Modify: `package.json` (`corpus:sample`)
- Regenerate: `tests/fixtures/corpus/*` (now seeds + ~1k real opinions)

- [ ] **Step 1: Implement `scripts/corpus/sample.ts`**

```ts
import { join } from "node:path"
import { readFileSync } from "node:fs"
import type { ManifestEntry } from "./corpusIO"
import { writeCorpus } from "./corpusIO"
import { projectOpinion } from "./project"
import { SEEDS } from "./seeds"

interface RawRecord {
  id: number
  court: string
  era: string
  type: string
  ocr: boolean
  text: string
}

/** Build the committed corpus from a Claude/MCP-produced raw-sample.json plus
 *  the hand-authored seeds. Deterministic given its input. */
export function buildCorpus(rawPath: string, dir: string): number {
  const raw = JSON.parse(readFileSync(rawPath, "utf8")) as RawRecord[]
  const records: RawRecord[] = [
    ...SEEDS.map((s) => ({ ...s.entry, text: s.text })),
    ...raw,
  ]
  const manifest: ManifestEntry[] = records.map(({ id, court, era, type, ocr }) => ({
    id,
    court,
    era,
    type,
    ocr,
  }))
  const texts = Object.fromEntries(records.map((r) => [r.id, r.text]))
  const projections = Object.fromEntries(records.map((r) => [r.id, projectOpinion(r.id, r.text)]))
  writeCorpus(dir, { manifest, texts, projections })
  return manifest.length
}

if (process.argv[1]?.endsWith("sample.ts")) {
  const rawPath = process.argv[2] ?? "/tmp/raw-sample.json"
  const n = buildCorpus(rawPath, join(__dirname, "../../tests/fixtures/corpus"))
  console.log(`corpus:sample — wrote ${n} opinions (seeds + sample)`)
}
```

- [ ] **Step 2: Add the script to `package.json`**

```json
"corpus:sample": "tsx scripts/corpus/sample.ts",
```

- [ ] **Step 3: Draw the stratified sample (Claude-via-MCP procedure)**

Using the `pgedge-flp` MCP, draw ~1000 opinions stratified across **court level** (SCOTUS / federal appellate / federal district / state high / state intermediate / other), **era** (decade of `search_opinioncluster.date_filed`), **opinion `type`**, and **`extracted_by_ocr`** (with an OCR floor of ≥30%). Determinism: order within each stratum by `id` and take a fixed pseudo-random slice via `WHERE (id * 2654435761) % 100 < <pct>` (no `random()`/`now()`), so the draw is reproducible.

First confirm the join columns with `get_schema_info` for `search_opinioncluster` (date) and the docket→court path; then run per-stratum queries like:

```sql
SELECT o.id, o.type, o.extracted_by_ocr AS ocr, o.plain_text AS text,
       date_part('decade', c.date_filed) AS decade
FROM search_opinion o
JOIN search_opinioncluster c ON c.id = o.cluster_id
WHERE o.plain_text <> '' AND length(o.plain_text) BETWEEN 200 AND 60000
  AND o.extracted_by_ocr = true
  AND (o.id * 2654435761) % 1000 < <slice>
ORDER BY o.id
LIMIT <per-stratum-cap>;
```

Cap `plain_text` length (≤60k) to bound repo size; page across strata to reach ~1000. Assemble the rows into `/tmp/raw-sample.json` as `RawRecord[]` (mapping court level from the court id), with `era` = `"<decade>s"`.

- [ ] **Step 4: Build + project the corpus**

Run: `pnpm corpus:sample /tmp/raw-sample.json`
Expected: `wrote ~1002 opinions (seeds + sample)`.

- [ ] **Step 5: Verify the corpus test passes on the real sample**

Run: `pnpm exec vitest run tests/integration/corpus.test.ts`
Expected: PASS for every opinion (the projections were just generated from current behavior). If any opinion throws during extraction, that's a real crash bug — capture the id+text as a regression and fix separately; do NOT silently drop it.

- [ ] **Step 6: Check size + commit**

Run: `du -h tests/fixtures/corpus/texts.json.gz` (expect single-digit MB). If >~10MB, reduce the length cap or sample size.

```bash
git add scripts/corpus/sample.ts package.json tests/fixtures/corpus/manifest.json tests/fixtures/corpus/texts.json.gz tests/fixtures/corpus/projections.json
git commit -m "feat(corpus): ~1k stratified real-opinion core corpus (#corpus)"
```

---

## Task 7: Docs + changeset

**Files:**
- Modify: `README.md` (or `CLAUDE.md`) — corpus + re-baseline workflow
- Create: `.changeset/real-opinion-corpus.md`

- [ ] **Step 1: Document the workflow**

Add a short section (in `CLAUDE.md` under Test Structure) describing: the corpus is a committed snapshot net; after an *intended* behavior change run `pnpm corpus:regen`, review the projection diff (intended improvement vs. regression), and commit; `pnpm corpus:sample` (Claude-via-MCP) only to grow/refresh.

- [ ] **Step 2: Add the changeset**

```bash
cat > .changeset/real-opinion-corpus.md <<'EOF'
---
"eyecite-ts": patch
---

test(corpus): add a real-opinion snapshot regression net (~1k stratified CourtListener opinions reduced to a compact behavior projection), so behavior-preservation across the real distribution is checked, not just curated samples.
EOF
```

- [ ] **Step 3: Full verification**

Run: `pnpm exec vitest run && pnpm typecheck`
Expected: full suite green (including the new corpus tests), typecheck clean.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md .changeset/real-opinion-corpus.md
git commit -m "docs(corpus): document the corpus + re-baseline workflow; changeset"
```

---

## Self-Review

**Spec coverage:** snapshot net (Tasks 1/5) ✓ · compact projection w/ resolution + additive-immunity (Task 1) ✓ · committed + replica-free checking (Tasks 2/5) ✓ · regen vs. sample split (Tasks 3/6) ✓ · stratified sampling (Task 6) ✓ · Claude-driven-via-MCP generation (Task 6) ✓ · seeded long-tail incl. #878 (Task 4) ✓ · gzip storage (Task 2) ✓ · Phase 2 (extended/nightly) correctly **out of scope**. 

**Type consistency:** `OpinionProjection`/`CitationProjection` (project.ts) used by corpusIO/regen/sample/tests; `ManifestEntry`/`Corpus` (corpusIO) used by regen/sample/seeds; `projectOpinion(id,text)` signature consistent across all callers; `resolution?.resolvedTo` is the index field set by `extractCitations(text,{resolve:true})`.

**Placeholders:** none — all code is complete; the only non-code task (Task 6 Step 3) is an inherently Claude-driven data draw, specified with the concrete deterministic query + assembly format.

**Note for executor:** Task 1 Step 4 — if `matchedText` for the seed differs from the asserted `"100 F.3d 1"`, adjust the *test expectation* to the actual deterministic value (the projection logic is correct). The seed/sample projection files are *generated*, never hand-edited.
