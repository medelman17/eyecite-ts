// apps/annotator/tests/persist.test.ts
import { afterAll, beforeAll, expect, it } from "vitest"
import { makeSql } from "../src/db.js"
import { migrate } from "../src/migrate.js"
import { upsertDocumentPayload, getDocumentPayload } from "../src/persist.js"
import { buildDocumentPayload } from "../src/prefill.js"

const sql = makeSql()
beforeAll(async () => { await migrate(sql) })
afterAll(async () => { await sql`delete from documents where id = 'tdoc'`; await sql.end() })

it("round-trips a DocumentPayload through Postgres", async () => {
  const payload = buildDocumentPayload("Smith v. Jones, 1 U.S. 1 (1990). Id. at 5.", {
    id: "tdoc", source: "native", court: "scotus", year: 1990,
  })
  await upsertDocumentPayload(sql, payload)
  const got = await getDocumentPayload(sql, "tdoc")
  expect(got?.citations.length).toBe(payload.citations.length)
  expect(got?.backrefs[0].engineGuess).toBe(payload.backrefs[0].engineGuess)
})
