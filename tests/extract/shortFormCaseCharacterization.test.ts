import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { ShortFormCaseCitation } from "@/types/citation"

/**
 * Characterization test for `extractShortFormCase` (#844 — must survive the
 * capture-group-threading migration). Mirrors `caseCoreCharacterization.test.ts`.
 *
 * Each assertion pins the CURRENT output of the unmigrated extractor (the twin
 * `shortFormRegex`). It is the equivalence oracle: the migration to threaded
 * named groups must keep every field — volume, reporter, pincite, pinciteInfo,
 * partyName/partyNameNormalized, confidence, the `spans.pincite` component span
 * (clean AND original offsets), additionalPincites, and the trailing
 * parenthetical — byte-identical. It must stay green at every step.
 */
const shortOf = (text: string): ShortFormCaseCitation => {
  const c = extractCitations(text).find((x) => x.type === "shortFormCase")
  if (!c || c.type !== "shortFormCase") throw new Error(`no shortFormCase cite in: ${text}`)
  return c
}

describe("extractShortFormCase characterization (#844 — must survive threading migration)", () => {
  it("party form: Smith, 500 F.2d at 125 — volume/reporter/pincite/party/confidence", () => {
    const c = shortOf("Smith, 500 F.2d at 125.")
    expect(c.volume).toBe(500)
    expect(c.reporter).toBe("F.2d")
    expect(c.pincite).toBe(125)
    expect(c.pinciteInfo).toEqual({ page: 125, isRange: false, raw: "125" })
    expect(c.partyName).toBe("Smith")
    expect(c.partyNameNormalized).toBe("smith")
    // F.2d is a COMMON_REPORTER → base 0.4 + 0.3 boost.
    expect(c.confidence).toBe(0.7)
  })

  it("bare form (no party): 116 F.4th at 1193 — ordinal reporter, no party fields", () => {
    const c = shortOf("116 F.4th at 1193.")
    expect(c.volume).toBe(116)
    expect(c.reporter).toBe("F.4th")
    expect(c.pincite).toBe(1193)
    expect(c.partyName).toBeUndefined()
    expect(c.partyNameNormalized).toBeUndefined()
    expect(c.confidence).toBe(0.7)
  })

  it("leading signal: See Smith, 500 F.2d at 125 — stripSupraPartyPrefix peels 'See'", () => {
    const c = shortOf("See Smith, 500 F.2d at 125.")
    expect(c.partyName).toBe("Smith")
    expect(c.partyNameNormalized).toBe("smith")
    expect(c.volume).toBe(500)
    expect(c.reporter).toBe("F.2d")
    expect(c.pincite).toBe(125)
  })

  it("multi-word parties: 'v.' / '&' / corporate-suffix continuations", () => {
    const amp = shortOf("Walker & Horwich, 500 F.2d at 125.")
    expect(amp.partyName).toBe("Walker & Horwich")
    expect(amp.partyNameNormalized).toBe("walker & horwich")

    const corp = shortOf("Thorn Americas, Inc., 500 F.2d at 125.")
    expect(corp.partyName).toBe("Thorn Americas, Inc.")
    expect(corp.partyNameNormalized).toBe("thorn americas, inc.")
  })

  it("hyphenated volume stays a string: Foo, 1984-1 C.B. at 5", () => {
    const c = shortOf("Foo, 1984-1 C.B. at 5.")
    expect(c.volume).toBe("1984-1")
    expect(typeof c.volume).toBe("string")
    expect(c.reporter).toBe("C.B.")
    expect(c.pincite).toBe(5)
    // C.B. is NOT a COMMON_REPORTER → base 0.4, no boost.
    expect(c.confidence).toBe(0.4)
  })

  it("comma-before-at: 597 U.S., at 721", () => {
    const c = shortOf("The court in 597 U.S., at 721 held otherwise.")
    expect(c.volume).toBe(597)
    expect(c.reporter).toBe("U.S.")
    expect(c.pincite).toBe(721)
    expect(c.confidence).toBe(0.7)
  })

  it("p./pp. pincite prefix: 18 Cal.4th at p. 717", () => {
    const c = shortOf("See 18 Cal.4th at p. 717.")
    expect(c.volume).toBe(18)
    expect(c.reporter).toBe("Cal.4th")
    expect(c.pincite).toBe(717)
    expect(c.confidence).toBe(0.7)
  })

  it("spelled-out page prefix: 281 Ala. at page 322 (#344)", () => {
    const c = shortOf("281 Ala. at page 322.")
    expect(c.volume).toBe(281)
    expect(c.reporter).toBe("Ala.")
    expect(c.pincite).toBe(322)
    expect(c.confidence).toBe(0.4)
  })

  it("spelled-out pages prefix: 38 Ala.App. at pages 186 (#344)", () => {
    const c = shortOf("38 Ala.App. at pages 186.")
    expect(c.volume).toBe(38)
    expect(c.reporter).toBe("Ala.App.")
    expect(c.pincite).toBe(186)
    expect(c.confidence).toBe(0.4)
  })

  it("star-pagination: 500 F.2d at *125 (#191)", () => {
    const c = shortOf("500 F.2d at *125.")
    expect(c.pincite).toBe(125)
    expect(c.pinciteInfo).toEqual({ page: 125, isRange: false, raw: "*125", starPage: true })
  })

  it("range: 500 F.2d at 462-65 (#201)", () => {
    const c = shortOf("500 F.2d at 462-65.")
    expect(c.pincite).toBe(462)
    expect(c.pinciteInfo).toEqual({ page: 462, endPage: 465, isRange: true, raw: "462-65" })
  })

  it("range with star end: 500 F.2d at 462-*65 (#191/#201)", () => {
    const c = shortOf("500 F.2d at 462-*65.")
    expect(c.pincite).toBe(462)
    expect(c.pinciteInfo).toEqual({ page: 462, endPage: 465, isRange: true, raw: "462-*65" })
  })

  it("footnote suffix: 500 F.2d at 125 n.14 (#202)", () => {
    const c = shortOf("500 F.2d at 125 n.14.")
    expect(c.pincite).toBe(125)
    expect(c.pinciteInfo).toEqual({ page: 125, footnote: 14, isRange: false, raw: "125 n.14" })
  })

  it("multi-footnote suffix: 500 F.2d at 125 nn.14-15 (#202)", () => {
    const c = shortOf("500 F.2d at 125 nn.14-15.")
    expect(c.pincite).toBe(125)
    expect(c.pinciteInfo).toEqual({
      page: 125,
      footnote: 14,
      footnoteEnd: 15,
      isRange: false,
      raw: "125 nn.14-15",
    })
  })

  it("paragraph pincite: 500 N.E.2d at ¶ 12 (#204) — page undefined, paragraph set", () => {
    const c = shortOf("500 N.E.2d at ¶ 12.")
    expect(c.pincite).toBeUndefined()
    expect(c.pinciteInfo).toEqual({ paragraph: 12, isRange: false, raw: "¶ 12" })
  })

  it("multi-pincite continuation: 500 U.S. at 1025, 1027 → additionalPincites (#639)", () => {
    const c = shortOf("500 U.S. at 1025, 1027.")
    expect(c.pincite).toBe(1025)
    expect(c.pinciteInfo).toEqual({
      page: 1025,
      isRange: false,
      raw: "1025",
      additionalPincites: [{ page: 1027, isRange: false, raw: "1027" }],
    })
  })

  it("trailing parenthetical: Smith, 500 F.2d at 125 (citations omitted) (#303/#869)", () => {
    const c = shortOf("Smith, 500 F.2d at 125 (citations omitted).")
    expect(c.parenthetical).toBe("citations omitted")
    expect(c.parentheticalNode?.type).toBe("other")
    expect(c.parentheticalNode?.text).toBe("citations omitted")
  })

  describe("pincite component span (clean + original offsets) (#210)", () => {
    it("party form: span slices the bare pincite '125'", () => {
      const text = "Smith, 500 F.2d at 125."
      const c = shortOf(text)
      const { pincite } = c.spans!
      expect(pincite).toBeDefined()
      expect(pincite).toEqual({
        cleanStart: 19,
        cleanEnd: 22,
        originalStart: 19,
        originalEnd: 22,
      })
      expect(text.slice(pincite!.originalStart, pincite!.originalEnd)).toBe("125")
    })

    it("comma-before-at form: span slices '721'", () => {
      const text = "The court in 597 U.S., at 721 held otherwise."
      const c = shortOf(text)
      const { pincite } = c.spans!
      expect(text.slice(pincite!.originalStart, pincite!.originalEnd)).toBe("721")
    })

    it("range form: span covers the full range body '462-65'", () => {
      const text = "500 F.2d at 462-65."
      const c = shortOf(text)
      const { pincite } = c.spans!
      expect(text.slice(pincite!.originalStart, pincite!.originalEnd)).toBe("462-65")
    })

    it("paragraph form: span covers the full pincite body '¶ 12' incl. marker", () => {
      const text = "500 N.E.2d at ¶ 12."
      const c = shortOf(text)
      const { pincite } = c.spans!
      expect(text.slice(pincite!.originalStart, pincite!.originalEnd)).toBe("¶ 12")
    })
  })
})
