---
"eyecite-ts": patch
---

Fix short-form resolution binding to the wrong case when a length-changing `cleaner` is used (#830). The resolver assumed clean-text offsets equaled original-text offsets and read its bracket-scope / trigger-anchor / name-window analysis against the original text using clean offsets. A cleaner that shrinks the text (e.g. markdown-emphasis stripping) made those offsets diverge — accumulating drift with preceding removed content — so parenthetical-child detection misfired and a trailing `Id.` could bind to a `(quoting …)` child instead of the citation-sentence's main case. The resolver now reads clean-coordinate offsets against the cleaned text and maps derived spans back to original coordinates, so resolution via a cleaner matches resolution of pre-stripped text.
