// apps/annotator/src/routes/batches.ts
import { Hono } from "hono"
import type postgres from "postgres"
import { canonicalCategory, cohenKappa } from "../kappa.js"
import { decisionFromColumns } from "../decision.js"
import type { BatchSummary } from "../contract.js"

interface AnnotatorRow {
  id: string
  name: string
}

interface BatchRow {
  id: string
  name: string
  mode: string
}

interface BatchReviewerRow {
  annotator_id: string
}

interface BatchItemRow {
  document_id: string
}

interface BatchStatsRow {
  backref_count: number
  labeled: number
}

interface CreateBatchBody {
  id?: string
  name?: string
  mode?: string
  documentIds?: string[]
  reviewers?: string[]
}

interface CreateAnnotatorBody {
  id?: string
  name?: string
}

// ── Row types for GET /batches ─────────────────────────────────────────────

interface BatchListRow {
  id: string
  name: string
  mode: string
  doc_count: number
  backref_count: number
}

interface BatchReviewerNameRow {
  batch_id: string
  annotator_id: string
  name: string
}

interface BatchLabelRow {
  batch_id: string
  backref_id: string
  document_id: string
  annotator_id: string
  decision_type: "antecedent" | "abstain" | "ambiguous" | "flag"
  citation_id: string | null
  ambiguous_citation_ids: string[] | null
  agreed_with_engine: boolean
}

interface BatchLabeledRow {
  batch_id: string
  labeled: number
}

// ── Helper: compute BatchSummary stats from fetched rows ──────────────────

function computeBatchSummary(
  batch: BatchListRow,
  reviewerRows: BatchReviewerNameRow[],
  labelRows: BatchLabelRow[],
  labeledCount: number,
): BatchSummary {
  const reviewers = reviewerRows.map((r) => r.name)

  const backrefCount = batch.backref_count
  const labeled = labeledCount

  // mix: counts over all labels by batch reviewers in batch's docs
  const mix = { confirm: 0, correct: 0, abstain: 0, ambiguous: 0, flag: 0 }
  for (const row of labelRows) {
    switch (row.decision_type) {
      case "antecedent":
        if (row.agreed_with_engine) {
          mix.confirm++
        } else {
          mix.correct++
        }
        break
      case "abstain":
        mix.abstain++
        break
      case "ambiguous":
        mix.ambiguous++
        break
      case "flag":
        mix.flag++
        break
    }
  }

  // kappa: only for exactly 2 reviewers; compute over backrefs BOTH labeled
  let kappa: number | null = null
  const reviewerIds = reviewerRows.map((r) => r.annotator_id)

  if (reviewerIds.length === 2) {
    const [revA, revB] = reviewerIds as [string, string]
    const aCategories = new Map<string, string>()
    const bCategories = new Map<string, string>()

    for (const row of labelRows) {
      const cat = canonicalCategory(decisionFromColumns(row))
      if (row.annotator_id === revA) {
        aCategories.set(row.backref_id, cat)
      } else if (row.annotator_id === revB) {
        bCategories.set(row.backref_id, cat)
      }
    }

    const pairs: Array<[string, string]> = []
    for (const [backrefId, catA] of aCategories) {
      const catB = bCategories.get(backrefId)
      if (catB !== undefined) {
        pairs.push([catA, catB])
      }
    }

    const { kappa: k } = cohenKappa(pairs)
    kappa = k
  }

  // disagreements: backrefs where ≥2 reviewers labeled AND ≥2 distinct canonical categories
  const backrefReviewerCats = new Map<string, Set<string>>()
  for (const row of labelRows) {
    const existing = backrefReviewerCats.get(row.backref_id)
    if (existing === undefined) {
      backrefReviewerCats.set(row.backref_id, new Set([canonicalCategory(decisionFromColumns(row))]))
    } else {
      existing.add(canonicalCategory(decisionFromColumns(row)))
    }
  }
  // Also track reviewer count per backref for disagreement check
  const backrefReviewerCount = new Map<string, number>()
  for (const row of labelRows) {
    const key = `${row.backref_id}:${row.annotator_id}`
    // We need distinct reviewers per backref — dedupe by reviewer
    backrefReviewerCount.set(key, 1)
  }
  // Count distinct reviewers per backref
  const backrefDistinctReviewers = new Map<string, Set<string>>()
  for (const row of labelRows) {
    const existing = backrefDistinctReviewers.get(row.backref_id)
    if (existing === undefined) {
      backrefDistinctReviewers.set(row.backref_id, new Set([row.annotator_id]))
    } else {
      existing.add(row.annotator_id)
    }
  }

  let disagreements = 0
  for (const [backrefId, cats] of backrefReviewerCats) {
    const reviewerCount = backrefDistinctReviewers.get(backrefId)?.size ?? 0
    if (reviewerCount >= 2 && cats.size >= 2) {
      disagreements++
    }
  }

  // flagged: distinct backrefs with ≥1 flag label
  const flaggedBackrefs = new Set<string>()
  for (const row of labelRows) {
    if (row.decision_type === "flag") {
      flaggedBackrefs.add(row.backref_id)
    }
  }
  const flagged = flaggedBackrefs.size

  // status
  let status: string
  if (labeled < backrefCount) {
    status = "active"
  } else if (batch.mode === "double" && disagreements > 0) {
    status = "needs-adjudication"
  } else {
    status = "complete"
  }

  return {
    id: batch.id,
    name: batch.name,
    mode: batch.mode as "single" | "double",
    docCount: batch.doc_count,
    backrefCount,
    labeled,
    reviewers,
    kappa,
    disagreements,
    flagged,
    status,
    mix,
  }
}

export function registerBatchRoutes(app: Hono, sql: postgres.Sql): void {
  // GET /batches — list all batches with BatchSummary, ordered by id
  app.get("/batches", async (c) => {
    // ── 1. Fetch all batches with doc_count and backref_count ──────────────
    const batchRows = (await sql`
      select
        b.id,
        b.name,
        b.mode,
        count(distinct bi.document_id)::int                         as doc_count,
        coalesce(count(distinct br.id), 0)::int                     as backref_count
      from batches b
      left join batch_items bi on bi.batch_id = b.id
      left join backrefs    br on br.document_id = bi.document_id
      group by b.id, b.name, b.mode
      order by b.id
    `) as unknown as BatchListRow[]

    if (batchRows.length === 0) {
      return c.json([] as BatchSummary[])
    }

    const batchIds = batchRows.map((r) => r.id)

    // ── 2. Fetch all reviewers for these batches (id + name) ───────────────
    const reviewerNameRows = (await sql`
      select br.batch_id, br.annotator_id, a.name
      from batch_reviewers br
      join annotators a on a.id = br.annotator_id
      where br.batch_id = any(${batchIds as string[]})
      order by br.batch_id, br.annotator_id
    `) as unknown as BatchReviewerNameRow[]

    // ── 3. Fetch all labels scoped to batch reviewers and batch docs ────────
    // Group label rows by batch_id for efficient per-batch processing.
    const allLabelRows = (await sql`
      select
        bi.batch_id,
        br.id          as backref_id,
        br.document_id,
        l.annotator_id,
        l.decision_type,
        l.citation_id,
        l.ambiguous_citation_ids,
        l.agreed_with_engine
      from batch_items bi
      join backrefs     br on br.document_id = bi.document_id
      join labels       l  on l.document_id  = br.document_id
                           and l.backref_id  = br.id
      join batch_reviewers brev on brev.batch_id    = bi.batch_id
                               and brev.annotator_id = l.annotator_id
      where bi.batch_id = any(${batchIds as string[]})
      order by bi.batch_id, br.id, l.annotator_id
    `) as unknown as BatchLabelRow[]

    // ── 4. Compute labeled count per batch (distinct backref_id with ≥1 label from batch reviewer) ──
    const labeledRows = (await sql`
      select bi.batch_id, count(distinct (bi.document_id, br.id))::int as labeled
      from batch_items bi
      join backrefs br on br.document_id = bi.document_id
      join labels   l  on l.document_id  = br.document_id
                       and l.backref_id  = br.id
      join batch_reviewers brev on brev.batch_id    = bi.batch_id
                               and brev.annotator_id = l.annotator_id
      where bi.batch_id = any(${batchIds as string[]})
      group by bi.batch_id
    `) as unknown as BatchLabeledRow[]

    // Index by batch_id for O(1) lookup
    const reviewersByBatch = new Map<string, BatchReviewerNameRow[]>()
    for (const row of reviewerNameRows) {
      const existing = reviewersByBatch.get(row.batch_id)
      if (existing === undefined) {
        reviewersByBatch.set(row.batch_id, [row])
      } else {
        existing.push(row)
      }
    }

    const labelsByBatch = new Map<string, BatchLabelRow[]>()
    for (const row of allLabelRows) {
      const existing = labelsByBatch.get(row.batch_id)
      if (existing === undefined) {
        labelsByBatch.set(row.batch_id, [row])
      } else {
        existing.push(row)
      }
    }

    const labeledByBatch = new Map<string, number>()
    for (const row of labeledRows) {
      labeledByBatch.set(row.batch_id, row.labeled)
    }

    // ── 5. Assemble BatchSummary for each batch ─────────────────────────────
    const summaries: BatchSummary[] = batchRows.map((batch) => {
      const batchReviewers = reviewersByBatch.get(batch.id) ?? []
      const batchLabels = labelsByBatch.get(batch.id) ?? []
      const labeledCount = labeledByBatch.get(batch.id) ?? 0
      return computeBatchSummary(batch, batchReviewers, batchLabels, labeledCount)
    })

    return c.json(summaries)
  })

  // GET /annotators — list all annotators ordered by id
  app.get("/annotators", async (c) => {
    const rows = (await sql`
      select id, name from annotators order by id
    `) as unknown as AnnotatorRow[]
    return c.json(rows)
  })

  // POST /annotators — upsert annotator
  app.post("/annotators", async (c) => {
    const body = (await c.req.json()) as CreateAnnotatorBody
    if (!body.id || typeof body.id !== "string" || body.id.trim() === "") {
      return c.json({ error: "id is required and must be a non-empty string" }, 400)
    }
    if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
      return c.json({ error: "name is required and must be a non-empty string" }, 400)
    }
    const id = body.id.trim()
    const name = body.name.trim()
    await sql`
      insert into annotators (id, name)
      values (${id}, ${name})
      on conflict (id) do update set name = excluded.name
    `
    return c.json({ id, name })
  })

  // POST /batches — create a batch with items and reviewers in a transaction
  app.post("/batches", async (c) => {
    const body = (await c.req.json()) as CreateBatchBody
    if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
      return c.json({ error: "name is required and must be a non-empty string" }, 400)
    }
    if (body.mode !== "single" && body.mode !== "double") {
      return c.json({ error: "mode must be 'single' or 'double'" }, 400)
    }
    const id: string = body.id && body.id.trim() !== "" ? body.id.trim() : crypto.randomUUID()
    const name = body.name.trim()
    const mode: "single" | "double" = body.mode
    const documentIds: string[] = Array.isArray(body.documentIds) ? body.documentIds : []
    const reviewers: string[] = Array.isArray(body.reviewers) ? body.reviewers : []

    try {
      await sql.begin(async (tx) => {
        await tx`
          insert into batches (id, name, mode)
          values (${id}, ${name}, ${mode})
        `
        for (const docId of documentIds) {
          await tx`
            insert into batch_items (batch_id, document_id)
            values (${id}, ${docId})
          `
        }
        for (const annotatorId of reviewers) {
          await tx`
            insert into batch_reviewers (batch_id, annotator_id)
            values (${id}, ${annotatorId})
          `
        }
      })
    } catch (err) {
      // FK violations (unknown doc or reviewer) → 400
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ error: `constraint violation: ${msg}` }, 400)
    }

    return c.json({ id, name, mode, documentIds, reviewers }, 201)
  })

  // GET /batches/:id — fetch batch with stats
  app.get("/batches/:id", async (c) => {
    const batchId = c.req.param("id")
    const [batch] = (await sql`
      select id, name, mode from batches where id = ${batchId}
    `) as unknown as BatchRow[]
    if (!batch) {
      return c.json({ error: "not found" }, 404)
    }

    const reviewerRows = (await sql`
      select annotator_id from batch_reviewers where batch_id = ${batchId} order by annotator_id
    `) as unknown as BatchReviewerRow[]

    const itemRows = (await sql`
      select document_id from batch_items where batch_id = ${batchId} order by document_id
    `) as unknown as BatchItemRow[]

    const documentIds = itemRows.map((r) => r.document_id)
    const reviewers = reviewerRows.map((r) => r.annotator_id)

    const [stats] = (await sql`
      select
        count(distinct br.id)::int as "backref_count",
        count(distinct l.id)::int as "labeled"
      from batch_items bi
      join backrefs br on br.document_id = bi.document_id
      left join labels l on l.document_id = br.document_id and l.backref_id = br.id
      where bi.batch_id = ${batchId}
    `) as unknown as BatchStatsRow[]

    const docCount = documentIds.length
    const backrefCount = stats?.backref_count ?? 0
    const labeled = stats?.labeled ?? 0

    return c.json({
      id: batch.id,
      name: batch.name,
      mode: batch.mode,
      reviewers,
      documentIds,
      docCount,
      backrefCount,
      labeled,
    })
  })
}
