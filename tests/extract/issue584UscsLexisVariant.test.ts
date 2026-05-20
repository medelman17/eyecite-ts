import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { Citation, StatuteCitation } from "@/types/citation"

const statutes = (cites: Citation[]): StatuteCitation[] =>
  cites.filter((c): c is StatuteCitation => c.type === "statute")

/**
 * #584 — USCS (LEXIS-annotated US Code) is the LEXIS publisher's annotated
 * edition of the United States Code. The Bluebook canonical abbreviation
 * for the LEXIS edition is `U.S.C.S.`; West publishes `U.S.C.A.`. The
 * tokenizer regex already accepts the West variant (`A?`) but never the
 * LEXIS variant (`S?`). Both annotated editions should canonicalize to
 * `U.S.C.` since they are editions of the same underlying code.
 */
describe("issue #584 — USCS (LEXIS-annotated US Code) extraction", () => {
  it("extracts `26 U.S.C.S. § 7433`", () => {
    const cites = statutes(extractCitations("26 U.S.C.S. § 7433"))
    expect(cites).toHaveLength(1)
    const c = cites[0]
    expect(c.title).toBe(26)
    expect(c.code).toBe("U.S.C.")
    expect(c.section).toBe("7433")
    expect(c.jurisdiction).toBe("US")
  })

  it("extracts `42 U.S.C.S. § 1983 (LEXIS through 2020)` (year-paren rejected by Sprint F lookahead)", () => {
    const cites = statutes(
      extractCitations("42 U.S.C.S. § 1983 (LEXIS through 2020)"),
    )
    expect(cites).toHaveLength(1)
    const c = cites[0]
    expect(c.title).toBe(42)
    expect(c.code).toBe("U.S.C.")
    expect(c.section).toBe("1983")
    // The trailing `(LEXIS through 2020)` parenthetical contains a 4-digit
    // year, so Sprint F's `(?![^)]*\d{4})` lookahead excludes it from
    // subsection absorption — section stays bare `1983`. The lowercase
    // `through` between `LEXIS` and `2020` does NOT match the canonical
    // `(Publisher YYYY)` year-paren shape, so `year` remains undefined
    // for this LEXIS coverage-period idiom (separate concern).
    expect(c.subsection).toBeUndefined()
  })

  it("extracts `42 U.S.C.S. § 1983 (LEXIS 2020)` and binds publisher+year", () => {
    // Canonical `(Publisher YYYY)` shape works through the standard binder.
    const cites = statutes(extractCitations("42 U.S.C.S. § 1983 (LEXIS 2020)"))
    expect(cites).toHaveLength(1)
    const c = cites[0]
    expect(c.code).toBe("U.S.C.")
    expect(c.section).toBe("1983")
    expect(c.year).toBe(2020)
    expect(c.publisher).toBe("LEXIS")
  })

  it("extracts `28 U.S.C.S. § 1331(a)` with subsection", () => {
    const cites = statutes(extractCitations("28 U.S.C.S. § 1331(a)"))
    expect(cites).toHaveLength(1)
    const c = cites[0]
    expect(c.section).toBe("1331")
    expect(c.subsection).toBe("(a)")
    expect(c.code).toBe("U.S.C.")
  })

  it("does not absorb a stray `S` from neighboring prose into the code", () => {
    // Sanity: `42 U.S.C. Section 1983` must still produce code `U.S.C.`,
    // not `U.S.C.S.` because of the `[AS]?` extension.
    const cites = statutes(extractCitations("42 U.S.C. Section 1983"))
    expect(cites).toHaveLength(1)
    expect(cites[0].code).toBe("U.S.C.")
    expect(cites[0].section).toBe("1983")
  })

  it("still extracts USCA (West variant) — regression for #428", () => {
    const cites = statutes(extractCitations("11 U.S.C.A. § 544(a)(3)"))
    expect(cites).toHaveLength(1)
    expect(cites[0].code).toBe("U.S.C.")
    expect(cites[0].section).toBe("544")
    expect(cites[0].subsection).toBe("(a)(3)")
  })
})
