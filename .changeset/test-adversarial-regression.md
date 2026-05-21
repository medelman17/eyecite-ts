---
"eyecite-ts": patch
---

test(extract): adversarial-input regression suite documenting current behavior + 8 known gaps

Probed the extractor with adversarial inputs across multiple categories
to find ways to break it. Added 21 regression tests in
`tests/extract/issueAdversarialInputs.test.ts`:

**Verified safe today (13 passing):**
- Empty string, single space, just punctuation — no crash
- 100 repeated identical citations — completes in <500ms
- Extremely long case names (500-char party names) — no hang
- Deeply nested parens, unbalanced parens — no crash
- `v.` inside party names — handled
- Unicode normalization for NBSP / tab between volume / reporter / page
- Fullwidth digits normalized to ASCII
- Smart-quote handling in case names
- HTML formatting tags split across citation
- HTML entities (numeric) treated as literal — sensible no-op

**Documented gaps (8 `it.todo`):**
- `100 U..S. 123` (doubled period) extracts phantom reporter `U..S.`
- `100 US 123` (missing periods) extracts 2-letter all-caps as reporter
- `100 U . S . 123` (spaced periods) doesn't extract
- `100 U.S. 1,234` (thousands separator) parses as page=1+pincite=234
- `100 U.S. 1-5` (page range) mis-routes to journal
- Implausible volumes: `0 U.S. 1`, `1 U.S. 0`, `1234567890 U.S. 1`

Each gap has a comment explaining why it wasn't fixed in this PR — most
require coordinated changes across multiple patterns or the FP filter
that would break pre-existing tests. The `.todo` markers ensure these
surface in test counts as known follow-up work.

No production code changes — pure documentation of current behavior.
