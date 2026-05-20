import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { Citation, StatuteCitation } from "@/types/citation"

const statutes = (cites: Citation[]): StatuteCitation[] =>
  cites.filter((c): c is StatuteCitation => c.type === "statute")

/**
 * #567 — Cross-reference forms like `§ X; see also § Y` drop the bare
 * second `§`. After a full statute citation establishes a code, follow-on
 * bare `§ N` should be treated as a short-form statute reference that
 * inherits title / code / jurisdiction from its antecedent.
 */
describe("issue #567 — bare `§ N` short-form statute after full cite", () => {
  it("`42 U.S.C. § 1983; see also § 1985` produces 2 cites", () => {
    const text = "See 42 U.S.C. § 1983; see also § 1985."
    const cites = statutes(extractCitations(text))
    expect(cites).toHaveLength(2)
    const head = cites[0]
    const ref = cites[1]
    expect(head.section).toBe("1983")
    expect(ref.section).toBe("1985")
    // The bare reference inherits title / code from the antecedent.
    expect(ref.title).toBe(42)
    expect(ref.code).toBe("U.S.C.")
    expect(ref.jurisdiction).toBe("US")
  })

  it("`28 U.S.C. § 1331; § 1332` (semicolon connector) produces 2 cites", () => {
    const text = "See 28 U.S.C. § 1331; § 1332."
    const cites = statutes(extractCitations(text))
    expect(cites).toHaveLength(2)
    expect(cites[1].section).toBe("1332")
    expect(cites[1].code).toBe("U.S.C.")
    expect(cites[1].title).toBe(28)
  })

  it("`Cal. Penal Code § 220; see also § 264` inherits Cal. Penal", () => {
    const text = "Cal. Penal Code § 220; see also § 264."
    const cites = statutes(extractCitations(text))
    expect(cites).toHaveLength(2)
    const ref = cites[1]
    expect(ref.section).toBe("264")
    // code carries the full identifier per #568.
    expect(ref.code).toBe("Cal. Penal Code")
    expect(ref.jurisdiction).toBe("CA")
  })

  it("`42 U.S.C. § 1983. § 1985 also.` (sentence boundary) inherits", () => {
    const text = "See 42 U.S.C. § 1983. § 1985 also applies."
    const cites = statutes(extractCitations(text))
    expect(cites).toHaveLength(2)
    expect(cites[1].section).toBe("1985")
    expect(cites[1].title).toBe(42)
    expect(cites[1].code).toBe("U.S.C.")
  })

  describe("regression", () => {
    it("bare `§ N-N-N` with no antecedent still gates by jurisdiction (#565)", () => {
      const text = "Bare § 32A-2-7(A) standalone."
      const cites = statutes(extractCitations(text))
      // The NM guard from #565 drops jurisdiction — and there's no
      // antecedent to inherit from, so jurisdiction stays undefined.
      const bare = cites.find((c) => c.section === "32A-2-7")
      expect(bare?.jurisdiction).toBeUndefined()
    })

    it("no bare-§ after a full cite — no spurious cites", () => {
      const text = "42 U.S.C. § 1983 is the cause of action."
      const cites = statutes(extractCitations(text))
      expect(cites).toHaveLength(1)
    })
  })
})
