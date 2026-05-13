---
"eyecite-ts": patch
---

feat: Maryland article-letter codes (`HG § 19-906`, `CP § 10-105`, `R.P. § 8-211`, ...) (#368)

Maryland reorganized its statutory code in 2002 into ~30 named
articles, each cited by a 2- or 3-letter prefix (`HG` for
Health-General, `CP` for Criminal Procedure, `R.P.` for Real
Property, etc.). This is the dominant Maryland court style for
every modern Maryland appellate opinion. A 38-opinion Maryland
sweep showed 25+ Maryland statute misses, dominated by these
article-letter forms — none were extracted.

### Fix

New `md-article-letter` tokenizer pattern in
`src/patterns/statutePatterns.ts` + dedicated
`extractMdArticleLetter` extractor at
`src/extract/statutes/extractMdArticleLetter.ts`. The letter
prefixes are a closed enumeration matching the published
Maryland-Code article list:

```
AB AG BO BR CJ CL CP CR CS EC ED EL EN ET FI FL GP HG HO HS
HU IN LE LG LU NR PS PUC R.P. RP SF SG TA TG TP TR
```

Both dotted (`R.P.`) and dotless (`RP`) variants of Real Property
are accepted. The mandatory `§` connector disambiguates the
letter prefix from ordinary prose tokens that happen to appear at
sentence-initial position. Emits `code: <surface form>`,
`jurisdiction: "MD"`, `section`, `subsection` (preserves the
deep-subsection chains common in Maryland statutes:
`CP § 10-105(e)(4)(ii)(2)`).

### Scope notes

The following pieces of #368 are intentionally deferred:

- **Long-form Bluebook** (`Md. Code Ann., Health-Gen. § 19-906`)
  — the existing `named-code` regex breaks on the hyphen in
  `Health-Gen.`; a one-character regex change there is sufficient
  but deferred to a follow-up PR.
- **Pre-2002 numbered articles** (`Article 27, § 36`,
  `Article 101, § 56(e)`) — requires a different pattern; some
  collision risk with `Article` in other prose contexts.
- **Postfix prose** (`Section X of the Y Article`) — requires
  enumerating the article-name forms.
- **Maryland session laws** (`1987 Md. Laws, ch. 670`,
  `2001 Md. Laws, Chap. 10, § 2`) — pending unified
  `sessionLaw` type.

### Tests

6 new tests under `Maryland article-letter codes (#368)` in
`tests/extract/extractStatute.test.ts`:

- `HG § 19-906` (Health-General)
- `CP § 10-105(e)(4)(ii)(2)` (deep-subsection chain)
- `R.P. § 8-211` (dotted variant)
- `BR § 1-101` (Business Regulation)
- `FL § 5-1027` (Family Law — doesn't collide with Florida)
- Regression: `Fla. Stat. § 119.07` continues to route to Florida

Full 2614-test suite passes; no regressions.

### Related

The Maryland article-letter code system is unique among U.S.
states — no other jurisdiction uses 2-letter prefixes as the
bare citation form. The pattern complements the existing
`named-code` family that handles `N.Y. Penal Law § N`,
`Cal. Civ. Code § N`, etc.
