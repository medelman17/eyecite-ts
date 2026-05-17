---
"eyecite-ts": minor
---

feat!: structured Confidence type replaces citation.confidence: number

BREAKING: citation.confidence is now a struct { score, level, axes, reasons, explanation? }
instead of a single number. resolution.confidence has been removed; the equivalent signal
lives at citation.confidence.axes.resolution.

Migration:
- citation.confidence > 0.85 → citation.confidence.score > 0.85
- citation.resolution.confidence → citation.confidence.axes.resolution
- See docs/migration/0.18-to-0.19.md for the full guide.

This is Phase 1+2 of the confidence-scoring overhaul. Phase 3 (calibration) and
Phase 4 (precisionTarget/explain/profiles) follow in 0.20.0 and 0.21.0.

Known behavioral notes from Phase 2 migration:
- Statute extractors now route through a central scorer with per-pattern weights.
  Most patterns preserve their original confidence values via STATUTE_PATTERN_OVERRIDES;
  3 extractors (extractAbbreviated, extractNamedCode, extractChapterAct) now thread
  actual lookup outcomes (knownCode, parseable, hasSectionSymbol) through to scoring.
- Reporters-DB validation (via extractWithValidation) still adjusts confidence.score;
  Phase 5 will fold it into the default pipeline.
- Calibration table is empty in this release — score equals the pre-migration value
  for every pattern (identity calibration). Phase 3 ships real calibration based on
  labeled corpus ECE measurement.
