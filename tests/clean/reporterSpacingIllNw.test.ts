import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { FullCaseCitation } from "@/types/citation"

const findCase = (text: string): FullCaseCitation | undefined => {
  const cites = extractCitations(text)
  return cites.find((c): c is FullCaseCitation => c.type === "case")
}

describe("Illinois Appellate reporter normalization (#465)", () => {
  it("`Ill. App.3d` (no space before 3d) → canonical `Ill. App. 3d`", () => {
    const text = "382 Ill. App.3d 802"
    const cite = findCase(text)
    expect(cite?.reporter).toBe("Ill. App. 3d")
  })

  it("`Ill. App.2d` → `Ill. App. 2d`", () => {
    const text = "313 Ill. App.2d 842"
    const cite = findCase(text)
    expect(cite?.reporter).toBe("Ill. App. 2d")
  })

  it("`Ill. App. 3d` (already canonical) stays the same", () => {
    const text = "315 Ill. App. 3d 221"
    const cite = findCase(text)
    expect(cite?.reporter).toBe("Ill. App. 3d")
  })

  it("non-Illinois `Wis. 2d` still collapses to `Wis.2d` (regression)", () => {
    const text = "300 Wis. 2d 880"
    const cite = findCase(text)
    expect(cite?.reporter).toBe("Wis.2d")
  })
})

describe("Regional reporter inner-space collapse (#466)", () => {
  it("`N. W.2d` (space between N. and W.) → `N.W.2d`", () => {
    const text = "19 N. W.2d 324"
    const cite = findCase(text)
    expect(cite?.reporter).toBe("N.W.2d")
  })

  it("`N. W. 2d` (spaces everywhere) → `N.W.2d`", () => {
    const text = "80 N. W. 2d 863"
    const cite = findCase(text)
    expect(cite?.reporter).toBe("N.W.2d")
  })

  it("`S. W. 2d` → `S.W.2d`", () => {
    const text = "100 S. W. 2d 200"
    const cite = findCase(text)
    expect(cite?.reporter).toBe("S.W.2d")
  })

  it("`N. E. 2d` → `N.E.2d`", () => {
    const text = "100 N. E. 2d 200"
    const cite = findCase(text)
    expect(cite?.reporter).toBe("N.E.2d")
  })

  it("`S. E. 2d` → `S.E.2d`", () => {
    const text = "100 S. E. 2d 200"
    const cite = findCase(text)
    expect(cite?.reporter).toBe("S.E.2d")
  })

  it("`N.W.2d` (already canonical) stays the same", () => {
    const text = "19 N.W.2d 324"
    const cite = findCase(text)
    expect(cite?.reporter).toBe("N.W.2d")
  })

  it("inside running text: `Smith v. Doe, 103 N. W.2d 397 (Minn. 1960)`", () => {
    const text = "Smith v. Doe, 103 N. W.2d 397 (Minn. 1960)"
    const cite = findCase(text)
    expect(cite?.reporter).toBe("N.W.2d")
    expect(cite?.caseName).toBe("Smith v. Doe")
    expect(cite?.year).toBe(1960)
  })
})
