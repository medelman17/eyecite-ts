import { describe, expect, it } from "vitest"
import { normalizeCourt } from "../../src/extract/courtNormalization"

describe("normalizeCourt", () => {
  it("collapses spaces around periods: 'S.D. N.Y.' → 'S.D.N.Y.'", () => {
    expect(normalizeCourt("S.D. N.Y.")).toBe("S.D.N.Y.")
  })

  it("collapses spaces: 'E.D. Pa.' → 'E.D.Pa.'", () => {
    expect(normalizeCourt("E.D. Pa.")).toBe("E.D.Pa.")
  })

  it("adds trailing period: '2d Cir' → '2d Cir.'", () => {
    expect(normalizeCourt("2d Cir")).toBe("2d Cir.")
  })

  it("adds trailing period: '9th Cir' → '9th Cir.'", () => {
    expect(normalizeCourt("9th Cir")).toBe("9th Cir.")
  })

  it("leaves already-normalized values unchanged: 'U.S.'", () => {
    expect(normalizeCourt("U.S.")).toBe("U.S.")
  })

  it("leaves already-normalized values unchanged: '2d Cir.'", () => {
    expect(normalizeCourt("2d Cir.")).toBe("2d Cir.")
  })

  it("leaves 'scotus' unchanged", () => {
    expect(normalizeCourt("scotus")).toBe("scotus")
  })

  it("returns undefined for undefined input", () => {
    expect(normalizeCourt(undefined)).toBeUndefined()
  })

  it("returns undefined for empty string", () => {
    expect(normalizeCourt("")).toBeUndefined()
  })

  it("normalizes 'D. Mass.' → 'D.Mass.'", () => {
    expect(normalizeCourt("D. Mass.")).toBe("D.Mass.")
  })

  it("normalizes 'N.D. Ill.' → 'N.D.Ill.'", () => {
    expect(normalizeCourt("N.D. Ill.")).toBe("N.D.Ill.")
  })

  it("collapses spaces before lowercase letters: 'D. del.' → 'D.del.'", () => {
    expect(normalizeCourt("D. del.")).toBe("D.del.")
  })
})
