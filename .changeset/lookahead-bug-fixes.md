---
"eyecite-ts": patch
---

Fix lookahead pattern bugs #52 and #53 that prevented year extraction:

- **Bug #52**: Fixed footnote reference (n.3) preventing year extraction - updated lookahead pattern to skip optional footnote markers like "n.3" or "note 7"
- **Bug #53**: Fixed pincite ranges (152-53, 163-64) preventing year extraction - updated lookahead pattern to handle hyphenated ranges and multiple comma-separated pincites

These fixes improve year extraction accuracy for citations with complex pincite formats, promoting 2 test cases from known limitations to passing tests.
