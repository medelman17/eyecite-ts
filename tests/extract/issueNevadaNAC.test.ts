import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #377 (NAC sub-issue) — Nevada Administrative Code (`NAC`)
 * wasn't recognized as a statute code. The NRS (Nevada Revised
 * Statutes) entry was already supported; NAC needed its own entry
 * because it's a separate regulation code.
 *
 * Other #377 sub-issues (CCCO Clark County Ordinances, Nevada
 * session laws `Nev. Stat., ch. NNN`) remain open.
 */
describe("Issue #377 - Nevada Administrative Code (NAC)", () => {
  it("`NAC 616.650` extracts as NV statute", () => {
    const cs = extractCitations(`NAC 616.650`).filter((c) => c.type === "statute")
    expect(cs).toHaveLength(1)
    const c = cs[0] as { code?: string; section?: string; jurisdiction?: string }
    expect(c.code).toBe("NAC")
    expect(c.section).toBe("616.650")
    expect(c.jurisdiction).toBe("NV")
  })

  it("`Nev. Admin. Code 616.650` (spelled-out) extracts as NV statute", () => {
    const cs = extractCitations(`Nev. Admin. Code 616.650`).filter((c) => c.type === "statute")
    expect(cs).toHaveLength(1)
    const c = cs[0] as { code?: string; jurisdiction?: string }
    expect(c.code).toBe("Nev. Admin. Code")
    expect(c.jurisdiction).toBe("NV")
  })

  it("regression: `NRS 174.295` still works", () => {
    const cs = extractCitations(`NRS 174.295`).filter((c) => c.type === "statute")
    expect(cs).toHaveLength(1)
    const c = cs[0] as { code?: string; jurisdiction?: string }
    expect(c.code).toBe("NRS")
    expect(c.jurisdiction).toBe("NV")
  })
})
