/**
 * Issue #528 — Long explanatory parens (>~480 chars) overflow the scanner's
 * 500-char `maxLookahead`, dropping both the long paren AND any history
 * clause that follows it.
 *
 * The `collectParentheticals(text, startPos, maxLookahead = 500)` scanner
 * caps its forward walk at 500 chars. When a citation has an explanatory
 * paren close to that limit, the matching close paren falls outside the
 * window — the scanner sees the OPENING `(` of the explanatory paren but
 * never finds its closing `)`, so the paren is dropped. Any `cert. denied,
 * ...`/`aff'd, ...` clause that follows the explanatory paren is also
 * dropped because the scanner walks linearly past the end of the truncated
 * paren and gives up.
 *
 * Bluebook explanatory parentheticals routinely run hundreds of characters
 * in modern caselaw. A 480-char threshold drops the trailing history
 * clause silently, which can change the citation graph.
 */
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"
import type { CaseCitation, Citation } from "@/types/citation"

const caseCites = (text: string): CaseCitation[] =>
  (extractCitations(text) as Citation[]).filter(
    (c): c is CaseCitation => c.type === "case",
  )

const longHolding = (charCount: number): string => {
  // Build a realistic long holding paren of roughly the requested length.
  const base = "holding that the question presented is a question of statutory interpretation and that the statute in question must be construed to give effect to congressional intent as reflected in the plain language of the text and its surrounding context; "
  let acc = base
  while (acc.length < charCount) acc += base
  return acc.slice(0, charCount).trim()
}

describe("issue #528 — long explanatory parens overflow maxLookahead", () => {
  it("explanatory paren of ~560 chars is captured (not dropped)", () => {
    const holding = longHolding(560)
    expect(holding.length).toBeGreaterThan(500)
    const text = `Smith v. Jones, 543 U.S. 1098 (2005) (${holding})`
    const cites = caseCites(text)
    expect(cites).toHaveLength(1)
    expect(cites[0].parentheticals?.length ?? 0).toBeGreaterThanOrEqual(1)
    const holdingParen = cites[0].parentheticals?.find((p) => p.type === "holding")
    expect(holdingParen).toBeDefined()
  })

  it("history clause AFTER a 560-char explanatory paren survives", () => {
    const holding = longHolding(560)
    const text = `Smith v. Jones, 543 U.S. 1098 (2005) (${holding}), cert. denied, 547 U.S. 1, 126 S.Ct. 1344 (2006)`
    const cites = caseCites(text)
    const primary = cites.find((c) => c.matchedText === "543 U.S. 1098")
    expect(primary).toBeDefined()
    if (!primary) return
    // The `cert. denied` signal must reach the parent's history entries.
    expect(primary.subsequentHistoryEntries?.map((e) => e.signal)).toContain(
      "cert_denied",
    )
    // The cert-denied child cite must be wired back to primary.
    const certDeniedChild = cites.find((c) => c.matchedText === "547 U.S. 1")
    expect(certDeniedChild?.subsequentHistoryOf).toBeDefined()
    expect(certDeniedChild?.subsequentHistoryOf?.signal).toBe("cert_denied")
  })

  it("history clause AFTER a 1500-char explanatory paren still survives", () => {
    const holding = longHolding(1500)
    const text = `Smith v. Jones, 543 U.S. 1098 (2005) (${holding}), cert. denied, 547 U.S. 1, 126 S.Ct. 1344 (2006)`
    const cites = caseCites(text)
    const primary = cites.find((c) => c.matchedText === "543 U.S. 1098")
    if (!primary) return
    expect(primary.subsequentHistoryEntries?.map((e) => e.signal)).toContain(
      "cert_denied",
    )
  })

  it("regression: short explanatory paren still works", () => {
    // Sanity check that bumping maxLookahead doesn't break the common case.
    const text = "Smith v. Jones, 500 F.2d 123 (2020) (holding X), aff'd, 501 U.S. 1 (2021)"
    const cites = caseCites(text)
    const primary = cites.find((c) => c.matchedText === "500 F.2d 123")
    if (!primary) return
    expect(primary.parentheticals?.[0]?.type).toBe("holding")
    expect(primary.subsequentHistoryEntries?.map((e) => e.signal)).toContain(
      "affirmed",
    )
  })
})
