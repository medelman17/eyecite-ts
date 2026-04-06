import { describe, expect, it } from "vitest"
import { escapeForRegex, buildAbbreviatedCodeRegex, stateStatuteEntries } from "@/data/stateStatutes"
import type { StateStatuteEntry } from "@/data/stateStatutes"

describe("escapeForRegex", () => {
  it("should handle dotted abbreviations like T.C.A.", () => {
    const result = escapeForRegex("T.C.A.")
    expect("T.C.A.").toMatch(new RegExp(result))
    expect("TCA").toMatch(new RegExp(result))
    expect("T C A").toMatch(new RegExp(result))
  })

  it("should handle word.space patterns like Conn. Gen. Stat.", () => {
    const result = escapeForRegex("Conn. Gen. Stat.")
    expect("Conn. Gen. Stat.").toMatch(new RegExp(result))
    expect("Conn Gen Stat").toMatch(new RegExp(result))
    expect("Conn.  Gen.  Stat.").toMatch(new RegExp(result))
  })

  it("should handle plain words like Alaska Stat.", () => {
    const result = escapeForRegex("Alaska Stat.")
    expect("Alaska Stat.").toMatch(new RegExp(result))
    expect("Alaska Stat").toMatch(new RegExp(result))
    expect("Alaska  Stat.").toMatch(new RegExp(result))
  })

  it("should handle abbreviations without periods like MCL", () => {
    const result = escapeForRegex("MCL")
    expect("MCL").toMatch(new RegExp(result))
  })

  it("should handle mixed patterns like N.H. Rev. Stat. Ann.", () => {
    const result = escapeForRegex("N.H. Rev. Stat. Ann.")
    expect("N.H. Rev. Stat. Ann.").toMatch(new RegExp(result))
    expect("NH Rev Stat Ann").toMatch(new RegExp(result))
  })
})

describe("buildAbbreviatedCodeRegex", () => {
  it("should build regex that matches abbreviations from entries", () => {
    const original = [...stateStatuteEntries]
    stateStatuteEntries.length = 0
    stateStatuteEntries.push({
      jurisdiction: "XX",
      abbreviations: ["X.X. Code", "XX Code"],
    })

    const regex = buildAbbreviatedCodeRegex()
    const text = "X.X. Code § 123"
    const match = regex.exec(text)
    expect(match).not.toBeNull()
    expect(match![2]).toContain("X.X. Code")
    expect(match![3]).toBe("123")

    stateStatuteEntries.length = 0
    stateStatuteEntries.push(...original)
  })

  it("should capture optional leading title number", () => {
    const original = [...stateStatuteEntries]
    stateStatuteEntries.length = 0
    stateStatuteEntries.push({
      jurisdiction: "XX",
      abbreviations: ["XX Code"],
    })

    const regex = buildAbbreviatedCodeRegex()
    const text = "42 XX Code § 5524"
    const match = regex.exec(text)
    expect(match).not.toBeNull()
    expect(match![1]).toBe("42")
    expect(match![3]).toBe("5524")

    stateStatuteEntries.length = 0
    stateStatuteEntries.push(...original)
  })

  it("should use regexFragment when provided", () => {
    const original = [...stateStatuteEntries]
    stateStatuteEntries.length = 0
    stateStatuteEntries.push({
      jurisdiction: "XX",
      abbreviations: ["X. Stat."],
      regexFragment: "X\\.?\\s*Stat(?:utes)?\\.?(?:\\s+Ann\\.?)?",
    })

    const regex = buildAbbreviatedCodeRegex()
    expect("X. Statutes Ann. § 99".match(regex)).not.toBeNull()
    expect("X Stat § 99".match(regex)).not.toBeNull()

    stateStatuteEntries.length = 0
    stateStatuteEntries.push(...original)
  })
})

describe("stateStatuteEntries — existing 12 states", () => {
  const existingCitations = [
    { text: "Fla. Stat. § 768.81", jurisdiction: "FL" },
    { text: "F.S. 768.81", jurisdiction: "FL" },
    { text: "R.C. 2305.01", jurisdiction: "OH" },
    { text: "Ohio Rev. Code § 2305.01", jurisdiction: "OH" },
    { text: "MCL 750.81", jurisdiction: "MI" },
    { text: "M.C.L. § 750.81", jurisdiction: "MI" },
    { text: "Utah Code § 76-5-302", jurisdiction: "UT" },
    { text: "U.C.A. § 63G-2-103", jurisdiction: "UT" },
    { text: "C.R.S. § 13-1-101", jurisdiction: "CO" },
    { text: "Colo. Rev. Stat. § 6-1-1301", jurisdiction: "CO" },
    { text: "RCW 26.09.191", jurisdiction: "WA" },
    { text: "Wash. Rev. Code § 26.09.191", jurisdiction: "WA" },
    { text: "G.S. 20-138.1", jurisdiction: "NC" },
    { text: "N.C. Gen. Stat. § 15A-302", jurisdiction: "NC" },
    { text: "O.C.G.A. § 16-5-1", jurisdiction: "GA" },
    { text: "Ga. Code Ann. § 16-5-1", jurisdiction: "GA" },
    { text: "42 Pa.C.S. § 5524", jurisdiction: "PA" },
    { text: "43 P.S. § 951", jurisdiction: "PA" },
    { text: "Ind. Code § 35-42-1-1", jurisdiction: "IN" },
    { text: "IC 35-42-1-1", jurisdiction: "IN" },
    { text: "N.J.S.A. 2A:10-1", jurisdiction: "NJ" },
    { text: "8 Del. C. § 141", jurisdiction: "DE" },
    { text: "Del. Code Ann. § 141", jurisdiction: "DE" },
  ]

  const regex = buildAbbreviatedCodeRegex()

  for (const { text } of existingCitations) {
    it(`should match: "${text}"`, () => {
      regex.lastIndex = 0
      expect(text.match(regex)).not.toBeNull()
    })
  }
})
