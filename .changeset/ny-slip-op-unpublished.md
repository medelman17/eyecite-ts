---
"eyecite-ts": patch
---

fix: NY Slip Op `(U)` / `[U]` unpublished markers no longer pollute the court field (#231)

New York Slip Opinion citations carry a trailing `(U)` (older form) or `[U]` (newer form) marker immediately after the document number to flag an unpublished disposition. Pre-fix, the parser misread `(U)` as a court parenthetical and set `court = "U"`. The `[U]` bracket form additionally caused mis-classification as a `journal` citation because the state-reporter regex's trailing-character lookahead didn't accept `[`.

Three coordinated changes:

1. **`FullCaseCitation` interface** gains an `unpublished?: boolean` field (mirrors the existing flag on `NeutralCitation` from #230).
2. **`state-reporter` regex trailing lookahead** extended from `(?=\s|$|\(|,|;|\.)` to `(?=\s|$|\(|,|;|\.|\[)` so `[U]` doesn't break the page-boundary check.
3. **Pre-lookahead `(U)`/`[U]` consumer in `extractCase`.** Before `LOOKAHEAD_PAREN_REGEX` runs on the post-token text, a small regex `/^\s*(?:\(U\)|\[U\])/` detects and consumes the unpublished marker so the lookahead reaches the real court parenthetical (e.g., `(Sup. Ct. 2007)`) instead of capturing `(U)` as the court.

Result for `Pickard v. Tarnow, 2007 N.Y. Slip Op. 52377(U) (Sup. Ct. 2007)`:

| Field | Before | After |
| --- | --- | --- |
| `page` | 52377 | 52377 |
| `court` | `"U"` | `"Sup. Ct."` |
| `year` | undefined | 2007 |
| `unpublished` | — | `true` |
| `caseName` | (sometimes lost) | `"Pickard v. Tarnow"` |

Adds 7 regression tests covering the bare `(U)` form, the `[U]` bracket form, citations with a following real court paren, and 2 regression controls (non-(U) Slip Op + federal cite) confirming no regression.
