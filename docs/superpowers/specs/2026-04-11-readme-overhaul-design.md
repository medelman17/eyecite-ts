# README Overhaul Design

**Date:** 2026-04-11
**Status:** Draft

## Goal

Exhaustively update the eyecite-ts README from its current ~550-line reference-style format into a "Pipeline Story" README (~300–350 lines) that showcases the library's value, with deep dives moved to `docs/guides/` and `docs/api/`.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Audience | Both legal tech and general TS devs | Layered: inline glosses for domain terms, no assumed legal knowledge |
| Python eyecite positioning | Emphasize lineage + migration guide | Comparison table in README, full migration guide in docs |
| README length strategy | Showcase + essentials | Hero workflow, feature table, brief examples; deep dives in docs |
| Code example style | Hero workflow + brief per-feature | One connected extract→resolve→annotate flow, then minimal per-feature examples |

## README Structure

### Section 1: Header & Intro
- **Badges:** Keep existing 8 shields (CI, coverage, npm, bundle size, license, Node, TypeScript, zero deps)
- **Title + tagline:** `eyecite-ts` — TypeScript legal citation extraction — a port of Python eyecite with extended capabilities
- **"What is this?" paragraph:** One paragraph for devs unfamiliar with legal citations. Explains what a citation like `500 F.2d 123 (9th Cir. 2020)` encodes (volume, reporter, page, court, year), that the library parses these into typed objects, resolves short-form references, and annotates text. Mentions zero deps, browser-compatible, ~10KB gzipped.

### Section 2: Install + Hero Workflow
- **Install:** `npm install eyecite-ts`
- **Hero example:** ~20 lines showing a connected 3-stage pipeline:
  1. `extractCitations(text, { resolve: true })` on realistic legal text with 3+ citation types
  2. Filter/inspect resolved citations
  3. `annotate(text, citations, { template })` to produce marked-up output
- Output shows 2-3 key fields per citation, not full objects. Demonstrates pipeline composing end-to-end.

### Section 3: What It Extracts (feature table)
Single table replacing the current bullet list. Columns: **Type | Example | Key Fields**.

| Type | Example | Key Fields |
|------|---------|------------|
| case | `500 F.2d 123 (9th Cir. 2020)` | volume, reporter, page, court, year, caseName |
| statute | `42 U.S.C. § 1983(a)(1)` | title, code, section, subsection, jurisdiction |
| constitutional | `U.S. Const. amend. XIV, § 1` | jurisdiction, amendment, section |
| journal | `123 Harv. L. Rev. 456` | volume, journal, page, author |
| neutral | `2020 WL 123456` | year, court, documentNumber |
| publicLaw | `Pub. L. No. 117-263` | congress, lawNumber |
| federalRegister | `87 Fed. Reg. 1234` | volume, page, year |
| statutesAtLarge | `136 Stat. 4459` | volume, page, year |
| id | `Id. at 125` | pincite |
| supra | `Smith, supra, at 130` | partyName, pincite |
| shortFormCase | `500 F.2d at 140` | volume, reporter, pincite |

### Section 4: Key Features (5-6 brief examples)
Each feature: heading, 1-2 sentence explanation, ~5-10 line code block.

1. **Case Names & Full Spans** — backward search for party names (`Smith v. Jones`, `In re Smith`, `Ex parte Young`). `fullSpan` covers case name through closing parenthetical. Example shows `caseName`, `plaintiff`, `defendant`, `fullSpan` fields.

2. **Parallel Citations** — automatic grouping when comma-separated reporters share a parenthetical. Example with triple cite (Roe v. Wade), showing `groupId` linking all three. Brief note on primary vs. secondary.

3. **Short-Form Resolution** — `{ resolve: true }` links Id., supra, and short-form case citations to full antecedents. Example showing convenience API only. Link to `docs/guides/resolution.md` for power-user API, scope strategies, fuzzy matching options.

4. **Citation Annotation** — template and callback modes. XSS auto-escape on by default. One template-mode example. Mention `useFullSpan` option. Link to `docs/guides/annotation.md` for callback mode and advanced usage.

5. **Confidence & Signals** — brief explanation of confidence scoring (reporter match → boost, unknown → penalty). Citation signals (`See`, `See also`, `Cf.`) captured on extraction. Example showing `confidence` and `signal` fields.

6. **Footnote Detection** — opt-in `{ detectFootnotes: true }`. HTML and plaintext strategies. Citations tagged with `inFootnote` and `footnoteNumber`. Resolver enforces footnote-body scope isolation. Link to `docs/guides/footnote-detection.md`.

### Section 5: Type System (compact)
- Discriminated union on `type` field — list all 11 types
- `Citation`, `FullCitation`, `ShortFormCitation` union types
- Type guard example (`isFullCitation`, `isCaseCitation`)
- `switch` + `assertUnreachable` pattern
- `CitationOfType<'case'>` conditional type
- Link to `docs/api/types.md` for full type catalog

### Section 6: Bundle Size
Table with 3 entry points:

| Entry Point | Import | Gzipped |
|-------------|--------|---------|
| Core extraction | `eyecite-ts` | ~10 KB |
| Annotation | `eyecite-ts/annotate` | ~0.7 KB |
| Reporter data | `eyecite-ts/data` | ~86.5 KB (lazy-loaded) |

One sentence on tree-shaking: import only what you need.

### Section 7: Comparison with Python eyecite
Table comparing capabilities. Every claim verified against Python eyecite source code (2026-04-11).

| Capability | Python eyecite | eyecite-ts | Notes |
|---|---|---|---|
| Case citations | Yes | Yes | Both extract volume/reporter/page/court/year |
| Statute citations | Yes (all 50 states + DC + territories via reporters-db) | Yes (50 states + DC + federal, built-in patterns) | Python uses external reporters-db JSON; TS has self-contained regex |
| Constitutional citations | No | Yes (U.S. + 50 states) | Dedicated type with article/amendment/section/clause parsing |
| Journal / law review | Yes | Yes | |
| Neutral (WL/LEXIS) | Yes (as case citations) | Yes (dedicated type) | TS has a separate `NeutralCitation` type |
| Short-form resolution | Yes | Yes | Both resolve Id., supra, short-form case |
| Case name extraction | Yes (`find_case_name()`) | Yes (backward search) | Both use backward scanning heuristics |
| Parallel citation linking | Partial (detection + metadata copy) | Yes (`groupId` + `parallelCitations` array) | Python detects but doesn't group; TS groups with shared ID |
| Full span tracking | Yes (`full_span_start/end`) | Yes (`fullSpan` with clean/original coords) | TS carries dual clean/original positions |
| Component spans | Minimal (pin cite only) | Yes (per-field positions for all components) | TS provides spans for volume, reporter, page, court, year, caseName, etc. |
| Footnote detection | No | Yes (HTML + plaintext strategies) | Opt-in; resolver enforces footnote-body scope isolation |
| Citation signals | No (used as stop words only) | Yes (extracted as metadata) | Python uses signals only as boundary markers for case name search |
| Annotation | Yes (HTML modes: unchecked/skip/wrap) | Yes (template/callback, XSS auto-escape) | Different approaches to HTML handling |
| Position mapping | Yes (diff-based at annotation time) | Yes (incremental TransformationMap during cleaning) | Python reconciles via diffing; TS tracks incrementally |
| Type system | Class inheritance hierarchy | Discriminated union on `type` field | Different paradigms; TS enables exhaustive switch |

Brief note: "eyecite-ts started as a port of Python eyecite by Free Law Project and has diverged. Both libraries are capable citation extractors — eyecite-ts adds constitutional citations, footnote detection, citation signals, rich component spans, and a TypeScript-native type system, while Python eyecite has broader statute coverage via reporters-db and a mature ecosystem."

### Section 8: Architecture (brief)
3-4 sentences: clean → tokenize → extract → resolve pipeline. Position tracking via `TransformationMap`. Link to `ARCHITECTURE.md`.

### Section 9: Development
Command table: install, test, test-once, typecheck, build, lint, format, size. Node 18+ requirement. Test count (accurate). Link to `ARCHITECTURE.md` for contributor orientation.

### Section 10: Migration from Python eyecite
One paragraph acknowledging Python users. Link to `docs/guides/migration-from-python.md` for: API mapping (`extract_citations` → `extractCitations`), naming conventions, behavioral differences, new features to adopt.

### Section 11: Credits & License
Credit to Free Law Project's eyecite. MIT license.

## Docs Structure (new files)

```
docs/
  guides/
    migration-from-python.md    — API mapping, naming, behavioral differences
    footnote-detection.md       — strategies, configuration, scope isolation
    resolution.md               — power-user API, scope strategies, fuzzy matching
    annotation.md               — callback mode, full-span, position tracking
    advanced-extraction.md      — custom patterns, custom cleaners, false positives,
                                  component spans, subsequent history, dispositions,
                                  structured dates, blank pages
  api/
    types.md                    — full type catalog (all 11 citation types,
                                  options interfaces, supporting types, type guards)
```

## What Moves Out of README

These sections from the current README become docs content:
- Detailed statute jurisdiction table → `advanced-extraction.md`
- Constitutional citation details → `advanced-extraction.md`
- Power-user resolution API + options table → `resolution.md`
- Full-span annotation details → `annotation.md`
- Custom patterns / custom cleaners → `advanced-extraction.md`
- Blank page citations → `advanced-extraction.md`
- Structured dates → `advanced-extraction.md`
- Reporter validation details → `advanced-extraction.md`
- Detailed type definitions and resolved citation types → `types.md`

## What's New in README (currently missing)

- "What is this?" intro paragraph for non-legal devs
- Hero workflow example (extract → resolve → annotate connected)
- Feature table (all 11 types at a glance)
- Confidence & signals section
- Footnote detection section
- Comparison with Python eyecite table
- Migration section (with link to guide)
- Accurate jurisdiction count (50 states + DC + federal, not 20)

## Out of Scope

- API reference generation (typedoc or similar) — separate effort
- Playground / interactive demo hosting
- Changelog restructuring
