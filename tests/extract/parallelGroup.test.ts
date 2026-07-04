import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"
import type { FullCaseCitation } from "@/types/citation"

const PARALLEL_TEXT = "Roe v. Wade, 410 U.S. 113, 93 S. Ct. 705, 35 L. Ed. 2d 147 (1973)."

describe("ParallelGroup (#850)", () => {
  it("builds a parallelGroup with all member ids (doc order, incl. self), shared by members", () => {
    const citations = extractCitations(PARALLEL_TEXT)
    const group = citations.filter(
      (c) => c.type === "case" && (c as FullCaseCitation).groupId !== undefined,
    ) as FullCaseCitation[]
    expect(group.length).toBeGreaterThanOrEqual(2)

    const memberIds = group.map((c) => c.id)
    for (const c of group) {
      expect(c.parallelGroup).toBeDefined()
      expect(c.parallelGroup!.memberIds).toEqual(memberIds)
    }
  })

  it("parallelGroup survives a consumer reorder (id-keyed, not positional)", () => {
    const citations = extractCitations(PARALLEL_TEXT)
    const reordered = [...citations].reverse()
    const member = reordered.find(
      (c) => c.type === "case" && (c as FullCaseCitation).parallelGroup !== undefined,
    ) as FullCaseCitation | undefined
    expect(member).toBeDefined()
    for (const id of member!.parallelGroup!.memberIds) {
      expect(reordered.find((c) => c.id === id)).toBeDefined()
    }
  })
})
