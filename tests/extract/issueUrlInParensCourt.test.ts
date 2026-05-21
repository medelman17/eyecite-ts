import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { CaseCitation } from "@/types/citation"

const cases = (text: string): CaseCitation[] =>
  extractCitations(text).filter((c) => c.type === "case") as CaseCitation[]

describe("URL/filepath in parens does not pollute court field", () => {
  it.each([
    ["https URL", "Smith, 100 F.2d 1 (https://example.com/100-f2d-1)"],
    ["http URL", "Smith, 100 F.2d 1 (http://example.com/100-f2d-1)"],
    ["file URL", "Smith, 100 F.2d 1 (file:///opinions/100-f2d-1.pdf)"],
    ["URL with prefix", "Smith, 100 F.2d 1 (avail. at https://courts.gov/100/f2d/1)"],
    ["ftp URL", "Smith, 100 F.2d 1 (ftp://example.com/100-f2d-1)"],
  ])("`%s` does not pollute court", (_, input) => {
    const [c] = cases(input)
    expect(c.court).toBeUndefined()
  })

  it("regression: real court (9th Cir.) still extracts", () => {
    const [c] = cases("Smith, 100 F.2d 1 (9th Cir. 1990)")
    expect(c.court).toBe("9th Cir.")
  })
})
