/**
 * Built-in text cleaner functions for preprocessing legal documents.
 *
 * Each cleaner is a simple transformation: (text: string) => string
 * Cleaners can be composed via the cleanText() pipeline.
 */

/**
 * Remove all HTML tags from text.
 *
 * Three pre-passes run before the generic tag stripper:
 *
 *   1. `<script>...</script>` bodies are deleted in full. Browsers never
 *      render script source as text, but a naive tag stripper would keep
 *      the JS body — including string literals like `"999 F.2d 999"` —
 *      and the tokenizer would happily emit a phantom citation from it
 *      (#559).
 *   2. `<style>...</style>` bodies are deleted in full for the same
 *      reason (CSS `content:` values, comments, etc.).
 *   3. `<![CDATA[...]]>` markers are stripped while their bodies are
 *      preserved. The generic tag regex treats the entire CDATA section
 *      as one greedy "tag" (the leading `!` is allowed and there is no
 *      `>` inside until the very end), which previously DELETED the
 *      citation embedded in the section (#561).
 *
 * After those pre-passes, generic tag stripping runs:
 *
 * When a tag (or run of adjacent tags) sits between two word characters,
 * insert a single space in its place to preserve the token boundary.
 * Without this guard, adjacent reporter citations separated only by a
 * footnote tag — e.g. `100 F.3d 200<footnote>200 F.3d 300</footnote>` —
 * fuse into a single `200200` digit run that the tokenizer reads as one
 * malformed citation (#542).
 *
 * Non-word neighbors (spaces, punctuation, the start or end of the
 * string) keep the original behavior: tags are removed with no insertion.
 *
 * The tag-matching regex is intentionally conservative — only opening
 * sequences that look like real HTML (`<` followed by a letter, `/`, or
 * `!` for `<!doctype>`/`<!--…-->`) are stripped. This prevents OCR
 * artifacts in CAP opinions — e.g. a stray `<` in `to< waive any
 * objection` paired with a stray `>` thousands of characters later — from
 * triggering a catastrophic greedy match that deletes legitimate prose
 * (#546). Genuine `<` characters in prose (math, code samples) are left
 * intact.
 *
 * @example
 * stripHtmlTags("Smith v. <b>Doe</b>, 500 F.2d 123")
 * // => "Smith v. Doe, 500 F.2d 123"
 *
 * @example
 * stripHtmlTags('100 F.3d 200<footnote>200 F.3d 300</footnote>')
 * // => "100 F.3d 200 200 F.3d 300 "
 *
 * @example
 * stripHtmlTags("the value < 3 means")
 * // => "the value < 3 means"   // stray `<` is not a tag — left alone
 *
 * @example
 * stripHtmlTags('<script>x = "999 F.2d 999";</script><p>500 F.2d 123</p>')
 * // => "500 F.2d 123"          // script body deleted (#559)
 *
 * @example
 * stripHtmlTags("<![CDATA[500 F.2d 123]]>")
 * // => "500 F.2d 123"          // CDATA markers stripped, body kept (#561)
 */
export function stripHtmlTags(text: string): string {
  // Pre-pass 1+2: delete script/style bodies (tag + body + close tag).
  // Body matching is non-greedy across any character (including newlines)
  // so the shortest matching close wins — pathological unclosed openers
  // therefore do not eat the rest of the document. The `[^>]*` after the
  // tag name absorbs attributes (`<script type="..." src="...">`). The
  // close tag's name match is case-insensitive via the `i` flag.
  let stripped = text.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
  stripped = stripped.replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "")

  // Pre-pass 3: unwrap CDATA sections — keep the body, drop the markers.
  // Done BEFORE the generic tag regex because that regex would otherwise
  // match the entire `<![CDATA[…]]>` span as one greedy "tag" and delete
  // the citation inside it (#561). Non-greedy + `[\s\S]` for multi-line
  // sections.
  stripped = stripped.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")

  // Generic tag stripping. Collapse adjacent tag runs together so the
  // boundary check sees the characters surrounding the whole run, not
  // each tag individually.
  //
  // Tag shape: `<` followed by a letter / `/` / `!`, then any non-`>`
  // characters except newline (real HTML tags never contain raw newlines —
  // CR/LF inside an attribute value is technically allowed but vanishingly
  // rare; this restriction is what stops the greedy match across a long
  // body of prose containing stray angle brackets, #546).
  return stripped.replace(/(?:<[a-zA-Z/!][^>\n\r]*>)+/g, (match, offset: number) => {
    const before = offset > 0 ? stripped[offset - 1] : ""
    const afterIdx = offset + match.length
    const after = afterIdx < stripped.length ? stripped[afterIdx] : ""
    return /\w/.test(before) && /\w/.test(after) ? " " : ""
  })
}

/**
 * Rejoin words split across line breaks by a hyphen.
 *
 * Court opinions often wrap long words (party names, reporter abbreviations)
 * with a hyphen at the line break: "Dil-\nlinger" or "F. Sup-\np. 3d".
 * This cleaner removes the hyphen + line break to restore the original word.
 *
 * Must run before normalizeWhitespace (which converts \n to spaces, leaving
 * "Dil- linger" instead of "Dillinger").
 *
 * @example
 * rejoinHyphenatedWords("Dil-\nlinger V, 672 F. Supp. 3d")
 * // => "Dillinger V, 672 F. Supp. 3d"
 *
 * @example
 * rejoinHyphenatedWords("F. Sup-\np. 3d 100")
 * // => "F. Supp. 3d 100"
 */
export function rejoinHyphenatedWords(text: string): string {
  return text.replace(/(\w)-\s*[\n\r]+\s*(\w)/g, "$1$2")
}

/**
 * Replace each whitespace character (tab, newline, etc.) with a regular space.
 * Does NOT collapse consecutive spaces — that's a separate step so the position
 * mapper can handle each transformation type correctly (same-length replacement
 * vs. length-reducing collapse).
 *
 * @example
 * replaceWhitespace("Smith\tv.\nDoe")
 * // => "Smith v. Doe"
 */
export function replaceWhitespace(text: string): string {
  return text.replace(/[\t\n\r\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, " ")
}

/**
 * Collapse runs of multiple spaces into a single space.
 *
 * @example
 * collapseSpaces("Smith  v.  Doe,   500 F.2d 123")
 * // => "Smith v. Doe, 500 F.2d 123"
 */
export function collapseSpaces(text: string): string {
  return text.replace(/ {2,}/g, " ")
}

/**
 * Normalize whitespace: convert tabs/newlines to spaces, collapse multiple spaces.
 * Kept for backwards compatibility — new pipeline uses replaceWhitespace + collapseSpaces.
 *
 * @example
 * normalizeWhitespace("Smith  v.  Doe,   500 F.2d 123")
 * // => "Smith v. Doe, 500 F.2d 123"
 */
export function normalizeWhitespace(text: string): string {
  return text.replace(/[\t\n\r\u00A0\u2000-\u200A\u202F\u205F\u3000]+/g, " ").replace(/ {2,}/g, " ")
}

/**
 * Apply Unicode NFKC normalization (ligatures → separate chars).
 *
 * @example
 * normalizeUnicode("Smith v. Doe, 500 F.2d 123") // with ligature "ﬁ"
 * // => "Smith v. Doe, 500 F.2d 123" // normalized
 */
export function normalizeUnicode(text: string): string {
  return text.normalize("NFKC")
}

/**
 * Replace curly quotes and apostrophes with straight quotes.
 *
 * @example
 * fixSmartQuotes(""Smith" v. 'Doe', 500 F.2d 123")
 * // => "\"Smith\" v. 'Doe', 500 F.2d 123"
 */
export function fixSmartQuotes(text: string): string {
  return text
    .replace(/[\u201C\u201D]/g, '"') // curly double quotes
    .replace(/[\u2018\u2019]/g, "'") // curly single quotes/apostrophes
}

/**
 * Remove underscore OCR artifacts (common in scanned documents).
 *
 * @example
 * removeOcrArtifacts("Smith v. Doe, 500 F._2d 123")
 * // => "Smith v. Doe, 500 F.2d 123"
 */
export function removeOcrArtifacts(text: string): string {
  return text.replace(/_/g, "")
}

/**
 * Normalize Unicode dashes to ASCII equivalents.
 *
 * En-dash (U+2013) maps to a single hyphen (page ranges like 105–107).
 *
 * Em-dash (U+2014) is context-aware: between word characters (Illinois
 * Revised Statutes paragraph subdivisions like `par. 13—214`,
 * docket-number separators like `No. 84—C—4508`, page-range pincites
 * like `875—877`) it maps to a single hyphen; standalone (the
 * `500 F.4th — (2024)` blank-page placeholder) it maps to triple
 * hyphen so the existing `-{3,}` blank-page pattern still matches.
 *
 * The in-word substitution runs first with zero-width
 * lookbehind/lookahead so adjacent em-dashes (`84—C—4508`) are both
 * rewritten in one pass and don't fall through to the blank-page rule
 * (#333).
 *
 * @example
 * normalizeDashes("500 F.2d 123, 125–130")  // en-dash in range
 * // => "500 F.2d 123, 125-130"
 *
 * @example
 * normalizeDashes("par. 13—214(a)")  // in-word em-dash (#333)
 * // => "par. 13-214(a)"
 *
 * @example
 * normalizeDashes("No. 84—C—4508")  // docket separator (#333)
 * // => "No. 84-C-4508"
 *
 * @example
 * normalizeDashes("500 F.4th — (2024)")  // em-dash blank page
 * // => "500 F.4th --- (2024)"
 */
export function normalizeDashes(text: string): string {
  return text
    .replace(/(?<=\w)[\u2014\u2015](?=\w)/g, "-") // in-word em-dash \u2192 hyphen (#333)
    .replace(/[\u2014\u2015]/g, "---") // standalone em-dash, horizontal bar → triple hyphen
    .replace(/[\u2010\u2012\u2013]/g, "-") // hyphen, figure dash, en-dash → hyphen
}

/** Maximum valid Unicode code point (per the Unicode standard). Code points
 *  above this are not assignable; `String.fromCodePoint` throws RangeError. */
const MAX_UNICODE_CODE_POINT = 0x10ffff

/** Convert a numeric code point to a string, or return undefined if the value
 *  is out of the valid Unicode range. Used by `decodeHtmlEntities` so it can
 *  leave malformed entities intact rather than throwing. */
function codePointToString(code: number): string | undefined {
  if (Number.isNaN(code) || code < 0 || code > MAX_UNICODE_CODE_POINT) {
    return undefined
  }
  // `String.fromCodePoint` is the correct surrogate-pair-aware constructor.
  // The previous use of `String.fromCharCode` silently truncated any code
  // point above 0xFFFF, producing empty / garbage output for astral-plane
  // characters such as `&#128512;` (U+1F600 GRINNING FACE) — #562.
  return String.fromCodePoint(code)
}

/**
 * Decode common HTML entities relevant to legal text.
 *
 * Handles named entities (`&sect;`, `&para;`, `&amp;`, `&nbsp;`, `&ndash;`,
 * `&mdash;`, etc.) and numeric entities (`&#NNN;` and `&#xHHH;`). Should be
 * called after `stripHtmlTags` to decode any remaining entities.
 *
 * En-dash and em-dash named forms (#562) are decoded because they are
 * common in page-range pincites (`100&ndash;105`) and stylistic dashes in
 * court opinions (`as such&mdash;a court of equity`). The downstream
 * `normalizeDashes` cleaner subsequently rewrites them to ASCII hyphens
 * (or to the blank-page `---` placeholder for standalone em-dashes).
 *
 * The hex numeric form accepts both lowercase `&#x167;` and uppercase
 * `&#X167;` (HTML treats the `x` as case-insensitive). Code-point
 * conversion uses `String.fromCodePoint` so astral-plane characters
 * (code point > 0xFFFF, e.g. `&#128512;` for U+1F600) are not truncated
 * to an empty / lone-surrogate string. Out-of-range or otherwise invalid
 * entities are left intact rather than throwing.
 *
 * @example
 * decodeHtmlEntities("42 U.S.C. &sect; 1983")
 * // => "42 U.S.C. § 1983"
 *
 * @example
 * decodeHtmlEntities("Smith &amp; Jones, 500 F.2d 123")
 * // => "Smith & Jones, 500 F.2d 123"
 *
 * @example
 * decodeHtmlEntities("Pages 100&ndash;105")
 * // => "Pages 100–105"            // en-dash, later normalized to hyphen
 *
 * @example
 * decodeHtmlEntities("42 U.S.C. &#X167; 1983")
 * // => "42 U.S.C. § 1983"          // uppercase X accepted
 */
export function decodeHtmlEntities(text: string): string {
  return (
    text
      // Named entities. Listed roughly by frequency in legal text.
      .replace(/&sect;/gi, "§")
      .replace(/&para;/gi, "¶")
      .replace(/&ndash;/gi, "–") // en dash — page ranges (#562)
      .replace(/&mdash;/gi, "—") // em dash — stylistic break (#562)
      .replace(/&amp;/gi, "&")
      .replace(/&nbsp;/gi, " ")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&apos;/gi, "'")
      // Numeric entities — decimal.
      .replace(/&#(\d+);/g, (match, dec) => {
        const code = Number.parseInt(dec, 10)
        return codePointToString(code) ?? match
      })
      // Numeric entities — hexadecimal. `x` is case-insensitive per HTML, so
      // both `&#x167;` and `&#X167;` decode the same way (#562).
      .replace(/&#x([0-9a-fA-F]+);/gi, (match, hex) => {
        const code = Number.parseInt(hex, 16)
        return codePointToString(code) ?? match
      })
  )
}

/**
 * Normalize spacing in reporter abbreviations.
 *
 * Collapses "letter. space" sequences common in legal reporter abbreviations
 * where the space is inconsistent (e.g., OCR or copy-paste artifacts).
 *
 * @example
 * normalizeReporterSpacing("550 U. S. 544")    // => "550 U.S. 544"
 * normalizeReporterSpacing("500 F. 2d 123")    // => "500 F.2d 123"
 * normalizeReporterSpacing("127 S. Ct. 1955")  // => "127 S.Ct. 1955"
 */
export function normalizeReporterSpacing(text: string): string {
  // Targeted approach: collapse spacing in known reporter abbreviation patterns,
  // then apply a general ordinal-suffix rule. This avoids affecting non-reporter
  // abbreviations like "L. Rev." or "L. J." in journal citations.
  let result = text

  // Three-letter code abbreviations (U.S.C., C.F.R.) — must run BEFORE the
  // two-letter rules below so the full 3-letter shape collapses in one pass
  // regardless of spacing pattern (`U. S. C.` / `U.S. C.` / `U. S.C.`). #284
  result = result.replace(/\bU\.\s*S\.\s*C\./g, "U.S.C.")
  result = result.replace(/\bC\.\s*F\.\s*R\./g, "C.F.R.")

  // Regional-reporter inner-space collapse (N.W., S.W., N.E., S.E.):
  // OCR / typesetter inserts a space between the directional letters
  // (`N. W.2d` → `N.W.2d`). The general ordinal-suffix collapse below
  // would handle the `2d` portion but not the inner letter-pair space. #466
  result = result.replace(/\b([NS])\.\s+([WE])\./g, "$1.$2.")

  // Specific reporter abbreviation collapses
  result = result.replace(/\bU\.\s+S\./g, "U.S.")
  result = result.replace(/\bS\.\s+Ct\./g, "S.Ct.")
  result = result.replace(/\bL\.\s+Ed\./g, "L.Ed.")
  result = result.replace(/\bF\.\s+Supp\./g, "F.Supp.")
  result = result.replace(/\bF\.\s+(\d+[a-z]+)/g, "F.$1")

  // General ordinal-suffix collapse: "Supp. 2d" → "Supp.2d", "Ed. 2d" → "Ed.2d",
  // "St. 3d" → "St.3d", "So. 2d" → "So.2d", "Wis. 2d" → "Wis.2d"
  result = result.replace(/([A-Za-z])\.\s+(\d+[a-z]+)/g, "$1.$2")

  // Illinois Appellate Reports — restore the space `App.` strips out by the
  // general rule above. Bluebook T1 canonical form is `Ill. App. 2d` /
  // `Ill. App. 3d` (with a space before the ordinal). #465
  result = result.replace(/\bIll\.\s+App\.(\d+[a-z]+)/g, "Ill. App. $1")

  return result
}

/**
 * Normalize typographical symbols and strip zero-width characters.
 *
 * Handles prime marks (common OCR substitution for apostrophes), the
 * horizontal ellipsis (collapsed to the ASCII 3-dot form so cleaned text
 * does not balloon into long dot leaders \u2014 #548), and invisible Unicode
 * characters that can silently break regex pattern matching.
 *
 * @example
 * normalizeTypography("Doe\u2032s case")  // prime mark
 * // => "Doe's case"
 *
 * @example
 * normalizeTypography("foo\u2026bar")  // horizontal ellipsis (#548)
 * // => "foo...bar"
 *
 * @example
 * normalizeTypography("500\u200BF.2d")  // zero-width space
 * // => "500F.2d"
 */
export function normalizeTypography(text: string): string {
  return text
    .replace(/[\u2032\u2035]/g, "'") // prime, reversed prime → apostrophe
    .replace(/\u2026/g, "...") // horizontal ellipsis \u2192 3 ASCII dots (#548)
    .replace(/\u200B|\u200C|\u200D|\u2060|\uFEFF/g, "") // zero-width chars
}

/**
 * Strip diacritical marks from text (opt-in OCR cleaner).
 *
 * Uses Unicode NFD decomposition to separate base characters from combining
 * marks, then strips the marks. Useful for OCR'd legal documents where
 * accented characters are artifacts of misrecognition.
 *
 * NOT included in the default pipeline — call explicitly or pass in cleaners array.
 *
 * @example
 * stripDiacritics("Hernández v. García")
 * // => "Hernandez v. Garcia"
 */
export function stripDiacritics(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036F]/g, "")
}
