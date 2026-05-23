import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #643 — Treatise extractor missed the author-prefixed form
 * (`5A Charles Alan Wright & Arthur R. Miller, Federal Practice and
 * Procedure § 1357`) — Bluebook R15's canonical full-author form and
 * the dominant style in modern federal briefs.
 *
 * Fix: the volume admits an optional letter suffix (`5A`); a
 * bare-title alternation accepts the title without the embedded
 * author shortname; an optional author-prefix group sits between
 * the volume and the bare title. Compact form remains the primary
 * match so existing tests pass.
 */
describe("Issue #643 - treatise author-prefixed form", () => {
  it("`5A Charles Alan Wright & Arthur R. Miller, Federal Practice and Procedure § 1357`", () => {
    const cs = extractCitations(
      `5A Charles Alan Wright & Arthur R. Miller, Federal Practice and Procedure § 1357 (3d ed. 2004)`,
    ).filter((c) => c.type === "treatise")
    expect(cs).toHaveLength(1)
    const c = cs[0] as { volume?: number; title?: string; section?: string }
    expect(c.volume).toBe(5)
    expect(c.title).toBe("Federal Practice and Procedure")
    expect(c.section).toBe("1357")
    // Note: trailing `(3d ed. 2004)` after section is not yet captured
    // as edition/year — the existing pattern only handles edition-paren
    // BEFORE the section (as in `(5th ed. 2008) § 234`).
  })

  it("single-author prefix: `2 Wayne LaFave, Criminal Law § 5.1`", () => {
    const cs = extractCitations(`2 Wayne LaFave, Criminal Law § 5.1`).filter(
      (c) => c.type === "treatise",
    )
    expect(cs).toHaveLength(1)
    const c = cs[0] as { volume?: number; title?: string }
    expect(c.volume).toBe(2)
    expect(c.title).toBe("Criminal Law")
  })

  it("compact form preserved (regression): `5 Wright & Miller, Federal Practice and Procedure § 1290`", () => {
    const cs = extractCitations(
      `5 Wright & Miller, Federal Practice and Procedure § 1290`,
    ).filter((c) => c.type === "treatise")
    expect(cs).toHaveLength(1)
    const c = cs[0] as { title?: string }
    expect(c.title).toBe("Wright & Miller, Federal Practice and Procedure")
  })

  it("compact form with edition paren (regression): `1 Witkin, Cal. Procedure (5th ed. 2008) § 234`", () => {
    const cs = extractCitations(`1 Witkin, Cal. Procedure (5th ed. 2008) § 234`).filter(
      (c) => c.type === "treatise",
    )
    expect(cs).toHaveLength(1)
    const c = cs[0] as { title?: string; year?: number }
    expect(c.title).toBe("Witkin, Cal. Procedure")
    expect(c.year).toBe(2008)
  })

  it("sub-volume suffix `5A` parses as volume 5", () => {
    const cs = extractCitations(
      `5A Charles Alan Wright & Arthur R. Miller, Federal Practice and Procedure § 1357`,
    ).filter((c) => c.type === "treatise")
    expect((cs[0] as { volume?: number }).volume).toBe(5)
  })
})
