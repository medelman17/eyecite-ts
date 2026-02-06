---
"eyecite-ts": patch
---

Fix three quick-win bugs discovered during corpus testing:

- **Bug #43**: Fixed `§§` (double section symbol) crashing extractStatute by updating regex to accept one or more section symbols
- **Bug #55**: Added HTML entity decoding (`&sect;` → §, `&amp;` → &, etc.) to cleaning pipeline
- **Bug #54**: Added Unicode dash normalization (en-dash/em-dash → ASCII hyphen) to cleaning pipeline

These fixes promote 3 test cases from known limitations to passing tests, improving extraction accuracy for real-world legal documents with HTML entities and Unicode punctuation.
