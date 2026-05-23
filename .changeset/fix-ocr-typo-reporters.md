---
"eyecite-ts": patch
---

fix(extract): OCR-typo ordinal reporters normalize to canonical form (#687)

Resolves #687. Common OCR misreadings and spelled-ordinal variants of
the `2d`/`3d` reporter suffix left `normalizedReporter` undefined,
breaking parallel-citation grouping and `reporterKey`-based resolution:

| input | before | after |
|---|---|---|
| `100 F.2nd 1` (spelled ordinal) | normalized=undefined | `F.2d` ✓ |
| `100 F.2ds 1` (spurious `s`) | normalized=undefined | `F.2d` ✓ |
| `100 F.2cl 1` (OCR `d`→`cl`) | normalized=undefined | `F.2d` ✓ |
| `100 F.3rd 1` (spelled) | normalized=undefined | `F.3d` ✓ |
| `100 F.3cl 1` (OCR) | normalized=undefined | `F.3d` ✓ |
| `100 Cal.2nd 1` | normalized=undefined | `Cal.2d` ✓ |
| `100 F.4th 1` (canonical) | unchanged | unchanged ✓ |

`resolveNormalizedReporter` now applies an OCR-typo fallback when the
literal reporter is not in reporters-db. The literal `reporter` field
on the citation is preserved verbatim — only `normalizedReporter`
switches to the canonical key. This lets downstream consumers
(`reporterKey`, parallel-group matching) link the typo'd variant to
its real reporter without needing to re-clean the source text.

8 regression tests in `tests/extract/issueOcrTypoReporters.test.ts`.
