import type { ContextOptions, SurroundingContext } from "./types"

/**
 * Legal abbreviations that contain periods but are NOT sentence boundaries.
 * Kept as a static set in this file — does NOT import from src/data/
 * to preserve tree-shaking of the utils entry point.
 */
const LEGAL_ABBREVIATIONS = new Set([
  // Court and case abbreviations
  "v",
  "vs",
  // Reporter abbreviations (common ones)
  "U.S",
  "S.Ct",
  "S. Ct",
  "L.Ed",
  "L. Ed",
  "F",
  "F.2d",
  "F.3d",
  "F.4th",
  "F.Supp",
  "F. Supp",
  "A.2d",
  "A.3d",
  "N.E",
  "N.E.2d",
  "N.W",
  "N.W.2d",
  "S.E",
  "S.E.2d",
  "S.W",
  "S.W.2d",
  "S.W.3d",
  "So",
  "So.2d",
  "So.3d",
  "P",
  "P.2d",
  "P.3d",
  // Titles and procedural terms
  "No",
  "Nos",
  "Inc",
  "Corp",
  "Ltd",
  "Co",
  "Ass'n",
  "Dept",
  "Dist",
  "Cir",
  "App",
  "Supp",
  "Rev",
  "Stat",
  "Const",
  // General legal abbreviations
  "Mr",
  "Mrs",
  "Ms",
  "Dr",
  "Jr",
  "Sr",
  "St",
  "Ct",
  "Atl",
  "Cal",
  "Fla",
  "Ill",
  "Tex",
  "Pa",
  "Md",
  "Va",
  "Wis",
  "Minn",
  "Mich",
  "Mass",
  "Conn",
  "Colo",
  "Ariz",
  "Ark",
  "Ga",
  "La",
  "Ind",
  "Kan",
  "Ky",
  "Miss",
  "Mo",
  "Neb",
  "Nev",
  "Okla",
  "Or",
  "Tenn",
  "Vt",
  "Wash",
  "Wyo",
  "Del",
  "Haw",
  "Ida",
  "Me",
  "Mont",
  "R.I",
  "S.C",
  "S.D",
  "N.C",
  "N.D",
  "N.J",
  "N.M",
  "N.Y",
  "W.Va",
  // Federal abbreviations
  "U.S.C",
  "C.F.R",
  "Fed",
  "Reg",
  "Pub",
  "Amend",
  "Sec",
  "Art",
  "Cl",
  "Ch",
  "Pt",
  "Vol",
  "Ed",
  "Harv",
  "Yale",
  "Stan",
  "Colum",
  "Geo",
])

/**
 * Check if a period at the given position is likely an abbreviation,
 * not a sentence boundary.
 */
function isAbbreviationPeriod(text: string, dotIndex: number): boolean {
  // Look backwards from the dot to find the word
  let wordStart = dotIndex
  while (wordStart > 0 && text[wordStart - 1] !== " " && text[wordStart - 1] !== "\n") {
    wordStart--
  }

  const word = text.slice(wordStart, dotIndex)

  // Single letter followed by period (e.g., "U.", "S.", "F.")
  // Only treat as abbreviation if part of a dotted sequence:
  // - preceded by a period (like the "S" in "U.S.")
  // - followed by a letter/digit (like the "F" in "F.2d")
  if (word.length === 1 && /[A-Z]/.test(word)) {
    const charAfterDot = dotIndex + 1 < text.length ? text[dotIndex + 1] : ""
    const charBeforeWord = wordStart > 0 ? text[wordStart - 1] : ""
    if (charBeforeWord === "." || /[A-Za-z0-9]/.test(charAfterDot)) return true
  }

  // Check multi-character abbreviations (strip any trailing dots for lookup)
  const stripped = word.replace(/\.$/g, "")
  if (LEGAL_ABBREVIATIONS.has(stripped)) return true

  // Check if the word itself (with internal dots) is known: "U.S", "F.2d", etc.
  if (LEGAL_ABBREVIATIONS.has(word)) return true

  // Number followed by period (ordinals like "1." in list context — not sentence end if no space+uppercase follows)
  // This is handled by the caller's space+uppercase check

  return false
}

/**
 * Find the start of the sentence containing the given position.
 */
function findSentenceStart(text: string, pos: number): number {
  for (let i = pos - 1; i >= 0; i--) {
    const ch = text[i]
    if (ch === "." || ch === "?" || ch === "!") {
      if (ch === "." && isAbbreviationPeriod(text, i)) continue

      // Check if followed by whitespace (the char after this terminator)
      const next = i + 1
      if (next < text.length && /\s/.test(text[next])) {
        // Skip whitespace to find the start of the next sentence
        let start = next
        while (start < pos && /\s/.test(text[start])) start++
        return start
      }
    }
  }
  return 0
}

/**
 * Find the end of the sentence containing the given position.
 */
function findSentenceEnd(text: string, pos: number): number {
  for (let i = pos; i < text.length; i++) {
    const ch = text[i]
    if (ch === "." || ch === "?" || ch === "!") {
      if (ch === "." && isAbbreviationPeriod(text, i)) continue
      return i + 1
    }
  }
  return text.length
}

/**
 * Find the enclosing sentence or paragraph around a citation span.
 *
 * Legal-text-aware: periods in reporter abbreviations, court names,
 * and procedural terms (Corp., U.S., F.3d, No., v.) are not treated
 * as sentence boundaries.
 *
 * @example
 * ```typescript
 * const ctx = getSurroundingContext(text, { start: 33, end: 52 })
 * // ctx.text: "In Smith v. Doe, 500 F.2d 123 (2020), the Court held X."
 * // ctx.span: { start: 16, end: 71 }
 * ```
 */
export function getSurroundingContext(
  text: string,
  span: { start: number; end: number },
  options?: ContextOptions,
): SurroundingContext {
  const type = options?.type ?? "sentence"
  const maxLength = options?.maxLength

  let start: number
  let end: number

  if (type === "paragraph") {
    // Find paragraph boundaries (double newline)
    const beforeSpan = text.lastIndexOf("\n\n", span.start)
    start = beforeSpan === -1 ? 0 : beforeSpan + 2
    const afterSpan = text.indexOf("\n\n", span.end)
    end = afterSpan === -1 ? text.length : afterSpan
  } else {
    start = findSentenceStart(text, span.start)
    end = findSentenceEnd(text, span.end)
  }

  const raw = text.slice(start, end)
  const resultText = raw.trim()
  const trimmedStart = start + (raw.length - raw.trimStart().length)
  const trimmedEnd = end - (raw.length - raw.trimEnd().length)

  if (maxLength && resultText.length > maxLength) {
    const truncated = resultText.slice(0, maxLength)
    return {
      text: truncated,
      span: { start: trimmedStart, end: trimmedStart + truncated.length },
    }
  }

  return {
    text: resultText,
    span: { start: trimmedStart, end: trimmedEnd },
  }
}
