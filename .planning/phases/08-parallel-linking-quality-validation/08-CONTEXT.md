# Phase 8: Parallel Linking & Quality Validation - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Link comma-separated parallel case citations that share a parenthetical via `parallelCitations` array and `groupId`. Add full-span annotation mode. Validate quality targets (bundle size <50KB gzipped, performance <100ms for 10KB docs). Build a golden test corpus for extraction accuracy regression testing.

</domain>

<decisions>
## Implementation Decisions

### Parallel linking detection
- Claude's discretion on separator rules (comma, semicolon) based on Bluebook conventions
- Claude's discretion on which citation types qualify for parallel linking (case-only vs broader)
- Claude's discretion on false-positive strictness threshold
- Claude's discretion on pipeline timing (during extraction vs post-processing)

### Linking data model
- Add `groupId` field to identify all citations in the same parallel group
- Claude's discretion on groupId type and generation strategy
- Claude's discretion on whether singletons get undefined or unique groupId
- Preserve source order in parallelCitations array — first citation = primary reporter by convention
- Shared `fullSpan` — all citations in a parallel group get the same fullSpan covering case name through final parenthetical
- Claude's discretion on reference mechanism (index, object ref, etc.) and directionality
- Claude's discretion on whether shared parenthetical data (court, year) is copied to each citation or only the last

### Full-span annotation
- Claude's discretion on activation API (options param vs separate function)
- Claude's discretion on whether parallel group gets one wrapper annotation or individual annotations
- Claude's discretion on overlap handling
- Claude's discretion on whether formatter receives mode information

### Quality validation
- Claude's discretion on CI enforcement for size/perf thresholds
- Golden test corpus of 20-30 real-world legal text samples for extraction accuracy regression
- Claude's discretion on match granularity (key fields vs full snapshot)

### Claude's Discretion
- Separator rules for parallel detection (Bluebook conventions)
- Citation type scope for parallel linking
- False-positive prevention strictness
- Pipeline placement of linking logic
- groupId type, generation, and singleton behavior
- Reference mechanism and directionality in parallelCitations
- Parenthetical data sharing strategy (copy to all vs only last)
- Full-span annotation activation API design
- Group annotation wrapping strategy
- Span overlap handling
- Formatter mode awareness
- CI enforcement level for quality gates
- Golden corpus match granularity

</decisions>

<specifics>
## Specific Ideas

- User wants `groupId` field for easy grouping/filtering of parallel citations
- Source order preserved — first in text is first in array, treated as primary reporter
- Shared fullSpan across parallel group — the entire group from case name to closing parenthetical is one span
- Golden corpus should be 20-30 samples covering major citation types and edge cases

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-parallel-linking-quality-validation*
*Context gathered: 2026-02-05*
