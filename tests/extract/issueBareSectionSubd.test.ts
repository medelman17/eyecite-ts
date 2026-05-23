import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #663 / #655 — bare-section short-form cites that inherit from
 * an antecedent CA code (`Health & Saf. Code, § 1375.4` establishes the
 * code) silently dropped their subdivision-keyword subsection (`subd.`,
 * `subds.`, `paragraph`, `par.`). Now BARE_SECTION_RE includes the
 * keyword chain and parseBody (post-#589) splits it correctly. The
 * plural `subds.` form was also added to normalizeSubdKeyword.
 */
describe("Issue #663 - bare-section short-form subdivision keyword", () => {
  it("`§ 1347.15, subd. (b)(1)-(3)` (inherited from CA code) captures subsection", () => {
    const text = `Health & Saf. Code, § 1375.4 governs. See § 1347.15, subd. (b)(1)-(3).`
    const cs = extractCitations(text).filter((c) => c.type === "statute")
    expect(cs).toHaveLength(2)
    const child = cs[1] as { section?: string; subsection?: string; code?: string }
    expect(child.section).toBe("1347.15")
    expect(child.subsection).toBe("(b)(1)")
    expect(child.code).toBe("Health & Saf. Code")
  })

  it("`§ 1317, subds. (a), (b)` plural subds. form parsed correctly", () => {
    const text = `Health & Saf. Code, § 1375.4 governs. § 1317, subds. (a), (b).`
    const cs = extractCitations(text).filter((c) => c.type === "statute")
    expect(cs).toHaveLength(2)
    const child = cs[1] as { section?: string; subsection?: string }
    expect(child.section).toBe("1317")
    expect(child.subsection).toBe("(a)")
  })

  it("`§ 1371.4(e)` (no subd keyword) still works", () => {
    const text = `Health & Saf. Code, § 1375.4. § 1371.4(e).`
    const cs = extractCitations(text).filter((c) => c.type === "statute")
    expect(cs).toHaveLength(2)
    const child = cs[1] as { section?: string; subsection?: string }
    expect(child.section).toBe("1371.4")
    expect(child.subsection).toBe("(e)")
  })

  it("`§ 1348.6, subd. (b)` simple form captures subsection", () => {
    const text = `Health & Saf. Code, § 1375.4. § 1348.6, subd. (b).`
    const cs = extractCitations(text).filter((c) => c.type === "statute")
    expect(cs).toHaveLength(2)
    const child = cs[1] as { subsection?: string }
    expect(child.subsection).toBe("(b)")
  })
})
