// apps/annotator/src/routes/labels.ts
import { Hono } from "hono"
import type postgres from "postgres"
import type { Label } from "../contract.js"
import { getDocumentPayload } from "../persist.js"
import type { DocumentPayload, NextItem } from "../contract.js"

// ── Row types ─────────────────────────────────────────────────────────────────

interface LabelRow {
  id: string
  document_id: string
  backref_id: string
  annotator_id: string
  decision_type: "antecedent" | "abstain" | "ambiguous" | "flag"
  citation_id: string | null
  ambiguous_citation_ids: string[] | null
  agreed_with_engine: boolean
  note: string | null
  created_at: Date
}

interface BatchRow {
  id: string
}

interface BackrefNextRow {
  document_id: string
  backref_id: string
  span_start: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Reconstruct a Label from a DB row. */
function rowToLabel(row: LabelRow): Label {
  let decision: Label["decision"]
  switch (row.decision_type) {
    case "antecedent":
      decision = { type: "antecedent", citationId: row.citation_id ?? "" }
      break
    case "ambiguous":
      decision = { type: "ambiguous", citationIds: row.ambiguous_citation_ids ?? [] }
      break
    case "abstain":
      decision = { type: "abstain" }
      break
    case "flag":
      decision = { type: "flag" }
      break
  }
  const label: Label = {
    documentId: row.document_id,
    backrefId: row.backref_id,
    annotatorId: row.annotator_id,
    decision,
    agreedWithEngine: row.agreed_with_engine,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  }
  if (row.note !== null) {
    label.note = row.note
  }
  return label
}

// ── Route registration ────────────────────────────────────────────────────────

export function registerLabelRoutes(app: Hono, sql: postgres.Sql): void {
  // POST /labels — upsert a label
  app.post("/labels", async (c) => {
    const body = (await c.req.json()) as Record<string, unknown>

    // Required field validation
    if (!body.documentId || typeof body.documentId !== "string" || body.documentId.trim() === "") {
      return c.json({ error: "documentId is required and must be a non-empty string" }, 400)
    }
    if (!body.backrefId || typeof body.backrefId !== "string" || body.backrefId.trim() === "") {
      return c.json({ error: "backrefId is required and must be a non-empty string" }, 400)
    }
    if (!body.annotatorId || typeof body.annotatorId !== "string" || body.annotatorId.trim() === "") {
      return c.json({ error: "annotatorId is required and must be a non-empty string" }, 400)
    }

    const documentId = body.documentId.trim()
    const backrefId = body.backrefId.trim()
    const annotatorId = body.annotatorId.trim()
    const agreedWithEngine = Boolean(body.agreedWithEngine)
    const note = typeof body.note === "string" ? body.note : null

    // Decision validation
    const decision = body.decision as Record<string, unknown> | undefined
    if (!decision || typeof decision !== "object") {
      return c.json({ error: "decision is required" }, 400)
    }
    const decisionType = decision.type
    if (
      decisionType !== "antecedent" &&
      decisionType !== "abstain" &&
      decisionType !== "ambiguous" &&
      decisionType !== "flag"
    ) {
      return c.json(
        { error: `unknown decision type: ${String(decisionType)}; must be one of antecedent, abstain, ambiguous, flag` },
        400,
      )
    }

    let citationId: string | null = null
    let ambiguousCitationIds: postgres.JSONValue | null = null

    if (decisionType === "antecedent") {
      if (!decision.citationId || typeof decision.citationId !== "string") {
        return c.json({ error: "decision.citationId is required for antecedent decisions" }, 400)
      }
      citationId = decision.citationId
    } else if (decisionType === "ambiguous") {
      const ids = decision.citationIds
      if (!Array.isArray(ids) || ids.length < 2) {
        return c.json(
          { error: "decision.citationIds must be an array with at least 2 elements for ambiguous decisions" },
          400,
        )
      }
      ambiguousCitationIds = ids as postgres.JSONValue
    }

    try {
      await sql`
        insert into labels (document_id, backref_id, annotator_id, decision_type, citation_id, ambiguous_citation_ids, agreed_with_engine, note)
        values (
          ${documentId},
          ${backrefId},
          ${annotatorId},
          ${decisionType},
          ${citationId},
          ${ambiguousCitationIds !== null ? sql.json(ambiguousCitationIds) : null},
          ${agreedWithEngine},
          ${note}
        )
        on conflict (document_id, backref_id, annotator_id) do update set
          decision_type = excluded.decision_type,
          citation_id = excluded.citation_id,
          ambiguous_citation_ids = excluded.ambiguous_citation_ids,
          agreed_with_engine = excluded.agreed_with_engine,
          note = excluded.note
      `
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ error: `constraint violation: ${msg}` }, 400)
    }

    // Read back the stored row
    const [row] = (await sql`
      select id, document_id, backref_id, annotator_id, decision_type,
             citation_id, ambiguous_citation_ids, agreed_with_engine, note, created_at
      from labels
      where document_id = ${documentId}
        and backref_id = ${backrefId}
        and annotator_id = ${annotatorId}
    `) as unknown as LabelRow[]

    return c.json(rowToLabel(row))
  })

  // GET /documents/:id/labels?annotator= — get labels for a document
  app.get("/documents/:id/labels", async (c) => {
    const documentId = c.req.param("id")
    const annotator = c.req.query("annotator")

    let rows: LabelRow[]
    if (annotator) {
      rows = (await sql`
        select id, document_id, backref_id, annotator_id, decision_type,
               citation_id, ambiguous_citation_ids, agreed_with_engine, note, created_at
        from labels
        where document_id = ${documentId}
          and annotator_id = ${annotator}
        order by backref_id
      `) as unknown as LabelRow[]
    } else {
      rows = (await sql`
        select id, document_id, backref_id, annotator_id, decision_type,
               citation_id, ambiguous_citation_ids, agreed_with_engine, note, created_at
        from labels
        where document_id = ${documentId}
        order by backref_id
      `) as unknown as LabelRow[]
    }

    return c.json(rows.map(rowToLabel))
  })

  // GET /batches/:id/documents — all documents in a batch as DocumentPayload[]
  app.get("/batches/:id/documents", async (c) => {
    const batchId = c.req.param("id")

    // Verify batch exists
    const [batch] = (await sql`
      select id from batches where id = ${batchId}
    `) as unknown as BatchRow[]
    if (!batch) {
      return c.json({ error: "not found" }, 404)
    }

    interface BatchItemRow {
      document_id: string
    }
    const items = (await sql`
      select document_id from batch_items where batch_id = ${batchId} order by document_id
    `) as unknown as BatchItemRow[]

    const payloads: DocumentPayload[] = []
    for (const item of items) {
      const payload = await getDocumentPayload(sql, item.document_id)
      if (payload) {
        payloads.push(payload)
      }
    }

    return c.json(payloads)
  })

  // GET /batches/:id/next?annotator= — first unlabeled backref in reading order
  app.get("/batches/:id/next", async (c) => {
    const batchId = c.req.param("id")
    const annotator = c.req.query("annotator")

    if (!annotator || annotator.trim() === "") {
      return c.json({ error: "annotator query parameter is required" }, 400)
    }

    // Verify batch exists
    const [batch] = (await sql`
      select id from batches where id = ${batchId}
    `) as unknown as BatchRow[]
    if (!batch) {
      return c.json({ error: "not found" }, 404)
    }

    // Find the first backref (in reading order: document_id, span_start) that has no label from this annotator
    const rows = (await sql`
      select br.document_id, br.id as backref_id, br.span_start
      from batch_items bi
      join backrefs br on br.document_id = bi.document_id
      left join labels l on l.document_id = br.document_id
        and l.backref_id = br.id
        and l.annotator_id = ${annotator.trim()}
      where bi.batch_id = ${batchId}
        and l.id is null
      order by br.document_id, br.span_start
      limit 1
    `) as unknown as BackrefNextRow[]

    if (rows.length === 0) {
      return c.json(null)
    }

    const { document_id, backref_id } = rows[0]
    const document = await getDocumentPayload(sql, document_id)
    if (!document) {
      return c.json(null)
    }

    const backref = document.backrefs.find((b) => b.id === backref_id)
    if (!backref) {
      return c.json(null)
    }

    const item: NextItem = { document, backref }
    return c.json(item)
  })
}
