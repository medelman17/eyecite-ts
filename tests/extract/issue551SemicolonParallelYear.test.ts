/**
 * #551 — Parallel-cite year not propagated in semicolon-separated parallels.
 *
 *   People v Bobo, 390 Mich 355, 359; 212 NW2d 190 (1973)
 *
 * Michigan (and a handful of other states) separate parallel cites with
 * `;` instead of `,`. Before this fix:
 *   - `detectParallelCitations` rejected the gap because the segment list
 *     splitter only accepted comma-separated pincite chains, not
 *     `, PINCITE;`. So no parallel group was formed.
 *   - The post-chain bridge in `extractCase` only stepped over
 *     `[\s,\d\-–—]` characters, so even if the group existed the trailing
 *     year paren `(1973)` would have been unreachable from the Mich cite.
 *
 * Net effect: `390 Mich 355` got `year=undefined`, while `212 NW2d 190`
 * (which sits right next to the trailing paren) got `year=1973`. This was
 * the highest-volume year bug in the corpus — 40/48 of the missed-year
 * cases observed.
 *
 * The fix is two-part:
 *   1. `detectParallelCitations`: accept `;` (with optional pincite) as
 *      an alternate separator.
 *   2. `extractCase` CHAIN_BRIDGE_REGEX: accept `;` so the post-chain
 *      year-paren scan reaches across the semicolon.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"
import type { CaseCitation } from "@/types/citation"

describe("#551 semicolon-separated parallel year propagation", () => {
  it("`390 Mich 355, 359; 212 NW2d 190 (1973)` — both members get year 1973", () => {
    const cites = extractCitations(
      "People v Bobo, 390 Mich 355, 359; 212 NW2d 190 (1973)",
    ) as CaseCitation[]
    expect(cites).toHaveLength(2)
    expect(cites[0]?.reporter).toBe("Mich")
    expect(cites[0]?.year).toBe(1973)
    expect(cites[1]?.reporter).toBe("NW2d")
    expect(cites[1]?.year).toBe(1973)
  })

  it("groups Mich and NW2d into the same parallel group", () => {
    const cites = extractCitations(
      "People v Bobo, 390 Mich 355, 359; 212 NW2d 190 (1973)",
    ) as CaseCitation[]
    // The primary's groupId is shared with its secondaries.
    expect(cites[0]?.groupId).toBeDefined()
    expect(cites[1]?.groupId).toBeDefined()
    expect(cites[0]?.groupId).toBe(cites[1]?.groupId)
  })

  it("tight semicolon `390 Mich 355; 212 NW2d 190 (1973)` (no pincite) works", () => {
    const cites = extractCitations(
      "People v Bobo, 390 Mich 355; 212 NW2d 190 (1973)",
    ) as CaseCitation[]
    expect(cites).toHaveLength(2)
    expect(cites[0]?.year).toBe(1973)
    expect(cites[1]?.year).toBe(1973)
  })

  it("3-cite chain with semicolons `390 Mich 355, 359; 212 NW2d 190; 35 L. Ed. 2d 147 (1973)`", () => {
    const cites = extractCitations(
      "People v Bobo, 390 Mich 355, 359; 212 NW2d 190; 35 L. Ed. 2d 147 (1973)",
    ) as CaseCitation[]
    expect(cites).toHaveLength(3)
    for (const c of cites) {
      expect(c.year).toBe(1973)
    }
  })

  it("comma-separated form still propagates (regression)", () => {
    const cites = extractCitations(
      "Roe v. Wade, 410 U.S. 113, 93 S. Ct. 705, 35 L. Ed. 2d 147 (1973)",
    ) as CaseCitation[]
    expect(cites).toHaveLength(3)
    for (const c of cites) {
      expect(c.year).toBe(1973)
    }
  })

  it("string-cite (`; ` separating distinct cases) still produces independent cites", () => {
    // `A (1970); B (1971)` — DIFFERENT cases, each with its OWN paren.
    // These must NOT be grouped together. A semicolon followed by a cite
    // with its own paren is a string-cite, not a parallel.
    const cites = extractCitations(
      "See Foo v. Bar, 410 U.S. 113 (1973); Baz v. Qux, 412 U.S. 200 (1974)",
    ) as CaseCitation[]
    expect(cites).toHaveLength(2)
    expect(cites[0]?.year).toBe(1973)
    expect(cites[1]?.year).toBe(1974)
    // Each cite has its own paren — neither is treated as a parallel
    // secondary, so neither acquires a groupId from the other.
    if (cites[0]?.groupId !== undefined && cites[1]?.groupId !== undefined) {
      expect(cites[0].groupId).not.toBe(cites[1].groupId)
    }
  })
})
