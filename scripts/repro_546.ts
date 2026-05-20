/**
 * Repro for issue #546 — TransformationMap catastrophic collapse.
 *
 * Loads the three documented CAP-corpus repros and reports any citations
 * whose originalStart === originalEnd (zero-width orphan) or whose slice
 * disagrees with the matchedText.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import AdmZip from "adm-zip"
import { extractCitations } from "../src/index"
import type { Citation } from "../src/types/citation"

const CAP_ROOT =
  process.env.CAP_ROOT ??
  "/Users/medelman/Projects/Ourfirm.ai/GitHub/opinion-text-explorer/case-law-data"

interface Repro {
  label: string
  reporter: string
  volume: string
  entry: string
  variant: "plain" | "html"
}

const REPROS: Repro[] = [
  { label: "va-patt-heath/2/0795-01.json (plain)", reporter: "va-patt-heath", volume: "2", entry: "json/0795-01.json", variant: "plain" },
  { label: "gibb-surr/1/0414-01.json (plain)", reporter: "gibb-surr", volume: "1", entry: "json/0414-01.json", variant: "plain" },
  { label: "cal-app-2d/222/0626-01.json (HTML)", reporter: "cal-app-2d", volume: "222", entry: "json/0626-01.json", variant: "html" },
]

const loadOpinion = (r: Repro): string => {
  const zip = new AdmZip(join(CAP_ROOT, r.reporter, `${r.volume}.zip`))
  const entry = zip.getEntries().find((e) => e.entryName === r.entry)
  if (!entry) throw new Error(`Entry ${r.entry} not found in ${r.reporter}/${r.volume}.zip`)
  const doc = JSON.parse(entry.getData().toString("utf8")) as {
    casebody?: { opinions?: { text?: string }[] }
  }
  return (doc.casebody?.opinions ?? [])
    .map((o) => o.text ?? "")
    .filter((t) => t.length > 0)
    .join("\n\n")
}

/** Wrap every 3rd word in a <span class="word"> tag and bookend with <p>. */
const toHtml = (text: string): string => {
  let count = 0
  const wrapped = text.replace(/\b(\w+)\b/g, (m) => {
    count++
    return count % 3 === 0 ? `<span class="word">${m}</span>` : m
  })
  return `<html><body><p>${wrapped}</p></body></html>`
}

for (const repro of REPROS) {
  console.log("\n=====================================================")
  console.log(`  ${repro.label}`)
  console.log("=====================================================")

  const plain = loadOpinion(repro)
  const text = repro.variant === "html" ? toHtml(plain) : plain
  const cites = extractCitations(text) as Citation[]

  console.log(`text length:        ${text.length}`)
  console.log(`citations extracted: ${cites.length}`)

  const orphans: { c: Citation; slice: string }[] = []
  for (const c of cites) {
    const sp = c.span
    const slice = text.slice(sp.originalStart, sp.originalEnd)
    const zero = sp.originalEnd === sp.originalStart
    const mismatch = slice.replace(/\s+/g, " ").trim() !== c.matchedText.replace(/\s+/g, " ").trim()
    const tagsInSlice = /<[^>]+>/.test(slice)
    // Loose mismatch: ignore tag-only differences
    const looseSlice = slice.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
    const looseMatch = looseSlice === c.matchedText.replace(/\s+/g, " ").trim()
    if (zero || (!looseMatch && !tagsInSlice)) {
      orphans.push({ c, slice })
    }
  }

  console.log(`broken citations:   ${orphans.length} (${((orphans.length / Math.max(1, cites.length)) * 100).toFixed(1)}%)`)
  if (orphans.length > 0) {
    // Group by originalStart to identify collapse points
    const byOrigStart = new Map<number, number>()
    for (const o of orphans) {
      const k = o.c.span.originalStart
      byOrigStart.set(k, (byOrigStart.get(k) ?? 0) + 1)
    }
    const sortedPoints = [...byOrigStart.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    console.log("\n  collapse points (top 5):")
    for (const [pos, count] of sortedPoints) {
      console.log(`    originalStart=${pos} count=${count}`)
    }
    console.log("\n  examples:")
    for (const o of orphans.slice(0, 6)) {
      console.log(`    [${o.c.type}] matchedText=${JSON.stringify(o.c.matchedText.slice(0, 60))}`)
      console.log(`        clean=[${o.c.span.cleanStart},${o.c.span.cleanEnd}) original=[${o.c.span.originalStart},${o.c.span.originalEnd})`)
      console.log(`        slice=${JSON.stringify(o.slice.slice(0, 80))}`)
    }
  }
}
