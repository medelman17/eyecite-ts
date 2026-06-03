// apps/annotator/src/routes/agreement.ts
// GET /batches/:id/agreement — inter-annotator agreement (Cohen's κ) for a batch.
//
// Cohen's kappa is defined for exactly 2 reviewers.
// For batches with 1 or >2 reviewers we return a null kappa stub
// (Fleiss' kappa for >2 reviewers is out of scope for this implementation).
import { Hono } from "hono"
import type postgres from "postgres"
import { canonicalCategory, cohenKappa } from "../kappa.js"
import type { Label } from "../contract.js"

// ── Row types ─────────────────────────────────────────────────────────────────

interface BatchExistsRow {
  id: string
}

interface BatchReviewerRow {
  annotator_id: string
}

interface LabelRow {
  backref_id: string
  annotator_id: string
  decision_type: "antecedent" | "abstain" | "ambiguous" | "flag"
  citation_id: string | null
  ambiguous_citation_ids: string[] | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Reconstruct a Label decision from a DB row (mirrors rowToLabel in labels.ts). */
function rowToDecision(row: LabelRow): Label["decision"] {
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

// ── Route registration ────────────────────────────────────────────────────────

export function registerAgreementRoutes(app: Hono, sql: postgres.Sql): void {
  // GET /batches/:id/agreement
  // Returns Cohen's κ over the backrefs that BOTH reviewers labeled.
  // Only meaningful for exactly 2 reviewers; returns a null-kappa stub otherwise.
  app.get("/batches/:id/agreement", async (c) => {
    const batchId = c.req.param("id")

    // Verify batch exists
    const [batch] = (await sql`
      select id from batches where id = ${batchId}
    `) as unknown as BatchExistsRow[]
    if (!batch) {
      return c.json({ error: "not found" }, 404)
    }

    // Get this batch's reviewers
    const reviewerRows = (await sql`
      select annotator_id
      from batch_reviewers
      where batch_id = ${batchId}
      order by annotator_id
    `) as unknown as BatchReviewerRow[]

    const reviewers = reviewerRows.map((r) => r.annotator_id)

    // Fetch all labels for backrefs belonging to this batch's documents, by the batch's reviewers.
    // We join batch_items → backrefs to scope to the batch's documents.
    const labelRows = (await sql`
      select
        l.backref_id,
        l.annotator_id,
        l.decision_type,
        l.citation_id,
        l.ambiguous_citation_ids
      from labels l
      join backrefs br on br.id = l.backref_id and br.document_id = l.document_id
      join batch_items bi on bi.document_id = l.document_id and bi.batch_id = ${batchId}
      where l.annotator_id = any(${reviewers as string[]})
      order by l.backref_id, l.annotator_id
    `) as unknown as LabelRow[]

    // Build per-reviewer labeled counts
    const perReviewerLabeled: Record<string, number> = {}
    for (const rev of reviewers) {
      perReviewerLabeled[rev] = 0
    }
    for (const row of labelRows) {
      if (perReviewerLabeled[row.annotator_id] !== undefined) {
        perReviewerLabeled[row.annotator_id]++
      }
    }

    // Cohen's kappa is only defined for exactly 2 reviewers.
    // For != 2 reviewers return a null-kappa stub.
    if (reviewers.length !== 2) {
      return c.json({
        kappa: null,
        po: 0,
        pe: 0,
        sharedItems: 0,
        reviewers,
        perReviewerLabeled,
      })
    }

    const [revA, revB] = reviewers as [string, string]

    // Group labels by backref_id → map to categories
    const aCategories = new Map<string, string>()
    const bCategories = new Map<string, string>()

    for (const row of labelRows) {
      const cat = canonicalCategory(rowToDecision(row))
      if (row.annotator_id === revA) {
        aCategories.set(row.backref_id, cat)
      } else if (row.annotator_id === revB) {
        bCategories.set(row.backref_id, cat)
      }
    }

    // Build aligned pairs over backrefs that BOTH reviewers labeled
    const pairs: Array<[string, string]> = []
    for (const [backrefId, catA] of aCategories) {
      const catB = bCategories.get(backrefId)
      if (catB !== undefined) {
        pairs.push([catA, catB])
      }
    }

    const { kappa, po, pe } = cohenKappa(pairs)

    return c.json({
      kappa,
      po,
      pe,
      sharedItems: pairs.length,
      reviewers,
      perReviewerLabeled,
    })
  })
}
