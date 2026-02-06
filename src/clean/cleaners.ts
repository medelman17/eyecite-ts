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
 * Decode common HTML entities found in legal documents.
 *
 * Handles both named entities (&sect;) and numeric entities (&#167;).
 * Supports common legal symbols like section (§) and paragraph (¶).
 *
 * @example
 * decodeHtmlEntities("42 U.S.C. &sect; 1983")
 * // => "42 U.S.C. § 1983"
 *
 * @example
 * decodeHtmlEntities("See &#167; 1983")
 * // => "See § 1983"
 */
export function decodeHtmlEntities(text: string): string {
	// Common legal HTML entities
	const entityMap: Record<string, string> = {
		"&sect;": "§", // Section symbol
		"&para;": "¶", // Paragraph symbol
		"&amp;": "&", // Ampersand
		"&lt;": "<", // Less than
		"&gt;": ">", // Greater than
		"&quot;": '"', // Double quote
		"&apos;": "'", // Single quote/apostrophe
		"&nbsp;": " ", // Non-breaking space
	}

	// Replace named entities
	let result = text
	for (const [entity, char] of Object.entries(entityMap)) {
		result = result.replace(new RegExp(entity, "g"), char)
	}

	// Replace numeric entities (decimal: &#167; and hex: &#x00A7;)
	result = result
		.replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
		.replace(/&#x([0-9A-Fa-f]+);/g, (_match, code) =>
			String.fromCharCode(Number.parseInt(code, 16)),
		)

	return result
}
