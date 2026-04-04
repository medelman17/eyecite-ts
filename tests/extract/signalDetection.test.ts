/**
 * Tests for leading introductory signal detection on isolated citations.
 * Verifies that Bluebook signals (See, But see, Cf., Accord, etc.) are
 * correctly detected when preceding any citation type.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"

describe("isolated citation signal detection", () => {
  it('detects "See" before a case citation', () => {
    const text = "The rule is clear. See Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)."
    const citations = extractCitations(text)
    const caseCite = citations.find((c) => c.type === "case")
    expect(caseCite).toBeDefined()
    expect(caseCite!.signal).toBe("see")
  })

  it('detects "But see" before a case citation', () => {
    const text = "The majority disagrees. But see Doe v. Roe, 600 F.3d 456 (2d Cir. 2019)."
    const citations = extractCitations(text)
    const caseCite = citations.find((c) => c.type === "case")
    expect(caseCite!.signal).toBe("but see")
  })

  it('detects "Cf." before a case citation', () => {
    const text = "A different framework applies. Cf. Brown v. Green, 700 F.4th 789 (1st Cir. 2021)."
    const citations = extractCitations(text)
    const caseCite = citations.find((c) => c.type === "case")
    expect(caseCite!.signal).toBe("cf")
  })

  it('detects "Accord" before a case citation', () => {
    const text = "Other courts agree. Accord White v. Black, 400 F. Supp. 3d 321 (D. Mass. 2020)."
    const citations = extractCitations(text)
    const caseCite = citations.find((c) => c.type === "case")
    expect(caseCite!.signal).toBe("accord")
  })

  it('detects "See also" before a case citation', () => {
    const text = "This principle extends further. See also Davis v. Lee, 200 F.3d 100 (5th Cir. 2018)."
    const citations = extractCitations(text)
    const caseCite = citations.find((c) => c.type === "case")
    expect(caseCite!.signal).toBe("see also")
  })

  it('detects "See generally" before a case citation', () => {
    const text = "For background, see generally Johnson v. State, 350 So. 2d 456 (Fla. 1977)."
    const citations = extractCitations(text)
    const caseCite = citations.find((c) => c.type === "case")
    expect(caseCite!.signal).toBe("see generally")
  })

  it('detects "Contra" before a case citation', () => {
    const text = "The holding is wrong. Contra Miller v. Clark, 800 F.2d 999 (4th Cir. 1986)."
    const citations = extractCitations(text)
    const caseCite = citations.find((c) => c.type === "case")
    expect(caseCite!.signal).toBe("contra")
  })

  it('detects "But cf." before a case citation', () => {
    const text = "The analogy breaks down. But cf. Griswold v. Connecticut, 381 U.S. 479 (1965)."
    const citations = extractCitations(text)
    const caseCite = citations.find((c) => c.type === "case")
    expect(caseCite!.signal).toBe("but cf")
  })

  it('detects "Compare" before a case citation', () => {
    const text = "Compare Roe v. Wade, 410 U.S. 113 (1973), with Dobbs v. Jackson, 597 U.S. 215 (2022)."
    const citations = extractCitations(text)
    const caseCites = citations.filter((c) => c.type === "case")
    expect(caseCites[0]!.signal).toBe("compare")
  })

  it("is case-insensitive", () => {
    const text = "The rule is established. see Smith v. Jones, 500 F.2d 123 (2020)."
    const citations = extractCitations(text)
    const caseCite = citations.find((c) => c.type === "case")
    expect(caseCite!.signal).toBe("see")
  })

  it("detects signal before a statute citation", () => {
    const text = "The statute provides a remedy. See 42 U.S.C. § 1983."
    const citations = extractCitations(text)
    const statute = citations.find((c) => c.type === "statute")
    expect(statute).toBeDefined()
    expect(statute!.signal).toBe("see")
  })

  it("detects signal before a constitutional citation", () => {
    const text = "The right is protected. See U.S. Const. amend. XIV, § 1."
    const citations = extractCitations(text)
    const constitutional = citations.find((c) => c.type === "constitutional")
    expect(constitutional).toBeDefined()
    expect(constitutional!.signal).toBe("see")
  })

  it("does not set signal when no signal word precedes", () => {
    const text = "The Court held in Smith v. Jones, 500 F.2d 123 (2020), that liability exists."
    const citations = extractCitations(text)
    const caseCite = citations.find((c) => c.type === "case")
    expect(caseCite!.signal).toBeUndefined()
  })

  it("does not false-positive on words that contain signal substrings", () => {
    const text = "Oversee Smith v. Jones, 500 F.2d 123 (2020)."
    const citations = extractCitations(text)
    const caseCite = citations.find((c) => c.type === "case")
    // "Oversee" contains "see" but should NOT match as a signal
    expect(caseCite!.signal).toBeUndefined()
  })

  it("handles multiple isolated citations with different signals", () => {
    const text = `The majority rule supports this position. See Smith v. Jones, 500 F.2d 123 (9th Cir. 2020). But see Doe v. Roe, 600 F.3d 456 (2d Cir. 2019). Cf. Brown v. Green, 700 F.4th 789 (1st Cir. 2021).`
    const citations = extractCitations(text)
    const caseCites = citations.filter((c) => c.type === "case")

    expect(caseCites.length).toBeGreaterThanOrEqual(3)
    expect(caseCites[0].signal).toBe("see")
    expect(caseCites[1].signal).toBe("but see")
    expect(caseCites[2].signal).toBe("cf")
  })

  it("does not override signal already set by string cite detection", () => {
    const text = "See Smith v. Jones, 500 F.2d 123 (2020); see also Doe v. Roe, 600 F.3d 456 (2021)."
    const citations = extractCitations(text)
    const caseCites = citations.filter((c) => c.type === "case")

    expect(caseCites[0].signal).toBe("see")
    expect(caseCites[1].signal).toBe("see also") // Set by string cite mid-group detection
  })
})
