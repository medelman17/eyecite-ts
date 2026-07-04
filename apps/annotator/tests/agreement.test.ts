// apps/annotator/tests/agreement.test.ts
// Integration tests for GET /batches/:id/agreement
import { afterAll, beforeAll, expect, it } from "vitest"
import { makeSql } from "../src/db.js"
import { migrate } from "../src/migrate.js"
import { upsertDocumentPayload } from "../src/persist.js"
import { buildDocumentPayload } from "../src/prefill.js"
import { makeApp } from "../src/server.js"
import type { DocumentPayload, Label } from "../src/contract.js"

const sql = makeSql()
const app = makeApp(sql)

// Seed text: 1 full + 3 Id. back-references → 3 backrefs (c1, c2, c3)
const K_SEED_TEXT = "Smith v. Jones, 1 U.S. 1 (1990). Id. at 5. Id. at 7. Id. at 9."

let kdocPayload: DocumentPayload
let fullCitationId: string
// Backref IDs sorted by span (reading order)
let br1: string
let br2: string
let br3: string

beforeAll(async () => {
  await migrate(sql)

  kdocPayload = buildDocumentPayload(K_SEED_TEXT, {
    id: "kdoc",
    source: "native",
    court: null,
    year: 1990,
  })

  if (kdocPayload.backrefs.length < 3) {
    throw new Error(
      `Expected >= 3 backrefs from seed text, got ${kdocPayload.backrefs.length}`,
    )
  }

  const sorted = [...kdocPayload.backrefs].sort((a, b) => a.span[0] - b.span[0])
  br1 = sorted[0].id
  br2 = sorted[1].id
  br3 = sorted[2].id
  fullCitationId = kdocPayload.citations.find((c) => c.kind === "full")!.id

  await upsertDocumentPayload(sql, kdocPayload)

  // Create annotators k1 and k2
  await app.request("/annotators", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "k1", name: "Kappa Reviewer One" }),
  })
  await app.request("/annotators", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "k2", name: "Kappa Reviewer Two" }),
  })

  // Create a single-reviewer batch for the "!= 2 reviewers" test
  await app.request("/annotators", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "kSingle", name: "Single Kappa Reviewer" }),
  })
  await app.request("/batches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: "kbSingle",
      name: "Single Reviewer Batch",
      mode: "single",
      documentIds: ["kdoc"],
      reviewers: ["kSingle"],
    }),
  })

  // Create double batch kb with both reviewers k1 and k2
  await app.request("/batches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: "kb",
      name: "Kappa Test Batch",
      mode: "double",
      documentIds: ["kdoc"],
      reviewers: ["k1", "k2"],
    }),
  })

  // Insert labels for the double batch.
  // Setup:
  //   k1: c1→antecedent:c0, c2→antecedent:c0, c3→flag
  //   k2: c1→antecedent:c0, c2→flag,           c3→flag
  //
  // Resulting category pairs (in reading order):
  //   br1: [antecedent:c0, antecedent:c0]  ← AGREE
  //   br2: [antecedent:c0, flag]            ← DISAGREE
  //   br3: [flag, flag]                     ← AGREE
  //
  // n=3, agreements=2, po=2/3
  // A marginals: antecedent:c0→2/3, flag→1/3
  // B marginals: antecedent:c0→1/3, flag→2/3
  // pe = (2/3)*(1/3) + (1/3)*(2/3) = 2/9 + 2/9 = 4/9
  // κ = (2/3 − 4/9) / (1 − 4/9) = (2/9) / (5/9) = 2/5 = 0.4

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

  // k1 labels
  await postLabel({ documentId: "kdoc", backrefId: br1, annotatorId: "k1", decision: { type: "antecedent", citationId: fullCitationId }, agreedWithEngine: true })
  await postLabel({ documentId: "kdoc", backrefId: br2, annotatorId: "k1", decision: { type: "antecedent", citationId: fullCitationId }, agreedWithEngine: true })
  await postLabel({ documentId: "kdoc", backrefId: br3, annotatorId: "k1", decision: { type: "flag" }, agreedWithEngine: false })

  // k2 labels
  await postLabel({ documentId: "kdoc", backrefId: br1, annotatorId: "k2", decision: { type: "antecedent", citationId: fullCitationId }, agreedWithEngine: true })
  await postLabel({ documentId: "kdoc", backrefId: br2, annotatorId: "k2", decision: { type: "flag" }, agreedWithEngine: false })
  await postLabel({ documentId: "kdoc", backrefId: br3, annotatorId: "k2", decision: { type: "flag" }, agreedWithEngine: false })
})

afterAll(async () => {
  await sql`delete from labels where annotator_id in ('k1', 'k2', 'kSingle')`
  await sql`delete from batches where id in ('kb', 'kbSingle')`
  await sql`delete from annotators where id in ('k1', 'k2', 'kSingle')`
  await sql`delete from documents where id = 'kdoc'`
  await sql.end()
})

// ── Happy path: double batch with 2 reviewers ─────────────────────────────────

it("GET /batches/kb/agreement → 200 with kappa=0.4, po=2/3, sharedItems=3", async () => {
  const res = await app.request("/batches/kb/agreement")
  expect(res.status).toBe(200)
  const body = (await res.json()) as {
    kappa: number | null
    po: number
    pe: number
    sharedItems: number
    reviewers: string[]
    perReviewerLabeled: Record<string, number>
  }

  expect(body.sharedItems).toBe(3)
  expect(body.reviewers).toHaveLength(2)
  expect(body.reviewers).toContain("k1")
  expect(body.reviewers).toContain("k2")
  expect(body.perReviewerLabeled["k1"]).toBe(3)
  expect(body.perReviewerLabeled["k2"]).toBe(3)

  // po = 2/3 ≈ 0.6667
  expect(body.po).toBeCloseTo(2 / 3, 8)
  // pe = 4/9 ≈ 0.4444
  expect(body.pe).toBeCloseTo(4 / 9, 8)
  // κ = 0.4
  expect(body.kappa).not.toBeNull()
  expect(body.kappa!).toBeCloseTo(0.4, 8)
})

// ── Single-reviewer batch: kappa should be null ───────────────────────────────

it("GET /batches/kbSingle/agreement → 200 with kappa null (not 2 reviewers)", async () => {
  const res = await app.request("/batches/kbSingle/agreement")
  expect(res.status).toBe(200)
  const body = (await res.json()) as {
    kappa: number | null
    po: number
    pe: number
    sharedItems: number
    reviewers: string[]
  }
  expect(body.kappa).toBeNull()
  expect(body.po).toBe(0)
  expect(body.pe).toBe(0)
  expect(body.sharedItems).toBe(0)
  expect(body.reviewers).toHaveLength(1)
})

// ── Unknown batch → 404 ───────────────────────────────────────────────────────

it("GET /batches/unknown-batch/agreement → 404", async () => {
  const res = await app.request("/batches/unknown-batch/agreement")
  expect(res.status).toBe(404)
  const body = (await res.json()) as { error: string }
  expect(body.error).toBeTruthy()
})
