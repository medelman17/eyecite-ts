---
"eyecite-ts": patch
---

fix: California bracketed parallel citations `[266 Cal.Rptr. 569]` now extract and link (#237)

California Style Manual wraps parallel reporter citations in brackets rather than placing them after a comma:

```text
Smith v. Jones, 50 Cal.3d 100 (Cal. 1990) [266 Cal.Rptr. 569]
```

Pre-fix, the bracketed cite either fell through to the journal pattern (wrong type) or failed to tokenize entirely. `detectParallel.ts` required a comma + shared parenthetical between citations to link them, so even when both extracted, they weren't recognized as parallels.

Two coordinated changes:

1. **`state-reporter` trailing lookahead** extended from `(?=\s|$|\(|,|;|\.|\[)` to `(?=\s|$|\(|,|;|\.|\[|\])` so a bracketed-end-of-citation pattern (`<vol> <Reporter> <page>` followed by `]`) tokenizes correctly. Without this, the broader journal pattern absorbed the citation with the wrong type.
2. **CA bracket-mode parallel detection** added to `detectParallel.ts` ahead of the comma-requirement gate. When the gap text between two adjacent case citations contains `[` and the secondary citation is immediately followed by `]`, the pair is treated as a parallel — no shared-paren requirement (CA cites often have a `(<year>)` paren *between* the primary and the bracket, which would otherwise trip the existing separate-parens rejection).

Example output for `Smith v. Jones, 50 Cal.3d 100 (Cal. 1990) [266 Cal.Rptr. 569]`:

| Citation | volume | reporter | page | groupId |
| --- | --- | --- | --- | --- |
| Primary | 50 | `Cal.3d` | 100 | `50-Cal.3d-100` |
| Bracketed | 266 | `Cal.Rptr.` | 569 | `50-Cal.3d-100` (same) |

Adds 7 regression tests: 4 bracketed-cite extraction tests (incl. compound `Cal.Rptr.2d`, pincite inside brackets, `Cal.4th`+`P.3d` parallel), 1 parallel linking assertion (shared `groupId`), 2 regression controls confirming NY Slip Op `[U]` unpublished markers (#231) and existing comma-separated parallels still work.
