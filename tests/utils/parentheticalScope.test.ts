import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import type { Citation } from "@/types/citation"
import { PARENTHETICAL_TRIGGER_WORDS, triggerAnchoredAsideOwner } from "@/utils/parentheticalScope"

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
