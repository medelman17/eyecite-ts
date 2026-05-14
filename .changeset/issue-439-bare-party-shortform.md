---
"eyecite-ts": minor
---

feat: bare-party shortform back-references `Smith, at 12` (#439)

After a full citation establishes `Smith v. Jones, 100 F.2d 50`,
subsequent shorthand `Smith, at 12` is the standard Bluebook
back-reference but was not captured by the regex tokenizer because
it lacks the volume+reporter shape. **47 occurrences** across
the 50-state baseline were unrecognized — common forms include
`Striker, at 871`, `Pacheco, at 65`, `Hutchison, at 887-88`, and
multi-word entities like `South Hollywood Hills Citizens Ass'n,
at 73`.

### Fix

New `detectBarePartyBackReferences` post-extract pass in
`src/extract/extractCitations.ts` (step 4.72):

1. Builds a party-name index from full case citations using
   `plaintiff` / `defendant` (plus stripped variants that drop
   procedural prefixes like `In re`, `Estate of`, and
   sentence-initial connectors like `See`, `Cf.`, `Then`).
2. For each indexed name, scans the cleaned text for
   `<name>, at <pincite>` matches that come after the anchor's
   position and do not overlap an existing citation.
3. Emits a `ShortFormCaseCitation` inheriting `volume` /
   `reporter` / `page` from the anchor, with `partyName` and
   `pincite` set from the match.

When multiple anchors share a name, the most-recent one whose
end precedes the bare-ref wins (Bluebook short-form refers to the
most recent establishment).

### False-positive defenses

- **Anchor required**: only names that already appear as a party
  in an earlier full citation can match. Bare `Smith, at 12` with
  no prior `Smith v. ...` is left as prose.
- **Min name length (3)**: 2-character anchors (`Wu`, `Lu`) are
  not indexed.
- **Blocklist**: common captions (`United States`, `State`,
  `People`, signal/connector words) are blocked.
- **Word-boundary lookbehind**: `(?<![A-Za-z'])` prevents
  partial-prefix matches like `mySmith, at 12`.
- **Numeric pincite required**: `Smith, at noon` or `Smith, at
  the time` are rejected.
- **Mandatory comma**: `Smith at 12` (no comma) is rejected as
  ambiguous prose.

### Tests

57 new tests under `tests/extract/issue439BarePartyShortform.test.ts`
covering basic positive cases, pincite shapes (single, hyphenated
range, comma-list, short-hyphen `887-88`), name shapes (apostrophe,
hyphen, multi-word, `In re Smith`), multi-reference scenarios,
most-recent anchor selection, span fidelity (clean + original with
HTML cleaning), false-positive avoidance, real samples from the
issue body, citation metadata, resolver integration, compatibility
with existing supra/`Id.`/short-form patterns, and state-reporter
forms (Wis. 2d, Mass.). Full 2855-test suite passes.

Closes the final outstanding bug in the 15-bug cross-cutting
cluster from #450.
