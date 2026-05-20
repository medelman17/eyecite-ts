/**
 * Tests for #562 — HTML entity decoder gaps in `decodeHtmlEntities`.
 *
 * Three bugs:
 *   - `&ndash;` and `&mdash;` (en/em dashes) weren't in the named-entity
 *     table. Both are common in page-range citations (`100&ndash;105`)
 *     and stylistic dashes in court opinions (`as such&mdash;a court of
 *     equity`).
 *   - The hex numeric-entity regex required a lowercase `x`
 *     (`&#x167;`), but uppercase `X` (`&#X167;`) is equally valid per
 *     HTML — they're case-insensitive.
 *   - `String.fromCharCode` silently truncates code points above
 *     `0xFFFF`, producing empty or garbage output for astral-plane
 *     characters (`&#128512;` for U+1F600 GRINNING FACE). Should use
 *     `String.fromCodePoint`, with a bounds check so out-of-range
 *     values (> `0x10FFFF`) fall back to the original entity instead
 *     of throwing.
 */
import { describe, expect, it } from "vitest"
import { decodeHtmlEntities } from "../../src/clean/cleaners"

describe("decodeHtmlEntities — named en/em dashes (#562)", () => {
  it("decodes &ndash; to U+2013 EN DASH", () => {
    expect(decodeHtmlEntities("Pages 100&ndash;105")).toBe("Pages 100–105")
  })

  it("decodes &mdash; to U+2014 EM DASH", () => {
    expect(decodeHtmlEntities("as such&mdash;a court of equity")).toBe(
      "as such—a court of equity",
    )
  })

  it("case-insensitive for both", () => {
    expect(decodeHtmlEntities("&NDASH;")).toBe("–")
    expect(decodeHtmlEntities("&MDASH;")).toBe("—")
    expect(decodeHtmlEntities("&NdAsH;")).toBe("–")
  })
})

describe("decodeHtmlEntities — uppercase X in hex (#562)", () => {
  it("decodes &#X00A7; (uppercase X) as the section sign", () => {
    // U+00A7 SECTION SIGN. Capital `X` is valid per HTML — `x` is
    // case-insensitive in the numeric hex form.
    expect(decodeHtmlEntities("42 U.S.C. &#X00A7; 1983")).toBe("42 U.S.C. § 1983")
  })

  it("decodes &#x00A7; (lowercase x) as the section sign", () => {
    expect(decodeHtmlEntities("42 U.S.C. &#x00A7; 1983")).toBe("42 U.S.C. § 1983")
  })

  it("uppercase X and lowercase x produce the same result", () => {
    expect(decodeHtmlEntities("&#X167;")).toBe(decodeHtmlEntities("&#x167;"))
  })

  it("decodes mixed hex digits with uppercase X", () => {
    // Pilcrow ¶ U+00B6
    expect(decodeHtmlEntities("&#XB6;")).toBe("¶")
  })
})

describe("decodeHtmlEntities — astral-plane code points (#562)", () => {
  it("decodes &#128512; (U+1F600 GRINNING FACE) without truncating", () => {
    expect(decodeHtmlEntities("Smiley: &#128512;")).toBe("Smiley: \u{1F600}")
  })

  it("decodes &#x1F600; (hex form) without truncating", () => {
    expect(decodeHtmlEntities("Smiley: &#x1F600;")).toBe("Smiley: \u{1F600}")
  })

  it("decodes BMP characters correctly", () => {
    // U+00A7 SECTION SIGN — 167 decimal, x00A7 hex (NOT x167 — that's
    // U+0167 LATIN SMALL LETTER T WITH STROKE).
    expect(decodeHtmlEntities("&#167;")).toBe("§")
    expect(decodeHtmlEntities("&#x00A7;")).toBe("§")
  })

  it("leaves out-of-range numeric entities intact (does not throw)", () => {
    // 0x110000 is one past the maximum Unicode code point.
    expect(decodeHtmlEntities("&#1114112;")).toBe("&#1114112;")
    expect(decodeHtmlEntities("&#x110000;")).toBe("&#x110000;")
    // Negative / absurd values stay as-is too.
    expect(decodeHtmlEntities("&#99999999;")).toBe("&#99999999;")
  })

  it("does not crash on the empty-numeric edge case", () => {
    // Not a valid entity — should pass through unchanged.
    expect(decodeHtmlEntities("&#;")).toBe("&#;")
  })
})

describe("decodeHtmlEntities — regression: existing entities still work", () => {
  it("&sect; → §", () => {
    expect(decodeHtmlEntities("42 U.S.C. &sect; 1983")).toBe("42 U.S.C. § 1983")
  })
  it("&para; → ¶", () => {
    expect(decodeHtmlEntities("&para;14")).toBe("¶14")
  })
  it("&amp; → &", () => {
    expect(decodeHtmlEntities("Smith &amp; Jones")).toBe("Smith & Jones")
  })
  it("&nbsp; → space", () => {
    expect(decodeHtmlEntities("a&nbsp;b")).toBe("a b")
  })
  it("&lt; / &gt;", () => {
    expect(decodeHtmlEntities("a &lt;= b &gt;= c")).toBe("a <= b >= c")
  })
  it("&quot; / &apos;", () => {
    expect(decodeHtmlEntities("he said &quot;hi&quot; she said &apos;hi&apos;")).toBe(
      "he said \"hi\" she said 'hi'",
    )
  })
})
