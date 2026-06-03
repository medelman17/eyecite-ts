// apps/annotator/tests/batches.test.ts
import { afterAll, beforeAll, expect, it } from "vitest"
import { makeSql } from "../src/db.js"
import { migrate } from "../src/migrate.js"
import { upsertDocumentPayload } from "../src/persist.js"
import { buildDocumentPayload } from "../src/prefill.js"
import { makeApp } from "../src/server.js"

const sql = makeSql()
const app = makeApp(sql)

beforeAll(async () => {
  await migrate(sql)
  await upsertDocumentPayload(
    sql,
    buildDocumentPayload("Smith v. Jones, 1 U.S. 1 (1990). Id. at 5.", {
      id: "bdoc",
      source: "native",
      court: null,
      year: 1990,
    }),
  )
})

afterAll(async () => {
  await sql`delete from batches where id like 'btest%'`
  await sql`delete from annotators where id like 'atest%'`
  await sql`delete from documents where id = 'bdoc'`
  await sql.end()
})

it("POST /annotators then GET /annotators includes the new annotator", async () => {
  const postRes = await app.request("/annotators", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "atest1", name: "Alice Tester" }),
  })
  expect(postRes.status).toBe(200)
  const created = await postRes.json()
  expect(created).toEqual({ id: "atest1", name: "Alice Tester" })

  const getRes = await app.request("/annotators")
  expect(getRes.status).toBe(200)
  const list = await getRes.json()
  expect(list.some((a: { id: string }) => a.id === "atest1")).toBe(true)
})

it("POST /annotators with missing name → 400", async () => {
  const res = await app.request("/annotators", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "atest-bad" }),
  })
  expect(res.status).toBe(400)
  const body = await res.json()
  expect(body.error).toBeTruthy()
})

it("POST /annotators with empty name → 400", async () => {
  const res = await app.request("/annotators", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "atest-bad2", name: "" }),
  })
  expect(res.status).toBe(400)
  const body = await res.json()
  expect(body.error).toBeTruthy()
})

it("POST /annotators with missing id → 400", async () => {
  const res = await app.request("/annotators", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "No Id" }),
  })
  expect(res.status).toBe(400)
  const body = await res.json()
  expect(body.error).toBeTruthy()
})

it("POST /batches creates batch; GET /batches/:id returns full details", async () => {
  // Ensure the reviewer exists
  await app.request("/annotators", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "atest2", name: "Bob Reviewer" }),
  })

  const postRes = await app.request("/batches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: "btest1",
      name: "Test Batch One",
      mode: "single",
      documentIds: ["bdoc"],
      reviewers: ["atest2"],
    }),
  })
  expect(postRes.status).toBe(201)
  const created = await postRes.json()
  expect(created.id).toBe("btest1")
  expect(created.name).toBe("Test Batch One")
  expect(created.mode).toBe("single")
  expect(created.documentIds).toEqual(["bdoc"])
  expect(created.reviewers).toEqual(["atest2"])

  const getRes = await app.request("/batches/btest1")
  expect(getRes.status).toBe(200)
  const batch = await getRes.json()
  expect(batch.id).toBe("btest1")
  expect(batch.name).toBe("Test Batch One")
  expect(batch.mode).toBe("single")
  expect(batch.reviewers).toEqual(["atest2"])
  expect(batch.documentIds).toEqual(["bdoc"])
  expect(batch.docCount).toBe(1)
  expect(batch.backrefCount).toBeGreaterThanOrEqual(1)
  expect(batch.labeled).toBe(0)
})

it("GET /batches/:id returns 404 for unknown batch", async () => {
  const res = await app.request("/batches/unknown-batch-id")
  expect(res.status).toBe(404)
  const body = await res.json()
  expect(body.error).toBeTruthy()
})

it("POST /batches referencing a non-existent document → 400", async () => {
  // Ensure reviewer exists for this test
  await app.request("/annotators", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "atest3", name: "Carol Reviewer" }),
  })

  const res = await app.request("/batches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: "btest-bad",
      name: "Bad Batch",
      mode: "double",
      documentIds: ["no-such-doc"],
      reviewers: ["atest3"],
    }),
  })
  expect(res.status).toBe(400)
  const body = await res.json()
  expect(body.error).toBeTruthy()
})

it("POST /batches with missing name → 400", async () => {
  const res = await app.request("/batches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "single",
      documentIds: ["bdoc"],
      reviewers: [],
    }),
  })
  expect(res.status).toBe(400)
  const body = await res.json()
  expect(body.error).toBeTruthy()
})

it("POST /batches with invalid mode → 400", async () => {
  const res = await app.request("/batches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Bad Mode Batch",
      mode: "triple",
      documentIds: ["bdoc"],
      reviewers: [],
    }),
  })
  expect(res.status).toBe(400)
  const body = await res.json()
  expect(body.error).toBeTruthy()
})

it("POST /batches with auto-generated id works", async () => {
  // Ensure reviewer exists
  await app.request("/annotators", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "atest4", name: "Dave Reviewer" }),
  })

  const postRes = await app.request("/batches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      // no id — should auto-generate
      name: "Auto ID Batch",
      mode: "double",
      documentIds: ["bdoc"],
      reviewers: ["atest4"],
    }),
  })
  expect(postRes.status).toBe(201)
  const created = await postRes.json()
  expect(typeof created.id).toBe("string")
  expect(created.id.length).toBeGreaterThan(0)
  expect(created.mode).toBe("double")

  // Clean up the auto-generated batch
  await sql`delete from batches where id = ${created.id as string}`
})
