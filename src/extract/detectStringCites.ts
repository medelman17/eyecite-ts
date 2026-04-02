/**
 * String Citation Detection
 *
 * Detects semicolon-separated string citation groups (multiple authorities
 * supporting the same proposition). Runs as a post-extract phase after
 * individual citation extraction and subsequent history linking.
 *
 * @module extract/detectStringCites
 */

import type { Citation, CitationSignal, FullCaseCitation } from "@/types/citation"

/**
 * Signal words recognized between string citation members (case-insensitive).
 * Longer patterns first so "see also" matches before "see".
 *
 * Each entry also carries a pre-built `endRegex` for matching the signal at the
 * end of preceding text (used in leading-signal detection). These are built once
 * at module load to avoid reconstructing RegExp objects inside hot loops.
 */
const SIGNAL_PATTERNS: ReadonlyArray<{
  regex: RegExp
  endRegex: RegExp
  signal: CitationSignal
}> = buildSignalPatterns()

function buildSignalPatterns() {
  const raw: ReadonlyArray<{ regex: RegExp; signal: CitationSignal }> = [
    { regex: /^see\s+generally\b/i, signal: "see generally" },
    { regex: /^see\s+also\b/i, signal: "see also" },
    { regex: /^but\s+see\b/i, signal: "but see" },
    { regex: /^but\s+cf\.?(?=\s|$)/i, signal: "but cf" },
    { regex: /^compare\b/i, signal: "compare" },
    { regex: /^accord\b/i, signal: "accord" },
    { regex: /^contra\b/i, signal: "contra" },
    { regex: /^see\b/i, signal: "see" },
    { regex: /^cf\.?(?=\s|$)/i, signal: "cf" },
  ]
  return raw.map(({ regex, signal }) => ({
    regex,
    // Matches the signal at the end of a string (for leading-signal lookback).
    // Replaces the leading `^` anchor with a negative lookbehind for word chars.
    endRegex: new RegExp(`${regex.source.replace(/^\^/, "(?<![a-z])")}\\s*$`, regex.flags),
    signal,
  }))
}

/**
 * Get the end position of a citation's full extent in cleaned text.
 * Uses fullSpan if available on any citation type (currently only case
 * citations carry fullSpan, but this is future-proof for other types).
 */
function getCitationEnd(c: Citation): number {
  const fullSpan = "fullSpan" in c ? (c as FullCaseCitation).fullSpan : undefined
  return fullSpan ? fullSpan.cleanEnd : c.span.cleanEnd
}

/**
 * Get the start position of a citation's full extent in cleaned text.
 * Uses fullSpan if available on any citation type.
 */
function getCitationStart(c: Citation): number {
  const fullSpan = "fullSpan" in c ? (c as FullCaseCitation).fullSpan : undefined
  return fullSpan ? fullSpan.cleanStart : c.span.cleanStart
}

/** Set a signal on a citation without triggering type errors on the union. */
function setSignal(c: Citation, sig: CitationSignal): void {
  ;(c as { signal?: CitationSignal }).signal = sig
}

/**
 * Parse a recognized signal word from text.
 * Returns the normalized signal and the length of the match, or undefined.
 */
function parseSignal(text: string): { signal: CitationSignal; length: number } | undefined {
  const trimmed = text.trimStart()
  for (const { regex, signal } of SIGNAL_PATTERNS) {
    const match = regex.exec(trimmed)
    if (match) {
      return { signal, length: match[0].length }
    }
  }
  return undefined
}

/**
 * Check if the gap text between two citations is a valid string cite separator.
 *
 * Valid gaps contain only: whitespace, a single semicolon, and optionally a
 * recognized signal word. Returns the parsed signal if present.
 *
 * @returns Object with `valid` flag and optional `signal` if a mid-group signal was found
 */
function analyzeGap(gapText: string): { valid: boolean; signal?: CitationSignal } {
  // Must contain a semicolon
  const semiIndex = gapText.indexOf(";")
  if (semiIndex === -1) return { valid: false }

  // Text before semicolon must be only whitespace
  const before = gapText.substring(0, semiIndex).trim()
  if (before !== "") return { valid: false }

  // Text after semicolon: optional whitespace + optional signal word + optional whitespace
  const after = gapText.substring(semiIndex + 1).trim()

  // Empty after semicolon (just whitespace) — valid, no signal
  if (after === "") return { valid: true }

  // Try to parse a signal word
  const signalResult = parseSignal(after)
  if (signalResult) {
    // Everything after the signal must be whitespace
    const remainder = after.substring(signalResult.length).trim()
    if (remainder === "") return { valid: true, signal: signalResult.signal }
  }

  // Non-signal text after semicolon — not a valid string cite gap
  return { valid: false }
}

/**
 * Detect string citation groups from extracted citations.
 *
 * Walks adjacent citations in document order, examines the gap text between
 * them, and groups citations separated by semicolons (with optional signal
 * words). Mutates citations in place to set grouping fields.
 *
 * Must run AFTER subsequent history linking (needs `subsequentHistoryOf` to
 * exclude history citations) and AFTER parallel detection.
 *
 * @param citations - Extracted citations sorted by span.cleanStart (document order)
 * @param cleanedText - Cleaned text used for gap analysis
 */
export function detectStringCitations(citations: Citation[], cleanedText: string): void {
  if (citations.length < 2) return

  // Build groups as arrays of citation indices
  const groups: number[][] = []
  let currentGroup: number[] = []

  for (let i = 0; i < citations.length - 1; i++) {
    const current = citations[i]
    const next = citations[i + 1]

    // Skip if next citation is a subsequent history entry
    if (next.type === "case" && (next as FullCaseCitation).subsequentHistoryOf) {
      // Finalize current group if any
      if (currentGroup.length >= 2) {
        groups.push(currentGroup)
      }
      currentGroup = []
      continue
    }

    // Skip if current citation is a subsequent history entry
    if (current.type === "case" && (current as FullCaseCitation).subsequentHistoryOf) {
      continue
    }

    // Extract gap text between end of current's full extent and start of next's full extent
    const gapStart = getCitationEnd(current)
    const gapEnd = getCitationStart(next)

    // Guard against overlapping or adjacent spans with no gap
    if (gapEnd <= gapStart) {
      if (currentGroup.length >= 2) {
        groups.push(currentGroup)
      }
      currentGroup = []
      continue
    }

    const gapText = cleanedText.substring(gapStart, gapEnd)
    const analysis = analyzeGap(gapText)

    if (analysis.valid) {
      // Start a new group with the current citation, or continue the existing one
      if (currentGroup.length === 0) {
        currentGroup.push(i)
      }
      // Always add the next citation to the group
      currentGroup.push(i + 1)
      // Set mid-group signal on next citation if found and not already set
      if (analysis.signal && !next.signal) {
        setSignal(next, analysis.signal)
      }
    } else {
      // Group breaks — finalize current group if any
      if (currentGroup.length >= 2) {
        groups.push(currentGroup)
      }
      currentGroup = []
    }
  }

  // Finalize any remaining group
  if (currentGroup.length >= 2) {
    groups.push(currentGroup)
  }

  // Assign group metadata
  for (let g = 0; g < groups.length; g++) {
    const group = groups[g]
    if (group.length < 2) continue

    // Group IDs are sequential per extractCitations() call. If citations from
    // multiple documents are merged downstream, IDs may collide — callers
    // should namespace or regenerate IDs in that scenario.
    const groupId = `sc-${g}`
    for (let idx = 0; idx < group.length; idx++) {
      const citIndex = group[idx]
      const cit = citations[citIndex]
      cit.stringCitationGroupId = groupId
      cit.stringCitationIndex = idx
      cit.stringCitationGroupSize = group.length
    }
  }

  // Detect leading signal for first member of each group (non-case citations only,
  // since case citations get their signal from extractCase party name stripping)
  for (const group of groups) {
    if (group.length < 2) continue
    const first = citations[group[0]]
    if (first.signal) continue // Already set (e.g., by extractCase)

    // Look backward from citation start for a signal word
    const searchStart = Math.max(0, getCitationStart(first) - 30)
    const precedingText = cleanedText.substring(searchStart, getCitationStart(first)).trim()

    // Check if preceding text ends with a signal word (uses pre-built endRegex)
    for (const { endRegex, signal } of SIGNAL_PATTERNS) {
      if (endRegex.test(precedingText)) {
        setSignal(first, signal)
        break
      }
    }
  }
}
