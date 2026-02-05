/**
 * Tests for tokenization layer
 *
 * Validates that tokenize() correctly applies patterns to cleaned text
 * and produces tokens with correct structure and positions.
 */

import { describe, expect, it } from 'vitest'
import { tokenize } from '@/tokenize'
import {
  casePatterns,
  statutePatterns,
  journalPatterns,
  neutralPatterns,
} from '@/patterns'

// All patterns for testing
const allPatterns = [
  ...casePatterns,
  ...statutePatterns,
  ...journalPatterns,
  ...neutralPatterns,
]

describe('tokenize', () => {
  it('should tokenize case citation', () => {
    const input = 'Smith v. Doe, 500 F.2d 123 (9th Cir. 2020)'
    const tokens = tokenize(input, allPatterns)

    // Should find federal reporter citation (may also match state-reporter/journal patterns)
    expect(tokens.length).toBeGreaterThanOrEqual(1)

    // Find the federal reporter token
    const federalToken = tokens.find((t) => t.patternId === 'federal-reporter')
    expect(federalToken).toBeDefined()
    expect(federalToken?.text).toBe('500 F.2d 123')
    expect(federalToken?.type).toBe('case')

    // Check span positions point to the citation
    expect(federalToken?.span.cleanStart).toBe(14) // Position of "500"
    expect(federalToken?.span.cleanEnd).toBe(26) // Position after "123"
    expect(input.substring(federalToken?.span.cleanStart, federalToken?.span.cleanEnd)).toBe('500 F.2d 123')
  })

  it('should tokenize statute citation', () => {
    const input = 'See 42 U.S.C. § 1983 for details'
    const tokens = tokenize(input, allPatterns)

    // Should find USC citation
    expect(tokens).toHaveLength(1)
    expect(tokens[0].text).toBe('42 U.S.C. § 1983')
    expect(tokens[0].type).toBe('statute')
    expect(tokens[0].patternId).toBe('usc')

    // Check span positions
    expect(tokens[0].span.cleanStart).toBe(4) // Position of "42"
    expect(tokens[0].span.cleanEnd).toBe(20) // Position after "1983"
    expect(input.substring(tokens[0].span.cleanStart, tokens[0].span.cleanEnd)).toBe('42 U.S.C. § 1983')
  })

  it('should tokenize multiple citations in text', () => {
    const input = 'In Smith v. Doe, 500 F.2d 123, the court cited 42 U.S.C. § 1983'
    const tokens = tokenize(input, allPatterns)

    // Should find both case and statute citations (may match multiple patterns)
    expect(tokens.length).toBeGreaterThanOrEqual(2)

    // Find the federal reporter token
    const caseToken = tokens.find((t) => t.patternId === 'federal-reporter')
    expect(caseToken).toBeDefined()
    expect(caseToken?.text).toBe('500 F.2d 123')
    expect(caseToken?.type).toBe('case')
    expect(caseToken?.span.cleanStart).toBe(17) // Position of "500"

    // Find the statute token
    const statuteToken = tokens.find((t) => t.patternId === 'usc')
    expect(statuteToken).toBeDefined()
    expect(statuteToken?.text).toBe('42 U.S.C. § 1983')
    expect(statuteToken?.type).toBe('statute')
    expect(statuteToken?.span.cleanStart).toBe(47) // Position of "42"

    // Verify tokens are sorted by position
    for (let i = 1; i < tokens.length; i++) {
      expect(tokens[i].span.cleanStart).toBeGreaterThanOrEqual(
        tokens[i - 1].span.cleanStart
      )
    }
  })

  it('should tokenize text with no citations', () => {
    const input = 'This is plain text with no legal citations'
    const tokens = tokenize(input, allPatterns)

    // Should return empty array
    expect(tokens).toHaveLength(0)
  })

  it('should tokenize overlapping patterns', () => {
    // "123 U.S. 456" matches both supreme-court and state-reporter patterns
    const input = '123 U.S. 456'
    const tokens = tokenize(input, allPatterns)

    // Should find at least one token (supreme-court pattern should match)
    expect(tokens.length).toBeGreaterThanOrEqual(1)

    // First token should be a case citation
    expect(tokens[0].type).toBe('case')
    expect(tokens[0].text).toBe('123 U.S. 456')

    // Could match multiple patterns (supreme-court and state-reporter)
    // but at least supreme-court should match
    const patternIds = tokens.map((t) => t.patternId)
    expect(patternIds).toContain('supreme-court')
  })

  it('should tokenize WestLaw citations', () => {
    const input = 'See 2021 WL 123456 for analysis'
    const tokens = tokenize(input, allPatterns)

    // Find the WestLaw token (may also match journal pattern)
    const westlawToken = tokens.find((t) => t.patternId === 'westlaw')
    expect(westlawToken).toBeDefined()
    expect(westlawToken?.text).toBe('2021 WL 123456')
    expect(westlawToken?.type).toBe('neutral')
  })

  it('should tokenize LexisNexis citations', () => {
    const input = 'Cited in 2021 U.S. LEXIS 5000'
    const tokens = tokenize(input, allPatterns)

    // Find the LexisNexis token (may also match supreme-court pattern)
    const lexisToken = tokens.find((t) => t.patternId === 'lexis')
    expect(lexisToken).toBeDefined()
    expect(lexisToken?.text).toBe('2021 U.S. LEXIS 5000')
    expect(lexisToken?.type).toBe('neutral')
  })

  it('should tokenize Public Law citations', () => {
    const input = 'Enacted as Pub. L. No. 117-58'
    const tokens = tokenize(input, allPatterns)

    expect(tokens).toHaveLength(1)
    expect(tokens[0].text).toBe('Pub. L. No. 117-58')
    expect(tokens[0].type).toBe('publicLaw')
    expect(tokens[0].patternId).toBe('public-law')
  })

  it('should tokenize Federal Register citations', () => {
    const input = 'Published at 86 Fed. Reg. 12345'
    const tokens = tokenize(input, allPatterns)

    // Find the Federal Register token (may also match state-reporter/journal patterns)
    const fedRegToken = tokens.find((t) => t.patternId === 'federal-register')
    expect(fedRegToken).toBeDefined()
    expect(fedRegToken?.text).toBe('86 Fed. Reg. 12345')
    expect(fedRegToken?.type).toBe('federalRegister')
  })

  it('should handle complex text with multiple citation types', () => {
    const input = `
      The Court in Smith v. Doe, 500 F.2d 123 (9th Cir. 2020), held that
      42 U.S.C. § 1983 applies. See also 2021 WL 123456 and Pub. L. No. 117-58.
      This was discussed in 120 Harv. L. Rev. 500.
    `
    const tokens = tokenize(input, allPatterns)

    // Should find multiple citations across different types
    expect(tokens.length).toBeGreaterThan(3)

    // Verify they are sorted by position
    for (let i = 1; i < tokens.length; i++) {
      expect(tokens[i].span.cleanStart).toBeGreaterThanOrEqual(
        tokens[i - 1].span.cleanStart
      )
    }

    // Check we have different types
    const types = new Set(tokens.map((t) => t.type))
    expect(types.size).toBeGreaterThan(1)
  })

  it('should handle empty input', () => {
    const tokens = tokenize('', allPatterns)
    expect(tokens).toHaveLength(0)
  })

  it('should handle patterns with optional whitespace', () => {
    // F.Supp. can have optional space (may also match state-reporter/journal patterns)
    const input1 = '500 F.Supp. 123'
    const tokens1 = tokenize(input1, allPatterns)
    const fedToken1 = tokens1.find((t) => t.patternId === 'federal-reporter')
    expect(fedToken1).toBeDefined()

    const input2 = '500 F. Supp. 123'
    const tokens2 = tokenize(input2, allPatterns)
    const fedToken2 = tokens2.find((t) => t.patternId === 'federal-reporter')
    expect(fedToken2).toBeDefined()
  })
})
