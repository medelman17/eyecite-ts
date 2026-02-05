/**
 * Statute Citation Regex Patterns
 *
 * Patterns for U.S. Code and state code citations.
 * These are intentionally broad for tokenization - validation against
 * actual code databases happens in Phase 2 Plan 5 (extraction layer).
 *
 * Pattern Design:
 * - Simple structure to avoid ReDoS
 * - Matches both "§" and "Section" formats
 * - State codes use broad pattern (validated later)
 */

import type { Pattern } from './casePatterns'

export const statutePatterns: Pattern[] = [
  {
    id: 'usc',
    regex: /\b(\d+)\s+U\.S\.C\.?\s+§+\s*(\d+)\b/g,
    description: 'U.S. Code citations (e.g., "42 U.S.C. § 1983")',
    type: 'statute',
  },
  {
    id: 'state-code',
    regex: /\b([A-Z][a-z]+\.?\s+[A-Za-z\.]+\s+Code)\s+§\s*(\d+)\b/g,
    description: 'State code citations (broad pattern, e.g., "Cal. Penal Code § 187")',
    type: 'statute',
  },
]
