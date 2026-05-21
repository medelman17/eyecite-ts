---
"eyecite-ts": patch
---

fix(extract): year+comma+modifier form (`1990, en banc`) no longer leaks into court

Extends PR #704. The strip-pass for trailing year+modifier accepted only
whitespace between year and modifier (`1990 mem.`). Bluebook also allows
a comma form (`1990, en banc`, `1990, per curiam`):

| input | before | after |
|---|---|---|
| `(9th Cir. 1990, en banc)` | `court="9th Cir. 1990, en banc"` | `court="9th Cir."` ✓ |
| `(9th Cir. 1990, per curiam)` | leaks | `court="9th Cir."` ✓ |
| `(1990, mem.)` | `court="1990, mem."` | `court=undefined` ✓ |

The regex now accepts `\d{4}(?:\s+|,\s+)<modifier>` so both forms work.

6 regression tests in `tests/extract/issueYearCommaModifier.test.ts`.
