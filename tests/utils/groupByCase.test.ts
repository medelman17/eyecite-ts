import { describe, expect, it } from "vitest"
import { groupByCase } from "../../src/utils"
import type {
  FullCaseCitation,
  IdCitation,
  ShortFormCaseCitation,
  StatuteCitation,
  SupraCitation,
} from "../../src/types/citation"
import type { ResolvedCitation } from "../../src/resolve/types"

/** Minimal CitationBase fields */
const BASE = {
  text: "",
  matchedText: "",
  confidence: 1,
  processTimeMs: 0,
  patternsChecked: 0,
} as const

function span(start: number): {
  cleanStart: number
  cleanEnd: number
  originalStart: number
  originalEnd: number
} {
  return { cleanStart: start, cleanEnd: start + 10, originalStart: start, originalEnd: start + 10 }
}

describe("groupByCase", () => {
  it("returns empty array for empty input", () => {
    expect(groupByCase([])).toEqual([])
  })

  it("groups a single full citation", () => {
    const cite: ResolvedCitation<FullCaseCitation> = {
      ...BASE,
      type: "case",
      volume: 550,
      reporter: "U.S.",
      page: 544,
      span: span(0),
      resolution: undefined,
    }
    const groups = groupByCase([cite])
    expect(groups).toHaveLength(1)
    expect(groups[0].primaryCitation).toBe(cite)
    expect(groups[0].mentions).toEqual([cite])
    expect(groups[0].parallelCitations).toEqual(["550 U.S. 544"])
  })

  it("groups parallel citations by groupId", () => {
    const primary: ResolvedCitation<FullCaseCitation> = {
      ...BASE,
      type: "case",
      volume: 410,
      reporter: "U.S.",
      page: 113,
      groupId: "410-U.S.-113",
      parallelCitations: [{ volume: 93, reporter: "S. Ct.", page: 705 }],
      span: span(0),
      resolution: undefined,
    }
    const secondary: ResolvedCitation<FullCaseCitation> = {
      ...BASE,
      type: "case",
      volume: 93,
      reporter: "S. Ct.",
      page: 705,
      groupId: "410-U.S.-113",
      span: span(50),
      resolution: undefined,
    }
    const groups = groupByCase([primary, secondary])
    expect(groups).toHaveLength(1)
    expect(groups[0].primaryCitation).toBe(primary)
    expect(groups[0].mentions).toEqual([primary, secondary])
    expect(groups[0].parallelCitations).toEqual(["410 U.S. 113", "93 S. Ct. 705"])
  })

  it("groups full citations with identical volume/reporter/page", () => {
    const first: ResolvedCitation<FullCaseCitation> = {
      ...BASE,
      type: "case",
      volume: 500,
      reporter: "F.2d",
      page: 123,
      span: span(0),
      resolution: undefined,
    }
    const second: ResolvedCitation<FullCaseCitation> = {
      ...BASE,
      type: "case",
      volume: 500,
      reporter: "F.2d",
      page: 123,
      span: span(100),
      resolution: undefined,
    }
    const groups = groupByCase([first, second])
    expect(groups).toHaveLength(1)
    expect(groups[0].mentions).toEqual([first, second])
  })

  it("adds resolved short-form citation to antecedent group", () => {
    const full: ResolvedCitation<FullCaseCitation> = {
      ...BASE,
      type: "case",
      volume: 500,
      reporter: "F.2d",
      page: 123,
      span: span(0),
      resolution: undefined,
    }
    const short: ResolvedCitation<ShortFormCaseCitation> = {
      ...BASE,
      type: "shortFormCase",
      volume: 500,
      reporter: "F.2d",
      page: 123,
      pincite: 125,
      span: span(100),
      resolution: { resolvedTo: 0, confidence: 1 },
    }
    const groups = groupByCase([full, short])
    expect(groups).toHaveLength(1)
    expect(groups[0].mentions).toEqual([full, short])
  })

  it("adds resolved Id. citation to antecedent group", () => {
    const full: ResolvedCitation<FullCaseCitation> = {
      ...BASE,
      type: "case",
      volume: 500,
      reporter: "F.2d",
      page: 123,
      span: span(0),
      resolution: undefined,
    }
    const id: ResolvedCitation<IdCitation> = {
      ...BASE,
      type: "id",
      pincite: 125,
      span: span(100),
      resolution: { resolvedTo: 0, confidence: 1 },
    }
    const groups = groupByCase([full, id])
    expect(groups).toHaveLength(1)
    expect(groups[0].mentions).toHaveLength(2)
  })

  it("adds resolved supra citation to antecedent group", () => {
    const full: ResolvedCitation<FullCaseCitation> = {
      ...BASE,
      type: "case",
      volume: 500,
      reporter: "F.2d",
      page: 123,
      span: span(0),
      resolution: undefined,
    }
    const supra: ResolvedCitation<SupraCitation> = {
      ...BASE,
      type: "supra",
      partyName: "Smith",
      pincite: 130,
      span: span(200),
      resolution: { resolvedTo: 0, confidence: 1 },
    }
    const groups = groupByCase([full, supra])
    expect(groups).toHaveLength(1)
    expect(groups[0].mentions).toHaveLength(2)
  })

  it("excludes unresolved short-form citations", () => {
    const full: ResolvedCitation<FullCaseCitation> = {
      ...BASE,
      type: "case",
      volume: 500,
      reporter: "F.2d",
      page: 123,
      span: span(0),
      resolution: undefined,
    }
    const unresolved: ResolvedCitation<IdCitation> = {
      ...BASE,
      type: "id",
      span: span(100),
      resolution: { confidence: 0, failureReason: "no antecedent" },
    }
    const groups = groupByCase([full, unresolved])
    expect(groups).toHaveLength(1)
    expect(groups[0].mentions).toEqual([full])
  })

  it("ignores non-case citations", () => {
    const caseCite: ResolvedCitation<FullCaseCitation> = {
      ...BASE,
      type: "case",
      volume: 500,
      reporter: "F.2d",
      page: 123,
      span: span(0),
      resolution: undefined,
    }
    const statute: ResolvedCitation<StatuteCitation> = {
      ...BASE,
      type: "statute",
      code: "U.S.C.",
      section: "1983",
      span: span(50),
      resolution: undefined,
    }
    const groups = groupByCase([caseCite, statute])
    expect(groups).toHaveLength(1)
    expect(groups[0].mentions).toEqual([caseCite])
  })

  it("preserves document order within groups", () => {
    const cite1: ResolvedCitation<FullCaseCitation> = {
      ...BASE,
      type: "case",
      volume: 500,
      reporter: "F.2d",
      page: 123,
      span: span(0),
      resolution: undefined,
    }
    const cite2: ResolvedCitation<FullCaseCitation> = {
      ...BASE,
      type: "case",
      volume: 600,
      reporter: "F.3d",
      page: 456,
      span: span(50),
      resolution: undefined,
    }
    const id1: ResolvedCitation<IdCitation> = {
      ...BASE,
      type: "id",
      span: span(100),
      resolution: { resolvedTo: 1, confidence: 1 },
    }
    const id2: ResolvedCitation<IdCitation> = {
      ...BASE,
      type: "id",
      span: span(150),
      resolution: { resolvedTo: 0, confidence: 1 },
    }
    const groups = groupByCase([cite1, cite2, id1, id2])
    expect(groups).toHaveLength(2)
    // Group for cite1 (index 0): cite1 + id2 (resolvedTo: 0)
    expect(groups[0].mentions).toEqual([cite1, id2])
    // Group for cite2 (index 1): cite2 + id1 (resolvedTo: 1)
    expect(groups[1].mentions).toEqual([cite2, id1])
  })

  it("returns groups in document order by first mention", () => {
    const citeB: ResolvedCitation<FullCaseCitation> = {
      ...BASE,
      type: "case",
      volume: 600,
      reporter: "F.3d",
      page: 456,
      span: span(0),
      resolution: undefined,
    }
    const citeA: ResolvedCitation<FullCaseCitation> = {
      ...BASE,
      type: "case",
      volume: 500,
      reporter: "F.2d",
      page: 123,
      span: span(50),
      resolution: undefined,
    }
    const groups = groupByCase([citeB, citeA])
    expect(groups).toHaveLength(2)
    expect(groups[0].primaryCitation).toBe(citeB)
    expect(groups[1].primaryCitation).toBe(citeA)
  })

  it("handles short form resolving to a parallel-grouped citation", () => {
    const primary: ResolvedCitation<FullCaseCitation> = {
      ...BASE,
      type: "case",
      volume: 410,
      reporter: "U.S.",
      page: 113,
      groupId: "410-U.S.-113",
      parallelCitations: [{ volume: 93, reporter: "S. Ct.", page: 705 }],
      span: span(0),
      resolution: undefined,
    }
    const secondary: ResolvedCitation<FullCaseCitation> = {
      ...BASE,
      type: "case",
      volume: 93,
      reporter: "S. Ct.",
      page: 705,
      groupId: "410-U.S.-113",
      span: span(50),
      resolution: undefined,
    }
    const id: ResolvedCitation<IdCitation> = {
      ...BASE,
      type: "id",
      span: span(100),
      resolution: { resolvedTo: 1, confidence: 1 },
    }
    const groups = groupByCase([primary, secondary, id])
    expect(groups).toHaveLength(1)
    expect(groups[0].mentions).toEqual([primary, secondary, id])
  })
})
