# Project Milestones: eyecite-ts

## v1.1 Extraction Accuracy (Shipped: 2026-02-06)

**Delivered:** Enhanced extraction accuracy with full citation spans, party names, parallel citation linking, blank page support, complex parenthetical parsing, and golden test corpus.

**Phases completed:** 5-8 (9 plans total)

**Key accomplishments:**
- Full citation span extraction covering case name through closing parenthetical (fullSpan field)
- Case name backward search with "v." pattern and procedural prefix handling (In re, Ex parte, Matter of)
- Plaintiff/defendant extraction with 7-step normalization pipeline for improved supra resolution
- Parallel citation detection linking comma-separated reporters sharing a parenthetical (groupId + parallelCitations)
- Complex parenthetical parsing with structured dates (abbreviated, full month, numeric), court, and disposition
- Blank page placeholder recognition (___/---) with hasBlankPage flag and confidence scoring
- Golden test corpus with 28 real-world samples and 34 regression tests

**Stats:**
- 61 TypeScript files
- 12,654 lines of TypeScript (4,980 source + 7,674 test)
- 4 phases, 9 plans
- 1 day (2026-02-05 -> 2026-02-06)
- 528 tests passing, core bundle 6.35KB gzipped

**Git range:** Phase 5 start -> `795be97` (phase 8 complete)

**What's next:** v1.2 statute pipeline, custom reporter API, NPM stable release

---

## v1.0-alpha (Shipped: 2026-02-05)

**Delivered:** TypeScript legal citation extraction library with full feature parity to Python eyecite, zero dependencies, and <50KB browser bundle.

**Phases completed:** 1-4 (17 plans total)

**Key accomplishments:**
- Full citation extraction pipeline (clean -> tokenize -> extract -> resolve) with dual position tracking
- 9 citation types: case, statute, journal, neutral, public law, federal register, Id., supra, short-form case
- Reporter database with 1,235 reporters from reporters-db, lazy-loaded with O(1) lookup
- Short-form citation resolution (Id./supra/short-form case) with Levenshtein fuzzy matching
- Position-aware annotation with template and callback modes, auto-escaping for XSS prevention
- ReDoS-safe regex patterns (all <2ms on pathological input, 50x safety margin)

**Stats:**
- 51 TypeScript files (35 source, 16 test)
- 7,633 lines of TypeScript (3,684 source + 3,949 test)
- 4 phases, 17 plans, 88 commits
- 1 day from start to ship (2026-02-04 -> 2026-02-05)
- 235 tests passing, core bundle 4.2KB gzipped

**Git range:** `424a11d` (init) -> `642ba62` (phase 4 complete)

**What's next:** Community feedback, NPM publication, v1.0 stable release

---
