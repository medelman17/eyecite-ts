// apps/annotator/src/persist.ts
import type postgres from "postgres"
import type { Candidate, ContractCitation, Backref, DocumentPayload } from "./contract.js"

// Narrow types for rows returned from each table — avoids leaking `any` from postgres.Row.
interface DocRow {
  id: string
  source: "ocr" | "native"
  court: string | null
  year: number | null
  caption: string | null
  docket: string | null
  text: string
}
interface CitationRow {
  id: string
  kind: ContractCitation["kind"]
  span_start: number
  span_end: number
  display_text: string
  plaintiff: string | null
  defendant: string | null
  year: number | null
}
interface BackrefRow {
  id: string
  kind: Backref["kind"]
  span_start: number
  span_end: number
  engine_guess: string | null
  engine_confidence: number | null
  engine_warning: string | null
  candidates: Candidate[] // postgres.js auto-parses jsonb → JS
}

export async function upsertDocumentPayload(
  sql: postgres.Sql,
  p: DocumentPayload,
): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`insert into documents (id, source, court, year, caption, docket, text)
      values (${p.id}, ${p.source}, ${p.court}, ${p.year}, ${p.caption ?? null}, ${p.docket ?? null}, ${p.text})
      on conflict (id) do update set
        source = excluded.source,
        court = excluded.court,
        year = excluded.year,
        caption = excluded.caption,
        docket = excluded.docket,
        text = excluded.text`

    // Upsert citations by PK (preserves FK references from labels)
    for (const c of p.citations) {
      await tx`insert into citations (document_id, id, kind, span_start, span_end, display_text, plaintiff, defendant, year)
        values (${p.id}, ${c.id}, ${c.kind}, ${c.span[0]}, ${c.span[1]}, ${c.displayText}, ${c.parties?.plaintiff ?? null}, ${c.parties?.defendant ?? null}, ${c.year ?? null})
        on conflict (document_id, id) do update set
          kind = excluded.kind,
          span_start = excluded.span_start,
          span_end = excluded.span_end,
          display_text = excluded.display_text,
          plaintiff = excluded.plaintiff,
          defendant = excluded.defendant,
          year = excluded.year`
    }
    // Delete citations no longer present (cascade will clean up labels referencing them)
    const citationIds = p.citations.map((c) => c.id)
    if (citationIds.length > 0) {
      await tx`delete from citations where document_id = ${p.id} and not (id = any(${citationIds}))`
    } else {
      await tx`delete from citations where document_id = ${p.id}`
    }

    // Upsert backrefs by PK (preserves FK references from labels)
    for (const b of p.backrefs) {
      await tx`insert into backrefs (document_id, id, kind, span_start, span_end, engine_guess, engine_confidence, engine_warning, candidates)
        values (${p.id}, ${b.id}, ${b.kind}, ${b.span[0]}, ${b.span[1]}, ${b.engineGuess}, ${b.engineConfidence}, ${b.engineWarning}, ${sql.json(b.candidates as unknown as postgres.JSONValue)})
        on conflict (document_id, id) do update set
          kind = excluded.kind,
          span_start = excluded.span_start,
          span_end = excluded.span_end,
          engine_guess = excluded.engine_guess,
          engine_confidence = excluded.engine_confidence,
          engine_warning = excluded.engine_warning,
          candidates = excluded.candidates`
    }
    // Delete backrefs no longer present (cascade correctly removes labels for gone backrefs)
    const backrefIds = p.backrefs.map((b) => b.id)
    if (backrefIds.length > 0) {
      await tx`delete from backrefs where document_id = ${p.id} and not (id = any(${backrefIds}))`
    } else {
      await tx`delete from backrefs where document_id = ${p.id}`
    }
  })
}

export async function getDocumentPayload(
  sql: postgres.Sql,
  id: string,
): Promise<DocumentPayload | null> {
  const [doc] = (await sql`select * from documents where id = ${id}`) as unknown as DocRow[]
  if (!doc) return null
  const citations = (await sql`select * from citations where document_id = ${id} order by id`) as unknown as CitationRow[]
  const backrefs = (await sql`select * from backrefs where document_id = ${id} order by id`) as unknown as BackrefRow[]
  return {
    id: doc.id,
    source: doc.source,
    court: doc.court,
    year: doc.year,
    caption: doc.caption ?? undefined,
    docket: doc.docket ?? undefined,
    text: doc.text,
    citations: citations.map((c): ContractCitation => ({
      id: c.id,
      kind: c.kind,
      span: [c.span_start, c.span_end],
      displayText: c.display_text,
      parties:
        c.plaintiff !== null || c.defendant !== null
          ? { plaintiff: c.plaintiff ?? undefined, defendant: c.defendant ?? undefined }
          : undefined,
      year: c.year ?? undefined,
    })),
    backrefs: backrefs.map((b): Backref => ({
      id: b.id,
      kind: b.kind,
      span: [b.span_start, b.span_end],
      engineGuess: b.engine_guess,
      engineConfidence: b.engine_confidence,
      engineWarning: b.engine_warning,
      candidates: b.candidates,
    })),
  }
}
