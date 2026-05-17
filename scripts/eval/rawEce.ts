/**
 * Reports raw (uncalibrated) ECE per pattern from the labeled test corpora.
 * Run via `pnpm eval:raw-ece`. Provides the baseline that Phase 3 calibration
 * is supposed to improve.
 *
 * NOTE: This works in Phase 1 by reading `c.confidence` (the legacy number).
 * Phase 2 will need to update it to read `c.confidence.score`.
 */

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { extractCitations } from "@/extract/extractCitations"
import { computeEce, type EceSample, matchPredictionsToGold } from "@/score/eval"

interface CorpusSample {
  id?: string
  text: string
  expected?: Array<{
    spanStart?: number
    spanEnd?: number
    type?: string
    [k: string]: unknown
  }>
}

function loadCorpus(path: string): CorpusSample[] {
  const raw = JSON.parse(readFileSync(resolve(path), "utf-8")) as
    | CorpusSample[]
    | { samples: CorpusSample[] }
  return Array.isArray(raw) ? raw : (raw.samples ?? [])
}

function main() {
  const corpora = [
    "tests/fixtures/golden-corpus.json",
    "tests/fixtures/expanded-corpus.json",
    "tests/fixtures/thorny-corpus.json",
    "tests/fixtures/statute-corpus.json",
  ]
  const perPattern = new Map<string, EceSample[]>()
  let totalSamples = 0

  for (const path of corpora) {
    const samples = loadCorpus(path)
    for (const sample of samples) {
      if (!sample.expected || !sample.text) continue
      const gold = sample.expected
        .filter(
          (e) =>
            typeof e.spanStart === "number" &&
            typeof e.spanEnd === "number" &&
            typeof e.type === "string",
        )
        .map((e) => ({
          spanStart: e.spanStart!,
          spanEnd: e.spanEnd!,
          type: e.type as ReturnType<typeof extractCitations>[number]["type"],
        }))
      if (gold.length === 0) continue
      const preds = extractCitations(sample.text)
      const matched = matchPredictionsToGold(preds, gold)
      for (const m of matched) {
        const patternId = (m.prediction as { patternsChecked?: number; type: string }).type
        // Phase 1: read legacy number field
        const score = (m.prediction as unknown as { confidence: number }).confidence
        if (!perPattern.has(patternId)) perPattern.set(patternId, [])
        perPattern.get(patternId)!.push({ score, correct: m.correct })
        totalSamples++
      }
    }
  }

  console.log(`\n=== Raw ECE (uncalibrated) — ${totalSamples} samples ===\n`)
  const rows: Array<{ pattern: string; n: number; ece: number }> = []
  for (const [pattern, samples] of perPattern) {
    rows.push({
      pattern,
      n: samples.length,
      ece: computeEce(samples, Math.min(10, samples.length)),
    })
  }
  rows.sort((a, b) => b.n - a.n)
  console.log("Pattern               N    ECE")
  console.log("-".repeat(40))
  for (const r of rows) {
    console.log(`${r.pattern.padEnd(20)} ${String(r.n).padStart(4)}   ${r.ece.toFixed(3)}`)
  }
  const allSamples = rows.flatMap((r) => perPattern.get(r.pattern)!)
  console.log("-".repeat(40))
  console.log(
    `OVERALL              ${String(allSamples.length).padStart(4)}   ${computeEce(allSamples, 10).toFixed(3)}`,
  )
}

main()
