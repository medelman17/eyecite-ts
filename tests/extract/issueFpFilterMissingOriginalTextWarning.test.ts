import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  _resetMissingOriginalTextWarning,
  applyFalsePositiveFilters,
} from "@/extract/filterFalsePositives"
import type { FullCaseCitation, StatuteCitation } from "@/types/citation"

/**
 * Issue #606 — `applyFalsePositiveFilters` silently skipped the
 * line-crossing check (#547) when `originalText` was omitted. Now
 * emits a one-time console.warn when called without `originalText`
 * AND the input contains case/shortFormCase citations (the only
 * types the line-crossing check applies to).
 */
describe("Issue #606 - missing-originalText warning", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    _resetMissingOriginalTextWarning()
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  function makeCaseAt(): FullCaseCitation {
    return {
      type: "case",
      text: "100 F.2d 123",
      span: { cleanStart: 0, cleanEnd: 12, originalStart: 0, originalEnd: 12 },
      confidence: 0.8,
      matchedText: "100 F.2d 123",
      processTimeMs: 0,
      patternsChecked: 1,
      volume: 100,
      reporter: "F.2d",
      page: 123,
    }
  }

  function makeStatuteAt(): StatuteCitation {
    return {
      type: "statute",
      text: "42 U.S.C. § 1983",
      span: { cleanStart: 0, cleanEnd: 16, originalStart: 0, originalEnd: 16 },
      confidence: 1.0,
      matchedText: "42 U.S.C. § 1983",
      processTimeMs: 0,
      patternsChecked: 1,
      title: 42,
      code: "U.S.C.",
      section: "1983",
      jurisdiction: "US",
    }
  }

  it("warns on first call without originalText when case cites present", () => {
    applyFalsePositiveFilters([makeCaseAt()], false)
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy.mock.calls[0][0]).toContain("originalText")
    expect(warnSpy.mock.calls[0][0]).toContain("#606")
  })

  it("does NOT re-warn on subsequent calls (one-time per process)", () => {
    applyFalsePositiveFilters([makeCaseAt()], false)
    applyFalsePositiveFilters([makeCaseAt()], false)
    applyFalsePositiveFilters([makeCaseAt()], false)
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })

  it("does NOT warn when originalText is explicitly passed", () => {
    applyFalsePositiveFilters([makeCaseAt()], false, "100 F.2d 123 some text")
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it("does NOT warn for pure non-case-cite inputs (nothing to skip)", () => {
    applyFalsePositiveFilters([makeStatuteAt()], false)
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it("does NOT warn on empty citation list", () => {
    applyFalsePositiveFilters([], false)
    expect(warnSpy).not.toHaveBeenCalled()
  })
})
