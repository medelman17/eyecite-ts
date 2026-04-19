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

  // ── star-pagination (#191) ──

  it("parses a star-paginated page", () => {
    expect(parsePincite("*2")).toEqual({
      page: 2,
      isRange: false,
      starPage: true,
      raw: "*2",
    })
  })

  it("parses 'at *3' with star-pagination", () => {
    expect(parsePincite("at *3")).toEqual({
      page: 3,
      isRange: false,
      starPage: true,
      raw: "at *3",
    })
  })

  it("parses a star-paginated range", () => {
    expect(parsePincite("*3-5")).toEqual({
      page: 3,
      endPage: 5,
      isRange: true,
      starPage: true,
      raw: "*3-5",
    })
  })

  it("parses a star-paginated range with star on both ends", () => {
    expect(parsePincite("*3-*5")).toEqual({
      page: 3,
      endPage: 5,
      isRange: true,
      starPage: true,
      raw: "*3-*5",
    })
  })

  it("does not set starPage for numeric pincites", () => {
    const result = parsePincite("570")
    expect(result?.starPage).toBeUndefined()
  })
})
