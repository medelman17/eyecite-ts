// apps/annotator/src/server.ts
import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { fileURLToPath } from "node:url"
import type postgres from "postgres"
import { makeSql } from "./db.js"
import { getDocumentPayload } from "./persist.js"
import { registerAdjudicationRoutes } from "./routes/adjudication.js"
import { registerAgreementRoutes } from "./routes/agreement.js"
import { registerBatchRoutes } from "./routes/batches.js"
import { registerLabelRoutes } from "./routes/labels.js"

interface DocListRow {
  id: string
  source: string
  backrefCount: number
}

export function makeApp(sql: postgres.Sql) {
  const app = new Hono()
  app.get("/healthz", (c) => c.json({ ok: true }))
  app.get("/documents", async (c) => {
    const rows = (await sql`
      select d.id, d.source, count(b.*)::int as "backrefCount"
      from documents d left join backrefs b on b.document_id = d.id
      group by d.id, d.source order by d.id`) as unknown as DocListRow[]
    return c.json(rows)
  })
  app.get("/documents/:id", async (c) => {
    const payload = await getDocumentPayload(sql, c.req.param("id"))
    return payload ? c.json(payload) : c.json({ error: "not found" }, 404)
  })
  registerBatchRoutes(app, sql)
  registerLabelRoutes(app, sql)
  registerAgreementRoutes(app, sql)
  registerAdjudicationRoutes(app, sql)
  return app
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const app = makeApp(makeSql())
  const port = Number(process.env.PORT ?? 8787)
  serve({ fetch: app.fetch, port })
  console.log(`annotator api on :${port}`)
}
