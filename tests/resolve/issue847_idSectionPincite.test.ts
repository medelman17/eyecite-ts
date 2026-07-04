/**
 * Issue #847: thread the `Id.` section-pincite terminal forward.
 *
 * `getIdPreferredFamily` (and the `tailHasSection` check in `resolveId`) used to
 * peek ~20 chars of raw text after `Id.` for a `§` to decide case-vs-statute
 * family, because `extractId`'s pincite regex only captures page/paragraph
 * shapes. Extraction now emits a `sectionPincite` terminal on the IdCitation, so
 * the resolver reads a structured field instead of re-scanning prose.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import type { ResolvedCitation } from "@/resolve/types"
import type { IdCitation } from "@/types/citation"

describe("Issue #847: Id. sectionPincite terminal", () => {
  it("populates sectionPincite for a §-style Id. pincite", () => {
    const text = "Smith v. Jones, 100 F.3d 1 (1990). 42 U.S.C. § 1983. Id. § 1983(c)."
    const id = extractCitations(text).find((c) => c.type === "id") as IdCitation
    expect(id.sectionPincite).toBe("1983(c)")
  })

  it("leaves sectionPincite undefined for a page-style Id. pincite", () => {
    const id = extractCitations("29 U.S.C. § 201. Id. at 5.").find(
      (c) => c.type === "id",
    ) as IdCitation
    expect(id.sectionPincite).toBeUndefined()
  })

  it("family detection now reads the field: Id. § N resolves to the statute over a case", () => {
    const text = "Smith v. Jones, 100 F.3d 1 (1990). 42 U.S.C. § 1983. Id. § 1983(c)."
    const cites = extractCitations(text, { resolve: true }) as ResolvedCitation[]
    const statute = cites.find((c) => c.type === "statute")!
    const id = cites.find((c) => c.type === "id")!
    expect(id.resolution?.resolvedTo).toBe(cites.indexOf(statute))
  })

  // Section-shape variants — lock the regex branches against future drift.
  it("captures a double-§ range: Id. §§ 1-5", () => {
    const id = extractCitations("29 U.S.C. §§ 1-5. Id. §§ 1-5.").find(
      (c) => c.type === "id",
    ) as IdCitation
    expect(id.sectionPincite).toBe("1-5")
  })

  it("captures through the post-period-comma branch: Id., § 5", () => {
    const id = extractCitations("29 U.S.C. § 5. Id., § 5.").find(
      (c) => c.type === "id",
    ) as IdCitation
    expect(id.sectionPincite).toBe("5")
  })

  it("captures a bare section number: Id. § 5", () => {
    const id = extractCitations("29 U.S.C. § 5. Id. § 5.").find(
      (c) => c.type === "id",
    ) as IdCitation
    expect(id.sectionPincite).toBe("5")
  })
})
