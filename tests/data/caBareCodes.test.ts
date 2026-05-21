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

    it("matches every canonical entry's regexFragment against its canonical form (or another entry's)", () => {
      // Some canonical names have multiple regexFragments mapping to them
      // (e.g., `Health & Saf. Code` accepts both `Saf.` and `Safety` input
      // forms but canonicalizes to the abbreviated form — #655). For those,
      // the test passes when ANY entry sharing the canonical name has a
      // fragment that matches the canonical.
      for (const entry of caBareCodeEntries) {
        const re = new RegExp(`^${entry.regexFragment}$`, "i")
        if (re.test(entry.canonical)) continue
        // Try fragments from other entries with the same canonical.
        const siblings = caBareCodeEntries.filter((e) => e.canonical === entry.canonical)
        const anyMatches = siblings.some((sib) =>
          new RegExp(`^${sib.regexFragment}$`, "i").test(entry.canonical),
        )
        expect(anyMatches).toBe(true)
      }
    })
  })
})
