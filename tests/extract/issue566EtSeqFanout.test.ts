import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { Citation, StatuteCitation } from "@/types/citation"

const statutes = (cites: Citation[]): StatuteCitation[] =>
  cites.filter((c): c is StatuteCitation => c.type === "statute")

/**
 * #566 — `hasEtSeq` leaks / drops in `expandPluralSectionList` fanout.
 *
 * The expander spreads the head citation's metadata to siblings via
 * `{ ...cite, ... }` spread. `hasEtSeq` rides along even when the
 * `et seq.` token actually applies only to ONE specific section.
 *
 * Fix: inspect the source text around each emitted sibling to decide
 * whether the `et seq.` modifies it. Only the section the `et seq.`
 * immediately follows should carry `hasEtSeq=true`.
 */
describe("issue #566 — hasEtSeq fanout in plural §§ lists", () => {
  it("`§§ 1331, 1332 et seq.` — only the LAST section gets hasEtSeq", () => {
    const text = "28 U.S.C. §§ 1331, 1332 et seq."
    const cites = statutes(extractCitations(text))
    expect(cites).toHaveLength(2)
    const s1331 = cites.find((c) => c.section === "1331")
    const s1332 = cites.find((c) => c.section === "1332")
    expect(s1331).toBeDefined()
    expect(s1332).toBeDefined()
    // 1331 was NOT modified by `et seq.` — it should not carry the flag.
    expect(s1331?.hasEtSeq).toBeFalsy()
    // 1332 was — it should.
    expect(s1332?.hasEtSeq).toBe(true)
  })

  it("`§§ 12940 et seq., 12945` — only the FIRST (head) gets hasEtSeq", () => {
    const text = "Cal. Gov. Code §§ 12940 et seq., 12945 applies."
    const cites = statutes(extractCitations(text))
    expect(cites).toHaveLength(2)
    const s12940 = cites.find((c) => c.section === "12940")
    const s12945 = cites.find((c) => c.section === "12945")
    expect(s12940?.hasEtSeq).toBe(true)
    expect(s12945?.hasEtSeq).toBeFalsy()
  })

  it("`§§ 100, 200, 300 et seq.` — only `300` gets hasEtSeq", () => {
    const text = "28 U.S.C. §§ 100, 200, 300 et seq."
    const cites = statutes(extractCitations(text))
    expect(cites).toHaveLength(3)
    const s100 = cites.find((c) => c.section === "100")
    const s200 = cites.find((c) => c.section === "200")
    const s300 = cites.find((c) => c.section === "300")
    expect(s100?.hasEtSeq).toBeFalsy()
    expect(s200?.hasEtSeq).toBeFalsy()
    expect(s300?.hasEtSeq).toBe(true)
  })

  it("no `et seq.` anywhere — no fanout flag", () => {
    const text = "28 U.S.C. §§ 1331, 1332."
    const cites = statutes(extractCitations(text))
    expect(cites).toHaveLength(2)
    for (const s of cites) expect(s.hasEtSeq).toBeFalsy()
  })

  it("regression — `42 U.S.C. § 1983 et seq.` (singular) still works", () => {
    const text = "42 U.S.C. § 1983 et seq."
    const cites = statutes(extractCitations(text))
    expect(cites).toHaveLength(1)
    expect(cites[0].hasEtSeq).toBe(true)
  })
})
