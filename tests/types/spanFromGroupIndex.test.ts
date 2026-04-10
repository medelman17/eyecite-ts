import { describe, expect, it } from "vitest"
import { spanFromGroupIndex } from "@/types/span"
import type { TransformationMap } from "@/types/span"

/** Build a trivial TransformationMap where clean positions === original positions */
function identityMap(length: number): TransformationMap {
  const cleanToOriginal = new Map<number, number>()
  const originalToClean = new Map<number, number>()
  for (let i = 0; i <= length; i++) {
    cleanToOriginal.set(i, i)
    originalToClean.set(i, i)
  }
  return { cleanToOriginal, originalToClean }
}

describe("spanFromGroupIndex", () => {
  it("computes span for first capture group", () => {
    const map = identityMap(30)
    const span = spanFromGroupIndex(10, [0, 3], map)
    expect(span).toEqual({
      cleanStart: 10,
      cleanEnd: 13,
      originalStart: 10,
      originalEnd: 13,
    })
  })

  it("computes span for middle capture group", () => {
    const map = identityMap(30)
    const span = spanFromGroupIndex(10, [4, 8], map)
    expect(span).toEqual({
      cleanStart: 14,
      cleanEnd: 18,
      originalStart: 14,
      originalEnd: 18,
    })
  })

  it("computes span for last capture group", () => {
    const map = identityMap(30)
    const span = spanFromGroupIndex(10, [9, 12], map)
    expect(span).toEqual({
      cleanStart: 19,
      cleanEnd: 22,
      originalStart: 19,
      originalEnd: 22,
    })
  })

  it("resolves through TransformationMap with offset", () => {
    const map: TransformationMap = {
      cleanToOriginal: new Map([
        [5, 9],
        [8, 12],
      ]),
      originalToClean: new Map(),
    }
    const span = spanFromGroupIndex(5, [0, 3], map)
    expect(span.cleanStart).toBe(5)
    expect(span.cleanEnd).toBe(8)
    expect(span.originalStart).toBe(9)
    expect(span.originalEnd).toBe(12)
  })

  it("falls back to clean position when map entry missing", () => {
    const map: TransformationMap = {
      cleanToOriginal: new Map(),
      originalToClean: new Map(),
    }
    const span = spanFromGroupIndex(10, [0, 3], map)
    expect(span.originalStart).toBe(10)
    expect(span.originalEnd).toBe(13)
  })

  it("works end-to-end with actual d-flag regex execution", () => {
    const regex = /^(\d+)\s+([A-Za-z.\d]+)\s+(\d+)/d
    const text = "500 F.2d 123"
    const match = regex.exec(text)
    expect(match).not.toBeNull()
    expect(match!.indices).toBeDefined()

    const map = identityMap(30)
    const tokenCleanStart = 10

    const volumeSpan = spanFromGroupIndex(tokenCleanStart, match!.indices![1]!, map)
    expect(volumeSpan).toEqual({ cleanStart: 10, cleanEnd: 13, originalStart: 10, originalEnd: 13 })
    expect(text.substring(match!.indices![1]![0], match!.indices![1]![1])).toBe("500")

    const reporterSpan = spanFromGroupIndex(tokenCleanStart, match!.indices![2]!, map)
    expect(text.substring(match!.indices![2]![0], match!.indices![2]![1])).toBe("F.2d")
    expect(reporterSpan.cleanEnd - reporterSpan.cleanStart).toBe(4)

    const pageSpan = spanFromGroupIndex(tokenCleanStart, match!.indices![3]!, map)
    expect(text.substring(match!.indices![3]![0], match!.indices![3]![1])).toBe("123")
  })
})
