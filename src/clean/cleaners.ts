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
 * Normalize Unicode dashes to ASCII hyphens.
 *
 * Converts en-dash (U+2013) and em-dash (U+2014) to ASCII hyphen-minus (U+002D).
 * This ensures extraction regexes that expect ASCII hyphens work correctly.
 *
 * @example
 * normalizeDashes("Smith v. Doe, 500 F.2d 123–125")  // en-dash
 * // => "Smith v. Doe, 500 F.2d 123-125"
 *
 * @example
 * normalizeDashes("Smith v. Doe—500 F.2d 123")  // em-dash
 * // => "Smith v. Doe-500 F.2d 123"
 */
export function normalizeDashes(text: string): string {
	return text.replace(/[\u2013\u2014]/g, "-")
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
