import { describe, expect, it } from "vitest"
import { computeProseOffsets } from "@/document/proseOffsets"
import { extractCitations } from "@/extract"

describe("computeProseOffsets", () => {
  it("returns no prose spans for empty text", () => {
    const result = computeProseOffsets("", [])
    expect(result.proseSpans).toEqual([])
    expect(result.precedingProse.size).toBe(0)
    expect(result.followingProse.size).toBe(0)
  })

  it("returns one prose span covering the whole text when no citations", () => {
    const text = "just prose, no citations at all here"
    const result = computeProseOffsets(text, [])
    expect(result.proseSpans).toHaveLength(1)
    expect(result.proseSpans[0].originalStart).toBe(0)
    expect(result.proseSpans[0].originalEnd).toBe(text.length)
  })

  it("returns no prose spans when text is entirely a single citation", () => {
    const text = "100 F.2d 50"
    const cites = extractCitations(text)
    if (cites.length === 1) {
      const result = computeProseOffsets(text, cites)
      expect(result.proseSpans).toEqual([])
    }
  })

  it("emits prose before, between, and after citations", () => {
    const text =
      "Intro prose. Smith v. Jones, 100 F.2d 50 (1990). Middle prose. Brown v. Doe, 200 F.3d 100 (2000). Closing prose."
    const cites = extractCitations(text)
    expect(cites).toHaveLength(2)
    const result = computeProseOffsets(text, cites)
    expect(result.proseSpans).toHaveLength(3)
    const firstSpanText = text.slice(
      result.proseSpans[0].originalStart,
      result.proseSpans[0].originalEnd,
    )
    expect(firstSpanText).toContain("Intro prose")
  })

  it("uses fullSpan, not span, to bound citations (case names are not prose)", () => {
    const text = "Smith v. Jones, 100 F.2d 50, 55 (1990). End."
    const cites = extractCitations(text)
    const result = computeProseOffsets(text, cites)
    expect(result.proseSpans.length).toBeGreaterThan(0)
    const lastSpan = result.proseSpans[result.proseSpans.length - 1]
    const lastText = text.slice(lastSpan.originalStart, lastSpan.originalEnd)
    expect(lastText).toContain("End")
    if (result.proseSpans[0].originalStart === 0) {
      const firstText = text.slice(
        result.proseSpans[0].originalStart,
        result.proseSpans[0].originalEnd,
      )
      expect(firstText).not.toContain("Smith")
    }
  })

  it("populates precedingProse and followingProse per citation", () => {
    const text =
      "Intro. Smith v. Jones, 100 F.2d 50 (1990). Middle. Brown v. Doe, 200 F.3d 100 (2000). End."
    const cites = extractCitations(text)
    expect(cites).toHaveLength(2)
    const result = computeProseOffsets(text, cites)

    expect(result.precedingProse.has(0)).toBe(true)
    expect(result.followingProse.has(0)).toBe(true)
    expect(result.precedingProse.has(1)).toBe(true)
    expect(result.followingProse.has(1)).toBe(true)
  })

  it("sets cleanStart === originalStart when no transformationMap is provided", () => {
    const text = "Intro. Smith v. Jones, 100 F.2d 50 (1990). End."
    const cites = extractCitations(text)
    const result = computeProseOffsets(text, cites)
    for (const span of result.proseSpans) {
      expect(span.cleanStart).toBe(span.originalStart)
      expect(span.cleanEnd).toBe(span.originalEnd)
    }
  })

  // Issue #535 / #536: computeProseOffsets used getCitationStart/End (which
  // return CLEAN coords) as ORIGINAL coords. When the input text contains
  // anything that shifts positions during cleaning (smart quotes, HTML
  // entities, repeated whitespace, Unicode), prose spans had wrong original
  // coordinates and slicing `text` (original) with those coords returned
  // text from the wrong offsets.
  describe("preserves original-text coordinates when cleaning shifts positions (#535, #536)", () => {
    // Direct test: hand-craft citations with known clean/original offset gaps
    // and assert that prose-span original coords align with citation original
    // coords (NOT clean coords).
    it("prose spans use citation ORIGINAL coords, not CLEAN coords (direct, with known offsets)", () => {
      // Imagine an opinion with HTML markup or repeated whitespace that adds
      // 5 chars to the original text vs the cleaned text. Two citations:
      // - cite A spans original [50, 70), clean [40, 60)
      // - cite B spans original [120, 140), clean [110, 130)
      // After cite A there should be prose at original [70, 120).
      // BEFORE the fix, the buggy code emits prose at original [60, 110)
      // (using clean coords for original).
      const original = `${"A".repeat(50)}cite-A-original-text!${"B".repeat(50)}cite-B-original-text!${"C".repeat(40)}`
      const cites = [
        {
          type: "case" as const,
          text: "cite-A-original-text",
          matchedText: "cite-A-original-text",
          confidence: 1.0,
          processTimeMs: 0,
          patternsChecked: 0,
          span: {
            cleanStart: 40,
            cleanEnd: 60,
            originalStart: 50,
            originalEnd: 70,
          },
        } as unknown as Parameters<typeof computeProseOffsets>[1][number],
        {
          type: "case" as const,
          text: "cite-B-original-text",
          matchedText: "cite-B-original-text",
          confidence: 1.0,
          processTimeMs: 0,
          patternsChecked: 0,
          span: {
            cleanStart: 110,
            cleanEnd: 130,
            originalStart: 120,
            originalEnd: 140,
          },
        } as unknown as Parameters<typeof computeProseOffsets>[1][number],
      ]

      const result = computeProseOffsets(original, cites)

      // Three prose spans: before A, between A and B, after B.
      expect(result.proseSpans).toHaveLength(3)

      // Each span's text, sliced from ORIGINAL using its originalStart/End,
      // must NOT contain any of "cite-A-original-text" or "cite-B-original-text".
      for (const span of result.proseSpans) {
        const sliced = original.slice(span.originalStart, span.originalEnd)
        expect(sliced).not.toContain("cite-A-original-text")
        expect(sliced).not.toContain("cite-B-original-text")
      }

      // Specifically:
      //   prose[0] aligns to cite-A's original boundaries:  originalStart=0, originalEnd=cite[0].originalStart
      //   prose[1] sits between A's end and B's start (original coords)
      //   prose[2] is the trailing tail after B
      expect(result.proseSpans[0].originalStart).toBe(0)
      expect(result.proseSpans[0].originalEnd).toBe(50)
      expect(result.proseSpans[1].originalStart).toBe(70)
      expect(result.proseSpans[1].originalEnd).toBe(120)
      expect(result.proseSpans[2].originalStart).toBe(140)
      expect(result.proseSpans[2].originalEnd).toBe(original.length)

      // And clean coords should align with citation clean coords:
      expect(result.proseSpans[1].cleanStart).toBe(60)
      expect(result.proseSpans[1].cleanEnd).toBe(110)
    })

    it("prose-span original coords match the citations' original coords (smart quotes)", () => {
      // Smart-quoted text triggers Unicode normalization in cleaning, which
      // can shift positions when the smart quotes get normalized to ASCII.
      const text =
        "The court “held” that " +
        "Smith v. Jones, 100 F.2d 50 (1990), was wrong. " +
        "Then “noted” further that " +
        "Brown v. Doe, 200 F.3d 100 (2000), agreed. " +
        "End."
      const cites = extractCitations(text)
      expect(cites).toHaveLength(2)

      const result = computeProseOffsets(text, cites)

      // Every prose span's text, when sliced from the ORIGINAL text using
      // originalStart/originalEnd, must NOT cut into a citation.
      for (const span of result.proseSpans) {
        const sliced = text.slice(span.originalStart, span.originalEnd)
        for (const c of cites) {
          // Prose should not contain the literal volume/reporter/page of any
          // citation it's meant to surround.
          expect(sliced).not.toContain("100 F.2d 50")
          expect(sliced).not.toContain("200 F.3d 100")
          void c
        }
      }

      // followingProse[0] should start at or after the END of cite[0] in
      // ORIGINAL coords.
      const cite0End = cites[0].span.originalEnd
      const following0 = result.followingProse.get(0)
      expect(following0).toBeDefined()
      expect(following0!.originalStart).toBeGreaterThanOrEqual(cite0End)
    })

    it("prose-span original coords align with citation original boundaries (collapsed whitespace)", () => {
      // Repeated whitespace gets collapsed during cleaning, shifting clean
      // positions earlier than original positions.
      const text =
        "Intro.    See   " + // multiple spaces — get collapsed during clean
        "Smith v. Jones, 100 F.2d 50 (1990).    " +
        "Then    note   " +
        "Brown v. Doe, 200 F.3d 100 (2000).    " +
        "End."
      const cites = extractCitations(text)
      expect(cites.length).toBeGreaterThanOrEqual(2)

      const result = computeProseOffsets(text, cites)

      // For every citation that has a followingProse entry, the entry's
      // originalStart must equal the citation's originalEnd (modulo fullSpan).
      for (let i = 0; i < cites.length; i++) {
        const following = result.followingProse.get(i)
        if (!following) continue
        // Slicing original text with the follow-prose span must NOT include
        // the cite's volume/reporter/page.
        const tail = text.slice(following.originalStart, following.originalEnd)
        const c = cites[i] as { volume?: number | string; reporter?: string; page?: number | string }
        if (typeof c.volume === "number" || typeof c.volume === "string") {
          expect(tail).not.toContain(`${c.volume} ${c.reporter} ${c.page}`)
        }
      }

      // Each prose span's text, sliced from the original, must NOT contain
      // any of the citation cores.
      for (const span of result.proseSpans) {
        const sliced = text.slice(span.originalStart, span.originalEnd)
        expect(sliced).not.toContain("100 F.2d 50")
        expect(sliced).not.toContain("200 F.3d 100")
      }
    })
  })
})
