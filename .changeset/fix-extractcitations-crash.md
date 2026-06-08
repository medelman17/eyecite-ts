---
"eyecite-ts": minor
---

Fix `extractCitations` crashing on real input, and export a `CitationParseError` type.

Previously, when the tokenizer admitted a candidate that an extractor's stricter internal re-parse regex couldn't parse — a tokenizer/extractor regex divergence, e.g. a journal name containing an apostrophe (`KELLEY'S`), which the extractor's `[A-Za-z.\s]` name class rejects — the extractor threw an uncaught exception that propagated out of `extractCitations` and crashed the whole call. A single malformed match in one document lost every citation in it.

Now such a candidate is **declined** (its token skipped) and extraction continues, so `extractCitations` no longer throws on this class of input. Genuine (non-parse) errors still propagate so real bugs stay visible. The new `CitationParseError` is exported so callers of the individual extractors can catch it explicitly.

Closes #881.
