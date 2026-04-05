---
"eyecite-ts": patch
---

Reduce false positive case citations from zip codes, docket numbers, and footnote markers (#145). Four fixes: (1) confidence scoring now uses exact reporter matching instead of substring (prevents "TCPA." from matching "A."); (2) new volume plausibility check flags volumes > 2000 (catches zip codes like 20006); (3) new docket-number pattern detection flags hyphenated volumes like "24-30706"; (4) expanded small-volume heuristic (1–20, was 1–9) now validates period-containing reporters against reporters-db instead of skipping them.
