/**
 * #553 — Journal cites with hyphenated year paren `(1965-1966)` produce
 * `year=undefined`.
 *
 * Case cites with the same paren get `year=1965` correctly because
 * `parseDate("1965-1966")` falls through to the year-only matcher and
 * returns 1965. The journal extractor uses a custom regex
 * (`/\((?:.*?\s)?(\d{4})\)/`) that requires the year to be immediately
 * adjacent to the closing paren, which excludes the hyphenated form.
 *
 * Fix: extend the year capture to optionally absorb a trailing
 * `[-–—]\d{4}` range. Hyphen, en-dash, and em-dash are accepted (some
 * journals use typographic dashes).
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"
import type { JournalCitation } from "@/types/citation"

describe("#553 journal hyphenated-year paren", () => {
  it("`(1965-1966)` extracts year 1965 on journal cite", () => {
    const cites = extractCitations(
      "Smith, 79 Harv. L. Rev. 366, 368 (1965-1966)",
    ) as JournalCitation[]
    expect(cites[0]?.type).toBe("journal")
    expect(cites[0]?.year).toBe(1965)
  })

  it("`(1965-66)` (short range) extracts year 1965", () => {
    // Common journals shorthand. Two-digit suffix is NOT a separate year —
    // we still capture the leading 4-digit year.
    const cites = extractCitations(
      "Author, 79 Harv. L. Rev. 366 (1965-66)",
    ) as JournalCitation[]
    expect(cites[0]?.year).toBe(1965)
  })

  it("`(1965–1966)` with en-dash extracts year 1965", () => {
    const cites = extractCitations(
      "Author, 79 Harv. L. Rev. 366 (1965–1966)",
    ) as JournalCitation[]
    expect(cites[0]?.year).toBe(1965)
  })

  it("`(1965—1966)` with em-dash extracts year 1965", () => {
    const cites = extractCitations(
      "Author, 79 Harv. L. Rev. 366 (1965—1966)",
    ) as JournalCitation[]
    expect(cites[0]?.year).toBe(1965)
  })

  it("`(2020)` simple year still works (regression)", () => {
    const cites = extractCitations(
      "Author, 79 Harv. L. Rev. 366 (2020)",
    ) as JournalCitation[]
    expect(cites[0]?.year).toBe(2020)
  })

  it("`(Spring 2020)` season + year still works (regression)", () => {
    const cites = extractCitations(
      "Author, 79 Harv. L. Rev. 366 (Spring 2020)",
    ) as JournalCitation[]
    expect(cites[0]?.year).toBe(2020)
  })

  it("hyphenated-year paren rejects implausible first year (#523 interaction)", () => {
    const cites = extractCitations(
      "Author, 79 Harv. L. Rev. 366 (1372-1373)",
    ) as JournalCitation[]
    expect(cites[0]?.year).toBeUndefined()
  })
})
