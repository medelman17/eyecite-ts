---
"eyecite-ts": patch
---

fix(extract): URL/filepath in court parenthetical no longer polluting court field

When a citation's court parenthetical contained a URL (web link or
filepath), the URL leaked into the `court` field. Real court
abbreviations never contain `://` or `file:///`:

| input | before | after |
|---|---|---|
| `Smith, 100 F.2d 1 (file:///opinions/100-f2d-1.pdf)` | `court="file:///opinions/..."` | `court=undefined` ✓ |
| `Smith, 100 F.2d 1 (https://example.com/100-f2d-1)` | leaks | `court=undefined` ✓ |
| `Smith, 100 F.2d 1 (avail. at https://courts.gov/...)` | leaks | `court=undefined` ✓ |

Added a URL-detection check in `stripDateFromCourt` — `://` (any URI
scheme) or `file:///` triggers rejection.

6 regression tests in `tests/extract/issueUrlInParensCourt.test.ts`.
