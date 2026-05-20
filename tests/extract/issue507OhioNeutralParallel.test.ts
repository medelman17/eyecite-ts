import { describe, expect, it } from "vitest"
import { extractCitations } from "../../src"

/**
 * Issue #507: Ohio neutral parallel chain consumes next parallel's volume.
 *
 * In Ohio Bluebook chains like
 *   `100 Ohio St.3d 152, 2003-Ohio-5372, 797 N.E.2d 71, at ¶ 33`
 * the neutral cite (`2003-Ohio-5372`) was extracting `pincite=797` (the
 * volume of the next parallel) because the pincite lookahead greedily
 * consumed the `, 797` digits. The first parallel (`100 Ohio St.3d 152`)
 * carried `pincite=undefined`.
 *
 * Fix shape:
 *   1. The neutral-cite extractor must NOT consume a parallel-cite reporter's
 *      volume as a pincite. Stop the pincite scan when what follows the digit
 *      sequence is a reporter abbreviation (capital letter + period).
 *   2. (Stretch) Parallel-group pincite inheritance — when one member of a
 *      parallel group carries a trailing pincite, propagate it to earlier
 *      group members.
 *
 * Minimum behavior asserted here: three citations produced; the neutral cite
 * must NOT carry `pincite=797`. Paragraph-pincite inheritance across the full
 * parallel chain is tracked separately if not delivered.
 */
describe("issue #507: Ohio neutral parallel chain pincite", () => {
  it("extracts three citations from the Ohio parallel chain", () => {
    const cites = extractCitations(
      "100 Ohio St.3d 152, 2003-Ohio-5372, 797 N.E.2d 71, at ¶ 33",
    )
    expect(cites.length).toBe(3)
  })

  it("neutral cite (2003-Ohio-5372) does NOT consume the next parallel's volume", () => {
    const cites = extractCitations(
      "100 Ohio St.3d 152, 2003-Ohio-5372, 797 N.E.2d 71, at ¶ 33",
    )
    const neutral = cites.find((c) => c.type === "neutral")
    expect(neutral).toBeDefined()
    if (neutral?.type === "neutral") {
      // The 797 belongs to the next parallel cite's volume, not this cite's pincite.
      expect(neutral.pincite).not.toBe(797)
    }
  })

  it("third parallel (797 N.E.2d 71) carries the ¶ 33 paragraph pincite", () => {
    const cites = extractCitations(
      "100 Ohio St.3d 152, 2003-Ohio-5372, 797 N.E.2d 71, at ¶ 33",
    )
    const ne2d = cites.find(
      (c) => c.type === "case" && c.reporter === "N.E.2d",
    )
    expect(ne2d).toBeDefined()
    if (ne2d?.type === "case") {
      expect(ne2d.pinciteInfo?.paragraph).toBe(33)
    }
  })

  it("neutral cite extracted with correct components", () => {
    const cites = extractCitations(
      "100 Ohio St.3d 152, 2003-Ohio-5372, 797 N.E.2d 71, at ¶ 33",
    )
    const neutral = cites.find((c) => c.type === "neutral")
    expect(neutral).toBeDefined()
    if (neutral?.type === "neutral") {
      expect(neutral.year).toBe(2003)
      expect(neutral.court).toBe("Ohio")
      expect(neutral.documentNumber).toBe("5372")
    }
  })
})
