import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { TreatyCitation } from "@/types/citation"

/**
 * Treaty-series citations (#309) — the anchored series forms:
 *   - `T.I.A.S. No. 1502` (Treaties and Other International Acts Series), spaced variant
 *   - `1155 U.N.T.S. 331` (volume-series-page), `123 U.S.T. 456`
 *
 * Named-treaty metadata (`Vienna Convention…, art. 31`, `treatyName`/`article`/
 * `paragraph`) is a deliberate follow-up — prose name extraction is FP-prone; the
 * series cite inside such a string still extracts here.
 */
const treaty = (t: string): TreatyCitation | undefined =>
  extractCitations(t).find((c): c is TreatyCitation => c.type === "treaty")

describe("treaty series citations (#309)", () => {
  it("T.I.A.S. No. 1502", () => {
    const c = treaty("T.I.A.S. No. 1502")
    expect(c).toBeDefined()
    expect(c?.series).toBe("T.I.A.S.")
    expect(c?.seriesNumber).toBe("1502")
  })

  it("T. I. A. S. No. 6900 (spaced abbreviation)", () => {
    const c = treaty("see T. I. A. S. No. 6900")
    expect(c).toBeDefined()
    expect(c?.series).toBe("T.I.A.S.")
    expect(c?.seriesNumber).toBe("6900")
  })

  it("1155 U.N.T.S. 331 (volume-series-page)", () => {
    const c = treaty("1155 U.N.T.S. 331")
    expect(c).toBeDefined()
    expect(c?.series).toBe("U.N.T.S.")
    expect(c?.volume).toBe(1155)
    expect(c?.page).toBe(331)
  })

  it("123 U.S.T. 456 (volume-series-page)", () => {
    const c = treaty("123 U.S.T. 456")
    expect(c).toBeDefined()
    expect(c?.series).toBe("U.S.T.")
    expect(c?.volume).toBe(123)
    expect(c?.page).toBe(456)
  })

  it("extracts the U.N.T.S. series cite inside a named-treaty string", () => {
    const c = treaty(
      "Vienna Convention on the Law of Treaties, art. 31, May 23, 1969, 1155 U.N.T.S. 331",
    )
    expect(c).toBeDefined()
    expect(c?.series).toBe("U.N.T.S.")
    expect(c?.volume).toBe(1155)
    expect(c?.page).toBe(331)
  })
})

describe("treaty regression — neighbors unchanged", () => {
  it("federal Statutes at Large (Stat.) is not mistaken for a treaty", () => {
    const types = extractCitations("100 Stat. 2085").map((c) => c.type)
    expect(types).toContain("statutesAtLarge")
    expect(types).not.toContain("treaty")
  })

  it("does not false-positive on bare prose 'Convention'", () => {
    const cits = extractCitations("The Geneva Convention is widely cited.")
    expect(cits.some((c) => c.type === "treaty")).toBe(false)
  })
})
