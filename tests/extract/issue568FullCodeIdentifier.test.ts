import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { Citation, StatuteCitation } from "@/types/citation"

const statutes = (cites: Citation[]): StatuteCitation[] =>
  cites.filter((c): c is StatuteCitation => c.type === "statute")

/**
 * #568 — Named-code citations dropped jurisdiction + the literal `Code` /
 * `Law` suffix, leaving a bare body-name as `code` that loses context:
 *
 *   `Cal. Civ. Code § 51`     → code="Civ."          ← should be "Cal. Civ. Code"
 *   `Cal. Penal Code § 187`   → code="Penal"         ← should be "Cal. Penal Code"
 *   `N.Y. Penal Law § 120.05` → code="Penal Law"     ← should be "N.Y. Penal Law"
 *
 * Fix: `extractNamedCode` now retains the full jurisdiction prefix + body +
 * suffix in `code`. The body-only short form moves to `codeName` so consumers
 * that wanted it can still get the body.
 */
describe("issue #568 — named-code retains full identifier in `code`", () => {
  it("`Cal. Civ. Code § 51` → code='Cal. Civ. Code'", () => {
    const text = "Cal. Civ. Code § 51"
    const cites = statutes(extractCitations(text))
    expect(cites).toHaveLength(1)
    expect(cites[0].code).toBe("Cal. Civ. Code")
    expect(cites[0].jurisdiction).toBe("CA")
  })

  it("`Cal. Penal Code § 187` → code='Cal. Penal Code'", () => {
    const text = "Cal. Penal Code § 187"
    const cites = statutes(extractCitations(text))
    expect(cites).toHaveLength(1)
    expect(cites[0].code).toBe("Cal. Penal Code")
    expect(cites[0].jurisdiction).toBe("CA")
  })

  it("`California Civil Code § 51` → code='California Civil Code'", () => {
    const text = "California Civil Code § 51"
    const cites = statutes(extractCitations(text))
    expect(cites).toHaveLength(1)
    expect(cites[0].code).toBe("California Civil Code")
    expect(cites[0].jurisdiction).toBe("CA")
  })

  it("`N.Y. Penal Law § 120.05` → code='N.Y. Penal Law'", () => {
    const text = "N.Y. Penal Law § 120.05"
    const cites = statutes(extractCitations(text))
    expect(cites).toHaveLength(1)
    expect(cites[0].code).toBe("N.Y. Penal Law")
    expect(cites[0].jurisdiction).toBe("NY")
  })

  it("`Tex. Penal Code § 22.01` → code='Tex. Penal Code'", () => {
    const text = "Tex. Penal Code § 22.01"
    const cites = statutes(extractCitations(text))
    expect(cites).toHaveLength(1)
    expect(cites[0].code).toBe("Tex. Penal Code")
  })

  describe("regression — non-prefix forms", () => {
    it("NY bare named-code `Penal Law § 120` keeps code='Penal Law'", () => {
      const text = "Penal Law § 120 prohibits assault."
      const cites = statutes(extractCitations(text))
      expect(cites).toHaveLength(1)
      // Bare NY law (no `N.Y.` prefix) — the code is just the body+Law suffix.
      expect(cites[0].code).toContain("Penal Law")
    })
  })
})
