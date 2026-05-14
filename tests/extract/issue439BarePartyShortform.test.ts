import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import { stripHtmlTags } from "@/clean"
import type { Citation, ShortFormCaseCitation } from "@/types/citation"

const shortForms = (cites: Citation[]): ShortFormCaseCitation[] =>
  cites.filter((c): c is ShortFormCaseCitation => c.type === "shortFormCase")

describe("issue #439 — bare-party shortform back-reference", () => {
  describe("basic positive cases", () => {
    it("extracts `Smith, at 12` after `Smith v. Jones`", () => {
      const text = "Smith v. Jones, 100 F.2d 50 (1990). Smith, at 12, held."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(1)
      expect(short[0].partyName).toBe("Smith")
      expect(short[0].pincite).toBe(12)
    })

    it("extracts defendant-side back-ref (`Jones, at 12` after `Smith v. Jones`)", () => {
      const text = "Smith v. Jones, 100 F.2d 50 (1990). Jones, at 12, dissented."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(1)
      expect(short[0].partyName).toBe("Jones")
      expect(short[0].pincite).toBe(12)
    })

    it("inherits volume / reporter / page from anchor citation", () => {
      const text =
        "Smith v. Jones, 500 F.2d 100, 105 (9th Cir. 1990). Smith, at 110, held that..."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(1)
      expect(short[0].volume).toBe(500)
      expect(short[0].reporter).toMatch(/F\.2d/)
      expect(short[0].page).toBe(100)
      expect(short[0].pincite).toBe(110)
    })

    it("emits citations sorted in document order", () => {
      const text =
        "See Smith v. Jones, 100 F.2d 50 (1990). Later, Smith, at 12, held; see also Adams v. Brown, 200 F.3d 60 (2000)."
      const cites = extractCitations(text)
      for (let i = 1; i < cites.length; i++) {
        expect(cites[i].span.cleanStart).toBeGreaterThanOrEqual(cites[i - 1].span.cleanStart)
      }
    })
  })

  describe("pincite shapes", () => {
    it("hyphenated page range: `Smith, at 12-13`", () => {
      const text = "Smith v. Jones, 100 F.2d 50 (1990). Smith, at 12-13."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(1)
      expect(short[0].pincite).toBe(12)
      expect(short[0].pinciteInfo?.endPage).toBe(13)
      expect(short[0].pinciteInfo?.isRange).toBe(true)
    })

    it("short-form hyphenated range: `Smith, at 887-88`", () => {
      const text = "Smith v. Jones, 100 F.2d 50 (1990). Smith, at 887-88."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(1)
      expect(short[0].pincite).toBe(887)
    })

    it("comma-separated multi pincite: `Smith, at 12-13, 21`", () => {
      const text = "Smith v. Jones, 100 F.2d 50 (1990). Smith, at 12-13, 21 (dictum)."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(1)
      expect(short[0].pincite).toBe(12)
    })

    it("single page pincite is parsed as numeric", () => {
      const text = "Striker v. Foo, 500 F.2d 100 (1990). Striker, at 871."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(1)
      expect(short[0].pincite).toBe(871)
    })
  })

  describe("name shapes", () => {
    it("apostrophe in name: `O'Brien, at 5`", () => {
      const text = "O'Brien v. State, 100 F.2d 50 (1990). O'Brien, at 5."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(1)
      expect(short[0].partyName).toBe("O'Brien")
    })

    it("hyphenated name: `Smith-Jones, at 12`", () => {
      const text = "Smith-Jones v. State, 100 F.2d 50 (1990). Smith-Jones, at 12."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(1)
      expect(short[0].partyName).toBe("Smith-Jones")
    })

    it("multi-word entity: `South Hollywood Hills Citizens Ass'n, at 73`", () => {
      const text =
        "South Hollywood Hills Citizens Ass'n v. City, 100 F.2d 50 (1990). The court in South Hollywood Hills Citizens Ass'n, at 73, held..."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(1)
      expect(short[0].partyName).toBe("South Hollywood Hills Citizens Ass'n")
      expect(short[0].pincite).toBe(73)
    })

    it("`In re Smith` anchor allows `Smith, at 12` back-ref", () => {
      const text = "In re Smith, 100 F.2d 50 (1990). Smith, at 12."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short.length).toBeGreaterThanOrEqual(1)
      expect(short[0].partyName).toBe("Smith")
    })
  })

  describe("multiple references", () => {
    it("multiple bare-refs to same anchor", () => {
      const text =
        "Smith v. Jones, 100 F.2d 50 (1990). Smith, at 12. Later, Smith, at 14."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(2)
      expect(short[0].pincite).toBe(12)
      expect(short[1].pincite).toBe(14)
    })

    it("two cases with disjoint party names — each gets its own back-ref", () => {
      const text =
        "Smith v. Jones, 100 F.2d 50 (1990). Then Adams v. Brown, 200 F.3d 60 (2000). Smith, at 12. Adams, at 22."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(2)
      expect(short[0].partyName).toBe("Smith")
      expect(short[0].volume).toBe(100)
      expect(short[1].partyName).toBe("Adams")
      expect(short[1].volume).toBe(200)
    })

    it("same plaintiff in two cases — bare-ref points to most-recent anchor", () => {
      const text =
        "First, Smith v. Foo, 100 F.2d 1 (1990). Then Smith v. Bar, 200 F.3d 2 (2000). Smith, at 12."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(1)
      // The bare-ref appears after both anchors, so it should bind to the
      // more recent (the `200 F.3d 2` citation, volume=200).
      expect(short[0].volume).toBe(200)
    })

    it("two same-name anchors with a bare-ref between them — bare-ref binds to earlier", () => {
      const text =
        "Smith v. Foo, 100 F.2d 1 (1990). Smith, at 12. Then Smith v. Bar, 200 F.3d 2 (2000)."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(1)
      expect(short[0].volume).toBe(100)
    })
  })

  describe("span fidelity", () => {
    it("cleanStart / cleanEnd point to the bare-party match in cleaned text", () => {
      const text = "Smith v. Jones, 100 F.2d 50 (1990). Smith, at 12, held."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(1)
      const { cleanStart, cleanEnd } = short[0].span
      expect(text.slice(cleanStart, cleanEnd)).toBe("Smith, at 12")
    })

    it("originalStart / originalEnd map past stripped HTML tags", () => {
      const text =
        "Smith v. Jones, 100 F.2d 50 (1990). <em>Smith</em>, at 12, held."
      const cites = extractCitations(text, { cleaners: [stripHtmlTags] })
      const short = shortForms(cites)
      expect(short).toHaveLength(1)
      const { originalStart, originalEnd } = short[0].span
      // originalStart should point at the `S` of the visible `Smith` (past
      // the opening `<em>` tag). originalEnd lands past the digits `12`.
      expect(text.slice(originalStart, originalStart + 5)).toBe("Smith")
      expect(text.slice(originalStart, originalEnd)).toContain("Smith")
      expect(text.slice(originalStart, originalEnd)).toContain("at 12")
    })
  })

  describe("negative cases (false-positive avoidance)", () => {
    it("bare `Smith, at 12` with NO earlier full citation → not extracted", () => {
      const text = "Striker, at 871"
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(0)
    })

    it("bare-ref BEFORE the anchor in text → not extracted", () => {
      const text = "Smith, at 12, said. Later, Smith v. Jones, 100 F.2d 50 (1990) was decided."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(0)
    })

    it("pincite must be numeric — `Smith, at noon` not extracted", () => {
      const text = "Smith v. Jones, 100 F.2d 50 (1990). Smith, at noon, the court..."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(0)
    })

    it("explanatory text `Smith, at the time, ...` not extracted", () => {
      const text = "Smith v. Jones, 100 F.2d 50 (1990). Smith, at the time, was wrong."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(0)
    })

    it("no comma → not extracted: `Smith at 12` is ambiguous prose", () => {
      const text = "Smith v. Jones, 100 F.2d 50 (1990). Smith at 12 was unclear."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(0)
    })

    it("anchor name `The` (blocked common word) not used", () => {
      const text = "Smith v. Jones, 100 F.2d 50 (1990). The, at 12, was unclear."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(0)
    })

    it("does not partial-match `Smithson, at 12` against anchor `Smith`", () => {
      const text = "Smith v. Jones, 100 F.2d 50 (1990). Smithson, at 12."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      // Lookbehind on `[A-Za-z']` should reject the `Smithson` prefix-collision.
      expect(short).toHaveLength(0)
    })

    it("does not match across leading letter (`mySmith, at 12`)", () => {
      const text = "Smith v. Jones, 100 F.2d 50 (1990). mySmith, at 12."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(0)
    })

    it("`Smith, supra, at 12` is supra, not bare-party (no FP)", () => {
      const text = "Smith v. Jones, 100 F.2d 50 (1990). See Smith, supra, at 12."
      const cites = extractCitations(text)
      const bareParty = shortForms(cites).filter(
        (c) => /^[A-Z][\w']*, at \d+$/.test(c.matchedText.trim()),
      )
      // `Smith, supra, at 12` already routes to supra extraction — our bare-
      // party pass must NOT also emit a duplicate `Smith, at 12` citation.
      expect(bareParty).toHaveLength(0)
    })

    it("`Smith, 500 F.2d at 125` is volume-reporter shortform, not bare-party", () => {
      const text = "Smith v. Jones, 500 F.2d 50 (1990). Smith, 500 F.2d at 125."
      const cites = extractCitations(text)
      const shorts = shortForms(cites)
      // The traditional `Smith, vol reporter at page` form already covers
      // this. Our bare-party pass should not duplicate it.
      const bareForms = shorts.filter((c) => !c.matchedText.match(/F\.2d/))
      expect(bareForms).toHaveLength(0)
    })

    it("two-character name `Lu` would be blocked by min-length filter", () => {
      // Even if `Lu` were a real plaintiff, it's below BARE_PARTY_MIN_NAME_LEN
      // and would not be indexed. The test asserts a 3-char name doesn't
      // pollute as a back-ref source.
      const text = "Lu v. State, 100 F.2d 50 (1990). Lu, at 12, said."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(0)
    })

    it("blocked anchor `United States, at 5` does not back-reference", () => {
      const text =
        "United States v. Smith, 100 F.2d 50 (1990). United States, at 5, argued."
      const cites = extractCitations(text)
      const short = shortForms(cites).filter(
        (c) => c.partyName?.toLowerCase() === "united states",
      )
      expect(short).toHaveLength(0)
    })
  })

  describe("real samples from issue body", () => {
    it("`Striker, at 871`", () => {
      const text = "Striker v. Foo, 500 F.2d 100 (1990). Striker, at 871, held."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(1)
      expect(short[0].partyName).toBe("Striker")
      expect(short[0].pincite).toBe(871)
    })

    it("`Pacheco, at 65`", () => {
      const text = "Pacheco v. State, 100 N.E.2d 50 (2000). Pacheco, at 65."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(1)
      expect(short[0].pincite).toBe(65)
    })

    it("`Hutchison, at 887-88`", () => {
      const text =
        "Hutchison v. Doe, 600 F.3d 880 (5th Cir. 2010). Hutchison, at 887-88, held."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(1)
      expect(short[0].pincite).toBe(887)
    })

    it("`Rewolinski, at 12-13, 21` page-range + multi-page", () => {
      const text =
        "Rewolinski v. State, 600 F.3d 10 (7th Cir. 2010). Rewolinski, at 12-13, 21 (dictum)."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(1)
      expect(short[0].pincite).toBe(12)
    })
  })

  describe("citation metadata", () => {
    it("emits type='shortFormCase'", () => {
      const text = "Smith v. Jones, 100 F.2d 50 (1990). Smith, at 12."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short[0].type).toBe("shortFormCase")
    })

    it("partyNameNormalized is lowercase", () => {
      const text = "Smith v. Jones, 100 F.2d 50 (1990). Smith, at 12."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short[0].partyNameNormalized).toBe("smith")
    })

    it("confidence is bounded between 0 and 1", () => {
      const text = "Smith v. Jones, 100 F.2d 50 (1990). Smith, at 12."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short[0].confidence).toBeGreaterThan(0)
      expect(short[0].confidence).toBeLessThanOrEqual(1)
    })

    it("matchedText equals text and contains both party name and pincite", () => {
      const text = "Smith v. Jones, 100 F.2d 50 (1990). Smith, at 12, held."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short[0].matchedText).toBe("Smith, at 12")
      expect(short[0].text).toBe("Smith, at 12")
    })

    it("pinciteInfo.isRange true for hyphenated pincites", () => {
      const text = "Smith v. Jones, 100 F.2d 50 (1990). Smith, at 12-15."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short[0].pinciteInfo?.isRange).toBe(true)
      expect(short[0].pinciteInfo?.endPage).toBe(15)
    })
  })

  describe("multiple matches per anchor", () => {
    it("two refs to same anchor in the same sentence", () => {
      const text =
        "Smith v. Jones, 100 F.2d 50 (1990). The court held in Smith, at 12, and Smith, at 14, that..."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(2)
      expect(short[0].pincite).toBe(12)
      expect(short[1].pincite).toBe(14)
    })

    it("ref inside a parenthetical phrase", () => {
      const text =
        "See Smith v. Jones, 100 F.2d 50 (1990) (overruling, in part, Smith, at 12)."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(1)
      expect(short[0].pincite).toBe(12)
    })

    it("ref across paragraphs", () => {
      const text =
        "Smith v. Jones, 100 F.2d 50 (1990).\n\nIn the second paragraph, Smith, at 12, was central."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(1)
    })
  })

  describe("non-overlap with existing citations", () => {
    it("bare-party shortform does not duplicate when text already had a full citation", () => {
      // First cite: Smith v. Jones, 100 F.2d 50. Second mention is also a
      // full case citation: 200 F.3d 100. Both should be extracted as 'case'.
      // Our pass should not also emit a bare-party citation overlapping the
      // second cite.
      const text =
        "Smith v. Jones, 100 F.2d 50 (1990). Then Smith v. Doe, 200 F.3d 100 (2000)."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      // Neither full cite is bare-party — both have "v." structure.
      expect(short).toHaveLength(0)
    })
  })

  describe("resolver integration", () => {
    it("`resolve: true` returns resolved bare-party shortform", () => {
      const text = "Smith v. Jones, 100 F.2d 50 (1990). Smith, at 12, held."
      const resolved = extractCitations(text, { resolve: true })
      const short = resolved.filter((c) => c.type === "shortFormCase")
      expect(short.length).toBeGreaterThanOrEqual(1)
    })

    it("bare-party shortform has resolution metadata when `resolve: true`", () => {
      const text = "Smith v. Jones, 100 F.2d 50 (1990). Smith, at 12, held."
      const resolved = extractCitations(text, { resolve: true })
      const bareShort = resolved.find(
        (r) => r.type === "shortFormCase" && r.partyName === "Smith",
      )
      expect(bareShort).toBeDefined()
      if (bareShort && bareShort.type === "shortFormCase") {
        // Resolver attaches a `resolution` field on short-form citations.
        expect("resolution" in bareShort).toBe(true)
      }
    })
  })

  describe("compatibility — does not break existing patterns", () => {
    it("existing `Id. at 12` still extracts", () => {
      const text = "Smith v. Jones, 100 F.2d 50 (1990). Id. at 12."
      const cites = extractCitations(text)
      const id = cites.find((c) => c.type === "id")
      expect(id).toBeDefined()
    })

    it("existing `Smith, supra, at 12` still extracts as supra", () => {
      const text = "Smith v. Jones, 100 F.2d 50 (1990). See Smith, supra, at 12."
      const cites = extractCitations(text)
      const supra = cites.find((c) => c.type === "supra")
      expect(supra).toBeDefined()
    })

    it("existing `Smith, 500 F.2d at 125` (vol+reporter shortform) still extracts", () => {
      const text = "Smith v. Jones, 500 F.2d 50 (1990). See Smith, 500 F.2d at 125."
      const cites = extractCitations(text)
      const shortWithVolume = cites.find(
        (c) => c.type === "shortFormCase" && /F\.2d/.test(c.matchedText),
      )
      expect(shortWithVolume).toBeDefined()
    })
  })

  describe("trailing punctuation", () => {
    it("trailing period not absorbed into pincite", () => {
      const text = "Smith v. Jones, 100 F.2d 50 (1990). Smith, at 12."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short[0].pincite).toBe(12)
      expect(short[0].matchedText).toBe("Smith, at 12")
    })

    it("trailing semicolon not absorbed", () => {
      const text = "Smith v. Jones, 100 F.2d 50 (1990). Smith, at 12; see also..."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short[0].pincite).toBe(12)
    })

    it("trailing close paren not absorbed", () => {
      const text = "Smith v. Jones, 100 F.2d 50 (1990) (citing Smith, at 12)."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short.length).toBeGreaterThanOrEqual(1)
      expect(short[0].pincite).toBe(12)
    })
  })

  describe("state reporters", () => {
    it("Wisconsin Wis. 2d back-ref `Hutchison, at 887-88`", () => {
      const text =
        "Hutchison v. State, 300 Wis. 2d 880, 887 (2007). Hutchison, at 887-88, applies here."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short.length).toBeGreaterThanOrEqual(1)
      expect(short[0].partyName).toBe("Hutchison")
      expect(short[0].pincite).toBe(887)
    })

    it("Massachusetts back-ref", () => {
      const text =
        "Athas v. Commonwealth, 200 Mass. 78 (1990). Athas, at 79, held that..."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short.length).toBeGreaterThanOrEqual(1)
      expect(short[0].partyName).toBe("Athas")
      expect(short[0].pincite).toBe(79)
    })

    it("state opinion with mixed federal anchors", () => {
      const text =
        "See Foo v. State, 100 N.E.2d 50 (Ind. 2010); Bar v. Smith, 600 F.3d 200 (7th Cir. 2010). The court in Foo, at 65, agreed, while Bar, at 220, dissented."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(2)
      expect(short.map((s) => s.partyName).sort()).toEqual(["Bar", "Foo"])
    })
  })

  describe("ambiguous prose edge cases", () => {
    it("`Smith, at 5 we have` — pincite followed by prose word is risky but matches", () => {
      // Documents the current (lenient) behavior. The pincite-then-letter
      // pattern is rare in real opinions but possible. Reviewers can tighten
      // later if FP rate climbs. Asserted as a regression sentinel.
      const text =
        "Smith v. Jones, 100 F.2d 50 (1990). Smith, at 5 we have a different rule."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      // Either 0 or 1 is acceptable — primary check is no exceptions thrown.
      expect(short.length).toBeLessThanOrEqual(1)
      if (short.length === 1) expect(short[0].pincite).toBe(5)
    })

    it("`Smith, at the start` — non-numeric pincite rejected", () => {
      const text =
        "Smith v. Jones, 100 F.2d 50 (1990). Smith, at the start of trial..."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(0)
    })
  })

  describe("plaintiff-only and defendant-only anchoring", () => {
    it("matches against either plaintiff or defendant", () => {
      const text = "Smith v. Jones, 100 F.2d 50 (1990). Both Smith, at 12 and Jones, at 13."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(2)
      const names = short.map((s) => s.partyName).sort()
      expect(names).toEqual(["Jones", "Smith"])
    })
  })

  describe("California style `at p. N` / `at pp. N-M` (#454)", () => {
    it("`Taylor, at p. 19` extracts with pincite=19", () => {
      const text = "Taylor v. State, 50 Cal. 3d 10, 19 (1990). Taylor, at p. 19."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(1)
      expect(short[0].partyName).toBe("Taylor")
      expect(short[0].pincite).toBe(19)
    })

    it("multi-word plaintiff with p. prefix", () => {
      const text =
        "Woodland Hills v. City, 23 Cal. 3d 917 (1979). Woodland Hills, at p. 947."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(1)
      expect(short[0].pincite).toBe(947)
    })

    it("`Lexin, at pp. 1085-1092` with pp. (plural) prefix and range", () => {
      const text =
        "Lexin v. Superior Court, 47 Cal. 4th 1050 (2010). Lexin, at pp. 1085-1092."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(1)
      expect(short[0].pincite).toBe(1085)
      expect(short[0].pinciteInfo?.endPage).toBe(1092)
    })

    it("`Smith, at page 19` spelled-out form", () => {
      const text = "Smith v. State, 50 Cal. 3d 10 (1990). Smith, at page 19."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(1)
      expect(short[0].pincite).toBe(19)
    })

    it("`Smith, at pages 19-22` spelled-out plural form", () => {
      const text = "Smith v. State, 50 Cal. 3d 10 (1990). Smith, at pages 19-22."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(1)
      expect(short[0].pincite).toBe(19)
    })

    it("does not match `at p.` followed by non-digit", () => {
      const text = "Smith v. State, 50 Cal. 3d 10 (1990). Smith, at p. trial..."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(0)
    })

    it("non-CA-style `Smith, at 19` still works after #454 (regression)", () => {
      const text = "Smith v. State, 100 F.2d 10 (1990). Smith, at 19."
      const cites = extractCitations(text)
      const short = shortForms(cites)
      expect(short).toHaveLength(1)
      expect(short[0].pincite).toBe(19)
    })
  })
})
