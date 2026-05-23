import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #670 (part: sentence-internal connector prefix) — the trim
 * block in extractCaseName considered words like `Rather,` as plausible
 * party-name prefixes because they pass `firstWordIsProperName`
 * (capital first letter + not in PARTY_NAME_CONNECTORS + not in
 * SENTENCE_INITIAL_WORDS + INTERNAL_QUALIFIER_REGEX matches). Adding
 * common connector adverbs (rather, however, moreover, etc.) to
 * SENTENCE_INITIAL_WORDS routes them to the prefix-strip branch.
 */
describe("Issue #670 - sentence-internal connector prefix strip", () => {
  it("`Rather, State v. Epps` → caseName = `State v. Epps`", () => {
    const cs = extractCitations(`Rather, State v. Epps, 100 F.2d 1 (1990).`).filter(
      (c) => c.type === "case",
    )
    expect(cs).toHaveLength(1)
    expect((cs[0] as { caseName?: string }).caseName).toBe("State v. Epps")
  })

  it("`However, Smith v. Jones` → caseName = `Smith v. Jones`", () => {
    const cs = extractCitations(`However, Smith v. Jones, 100 F.2d 1 (1990).`).filter(
      (c) => c.type === "case",
    )
    expect(cs).toHaveLength(1)
    expect((cs[0] as { caseName?: string }).caseName).toBe("Smith v. Jones")
  })

  it("`Moreover, Doe v. Roe` → caseName = `Doe v. Roe`", () => {
    const cs = extractCitations(`Moreover, Doe v. Roe, 100 F.2d 1 (1990).`).filter(
      (c) => c.type === "case",
    )
    expect(cs).toHaveLength(1)
    expect((cs[0] as { caseName?: string }).caseName).toBe("Doe v. Roe")
  })

  it("`Indeed, Brown v. Board` → caseName = `Brown v. Board`", () => {
    const cs = extractCitations(`Indeed, Brown v. Board, 347 U.S. 483 (1954).`).filter(
      (c) => c.type === "case",
    )
    expect(cs).toHaveLength(1)
    expect((cs[0] as { caseName?: string }).caseName).toBe("Brown v. Board")
  })

  it("no-prefix control: `Smith v. Jones` unchanged", () => {
    const cs = extractCitations(`Smith v. Jones, 100 F.2d 1 (1990).`).filter(
      (c) => c.type === "case",
    )
    expect(cs).toHaveLength(1)
    expect((cs[0] as { caseName?: string }).caseName).toBe("Smith v. Jones")
  })

  it("sentence-boundary control: `... case. Heath, 509 F.2d at 19` unchanged", () => {
    const cs = extractCitations(
      `Congress did something. Heath, 509 F.2d 1 at 19 (1990).`,
    ).filter((c) => c.type === "case")
    expect(cs).toHaveLength(1)
    expect((cs[0] as { caseName?: string }).caseName).toBe("Heath")
  })
})
