import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #623 — Sprint E audit (post-#621) verified `isPlausibleYear`
 * is applied at 6 source sites but direct integration tests for the
 * FedReg and StatutesAtLarge paths were missing. This file backfills
 * those test gaps so a future refactor can't silently regress the
 * year-validation guard.
 *
 * Boundary semantics: `isPlausibleYear` accepts [1700, currentYear+1].
 */
describe("Issue #623 - isPlausibleYear integration coverage", () => {
  describe("federalRegister", () => {
    it("year=1699 (below floor) → year undefined", () => {
      const cs = extractCitations(`87 Fed. Reg. 12,345 (1699)`)
      const c = cs.find((c) => c.type === "federalRegister") as
        | { year?: number }
        | undefined
      expect(c).toBeDefined()
      expect(c?.year).toBeUndefined()
    })

    it("year=1700 (boundary) → year populated", () => {
      const cs = extractCitations(`87 Fed. Reg. 12,345 (1700)`)
      const c = cs.find((c) => c.type === "federalRegister") as
        | { year?: number }
        | undefined
      expect(c?.year).toBe(1700)
    })

    it("year=2025 (current) → year populated", () => {
      const cs = extractCitations(`87 Fed. Reg. 12,345 (2025)`)
      const c = cs.find((c) => c.type === "federalRegister") as
        | { year?: number }
        | undefined
      expect(c?.year).toBe(2025)
    })
  })

  describe("statutesAtLarge", () => {
    it("year=1699 (below floor) → year undefined", () => {
      const cs = extractCitations(`124 Stat. 119 (1699)`)
      const c = cs.find((c) => c.type === "statutesAtLarge") as
        | { year?: number }
        | undefined
      expect(c).toBeDefined()
      expect(c?.year).toBeUndefined()
    })

    it("year=2025 (current) → year populated", () => {
      const cs = extractCitations(`124 Stat. 119 (2025)`)
      const c = cs.find((c) => c.type === "statutesAtLarge") as
        | { year?: number }
        | undefined
      expect(c?.year).toBe(2025)
    })
  })
})
