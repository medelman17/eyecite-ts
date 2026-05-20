import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { Citation, StatuteCitation } from "@/types/citation"

const statutes = (cites: Citation[]): StatuteCitation[] =>
  cites.filter((c): c is StatuteCitation => c.type === "statute")

/**
 * #586 — `Title NN, U.S.C. § X` form (comma after the title prose word
 * before the code abbreviation) is a common prose style in published
 * federal opinions: appellate panels write `Title 18, U.S.C. § 3742`
 * exactly as often as the comma-free `Title 18 U.S.C. § 3742`. The
 * existing USC tokenizer regex required `\d+\s+U\.S\.C\.` and so
 * silently dropped every comma-after-title citation.
 *
 * The no-comma form `Title 18 U.S.C. § 3742` previously worked by
 * accident — the embedded `18 U.S.C. § 3742` substring matched the
 * regex with `Title` left outside the match. The comma form breaks
 * that accident because `18, U.S.C.` cannot match `\d+\s+U.S.C.`.
 */
describe("issue #586 — `Title NN, U.S.C. § N` prose form", () => {
  it("extracts `Title 18, U.S.C. § 3742`", () => {
    const cites = statutes(extractCitations("Title 18, U.S.C. § 3742"))
    expect(cites).toHaveLength(1)
    const c = cites[0]
    expect(c.title).toBe(18)
    expect(c.code).toBe("U.S.C.")
    expect(c.section).toBe("3742")
    expect(c.jurisdiction).toBe("US")
  })

  it("extracts `Title 8, U.S.C. § 1326`", () => {
    const cites = statutes(extractCitations("Title 8, U.S.C. § 1326"))
    expect(cites).toHaveLength(1)
    expect(cites[0].title).toBe(8)
    expect(cites[0].code).toBe("U.S.C.")
    expect(cites[0].section).toBe("1326")
  })

  it("extracts `Title 15, U.S.C. § 78`", () => {
    const cites = statutes(extractCitations("Title 15, U.S.C. § 78"))
    expect(cites).toHaveLength(1)
    expect(cites[0].title).toBe(15)
    expect(cites[0].section).toBe("78")
  })

  it("still extracts comma-free `Title 18 U.S.C. § 3742`", () => {
    // Regression: the no-comma form continues to work.
    const cites = statutes(extractCitations("Title 18 U.S.C. § 3742"))
    expect(cites).toHaveLength(1)
    expect(cites[0].title).toBe(18)
    expect(cites[0].section).toBe("3742")
  })

  it("extracts comma-after-title with subsection `Title 42, U.S.C. § 1983(a)`", () => {
    const cites = statutes(extractCitations("Title 42, U.S.C. § 1983(a)"))
    expect(cites).toHaveLength(1)
    expect(cites[0].title).toBe(42)
    expect(cites[0].section).toBe("1983")
    expect(cites[0].subsection).toBe("(a)")
  })

  it("does not match bare `18,U.S.C.` without space after comma", () => {
    // Defensive: the comma form requires at least one space after the
    // comma — `18,U.S.C.` is malformed and should not tokenize.
    const cites = statutes(extractCitations("18,U.S.C. § 3742"))
    expect(cites).toHaveLength(0)
  })

  it("still extracts canonical `42 U.S.C. § 1983` — regression for #428", () => {
    const cites = statutes(extractCitations("42 U.S.C. § 1983"))
    expect(cites).toHaveLength(1)
    expect(cites[0].title).toBe(42)
    expect(cites[0].code).toBe("U.S.C.")
    expect(cites[0].section).toBe("1983")
  })
})
