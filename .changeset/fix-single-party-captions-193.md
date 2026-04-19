---
"eyecite-ts": patch
---

fix: recognize single-party corporate captions and `In the Matter of …` prefix (#193)

`FullCaseCitation.caseName` came back `null` for any caption that didn't
contain ` v. ` or match the short procedural-prefix list (`In re`,
`Matter of`, `Estate of`, `Ex parte`, etc.). Common NY patterns like
`Board of Mgrs. of the St. Tropez Condominium` and `Board of Directors
of Hill Park` silently lost their case names — downstream UI fell back
to displaying the bare reporter triple.

Two root causes:

- **Missing long-form procedural prefix.** `In the Matter of X` was
  reduced to `Matter of X` because the short prefix matched mid-string
  before the long one could. Added `In the Matter of` to
  `PROCEDURAL_PREFIX_REGEX` and the `extractPartyNames` prefix list, both
  with priority over `Matter of`.
- **No generic fallback for single-party captions.** When both `V.` and
  procedural-prefix scans fail, the backward scanner now uses the
  post-truncation `precedingText` itself as the caption, after stripping
  any leading signal word (`See`, `cf.`, etc.) and validating via
  `isLikelyPartyName` + `SENTENCE_INITIAL_WORDS`. Because the truncation
  step already bounds `precedingText` by sentence/citation/paren-signal
  boundaries, sentence prose like "The court held that..." is not
  mis-matched.

11 new regression tests cover corporate captions (`Board of Mgrs. of`,
`Board of Managers of`, `Board of Directors of`, bare `Corp.`),
`In the Matter of` priority over `Matter of`, sentence-prose safety, and
pre-existing adversarial/`Estate of`/`ex rel.` controls.
