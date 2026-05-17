import { describe, expect, it } from "vitest"
import FIXTURES from "../fixtures/real-world-citations-2026-05-11.json"
import { extractCitations } from "@/extract"
import type { CaseCitation } from "@/types/citation"

/**
 * Real-world citation regression fixtures (2026-05-11).
 *
 * Each entry is a verbatim citation mined from a published opinion in the
 * Harvard CAP corpus. The fixtures exercise patterns landed across recent
 * PRs:
 *   #229 — Texas writ/petition history inside court parenthetical
 *   #239 — Combined `, e.g.` signals
 *   #242 / #253 — Procedural prefix expansion (Marriage of, Welfare of, etc.)
 *   #244 — BIA hyphenated initials (separately tested)
 *   #240 — Slash-alias party-name aliases (d/b/a etc.)
 *
 * The assertions are deliberately loose — they verify the parser produces a
 * recognizable citation for each real-world input. Category-specific tighter
 * assertions on signal / proceduralPrefix / subsequentHistory live where the
 * pattern was added (the per-PR test files).
 */

interface Fixture {
  text: string
  citing_opinion: string
  citing_citation: string
  reporter: string
  volume: string
}

const F = FIXTURES as Record<string, Fixture[]>

/** Verify the case-name prefix appears at the start of the extracted caseName. */
function expectCaseNameStartsWith(text: string, prefix: string): void {
  const cits = extractCitations(text)
  const cases = cits.filter((c): c is CaseCitation => c.type === "case")
  expect(cases.length, `no case citation extracted from: ${text}`).toBeGreaterThanOrEqual(1)
  const caseName = cases[0]?.caseName ?? ""
  expect(
    caseName.startsWith(prefix),
    `case name "${caseName}" did not start with "${prefix}" in: ${text}`,
  ).toBe(true)
}

describe("real-world corpus regression fixtures (Harvard CAP, 2026-05-11)", () => {
  describe("procedural prefix — In re Marriage of (#242)", () => {
    for (const fx of F.in_re_marriage_of ?? []) {
      it(`extracts "${fx.text.substring(0, 60)}..."`, () => {
        expectCaseNameStartsWith(fx.text, "In re Marriage of")
      })
    }
  })

  describe("procedural prefix — In re Estate of (existing)", () => {
    for (const fx of F.in_re_estate_of ?? []) {
      it(`extracts "${fx.text.substring(0, 60)}..."`, () => {
        expectCaseNameStartsWith(fx.text, "In re Estate of")
      })
    }
  })

  describe("procedural prefix — In re Adoption of (#253)", () => {
    for (const fx of F.in_re_adoption_of ?? []) {
      it(`extracts "${fx.text.substring(0, 60)}..."`, () => {
        // Adoption of is matched as a bare prefix when no "In re" is present;
        // when "In re Adoption of" appears in the text the extractor records
        // the full caseName starting with "In re Adoption of".
        expectCaseNameStartsWith(fx.text, "In re Adoption of")
      })
    }
  })

  describe("procedural prefix — In re Welfare of (#253)", () => {
    for (const fx of F.in_re_welfare_of ?? []) {
      it(`extracts "${fx.text.substring(0, 60)}..."`, () => {
        expectCaseNameStartsWith(fx.text, "In re Welfare of")
      })
    }
  })

  describe("procedural prefix — In re Termination of Parental Rights (#253)", () => {
    for (const fx of F.in_re_termination_of_parental_rights ?? []) {
      it(`extracts "${fx.text.substring(0, 60)}..."`, () => {
        expectCaseNameStartsWith(fx.text, "In re Termination of Parental Rights")
      })
    }
  })

  describe("procedural prefix — In re Parentage of (#253)", () => {
    for (const fx of F.in_re_parentage_of ?? []) {
      it(`extracts "${fx.text.substring(0, 60)}..."`, () => {
        expectCaseNameStartsWith(fx.text, "In re Parentage of")
      })
    }
  })

  describe("procedural prefix — In the Interest of (#242)", () => {
    for (const fx of F.in_the_interest_of ?? []) {
      it(`extracts "${fx.text.substring(0, 60)}..."`, () => {
        expectCaseNameStartsWith(fx.text, "In the Interest of")
      })
    }
  })

  describe("procedural prefix — Succession of (LA civil law, #253)", () => {
    for (const fx of F.succession_of_la ?? []) {
      it(`extracts "${fx.text.substring(0, 60)}..."`, () => {
        expectCaseNameStartsWith(fx.text, "Succession of")
      })
    }
  })

  describe("sovereign ex rel. — People ex rel. (#253)", () => {
    for (const fx of F.people_ex_rel ?? []) {
      it(`extracts "${fx.text.substring(0, 60)}..."`, () => {
        expectCaseNameStartsWith(fx.text, "People ex rel.")
      })
    }
  })

  describe("sovereign ex rel. — Commonwealth ex rel. (#242)", () => {
    for (const fx of F.commonwealth_ex_rel ?? []) {
      it(`extracts "${fx.text.substring(0, 60)}..."`, () => {
        expectCaseNameStartsWith(fx.text, "Commonwealth ex rel.")
      })
    }
  })

  describe("combined signal — See, e.g. (#239)", () => {
    for (const fx of F.see_eg ?? []) {
      it(`extracts "${fx.text.substring(0, 60)}..." with signal "see, e.g."`, () => {
        const cits = extractCitations(fx.text)
        const cases = cits.filter((c): c is CaseCitation => c.type === "case")
        expect(cases.length).toBeGreaterThanOrEqual(1)
        expect(cases[0].signal).toBe("see, e.g.")
      })
    }
  })

  describe("combined signal — But see, e.g. (#239)", () => {
    for (const fx of F.but_see_eg ?? []) {
      it(`extracts "${fx.text.substring(0, 60)}..." with signal "but see, e.g."`, () => {
        const cits = extractCitations(fx.text)
        const cases = cits.filter((c): c is CaseCitation => c.type === "case")
        expect(cases.length).toBeGreaterThanOrEqual(1)
        expect(cases[0].signal).toBe("but see, e.g.")
      })
    }
  })

  describe("Texas writ/pet history (#229)", () => {
    for (const fx of F.tex_writ_history ?? []) {
      it(`extracts "${fx.text.substring(0, 60)}..." with subsequent history`, () => {
        const cits = extractCitations(fx.text)
        const cases = cits.filter((c): c is CaseCitation => c.type === "case")
        expect(cases.length).toBeGreaterThanOrEqual(1)
        const entries = cases[0].subsequentHistoryEntries
        // The Texas writ/pet history clause inside the court parenthetical
        // should populate subsequentHistoryEntries with a writ_*/pet_*/no_*
        // signal (the parser distinguishes 10 Texas-specific variants).
        expect(entries, `no subsequentHistoryEntries for: ${fx.text}`).toBeDefined()
        expect(entries?.length).toBeGreaterThanOrEqual(1)
        const sig = entries![0].signal
        expect(
          [
            "writ_refused",
            "writ_dismissed",
            "writ_denied",
            "writ_granted",
            "no_writ",
            "pet_refused",
            "pet_denied",
            "pet_dismissed",
            "pet_granted",
            "pet_filed",
            "no_pet",
          ].includes(sig),
          `unexpected Texas history signal "${sig}" for: ${fx.text}`,
        ).toBe(true)
      })
    }
  })

  describe("slash-alias party-name aliases (#240)", () => {
    for (const fx of F.slash_alias_dba ?? []) {
      it(`extracts "${fx.text.substring(0, 60)}..." with d/b/a alias preserved`, () => {
        const cits = extractCitations(fx.text)
        const cases = cits.filter((c): c is CaseCitation => c.type === "case")
        expect(cases.length).toBeGreaterThanOrEqual(1)
        // The full caseName must preserve the d/b/a marker (the slash-alias
        // is transparent glue inside the case name); the plaintiffNormalized
        // strips it.
        expect(cases[0].caseName).toContain("d/b/a")
      })
    }
  })
})
