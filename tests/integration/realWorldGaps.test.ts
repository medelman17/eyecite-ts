/**
 * Real-world citation gaps surfaced by beta feedback (2026-04-29).
 *
 * Each describe block reproduces a single user-observed bug from a brief.
 * Source text is preserved verbatim from the original document so we
 * exercise the full pipeline against shapes that occur in practice.
 *
 * Status: written as failing reproductions; passes confirm root cause is
 * NOT in eyecite-ts. Failures localize the bug to this library.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import type { ResolvedCitation } from "@/resolve/types"

describe("Real-world gaps from beta feedback (2026-04-29)", () => {
  // ──────────────────────────────────────────────────────────────────────
  // Bug 1: Id. should resolve to the parent citation, not a citation that
  // happens to live inside the parent's "(citing X)" parenthetical.
  //
  // Source: New York fiduciary-duty brief.
  //
  // The Bd. of Mgrs. citation has a "(citing Gall...)" parenthetical
  // containing a parsable inner citation. The Id. that follows refers
  // to the cited authority of the previous sentence — Bd. of Mgrs. —
  // not the parenthetical reference Gall.
  //
  // Bluebook 4.1: Id. refers to the immediately preceding cited
  // authority. A citation appearing inside another citation's
  // explanatory parenthetical is not "the cited authority" of that
  // sentence; it is a reference within the cited authority.
  // ──────────────────────────────────────────────────────────────────────
  describe("Bug 1: Id. with parent-with-citing-parenthetical antecedent", () => {
    const text =
      "Bd. of Mgrs. of Brightwater Towers Condo. v. FirstService Residential N.Y., Inc., " +
      "193 A.D.3d 672, 673 (2d Dep't 2021) (citing Gall v. Colon-Sylvain, 151 A.D.3d 698, " +
      "700-701 (2d Dep't 2016)). " +
      'A fiduciary relationship "does not arise by operation of law, but must spring from ' +
      "the parties themselves, who agree to and accept the responsibilities that flow from " +
      'such a contractual fiduciary bond." ' +
      "Id. (quoting Ne. Gen. Corp. v. Wellington Adv., 82 N.Y.2d 158, 160 (1993))."

    it("Id. resolves to the parent (Bd. of Mgrs.), not the parenthetical child (Gall)", () => {
      const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

      const bdOfMgrs = citations.find(
        (c) => c.type === "case" && c.volume === 193 && c.reporter === "A.D.3d",
      )
      const gall = citations.find(
        (c) => c.type === "case" && c.volume === 151 && c.reporter === "A.D.3d",
      )
      const id = citations.find((c) => c.type === "id")

      expect(bdOfMgrs).toBeDefined()
      expect(gall).toBeDefined()
      expect(id).toBeDefined()

      const bdIndex = citations.indexOf(bdOfMgrs!)
      const gallIndex = citations.indexOf(gall!)

      // Currently FAILS: resolver promotes Gall to lastResolvedIndex even
      // though Gall lives inside Bd. of Mgrs.'s "(citing ...)" parenthetical.
      expect(id!.resolution?.resolvedTo).toBe(bdIndex)
      expect(id!.resolution?.resolvedTo).not.toBe(gallIndex)
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // Bug 2: Long single-party-style corporate caption with "v." should
  // attach the full case name to the citation core.
  // ──────────────────────────────────────────────────────────────────────
  describe("Bug 2: Bd. of Mgrs. of Brightwater Towers — long corporate caption", () => {
    const text =
      'transactions." Bd. of Mgrs. of Brightwater Towers Condo. v. FirstService Residential ' +
      "N.Y., Inc., 193 A.D.3d 672, 673 (2d Dep't 2021)."

    it("attaches full case name to 193 A.D.3d 672", () => {
      const citations = extractCitations(text)
      const bd = citations.find(
        (c) => c.type === "case" && c.volume === 193 && c.reporter === "A.D.3d",
      )

      expect(bd).toBeDefined()
      if (bd?.type === "case") {
        expect(bd.caseName).toBe(
          "Bd. of Mgrs. of Brightwater Towers Condo. v. FirstService Residential N.Y., Inc.",
        )
      }
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // Bug 3: "See" signal followed by a case name with a non-standard
  // comma between "Inc." and "v.": "Inc., v.". Bluebook normally has
  // "Inc. v.", but real-world briefs do this.
  // ──────────────────────────────────────────────────────────────────────
  describe("Bug 3: See-signal + comma between Inc. and v.", () => {
    const text =
      "governed exclusively by the APA and Non-Competition Agreement — arm's-length " +
      "commercial contracts that do not create fiduciary obligations. " +
      "See NYAHSA Servs., Inc., v. Recco Home Care Servs., Inc., 141 A.D.3d 792, 795 " +
      "(3d Dep't 2016)."

    it("attaches case name despite stray comma before v.", () => {
      const citations = extractCitations(text)
      const nyahsa = citations.find(
        (c) => c.type === "case" && c.volume === 141 && c.reporter === "A.D.3d",
      )

      expect(nyahsa).toBeDefined()
      if (nyahsa?.type === "case") {
        // Accept either the literal source form (with stray comma) or the
        // canonical Bluebook form. Whichever the regex chain produces is
        // fine as long as both parties are present.
        expect(nyahsa.caseName).toMatch(
          /^NYAHSA Servs\., Inc\.,? v\. Recco Home Care Servs\., Inc\.$/,
        )
      }
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // Bug 4: NY Slip Op citation — non-traditional reporter format
  // (year-as-volume, slip-op number as page). Case name should attach.
  // ──────────────────────────────────────────────────────────────────────
  describe("Bug 4: NY Slip Op + case name", () => {
    const text =
      "Indeed, the First Department has applied this precise rule in the asset purchase " +
      "and non-competition agreement context. " +
      "In Meer Enterprises, LLC v. Kocak, 2019 NY Slip Op 5208 (1st Dep't 2019), " +
      "the plaintiff purchased an interest in a business."

    it("extracts the slip-op citation with case name attached", () => {
      const citations = extractCitations(text)
      // NY Slip Op may parse as `case` (with reporter "NY Slip Op") or `neutral`
      // depending on classification. Find by the slip-op number 5208.
      const meer = citations.find((c) => c.text.includes("5208"))

      expect(meer).toBeDefined()
      if (meer?.type === "case") {
        expect(meer.caseName).toBe("Meer Enterprises, LLC v. Kocak")
      } else if (meer?.type === "neutral") {
        // Neutral citations don't carry caseName; if classified as neutral
        // we want to know — that would mean the case-name path isn't run.
        expect.fail(
          "NY Slip Op classified as neutral, so caseName path doesn't run. " +
            "If case-name attachment is needed for neutral cites, that's a " +
            "separate enhancement; otherwise classify as case.",
        )
      }
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // Bug 5: Docket-number-only "citation" with no recognizable reporter:
  // "No. 51 (N.Y. 2023)". Expected behavior is at least to recognize the
  // citation surface so downstream highlighting has a span to wrap.
  // ──────────────────────────────────────────────────────────────────────
  describe("Bug 5: docket-number citation (No. 51) with no traditional reporter", () => {
    const text =
      'enforcement of the bargain, the parties should also proceed under a contract theory." ' +
      "IKB Int'l, S.A. v. Wells Fargo Bank, N.A., No. 51 (N.Y. 2023)."

    it("produces a citation object for the IKB Int'l case", () => {
      const citations = extractCitations(text)

      // First clarify what (if anything) eyecite-ts produces for this shape.
      // If nothing, the test fails noisily and we know to add an extractor.
      expect(citations.length).toBeGreaterThan(0)

      const ikb = citations.find((c) => c.text.includes("No. 51"))
      expect(ikb).toBeDefined()

      if (ikb?.type === "case") {
        expect(ikb.caseName).toBe("IKB Int'l, S.A. v. Wells Fargo Bank, N.A.")
      }
    })
  })
})
