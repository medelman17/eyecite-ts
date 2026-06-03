// apps/annotator/tests/server.test.ts
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
  await upsertDocumentPayload(sql, buildDocumentPayload("Smith v. Jones, 1 U.S. 1 (1990). Id. at 5.", {
    id: "srvdoc", source: "native", court: null, year: 1990,
  }))
})
afterAll(async () => { await sql`delete from documents where id='srvdoc'`; await sql.end() })

it("GET /healthz returns ok", async () => {
  const res = await app.request("/healthz")
  expect(res.status).toBe(200)
})

it("GET /documents/:id returns the contract", async () => {
  const res = await app.request("/documents/srvdoc")
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.backrefs[0].kind).toBe("id")
  expect(body.backrefs[0].engineGuess).toBe("c0")
})

it("GET /documents/:id returns 404 for unknown id", async () => {
  const res = await app.request("/documents/does-not-exist")
  expect(res.status).toBe(404)
})

it("GET /documents lists docs with a backrefCount", async () => {
  const res = await app.request("/documents")
  expect(res.status).toBe(200)
  const rows = await res.json()
  const row = rows.find((r: { id: string }) => r.id === "srvdoc")
  expect(row).toBeTruthy()
  expect(row.backrefCount).toBeGreaterThanOrEqual(1)
})
