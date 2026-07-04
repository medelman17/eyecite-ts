import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"
import type { FullCaseCitation } from "@/types/citation"

const CHAIN_TEXT =
  "Smith v. Doe, 100 F.3d 200 (2d Cir. 2010), aff'd, 200 F.3d 300 (2d Cir. 2011)."

describe("HistoryChain (#849)", () => {
  it("sets subsequentHistoryOf.priorId to the parent's stable id", () => {
    const citations = extractCitations(CHAIN_TEXT)
    const child = citations.find(
      (c) => c.type === "case" && (c as FullCaseCitation).subsequentHistoryOf !== undefined,
    ) as FullCaseCitation | undefined
    expect(child).toBeDefined()

    const ref = child!.subsequentHistoryOf!
    // id-based parent reference, alongside the retained numeric index
    expect(ref.priorId).toBe(citations[ref.index].id)
  })

  it("builds an ordered historyChain (root → latest) shared by chain members", () => {
    const citations = extractCitations(CHAIN_TEXT)
    const cases = citations.filter((c) => c.type === "case") as FullCaseCitation[]
    const root = cases.find((c) => c.volume === 100)
    const affirmed = cases.find((c) => c.volume === 200)
    expect(root).toBeDefined()
    expect(affirmed).toBeDefined()

    // Both members carry the same ordered chain.
    expect(root!.historyChain).toBeDefined()
    expect(affirmed!.historyChain).toBeDefined()

    const chain = affirmed!.historyChain!
    expect(chain.links.map((l) => l.citationId)).toEqual([root!.id, affirmed!.id])
    expect(chain.links[0].signal).toBeUndefined() // root has no inbound signal
    expect(chain.links[1].signal).toBe("affirmed")
  })

  it("history links survive a consumer filter/reorder (id-keyed)", () => {
    const citations = extractCitations(CHAIN_TEXT)
    const reordered = [...citations].reverse()
    const child = reordered.find(
      (c) => c.type === "case" && (c as FullCaseCitation).subsequentHistoryOf?.priorId,
    ) as FullCaseCitation | undefined
    expect(child).toBeDefined()
    // priorId still resolves against the reordered array via id, not position.
    const parent = reordered.find((c) => c.id === child!.subsequentHistoryOf!.priorId)
    expect(parent).toBeDefined()
    expect((parent as FullCaseCitation).volume).toBe(100)
  })
})
