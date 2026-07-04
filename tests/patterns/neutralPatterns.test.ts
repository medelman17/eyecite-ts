import { describe, expect, it } from "vitest"
import { neutralPatterns } from "@/patterns"

/**
 * Issue #831 — the `ny-slip-op` and `westlaw` tokenizer patterns must accept a
 * bracketed/underscored blank placeholder (`[____]`, `[--------]`) in the
 * locator slot in addition to digits, so the candidate is tokenized instead of
 * silently discarded. Tested at the pattern layer (belt-and-suspenders, in
 * addition to the end-to-end extractor tests) and kept ReDoS-safe.
 */
function patternById(id: string) {
  const p = neutralPatterns.find((pp) => pp.id === id)
  if (!p) throw new Error(`pattern ${id} not found`)
  return p
}

function matches(id: string, text: string): string[] {
  const { regex } = patternById(id)
  // Clone with the global flag so matchAll is happy and lastIndex is fresh.
  const re = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : `${regex.flags}g`)
  return [...text.matchAll(re)].map((m) => m[0])
}

describe("Issue #831 - bracketed-blank locator patterns", () => {
  describe("ny-slip-op", () => {
    it("tokenizes an underscored blank `[____]`", () => {
      expect(matches("ny-slip-op", "2021 N.Y. Slip Op. [____] (2d Dep't 2021)")).toEqual([
        "2021 N.Y. Slip Op. [____]",
      ])
    })

    it("tokenizes a long underscored blank `[__________]`", () => {
      expect(matches("ny-slip-op", "2021 N.Y. Slip Op. [__________] (foo)")).toEqual([
        "2021 N.Y. Slip Op. [__________]",
      ])
    })

    it("tokenizes a dashed blank `[--------]`", () => {
      expect(matches("ny-slip-op", "2021 N.Y. Slip Op. [--------] (foo)")).toEqual([
        "2021 N.Y. Slip Op. [--------]",
      ])
    })

    it("still tokenizes the numeric form unchanged", () => {
      expect(matches("ny-slip-op", "2024 NY Slip Op 04225")).toEqual(["2024 NY Slip Op 04225"])
    })

    it("does NOT match a single-underscore (needs 2+)", () => {
      expect(matches("ny-slip-op", "2021 N.Y. Slip Op. [_] (foo)")).toEqual([])
    })
  })

  describe("westlaw", () => {
    it("tokenizes an underscored blank `[____]`", () => {
      expect(matches("westlaw", "2024 WL [____]")).toEqual(["2024 WL [____]"])
    })

    it("tokenizes a dashed blank `[------]`", () => {
      expect(matches("westlaw", "see 2024 WL [------] here")).toEqual(["2024 WL [------]"])
    })

    it("still tokenizes the numeric form unchanged", () => {
      expect(matches("westlaw", "see 2021 WL 123456 here")).toEqual(["2021 WL 123456"])
    })

    it("keeps the numeric word boundary (rejects `1234567abc`)", () => {
      expect(matches("westlaw", "2024 WL 1234567abc")).toEqual([])
    })
  })

  describe("ReDoS safety on pathological blank input", () => {
    it("ny-slip-op completes quickly on a long underscore run", () => {
      const input = `2021 N.Y. Slip Op. [${"_".repeat(50000)}`
      const start = Date.now()
      const _ = matches("ny-slip-op", input)
      expect(Date.now() - start).toBeLessThan(100)
    })

    it("westlaw completes quickly on a long underscore run", () => {
      const input = `2024 WL [${"_".repeat(50000)}`
      const start = Date.now()
      const _ = matches("westlaw", input)
      expect(Date.now() - start).toBeLessThan(100)
    })
  })
})
