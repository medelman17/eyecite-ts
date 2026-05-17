import { describe, expectTypeOf, it } from "vitest"
import type { Confidence, ConfidenceLevel, Explanation, ReasonCode } from "@/score/types"

describe("score types", () => {
  it("ConfidenceLevel is a string literal union", () => {
    expectTypeOf<ConfidenceLevel>().toEqualTypeOf<"certain" | "high" | "medium" | "low">()
  })

  it("Confidence struct has expected fields", () => {
    const c: Confidence = {
      score: 0.85,
      level: "high",
      axes: { extraction: 0.85, metadata: 0.71 },
      reasons: ["known_reporter"],
    }
    expectTypeOf(c.score).toBeNumber()
    expectTypeOf(c.level).toEqualTypeOf<ConfidenceLevel>()
    expectTypeOf(c.axes.extraction).toBeNumber()
    expectTypeOf(c.axes.metadata).toBeNumber()
    expectTypeOf(c.axes.resolution).toEqualTypeOf<number | undefined>()
    expectTypeOf(c.reasons).toEqualTypeOf<ReasonCode[]>()
  })

  it("Explanation supports recursive nesting", () => {
    const e: Explanation = {
      value: 0.85,
      description: "outer",
      details: [{ value: 0.5, description: "inner" }],
    }
    expectTypeOf(e.details).toEqualTypeOf<Explanation[] | undefined>()
  })
})
