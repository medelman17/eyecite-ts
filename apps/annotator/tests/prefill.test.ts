// apps/annotator/tests/prefill.test.ts
import { describe, expect, it } from "vitest"
import type { Backref, Candidate, ContractCitation } from "../src/contract.js"
import { buildDocumentPayload } from "../src/prefill.js"

const meta = { id: "d1", source: "native" as const, court: null, year: null }

describe("buildDocumentPayload", () => {
  it("emits one citation per extraction with stable ids and kinds", () => {
    const p = buildDocumentPayload("Smith v. Jones, 100 F.2d 1 (1990). Id. at 5.", meta)
    expect(p.citations.map((c: ContractCitation) => c.kind)).toEqual(["full", "id"])
    expect(p.citations[0].id).toBe("c0")
    expect(p.citations[1].id).toBe("c1")
  })

  it("an Id. backref carries the engine guess + confidence and ranks it first", () => {
    const p = buildDocumentPayload("Smith v. Jones, 100 F.2d 1 (1990). Id. at 5.", meta)
    const b = p.backrefs.find((x: Backref) => x.kind === "id")!
    expect(b.engineGuess).toBe("c0")
    expect(b.engineConfidence).toBe(1)
    expect(b.candidates[0]).toMatchObject({ citationId: "c0", rank: 0 })
  })

  it("candidates are the PRIOR full cites, guess-first then reverse document order", () => {
    const p = buildDocumentPayload(
      "Smith v. Jones, 100 F.2d 1. Doe v. Roe, 200 F.3d 2. Id. at 5.",
      meta,
    )
    const b = p.backrefs.find((x: Backref) => x.kind === "id")!
    // guess = most-recent (Doe, c1); both priors are candidates; the buried-cite test covers asides
    expect(b.engineGuess).toBe("c1")
    expect(b.candidates.map((c: Candidate) => c.citationId)).toEqual(["c1", "c0"])
    expect(b.candidates.every((c: Candidate) => !c.isBuriedAside)).toBe(true)
  })

  it("flags a candidate buried in another cite's parenthetical via fullSpan containment", () => {
    // Bar v. Baz is inside Foo's (quoting …) → buried aside.
    const p = buildDocumentPayload(
      "Foo v. Goo, 500 U.S. 100 (quoting Bar v. Baz, 200 U.S. 50). Id.",
      meta,
    )
    const bar = p.citations.find((c: ContractCitation) => c.displayText.includes("200 U.S. 50"))!
    const b = p.backrefs.find((x: Backref) => x.kind === "id")!
    const barCand = b.candidates.find((c: Candidate) => c.citationId === bar.id)!
    expect(barCand.isBuriedAside).toBe(true)
  })

  it("records an abstain (engineGuess null) when the resolver does not resolve", () => {
    const p = buildDocumentPayload("Id. at 5.", meta) // nothing precedes it
    const b = p.backrefs.find((x: Backref) => x.kind === "id")!
    expect(b.engineGuess).toBeNull()
    expect(b.candidates).toEqual([])
  })
})
