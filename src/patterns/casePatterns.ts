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

import type { FullCitationType } from '@/types/citation'

export interface Pattern {
  id: string
  regex: RegExp
  description: string
  type: FullCitationType
}

export const casePatterns: Pattern[] = [
  {
    id: 'federal-reporter',
    regex: /\b(\d+)\s+(F\.|F\.2d|F\.3d|F\.\s?Supp\.|F\.\s?Supp\.\s?2d|F\.\s?Supp\.\s?3d)\s+(\d+)\b/g,
    description: 'Federal Reporter (F., F.2d, F.3d, F.Supp., etc.)',
    type: 'case',
  },
  {
    id: 'supreme-court',
    regex: /\b(\d+)\s+(U\.S\.|S\.\s?Ct\.|L\.\s?Ed\.(?:\s?2d)?)\s+(\d+)\b/g,
    description: 'U.S. Supreme Court reporters',
    type: 'case',
  },
  {
    id: 'state-reporter',
    regex: /\b(\d+)\s+([A-Z][A-Za-z.]+(?:\s?2d|\s?3d)?)\s+(\d+)\b/g,
    description: 'State reporters (broad pattern, validated against reporters-db in Phase 3)',
    type: 'case',
  },
]
