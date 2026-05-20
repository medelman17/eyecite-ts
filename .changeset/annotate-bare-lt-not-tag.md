---
"eyecite-ts": patch
---

Fix `annotate` engulfing prose around bare `<` characters (#544).

`snapOutOfHtmlTags` treated ANY unpaired `<` as the open of an HTML tag, so when the source contained bare `<` characters from OCR or math notation (`A < B`, `rate is < 30%`, `<®=»`), citation start positions snapped backwards to the bare `<` and the `<cite>` wrap engulfed everything between the bare `<` and the citation. Catastrophic with the canonical `<cite>` template.

`findContainingTag` now only treats a `<` as a tag open when it is IMMEDIATELY followed by `[a-zA-Z!/]` — the only characters that begin a well-formed HTML tag, comment, doctype, or close-tag. Bare `<` followed by whitespace, digits, punctuation, or end-of-text is left alone, so prose with mathematical / inequality syntax annotates cleanly.
