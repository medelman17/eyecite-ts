/**
 * Demo: Extract citations from a real Supreme Court opinion
 *
 * Fetches Planned Parenthood v. Casey (505 U.S. 833) from Cornell LII
 * and runs the eyecite-ts extraction pipeline on the raw HTML.
 *
 * Run: npx tsx scripts/demo-real-opinion.ts
 */

import { extractCitations } from "../src/index"
import type { Citation, ResolvedCitation } from "../src/index"

const OPINION_URL = "https://www.law.cornell.edu/supct/html/91-744.ZO.html"

function formatCitation(c: Citation | ResolvedCitation, index: number): string {
  const lines: string[] = []
  const resolved: ResolvedCitation = 'resolution' in c ? c : { ...c, resolution: undefined }

  lines.push(`  [${index + 1}] ${c.type.toUpperCase()} — "${c.matchedText}"`)

  switch (c.type) {
    case "case":
      lines.push(`       ${c.volume} ${c.reporter} ${c.page}`)
      if (c.court) lines.push(`       Court: ${c.court}`)
      if (c.year) lines.push(`       Year: ${c.year}`)
      if (c.pincite) lines.push(`       Pincite: ${c.pincite}`)
      break
    case "statute":
      lines.push(`       ${c.title ? c.title + " " : ""}${c.code} § ${c.section}`)
      break
    case "journal":
      lines.push(`       ${c.volume ?? ""} ${c.abbreviation} ${c.page ?? ""}`.trim())
      if (c.year) lines.push(`       Year: ${c.year}`)
      break
    case "neutral":
      lines.push(`       ${c.year} ${c.court} ${c.documentNumber}`)
      break
    case "publicLaw":
      lines.push(`       Pub. L. No. ${c.congress}-${c.lawNumber}`)
      break
    case "federalRegister":
      lines.push(`       ${c.volume} Fed. Reg. ${c.page}`)
      break
    case "id":
      lines.push(`       Id.${c.pincite ? ` at ${c.pincite}` : ""}`)
      break
    case "supra":
      lines.push(`       ${c.partyName}, supra${c.pincite ? `, at ${c.pincite}` : ""}`)
      break
    case "shortFormCase":
      lines.push(`       ${c.volume} ${c.reporter}${c.pincite ? ` at ${c.pincite}` : ""}`)
      break
  }

  lines.push(`       Confidence: ${(c.confidence * 100).toFixed(0)}%  |  Position: ${c.span.originalStart}–${c.span.originalEnd}`)

  if (resolved.resolution) {
    const r = resolved.resolution
    if (r.resolvedTo !== undefined) {
      lines.push(`       → Resolved to citation #${r.resolvedTo + 1} (confidence: ${(r.confidence * 100).toFixed(0)}%)`)
    } else if (r.failureReason) {
      lines.push(`       → Unresolved: ${r.failureReason}`)
    }
  }

  return lines.join("\n")
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════════╗")
  console.log("║  eyecite-ts — Real-World Citation Extraction Demo             ║")
  console.log("║  Planned Parenthood v. Casey, 505 U.S. 833 (1992)            ║")
  console.log("╚════════════════════════════════════════════════════════════════╝")
  console.log()

  // Fetch the opinion HTML
  console.log(`Fetching opinion from ${OPINION_URL} ...`)
  const fetchStart = performance.now()
  const response = await fetch(OPINION_URL)
  if (!response.ok) {
    console.error(`Failed to fetch: ${response.status} ${response.statusText}`)
    process.exit(1)
  }
  const html = await response.text()
  const fetchMs = performance.now() - fetchStart
  console.log(`Fetched ${(html.length / 1024).toFixed(1)} KB in ${fetchMs.toFixed(0)} ms`)
  console.log()

  // Extract without resolution
  console.log("━━━ Extracting citations (no resolution) ━━━")
  const extractStart = performance.now()
  const citations = extractCitations(html)
  const extractMs = performance.now() - extractStart
  console.log(`Found ${citations.length} citations in ${extractMs.toFixed(1)} ms`)
  console.log()

  // Summary by type
  const typeCounts = new Map<string, number>()
  for (const c of citations) {
    typeCounts.set(c.type, (typeCounts.get(c.type) ?? 0) + 1)
  }

  console.log("Summary by type:")
  const typeOrder = ["case", "statute", "journal", "neutral", "publicLaw", "federalRegister", "id", "supra", "shortFormCase"]
  for (const t of typeOrder) {
    const count = typeCounts.get(t)
    if (count) console.log(`  ${t.padEnd(18)} ${count}`)
  }
  console.log()

  // Show first 25 citations in detail
  const showCount = Math.min(25, citations.length)
  console.log(`━━━ First ${showCount} citations (detailed) ━━━`)
  for (let i = 0; i < showCount; i++) {
    console.log(formatCitation(citations[i], i))
  }
  if (citations.length > showCount) {
    console.log(`  ... and ${citations.length - showCount} more`)
  }
  console.log()

  // Extract with resolution
  console.log("━━━ Extracting with resolution ━━━")
  const resolveStart = performance.now()
  const resolved = extractCitations(html, {
    resolve: true,
    resolutionOptions: { scopeStrategy: "none" },
  })
  const resolveMs = performance.now() - resolveStart
  console.log(`Resolved ${resolved.length} citations in ${resolveMs.toFixed(1)} ms`)

  const resolvedCount = resolved.filter((c) => c.resolution?.resolvedTo !== undefined).length
  const unresolvedCount = resolved.filter((c) => c.resolution && c.resolution.resolvedTo === undefined).length
  const fullCount = resolved.filter((c) => !c.resolution).length
  console.log(`  Full citations: ${fullCount}`)
  console.log(`  Resolved short-forms: ${resolvedCount}`)
  console.log(`  Unresolved short-forms: ${unresolvedCount}`)
  console.log()

  // Show some resolved short-form citations
  const resolvedShortForms = resolved.filter((c) => c.resolution?.resolvedTo !== undefined)
  const showResolved = Math.min(10, resolvedShortForms.length)
  if (showResolved > 0) {
    console.log(`━━━ Sample resolved short-form citations (${showResolved} of ${resolvedShortForms.length}) ━━━`)
    for (let i = 0; i < showResolved; i++) {
      const c = resolvedShortForms[i]
      const antecedent = resolved[c.resolution!.resolvedTo!]
      console.log(formatCitation(c, resolved.indexOf(c)))
      console.log(`       ↳ Antecedent: "${antecedent.matchedText}"`)
    }
  }

  console.log()
  console.log("Done.")
}

main().catch((err) => {
  console.error("Error:", err)
  process.exit(1)
})
