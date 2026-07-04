import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"
import type { ResolvedCitation } from "@/resolve/types"
import type {
  FullCaseCitation,
  IdCitation,
  ShortFormCaseCitation,
  SupraCitation,
} from "@/types/citation"

const ID_QUOTING =
  "Smith v. Jones, 200 F.3d 100 (2d Cir. 2000). Id. at 110 (quoting Doe v. City, 100 F.2d 1)."

describe("short-form parentheticalNode (#869)", () => {
  it("builds a structured parentheticalNode on Id. with the nested citation as a child (default additive)", () => {
    const citations = extractCitations(ID_QUOTING)

    const id = citations.find((c) => c.type === "id") as IdCitation
    expect(id).toBeDefined()

    // Flat string retained (additive).
    expect(id.parenthetical).toBe("quoting Doe v. City, 100 F.2d 1")

    // Structured node added, classified, carrying the nested child.
    expect(id.parentheticalNode?.type).toBe("quoting")
    expect(id.parentheticalNode?.text).toBe("quoting Doe v. City, 100 F.2d 1")
    expect(id.parentheticalNode?.citations).toHaveLength(1)

    const child = id.parentheticalNode?.citations?.[0] as FullCaseCitation
    expect(child.caseName).toBe("Doe v. City")
    expect(child.reporter).toBe("F.2d")
    expect(child.id).toBeDefined()

    // Default is additive: Doe is also still a top-level result.
    expect(
      citations.some(
        (c) => c.type === "case" && (c as FullCaseCitation).caseName === "Doe v. City",
      ),
    ).toBe(true)
  })

  it("under { excludeParentheticalChildren: true }, the child leaves the top level", () => {
    const citations = extractCitations(ID_QUOTING, { excludeParentheticalChildren: true })
    expect(
      citations.some(
        (c) => c.type === "case" && (c as FullCaseCitation).caseName === "Doe v. City",
      ),
    ).toBe(false)
    const id = citations.find((c) => c.type === "id") as IdCitation
    expect((id.parentheticalNode?.citations?.[0] as FullCaseCitation)?.caseName).toBe("Doe v. City")
  })

  it("builds a parentheticalNode on a supra citation", () => {
    const text =
      "Smith v. Jones, 200 F.3d 100 (2d Cir. 2000). Smith, supra, at 5 (quoting Doe v. City, 100 F.2d 1)."
    const supra = extractCitations(text).find((c) => c.type === "supra") as SupraCitation
    expect(supra?.parentheticalNode?.type).toBe("quoting")
    expect((supra?.parentheticalNode?.citations?.[0] as FullCaseCitation)?.caseName).toBe(
      "Doe v. City",
    )
  })

  it("builds a parentheticalNode on a short-form case citation", () => {
    const text =
      "Smith v. Jones, 200 F.3d 100 (2d Cir. 2000). Smith, 200 F.3d at 105 (quoting Doe v. City, 100 F.2d 1)."
    const sf = extractCitations(text).find((c) => c.type === "shortFormCase") as ShortFormCaseCitation
    expect(sf?.parentheticalNode?.type).toBe("quoting")
    expect((sf?.parentheticalNode?.citations?.[0] as FullCaseCitation)?.caseName).toBe("Doe v. City")
  })

  it("builds a node without citations for a non-citation parenthetical", () => {
    const text = "Smith v. Jones, 200 F.3d 100 (2d Cir. 2000). Id. at 5 (citation omitted)."
    const id = extractCitations(text).find((c) => c.type === "id") as IdCitation
    expect(id.parenthetical).toBe("citation omitted") // flat string retained
    expect(id.parentheticalNode?.text).toBe("citation omitted")
    expect(id.parentheticalNode?.type).toBe("other")
    expect(id.parentheticalNode?.citations).toBeUndefined()
  })

  it("does not disturb short-form resolution: Id. still resolves to its antecedent", () => {
    const citations = extractCitations(ID_QUOTING, { resolve: true }) as ResolvedCitation[]
    const id = citations.find((c) => c.type === "id")
    const smith = citations.find(
      (c) => c.type === "case" && (c as FullCaseCitation).caseName === "Smith v. Jones",
    )
    // Rule 4.1: Id. binds to the host (Smith), never the paren-child.
    expect(id?.resolution?.resolvedTo).toBe(citations.indexOf(smith as ResolvedCitation))
  })

  it("pins the node span to the `(...)` block (delimiters included, end-exclusive)", () => {
    const id = extractCitations(ID_QUOTING).find((c) => c.type === "id") as IdCitation
    const span = id.parentheticalNode?.span
    expect(span).toBeDefined()
    // No HTML/Unicode transform here, so original offsets index the input.
    expect(ID_QUOTING.slice(span?.originalStart, span?.originalEnd)).toBe(
      "(quoting Doe v. City, 100 F.2d 1)",
    )
  })

  it("does not over-capture a citation that follows the parenthetical", () => {
    const text =
      "Smith v. Jones, 200 F.3d 100 (2d Cir. 2000). Id. at 5 (quoting Doe v. City, 100 F.2d 1). Roe v. Town, 300 F.3d 5."
    const citations = extractCitations(text)
    const id = citations.find((c) => c.type === "id") as IdCitation
    // Only Doe is nested — the following Roe (after the `)`) is NOT swept in.
    expect(id.parentheticalNode?.citations).toHaveLength(1)
    expect((id.parentheticalNode?.citations?.[0] as FullCaseCitation).caseName).toBe("Doe v. City")
    expect(
      citations.some((c) => c.type === "case" && (c as FullCaseCitation).caseName === "Roe v. Town"),
    ).toBe(true)
  })

  it("nests across a short-form case's additional-pincite chain (trailingParenStart scan)", () => {
    // `at 105, 107` consumes an extra pincite before the paren — the node span
    // must start past it (the shortFormCase-only `trailingParenStart` path).
    const text =
      "Smith v. Jones, 200 F.3d 100 (2d Cir. 2000). Smith, 200 F.3d at 105, 107 (quoting Doe v. City, 100 F.2d 1)."
    const sf = extractCitations(text).find(
      (c) => c.type === "shortFormCase",
    ) as ShortFormCaseCitation
    expect(sf?.parentheticalNode?.type).toBe("quoting")
    expect((sf?.parentheticalNode?.citations?.[0] as FullCaseCitation)?.caseName).toBe("Doe v. City")
  })
})
