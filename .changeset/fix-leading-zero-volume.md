---
"eyecite-ts": patch
---

fix(extract): leading-zero volumes consistently parse as integers (#703)

Resolves #703. The case-extractor's `parseVolume` used `String(num) === raw`
to decide whether a volume was purely numeric. Leading-zero forms
(`"01"`, `"001"`) failed that equality check (`String(1) !== "01"`) and
fell through to the string branch, producing inconsistent typing:

| input | before | after |
|---|---|---|
| `0 F.2d 1` | volume=`0` (number) | volume=`0` (number) ✓ |
| `01 F.2d 1` | volume=`"01"` (string) | volume=`1` (number) ✓ |
| `001 F.2d 1` | volume=`"001"` (string) | volume=`1` (number) ✓ |
| `1984-1 F.2d 1` | volume=`"1984-1"` (string) | unchanged ✓ |

Fix: parse purely-digit volumes via `Number.parseInt` unconditionally
(detected by `/^\d+$/`). Hyphenated forms (`1984-1`) still return as
strings.

7 regression tests in `tests/extract/issueLeadingZeroVolume.test.ts`.
