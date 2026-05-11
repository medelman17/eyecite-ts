---
"eyecite-ts": patch
---

fix: bankruptcy adversary `(In re X)` admin parenthetical cleanup (#241)

In bankruptcy adversary proceedings, the case caption includes an administrative parenthetical naming the underlying debtor:

```text
Spence v. Hintze (In re Hintze), 570 B.R. 369 (Bankr. D. Mass. 2017)
```

**Finding:** the acceptance criteria from the issue were already satisfied by the existing parser — `caseName` preserves `(In re Hintze)`, `court` and `year` are correct, `fullSpan` covers the entire caption. The bug surfaced as a quality issue: the `defendant` field carried the admin parenthetical (`"Hintze (In re Hintze)"`), which polluted downstream consumers and `defendantNormalized`.

**Improvement:** the trailing `(In re <Debtor>)` is now stripped off the `defendant` field and exposed via a new `adminParenthetical?: string` field. The `caseName` continues to preserve the full caption text (including the admin paren) via the case-name rebuild step.

Example output for `Spence v. Hintze (In re Hintze), 570 B.R. 369 (Bankr. D. Mass. 2017)`:

| Field | Before | After |
| --- | --- | --- |
| `caseName` | `"Spence v. Hintze (In re Hintze)"` | `"Spence v. Hintze (In re Hintze)"` |
| `plaintiff` | `"Spence"` | `"Spence"` |
| `defendant` | `"Hintze (In re Hintze)"` | `"Hintze"` |
| `defendantNormalized` | `"hintze (in re hintze)"` | `"hintze"` |
| `adminParenthetical` | — | `"In re Hintze"` |
| `court` | `"Bankr. D. Mass."` | `"Bankr. D. Mass."` |
| `year` | 2017 | 2017 |

Adds 7 regression tests: 2 acceptance-criteria assertions (caseName preservation + fullSpan + non-regression in explanatory parens), 3 cleanup assertions (defendant strip, compound debtor name, hyphenated debtor name), 2 regression controls confirming non-bankruptcy parens don't trigger admin-paren handling.
