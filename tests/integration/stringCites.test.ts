/**
 * Integration tests for string citation grouping.
 * Tests the full pipeline: text -> clean -> tokenize -> extract -> group.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import type { FullCaseCitation } from "@/types/citation"

describe("string citation grouping (integration)", () => {
  it("groups semicolon-separated case citations", () => {
    const text =
      "See Smith v. Jones, 500 F.2d 123 (9th Cir. 2020); Doe v. Green, 600 F.3d 456 (2d Cir. 2021)."
    const citations = extractCitations(text)

    const caseCites = citations.filter((c) => c.type === "case")
    expect(caseCites.length).toBeGreaterThanOrEqual(2)

    // Both should be in same string cite group
    expect(caseCites[0].stringCitationGroupId).toBeDefined()
    expect(caseCites[1].stringCitationGroupId).toBe(caseCites[0].stringCitationGroupId)
    expect(caseCites[0].stringCitationIndex).toBe(0)
    expect(caseCites[1].stringCitationIndex).toBe(1)
    expect(caseCites[0].stringCitationGroupSize).toBe(2)

    // First citation should have leading signal from extractCase
    expect(caseCites[0].signal).toBe("see")
  })

  it("groups with mid-group signal words", () => {
    const text =
      "Smith v. Jones, 500 F.2d 123 (9th Cir. 2020); see also Doe v. Green, 600 F.3d 456 (2d Cir. 2021)."
    const citations = extractCitations(text)

    const caseCites = citations.filter((c) => c.type === "case")
    expect(caseCites.length).toBeGreaterThanOrEqual(2)

    expect(caseCites[0].stringCitationGroupId).toBeDefined()
    expect(caseCites[1].stringCitationGroupId).toBe(caseCites[0].stringCitationGroupId)
    expect(caseCites[1].signal).toBe("see also")
  })

  it("does not group citations separated by prose", () => {
    const text =
      "In Smith v. Jones, 500 F.2d 123 (9th Cir. 2020), the court agreed. Later, in Doe v. Green, 600 F.3d 456 (2d Cir. 2021), the court disagreed."
    const citations = extractCitations(text)

    const caseCites = citations.filter((c) => c.type === "case")
    expect(caseCites.length).toBeGreaterThanOrEqual(2)

    // Should NOT be grouped
    expect(caseCites[0].stringCitationGroupId).toBeUndefined()
    expect(caseCites[1].stringCitationGroupId).toBeUndefined()
  })

  it("works with resolution enabled", () => {
    const text =
      "See Smith v. Jones, 500 F.2d 123 (9th Cir. 2020); Doe v. Green, 600 F.3d 456 (2d Cir. 2021). Id. at 460."
    const resolved = extractCitations(text, { resolve: true })

    // String cite group should still be present on resolved citations
    const caseCites = resolved.filter((c) => c.type === "case")
    expect(caseCites[0].stringCitationGroupId).toBeDefined()
    expect(caseCites[1].stringCitationGroupId).toBe(caseCites[0].stringCitationGroupId)
  })

  it("groups three citations in a chain", () => {
    const text =
      "See Smith v. Jones, 500 F.2d 123 (9th Cir. 2020); Doe v. Green, 600 F.3d 456 (2d Cir. 2021); Black v. White, 700 F.4th 789 (D.C. Cir. 2022)."
    const citations = extractCitations(text)

    const caseCites = citations.filter((c) => c.type === "case")
    expect(caseCites.length).toBeGreaterThanOrEqual(3)

    const groupId = caseCites[0].stringCitationGroupId
    expect(groupId).toBeDefined()
    expect(caseCites[1].stringCitationGroupId).toBe(groupId)
    expect(caseCites[2].stringCitationGroupId).toBe(groupId)
    expect(caseCites[0].stringCitationIndex).toBe(0)
    expect(caseCites[1].stringCitationIndex).toBe(1)
    expect(caseCites[2].stringCitationIndex).toBe(2)
    expect(caseCites[0].stringCitationGroupSize).toBe(3)
  })

  it("groups mixed citation types (case + statute)", () => {
    const text =
      "See 42 U.S.C. § 1983; Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)."
    const citations = extractCitations(text)

    expect(citations.length).toBeGreaterThanOrEqual(2)

    const groupId = citations[0].stringCitationGroupId
    expect(groupId).toBeDefined()
    expect(citations[1].stringCitationGroupId).toBe(groupId)
    expect(citations[0].stringCitationIndex).toBe(0)
    expect(citations[1].stringCitationIndex).toBe(1)
  })

  it("parallel cites and string cites coexist", () => {
    const text =
      "Smith v. Jones, 500 F.2d 123, 50 U.S. 456 (2020); Doe v. Green, 600 F.3d 789 (2d Cir. 2021)."
    const citations = extractCitations(text)

    const caseCites = citations.filter((c) => c.type === "case") as FullCaseCitation[]
    // First two should be parallel (comma-separated, same case)
    // The primary parallel cite and the third cite should be in a string group

    // At least verify string grouping is present
    const groupedCites = caseCites.filter((c) => c.stringCitationGroupId)
    expect(groupedCites.length).toBeGreaterThanOrEqual(2)
  })
})
