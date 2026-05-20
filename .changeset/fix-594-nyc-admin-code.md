---
"eyecite-ts": patch
---

fix(extract): route NYC Admin Code citations to NY (not Georgia) (#594)

`N.Y.C. Admin. Code § 8-107(1)(a)` (and the spelled-out `New York City
Administrative Code § 8-107(1)(a)`) previously matched the Georgia
pre-1983 `Code §` fallback. The bare `Code § 8-107` suffix slotted into
the GA pattern, so the citation extracted as `code: "Code"`,
`jurisdiction: "GA"` — the entire NYC prefix was silently dropped and
the jurisdiction was wrong.

Adds a dedicated `nyc-admin-code` tokenizer pattern and
`extractNycAdminCode` extractor:

- `src/patterns/statutePatterns.ts` — new pattern recognizing both
  abbreviated (`N.Y.C. Admin. Code`) and spelled-out (`New York City
  Administrative Code`) prefixes plus the two-part hyphen section
  body. Listed BEFORE `ga-pre-1983` so the longer prefix-qualified
  match wins span dedup.
- `src/extract/statutes/extractNycAdminCode.ts` — new extractor that
  always emits `code: "N.Y.C. Admin. Code"` (canonical) and
  `jurisdiction: "NY"`.
- `src/extract/extractStatute.ts` — dispatch the new patternId.

The GA `Code §` fallback still owns plain `Code § N-N` citations
without an NYC prefix, so existing pre-1983 GA support is unchanged.
