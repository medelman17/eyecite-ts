---
"eyecite-ts": patch
---

Fix court normalization to collapse spaces before lowercase letters, support en-dash/em-dash ranges in pincite parsing, export `normalizeCourt` from main entry point, reorder court inference map to prefer normalized forms, and add integration tests for `pinciteInfo` and `normalizedCourt`
