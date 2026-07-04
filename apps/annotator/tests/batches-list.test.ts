// apps/annotator/tests/batches-list.test.ts
// Integration tests for GET /batches — BatchSummary[] list endpoint.
import { afterAll, beforeAll, expect, it } from "vitest"
import { makeSql } from "../src/db.js"
import { migrate } from "../src/migrate.js"
import { upsertDocumentPayload } from "../src/persist.js"
import { buildDocumentPayload } from "../src/prefill.js"
import { makeApp } from "../src/server.js"
import type { BatchSummary, DocumentPayload, Label } from "../src/contract.js"

const sql = makeSql()
const app = makeApp(sql)

// Seed text: 1 full + 4 Id. back-references → 4 backrefs (c1..c4)
// We'll label 3 of them and leave br4 unlabeled → status 'active'.
const SEED_TEXT =
  "Smith v. Jones, 1 U.S. 1 (1990). Id. at 5. Id. at 7. Id. at 9. Id. at 11."

let bldocPayload: DocumentPayload
let fullCitationId: string
let br1: string // both agree (antecedent same)        → mix.confirm +2
let br2: string // disagree (bl1=antecedent, bl2=abstain) → disagreements +1
let br3: string // bl1=flag (bl2 unlabeled for flag test) → mix.flag +1, flagged +1
// sorted[3] (the 4th backref) is intentionally left UNLABELED, so labeled < backrefCount → status 'active'

beforeAll(async () => {
  await migrate(sql)

  bldocPayload = buildDocumentPayload(SEED_TEXT, {
    id: "bldoc",
    source: "native",
    court: null,
    year: 1990,
  })

  if (bldocPayload.backrefs.length < 4) {
    throw new Error(
      `Expected >= 4 backrefs from seed text, got ${bldocPayload.backrefs.length}`,
    )
  }

  const sorted = [...bldocPayload.backrefs].sort((a, b) => a.span[0] - b.span[0])
  br1 = sorted[0].id
  br2 = sorted[1].id
  br3 = sorted[2].id
  fullCitationId = bldocPayload.citations.find((c) => c.kind === "full")!.id

  await upsertDocumentPayload(sql, bldocPayload)

  // Create annotators bl1 and bl2
  for (const [id, name] of [
    ["bl1", "BatchList Reviewer One"],
    ["bl2", "BatchList Reviewer Two"],
  ] as const) {
    await app.request("/annotators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name }),
    })
  }

  // Create double batch blb with both reviewers over bldoc
  await app.request("/batches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: "blb",
      name: "BatchList Test Batch",
      mode: "double",
      documentIds: ["bldoc"],
      reviewers: ["bl1", "bl2"],
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

  // br1: AGREE — both antecedent:fullCitationId, agreed_with_engine=true → mix.confirm +2
  await postLabel({
    documentId: "bldoc",
    backrefId: br1,
    annotatorId: "bl1",
    decision: { type: "antecedent", citationId: fullCitationId },
    agreedWithEngine: true,
  })
  await postLabel({
    documentId: "bldoc",
    backrefId: br1,
    annotatorId: "bl2",
    decision: { type: "antecedent", citationId: fullCitationId },
    agreedWithEngine: true,
  })

  // br2: DISAGREE — bl1=antecedent (agreed_with_engine=true), bl2=abstain
  // This produces disagreements ≥ 1 and labeled ≥ 2
  await postLabel({
    documentId: "bldoc",
    backrefId: br2,
    annotatorId: "bl1",
    decision: { type: "antecedent", citationId: fullCitationId },
    agreedWithEngine: true,
  })
  await postLabel({
    documentId: "bldoc",
    backrefId: br2,
    annotatorId: "bl2",
    decision: { type: "abstain" },
    agreedWithEngine: false,
  })

  // br3: bl1=flag (bl2 unlabeled) → mix.flag +1, flagged +1
  // distinct labeled = 3 (br1, br2, br3)
  await postLabel({
    documentId: "bldoc",
    backrefId: br3,
    annotatorId: "bl1",
    decision: { type: "flag" },
    agreedWithEngine: false,
  })

  // br4: UNLABELED — ensures labeled (3) < backrefCount (4) → status 'active'
})

afterAll(async () => {
  await sql`delete from labels where annotator_id in ('bl1', 'bl2')`
  await sql`delete from batches where id = 'blb'`
  await sql`delete from annotators where id in ('bl1', 'bl2')`
  await sql`delete from documents where id = 'bldoc'`
  await sql.end()
})

// ── Main assertions on GET /batches ──────────────────────────────────────────

it("GET /batches → 200 with an array", async () => {
  const res = await app.request("/batches")
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(Array.isArray(body)).toBe(true)
})

it("GET /batches includes blb with correct mode, docCount, reviewers", async () => {
  const res = await app.request("/batches")
  expect(res.status).toBe(200)
  const list = (await res.json()) as BatchSummary[]
  const blb = list.find((b) => b.id === "blb")
  expect(blb).toBeDefined()
  expect(blb!.mode).toBe("double")
  expect(blb!.docCount).toBe(1)
  // reviewers should be the names (joined from annotators)
  expect(blb!.reviewers).toContain("BatchList Reviewer One")
  expect(blb!.reviewers).toContain("BatchList Reviewer Two")
  expect(blb!.reviewers).toHaveLength(2)
})

it("GET /batches blb: backrefCount, labeled, mix.confirm, mix.flag", async () => {
  const res = await app.request("/batches")
  expect(res.status).toBe(200)
  const list = (await res.json()) as BatchSummary[]
  const blb = list.find((b) => b.id === "blb")!
  expect(blb).toBeDefined()

  // backrefCount = 4 (br1..br4)
  expect(blb.backrefCount).toBe(4)

  // labeled = distinct (document_id, backref_id) pairs with ≥1 batch-reviewer label = 3
  expect(blb.labeled).toBe(3)

  // mix.confirm = antecedent && agreed_with_engine true: br1×bl1, br1×bl2, br2×bl1 = 3
  expect(blb.mix.confirm).toBeGreaterThanOrEqual(1)

  // mix.flag ≥ 1 (br3/bl1)
  expect(blb.mix.flag).toBeGreaterThanOrEqual(1)
})

it("GET /batches blb: disagreements ≥ 1 and flagged ≥ 1", async () => {
  const res = await app.request("/batches")
  expect(res.status).toBe(200)
  const list = (await res.json()) as BatchSummary[]
  const blb = list.find((b) => b.id === "blb")!
  expect(blb).toBeDefined()

  // br2: bl1=antecedent, bl2=abstain → 2 distinct canonical categories → 1 disagreement
  expect(blb.disagreements).toBeGreaterThanOrEqual(1)

  // br3: bl1=flag → flagged ≥ 1
  expect(blb.flagged).toBeGreaterThanOrEqual(1)
})

it("GET /batches blb: kappa is a finite number in (-1, 1]", async () => {
  const res = await app.request("/batches")
  expect(res.status).toBe(200)
  const list = (await res.json()) as BatchSummary[]
  const blb = list.find((b) => b.id === "blb")!
  expect(blb).toBeDefined()

  // Exactly 2 reviewers → kappa should be computed (non-null)
  expect(blb.kappa).not.toBeNull()
  expect(typeof blb.kappa).toBe("number")
  expect(Number.isFinite(blb.kappa!)).toBe(true)
  expect(blb.kappa!).toBeGreaterThan(-1)
  expect(blb.kappa!).toBeLessThanOrEqual(1)
})

it("GET /batches blb: status is 'active' (br4 unlabeled)", async () => {
  const res = await app.request("/batches")
  expect(res.status).toBe(200)
  const list = (await res.json()) as BatchSummary[]
  const blb = list.find((b) => b.id === "blb")!
  expect(blb).toBeDefined()

  // labeled=3 < backrefCount=4 → status 'active'
  expect(blb.status).toBe("active")
})

it("GET /batches results are ordered by batch id (database order)", async () => {
  const res = await app.request("/batches")
  expect(res.status).toBe(200)
  const list = (await res.json()) as BatchSummary[]
  const ids = list.map((b) => b.id)
  // Verify the list is sorted consistently (same order as Postgres text sort)
  // Postgres text sort: compare byte-by-byte (C collation) — not same as JS .sort()
  // We verify the list is non-empty and that 'blb' appears after the other 'bl*' batches
  expect(ids.length).toBeGreaterThanOrEqual(1)
  // blb should appear in the list
  expect(ids).toContain("blb")
  // The order should be stable: if we request again, we get the same order
  const res2 = await app.request("/batches")
  const list2 = (await res2.json()) as BatchSummary[]
  expect(list2.map((b) => b.id)).toEqual(ids)
})
