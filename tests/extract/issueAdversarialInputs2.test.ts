/**
 * Second round of adversarial inputs: PDF/OCR artifacts, soft hyphens,
 * resolver chains, paragraph pincites, and exotic typography.
 */
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"

const caseOf = (text: string) => extractCitations(text).filter((c) => c.type === "case")

describe("adversarial input regression — round 2", () => {
  describe("PDF / OCR artifacts", () => {
    it.todo("soft hyphen `­` (U+00AD) inside reporter should normalize", () => {
      // PDFs often insert U+00AD as a discretionary hyphen at line breaks.
      // `100 F.­2d 123` should normalize to `100 F.2d 123` and extract.
      const cs = caseOf("100 F.­2d 123")
      expect(cs).toHaveLength(1)
    })

    it.todo("page-number artifact `100\\n— 14 —\\nF.2d 123` (PDF page break)", () => {
      // PDF-to-text conversion inserts page numbers mid-citation: the
      // volume `100` and the rest of the citation `F.2d 123` are
      // separated by a `— 14 —` page marker. A robust cleaner should
      // strip these.
      const cs = caseOf("Smith, 100\n— 14 —\nF.2d 123")
      expect(cs).toHaveLength(1)
    })

    it("form feed character between cite parts (\\f)", () => {
      // U+000C form feed sometimes appears in PDF-extracted text. Should
      // normalize to whitespace.
      const cs = caseOf("Smith\f100 F.2d 123")
      expect(cs).toHaveLength(1)
    })

    it("line break in middle of cite (`100\\nF.2d\\n123`)", () => {
      const cs = caseOf("100\nF.2d\n123")
      expect(cs).toHaveLength(1)
    })
  })

  describe("paragraph pincites (¶)", () => {
    it.todo("`Smith, 100 F.2d 100, ¶ 12` captures ¶12 as pincite", () => {
      const cs = caseOf("Smith, 100 F.2d 100, ¶ 12")
      expect(cs).toHaveLength(1)
      // Verify pincite is captured — paragraph mark + number
      const c = cs[0] as Record<string, unknown>
      expect(c.pincite).toBeDefined()
    })

    it("`Smith, 100 F.2d 100` (no pincite) still extracts", () => {
      const cs = caseOf("Smith, 100 F.2d 100")
      expect(cs).toHaveLength(1)
    })
  })

  describe("string citation grouping", () => {
    it("`100 F.2d 1; 200 F.3d 2; 300 F.4th 3` all extract", () => {
      const cs = caseOf("100 F.2d 1; 200 F.3d 2; 300 F.4th 3")
      expect(cs).toHaveLength(3)
    })

    it("`100 F.2d 1 and 200 F.3d 2 and 300 F.4th 3` all extract", () => {
      const cs = caseOf("100 F.2d 1 and 200 F.3d 2 and 300 F.4th 3")
      expect(cs).toHaveLength(3)
    })

    it("mixed signals across string cite", () => {
      const cs = caseOf("See Smith, 100 F.2d 1; see also Doe, 200 F.3d 2; cf. Roe, 300 F.4th 3")
      expect(cs).toHaveLength(3)
    })
  })

  describe("resolver chains (with `resolve: true`)", () => {
    it("`Id.` resolves to immediately preceding case", () => {
      const cs = extractCitations(
        "Smith v. Jones, 100 F.2d 100 (9th Cir. 2020). Id. at 105.",
        { resolve: true },
      )
      const id = cs.find((c) => c.type === "id") as Record<string, unknown> | undefined
      expect(id).toBeDefined()
      const resolution = id?.resolution as Record<string, unknown> | undefined
      expect(resolution?.resolvedTo).toBe(0)
    })

    it("`Id.` chain across many cites — resolves to MOST RECENT case", () => {
      const cs = extractCitations(
        "Smith, 100 F.2d 1. Doe, 200 F.2d 2. Id. at 3. Id. at 4.",
        { resolve: true },
      )
      const ids = cs.filter((c) => c.type === "id") as Array<Record<string, unknown>>
      expect(ids).toHaveLength(2)
      // Both Id.s should resolve to index 1 (Doe), the most recent case.
      for (const id of ids) {
        const resolution = id.resolution as Record<string, unknown> | undefined
        expect(resolution?.resolvedTo).toBe(1)
      }
    })

    it("`Id.` with statute between case and id still resolves to the case", () => {
      const cs = extractCitations(
        "Smith, 100 F.2d 1. 42 U.S.C. § 1983. Id. at 5.",
        { resolve: true },
      )
      const id = cs.find((c) => c.type === "id") as Record<string, unknown> | undefined
      expect(id).toBeDefined()
      const resolution = id?.resolution as Record<string, unknown> | undefined
      expect(resolution?.resolvedTo).toBe(0)
    })

    it("`Id.` without antecedent does not crash, leaves resolvedTo undefined", () => {
      const cs = extractCitations("Id. at 105.", { resolve: true })
      const id = cs.find((c) => c.type === "id") as Record<string, unknown> | undefined
      expect(id).toBeDefined()
      const resolution = id?.resolution as Record<string, unknown> | undefined
      expect(resolution?.resolvedTo).toBeUndefined()
    })

    it("`supra` after parallel cite resolves to the parallel group's primary", () => {
      const cs = extractCitations(
        "Roe v. Wade, 410 U.S. 113, 93 S. Ct. 705 (1973). Roe, supra, at 153.",
        { resolve: true },
      )
      const supra = cs.find((c) => c.type === "supra") as Record<string, unknown> | undefined
      expect(supra).toBeDefined()
      // Resolves to one of the parallel cites (index 0 or 1)
      const resolution = supra?.resolution as Record<string, unknown> | undefined
      const resolvedTo = resolution?.resolvedTo as number | undefined
      expect([0, 1]).toContain(resolvedTo)
    })
  })

  describe("non-English party names", () => {
    it("`Bélanger v. Côté, 100 F.2d 123` (accented chars in party names)", () => {
      const cs = caseOf("Bélanger v. Côté, 100 F.2d 123")
      expect(cs).toHaveLength(1)
    })

    it("`Pueblo v. García` Spanish prose context", () => {
      const cs = caseOf("Véase Pueblo v. García, 100 DPR 200, sobre la cuestión.")
      // DPR isn't in reporters-db (#654) but the citation core should
      // still extract as a case.
      expect(cs.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe("annotation roundtrip", () => {
    it("annotate with template wraps the citation in markup", async () => {
      const { annotate } = await import("@/annotate")
      const text = "See Smith v. Jones, 100 F.2d 123 (9th Cir. 2020)."
      const cs = extractCitations(text)
      const result = annotate(text, cs, { template: { before: "<cite>", after: "</cite>" } })
      expect(result.text).toContain("<cite>100 F.2d 123</cite>")
      expect(result.skipped).toHaveLength(0)
    })

    it("annotate handles overlapping cites without crash", async () => {
      const { annotate } = await import("@/annotate")
      const text = "Smith, 100 F.2d 100. Id. at 5."
      const cs = extractCitations(text)
      const result = annotate(text, cs, { template: { before: "<a>", after: "</a>" } })
      expect(result.text).toContain("<a>100 F.2d 100</a>")
      expect(result.text).toContain("<a>Id. at 5</a>")
    })

    it("annotate with no template/callback no-ops (returns original)", async () => {
      const { annotate } = await import("@/annotate")
      const text = "100 F.2d 123"
      const cs = extractCitations(text)
      const result = annotate(text, cs)
      expect(result.text).toBe(text)
    })
  })

  describe("citation in URL — should NOT extract", () => {
    it.todo("`https://example.com/100/U.S./123` does not extract a phantom case", () => {
      // URLs containing what looks like a citation should be rejected.
      // Currently the slash separators stop the regex from matching,
      // but document the invariant.
      const cs = caseOf("Visit https://example.com/100/U.S./123 for details.")
      expect(cs).toHaveLength(0)
    })
  })
})
