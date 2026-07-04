import { describe, expect, it } from "vitest"
import { byId, extractCitations } from "@/index"

describe("citation identity (#856)", () => {
  it("assigns a unique, non-empty id to every extracted citation", () => {
    const text = "500 F.2d 123. 42 U.S.C. § 1983. 100 Harv. L. Rev. 1234."
    const citations = extractCitations(text)

    expect(citations.length).toBeGreaterThan(1)

    const ids = citations.map((c) => c.id)
    // Every citation carries a non-empty string id.
    expect(ids.every((id) => typeof id === "string" && id.length > 0)).toBe(true)
    // Ids are unique within the result set.
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("assigns deterministic ids across repeated extractions of the same text", () => {
    const text = "500 F.2d 123. 42 U.S.C. § 1983."
    const a = extractCitations(text).map((c) => c.id)
    const b = extractCitations(text).map((c) => c.id)

    expect(a).toEqual(b)
    expect(a[0]).toBe("c0")
  })

  it("byId() maps every result citation by its id, and works on a filtered subset", () => {
    const text = "500 F.2d 123. 42 U.S.C. § 1983. 100 Harv. L. Rev. 1234."
    const citations = extractCitations(text)

    const map = byId(citations)
    for (const c of citations) {
      expect(map.get(c.id!)).toBe(c)
    }

    // Ids are stable handles — a filtered subset still keys correctly,
    // unlike array position.
    const subset = citations.filter((_, i) => i !== 0)
    const subsetMap = byId(subset)
    expect(subsetMap.size).toBe(subset.length)
    expect(subsetMap.get(citations[1].id!)).toBe(citations[1])
  })
})
