import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { CaseCitation } from "@/types/citation"

const caseOf = (text: string): CaseCitation => {
  const c = extractCitations(text).find((x) => x.type === "case")
  if (!c || c.type !== "case") throw new Error(`no case cite in: ${text}`)
  return c
}

describe("caseCore characterization (#844 — must survive threading migration)", () => {
  it("space-form: volume/reporter/page + spans", () => {
    const c = caseOf("Smith v. Jones, 100 Cal. App. 4th 1 (2002).")
    expect(c.volume).toBe(100)
    // reporter field is from cleaned text (Unicode-normalised whitespace collapses
    // the space before the ordinal suffix), so "Cal. App.4th" is the current value.
    expect(c.reporter).toBe("Cal. App.4th")
    expect(c.page).toBe(1)
    expect(c.spans?.reporter).toBeDefined()
    // originalStart/End point into the *original* (pre-clean) text; the reporter
    // span in original coords covers "Cal. App. 4th" (13 chars, with the space).
    const { reporter } = c.spans!
    const originalText = "Smith v. Jones, 100 Cal. App. 4th 1 (2002)."
    expect(
      originalText.slice(reporter!.originalStart, reporter!.originalEnd),
    ).toBe("Cal. App. 4th")
  })

  it("comma-form: 3 Den., 594", () => {
    const c = caseOf("As held in Roe, 3 Den., 594, the rule is settled.")
    expect(c.volume).toBe(3)
    expect(c.reporter).toBe("Den.")
    expect(c.page).toBe(594)
  })

  it("nominative reporter: 5 U.S. (1 Cranch) 137", () => {
    const c = caseOf("Marbury v. Madison, 5 U.S. (1 Cranch) 137 (1803).")
    expect(c.volume).toBe(5)
    expect(c.reporter).toBe("U.S.")
    expect(c.page).toBe(137)
    expect(c.nominativeVolume).toBe(1)
    expect(c.nominativeReporter).toBe("Cranch")
  })

  it("blank page placeholder", () => {
    const c = caseOf("Smith v. Jones, 100 F.3d ___ (2d Cir. 2020).")
    expect(c.volume).toBe(100)
    expect(c.page).toBeUndefined()
    expect(c.hasBlankPage).toBe(true)
  })
})
