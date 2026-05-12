import { describe, expect, it } from "vitest"
import {
  buildCaBareCodeRegex,
  caBareCodeEntries,
  findCaBareCode,
} from "../../src/data/caBareCodes"

describe("caBareCodes data module", () => {
  describe("findCaBareCode", () => {
    it("returns canonical form for exact match", () => {
      expect(findCaBareCode("Pen. Code")).toBe("Pen. Code")
      expect(findCaBareCode("Code Civ. Proc.")).toBe("Code Civ. Proc.")
      expect(findCaBareCode("Bus. & Prof. Code")).toBe("Bus. & Prof. Code")
    })

    it("normalizes whitespace and casing", () => {
      expect(findCaBareCode("pen.   code")).toBe("Pen. Code")
      expect(findCaBareCode("  Bus. & Prof.  Code  ")).toBe("Bus. & Prof. Code")
    })

    it("tolerates missing periods (regex fragments use `\\.?`)", () => {
      expect(findCaBareCode("Pen Code")).toBe("Pen. Code")
    })

    it("returns undefined for non-CA-bare-code text", () => {
      expect(findCaBareCode("Insurance Law")).toBeUndefined()
      expect(findCaBareCode("not a code")).toBeUndefined()
      expect(findCaBareCode("")).toBeUndefined()
    })
  })

  describe("buildCaBareCodeRegex", () => {
    it("produces a global regex with two capture groups (code, section)", () => {
      const re = buildCaBareCodeRegex()
      expect(re.flags).toContain("g")
      const m = "Pen. Code § 148".match(re)
      expect(m).not.toBeNull()
    })

    it("matches every canonical entry's regexFragment against its canonical form", () => {
      for (const entry of caBareCodeEntries) {
        const re = new RegExp(`^${entry.regexFragment}$`, "i")
        expect(re.test(entry.canonical)).toBe(true)
      }
    })
  })
})
