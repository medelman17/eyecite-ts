---
"eyecite-ts": patch
---

feat: extract Revised Laws of Hawaii (pre-1955) `RLH YYYY § N` citations (#359)

Hawaii compiled its statutes as `RLH 1935`, `RLH 1945`, and `RLH 1955`
before adopting the modern Hawaii Revised Statutes (HRS) in 1968.
Modern Hawaii opinions still cite RLH when referencing pre-1955
statutory history. A 50-opinion Hawaii sample showed these forms
weren't extracted.

### Fix

New `rlh` tokenizer pattern in `src/patterns/statutePatterns.ts` and
dedicated `extractRlh` extractor at
`src/extract/statutes/extractRlh.ts`.

Tokenizer regex:

```
\bRLH\s+(\d{4})\s+§\s+(<section-body>)
```

The `RLH` abbreviation is distinctively Hawaii-only, so no
jurisdiction disambiguation is needed. Output:
`code: "RLH"`, `jurisdiction: "HI"`, `year` = edition (1935/1945/1955),
`section` (and `subsection` if present).

### Scope notes

The dominant Hawaii citation form `HRS § N` already worked (handled by
the abbreviated-code pattern). This PR adds only the historical RLH
compilation. The following pieces of #359 are intentionally deferred:

- **HRS Chapter-only references** (`HRS Chapter 353E`) — needs a
  `chapter`/section-less data model.
- **HRS multi-section lists** (`HRS §§ 705-500, 707-701(1) (1985)`)
  — same multi-section scope deferred for other states.
- **Hawaii Session Laws** (`1927 Sess. L., Act 206, § 4, at 209`) —
  needs a new `sessionLaw` citation type, tracked alongside the
  unified-session-law work for CA / FL / CO / AR / GA.
- **Prose form with okina** (`Section X of the Hawai'i Revised
  Statutes`) — sibling to `extractColoradoProse` (#352); deferred.

### Tests

4 new tests under `Revised Laws of Hawaii (pre-1955) (#359)` in
`tests/extract/extractStatute.test.ts`:

- Canonical `RLH 1935 § 2545`
- `RLH 1945 § 7186`
- Hyphenated section `RLH 1955 § 100-1`
- Regression: modern `HRS § 658-8 (1976)` continues to work

Full 2574-test suite passes; no regressions.

### Related

Companion to #330 (pre-1993 Illinois Revised Statutes) and #343
(Code of Alabama 1940) — historical state-statute formats that
remain in active citation.
