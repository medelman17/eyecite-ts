/**
 * Issue #800: opt-in abstention threshold for `Id.`. `resolveId` downgrades
 * confidence and warns when the prose before `Id.` names a different case than
 * the chosen antecedent, but always commits. `resolveSupra` abstains below
 * `partyMatchThreshold`; `Id.` had no equivalent. `idConfidenceFloor` lets
 * callers make `Id.` fail closed below a confidence floor. Default: unchanged.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import type { ResolvedCitation } from "@/resolve/types"

const AMBIGUOUS =
  "Smith v. Jones, 100 U.S. 1. Brown v. Green, 200 U.S. 2. " +
  "The Smith court held otherwise. Id. at 5."

const idOf = (cites: ResolvedCitation[]) => cites.find((c) => c.type === "id")!

describe("Issue #800: idConfidenceFloor opt-in abstention for Id.", () => {
  it("default (no floor): commits the ambiguous antecedent at 0.75 with a warning", () => {
    const id = idOf(extractCitations(AMBIGUOUS, { resolve: true }) as ResolvedCitation[])
    expect(id.resolution?.resolvedTo).toBe(1) // Brown v. Green (Rule 4.1 immediate)
    expect(id.resolution?.confidence).toBeCloseTo(0.75)
    expect(id.resolution?.warnings?.[0]).toMatch(/Ambiguous Id\. antecedent/)
  })

  it("floor above the confidence: abstains (resolvedTo undefined) but keeps the warning", () => {
    const id = idOf(
      extractCitations(AMBIGUOUS, {
        resolve: true,
        resolutionOptions: { idConfidenceFloor: 0.8 },
      }) as ResolvedCitation[],
    )
    expect(id.resolution?.resolvedTo).toBeUndefined()
    expect(id.resolution?.failureReason).toMatch(/idConfidenceFloor/)
    expect(id.resolution?.warnings?.[0]).toMatch(/Ambiguous Id\. antecedent/)
  })

  it("floor below the confidence: still commits", () => {
    const id = idOf(
      extractCitations(AMBIGUOUS, {
        resolve: true,
        resolutionOptions: { idConfidenceFloor: 0.5 },
      }) as ResolvedCitation[],
    )
    expect(id.resolution?.resolvedTo).toBe(1)
  })

  it("floor does not affect an unambiguous Id. (confidence 1.0)", () => {
    const id = idOf(
      extractCitations("Smith v. Jones, 100 U.S. 1. Id. at 5.", {
        resolve: true,
        resolutionOptions: { idConfidenceFloor: 0.9 },
      }) as ResolvedCitation[],
    )
    expect(id.resolution?.resolvedTo).toBe(0)
  })
})
