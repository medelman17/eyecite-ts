/**
 * Calibration shell — maps raw extraction-axis scores to calibrated probabilities
 * per pattern-id. Phase 1: empty table, all patterns get identity calibration.
 * Phase 3 (separate plan) populates the table from labeled-corpus fitting.
 */

export interface HistogramBin {
  min: number
  max: number
  calibrated: number
}

export interface HistogramCalibrator {
  kind: "histogram"
  bins: HistogramBin[]
}

export interface PlattCalibrator {
  kind: "platt"
  A: number
  B: number
}

export interface IdentityCalibrator {
  kind: "identity"
}

export type Calibrator = HistogramCalibrator | PlattCalibrator | IdentityCalibrator

export interface CalibrationTable {
  scorerVersion: string
  calibrators: Record<string, Calibrator>
}

const TABLE: CalibrationTable = {
  scorerVersion: "1.0",
  calibrators: {},
}

export function getCalibrationTable(): CalibrationTable {
  return TABLE
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

function applyHistogram(rawScore: number, c: HistogramCalibrator): number {
  for (const bin of c.bins) {
    if (rawScore <= bin.max) return bin.calibrated
  }
  return c.bins[c.bins.length - 1]?.calibrated ?? rawScore
}

function applyPlatt(rawScore: number, c: PlattCalibrator): number {
  return 1 / (1 + Math.exp(c.A * rawScore + c.B))
}

export function calibrate(rawScore: number, patternId: string): number {
  const c = TABLE.calibrators[patternId]
  if (!c || c.kind === "identity") return clamp01(rawScore)
  if (c.kind === "histogram") return clamp01(applyHistogram(rawScore, c))
  return clamp01(applyPlatt(rawScore, c))
}
