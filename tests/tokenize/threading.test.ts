import { describe, expect, it } from "vitest"
import { tokenize } from "@/tokenize"
import type { Pattern } from "@/patterns"

// A throwaway pattern with named groups + an optional (non-participating) group.
const NAMED: Pattern = {
  id: "test-named",
  regex: /(?<vol>\d+)\s+(?<rep>U\.S\.)(?:\s+\((?<nom>\d+)\))?\s+(?<page>\d+)/gd,
  description: "test",
  type: "case",
}

describe("tokenize() threads named groups (#844)", () => {
  it("threads groups + token-relative spans, omitting non-participating groups", () => {
    const text = "see 410 U.S. 113 here"
    const [tok] = tokenize(text, [NAMED])
    expect(tok.groups).toEqual({ vol: "410", rep: "U.S.", page: "113" }) // no `nom`
    // token starts at index 4 ("410..."); spans are token-relative.
    expect(tok.groupSpans?.vol).toEqual([0, 3])
    expect(tok.groupSpans?.page).toEqual([9, 12])
    expect(tok.groupSpans?.nom).toBeUndefined()
  })

  it("threads nothing for a pattern without named groups", () => {
    const positional: Pattern = { id: "pos", regex: /(\d+) U\.S\. (\d+)/gd, description: "x", type: "case" }
    const [tok] = tokenize("410 U.S. 113", [positional])
    expect(tok.groups).toBeUndefined()
    expect(tok.groupSpans).toBeUndefined()
  })
})
