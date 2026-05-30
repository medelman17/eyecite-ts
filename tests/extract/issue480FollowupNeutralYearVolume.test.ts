/**
 * Year-as-volume neutral citations should not be filtered as false
 * positives. Reporters like "NY Slip Op", "WL", "LEXIS", and Illinois /
 * Ohio neutrals use the *year* as the volume number — so a 2026 NY Slip
 * Op citation has volume=2026, which collides with the existing
 * MAX_PLAUSIBLE_VOLUME (2000) zip-code heuristic.
 *
 * These tests pin the desired behavior: a citation whose volume is a
 * plausible 4-digit year (1900–2099) passes the implausible-volume
 * filter regardless of whether it exceeds 2000.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"

describe("Year-as-volume neutral citations survive filterFalsePositives", () => {
  it("extracts NY Slip Op with year=2026 under filterFalsePositives", () => {
    const text =
      "In People v. Henderson, 2026 NY Slip Op 01627 (2026), the Court of " +
      "Appeals again reversed a conviction for erroneous admission of Molineux " +
      "evidence."

    const cites = extractCitations(text, { filterFalsePositives: true })
    expect(cites).toHaveLength(1)
    // NY Slip Op is a neutral citation (#692): the leading 4-digit number is the
    // year (not a volume), and it survives the implausible-volume filter.
    expect(cites[0].type).toBe("neutral")
    const cit = cites[0] as { year: number; database?: string; documentNumber?: string }
    expect(cit.year).toBe(2026)
    expect(cit.database).toBe("NY Slip Op")
    expect(cit.documentNumber).toBe("01627")
  })

  it("extracts 2030 NY Slip Op (future-year safety)", () => {
    const text = "See People v. Future, 2030 NY Slip Op 00001."
    const cites = extractCitations(text, { filterFalsePositives: true })
    expect(cites.length).toBeGreaterThanOrEqual(1)
  })

  it("still filters obvious zip-code-shaped 5-digit volumes", () => {
    // 5-digit "volume" with prose-shaped reporter — clearly not a citation.
    const text = "Counsel for Appellant, DC 20006 Counsel for Appellees 20004."
    const cites = extractCitations(text, { filterFalsePositives: true })
    expect(cites).toHaveLength(0)
  })

  it("still filters non-year 4-digit volumes outside plausible year range", () => {
    // Volume 3500 is too large to be a year and too large to be a real reporter
    // volume. Should still be filtered.
    const text = "Fake v. Cite, 3500 F.3d 5 (2024)."
    const cites = extractCitations(text, { filterFalsePositives: true })
    expect(cites).toHaveLength(0)
  })
})
