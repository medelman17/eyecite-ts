import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { StatuteCitation } from "@/types/citation"

const statutes = (text: string): StatuteCitation[] =>
  extractCitations(text).filter((c): c is StatuteCitation => c.type === "statute")

describe("#655 California bare-section statutes with upstream code context", () => {
  describe("Abbreviated `Health & Saf. Code`", () => {
    it("`Health & Saf. Code, § 1375.4`", () => {
      const cs = statutes("Health & Saf. Code, § 1375.4")
      expect(cs).toHaveLength(1)
      expect(cs[0].code).toBe("Health & Saf. Code")
      expect(cs[0].section).toBe("1375.4")
      expect(cs[0].jurisdiction).toBe("CA")
    })

    it("`Health & Saf. Code, § 1375.4, subd. (b)(4)`", () => {
      const cs = statutes("Health & Saf. Code, § 1375.4, subd. (b)(4)")
      expect(cs).toHaveLength(1)
      expect(cs[0].section).toBe("1375.4")
      expect(cs[0].subsection).toBe("(b)(4)")
    })

    it("with-Cal. prefix: `Cal. Health & Saf. Code § 1375.4`", () => {
      const cs = statutes("Cal. Health & Saf. Code § 1375.4")
      expect(cs).toHaveLength(1)
      expect(cs[0].section).toBe("1375.4")
    })
  })

  describe("Bare `§ N` inheriting CA code from upstream", () => {
    it("`Pen. Code § 148. Then § 149.` — both CA", () => {
      const cs = statutes("Pen. Code § 148. Then § 149.")
      expect(cs).toHaveLength(2)
      expect(cs[0].section).toBe("148")
      expect(cs[1].section).toBe("149")
      expect(cs[1].code).toBe("Pen. Code")
      expect(cs[1].jurisdiction).toBe("CA")
    })

    // Note: bare `§ 1347.15` (CA-shape section: digits-dot-digits) is not yet
    // captured by any tokenizer pattern (`nm-bare-section` requires the
    // hyphenated `N-N-N` shape). Tracked as a follow-up. This PR fixes the
    // upstream `Health & Saf. Code` abbreviation but the bare-section
    // inheritance for CA-shape sections is deferred.

    it("multiple bare cites all inherit the most-recent CA code", () => {
      const text =
        "Pen. Code § 148. The court also looked at § 149.5 and § 150."
      const cs = statutes(text)
      expect(cs.length).toBeGreaterThanOrEqual(3)
      for (const c of cs) {
        expect(c.jurisdiction).toBe("CA")
        expect(c.code).toBe("Pen. Code")
      }
    })
  })

  describe("Regression guards (no CA context)", () => {
    it("bare `§ 11-2-3` (NM-shape) still NM-tagged without CA context", () => {
      // Per #565: bare-section without any jurisdictional anchor defaults
      // to NM. Adding CA tracking should NOT change this for non-CA
      // section shapes.
      const cs = statutes("§ 11-2-3")
      // Either no extraction or tagged NM/null — but not CA.
      for (const c of cs) {
        expect(c.jurisdiction).not.toBe("CA")
      }
    })

    it("USC followed by bare `§` does NOT inherit CA", () => {
      const cs = statutes("42 U.S.C. § 1983. The court also cited § 1985.")
      const second = cs.find((c) => c.section === "1985")
      // Bare cite after USC should not become CA.
      if (second) {
        expect(second.jurisdiction).not.toBe("CA")
      }
    })
  })
})
