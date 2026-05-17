import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { IdCitation } from "@/types/citation"

describe("Id. does not resolve to a citation inside a shortform's parenthetical", () => {
  it("Id. after `<shortform> (quoting <full case>)` resolves to the shortform's underlying authority, not the quoted case", () => {
    // Real-world example: a short-form `Dormitory Auth.` followed by an
    // explanatory `(quoting <full citation>)` parenthetical, then a quotation,
    // then `Id.`. The `Id.` should point at the shortform's antecedent
    // (the original Dormitory Authority full citation), NOT at the case
    // quoted inside the parenthetical.
    const text =
      'Dormitory Auth. v. State, 25 N.Y.3d 600 (2015). Dormitory Auth., 30 N.Y.3d at 710 (quoting Port Chester Elec. Constr. Corp. v. Atlas, 40 N.Y.2d 652, 656 (1976)). "In the absence of express language, such third parties are generally considered mere incidental beneficiaries." Id.'

    const cites = extractCitations(text, { resolve: true })

    const id = cites.find((c) => c.type === "id") as IdCitation | undefined
    expect(id).toBeDefined()
    expect(id?.resolution?.resolvedTo).toBeDefined()

    const target = id?.resolution?.resolvedTo
    expect(target).toBeDefined()
    if (target === undefined) return
    const targetCite = cites[target]
    expect(targetCite.type).toBe("case")
    if (targetCite.type === "case") {
      // Should be the Dormitory Auth. full citation, not Port Chester.
      expect(targetCite.plaintiff).toContain("Dormitory")
    }
  })

  it("Id. inside `<full case> (citing <inner case>)` resolves to outer, not inner (already worked for `case`)", () => {
    // Regression: this case already worked because the outer cite is a full
    // `case` type with `fullSpan` extending through the paren.
    const text = "Smith v. Jones, 100 F.2d 50 (1990) (citing Doe v. Roe, 200 F.3d 100 (1985)). Id."
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c) => c.type === "id") as IdCitation | undefined
    const target = id?.resolution?.resolvedTo
    expect(target).toBeDefined()
    if (target === undefined) return
    const targetCite = cites[target]
    if (targetCite.type === "case") {
      expect(targetCite.plaintiff).toBe("Smith")
    }
  })

  it("Id. after `<shortform> (citing <inner full>)` skips inner full → resolves to shortform's antecedent", () => {
    const text =
      "Smith v. Jones, 100 F.2d 50 (1990). Smith, 100 F.2d at 55 (citing Other v. Case, 200 F.3d 100 (2000)). Id."
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c) => c.type === "id") as IdCitation | undefined
    const target = id?.resolution?.resolvedTo
    expect(target).toBeDefined()
    if (target === undefined) return
    const targetCite = cites[target]
    if (targetCite.type === "case") {
      // Should be Smith v. Jones (outer, original) not Other v. Case (inner)
      expect(targetCite.plaintiff).toBe("Smith")
    }
  })

  it("nested `(See A; B (citing C))` — depth-2 C still skipped, Id. after closes to outer", () => {
    const text =
      "Top v. Case, 100 F.2d 1 (1990). (See Mid v. Case, 200 F.3d 2 (1995) (citing Inner v. Case, 300 F.4th 3 (2000))). Id."
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c) => c.type === "id") as IdCitation | undefined
    const target = id?.resolution?.resolvedTo
    expect(target).toBeDefined()
    if (target === undefined) return
    // Id. should resolve to Top v. Case (the only depth-0 cite), not
    // Mid (depth-1) or Inner (depth-2).
    const targetCite = cites[target]
    if (targetCite.type === "case") {
      expect(targetCite.plaintiff).toBe("Top")
    }
  })

  it("statute inside a citation's parenthetical does not become Id.'s antecedent", () => {
    // Edge case: a case cite carries an explanatory paren that references a
    // statute. The statute is depth-1 — it should not be Id.'s antecedent.
    const text = "Smith v. State, 100 F.2d 50 (1990) (interpreting 28 U.S.C. § 1331). Id."
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c) => c.type === "id") as IdCitation | undefined
    const target = id?.resolution?.resolvedTo
    expect(target).toBeDefined()
    if (target === undefined) return
    const targetCite = cites[target]
    expect(targetCite.type).toBe("case")
  })

  it("Id. INSIDE the parenthetical (depth > 0) is itself a paren-child", () => {
    // Documentation test — when Id. is within a parenthetical block, the
    // current behavior is whatever lastResolvedIndex held at the parent's
    // entry. We assert that this case does not throw and resolves to SOME
    // antecedent (the exact target is implementation-specific).
    const text = "Smith v. Jones, 100 F.2d 50 (1990) (citing Doe v. Roe, 200 F.3d 100; Id.)."
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c) => c.type === "id") as IdCitation | undefined
    expect(id).toBeDefined()
    // The Id. should resolve to SOMETHING and not throw.
    expect(id?.resolution).toBeDefined()
  })

  it("the user's actual example (Dormitory Auth. v. Port Chester quote)", () => {
    // Exact reproduction of the bug reported by the user.
    const text =
      'Dormitory Auth. v. Council, 28 N.Y.3d 500 (2014). Dormitory Auth., 30 N.Y.3d at 710 (quoting Port Chester Elec. Constr. Corp. v. Atlas, 40 N.Y.2d 652, 656 (1976)). "In the absence of express language, such third parties are generally considered mere incidental beneficiaries." Id.'
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c) => c.type === "id") as IdCitation | undefined
    const target = id?.resolution?.resolvedTo
    expect(target).toBeDefined()
    if (target === undefined) return
    const targetCite = cites[target]
    if (targetCite.type === "case") {
      // Must point at Dormitory Auth., not Port Chester.
      expect(targetCite.plaintiff).toContain("Dormitory")
      expect(targetCite.plaintiff).not.toContain("Port Chester")
    }
  })
})
