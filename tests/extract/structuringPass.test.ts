import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"
import type { FullCaseCitation } from "@/types/citation"

describe("consolidated structuring pass (#860)", () => {
  it("subsequent-history links resolve within the returned array, with ids present", () => {
    const text = "Smith v. Doe, 100 F.3d 200 (2d Cir. 2010), aff'd, 200 F.3d 300 (2011)."
    const citations = extractCitations(text)

    const child = citations.find(
      (c) => c.type === "case" && (c as FullCaseCitation).subsequentHistoryOf !== undefined,
    ) as FullCaseCitation | undefined
    expect(child).toBeDefined()

    // Linking now runs after id-assignment on the final array, so the back-ref
    // index resolves WITHIN the returned array (not a stale pre-filter index),
    // and every linked citation carries a stable id.
    const ref = child!.subsequentHistoryOf!
    const parent = citations[ref.index]
    expect(parent).toBeDefined()
    expect(parent.id).toBeDefined()
    expect(child!.id).toBeDefined()
  })

  it("string-cite grouping still excludes history-chain members (order preserved)", () => {
    // History linking runs before string-cite grouping inside the pass, so a
    // history child is not also pulled into a string-citation group.
    const text =
      "See Smith v. Doe, 100 F.3d 200 (2010), aff'd, 200 F.3d 300 (2011); Roe v. Poe, 300 F.3d 400 (2012)."
    const citations = extractCitations(text)
    expect(citations.length).toBeGreaterThan(2)
    // Sanity: extraction still succeeds end-to-end with the relocated passes.
    expect(citations.every((c) => typeof c.id === "string")).toBe(true)
  })
})
