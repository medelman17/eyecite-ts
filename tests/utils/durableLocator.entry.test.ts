import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import { toDurableLocator, toDurableLocators } from "@/utils"
import type { DurableLocator, DurableLocatorOptions } from "@/utils"

describe("eyecite-ts/utils durable-locator exports", () => {
  it("re-exports the builder functions from the entry point", () => {
    expect(typeof toDurableLocator).toBe("function")
    expect(typeof toDurableLocators).toBe("function")
  })

  it("the types are usable from the entry point", () => {
    const opts: DurableLocatorOptions = { space: "original" }
    const loc: DurableLocator = toDurableLocator(
      extractCitations("We cite 410 U.S. 113 here.")[0]!,
      "We cite 410 U.S. 113 here.",
      opts,
    )
    expect(loc.quote.exact).toBe("410 U.S. 113")
  })
})
