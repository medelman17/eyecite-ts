import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { StatutesAtLargeCitation } from "@/types/citation"

const sal = (text: string): StatutesAtLargeCitation[] =>
  extractCitations(text).filter((c) => c.type === "statutesAtLarge") as StatutesAtLargeCitation[]

describe("Statutes at Large pincite accepts thousands-grouping commas", () => {
  it("`134 Stat. 1,234, 1,236` parses pincite as 1236, not 1", () => {
    const [c] = sal("134 Stat. 1,234, 1,236")
    expect(c?.page).toBe(1234)
    expect(c?.pincite).toBe(1236)
  })

  it("`134 Stat. 1,234, 1,236-1,240` parses pincite range", () => {
    const [c] = sal("134 Stat. 1,234, 1,236-1,240")
    expect(c?.page).toBe(1234)
    expect(c?.pincite).toBe(1236)
    expect(c?.pinciteEndPage).toBe(1240)
  })

  it("regression: bare pincite without comma still works", () => {
    const [c] = sal("134 Stat. 281, 285")
    expect(c?.page).toBe(281)
    expect(c?.pincite).toBe(285)
  })

  it("regression: abbreviated pincite end (`285-99`) still expands to 299", () => {
    const [c] = sal("134 Stat. 281, 285-99")
    expect(c?.pincite).toBe(285)
    expect(c?.pinciteEndPage).toBe(299)
  })

  it("regression: full numeric pincite range still works", () => {
    const [c] = sal("134 Stat. 281, 285-300")
    expect(c?.pincite).toBe(285)
    expect(c?.pinciteEndPage).toBe(300)
  })
})
