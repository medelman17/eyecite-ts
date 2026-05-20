---
"eyecite-ts": patch
---

Fix `fullSpan` overshoot into preceding prose on regex false-positive citations (#547).

The broad state-reporter regex (`\d+ Capitalized+ \d+`) sometimes matched volume-reporter-page shapes that straddled a hard line break in the source — section headings concatenated with body sentences (`2. Denials of 1-602 Applications\nOn October 19`), form-field addresses (`5713 Monona Drive\nMonona WI 53716`), and smart-quote-artifact rule references (`56\nFed. R. Civ.' P. 56`). The cleaner collapsed `\n` to space, so the tokenizer never saw the break. The case-name backward scan then absorbed the preceding heading or form-label line into `caseName` and extended `fullSpan` across it, producing user-visible spans that mixed unrelated prose into the citation.

`applyFalsePositiveFilters` now inspects the original (pre-cleaning) source text. A `case` (or `shortFormCase`) citation whose original-text span contains a `\n` is treated as a structural false positive — real reporter abbreviations never wrap a line break, and OCR-wrapped citations like `F. Sup-\np. 3d` are already stitched by `rejoinHyphenatedWords` before whitespace normalization. Flagged citations get confidence `0.1` plus a `#547` warning; their `fullSpan` is stripped so downstream consumers (`annotate`, `citationBounds`, `document/proseOffsets`) fall back to the cite-core span instead of surfacing surrounding prose. With `filterFalsePositives: true`, the phantom is dropped entirely. Across 758 case citations in a 100-opinion CAP sample, every cite crossing a newline was a confirmed false positive — no observed false negatives.

`applyFalsePositiveFilters` gained an optional third parameter `originalText`; existing call sites that pass only two arguments continue to work, with the line-crossing check skipped.
