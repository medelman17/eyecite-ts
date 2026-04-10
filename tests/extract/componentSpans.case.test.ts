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

describe("Component Spans — Case Name and Parties", () => {
  it("tracks caseName, plaintiff, defendant spans", () => {
    const text = "The court held in Smith v. Jones, 500 F.2d 123 (2020)."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "case")
    expect(c).toBeDefined()
    if (c?.type !== "case") return

    expectSpan(text, c.spans?.caseName, "Smith v. Jones")
    expectSpan(text, c.spans?.plaintiff, "Smith")
    expectSpan(text, c.spans?.defendant, "Jones")
  })

  it("tracks procedural prefix case name span", () => {
    const text = "See In re Debtor LLC, 612 B.R. 45 (2020)."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "case")
    expect(c).toBeDefined()
    if (c?.type !== "case") return

    expectSpan(text, c.spans?.caseName, "In re Debtor LLC")
  })
})

describe("Component Spans — Case Court and Year", () => {
  it("tracks court and year spans from parenthetical", () => {
    const text = "See 500 F.2d 123 (9th Cir. 2020)."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "case")
    expect(c).toBeDefined()
    if (c?.type !== "case") return

    expectSpan(text, c.spans?.court, "9th Cir.")
    expectSpan(text, c.spans?.year, "2020")
  })

  it("tracks metadataParenthetical span", () => {
    const text = "See 500 F.2d 123 (9th Cir. 2020)."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "case")
    expect(c).toBeDefined()
    if (c?.type !== "case") return

    expectSpan(text, c.spans?.metadataParenthetical, "(9th Cir. 2020)")
  })

  it("tracks court span for multi-word court", () => {
    const text = "See 456 F. Supp. 3d 789 (N.D. Cal. Jan. 15, 2020)."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "case")
    expect(c).toBeDefined()
    if (c?.type !== "case") return

    expectSpan(text, c.spans?.court, "N.D. Cal.")
  })
})

describe("Component Spans — Case Signal", () => {
  it("tracks signal span", () => {
    const text = "See also Smith v. Jones, 500 F.2d 123 (2020)."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "case")
    expect(c).toBeDefined()
    if (c?.type !== "case") return

    expectSpan(text, c.spans?.signal, "See also")
  })
})

describe("Component Spans — Parenthetical.span", () => {
  it("tracks explanatory parenthetical span", () => {
    const text = "See 500 F.2d 123 (9th Cir. 2020) (holding that due process requires notice)."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "case")
    expect(c).toBeDefined()
    if (c?.type !== "case") return

    expect(c.parentheticals).toBeDefined()
    expect(c.parentheticals!.length).toBeGreaterThan(0)
    const paren = c.parentheticals![0]
    expect(paren.span).toBeDefined()
    expectSpan(text, paren.span, "(holding that due process requires notice)")
  })
})
