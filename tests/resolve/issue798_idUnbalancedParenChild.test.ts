/**
 * Issue #798: `Id.` misresolves to a citation nested inside another cite's
 * explanatory parenthetical when the source text has a dropped/unbalanced
 * parenthesis (common in OCR/PDF). The #214 paren-child guard relies on a
 * running `(`/`)` depth counter; with a missing opening paren the nested cite
 * has depth 0 and is no longer flagged, so `Id.` resolves to the quoted-within
 * authority instead of the citing one.
 *
 * Fix: recognise the aside from its trigger word (`quoting`/`citing`/…) even
 * when the opening `(` is absent.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import type { ResolvedCitation } from "@/resolve/types"

const idResolvedTo = (text: string): number | undefined => {
  const cites = extractCitations(text, { resolve: true }) as ResolvedCitation[]
  const id = cites.find((c) => c.type === "id")
  return id?.resolution?.resolvedTo
}

describe("Issue #798: Id. trigger-anchored parenthetical-child detection", () => {
  it("regression: balanced aside still resolves Id. to the citing authority", () => {
    // Foo (neutral, idx 0) cites Bar v. Baz (idx 1) inside a balanced (quoting …)
    expect(idResolvedTo("Foo, 2020 IL 12345 (quoting Bar v. Baz, 100 N.E.3d 200). Id.")).toBe(0)
  })

  it("unbalanced neutral container: dropped opening paren still resolves Id. to Foo", () => {
    expect(idResolvedTo("Foo, 2020 IL 12345 quoting Bar v. Baz, 100 N.E.3d 200). Id.")).toBe(0)
  })

  it("unbalanced case container: dropped opening paren still resolves Id. to Foo v. Goo", () => {
    expect(idResolvedTo("Foo v. Goo, 500 U.S. 100 quoting Bar v. Baz, 200 U.S. 50). Id.")).toBe(0)
  })

  it("guard: a trigger word not directly introducing a cite must not mis-flag the later cite", () => {
    // `quoting from the record.` ends the sentence before Bar; Bar is a normal
    // top-level cite, so Id. must resolve to Bar (idx 1), not Foo (idx 0).
    expect(idResolvedTo("Foo, 100 U.S. 1, quoting from the record. Bar, 200 U.S. 2. Id.")).toBe(1)
  })
})
