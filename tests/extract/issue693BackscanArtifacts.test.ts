import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #693 — case-name backscan vs. PDF/HTML artifacts. Trademark/registered
 * symbols (™ ® ℠ ©) were already fixed in #744. This covers the two remaining
 * actionable artifacts, both of which dropped or fragmented the caption:
 *
 *   - Zero-width space (U+200B) standing in for a word separator
 *     (`Smith<U+200B>v. Jones`) — was stripped (joining `Smithv.`), losing the
 *     plaintiff. Now normalized to a space.
 *   - `<br>` line breaks (`Smith<br>v.<br>Jones`) — stripHtmlTags only spaced a
 *     tag run when word chars flanked both sides, so `v.<br>Jones` fused to
 *     `v.Jones`. `<br>` now always collapses to a space.
 *
 * Em-dash (`Smith — the leading case —`) and ellipsis (`Smith… see`) remain
 * documented limitations — the punctuation marks an interruption / omission,
 * not a continuous case name.
 */
const caseName = (t: string): string | undefined => {
  const c = extractCitations(t).find((x) => x.type === "case") as { caseName?: string } | undefined
  return c?.caseName
}

describe("Issue #693 - backscan artifacts", () => {
  it("zero-width space separator keeps the full caption", () => {
    expect(caseName("Smith\u200Bv. Jones, 100 F.2d 1")).toBe("Smith v. Jones")
  })

  it("`<br>` line breaks between caption parts keep the full caption", () => {
    expect(caseName("Smith<br>v.<br>Jones, 100 F.2d 1")).toBe("Smith v. Jones")
  })

  it("`<br/>` self-closing variant also works", () => {
    expect(caseName("Smith<br/>v.<br/>Jones, 100 F.2d 1")).toBe("Smith v. Jones")
  })

  it("trademark/registered symbols still resolved (#744 regression)", () => {
    expect(caseName("Smith™ v. Jones®, 100 F.2d 1")).toBe("Smith v. Jones")
  })
})
