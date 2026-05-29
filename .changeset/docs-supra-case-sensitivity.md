---
"eyecite-ts": patch
---

docs: document supra party-name case-sensitivity constraint (#688)

Resolves #688 via the "document as explicit constraint" path the
issue author offered as an acceptable resolution. SUPRA_PATTERN
requires an uppercase initial on the party-name capture — `Smith,
supra` matches; `smith, supra` does not.

Adds a prominent **CASE SENSITIVITY (#688)** block to SUPRA_PATTERN's
JSDoc explaining why: a lowercase-permissive regex generates 18+
regressions in resolver tests because words like `Later`, `However`,
and `In re` would be absorbed as multi-word party names.

Lowercase party-name supras (informal/OCR-extracted text) must
either be hand-corrected upstream or handled by a future
resolver-side fuzzy match.

No code change. Doc-only patch.
