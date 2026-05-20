---
"eyecite-ts": patch
---

fix(extract): strip comma-separated signal variants from caseName (#506)

`SIGNAL_STRIP_REGEX` now accepts older typesetting variants — `See, also,`
(extra inter-word comma), `See, generally,`, `See e.g.,` (spaced/comma-less
`e.g.`), and the canonical Bluebook forms with relaxed punctuation. A small
set of post-signal prose connectors (`the case of`, `the opinion in`) is
also stripped so captions like `See also the case of King v. Carter` no
longer carry the connector into `caseName`. Mirrors the signal-detection
relaxation from PR #503.
