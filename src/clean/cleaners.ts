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
 * Normalize whitespace: convert tabs/newlines to spaces, collapse multiple spaces.
 *
 * @example
 * normalizeWhitespace("Smith  v.  Doe,   500 F.2d 123")
 * // => "Smith v. Doe, 500 F.2d 123"
 */
export function normalizeWhitespace(text: string): string {
	return text.replace(/[\t\n\r]+/g, " ").replace(/ {2,}/g, " ")
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
 * - En-dash (U+2013, –) → hyphen (-)
 * - Em-dash (U+2014, —) → triple underscore (___) for blank page detection
 *
 * @example
 * normalizeDashes("500 F.3d 100, 105–107 (2020)")
 * // => "500 F.3d 100, 105-107 (2020)"
 *
 * normalizeDashes("500 F.4th — (2024)")
 * // => "500 F.4th ___ (2024)"
 */
export function normalizeDashes(text: string): string {
	return text
		.replace(/\u2013/g, "-") // en-dash → hyphen
		.replace(/\u2014/g, "___") // em-dash → triple underscore
}
