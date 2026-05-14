---
"eyecite-ts": patch
---

fix: plural `§§ N, N` / `§§ N and N` emits one citation per section (#453)

When a statute reference uses the plural section symbol `§§`
followed by multiple sections (`§§ 18-8004, 18-8005(5)`,
`§§ 13-108 and 13-621`), only the first section was captured —
**60 occurrences across 10 states** in the v0.16.0 corpus were
losing the second and subsequent sections.

### Fix

New `expandPluralSectionList` post-extract pass (step 4.4 in
`extractCitations.ts`):

1. For each statute citation whose `matchedText` contains `§§`,
   scan the cleaned text immediately after its end.
2. Match a continuation pattern of `(,|and|to) <section>` and
   emit one new `StatuteCitation` per match.
3. Each continuation inherits `code`, `jurisdiction`, `title`,
   `year`, `publisher`, `editionLabel`, etc. from the head
   citation; only `section` differs.

Connectors: `,` / ` and ` / ` to `. Section format covers
`12940`, `18-8004`, `12945(b)`, `707-701(1)`.

### Tests

11 new tests in `tests/extract/issue453PluralSection.test.ts`:
comma-separated lists, three-section lists, `and` connector,
inherited code/jurisdiction, singular-§ regression, span
fidelity, subsection on second section, and space-padded
connector. Full 2885-test suite passes.

The range form `§§ 16-1605-1607` (chapter+range expansion) is
deferred to a follow-up issue — this fix covers the most common
comma/`and`-separated forms.
