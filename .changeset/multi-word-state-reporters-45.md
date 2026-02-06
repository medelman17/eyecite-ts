---
"eyecite-ts": patch
---

Fix multi-word state reporters bug #45 that prevented matching reporters like "Ohio St. 3d" and "Md. App.":

- **Bug #45**: Updated state-reporter pattern to allow spaces and digits in reporter names while excluding journal patterns
- Pattern now uses negative lookahead `(?! L\.[JQR\s])` to prevent misclassifying journal citations like "Yale L.J." as case citations
- Promotes 2 test cases from known limitations to passing tests

This fix improves tokenization accuracy for state reporters with multi-word names and ensures journal citations remain correctly classified.
