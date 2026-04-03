---
"eyecite-ts": patch
---

Fix Unicode em-dash (U+2014) not recognized as blank page placeholder in citations like `500 F.4th — (2024)`. The `normalizeDashes` cleaner now converts em-dash to `---` (matching the existing blank page pattern) and en-dash to `-` (for page ranges). Closes #54.
