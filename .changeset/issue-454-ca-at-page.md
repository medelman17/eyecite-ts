---
"eyecite-ts": patch
---

fix: bare-party shortform accepts `at p. N` / `at pp. N-M` / `at page N` (#454)

The #439 fix recognized `Smith, at 12` but not the California
Style Manual variant `Smith, at p. 12` — **26 CA occurrences**
in the v0.16.0 replay used the `p.` / `pp.` page-prefix form and
were dropped.

### Fix

Extended the pincite-capture regex in
`detectBarePartyBackReferences` to accept an optional
`p.` / `pp.` / `page` / `pages` between `at` and the digit:

```
(?<![A-Za-z'])(<name>)\s*,\s*at\s+(?:pp?\.?\s*|pages?\s+)?(<pincite>)
```

### Tests

7 new tests under `California style \`at p. N\` / \`at pp. N-M\`
(#454)` in `tests/extract/issue439BarePartyShortform.test.ts`:
`at p. N`, `at pp. N-M`, `at page N`, `at pages N-M`, multi-word
plaintiff, non-digit FP rejection, and the no-prefix regression.
Full 2874-test suite passes.
