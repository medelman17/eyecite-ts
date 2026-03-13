---
"eyecite-ts": minor
---

Add Illinois ILCS chapter-act citation extraction and remove legacy state-code pattern.

- New `chapter-act` pattern and `extractChapterAct` extractor for "735 ILCS 5/2-1001" format
- Removed broad `state-code` pattern — fully superseded by named-code + abbreviated-code families
- Eliminates duplicate citation output for state codes that previously matched both patterns
