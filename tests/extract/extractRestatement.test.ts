/**
 * Tests for Restatement extraction (#578).
 *
 * Covers `Restatement (Edition) of Subject § Section` plus subsection chains.
 */
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import { extractRestatement } from "@/extract/extractRestatement"
import type { Token } from "@/tokenize"
import { createIdentityMap } from "../helpers/transformationMap"

describe("extractRestatement (#578)", () => {
  it("parses Restatement (Second) of Torts § 402A", () => {
    const token: Token = {
      text: "Restatement (Second) of Torts § 402A",
      span: { cleanStart: 0, cleanEnd: 36 },
      type: "restatement",
      patternId: "restatement",
    }
    const cite = extractRestatement(token, createIdentityMap())
    expect(cite.type).toBe("restatement")
    expect(cite.edition).toBe("Second")
    expect(cite.subject).toBe("Torts")
    expect(cite.section).toBe("402A")
    expect(cite.subsection).toBeUndefined()
    expect(cite.confidence).toBe(0.95)
  })

  it("parses Restatement (Second) of Trusts § 187", () => {
    const cites = extractCitations("See Restatement (Second) of Trusts § 187.").filter(
      (c) => c.type === "restatement",
    )
    expect(cites).toHaveLength(1)
    if (cites[0]?.type === "restatement") {
      expect(cites[0].edition).toBe("Second")
      expect(cites[0].subject).toBe("Trusts")
      expect(cites[0].section).toBe("187")
    }
  })

  it("parses Restatement (Third) of the Law Governing Lawyers § 1", () => {
    const cites = extractCitations("Restatement (Third) of the Law Governing Lawyers § 1").filter(
      (c) => c.type === "restatement",
    )
    expect(cites).toHaveLength(1)
    if (cites[0]?.type === "restatement") {
      expect(cites[0].edition).toBe("Third")
      expect(cites[0].subject).toBe("the Law Governing Lawyers")
      expect(cites[0].section).toBe("1")
    }
  })

  it("parses Restatement (First) of Contracts § 90", () => {
    const cites = extractCitations("Restatement (First) of Contracts § 90").filter(
      (c) => c.type === "restatement",
    )
    expect(cites).toHaveLength(1)
    if (cites[0]?.type === "restatement") {
      expect(cites[0].edition).toBe("First")
      expect(cites[0].subject).toBe("Contracts")
      expect(cites[0].section).toBe("90")
    }
  })

  it("accepts ordinal short form (2d, 3d) for edition", () => {
    const cites = extractCitations("Restatement (2d) of Torts § 402A").filter(
      (c) => c.type === "restatement",
    )
    expect(cites).toHaveLength(1)
    if (cites[0]?.type === "restatement") {
      expect(cites[0].edition).toBe("Second")
    }
  })

  it("captures subsection chain `(1)(b)`", () => {
    const cites = extractCitations("Restatement (Second) of Torts § 402A(1)(b)").filter(
      (c) => c.type === "restatement",
    )
    expect(cites).toHaveLength(1)
    if (cites[0]?.type === "restatement") {
      expect(cites[0].section).toBe("402A")
      expect(cites[0].subsection).toBe("(1)(b)")
    }
  })

  it("handles `Am. L. Inst. <year>` trailing parenthetical without consuming it as subsection", () => {
    const cites = extractCitations(
      "Restatement (Second) of Torts § 402A (Am. L. Inst. 1965)",
    ).filter((c) => c.type === "restatement")
    expect(cites).toHaveLength(1)
    if (cites[0]?.type === "restatement") {
      expect(cites[0].section).toBe("402A")
      expect(cites[0].subsection).toBeUndefined()
    }
  })

  it("does NOT classify Restatement as case (regression)", () => {
    const cites = extractCitations("Restatement (Second) of Torts § 402A")
    expect(cites.filter((c) => c.type === "case")).toHaveLength(0)
  })

  it("preserves span positions", () => {
    const cites = extractCitations("See Restatement (Second) of Torts § 402A here.")
    const r = cites.find((c) => c.type === "restatement")
    expect(r).toBeDefined()
    if (r) {
      expect(r.span.originalStart).toBe(4)
      // "Restatement (Second) of Torts § 402A" is 36 chars
      expect(r.span.originalEnd).toBe(40)
    }
  })
})
