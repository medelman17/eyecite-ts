import { deriveLevel } from "@/score/level"
import type { Confidence } from "@/score/types"

/**
 * Build a minimal Confidence struct for test fixtures.
 *
 * Use this anywhere a test fixture previously set `confidence: 0.X` on a
 * citation. Derives level from the score and fills axes/reasons with sensible
 * defaults so the resulting object satisfies the Confidence contract without
 * needing the full feature/calibration pipeline.
 */
export function fakeConfidence(score: number): Confidence {
  return {
    score,
    level: deriveLevel(score),
    axes: { extraction: score, metadata: 1.0 },
    reasons: [],
  }
}
