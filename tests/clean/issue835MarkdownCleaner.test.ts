/**
 * Issue #835: ship a built-in, opt-in markdown-emphasis cleaner and an
 * `additionalCleaners` option that augments (rather than replaces) the default
 * cleaner chain.
 */

import { describe, expect, it } from "vitest"
import { cleanText, extractCitations, stripMarkdownEmphasis } from "@/index"

interface MaybeCaseName {
  caseName?: string
}

describe("#835 stripMarkdownEmphasis cleaner", () => {
  it("strips single-asterisk emphasis", () => {
    expect(stripMarkdownEmphasis("*Singh v. T-Mobile*")).toBe("Singh v. T-Mobile")
  })

  it("strips double-asterisk (bold) emphasis", () => {
    expect(stripMarkdownEmphasis("**Leon v. Martinez**")).toBe("Leon v. Martinez")
  })

  it("strips triple-asterisk (bold italic) emphasis", () => {
    expect(stripMarkdownEmphasis("***Roe v. Wade***")).toBe("Roe v. Wade")
  })

  it("strips emphasis inline within prose, leaving the rest intact", () => {
    expect(stripMarkdownEmphasis("see *Leon v. Martinez*, 84 N.Y.2d 83")).toBe(
      "see Leon v. Martinez, 84 N.Y.2d 83",
    )
  })

  it("preserves star-pagination pincites (asterisk followed by a digit)", () => {
    expect(stripMarkdownEmphasis("Foo, 2024 NY Slip Op 04063, at *3")).toBe(
      "Foo, 2024 NY Slip Op 04063, at *3",
    )
  })

  it("leaves underscores untouched (blank locators and underscore emphasis)", () => {
    expect(stripMarkdownEmphasis("2021 N.Y. Slip Op. [____] (2021)")).toBe(
      "2021 N.Y. Slip Op. [____] (2021)",
    )
    expect(stripMarkdownEmphasis("_untouched_")).toBe("_untouched_")
  })

  it("does not strip lone or space-flanked asterisks", () => {
    expect(stripMarkdownEmphasis("a * b")).toBe("a * b")
    expect(stripMarkdownEmphasis("3 * 4 = 12")).toBe("3 * 4 = 12")
  })

  it("does not strip a backslash-escaped asterisk pair", () => {
    expect(stripMarkdownEmphasis("\\*literal\\*")).toBe("\\*literal\\*")
  })

  it("completes quickly on a long unterminated emphasis run (ReDoS-safe)", () => {
    // One opening asterisk + a long no-close body: exercises the lazy quantifier's
    // backtracking. A single bounded quantifier stays linear.
    const evil = `*${"a".repeat(100000)}`
    const start = performance.now()
    const out = stripMarkdownEmphasis(evil)
    expect(performance.now() - start).toBeLessThan(100)
    expect(out).toBe(evil) // no closing asterisk → nothing stripped
  })
})

describe("#835 additionalCleaners option (cleanText)", () => {
  it("is opt-in: the default chain does NOT strip markdown emphasis", () => {
    expect(cleanText("*Leon v. Martinez*").cleaned).toContain("*")
  })

  it("runs additionalCleaners ALONGSIDE the default chain (defaults + markdown both apply)", () => {
    const { cleaned } = cleanText("<b>*Leon v. Martinez*</b>", undefined, [stripMarkdownEmphasis])
    expect(cleaned).not.toContain("<b>") // default stripHtmlTags ran
    expect(cleaned).not.toContain("*") // markdown cleaner ran
    expect(cleaned).toContain("Leon v. Martinez")
  })

  it("appends additionalCleaners after a custom `cleaners` base (defaults replaced, not the additions)", () => {
    const base = (t: string) => t.replace(/FOO/g, "BAR")
    const { cleaned } = cleanText("<b>FOO *x*</b>", [base], [stripMarkdownEmphasis])
    expect(cleaned).toContain("<b>") // defaults were replaced by [base], so HTML survives
    expect(cleaned).toContain("BAR") // custom base ran
    expect(cleaned).not.toContain("*") // additionalCleaners still ran
  })

  it("leaves the existing `cleaners` (replace) behavior unchanged when no additionalCleaners given", () => {
    const base = (t: string) => t.replace(/FOO/g, "BAR")
    expect(cleanText("<b>FOO</b>", [base]).cleaned).toBe("<b>BAR</b>")
  })
})

describe("#835 additionalCleaners via extractCitations", () => {
  it("captures an emphasized case name and still applies the default chain", () => {
    const text = "see <b>*Leon v. Martinez*</b>, 84 N.Y.2d 83, 87 (1994)."
    const cites = extractCitations(text, { additionalCleaners: [stripMarkdownEmphasis] })
    const c = cites.find((x) => x.type === "case") as unknown as MaybeCaseName | undefined
    expect(c?.caseName).toBe("Leon v. Martinez")
  })

  it("keeps result positions mapped to the ORIGINAL (emphasized) text", () => {
    const text = "see *Leon v. Martinez*, 84 N.Y.2d 83, 87 (1994)."
    const cites = extractCitations(text, { additionalCleaners: [stripMarkdownEmphasis] })
    const core = cites.find((x) => x.type === "case")
    expect(core).toBeDefined()
    if (core) {
      expect(text.slice(core.span.originalStart, core.span.originalEnd)).toContain("84 N.Y.2d 83")
    }
  })
})
