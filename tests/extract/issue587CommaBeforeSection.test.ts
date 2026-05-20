import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { Citation, StatuteCitation } from "@/types/citation"

const statutes = (cites: Citation[]): StatuteCitation[] =>
  cites.filter((c): c is StatuteCitation => c.type === "statute")

/**
 * #587 — Federal code citations sometimes appear with a comma between
 * the code abbreviation and the section connector: `42 U.S.C., § 1983`
 * or `12 C.F.R., § 226`. This style is uncommon in canonical Bluebook
 * usage but appears in older opinions and some agency / regulatory
 * publications. The USC/CFR tokenizer regexes have `\s*` between the
 * code abbreviation and the connector group, which rejects a comma.
 *
 * Sprint F's negative lookahead `(?![^)]*\d{4})` lives INSIDE the
 * subsection body (after the section digits) and is preserved intact
 * by this fix — the comma tolerance is added BEFORE the section.
 */
describe("issue #587 — comma between code and section", () => {
  it("extracts `45 U.S.C., § 151`", () => {
    const cites = statutes(extractCitations("45 U.S.C., § 151"))
    expect(cites).toHaveLength(1)
    const c = cites[0]
    expect(c.title).toBe(45)
    expect(c.code).toBe("U.S.C.")
    expect(c.section).toBe("151")
    expect(c.jurisdiction).toBe("US")
  })

  it("extracts `11 U.S.C., § 362`", () => {
    const cites = statutes(extractCitations("11 U.S.C., § 362"))
    expect(cites).toHaveLength(1)
    expect(cites[0].title).toBe(11)
    expect(cites[0].section).toBe("362")
  })

  it("extracts `28 U.S.C., § 636`", () => {
    const cites = statutes(extractCitations("28 U.S.C., § 636"))
    expect(cites).toHaveLength(1)
    expect(cites[0].title).toBe(28)
    expect(cites[0].section).toBe("636")
  })

  it("extracts `12 C.F.R., § 226`", () => {
    const cites = statutes(extractCitations("12 C.F.R., § 226"))
    expect(cites).toHaveLength(1)
    const c = cites[0]
    expect(c.title).toBe(12)
    expect(c.code).toBe("C.F.R.")
    expect(c.section).toBe("226")
  })

  it("extracts USC with comma + subsection: `42 U.S.C., § 1983(a)(1)`", () => {
    const cites = statutes(extractCitations("42 U.S.C., § 1983(a)(1)"))
    expect(cites).toHaveLength(1)
    const c = cites[0]
    expect(c.section).toBe("1983")
    expect(c.subsection).toBe("(a)(1)")
  })

  it("composes with #586 — `Title 18, U.S.C., § 3742`", () => {
    // Comma in BOTH positions (after title AND between code and §).
    const cites = statutes(extractCitations("Title 18, U.S.C., § 3742"))
    expect(cites).toHaveLength(1)
    expect(cites[0].title).toBe(18)
    expect(cites[0].section).toBe("3742")
  })

  it("preserves Sprint F year-paren binding: `42 U.S.C., § 1983 (1976)`", () => {
    // The comma between code and section must not break the year-paren
    // negative-lookahead binding that Sprint F installed for `(1976)`.
    const cites = statutes(extractCitations("42 U.S.C., § 1983 (1976)"))
    expect(cites).toHaveLength(1)
    const c = cites[0]
    expect(c.section).toBe("1983")
    expect(c.subsection).toBeUndefined()
    expect(c.year).toBe(1976)
  })

  it("preserves Sprint F year-paren binding with subsection: `42 U.S.C., § 1983(a) (West 2018)`", () => {
    const cites = statutes(extractCitations("42 U.S.C., § 1983(a) (West 2018)"))
    expect(cites).toHaveLength(1)
    const c = cites[0]
    expect(c.section).toBe("1983")
    expect(c.subsection).toBe("(a)")
    expect(c.year).toBe(2018)
    expect(c.publisher).toBe("West")
  })

  it("still extracts canonical `42 U.S.C. § 1983` — regression for #428", () => {
    const cites = statutes(extractCitations("42 U.S.C. § 1983"))
    expect(cites).toHaveLength(1)
    expect(cites[0].section).toBe("1983")
  })

  it("still extracts canonical `12 C.F.R. § 226.1` — regression for #428", () => {
    const cites = statutes(extractCitations("12 C.F.R. § 226.1"))
    expect(cites).toHaveLength(1)
    expect(cites[0].code).toBe("C.F.R.")
    expect(cites[0].section).toBe("226.1")
  })
})
