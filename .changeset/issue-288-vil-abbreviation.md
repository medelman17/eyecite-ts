---
"eyecite-ts": patch
---

fix: add `Vil.` and `Enters.` to case-name abbreviation set (#288)

`extractCitations` truncated `caseName` when a party name contained `Vil.`
(the NY-court single-L variant of Bluebook `Vill.` for "Village"). The
case-name scanback treated the `.` as a sentence terminator and restarted
the case-name candidate after it — captions like
`Bristol Harbour Vil. Assn., Inc.` (NY 4th Dep't) and
`Smithtown Vil. Bd.` truncated to `"Assn., Inc."` and `"Bd."`
respectively. The Bluebook double-L `Vill.` was already in the
abbreviation set and worked correctly, confirming a missing-variant gap
rather than a structural scanback issue.

### Fix

Added two entries to `CASE_NAME_ABBREVS` in `src/extract/extractCase.ts`:

- **`vil`** — Bluebook T6 `Vill.` variant used by NY Reporter / Slip
  Opinion captions, especially 4th Dep't. Placed alongside the existing
  state-practice gap `"tp"` (NJ alternative to `Twp.` for "Township"),
  with the same comment-block style.
- **`enters`** — Bluebook T6 plural of `Enter.` (Enterprises). Surfaced
  by the same issue's first repro case (`Fields Enters. Inc. v. Bristol
  Harbour Vil. Assn., Inc.`) — once the `Vil.` gap was fixed, the
  scanback still truncated at the `Enters.` boundary, revealing a
  separate but identically-shaped missing-stem gap. Placed next to the
  existing singular `"enter"`.

No regex changes; both additions are single-stem entries in the existing
set.

### Tests

Three new tests in `tests/extract/extractCase.test.ts` under the
existing `case name boundary bugs` block:

- `#288: handles Vil. in Bristol Harbour Vil. Assn., Inc. (4th Dep't)`
  — full caption with both `Enters.` and `Vil.` abbreviations.
- `#288: handles Smithtown Vil. Bd.` — `Vil.` in isolation.
- `#288: regression — Bluebook Vill. still works` — guards against
  accidental change to the canonical double-L form.

Full 2368-test suite passes; no regressions.
