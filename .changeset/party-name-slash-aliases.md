---
"eyecite-ts": patch
---

fix: normalizePartyName strips slash-alias variants `f/k/a`, `n/k/a`, `a/k/a` (#240)

Case captions commonly use slash-form party-name aliases to indicate prior or alternative names (e.g., `Acme Corp. f/k/a Beta Inc. v. Jones`). The case-name extractor already preserves these in the full caseName via `INTERNAL_QUALIFIER_REGEX`, but `normalizePartyName` only stripped the `d/b/a` slash form and the bare-word `aka`. The forms `f/k/a` (formerly known as), `n/k/a` (now known as), and `a/k/a` (also known as) leaked into `plaintiffNormalized`/`defendantNormalized`, producing canonical-form values like `"acme corp. f/k/a beta"` instead of `"acme"`.

Combines all four slash-form aliases into a single strip rule so the canonical form is the head-of-name only. Estimated corpus impact: ~96k captions per the cross-jurisdictional parser audit (`docs/research/2026-05-10-citation-style-quirks.md` §M, government-agencies + entity-forms research).

Adds 4 regression tests covering each alias variant with both `caseName` preservation and `plaintiffNormalized` stripping assertions.
