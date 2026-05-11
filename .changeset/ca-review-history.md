---
"eyecite-ts": patch
---

fix: California `review denied/granted` and chained-signal history (#238)

`SIGNAL_TABLE` covered federal `cert. denied/granted` and the standard Bluebook subsequent-history words, but missed California Supreme Court's `review denied` / `review granted` / `opinion vacated` and the CA-specific `disapproved on other grounds` form. After-citation history clauses with these phrases silently dropped.

Three coordinated changes:

1. **`HistorySignal` discriminated union** gains 4 California-specific values: `review_denied`, `review_granted`, `opinion_vacated`, `disapproved_other_grounds`.
2. **`SIGNAL_TABLE`** gets matching regex entries. The longer `disapproved on other grounds` precedes the bare `disapproved` so alternation prefers the more specific match. `review den.` (abbreviated) and `review denied` both map to `review_denied` via `^review\s+den(?:ied|\.)`.
3. **`collectParentheticals` multi-stage chain bug fix.** Found while writing tests: when a second signal arrives without an intervening parenthetical (e.g., `..., review granted, opinion vacated.`), the previous `pendingSignal` was overwritten and lost. The fix flushes `pendingSignal` to `signals` (with `nextParenIndex = -1`) before assigning the new one. This also enables federal chains like `aff'd, cert. denied` (without trailing paren) to capture both links.

Adds 9 regression tests: 3 `review denied` / `review den.` / `review granted`, 1 `opinion vacated`, 1 `disapproved on other grounds`, 1 multi-stage chain (`review granted, opinion vacated` → 2 entries), and 3 regression controls confirming bare `disapproved`, federal `cert. denied`, and the existing `aff'd` chain are unaffected.
