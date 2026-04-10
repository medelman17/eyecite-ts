import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"

/** Assert a component span brackets the expected text in the original input */
function expectSpan(text: string, span: { originalStart: number; originalEnd: number } | undefined, expected: string) {
  expect(span).toBeDefined()
  expect(text.substring(span!.originalStart, span!.originalEnd)).toBe(expected)
}

describe("Component Spans — Neutral", () => {
  it("tracks year, court, documentNumber spans", () => {
    const text = "See 2020 WL 123456."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "neutral")
    expect(c).toBeDefined()
    if (c?.type !== "neutral") return

    expectSpan(text, c.spans?.year, "2020")
    expectSpan(text, c.spans?.court, "WL")
    expectSpan(text, c.spans?.documentNumber, "123456")
  })
})

describe("Component Spans — Federal Register", () => {
  it("tracks volume and page spans", () => {
    const text = "See 85 Fed. Reg. 12345."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "federalRegister")
    expect(c).toBeDefined()
    if (c?.type !== "federalRegister") return

    expectSpan(text, c.spans?.volume, "85")
    expectSpan(text, c.spans?.page, "12345")
  })
})

describe("Component Spans — Statutes at Large", () => {
  it("tracks volume and page spans", () => {
    const text = "See 124 Stat. 119."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "statutesAtLarge")
    expect(c).toBeDefined()
    if (c?.type !== "statutesAtLarge") return

    expectSpan(text, c.spans?.volume, "124")
    expectSpan(text, c.spans?.page, "119")
  })
})

describe("Component Spans — Public Law", () => {
  it("tracks congress and lawNumber spans", () => {
    const text = "See Pub. L. No. 116-283."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "publicLaw")
    expect(c).toBeDefined()
    if (c?.type !== "publicLaw") return

    expectSpan(text, c.spans?.congress, "116")
    expectSpan(text, c.spans?.lawNumber, "283")
  })
})

describe("Component Spans — Journal", () => {
  it("tracks volume, journal, page spans", () => {
    const text = "See 100 Harv. L. Rev. 1234."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "journal")
    expect(c).toBeDefined()
    if (c?.type !== "journal") return

    expectSpan(text, c.spans?.volume, "100")
    expectSpan(text, c.spans?.journal, "Harv. L. Rev.")
    expectSpan(text, c.spans?.page, "1234")
  })

  it("tracks pincite span when present", () => {
    const text = "See 75 Yale L.J. 456, 460."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "journal")
    expect(c).toBeDefined()
    if (c?.type !== "journal") return

    expectSpan(text, c.spans?.pincite, "460")
  })

  it("tracks year span when present in parenthetical", () => {
    const text = "See 75 Yale L.J. 456 (2020)."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "journal")
    expect(c).toBeDefined()
    if (c?.type !== "journal") return

    expectSpan(text, c.spans?.year, "2020")
  })
})

describe("Component Spans — Constitutional", () => {
  it("tracks amendment and section spans for US Constitution", () => {
    const text = "See U.S. Const. amend. XIV, § 1."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "constitutional")
    expect(c).toBeDefined()
    if (c?.type !== "constitutional") return

    expect(c.spans?.amendment).toBeDefined()
    expect(c.spans?.section).toBeDefined()
    expectSpan(text, c.spans?.jurisdiction, "U.S.")
  })

  it("tracks article and section spans", () => {
    const text = "See U.S. Const. art. III, § 2."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "constitutional")
    expect(c).toBeDefined()
    if (c?.type !== "constitutional") return

    expect(c.spans?.article).toBeDefined()
    expect(c.spans?.section).toBeDefined()
  })

  it("tracks jurisdiction span for state constitutions", () => {
    const text = "See Cal. Const. art. I, § 7."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "constitutional")
    expect(c).toBeDefined()
    if (c?.type !== "constitutional") return

    expectSpan(text, c.spans?.jurisdiction, "Cal.")
  })
})
