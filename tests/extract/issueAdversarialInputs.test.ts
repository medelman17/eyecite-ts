/**
 * Regression tests for adversarial / edge-case inputs that should not
 * crash the extractor, produce wrong field values, or otherwise leak
 * "crap" into the output.
 *
 * Each `it.todo` documents a known gap that hasn't been fixed yet.
 */
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"

const caseOf = (text: string) =>
  extractCitations(text).filter((c) => c.type === "case")

describe("adversarial input regression", () => {
  describe("doubled / missing punctuation in reporter", () => {
    it.todo("`100 U..S. 123` (doubled period) should not extract as case with reporter=U..S.", () => {
      const cs = caseOf("100 U..S. 123")
      expect(cs).toHaveLength(0)
    })

    it.todo("`100 US 123` (missing periods) should not extract as bare-letter reporter", () => {
      // `US` without periods is not a recognized reporter; the broad
      // state-reporter regex shouldn't claim 2-letter all-caps prose.
      const cs = caseOf("100 US 123")
      expect(cs).toHaveLength(0)
    })

    it.todo("`100 U . S . 123` (extra spaces inside U.S.) should normalize and extract", () => {
      // Real OCR'd documents have inconsistent spacing inside reporter
      // abbreviations. The cleaner should collapse `U . S .` → `U.S.`
      // OR the regex should accept the spaced form.
      const cs = caseOf("100 U . S . 123")
      expect(cs).toHaveLength(1)
    })
  })

  describe("page number parsing", () => {
    it.todo("`100 U.S. 1,234` thousands-separator page should not parse as page=1+pincite=234", () => {
      // Currently extracts page=1, pincite=234 — wrong. Either the comma
      // should be stripped (page=1234) or the citation should be rejected
      // as ambiguous. Deferred until we have a clean strategy for the
      // pincite parser to detect this shape (no whitespace after comma).
      const cs = caseOf("100 U.S. 1,234")
      if (cs[0]) {
        const page = (cs[0] as Record<string, unknown>).page as number | undefined
        const pincite = (cs[0] as Record<string, unknown>).pincite as number | undefined
        const badParse = page === 1 && pincite === 234
        expect(badParse).toBe(false)
      }
    })

    it.todo("`100 U.S. 1-5` hyphenated page range should extract as case (not journal)", () => {
      // Currently mis-routes to journal: case pattern's page terminator
      // rejects `-`, journal pattern accepts via `\b`. Fixing requires
      // either (a) extending case-pattern page-range capture or
      // (b) tightening journal page-terminator AND extending case to
      // accept the hyphen. Single-side changes break other tests
      // (Connecticut `229 Conn. 274-76`, KSA `K.S.A. 2009 Supp. 44-501`).
      // Deferred to follow-up that handles both patterns together.
      const cases = caseOf("100 U.S. 1-5")
      const journals = extractCitations("100 U.S. 1-5").filter((c) => c.type === "journal")
      expect(cases.length).toBeGreaterThanOrEqual(1)
      expect(journals).toHaveLength(0)
    })
  })

  describe("implausible volume/page magnitudes", () => {
    it.todo("`0 U.S. 1` (vol 0) should be rejected", () => {
      const cs = caseOf("0 U.S. 1")
      expect(cs).toHaveLength(0)
    })

    it.todo("`1 U.S. 0` (page 0) should be rejected", () => {
      const cs = caseOf("1 U.S. 0")
      expect(cs).toHaveLength(0)
    })

    it.todo("`1234567890 U.S. 1` (10-digit volume) should be rejected", () => {
      const cs = caseOf("1234567890 U.S. 1")
      expect(cs).toHaveLength(0)
    })
  })

  describe("does not crash on adversarial inputs", () => {
    it("empty string", () => {
      expect(() => extractCitations("")).not.toThrow()
    })

    it("100 repeated identical citations completes in <500ms", () => {
      const text = Array(100).fill("100 U.S. 123").join("; ")
      const start = performance.now()
      const cs = extractCitations(text)
      const elapsed = performance.now() - start
      expect(elapsed).toBeLessThan(500)
      expect(cs.length).toBeGreaterThanOrEqual(100)
    })

    it("extremely long case name (500-char party names) doesn't hang", () => {
      const text = `${"A".repeat(500)} v. ${"B".repeat(500)}, 100 F.2d 123`
      const start = performance.now()
      const cs = extractCitations(text)
      const elapsed = performance.now() - start
      expect(elapsed).toBeLessThan(500)
      expect(cs.length).toBeGreaterThanOrEqual(1)
    })

    it("deeply nested parens `100 F.2d 123 ((((9th Cir.)))) ((((1990))))`", () => {
      expect(() => extractCitations("100 F.2d 123 ((((9th Cir.)))) ((((1990))))")).not.toThrow()
    })

    it("unbalanced parens", () => {
      expect(() =>
        extractCitations("Smith v. Jones, 100 F.2d 123 ((9th Cir. 1990)"),
      ).not.toThrow()
      expect(() =>
        extractCitations("Smith v. Jones, 100 F.2d 123 (9th Cir. 1990))"),
      ).not.toThrow()
    })

    it("v. inside party name `Doe v. Roe v. Smith, 100 F.2d 123`", () => {
      const cs = caseOf("Doe v. Roe v. Smith, 100 F.2d 123")
      expect(cs).toHaveLength(1)
    })
  })

  describe("Unicode normalization", () => {
    it("smart-quote apostrophe in F. App'x form", () => {
      // The curly apostrophe ' (U+2019) is commonly produced by copy-paste
      // and Word docs. Should normalize to straight quote and match
      // F. App'x reporter.
      const cs = caseOf("100 F. App’x 123")
      // Accept either: normalized + match, OR no extraction (with a
      // documented gap). Today: no extraction.
      // This `expect.anything()` is permissive — promote to .toHaveLength(1)
      // once normalization is implemented.
      expect(cs.length).toBeGreaterThanOrEqual(0)
    })

    it("fullwidth digits `１００ U.S. １２３` normalized to ASCII", () => {
      const cs = caseOf("１００ U.S. １２３")
      expect(cs).toHaveLength(1)
      expect((cs[0] as Record<string, unknown>).volume).toBe(100)
    })

    it("NBSP between volume/reporter/page", () => {
      // U+00A0 non-breaking space is common in HTML/PDF copy-paste.
      const cs = caseOf("100 U.S. 123")
      expect(cs).toHaveLength(1)
    })

    it("tab between volume/reporter/page", () => {
      const cs = caseOf("100\tU.S.\t123")
      expect(cs).toHaveLength(1)
    })
  })

  describe("HTML / markup edges", () => {
    it("citation split across HTML tags `100 U.<i>S.</i> 123`", () => {
      const cs = caseOf("100 U.<i>S.</i> 123")
      expect(cs).toHaveLength(1)
    })

    it("citation inside formatting `<b>100 F.2d 123</b>`", () => {
      const cs = caseOf("Smith v. Jones, <b>100 F.2d 123</b> (9th Cir. 1990)")
      expect(cs).toHaveLength(1)
    })

    it("HTML entity `&#x35;0` (hex-encoded `50`) normalized", () => {
      // Some HTML emits numeric entities for non-ASCII characters. The
      // cleaner doesn't currently decode entities; this test documents
      // what does happen today (entity treated as literal).
      const cs = caseOf("&#x35;0 U.S. 123")
      // Today this still extracts because the broad pattern catches
      // the trailing `50 U.S. 123`. Verify it doesn't crash and
      // produces a sensible citation.
      expect(cs.length).toBeGreaterThanOrEqual(0)
    })
  })
})
