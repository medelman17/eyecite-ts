import { describe, expect, it } from "vitest"
import { normalizeReporterSpacing } from "../../src/clean/cleaners"

describe("normalizeReporterSpacing", () => {
  it("normalizes 'U. S.' to 'U.S.'", () => {
    expect(normalizeReporterSpacing("550 U. S. 544")).toBe("550 U.S. 544")
  })

  it("normalizes 'F. 2d' to 'F.2d'", () => {
    expect(normalizeReporterSpacing("500 F. 2d 123")).toBe("500 F.2d 123")
  })

  it("normalizes 'S. Ct.' to 'S.Ct.'", () => {
    expect(normalizeReporterSpacing("127 S. Ct. 1955")).toBe("127 S.Ct. 1955")
  })

  it("normalizes 'F. Supp. 2d' to 'F.Supp.2d'", () => {
    expect(normalizeReporterSpacing("300 F. Supp. 2d 100")).toBe("300 F.Supp.2d 100")
  })

  it("normalizes 'L. Ed. 2d' to 'L.Ed.2d'", () => {
    expect(normalizeReporterSpacing("35 L. Ed. 2d 147")).toBe("35 L.Ed.2d 147")
  })

  it("leaves already-normalized text unchanged", () => {
    expect(normalizeReporterSpacing("550 U.S. 544")).toBe("550 U.S. 544")
  })

  it("does not affect non-reporter text", () => {
    expect(normalizeReporterSpacing("Corp. v. Doe")).toBe("Corp. v. Doe")
  })

  it("handles multiple reporters in same text", () => {
    const input = "550 U. S. 544, 127 S. Ct. 1955"
    expect(normalizeReporterSpacing(input)).toBe("550 U.S. 544, 127 S.Ct. 1955")
  })
})
