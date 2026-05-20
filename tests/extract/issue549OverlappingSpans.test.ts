import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { Citation } from "@/types/citation"

/**
 * Issue #549: extractCitations produces overlapping core spans for two
 * tokenizer collisions that pre-549 dedup did not catch:
 *
 *   Mode A (partial overlap): `Case, supra, vol Reporter page` —
 *     SUPRA_PATTERN's Connecticut comma-pincite alternative (`, NNN`,
 *     #353) greedily consumes the digits, even when those digits are
 *     actually the volume of a following full citation. Output spans
 *     intersect on the captured volume.
 *
 *   Mode B (containment): `vol Id. page` — the broad state-reporter
 *     / law-review fallback treats `Id.` as a reporter abbreviation and
 *     matches `45 Id. 318`. The id pattern correctly matches `Id.` at
 *     the same time, producing a contained-overlap pair where neither
 *     was dropped by priority dedup.
 *
 * Both modes corrupted ~4-5% of CAP opinions per audit run, surfacing as
 * malformed sentinels in annotate (#545, already defended downstream)
 * and broken fullSpan splice logic (#543).
 *
 * Fix: tighten the tokenizer regexes so the overlap is never produced.
 *  - SUPRA_PATTERN / ID_PATTERN / IBID_PATTERN comma-pincite branches
 *    gain `(?!\d+\s+[A-Z])` so the comma-pincite does not fire when the
 *    digits are followed by a reporter shape.
 *  - state-reporter and law-review patterns gain `(?!(?:Ibid|Id)\.?\s+\d)`
 *    after the volume so `Id.` / `Ibid.` cannot masquerade as reporters.
 *
 * Regression cases (Davis, Smith comma-pincite, etc.) live in
 * extractShortForms.test.ts and are unaffected.
 */

function spansOverlap(a: Citation, b: Citation): boolean {
  const aStart = a.span.cleanStart
  const aEnd = a.span.cleanEnd
  const bStart = b.span.cleanStart
  const bEnd = b.span.cleanEnd
  return aStart < bEnd && bStart < aEnd
}

function findOverlapPairs(citations: Citation[]): Array<[Citation, Citation]> {
  const pairs: Array<[Citation, Citation]> = []
  for (let i = 0; i < citations.length; i++) {
    for (let j = i + 1; j < citations.length; j++) {
      if (spansOverlap(citations[i], citations[j])) {
        pairs.push([citations[i], citations[j]])
      }
    }
  }
  return pairs
}

describe("issue #549 — no overlapping spans across tokenizer collisions", () => {
  describe("Mode A: `Case, supra, vol Reporter page` (#353 comma-pincite over-capture)", () => {
    it("`Barrett, supra, 229 Conn. 274-76` produces non-overlapping supra + case", () => {
      const text = "Barrett, supra, 229 Conn. 274-76"
      const cites = extractCitations(text)

      // Both citations should surface, with disjoint spans.
      expect(findOverlapPairs(cites)).toEqual([])

      const supra = cites.find((c) => c.type === "supra")
      expect(supra).toBeDefined()
      if (supra?.type === "supra") {
        // supra no longer eats the volume `229`; its match ends at
        // `Barrett, supra` (or `Barrett, supra,`), pincite undefined.
        expect(supra.pincite).toBeUndefined()
      }

      // The Conn. citation still surfaces (case or journal — the broad
      // fallback is fine; what matters is the span does not overlap supra).
      const conn = cites.find(
        (c) => (c.type === "case" || c.type === "journal") && c.span.cleanStart >= 16,
      )
      expect(conn).toBeDefined()
    })

    it("`Smith v. Jones, supra, 522 F.3d 1` produces non-overlapping supra + case", () => {
      // Same shape with a v.-name supra and a federal-reporter follow-on.
      const text = "Smith v. Jones, supra, 522 F.3d 1."
      const cites = extractCitations(text)
      expect(findOverlapPairs(cites)).toEqual([])

      const supra = cites.find((c) => c.type === "supra")
      expect(supra).toBeDefined()
      if (supra?.type === "supra") {
        expect(supra.pincite).toBeUndefined()
      }

      const caseCite = cites.find((c) => c.type === "case")
      expect(caseCite).toBeDefined()
    })

    it("does NOT break Connecticut comma-pincite (`Smith, supra, 522.` keeps pincite=522)", () => {
      // Regression guard: the fix must not strip the legitimate
      // comma-pincite form (#353) when the digits are NOT followed by a
      // reporter shape.
      const text = "We followed Smith v. Jones, 100 Conn. 1, 5 (1980). Smith, supra, 522."
      const cites = extractCitations(text)
      const supra = cites.find((c) => c.type === "supra")
      expect(supra?.type).toBe("supra")
      if (supra?.type === "supra") {
        expect(supra.pincite).toBe(522)
      }
    })
  })

  describe("Mode B: `vol Id. page` (state-reporter mis-matches Id. as a reporter)", () => {
    it("`Hawkins v. Giles, 45 Id. 318` produces id-only (case interpretation dropped)", () => {
      const text = "Hawkins v. Giles, 45 Id. 318"
      const cites = extractCitations(text)
      expect(findOverlapPairs(cites)).toEqual([])

      // The id citation must surface for the `Id.` token.
      const id = cites.find((c) => c.type === "id")
      expect(id).toBeDefined()

      // No phantom case citation for `45 Id. 318` (Id. is not a reporter).
      const phantomCase = cites.find(
        (c) => c.type === "case" && c.span.cleanStart >= 18 && c.matchedText?.includes("Id."),
      )
      expect(phantomCase).toBeUndefined()
    })

    it("does NOT break Idaho reporter (`100 Idaho 1`)", () => {
      // Regression guard: `Idaho` must still match state-reporter even
      // though it starts with `Id`. The negative lookahead is precise.
      const text = "Smith v. Jones, 100 Idaho 1 (1990)."
      const cites = extractCitations(text)
      const caseCite = cites.find((c) => c.type === "case")
      expect(caseCite).toBeDefined()
    })

    it("does NOT break a legitimate `Id.` followed by a separate case (`...100 F.3d 1. Id. at 22. Then 200 F.3d 2.`)", () => {
      // Sanity guard: id + case (non-overlapping, separate citations) stay
      // intact when the fix is applied.
      const text = "See Smith, 100 F.3d 1. Id. at 22. Then 200 F.3d 2."
      const cites = extractCitations(text)
      expect(findOverlapPairs(cites)).toEqual([])
      expect(cites.find((c) => c.type === "id")).toBeDefined()
      expect(cites.filter((c) => c.type === "case").length).toBe(2)
    })

    it("`vol Ibid. page` produces id-only (Ibid. variant of #549)", () => {
      // Mirrors the `45 Id. 318` repro. IBID_PATTERN received the same
      // negative-lookahead fix as ID_PATTERN; this test pins that the fix
      // covers both regex shapes, not just `Id.`.
      const text = "Hawkins v. Giles, 45 Ibid. 318"
      const cites = extractCitations(text)
      expect(findOverlapPairs(cites)).toEqual([])

      const id = cites.find((c) => c.type === "id")
      expect(id).toBeDefined()

      const phantomCase = cites.find(
        (c) => c.type === "case" && c.span.cleanStart >= 18 && c.matchedText?.includes("Ibid."),
      )
      expect(phantomCase).toBeUndefined()
    })
  })

  describe("audit-style sanity check: no overlap pairs across all three repros", () => {
    const repros = [
      "Barrett, supra, 229 Conn. 274-76",
      "Hawkins v. Giles, 45 Id. 318",
      "Hawkins v. Giles, 45 Ibid. 318",
      "Chapter 29.82.160. Chapter 29.82 RCW",
    ]

    for (const text of repros) {
      it(`no overlap pairs in: ${text}`, () => {
        const cites = extractCitations(text)
        const overlaps = findOverlapPairs(cites)
        if (overlaps.length > 0) {
          const formatted = overlaps
            .map(
              ([a, b]) =>
                `(${a.type} [${a.span.cleanStart},${a.span.cleanEnd}] vs ${b.type} [${b.span.cleanStart},${b.span.cleanEnd}])`,
            )
            .join(", ")
          throw new Error(`expected no overlap pairs, got: ${formatted}`)
        }
        expect(overlaps).toEqual([])
      })
    }
  })
})
