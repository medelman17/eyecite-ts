// apps/annotator/src/routes/adjudication.ts
// Endpoints: adjudication queue, gold decisions, NDJSON gold export.
import { Hono } from "hono"
import type postgres from "postgres"
import type { AdjudicationItem, GoldDecision, Label, ReviewerLabelRef } from "../contract.js"
import { canonicalCategory } from "../kappa.js"

// ── Row types ──────────────────────────────────────────────────────────────────

interface BatchExistsRow {
  id: string
}

interface BackrefQueueRow {
  document_id: string
  backref_id: string
  span_start: number
  engine_guess: string | null
  annotator_id: string
  decision_type: "antecedent" | "abstain" | "ambiguous" | "flag"
  citation_id: string | null
  ambiguous_citation_ids: string[] | null
  agreed_with_engine: boolean
  note: string | null
}

interface GoldRow {
  document_id: string
  backref_id: string
  type: "antecedent" | "abstain" | "ambiguous" | "none"
  citation_id: string | null
  ambiguous_citation_ids: string[] | null
  rationale: string | null
  decided_by: string | null
  decided_at: Date
}

interface ExportBackrefRow {
  document_id: string
  backref_id: string
  span_start: number
  span_end: number
  engine_guess: string | null
  candidates: unknown[]
  kind: string
  // document fields
  text: string
  source: string
  court: string | null
  year: number | null
  // gold fields
  gold_type: "antecedent" | "abstain" | "ambiguous" | "none"
  gold_citation_id: string | null
  gold_ambiguous_citation_ids: string[] | null
  gold_rationale: string | null
  gold_decided_by: string | null
  gold_decided_at: Date
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Reconstruct a Label["decision"] from DB columns (mirrors agreement.ts rowToDecision). */
function decisionFromRow(row: {
  decision_type: "antecedent" | "abstain" | "ambiguous" | "flag"
  citation_id: string | null
  ambiguous_citation_ids: string[] | null
}): Label["decision"] {
  switch (row.decision_type) {
    case "antecedent":
      return { type: "antecedent", citationId: row.citation_id ?? "" }
    case "ambiguous":
      return { type: "ambiguous", citationIds: row.ambiguous_citation_ids ?? [] }
    case "abstain":
      return { type: "abstain" }
    case "flag":
      return { type: "flag" }
  }
}

/** Map a GoldRow to a GoldDecision. */
function goldRowToDecision(row: GoldRow): GoldDecision {
  const gold: GoldDecision = {
    type: row.type,
    by: row.decided_by ?? "",
    at: row.decided_at instanceof Date ? row.decided_at.toISOString() : String(row.decided_at),
  }
  if (row.citation_id !== null) gold.citationId = row.citation_id
  if (row.ambiguous_citation_ids !== null) gold.citationIds = row.ambiguous_citation_ids
  if (row.rationale !== null) gold.rationale = row.rationale
  return gold
}

// ── Route registration ────────────────────────────────────────────────────────

export function registerAdjudicationRoutes(app: Hono, sql: postgres.Sql): void {
  // GET /batches/:id/adjudication
  // Returns AdjudicationItem[] for backrefs that need human adjudication:
  //   - "disagreement": ≥2 reviewers with ≥2 distinct canonicalCategory values
  //   - "flag": any reviewer's decision is "flag"
  app.get("/batches/:id/adjudication", async (c) => {
    const batchId = c.req.param("id")

    const [batch] = (await sql`
      select id from batches where id = ${batchId}
    `) as unknown as BatchExistsRow[]
    if (!batch) {
      return c.json({ error: "not found" }, 404)
    }

    // Fetch all label rows for backrefs in this batch's documents, ordered for grouping
    const labelRows = (await sql`
      select
        br.document_id,
        br.id          as backref_id,
        br.span_start,
        br.engine_guess,
        l.annotator_id,
        l.decision_type,
        l.citation_id,
        l.ambiguous_citation_ids,
        l.agreed_with_engine,
        l.note
      from batch_items bi
      join backrefs br on br.document_id = bi.document_id
      join labels   l  on l.document_id  = br.document_id
                       and l.backref_id  = br.id
      where bi.batch_id = ${batchId}
      order by br.document_id, br.span_start, l.annotator_id
    `) as unknown as BackrefQueueRow[]

    // Fetch existing gold decisions for this batch's documents
    const goldRows = (await sql`
      select g.*
      from gold g
      join batch_items bi on bi.document_id = g.document_id
      where bi.batch_id = ${batchId}
    `) as unknown as GoldRow[]

    const goldMap = new Map<string, GoldDecision>()
    for (const row of goldRows) {
      goldMap.set(`${row.document_id}:${row.backref_id}`, goldRowToDecision(row))
    }

    // Group rows by (documentId, backrefId)
    type GroupKey = string
    interface Group {
      documentId: string
      backrefId: string
      spanStart: number
      engineGuess: string | null
      reviewers: ReviewerLabelRef[]
    }
    const groups = new Map<GroupKey, Group>()

    for (const row of labelRows) {
      const key = `${row.document_id}:${row.backref_id}`
      if (!groups.has(key)) {
        groups.set(key, {
          documentId: row.document_id,
          backrefId: row.backref_id,
          spanStart: row.span_start,
          engineGuess: row.engine_guess,
          reviewers: [],
        })
      }
      const group = groups.get(key)!
      const ref: ReviewerLabelRef = {
        annotatorId: row.annotator_id,
        decision: decisionFromRow(row),
        agreedWithEngine: row.agreed_with_engine,
      }
      if (row.note !== null) ref.note = row.note
      group.reviewers.push(ref)
    }

    // Filter and classify groups into adjudication items
    const items: AdjudicationItem[] = []

    for (const [key, group] of groups) {
      const { reviewers } = group

      // Determine reason
      const hasFlag = reviewers.some((r) => r.decision.type === "flag")
      const categories = new Set(reviewers.map((r) => canonicalCategory(r.decision)))
      const hasDisagreement = reviewers.length >= 2 && categories.size >= 2

      if (!hasFlag && !hasDisagreement) continue // agreement, no flag → skip

      const reason: "disagreement" | "flag" = hasDisagreement ? "disagreement" : "flag"

      items.push({
        id: key,
        documentId: group.documentId,
        backrefId: group.backrefId,
        reason,
        reviewers,
        engineGuess: group.engineGuess,
        gold: goldMap.get(key) ?? null,
      })
    }

    // Sort by documentId, then span_start
    items.sort((a, b) => {
      if (a.documentId < b.documentId) return -1
      if (a.documentId > b.documentId) return 1
      const aGroup = groups.get(a.id)!
      const bGroup = groups.get(b.id)!
      return aGroup.spanStart - bGroup.spanStart
    })

    return c.json(items)
  })

  // GET /gold/:documentId/:backrefId
  app.get("/gold/:documentId/:backrefId", async (c) => {
    const documentId = c.req.param("documentId")
    const backrefId = c.req.param("backrefId")

    const [row] = (await sql`
      select * from gold
      where document_id = ${documentId}
        and backref_id  = ${backrefId}
    `) as unknown as GoldRow[]

    if (!row) return c.json({ error: "not found" }, 404)
    return c.json(goldRowToDecision(row))
  })

  // POST /gold — upsert a gold decision
  app.post("/gold", async (c) => {
    const body = (await c.req.json()) as Record<string, unknown>

    const documentId = typeof body.documentId === "string" ? body.documentId.trim() : ""
    const backrefId = typeof body.backrefId === "string" ? body.backrefId.trim() : ""
    const type = body.type
    const by = typeof body.by === "string" ? body.by.trim() : ""

    // Validate required fields
    if (!documentId) return c.json({ error: "documentId is required" }, 400)
    if (!backrefId) return c.json({ error: "backrefId is required" }, 400)
    if (!by) return c.json({ error: "by is required and must be non-empty" }, 400)

    if (type !== "antecedent" && type !== "abstain" && type !== "ambiguous" && type !== "none") {
      return c.json({ error: "type must be one of antecedent, abstain, ambiguous, none" }, 400)
    }

    let citationId: string | null = null
    let ambiguousCitationIds: postgres.JSONValue | null = null

    if (type === "antecedent") {
      if (!body.citationId || typeof body.citationId !== "string" || (body.citationId as string).trim() === "") {
        return c.json({ error: "citationId is required for type antecedent" }, 400)
      }
      citationId = (body.citationId as string).trim()
    } else if (type === "ambiguous") {
      const ids = body.citationIds
      if (!Array.isArray(ids) || ids.length < 2) {
        return c.json({ error: "citationIds must be an array with at least 2 elements for type ambiguous" }, 400)
      }
      ambiguousCitationIds = ids as postgres.JSONValue
    }

    const rationale = typeof body.rationale === "string" ? body.rationale : null

    try {
      await sql`
        insert into gold (document_id, backref_id, type, citation_id, ambiguous_citation_ids, rationale, decided_by, decided_at)
        values (
          ${documentId},
          ${backrefId},
          ${type},
          ${citationId},
          ${ambiguousCitationIds !== null ? sql.json(ambiguousCitationIds) : null},
          ${rationale},
          ${by},
          now()
        )
        on conflict (document_id, backref_id) do update set
          type                   = excluded.type,
          citation_id            = excluded.citation_id,
          ambiguous_citation_ids = excluded.ambiguous_citation_ids,
          rationale              = excluded.rationale,
          decided_by             = excluded.decided_by,
          decided_at             = excluded.decided_at
      `
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ error: `constraint violation: ${msg}` }, 400)
    }

    // Read back the stored row
    const [row] = (await sql`
      select * from gold
      where document_id = ${documentId}
        and backref_id  = ${backrefId}
    `) as unknown as GoldRow[]

    return c.json(goldRowToDecision(row))
  })

  // GET /batches/:id/export
  // Returns NDJSON — one line per backref in the batch that has a gold row.
  app.get("/batches/:id/export", async (c) => {
    const batchId = c.req.param("id")

    const [batch] = (await sql`
      select id from batches where id = ${batchId}
    `) as unknown as BatchExistsRow[]
    if (!batch) {
      return c.json({ error: "not found" }, 404)
    }

    // Fetch all backrefs in this batch that have gold rows, with document info joined.
    const rows = (await sql`
      select
        br.document_id,
        br.id          as backref_id,
        br.span_start,
        br.span_end,
        br.engine_guess,
        br.candidates,
        br.kind,
        d.text,
        d.source,
        d.court,
        d.year,
        g.type            as gold_type,
        g.citation_id     as gold_citation_id,
        g.ambiguous_citation_ids as gold_ambiguous_citation_ids,
        g.rationale       as gold_rationale,
        g.decided_by      as gold_decided_by,
        g.decided_at      as gold_decided_at
      from batch_items bi
      join backrefs br on br.document_id = bi.document_id
      join documents d  on d.id          = br.document_id
      join gold     g   on g.document_id = br.document_id
                       and g.backref_id  = br.id
      where bi.batch_id = ${batchId}
      order by br.document_id, br.span_start
    `) as unknown as ExportBackrefRow[]

    if (rows.length === 0) {
      return new Response("", {
        status: 200,
        headers: { "Content-Type": "application/x-ndjson" },
      })
    }

    const lines = rows.map((row) => {
      const goldRow: GoldRow = {
        document_id: row.document_id,
        backref_id: row.backref_id,
        type: row.gold_type,
        citation_id: row.gold_citation_id,
        ambiguous_citation_ids: row.gold_ambiguous_citation_ids,
        rationale: row.gold_rationale,
        decided_by: row.gold_decided_by,
        decided_at: row.gold_decided_at,
      }
      return JSON.stringify({
        documentId: row.document_id,
        backrefId: row.backref_id,
        kind: row.kind,
        backrefText: row.text.slice(row.span_start, row.span_end),
        engineGuess: row.engine_guess,
        gold: goldRowToDecision(goldRow),
        candidates: row.candidates,
        court: row.court,
        year: row.year,
        source: row.source,
      })
    })

    return new Response(lines.join("\n"), {
      status: 200,
      headers: { "Content-Type": "application/x-ndjson" },
    })
  })
}
