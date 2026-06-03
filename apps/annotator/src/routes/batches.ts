// apps/annotator/src/routes/batches.ts
import { Hono } from "hono"
import type postgres from "postgres"

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

export function registerBatchRoutes(app: Hono, sql: postgres.Sql): void {
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
