import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { SessionLawCitation } from "@/types/citation"

/**
 * Session-law citations — chronological compilations cited by year + chapter.
 * California Statutes (`Stats. YYYY, ch. NNN`) — #350 — and Nevada session laws
 * (`YYYY Nev. Stat., ch. NNN`) — #779 — share the new `sessionLaw` type.
 */
const sessionLaw = (text: string): SessionLawCitation | undefined =>
  extractCitations(text).find((c): c is SessionLawCitation => c.type === "sessionLaw")

describe("California session laws (#350)", () => {
  it("Stats. 1992, ch. 726, § 2, p. 3523", () => {
    const c = sessionLaw("Stats. 1992, ch. 726, § 2, p. 3523")
    expect(c).toBeDefined()
    expect(c?.jurisdiction).toBe("CA")
    expect(c?.code).toBe("Stats.")
    expect(c?.year).toBe(1992)
    expect(c?.chapter).toBe("726")
    expect(c?.section).toBe("2")
    expect(c?.page).toBe("3523")
  })

  it("Stats. 1963, ch. 1471, § 1, pp. 3038-3039 (page range)", () => {
    const c = sessionLaw("Stats. 1963, ch. 1471, § 1, pp. 3038-3039")
    expect(c).toBeDefined()
    expect(c?.year).toBe(1963)
    expect(c?.chapter).toBe("1471")
    expect(c?.section).toBe("1")
    expect(c?.pageRange).toEqual({ start: "3038", end: "3039" })
  })

  it("Stats. 2002, ch. 40, §§ 6, 7, 8, pp. 460-462 (section list)", () => {
    const c = sessionLaw("Stats. 2002, ch. 40, §§ 6, 7, 8, pp. 460-462")
    expect(c).toBeDefined()
    expect(c?.year).toBe(2002)
    expect(c?.chapter).toBe("40")
    expect(c?.sections).toEqual(["6", "7", "8"])
    expect(c?.pageRange).toEqual({ start: "460", end: "462" })
  })
})

describe("Nevada session laws (#779)", () => {
  it("2003 Nev. Stat., ch. 427, §§ 25-26, at 2590-95 (section + page range)", () => {
    const c = sessionLaw("2003 Nev. Stat., ch. 427, §§ 25-26, at 2590-95")
    expect(c).toBeDefined()
    expect(c?.jurisdiction).toBe("NV")
    expect(c?.code).toBe("Nev. Stat.")
    expect(c?.year).toBe(2003)
    expect(c?.chapter).toBe("427")
    expect(c?.sectionRange).toEqual({ start: "25", end: "26" })
    expect(c?.pageRange).toEqual({ start: "2590", end: "95" })
  })

  it("1977 Nev. Stats, ch. 598 (bare, 'Stats' variant)", () => {
    const c = sessionLaw("1977 Nev. Stats, ch. 598")
    expect(c).toBeDefined()
    expect(c?.year).toBe(1977)
    expect(c?.chapter).toBe("598")
  })

  it("1981 Nev. Stats, ch. 418 § 5 (single section, no comma)", () => {
    const c = sessionLaw("1981 Nev. Stats, ch. 418 § 5")
    expect(c).toBeDefined()
    expect(c?.year).toBe(1981)
    expect(c?.chapter).toBe("418")
    expect(c?.section).toBe("5")
  })
})

describe("session-law regression — neighbors unchanged", () => {
  it("federal Pub. L. / Stat. stays statutesAtLarge", () => {
    const types = extractCitations("Pub. L. No. 99-514, 100 Stat. 2085").map((c) => c.type)
    expect(types).toContain("statutesAtLarge")
    expect(types).not.toContain("sessionLaw")
  })

  it("NRS stays statute", () => {
    expect(extractCitations("NRS 174.295")[0]?.type).toBe("statute")
  })

  it("NAC stays statute", () => {
    expect(extractCitations("NAC 616.650")[0]?.type).toBe("statute")
  })
})
