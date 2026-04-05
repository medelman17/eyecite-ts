/**
 * Built-in text cleaner functions for preprocessing legal documents.
 *
 * Each cleaner is a simple transformation: (text: string) => string
 * Cleaners can be composed via the cleanText() pipeline.
 */

/**
 * Remove all HTML tags from text.
 *
 * @example
 * stripHtmlTags("Smith v. <b>Doe</b>, 500 F.2d 123")
 * // => "Smith v. Doe, 500 F.2d 123"
 */
export function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]+>/g, "")
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
  return text
    .replace(/[\t\n\r\u00A0\u2000-\u200A\u202F\u205F\u3000]+/g, " ")
    .replace(/ {2,}/g, " ")
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
 * En-dash (U+2013) → single hyphen (used in page ranges like 105–107).
 * Em-dash (U+2014) → triple hyphen (used as blank page placeholder in citations
 * like "500 F.4th — (2024)", matching the existing `-{3,}` blank page pattern).
 *
 * @example
 * normalizeDashes("500 F.2d 123, 125–130")  // en-dash in range
 * // => "500 F.2d 123, 125-130"
 *
 * @example
 * normalizeDashes("500 F.4th — (2024)")  // em-dash blank page
 * // => "500 F.4th --- (2024)"
 */
export function normalizeDashes(text: string): string {
  return text
    .replace(/[\u2014\u2015]/g, "---") // em-dash, horizontal bar → triple hyphen
    .replace(/[\u2010\u2012\u2013]/g, "-") // hyphen, figure dash, en-dash → hyphen
}

/**
 * Decode common HTML entities relevant to legal text.
 *
 * Handles named entities (&sect;, &para;, &amp;, &nbsp;) and numeric entities
 * (&#NNN; and &#xHHH;). Should be called after stripHtmlTags to decode any
 * remaining entities.
 *
 * @example
 * decodeHtmlEntities("42 U.S.C. &sect; 1983")
 * // => "42 U.S.C. § 1983"
 *
 * @example
 * decodeHtmlEntities("Smith &amp; Jones, 500 F.2d 123")
 * // => "Smith & Jones, 500 F.2d 123"
 */
export function decodeHtmlEntities(text: string): string {
  return (
    text
      // Named entities
      .replace(/&sect;/gi, "§")
      .replace(/&para;/gi, "¶")
      .replace(/&amp;/gi, "&")
      .replace(/&nbsp;/gi, " ")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&apos;/gi, "'")
      // Numeric entities - decimal
      .replace(/&#(\d+);/g, (_match, dec) => {
        const code = Number.parseInt(dec, 10)
        return Number.isNaN(code) ? _match : String.fromCharCode(code)
      })
      // Numeric entities - hexadecimal
      .replace(/&#x([0-9a-fA-F]+);/g, (_match, hex) => {
        const code = Number.parseInt(hex, 16)
        return Number.isNaN(code) ? _match : String.fromCharCode(code)
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

  // Specific reporter abbreviation collapses
  result = result.replace(/\bU\.\s+S\./g, "U.S.")
  result = result.replace(/\bS\.\s+Ct\./g, "S.Ct.")
  result = result.replace(/\bL\.\s+Ed\./g, "L.Ed.")
  result = result.replace(/\bF\.\s+Supp\./g, "F.Supp.")
  result = result.replace(/\bF\.\s+(\d+[a-z]+)/g, "F.$1")

  // General ordinal-suffix collapse: "Supp. 2d" → "Supp.2d", "Ed. 2d" → "Ed.2d",
  // "St. 3d" → "St.3d", "So. 2d" → "So.2d", "Wis. 2d" → "Wis.2d"
  result = result.replace(/([A-Za-z])\.\s+(\d+[a-z]+)/g, "$1.$2")

  return result
}

/**
 * Normalize typographical symbols and strip zero-width characters.
 *
 * Handles prime marks (common OCR substitution for apostrophes) and invisible
 * Unicode characters that can silently break regex pattern matching.
 *
 * @example
 * normalizeTypography("Doe\u2032s case")  // prime mark
 * // => "Doe's case"
 *
 * @example
 * normalizeTypography("500\u200BF.2d")  // zero-width space
 * // => "500F.2d"
 */
export function normalizeTypography(text: string): string {
  return text
    .replace(/[\u2032\u2035]/g, "'") // prime, reversed prime → apostrophe
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
