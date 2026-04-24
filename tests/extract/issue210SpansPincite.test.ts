import { describe, expect, it } from "vitest"
import { extractCitations } from "../../src"

function textAtSpan(text: string, s: { originalStart: number; originalEnd: number } | undefined) {
  if (!s) return undefined
  return text.substring(s.originalStart, s.originalEnd)
}

describe("issue #210: spans.pincite on short-form / id / supra / neutral", () => {
  it("ShortFormCaseCitation — spans.pincite covers '462-65'", () => {
    const text =
      "See Smith v. Jones, 100 F.3d 456, 460 (2d Cir. 2020). Smith, 100 F.3d at 462-65."
    const cites = extractCitations(text)
    const sf = cites.find((c) => c.type === "shortFormCase")
    expect(sf).toBeDefined()
    const s = sf?.type === "shortFormCase" ? sf.spans?.pincite : undefined
    expect(textAtSpan(text, s)).toBe("462-65")
  })

  it("ShortFormCaseCitation — spans.pincite covers '462 n.14' with footnote", () => {
    const text =
      "See Smith v. Jones, 100 F.3d 456, 460 (2d Cir. 2020). Smith, 100 F.3d at 462 n.14."
    const cites = extractCitations(text)
    const sf = cites.find((c) => c.type === "shortFormCase")
    const s = sf?.type === "shortFormCase" ? sf.spans?.pincite : undefined
    expect(textAtSpan(text, s)).toBe("462 n.14")
  })

  it("IdCitation — spans.pincite covers '462 n.14'", () => {
    const text = "Smith v. Jones, 100 F.3d 456, 460 (2d Cir. 2020). Id. at 462 n.14."
    const cites = extractCitations(text)
    const id = cites.find((c) => c.type === "id")
    const s = id?.type === "id" ? id.spans?.pincite : undefined
    expect(textAtSpan(text, s)).toBe("462 n.14")
  })

  it("IdCitation — spans.pincite undefined when no pincite", () => {
    const text = "Smith v. Jones, 100 F.3d 456, 460 (2d Cir. 2020). Id."
    const cites = extractCitations(text)
    const id = cites.find((c) => c.type === "id")
    const s = id?.type === "id" ? id.spans?.pincite : undefined
    expect(s).toBeUndefined()
  })

  it("SupraCitation — spans.pincite covers '460'", () => {
    const text = "Smith v. Jones, 100 F.3d 456 (2d Cir. 2020). Later: Smith, supra, at 460."
    const cites = extractCitations(text)
    const supra = cites.find((c) => c.type === "supra")
    const s = supra?.type === "supra" ? supra.spans?.pincite : undefined
    expect(textAtSpan(text, s)).toBe("460")
  })

  it("NeutralCitation — spans.pincite covers '*3-*5' (lookahead pincite)", () => {
    const text = "See 2020 WL 1234567, at *3-*5 (S.D.N.Y. 2020)."
    const cites = extractCitations(text)
    const neutral = cites.find((c) => c.type === "neutral")
    const s = neutral?.type === "neutral" ? neutral.spans?.pincite : undefined
    expect(textAtSpan(text, s)).toBe("*3-*5")
  })

  it("NeutralCitation — spans.pincite undefined when no pincite", () => {
    const text = "See 2020 WL 1234567 (S.D.N.Y. 2020)."
    const cites = extractCitations(text)
    const neutral = cites.find((c) => c.type === "neutral")
    const s = neutral?.type === "neutral" ? neutral.spans?.pincite : undefined
    expect(s).toBeUndefined()
  })
})
