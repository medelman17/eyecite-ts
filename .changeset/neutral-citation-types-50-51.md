---
"eyecite-ts": patch
---

Fix neutral citation type classification bugs #50 and #51:

- **Bug #50**: State vendor-neutral citations like "2007 UT 49", "2017 WI 17", "2013 IL 112116" now correctly classified as "neutral" type instead of "case"
  - Added state-vendor-neutral pattern: YYYY STATE_CODE NUMBER
  - Pattern runs before case patterns in extraction pipeline, ensuring correct type assignment

- **Bug #51**: U.S. App./Dist. LEXIS citations like "2021 U.S. App. LEXIS 12345" and "2021 U.S. Dist. LEXIS 67890" now matched as neutral citations
  - Expanded LEXIS pattern to include optional "App." and "Dist." court identifiers
  - Updated extraction regex to handle variable court formats

Promotes 7 test cases from known limitations to passing tests. Improves accuracy for state and federal neutral citation extraction.
