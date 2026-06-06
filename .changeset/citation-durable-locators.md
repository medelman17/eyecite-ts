---
"eyecite-ts": minor
---

Add `toDurableLocator` / `toDurableLocators` to `eyecite-ts/utils`. They turn each extracted citation into a portable, W3C-style durable locator (TextQuoteSelector + TextPositionSelector) — a quote plus sentence-bounded context, a document-order occurrence ordinal, and a content hash — that survives edits to the source document. eyecite produces the locator; resolving it back to a range is left to the consumer.
