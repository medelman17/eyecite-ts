---
"eyecite-ts": minor
---

Add state statute citation extraction for 19 jurisdictions across three pattern families:

**Federal (PR #67):** Enhanced USC/CFR patterns with subsection capture, et seq., §§ ranges. Added prose-form "section X of title Y". Refactored extractStatute into dispatcher architecture.

**Abbreviated-code (PR #68):** Added knownCodes registry and extraction for 12 states using compact abbreviations: FL, OH, MI, UT, CO, WA, NC, GA, PA, IN, NJ, DE.

**Named-code (PR #69):** Added extraction for 7 states using jurisdiction prefix + code name: NY (21 laws), CA (29 codes), TX (29 codes), MD (36 articles), VA, AL, MA (chapter-based).

New `StatuteCitation` fields: `subsection`, `jurisdiction`, `pincite`, `hasEtSeq`. Shared `parseBody` helper for section/subsection/et seq splitting. ~970 tests (up from 528).
