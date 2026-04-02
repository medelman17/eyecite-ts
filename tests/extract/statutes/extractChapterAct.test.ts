import { describe, it, expect } from 'vitest'
import { extractChapterAct } from '@/extract/statutes/extractChapterAct'
import { extractCitations } from '@/extract/extractCitations'
import type { Token } from '@/tokenize'
import { createIdentityMap } from '../../helpers/transformationMap'

describe('extractChapterAct', () => {
  const map = createIdentityMap()
  const makeToken = (text: string): Token => ({
    text, span: { cleanStart: 0, cleanEnd: text.length }, type: 'statute', patternId: 'chapter-act',
  })

  it('should extract 735 ILCS 5/2-1001', () => {
    const c = extractChapterAct(makeToken('735 ILCS 5/2-1001'), map)
    expect(c.jurisdiction).toBe('IL')
    expect(c.title).toBe(735)
    expect(c.code).toBe('5')
    expect(c.section).toBe('2-1001')
    expect(c.confidence).toBe(0.95)
  })

  it('should extract 720 ILCS 5/12-3.05', () => {
    const c = extractChapterAct(makeToken('720 ILCS 5/12-3.05'), map)
    expect(c.jurisdiction).toBe('IL')
    expect(c.title).toBe(720)
    expect(c.section).toBe('12-3.05')
  })

  it('should extract Ill. Comp. Stat. form', () => {
    const c = extractChapterAct(makeToken('735 Ill. Comp. Stat. 5/2-1001'), map)
    expect(c.jurisdiction).toBe('IL')
    expect(c.title).toBe(735)
  })

  it('should extract ILCS Ann. form', () => {
    const c = extractChapterAct(makeToken('735 ILCS Ann. 5/2-1001'), map)
    expect(c.jurisdiction).toBe('IL')
    expect(c.title).toBe(735)
    expect(c.section).toBe('2-1001')
  })

  it('should extract subsections with confidence boost', () => {
    const c = extractChapterAct(makeToken('735 ILCS 5/2-1001(a)'), map)
    expect(c.section).toBe('2-1001')
    expect(c.subsection).toBe('(a)')
    expect(c.pincite).toBe('(a)')
    expect(c.confidence).toBe(1.0)
  })

  it('should detect et seq.', () => {
    const c = extractChapterAct(makeToken('735 ILCS 5/2-1001 et seq.'), map)
    expect(c.hasEtSeq).toBe(true)
    expect(c.section).toBe('2-1001')
  })

  it('should handle fallback for malformed token', () => {
    const c = extractChapterAct(makeToken('malformed text'), map)
    expect(c.jurisdiction).toBeUndefined()
    expect(c.confidence).toBeLessThanOrEqual(0.3)
  })

  describe('end-to-end pipeline', () => {
    it('should extract ILCS citation through full pipeline', () => {
      const citations = extractCitations('See 735 ILCS 5/2-1001 for details.')
      const statutes = citations.filter(c => c.type === 'statute')
      expect(statutes.length).toBeGreaterThanOrEqual(1)
      const il = statutes.find(c => c.type === 'statute' && c.jurisdiction === 'IL')
      expect(il).toBeDefined()
      if (il?.type === 'statute') {
        expect(il.title).toBe(735)
        expect(il.section).toBe('2-1001')
      }
    })
  })
})
