---
"eyecite-ts": patch
---

Restore the +0.3 reporter-match confidence boost for SCOTUS, F.Supp.*, So.*, and common state reporters in degraded mode (#555).

`cleaners.normalizeReporterSpacing` collapses inner spaces in known reporter abbreviations (`S. Ct.` → `S.Ct.`, `L. Ed. 2d` → `L.Ed.2d`, `F. Supp. 2d` → `F.Supp.2d`, `So. 2d` → `So.2d`). The `COMMON_REPORTERS` fallback set used by `extractCase.ts` was authored against the pre-cleaning Bluebook canonicals — so those spaced entries were dead and never matched anything the extractor actually produced. State reporters from the audit (`Mass.`, `Va.`, `Pa.`, `Idaho`) and the Cal. family (`Cal.4th`, `Cal.Rptr.2d`, etc.) were absent entirely. The fallback only matters when reporters-db has not been loaded — but `extractCitations` is synchronous and never auto-loads it, so this code path is hit on every default invocation.

Result, pre-fix: a 300-opinion CAP-corpus audit found 100% of `S.Ct.` / `L.Ed.2d` / `Mass.` / `Cal.Rptr.2d` / `Va.` citations scoring 0.65 (or lower without a court parenthetical) instead of the 0.95 they should reach. Mean case-citation confidence: 0.46, with 81% under 0.7.

`COMMON_REPORTERS` now uses the post-cleaning canonical forms (no inner spaces) and explicitly includes the audited state reporters and the full Cal. family. The spaced Bluebook forms are kept alongside for defensiveness in case a code path skips the cleaner. The fix surfaces both ways: the existing `extractCase.ts` confidence scoring and the `extractShortForms.ts` short-form reporter check both benefit, since both consume the same set.

Auto-loading the reporters-db from `extractCitationsAsync` was considered as a complementary fix but deferred — it couples the core bundle to the data chunk and surfaces a separate pre-existing dist-runtime path-resolution issue that warrants its own focused PR.
