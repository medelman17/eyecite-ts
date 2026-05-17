/**
 * Evaluation utilities — ECE computation and gold-match helpers.
 * Used by the calibration build script (Phase 3) and the raw-ECE harness (Phase 1).
 */

import type { Citation } from "@/types/citation"

export interface GoldCitation {
  spanStart: number
  spanEnd: number
  type: Citation["type"]
}

export interface MatchedSample {
  prediction: Citation
  correct: boolean
}

function iou(a: { start: number; end: number }, b: { start: number; end: number }): number {
  const intersect = Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start))
  const union = Math.max(a.end, b.end) - Math.min(a.start, b.start)
  return union === 0 ? 0 : intersect / union
}

export function matchPredictionsToGold(
  predictions: Citation[],
  gold: GoldCitation[],
  iouThreshold = 0.8,
): MatchedSample[] {
  return predictions.map((p) => {
    const predSpan = { start: p.span.originalStart, end: p.span.originalEnd }
    const correct = gold.some((g) => {
      if (g.type !== p.type) return false
      return iou(predSpan, { start: g.spanStart, end: g.spanEnd }) >= iouThreshold
    })
    return { prediction: p, correct }
  })
}

export interface EceSample {
  score: number
  correct: boolean
}

export function computeEce(samples: EceSample[], nBins = 10): number {
  if (samples.length === 0) return 0
  const sorted = [...samples].sort((a, b) => a.score - b.score)
  const binSize = Math.ceil(sorted.length / nBins)
  let totalGap = 0
  let totalWeight = 0
  for (let i = 0; i < sorted.length; i += binSize) {
    const chunk = sorted.slice(i, i + binSize)
    if (chunk.length === 0) continue
    const meanScore = chunk.reduce((s, x) => s + x.score, 0) / chunk.length
    const acc = chunk.filter((x) => x.correct).length / chunk.length
    totalGap += chunk.length * Math.abs(meanScore - acc)
    totalWeight += chunk.length
  }
  return totalWeight === 0 ? 0 : totalGap / totalWeight
}
