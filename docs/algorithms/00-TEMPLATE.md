# ALG-{NN}: {Title}

**Status:** Draft | Ready | In Progress | Complete
**Priority:** {1-5} (implementation order)
**Textbook References:** CLRS {chapter/section}, Sedgewick {chapter/section}
**Target Files:** {file paths with line ranges}
**Risk Level:** Low | Medium | High

## Problem Statement

What's fragile/incorrect in the current code. Include `file:line` references.
Focus on correctness and robustness issues, not just performance.

## Current Code Analysis

Control flow trace through the target code. Include:
- Data structures used and their properties
- Coupling points (what other modules depend on this code)
- Known edge cases or fragile patterns
- Any comments in the code that acknowledge limitations

## Target Algorithm

### Description

What algorithm replaces the current approach, and why it's more correct/robust.

### Pseudocode

```
// Language-agnostic pseudocode for the core algorithm
```

### Complexity Analysis

| Metric | Before | After |
|--------|--------|-------|
| Time | | |
| Space | | |

### Why This Algorithm

Not just "it's faster" — explain why it produces more correct results, eliminates edge cases, or removes fragile patterns. Reference specific failure modes in the current code that this algorithm prevents.

## Correctness Invariants

Numbered list. Each invariant is testable and forms the contract for the new implementation.

1. {invariant} — {how to test it}
2. ...

## Implementation Plan

### New/Modified Files

| File | Action | Description |
|------|--------|-------------|
| | | |

### Step-by-Step

Numbered steps, detailed enough for an agent that has never seen this codebase.

1. ...

### Zero-Dependency Constraint

All algorithms must be implemented from scratch. No npm packages. Dev dependencies (testing) are fine.

## Test Strategy

### Golden Parity Test

Run the full integration test suite before and after. Citation extraction results must be identical:
same citations, same spans (originalStart/originalEnd), same resolution links.

### Unit Tests

Algorithm-specific unit tests covering the public interface of the new code.

### Property Tests

Tests derived from the correctness invariants above. For mathematical properties (symmetry, triangle inequality, etc.), test with generated inputs.

### Edge Cases

Legal-citation-specific scenarios that stress this algorithm:
- {scenario} — {why it matters}

## Verification

Exact commands to run and what output to compare.

```bash
# Before implementation (baseline)
pnpm exec vitest run

# After implementation (parity check)
pnpm exec vitest run
```

## Rollback Plan

How to revert if something goes wrong. For single-file changes, `git checkout` the file.
For multi-file changes, revert the entire commit.
