import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { FederalRegisterCitation } from "@/types/citation"

const fedReg = (text: string): FederalRegisterCitation[] =>
  extractCitations(text).filter((c) => c.type === "federalRegister") as FederalRegisterCitation[]

describe("Federal Register year extracts from trailing parens beyond the token", () => {
  it("`85 Fed. Reg. 12,345 (2020)` extracts year=2020", () => {
    const [c] = fedReg("85 Fed. Reg. 12,345 (2020)")
    expect(c?.year).toBe(2020)
  })

  it("`85 Fed. Reg. 12,345 (Mar. 1, 2020)` extracts year=2020", () => {
    const [c] = fedReg("85 Fed. Reg. 12,345 (Mar. 1, 2020)")
    expect(c?.year).toBe(2020)
  })

  it("`85 Fed. Reg. 12345 (2020)` (no comma in page) extracts year", () => {
    const [c] = fedReg("85 Fed. Reg. 12345 (2020)")
    expect(c?.year).toBe(2020)
  })

  it("regression: no trailing year paren → year undefined", () => {
    const [c] = fedReg("85 Fed. Reg. 12,345")
    expect(c?.year).toBeUndefined()
  })

  it("regression: implausible year (page-like number) → undefined", () => {
    const [c] = fedReg("85 Fed. Reg. 12,345 (9999)")
    expect(c?.year).toBeUndefined()
  })
})
