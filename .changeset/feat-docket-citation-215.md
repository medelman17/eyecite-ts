---
"eyecite-ts": minor
---

feat: extract docket-number citations like `Party v. Party, No. 51 (N.Y. 2023)` (#215)

Adds a new `"docket"` citation type for cases identified by docket / slip-opinion number rather than a traditional reporter assignment. Common shapes:

- NY Court of Appeals slip ops: `IKB Int'l, S.A. v. Wells Fargo Bank, N.A., No. 51 (N.Y. 2023)`
- Federal district-court pre-reporter: `Smith v. Jones, No. 19-cv-12345 (S.D.N.Y. 2024)`
- Bankruptcy / `In re` shapes: `In re Smith, No. 22-bk-1234 (Bankr. S.D.N.Y. 2024)`

**Added:**

- `DocketCitation` type with `docketNumber`, `caseName`, `plaintiff`/`defendant`, `court`/`normalizedCourt`, `year`/`date`, `proceduralPrefix`, `fullSpan`, and party-name `*Normalized` fields
- `"docket"` discriminator added to `CitationType`, `FullCitationType`, and the `Citation` / `FullCitation` unions
- `docketPatterns` array with a single tokenizer pattern (`docket-paren-court-year`)
- `extractDocket` extractor with case-name backward-search and disambiguation guard
- `toBluebook` support for the new docket type

**Disambiguation:** A bare `No. 51 (N.Y. 2023)` is too generic to surface on its own, so the extractor only emits a `DocketCitation` when a preceding `Party v. Party,` or `In re Party,` anchor is found. Confidence is 0.7 (lower than reporter-based citations because there is no reporter to validate against).

`isFullCitation` now returns `true` for `"docket"` cites, so they participate in `Id.` and `supra` resolution like other full citations.

8 new tests in `tests/extract/extractDocket.test.ts` cover the NY slip-op shape, federal docket numbers (with and without month/day), `In re` shape, two false-positive guards (no case-name anchor, no year), span coverage, and coexistence with reporter-based cites.
