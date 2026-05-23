import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #702 — Bluebook Rule 1.2(b) `compare A with B` is a paired
 * comparison signal. Previously only A received `signal=compare`;
 * the B citation across the `with` connector had `signal=undefined`.
 * Fixed by a post-process pass that propagates `compare` to the
 * next citation when the gap contains `with`.
 */
describe("Issue #702 - propagate `compare` across `with`", () => {
  it("propagates compare from A to B in `compare A with B`", () => {
    const cs = extractCitations(`Compare Smith, 100 F.2d 1, with Doe, 200 F.3d 5`)
    const cases = cs.filter((c) => c.type === "case")
    expect(cases).toHaveLength(2)
    expect((cases[0] as { signal?: string }).signal).toBe("compare")
    expect((cases[1] as { signal?: string }).signal).toBe("compare")
  })

  it("works without intervening comma before `with`", () => {
    const cs = extractCitations(`Compare Smith, 100 F.2d 1 with Doe, 200 F.3d 5`)
    const cases = cs.filter((c) => c.type === "case")
    expect(cases).toHaveLength(2)
    expect((cases[1] as { signal?: string }).signal).toBe("compare")
  })

  it("does not propagate when first citation has different signal", () => {
    const cs = extractCitations(`See Smith, 100 F.2d 1, with Doe, 200 F.3d 5`)
    const cases = cs.filter((c) => c.type === "case")
    expect((cases[0] as { signal?: string }).signal).toBe("see")
    expect((cases[1] as { signal?: string | undefined }).signal).not.toBe("compare")
  })

  it("does not overwrite explicit signal on following citation", () => {
    const cs = extractCitations(
      `Compare Smith, 100 F.2d 1; see Doe, 200 F.3d 5`,
    )
    const cases = cs.filter((c) => c.type === "case")
    expect((cases[1] as { signal?: string }).signal).toBe("see")
  })

  it("standalone `see` unaffected", () => {
    const cs = extractCitations(`See Smith, 100 F.2d 1`)
    const cases = cs.filter((c) => c.type === "case")
    expect((cases[0] as { signal?: string }).signal).toBe("see")
  })
})
