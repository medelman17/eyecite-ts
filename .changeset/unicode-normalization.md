---
"eyecite-ts": minor
---

Expand Unicode normalization for OCR'd legal documents (#11)

- Expand `normalizeWhitespace` to handle non-breaking space (U+00A0), thin/hair/en/em spaces, and other Unicode whitespace
- Expand `normalizeDashes` to handle horizontal bar (U+2015), Unicode hyphen (U+2010), and figure dash (U+2012)
- Add `normalizeTypography` cleaner (default pipeline): converts prime marks to apostrophes and strips zero-width characters
- Add `stripDiacritics` opt-in cleaner: removes diacritical marks from OCR artifacts using NFD decomposition
