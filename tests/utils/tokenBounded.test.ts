import { describe, expect, it } from "vitest"
import { tokenBoundedIndexes } from "@/utils/tokenBounded"

describe("tokenBoundedIndexes", () => {
  it("finds a standalone occurrence", () => {
    expect(tokenBoundedIndexes("see Id. here", "Id.")).toEqual([4])
  })

  it("rejects a needle glued inside a longer word", () => {
    // "Id." occurs inside "gridId." but is glued to a leading word char.
    expect(tokenBoundedIndexes("the gridId. value", "Id.")).toEqual([])
  })

  it("finds every non-overlapping occurrence in document order", () => {
    expect(tokenBoundedIndexes("Id. x Id. y Id.", "Id.")).toEqual([0, 6, 12])
  })

  it("treats a non-word leading edge as always bounded", () => {
    // Needle starts with "§" (non-word), so its left edge needs no boundary
    // even when preceded by a word char.
    expect(tokenBoundedIndexes("x§ 1 y", "§ 1")).toEqual([1])
  })

  it("returns empty for an empty needle", () => {
    expect(tokenBoundedIndexes("anything", "")).toEqual([])
  })
})
