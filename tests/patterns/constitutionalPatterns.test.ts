import { describe, expect, it } from "vitest"
import { constitutionalPatterns } from "@/patterns/constitutionalPatterns"

describe("constitutionalPatterns", () => {
  const findMatches = (text: string) => {
    const matches: Array<{ patternId: string; text: string }> = []
    for (const pattern of constitutionalPatterns) {
      pattern.regex.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = pattern.regex.exec(text)) !== null) {
        matches.push({ patternId: pattern.id, text: m[0] })
      }
    }
    return matches
  }

  describe("us-constitution", () => {
    it("matches U.S. Const. article with section", () => {
      const matches = findMatches("under U.S. Const. art. III, § 2 the court")
      expect(matches).toHaveLength(1)
      expect(matches[0].patternId).toBe("us-constitution")
      expect(matches[0].text).toBe("U.S. Const. art. III, § 2")
    })

    it("matches U.S. Const. amendment with section", () => {
      const matches = findMatches("under U.S. Const. amend. XIV, § 1 the court")
      expect(matches).toHaveLength(1)
      expect(matches[0].patternId).toBe("us-constitution")
    })

    it("matches amendment without section", () => {
      const matches = findMatches("violates U.S. Const. amend. I and")
      expect(matches).toHaveLength(1)
      expect(matches[0].text).toBe("U.S. Const. amend. I")
    })

    it("matches article with section and clause", () => {
      const matches = findMatches("under U.S. Const. art. I, § 8, cl. 3 which grants")
      expect(matches).toHaveLength(1)
      expect(matches[0].text).toBe("U.S. Const. art. I, § 8, cl. 3")
    })

    it("matches US Const. variant (no periods in U.S.)", () => {
      const matches = findMatches("under US Const. amend. V the")
      expect(matches).toHaveLength(1)
      expect(matches[0].patternId).toBe("us-constitution")
    })

    it("matches U. S. Const. variant (space between U. S.)", () => {
      const matches = findMatches("see U. S. Const. art. III, § 1")
      expect(matches).toHaveLength(1)
    })

    it("matches unabbreviated article/amendment", () => {
      const matches = findMatches("U.S. Const. article III, § 2")
      expect(matches).toHaveLength(1)
    })

    it("matches Arabic numeral for article", () => {
      const matches = findMatches("U.S. Const. art. 3, § 2")
      expect(matches).toHaveLength(1)
    })

    it("matches comma after Const.", () => {
      const matches = findMatches("U. S. Const., Art. I, §7, cl. 1")
      expect(matches).toHaveLength(1)
      expect(matches[0].patternId).toBe("us-constitution")
      expect(matches[0].text).toBe("U. S. Const., Art. I, §7, cl. 1")
    })

    it("matches Amdt. abbreviation", () => {
      const matches = findMatches("U. S. Const., Amdt. 14, §1")
      expect(matches).toHaveLength(1)
      expect(matches[0].patternId).toBe("us-constitution")
    })
  })

  describe("state-constitution", () => {
    it("matches Cal. Const. article", () => {
      const matches = findMatches("under Cal. Const. art. I, § 7 the")
      expect(matches).toHaveLength(1)
      expect(matches[0].patternId).toBe("state-constitution")
    })

    it("matches N.Y. Const. article", () => {
      const matches = findMatches("per N.Y. Const. art. VI, § 20 the")
      expect(matches).toHaveLength(1)
      expect(matches[0].patternId).toBe("state-constitution")
    })

    it("matches Tex. Const. with non-numeric section", () => {
      const matches = findMatches("see Tex. Const. art. V, § 3-a which")
      expect(matches).toHaveLength(1)
      expect(matches[0].text).toBe("Tex. Const. art. V, § 3-a")
    })

    it("matches Fla. Const.", () => {
      const matches = findMatches("under Fla. Const. art. I, § 2 the")
      expect(matches).toHaveLength(1)
    })

    it("matches state constitution amendment", () => {
      const matches = findMatches("under Cal. Const. amend. II, § 3")
      expect(matches).toHaveLength(1)
    })
  })

  describe("bare-constitution", () => {
    it("matches bare Const. with article, section, and clause", () => {
      const matches = findMatches("under Const. art. I, § 8, cl. 3 which")
      expect(matches).toHaveLength(1)
      expect(matches[0].patternId).toBe("bare-constitution")
    })

    it("matches bare Const. amendment", () => {
      const matches = findMatches("violates Const. amend. XIV, § 1")
      expect(matches).toHaveLength(1)
      expect(matches[0].patternId).toBe("bare-constitution")
    })
  })

  describe("bare-article", () => {
    it("matches Art. with Roman numeral and section", () => {
      const matches = findMatches("under Art. I, §8, cl. 3 which grants")
      expect(matches.some((m) => m.patternId === "bare-article")).toBe(true)
      expect(matches.find((m) => m.patternId === "bare-article")!.text).toBe(
        "Art. I, §8, cl. 3",
      )
    })

    it("matches Art. with section only", () => {
      const matches = findMatches("see Art. IV, §3 and")
      expect(matches.some((m) => m.patternId === "bare-article")).toBe(true)
    })

    it("does not match Art. without section symbol", () => {
      const matches = findMatches("see Art. III and")
      expect(matches.some((m) => m.patternId === "bare-article")).toBe(false)
    })

    it("does not match Art. with Arabic numeral", () => {
      const matches = findMatches("see Art. 42, §3 of the treaty")
      expect(matches.some((m) => m.patternId === "bare-article")).toBe(false)
    })
  })
})
