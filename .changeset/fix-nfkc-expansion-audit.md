---
"eyecite-ts": patch
---

fix(clean): strip vulgar fractions, numero sign, CJK units pre-NFKC (#605)

Resolves #605. Sprint A audit identified additional chars beyond
™ ® ℠ © that NFKC expands to multi-char ASCII — `½` → "1⁄2",
`№` → "No", `㎡` → "m2", `℃` → "°C", etc. These expansions break
the implicit invariant that cleaning never lengthens text, and can
drift position mapping or create false-positive citation matches.

Extended `normalizeUnicode` to strip these chars before NFKC:
- Vulgar fractions (`¼-¾`, `⅐-⅞`)
- Numero sign (`№`)
- CJK compatibility units + Letterlike Symbols (`㎀-㏿`, `℀-⅏`)

These chars are vanishingly rare in legal text — when they do appear
(`Case № 12-345`), surrounding context preserves the meaning, so
stripping is a safer default than letting NFKC expand inline.

The cleaned text length is now guaranteed never to *exceed* the
original length under `normalizeUnicode`.

6 regression tests in `tests/clean/issueNfkcExpansionAudit.test.ts`,
including a length-invariant assertion across a sample of inputs.
