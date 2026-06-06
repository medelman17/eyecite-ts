import { describe, expect, it } from "vitest"
import { contentHash } from "@/utils/contentHash"

describe("contentHash", () => {
  it("is deterministic", () => {
    expect(contentHash("410 U.S. 113", "Roe ", " (1973)")).toBe(
      contentHash("410 U.S. 113", "Roe ", " (1973)"),
    )
  })

  it("does not collide across field boundaries (NUL join)", () => {
    // exact "a b" must differ from exact "a" + prefix "b".
    expect(contentHash("a b")).not.toBe(contentHash("a", "b"))
  })

  it("is stable across Unicode normalization forms", () => {
    // precomposed e-acute (U+00E9) vs decomposed e + combining acute (U+0301).
    expect(contentHash("caf\u00e9")).toBe(contentHash("cafe\u0301"))
  })

  it("returns 16-char lowercase hex", () => {
    expect(contentHash("x")).toMatch(/^[0-9a-f]{16}$/)
  })
})
