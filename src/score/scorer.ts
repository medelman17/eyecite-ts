/**
 * scoreCitation — orchestrator that turns ExtractionFeatures (+ optional
 * ResolutionFeatures) into a complete Confidence struct.
 *
 *   features → axes → calibrated score → level → reasons
 */

import { computeAxes } from "./axes"
import { calibrate } from "./calibrate"
import type { ExtractionFeatures, ResolutionFeatures } from "./features"
import { deriveLevel } from "./level"
import { collectReasonCodes } from "./reasons"
import type { Confidence, Explanation } from "./types"

export interface ScoreOptions {
  explain?: boolean
}

function compositeScore(extraction: number, resolution: number | undefined): number {
  if (resolution === undefined) return extraction
  return Math.round(extraction * resolution * 100) / 100
}

function buildExplanation(
  f: ExtractionFeatures,
  r: ResolutionFeatures | undefined,
  axes: { extraction: number; metadata: number; resolution?: number },
  score: number,
): Explanation {
  const details: Explanation[] = [
    {
      value: axes.extraction,
      description: `extraction axis (pattern: ${f.patternId})`,
    },
    {
      value: axes.metadata,
      description:
        f.type === "case"
          ? `metadata axis (${(f as Extract<ExtractionFeatures, { type: "case" }>).metadataPopulated}/${(f as Extract<ExtractionFeatures, { type: "case" }>).metadataExpected} fields populated)`
          : `metadata axis`,
    },
  ]
  if (r && axes.resolution !== undefined) {
    details.push({
      value: axes.resolution,
      description: `resolution axis (pattern: ${r.patternId}, similarity=${r.similarity.toFixed(2)}${r.windowMismatch ? ", window-mismatch" : ""})`,
    })
  }
  return {
    value: score,
    description: `composite confidence for ${f.type}`,
    details,
  }
}

export function scoreCitation(
  features: ExtractionFeatures,
  resolution?: ResolutionFeatures,
  options: ScoreOptions = {},
): Confidence {
  const axes = computeAxes(features, resolution)
  const calibratedExtraction = calibrate(axes.extraction, features.patternId)
  const score = compositeScore(calibratedExtraction, axes.resolution)
  const reasons = collectReasonCodes(features, resolution)
  const confidence: Confidence = {
    score,
    level: deriveLevel(score),
    axes: { ...axes, extraction: calibratedExtraction },
    reasons,
  }
  if (options.explain) {
    confidence.explanation = buildExplanation(features, resolution, confidence.axes, score)
  }
  return confidence
}
