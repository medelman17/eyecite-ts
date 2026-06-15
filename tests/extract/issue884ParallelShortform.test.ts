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
  })

  it("control: full-cite lead WITH a trailing paren still groups all three", () => {
    const cs = run("Smith v. Jones, 79 N.Y.2d 540, 583 N.Y.S.2d 957, 593 N.E.2d 1365 (1992).")
    const head = find(cs, "79 N.Y.2d 540")
    expect(members(head)?.length).toBe(3)
  })
})
