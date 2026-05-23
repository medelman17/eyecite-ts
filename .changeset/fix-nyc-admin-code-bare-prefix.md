---
"eyecite-ts": patch
---

fix(extract): `NYC Admin. Code` bare prefix routes to NY (#594)

Resolves the bare-prefix gap of #594. The canonical `N.Y.C. Admin.
Code` and spelled-out `New York City Administrative Code` forms were
already correct, but the bare-period form (`NYC Admin. Code § 8-107`)
was mis-tagged as Georgia by the `ga-pre-1983` fallback because the
`nyc-admin-code` pattern only matched the period-rich variant.

| input | before | after |
|---|---|---|
| `NYC Admin. Code § 8-107` | code=`Code`, GA | `N.Y.C. Admin. Code`, NY ✓ |
| `NYC Admin Code § 8-107` (no `.`) | code=`Code`, GA | `N.Y.C. Admin. Code`, NY ✓ |
| `N.Y.C. Admin. Code § 8-107(1)(a)` | unchanged | unchanged ✓ |
| `New York City Administrative Code § 8-107` | unchanged | unchanged ✓ |

Extended the tokenizer (`nyc-admin-code` pattern) and the matching
extractor regex to accept the bare `NYC` prefix alongside the
period-rich `N.Y.C.` form.

4 regression tests in `tests/extract/issueNycAdminCodeBare.test.ts`.
