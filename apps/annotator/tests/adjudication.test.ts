// apps/annotator/tests/adjudication.test.ts
// Integration tests for adjudication queue + gold decisions + NDJSON export.
import { afterAll, beforeAll, expect, it } from "vitest"
import { makeSql } from "../src/db.js"
import { migrate } from "../src/migrate.js"
import { upsertDocumentPayload } from "../src/persist.js"
import { buildDocumentPayload } from "../src/prefill.js"
import { makeApp } from "../src/server.js"
import type { AdjudicationItem, GoldDecision, Label } from "../src/contract.js"

const sql = makeSql()
const app = makeApp(sql)

// Seed text: 1 full + 3 Id. back-references → 3 backrefs
const SEED_TEXT = "Smith v. Jones, 1 U.S. 1 (1990). Id. at 5. Id. at 7. Id. at 9."

let br1: string // backref1 — both agree (antecedent:c0) → excluded from queue
let br2: string // backref2 — j1=antecedent:c0, j2=abstain → disagreement
let br3: string // backref3 — j1=flag → flag
let fullCitationId: string

beforeAll(async () => {
  await migrate(sql)

  const adocPayload = buildDocumentPayload(SEED_TEXT, {
    id: "adoc",
    source: "native",
    court: "scotus",
    year: 1990,
  })

  if (adocPayload.backrefs.length < 3) {
    throw new Error(
      `Expected >= 3 backrefs from seed text, got ${adocPayload.backrefs.length}`,
    )
  }

  const sorted = [...adocPayload.backrefs].sort((a, b) => a.span[0] - b.span[0])
  br1 = sorted[0].id
  br2 = sorted[1].id
  br3 = sorted[2].id
  fullCitationId = adocPayload.citations.find((c) => c.kind === "full")!.id

  await upsertDocumentPayload(sql, adocPayload)

  // Create annotators j1 and j2
  for (const [id, name] of [["j1", "Judge One"], ["j2", "Judge Two"]] as const) {
    await app.request("/annotators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name }),
    })
  }

  // Create double batch jb over adoc with both reviewers
  await app.request("/batches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: "jb",
      name: "Adjudication Test Batch",
      mode: "double",
      documentIds: ["adoc"],
      reviewers: ["j1", "j2"],
    }),
  })

  const postLabel = async (label: Omit<Label, "createdAt">) => {
    const res = await app.request("/labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(label),
    })
    if (res.status !== 200) {
      throw new Error(`Failed to insert label: ${await res.text()}`)
    }
  }

  // backref1 — AGREE: both antecedent:fullCitationId
  await postLabel({ documentId: "adoc", backrefId: br1, annotatorId: "j1", decision: { type: "antecedent", citationId: fullCitationId }, agreedWithEngine: true })
  await postLabel({ documentId: "adoc", backrefId: br1, annotatorId: "j2", decision: { type: "antecedent", citationId: fullCitationId }, agreedWithEngine: true })

  // backref2 — DISAGREE: j1=antecedent:fullCitationId, j2=abstain
  await postLabel({ documentId: "adoc", backrefId: br2, annotatorId: "j1", decision: { type: "antecedent", citationId: fullCitationId }, agreedWithEngine: true })
  await postLabel({ documentId: "adoc", backrefId: br2, annotatorId: "j2", decision: { type: "abstain" }, agreedWithEngine: false })

  // backref3 — FLAG: j1=flag (j2 has not labeled this one)
  await postLabel({ documentId: "adoc", backrefId: br3, annotatorId: "j1", decision: { type: "flag" }, agreedWithEngine: false })
})

afterAll(async () => {
  await sql`delete from gold where document_id = 'adoc'`
  await sql`delete from labels where annotator_id in ('j1', 'j2')`
  await sql`delete from batches where id = 'jb'`
  await sql`delete from annotators where id in ('j1', 'j2')`
  await sql`delete from documents where id = 'adoc'`
  await sql.end()
})

// ── GET /batches/:id/adjudication ─────────────────────────────────────────────

it("GET /batches/jb/adjudication → 200, returns br2 (disagreement) and br3 (flag), NOT br1", async () => {
  const res = await app.request("/batches/jb/adjudication")
  expect(res.status).toBe(200)
  const items = (await res.json()) as AdjudicationItem[]

  // br1 is agreed → excluded
  expect(items.find((i) => i.backrefId === br1)).toBeUndefined()

  // br2 is a disagreement item
  const item2 = items.find((i) => i.backrefId === br2)
  expect(item2).toBeDefined()
  expect(item2!.reason).toBe("disagreement")
  expect(item2!.documentId).toBe("adoc")
  expect(item2!.id).toBe(`adoc:${br2}`)
  expect(item2!.reviewers).toHaveLength(2)
  const j1review = item2!.reviewers.find((r) => r.annotatorId === "j1")
  const j2review = item2!.reviewers.find((r) => r.annotatorId === "j2")
  expect(j1review).toBeDefined()
  expect(j2review).toBeDefined()
  expect(j1review!.decision.type).toBe("antecedent")
  expect(j2review!.decision.type).toBe("abstain")
  expect(item2!.gold).toBeNull()
  // engineGuess should be present (may be string or null based on engine)
  expect("engineGuess" in item2!).toBe(true)

  // br3 is a flag item
  const item3 = items.find((i) => i.backrefId === br3)
  expect(item3).toBeDefined()
  expect(item3!.reason).toBe("flag")
  expect(item3!.reviewers).toHaveLength(1)
  expect(item3!.reviewers[0].annotatorId).toBe("j1")
  expect(item3!.reviewers[0].decision.type).toBe("flag")
  expect(item3!.gold).toBeNull()
})

it("GET /batches/jb/adjudication → items ordered by documentId then span_start", async () => {
  const res = await app.request("/batches/jb/adjudication")
  expect(res.status).toBe(200)
  const items = (await res.json()) as AdjudicationItem[]
  // All items belong to adoc; span_start of br2 < br3
  expect(items.length).toBeGreaterThanOrEqual(2)
  const docIds = items.map((i) => i.documentId)
  const sorted = [...docIds].sort()
  expect(docIds).toEqual(sorted) // sorted by documentId
})

it("GET /batches/unknown-batch/adjudication → 404", async () => {
  const res = await app.request("/batches/unknown-batch/adjudication")
  expect(res.status).toBe(404)
})

// ── POST /gold ────────────────────────────────────────────────────────────────

it("POST /gold for br2 → 200, returns GoldDecision", async () => {
  const res = await app.request("/gold", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      documentId: "adoc",
      backrefId: br2,
      type: "antecedent",
      citationId: fullCitationId,
      rationale: "The Id. clearly refers to the prior Smith v. Jones.",
      by: "lead",
    }),
  })
  expect(res.status).toBe(200)
  const gold = (await res.json()) as GoldDecision
  expect(gold.type).toBe("antecedent")
  expect(gold.citationId).toBe(fullCitationId)
  expect(gold.rationale).toBe("The Id. clearly refers to the prior Smith v. Jones.")
  expect(gold.by).toBe("lead")
  expect(typeof gold.at).toBe("string")
  expect(gold.at.length).toBeGreaterThan(0)
})

it("GET /gold/adoc/:br2 → 200, returns stored GoldDecision", async () => {
  const res = await app.request(`/gold/adoc/${br2}`)
  expect(res.status).toBe(200)
  const gold = (await res.json()) as GoldDecision
  expect(gold.type).toBe("antecedent")
  expect(gold.citationId).toBe(fullCitationId)
  expect(gold.by).toBe("lead")
})

it("GET /batches/jb/adjudication → br2 item now has gold populated", async () => {
  const res = await app.request("/batches/jb/adjudication")
  expect(res.status).toBe(200)
  const items = (await res.json()) as AdjudicationItem[]
  const item2 = items.find((i) => i.backrefId === br2)
  expect(item2).toBeDefined()
  expect(item2!.gold).not.toBeNull()
  expect(item2!.gold!.type).toBe("antecedent")
  expect(item2!.gold!.by).toBe("lead")
})

it("POST /gold invalid: antecedent without citationId → 400", async () => {
  const res = await app.request("/gold", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      documentId: "adoc",
      backrefId: br3,
      type: "antecedent",
      by: "lead",
    }),
  })
  expect(res.status).toBe(400)
})

it("POST /gold invalid: by empty string → 400", async () => {
  const res = await app.request("/gold", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      documentId: "adoc",
      backrefId: br3,
      type: "abstain",
      by: "",
    }),
  })
  expect(res.status).toBe(400)
})

it("POST /gold invalid: ambiguous with 1 citationId → 400", async () => {
  const res = await app.request("/gold", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      documentId: "adoc",
      backrefId: br3,
      type: "ambiguous",
      citationIds: [fullCitationId],
      by: "lead",
    }),
  })
  expect(res.status).toBe(400)
})

it("GET /gold/adoc/unknown-backref → 404", async () => {
  const res = await app.request("/gold/adoc/unknown-backref-xyz")
  expect(res.status).toBe(404)
})

// ── GET /batches/:id/export ───────────────────────────────────────────────────

it("GET /batches/jb/export → 200 ndjson, exactly 1 line (br2 gold)", async () => {
  const res = await app.request("/batches/jb/export")
  expect(res.status).toBe(200)
  const ct = res.headers.get("content-type") ?? ""
  expect(ct).toContain("ndjson")

  const text = await res.text()
  // Trim trailing newline before splitting
  const lines = text.trim().length === 0 ? [] : text.trim().split("\n")
  expect(lines).toHaveLength(1)

  const row = JSON.parse(lines[0]) as {
    documentId: string
    backrefId: string
    gold: GoldDecision
    candidates: unknown[]
    backrefText: string
    court: string | null
    source: string
    kind: string
  }
  expect(row.documentId).toBe("adoc")
  expect(row.backrefId).toBe(br2)
  expect(row.gold.type).toBe("antecedent")
  expect(Array.isArray(row.candidates)).toBe(true)
  expect(typeof row.backrefText).toBe("string")
  expect(row.backrefText.length).toBeGreaterThan(0)
  expect(row.court).toBe("scotus")
  expect(row.source).toBe("native")
})

it("GET /batches/unknown-batch/export → 404", async () => {
  const res = await app.request("/batches/unknown-batch/export")
  expect(res.status).toBe(404)
})
