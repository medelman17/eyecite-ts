import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import type { Citation } from "@/types/citation"
import { computeParenDepths } from "@/utils/parenDepths"
import {
  computeInParentheticalOwners,
  PARENTHETICAL_TRIGGER_WORDS,
  triggerAnchoredAsideOwner,
} from "@/utils/parentheticalScope"

// Inputs below have no HTML/Unicode transformations, so clean-text offsets
// equal the raw string offsets and the citation spans index into `text`.
const cites = (t: string) => extractCitations(t) as Citation[]

describe("triggerAnchoredAsideOwner", () => {
  it("returns the citing authority for a trigger-introduced cite (dropped open paren)", () => {
    const text = "Foo v. Goo, 500 U.S. 100 quoting Bar v. Baz, 200 U.S. 50)."
    expect(triggerAnchoredAsideOwner(text, cites(text), 1)).toBe(0)
  })

  it("works for non-case containers (neutral)", () => {
    const text = "Foo, 2020 IL 12345 quoting Bar v. Baz, 100 N.E.3d 200)."
    expect(triggerAnchoredAsideOwner(text, cites(text), 1)).toBe(0)
  })

  it("returns undefined for a normal top-level cite", () => {
    const text = "Foo v. Goo, 500 U.S. 100. Bar v. Baz, 200 U.S. 50."
    expect(triggerAnchoredAsideOwner(text, cites(text), 1)).toBeUndefined()
  })

  it("returns undefined when a sentence terminator separates the trigger from the cite", () => {
    const text = "Foo, 100 U.S. 1, quoting from the record. Bar, 200 U.S. 2."
    expect(triggerAnchoredAsideOwner(text, cites(text), 1)).toBeUndefined()
  })

  it("returns undefined for the first citation", () => {
    const text = "Foo v. Goo, 500 U.S. 100."
    expect(triggerAnchoredAsideOwner(text, cites(text), 0)).toBeUndefined()
  })

  it("exposes a named, shared trigger vocabulary", () => {
    expect(PARENTHETICAL_TRIGGER_WORDS).toContain("quoting")
    expect(PARENTHETICAL_TRIGGER_WORDS).toContain("citing")
  })
})

describe("computeInParentheticalOwners", () => {
  const owners = (t: string, withText = true) => {
    const c = cites(t)
    const depths = computeParenDepths(t, c)
    return computeInParentheticalOwners(c, depths, withText ? t : undefined)
  }

  it("trigger-anchored owner for a dropped opening paren", () => {
    expect(owners("Foo, 2020 IL 12345 quoting Bar v. Baz, 100 N.E.3d 200).")).toEqual([
      undefined,
      0,
    ])
  })

  it("suppresses a dropped-closing-paren leak across a sentence boundary", () => {
    const o = owners("Foo, 2020 IL 12345 (quoting Bar v. Baz, 100 N.E.3d 200. Qux v. Quux, 5 U.S. 5.")
    expect(o[1]).toBe(0) // Bar inside Foo's aside
    expect(o[2]).toBeUndefined() // Qux not leaked past the sentence boundary
  })

  it("keeps parallel-cite siblings inside a balanced aside", () => {
    // Both reporters of the inner parallel cite sit inside Foo's aside.
    const o = owners("Foo, 1 U.S. 1 (quoting Bar v. Baz, 2 U.S. 2, 5 S. Ct. 3).")
    expect(o[1]).toBe(0)
    expect(o[2]).toBe(0)
  })

  it("without text, falls back to the raw depth signal (legacy)", () => {
    expect(owners("Foo, 1 U.S. 1 (quoting Bar v. Baz, 2 U.S. 2).", false)).toEqual([undefined, 0])
  })
})
