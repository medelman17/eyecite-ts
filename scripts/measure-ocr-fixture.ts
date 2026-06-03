/**
 * Measure shipped-parser behavior on the verbatim raw OCR fixture (#810).
 *
 * Run:  pnpm exec tsx scripts/measure-ocr-fixture.ts
 *
 * Step 1 — INTEGRITY: each sample carries `sha` = the replica's server-side
 *   md5() of the exact `text`. We recompute md5(text) locally and require an
 *   exact match, which proves the fixture text is byte-identical to the source
 *   (no in-transit normalization). If any sample mismatches, the measurement
 *   below is NOT trustworthy — re-pull that id from the replica.
 * Step 2 — MEASURE: run extractCitations + computeBracketScopes on the raw
 *   text, per arm (ocr=ocr_status 1, native=ocr_status 2), reporting citation
 *   recall, the `balanceOk`-failure rate (#820's degrade-to-soft trigger rate),
 *   and in-parenthetical depth.
 */
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { extractCitations } from "../src/index"
import { computeBracketScopes } from "../src/utils/parentheticalScope"

interface Sample {
  arm: string
  id: number
  ocr_status: number
  sha: string
  text: string
}
const fixture = JSON.parse(
  readFileSync(new URL("../tests/fixtures/courtlistener-ocr-sample.json", import.meta.url), "utf8"),
) as { samples: Sample[] }
const samples = fixture.samples

// Step 1: byte-fidelity.
let match = 0
const mismatches: number[] = []
for (const s of samples) {
  const got = createHash("md5").update(s.text, "utf8").digest("hex")
  if (got === s.sha) match++
  else {
    mismatches.push(s.id)
    console.error(`  SHA MISMATCH id=${s.id}: stored ${s.sha} != local ${got}`)
  }
}
console.log(`integrity: ${match}/${samples.length} md5 verified${mismatches.length ? ` — MISMATCH ${mismatches.join(",")}` : " ✓"}`)

// Step 2: measurement (per arm).
interface Acc {
  docs: number
  cites: number
  balFail: number
  depthPos: number
  parens: number
  idSupra: number
  resolved: number
}
const acc: Record<string, Acc> = {}
const PAREN = /\(\s*(quoting|citing|noting|holding)/gi
for (const s of samples) {
  const a = (acc[s.arm] ??= { docs: 0, cites: 0, balFail: 0, depthPos: 0, parens: 0, idSupra: 0, resolved: 0 })
  a.docs++
  a.parens += (s.text.match(PAREN) ?? []).length
  const cites = extractCitations(s.text)
  a.cites += cites.length
  const scopes = computeBracketScopes(s.text, cites)
  a.balFail += scopes.filter((x) => !x.balanceOk).length
  a.depthPos += scopes.filter((x) => x.depth > 0).length
  for (const c of extractCitations(s.text, { resolve: true }) as Array<{
    type: string
    resolution?: { resolvedTo?: number }
  }>) {
    if (c.type === "id" || c.type === "supra") {
      a.idSupra++
      if (c.resolution?.resolvedTo !== undefined) a.resolved++
    }
  }
}

const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(0)}%` : "—")
console.log("\narm\tdocs\tparens\tcites\tcites/doc\tbalFail\tbalFail%\tdepth>0\tid+supra(res)")
for (const [arm, a] of Object.entries(acc)) {
  console.log(
    [arm, a.docs, a.parens, a.cites, (a.cites / a.docs).toFixed(1), a.balFail, pct(a.balFail, a.cites),
      a.depthPos, `${a.idSupra}(${a.resolved})`].join("\t"),
  )
}
