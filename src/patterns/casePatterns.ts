/**
 * Case Citation Regex Patterns
 *
 * These patterns are designed for tokenization (broad matching) not extraction.
 * They identify potential case citations in text for the tokenizer (Plan 3).
 * Metadata parsing and validation against reporters-db happens in Phase 2 Plan 5 (extraction layer).
 *
 * Pattern Design Principles (from RESEARCH.md):
 * - Use \b word boundaries to avoid matching "F." in "F.B.I."
 * - Avoid nested quantifiers: (a+)+ causes ReDoS
 * - Keep patterns simple: tokenization only needs to find candidates
 * - Use global flag /g for matchAll()
 */

import type { FullCitationType } from "@/types/citation"

export interface Pattern {
  id: string
  regex: RegExp
  description: string
  type: FullCitationType
}

export const casePatterns: Pattern[] = [
  {
    id: "federal-reporter",
    // Edition suffix accepts any ordinal ("2d", "3d", or generic "Nth") so the
    // pattern survives the eventual rollout of F.5th / F.6th / F.Supp.Nth (#234).
    // F.Supp.* and F.App'x must come before the generic F.* alternative so the
    // longer prefixes win during alternation.
    regex:
      /\b(\d+(?:-\d+)?)\s+(F\.\s?Supp\.(?:\s?(?:\d+(?:st|nd|rd|th)|2d|3d))?|F\.\s?App'x|F\.(?:\d+(?:st|nd|rd|th)|2d|3d)?)\s+(\d+|_{3,}|-{3,})(?=\s|$|\(|,|;|\.)/g,
    description: "Federal Reporter (F., F.2d, F.3d, F.Nth, F.Supp., F.App'x, etc.)",
    type: "case",
  },
  {
    id: "supreme-court",
    // L.Ed. edition suffix accepts any ordinal so a future L.Ed.3d edition does
    // not silently fall through to the state-reporter fallback (#234).
    regex:
      /\b(\d+(?:-\d+)?)\s+(U\.\s?S\.|S\.\s?Ct\.|L\.\s?Ed\.(?:\s?(?:\d+(?:st|nd|rd|th)|2d|3d))?)\s+(?:\(\d+\s+[A-Z][A-Za-z.]+\)\s+)?(\d+|_{3,}|-{3,})(?=\s|$|\(|,|;|\.)/g,
    description:
      "U.S. Supreme Court reporters (with optional nominative reporter parenthetical)",
    type: "case",
  },
  {
    id: "state-reporter",
    regex:
      /\b(\d+(?:-\d+)?)\s+([A-Z](?:(?! L\.[JQR\s])(?!\s+vs?\.\s)[A-Za-z.\d\s])+?)\s+(\d+|_{3,}|-{3,})(?=\s|$|\(|,|;|\.)/g,
    description:
      'State reporters (broad pattern allowing multi-word reporters, excludes journal patterns with " L.J/Q/Rev" and phantom matches across a case-name separator " v. "/" vs. ", validated against reporters-db in Phase 3)',
    type: "case",
  },
]
