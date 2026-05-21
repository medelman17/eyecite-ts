---
"eyecite-ts": minor
---

fix(extract): reject phantom case/journal citations harvested from prose

The broad `state-reporter` (case) and `law-review` (journal) regex
patterns used a lazy `[A-Za-z.\d\s&']+?` capture for the reporter
name, which absorbed lowercase prose words after a space. Real
reporters are always Title Case + periods + digit suffixes, so any
lowercase-starting token is a near-perfect prose signal.

Token-aware capture: after the first uppercase letter, each
subsequent space-separated token must START with uppercase letter,
digit, or `&`. Within a token, any of `[A-Za-z.\d&']` are still
allowed.

Phantoms killed (each had been emitted with prose absorbed as
"reporter"):

**Case-citation phantoms:**
- `¶ 2 Beginning in 2011` (paragraph marker + prose)
- `¶ 7 All of the items seized for evidence on March 18`
- `15 ODC maintains that Tennant violated Rule 1.5`
- `771 The Administrator also argues that respondent's violation`
- `2009 General Primary Election due to the fact that...`
- `2001 Vickers contends that the review panel erred`
- `2003 Senate Staff Analysis and Economic Impact Statement to argue...`
- `11 Juror No. 11` (section heading)
- `100 AND 200` / `50 OR 100` (already fixed via lookahead in earlier PR)

**Journal-citation phantoms:**
- `20006 Counsel for Appellees 20004` (zip code + prose)

Real reporters and journals unaffected:
- `100 U.S. 1`, `500 F.2d 123`, `100 Cal. App. 4th 200`
- `100 F. Supp. 2d 200`, `100 Ohio St. 3d 200`, `100 Idaho 50`
- `27 I. & N. Dec. 100` (BIA Immigration with ampersand)
- `100 A.L.R.2d 1234`
- `120 Harv. L. Rev. 500`, `100 Yale L.J. 200`

Three further phantom shapes (`On July`, `On March`, `Violates
Section`) are still emitted with confidence 0.1 + warnings — both
tokens start with uppercase so the regex accepts them. Removing
them entirely requires extending the FP filter's hard-reject pass,
which would break pre-existing tests asserting penalize-mode
behavior. Skipped tests in `issuePhantomCaseRejection.test.ts`
document the gap.

Two pre-existing tests updated to reflect the new (strictly better)
behavior: a phantom case is now removed entirely instead of being
penalized to confidence 0.1 + warning.

28 new tests in `tests/extract/issuePhantomCaseRejection.test.ts`
covering paragraph markers, section headings, numbered list items
+ prose, year-prefixed prose phantoms, bare conjunction phantoms
(regression for the earlier AND/OR fix), date-shape phantoms, and
extensive regression guards for legitimate reporters.
