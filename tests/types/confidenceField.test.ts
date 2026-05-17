import { describe, expectTypeOf, it } from "vitest"
import type { Confidence } from "@/score/types"
import type { CitationBase } from "@/types/citation"

describe("CitationBase.confidence is the new struct", () => {
  it("confidence is typed as Confidence", () => {
    expectTypeOf<CitationBase["confidence"]>().toEqualTypeOf<Confidence>()
  })
})
