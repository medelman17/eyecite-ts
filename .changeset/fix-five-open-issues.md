---
"eyecite-ts": patch
---

Fix fullSpan forward extension, false positive reporter rejection, and signal word stripping; add support for additional Bluebook dispositions

- **#120**: `fullSpan` now extends forward through pincite and closing parenthetical. `collectParentheticals()` skips pincite-like text (digits, ranges, footnote refs) to reach the actual parenthetical blocks.
- **#121**: Reject common English words as reporter names ("Court", "Section", "Rule", "Chapter", etc.) — 34 blocked words prevent false positives like "2 Court dismissed...12" from matching as citations.
- **#122**: Confirmed pincite extraction from comma-separated pages already works correctly; added regression tests.
- **#123**: Confirmed `(per curiam)` disposition extraction already works correctly; added regression tests. Extended disposition support to recognize `mem.`, `mem. op.`, `table`, `unpublished`, `plurality opinion`, and `in banc` (Bluebook Rule 10.6.1).
- **#124**: `caseName` no longer includes signal words — rebuilt from cleaned party names after `extractPartyNames` strips the signal.
