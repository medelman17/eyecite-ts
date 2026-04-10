import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"

function expectSpan(
  text: string,
  span: { originalStart: number; originalEnd: number } | undefined,
  expected: string,
) {
  expect(span).toBeDefined()
  expect(text.substring(span!.originalStart, span!.originalEnd)).toBe(expected)
}

describe("Component Spans — Federal Statute (USC)", () => {
  it("tracks title, code, section spans", () => {
    const text = "See 42 U.S.C. § 1983."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "statute")
    expect(c).toBeDefined()
    if (c?.type !== "statute") return

    expectSpan(text, c.spans?.title, "42")
    expectSpan(text, c.spans?.code, "U.S.C.")
    expectSpan(text, c.spans?.section, "1983")
  })

  it("tracks subsection span", () => {
    const text = "See 42 U.S.C. § 1983(a)(1)."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "statute")
    expect(c).toBeDefined()
    if (c?.type !== "statute") return

    expectSpan(text, c.spans?.section, "1983")
    expect(c.spans?.subsection).toBeDefined()
  })
})

describe("Component Spans — Prose Statute", () => {
  it("tracks section and title spans", () => {
    const text = "See section 1983 of title 42."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "statute")
    expect(c).toBeDefined()
    if (c?.type !== "statute") return

    expectSpan(text, c.spans?.section, "1983")
    expectSpan(text, c.spans?.title, "42")
  })
})

describe("Component Spans — Named Code Statute", () => {
  it("tracks code and section spans for Cal. Civ. Code", () => {
    const text = "See Cal. Civ. Code § 1714."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "statute")
    expect(c).toBeDefined()
    if (c?.type !== "statute") return

    expect(c.spans?.code).toBeDefined()
    expectSpan(text, c.spans?.section, "1714")
  })
})

describe("Component Spans — Abbreviated Code Statute", () => {
  it("tracks code and section spans for Fla. Stat.", () => {
    const text = "See Fla. Stat. § 768.81."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "statute")
    expect(c).toBeDefined()
    if (c?.type !== "statute") return

    expect(c.spans?.code).toBeDefined()
    expectSpan(text, c.spans?.section, "768.81")
  })
})

describe("Component Spans — Chapter-Act Statute (ILCS)", () => {
  it("tracks title (chapter), code (act), section spans", () => {
    const text = "See 735 ILCS 5/2-1001."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "statute")
    expect(c).toBeDefined()
    if (c?.type !== "statute") return

    expectSpan(text, c.spans?.title, "735")
    expectSpan(text, c.spans?.code, "5")
  })
})
