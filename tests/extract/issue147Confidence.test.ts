/**
 * Tests for issue #147: Confidence scores not calibrated.
 *
 * Confidence should separate real citations from garbage:
 * - Real citations with complete fields → 0.80+
 * - Real citations with partial fields → 0.50-0.80
 * - Garbage/unrecognized matches → <0.50
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"

describe("issue #147: confidence calibration", () => {
  // ── Case citations ────────────────────────────────────────────────────
  describe("case citation confidence tiers", () => {
    it("full citation (common reporter + year + case name) → 0.80+", () => {
      const cits = extractCitations("Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)")
      const c = cits.find((c) => c.type === "case")
      expect(c).toBeDefined()
      expect(c!.confidence).toBeGreaterThanOrEqual(0.8)
    })

    it("common reporter + year (no case name) → 0.60+", () => {
      const cits = extractCitations("500 F.2d 123 (2020)")
      const c = cits.find((c) => c.type === "case")
      expect(c).toBeDefined()
      expect(c!.confidence).toBeGreaterThanOrEqual(0.6)
    })

    it("common reporter only (no year, no name) → 0.40+", () => {
      const cits = extractCitations("500 F.2d 123")
      const c = cits.find((c) => c.type === "case")
      expect(c).toBeDefined()
      expect(c!.confidence).toBeGreaterThanOrEqual(0.4)
    })

    it("unrecognized reporter, no year, no name → <0.50", () => {
      // This is garbage — a number, random text, then another number
      const cits = extractCitations("500 Xyz Abc 123")
      const c = cits.find((c) => c.type === "case")
      expect(c).toBeDefined()
      expect(c!.confidence).toBeLessThan(0.5)
    })

    it("garbage text parsed as citation → confidence much lower than real", () => {
      const real = extractCitations("Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)")
      const garbage = extractCitations("20006 Counsel for Appellants 20004")

      const realConf = real.find((c) => c.type === "case")?.confidence ?? 0
      const garbageConf = garbage.find((c) => c.type === "case")?.confidence ?? 0

      // Real citations should be at least 0.3 above garbage
      expect(realConf - garbageConf).toBeGreaterThanOrEqual(0.3)
    })

    it("blank page citation gets moderate confidence", () => {
      const cits = extractCitations("500 F.2d ___")
      const c = cits.find((c) => c.type === "case")
      expect(c).toBeDefined()
      // Blank page = intentional placeholder, deserves moderate confidence
      expect(c!.confidence).toBeGreaterThanOrEqual(0.4)
      expect(c!.confidence).toBeLessThanOrEqual(0.7)
    })
  })

  // ── Short-form case citations ─────────────────────────────────────────
  describe("shortFormCase confidence varies by quality", () => {
    it("short-form with common reporter gets higher confidence", () => {
      const cits = extractCitations(
        "Smith v. Jones, 500 F.2d 123 (9th Cir. 2020). Later, 500 F.2d at 130.",
      )
      const sf = cits.find((c) => c.type === "shortFormCase")
      expect(sf).toBeDefined()
      expect(sf!.confidence).toBeGreaterThanOrEqual(0.6)
    })

    it("short-form with unrecognized reporter gets lower confidence", () => {
      const cits = extractCitations("500 Xyz Abc at 130")
      const sf = cits.find((c) => c.type === "shortFormCase")
      expect(sf).toBeDefined()
      expect(sf!.confidence).toBeLessThan(0.6)
    })
  })
})
