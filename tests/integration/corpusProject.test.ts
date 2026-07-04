import { describe, expect, it } from "vitest"
import { projectOpinion } from "../../scripts/corpus/project"

describe("projectOpinion (#corpus)", () => {
  it("projects type, key (matchedText), span, and resolvedTo", () => {
    const text = "Smith v. Jones, 100 F.3d 1 (2d Cir. 1990). Id. at 5."
    const p = projectOpinion(42, text)

    expect(p.id).toBe(42)
    expect(p.count).toBe(2)

    const [full, id] = p.citations
    expect(full.type).toBe("case")
    expect(full.key).toBe("100 F.3d 1")
    expect(full.span[1]).toBeGreaterThan(full.span[0])
    expect(full.resolvedTo).toBeNull() // a full cite is an antecedent, not resolved

    expect(id.type).toBe("id")
    expect(id.resolvedTo).toBe("100 F.3d 1") // Id. resolves to the full cite's key
  })

  it("is deterministic (same input → same projection)", () => {
    const text = "See 42 U.S.C. § 1983. Id. § 1983(c)."
    expect(projectOpinion(1, text)).toEqual(projectOpinion(1, text))
  })
})
