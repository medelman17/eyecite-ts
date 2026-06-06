---
"eyecite-ts": patch
---

fix(types): classify regulation as a full citation. `RegulationCitation` is now part of the `FullCitation` union and `"regulation"` is included in `FullCitationType`, so consumers narrowing on full-citation types see regulations.
