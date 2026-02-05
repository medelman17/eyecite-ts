---
"eyecite-ts": patch
---

Fix year and court not extracted from parentheticals on full case citations. The extractor now looks ahead in the cleaned text for trailing parentheticals like `(1989)` or `(9th Cir. 2020)`. Also strips year from court field and infers `scotus` for Supreme Court reporters.
