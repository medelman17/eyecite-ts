---
"eyecite-ts": patch
---

Improve short-form citation recall for Id., supra, and shortFormCase patterns.

- Id: handle comma before pincite (`Id., at 105`) and page range pincites (`Id. at 5-6`)
- Supra: support hyphenated names, apostrophes, period-ending names, and `supra note N` with pincite
- ShortFormCase: fix two-letter ordinal suffixes in reporters (`F.4th`, `Cal.4th`)
