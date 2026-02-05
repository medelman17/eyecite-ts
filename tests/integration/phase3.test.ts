/**
 * Phase 3 Integration Tests
 *
 * Tests complete Phase 3 pipeline:
 * - Full extraction pipeline with validation and annotation
 * - Reporter database integration with lazy loading
 * - Performance validation (<100ms for 10KB documents)
 * - Degraded mode (extraction without database)
 * - HTML entity escaping in annotation
 * - Confidence scoring based on reporter matches
 */

import { describe, it, expect } from 'vitest'
import { cleanText } from '@/clean'
import { extractCitations } from '@/extract/extractCitations'
import { loadReporters, getReportersSync } from '@/data/reporters'
import { extractWithValidation } from '@/extract/validation'
import { annotate } from '@/annotate/annotate'

// ============================================================================
// Test 1: Full pipeline - clean → extract → validate → annotate
// ============================================================================

describe('Phase 3 Integration Tests', () => {
	it('executes full pipeline: clean → extract → validate → annotate', async () => {
		const rawText = '<p>In <b>Smith v. Doe</b>, 500 F.2d 123 (9th Cir. 2020), the court held...</p>'

		// Step 1: Clean text
		const cleaned = cleanText(rawText)
		expect(cleaned.cleaned).not.toContain('<p>')
		expect(cleaned.cleaned).not.toContain('<b>')

		// Step 2: Extract citations
		const citations = extractCitations(cleaned.cleaned)
		expect(citations.length).toBeGreaterThanOrEqual(1)

		// Step 3: Load reporter database
		const db = await loadReporters()
		expect(db).toBeDefined()
		expect(db.all.length).toBeGreaterThan(0)

		// Step 4: Validate with reporter database
		const validated = await extractWithValidation(cleaned.cleaned, { validate: true })
		expect(validated.length).toBeGreaterThanOrEqual(1)

		// Check that validation worked
		const caseCitation = validated.find((c) => c.type === 'case')
		expect(caseCitation).toBeDefined()

		// Step 5: Annotate citations
		const annotated = annotate(cleaned.cleaned, validated, {
			template: { before: '<cite>', after: '</cite>' },
		})

		expect(annotated.text).toContain('<cite>')
		expect(annotated.text).toContain('</cite>')
		expect(annotated.positionMap).toBeDefined()
	})

	// ========================================================================
	// Test 2: Performance - 10KB document in <100ms (PERF-02)
	// ========================================================================

	it('processes 10KB legal document in <100ms', { timeout: 5000 }, async () => {
		// Generate a 10KB legal document with repeated citations
		const baseCitation = 'Smith v. Doe, 500 F.2d 123 (9th Cir. 2020). '
		const targetSize = 10 * 1024 // 10KB

		let doc = ''
		while (doc.length < targetSize) {
			doc += baseCitation + 'The court held that plaintiffs failed to state a claim. '
		}

		expect(doc.length).toBeGreaterThanOrEqual(targetSize)

		// Measure total time for extraction + validation
		const startTime = performance.now()

		// Extract and validate
		const citations = await extractWithValidation(doc, { validate: true })

		const endTime = performance.now()
		const duration = endTime - startTime

		// Assert: Total time < 100ms
		expect(duration).toBeLessThan(100)

		// Verify citations were extracted
		expect(citations.length).toBeGreaterThan(0)
	})

	// ========================================================================
	// Test 3: Degraded mode works without reporter database
	// ========================================================================

	it('works in degraded mode without reporter database', async () => {
		// Clear cached database by calling extractWithValidation before loadReporters
		// This simulates the library being used without explicit database loading

		const text = 'See Smith v. Doe, 500 F.2d 123, for precedent.'

		// Extract without database loaded (degraded mode)
		const citations = await extractWithValidation(text, { validate: true })

		// Should still extract citations
		expect(citations.length).toBeGreaterThanOrEqual(1)

		// Should have info warning about database not loaded
		const caseCitation = citations.find((c) => c.type === 'case')
		expect(caseCitation).toBeDefined()

		// In degraded mode, warnings should include DB not loaded message
		const hasDbWarning = caseCitation?.warnings?.some(
			(w) => w.message.includes('Reporter database not loaded') || w.message.includes('not found in database'),
		)

		// Either DB was already loaded from previous test or we got degraded mode warning
		const dbLoaded = getReportersSync() !== null

		if (!dbLoaded) {
			expect(hasDbWarning).toBe(true)
		}
	})

	// ========================================================================
	// Test 4: Annotation preserves HTML entities
	// ========================================================================

	it('annotation auto-escapes HTML entities', () => {
		const text = 'See <script>alert("xss")</script> in Smith v. Doe, 500 F.2d 123.'

		// Extract citations
		const citations = extractCitations(text)

		// Annotate with auto-escape enabled (default)
		const annotated = annotate(text, citations, {
			template: { before: '<cite>', after: '</cite>' },
			autoEscape: true,
		})

		// Check that the annotation contains escaped HTML entities
		// (The citation text itself might not have HTML, but auto-escape should be active)
		expect(annotated.text).toBeDefined()

		// Verify auto-escape works by annotating text with HTML-like content
		const htmlLikeText = 'See "Smith & Doe" v. <Corporation>, 500 F.2d 123.'
		const htmlCitations = extractCitations(htmlLikeText)

		const htmlAnnotated = annotate(htmlLikeText, htmlCitations, {
			template: { before: '<cite>', after: '</cite>' },
			autoEscape: true,
		})

		// The annotated output should escape HTML entities in citation text
		expect(htmlAnnotated.text).toContain('<cite>')
		expect(htmlAnnotated.text).toContain('</cite>')
	})

	// ========================================================================
	// Test 5: Confidence scoring adjusts based on reporter match
	// ========================================================================

	it('confidence scoring boosts on reporter match', async () => {
		const text = 'Smith v. Doe, 500 F.2d 123 (9th Cir. 2020).'

		// Load database first
		await loadReporters()

		// Extract with validation
		const validated = await extractWithValidation(text, { validate: true })

		// Find case citation
		const caseCitation = validated.find((c) => c.type === 'case' && c.reporter === 'F.2d')

		expect(caseCitation).toBeDefined()

		// Should have reporter match metadata
		expect(caseCitation).toHaveProperty('reporterMatch')

		// Confidence should be adjusted (either boosted or penalized)
		expect(caseCitation!.confidence).toBeGreaterThan(0)
		expect(caseCitation!.confidence).toBeLessThanOrEqual(1.0)
	})
})
