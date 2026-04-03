---
"eyecite-ts": minor
---

Add footnote-aware citation extraction (#79)

- Add `detectFootnotes(text)` function that detects footnote zones in HTML (structural tags) and plain text (separator + marker heuristics)
- Add `detectFootnotes: true` option to `extractCitations` for opt-in footnote annotation
- Add `inFootnote` and `footnoteNumber` fields to `CitationBase`
- Export `FootnoteMap` and `FootnoteZone` types from the public API
- Make the `"footnote"` scope strategy functional in the resolver: Id. resolves within same zone only, supra/shortFormCase can cross from footnotes to body
