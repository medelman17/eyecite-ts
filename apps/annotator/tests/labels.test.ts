// apps/annotator/tests/labels.test.ts
import { afterAll, beforeAll, expect, it } from "vitest"
import { makeSql } from "../src/db.js"
import { migrate } from "../src/migrate.js"
import { upsertDocumentPayload } from "../src/persist.js"
import { buildDocumentPayload } from "../src/prefill.js"
import { makeApp } from "../src/server.js"
import type { DocumentPayload, Label, NextItem } from "../src/contract.js"

const sql = makeSql()
const app = makeApp(sql)

// Seed text yields 2 backrefs: c1 (first Id.) and c2 (second Id.)
// Verified: buildDocumentPayload produces c0(full), c1(id), c2(id)
const SEED_TEXT = "Smith v. Jones, 1 U.S. 1 (1990). Id. at 5. Id. at 7."

let ldocPayload: DocumentPayload
let firstBackrefId: string
let secondBackrefId: string
// citationId for the full citation (c0)
let fullCitationId: string

beforeAll(async () => {
  await migrate(sql)
  ldocPayload = buildDocumentPayload(SEED_TEXT, {
    id: "ldoc",
    source: "native",
    court: null,
    year: 1990,
  })
  // Verify we have at least 2 backrefs for the "next" tests
  if (ldocPayload.backrefs.length < 2) {
    throw new Error(
      `Expected >= 2 backrefs from seed text, got ${ldocPayload.backrefs.length}`,
    )
  }
  // Sort by span_start to get reading order
  const sorted = [...ldocPayload.backrefs].sort((a, b) => a.span[0] - b.span[0])
  firstBackrefId = sorted[0].id
  secondBackrefId = sorted[1].id
  fullCitationId = ldocPayload.citations.find((c) => c.kind === "full")!.id

  await upsertDocumentPayload(sql, ldocPayload)

  // Insert annotator aL
  await app.request("/annotators", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "aL", name: "Label Tester" }),
  })

  // Create batch bL with document ldoc and reviewer aL
  await app.request("/batches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: "bL",
      name: "Label Test Batch",
      mode: "single",
      documentIds: ["ldoc"],
      reviewers: ["aL"],
    }),
  })
})

afterAll(async () => {
  await sql`delete from labels where annotator_id = 'aL'`
  await sql`delete from batches where id = 'bL'`
  await sql`delete from annotators where id = 'aL'`
  await sql`delete from documents where id = 'ldoc'`
  await sql.end()
})

// ── POST /labels — antecedent ─────────────────────────────────────────────────

it("POST /labels antecedent for first backref → 200, decision.type antecedent + citationId + createdAt", async () => {
  const body: Omit<Label, "createdAt"> = {
    documentId: "ldoc",
    backrefId: firstBackrefId,
    annotatorId: "aL",
    decision: { type: "antecedent", citationId: fullCitationId },
    agreedWithEngine: true,
    note: "test note",
  }
  const res = await app.request("/labels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  expect(res.status).toBe(200)
  const label = (await res.json()) as Label
  expect(label.documentId).toBe("ldoc")
  expect(label.backrefId).toBe(firstBackrefId)
  expect(label.annotatorId).toBe("aL")
  expect(label.decision.type).toBe("antecedent")
  if (label.decision.type === "antecedent") {
    expect(label.decision.citationId).toBe(fullCitationId)
  }
  expect(label.agreedWithEngine).toBe(true)
  expect(label.note).toBe("test note")
  expect(typeof label.createdAt).toBe("string")
  expect(label.createdAt!.length).toBeGreaterThan(0)
})

// ── GET /documents/:id/labels?annotator= ──────────────────────────────────────

it("GET /documents/ldoc/labels?annotator=aL → includes the label with correct decision", async () => {
  const res = await app.request("/documents/ldoc/labels?annotator=aL")
  expect(res.status).toBe(200)
  const labels = (await res.json()) as Label[]
  const found = labels.find((l) => l.backrefId === firstBackrefId)
  expect(found).toBeDefined()
  expect(found!.decision.type).toBe("antecedent")
  if (found!.decision.type === "antecedent") {
    expect(found!.decision.citationId).toBe(fullCitationId)
  }
  expect(typeof found!.createdAt).toBe("string")
})

// ── POST /labels — ambiguous ──────────────────────────────────────────────────

it("POST /labels ambiguous round-trips: decision.type ambiguous, citationIds preserved", async () => {
  const citationIds = [fullCitationId, `c99-fake`]
  // Use second backref so we don't conflict with the first test's label on firstBackrefId
  const body: Omit<Label, "createdAt"> = {
    documentId: "ldoc",
    backrefId: secondBackrefId,
    annotatorId: "aL",
    decision: { type: "ambiguous", citationIds },
    agreedWithEngine: false,
  }
  const res = await app.request("/labels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  expect(res.status).toBe(200)
  const label = (await res.json()) as Label
  expect(label.decision.type).toBe("ambiguous")
  if (label.decision.type === "ambiguous") {
    expect(label.decision.citationIds).toHaveLength(2)
    expect(label.decision.citationIds).toContain(fullCitationId)
  }

  // Also verify GET shows it
  const getRes = await app.request("/documents/ldoc/labels?annotator=aL")
  const allLabels = (await getRes.json()) as Label[]
  const found = allLabels.find((l) => l.backrefId === secondBackrefId)
  expect(found).toBeDefined()
  expect(found!.decision.type).toBe("ambiguous")
  if (found!.decision.type === "ambiguous") {
    expect(found!.decision.citationIds).toHaveLength(2)
  }
})

// ── POST /labels — validation errors ──────────────────────────────────────────

it("POST /labels antecedent missing citationId → 400", async () => {
  const body = {
    documentId: "ldoc",
    backrefId: firstBackrefId,
    annotatorId: "aL",
    decision: { type: "antecedent" }, // missing citationId
    agreedWithEngine: false,
  }
  const res = await app.request("/labels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  expect(res.status).toBe(400)
  const err = (await res.json()) as { error: string }
  expect(err.error).toBeTruthy()
})

it("POST /labels ambiguous with only 1 citationId → 400", async () => {
  const body = {
    documentId: "ldoc",
    backrefId: firstBackrefId,
    annotatorId: "aL",
    decision: { type: "ambiguous", citationIds: [fullCitationId] }, // only 1
    agreedWithEngine: false,
  }
  const res = await app.request("/labels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  expect(res.status).toBe(400)
  const err = (await res.json()) as { error: string }
  expect(err.error).toBeTruthy()
})

it("POST /labels with unknown decision type → 400", async () => {
  const body = {
    documentId: "ldoc",
    backrefId: firstBackrefId,
    annotatorId: "aL",
    decision: { type: "unknown-type" },
    agreedWithEngine: false,
  }
  const res = await app.request("/labels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  expect(res.status).toBe(400)
  const err = (await res.json()) as { error: string }
  expect(err.error).toBeTruthy()
})

it("POST /labels missing documentId → 400", async () => {
  const body = {
    backrefId: firstBackrefId,
    annotatorId: "aL",
    decision: { type: "abstain" },
    agreedWithEngine: false,
  }
  const res = await app.request("/labels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  expect(res.status).toBe(400)
  const err = (await res.json()) as { error: string }
  expect(err.error).toBeTruthy()
})

it("POST /labels missing backrefId → 400", async () => {
  const body = {
    documentId: "ldoc",
    annotatorId: "aL",
    decision: { type: "abstain" },
    agreedWithEngine: false,
  }
  const res = await app.request("/labels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  expect(res.status).toBe(400)
  const err = (await res.json()) as { error: string }
  expect(err.error).toBeTruthy()
})

it("POST /labels missing annotatorId → 400", async () => {
  const body = {
    documentId: "ldoc",
    backrefId: firstBackrefId,
    decision: { type: "abstain" },
    agreedWithEngine: false,
  }
  const res = await app.request("/labels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  expect(res.status).toBe(400)
  const err = (await res.json()) as { error: string }
  expect(err.error).toBeTruthy()
})

// ── GET /batches/:id/documents ────────────────────────────────────────────────

it("GET /batches/bL/documents → array of 1 DocumentPayload with backrefs", async () => {
  const res = await app.request("/batches/bL/documents")
  expect(res.status).toBe(200)
  const docs = (await res.json()) as DocumentPayload[]
  expect(docs).toHaveLength(1)
  expect(docs[0].id).toBe("ldoc")
  expect(Array.isArray(docs[0].backrefs)).toBe(true)
  expect(docs[0].backrefs.length).toBeGreaterThanOrEqual(2)
  expect(Array.isArray(docs[0].citations)).toBe(true)
})

it("GET /batches/unknown-batch/documents → 404", async () => {
  const res = await app.request("/batches/unknown-batch/documents")
  expect(res.status).toBe(404)
  const body = (await res.json()) as { error: string }
  expect(body.error).toBeTruthy()
})

// ── GET /batches/:id/next?annotator= ─────────────────────────────────────────

it("GET /batches/bL/next?annotator=aL → NextItem whose backref is the first UNLABELED backref (the second one, since first was labeled)", async () => {
  // firstBackrefId was already labeled in "POST /labels antecedent" test
  // secondBackrefId was labeled ambiguous in the ambiguous test — reset it first by upsert to abstain
  // Actually both are labeled now; let's label the second one to abstain and check null
  // Wait — at this point in the test sequence:
  //   test 1: labeled firstBackrefId as antecedent
  //   test 3: labeled secondBackrefId as ambiguous
  // So both are labeled — but this test checks "first unlabeled" which depends on previous tests
  // Let's delete second label so next returns second backref
  await sql`delete from labels where annotator_id = 'aL' and backref_id = ${secondBackrefId} and document_id = 'ldoc'`

  const res = await app.request("/batches/bL/next?annotator=aL")
  expect(res.status).toBe(200)
  const item = (await res.json()) as NextItem
  expect(item).not.toBeNull()
  expect(item.backref.id).toBe(secondBackrefId)
  expect(item.document.id).toBe("ldoc")
  expect(item.document.backrefs).toBeDefined()
})

it("GET /batches/bL/next?annotator=aL → null when all backrefs are labeled", async () => {
  // Label the second backref so all are now labeled
  const body: Omit<Label, "createdAt"> = {
    documentId: "ldoc",
    backrefId: secondBackrefId,
    annotatorId: "aL",
    decision: { type: "abstain" },
    agreedWithEngine: false,
  }
  await app.request("/labels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  const res = await app.request("/batches/bL/next?annotator=aL")
  expect(res.status).toBe(200)
  const item = await res.json()
  expect(item).toBeNull()
})

it("GET /batches/bL/next without annotator → 400", async () => {
  const res = await app.request("/batches/bL/next")
  expect(res.status).toBe(400)
  const body = (await res.json()) as { error: string }
  expect(body.error).toBeTruthy()
})

it("GET /batches/unknown-batch/next?annotator=aL → 404", async () => {
  const res = await app.request("/batches/unknown-batch/next?annotator=aL")
  expect(res.status).toBe(404)
  const body = (await res.json()) as { error: string }
  expect(body.error).toBeTruthy()
})

// ── POST /labels upsert ───────────────────────────────────────────────────────

it("POST /labels upsert: second POST for same (doc,backref,annotator) updates decision, preserves createdAt", async () => {
  // Use firstBackrefId (already labeled antecedent — upsert to flag)
  const body1: Omit<Label, "createdAt"> = {
    documentId: "ldoc",
    backrefId: firstBackrefId,
    annotatorId: "aL",
    decision: { type: "flag" },
    agreedWithEngine: false,
  }
  const res1 = await app.request("/labels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body1),
  })
  expect(res1.status).toBe(200)
  const updated = (await res1.json()) as Label
  expect(updated.decision.type).toBe("flag")

  // GET and verify
  const getRes = await app.request("/documents/ldoc/labels?annotator=aL")
  const all = (await getRes.json()) as Label[]
  const found = all.find((l) => l.backrefId === firstBackrefId)
  expect(found!.decision.type).toBe("flag")
})

// ── GET /documents/:id/labels — no annotator filter ──────────────────────────

it("GET /documents/ldoc/labels (no annotator) → returns all labels for the document", async () => {
  const res = await app.request("/documents/ldoc/labels")
  expect(res.status).toBe(200)
  const labels = (await res.json()) as Label[]
  expect(labels.length).toBeGreaterThanOrEqual(2)
})
