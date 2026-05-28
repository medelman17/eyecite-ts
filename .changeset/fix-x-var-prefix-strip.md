---
"eyecite-ts": patch
---

fix(extract): strip variable single-letter prefix from plaintiff (#710)

Resolves part of #710. When `<single-letter>. ` appears immediately
before what looks like a party name (`held that X. Smith v. Jones`)
and the trim block fires (because the regex captured surrounding
prose context), strip the single-letter prefix — it's a sentence-
internal variable, not an initial.

Disambiguator: the dropped word immediately before the single-letter
token must be a lowercase ≥4-char word (verb/conjunction like
`that`/`because`/`unless`/`when`). Signal contexts (`See J. Smith`)
and procedural-prefix contexts (`In re J. Smith`) are unaffected
because those drop different prefixes.

| input | before | after |
|---|---|---|
| `The Smith case held that X. Smith v. Jones, ...` | plaintiff=`X. Smith` | `Smith` ✓ |
| `In re J. Smith v. Jones` | plaintiff=`J. Smith` | unchanged ✓ |
| `See J. Smith v. Jones` | plaintiff=`J. Smith` | unchanged ✓ |
| `K. Brown was right; M. Jones v. K. Brown` | plaintiff=`M. Jones` | unchanged ✓ |
| `The court held that K. Brown v. Smith` | plaintiff=`K. Brown` | `Brown` ✓ |

Known limitation (not covered by this fix): standalone shapes where
the regex doesn't trim at all (e.g., `held because X. Smith v. Y`
with no longer surrounding prose) still produce `X. Smith`. Those
need a different anchor and are deferred.

5 regression tests in `tests/extract/issueXVarPrefixStrip.test.ts`.
