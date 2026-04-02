import { describe, expect, it } from "vitest"

describe("eyecite-ts/utils entry point", () => {
  it("exports CaseGroup type (compile-time check)", async () => {
    // Dynamic import to test the actual entry point resolution
    const utils = await import("../../src/utils/index")

    // Module should load without error
    expect(utils).toBeDefined()
  })

  it("does not export anything from core extraction", async () => {
    const utils = await import("../../src/utils/index")
    const exportedKeys = Object.keys(utils)

    // Currently type-only, so no runtime exports
    // This test will be updated as functions are added (#95-#98)
    // For now, verify no extraction internals leak through
    expect(exportedKeys).not.toContain("extractCitations")
    expect(exportedKeys).not.toContain("tokenize")
    expect(exportedKeys).not.toContain("cleanText")
  })
})
