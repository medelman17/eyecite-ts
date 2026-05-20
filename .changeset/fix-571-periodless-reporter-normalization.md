---
"eyecite-ts": patch
---

fix(extract): wire `normalizedReporter` + add periodless variants (#571)

Compact reporter forms used by NY/IL/OH/CA/federal slip-ops (`725 F2d
1091`, `24 Ill2d 270`, `60 Ill App2d 39`, `140 N.J.Eq. 496`, `17 Oh St
649`, `125 OhioSt. 219`, `329 FedAppx. 1`) were extracted into a `case`
citation, but `normalizedReporter` stayed `undefined` — so downstream
consumers (`reporterKey`, `bluebook`, parallel-group matching) couldn't
link them to their canonical Bluebook form.

Two compounding causes, both fixed here:

1. **`normalizedReporter` was never populated.** The field was advertised
   on `FullCaseCitation` and consumed by `src/utils/reporterKey.ts` and
   `src/utils/bluebook.ts`, but the case extractor never wrote it. Even
   inputs whose variation entries WERE in reporters-db (`NE2d`, `P2d`)
   came back with `normalizedReporter: undefined`. New helper
   `resolveNormalizedReporter` (`src/extract/extractCase.ts`) looks the
   reporter literal up via `byAbbreviation` — matches an edition key
   directly when one exists, otherwise resolves through the
   `variations` map. Returns `undefined` when reporters-db is not
   loaded (preserves degraded-mode behaviour) or when the literal is
   unknown.

2. **Missing variations.** Even with the wiring in place, several
   periodless / no-space forms had no DB entry to resolve against. Added
   to `data/reporters.json`:

   - `F.` (Federal Reporter): `F2d`, `F2d.`
   - `F. App'x` (Federal Appendix): `FedAppx`, `FedAppx.`
   - `Ill.` (Illinois Reports): `Ill2d`
   - `Ill. App.` (Illinois Appellate): `Ill App2d`, `Ill App3d`,
     `IllApp2d`, `IllApp3d`
   - `Ohio St.` (Ohio State): `Oh St`, `Oh St 2d`, `Oh St 3d`,
     `Oh St.`, `OhSt.`, `OhioSt.`, `OhioSt.2d`, `OhioSt.3d`
   - `N.J. Eq.` (NJ Equity): `N.J.Eq.`, `NJ Eq.`, `NJEq.`

Coverage: 15 new tests in
`tests/extract/issue571PeriodlessReporterNormalization.test.ts`
covering pre-existing baselines (NE2d, P2d), all newly-added variants
for federal / Illinois / Ohio / NJ reporters, canonical-edition
regression guards (F.2d / U.S. / N.E.2d resolve to themselves), the
post-cleaning Cal.4th → reporters-db `Cal. 4th` mapping (pins the
inner-space mismatch documented in #555), and the unknown-reporter
fallback path (no DB hit → `normalizedReporter` stays `undefined`).
