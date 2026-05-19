import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { IdCitation } from "@/types/citation"

describe("quote-zone robustness — orphan ASCII quotes", () => {
  it("orphan leading close-quote (mid-doc paste) does not create phantom zone", () => {
    // The leading `use."` is a mid-document orphan close. Without the fix,
    // the existing greedy pairing turns it into a phantom open and engulfs
    // Smith into a quote zone, which then rejects Smith as Id.'s antecedent.
    const text = `use." Smith v. Jones, 100 F.2d 50, 55 (1990). Id.`
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c): c is IdCitation => c.type === "id")
    expect(id?.resolution?.resolvedTo).toBeDefined()
    // Resolved to Smith (idx 0).
    const resolvedTo = id?.resolution?.resolvedTo
    if (resolvedTo !== undefined) {
      expect(cites[resolvedTo].type).toBe("case")
    }
  })

  it("orphan trailing open-quote does not create phantom zone", () => {
    // Trailing orphan open at end-of-text.
    const text = `Smith v. Jones, 100 F.2d 50, 55 (1990). Id. "and so on`
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c): c is IdCitation => c.type === "id")
    expect(id?.resolution?.resolvedTo).toBeDefined()
  })

  it("two mispaired orphans (close then open) do not engulf intermediate citation", () => {
    // Reproduces the actual greedy-pairing bug: an orphan close-quote (after
    // `use`) followed by an orphan open-quote (before `and`) gets greedily
    // paired into a phantom zone {4..47}. Smith (originalStart=22) lands in
    // that zone; Id. lands after it. With the old code Id. is rejected from
    // resolving to Smith because their zones differ. With the classifier the
    // first `"` is classified as a close (prev=`use`/letter, next=space),
    // the second as an open (prev=space, next=letter) — both have empty
    // stacks, so no phantom zone is created.
    const text = `use." Smith v. Jones, 100 F.2d 50, 55 (1990). "and so on. Id.`
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c): c is IdCitation => c.type === "id")
    expect(id?.resolution?.resolvedTo).toBeDefined()
    const resolvedTo = id?.resolution?.resolvedTo
    if (resolvedTo !== undefined) {
      expect(cites[resolvedTo].type).toBe("case")
    }
  })
})

describe("quote-zone robustness — ASCII and typographic don't cross-pair", () => {
  it("ASCII open with typographic close does not engulf intermediate citation", () => {
    // Mixed-style quotes (one ASCII open, one typographic close) should
    // NOT pair across styles — otherwise the phantom zone engulfs Smith
    // and breaks Id. resolution.
    const text = `He said "the rule applies. Smith v. Jones, 100 F.2d 50, 55 (1990). Was clear.” Id.`
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c): c is IdCitation => c.type === "id")
    expect(id?.resolution?.resolvedTo).toBeDefined()
  })
})

describe("quote-zone robustness — typographic quotes unambiguous", () => {
  it("curly quotes pair unambiguously even with adjacent orphan ASCII quote", () => {
    // Mix: curly quotes around the actual quoted text, plus an orphan ASCII
    // quote elsewhere. The curly pair should always be a zone; the ASCII
    // orphan should be ignored.
    const text = `He said "the rule is clear." use." Smith v. Jones, 100 F.2d 50, 55 (1990). Id.`
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c): c is IdCitation => c.type === "id")
    expect(id?.resolution?.resolvedTo).toBeDefined()
  })
})

describe("quote-zone robustness — well-formed ASCII still works", () => {
  it("standard balanced ASCII quotes around a quoted passage do not break resolution", () => {
    const text = `Smith v. Jones, 100 F.2d 50, 55 (1990). The court held "the rule applies." Id.`
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c): c is IdCitation => c.type === "id")
    expect(id?.resolution?.resolvedTo).toBeDefined()
  })

  it("apostrophes (single quotes) do not affect double-quote pairing", () => {
    const text = `Smith's case, 100 F.2d 50, 55 (1990). The court said "it's the rule." Id.`
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c): c is IdCitation => c.type === "id")
    expect(id?.resolution?.resolvedTo).toBeDefined()
  })
})
