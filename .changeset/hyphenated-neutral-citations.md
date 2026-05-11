---
"eyecite-ts": patch
---

fix: hyphenated public-domain neutral citations (NM, Ohio, NC, MS) now extract (#233)

The `casePatterns.state-vendor-neutral` regex was whitespace-separated only. Hyphenated public-domain formats used by New Mexico, Ohio, North Carolina, and Mississippi silently produced zero citations.

Two new tokenization patterns in `neutralPatterns.ts`:

- **`state-vendor-neutral-hyphenated`** (3-segment) — `\b(\d{4})-([A-Z][A-Za-z]+)-(\d+)\b/g`. Covers NM (`2010-NMSC-007`, `2012-NMCA-004`, `2015-NMCERT-009`), Ohio (`2024-Ohio-764` — note the mixed-case "Ohio" token), and NC (`2020-NCSC-118`, `2023-NCCOA-450`).
- **`state-vendor-neutral-hyphenated-ms`** (4-segment) — `\b(\d{4})-([A-Z]+)-(\d+)-([A-Z]+)\b/g`. Covers Mississippi's `year-caseType-number-appellateTrack` form (`2010-CT-01234-SCT`, `2015-CA-00567-COA`). Listed first in the pattern array so the regex engine prefers the longer match when both could fire.

`extractNeutral.ts` extended with a Mississippi-aware parse path. The 4-segment form composes the `court` field as `${caseType}-${appellateTrack}` (e.g., `CT-SCT`) so the single `court` field preserves the full sovereign identifier. The 3-segment hyphenated form falls through to a generalized whitespace-or-hyphen separator regex that also covers the existing UT/WI/IL/WL/LEXIS shapes.

Adds 13 corpus-shaped regression tests in `tests/extract/extractNeutralHyphenated.test.ts`: 3 NM variants, 2 Ohio, 2 NC, 2 MS, and 4 whitespace-separated regression controls (UT, WI, IL, WL) confirming the existing pattern shapes are unaffected.
