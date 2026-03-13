import { describe, it, expect } from 'vitest'
import { extractCitations } from '@/extract/extractCitations'
import corpus from '../fixtures/statute-corpus.json'

interface CorpusEntry {
  text: string
  expected?: Array<{
    type: string
    title?: number
    code?: string
    section?: string
    subsection?: string
    jurisdiction?: string
    hasEtSeq?: boolean
  }>
  expected_statute_count?: number
  expected_case_count?: number
  note?: string
}

describe('statute golden corpus', () => {
  for (const entry of corpus as CorpusEntry[]) {
    const label = entry.text.length > 60
      ? `${entry.text.slice(0, 57)}...`
      : entry.text

    it(`should extract from: "${label}"`, () => {
      const citations = extractCitations(entry.text)

      if (entry.expected) {
        const statutes = citations.filter(c => c.type === 'statute')
        expect(statutes).toHaveLength(entry.expected.filter(e => e.type === 'statute').length)

        for (let i = 0; i < entry.expected.length; i++) {
          const exp = entry.expected[i]
          const actual = citations.find(c =>
            c.type === exp.type &&
            (exp.type !== 'statute' || (c.type === 'statute' && c.section === exp.section))
          )

          expect(actual, `Expected citation for section ${exp.section}`).toBeDefined()
          if (!actual) continue

          if (actual.type === 'statute') {
            if (exp.title !== undefined) expect(actual.title).toBe(exp.title)
            if (exp.code !== undefined) expect(actual.code).toBe(exp.code)
            if (exp.section !== undefined) expect(actual.section).toBe(exp.section)
            if (exp.subsection !== undefined) expect(actual.subsection).toBe(exp.subsection)
            if (exp.jurisdiction !== undefined) expect(actual.jurisdiction).toBe(exp.jurisdiction)
            if (exp.hasEtSeq !== undefined) expect(actual.hasEtSeq).toBe(exp.hasEtSeq)
          }
        }
      }

      if (entry.expected_statute_count !== undefined) {
        const statutes = citations.filter(c => c.type === 'statute')
        expect(statutes).toHaveLength(entry.expected_statute_count)
      }

      if (entry.expected_case_count !== undefined) {
        const cases = citations.filter(c => c.type === 'case')
        expect(cases).toHaveLength(entry.expected_case_count)
      }
    })
  }
})
