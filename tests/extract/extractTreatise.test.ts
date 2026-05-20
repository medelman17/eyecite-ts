/**
 * Tests for treatise extraction (#579).
 *
 * Covers the common multi-volume treatises: Wright & Miller, Williston,
 * Moore's, Corbin, Nimmer, Witkin, McCarthy, etc.
 */
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"

describe("extractTreatise (#579)", () => {
  it("parses Wright & Miller", () => {
    const cites = extractCitations(
      "5 Wright & Miller, Federal Practice and Procedure § 1290",
    ).filter((c) => c.type === "treatise")
    expect(cites).toHaveLength(1)
    if (cites[0]?.type === "treatise") {
      expect(cites[0].volume).toBe(5)
      expect(cites[0].title).toBe("Wright & Miller, Federal Practice and Procedure")
      expect(cites[0].section).toBe("1290")
      expect(cites[0].confidence).toBe(0.9)
    }
  })

  it("parses Williston on Contracts", () => {
    const cites = extractCitations("13 Williston on Contracts § 38").filter(
      (c) => c.type === "treatise",
    )
    expect(cites).toHaveLength(1)
    if (cites[0]?.type === "treatise") {
      expect(cites[0].volume).toBe(13)
      expect(cites[0].title).toBe("Williston on Contracts")
      expect(cites[0].section).toBe("38")
    }
  })

  it("parses Moore's Federal Practice", () => {
    const cites = extractCitations("1 Moore's Federal Practice § 12.34").filter(
      (c) => c.type === "treatise",
    )
    expect(cites).toHaveLength(1)
    if (cites[0]?.type === "treatise") {
      expect(cites[0].volume).toBe(1)
      expect(cites[0].title).toBe("Moore's Federal Practice")
      expect(cites[0].section).toBe("12.34")
    }
  })

  it("parses Corbin on Contracts", () => {
    const cites = extractCitations("2 Corbin on Contracts § 5.4").filter(
      (c) => c.type === "treatise",
    )
    expect(cites).toHaveLength(1)
    if (cites[0]?.type === "treatise") {
      expect(cites[0].volume).toBe(2)
      expect(cites[0].title).toBe("Corbin on Contracts")
      expect(cites[0].section).toBe("5.4")
    }
  })

  it("parses Nimmer on Copyright with bracketed sub-section", () => {
    const cites = extractCitations("1 Nimmer on Copyright § 5.05[A]").filter(
      (c) => c.type === "treatise",
    )
    expect(cites).toHaveLength(1)
    if (cites[0]?.type === "treatise") {
      expect(cites[0].volume).toBe(1)
      expect(cites[0].title).toBe("Nimmer on Copyright")
      expect(cites[0].section).toBe("5.05[A]")
    }
  })

  it("parses Witkin with edition parenthetical", () => {
    const cites = extractCitations("1 Witkin, Cal. Procedure (5th ed. 2008) § 234").filter(
      (c) => c.type === "treatise",
    )
    expect(cites).toHaveLength(1)
    if (cites[0]?.type === "treatise") {
      expect(cites[0].volume).toBe(1)
      expect(cites[0].title).toBe("Witkin, Cal. Procedure")
      expect(cites[0].section).toBe("234")
      expect(cites[0].edition).toBe("5th ed. 2008")
      expect(cites[0].year).toBe(2008)
    }
  })

  it("does NOT match arbitrary `<Vol> <Author>, <Book> § <Section>` prose (allowlist guard)", () => {
    // We intentionally use a fixed list of known treatises to avoid false
    // positives. A made-up author should not be matched.
    const cites = extractCitations("5 Smith and Jones, Local Practice § 1").filter(
      (c) => c.type === "treatise",
    )
    expect(cites).toHaveLength(0)
  })

  it("does NOT classify treatise as case (regression)", () => {
    const cites = extractCitations("5 Wright & Miller, Federal Practice and Procedure § 1290")
    expect(cites.filter((c) => c.type === "case")).toHaveLength(0)
  })
})
