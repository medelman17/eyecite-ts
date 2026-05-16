---
"eyecite-ts": patch
---

fix: caseName multi-`v.` recovery preserves entity-suffix commas (`, Inc.` / `, LLC` / `, Corp.`)

Follow-up to the heading-boundary fix (#477). When a section
heading + body produces a defendant with multiple `v.` anchors
AND no heading-verb boundary (e.g., the body cite uses a docket
number rather than a reporter), the recovery fell back to the
existing comma-trim logic, which truncates at the FIRST comma
in the defendant — incorrectly stripping entity suffixes like
`, Inc.`:

```
Collins v. Anthem, Inc. Is Distinguishable
In Collins v. Anthem, Inc., No. 20-CV-01969 (E.D.N.Y. Mar. 19, 2024) ...

got: caseName="Collins v. Anthem"
exp: caseName="Collins v. Anthem, Inc."
```

### Fix

Multi-`v.` recovery is now reordered and entity-aware:

1. **Heading-verb boundary first** (definitive). If the
   defendant contains a standalone to-be verb (`Is`/`Are`/
   `Was`/`Were`), truncate there. This preserves entity-suffix
   commas because the verb sits between the entity suffix and
   the heading-prose.
2. **Comma-trim with entity-suffix skip**. When no heading-verb
   is present, scan for commas — but skip any comma immediately
   followed by `Inc.`, `LLC`, `Corp.`, `Co.`, `Ltd.`, `LLP`,
   `LP`, `P.C.`, `N.A.`, `S.A.`, `GmbH`, or `S.p.A.`.

### Tests

3 new tests added to
`tests/extract/issueCaseNameHeadingBoundary.test.ts` covering
`Anthem, Inc.` / `Acme, LLC` / `Acme, Corp.` in the heading +
body shape. Full 2952-test suite passes; #222 consolidated
captions and #436 entity-suffix tests still pass.
