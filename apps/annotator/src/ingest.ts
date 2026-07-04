// apps/annotator/src/ingest.ts
import postgres from "postgres"
import { makeSql } from "./db.js"
import { buildDocumentPayload } from "./prefill.js"
import { upsertDocumentPayload } from "./persist.js"

const REPLICA = process.env.COURTLISTENER_REPLICA_URL
const arm = (process.argv.find((a) => a.startsWith("--arm="))?.split("=")[1] ?? "ocr") as
  | "ocr"
  | "native"
const limit = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 25)
const ocrStatus = arm === "ocr" ? 1 : 2

// Narrow type for rows returned from the replica query — avoids leaking `any` from postgres.Row.
type ReplicaRow = { id: number; plain_text: string }

async function main() {
  if (!REPLICA) throw new Error("COURTLISTENER_REPLICA_URL is not set")
  const replica = postgres(REPLICA, { onnotice: () => {} })
  const db = makeSql()
  try {
    // Over-sample hard cases: docs containing a string-cite/parenthetical trigger.
    const rows = await replica`
      select id, plain_text
      from search_recapdocument tablesample system (1.5)
      where ocr_status = ${ocrStatus}
        and length(plain_text) between 1500 and 80000
        and plain_text ~* '\\(\\s*(quoting|citing|noting|holding)'
      limit ${limit}`
    let n = 0
    for (const r of rows as unknown as ReplicaRow[]) {
      const payload = buildDocumentPayload(r.plain_text, {
        id: `recap-${r.id}`,
        source: arm,
        court: null,
        year: null,
      })
      if (payload.backrefs.length === 0) continue // only keep docs with back-refs to label
      await upsertDocumentPayload(db, payload)
      n++
    }
    console.log(`ingested ${n}/${rows.length} ${arm} documents (with back-refs)`)
  } finally {
    await replica.end()
    await db.end()
  }
}
main()
