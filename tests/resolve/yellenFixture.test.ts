import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { Citation, IdCitation, ShortFormCaseCitation } from "@/types/citation"

describe("Yellen / Leach end-to-end (bug report 2026-05-19)", () => {
  // The actual passage from the user's brief (HOA-adverse-possession context).
  const text = `Leach v. Anderl, 218 N.J. Super. 18, 30–31 (App. Div. 1987). In Yellen v. Kassin, the Appellate Division squarely held that where neighbors shared a driveway traversing both properties without objection, the use was "not recognized by the law as hostile to the property rights of the other, but [was] at all times permissive in character and subject to alteration as the needs of both neighbors changed over time." Yellen, 416 N.J. Super. at 590–91, 3 A.3d at 590–91. The court reversed the trial court's finding of mutual prescriptive easements, holding that the evidence "does not establish that the use of the driveways was hostile in the sense that either party considered use of the other's driveway under a claim of right with the intent to claim an interest in the other's property." Id. at 590.`

  it("Id. at 590 does NOT resolve to Leach (the user-reported bug)", () => {
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c): c is IdCitation => c.type === "id")
    expect(id).toBeDefined()
    // The bug: id.resolution.resolvedTo used to point at Leach (idx 0).
    // After this PR, resolvedTo is undefined (no full Yellen citation
    // in the array — Yellen's name lives in prose).
    expect(id?.resolution?.resolvedTo).toBeUndefined()
  })

  it("Yellen short-form has inferredCaseName from prose", () => {
    const cites = extractCitations(text, { resolve: true })
    const yellenShort = cites.find(
      (c): c is ShortFormCaseCitation => c.type === "shortFormCase" && c.partyName === "Yellen",
    )
    expect(yellenShort).toBeDefined()
    expect(yellenShort?.inferredCaseName).toBe("Yellen v. Kassin")
  })

  it("Id. clusters with the parallel short-form via antecedentIndex", () => {
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c): c is IdCitation => c.type === "id")
    expect(id?.resolution?.antecedentIndex).toBeDefined()

    // Walk: Id → parallel (3 A.3d) → Yellen short → ... → eventually
    // reaches the enriched short-form with inferredCaseName.
    let cur: number | undefined = id?.resolution?.antecedentIndex
    let foundInferred: string | undefined
    const visited = new Set<number>()
    while (cur !== undefined && !visited.has(cur)) {
      visited.add(cur)
      const c = cites[cur] as Citation & {
        resolution?: { antecedentIndex?: number }
        inferredCaseName?: string
      }
      if (c.inferredCaseName) {
        foundInferred = c.inferredCaseName
        break
      }
      cur = c.resolution?.antecedentIndex
    }
    expect(foundInferred).toBe("Yellen v. Kassin")
  })
})
