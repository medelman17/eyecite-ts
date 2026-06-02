/**
 * Issue #789: historical-reform constitutional citations.
 *
 * State constitutions get renumbered; opinions cite the old location and note
 * the current one parenthetically: `former article XX, section 21 (now art.
 * XIV, § 4)`. These extracted as nothing. They now extract as one
 * `constitutional` citation for the *former* location, with the *current*
 * location in `currentLocation`. The distinctive `(now …)` reform parenthetical
 * is the trigger, so bare (un-anchored) and anchored forms both extract.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import type { ConstitutionalCitation } from "@/types/citation"
import { toBluebook } from "@/utils/bluebook"

const constOf = (text: string): ConstitutionalCitation | undefined =>
  (extractCitations(text) as ConstitutionalCitation[]).find((c) => c.type === "constitutional")

describe("Issue #789: historical-reform constitutional citations", () => {
  it("bare: former article XX, section 21 (now art. XIV, § 4)", () => {
    const c = constOf("former article XX, section 21 (now art. XIV, § 4)")
    expect(c, "should extract a constitutional cite").toBeDefined()
    expect(c?.article).toBe(20) // former XX
    expect(c?.section).toBe("21")
    expect(c?.currentLocation).toEqual({ article: 14, section: "4" })
  })

  it("anchored (state): Cal. Const. former art. XX, § 21 (now art. XIV, § 4)", () => {
    const c = constOf("Cal. Const. former art. XX, § 21 (now art. XIV, § 4)")
    expect(c?.jurisdiction).toBe("CA")
    expect(c?.article).toBe(20)
    expect(c?.section).toBe("21")
    expect(c?.currentLocation).toEqual({ article: 14, section: "4" })
  })

  it("amendment supersession: U.S. Const. former art. I, § 3, cl. 1 (now amend. XVII)", () => {
    const c = constOf("U.S. Const. former art. I, § 3, cl. 1 (now amend. XVII)")
    expect(c?.jurisdiction).toBe("US")
    expect(c?.article).toBe(1)
    expect(c?.section).toBe("3")
    expect(c?.clause).toBe(1)
    expect(c?.currentLocation).toEqual({ amendment: 17 })
  })

  it("ordinary constitutional cites are unaffected (currentLocation undefined)", () => {
    const c = constOf("U.S. Const. art. XIV, § 4")
    expect(c?.article).toBe(14)
    expect(c?.currentLocation).toBeUndefined()
  })

  it("no false positive: 'former' in prose without (now …) does not match", () => {
    const cites = extractCitations("the former article of the treaty was repealed") as Array<{
      type: string
    }>
    expect(cites.find((c) => c.type === "constitutional")).toBeUndefined()
  })

  it("toBluebook renders the (now …) post-reform location", () => {
    const c = constOf("U.S. Const. former art. I, § 3, cl. 1 (now amend. XVII)")
    expect(c).toBeDefined()
    if (c) expect(toBluebook(c)).toContain("(now amend. XVII)")
  })
})
