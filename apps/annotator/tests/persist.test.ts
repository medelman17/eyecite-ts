// apps/annotator/tests/persist.test.ts
import { afterAll, beforeAll, expect, it } from "vitest"
import { makeSql } from "../src/db.js"
import { migrate } from "../src/migrate.js"
import { upsertDocumentPayload, getDocumentPayload } from "../src/persist.js"
import { buildDocumentPayload } from "../src/prefill.js"

const sql = makeSql()
beforeAll(async () => {
  await migrate(sql)
})
afterAll(async () => {
  await sql`delete from documents where id in ('tdoc','tdoc-re','tdoc-null','redoc','capdoc')`
  await sql`delete from annotators where id = 'a-test'`
  await sql.end()
})

it("round-trips a DocumentPayload through Postgres", async () => {
  const payload = buildDocumentPayload("Smith v. Jones, 1 U.S. 1 (1990). Id. at 5.", {
    id: "tdoc",
    source: "native",
    court: "scotus",
    year: 1990,
  })
  await upsertDocumentPayload(sql, payload)
  const got = await getDocumentPayload(sql, "tdoc")

  expect(got?.citations.length).toBe(payload.citations.length)
  expect(got?.backrefs[0].engineGuess).toBe(payload.backrefs[0].engineGuess)

  // span tuple survives the int->[number,number] round-trip
  expect(got?.citations[0].span).toEqual(payload.citations[0].span)

  // parties survive (non-trivial null-vs-present reconstruction in getDocumentPayload)
  expect(got?.citations[0].parties?.plaintiff).toBe("Smith")
  expect(got?.citations[0].parties?.defendant).toBe("Jones")

  // candidates is the riskiest column (jsonb): the whole nested array must survive intact
  expect(got?.backrefs[0].candidates).toEqual(payload.backrefs[0].candidates)
  expect(got?.backrefs[0].candidates[0].rank).toBe(0)
  expect(got?.backrefs[0].candidates[0].isBuriedAside).toBe(false)
})

it("re-ingest updates court and year (not just source/text)", async () => {
  const meta = { id: "tdoc-re", source: "native" as const }
  await upsertDocumentPayload(
    sql,
    buildDocumentPayload("Doe v. Roe, 3 U.S. 3 (1980). Id.", { ...meta, court: "ca9", year: 1980 }),
  )
  // Re-ingest the same doc id with enriched metadata.
  await upsertDocumentPayload(
    sql,
    buildDocumentPayload("Doe v. Roe, 3 U.S. 3 (1980). Id.", {
      ...meta,
      court: "scotus",
      year: 2021,
    }),
  )
  const got = await getDocumentPayload(sql, "tdoc-re")
  expect(got?.court).toBe("scotus")
  expect(got?.year).toBe(2021)
})

it("round-trips null court and year", async () => {
  await upsertDocumentPayload(
    sql,
    buildDocumentPayload("2 U.S. 2 (2000).", {
      id: "tdoc-null",
      source: "ocr",
      court: null,
      year: null,
    }),
  )
  const got = await getDocumentPayload(sql, "tdoc-null")
  expect(got?.court).toBeNull()
  expect(got?.year).toBeNull()
})

it("round-trips caption and docket", async () => {
  await upsertDocumentPayload(sql, buildDocumentPayload("Doe v. Roe, 3 U.S. 3 (1980). Id.", {
    id: "capdoc", source: "native", court: "ca9", year: 1980, caption: "Doe v. Roe", docket: "No. 12-345",
  }))
  const got = await getDocumentPayload(sql, "capdoc")
  expect(got?.caption).toBe("Doe v. Roe")
  expect(got?.docket).toBe("No. 12-345")
})

it("preserves labels when the same document is re-ingested (no destructive cascade)", async () => {
  const make = () => buildDocumentPayload("Smith v. Jones, 1 U.S. 1 (1990). Id. at 5.", {
    id: "redoc", source: "native", court: null, year: 1990,
  })
  const payload = make()
  await upsertDocumentPayload(sql, payload)
  const backrefId = payload.backrefs[0].id
  const citationId = payload.backrefs[0].engineGuess
  await sql`insert into annotators (id, name) values ('a-test', 'Test') on conflict (id) do nothing`
  await sql`insert into labels (document_id, backref_id, annotator_id, decision_type, citation_id, agreed_with_engine)
            values ('redoc', ${backrefId}, 'a-test', 'antecedent', ${citationId}, true)
            on conflict (document_id, backref_id, annotator_id) do nothing`
  // re-ingest the SAME document — labels must survive
  await upsertDocumentPayload(sql, make())
  const [{ count }] = await sql`select count(*)::int as count from labels where document_id = 'redoc'`
  expect(count).toBe(1)
})
