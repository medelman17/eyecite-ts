import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"

function expectSpan(
  text: string,
  span: { originalStart: number; originalEnd: number } | undefined,
  expected: string,
) {
  expect(span).toBeDefined()
  expect(text.substring(span!.originalStart, span!.originalEnd)).toBe(expected)
}

describe("Component Spans — CourtListener Fixtures", () => {
  describe("Fixture 1: Parenthetical Chain", () => {
    const text =
      "The court reaffirmed this standard. Smith v. Jones, 500 F.2d 123, 130 (9th Cir. 2020) (holding that due process requires notice), aff'd, 550 U.S. 1 (2021)."

    it("extracts case name and core component spans for primary citation", () => {
      const cites = extractCitations(text)
      const s1 = cites.find((c) => c.type === "case" && c.matchedText?.includes("500 F.2d"))
      expect(s1).toBeDefined()
      if (s1?.type !== "case") return

      expectSpan(text, s1.spans?.caseName, "Smith v. Jones")
      expectSpan(text, s1.spans?.volume, "500")
      expectSpan(text, s1.spans?.reporter, "F.2d")
      expectSpan(text, s1.spans?.page, "123")
      expectSpan(text, s1.spans?.pincite, "130")
      expectSpan(text, s1.spans?.court, "9th Cir.")
      expectSpan(text, s1.spans?.year, "2020")
    })

    it("tracks metadataParenthetical and explanatory Parenthetical.span", () => {
      const cites = extractCitations(text)
      const s1 = cites.find((c) => c.type === "case" && c.matchedText?.includes("500 F.2d"))
      if (s1?.type !== "case") return

      expect(s1.spans?.metadataParenthetical).toBeDefined()
      expect(s1.parentheticals).toBeDefined()
      expect(s1.parentheticals!.length).toBeGreaterThan(0)
      expect(s1.parentheticals![0].span).toBeDefined()
    })
  })

  describe("Fixture 2: Nominative Reporter", () => {
    const text =
      "The principle was settled early in the Republic. Gelpcke v. City of Dubuque, 68 U.S. (1 Wall.) 175 (1864), held that municipal bonds could not be repudiated. See also Roosevelt v. Meyer, 68 U.S. (1 Wall.) 512 (1863)."

    it("tracks volume, reporter, page spans with nominative groups", () => {
      const cites = extractCitations(text)
      const s1 = cites.find((c) => c.type === "case" && c.matchedText?.includes("175"))
      expect(s1).toBeDefined()
      if (s1?.type !== "case") return

      expectSpan(text, s1.spans?.volume, "68")
      expectSpan(text, s1.spans?.reporter, "U.S.")
      expectSpan(text, s1.spans?.page, "175")
    })

    it("tracks signal span on second citation", () => {
      const cites = extractCitations(text)
      const s2 = cites.find((c) => c.type === "case" && c.matchedText?.includes("512"))
      expect(s2).toBeDefined()
      if (s2?.type !== "case") return

      // signal is normalized to lowercase "see also"; span captures "See also" in original text
      expect(s2.signal).toBe("see also")
      expect(s2.spans?.signal).toBeDefined()
      expectSpan(text, s2.spans?.signal, "See also")
    })
  })

  describe("Fixture 3: Long Court Names", () => {
    const text =
      "The district court agreed. Anderson v. Tech Corp., 456 F. Supp. 3d 789, 795 (N.D. Cal. Jan. 15, 2020). The state appellate court reached the opposite conclusion in Rivera v. Dept. of Revenue, 98 N.E.3d 542 (Mass. App. Ct. 2019). The bankruptcy court also addressed the matter. In re Debtor LLC, 612 B.R. 45 (Bankr. S.D.N.Y. 2020)."

    it("tracks court span for N.D. Cal.", () => {
      const cites = extractCitations(text)
      const s1 = cites.find((c) => c.type === "case" && c.matchedText?.includes("456 F."))
      if (s1?.type !== "case") return

      expectSpan(text, s1.spans?.court, "N.D. Cal.")
    })

    it("tracks court span for Mass. App. Ct.", () => {
      const cites = extractCitations(text)
      const s2 = cites.find((c) => c.type === "case" && c.matchedText?.includes("98 N.E.3d"))
      if (s2?.type !== "case") return

      expectSpan(text, s2.spans?.court, "Mass. App. Ct.")
    })

    it("tracks court span for Bankr. S.D.N.Y.", () => {
      const cites = extractCitations(text)
      const s3 = cites.find((c) => c.type === "case" && c.matchedText?.includes("612 B.R."))
      if (s3?.type !== "case") return

      expectSpan(text, s3.spans?.court, "Bankr. S.D.N.Y.")
    })
  })

  describe("Fixture 4: Signal String Mixed", () => {
    const text =
      "The constitutional basis is clear. See U.S. Const. amend. XIV, § 1; see also 42 U.S.C. § 1983; But see Town of Castle Rock v. Gonzales, 545 U.S. 748 (2005) (limiting the scope); Cf. Cal. Civ. Code § 1714(a)."

    it("extracts citations of multiple types", () => {
      const cites = extractCitations(text)
      expect(cites.some((c) => c.type === "constitutional")).toBe(true)
      expect(cites.some((c) => c.type === "statute")).toBe(true)
      expect(cites.some((c) => c.type === "case")).toBe(true)
    })

    it("tracks case citation signal span for 'But see'", () => {
      const cites = extractCitations(text)
      const caseCite = cites.find((c) => c.type === "case")
      if (caseCite?.type !== "case") return

      // signal is normalized to lowercase; original text has "But see"
      expect(caseCite.signal).toBe("but see")
      expect(caseCite.spans?.signal).toBeDefined()
      // span covers the literal signal text in the original document
      expectSpan(text, caseCite.spans?.signal, "But see")
    })
  })

  describe("Fixture 5: Statute Edge Cases", () => {
    const text =
      "The statute provides the cause of action. 42 U.S.C. § 1983(a)(1)(A) et seq. governs this claim. Congress enacted the relevant provisions in Pub. L. No. 111-148, § 1501. The state analog is Cal. Civ. Proc. Code § 425.16(b)(1)."

    it("tracks subsection span for deep chain", () => {
      const cites = extractCitations(text)
      const s1 = cites.find((c) => c.type === "statute" && c.matchedText?.includes("1983"))
      if (s1?.type !== "statute") return

      expectSpan(text, s1.spans?.section, "1983")
      // subsection span covers the "(a)(1)(A)" chain
      expect(s1.spans?.subsection).toBeDefined()
    })

    it("tracks public law congress and lawNumber spans", () => {
      const cites = extractCitations(text)
      const pl = cites.find((c) => c.type === "publicLaw")
      if (pl?.type !== "publicLaw") return

      // congress is "111", lawNumber is "148" from "Pub. L. No. 111-148"
      expectSpan(text, pl.spans?.congress, "111")
      expectSpan(text, pl.spans?.lawNumber, "148")
    })
  })

  describe("Fixture 6: Dense Mixed Paragraph", () => {
    const text =
      "The Seventh Circuit held that plaintiffs must demonstrate standing under Lujan v. Defenders of Wildlife, 504 U.S. 555, 560-61 (1992). See also U.S. Const. art. III, § 2; 28 U.S.C. § 1331. This court previously addressed the issue in Thompson, 300 F.3d at 752, relying on id. at 561. Cf. 42 U.S.C. § 2000e-2(a)."

    it("extracts all citation types", () => {
      const cites = extractCitations(text, { resolve: true })
      const types = new Set(cites.map((c) => c.type))
      expect(types.has("case")).toBe(true)
      expect(types.has("constitutional")).toBe(true)
      expect(types.has("statute")).toBe(true)
    })

    it("all full-type citations have spans populated", () => {
      const cites = extractCitations(text, { resolve: true })
      for (const c of cites) {
        if (c.type === "id" || c.type === "supra" || c.type === "shortFormCase") continue
        if ("spans" in c) {
          expect(c.spans).toBeDefined()
        }
      }
    })

    it("primary case citation has case name and year spans", () => {
      const cites = extractCitations(text, { resolve: true })
      const lujan = cites.find((c) => c.type === "case" && c.matchedText?.includes("504 U.S."))
      if (lujan?.type !== "case") return

      expectSpan(text, lujan.spans?.caseName, "Lujan v. Defenders of Wildlife")
      expectSpan(text, lujan.spans?.year, "1992")
    })
  })
})

describe("Component Spans — HTML/Whitespace Transformations", () => {
  it("spans resolve to correct original positions after HTML entity stripping", () => {
    // "&sect;" (6 chars) is replaced by "§" (1 char) in cleaned text; originalStart/End
    // must point back to "42" and "U.S.C." inside the original entity-containing string
    const text = "See 42 U.S.C. &sect; 1983."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "statute")
    if (c?.type !== "statute") return

    expectSpan(text, c.spans?.title, "42")
    expectSpan(text, c.spans?.code, "U.S.C.")
  })

  it("spans resolve correctly with <em> tags stripped", () => {
    // <em> and </em> tags are stripped; positions shift accordingly so volume/reporter/page
    // span values in the original string must still resolve correctly
    const text = "See <em>Smith v. Jones</em>, 500 F.2d 123 (2020)."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "case")
    if (c?.type !== "case") return

    expectSpan(text, c.spans?.volume, "500")
    expectSpan(text, c.spans?.reporter, "F.2d")
    expectSpan(text, c.spans?.page, "123")
  })

  it("spans survive whitespace normalization", () => {
    // Extra spaces between tokens are collapsed during cleaning; originalStart/End
    // must still point to the correct tokens in the original multi-space string
    const text = "See  500  F.2d  123  (2020)."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "case")
    if (c?.type !== "case") return

    expectSpan(text, c.spans?.volume, "500")
    expectSpan(text, c.spans?.page, "123")
  })
})
