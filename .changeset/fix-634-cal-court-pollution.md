---
"eyecite-ts": patch
---

fix(extract): reject short-form case nicknames as court in California (and all reporter) parentheticals — #634

A California reporter (or Cal.Xth) citation followed by a parenthetical
short-form case anchor (Bluebook Rule 10.9) — `(Macaluso)`, `(Privette)`,
`(Fox Johns)`, `(SeaBright)`, `(Regalado)`, etc. — was populating the
`court` field with that nickname. Root cause: `stripDateFromCourt`
returned any letter-bearing string as a "court" after stripping dates;
existing reject filters only caught lowercase signal-word leads or
3+ word lowercase prose, so a single Title-Case word slipped through.

Every Bluebook T7 court abbreviation contains at least one period
(`Cal.`, `9th Cir.`, `D. Mass.`, `S.D.N.Y.`, `Ct. App.`). The fix
extends the no-period rejection inside `stripDateFromCourt`: when the
content has no period anywhere AND every alphabetic word starts with
uppercase AND no word is an ordinal indicator (`2d`, `9th`, `1st`), it
is a short-form case anchor — not a court — and is rejected.

Affected reproductions (all 8 from issue #634 now return
`court: undefined`):
- `162 Cal.Rptr.3d 318 (Macaluso)`
- `162 Cal.Rptr.3d 571 (Fox Johns)`
- `5 Cal.4th 689 (Privette)`
- `27 Cal.4th 198 (Hooker)`
- `3 Cal.App.5th 582 (Regalado)`
- `52 Cal.4th 590 (SeaBright)`
- `129 Cal.Rptr.3d 601 (SeaBright)`
- `207 Cal.Rptr.3d 712 (Regalado)`

Reporter-based `inferredCourt` (level/jurisdiction/state) is unaffected
— Cal.4th still resolves to `{level: "supreme", jurisdiction: "state",
state: "CA"}` even when the parenthetical is rejected. Legitimate court
parentheticals (`(9th Cir.)`, `(D. Mass. 2019)`, `(Cal. Ct. App.)`,
`(Ct. App.)`, `(2d Cir. 2020)`) continue to extract court correctly.

24 new tests in
`tests/extract/issue634CalCourtParentheticalPollution.test.ts` cover
all 8 reproductions, reporter coverage (Cal.4th / Cal.App.5th /
Cal.Rptr.3d), single-word/two-word/camel-case nicknames, mixed
name+year parens (`(Macaluso, 2013)`, `(Privette 2013)`), legitimate
court abbreviation regressions, and reporter-inference preservation.
