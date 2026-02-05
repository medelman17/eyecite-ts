/**
 * Journal Citation Regex Patterns
 *
 * Patterns for law review and journal citations.
 * These are intentionally broad for tokenization - validation against
 * journals-db happens in Phase 3 (extraction layer).
 *
 * Pattern Design:
 * - Matches volume-journal-page format
 * - Broad journal name matching (validated later)
 * - Simple structure to avoid ReDoS
 */

import type { Pattern } from './casePatterns'

export const journalPatterns: Pattern[] = [
  {
    id: 'law-review',
    regex: /\b(\d+)\s+([A-Z][A-Za-z\.\s]+)\s+(\d+)\b/g,
    description: 'Law review citations (e.g., "120 Harv. L. Rev. 500"), validated against journals-db in Phase 3',
    type: 'journal',
  },
]
