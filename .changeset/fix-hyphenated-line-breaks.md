---
"eyecite-ts": patch
---

Add `rejoinHyphenatedWords` cleaner to restore words split across line breaks (#130). Court opinions wrap long words with hyphens at line breaks (e.g., `F. Sup-\np. 3d`), which prevented reporter recognition. The new cleaner runs before whitespace normalization, removing `hyphen + newline` sequences while preserving accurate span mappings to the original text.
