/**
 * Issue #843: `isFullCitation` omitted `regulation` and `stateRule` (18 of 20
 * full types), silently misclassifying them. Fix derives the guard from a single
 * runtime source (`FULL_CITATION_TYPES`) shared with `FullCitationType`, so the
 * type and guard can never drift apart.
 */

import { describe, expect, it } from "vitest"
import { FULL_CITATION_TYPES, SHORT_FORM_CITATION_TYPES } from "@/types/citation"
import type { Citation } from "@/types/citation"
import { isFullCitation, isShortFormCitation } from "@/types/guards"

// The guards only read `.type`; a minimal object suffices.
const minimal = (type: string): Citation => ({ type }) as unknown as Citation

describe("#843 isFullCitation single-source guard", () => {
  it("returns true for `regulation` (was silently false)", () => {
    expect(isFullCitation(minimal("regulation"))).toBe(true)
  })

  it("returns true for `stateRule` (was silently false)", () => {
    expect(isFullCitation(minimal("stateRule"))).toBe(true)
  })

  it("exhaustive: every FullCitationType literal is recognized as a full citation", () => {
    for (const t of FULL_CITATION_TYPES) {
      expect(isFullCitation(minimal(t)), `isFullCitation should accept "${t}"`).toBe(true)
    }
  })

  it("exhaustive: no ShortFormCitationType literal is a full citation", () => {
    for (const t of SHORT_FORM_CITATION_TYPES) {
      expect(isFullCitation(minimal(t)), `isFullCitation should reject "${t}"`).toBe(false)
    }
  })

  it("isShortFormCitation is the exact complement of isFullCitation", () => {
    for (const t of SHORT_FORM_CITATION_TYPES) {
      expect(isShortFormCitation(minimal(t)), `isShortFormCitation should accept "${t}"`).toBe(true)
    }
    for (const t of FULL_CITATION_TYPES) {
      expect(isShortFormCitation(minimal(t)), `isShortFormCitation should reject "${t}"`).toBe(false)
    }
  })

  it("the two type inventories are disjoint and cover the discriminator space", () => {
    const full = new Set<string>(FULL_CITATION_TYPES)
    for (const t of SHORT_FORM_CITATION_TYPES) expect(full.has(t)).toBe(false)
    expect(FULL_CITATION_TYPES.length + SHORT_FORM_CITATION_TYPES.length).toBe(23)
  })
})
