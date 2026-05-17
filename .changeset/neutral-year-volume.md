---
"eyecite-ts": patch
---

fix: year-as-volume neutral citations survive `filterFalsePositives` (NY Slip Op, WL, LEXIS, IL App)

`MAX_PLAUSIBLE_VOLUME = 2000` flagged any citation with volume > 2000 as a
likely zip code or junk number. Vendor-neutral reporters use the year of
decision as the "volume" (`2026 NY Slip Op 01627`, `2024 WL 12345`,
`2025 IL App (1st) 230456`, `2026 U.S. App. LEXIS 7890`), so every such
citation from 2001 onward was being dropped when callers passed
`filterFalsePositives: true`.

### Fix

`isImplausibleVolume` now allows volumes in the plausible-year range
(1900–2099) regardless of the cap. Truly garbage values — 5-digit zip
codes (≥ 10000), 4-digit numbers outside the year window (e.g., `3500`)
— still flag.

### Tests

4 new tests in `tests/extract/issue480FollowupNeutralYearVolume.test.ts`:
- `2026 NY Slip Op 01627` survives filtering (the original reproduction
  from the user report).
- `2030 NY Slip Op` survives (future-year safety through 2099).
- `DC 20006 Counsel for Appellees 20004` still filtered (5-digit zip).
- `3500 F.3d 5` still filtered (4-digit but not year-shaped).

Full suite: 2966 tests pass.
