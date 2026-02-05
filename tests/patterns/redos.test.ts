/**
 * ReDoS (Regular Expression Denial of Service) Protection Tests
 *
 * Validates that all citation patterns complete in <100ms even on malformed input.
 * This prevents catastrophic backtracking from nested quantifiers or complex patterns.
 *
 * Test approach:
 * - Test each pattern against pathological inputs (long strings, nested chars, etc.)
 * - Measure total execution time across all malformed inputs
 * - Fail if any pattern exceeds 100ms threshold (PERF requirement from plan)
 */

import { describe, it, expect } from 'vitest'
import {
  casePatterns,
  statutePatterns,
  journalPatterns,
  neutralPatterns,
} from '@/patterns'

describe('ReDoS protection', () => {
  const allPatterns = [
    ...casePatterns,
    ...statutePatterns,
    ...journalPatterns,
    ...neutralPatterns,
  ]

  // Malformed inputs that could trigger catastrophic backtracking
  const malformedInputs = [
    'Smith v. Doe, 500 F.2d 123 ('.repeat(100), // Missing closing paren
    '123 '.repeat(1000) + 'U.S. 456', // Excessive numbers
    'a'.repeat(10000), // Long non-matching text
    '((((('.repeat(100) + '123 F.2d 456', // Nested parens
    'F.'.repeat(500) + ' 123', // Repeated reporter abbreviations
    '§ § § '.repeat(500) + '123', // Repeated section symbols
  ]

  for (const pattern of allPatterns) {
    it(`should not timeout on malformed input: ${pattern.id}`, { timeout: 500 }, () => {
      const startTime = Date.now()

      for (const input of malformedInputs) {
        // matchAll returns an iterator - spread to array to force execution
        const matches = [...input.matchAll(pattern.regex)]
        // We don't care about results, just that it completes quickly
      }

      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(100) // <100ms per pattern (PERF requirement)
    })
  }

  it('should test all defined patterns', () => {
    // Sanity check: ensure we have patterns from all modules
    expect(casePatterns.length).toBeGreaterThan(0)
    expect(statutePatterns.length).toBeGreaterThan(0)
    expect(journalPatterns.length).toBeGreaterThan(0)
    expect(neutralPatterns.length).toBeGreaterThan(0)
    expect(allPatterns.length).toBeGreaterThan(0)
  })
})
