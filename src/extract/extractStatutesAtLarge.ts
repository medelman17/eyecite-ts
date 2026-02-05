/**
 * Statutes at Large Citation Extractor
 *
 * Extracts session law citations from the Statutes at Large (e.g., "124 Stat. 119").
 * These are chronological compilations of federal laws, distinct from both
 * codified statutes (U.S.C.) and case reporters.
 *
 * Format: volume Stat. page [(year)]
 *
 * @module extract/extractStatutesAtLarge
 */

import type { StatutesAtLargeCitation } from "@/types/citation"
import type { TransformationMap } from "@/types/span"
import type { Token } from "@/tokenize/tokenizer"

export function extractStatutesAtLarge(
	token: Token,
	transformationMap: TransformationMap,
): StatutesAtLargeCitation {
	const { text, span } = token

	// Parse volume-Stat.-page
	const statRegex = /^(\d+(?:-\d+)?)\s+Stat\.\s+(\d+)/
	const match = statRegex.exec(text)

	if (!match) {
		throw new Error(`Failed to parse Statutes at Large citation: ${text}`)
	}

	const rawVolume = match[1]
	const volume = /^\d+$/.test(rawVolume) ? Number.parseInt(rawVolume, 10) : rawVolume
	const page = Number.parseInt(match[2], 10)

	// Extract optional year in parentheses
	const yearRegex = /\((?:.*?\s)?(\d{4})\)/
	const yearMatch = yearRegex.exec(text)
	const year = yearMatch ? Number.parseInt(yearMatch[1], 10) : undefined

	// Translate positions from clean → original
	const originalStart =
		transformationMap.cleanToOriginal.get(span.cleanStart) ?? span.cleanStart
	const originalEnd =
		transformationMap.cleanToOriginal.get(span.cleanEnd) ?? span.cleanEnd

	// Confidence: 0.9 (Statutes at Large format is standardized)
	const confidence = 0.9

	return {
		type: 'statutesAtLarge',
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
		volume,
		page,
		year,
	}
}
