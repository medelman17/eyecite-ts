// apps/annotator/src/db.ts
import postgres from "postgres"

export function makeSql(url = process.env.ANNOTATOR_DB_URL) {
  if (!url) throw new Error("ANNOTATOR_DB_URL is not set")
  return postgres(url, { onnotice: () => {} })
}
