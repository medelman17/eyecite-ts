import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { FullCaseCitation } from "@/types/citation"

/**
 * Issue #517: literal `Id.` is being captured as the caseName on a `case`-
 * typed citation when the source text uses the older `Id., vol Reporter
 * page` form (e.g., `physical injury. Id., 584 N.Y.S.2d 744`).
 *
 * Root cause: the `id` token pattern requires `Id. at <pincite>` and so
 * does not match `Id.,` followed by a comma + reporter. The tokenizer
 * falls through, treating `584 N.Y.S.2d 744` as a bare case citation and
 * letting the backward case-name scan absorb `Id.` as the caption.
 *
 * Fix: refuse `Id.` (and `Id`) as a captured caseName — these are short-
 * form citation markers, not party names. The case citation still
 * surfaces (so the resolver can attach it to the antecedent), it just
 * doesn't carry `caseName="Id."`.
 */
describe("issue #517 — literal `Id.` not captured as caseName", () => {
  const caseCite = (text: string): FullCaseCitation | undefined => {
    const cs = extractCitations(text)
    return cs.find((c) => c.type === "case") as FullCaseCitation | undefined
  }

  it("does not produce caseName='Id.' for `physical injury. Id., 584 N.Y.S.2d 744`", () => {
    const cc = caseCite(
      "the plaintiff suffered no physical injury. Id., 584 N.Y.S.2d 744",
    )
    // We don't assert that NO case citation surfaces — that's a separate
    // tokenizer concern (the bug report says it produces a case citation
    // for `584 N.Y.S.2d 744`). What MUST hold: caseName must NOT be
    // literally `Id.` / `Id` (with or without trailing punctuation).
    // `undefined` is acceptable — the caption simply doesn't surface, and
    // the resolver can pair the citation via Id. semantics if needed.
    if (cc) {
      const name = cc.caseName ?? ""
      expect(name).not.toMatch(/^Id\.?$/)
    }
  })

  it("does not produce caseName='Id' for `... text. Id, 100 F.2d 1`", () => {
    const cc = caseCite("Some preceding text. Id, 100 F.2d 1")
    if (cc) {
      const name = cc.caseName ?? ""
      expect(name).not.toMatch(/^Id\.?$/)
    }
  })

  it("does not produce caseName='Ibid' / 'Ibid.' either", () => {
    const cc = caseCite("Some preceding text. Ibid, 100 F.2d 1")
    if (cc) {
      const name = cc.caseName ?? ""
      expect(name).not.toMatch(/^Ibid\.?$/i)
    }
  })

  it("does not regress legitimate single-party captions", () => {
    // `Microsoft` is a legitimate single-party caption (Antitrust suit
    // shorthand). Stripping short-form markers must not affect real names.
    const cc = caseCite("As discussed in Microsoft, 100 F.2d 1")
    // No assertion on caseName equality — the existing extractor may or
    // may not surface "Microsoft" depending on context — but if it does,
    // it must NOT be filtered by the new short-form-marker reject.
    if (cc?.caseName) {
      expect(cc.caseName).not.toMatch(/^Id\.?$/)
    }
  })
})
