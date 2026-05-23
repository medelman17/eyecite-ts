---
"eyecite-ts": patch
---

fix(extract): `compare A with B` propagates compare signal to B (#702)

Resolves #702. Bluebook Rule 1.2(b) treats `compare A with B` as a
paired signal — both citations belong to the same comparison. The
extractor previously assigned `signal=compare` only to A, leaving B
with `signal=undefined`.

| input | before | after |
|---|---|---|
| `Compare Smith, 100 F.2d 1, with Doe, 200 F.3d 5` | A=compare, B=undefined | A=compare, B=compare ✓ |
| `Compare Smith, 100 F.2d 1 with Doe, 200 F.3d 5` | A=compare, B=undefined | A=compare, B=compare ✓ |
| `See Smith, 100 F.2d 1, with Doe, 200 F.3d 5` | A=see, B=undefined | unchanged (no compare) ✓ |
| `Compare A; see Doe, 200 F.3d 5` | A=compare, B=see | unchanged (explicit signal preserved) ✓ |

Added `propagateCompareWithSignal` post-process pass: when a citation
carries `signal=compare` and the gap to the next citation contains
`with`, propagate `compare` to the following citation. Does not
overwrite an explicit signal on the follow-on.

5 regression tests in `tests/extract/issueCompareWithSignal.test.ts`.
