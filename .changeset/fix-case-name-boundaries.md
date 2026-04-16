---
"eyecite-ts": patch
---

fix: robust case-name boundary detection with Bluebook T6/T10 abbreviations (#182, #183, #184)

Replace the narrow LEGAL_ABBREVS regex (~30 entries) with a comprehensive Bluebook-sourced abbreviation set (200+ entries from T6/T7/T10) backed by heuristics for single-letter initials and dotted initialisms. Add hard boundary detection for Id. markers and parenthetical signal words (quoting, citing, cited in). Fixes case names that were undefined, truncated, or overshot when party names contained abbreviation chains like "Cent. Sch. Dist.", "Mgt., Inc.", or "A.N.L.Y.H. Invs."
