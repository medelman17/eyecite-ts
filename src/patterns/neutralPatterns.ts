/**
 * Neutral and Online Citation Regex Patterns
 *
 * Patterns for WestLaw, LexisNexis, public laws, and Federal Register citations.
 * These have predictable formats and don't require external validation.
 *
 * Pattern Design:
 * - Matches year-database-number format for online citations
 * - Matches Pub. L. No. format for public laws
 * - Matches volume-Fed. Reg.-page for Federal Register
 * - Simple structure to avoid ReDoS
 */

import type { Pattern } from './casePatterns'

export const neutralPatterns: Pattern[] = [
  {
    id: 'westlaw',
    regex: /\b(\d{4})\s+WL\s+(\d+)\b/g,
    description: 'WestLaw citations (e.g., "2021 WL 123456")',
    type: 'neutral',
  },
  {
    id: 'lexis',
    regex: /\b(\d{4})\s+U\.S\.\s+LEXIS\s+(\d+)\b/g,
    description: 'LexisNexis citations (e.g., "2021 U.S. LEXIS 5000")',
    type: 'neutral',
  },
  {
    id: 'public-law',
    regex: /\bPub\.\s?L\.\s?No\.\s?(\d+-\d+)\b/g,
    description: 'Public Law citations (e.g., "Pub. L. No. 117-58")',
    type: 'publicLaw',
  },
  {
    id: 'federal-register',
    regex: /\b(\d+)\s+Fed\.\s?Reg\.\s+(\d+)\b/g,
    description: 'Federal Register citations (e.g., "86 Fed. Reg. 12345")',
    type: 'federalRegister',
  },
]
