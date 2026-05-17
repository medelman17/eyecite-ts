import type { ConfidenceLevel } from "./types"

export function deriveLevel(score: number): ConfidenceLevel {
  if (score >= 0.95) return "certain"
  if (score >= 0.8) return "high"
  if (score >= 0.5) return "medium"
  return "low"
}
