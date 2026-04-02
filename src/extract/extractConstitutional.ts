/**
 * Constitutional Citation Extraction
 *
 * Parses tokenized constitutional citations to extract jurisdiction,
 * article/amendment, section, and clause fields.
 *
 * Dispatch by patternId:
 * - "us-constitution" → jurisdiction: "US"
 * - "state-constitution" → jurisdiction mapped from state abbreviation
 * - "bare-constitution" → jurisdiction: undefined
 *
 * @module extract/extractConstitutional
 */

import type { Token } from "@/tokenize"
import type { ConstitutionalCitation } from "@/types/citation"
import type { TransformationMap } from "@/types/span"

/**
 * Roman numeral lookup table (I–XXVII).
 * Covers all U.S. constitutional articles (I–VII) and amendments (I–XXVII).
 */
const ROMAN_TO_INT: Record<string, number> = {
	I: 1,
	II: 2,
	III: 3,
	IV: 4,
	V: 5,
	VI: 6,
	VII: 7,
	VIII: 8,
	IX: 9,
	X: 10,
	XI: 11,
	XII: 12,
	XIII: 13,
	XIV: 14,
	XV: 15,
	XVI: 16,
	XVII: 17,
	XVIII: 18,
	XIX: 19,
	XX: 20,
	XXI: 21,
	XXII: 22,
	XXIII: 23,
	XXIV: 24,
	XXV: 25,
	XXVI: 26,
	XXVII: 27,
}

/** Parse a Roman numeral or Arabic number string to an integer. */
function parseNumeral(raw: string): number | undefined {
	const upper = raw.toUpperCase()
	if (upper in ROMAN_TO_INT) return ROMAN_TO_INT[upper]
	const n = Number.parseInt(raw, 10)
	return Number.isNaN(n) ? undefined : n
}

/**
 * State abbreviation → 2-letter code mapping.
 * Keys are lowercase abbreviation stems (without trailing period).
 */
const STATE_ABBREV_TO_CODE: Record<string, string> = {
	ala: "AL",
	alaska: "AK",
	ariz: "AZ",
	ark: "AR",
	cal: "CA",
	calif: "CA",
	colo: "CO",
	conn: "CT",
	del: "DE",
	fla: "FL",
	ga: "GA",
	haw: "HI",
	idaho: "ID",
	ill: "IL",
	ind: "IN",
	iowa: "IA",
	kan: "KS",
	ky: "KY",
	la: "LA",
	me: "ME",
	md: "MD",
	mass: "MA",
	mich: "MI",
	minn: "MN",
	miss: "MS",
	mo: "MO",
	mont: "MT",
	neb: "NE",
	nev: "NV",
	"n.h": "NH",
	"n.j": "NJ",
	"n.m": "NM",
	"n.y": "NY",
	"n.c": "NC",
	"n.d": "ND",
	ohio: "OH",
	okla: "OK",
	or: "OR",
	ore: "OR",
	pa: "PA",
	"r.i": "RI",
	"s.c": "SC",
	"s.d": "SD",
	tenn: "TN",
	tex: "TX",
	utah: "UT",
	vt: "VT",
	va: "VA",
	wash: "WA",
	"w.va": "WV",
	wis: "WI",
	wyo: "WY",
}

/** Regex to parse the body: art./amend. + numeral + optional § section + optional cl. clause */
const BODY_RE =
	/(?:art(?:icle)?\.?|amend(?:ment)?\.?)\s+([IVXLC]+|\d+)(?:[,;]\s*§\s*([^\s,;()]+))?(?:[,;]\s*cl\.?\s*(\d+))?/i

/** Regex to detect article vs amendment keyword */
const IS_AMENDMENT_RE = /amend/i

/** Regex to extract the state abbreviation prefix from state-constitution tokens */
const STATE_PREFIX_RE =
	/^([A-Za-z]+(?:\.\s*[A-Za-z]+)?(?:\.\s*[A-Za-z]+)?)\.?\s+Const/i

/**
 * Resolve state abbreviation from token text to 2-letter code.
 */
function resolveStateJurisdiction(text: string): string | undefined {
	const prefixMatch = STATE_PREFIX_RE.exec(text)
	if (!prefixMatch) return undefined

	// Normalize: collapse spaces, lowercase, remove trailing dots
	const raw = prefixMatch[1]
		.replace(/\s+/g, "")
		.replace(/\.$/g, "")
		.toLowerCase()

	if (raw in STATE_ABBREV_TO_CODE) return STATE_ABBREV_TO_CODE[raw]

	return undefined
}

/**
 * Extract a constitutional citation from a tokenized match.
 *
 * @param token - Tokenized citation candidate from the tokenizer
 * @param transformationMap - Maps cleaned text positions to original text positions
 * @returns Parsed constitutional citation with structured fields
 */
export function extractConstitutional(
	token: Token,
	transformationMap: TransformationMap,
): ConstitutionalCitation {
	const { text, span } = token

	// Parse body fields
	const bodyMatch = BODY_RE.exec(text)

	let article: number | undefined
	let amendment: number | undefined
	let section: string | undefined
	let clause: number | undefined

	if (bodyMatch) {
		const numeral = parseNumeral(bodyMatch[1])
		const keyword = text.slice(
			0,
			bodyMatch.index + bodyMatch[0].indexOf(bodyMatch[1]),
		)

		if (IS_AMENDMENT_RE.test(keyword)) {
			amendment = numeral
		} else {
			article = numeral
		}

		section = bodyMatch[2] || undefined
		clause = bodyMatch[3] ? Number.parseInt(bodyMatch[3], 10) : undefined
	}

	// Determine jurisdiction from patternId
	let jurisdiction: string | undefined
	switch (token.patternId) {
		case "us-constitution":
			jurisdiction = "US"
			break
		case "state-constitution":
			jurisdiction = resolveStateJurisdiction(text)
			break
		default:
			jurisdiction = undefined
			break
	}

	// Translate positions
	const originalStart =
		transformationMap.cleanToOriginal.get(span.cleanStart) ?? span.cleanStart
	const originalEnd =
		transformationMap.cleanToOriginal.get(span.cleanEnd) ?? span.cleanEnd

	// Confidence scoring
	let confidence: number
	if (token.patternId === "bare-constitution") {
		confidence = 0.7
	} else if (section) {
		confidence = token.patternId === "us-constitution" ? 0.95 : 0.9
	} else {
		confidence = 0.9
	}

	return {
		type: "constitutional",
		text,
		span: {
			cleanStart: span.cleanStart,
			cleanEnd: span.cleanEnd,
			originalStart,
			originalEnd,
		},
		confidence,
		matchedText: text,
		processTimeMs: 0,
		patternsChecked: 1,
		jurisdiction,
		article,
		amendment,
		section,
		clause,
	}
}
