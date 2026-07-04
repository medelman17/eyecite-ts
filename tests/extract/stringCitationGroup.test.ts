import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

const STRING_TEXT =
  "See Smith v. Doe, 100 F.3d 1 (2010); Roe v. Poe, 200 F.3d 2 (2011); Ada v. Cho, 300 F.3d 3 (2012)."

describe("StringCitationGroup (#857)", () => {
  it("builds a stringCitationGroup with all member ids (doc order, incl. self), shared by members", () => {
    const citations = extractCitations(STRING_TEXT)
    const group = citations.filter((c) => c.stringCitationGroupId !== undefined)
    expect(group.length).toBeGreaterThanOrEqual(2)

    const memberIds = group.map((c) => c.id)
    for (const c of group) {
      expect(c.stringCitationGroup).toBeDefined()
      expect(c.stringCitationGroup!.memberIds).toEqual(memberIds)
    }
  })

  it("stringCitationGroup survives a consumer reorder (id-keyed, not positional)", () => {
    const citations = extractCitations(STRING_TEXT)
    const reordered = [...citations].reverse()
    const member = reordered.find((c) => c.stringCitationGroup !== undefined)
    expect(member).toBeDefined()
    for (const id of member!.stringCitationGroup!.memberIds) {
      expect(reordered.find((c) => c.id === id)).toBeDefined()
    }
  })
})
