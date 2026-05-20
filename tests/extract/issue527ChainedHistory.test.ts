/**
 * Issue #527 — Chained subsequent history on a history-child citation is lost.
 *
 * Repro: `Foo v. Bar, 1 U.S. 1, 5 (1990), aff'd, 543 U.S. 1098, 125 S.Ct. 992 (2005), cert. denied, 547 U.S. 1099, 126 S.Ct. 1344 (2006)`
 *
 *   Before fix:
 *     `1 U.S. 1`:
 *       subsequentHistoryEntries: [aff'd, cert. denied]   ← both signals
 *                                                            collapsed onto
 *                                                            the chain root
 *     `543 U.S. 1098`:
 *       subsequentHistoryOf: {index: 0 (= 1 U.S. 1), signal: aff'd}
 *       subsequentHistoryEntries: undefined               ← MISSING — the
 *                                                            cert. denied of
 *                                                            this child is
 *                                                            dropped from it
 *     `547 U.S. 1099`:
 *       subsequentHistoryOf: {index: 0 (= 1 U.S. 1), signal: cert_denied}
 *                                                          ← WRONG PARENT.
 *                                                            cert. denied
 *                                                            belongs to
 *                                                            `543 U.S. 1098`,
 *                                                            not `1 U.S. 1`.
 *
 *   After fix:
 *     `1 U.S. 1`:
 *       subsequentHistoryEntries: [aff'd]                  ← only its own
 *     `543 U.S. 1098`:
 *       subsequentHistoryOf: {index: 0, signal: aff'd}
 *       subsequentHistoryEntries: [cert. denied]           ← chained child
 *     `547 U.S. 1099`:
 *       subsequentHistoryOf: {index: 1 (= 543 U.S. 1098), signal: cert_denied}
 *
 * Same shape applies to `overruled ..., cert. denied, ...` and any other
 * multi-link history chain.
 */
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"
import type { CaseCitation, Citation } from "@/types/citation"

const caseCites = (text: string): CaseCitation[] =>
  (extractCitations(text) as Citation[]).filter(
    (c): c is CaseCitation => c.type === "case",
  )

const findByMatched = (cites: CaseCitation[], text: string): CaseCitation | undefined =>
  cites.find((c) => c.matchedText === text)

describe("issue #527 — chained subsequent history on a history-child citation", () => {
  it("`aff'd, ..., cert. denied, ...` chain attaches cert. denied to the affirming cite", () => {
    const text =
      "Foo v. Bar, 1 U.S. 1, 5 (1990), aff'd, 543 U.S. 1098, 125 S.Ct. 992 (2005), cert. denied, 547 U.S. 1099, 126 S.Ct. 1344 (2006)"
    const cites = caseCites(text)
    const root = findByMatched(cites, "1 U.S. 1")
    const affirmed = findByMatched(cites, "543 U.S. 1098")
    const certDenied = findByMatched(cites, "547 U.S. 1099")
    expect(root).toBeDefined()
    expect(affirmed).toBeDefined()
    expect(certDenied).toBeDefined()
    if (!root || !affirmed || !certDenied) return

    // The cert. denied entry should land on the AFFIRMING cite, not the root.
    expect(affirmed.subsequentHistoryEntries?.map((e) => e.signal)).toContain(
      "cert_denied",
    )
    // The root's history entries should only include its own direct child,
    // not the second-tier cert. denial.
    expect(root.subsequentHistoryEntries?.map((e) => e.signal)).not.toContain(
      "cert_denied",
    )

    // The cert-denied cite's back-pointer should point at the AFFIRMING cite,
    // not the original root.
    const cites2 = cites
    const affirmedIdx = cites2.indexOf(affirmed)
    expect(certDenied.subsequentHistoryOf?.index).toBe(affirmedIdx)
    expect(certDenied.subsequentHistoryOf?.signal).toBe("cert_denied")
  })

  it("`overruled on other grounds by ..., cert. denied, ...` chain (issue exact repro)", () => {
    const text =
      "Estate v. Smith, 100 U.S. 1, 5 (2000), overruled on other grounds by Badilla v. United States, 543 U.S. 1098, 125 S.Ct. 992, 160 L.Ed.2d 1010 (2005), cert. denied, 547 U.S. 1099, 126 S.Ct. 1344, 164 L.Ed.2d 58 (2005)"
    const cites = caseCites(text)
    const root = findByMatched(cites, "100 U.S. 1")
    const overruling = findByMatched(cites, "543 U.S. 1098")
    const certDenied = findByMatched(cites, "547 U.S. 1099")
    expect(root).toBeDefined()
    expect(overruling).toBeDefined()
    expect(certDenied).toBeDefined()
    if (!root || !overruling || !certDenied) return

    // The cert. denied entry should land on the OVERRULING cite, not the root.
    expect(overruling.subsequentHistoryEntries?.map((e) => e.signal)).toContain(
      "cert_denied",
    )
    // The root's entries should not include cert_denied.
    expect(root.subsequentHistoryEntries?.map((e) => e.signal)).not.toContain(
      "cert_denied",
    )
    // Back-pointer: cert. denied → overruling, not root.
    const overrulingIdx = cites.indexOf(overruling)
    expect(certDenied.subsequentHistoryOf?.index).toBe(overrulingIdx)
  })

  it("two-link chain: original `aff'd` link still wired correctly", () => {
    const text =
      "Foo v. Bar, 1 U.S. 1, 5 (1990), aff'd, 543 U.S. 1098, 125 S.Ct. 992 (2005), cert. denied, 547 U.S. 1099, 126 S.Ct. 1344 (2006)"
    const cites = caseCites(text)
    const root = findByMatched(cites, "1 U.S. 1")
    const affirmed = findByMatched(cites, "543 U.S. 1098")
    if (!root || !affirmed) return

    // First link wiring: affirmed cite back-points at root with signal=affirmed
    const rootIdx = cites.indexOf(root)
    expect(affirmed.subsequentHistoryOf?.index).toBe(rootIdx)
    expect(affirmed.subsequentHistoryOf?.signal).toBe("affirmed")
    // Root has affirmed in its entries (regardless of how many entries total)
    expect(root.subsequentHistoryEntries?.map((e) => e.signal)).toContain(
      "affirmed",
    )
  })

  it("single-link chain (no chained child) — no regression", () => {
    // Sanity check: a plain `aff'd, ...` with no further history must still
    // wire the way it always has.
    const text = "Foo v. Bar, 1 U.S. 1, 5 (1990), aff'd, 543 U.S. 1098 (2005)"
    const cites = caseCites(text)
    const root = findByMatched(cites, "1 U.S. 1")
    const affirmed = findByMatched(cites, "543 U.S. 1098")
    if (!root || !affirmed) return

    const rootIdx = cites.indexOf(root)
    expect(affirmed.subsequentHistoryOf?.index).toBe(rootIdx)
    expect(affirmed.subsequentHistoryOf?.signal).toBe("affirmed")
    expect(root.subsequentHistoryEntries?.map((e) => e.signal)).toEqual([
      "affirmed",
    ])
    // No second-tier history → no extra entries on the child.
    expect(affirmed.subsequentHistoryEntries).toBeUndefined()
  })
})
