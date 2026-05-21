---
"eyecite-ts": patch
---

fix(extract): date-modifier verbs (`filed`, `decided`, `argued`, etc.) no longer pollute `court` field

Following the disposition + editorial + judge-attribution fixes,
Bluebook Rule 10.5 date-modifier verbs that prefix a date inside the
court parenthetical still leaked into the `court` field:

- `(filed Jan. 15, 1990)` → `court="filed"` ⇒ now `undefined`
- `(decided Mar. 15, 1990)` → `court="decided"` ⇒ now `undefined`
- `(argued Apr. 1, 1990)` → `court="argued"` ⇒ now `undefined`
- `(submitted Jan. 1, 1990)` → `court="submitted"` ⇒ now `undefined`
- `(effective Jan. 1, 1990)` → `court="effective"` ⇒ now `undefined`
- `(entered Jan. 1, 1990)` → `court="entered"` ⇒ now `undefined`
- `(heard Jan. 1, 1990)` → `court="heard"` ⇒ now `undefined`
- `(argued ..., decided ...)` → `court="argued Apr. 1, 1990, decided"` ⇒ now `undefined`

Detection: after year+date-stripping, content starting with one of
these verb prefixes is rejected.

10 regression tests in `tests/extract/issueDateModifierAsCourt.test.ts`.
