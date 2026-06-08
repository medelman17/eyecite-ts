import { describe, expect, it, vi } from "vitest"

// Replace one extractor with a function that throws a NON-parse error (a
// genuine bug, not a tokenizer/extractor divergence). The orchestrator's #881
// catch must decline ONLY CitationParseError; any other error must propagate so
// real defects stay visible. This guards against a future blanket `catch`.
vi.mock("@/extract", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/extract")>()
  return {
    ...actual,
    extractStatute: () => {
      throw new TypeError("genuine bug — not a parse decline")
    },
  }
})

import { extractCitations } from "@/index"

describe("extractCitations propagates genuine (non-parse) errors (#881)", () => {
  it("rethrows a non-CitationParseError thrown by an extractor", () => {
    // "42 U.S.C. § 1983" tokenizes as a statute → routes to the mocked extractor.
    expect(() => extractCitations("See 42 U.S.C. § 1983.")).toThrow("genuine bug")
  })
})
