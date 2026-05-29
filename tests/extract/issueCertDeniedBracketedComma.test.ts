import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #526 — `cert. denied[,]` (bracketed comma, an editorial-insertion
 * convention used by some reporters) silently broke subsequent-history
 * detection. The history-signal regex required the next char to be
 * whitespace / comma / semicolon / paren / EOF — `[` was not admitted.
 * Both the parent's `subsequentHistoryEntries` and the child's
 * `subsequentHistoryOf` back-pointer were lost.
 *
 * Fix: extended the lookahead character class to include `[`.
 */
describe("Issue #526 - cert. denied[,] bracketed comma", () => {
  it("`cert. denied[,] N U.S. M` populates subsequentHistory + back-pointer", () => {
    const text =
      "Smith v. Jones, 796 F.2d 657 (3d Cir. 1986), cert. denied[,] 479 U.S. 1059 (1987)"
    const cs = extractCitations(text).filter((c) => c.type === "case")
    expect(cs.length).toBeGreaterThanOrEqual(2)
    const parent = cs.find((c) => c.text === "796 F.2d 657") as Record<string, unknown>
    const child = cs.find((c) => c.text === "479 U.S. 1059") as Record<string, unknown>
    expect(parent).toBeDefined()
    expect(child).toBeDefined()
    expect(parent.subsequentHistoryEntries).toBeDefined()
    expect((parent.subsequentHistoryEntries as Array<{ signal: string }>)[0].signal).toBe(
      "cert_denied",
    )
    expect(child.subsequentHistoryOf).toBeDefined()
    expect((child.subsequentHistoryOf as { signal: string }).signal).toBe("cert_denied")
  })

  it("canonical `cert. denied, N U.S. M` still works (regression)", () => {
    const text =
      "Smith v. Jones, 796 F.2d 657 (3d Cir. 1986), cert. denied, 479 U.S. 1059 (1987)"
    const cs = extractCitations(text).filter((c) => c.type === "case")
    const parent = cs.find((c) => c.text === "796 F.2d 657") as Record<string, unknown>
    expect(parent.subsequentHistoryEntries).toBeDefined()
  })
})
