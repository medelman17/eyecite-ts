import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { JournalCitation } from "@/types/citation"

const journals = (text: string): JournalCitation[] =>
  extractCitations(text).filter((c): c is JournalCitation => c.type === "journal")

/**
 * Issue #615 — journalPatterns over-matches in standalone prose.
 *
 * The journal-name capture (`[A-Z][A-Za-z.&']*(?:\s+[A-Z\d&][A-Za-z.&']*)*?`)
 * has no period requirement and no journals-db gate, so any
 * `[volume] [Capitalized Run] [page]` shape will tokenize as a journal —
 * including pure prose like `1974 Senator Smith Jones 500`.
 *
 * Real journal abbreviations are either:
 *   - single words (`Neurology`, `JAMA`, `Science`), OR
 *   - contain at least one period (`Harv. L. Rev.`), OR
 *   - contain at least one short word ≤2 chars (`Brook L Rev`, `Yale L J`).
 *
 * Multi-word captures lacking BOTH a period AND a short word are dropped
 * at extract time as phantoms.
 */
describe("Issue #615 — journal phantom-prose filter", () => {
  it("`In 1974 Senator Smith Jones 500 cases` does not emit a phantom journal", () => {
    const cs = journals("In 1974 Senator Smith Jones 500 cases were filed.")
    expect(cs).toHaveLength(0)
  })

  it("`1974 Some Capitalized Words 500` does not emit a phantom journal", () => {
    const cs = journals("Around 1974 Some Capitalized Words 500 of them existed.")
    expect(cs).toHaveLength(0)
  })

  it("`70 Brook L Rev 1045` (multi-word no-period with short token) still extracts", () => {
    const cs = journals("70 Brook L Rev 1045")
    expect(cs).toHaveLength(1)
    expect(cs[0].abbreviation).toBe("Brook L Rev")
  })

  it("`96 Yale L J 1234` (multi-word no-period with short tokens) still extracts", () => {
    const cs = journals("96 Yale L J 1234")
    expect(cs).toHaveLength(1)
    expect(cs[0].abbreviation).toBe("Yale L J")
  })

  it("`53 Neurology 1107` (single-word) still extracts", () => {
    const cs = journals("53 Neurology 1107")
    expect(cs).toHaveLength(1)
    expect(cs[0].abbreviation).toBe("Neurology")
  })

  it("`100 Harv. L. Rev. 500` (canonical with periods) still extracts", () => {
    const cs = journals("100 Harv. L. Rev. 500")
    expect(cs).toHaveLength(1)
    expect(cs[0].abbreviation).toBe("Harv. L. Rev.")
  })

  it("`285 JAMA 2486` (single-word acronym) still extracts", () => {
    const cs = journals("285 JAMA 2486")
    expect(cs).toHaveLength(1)
    expect(cs[0].abbreviation).toBe("JAMA")
  })
})
