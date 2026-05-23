---
"eyecite-ts": patch
---

fix(filter): hard-reject vol=0, page=0, vol > 999999 (#673 bugs 6-8)

Resolves bugs 6-8 of #673. Implausible volume / page magnitudes are
now hard-rejected — real reporters always have volume ≥ 1 and page
≥ 1, and volumes never reach 10-digit territory. These citations
come from misread digit sequences in prose.

| input | before | after |
|---|---|---|
| `0 U.S. 1` | extracts with conf=0.6 | hard-rejected ✓ |
| `1 U.S. 0` | extracts with conf=0.6 | hard-rejected ✓ |
| `1234567890 U.S. 1` | extracts with conf=0.1 | hard-rejected ✓ |
| `100 U.S. 1` (normal) | unchanged | unchanged ✓ |
| `100 U.S. 1234` (normal page) | unchanged | unchanged ✓ |

Added `isImplausibleVolumePageMagnitude` to the hard-reject pass.
The existing `isImplausibleVolume` flag-and-penalize behavior still
applies for the in-between range (vol > 2000 but ≤ 999999) so
year-as-volume neutral citations continue to work.

The previously-asserted `0 F.2d 1` → vol=0 test case in
`issueLeadingZeroVolume.test.ts` was updated to expect 0 cites
(leading-zero forms `01`, `001` etc. still parse correctly to
integer values).

7 regression tests in `tests/extract/issueImplausibleVolPage.test.ts`
covering the three rejection paths plus regression controls.
