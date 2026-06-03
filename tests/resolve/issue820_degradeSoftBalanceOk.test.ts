/**
 * Issue #820: degrade the depth-based parenthetical-child exclusion to *soft*
 * when the antecedent's clause has a bracket-balance failure (#809 `balanceOk`).
 *
 * A candidate that looks nested only because of a (possibly desynced) bracket
 * depth, in a clause whose brackets did not balance, is an untrustworthy
 * exclusion. `resolveId` previously hard-dropped it and silently resolved to a
 * farther cite at confidence 1.0. Now it keeps the candidate but caps confidence
 * and warns, so `idConfidenceFloor` (#800) can abstain. Where balance is clean,
 * the exclusion stays hard. Wires the #809 `balanceOk` signal per #810/#817.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import type { ResolvedCitation } from "@/resolve/types"

// Smith (idx 1) reads depth=1, balanceOk=false: a `) (` desync makes it look
// nested, but the failed balance means that "nested" verdict is untrustworthy.
const UNTRUSTED = "Foo v. Goo, 1 U.S. 1 ) ( Smith v. Jones, 2 U.S. 2. Id. at 5."
// Balanced `(quoting …)`: Smith is a genuine, trustworthy aside (balanceOk=true).
const BALANCED = "Foo v. Goo, 1 U.S. 1 (quoting Smith v. Jones, 2 U.S. 2). Id. at 5."

const idResolution = (text: string, idConfidenceFloor?: number) =>
  (
    extractCitations(text, {
      resolve: true,
      resolutionOptions: idConfidenceFloor === undefined ? undefined : { idConfidenceFloor },
    }) as ResolvedCitation[]
  ).find((c) => c.type === "id")?.resolution

describe("Issue #820: degrade-to-soft on balanceOk failure (Id. path)", () => {
  it("keeps the untrusted-depth antecedent but caps confidence and warns", () => {
    // Pre-fix: silently resolved to Foo (0) at confidence 1.0, no warning.
    const r = idResolution(UNTRUSTED)
    expect(r?.resolvedTo).toBe(1) // Smith — no longer hard-dropped
    expect(r?.confidence).toBeLessThanOrEqual(0.5)
    expect(r?.warnings?.some((w) => /balance|scope|#820/i.test(w))).toBe(true)
  })

  it("idConfidenceFloor above the soft cap abstains", () => {
    const r = idResolution(UNTRUSTED, 0.7)
    expect(r?.resolvedTo).toBeUndefined()
    expect(r?.failureReason).toMatch(/idConfidenceFloor/)
  })

  it("(regression) a balanced aside stays a hard exclusion at full confidence", () => {
    const r = idResolution(BALANCED)
    expect(r?.resolvedTo).toBe(0) // Foo — Smith hard-excluded as before
    expect(r?.confidence).toBe(1)
    expect(r?.warnings ?? []).toHaveLength(0)
  })
})
