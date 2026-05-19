import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { FullCaseCitation } from "@/types/citation"

function caseCites(text: string): FullCaseCitation[] {
  return extractCitations(text).filter(
    (c): c is FullCaseCitation => c.type === "case",
  )
}

describe("detectParallel — pincite-between gap shapes", () => {
  it("accepts single page pincite (', NNN, ')", () => {
    const text = "Smith v. Jones, 374 N.J. Super. 448, 453, 864 A.2d 1191 (2005)."
    const cites = caseCites(text)
    expect(cites).toHaveLength(2)
    expect(cites[0].groupId).toBeDefined()
    expect(cites[0].groupId).toBe(cites[1].groupId)
    expect(cites[0].parallelCitations).toEqual([
      { volume: 864, reporter: "A.2d", page: 1191 },
    ])
  })

  it("accepts page range (', NNN-NN, ')", () => {
    const text =
      "Smith v. Jones, 374 N.J. Super. 448, 453-55, 864 A.2d 1191 (2005)."
    const cites = caseCites(text)
    expect(cites).toHaveLength(2)
    expect(cites[0].groupId).toBe(cites[1].groupId)
  })

  it("accepts en-dash page range (', NNN–NN, ')", () => {
    // En-dash (U+2013) is common in published opinions.
    const text =
      "Smith v. Jones, 374 N.J. Super. 448, 453–55, 864 A.2d 1191 (2005)."
    const cites = caseCites(text)
    expect(cites).toHaveLength(2)
    expect(cites[0].groupId).toBe(cites[1].groupId)
  })

  it("accepts multi-pincite list (', NNN, NNN, ')", () => {
    const text = "Roe v. Wade, 410 U.S. 113, 115, 153, 93 S. Ct. 705 (1973)."
    const cites = caseCites(text)
    expect(cites).toHaveLength(2)
    expect(cites[0].groupId).toBe(cites[1].groupId)
    // Note: parallelCitations stores the normalized reporter form ("S.Ct.",
    // no space), not the source form ("S. Ct."). See reporter normalization
    // in src/clean/cleaners.ts (normalizeReporterSpacing).
    expect(cites[0].parallelCitations).toEqual([
      { volume: 93, reporter: "S.Ct.", page: 705 },
    ])
  })

  it("accepts footnote pincite (', NNN n.N, ')", () => {
    // Note: this synthetic uses F.2d (federal) + A.2d (regional reporter) as
    // a parallel pair, which isn't a real-world combination but exercises the
    // classifier in isolation.
    const text = "Smith v. Jones, 100 F.2d 50, 55 n.3, 200 A.2d 100 (1990)."
    const cites = caseCites(text)
    expect(cites).toHaveLength(2)
    expect(cites[0].groupId).toBe(cites[1].groupId)
  })

  it("accepts star-pagination pincite (', *N, ')", () => {
    // Star-pagination (`*2`) is common in slip-opinion / unreported decisions
    // and explicitly handled by parsePincite. The classifier accepts it as
    // a pincite-between segment.
    const text = "Smith v. Jones, 374 N.J. Super. 448, *2, 864 A.2d 1191 (2005)."
    const cites = caseCites(text)
    expect(cites).toHaveLength(2)
    expect(cites[0].groupId).toBe(cites[1].groupId)
  })

  it("REJECTS gap with prose text (', see also, ')", () => {
    // ", see also, " between cites is two separate cases joined by a signal,
    // not a parallel pair. Must NOT be detected as parallel.
    const text =
      "Smith v. Jones, 374 N.J. Super. 448, see also, 864 A.2d 1191 (2005)."
    const cites = caseCites(text)
    // Two valid outcomes both count as "rejected":
    //   (a) tokenizer doesn't extract both as case-shape (length < 2)
    //   (b) both extracted but without a shared groupId
    if (
      cites.length >= 2 &&
      cites[0].groupId !== undefined &&
      cites[1].groupId !== undefined
    ) {
      expect(cites[0].groupId).not.toBe(cites[1].groupId)
    } else {
      // Either fewer than 2 cites, or at least one has no groupId — both pass.
      expect(true).toBe(true)
    }
  })

  it("REJECTS gap with mixed prose and digits (', page 453 of, ')", () => {
    const text =
      "Smith v. Jones, 374 N.J. Super. 448, page 453 of, 864 A.2d 1191 (2005)."
    const cites = caseCites(text)
    if (
      cites.length >= 2 &&
      cites[0].groupId !== undefined &&
      cites[1].groupId !== undefined
    ) {
      expect(cites[0].groupId).not.toBe(cites[1].groupId)
    } else {
      expect(true).toBe(true)
    }
  })

  it("tight comma (', ') still works (regression for existing behavior)", () => {
    // Pre-existing canonical case — `186 N.J. 78, 891 A.2d 1202` with no
    // pincite between — must continue to detect.
    const text = "Smith v. Jones, 186 N.J. 78, 891 A.2d 1202 (2006)."
    const cites = caseCites(text)
    expect(cites).toHaveLength(2)
    expect(cites[0].groupId).toBe(cites[1].groupId)
  })
})
