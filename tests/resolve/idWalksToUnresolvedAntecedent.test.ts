import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { Citation, IdCitation } from "@/types/citation"

describe("antecedentIndex — Id. clusters with unresolved short-form (Bluebook 4.1)", () => {
  it("Id. after unresolved Yellen short-form: antecedentIndex points at it, resolvedTo undefined", () => {
    // Yellen, 416 N.J. Super. at 590 is a shortFormCase. Vol+reporter
    // (416 N.J. Super.) has no match anywhere in this text → unresolved.
    // Id. that follows should anchor to the Yellen short-form
    // (antecedentIndex), NOT chase past it to Smith.
    const text = "Smith v. Jones, 100 F.2d 50, 55 (1990). Yellen, 416 N.J. Super. at 590. Id."
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c): c is IdCitation => c.type === "id")
    expect(id).toBeDefined()
    expect(id?.resolution?.resolvedTo).toBeUndefined()
    // Antecedent is the Yellen short-form (idx 1).
    expect(id?.resolution?.antecedentIndex).toBe(1)
  })

  it("antecedentIndex set even when resolvedTo is also set (one step back)", () => {
    // Smith full at idx 0, Id. at idx 1, second Id. at idx 2.
    // The second Id. resolves to Smith (resolvedTo=0) AND has
    // antecedentIndex=1 (one step back, the first Id.).
    const text = "Smith v. Jones, 100 F.2d 50, 55 (1990). Id. Id."
    const cites = extractCitations(text, { resolve: true })
    const ids = cites.filter((c): c is IdCitation => c.type === "id")
    expect(ids).toHaveLength(2)
    expect(ids[1].resolution?.resolvedTo).toBe(0)
    expect(ids[1].resolution?.antecedentIndex).toBe(1)
  })

  it("Id. immediately after a full cite: antecedentIndex equals resolvedTo", () => {
    const text = "Smith v. Jones, 100 F.2d 50, 55 (1990). Id."
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c): c is IdCitation => c.type === "id")
    expect(id?.resolution?.resolvedTo).toBe(0)
    expect(id?.resolution?.antecedentIndex).toBe(0)
  })

  it("chain via antecedentIndex: parallel unresolved short-forms cluster", () => {
    // Yellen short-form (idx 1) and 3 A.3d parallel (idx 2) both fail
    // vol+reporter lookup. The parallel's antecedentIndex points at the
    // Yellen short-form. Id. (idx 3) clusters with the parallel.
    const text =
      "Smith v. Jones, 100 F.2d 50, 55 (1990). Yellen, 416 N.J. Super. at 590, 3 A.3d at 590. Id."
    const cites = extractCitations(text, { resolve: true })
    expect(cites).toHaveLength(4)
    const shortFormCaseCount = cites.filter((c: Citation) => c.type === "shortFormCase").length
    expect(shortFormCaseCount).toBe(2)

    // Walk: Id (3).antecedentIndex → 2 → antecedentIndex → 1.
    const id = cites[3] as IdCitation
    expect(id.type).toBe("id")
    expect(id.resolution?.antecedentIndex).toBe(2)
    expect(id.resolution?.resolvedTo).toBeUndefined()

    const parallel = cites[2]
    expect(parallel.type).toBe("shortFormCase")
    expect(
      (parallel as { resolution?: { antecedentIndex?: number } }).resolution?.antecedentIndex,
    ).toBe(1)
  })

  it("no prior citation: antecedentIndex undefined", () => {
    const text = "Id. at 100."
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c): c is IdCitation => c.type === "id")
    expect(id?.resolution?.antecedentIndex).toBeUndefined()
    expect(id?.resolution?.resolvedTo).toBeUndefined()
  })
})

describe("supra success path also populates antecedentIndex", () => {
  it("Smith → Brown → Smith, supra — supra resolves AND records antecedentIndex one step back", () => {
    const text =
      "Smith v. Jones, 100 F.2d 50 (1990). Brown v. Doe, 200 F.3d 100 (2000). Smith, supra."
    const cites = extractCitations(text, { resolve: true })
    expect(cites).toHaveLength(3)
    const supra = cites[2]
    expect(supra.type).toBe("supra")
    expect(
      (supra as { resolution?: { resolvedTo?: number; antecedentIndex?: number } }).resolution
        ?.resolvedTo,
    ).toBe(0) // resolves to Smith
    expect(
      (supra as { resolution?: { resolvedTo?: number; antecedentIndex?: number } }).resolution
        ?.antecedentIndex,
    ).toBe(1) // immediate predecessor is Brown (one step back)
  })
})
