---
"eyecite-ts": patch
---

fix: `, fn. 3` California footnote variant + neutral-cite paragraph pincites (#311 partial)

#311 surfaces four independent pincite-extraction gaps. This PR
addresses two of them; the other two are deferred (see scope notes).

### Fixed in this PR

**Sub-bug 3 — `, fn. 3` California footnote variant.**
`Smith v. Jones, 45 Cal.3d 744, 768, fn. 3` previously captured
`pincite: 768` but dropped the footnote reference. The canonical
`768 n.3` form already captured the footnote — only the
California-Style-Manual-style `, fn. 3` variant (comma instead of
whitespace separator, `fn.` instead of `n.`) missed.

Extended:

- `LOOKAHEAD_PINCITE_REGEX` (case-cite lookahead in `extractCase.ts`):
  footnote-suffix separator accepts `\s+` or `,\s+`; alternation
  includes `fn` / `fns` alongside `n` / `nn` / `note`.
- `PINCITE_PARSE_REGEX` (structured pincite parser in `pincite.ts`):
  same comma-or-space separator + `fn`/`fns` alternation.

`Smith v. Jones, 45 Cal.3d 744, 768, fn. 3` → `pincite: 768, footnote: 3`.
`, fns. 3-5` multi-footnote ranges also captured.

**Sub-bug 4 — neutral-cite paragraph pincites.**
`State v. Flores, 2015-NMCA-072, ¶ 2` previously captured the neutral
cite but `pincite` and `pinciteInfo` were both undefined. State
appellate practice universally uses paragraph numbering (`¶ N`) instead
of page numbers on neutral cites; missing them was a systematic recall
floor.

Extended `NEUTRAL_PINCITE_LOOKAHEAD` in `extractNeutral.ts` to accept
the paragraph alternatives `¶¶? \d+(?:-\d+)?` / `paras?\.? \d+(?:-\d+)?`
already used by the case-cite lookahead (#204). Also added a fallback
in the extractor: `pincite = pinciteInfo?.page ?? pinciteInfo?.paragraph`
so the top-level numeric `pincite` field reflects the paragraph number
when no page is available.

`2015-NMCA-072, ¶ 2` → `pincite: 2`, `pinciteInfo: { paragraph: 2 }`.
`2015-NMCA-072, ¶¶ 14-16` → `pincite: 14`, `pinciteInfo: { paragraph:
14, endParagraph: 16, isRange: true }`.

### Intentionally deferred (separate follow-up PRs)

**Sub-bug 1 — page ranges in citation core (`109 N.E. 875-877`).** The
state-reporter tokenizer regex requires a single digit run for the
page, so `875-877` overflows the page slot and the citation isn't
extracted at all. Fixing requires changing the tokenizer's page
capture (`\d+` → `\d+(?:-\d+)?`) AND threading range parsing through
the downstream pipeline. Larger, riskier change.

**Sub-bug 2 — CSM `pp. 238, 233` multi-page list.** `462 U.S. at pp.
238, 233` captures only the first pincite. The existing
`ADDITIONAL_PINCITE_REGEX` (added in #247 for `113, 115, 153` chains)
doesn't fire on the `pp.`-prefixed short-form path. Requires
identifying the additional-pincite entry point on short-form cites
and extending it.

### Tests

- 2 new tests in `tests/extract/pincite.test.ts`: California footnote
  variants `768, fn. 3` and `768, fns. 3-5`.
- 3 new tests in `tests/extract/extractCase.test.ts` under
  `California \`, fn. 3\` footnote pincite variant (#311)`: case-cite
  integration + multi-footnote + regression baseline.
- 3 new tests in `tests/extract/extractNeutralHyphenated.test.ts`
  under `paragraph pincite on neutral cites (#311)`: single
  paragraph, paragraph range, regression baseline for database
  cites.

Full 2456-test suite passes; no regressions.
