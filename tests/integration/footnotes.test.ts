/**
 * Integration Tests for Footnote Detection Pipeline
 *
 * Exercises the full citation extraction pipeline with footnote detection enabled:
 *   detectFootnotes(rawText) → cleanText → mapZones → tokenize → extract → tag
 *
 * Verifies that citations in footnote zones are correctly annotated with
 * inFootnote/footnoteNumber metadata, and that body citations remain untagged.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import { detectFootnotes } from "@/footnotes/detectFootnotes"
import type { ResolvedCitation } from "@/resolve/types"

describe("Footnote Integration Tests", () => {
  describe("HTML input", () => {
    it("detects footnotes and tags citations in HTML", () => {
      const html = [
        "<p>The Court held in Smith v. Jones, 500 F.2d 123 (2d Cir. 2020) that the statute applies.</p>",
        '<footnote label="1">See also Doe v. Roe, 300 U.S. 45 (1990).</footnote>',
      ].join("")

      const citations = extractCitations(html, { detectFootnotes: true })
      expect(citations).toHaveLength(2)

      expect(citations[0].type).toBe("case")
      expect(citations[0].inFootnote).toBeUndefined()

      expect(citations[1].type).toBe("case")
      expect(citations[1].inFootnote).toBe(true)
      expect(citations[1].footnoteNumber).toBe(1)
    })

    it("multiple footnotes with separate citations", () => {
      // Uses <fn> tags (shorter) to stay within the position mapping system's
      // maxLookAhead=20 window when consecutive tags are stripped.
      const html = [
        "Body citation: 500 F.2d 123 (2d Cir. 2020). ",
        '<fn label="1">200 U.S. 45 (1990).</fn>',
        '<fn label="2">300 F.3d 789 (9th Cir. 2005).</fn>',
      ].join("")

      const citations = extractCitations(html, { detectFootnotes: true })
      const inFootnote = citations.filter((c) => c.inFootnote)
      expect(inFootnote).toHaveLength(2)
      expect(inFootnote[0].footnoteNumber).toBe(1)
      expect(inFootnote[1].footnoteNumber).toBe(2)
    })
  })

  describe("plain text input", () => {
    it("detects footnotes after separator line", () => {
      const text = [
        "The Court in Smith v. Jones, 500 F.2d 123 (2d Cir. 2020) held...",
        "",
        "----------",
        "1. See Doe v. Roe, 300 U.S. 45 (1990).",
      ].join("\n")

      const citations = extractCitations(text, { detectFootnotes: true })
      const bodyCites = citations.filter((c) => !c.inFootnote)
      const footnoteCites = citations.filter((c) => c.inFootnote)

      expect(bodyCites.length).toBeGreaterThanOrEqual(1)
      expect(footnoteCites.length).toBeGreaterThanOrEqual(1)
      expect(footnoteCites[0].footnoteNumber).toBe(1)
    })
  })

  describe("opt-in behavior", () => {
    it("does not annotate when detectFootnotes is false (default)", () => {
      const html =
        '<p>500 F.2d 123 (2020).</p><footnote label="1">300 U.S. 45 (1990).</footnote>'

      const citations = extractCitations(html)
      for (const c of citations) {
        expect(c.inFootnote).toBeUndefined()
        expect(c.footnoteNumber).toBeUndefined()
      }
    })
  })

  describe("standalone detectFootnotes", () => {
    it("returns zones from HTML without running full pipeline", () => {
      const html =
        '<p>Body.</p><footnote label="1">Note 1.</footnote><footnote label="2">Note 2.</footnote>'
      const zones = detectFootnotes(html)
      expect(zones).toHaveLength(2)
      expect(zones[0].footnoteNumber).toBe(1)
      expect(zones[1].footnoteNumber).toBe(2)
    })

    it("returns zones from plain text", () => {
      const text = ["Body.", "", "----------", "1. Note 1.", "2. Note 2."].join("\n")
      const zones = detectFootnotes(text)
      expect(zones).toHaveLength(2)
    })
  })

  describe("footnote-aware resolution", () => {
    it("Id. in footnote resolves within same footnote only", () => {
      const html = [
        "<p>See Smith v. Jones, 500 F.2d 123 (2d Cir. 2020).</p>",
        '<footnote label="1">',
        "See Doe v. Roe, 300 U.S. 45 (1990). Id. at 50.",
        "</footnote>",
      ].join("")

      const citations = extractCitations(html, {
        detectFootnotes: true,
        resolve: true,
        resolutionOptions: { scopeStrategy: "footnote" },
      }) as ResolvedCitation[]

      const idCite = citations.find((c) => c.type === "id")
      expect(idCite).toBeDefined()
      expect(idCite?.inFootnote).toBe(true)

      if (idCite?.resolution?.resolvedTo !== undefined) {
        const resolved = citations[idCite.resolution.resolvedTo]
        expect(resolved.inFootnote).toBe(true)
      }
    })
  })
})
