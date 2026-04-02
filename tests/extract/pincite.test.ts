import { describe, expect, it } from "vitest"
import { parsePincite } from "../../src/extract/pincite"

describe("parsePincite", () => {
  it("parses a simple page number", () => {
    expect(parsePincite("570")).toEqual({
      page: 570,
      isRange: false,
      raw: "570",
    })
  })

  it("strips 'at' prefix", () => {
    expect(parsePincite("at 570")).toEqual({
      page: 570,
      isRange: false,
      raw: "at 570",
    })
  })

  it("parses a page range with full end page", () => {
    expect(parsePincite("570-580")).toEqual({
      page: 570,
      endPage: 580,
      isRange: true,
      raw: "570-580",
    })
  })

  it("parses a page range with abbreviated end page", () => {
    expect(parsePincite("570-75")).toEqual({
      page: 570,
      endPage: 575,
      isRange: true,
      raw: "570-75",
    })
  })

  it("parses a footnote reference", () => {
    expect(parsePincite("570 n.3")).toEqual({
      page: 570,
      footnote: 3,
      isRange: false,
      raw: "570 n.3",
    })
  })

  it("parses a footnote with 'note' spelled out", () => {
    expect(parsePincite("570 note 3")).toEqual({
      page: 570,
      footnote: 3,
      isRange: false,
      raw: "570 note 3",
    })
  })

  it("parses a range with footnote", () => {
    expect(parsePincite("570-75 n.3")).toEqual({
      page: 570,
      endPage: 575,
      footnote: 3,
      isRange: true,
      raw: "570-75 n.3",
    })
  })

  it("returns null for unparseable input", () => {
    expect(parsePincite("")).toBeNull()
    expect(parsePincite("abc")).toBeNull()
  })

  it("handles 'at' with range", () => {
    expect(parsePincite("at 570-75")).toEqual({
      page: 570,
      endPage: 575,
      isRange: true,
      raw: "at 570-75",
    })
  })

  it("handles en-dash range", () => {
    expect(parsePincite("570\u201375")).toEqual({
      page: 570,
      endPage: 575,
      isRange: true,
      raw: "570\u201375",
    })
  })

  it("handles em-dash range", () => {
    expect(parsePincite("570\u201475")).toEqual({
      page: 570,
      endPage: 575,
      isRange: true,
      raw: "570\u201475",
    })
  })
})
