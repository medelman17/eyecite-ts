/**
 * #552 — Pincite via `at` (no comma) strips year+court paren.
 *
 * `Smith v. Jones, 491 S.W.2d 636 at 638 (1973)` should produce
 * `pincite=638`, `year=1973`. Today it returns `pincite=638` (the
 * LOOKAHEAD_PINCITE_REGEX captures the at-pincite) but `year=undefined`
 * and `court=undefined` — the LOOKAHEAD_PAREN_REGEX never accepted
 * `\s+at\s+\d+` as a valid pincite-skip prefix (only `,\s*[at\s+]?\d+`),
 * so the scan to the trailing `(1973)` paren fell through.
 *
 * With a comma (`, at 638` or `, 638`) the regex matches. Fix: accept
 * `\s+at\s+\d+` as an alternative pincite-skip prefix in
 * LOOKAHEAD_PAREN_REGEX, mirroring the prefix grammar already used by
 * LOOKAHEAD_PINCITE_REGEX.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"
import type { CaseCitation } from "@/types/citation"

describe("#552 at-pincite preserves trailing year/court paren", () => {
  it("`636 at 638 (1973)` keeps year and pincite", () => {
    const cites = extractCitations(
      "Smith v. Jones, 491 S.W.2d 636 at 638 (1973)",
    ) as CaseCitation[]
    expect(cites).toHaveLength(1)
    expect(cites[0]?.pincite).toBe(638)
    expect(cites[0]?.year).toBe(1973)
  })

  it("`636 at 638 (Tex. 1973)` keeps year and court", () => {
    const cites = extractCitations(
      "Smith v. Jones, 491 S.W.2d 636 at 638 (Tex. 1973)",
    ) as CaseCitation[]
    expect(cites[0]?.pincite).toBe(638)
    expect(cites[0]?.year).toBe(1973)
    expect(cites[0]?.court).toBeTruthy()
  })

  it("`636 at p. 638 (1973)` (page prefix) keeps year", () => {
    const cites = extractCitations(
      "Smith v. Jones, 491 S.W.2d 636 at p. 638 (1973)",
    ) as CaseCitation[]
    expect(cites[0]?.pincite).toBe(638)
    expect(cites[0]?.year).toBe(1973)
  })

  it("`636 at *3 (1973)` (star-pagination) keeps year", () => {
    const cites = extractCitations(
      "Smith v. Jones, 491 S.W.2d 636 at *3 (1973)",
    ) as CaseCitation[]
    expect(cites[0]?.year).toBe(1973)
  })

  it("`, at 638 (1973)` (comma + at) still works (regression)", () => {
    const cites = extractCitations(
      "Smith v. Jones, 491 S.W.2d 636, at 638 (1973)",
    ) as CaseCitation[]
    expect(cites[0]?.pincite).toBe(638)
    expect(cites[0]?.year).toBe(1973)
  })

  it("`, 638 (1973)` (comma, no at) still works (regression)", () => {
    const cites = extractCitations(
      "Smith v. Jones, 491 S.W.2d 636, 638 (1973)",
    ) as CaseCitation[]
    expect(cites[0]?.pincite).toBe(638)
    expect(cites[0]?.year).toBe(1973)
  })

  it("no pincite at all `636 (1973)` still works (regression)", () => {
    const cites = extractCitations("Smith v. Jones, 491 S.W.2d 636 (1973)") as CaseCitation[]
    expect(cites[0]?.year).toBe(1973)
  })
})
