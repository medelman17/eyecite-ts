# Confidence Scoring Overhaul Design

**Date:** 2026-05-17
**Status:** Draft

## Goal

Replace the current ad-hoc `confidence: number` field on every citation with a **structured, calibrated, decomposed, and inspectable** confidence model. Deliver against three motivations simultaneously:

1. **Honest, calibrated numbers** — `confidence.score ≥ 0.9` corresponds to a documented precision floor measured on a labeled eval corpus, with per-pattern ECE published.
2. **Decomposed, debuggable signals** — separate `extraction`, `metadata`, and `resolution` axes plus machine-readable `reasons[]` codes so consumers can interpret what drove a score.
3. **Better filtering + DX ergonomics** — `precisionTarget`-driven filtering, opt-in `explain` mode, scorer profiles, and recommended thresholds tables so consumers stop guessing.

This is a pre-1.0 (currently 0.18.x) overhaul; breaking changes are on the table.

## Background

Python eyecite — the project we ported — has no `confidence` field at all (verified: zero references in `eyecite/*.py`). The current `confidence: number` is a TypeScript-port-only addition that grew organically: every extractor invented its own scoring scheme. The result is four independent scoring layers (per-extractor heuristics, false-positive filter penalty, opt-in reporters-DB validation, separate resolver confidence) that produce un-calibrated numbers, conflate orthogonal concerns, and leave consumers guessing thresholds.

Comparable libraries (GROBID, AnyStyle, spaCy NER, AWS Comprehend, Google Document AI, Azure Document Intelligence) all confirm that calibrated extraction confidence is an unsolved problem in the broader field. The strongest production patterns to borrow:

- **Veryfi** — separate `ocr_score` (did we read it?) from `score` (did we assign the field correctly?)
- **Azure Document Intelligence** — composite structures (rows, tables) get their own confidence, distinct from cells
- **Mindee** — categorical buckets (`Certain | High | Medium | Low`) for stable cross-version semantics
- **Elasticsearch `_explain`** — opt-in nested `{value, description, details}` tree, generic across scorers
- **OpenAI logprobs** — raw signal + explicit "calibrate on your own corpus" guidance

Calibration techniques that work for a zero-dependency TypeScript library: **histogram binning** (simplest, non-parametric) and **Platt scaling** (2-param sigmoid fit by gradient descent) on top of hand-rolled feature weights, with **ECE** as the evaluation metric.

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| API shape | Full struct replacement (`confidence: Confidence`) | Pre-1.0 freedom; cleaner end state than additive fields |
| Decomposition | Three axes: `extraction`, `metadata`, `resolution?` | Veryfi-style; addresses motivation 2 directly |
| Rationale exposure | `reasons: ReasonCode[]` (enum) + opt-in `explanation` tree | Machine-readable AND human-debuggable |
| Calibration technique | Tiered: histogram binning (≥30 samples), Platt (10–29), identity (<10) | Matches data shape; non-parametric where possible |
| Scorer weights | Hand-rolled (named, centralized); learned LR weights deferred | Simpler to reason about; LR is a drop-in upgrade later |
| Calibration data | `src/score/calibration.json`, committed | Reproducible, auditable, deterministic from inputs |
| CI gate | ECE per pattern may not regress >0.02 | Catches scorer changes that wreck calibration of unrelated extractors |
| Consumer filtering | `precisionTarget: 0.95`-style API | Replaces magic-number thresholds with documented precision contracts |
| Scorer profiles | Reserved API surface + small preset library | Future-proofs per-domain calibration; YAGNI-resistant |
| Reporters-DB validation | Folded into default pipeline (lazy-load) | Eliminates "validation is opt-in" footgun; preserves bundle-size opt-out |
| Resolver confidence field | Removed; moved to `confidence.axes.resolution` | One coherent story per citation; no parallel confidence fields |
| Versioning | `scorerVersion` field on calibration JSON | Consumers can detect scoring shifts; bump on weight/feature changes |

## API Shape

### Types

```ts
type ConfidenceLevel = "certain" | "high" | "medium" | "low"

type ReasonCode =
  // Positive extraction signals
  | "known_reporter"
  | "year_plausible"
  | "case_name_present"
  | "court_identified"
  // Negative extraction signals
  | "reporter_unknown"
  | "reporter_ambiguous"
  | "year_as_volume"
  | "blocked_reporter"
  | "year_implausible"
  | "suspicious_volume"
  | "mid_sentence_id"
  | "typo_punctuation"
  | "lowercase_id"
  | "small_volume"
  // Metadata signals
  | "missing_pincite"
  | "missing_year"
  | "missing_court"
  | "missing_case_name"
  | "blank_page"
  // Resolution signals (short-form only)
  | "exact_antecedent_match"
  | "fuzzy_party_match"
  | "ambiguous_id_window"
  | "no_antecedent_in_scope"

interface Explanation {
  value: number
  description: string
  details?: Explanation[]
}

interface Confidence {
  /** Calibrated composite (0..1). Produced by the calibration shell. */
  score: number

  /** Categorical bucket; stable across minor versions. Derived from score:
   *   ≥0.95 → "certain", ≥0.80 → "high", ≥0.50 → "medium", else "low"
   */
  level: ConfidenceLevel

  /** Orthogonal axes — separable concerns. */
  axes: {
    /** P(this is a real citation), calibrated per extractor. */
    extraction: number
    /** Completeness/quality of parsed fields (deterministic 0..1, fraction populated). */
    metadata: number
    /** P(correct antecedent link). Only present on short-form citations after resolve=true succeeds. */
    resolution?: number
  }

  /** Machine-readable codes — explains what drove score up or down. */
  reasons: ReasonCode[]

  /** Nested score-tree breakdown. Populated only when extractCitations({ explain: true }). */
  explanation?: Explanation
}

interface CitationBase {
  text: string
  span: Span
  confidence: Confidence  // was: confidence: number
  matchedText: string
  warnings?: Warning[]    // unchanged — reasons supplement (machine-readable) vs warnings (human-readable)
  // ... rest unchanged
}

interface ResolutionResult {
  resolvedTo?: number
  failureReason?: string
  warnings?: string[]
  // confidence: number REMOVED — moved to citation.confidence.axes.resolution
}
```

### Key design rules

- **`score` is computed from features (not from `axes`)** via a calibrated sigmoid head. The axes are also informative but `score` is the single calibrated answer.
- **`level` derives from `score`** via fixed thresholds — stable across minor versions even if `score` distribution shifts.
- **`axes.resolution` is `undefined`** unless the citation is short-form AND `resolve: true` AND resolution succeeded.
- **`reasons` is an enum array** — each code maps to a documented scoring delta. Warnings remain for human consumption.
- **`explanation` is opt-in** via `extractCitations({ explain: true })` — adds cost only when requested.

### Migration

```ts
// 0.18.x
citation.confidence > 0.85
resolution.confidence

// 0.19+
citation.confidence.score > 0.85
citation.confidence.axes.resolution
```

## Scoring Architecture

### File structure

```
src/score/
  features.ts            // ExtractionFeatures types per citation type
  weights.ts             // Hand-rolled feature weights per pattern-id
  axes.ts                // computeAxes(features) → { extraction, metadata, resolution? }
  reasons.ts             // collectReasonCodes(features) → ReasonCode[]
  calibrate.ts           // calibrate(rawScore, patternId) → score; static-table lookup
  calibration.json       // generated by scripts/calibrate/; per-pattern binning or Platt params
  level.ts               // deriveLevel(score) → ConfidenceLevel
  scorer.ts              // orchestrator: features → Confidence
  index.ts               // re-exports
```

### Per-extractor change

Before:
```ts
// extractCase.ts
let confidence = 0.2
if (knownReporter) confidence += 0.3
if (yearPresent) confidence += 0.2
// ...
```

After:
```ts
// extractCase.ts
const features = buildCaseFeatures({
  knownReporter, year, caseName, court, hasBlankPage,
  patternId: token.patternId,
})
const confidence = scoreCitation(features)
```

All scoring math moves to `src/score/`. Extractors become pure feature builders.

### Feature vector shapes

Per-citation-type flat records of booleans + small numbers. Example:

```ts
interface CaseExtractionFeatures {
  type: "case"
  patternId: string
  knownReporter: boolean
  reporterAmbiguous: boolean
  yearPresent: boolean
  yearPlausible: boolean        // 1750 ≤ year ≤ currentYear
  caseNamePresent: boolean
  courtIdentified: boolean
  blankPage: boolean
  metadataExpected: number      // 7 — vol, rep, page, year, court, name, pincite
  metadataPopulated: number
}

interface IdExtractionFeatures {
  type: "id"
  patternId: "id-citation"
  lowercase: boolean
  hasComma: boolean
  typoComma: boolean
  inCitationContext: boolean
}
```

Approximately 12 total `ExtractionFeatures` shapes, one per citation type.

### Axis computation

| Axis | Computation | Notes |
|---|---|---|
| `metadata` | `populated / expected` | Pure deterministic; no calibration; descriptive. |
| `extraction` | `sigmoid(Σ w_i · feature_i + b)` per pattern-id, then through calibration shell | Calibrated P(this is a correct citation extraction). |
| `resolution` | Maps resolver's existing similarity / scope-distance signals through its own calibrator | Per-resolution-pattern (Id vs supra vs shortFormCase) calibrated P(correct antecedent link). |

### Composite score

`score` is a function of the axes (not a separate learned head). Both `extraction` and `resolution` are calibrated probabilities, so they multiply cleanly under an independence assumption:

```
For full citations:                   score = axes.extraction
For short-form citations (resolved):  score = axes.extraction × axes.resolution
```

`axes.metadata` does NOT enter `score` — it's descriptive (consumers can filter on it separately) but treating it as a probability would be wrong (a partial-metadata citation can still be 100% precision-correct as an extraction). Consumers who want metadata-quality filtering should check `axes.metadata` directly.

This keeps `score` interpretable: "P(this is a correctly extracted citation, AND — for short-forms — correctly linked)." No double-counting of evidence between the score and the axes.

### Hand-rolled vs learned weights

Default: hand-rolled weights, centralized in `weights.ts`. Same shape as a logistic regression's coefficients, just authored by humans for now. Learned LR weights from labeled corpus stay as a future drop-in (same feature vectors, different weight source).

## Calibration Layer

### Eval harness shape

```ts
interface CalibrationDatum {
  patternId: string
  rawScore: number              // axes.extraction before calibration
  correct: boolean              // matched a gold citation with IoU≥0.8 AND type matches
  features: ExtractionFeatures  // for debugging / reason coverage
}
```

### Build script (`scripts/calibrate/build.ts`)

1. Load all 4 corpora (`golden-corpus`, `expanded-corpus`, `thorny-corpus`, `statute-corpus`) — ~320 labeled samples with `expected` fields.
2. For each text: run extraction (raw axes, no calibration); pair each prediction with the best gold match (IoU ≥ 0.8 + type match) — record `CalibrationDatum`.
3. Group by `patternId`.
4. Apply tiered calibration:

| Sample count | Technique | Rationale |
|---|---|---|
| ≥30 | Histogram binning, 10 equal-mass bins | Non-parametric; follows real distribution |
| 10–29 | Platt scaling (2 params, gradient descent) | Parsimonious for sparse data |
| <10 | Identity (no calibration) | Documented gap; flag in `--report` output |

5. Compute ECE / MCE / Brier per pattern (before + after calibration); render reliability diagram.
6. Write `src/score/calibration.json` (committed to repo).

### Algorithms (zero-dependency, ~30-50 LOC each)

**Histogram binning:**
```ts
sort samples by rawScore → split into N equal-mass chunks
each bin = { min, max, calibrated: chunk.filter(correct).length / chunk.length }
inference: find bin containing rawScore → return bin.calibrated
```

**Platt scaling (Platt-smoothed targets):**
```ts
y+ = (N+ + 1) / (N+ + 2);  y- = 1 / (N- + 2)
fit: p = 1 / (1 + exp(A·s + B)) via 1000 GD iterations on log-loss
inference: apply sigmoid with fitted (A, B)
```

**ECE:**
```ts
10 equal-mass bins of calibrated scores; sum of |bin_acc - bin_conf| weighted by bin mass
```

### Reliability diagram (text-rendered, in test snapshots)

```
extractCase / federal-reporter   N=42
  Bin  Range         Pred   Actual   Match
  1    [0.20-0.45]   0.32   0.31     ✓
  2    [0.45-0.65]   0.55   0.52     ✓
  3    [0.65-0.85]   0.74   0.71     ✓
  4    [0.85-1.00]   0.93   0.94     ✓
ECE: 0.024  (was 0.183 uncalibrated)
```

### CI gate

`tests/calibration/regression.test.ts` snapshots per-pattern ECE in `calibration.json` metadata. Any change pushing ECE up by >0.02 for any pattern fails CI.

### Versioning

`calibration.json` carries `scorerVersion: "1.0"`. Bumps when weights or features change. Consumers can detect via `getScorerVersion()` helper.

### P-R curves

`calibration.json` includes `prCurves: Record<patternId, Array<{ threshold, precision, recall }>>` — ~40 thresholds per pattern. Powers the `precisionTarget` API.

## Consumer DX Surface

### `precisionTarget` filtering

```ts
extractCitations(text, { precisionTarget: 0.95 })
// returns only citations whose calibrated extraction-axis score predicts ≥95% precision
// on the eval corpus (i.e., 95% of returned citations are real citations of the claimed type)
```

**`precisionTarget` filters on `axes.extraction` specifically** — the "is this a real citation" axis. Reason: that's the most common filter use case, and resolution P-R curves (for short-forms) would need their own corpus to derive cleanly. Consumers who want additional resolution filtering can chain `.filter(c => c.confidence.axes.resolution >= 0.9)` themselves.

Implementation: per-pattern threshold lookup from `calibration.prCurves` (extraction-axis curves). Citations from patterns that can't reach the target at any threshold are dropped (with a warning); override via `{ precisionTarget: 0.95, includePatternsBelowTarget: true }`.

### Scorer profiles

Reserved API surface; ships with a small set of presets.

```ts
type ScorerProfile = "default" | "brief" | "opinion" | "academic" | ProfileSpec

interface ProfileSpec {
  precisionTarget?: number
  reasonOverrides?: Partial<Record<ReasonCode, number>>  // override scorer weights
  reasonFilter?: (reasons: ReasonCode[]) => boolean      // drop citations with certain reasons
  calibrationVariant?: string                            // future hook for per-domain calibration tables
}

const PROFILES: Record<string, ProfileSpec> = {
  default: {},
  brief: { precisionTarget: 0.98 },
  opinion: { precisionTarget: 0.85 },
  academic: { precisionTarget: 0.95, reasonFilter: r => !r.includes("missing_pincite") },
}

// Usage:
extractCitations(text, { profile: "brief" })
extractCitations(text, { profile: { precisionTarget: 0.9, calibrationVariant: "brief" } })
```

`precisionTarget` alone (no profile) still works as shorthand. Future: per-domain `calibrationVariant` swaps in domain-specific calibration tables when those corpora exist.

### `explain: true` mode

```ts
extractCitations(text, { explain: true })
// citation.confidence.explanation = {
//   value: 0.87,
//   description: "calibrated composite for federal-reporter",
//   details: [
//     { value: 0.91, description: "extraction axis (raw 0.85 → cal 0.91)",
//       details: [
//         { value: 1.0, description: "known_reporter: F.3d in COMMON_REPORTERS (+0.3)" },
//         { value: 1.0, description: "year_plausible (+0.2)" },
//         { value: 0.0, description: "court_identified: absent (+0)" }
//       ]},
//     { value: 0.71, description: "metadata axis (5/7 fields populated)" }
//   ]
// }
```

Cost: ~2-3× scorer time when on; zero impact when off. Scorer keeps a side-channel explanation builder, gated by `options.explain`.

### Always-on reporters-DB validation

Reporters-DB validation moves from opt-in (`extractWithValidation`) to default pipeline:
- Validation informs `knownReporter` / `reporterAmbiguous` features
- Reporters-DB lazy-loads on first call; cached across calls
- **Preserves "core works without DB" guarantee**: if DB load fails or is intentionally avoided (e.g., bundle-conscious consumer passes `loadReporters: false`), features default to `reporterUnknown: undefined` — calibrator handles that as a "no signal" bucket distinct from "known false"
- `extractWithValidation` is deprecated; aliased to `extractCitations`; removed in next major

### Documented threshold tables (`docs/guides/confidence.md`)

- Per pattern-id: `threshold | precision | recall | F1` at standard cut-points (0.5, 0.7, 0.8, 0.9, 0.95, 0.99)
- ECE summary table per pattern
- Recommended `precisionTarget` per use case:

| Use case | `precisionTarget` |
|---|---|
| Brief citation linker (precision-first) | 0.98 |
| Document indexer (balanced) | 0.85 |
| Exploratory search (recall-first) | 0.70 |

## Eval Harness + CI Strategy

### Test layout

```
tests/calibration/
  buildPipeline.test.ts       # end-to-end: corpus → predictions → calibration table
  histogramBinning.test.ts    # algorithm unit tests
  plattScaling.test.ts        # algorithm unit tests
  ece.test.ts                 # ECE/MCE/Brier computation unit tests
  reliability.snapshot.ts     # per-pattern reliability diagrams (text snapshots)
  regression.test.ts          # CI gate: ECE may not grow >0.02 per pattern
  matchingGold.test.ts        # IoU matching of predictions to gold citations + reason coverage

tests/integration/
  confidenceShape.test.ts     # Confidence struct populated correctly across citation types
  precisionTarget.test.ts     # precisionTarget filtering produces expected counts
  explainMode.test.ts         # explanation tree well-formed, only when requested
  profile.test.ts             # profile presets apply correctly

src/score/__tests__/
  axes.test.ts                # computeAxes()
  reasons.test.ts             # reason code emission
  level.test.ts               # score → level mapping
  calibrate.test.ts           # calibration table lookup
  scorer.test.ts              # integration: features → Confidence
```

### Reliability diagram snapshot tests

Per-pattern (≥30 samples) text snapshot. Changes — better OR worse — require explicit snapshot update, forcing reviewer attention.

### CI workflow integration

New job in `.github/workflows/ci.yml`:

```yaml
calibration:
  runs-on: ubuntu-latest
  needs: [test]
  steps:
    - run: pnpm calibrate --check    # rebuild calibration.json, fail if differs from committed
    - run: pnpm test:calibration     # ECE regression + reliability snapshots
```

`pnpm calibrate --check` rebuilds the table and diffs against committed `calibration.json`. If corpus or scorer changed but the table wasn't regenerated, CI fails with: "run `pnpm calibrate` and commit the result." Forces the table to stay in sync.

### `pnpm calibrate` commands

```
pnpm calibrate                # rebuild calibration.json from current corpus
pnpm calibrate --check        # verify current table matches what we'd rebuild
pnpm calibrate --report       # print ECE/precision tables for human review
pnpm calibrate --pattern XYZ  # focus on one pattern; show reliability diagram
```

### Regression scenarios CI catches

| Change | CI behavior |
|---|---|
| Scorer adds a new feature | `--check` fails; reviewer runs `pnpm calibrate` and commits new table |
| Gold corpus grows | `--check` fails; same fix |
| Scorer weights change | ECE regression test catches if it makes calibration worse |
| Calibration algorithm changes | Reliability snapshots flag every pattern's shift; reviewer judges intent |
| New extractor / pattern added | Identity calibration applied; `--report` flags low-data warning |

### Coverage expectations

- Every extractor flows through scorer (`confidenceShape.test.ts`)
- Every ReasonCode appears in at least one test (`matchingGold.test.ts` includes reason coverage check)
- ECE per pattern stays under documented threshold (0.05 for well-supported, 0.10 for sparse)

### Performance budget

- Confidence computation: ≤5% per-citation overhead vs current (measured by `tests/performance/` benchmarks)
- `explain: true`: ≤3× overhead, opt-in only
- Calibration table: loaded once on first call (~1-5 KB JSON, no measurable impact)

## Phasing + Migration

### Phase order

| Phase | What ships | Version | API breaks? |
|---|---|---|---|
| 1. Foundation | `src/score/` skeleton; `Confidence`/`ReasonCode`/`Explanation` types; per-extractor feature-vector types; eval harness measuring ECE on **raw scores** | none (internal) | No |
| 2. Scorer migration | Every extractor emits features → scorer → `Confidence` struct. `score` is identity-calibrated (wraps current raw scores) | 0.19.0 | **Yes** — `confidence: number` → `confidence: Confidence`; `resolution.confidence` → `confidence.axes.resolution` |
| 3. Calibration | Build script produces `calibration.json`; calibration shell wired in; ECE regression test in CI | 0.20.0 | No |
| 4. Consumer DX | `precisionTarget`, `explain: true`, scorer profiles | 0.21.0 | No (additive) |
| 5. Always-on validation | Reporters-DB validation in default pipeline; `extractWithValidation` deprecated | 0.22.0 | Deprecation; removal in next major |
| 6. Polish | `docs/guides/confidence.md` with P-R tables; README; migration guide | 0.22.1 | No |

### Migration cheat-sheet

```ts
// 0.18.x
citation.confidence > 0.85
resolution.confidence

// 0.19+
citation.confidence.score > 0.85
citation.confidence.axes.resolution

// New patterns in 0.21+
extractCitations(text, { precisionTarget: 0.95 })
extractCitations(text, { profile: "brief" })
extractCitations(text, { explain: true })
// citation.confidence.reasons, .level, .axes, .explanation
```

Ship in `CHANGELOG` and `docs/migration/0.18-to-0.19.md`. Grep recipe for consumer codebases:
```bash
grep -rn '\.confidence\b' src/   # finds all reads of the field
```

### Risks + mitigations

| Risk | Mitigation |
|---|---|
| Calibration precise on our corpus but off on consumer's | Document corpus characteristics + how to re-fit locally |
| Hand-rolled weights produce worse scores than current on edge cases | Per-corpus precision regression test at standard thresholds |
| Bundle size grows from `calibration.json` | Table is 1–5 KB; trivial |
| Phase 2 breaks consumers silently | Pre-1.0; CHANGELOG warning; grep recipe; minor version bump signal |
| Reporters-DB lazy-load slows first-call extraction | Already lazy; document; opt-out via `loadReporters: false` |
| Per-pattern calibration overfits on small samples | Tiered: <10 samples = identity; documented gaps in P-R tables |

### Explicitly NOT in this design

(Listed so reviewers know the omissions are intentional.)

- Learned LR weights from corpus (hand-rolled is good enough; LR is a drop-in upgrade later)
- Conformal prediction sets for resolution (research mentioned; not adopted — scalar score + reason codes covers the use case)
- Per-document aggregate confidence (possible future feature)
- Confidence intervals on the score (point estimates only)
- Streaming / incremental calibration (batch-only build)
- Domain-specific calibration variants in v1 (API surface reserved via `calibrationVariant`; tables come later)

## Success Criteria

This design is successful if, after Phase 6:

1. **Published precision contracts**: `docs/guides/confidence.md` contains a table per pattern-id showing precision and recall at each documented `precisionTarget`. Consumers can pick a number and know what they get.
2. **Measured calibration**: per-pattern ECE published in `calibration.json` and asserted in CI; ≤0.05 for well-supported patterns, ≤0.10 for sparse.
3. **Debuggable scores**: every `Confidence` carries machine-readable `reasons[]`; opt-in `explain: true` produces a full nested breakdown.
4. **No surprise regressions**: existing extraction quality preserved (per-corpus precision-at-threshold regression tests pass).
5. **One coherent story**: a downstream developer asking "why is this 0.65?" can answer it from `reasons[]` and `axes` without reading source. A downstream developer wanting "≥95% precision" filtering does it via `precisionTarget: 0.95`, not by guessing.

## References

- Veryfi confidence model: https://faq.veryfi.com/en/articles/5571597-confidence-score-explained
- Azure Document Intelligence confidence semantics: https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/concept/accuracy-confidence
- Mindee categorical confidence: https://docs.mindee.com/extraction-models/optional-features/automation-confidence-score
- Elasticsearch `_explain`: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-explain
- GROBID confidence open-issue history: https://github.com/kermitt2/grobid/issues/38
- Python eyecite `models.py` (no `confidence` field): https://github.com/freelawproject/eyecite/blob/main/eyecite/models.py
- Guo et al. — On Calibration of Modern Neural Networks (ECE / reliability diagrams): https://proceedings.mlr.press/v70/guo17a/guo17a.pdf
- Niculescu-Mizil & Caruana — Predicting Good Probabilities With Supervised Learning (Platt vs isotonic): https://www.cs.cornell.edu/~alexn/papers/calibration.icml05.crc.rev3.pdf
- sklearn `CalibratedClassifierCV` semantics: https://scikit-learn.org/stable/modules/calibration.html
