import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { Citation } from "@/types/citation"

const cites = (text: string): Citation[] => extractCitations(text)

describe("Federal Register page accepts comma-grouped digits", () => {
  it("`85 Fed. Reg. 12,345` extracts the full page", () => {
    const [c] = cites("85 Fed. Reg. 12,345 (Mar. 1, 2020)").filter(
      (c) => c.type === "federalRegister",
    )
    expect(c).toBeDefined()
    expect(c?.matchedText).toBe("85 Fed. Reg. 12,345")
    const o = c as unknown as Record<string, unknown>
    // Page strips thousands commas for arithmetic compatibility but
    // matchedText preserves the original form.
    expect(o.page).toBe(12345)
  })

  it("`87 Fed. Reg. 1,234,567` (multi-comma) extracts the full page", () => {
    const [c] = cites("87 Fed. Reg. 1,234,567").filter((c) => c.type === "federalRegister")
    expect(c?.matchedText).toBe("87 Fed. Reg. 1,234,567")
  })

  it("regression: `85 Fed. Reg. 12345` (no comma) still works", () => {
    const [c] = cites("85 Fed. Reg. 12345").filter((c) => c.type === "federalRegister")
    expect(c?.matchedText).toBe("85 Fed. Reg. 12345")
  })

  it("Statutes at Large accepts comma-grouped page", () => {
    const [c] = cites("134 Stat. 1,234").filter((c) => c.type === "statutesAtLarge")
    expect(c?.matchedText).toBe("134 Stat. 1,234")
  })
})
