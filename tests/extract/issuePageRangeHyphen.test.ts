import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #705 — Page-range with hyphen and no comma (`100 F.2d 1-5`) was
 * silently dropped. The tokenizer's page-capture lookahead (`-\D`)
 * rejected the digit-hyphen-digit shape, so the citation never tokenized.
 * Fixed by extending the page capture to accept `\d+-\d+` (range form)
 * alongside `\d+` (single page) in both the federal-reporter tokenizer
 * pattern and the VOLUME_REPORTER_PAGE_REGEX extractor.
 */
describe("Issue #705 - page range with hyphen", () => {
  it("`100 F.2d 1-5` now extracts as a citation", () => {
    const cs = extractCitations(`100 F.2d 1-5`).filter((c) => c.type === "case")
    expect(cs).toHaveLength(1)
    expect((cs[0] as { page?: number }).page).toBe(1)
  })

  it("`See 100 F.2d 1-5.` extracts in prose context", () => {
    const cs = extractCitations(`See 100 F.2d 1-5.`).filter((c) => c.type === "case")
    expect(cs).toHaveLength(1)
    expect((cs[0] as { page?: number }).page).toBe(1)
  })

  it("`100 F.2d 1-5 (1990)` extracts with year", () => {
    const cs = extractCitations(`100 F.2d 1-5 (1990)`).filter((c) => c.type === "case")
    expect(cs).toHaveLength(1)
    const c = cs[0] as { page?: number; year?: number }
    expect(c.page).toBe(1)
    expect(c.year).toBe(1990)
  })

  it("single page `100 F.2d 1` unaffected", () => {
    const cs = extractCitations(`100 F.2d 1`).filter((c) => c.type === "case")
    expect(cs).toHaveLength(1)
    expect((cs[0] as { page?: number }).page).toBe(1)
  })

  it("page + comma pincite `100 F.2d 1, 5` unaffected", () => {
    const cs = extractCitations(`100 F.2d 1, 5`).filter((c) => c.type === "case")
    expect(cs).toHaveLength(1)
    expect((cs[0] as { page?: number }).page).toBe(1)
    expect((cs[0] as { pincite?: number }).pincite).toBe(5)
  })
})
