/**
 * Issue #498: `Id.` resolves-to skips weakly-signaled antecedent.
 *
 * Bluebook Rule 4.1: `Id.` refers to the immediately preceding cited
 * authority — regardless of signal phrase. A `See`-signaled full citation is
 * still an authority; the signal qualifies *how* the source supports the
 * proposition, not whether the citation itself can be the referent of a
 * following `Id.`
 *
 * Python eyecite's reference implementation (`_resolve_id_citation` in
 * `eyecite/resolve.py`) is signal-blind: it returns `last_resolution` —
 * the most-recent successfully-resolved citation — with no scoring or
 * filtering by signal phrase.
 *
 * The pre-fix TypeScript port down-ranked weak-signaled candidates in
 * `resolveId`'s scorer (`+100 if !weak`), causing a more-distant strong-
 * signal full cite to beat a more-recent weak-signal one. That matched
 * the `WEAK_SIGNALS` membership exactly: `see` / `cf` failed; `but see` /
 * `accord` / unsignaled passed. This file pins the strict Rule 4.1 reading
 * for every signal class.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import type { ResolvedCitation } from "@/resolve/types"

describe("Issue #498: Id. resolves-to honors strict Bluebook 4.1 (signal-blind)", () => {
  // Holding the rest of the input constant and varying only the signal
  // before the second full cite. Per Rule 4.1, `Id.` must anchor to the
  // immediately preceding cited authority in every row.
  const matrix: Array<[label: string, signal: string]> = [
    ["(none)", ""],
    ["See", "See "],
    ["But see", "But see "],
    ["Cf.", "Cf. "],
    ["Accord", "Accord "],
    ["See also", "See also "],
    ["But cf.", "But cf. "],
    ["Compare", "Compare "],
    ["See generally", "See generally "],
  ]

  for (const [label, signal] of matrix) {
    it(`Id. resolves to immediately preceding cite when antecedent has '${label}' signal`, () => {
      const text = `Iqbal, 556 U.S. 662 (2009). ${signal}Printing Mart, 116 N.J. 739 (1989). Id.`
      const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
      const iqbal = citations.find((c) => c.type === "case" && c.volume === 556)!
      const printingMart = citations.find((c) => c.type === "case" && c.volume === 116)!
      const id = citations.find((c) => c.type === "id")!

      expect(iqbal, `Iqbal should be extracted for ${label}`).toBeDefined()
      expect(printingMart, `Printing Mart should be extracted for ${label}`).toBeDefined()
      expect(id, `Id. should be extracted for ${label}`).toBeDefined()

      // Strict Bluebook 4.1: Id.'s resolved cluster matches its positional
      // antecedent. Both must point at Printing Mart (immediately preceding).
      expect(id.resolution?.resolvedTo, `resolvedTo for '${label}'`).toBe(
        citations.indexOf(printingMart),
      )
    })
  }

  it("antecedent edge and resolves-to edge agree in every signal case", () => {
    // The two-source-of-truth divergence from #498: `antecedent` was already
    // correct (computed via findImmediatePredecessor); only `resolvedTo` was
    // wrong. After the fix, the two must agree.
    for (const [, signal] of matrix) {
      const text = `Iqbal, 556 U.S. 662 (2009). ${signal}Printing Mart, 116 N.J. 739 (1989). Id.`
      const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
      const id = citations.find((c) => c.type === "id")!
      expect(id.resolution?.resolvedTo).toBe(id.resolution?.antecedentIndex)
    }
  })
})
