import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #295 (slice: long-form federal rule variants). The abbreviated
 * pattern required `Fed. R.` + a `P.`-suffixed set, so the older long-form
 * spellings — `Fed. Rule Bankr. P. 3001`, `Fed. Rule Crim. Proc. 46(b)` —
 * extracted as nothing. The pattern now accepts `Rule`/`Rules` for `R.` and
 * `Proc.` for `P.`. (Bare `Rule N`, state procedural rules, and disciplinary
 * rules remain other slices of #295.)
 */
const fedRule = (t: string) =>
  extractCitations(t).find((c) => c.type === "federalRule") as
    | { ruleSet?: string; rule?: string; subsection?: string }
    | undefined

describe("Issue #295 - long-form federal rules", () => {
  it("`Fed. Rule Bankr. P. 3001` (long-form Rule) extracts", () => {
    const c = fedRule("Petitioner moved under Fed. Rule Bankr. P. 3001.")
    expect(c?.ruleSet).toBe("bankruptcy")
    expect(c?.rule).toBe("3001")
  })

  it("`Fed. Rule Crim. Proc. 46(b)` (long-form Rule + Proc.) extracts", () => {
    const c = fedRule("See Fed. Rule Crim. Proc. 46(b).")
    expect(c?.ruleSet).toBe("criminal")
    expect(c?.rule).toBe("46")
    expect(c?.subsection).toBe("(b)")
  })

  it("`Fed. R. Crim. Proc. 46` (abbreviated R. + spelled Proc.) extracts", () => {
    const c = fedRule("Fed. R. Crim. Proc. 46 governs.")
    expect(c?.ruleSet).toBe("criminal")
    expect(c?.rule).toBe("46")
  })

  // Regression controls — canonical forms unchanged.
  it("`Fed. R. Civ. P. 12(b)(6)` still extracts", () => {
    const c = fedRule("Fed. R. Civ. P. 12(b)(6)")
    expect(c?.ruleSet).toBe("civil")
    expect(c?.rule).toBe("12")
    expect(c?.subsection).toBe("(b)(6)")
  })

  it("`Fed. R. Bankr. P. 3001` (abbreviated) still extracts", () => {
    const c = fedRule("Fed. R. Bankr. P. 3001")
    expect(c?.ruleSet).toBe("bankruptcy")
    expect(c?.rule).toBe("3001")
  })
})
