---
"eyecite-ts": minor
---

feat: star-pagination (`at *N`) support on all pincite-bearing citation types (#191)

Star-pagination pincites (`at *1`, `at *2-4`) were silently dropped on `id`,
`supra`, `shortFormCase`, full case cites with slip-opinion reporters (NY Slip
Op), and neutrals (Westlaw, Lexis). In real-world NY state-court briefs this
meant a significant fraction of pincites came back `undefined`. Plain-integer
pincites (`at 465`) continued to work.

Changes:

- **`parsePincite` / `PinciteInfo`** — accept optional `*` prefix; new
  `starPage?: boolean` flag distinguishes slip-opinion pages from reporter
  pages. Existing `page: number` still carries the numeric portion, so
  backward compatibility for consumers reading `pincite` as a number is
  preserved.
- **Full case cites** — `PINCITE_REGEX`, `LOOKAHEAD_PINCITE_REGEX`, and
  `PINCITE_SKIP_REGEX` now accept an optional `at` keyword and `*` prefix.
  Pincite extraction also runs when no trailing parenthetical is present,
  so forms like `2020 NY Slip Op 00001 at *2` capture the pin even though
  there is no `(Court YYYY)` block.
- **Short-form citations** — `ID_PATTERN`, `IBID_PATTERN`, `SUPRA_PATTERN`,
  `STANDALONE_SUPRA_PATTERN`, and `SHORT_FORM_CASE_PATTERN` now accept `*?`
  before the pincite digits. The matching extractors populate
  `pinciteInfo.starPage` and now expose `pinciteInfo` on `IdCitation`,
  `SupraCitation`, and `ShortFormCaseCitation`.
- **Neutral citations** — `NeutralCitation` gains `pincite?: number` and
  `pinciteInfo?: PinciteInfo` fields. `extractNeutral` now accepts the
  cleaned source text and extracts a trailing `, at *N` / ` at *N` pincite.
  Previously, **numeric** pincites on neutrals were also silently dropped;
  this change fixes that as a side effect.

Known limitation: the second occurrence of a NY Slip Op short-form
(`2020 NY Slip Op 00001 at *2`) is still classified as `case` rather than
`shortFormCase`, because `SHORT_FORM_CASE_PATTERN` forbids a page between
the reporter and `at`. The pincite data itself is captured correctly.
Shortform classification for NY Slip Op will be addressed in a follow-up.
