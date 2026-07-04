import { describe, expect, it } from "vitest"
import { CitationParseError } from "@/extract"
import { groupSpan, optionalGroup, requireGroup } from "@/extract/groupAccessor"
import type { Token } from "@/tokenize"

const tok = (groups?: Record<string, string>, groupSpans?: Record<string, [number, number]>): Token => ({
  text: "410 U.S. 113",
  span: { cleanStart: 0, cleanEnd: 12 },
  type: "case",
  patternId: "t",
  groups,
  groupSpans,
})

describe("groupAccessor (#844)", () => {
  it("requireGroup returns the value or declines via CitationParseError", () => {
    expect(requireGroup(tok({ volume: "410" }), "volume")).toBe("410")
    expect(() => requireGroup(tok({ volume: "410" }), "page")).toThrow(CitationParseError)
    expect(() => requireGroup(tok(undefined), "volume")).toThrow(CitationParseError)
  })

  it("optionalGroup returns the value or undefined", () => {
    expect(optionalGroup(tok({ volume: "410" }), "volume")).toBe("410")
    expect(optionalGroup(tok({ volume: "410" }), "page")).toBeUndefined()
    expect(optionalGroup(tok(undefined), "volume")).toBeUndefined()
  })

  it("groupSpan returns the token-relative span or undefined", () => {
    expect(groupSpan(tok({ volume: "410" }, { volume: [0, 3] }), "volume")).toEqual([0, 3])
    expect(groupSpan(tok({ volume: "410" }), "volume")).toBeUndefined()
  })
})
