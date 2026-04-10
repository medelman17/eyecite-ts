import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"

function expectSpan(text: string, span: { originalStart: number; originalEnd: number } | undefined, expected: string) {
  expect(span).toBeDefined()
  expect(text.substring(span!.originalStart, span!.originalEnd)).toBe(expected)
}

describe("Component Spans — Case Core", () => {
  it("tracks volume, reporter, page spans", () => {
    const text = "See 500 F.2d 123 (2020)."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "case")
    expect(c).toBeDefined()
    if (c?.type !== "case") return

    expectSpan(text, c.spans?.volume, "500")
    expectSpan(text, c.spans?.reporter, "F.2d")
    expectSpan(text, c.spans?.page, "123")
  })

  it("tracks pincite span from comma-separated page", () => {
    const text = "See 500 F.2d 123, 130 (2020)."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "case")
    expect(c).toBeDefined()
    if (c?.type !== "case") return

    expectSpan(text, c.spans?.pincite, "130")
  })

  it("handles blank page placeholder", () => {
    const text = "See 500 F.2d ___ (2020)."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "case")
    expect(c).toBeDefined()
    if (c?.type !== "case") return

    expectSpan(text, c.spans?.volume, "500")
    expectSpan(text, c.spans?.reporter, "F.2d")
    expectSpan(text, c.spans?.page, "___")
  })

  it("handles multi-word reporter", () => {
    const text = "See 456 F. Supp. 3d 789 (2020)."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "case")
    expect(c).toBeDefined()
    if (c?.type !== "case") return

    expectSpan(text, c.spans?.volume, "456")
    expectSpan(text, c.spans?.reporter, "F. Supp. 3d")
    expectSpan(text, c.spans?.page, "789")
  })
})
