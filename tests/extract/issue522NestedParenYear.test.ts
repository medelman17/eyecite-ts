/**
 * Issue #522 — Year extracted from nested parenthetical content.
 *
 * Repro: `104 S.Ct. 3479 (quoting United States v. Janis, 428 U.S. 433, 458, 96 S.Ct. 3021, 49 L.Ed.2d 1046 (1976))`
 *
 *   Before fix:
 *     outer `104 S.Ct. 3479`:
 *       year=3021       ← page number from inside `(quoting ...)`
 *       court="quoting United States v. Janis, 428 U.S. 433, 458, 96 S.Ct.
 *              3021, 49 L.Ed.2d 1046 ("   ← entire (broken) paren body
 *
 *   After fix:
 *     outer `104 S.Ct. 3479`:
 *       year=undefined  (no year in the outer cite — the inner `(1976)`
 *                        belongs to the quoted Janis cite, not to S.Ct. 3479)
 *       court="scotus"  (preserved by reporter inference)
 *       parentheticals=[{type: "quoting", text: "quoting United States v.
 *                        Janis, ... (1976)"}]
 *
 * SCOTUS opinions trigger this constantly because explanatory `(quoting X v.
 * Y, ## U.S. ##, ## (YYYY))` patterns are everywhere.
 */
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"
import type { CaseCitation, Citation } from "@/types/citation"

const caseCites = (text: string): CaseCitation[] =>
  (extractCitations(text) as Citation[]).filter(
    (c): c is CaseCitation => c.type === "case",
  )

describe("issue #522 — nested parenthetical leaks year/court into outer cite", () => {
  it("outer S.Ct. cite does not capture inner paren year as own year", () => {
    const cites = caseCites(
      "104 S.Ct. 3479 (quoting United States v. Janis, 428 U.S. 433, 458, 96 S.Ct. 3021, 49 L.Ed.2d 1046 (1976))",
    )
    const outer = cites.find((c) => c.matchedText === "104 S.Ct. 3479")
    expect(outer).toBeDefined()
    if (!outer) return
    // year MUST NOT be 3021 (page number from inside the quoted paren) — the
    // page-as-year capture is the obvious symptom of the bug.
    expect(outer.year).not.toBe(3021)
    // court MUST NOT be the entire quoted body
    expect(outer.court).not.toContain("Janis")
    expect(outer.court).not.toContain("(")
    // court should be the inferred SCOTUS string (S.Ct. → scotus)
    expect(outer.court).toBe("scotus")
  })

  it("inner Janis cites are extracted with their own year", () => {
    const cites = caseCites(
      "104 S.Ct. 3479 (quoting United States v. Janis, 428 U.S. 433, 458, 96 S.Ct. 3021, 49 L.Ed.2d 1046 (1976))",
    )
    const janisFedReporter = cites.find((c) => c.matchedText === "428 U.S. 433")
    expect(janisFedReporter).toBeDefined()
    if (janisFedReporter) {
      expect(janisFedReporter.year).toBe(1976)
      expect(janisFedReporter.court).toBe("scotus")
    }
  })

  it("explanatory `quoting` paren is captured as a parenthetical (signal=quoting)", () => {
    const cites = caseCites(
      "104 S.Ct. 3479 (quoting United States v. Janis, 428 U.S. 433, 458, 96 S.Ct. 3021, 49 L.Ed.2d 1046 (1976))",
    )
    const outer = cites.find((c) => c.matchedText === "104 S.Ct. 3479")
    expect(outer).toBeDefined()
    if (!outer) return
    // The `quoting ...` parenthetical should surface as an explanatory paren
    expect(outer.parentheticals).toBeDefined()
    const quoting = outer.parentheticals?.find((p) => p.type === "quoting")
    expect(quoting).toBeDefined()
    expect(quoting?.text).toContain("United States v. Janis")
    expect(quoting?.text).toContain("(1976)")
  })

  it("`see` signal with nested paren behaves the same as quoting", () => {
    const cites = caseCites(
      "500 F.3d 100 (see Doe v. Roe, 200 U.S. 1, 5, 50 S.Ct. 999, 999 (1995))",
    )
    const outer = cites.find((c) => c.matchedText === "500 F.3d 100")
    expect(outer).toBeDefined()
    if (!outer) return
    // Year MUST NOT be the inner-paren value (1995 belongs to Doe v. Roe).
    expect(outer.year).not.toBe(1995)
    // Court MUST NOT capture the inner prose body.
    expect(outer.court ?? "").not.toContain("Doe")
  })

  it("`citing` signal with nested paren behaves the same", () => {
    const cites = caseCites(
      "500 F.3d 100 (citing Foo v. Bar, 200 U.S. 1, 5, 50 S.Ct. 999, 999 (2010))",
    )
    const outer = cites.find((c) => c.matchedText === "500 F.3d 100")
    expect(outer).toBeDefined()
    if (!outer) return
    // Year MUST NOT be the inner-paren value (2010 belongs to Foo v. Bar).
    expect(outer.year).not.toBe(2010)
    // Court MUST NOT capture the inner prose body.
    expect(outer.court ?? "").not.toContain("Foo")
  })

  it("regular court+year paren (not nested) still works", () => {
    // Sanity check: the fix must not break the common single-paren case.
    const cites = caseCites("Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)")
    expect(cites).toHaveLength(1)
    expect(cites[0].year).toBe(2020)
    expect(cites[0].court).toBe("9th Cir.")
  })

  it("multi-cite parallel chain with nested-paren explanatory still extracts each", () => {
    // 410 U.S. 113, 93 S.Ct. 705 is a parallel pair. The trailing
    // explanatory paren must not corrupt either cite.
    const cites = caseCites(
      "Roe v. Wade, 410 U.S. 113, 117, 93 S.Ct. 705 (1973) (quoting Foo v. Bar, 100 U.S. 1 (1900))",
    )
    expect(cites.length).toBeGreaterThanOrEqual(2)
    const us = cites.find((c) => c.matchedText === "410 U.S. 113")
    expect(us?.year).toBe(1973)
    expect(us?.court).toBe("scotus")
  })
})
