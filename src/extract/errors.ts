/**
 * Extractor error types.
 *
 * @module extract/errors
 */

/**
 * Thrown by an extractor when the tokenizer admitted a candidate that the
 * extractor's stricter internal re-parse regex cannot parse — a tokenizer /
 * extractor regex divergence (e.g. a journal name containing an apostrophe,
 * which the extractor's `[A-Za-z.\s]` name class rejects).
 *
 * The orchestrator (`extractCitations`) catches this specific type and
 * **declines the candidate** — skipping that one token — rather than letting
 * a single malformed match crash the whole document (#881). Any other error
 * is treated as a genuine bug and propagates so it stays visible.
 *
 * A direct caller of an individual extractor still receives a thrown
 * `CitationParseError` for a malformed token, and may catch it explicitly.
 */
export class CitationParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CitationParseError"
  }
}
