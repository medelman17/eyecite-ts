import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

type ResLike = {
  resolution?: {
    resolvedTo?: number
    resolvedToId?: string
    antecedentIndex?: number
    antecedentId?: string
  }
}

describe("resolution id-based references (#860)", () => {
  it("carries resolvedToId / antecedentId alongside the numeric indices", () => {
    const text = "Smith v. Doe, 100 F.3d 200 (2d Cir. 2010). Id. at 205."
    const citations = extractCitations(text, { resolve: true })

    const idCite = citations.find((c) => c.type === "id")
    expect(idCite).toBeDefined()

    const res = (idCite as ResLike).resolution
    expect(res?.resolvedTo).toBeDefined()

    // NEW (#860): id-based siblings resolve to the same citation the numeric
    // indices point at — and survive consumer filter/reorder.
    expect(res?.resolvedToId).toBe(citations[res!.resolvedTo!].id)
    expect(res?.antecedentId).toBe(citations[res!.antecedentIndex!].id)
  })
})
