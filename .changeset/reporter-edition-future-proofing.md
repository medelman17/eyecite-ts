---
"eyecite-ts": patch
---

fix: generalize federal-reporter pattern and pre-register future editions in COMMON_REPORTERS (#234)

The `federal-reporter` and `supreme-court` tokenization regexes hard-coded
edition suffixes (`F.|F.2d|F.3d|F.4th|F.Supp.*`, `L.Ed.|L.Ed.2d`). The broad
`state-reporter` fallback already caught future formats like `F.5th` and
`Cal.6th`, so extraction itself did not fail — but the missing entries in
`COMMON_REPORTERS` cost the +0.3 reporter-match confidence boost, leaving
`100 F.5th 200 (9th Cir. 2025)` at 0.65 confidence vs. 0.95 for `100 F.4th 200`.

Two changes, both defensive:

1. **Generalized regex edition suffix**: replace the explicit enumeration with
   `(?:\d+(?:st|nd|rd|th)|2d|3d)?` so any ordinal — including `F.5th`, `F.10th`,
   `F.Supp.5th`, `L.Ed.3d` — is captured by the precise federal/Supreme Court
   patterns rather than falling through to the state-reporter fallback.

2. **Pre-registered future editions in `COMMON_REPORTERS`**: added the next
   one-to-two editions for every series already in the set (F.5th–F.7th,
   F.Supp.5th–6th, P.4th, A.4th, N.E.4th, N.W.3d, S.E.3d, S.W.4th, So.4th,
   L.Ed.3d) so confidence scoring stays accurate the moment a court adopts
   them — no emergency patch needed.

Adds 7 regression tests: 2 assert confidence parity between `F.5th` / `F.6th`
and `F.4th`, 2 assert clean extraction of future state-reporter editions
(`Cal.6th`, `Cal.7th`) via the broad fallback, and 3 are regression controls
for existing editions (`F.4th`, `F.3d`, `F.2d`).
