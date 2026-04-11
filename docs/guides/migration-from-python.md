# Migrating from Python eyecite

Guide for developers familiar with [Python eyecite](https://github.com/freelawproject/eyecite) who are switching to or evaluating eyecite-ts.

## API Mapping

| Python eyecite | eyecite-ts | Notes |
|---|---|---|
| `get_citations(text)` | `extractCitations(text)` | Returns typed array instead of generator |
| `resolve_citations(citations)` | `resolveCitations(citations, text)` | Requires text parameter; or use `extractCitations(text, { resolve: true })` |
| `annotate_citations(text, citations)` | `annotate(text, citations, options)` | Import from `eyecite-ts/annotate`; requires template or callback |
| `clean_text(text)` | `cleanText(text)` | Returns `{ cleaned, transformationMap }` instead of just string |

## Naming Conventions

Python eyecite uses `snake_case`; eyecite-ts uses `camelCase`:

| Python | TypeScript |
|--------|-----------|
| `FullCaseCitation` | `FullCaseCitation` (same) |
| `FullLawCitation` | `StatuteCitation` |
| `FullJournalCitation` | `JournalCitation` |
| `ShortCaseCitation` | `ShortFormCaseCitation` |
| `IdCitation` | `IdCitation` (same) |
| `SupraCitation` | `SupraCitation` (same) |
| `full_span_start` / `full_span_end` | `fullSpan.originalStart` / `fullSpan.originalEnd` |
| `metadata.plaintiff` | `citation.plaintiff` (top-level field) |

## Type System Differences

Python uses class inheritance; eyecite-ts uses a discriminated union on the `type` field:

```python
# Python
if isinstance(citation, FullCaseCitation):
    print(citation.volume)
```

```typescript
// TypeScript
if (citation.type === "case") {
  console.log(citation.volume) // fully typed
}

// Or with type guards
if (isCaseCitation(citation)) {
  console.log(citation.volume)
}
```

## Position Mapping

Python eyecite tracks positions via diff-based `SpanUpdater` at annotation time. eyecite-ts tracks positions incrementally during cleaning via `TransformationMap`:

- Every citation carries dual coordinates: `span.cleanStart`/`span.cleanEnd` (cleaned text) and `span.originalStart`/`span.originalEnd` (original text)
- No diffing step needed — positions are available immediately after extraction

## Data Source Differences

| Aspect | Python eyecite | eyecite-ts |
|--------|---------------|-----------|
| Reporter data | External `reporters-db` package (JSON) | Built-in, lazy-loaded via `eyecite-ts/data` |
| Statute data | `reporters-db/laws.json` (all 50 states + DC + territories) | Built-in regex patterns (50 states + DC + federal) |
| Journal data | `reporters-db/journals.json` | Built-in patterns |

## Features Unique to eyecite-ts

These features have no Python eyecite equivalent:

- **Constitutional citations** — dedicated `ConstitutionalCitation` type with article/amendment/section/clause parsing
- **Footnote detection** — opt-in `{ detectFootnotes: true }` with zone-based resolver scoping
- **Citation signals** — `See`, `See also`, `Cf.` etc. captured as `signal` field on citations
- **Component spans** — per-field position data via `spans` record (volume, reporter, page, court, year, caseName, etc.)
- **Parallel citation grouping** — `groupId` and `parallelCitations` array for linked reporters

## Features with Different Approaches

| Feature | Python | eyecite-ts |
|---------|--------|-----------|
| Parallel detection | `is_parallel_citation()` copies metadata between citations | `groupId` links citations; `parallelCitations` array on primary |
| Annotation HTML handling | Three modes: `unchecked`, `skip`, `wrap` | XSS auto-escape (default on), template or callback modes |
| Case name extraction | `find_case_name()` / `find_case_name_in_html()` | Integrated backward search during case extraction |
