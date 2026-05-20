import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { Citation, StatuteCitation } from "@/types/citation"

const statutes = (cites: Citation[]): StatuteCitation[] =>
  cites.filter((c): c is StatuteCitation => c.type === "statute")

/**
 * #565 — `§ N(1.5)` decimal subsection dropped, and the NM bare-section
 * dispatcher mis-routes to NMSA even when no NM context is present.
 *
 * Two bugs:
 *   1. `nm-bare-section` subsection regex doesn't accept `.` inside parens,
 *      so `§ 32A-2-7(A)(1.5)` loses the `(1.5)` portion of the subsection.
 *   2. The default NM jurisdiction tag fires without any NM signal nearby
 *      (similar to the #531 issue). Without a `NMSA`, `N.M.`, or
 *      `New Mexico` signal within ~200 chars, the bare-section cite should
 *      drop `jurisdiction` / `code` rather than claim NM.
 */
describe("issue #565 — NM bare-section decimal subsection + jurisdiction guard", () => {
  describe("decimal subsection captured", () => {
    it("`NMSA 1978, § 32A-2-7(A)(1.5)` keeps full subsection", () => {
      const text = "See NMSA 1978, § 32A-2-7(A)(1.5)."
      const cites = statutes(extractCitations(text))
      const nm = cites.find((c) => c.code === "NMSA 1978")
      expect(nm).toBeDefined()
      expect(nm?.subsection).toBe("(A)(1.5)")
    })

    it("decimal-only subsection `§ N(1.5)` captured", () => {
      // Even with NM context, decimal in subsection must not be dropped.
      const text = "NMSA 1978: see § 11-2-3(1.5) for details."
      const cites = statutes(extractCitations(text))
      const nm = cites.find((c) => c.section === "11-2-3")
      expect(nm).toBeDefined()
      expect(nm?.subsection).toBe("(1.5)")
    })
  })

  describe("jurisdiction guard — drop NM without NM context", () => {
    it("bare `§ 32A-2-7(A)` with NO NM context drops jurisdiction", () => {
      const text = "Some unrelated prose. § 32A-2-7(A) further provides..."
      const cites = statutes(extractCitations(text))
      expect(cites.length).toBeGreaterThanOrEqual(1)
      const bare = cites.find((c) => c.section === "32A-2-7")
      expect(bare).toBeDefined()
      // No NM signal nearby → must NOT claim NM. Consumers can't trust a guess.
      expect(bare?.jurisdiction).toBeUndefined()
      expect(bare?.code).toBeUndefined()
    })

    it("bare `§ N-N-N` after NMSA context keeps NM", () => {
      const text =
        "NMSA 1978, § 32A-2-1 establishes. Section 32A-2-7(A) further provides."
      const cites = statutes(extractCitations(text))
      const bare = cites.find(
        (c) => c.section === "32A-2-7" && c.matchedText.startsWith("Section"),
      )
      expect(bare).toBeDefined()
      expect(bare?.jurisdiction).toBe("NM")
      expect(bare?.code).toBe("NMSA 1978")
    })

    it("bare `§ N-N-N` after `New Mexico` context keeps NM", () => {
      const text = "The New Mexico statute § 41-2-2 provides..."
      const cites = statutes(extractCitations(text))
      const bare = cites.find((c) => c.section === "41-2-2")
      expect(bare).toBeDefined()
      expect(bare?.jurisdiction).toBe("NM")
    })
  })
})
