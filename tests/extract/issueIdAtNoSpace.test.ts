import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { IdCitation } from "@/types/citation"

const ids = (text: string): IdCitation[] =>
  extractCitations(text).filter((c) => c.type === "id") as IdCitation[]

describe("Id. without space before `at` still captures pincite (#683)", () => {
  it("`Id.at 5` extracts pincite=5", () => {
    const [c] = ids("Smith, 100 F.2d 1. Id.at 5.")
    expect(c?.matchedText).toBe("Id.at 5")
    expect(c?.pincite).toBe(5)
  })

  it("`Id.at 5-7` extracts pincite range", () => {
    const [c] = ids("Smith, 100 F.2d 1. Id.at 5-7.")
    expect(c?.matchedText).toBe("Id.at 5-7")
  })

  it("`Ibid.at 5` extracts (Ibid variant)", () => {
    const [c] = ids("Smith, 100 F.2d 1. Ibid.at 5.")
    expect(c?.matchedText).toBe("Ibid.at 5")
    expect(c?.pincite).toBe(5)
  })

  it("regression: `Id. at 5` (canonical form) still works", () => {
    const [c] = ids("Smith, 100 F.2d 1. Id. at 5.")
    expect(c?.pincite).toBe(5)
  })

  it("regression: bare `Id.` (no pincite) still works", () => {
    const [c] = ids("Smith, 100 F.2d 1. Id.")
    expect(c?.matchedText).toBe("Id.")
    expect(c?.pincite).toBeUndefined()
  })
})
