import { describe, expect, it } from "vitest"
import { computeEce, matchPredictionsToGold } from "@/score/eval"
import type { Citation } from "@/types/citation"

describe("computeEce", () => {
  it("returns 0 for perfectly-calibrated predictions", () => {
    const samples = [
      { score: 0.1, correct: false },
      { score: 0.1, correct: false },
      { score: 0.5, correct: true },
      { score: 0.5, correct: false },
      { score: 0.9, correct: true },
      { score: 0.9, correct: true },
    ]
    expect(computeEce(samples, 3)).toBeCloseTo(0.05, 1) // very small for tiny sample
  })

  it("returns high ECE for badly-calibrated predictions", () => {
    // Predicted 0.9 everywhere; actual precision 0.0
    const samples = Array(10).fill({ score: 0.9, correct: false })
    expect(computeEce(samples, 3)).toBeCloseTo(0.9, 1)
  })

  it("returns 0 for empty input", () => {
    expect(computeEce([], 10)).toBe(0)
  })
})

describe("matchPredictionsToGold", () => {
  it("matches when IoU >= 0.8 and type matches", () => {
    const pred = {
      type: "case",
      span: { originalStart: 10, originalEnd: 30, cleanStart: 10, cleanEnd: 30 },
    } as Citation
    const gold = [{ spanStart: 10, spanEnd: 30, type: "case" as const }]
    expect(matchPredictionsToGold([pred], gold)[0].correct).toBe(true)
  })

  it("does not match when type differs even with full overlap", () => {
    const pred = {
      type: "case",
      span: { originalStart: 10, originalEnd: 30, cleanStart: 10, cleanEnd: 30 },
    } as Citation
    const gold = [{ spanStart: 10, spanEnd: 30, type: "statute" as const }]
    expect(matchPredictionsToGold([pred], gold)[0].correct).toBe(false)
  })

  it("does not match when IoU < 0.8", () => {
    const pred = {
      type: "case",
      span: { originalStart: 10, originalEnd: 50, cleanStart: 10, cleanEnd: 50 },
    } as Citation
    // pred 10..50, gold 30..70 → intersect 30..50 = 20; union 10..70 = 60; IoU = 0.33
    const gold = [{ spanStart: 30, spanEnd: 70, type: "case" as const }]
    expect(matchPredictionsToGold([pred], gold)[0].correct).toBe(false)
  })
})
