/**
 * Issue #529 — Disposition keywords (`per curiam`, `plurality opinion`,
 * `en banc`, `mem.`, `in bank`) must NOT leak into the `court` field.
 *
 * Repro: `Murphy v. Hunt, 455 U.S. 478, 102 S.Ct. 1181, 71 L.Ed.2d 353 (1982) (per curiam)`
 *  - Before fix: each cite gets `court="per curiam"` (overriding the SCOTUS
 *    inference) and `disposition="per curiam"`.
 *  - After fix: `court="scotus"` (from reporter inference) and
 *    `disposition="per curiam"`.
 *
 * `~0.5% rate — most common defect of the paren audit.` Disposition is
 * orthogonal to court — it describes HOW the opinion was issued, not WHICH
 * court issued it.
 */
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"
import type { CaseCitation, Citation } from "@/types/citation"

const caseCites = (text: string): CaseCitation[] =>
  (extractCitations(text) as Citation[]).filter(
    (c): c is CaseCitation => c.type === "case",
  )

describe("issue #529 — disposition does not leak into court field", () => {
  it("per curiam alone preserves SCOTUS inference", () => {
    const cites = caseCites(
      "Murphy v. Hunt, 455 U.S. 478, 102 S.Ct. 1181, 71 L.Ed.2d 353 (1982) (per curiam)",
    )
    expect(cites).toHaveLength(3)
    for (const c of cites) {
      expect(c.disposition).toBe("per curiam")
      expect(c.court).toBe("scotus")
    }
  })

  it("per curiam without a year paren still preserves SCOTUS inference", () => {
    const cites = caseCites("500 U.S. 1 (per curiam)")
    expect(cites).toHaveLength(1)
    expect(cites[0].disposition).toBe("per curiam")
    expect(cites[0].court).toBe("scotus")
  })

  it("plurality opinion alone preserves SCOTUS inference", () => {
    const cites = caseCites(
      "Sample v. Other, 500 U.S. 1, 5 (1991) (plurality opinion)",
    )
    expect(cites).toHaveLength(1)
    expect(cites[0].disposition).toBe("plurality opinion")
    expect(cites[0].court).toBe("scotus")
  })

  it("en banc alone preserves SCOTUS inference (rare but possible)", () => {
    const cites = caseCites("500 U.S. 1 (en banc)")
    expect(cites).toHaveLength(1)
    expect(cites[0].disposition).toBe("en banc")
    expect(cites[0].court).toBe("scotus")
  })

  it("mem. alone preserves SCOTUS inference", () => {
    const cites = caseCites("500 U.S. 1 (mem.)")
    expect(cites).toHaveLength(1)
    expect(cites[0].disposition).toBe("mem.")
    expect(cites[0].court).toBe("scotus")
  })

  it("in bank alone preserves SCOTUS inference", () => {
    // `in bank` is the California Supreme Court's equivalent of `en banc`.
    // Not realistic on a SCOTUS reporter, but the contract is the same: a
    // disposition keyword must not overwrite an inferred court.
    const cites = caseCites("500 U.S. 1 (in bank)")
    expect(cites).toHaveLength(1)
    expect(cites[0].disposition).toBe("in bank")
    expect(cites[0].court).toBe("scotus")
  })

  it("court + disposition chain still extracts the real court", () => {
    const cites = caseCites(
      "Smith v. Jones, 500 F.2d 123 (9th Cir. 2020) (en banc)",
    )
    expect(cites).toHaveLength(1)
    expect(cites[0].court).toBe("9th Cir.")
    expect(cites[0].year).toBe(2020)
    expect(cites[0].disposition).toBe("en banc")
  })

  it("disposition + court chain still extracts the real court", () => {
    // `(per curiam) (9th Cir. 2020)` — disposition first, then real court paren
    const cites = caseCites(
      "Smith v. Jones, 500 F.2d 123 (per curiam) (9th Cir. 2020)",
    )
    expect(cites).toHaveLength(1)
    expect(cites[0].court).toBe("9th Cir.")
    expect(cites[0].year).toBe(2020)
    expect(cites[0].disposition).toBe("per curiam")
  })

  it("court field is empty for a state reporter with disposition-only paren", () => {
    // Non-SCOTUS reporter with only disposition keyword: no court inference.
    // `court` should remain undefined (not "per curiam").
    const cites = caseCites("500 F.2d 123 (per curiam)")
    expect(cites).toHaveLength(1)
    expect(cites[0].disposition).toBe("per curiam")
    expect(cites[0].court).toBeUndefined()
  })
})
