import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { Citation, FullCaseCitation } from "@/types/citation"

describe("Randolph fixture — all parallel pairs across pincite-between gaps detect", () => {
  // The actual passage from the user's brief (HOA / adverse-possession context).
  // Three logical authorities, each with parallel citations:
  //   - Randolph App. Div. 2005: 374 N.J. Super. 448 + 864 A.2d 1191
  //   - Randolph N.J. 2006 (affirmance): 186 N.J. 78 + 891 A.2d 1202
  //   - Yellen App. Div. 2010: 416 N.J. Super. 113 + 3 A.3d 584
  const text = `The prescriptive period in New Jersey is not twenty years, as was formerly assumed, but thirty years for developed land (or sixty years for woodlands or uncultivated tracts), by analogy to the adverse-possession periods set forth in N.J.S.A. 2A:14-30. Randolph Town Ctr., L.P. v. County of Morris, 374 N.J. Super. 448, 453–55, 864 A.2d 1191 (App. Div. 2005), aff'd in part, 186 N.J. 78, 891 A.2d 1202 (2006); see also Yellen v. Kassin, 416 N.J. Super. 113, 120, 3 A.3d 584 (App. Div. 2010).`

  it("all three parallel pairs detected with correct groupIds", () => {
    const cites = extractCitations(text, { resolve: true })
    const caseCites = cites.filter(
      (c): c is FullCaseCitation => c.type === "case",
    )
    expect(caseCites).toHaveLength(6)

    // Pair 1: Randolph App. Div. 2005
    expect(caseCites[0].text).toContain("374 N.J. Super. 448")
    expect(caseCites[1].text).toContain("864 A.2d 1191")
    expect(caseCites[0].groupId).toBeDefined()
    expect(caseCites[0].groupId).toBe(caseCites[1].groupId)
    expect(caseCites[0].parallelCitations).toEqual([
      { volume: 864, reporter: "A.2d", page: 1191 },
    ])

    // Pair 2: Randolph N.J. 2006 (affirmance)
    expect(caseCites[2].text).toContain("186 N.J. 78")
    expect(caseCites[3].text).toContain("891 A.2d 1202")
    expect(caseCites[2].groupId).toBeDefined()
    expect(caseCites[2].groupId).toBe(caseCites[3].groupId)
    expect(caseCites[2].parallelCitations).toEqual([
      { volume: 891, reporter: "A.2d", page: 1202 },
    ])

    // Pair 3: Yellen App. Div. 2010
    expect(caseCites[4].text).toContain("416 N.J. Super. 113")
    expect(caseCites[5].text).toContain("3 A.3d 584")
    expect(caseCites[4].groupId).toBeDefined()
    expect(caseCites[4].groupId).toBe(caseCites[5].groupId)
    expect(caseCites[4].parallelCitations).toEqual([
      { volume: 3, reporter: "A.3d", page: 584 },
    ])

    // Three logical authorities → three distinct groupIds
    const distinctGroupIds = new Set([
      caseCites[0].groupId,
      caseCites[2].groupId,
      caseCites[4].groupId,
    ])
    expect(distinctGroupIds.size).toBe(3)
  })

  it("string-cite anomaly auto-resolves — Randolph affirmance secondary does not share sc group with Yellen primary", () => {
    // Pre-fix: 891 A.2d 1202 (Randolph affirmance secondary, currently extracted
    // as a standalone primary because parallel detection fails) shared a
    // stringCitationGroupId with 416 N.J. Super. 113 (Yellen primary across `;`).
    // Post-fix: 891 A.2d 1202 is now a parallel secondary, no longer a
    // string-cite primary candidate; the walker pairs the correct primaries
    // across the `;` separator (or leaves them ungrouped — exact behavior
    // depends on detectStringCites's logic, but the cross-authority pairing
    // must NOT persist).
    const cites = extractCitations(text, { resolve: true })
    const caseCites = cites.filter(
      (c): c is FullCaseCitation => c.type === "case",
    )

    const randolphAffirmanceSecondary = caseCites[3] // 891 A.2d 1202
    const yellenPrimary = caseCites[4] // 416 N.J. Super. 113

    // The affirmance secondary and the Yellen primary should NOT share a
    // stringCitationGroupId after the fix.
    expect(
      randolphAffirmanceSecondary.stringCitationGroupId !== undefined &&
        randolphAffirmanceSecondary.stringCitationGroupId ===
          yellenPrimary.stringCitationGroupId,
    ).toBe(false)
  })
})
