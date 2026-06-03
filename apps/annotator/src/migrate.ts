// apps/annotator/src/migrate.ts
import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { makeSql } from "./db.js"

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations")

export async function migrate(sql = makeSql()): Promise<string[]> {
  await sql`create table if not exists _migrations (name text primary key, applied_at timestamptz default now())`
  const applied = new Set((await sql`select name from _migrations`).map((r) => r.name as string))
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()
  const ran: string[] = []
  for (const f of files) {
    if (applied.has(f)) continue
    await sql.unsafe(readFileSync(join(dir, f), "utf8"))
    await sql`insert into _migrations (name) values (${f})`
    ran.push(f)
  }
  return ran
}

// CLI entry-point guard — robust against tsx path rewriting
const isCli = fileURLToPath(import.meta.url) === process.argv[1]
if (isCli) {
  const sql = makeSql()
  migrate(sql).then((r) => {
    console.log(`applied: ${r.length ? r.join(", ") : "(none — up to date)"}`)
    return sql.end()
  })
}
