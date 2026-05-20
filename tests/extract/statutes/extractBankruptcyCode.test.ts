/**
 * Tests for Bankruptcy Code alias normalization (#585).
 *
 * `Bankruptcy Code § 548(a)(1)(B)(i)` and `§ 547 of the Bankruptcy Code`
 * are normalized to a `statute` citation with `title=11, code="U.S.C."`
 * for downstream consistency.
 */
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"

describe("Bankruptcy Code alias (#585)", () => {
  it("normalizes 'Bankruptcy Code § 548(a)(1)(B)(i)' to title=11 U.S.C.", () => {
    const cites = extractCitations(
      "The trustee proceeded under Bankruptcy Code § 548(a)(1)(B)(i).",
    ).filter((c) => c.type === "statute")
    expect(cites).toHaveLength(1)
    if (cites[0]?.type === "statute") {
      expect(cites[0].title).toBe(11)
      expect(cites[0].code).toBe("U.S.C.")
      expect(cites[0].section).toBe("548")
      expect(cites[0].subsection).toBe("(a)(1)(B)(i)")
      expect(cites[0].jurisdiction).toBe("US")
    }
  })

  it("normalizes '§ 547 of the Bankruptcy Code' to title=11 U.S.C.", () => {
    const cites = extractCitations("The court analyzed § 547 of the Bankruptcy Code.").filter(
      (c) => c.type === "statute",
    )
    expect(cites).toHaveLength(1)
    if (cites[0]?.type === "statute") {
      expect(cites[0].title).toBe(11)
      expect(cites[0].code).toBe("U.S.C.")
      expect(cites[0].section).toBe("547")
    }
  })

  it("handles plain 'Bankruptcy Code § 362' (no subsection)", () => {
    const cites = extractCitations("Bankruptcy Code § 362").filter((c) => c.type === "statute")
    expect(cites).toHaveLength(1)
    if (cites[0]?.type === "statute") {
      expect(cites[0].title).toBe(11)
      expect(cites[0].code).toBe("U.S.C.")
      expect(cites[0].section).toBe("362")
    }
  })

  it("does NOT shadow real `11 U.S.C. § 548` extractions", () => {
    // The existing federal USC pattern should still win for explicit citations.
    const cites = extractCitations("Per 11 U.S.C. § 548(a)").filter((c) => c.type === "statute")
    expect(cites).toHaveLength(1)
    if (cites[0]?.type === "statute") {
      expect(cites[0].title).toBe(11)
      expect(cites[0].section).toBe("548")
    }
  })
})
