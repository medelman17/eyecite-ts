import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { Citation } from "@/types/citation"

// #884: parallel reporters trailing a short-form (or any no-trailing-paren chain)
// were orphaned from the case. Root cause: the parallel chain-continuation gate
// was checked per-link, so an intermediate cite in a no-paren chain broke the
// chain and the head orphaned. Fix: validate the run by its LAST member, so
// no-paren chains of 3+ cites group; the short-form/head becomes the anchor and
// trailing parallels inherit its antecedent resolution.

const run = (text: string): Citation[] => extractCitations(text, { resolve: true })
const find = (cs: Citation[], m: string) => {
  const c = cs.find((x) => x.matchedText.includes(m))
  if (!c) throw new Error(`no citation matching ${m}`)
  return c
}
// parallelGroup / resolution are additive fields not on the base union; read loosely.
const members = (c: Citation): string[] | undefined =>
  (c as { parallelGroup?: { memberIds?: string[] } }).parallelGroup?.memberIds
const resolvedTo = (c: Citation): string | undefined => c.resolution?.resolvedToId

describe("#884 parallel reporters after a short-form / no-paren chain", () => {
  it("groups a FULL-cite lead's parallels even without a trailing year-paren", () => {
    const cs = run("Smith v. Jones, 79 N.Y.2d 540, 583 N.Y.S.2d 957, 593 N.E.2d 1365.")
    const head = find(cs, "79 N.Y.2d 540")
    const p1 = find(cs, "583 N.Y.S.2d 957")
    const p2 = find(cs, "593 N.E.2d 1365")
    expect(members(head)).toEqual(expect.arrayContaining([head.id, p1.id, p2.id]))
    expect(members(p1)).toEqual(members(head))
    expect(members(p2)).toEqual(members(head))
  })

  it("groups trailing parallels with a SHORT-FORM lead and resolves them to the antecedent", () => {
    const cs = run(
      "Smith v. Jones, 79 N.Y.2d 540 (1992). We reaffirmed in Smith, 79 N.Y.2d at 552, 583 N.Y.S.2d 957, 593 N.E.2d 1365.",
    )
    const antecedent = find(cs, "79 N.Y.2d 540")
    const shortForm = cs.find((c) => c.type === "shortFormCase")
    if (!shortForm) throw new Error("no short form")
    const p1 = find(cs, "583 N.Y.S.2d 957")
    const p2 = find(cs, "593 N.E.2d 1365")
    // one group anchored on the short form
    expect(members(shortForm)).toEqual(expect.arrayContaining([shortForm.id, p1.id, p2.id]))
    expect(members(p1)).toContain(shortForm.id)
    // trailing parallels are the same case as the short form's antecedent
    expect(resolvedTo(p1)).toBe(antecedent.id)
    expect(resolvedTo(p2)).toBe(antecedent.id)
  })

  it("groups a SHORT-FORM lead with no antecedent (grouped, no resolution)", () => {
    const cs = run("See Smith, 79 N.Y.2d at 552, 583 N.Y.S.2d 957, 593 N.E.2d 1365.")
    const shortForm = cs.find((c) => c.type === "shortFormCase")
    if (!shortForm) throw new Error("no short form")
    const p1 = find(cs, "583 N.Y.S.2d 957")
    const p2 = find(cs, "593 N.E.2d 1365")
    expect(members(shortForm)).toEqual(expect.arrayContaining([shortForm.id, p1.id, p2.id]))
    // No antecedent exists, so nothing resolves — propagation must not invent one.
    expect(resolvedTo(p1)).toBeUndefined()
    expect(resolvedTo(p2)).toBeUndefined()
  })

  it("control: full-cite lead WITH a trailing paren still groups all three", () => {
    const cs = run("Smith v. Jones, 79 N.Y.2d 540, 583 N.Y.S.2d 957, 593 N.E.2d 1365 (1992).")
    const head = find(cs, "79 N.Y.2d 540")
    expect(members(head)?.length).toBe(3)
  })

  it("does NOT absorb a second short-form (different case) into the first's group", () => {
    // A second party-named short-form starts a NEW reference, not a parallel of
    // the first. The Smith reference must stay separate and resolve to its OWN
    // antecedent (Smith), never to Doe — a parallel group has one anchor.
    const cs = run(
      "Smith v. Jones, 79 N.Y.2d 540 (1992). Doe v. Roe, 100 F.3d 5 (1995). See Doe, 100 F.3d at 7, 583 N.Y.S.2d 957, Smith, 79 N.Y.2d at 552.",
    )
    const smithFull = find(cs, "79 N.Y.2d 540")
    const doeFull = find(cs, "100 F.3d 5")
    const doeShort = cs.find((c) => c.type === "shortFormCase" && c.matchedText.includes("Doe"))
    const smithShort = cs.find(
      (c) => c.type === "shortFormCase" && c.matchedText.includes("Smith, 79"),
    )
    if (!doeShort || !smithShort) throw new Error("missing short forms")
    // The Smith short-form resolves to the Smith full cite, never to Doe.
    expect(resolvedTo(smithShort)).toBe(smithFull.id)
    expect(resolvedTo(smithShort)).not.toBe(doeFull.id)
    // ...and is not pulled into Doe's parallel group.
    expect(members(doeShort) ?? []).not.toContain(smithShort.id)
    // The intervening bare cite must never inherit the WRONG case (Doe); the
    // ambiguous cross-case run is rejected rather than mis-grouped (#884 review).
    const between = find(cs, "583 N.Y.S.2d 957")
    expect(resolvedTo(between)).not.toBe(doeFull.id)
  })
})
