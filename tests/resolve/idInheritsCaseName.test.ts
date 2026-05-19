import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { IdCitation } from "@/types/citation"

describe("Id. inherits caseName from antecedent", () => {
  it("`Id. at 1133` after `In re Hanford, 292 F.3d 1124, 1133` inherits caseName", () => {
    const text =
      "In re Hanford Nuclear Reservation Litig., 292 F.3d 1124, 1133 (9th Cir. 2002). The court explained the rule. Id. at 1133."
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c) => c.type === "id") as IdCitation | undefined
    expect(id).toBeDefined()
    expect(id?.caseName).toBe("In re Hanford Nuclear Reservation Litig.")
  })

  it("`Id.` after `Smith v. Jones` inherits caseName='Smith v. Jones'", () => {
    const text = "Smith v. Jones, 100 F.2d 50 (1990). Id."
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c) => c.type === "id") as IdCitation | undefined
    expect(id?.caseName).toBe("Smith v. Jones")
  })

  it("Id. inherits plaintiff and defendant fields", () => {
    const text = "Smith v. Jones, 100 F.2d 50 (1990). Id."
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c) => c.type === "id") as IdCitation | undefined
    expect(id?.plaintiff).toBe("Smith")
    expect(id?.defendant).toBe("Jones")
  })

  it("Id. inherits proceduralPrefix when antecedent has one", () => {
    const text = "In re Estate of Smith, 200 F.3d 100 (2010). The probate court said so. Id."
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c) => c.type === "id") as IdCitation | undefined
    expect(id?.proceduralPrefix).toBe("In re")
  })

  it("two consecutive `Id.`s both inherit the same caseName", () => {
    const text = "Smith v. Jones, 100 F.2d 50 (1990). Id. Id. at 55."
    const cites = extractCitations(text, { resolve: true })
    const ids = cites.filter((c): c is IdCitation => c.type === "id")
    expect(ids).toHaveLength(2)
    expect(ids[0].caseName).toBe("Smith v. Jones")
    expect(ids[1].caseName).toBe("Smith v. Jones")
  })

  it("Id. with no antecedent has no caseName", () => {
    const text = "Id. at 5."
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c) => c.type === "id") as IdCitation | undefined
    expect(id?.caseName).toBeUndefined()
  })

  it("Id. resolving to non-case (statute) does not gain a caseName", () => {
    const text = "See 28 U.S.C. § 1331. Id."
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c) => c.type === "id") as IdCitation | undefined
    expect(id?.caseName).toBeUndefined()
  })

  it("`resolve: false` (default) does not propagate caseName onto Id.", () => {
    const text = "Smith v. Jones, 100 F.2d 50 (1990). Id."
    const cites = extractCitations(text)
    const id = cites.find((c) => c.type === "id") as IdCitation | undefined
    expect(id?.caseName).toBeUndefined()
  })

  it("Id. after a short-form chain inherits root case's caseName", () => {
    // Smith v. Jones (full) → Smith, supra (short) → Id.
    // The Id. should inherit from Smith v. Jones (the chain root).
    // Note: the supra must actually resolve for Id. to chain back to the
    // root — otherwise per Bluebook Rule 4.1 Id. anchors to the unresolved
    // supra via antecedentIndex and inherits nothing.
    const text = "Smith v. Jones, 100 F.2d 50 (1990). Smith, supra. Id. at 60."
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c) => c.type === "id") as IdCitation | undefined
    expect(id?.caseName).toBe("Smith v. Jones")
  })
})
