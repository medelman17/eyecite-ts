import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { FullCaseCitation } from "@/types/citation"

const findByPage = (
  text: string,
  page: number | string,
): FullCaseCitation | undefined => {
  const cites = extractCitations(text)
  return cites.find(
    (c): c is FullCaseCitation =>
      c.type === "case" && String(c.page) === String(page),
  )
}

describe("caseName backward search bounded by prior citation's (YYYY) paren", () => {
  describe("citation lists joined by `, and`", () => {
    it("third citation in `A, B, and C` triple — caseName isolated to C", () => {
      const text =
        "In United Food & Commercial Workers Union v. Zuckerberg, 262 A.3d 1034 (Del. 2021), the Court adopted a test that blends elements from Aronson v. Lewis, 473 A.2d 805 (Del. 1984), and Rales v. Blasband, 634 A.2d 927 (Del. 1993)."
      const third = findByPage(text, 927)
      expect(third).toBeDefined()
      expect(third?.caseName).toBe("Rales v. Blasband")
      expect(third?.plaintiff).toBe("Rales")
      expect(third?.defendant).toBe("Blasband")
    })

    it("second citation in `A, and B` pair — caseName isolated to B", () => {
      const text =
        "See Foo v. Bar, 100 F.2d 50 (1990), and Baz v. Qux, 200 F.3d 100 (2000)."
      const second = findByPage(text, 100)
      expect(second).toBeDefined()
      expect(second?.caseName).toBe("Baz v. Qux")
      expect(second?.plaintiff).toBe("Baz")
    })

    it("semicolon connector: `A; B` — second caseName isolated", () => {
      const text =
        "See Foo v. Bar, 100 F.2d 50 (1990); Baz v. Qux, 200 F.3d 100 (2000)."
      const second = findByPage(text, 100)
      expect(second).toBeDefined()
      expect(second?.caseName).toBe("Baz v. Qux")
    })

    it("`see also` connector: `A; see also B` — second caseName isolated", () => {
      const text =
        "Foo v. Bar, 100 F.2d 50 (1990); see also Baz v. Qux, 200 F.3d 100 (2000)."
      const second = findByPage(text, 100)
      expect(second).toBeDefined()
      expect(second?.caseName).toBe("Baz v. Qux")
    })
  })

  describe("court+year paren with multiple periods", () => {
    it("court abbrev with two periods `(D. Del. 1984)` doesn't pollute next caseName", () => {
      const text =
        "Smith v. Jones, 100 F. Supp. 2d 50 (D. Del. 1984), and Adams v. Brown, 200 F.3d 100 (3d Cir. 1995)."
      const second = findByPage(text, 100)
      expect(second).toBeDefined()
      expect(second?.caseName).toBe("Adams v. Brown")
    })
  })

  describe("regressions: single citations still work", () => {
    it("simple `Smith v. Jones, 100 F.2d 50 (1990)`", () => {
      const text = "Smith v. Jones, 100 F.2d 50 (1990)."
      const cite = findByPage(text, 50)
      expect(cite?.caseName).toBe("Smith v. Jones")
    })

    it("first citation in a list keeps its full case name", () => {
      const text =
        "In United Food & Commercial Workers Union v. Zuckerberg, 262 A.3d 1034 (Del. 2021), the rule applies."
      const first = findByPage(text, 1034)
      expect(first?.caseName).toBe(
        "United Food & Commercial Workers Union v. Zuckerberg",
      )
    })
  })
})
